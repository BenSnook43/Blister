import { Activity, Brain, Heart, TrendingUp, Zap, Battery } from 'lucide-react';

export const mockData = {
  recentActivities: [
    { date: "Mar 18", distance: 12.4, pace: "8:25", elevation: 450, heartRate: 155, strain: 12.5 },
    { date: "Mar 15", distance: 8.2, pace: "8:30", elevation: 320, heartRate: 152, strain: 10.2 },
    { date: "Mar 13", distance: 15.6, pace: "8:45", elevation: 850, heartRate: 158, strain: 15.8 },
    { date: "Mar 11", distance: 6.2, pace: "8:15", elevation: 220, heartRate: 150, strain: 8.5 },
    { date: "Mar 9", distance: 10.8, pace: "8:35", elevation: 520, heartRate: 154, strain: 11.4 }
  ],
  healthData: [
    {
      date: "Mar 18",
      sleep: { hours: 7.5, quality: 85, debtHours: 0.5 },
      hrv: 65,
      restingHR: 52,
      readiness: 85
    },
    {
      date: "Mar 17",
      sleep: { hours: 7.2, quality: 82, debtHours: 0.8 },
      hrv: 62,
      restingHR: 54,
      readiness: 82
    },
    {
      date: "Mar 16",
      sleep: { hours: 8.0, quality: 88, debtHours: 0 },
      hrv: 68,
      restingHR: 51,
      readiness: 88
    }
  ]
};

export const performanceMetrics = [
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