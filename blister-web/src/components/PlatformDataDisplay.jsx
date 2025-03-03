import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../utils/AuthContext';
import { RefreshCw, Activity, Heart, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import PerformanceMetrics from './PerformanceMetrics';
import WhoopDataDisplay from './WhoopDataDisplay';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

const PlatformDataDisplay = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [platformData, setPlatformData] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [connectedPlatforms, setConnectedPlatforms] = useState({});

  const functions = getFunctions();
  const getPerformanceMetrics = httpsCallable(functions, 'getPerformanceMetrics');
  const triggerSync = httpsCallable(functions, 'triggerSync');

  useEffect(() => {
    const initializeData = async () => {
      if (user) {
        try {
          setLoading(true);
          await checkConnectedPlatforms();
          await fetchData();
        } catch (error) {
          console.error('Error initializing data:', error);
          setError(error.message);
        } finally {
          setLoading(false);
        }
      }
    };

    initializeData();
  }, [user]);

  const checkConnectedPlatforms = async () => {
    try {
      const userTokensRef = doc(db, 'userTokens', user.uid);
      const userTokensDoc = await getDoc(userTokensRef);
      
      if (userTokensDoc.exists()) {
        const tokens = userTokensDoc.data();
        setConnectedPlatforms({
          strava: !!tokens.strava?.access_token,
          whoop: !!tokens.whoop?.access_token
        });
      }
    } catch (err) {
      console.error('Error checking connected platforms:', err);
      setError('Failed to check connected platforms');
    }
  };

  const fetchData = async () => {
    try {
      const idToken = await user?.getIdToken();
      if (!idToken) {
        throw new Error("No authentication token available");
      }

      const result = await getPerformanceMetrics({
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (result.data.error) {
        throw new Error(result.data.error);
      }

      setPlatformData(result.data);
    } catch (error) {
      console.error("Error fetching platform data:", error);
      setError(error.message);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setError(null);
      
      console.log('Starting sync...', { userId: user?.uid });
      
      if (!user) {
        throw new Error('No authenticated user');
      }

      const result = await triggerSync();
      console.log('Sync response:', result);

      if (result.data.error) {
        throw new Error(result.data.error);
      }

      // Refetch data after sync
      await fetchData();
      
      // Show success message
      alert(result.data.message || 'Data sync completed successfully!');
    } catch (err) {
      console.error('Error syncing data:', err);
      setError(err.message || 'Failed to sync platform data');
      alert(err.message || 'Failed to sync data. Please try again.');
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // If no platforms are connected, show the connect platforms card
  if (!connectedPlatforms.strava && !connectedPlatforms.whoop) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-sm">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Connect Your Platforms</h2>
          <p className="text-slate-600">Connect your fitness platforms to see your performance data</p>
        </div>
        <Link
          to="/settings/connections"
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Connect Platforms
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with sync button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-800">Performance Overview</h2>
        <div className="flex items-center space-x-4">
          <Link
            to="/settings/connections"
            className="text-sm text-purple-600 hover:text-purple-700"
          >
            Manage Connections
          </Link>
          <button
            onClick={handleSync}
            disabled={syncing || loading}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Performance Metrics */}
      {metrics && <PerformanceMetrics metrics={metrics} />}

      {/* Platform-specific displays */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {connectedPlatforms.whoop && platformData?.whoop && (
          <WhoopDataDisplay data={platformData.whoop} />
        )}
        
        {connectedPlatforms.strava && platformData?.strava && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center mb-4">
              <Activity className="w-5 h-5 text-purple-600 mr-2" />
              <h3 className="text-lg font-medium text-slate-800">Strava Activities</h3>
            </div>
            {platformData.strava.activities?.records?.length > 0 ? (
              <div className="space-y-4">
                {platformData.strava.activities.records.slice(0, 5).map(activity => (
                  <div key={activity.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-700">{activity.type}</p>
                      <p className="text-sm text-slate-500">
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center text-slate-700">
                      <Heart className="w-4 h-4 mr-1" />
                      {activity.average_heartrate ? Math.round(activity.average_heartrate) : '--'} bpm
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-600 text-center py-4">No recent activities found</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlatformDataDisplay; 