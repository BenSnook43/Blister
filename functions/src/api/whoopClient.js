const admin = require('firebase-admin');
const fetch = require('node-fetch');

class WhoopClient {
  constructor(userId) {
    this.userId = userId;
    this.db = admin.firestore();
    this.baseUrl = 'https://api.prod.whoop.com/developer/v1';
    this.tokenRef = this.db.collection('userTokens').doc(userId);
  }

  async getValidToken() {
    const doc = await this.tokenRef.get();
    const whoopData = doc.data()?.whoop;

    console.log('Current WHOOP token data:', {
      hasAccessToken: !!whoopData?.access_token,
      hasRefreshToken: !!whoopData?.refresh_token,
      tokenAge: whoopData?.updated_at ? 
        `${Math.round((Date.now() - new Date(whoopData.updated_at).getTime()) / 1000 / 60)} minutes` : 
        'unknown',
      expiresIn: whoopData?.expires_in || 'unknown',
      expiresAt: whoopData?.expires_at || 'unknown',
      scope: whoopData?.scope || 'unknown'
    });

    if (!whoopData?.access_token) {
      throw new Error('No WHOOP access token found');
    }

    // Check if token needs refresh
    if (this.isTokenExpired(whoopData)) {
      console.log('Token expired, attempting refresh...');
      return this.refreshToken(whoopData.refresh_token);
    }

    return whoopData.access_token;
  }

  isTokenExpired(tokenData) {
    if (!tokenData.expires_at) {
      console.log('Token expiration cannot be determined:', {
        hasExpiresAt: !!tokenData.expires_at
      });
      return true;
    }
    
    const expirationTime = new Date(tokenData.expires_at).getTime();
    const timeUntilExpiry = Math.round((expirationTime - Date.now()) / 1000 / 60);
    
    console.log('Token expiration check:', {
      expiresAt: tokenData.expires_at,
      timeUntilExpiry: `${timeUntilExpiry} minutes`,
      isExpired: timeUntilExpiry <= 5
    });
    
    return timeUntilExpiry <= 5; // Refresh 5 minutes before expiry
  }

  async refreshToken(refreshToken) {
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    console.log('Starting token refresh...');

    const whoopId = process.env.WHOOP_ID;
    const whoopSecret = process.env.WHOOP_SECRET;

    console.log('WHOOP credentials check:', {
      hasClientId: !!whoopId,
      hasClientSecret: !!whoopSecret,
      refreshTokenPrefix: refreshToken.substring(0, 8) + '...'
    });

    const refreshParams = {
      grant_type: 'refresh_token',
      client_id: whoopId,
      client_secret: whoopSecret,
      scope: 'offline read:profile read:recovery read:workout read:sleep',
      refresh_token: refreshToken
    };

    const response = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(refreshParams).toString()
    });

    const responseText = await response.text();
    console.log('Token refresh response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseText
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status} - ${responseText}`);
    }

    const newTokens = JSON.parse(responseText);

    // Update tokens in Firestore
    const updateData = {
      whoop: {
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token,
        expires_in: newTokens.expires_in,
        expires_at: new Date(Date.now() + (newTokens.expires_in * 1000)).toISOString(),
        updated_at: new Date().toISOString(),
        scope: newTokens.scope,
        token_type: newTokens.token_type
      }
    };

    console.log('Updating tokens in Firestore:', {
      hasNewAccessToken: !!newTokens.access_token,
      hasNewRefreshToken: !!newTokens.refresh_token,
      expiresIn: newTokens.expires_in,
      expiresAt: updateData.whoop.expires_at,
      scope: newTokens.scope,
      tokenType: newTokens.token_type
    });

    await this.tokenRef.set(updateData, { merge: true });
    console.log('Token refresh completed successfully');

    return newTokens.access_token;
  }

  async request(endpoint, options = {}) {
    const token = await this.getValidToken();
    const url = `${this.baseUrl}${endpoint}`;

    console.log('Making WHOOP API request:', {
      url,
      endpoint,
      method: options.method || 'GET',
      hasToken: !!token
    });

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('WHOOP API error details:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        error: errorText,
        endpoint,
        url
      });
      throw new Error(`WHOOP API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  // API Methods
  async getProfile() {
    return this.request('/user/profile/basic');
  }

  async getRecovery(startDate) {
    return this.request(`/recovery?start=${startDate.toISOString()}`);
  }

  async getWorkouts(startDate) {
    return this.request(`/activity/workout?start=${startDate.toISOString()}`);
  }

  async getSleep(startDate) {
    return this.request(`/activity/sleep?start=${startDate.toISOString()}`);
  }
}

module.exports = WhoopClient; 