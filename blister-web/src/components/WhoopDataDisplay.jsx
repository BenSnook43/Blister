import React from 'react';
import { Heart, Battery, Moon, Activity } from 'lucide-react';

const MetricBar = ({ value, max = 100, color = 'purple' }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  return (
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full bg-${color}-600 transition-all duration-500 ease-out`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

const getRecoveryColor = (score) => {
  if (score >= 66) return 'green';
  if (score >= 33) return 'yellow';
  return 'red';
};

const getStrainColor = (strain) => {
  if (strain >= 14) return 'red';
  if (strain >= 8) return 'yellow';
  return 'green';
};

const getSleepColor = (score) => {
  if (score >= 85) return 'green';
  if (score >= 70) return 'yellow';
  return 'red';
};

const WhoopDataDisplay = ({ data }) => {
  if (!data || !data.recovery || !data.workouts) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <p className="text-slate-600 text-center">No WHOOP data available</p>
      </div>
    );
  }

  // Get the most recent records
  const latestRecovery = data.recovery.records[0];
  const latestWorkout = data.workouts.records[0];

  // Calculate averages from the last 7 days
  const recentRecoveryRecords = data.recovery.records.slice(0, 7);
  const avgRecoveryScore = recentRecoveryRecords.reduce((sum, r) => sum + r.score.recovery_score, 0) / recentRecoveryRecords.length;
  const avgHrv = recentRecoveryRecords.reduce((sum, r) => sum + r.score.hrv_rmssd, 0) / recentRecoveryRecords.length;
  const avgRhr = recentRecoveryRecords.reduce((sum, r) => sum + r.score.resting_heart_rate, 0) / recentRecoveryRecords.length;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center mb-6">
        <img 
          src="/platform-icons/whoop.svg" 
          alt="WHOOP" 
          className="w-6 h-6 mr-2"
        />
        <h3 className="text-lg font-medium text-slate-800">WHOOP Metrics</h3>
      </div>

      <div className="space-y-6">
        {/* Recovery Section */}
        {latestRecovery && (
          <div>
            <div className="flex items-center mb-4">
              <Battery className="w-5 h-5 text-purple-600 mr-2" />
              <h3 className="text-lg font-medium text-slate-800">Recovery</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-slate-600">Recovery Score</span>
                  <span className="text-sm font-medium text-slate-700">
                    {Math.round(latestRecovery.score.recovery_score)}%
                  </span>
                </div>
                <MetricBar
                  value={latestRecovery.score.recovery_score}
                  color={getRecoveryColor(latestRecovery.score.recovery_score)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center text-sm text-slate-600 mb-1">
                    <Heart className="w-4 h-4 mr-1" />
                    HRV
                  </div>
                  <p className="text-lg font-medium text-slate-700">
                    {Math.round(latestRecovery.score.hrv_rmssd)} ms
                  </p>
                  <p className="text-xs text-slate-500">
                    7-day avg: {Math.round(avgHrv)} ms
                  </p>
                </div>
                <div>
                  <div className="flex items-center text-sm text-slate-600 mb-1">
                    <Heart className="w-4 h-4 mr-1" />
                    Resting HR
                  </div>
                  <p className="text-lg font-medium text-slate-700">
                    {latestRecovery.score.resting_heart_rate} bpm
                  </p>
                  <p className="text-xs text-slate-500">
                    7-day avg: {Math.round(avgRhr)} bpm
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Workouts Section */}
        {latestWorkout && (
          <div>
            <div className="flex items-center mb-4">
              <Activity className="w-5 h-5 text-purple-600 mr-2" />
              <h3 className="text-lg font-medium text-slate-800">Day Strain</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-slate-600">Strain Score</span>
                  <span className="text-sm font-medium text-slate-700">
                    {Math.round(latestWorkout.score.strain)}
                  </span>
                </div>
                <MetricBar
                  value={latestWorkout.score.strain}
                  max={21}
                  color={getStrainColor(latestWorkout.score.strain)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Average HR</p>
                  <p className="text-lg font-medium text-slate-700">
                    {Math.round(latestWorkout.score.average_heart_rate)} bpm
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Max HR</p>
                  <p className="text-lg font-medium text-slate-700">
                    {Math.round(latestWorkout.score.max_heart_rate)} bpm
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sleep Section */}
        {latestRecovery?.score.sleep_quality && (
          <div>
            <div className="flex items-center mb-4">
              <Moon className="w-5 h-5 text-purple-600 mr-2" />
              <h3 className="text-lg font-medium text-slate-800">Sleep Performance</h3>
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-slate-600">Quality Score</span>
                <span className="text-sm font-medium text-slate-700">
                  {Math.round(latestRecovery.score.sleep_quality)}%
                </span>
              </div>
              <MetricBar
                value={latestRecovery.score.sleep_quality}
                color={getSleepColor(latestRecovery.score.sleep_quality)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhoopDataDisplay; 