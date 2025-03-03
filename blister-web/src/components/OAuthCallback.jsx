import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { platform } = useParams();
  const { user } = useAuth();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleCallback = async () => {
      setLoading(true);
      setError(null);

      try {
        const code = new URLSearchParams(location.search).get('code');
        const state = new URLSearchParams(location.search).get('state');

        if (!code || !platform) {
          throw new Error('Missing required parameters');
        }

        // Exchange the code for tokens
        const idToken = await user.getIdToken();
        const response = await fetch(import.meta.env.VITE_TOKEN_EXCHANGE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({ 
            code,
            platform,
            state,
            userId: user.uid,
            redirectUri: window.location.origin + `/auth/${platform}/callback`
          })
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to exchange token');
        }

        // Trigger initial sync after successful connection
        const syncResponse = await fetch('https://us-central1-blister-4781e.cloudfunctions.net/triggerSync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          }
        });

        if (!syncResponse.ok) {
          console.error('Initial sync failed:', await syncResponse.json());
        }

        navigate('/settings/connections');
      } catch (error) {
        console.error('OAuth callback error:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      handleCallback();
    }
  }, [user, location, navigate, platform]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Connection Error</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <p className="text-slate-500 text-sm">Redirecting to profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-slate-600">Connecting your account...</p>
      </div>
    </div>
  );
} 