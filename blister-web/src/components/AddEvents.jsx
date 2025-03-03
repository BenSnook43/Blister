import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

function AddEvents() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const handleSync = async () => {
    // ... existing sync code ...
  };

  const fetchRaces = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(
        'https://us-central1-blister-4781e.cloudfunctions.net/fetchAndStoreRaces',
        { method: 'POST' }
      );
      const data = await response.json();
      console.log('Fetch races response:', data);
      setMessage('Race fetch initiated successfully!');
    } catch (err) {
      console.error('Error fetching races:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Admin Controls</h1>
      
      <div className="space-y-6">
        {/* Platform Sync Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Platform Sync</h2>
          <button
            onClick={handleSync}
            className="bg-blue-600 text-white px-4 py-2 rounded mr-4"
            disabled={loading}
          >
            {loading ? 'Syncing...' : 'Sync Platform Data'}
          </button>
        </div>

        {/* Race Data Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Race Data Management</h2>
          <button
            onClick={fetchRaces}
            className="bg-green-600 text-white px-4 py-2 rounded"
            disabled={loading}
          >
            {loading ? 'Fetching...' : 'Fetch Race Data'}
          </button>
          <p className="text-sm text-gray-600 mt-2">
            Fetches race data from RunSignUp for the SF and NY areas
          </p>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
          Error: {error}
        </div>
      )}
      {message && (
        <div className="mt-4 p-4 bg-green-100 text-green-700 rounded">
          {message}
        </div>
      )}
    </div>
  );
}

export default AddEvents; 