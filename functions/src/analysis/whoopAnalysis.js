const calculateAverages = (data) => {
  if (!data || Object.keys(data).length === 0) {
    return null;
  }

  // Recovery Analysis
  const recoveryScores = data.recovery?.records?.map(r => ({
    score: r.score?.recovery_score || 0,
    date: new Date(r.timestamp),
    strain: r.score?.strain || 0,
    resting_heart_rate: r.score?.resting_heart_rate || 0
  })) || [];

  // Workout Analysis
  const workouts = data.workouts?.records?.map(w => ({
    strain: w.score?.strain || 0,
    average_heart_rate: w.score?.average_heart_rate || 0,
    max_heart_rate: w.score?.max_heart_rate || 0,
    duration: w.score?.duration_ms || 0,
    date: new Date(w.timestamp)
  })) || [];

  // Sleep Analysis
  const sleepData = data.sleep?.records?.map(s => ({
    quality: s.score?.sleep_quality || 0,
    duration: s.score?.total_sleep_ms || 0,
    needed: s.score?.sleep_needed_ms || 0,
    debt: s.score?.sleep_debt_ms || 0,
    date: new Date(s.timestamp)
  })) || [];

  // Calculate averages
  const analysis = {
    recovery: {
      averageScore: calculateAverage(recoveryScores.map(r => r.score)),
      averageStrain: calculateAverage(recoveryScores.map(r => r.strain)),
      averageRestingHR: calculateAverage(recoveryScores.map(r => r.resting_heart_rate)),
      recentTrend: calculateTrend(recoveryScores.map(r => ({ date: r.date, value: r.score }))),
      lastUpdate: recoveryScores.length > 0 ? recoveryScores[recoveryScores.length - 1].date : null
    },
    workouts: {
      averageStrain: calculateAverage(workouts.map(w => w.strain)),
      averageHeartRate: calculateAverage(workouts.map(w => w.average_heart_rate)),
      averageDuration: calculateAverage(workouts.map(w => w.duration)),
      totalWorkouts: workouts.length,
      recentTrend: calculateTrend(workouts.map(w => ({ date: w.date, value: w.strain }))),
      lastUpdate: workouts.length > 0 ? workouts[workouts.length - 1].date : null
    },
    sleep: {
      averageQuality: calculateAverage(sleepData.map(s => s.quality)),
      averageDuration: calculateAverage(sleepData.map(s => s.duration)),
      averageDebt: calculateAverage(sleepData.map(s => s.debt)),
      recentTrend: calculateTrend(sleepData.map(s => ({ date: s.date, value: s.quality }))),
      lastUpdate: sleepData.length > 0 ? sleepData[sleepData.length - 1].date : null
    }
  };

  return analysis;
};

const calculateAverage = (numbers) => {
  if (!numbers || numbers.length === 0) return 0;
  return numbers.reduce((acc, curr) => acc + curr, 0) / numbers.length;
};

const calculateTrend = (dataPoints) => {
  if (!dataPoints || dataPoints.length < 2) return 'stable';
  
  // Sort by date and get last 3 points
  const sorted = dataPoints
    .sort((a, b) => a.date - b.date)
    .slice(-3)
    .map(p => p.value);
  
  const lastDiff = sorted[sorted.length - 1] - sorted[sorted.length - 2];
  
  if (Math.abs(lastDiff) < 0.05) return 'stable';
  return lastDiff > 0 ? 'improving' : 'declining';
};

module.exports = {
  calculateAverages
}; 