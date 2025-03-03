import { getFirestore } from "firebase-admin/firestore";
import { initializeApp } from "firebase-admin/app";
import fetch from "node-fetch";
import { scheduler } from "firebase-functions/v2";
import { https } from "firebase-functions/v2";
import cors from 'cors';

// Get project ID from Firebase
const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_CONFIG?.projectId || 'blister-4781e';

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// Initialize CORS middleware
const corsMiddleware = cors({ 
  origin: true,  // Allow all origins for now
  credentials: true 
});

// Constants
const RESULTS_PER_PAGE = 1000;
const RATE_LIMIT_DELAY = 1000;
const BATCH_SIZE = 100;
const SF_ZIPCODE = "94115";  // Central San Francisco zipcode

// Constants for filtering
const MAX_DISTANCE_MILES = 50;
const MIN_DATE = new Date('2020-01-01');
const NOW = new Date();

// Replace BAY_AREA_LOCATIONS with single SF location
const SF_LOCATION = { 
  lat: 37.7749,
  long: -122.4194,
  name: "San Francisco"
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Update collection name
const COLLECTION_NAME = "runsignup_past_events";

// Update function names
export const fetchRunSignUpPastRaces = scheduler.onSchedule(
  {
    schedule: "0 0 * * *",
    region: "us-central1",
    memory: "256MiB"
  }, 
  async (context) => {
    await fetchRunSignUpPastRacesLogic();
  }
);

export const getRunSignUpPastEventsHttp = https.onRequest({
  timeoutSeconds: 60, // Function will timeout after 60 seconds
  memory: '256MB',
  cors: true,
}, async (req, res) => {
  let isRunning = true;
  const startTime = Date.now();
  const TIMEOUT = 55000; // 55 seconds to allow for cleanup

  // Create an AbortController for fetch requests
  const controller = new AbortController();
  const { signal } = controller;

  // Cleanup function
  const cleanup = () => {
    isRunning = false;
    controller.abort();
  };

  try {
    console.log('Starting RunSignUp past events fetch...');

    // Handle manual stop via query parameter
    if (req.query.stop === 'true') {
      cleanup();
      return res.json({ 
        status: 'stopped',
        message: 'Function stopped by request'
      });
    }

    let page = 1;
    let totalProcessed = 0;
    const results = [];

    while (isRunning) {
      // Check timeout
      if (Date.now() - startTime > TIMEOUT) {
        console.log('Function timeout reached');
        break;
      }

      console.log(`Fetching page ${page}...`);
      
      try {
        const url = new URL("https://runsignup.com/rest/races");
        const params = {
          start_date: "2020-01-01",
          end_date: new Date().toISOString().split('T')[0],
          distance_units: "M",
          results_per_page: RESULTS_PER_PAGE,
          page: page,
          format: "json",
          zipcode: SF_ZIPCODE,
          radius: MAX_DISTANCE_MILES,
          past_races: "T",
          only_races_with_results: "T"
        };

        url.search = new URLSearchParams(params).toString();
        console.log(`Fetching URL: ${url.toString()}`);

        const response = await fetch(url, { 
          signal,
          timeout: 5000 
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const xmlText = await response.text();
        console.log(`Received response (${xmlText.length} bytes)`);
        
        const results = parseXMLResults(xmlText);
        totalProcessed += results.length;

        // Send progress update
        if (totalProcessed % 100 === 0) {
          res.write(JSON.stringify({ 
            progress: totalProcessed,
            status: 'processing'
          }) + '\n');
        }

        page++;

      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('Fetch aborted');
          break;
        }
        throw error;
      }
    }

    cleanup();
    
    return res.json({
      status: 'completed',
      totalProcessed,
      timeElapsed: Date.now() - startTime,
      message: isRunning ? 'Completed successfully' : 'Stopped early'
    });

  } catch (error) {
    console.error('Error in past events fetch:', error);
    cleanup();
    
    return res.status(500).json({
      status: 'error',
      error: error.message,
      timeElapsed: Date.now() - startTime
    });
  }
});

// Update function name
async function fetchRunSignUpPastRacesLogic() {
  const startTime = Date.now();
  console.log('Starting RunSignUp past races fetch at:', new Date().toISOString(), {
    collection: COLLECTION_NAME
  });
  
  let totalProcessed = 0;
  let pastEventsCount = 0;
  let currentBatch = db.batch();
  let batchCount = 0;
  let saveCount = 0;

  try {
    console.log(`Processing races for ${SF_LOCATION.name}...`);
    let page = 1;
    let hasMoreResults = true;

    while (hasMoreResults) {
      console.log(`Fetching page ${page}...`);
      const url = new URL("https://runsignup.com/rest/races");
      const params = {
        start_date: "2020-01-01",
        end_date: new Date().toISOString().split('T')[0],
        distance_units: "M",
        results_per_page: RESULTS_PER_PAGE,
        page: page,
        format: "json",
        zipcode: SF_ZIPCODE,
        radius: MAX_DISTANCE_MILES,
        past_races: "T",
        only_races_with_results: "T"
      };

      url.search = new URLSearchParams(params).toString();
      console.log(`Fetching URL: ${url.toString()}`);

      const response = await fetch(url);
      if (!response.ok) {
        console.error(`Failed to fetch page ${page}:`, {
          status: response.status,
          statusText: response.statusText
        });
        break;
      }

      const data = await response.json();

      // Log the full structure of the first response
      if (page === 1) {
        console.log('First API response structure:', JSON.stringify({
          hasRaces: Boolean(data.races),
          firstRace: data.races?.[0],
          raceCount: data.races?.length,
          responseKeys: Object.keys(data)
        }, null, 2));
      }

      // Get races directly from the races array
      const races = data.races || [];
      console.log(`Found ${races.length} races on page ${page}`);
      
      if (races.length === 0) {
        hasMoreResults = false;
        continue;
      }

      // Process each race
      for (const race of races) {
        try {
          const raceData = race.race;
          if (!raceData) {
            console.warn('Skipping race: No race data');
            continue;
          }

          // Check if we have at least a city and state
          if (!raceData.address?.city || !raceData.address?.state) {
            console.warn(`Skipping race ${raceData.race_id}: No city/state information`);
            continue;
          }

          // Calculate distance only if coordinates exist
          let distance = null;
          const latitude = parseFloat(raceData.address?.latitude || raceData.latitude || '0');
          const longitude = parseFloat(raceData.address?.longitude || raceData.longitude || '0');
          
          if (latitude && longitude) {
            distance = calculateDistance(
              SF_LOCATION.lat,
              SF_LOCATION.long,
              latitude,
              longitude
            );
          }

          // If we have coordinates and it's too far, skip
          if (distance && distance > MAX_DISTANCE_MILES) {
            console.warn(`Skipping race ${raceData.race_id}: Outside radius (${Math.round(distance)} miles from SF)`);
            continue;
          }

          console.log(`Processing race:`, {
            id: raceData.race_id,
            name: raceData.name,
            location: `${raceData.address?.city}, ${raceData.address?.state}`
          });

          const processedRaceData = {
            race_id: raceData.race_id?.toString(),
            name: raceData.name || 'Unknown Race',
            location: {
              city: raceData.address?.city,
              state: raceData.address?.state,
              coordinates: latitude && longitude ? {
                latitude,
                longitude
              } : null
            },
            date: parseDate(raceData.last_date || raceData.next_date),
            website: raceData.url || null,
            hasResults: Boolean(raceData.external_results_url || raceData.results_url),
            resultsUrl: raceData.external_results_url || raceData.results_url || null,
            source: 'runsignup',
            sourceId: raceData.race_id?.toString(), // Add explicit source ID
            lastUpdated: new Date()
          };

          // Validate the date
          const eventDate = processedRaceData.date;
          if (!eventDate || isNaN(eventDate.getTime()) || eventDate < MIN_DATE || eventDate > NOW) {
            console.warn(`Skipping race ${processedRaceData.race_id}: Invalid date`);
            continue;
          }

          const docRef = db.collection(COLLECTION_NAME).doc(processedRaceData.race_id);
          currentBatch.set(docRef, processedRaceData, { merge: true });
          batchCount++;
          totalProcessed++;
          pastEventsCount++;

          console.log(`Added race ${processedRaceData.race_id} to batch. Current batch size: ${batchCount}`);

          // Save more frequently
          if (batchCount >= BATCH_SIZE) {
            console.log(`Committing batch of ${batchCount} events to ${COLLECTION_NAME} (total processed: ${totalProcessed})`);
            try {
              await currentBatch.commit();
              saveCount += batchCount;
              console.log(`Successfully saved batch. Total saved: ${saveCount}`);
              
              // Reset batch
              batchCount = 0;
              currentBatch = db.batch();
              
              // Add a small delay between batches
              await sleep(500);
            } catch (error) {
              console.error(`Error saving batch:`, error);
              // Create a new batch and continue
              currentBatch = db.batch();
              batchCount = 0;
            }
          }
        } catch (error) {
          console.error(`Error in race processing loop for race ${race?.race_id}:`, error);
          continue; // Skip this race but continue with others
        }
      }

      // Save any remaining items in the batch
      if (batchCount > 0) {
        console.log(`Committing final page batch of ${batchCount} events`);
        try {
          await currentBatch.commit();
          saveCount += batchCount;
          console.log(`Successfully saved final page batch. Total saved: ${saveCount}`);
        } catch (error) {
          console.error(`Error saving final page batch: ${error.message}`);
        }
        batchCount = 0;
        currentBatch = db.batch();
      }

      page++;
      console.log(`Completed page ${page-1}. Total processed: ${totalProcessed}, Total saved: ${saveCount}`);
      await sleep(RATE_LIMIT_DELAY);
    }

    console.log('RunSignUp race fetch completed:', {
      totalProcessed,
      totalSaved: saveCount,
      pastEventsCount,
      collection: COLLECTION_NAME,
      durationSeconds: Math.round((Date.now() - startTime) / 1000)
    });

  } catch (error) {
    console.error("Error in RunSignUp fetch:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      totalProcessed,
      totalSaved: saveCount,
      collection: COLLECTION_NAME,
      durationSeconds: Math.round((Date.now() - startTime) / 1000)
    });
    throw error;
  }
}

// Helper function to calculate distance between coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3963; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Helper to parse date strings consistently
function parseDate(dateStr) {
  if (!dateStr) return null;
  // Handle "MM/DD/YYYY" format
  const [month, day, year] = dateStr.split('/');
  if (month && day && year) {
    return new Date(year, month - 1, day);
  }
  // Fallback to standard parsing
  return new Date(dateStr);
}

// Helper function to parse XML results
function parseXMLResults(xmlText) {
  console.log('Raw XML received:', xmlText.substring(0, 1000));
  
  // First check for results wrapper
  if (!xmlText.includes('<event_individual_results>')) {
    console.log('No <event_individual_results> tag found in XML');
    return [];
  }

  // Try to get the individual results sets
  const resultsSets = xmlText.match(/<individual_results_set>([\s\S]*?)<\/individual_results_set>/g);
  if (!resultsSets) {
    console.log('Could not extract individual_results_set sections');
    return [];
  }

  console.log(`Found ${resultsSets.length} result sets`);
  
  let allResults = [];
  for (const resultSet of resultsSets) {
    // Try different possible XML structures for individual results
    const patterns = [
      /<individual_result>([\s\S]*?)<\/individual_result>/g,
      /<participant>([\s\S]*?)<\/participant>/g,
      /<runner>([\s\S]*?)<\/runner>/g
    ];

    let resultMatches = null;
    for (const pattern of patterns) {
      const matches = resultSet.match(pattern);
      if (matches && matches.length > 0) {
        resultMatches = matches;
        console.log(`Found ${matches.length} results using pattern: ${pattern.source}`);
        break;
      }
    }

    if (!resultMatches) {
      console.log('No individual results found in result set:', resultSet.substring(0, 200));
      continue;
    }

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

        // Get result set metadata
        const resultSetName = getField('individual_result_set_name');
        const resultsSource = getField('results_source_name');
        
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
          source_name: resultsSource
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