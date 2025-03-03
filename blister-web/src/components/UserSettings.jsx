import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../utils/AuthContext';
import { Settings, Medal, Shield, Eye, EyeOff, Users, Check } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

function UserSettings() {
  const { user: currentUser } = useAuth();
  const [settings, setSettings] = useState({
    prPreferences: {
      selectedPR: 'auto', // 'auto', 'marathon', 'halfMarathon', '70.3', '140.6'
    },
    privacy: {
      raceDataVisibility: 'followers', // 'public', 'followers', 'private'
    }
  });
  const [loading, setLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState(null);

  useEffect(() => {
    const loadSettings = async () => {
      if (!currentUser) return;

      try {
        const userSettingsRef = doc(db, 'userSettings', currentUser.uid);
        const settingsDoc = await getDoc(userSettingsRef);
        
        if (settingsDoc.exists()) {
          setSettings(settingsDoc.data());
        } else {
          // Create default settings
          await setDoc(userSettingsRef, settings);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [currentUser]);

  const handleSettingChange = async (section, key, value) => {
    try {
      const newSettings = {
        ...settings,
        [section]: {
          ...settings[section],
          [key]: value
        }
      };

      const userSettingsRef = doc(db, 'userSettings', currentUser.uid);
      await setDoc(userSettingsRef, newSettings);
      setSettings(newSettings);
      
      // Show success message
      setSaveMessage('Settings saved successfully');
      // Clear message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error updating settings:', error);
      setSaveMessage('Error saving settings');
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const handlePRPreferenceChange = async (value) => {
    if (!currentUser) return;

    try {
      const newSettings = {
        ...settings,
        prPreferences: {
          ...settings.prPreferences,
          selectedPR: value
        }
      };

      const userSettingsRef = doc(db, 'userSettings', currentUser.uid);
      await setDoc(userSettingsRef, newSettings);
      setSettings(newSettings);
      
      setSaveMessage('PR preference updated successfully');
      setTimeout(() => setSaveMessage(null), 3000);
      
      console.log('Updated PR preference to:', value); // Debug log
    } catch (error) {
      console.error('Error updating PR preference:', error);
      setSaveMessage('Error updating PR preference');
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand-50">
      <Helmet>
        <title>Settings | Blister</title>
        <meta name="description" content="Customize your Blister experience. Manage your profile settings, notification preferences, and personal record display options for running and triathlon events." />
        <meta property="og:title" content="Settings | Blister" />
        <meta property="og:description" content="Customize your Blister experience. Manage your profile settings, notification preferences, and personal record display options for running and triathlon events." />
      </Helmet>
      <div className="min-h-screen bg-gradient-to-b from-sand-50 to-white py-12">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <Settings className="w-8 h-8 text-purple-600 mr-4" />
              <h1 className="text-3xl font-bold text-slate-800">Settings</h1>
            </div>
            {saveMessage && (
              <div className={`flex items-center px-4 py-2 rounded-lg ${saveMessage.includes('Error') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                {!saveMessage.includes('Error') && <Check className="w-4 h-4 mr-2" />}
                {saveMessage}
              </div>
            )}
          </div>

          <div className="space-y-8">
            {/* PR Display Preferences */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
                <Medal className="w-6 h-6 text-purple-600 mr-2" />
                PR Display Preferences
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Choose which PR to display on your profile
                  </label>
                  <select
                    value={settings.prPreferences?.selectedPR || 'auto'}
                    onChange={(e) => handlePRPreferenceChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  >
                    <option value="auto">Automatic (Longest Distance)</option>
                    <option value="140.6">Ironman (140.6)</option>
                    <option value="70.3">Half Ironman (70.3)</option>
                    <option value="marathon">Marathon</option>
                    <option value="halfMarathon">Half Marathon</option>
                  </select>
                  <p className="mt-2 text-sm text-slate-500">
                    {settings.prPreferences?.selectedPR === 'auto' 
                      ? "Automatically displays your PR for the longest distance race you've completed"
                      : "Always displays your PR for the selected race distance"}
                  </p>
                </div>
              </div>
            </div>

            {/* Privacy Settings */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
                <Shield className="w-6 h-6 text-purple-600 mr-2" />
                Privacy Settings
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Race Data Visibility
                  </label>
                  <div className="space-y-4">
                    <label className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="raceDataVisibility"
                        value="public"
                        checked={settings.privacy.raceDataVisibility === 'public'}
                        onChange={(e) => handleSettingChange('privacy', 'raceDataVisibility', e.target.value)}
                        className="text-purple-600 focus:ring-purple-500"
                      />
                      <div>
                        <span className="text-slate-700 font-medium flex items-center">
                          <Eye className="w-4 h-4 mr-2" /> Public
                        </span>
                        <p className="text-sm text-slate-500">Anyone can view your race data</p>
                      </div>
                    </label>

                    <label className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="raceDataVisibility"
                        value="followers"
                        checked={settings.privacy.raceDataVisibility === 'followers'}
                        onChange={(e) => handleSettingChange('privacy', 'raceDataVisibility', e.target.value)}
                        className="text-purple-600 focus:ring-purple-500"
                      />
                      <div>
                        <span className="text-slate-700 font-medium flex items-center">
                          <Users className="w-4 h-4 mr-2" /> Followers Only
                        </span>
                        <p className="text-sm text-slate-500">Only your followers can view your race data</p>
                      </div>
                    </label>

                    <label className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="raceDataVisibility"
                        value="private"
                        checked={settings.privacy.raceDataVisibility === 'private'}
                        onChange={(e) => handleSettingChange('privacy', 'raceDataVisibility', e.target.value)}
                        className="text-purple-600 focus:ring-purple-500"
                      />
                      <div>
                        <span className="text-slate-700 font-medium flex items-center">
                          <EyeOff className="w-4 h-4 mr-2" /> Private
                        </span>
                        <p className="text-sm text-slate-500">Only you can view your race data</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserSettings; 