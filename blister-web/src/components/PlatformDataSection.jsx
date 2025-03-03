import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import ConnectPlatforms from './ConnectPlatforms';
import WhoopDataDisplay from './WhoopDataDisplay';
import PerformanceMetrics from './PerformanceMetrics';

const PlatformDataSection = ({ userId }) => {
  const [connectedPlatforms, setConnectedPlatforms] = useState({
    whoop: false,
    strava: false
  });
  const [platformData, setPlatformData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkConnectedPlatforms = async () => {
      try {
        const userTokensDoc = await getDoc(doc(db, 'userTokens', userId));
        if (userTokensDoc.exists()) {
          const data = userTokensDoc.data();
          setConnectedPlatforms({
            whoop: !!data.whoop?.access_token,
            strava: !!data.strava?.access_token
          });
        }
      } catch (error) {
        console.error('Error checking connected platforms:', error);
        setError('Failed to check connected platforms');
      }
    };

    const fetchPlatformData = async () => {
      try {
        setLoading(true);
        const functions = getFunctions();
        const getPerformanceMetrics = httpsCallable(functions, 'getPerformanceMetrics');
        const result = await getPerformanceMetrics({ userId });
        setPlatformData(result.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching platform data:', err);
        setError('Failed to load performance data');
      } finally {
        setLoading(false);
      }
    };

    checkConnectedPlatforms();
    if (userId) {
      fetchPlatformData();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Training Data</h2>
          <ConnectPlatforms />
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-4 py-1">
              <div className="h-4 bg-slate-200 rounded w-3/4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-slate-200 rounded"></div>
                <div className="h-4 bg-slate-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Training Data</h2>
          <ConnectPlatforms />
        </div>
        <div className="bg-white rounded-lg shadow p-6 text-red-600">
          {error}
        </div>
      </div>
    );
  }

  const hasConnectedPlatforms = connectedPlatforms.whoop || connectedPlatforms.strava;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Training Data</h2>
        <ConnectPlatforms onConnect={() => {
          // Refresh connected platforms and data after new connection
          checkConnectedPlatforms();
          fetchPlatformData();
        }} />
      </div>

      {/* Show performance metrics if we have platform data */}
      {platformData?.metrics && (
        <PerformanceMetrics metrics={platformData.metrics} />
      )}

      {/* Show WHOOP data if connected */}
      {connectedPlatforms.whoop && (
        <WhoopDataDisplay userId={userId} />
      )}

      {/* Show connection status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Connected Platforms</h3>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${connectedPlatforms.whoop ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className="text-gray-600">WHOOP</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${connectedPlatforms.strava ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className="text-gray-600">Strava</span>
          </div>
        </div>
      </div>

      {/* Show connection prompt if no platforms connected */}
      {!hasConnectedPlatforms && (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-600">
            Connect your training platforms to see your data here
          </p>
        </div>
      )}
    </div>
  );
};

export default PlatformDataSection; 