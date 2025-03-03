const MS_PER_DAY = 24 * 60 * 60 * 1000;

const deduplicateWorkouts = (workouts) => {
  const sourcePriority = {
    'garmin': 3,
    'wahoo': 2,
    'strava': 1,
    'whoop': 1
  };

  const unique = {};
  workouts.forEach(workout => {
    // Create a unique key based on timestamp (rounded to nearest hour), type, and duration
    const workoutTime = new Date(workout.timestamp);
    workoutTime.setMinutes(0, 0, 0); // Round to hour
    const key = `${workoutTime.getTime()}-${workout.type}-${workout.duration_ms}`;

    if (!unique[key] || sourcePriority[workout.source] > sourcePriority[unique[key].source]) {
      unique[key] = workout;
    }
  });

  return Object.values(unique);
};

const calculateTrainingLoad = (workout) => {
  // Base training load is duration * intensity
  const duration = workout.duration_ms ? workout.duration_ms / (60 * 1000) : 0; // Convert to minutes
  
  // Calculate intensity based on available metrics
  let intensity = 1.0;
  
  if (workout.strain) {
    // Use WHOOP strain if available
    intensity = workout.strain;
  } else if (workout.average_heartrate) {
    // Calculate intensity from heart rate if available
    // Using heart rate reserve (HRR) method
    const restingHR = 60; // Default resting HR
    const maxHR = 220 - 30; // Default max HR (age assumed 30)
    const hrr = (workout.average_heartrate - restingHR) / (maxHR - restingHR);
    intensity = 0.5 + hrr; // Scale to similar range as WHOOP strain
  }

  return duration * intensity;
};

const getBaselineRecovery = (recoveryData, daysBack = 7) => {
  const baseline = {
    hrv: 0,
    rhr: 0,
    sleepQuality: 0,
    count: 0
  };

  const now = new Date();
  const cutoff = new Date(now - (daysBack * MS_PER_DAY));

  Object.entries(recoveryData).forEach(([dateStr, data]) => {
    const date = new Date(dateStr);
    if (date >= cutoff && date < now) {
      baseline.hrv += data.hrv || 0;
      baseline.rhr += data.resting_heart_rate || 0;
      baseline.sleepQuality += data.sleep_quality || 0;
      baseline.count++;
    }
  });

  if (baseline.count === 0) {
    return {
      hrv: 70,
      rhr: 50,
      sleepQuality: 75
    };
  }

  return {
    hrv: baseline.hrv / baseline.count,
    rhr: baseline.rhr / baseline.count,
    sleepQuality: baseline.sleepQuality / baseline.count
  };
};

const computePerformanceMetrics = (platformData) => {
  const now = new Date();
  const workouts = [];
  const recoveryData = {};

  // Process WHOOP data
  if (platformData.whoop) {
    // Add workouts
    platformData.whoop.workouts?.records?.forEach(workout => {
      workouts.push({
        timestamp: new Date(workout.timestamp).getTime(),
        type: workout.sport || 'workout',
        duration_ms: workout.duration_ms || 0,
        strain: workout.score?.strain || 1.0,
        source: 'whoop'
      });
    });

    // Add recovery data
    platformData.whoop.recovery?.records?.forEach(record => {
      const date = new Date(record.timestamp);
      const dateStr = date.toISOString().split('T')[0];
      recoveryData[dateStr] = {
        hrv: record.score?.hrv || 0,
        resting_heart_rate: record.score?.resting_heart_rate || 0,
        sleep_quality: record.score?.sleep_quality || 0
      };
    });
  }

  // Process Strava data
  if (platformData.strava) {
    platformData.strava.activities?.records?.forEach(activity => {
      workouts.push({
        timestamp: new Date(activity.timestamp).getTime(),
        type: activity.sport || 'workout',
        duration_ms: activity.duration_ms || 0,
        average_heartrate: activity.average_heartrate,
        max_heartrate: activity.max_heartrate,
        distance_meters: activity.distance_meters,
        source: 'strava'
      });
    });
  }

  // Deduplicate workouts
  const uniqueWorkouts = deduplicateWorkouts(workouts);

  // Calculate training loads
  const recentWorkouts = uniqueWorkouts.filter(w => 
    (now - new Date(w.timestamp)) <= 7 * MS_PER_DAY
  );
  const longTermWorkouts = uniqueWorkouts.filter(w => 
    (now - new Date(w.timestamp)) <= 28 * MS_PER_DAY
  );

  const ATL = recentWorkouts.length > 0
    ? recentWorkouts.reduce((sum, w) => sum + calculateTrainingLoad(w), 0) / recentWorkouts.length
    : 0;

  const CTL = longTermWorkouts.length > 0
    ? longTermWorkouts.reduce((sum, w) => sum + calculateTrainingLoad(w), 0) / longTermWorkouts.length
    : 0;

  const trainingBalance = CTL - ATL;

  // Calculate recovery metrics
  const todayStr = now.toISOString().split('T')[0];
  const todayRecovery = recoveryData[todayStr] || getBaselineRecovery(recoveryData);
  const baseline = getBaselineRecovery(recoveryData);

  // Calculate Training Readiness Score (TRS)
  const TRS = (
    100 * (todayRecovery.hrv / baseline.hrv) -
    5 * (todayRecovery.rhr - baseline.rhr) +
    todayRecovery.sleepQuality
  );

  // Calculate Race Readiness Index (RRI)
  const RRI = CTL > 0
    ? TRS * (1 - Math.abs(trainingBalance) / CTL)
    : TRS;

  // Calculate additional metrics
  const workoutsByType = uniqueWorkouts.reduce((acc, w) => {
    acc[w.type] = (acc[w.type] || 0) + 1;
    return acc;
  }, {});

  const totalDistance = uniqueWorkouts.reduce((sum, w) => 
    sum + (w.distance_meters || 0), 0) / 1000; // Convert to km

  return {
    recentTrainingLoad: ATL,
    longTermTrainingLoad: CTL,
    trainingBalance,
    trainingReadiness: TRS,
    raceReadiness: RRI,
    totalWorkouts: uniqueWorkouts.length,
    recentWorkouts: recentWorkouts.length,
    workoutsByType,
    totalDistanceKm: totalDistance,
    baseline,
    today: todayRecovery
  };
};

module.exports = {
  computePerformanceMetrics,
  deduplicateWorkouts,
  getBaselineRecovery
}; 