import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Calendar, ChevronRight, Mountain, User, Trophy, TrendingUp, Heart, Share2, Medal, Timer, Search, Users, Activity, Zap, Battery } from 'lucide-react';
import EventCard from './EventCard';
import { Link } from 'react-router-dom';
import OptimizedImage from './OptimizedImage';
import { Helmet } from 'react-helmet-async';

// Dynamic imports for images
const sfMarathonImg = new URL('../images/golden-gate-fog.jpg', import.meta.url).href;
const bigAltaImg = new URL('../images/Big Alta.jpg', import.meta.url).href;
const scTriImg = new URL('../images/703 SC.jpg', import.meta.url).href;
const beerRunImg = new URL('../images/Beer Run.jpg', import.meta.url).href;

function ProfilePreview() {
  return (
    <div className="relative">
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-purple-200 rounded-full filter blur-3xl opacity-30"></div>
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-turquoise-200 rounded-full filter blur-3xl opacity-30"></div>
      
      <div className="bg-white rounded-2xl shadow-2xl p-8 relative z-10">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-turquoise-500 rounded-full flex items-center justify-center overflow-hidden">
            <OptimizedImage 
              src="https://images.unsplash.com/photo-1594882645126-14020914d58d?auto=format&fit=crop&q=80" 
              alt="Profile" 
              className="w-full h-full object-cover"
              width={64}
              height={64}
              priority={true}
            />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">Sarah Thompson</h3>
            <p className="text-slate-600">Ultra Runner</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-purple-50 to-white p-4 rounded-xl">
            <div className="text-2xl font-bold text-purple-600">24</div>
            <div className="text-sm text-slate-600">Races Completed</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-white p-4 rounded-xl">
            <div className="text-2xl font-bold text-purple-600">4:15</div>
            <div className="text-sm text-slate-600">Marathon PR</div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-600 to-turquoise-500 text-white p-4 rounded-xl mb-6">
          <div className="text-sm mb-1">Next Challenge</div>
          <div className="font-bold">San Francisco Marathon</div>
          <div className="text-sm opacity-90">July 27, 2025</div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-white p-4 rounded-xl">
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm text-slate-600">Marathon Progress</div>
            <div className="text-sm font-medium text-purple-600">4:15 PR</div>
          </div>
          <div className="relative h-24">
            <svg className="w-full h-full" viewBox="0 0 400 100">
              <defs>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#9333EA" />
                  <stop offset="100%" stopColor="#14B8A6" />
                </linearGradient>
              </defs>
              <path
                d="M20,50 C60,45 80,45 100,45 C140,45 160,70 180,70 C200,70 240,40 260,40 C290,40 310,25 340,20 C360,17 370,12 380,10"
                fill="none"
                stroke="url(#lineGradient)"
                strokeWidth="3"
                strokeLinecap="round"
              />
              {/* Data points */}
              <circle cx="20" cy="50" r="4" fill="#9333EA" />
              <circle cx="100" cy="45" r="4" fill="#9333EA" />
              <circle cx="180" cy="70" r="4" fill="#9333EA" />
              <circle cx="260" cy="40" r="4" fill="#14B8A6" />
              <circle cx="340" cy="20" r="4" fill="#14B8A6" />
              <circle cx="380" cy="10" r="4" fill="#14B8A6" />
            </svg>
            <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-slate-400">
              <span>2018</span>
              <span>2022</span>
              <span>2025</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PerformanceLabPreview() {
  const [metrics, setMetrics] = useState({
    recentLoad: 850,
    longTermLoad: 780,
    trainingBalance: 1.09,
    raceReadiness: 92,
    recoveryScore: 88,
    weeklyVolume: 42.5
  });

  // Simulate metrics changing every few seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setMetrics({
        recentLoad: Math.floor(800 + Math.random() * 100),
        longTermLoad: Math.floor(750 + Math.random() * 100),
        trainingBalance: Number((0.9 + Math.random() * 0.4).toFixed(2)),
        raceReadiness: Math.floor(85 + Math.random() * 10),
        recoveryScore: Math.floor(80 + Math.random() * 15),
        weeklyVolume: Number((35 + Math.random() * 15).toFixed(1))
      });
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  const getTrainingBalanceStatus = (balance) => {
    if (balance < 0.8) return { text: 'Under Training', color: 'text-yellow-600' };
    if (balance > 1.3) return { text: 'Over Training', color: 'text-red-600' };
    return { text: 'Optimal', color: 'text-green-600' };
  };

  const balanceStatus = getTrainingBalanceStatus(metrics.trainingBalance);

  return (
    <div className="relative">
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-purple-200 rounded-full filter blur-3xl opacity-30"></div>
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-turquoise-200 rounded-full filter blur-3xl opacity-30"></div>
      
      <div className="bg-white rounded-2xl shadow-2xl p-8 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-slate-800">Performance Lab</h3>
          <div className="text-sm text-purple-600 font-medium">Live Metrics</div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-purple-50 to-white p-4 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <Activity className="w-5 h-5 text-purple-600 mr-2" />
                <div className="text-sm text-slate-600">Recent Training Load</div>
              </div>
            </div>
            <div className="text-2xl font-bold text-purple-600">{metrics.recentLoad}</div>
            <div className="text-sm text-slate-500 mt-1">{metrics.weeklyVolume} miles this week</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-white p-4 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <TrendingUp className="w-5 h-5 text-purple-600 mr-2" />
                <div className="text-sm text-slate-600">Training Balance</div>
              </div>
            </div>
            <div className="text-2xl font-bold text-purple-600">{metrics.trainingBalance}</div>
            <div className={`text-sm ${balanceStatus.color} mt-1`}>{balanceStatus.text}</div>
          </div>
        </div>
        
        <div className="space-y-4 mb-6">
          <div className="bg-gradient-to-br from-purple-50 to-white p-4 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <Battery className="w-5 h-5 text-purple-600 mr-2" />
                <div className="text-sm text-slate-600">Recovery Score</div>
              </div>
            </div>
            <div className="relative h-2 bg-slate-100 rounded-full mb-2">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-600 to-turquoise-500 rounded-full transition-all duration-500"
                style={{ width: `${metrics.recoveryScore}%` }}
              ></div>
            </div>
            <div className="text-right text-sm font-medium text-purple-600">{metrics.recoveryScore}%</div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-white p-4 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <Zap className="w-5 h-5 text-purple-600 mr-2" />
                <div className="text-sm text-slate-600">Race Readiness</div>
              </div>
            </div>
            <div className="relative h-2 bg-slate-100 rounded-full mb-2">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-600 to-turquoise-500 rounded-full transition-all duration-500"
                style={{ width: `${metrics.raceReadiness}%` }}
              ></div>
            </div>
            <div className="text-right text-sm font-medium text-purple-600">{metrics.raceReadiness}%</div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-600 to-turquoise-500 text-white p-4 rounded-xl">
          <div className="text-sm mb-1">Next Race</div>
          <div className="font-bold">San Francisco Marathon</div>
          <div className="text-sm opacity-90">
            Training Balance: {balanceStatus.text} • Race Readiness: {metrics.raceReadiness}%
          </div>
        </div>
      </div>
    </div>
  );
}

function LandingPage() {
  const [displayMode, setDisplayMode] = useState('event'); // 'event', 'profile', or 'lab'
  
  useEffect(() => {
    const timer = setInterval(() => {
      setDisplayMode(prev => {
        if (prev === 'event') return 'profile';
        if (prev === 'profile') return 'lab';
        return 'event';
      });
    }, 6000); // Switch every 6 seconds
    
    return () => clearInterval(timer);
  }, []);

  const featuredEvent = {
    event: {
      id: 'sf-marathon-2025',
      title: "San Francisco Marathon",
      time: "5:30 AM",
      location: "San Francisco, CA",
      imageUrl: sfMarathonImg,
      type: 'run',
      date: 'July 27, 2025'
    }
  };

  const upcomingEvents = [
    {
      event: {
        id: 'The-Big-Alta',
        title: "The Big Alta",
        time: "7:00 AM",
        location: "Marinwood, CA",
        imageUrl: bigAltaImg,
        type: 'run',
        date: '2024-05-15'
      }
    },
    {
      event: {
        id: 'IM-70.3-SC',
        title: "Ironman 70.3 Santa Cruz",
        time: "6:30 AM",
        location: "Santa Cruz, CA",
        imageUrl: scTriImg,
        type: 'triathlon',
        date: '2024-09-08'
      }
    },
    {
      event: {
        id: 'Beer City Half',
        title: "Beer City Half Marathon",
        time: "8:30 AM",
        location: "Santa Rosa, CA",
        imageUrl: beerRunImg,
        type: 'run',
        date: '2024-06-22'
      }
    }
  ];

  return (
    <div className="min-h-screen bg-sand-50">
      <Helmet>
        <title>Blister | Find Running & Triathlon Events in the Bay Area</title>
        <meta name="description" content="Discover and join running and triathlon events in the Bay Area. Connect with local athletes, find races near you, and be part of the Bay Area's vibrant endurance sports community." />
        <meta property="og:title" content="Blister | Find Running & Triathlon Events in the Bay Area" />
        <meta property="og:description" content="Discover and join running and triathlon events in the Bay Area. Connect with local athletes, find races near you, and be part of the Bay Area's vibrant endurance sports community." />
      </Helmet>
      
      <div className="relative bg-gradient-to-b from-sand-50 to-white">
        <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="space-y-6 sm:space-y-8">
              <div className="inline-block p-2 bg-purple-100 rounded-lg mb-4">
                {/* Add any content for this block if needed */}
              </div>
              <h1 className="text-4xl sm:text-6xl font-bold leading-tight">
                Welcome to
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-turquoise-500">
                  Blister
                </span>
              </h1>
              {displayMode === 'profile' ? (
                <p className="text-slate-600 text-base sm:text-lg max-w-md">
                  Create your profile to track your progress, set personal records, and connect with fellow runners in the Bay Area community.
                </p>
              ) : displayMode === 'lab' ? (
                <p className="text-slate-600 text-base sm:text-lg max-w-md">
                  Track your performance metrics, monitor your training load, and optimize your race readiness with our Performance Lab.
                </p>
              ) : (
                <p className="text-slate-600 text-base sm:text-lg max-w-md">
                  Find your race.
                  <br />
                  Bay Area events, all in one place.
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to={displayMode === 'profile' ? "/signup" : displayMode === 'lab' ? "/lab" : "/run"}
                  className="bg-gradient-to-r from-purple-600 to-turquoise-500 text-white px-6 sm:px-8 py-3 rounded-full font-medium hover:opacity-90 transition-opacity shadow-lg text-center"
                >
                  {displayMode === 'profile' ? "Create Profile" : displayMode === 'lab' ? "View Performance" : "Register Now"}
                </Link>
                <Link
                  to="/run"
                  className="bg-white px-6 sm:px-8 py-3 rounded-full font-medium hover:bg-slate-50 transition-colors border border-slate-200 text-center"
                >
                  {displayMode === 'profile' ? "Browse Events" : displayMode === 'lab' ? "Learn More" : "Learn More"}
                </Link>
              </div>
            </div>
            
            <div className="relative mt-8 lg:mt-0">
              {displayMode === 'profile' ? (
                <ProfilePreview />
              ) : displayMode === 'lab' ? (
                <PerformanceLabPreview />
              ) : (
                <div className="relative">
                  <div className="absolute -top-10 -left-10 w-40 h-40 bg-purple-200 rounded-full filter blur-3xl opacity-30"></div>
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-turquoise-200 rounded-full filter blur-3xl opacity-30"></div>
                  <div className="relative mt-12">
                    <div className="h-[400px]">
                      <EventCard {...featuredEvent} />
                    </div>
                    <div className="absolute top-8 right-8 bg-white/80 backdrop-blur-md rounded-2xl p-4 sm:p-6 text-center shadow-lg z-20">
                      <div className="text-3xl sm:text-4xl font-bold mb-2 text-purple-600">
                        {Math.max(0, Math.floor((new Date('2025-07-27') - new Date()) / (1000 * 60 * 60 * 24)))}
                      </div>
                      <div className="text-sm text-slate-600">Days Until Race Day</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <h2 className="text-2xl sm:text-3xl font-bold mb-8 sm:mb-12 text-slate-800">Races We're Stoked About</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {upcomingEvents.map((eventData, index) => (
            <EventCard key={index} {...eventData} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default LandingPage; 