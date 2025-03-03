import { getFirestore } from "firebase-admin/firestore";
import { scheduler } from "firebase-functions/v2";
import { https } from "firebase-functions/v2";
import fetch from "node-fetch";
import xml2js from "xml2js";
import { parseXMLResults } from './fetchRaces.js';

const db = getFirestore();
const PAST_EVENTS_COLLECTION = "runsignup_past_events";
const RESULTS_COLLECTION = "race_results";
const MANUAL_RESULTS_COLLECTION = "user_manual_results";
const BATCH_SIZE = 100;

// Helper function to parse XML results
function parseXMLResults(xmlText) {
  console.log('Raw XML length:', xmlText.length);
  
  // First check for results wrapper
  if (!xmlText.includes('<event_individual_results>')) {
    console.log('No <event_individual_results> tag found in XML');
    return [];
  }

  // Try to get the individual results sets
  const resultsSets = xmlText.match(/<individual_results_set>[\s\S]*?<\/individual_results_set>/g);
  if (!resultsSets) {
    console.log('Could not extract individual_results_set sections');
    return [];
  }

  console.log(`Found ${resultsSets.length} result sets`);
  
  let allResults = [];
  for (const resultSet of resultsSets) {
    // Extract individual results section
    const individualResultsMatch = resultSet.match(/<individual_results>([\s\S]*?)<\/individual_results>/);
    if (!individualResultsMatch) {
      console.log('No <individual_results> section found in result set');
      continue;
    }

    const individualResults = individualResultsMatch[1];
    
    // Try different possible XML structures for individual results
    const patterns = [
      /<individual_result>([\s\S]*?)<\/individual_result>/g,
      /<participant>([\s\S]*?)<\/participant>/g,
      /<runner>([\s\S]*?)<\/runner>/g
    ];

    let resultMatches = null;
    for (const pattern of patterns) {
      const matches = individualResults.match(pattern);
      if (matches && matches.length > 0) {
        resultMatches = matches;
        console.log(`Found ${matches.length} results using pattern: ${pattern.source}`);
        break;
      }
    }

    if (!resultMatches) {
      // Log the structure we received
      console.log('Result set structure:', {
        hasIndividualResults: resultSet.includes('<individual_results>'),
        length: resultSet.length,
        sample: resultSet.substring(0, 500)
      });
      continue;
    }

    // Get result set metadata
    const getMetadata = (field) => {
      const match = resultSet.match(new RegExp(`<${field}>(.*?)</${field}>`));
      return match ? match[1] : null;
    };

    const resultSetName = getMetadata('individual_result_set_name');
    const resultSetId = getMetadata('individual_result_set_id');

    console.log(`Processing result set: ${resultSetName} (${resultSetId})`);

    for (const resultXML of resultMatches) {
      try {
        const getField = (fieldNames) => {
          if (typeof fieldNames === 'string') fieldNames = [fieldNames];
          for (const field of fieldNames) {
            const match = resultXML.match(new RegExp(`<${field}>([^<]+)<\/${field}>`));
            if (match) return match[1].trim();
          }
          return null;
        };

        const result = {
          first_name: getField(['first_name', 'firstname', 'fname']),
          last_name: getField(['last_name', 'lastname', 'lname']),
          bib: getField(['bib', 'bib_num', 'bib_number']),
          gender: getField(['gender', 'sex']),
          age_group: getField(['age_group', 'division', 'category']),
          chip_time: getField(['chip_time', 'net_time', 'finish_time']),
          gun_time: getField(['gun_time', 'clock_time', 'time']),
          overall_place: getField(['overall_place', 'place', 'overall']),
          gender_place: getField(['gender_place', 'sex_place']),
          age_group_place: getField(['age_group_place', 'division_place']),
          // Additional metadata
          result_set: resultSetName,
          source_name: getField(['results_source_name']),
          individual_result_set_id: resultSetId
        };

        console.log('Parsed result:', {
          name: `${result.first_name} ${result.last_name}`,
          time: result.chip_time || result.gun_time,
          result_set: result.result_set,
          fields_found: Object.entries(result)
            .filter(([_, v]) => v !== null)
            .map(([k, _]) => k)
        });

        if ((result.first_name || result.last_name) && (result.chip_time || result.gun_time)) {
          allResults.push(result);
        }
      } catch (error) {
        console.error('Error parsing individual result:', {
          error: error.message,
          xml: resultXML.substring(0, 200)
        });
      }
    }
  }

  console.log(`Successfully parsed ${allResults.length} total results`);
  return allResults;
}

// Function to fetch race results from RunSignUp
const fetchRunSignUpResults = async (raceId, eventId) => {
  try {
    const url = new URL(`https://runsignup.com/Rest/race/${raceId}/results`);
    
    // Only use the documented format parameter
    url.searchParams.append('format', 'json');
    if (eventId) {
      url.searchParams.append('event_id', eventId);
    }

    console.log(`Fetching results from: ${url}`);
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      return {
        success: false,
        error: `API returned ${response.status}`,
        endpoint: url.toString()
      };
    }

    const data = await response.json();
    console.log('Response data:', {
      hasResults: Boolean(data.results),
      hasRaceResults: Boolean(data.race_results),
      keys: Object.keys(data)
    });

    if (data.results || data.race_results) {
      return {
        success: true,
        data,
        endpoint: url.toString()
      };
    }

    return {
      success: false,
      error: 'No results found in response',
      raceId,
      eventId
    };

  } catch (error) {
    console.error('Error fetching results:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Check if result already exists
async function resultExists(eventId, athleteName) {
  const resultsRef = db.collection(RESULTS_COLLECTION);
  const q = resultsRef.where('event_id', '==', eventId)
                     .where('athlete_name', '==', athleteName)
                     .where('source', '==', 'runsignup');
  const snapshot = await q.get();
  return !snapshot.empty;
}

// Store race results in batches
async function storeRunSignUpResults(raceId, results) {
  let currentBatch = db.batch();
  let batchCount = 0;
  let totalStored = 0;

  for (const result of results) {
    try {
      const athleteName = `${result.first_name || ''} ${result.last_name || ''}`.trim();
      if (!athleteName) {
        console.warn('Skipping result with no name');
        continue;
      }

      const exists = await resultExists(raceId, athleteName);
      if (!exists) {
        const resultDoc = {
          event_id: raceId,
          athlete_name: athleteName,
          finish_time: result.chip_time || result.gun_time,
          age_group: result.age_group || null,
          gender: result.gender || null,
          bib_number: result.bib || null,
          placement_overall: result.overall_place || null,
          placement_age_group: result.age_group_place || null,
          placement_gender: result.gender_place || null,
          source: 'runsignup',
          lastUpdated: new Date()
        };

        const docRef = db.collection(RESULTS_COLLECTION).doc();
        currentBatch.set(docRef, resultDoc);
        batchCount++;
        totalStored++;

        if (batchCount >= BATCH_SIZE) {
          await currentBatch.commit();
          console.log(`Committed batch of ${batchCount} results for race ${raceId}`);
          currentBatch = db.batch();
          batchCount = 0;
          await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
        }
      }
    } catch (error) {
      console.error(`Error processing result for race ${raceId}:`, error);
    }
  }

  // Commit any remaining results
  if (batchCount > 0) {
    await currentBatch.commit();
    console.log(`Committed final batch of ${batchCount} results for race ${raceId}`);
  }

  return totalStored;
}

// HTTP endpoint to fetch results for a specific race
export const getRunSignUpResultsHttp = https.onRequest(
  {
    cors: ["https://localhost:5173", "http://localhost:5173", "https://blister-4781e.web.app"],
    maxInstances: 1
  },
  async (req, res) => {
    try {
      const { raceId } = req.query;
      if (!raceId) {
        res.status(400).json({ error: 'Missing raceId parameter' });
        return;
      }

      console.log(`Fetching results for race ID: ${raceId}`);
      const results = await fetchRunSignUpResults(raceId);
      const storedCount = await storeRunSignUpResults(raceId, results);
      
      res.json({
        status: 'success',
        message: `Stored ${storedCount} new results for race ID: ${raceId}`,
        totalResults: results.length
      });
    } catch (error) {
      console.error('Error in results fetch:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Scheduled function to sync results daily
export const syncRunSignUpResults = scheduler.onSchedule(
  {
    schedule: "every 24 hours",
    region: "us-central1"
  },
  async (context) => {
    console.log('Starting scheduled RunSignUp results sync...');
    const startTime = Date.now();
    let totalProcessed = 0;
    let totalStored = 0;

    try {
      const snapshot = await db.collection(PAST_EVENTS_COLLECTION).get();
      
      for (const doc of snapshot.docs) {
        const raceData = doc.data();
        if (raceData.source === 'runsignup' && raceData.sourceId) {
          console.log(`Processing results for race: ${raceData.name} (${raceData.sourceId})`);
          const results = await fetchRunSignUpResults(raceData.sourceId);
          const storedCount = await storeRunSignUpResults(raceData.sourceId, results);
          totalProcessed++;
          totalStored += storedCount;
        }
      }

      console.log('RunSignUp results sync completed:', {
        totalRaces: totalProcessed,
        totalResults: totalStored,
        durationSeconds: Math.round((Date.now() - startTime) / 1000)
      });
    } catch (error) {
      console.error('Error in results sync:', error);
      throw error;
    }
  }
);

// Export the function
export default fetchRunSignUpResults; 