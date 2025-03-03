import React from 'react';
import { Activity, Brain, TrendingUp, Zap, Battery, Dumbbell } from 'lucide-react';

const performanceMetrics = [
  {
    title: "Fitness Score",
    value: "82",
    trend: "+5",
    description: "Based on volume and intensity",
    icon: <Activity className="w-6 h-6" />,
    color: "from-purple-600 to-turquoise-400",
    highlight: "purple"
  },
  {
    title: "Recovery",
    value: "85%",
    trend: "+12",
    description: "Better than last week",
    icon: <Battery className="w-6 h-6" />,
    color: "from-emerald-500 to-teal-400",
    highlight: "emerald"
  },
  {
    title: "Training Load",
    value: "725",
    trend: "-2",
    description: "Optimal range",
    icon: <Zap className="w-6 h-6" />,
    color: "from-orange-500 to-amber-400",
    highlight: "orange"
  },
  {
    title: "Readiness",
    value: "High",
    trend: "+8",
    description: "Ready for high intensity",
    icon: <Brain className="w-6 h-6" />,
    color: "from-blue-500 to-cyan-400",
    highlight: "blue"
  }
];

function WaveBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-purple-100/50 to-transparent transform -skew-y-6" />
        <div className="absolute top-[200px] left-0 right-0 h-[500px] bg-gradient-to-b from-turquoise-100/30 to-transparent transform skew-y-3" style={{ animationDelay: '-5s' }} />
      </div>
    </div>
  );
}

function MetricCard({ metric }) {
  return (
    <div className="bg-white/80 backdrop-blur-lg rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${metric.color} transform hover:scale-105 transition-transform duration-300`}>
          {React.cloneElement(metric.icon, { className: "w-6 h-6 text-white" })}
        </div>
        <div className={`text-sm font-medium flex items-center ${
          parseFloat(metric.trend) >= 0 ? 'text-emerald-600' : 'text-red-600'
        }`}>
          {metric.trend}%
          <TrendingUp className="w-4 h-4 ml-1" />
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-slate-800">{metric.title}</h3>
        <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-turquoise-400">
          {metric.value}
        </div>
        <p className="text-sm text-slate-600">{metric.description}</p>
      </div>
    </div>
  );
}

export default function PerformanceLab() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-turquoise-50 relative">
      <WaveBackground />
      
      <div className="bg-gradient-to-r from-purple-600 to-turquoise-400 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.2] bg-[size:20px_20px]" />
        <div className="container mx-auto px-6 py-8 relative">
          <h1 className="text-2xl font-bold text-white flex items-center">
            Performance Lab
            <Dumbbell className="w-6 h-6 ml-2 animate-pulse" />
          </h1>
          <p className="text-white/80 mt-2">Analyze your training data and track progress</p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 relative">
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {performanceMetrics.map((metric, index) => (
              <MetricCard key={index} metric={metric} />
            ))}
          </div>
          
          {/* We'll add other components later */}
          <div className="text-center text-gray-500 py-8">
            More insights coming soon...
          </div>
        </div>
      </div>
    </div>
  );
} 