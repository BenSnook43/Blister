const parseResults = async (xmlData) => {
  try {
    // Check if we got HTML instead of XML
    if (xmlData.trim().toLowerCase().startsWith('<!doctype html>')) {
      console.log('Received HTML instead of XML');
      return [];
    }

    // First check if the XML is empty or just contains the root element
    if (xmlData.trim() === '<?xml version="1.0" encoding="utf-8" ?>' ||
        xmlData.includes('</event_individual_results>') && !xmlData.includes('<individual_results_set>')) {
      console.log('Empty XML response or no result sets');
      return [];
    }

    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(xmlData);
    
    console.log('Parsed XML structure:', 
      JSON.stringify(result?.event_individual_results?.individual_results_set || {}, null, 2)
    );

    // Check for empty response
    if (!result.event_individual_results) {
      console.log('No event_individual_results found');
      return [];
    }

    // Check for empty result set
    if (!result.event_individual_results.individual_results_set) {
      console.log('No individual_results_set found');
      return [];
    }

    // Handle both single and multiple result sets
    const resultSets = Array.isArray(result.event_individual_results.individual_results_set) 
      ? result.event_individual_results.individual_results_set 
      : [result.event_individual_results.individual_results_set];

    let allResults = [];
    
    for (const resultSet of resultSets) {
      console.log(`Processing result set: ${resultSet.individual_result_set_name}`);
      
      // Skip if no individual_results or if it's empty
      if (!resultSet.individual_results?.individual_result) {
        console.log(`No results found in set: ${resultSet.individual_result_set_name}`);
        continue;
      }

      const results = Array.isArray(resultSet.individual_results.individual_result)
        ? resultSet.individual_results.individual_result
        : [resultSet.individual_results.individual_result];

      console.log(`Found ${results.length} results in set ${resultSet.individual_result_set_name}`);
      
      allResults = allResults.concat(results.map(result => ({
        resultId: result.result_id,
        place: result.place,
        bib: result.bib,
        name: `${result.first_name} ${result.last_name}`,
        age: result.age,
        gender: result.gender,
        city: result.city,
        state: result.state,
        finishTime: result.finish_time,
        pace: result.pace,
        division: result.division_name,
        divisionPlace: result.division_place,
        setName: resultSet.individual_result_set_name
      })));
    }

    return allResults;
  } catch (error) {
    console.error('Error parsing XML:', error);
    console.log('Raw XML that caused error:', xmlData.substring(0, 500));
    return [];
  }
};

exports.getRunSignUpResultsHttp = functions.https.onRequest(async (req, res) => {
  try {
    const raceId = req.query.raceId;
    const eventId = req.query.eventId;

    if (!raceId) {
      return res.status(400).json({ error: 'Race ID is required' });
    }

    // Try various endpoint formats
    const endpoints = [
      `https://runsignup.com/Rest/race/${raceId}/results/get-results`,
      `https://runsignup.com/Rest/race/${raceId}/results`,
      eventId ? `https://runsignup.com/Rest/race/${raceId}/results/get-results?event_id=${eventId}` : null,
      eventId ? `https://runsignup.com/Rest/race/${raceId}/results?event_id=${eventId}` : null
    ].filter(Boolean); // Remove null entries

    let results = [];
    let successfulEndpoint = null;
    let errors = [];

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);
        const response = await fetch(endpoint);
        
        if (!response.ok) {
          const error = `Endpoint ${endpoint} returned status ${response.status}`;
          console.log(error);
          errors.push(error);
          continue;
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('xml')) {
          const error = `Endpoint ${endpoint} returned non-XML content: ${contentType}`;
          console.log(error);
          errors.push(error);
          continue;
        }

        const xmlData = await response.text();
        console.log(`Response from ${endpoint} (${xmlData.length} bytes)`);

        if (xmlData.includes('event_individual_results')) {
          results = await parseResults(xmlData);
          if (results.length > 0) {
            successfulEndpoint = endpoint;
            break;
          }
        }
      } catch (error) {
        const errorMsg = `Error with endpoint ${endpoint}: ${error.message}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    if (!successfulEndpoint) {
      return res.json({
        success: true,
        totalResults: 0,
        message: 'No results found for this race',
        raceId,
        eventId,
        triedEndpoints: endpoints,
        errors
      });
    }

    // Save results to Firestore
    const batch = db.batch();
    for (const result of results) {
      const resultRef = db.collection('raceResults').doc();
      batch.set(resultRef, {
        ...result,
        raceId,
        eventId,
        sourceType: 'runsignup',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    await batch.commit();

    return res.json({
      success: true,
      totalResults: results.length,
      message: `Successfully processed ${results.length} results`,
      raceId,
      eventId,
      endpoint: successfulEndpoint
    });

  } catch (error) {
    console.error('Error processing results:', error);
    return res.status(500).json({ 
      error: error.message,
      stack: error.stack
    });
  }
}); 