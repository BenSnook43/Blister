import axios from 'axios';
import { load } from 'cheerio';

// Use a CORS proxy to avoid browser restrictions
const CORS_PROXY = 'https://corsproxy.io/';

// Mapbox geocoding endpoint
const MAPBOX_TOKEN = 'pk.eyJ1IjoiYmVuc25vb2sxIiwiYSI6ImNtNjY1YzFvZjIzZnAycG9kZXdueDRncmwifQ.qE9qP7n6my4joZwA_XS6tw';

async function geocodeLocation(location) {
  try {
    // Add ", CA" if not present to focus on California locations
    const searchLocation = location.toLowerCase().includes('ca') ? location : `${location}, CA`;
    
    // Use Mapbox Geocoding API directly without CORS proxy
    const response = await axios.get(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchLocation)}.json`,
      {
        params: {
          access_token: MAPBOX_TOKEN,
          country: 'US',
          types: 'place,address',
          limit: 1
        }
      }
    );

    if (response.data.features && response.data.features.length > 0) {
      const [longitude, latitude] = response.data.features[0].center;
      console.log('Successfully geocoded:', { 
        location, 
        searchLocation,
        coordinates: { latitude, longitude },
        raw_response: response.data.features[0]
      });
      return { latitude, longitude };
    }
    
    console.warn('No coordinates found for location:', location);
    return null;
  } catch (error) {
    console.error('Geocoding error for location:', location, error.response?.data || error.message);
    return null;
  }
}

// Sources to scrape from
const EVENT_SOURCES = [
  {
    name: 'SweatTracker',
    url: 'https://sweattracker.com/Find/Calendar',
    parser: async (html) => {
      const $ = load(html);
      const events = [];
      
      console.log('Parsing HTML structure:', $.html().substring(0, 500)); // Debug log
      
      // SweatTracker specific selectors
      for (const el of $('table tr').get()) {
        try {
          // Skip header rows
          if ($(el).find('th').length) continue;
          
          const cells = $(el).find('td');
          if (cells.length < 4) continue;

          const dateText = $(cells[0]).text().trim();
          const title = $(cells[1]).text().trim();
          const distance = $(cells[2]).text().trim();
          const location = $(cells[3]).text().trim();
          const description = $(cells[4]).text().trim();
          const eventUrl = $(cells[1]).find('a').attr('href');
          
          if (!title) continue;

          // Geocode the location
          const coordinates = await geocodeLocation(location);
          if (!coordinates) {
            console.warn(`Skipping event "${title}" due to missing coordinates for location: ${location}`);
            continue;
          }
          
          // Verify coordinates before adding event
          if (coordinates.latitude === 37.7749 && coordinates.longitude === -122.4194) {
            console.warn(`Default SF coordinates detected for "${title}" in ${location}, skipping event`);
            continue;
          }
          
          events.push({
            title,
            location: location || 'San Francisco Bay Area',
            time: dateText || 'TBD',
            date: dateText,
            type: determineEventType(title, distance),
            source: 'SweatTracker',
            sourceUrl: eventUrl ? `https://sweattracker.com${eventUrl}` : null,
            distance,
            description: description || `${distance} running event in ${location}`,
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            verified: true
          });
        } catch (err) {
          console.error('Error parsing event:', err);
        }
      }
      
      console.log('Found events:', events.length); // Debug log
      return events;
    }
  }
];

// Updated helper function to include distance-based type determination
function determineEventType(text, distance = '') {
  const normalized = (text + ' ' + distance).toLowerCase();
  
  // Triathlon events
  if (
    normalized.includes('triathlon') ||
    normalized.includes('tri') ||
    normalized.includes('70.3') ||
    normalized.includes('140.6') ||
    normalized.includes('ironman') ||
    normalized.includes('sprint') ||
    normalized.includes('olympic')
  ) {
    return 'triathlon';
  }
  
  // Ultra events (typically 50K or longer)
  if (
    normalized.includes('50k') || 
    normalized.includes('50m') || 
    normalized.includes('100k') || 
    normalized.includes('100m') ||
    normalized.includes('ultra') ||
    /\b[5-9][0-9]k|\b1[0-9][0-9]k/.test(normalized) // Matches 50k-199k
  ) {
    return 'ultra';
  }
  
  // Trail events
  if (
    normalized.includes('trail') || 
    normalized.includes('mountain') ||
    normalized.includes('hills') ||
    normalized.includes('wilderness') ||
    normalized.includes('forest')
  ) {
    return 'trail';
  }
  
  // Track events (typically shorter distances or specific track mentions)
  if (
    normalized.includes('track') || 
    normalized.includes('5k') || 
    normalized.includes('10k') ||
    normalized.includes('mile') ||
    normalized.includes('sprint')
  ) {
    return 'track';
  }
  
  // Road events (marathons and half marathons)
  if (
    normalized.includes('marathon') ||
    normalized.includes('13.1') ||
    normalized.includes('26.2') ||
    normalized.includes('road') ||
    normalized.includes('street')
  ) {
    return 'road';
  }
  
  // Default to road if no specific type is determined
  return 'road';
}

export async function scrapeEvents() {
  console.log('Starting event fetch...');
  
  try {
    const response = await axios.get('http://localhost:3001/scrape-events', {
      timeout: 60000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Raw response:', response);
    
    if (response.data && Array.isArray(response.data)) {
      console.log(`Successfully fetched ${response.data.length} events`);
      return response.data;
    } else {
      console.error('Invalid response format:', response.data);
      throw new Error('Invalid response format from server');
    }
    
  } catch (error) {
    console.error('Error fetching events:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      stack: error.stack
    });
    throw error;
  }
}

