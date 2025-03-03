import React, { useState } from 'react';
import { scrapeEvents } from '../utils/eventScraper';
import { auth } from '../firebaseConfig';
import { saveEvents } from '../utils/services';

function EventScraper() {
  const [scrapedEvents, setScrapedEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleScrape = async () => {
    if (!auth.currentUser) {
      setError('Please log in first');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const events = await scrapeEvents();
      console.log('Events scraped:', events);
      
      if (!Array.isArray(events)) {
        throw new Error('Invalid response format: events is not an array');
      }
      
      setScrapedEvents(events);
    } catch (err) {
      console.error('Error in scraping:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToFirebase = async () => {
    if (!auth.currentUser) {
      setError('Please log in first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { savedCount } = await saveEvents(scrapedEvents);
      alert(`Successfully saved ${savedCount} events!`);
    } catch (err) {
      console.error('Error saving to Firebase:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="flex space-x-4 mb-6">
        <button 
          onClick={handleScrape}
          disabled={isLoading || !auth.currentUser}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          {isLoading ? 'Scraping Events...' : 'Scrape Events'}
        </button>

        {scrapedEvents.length > 0 && (
          <button
            onClick={handleSaveToFirebase}
            disabled={isLoading || !auth.currentUser}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save to Firebase'}
          </button>
        )}
      </div>

      {error && (
        <div className="text-red-500 mt-4 p-4 bg-red-50 rounded-lg">
          {error}
        </div>
      )}
      
      {scrapedEvents.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xl font-bold mb-4">
            Found {scrapedEvents.length} events
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scrapedEvents.map((event, index) => (
              <div key={index} className="p-4 border rounded-lg hover:shadow-lg transition-shadow">
                <h4 className="font-bold text-lg mb-2">{event.title}</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{event.date}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{event.location}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="capitalize">{event.type} - {event.distance}</span>
                  </div>
                </div>

                {event.description && (
                  <p className="mt-3 text-sm text-gray-500 line-clamp-2">
                    {event.description}
                  </p>
                )}
                
                {event.sourceUrl && (
                  <a 
                    href={event.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block text-purple-600 hover:text-purple-800 text-sm"
                  >
                    View Event →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default EventScraper; 