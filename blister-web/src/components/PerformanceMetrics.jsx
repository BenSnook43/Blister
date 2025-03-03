import React from 'react';
import { Activity, TrendingUp, Battery, Zap, Heart, Clock } from 'lucide-react';

const MetricCard = ({ title, value, icon: Icon, trend, description, color = 'purple' }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-gray-500 text-sm">{title}</p>
        <div className="mt-2 flex items-baseline">
          <p className="text-2xl font-semibold">
            {typeof value === 'number' ? value.toFixed(1) : value}
          </p>
          {trend !== undefined && (
            <span className={`ml-2 text-sm ${
              trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-500'
            }`}>
              {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'}
              {Math.abs(trend).toFixed(1)}%
            </span>
          )}
        </div>
      </div>
      <div className={`p-3 bg-${color}-100 rounded-lg`}>
        <Icon className={`w-6 h-6 text-${color}-600`} />
      </div>
    </div>
    {description && (
      <p className="mt-2 text-sm text-gray-500">{description}</p>
    )}
  </div>
);

const PerformanceMetrics = ({ metrics }) => {
  if (!metrics) return null;

  const {
    recentTrainingLoad,
    longTermTrainingLoad,
    trainingBalance,
    trainingReadiness,
    raceReadiness,
    totalWorkouts,
    recentWorkouts,
    workoutsByType,
    totalDistanceKm,
    baseline,
    today
  } = metrics;

  // Calculate trends
  const loadTrend = ((recentTrainingLoad - longTermTrainingLoad) / longTermTrainingLoad) * 100;
  const recoveryTrend = ((today.hrv - baseline.hrv) / baseline.hrv) * 100;
  const readinessTrend = trainingBalance > 0 ? 5 : trainingBalance < 0 ? -5 : 0;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Performance Metrics</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Training Load Section */}
        <MetricCard
          title="Recent Training Load"
          value={recentTrainingLoad}
          icon={Activity}
          trend={loadTrend}
          description="Average training stress from the past 7 days"
          color="blue"
        />
        
        <MetricCard
          title="Long-term Training Load"
          value={longTermTrainingLoad}
          icon={TrendingUp}
          description="Average training load over the past 28 days"
          color="indigo"
        />

        <MetricCard
          title="Training Balance"
          value={trainingBalance}
          icon={Clock}
          description={trainingBalance > 0 ? "Building fitness" : "Recovery phase"}
          color="violet"
        />

        {/* Readiness Section */}
        <MetricCard
          title="Training Readiness"
          value={trainingReadiness}
          icon={Battery}
          trend={readinessTrend}
          description="Current capacity for training based on recovery"
          color="green"
        />

        <MetricCard
          title="Race Readiness"
          value={raceReadiness}
          icon={Zap}
          description="Overall performance potential for racing"
          color="yellow"
        />

        <MetricCard
          title="Recovery Status"
          value={today.hrv}
          icon={Heart}
          trend={recoveryTrend}
          description={`HRV: ${today.hrv}ms | RHR: ${today.rhr}bpm`}
          color="red"
        />
      </div>

      {/* Workout Summary */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h4 className="text-base font-medium mb-4">Workout Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">Total Workouts</p>
            <p className="text-xl font-semibold">{totalWorkouts}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Recent Workouts</p>
            <p className="text-xl font-semibold">{recentWorkouts}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Distance</p>
            <p className="text-xl font-semibold">{totalDistanceKm.toFixed(1)} km</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Workout Types</p>
            <p className="text-xl font-semibold">{Object.keys(workoutsByType).length}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMetrics; 