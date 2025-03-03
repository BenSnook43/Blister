import React, { useState, useEffect } from 'react';
import { useAuth } from '../utils/AuthContext';
import { doc, getDoc, setDoc, deleteField } from 'firebase/firestore';
import { db, auth } from '../utils/firebase';

const PLATFORMS = {
  whoop: {
    name: 'Whoop',
    icon: '/platform-icons/whoop.svg',
    clientId: import.meta.env.VITE_WHOOP_CLIENT_ID,
    authUrl: 'https://api.prod.whoop.com/oauth/oauth2/auth',
    redirectUri: import.meta.env.PROD 
      ? 'https://blister.dev/auth/whoop/callback'
      : 'https://localhost:5173/auth/whoop/callback',
    scope: 'offline read:recovery read:sleep read:workout read:body_measurement'
  },
  strava: {
    name: 'Strava',
    icon: '/platform-icons/strava.svg',
    clientId: import.meta.env.VITE_STRAVA_CLIENT_ID,
    redirectUri: import.meta.env.PROD
      ? 'https://blister.dev/auth/strava/callback'
      : 'https://localhost:5173/auth/strava/callback',
    authUrl: 'https://www.strava.com/oauth/authorize',
    scope: 'read,activity:read_all'
  },
  wahoo: {
    name: 'Wahoo',
    icon: '/platform-icons/wahoo.svg',
    clientId: import.meta.env.VITE_WAHOO_CLIENT_ID,
    redirectUri: import.meta.env.PROD
      ? 'https://blister.dev/auth/wahoo/callback'
      : 'https://localhost:5173/auth/wahoo/callback',
    authUrl: 'https://api.wahooligan.com/oauth/authorize',
    scope: 'user_read workouts_read'
  }
};

export default function ConnectPlatforms() {
  const { user } = useAuth();
  const [connectedPlatforms, setConnectedPlatforms] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const loadConnectedPlatforms = async () => {
      if (!user) return;

      try {
        const userTokensRef = doc(db, 'userTokens', user.uid);
        const userTokensDoc = await getDoc(userTokensRef);
        
        if (userTokensDoc.exists()) {
          const data = userTokensDoc.data();
          const platforms = {};
          
          // Check each platform's connection status
          Object.keys(PLATFORMS).forEach(platform => {
            platforms[platform] = !!data[platform]?.access_token;
          });
          
          setConnectedPlatforms(platforms);
        } else {
          // No platforms connected yet
          const platforms = {};
          Object.keys(PLATFORMS).forEach(platform => {
            platforms[platform] = false;
          });
          setConnectedPlatforms(platforms);
        }
      } catch (error) {
        console.error('Error loading connected platforms:', error);
      }
      
      setLoading(false);
    };

    loadConnectedPlatforms();
  }, [user]);

  const handleConnect = async (platform) => {
    if (!user) return;

    const platformConfig = PLATFORMS[platform];
    // Generate a state parameter and store it with the platform name
    const state = crypto.randomUUID();
    const stateKey = `oauth_state_${platform}`;
    
    try {
      // Store state with platform identifier
      localStorage.setItem(stateKey, state);
      console.log('Initiating OAuth flow:', { 
        platform,
        platformConfig,
        state,
        stateKey,
        redirectUri: platformConfig.redirectUri,
        availablePlatforms: Object.keys(PLATFORMS)
      });
      
      // Build the authorization URL with all required parameters
      const params = new URLSearchParams({
        client_id: platformConfig.clientId,
        redirect_uri: platformConfig.redirectUri,
        response_type: 'code',
        scope: platformConfig.scope,
        state: state
      });

      const authUrl = `${platformConfig.authUrl}?${params.toString()}`;
      console.log('Redirecting to auth URL:', {
        platform,
        authUrl,
        params: Object.fromEntries(params)
      });

      // Redirect to the authorization URL
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error initiating OAuth flow:', {
        platform,
        error,
        platformConfig
      });
    }
  };

  const handleDisconnect = async (platform) => {
    if (!user) return;
    
    try {
      const userTokensRef = doc(db, 'userTokens', user.uid);
      await setDoc(userTokensRef, {
        [platform]: deleteField()
      }, { merge: true });

      setConnectedPlatforms(prev => ({
        ...prev,
        [platform]: false
      }));
    } catch (error) {
      console.error('Error disconnecting platform:', error);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      console.log('Starting sync...');
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }

      const idToken = await user.getIdToken();
      console.log('Got ID token, making request...');
      
      const response = await fetch('https://us-central1-blister-4781e.cloudfunctions.net/trigger_sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Log the full response for debugging
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers));
      
      const text = await response.text();
      console.log('Response text:', text);
      
      if (!response.ok) {
        throw new Error(`Sync failed: ${text}`);
      }

      const data = JSON.parse(text);
      setMessage({ type: 'success', text: 'Sync completed successfully' });

    } catch (error) {
      console.error('Sync error:', error);
      setMessage({ 
        type: 'error', 
        text: `Sync failed: ${error.message}` 
      });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Connected Platforms</h2>
        {Object.values(connectedPlatforms).some(p => p) && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
          >
            {syncing ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Syncing...
              </>
            ) : (
              'Sync Now'
            )}
          </button>
        )}
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="grid grid-cols-1 gap-4">
          {Object.entries(PLATFORMS).map(([key, platform]) => (
            <div 
              key={key}
              className="border rounded-lg p-4 flex items-center justify-between bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 flex items-center justify-center">
                  <img 
                    src={platform.icon} 
                    alt={`${platform.name} logo`} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{platform.name}</h3>
                  <p className="text-sm text-slate-500">
                    {connectedPlatforms[key] ? 'Connected' : 'Not connected'}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => connectedPlatforms[key] ? handleDisconnect(key) : handleConnect(key)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  connectedPlatforms[key]
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {connectedPlatforms[key] ? 'Disconnect' : 'Connect'}
              </button>
            </div>
          ))}
        </div>

        <p className="mt-6 text-sm text-slate-500 text-center">
          Connect your fitness platforms to sync your training data with Blister.
          Your data will remain private by default.
        </p>
      </div>
    </div>
  );
} 