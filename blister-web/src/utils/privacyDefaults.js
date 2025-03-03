// Default privacy settings for new users
export const DEFAULT_PRIVACY_SETTINGS = {
  // Profile visibility
  profileVisibility: 'followers', // 'public', 'followers', or 'private'
  
  // Activity data visibility
  activityData: {
    runs: false,
    rides: false,
    swims: false,
    races: false,
    trainingLog: false
  },
  
  // Health metrics visibility
  healthMetrics: {
    heartRate: false,
    vo2Max: false,
    weight: false,
    sleep: false,
    restingHeartRate: false,
    bodyComposition: false
  },
  
  // Performance metrics visibility
  performanceMetrics: {
    personalRecords: false,
    paceZones: false,
    trainingLoad: false,
    fatigueScore: false
  },
  
  // Location data settings
  locationData: {
    shareActivityStartPoint: false,
    shareRoutes: false,
    shareHomeLocation: false
  },
  
  // Social features
  social: {
    allowFollow: true,
    showUpcomingEvents: false,
    showFollowersCount: true,
    showFollowingCount: true
  },
  
  // Notification preferences
  notifications: {
    emailNotifications: true,
    achievementNotifications: true,
    followerNotifications: true,
    eventReminders: true
  }
};

// Function to apply privacy settings to a new user
export const initializeUserPrivacy = async (userId) => {
  try {
    const userPrivacyRef = doc(db, 'userPrivacy', userId);
    await setDoc(userPrivacyRef, {
      ...DEFAULT_PRIVACY_SETTINGS,
      lastUpdated: new Date(),
      userId
    });
    return true;
  } catch (error) {
    console.error('Error initializing user privacy settings:', error);
    return false;
  }
}; 