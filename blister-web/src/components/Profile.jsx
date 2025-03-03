import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

function ProfilePage() {
  const { user } = useAuth();
  const [pastEvents, setPastEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Admin user ID - replace with your Firebase UID
  const ADMIN_UID = "YOUR_ADMIN_UID";

  const fetchPastEvents = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        'https://us-central1-blister-4781e.cloudfunctions.net/getPastEventsHttp'
      );
      const data = await response.json();
      console.log('Past events:', data);
      setPastEvents(data.data || []);
    } catch (err) {
      console.error('Error fetching past events:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAndStoreRaces = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        'https://us-central1-blister-4781e.cloudfunctions.net/fetchAndStoreRaces',
        { method: 'POST' }
      );
      const data = await response.json();
      console.log('Fetch races response:', data);
      alert('Race fetch initiated successfully!');
    } catch (err) {
      console.error('Error fetching races:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      {/* Admin Section */}
      {user && user.uid === ADMIN_UID && (
        <div className="mb-8 p-4 bg-gray-100 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Admin Controls</h2>
          <div className="flex gap-4">
            <button
              onClick={fetchAndStoreRaces}
              className="bg-green-600 text-white px-4 py-2 rounded"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Fetch New Races'}
            </button>
            <button
              onClick={fetchPastEvents}
              className="bg-purple-600 text-white px-4 py-2 rounded"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'View Past Events'}
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="text-red-500 mt-4">
          Error: {error}
        </div>
      )}

      {/* Past Events Display */}
      {pastEvents.length > 0 && (
        <div className="mt-4">
          <h2 className="text-xl font-bold mb-4">Past Events</h2>
          {pastEvents.map((event) => (
            <div key={event.id} className="border p-4 mb-4 rounded shadow-sm hover:shadow-md transition-shadow">
              <h3 className="font-bold text-lg">{event.name}</h3>
              <p className="text-gray-600">Date: {new Date(event.date).toLocaleDateString()}</p>
              <p className="text-gray-600">Location: {event.location.city}, {event.location.state}</p>
              <div className="mt-2">
                <strong>Distances:</strong>
                <ul className="list-disc ml-4">
                  {event.distances.map((d, i) => (
                    <li key={i} className="text-gray-700">
                      {d.name} - {d.distance} {d.unit}
                    </li>
                  ))}
                </ul>
              </div>
              {event.resultsUrl && (
                <a 
                  href={event.resultsUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:underline mt-2 inline-block"
                >
                  View Results →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProfilePage; 