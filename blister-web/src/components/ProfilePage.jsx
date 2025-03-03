import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, MapPin, Calendar, ChevronRight, Mountain, User, Trophy, TrendingUp, Heart, Share2, Medal, Route, Plus, X, Link as LinkIcon, Pencil, Trash2, XCircle, Search, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { auth, db, storage } from '../firebase';
import { doc, getDoc, setDoc, collection, addDoc, query, where, getDocs, deleteDoc, onSnapshot, orderBy, serverTimestamp, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getEventImage } from '../utils/eventImages';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { getConnections, followUser, unfollowUser } from '../utils/connections';
import { useAuth } from '../utils/AuthContext';
import { useParams } from 'react-router-dom';
import { createUserDocument } from '../utils/userUtils';
import EditProfileModal from './EditProfileModal';
import ShareModal from './ShareModal';
import { getUpcomingEvents } from '../utils/eventUtils';
import FollowersModal from './FollowersModal';
import { Helmet } from 'react-helmet-async';
import ConnectPlatforms from './ConnectPlatforms';
import ConnectPlatformsModal from './ConnectPlatformsModal';
import debounce from 'lodash/debounce';

function formatFirestoreDate(date) {
  if (!date) return '';
  // Handle Firestore Timestamp
  if (date.seconds) {
    return new Date(date.seconds * 1000).toLocaleDateString();
  }
  // Handle regular Date object
  if (date instanceof Date) {
    return date.toLocaleDateString();
  }
  // Handle string date
  return new Date(date).toLocaleDateString();
}

function QuickStats({ stats, userId }) {
  return (
    <div className="grid grid-cols-2 gap-4 mb-8">
      <Link
        to={`/profile/${userId}/races`}
        className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="flex items-center space-x-3">
          <Trophy className="w-6 h-6 text-purple-600" />
          <div>
            <h3 className="text-sm font-medium text-slate-500">Total Races</h3>
            <p className="text-2xl font-bold text-slate-800">{stats.totalRaces || 0}</p>
          </div>
        </div>
      </Link>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center space-x-3">
          <Calendar className="w-6 h-6 text-purple-600" />
          <div>
            <h3 className="text-sm font-medium text-slate-500">Upcoming Events</h3>
            <p className="text-2xl font-bold text-slate-800">{stats.upcomingRaces || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventCard({ id, title, time, location, image, onToggleFavorite, isFavorited }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden hover:scale-102 transition-transform duration-300 shadow-lg">
      <div className="relative h-64">
        <img src={image} alt={title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center text-turquoise-400 text-sm">
              <Clock className="w-4 h-4 mr-2" />
              <span>{time}</span>
            </div>
            <button 
              onClick={() => onToggleFavorite(id)}
              className={`p-2 rounded-full ${isFavorited ? 'bg-purple-600 text-white' : 'bg-white/20 text-white'}`}
            >
              <Heart className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImageCropModal({ isOpen, onClose, imageUrl, onCropComplete }) {
  const [crop, setCrop] = useState({ unit: '%', width: 90, aspect: 1 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);

  const getCroppedImg = async (image, crop) => {
    if (!crop || !image) {
      console.error('Missing crop or image');
      return null;
    }
    
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    // Ensure we have valid dimensions
    const pixelCrop = {
      x: crop.x * scaleX,
      y: crop.y * scaleY,
      width: crop.width * scaleX,
      height: crop.height * scaleY
    };
    
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error('No 2d context');
      return null;
    }
    
    // Draw the cropped image
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    // As Base64 string
    // const base64Image = canvas.toDataURL('image/jpeg');

    // As a blob
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            console.error('Canvas is empty');
            resolve(null);
            return;
          }
          resolve(blob);
        },
        'image/jpeg',
        1
      );
    });
  };

  const handleCropComplete = async () => {
    if (!completedCrop || !imgRef.current) return;
    
    try {
      const croppedImageBlob = await getCroppedImg(imgRef.current, completedCrop);
      if (croppedImageBlob) {
        onCropComplete(croppedImageBlob);
        onClose();
      }
    } catch (error) {
      console.error('Error cropping image:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl p-8 max-w-xl w-full mx-auto my-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-800">Crop Profile Picture</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-hidden">
          <ReactCrop
            crop={crop}
            onChange={c => setCrop(c)}
            onComplete={c => setCompletedCrop(c)}
            aspect={1}
            circularCrop
          >
            <img
              ref={imgRef}
              src={imageUrl}
              alt="Crop me"
              className="max-w-full h-auto"
            />
          </ReactCrop>
        </div>
        <div className="flex justify-end space-x-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCropComplete}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function RaceResult({ race, onEdit, onDelete, onUnclaim, isCurrentUser }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow-md mb-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-bold text-slate-800">
            {race.eventName || race.event_name || race.title}
          </h4>
          <div className="flex items-center text-sm text-slate-600 mt-1">
            <Calendar className="w-4 h-4 mr-2" />
            <span>{formatFirestoreDate(race.date)}</span>
            {(race.city || race.location) && (
              <>
                <MapPin className="w-4 h-4 ml-4 mr-2" />
                <span>{race.city && race.state ? `${race.city}, ${race.state}` : race.location}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-lg font-bold text-purple-600">{race.time}</div>
            {race.pace && (
              <div className="text-sm text-slate-600">{race.pace}</div>
            )}
          </div>
          {isCurrentUser && (
            <div className="flex space-x-2">
              <button
                onClick={() => onEdit(race)}
                className="p-2 text-gray-600 hover:text-purple-600"
                title="Edit result"
              >
                <Pencil className="w-4 h-4" />
              </button>
              {race.source === 'claimed' ? (
                <button
                  onClick={() => onUnclaim(race)}
                  className="p-2 text-gray-600 hover:text-yellow-600"
                  title="Unclaim result"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => onDelete(race.id)}
                  className="p-2 text-gray-600 hover:text-red-600"
                  title="Delete result"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 flex items-center">
        <Route className="w-4 h-4 mr-2 text-slate-400" />
        <span className="text-sm text-slate-600">
          {race.event_distance || race.distance}
        </span>
      </div>
    </div>
  );
}

function RaceResultForm({ initialData, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    title: initialData?.eventName || initialData?.title || '',
    date: initialData?.date ? formatDateForInput(initialData.date) : '',
    time: initialData?.time || '',
    distance: initialData?.event_distance || initialData?.distance || '',
    location: initialData?.city && initialData?.state 
      ? `${initialData.city}, ${initialData.state}` 
      : initialData?.location || '',
    type: initialData?.type || 'run'
  });

  const handleTypeChange = (e) => {
    setFormData(prev => ({
      ...prev,
      type: e.target.value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  function formatDateForInput(dateValue) {
    try {
      // Handle Firestore Timestamp
      if (dateValue?.seconds) {
        return new Date(dateValue.seconds * 1000).toISOString().split('T')[0];
      }
      // Handle Date object
      if (dateValue instanceof Date) {
        return dateValue.toISOString().split('T')[0];
      }
      // Handle string date
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
      // Return today's date as fallback
      return new Date().toISOString().split('T')[0];
    } catch (error) {
      console.error('Error formatting date:', error);
      return new Date().toISOString().split('T')[0];
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Race Title
        </label>
        <input
          type="text"
          id="title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
          placeholder="e.g. Boston Marathon 2024"
          required
        />
      </div>

      <div>
        <label htmlFor="type" className="block text-sm font-medium text-gray-700">
          Type
        </label>
        <select
          id="type"
          value={formData.type}
          onChange={handleTypeChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
        >
          <option value="run">Run</option>
          <option value="tri">Triathlon</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Distance</label>
        {formData.type === 'triathlon' ? (
          <select
            value={formData.distance}
            onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            required
          >
            <option value="70.3">70.3</option>
            <option value="140.6">140.6</option>
          </select>
        ) : (
          <input
            type="text"
            value={formData.distance}
            onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
            placeholder="e.g., Marathon, Half Marathon, 10K"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            required
          />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
        <input
          type="text"
          value={formData.time}
          onChange={(e) => setFormData({ ...formData, time: e.target.value })}
          placeholder="HH:MM:SS"
          className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-purple-600 focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
        <input
          type="text"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-purple-600 focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-purple-600 focus:border-transparent"
          required
        />
      </div>

      <div className="flex justify-end space-x-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          {initialData ? 'Save Changes' : 'Add Result'}
        </button>
      </div>
    </form>
  );
}

function UpcomingEvents({ events }) {
  if (!events || events.length === 0) return null;

  const calculateWeeksUntil = (date) => {
    const today = new Date();
    const eventDate = new Date(date);
    const diffTime = eventDate - today;
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
    return diffWeeks > 0 ? diffWeeks : 0;
  };

  const handleRemoveEvent = async (eventId) => {
    try {
      await deleteDoc(doc(db, 'userEvents', eventId));
      // Optionally refresh the events list or update state
    } catch (error) {
      console.error('Error removing event:', error);
    }
  };

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-slate-800 mb-4">Upcoming Events</h2>
      <div className="space-y-4">
        {events.map((event) => (
          <div key={event.id} className="relative group">
            <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                    {event.distance}
                  </span>
                </div>
                <div className="flex items-center text-sm text-gray-500 space-x-2">
                  <span>{new Date(event.date).toLocaleDateString()}</span>
                  <span className="text-gray-400">•</span>
                  <span>{calculateWeeksUntil(event.date)} weeks away</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{event.location}</p>
              </div>
              <button
                onClick={() => handleRemoveEvent(event.id)}
                className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-all duration-200"
                title="Remove event"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfilePage() {
  const { user: currentUser } = useAuth();
  const { userId } = useParams();
  // Use the current user's ID if no userId is provided in the URL
  const targetUserId = userId || currentUser?.uid;
  const [profileData, setProfileData] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [connections, setConnections] = useState({ followers: [], following: [] });
  const [loading, setLoading] = useState(true);
  const [races, setRaces] = useState([]);
  const [showAddResult, setShowAddResult] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedEventType, setSelectedEventType] = useState('run');
  const [selectedDistance, setSelectedDistance] = useState('all');
  const [chartData, setChartData] = useState([]);
  const fileInputRef = useRef(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showEditResults, setShowEditResults] = useState(false);
  const [selectedRaceToEdit, setSelectedRaceToEdit] = useState(null);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const isOwnProfile = !userId || userId === currentUser?.uid;
  const [isConnectPlatformsOpen, setIsConnectPlatformsOpen] = useState(false);
  const [error, setError] = useState(null);
  const [crop, setCrop] = useState({ aspect: 1 });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);

  // Move fetchProfileData outside of useEffect
  const fetchProfileData = async () => {
    if (!targetUserId) {
      console.log('No target userId available, waiting for auth...');
      return;
    }

    setLoading(true);
    console.log('Starting profile data fetch for userId:', targetUserId);

    try {
      // 1. Fetch user document
      console.log('Fetching user document...');
      const userRef = doc(db, 'users', targetUserId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        console.error('No user document found for:', targetUserId);
        if (currentUser && targetUserId === currentUser.uid) {
          console.log('Creating new user document for current user');
          const newUserData = await createUserDocument(currentUser);
          setProfileData(newUserData);
          setLoading(false);
          return;
        }
        setError('User not found');
        setLoading(false);
        return;
      }
      
      const userData = userDoc.data();
      console.log('User document found:', userData);

      setProfileData({
        ...userData,
        userId: targetUserId,
        displayName: userData.displayName || 'Anonymous User',
        profileImage: userData.profileImage || '',
        location: userData.location || '',
        email: userData.email || '',
        totalRaces: 0
      });

      // 2. Fetch user connections
      console.log('Fetching user connections...');
      const userConnectionsRef = doc(db, 'userConnections', targetUserId);
      const userConnectionsDoc = await getDoc(userConnectionsRef);
      const connectionsData = userConnectionsDoc.exists() 
        ? userConnectionsDoc.data() 
        : { followers: [], following: [] };
      console.log('Connections data:', connectionsData);
      setConnections(connectionsData);

      // 3. Fetch all user race results from single collection
      console.log('Fetching race results...');
      try {
        // Fetch all user race results from single collection
        const resultsRef = collection(db, 'user_race_results');
        let allResults = []; // Declare allResults here
        
        // Try simpler query first while index is building
        let resultsQuery;
        try {
          // First attempt with full index
          resultsQuery = query(
            resultsRef,
            where('userId', '==', targetUserId),
            orderBy('date', 'desc'),
            orderBy('__name__', 'desc')
          );
          const resultsSnapshot = await getDocs(resultsQuery);
          console.log('User race results found:', resultsSnapshot.docs.length);

          allResults = resultsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          console.log('Processed results:', allResults);
          
        } catch (indexError) {
          console.log('Index not ready, falling back to simple query');
          // Fallback to simple query without ordering
          resultsQuery = query(
            resultsRef,
            where('userId', '==', targetUserId)
          );
          const resultsSnapshot = await getDocs(resultsQuery);
          
          allResults = resultsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          // Sort in memory instead
          .sort((a, b) => new Date(b.date) - new Date(a.date));

          console.log('Processed results (fallback):', allResults);
        }

        // Set the results and update profile data
        setRaces(allResults);
        
        // Update profile data with race count
        setProfileData(prevData => ({
          ...prevData,
          totalRaces: allResults.length
        }));
      } catch (error) {
        console.error('Error fetching race results:', error);
        throw error;
      }

      // 4. Check if current user is following this profile
      if (currentUser && targetUserId !== currentUser.uid) {
        const isCurrentlyFollowing = connectionsData.followers?.includes(currentUser.uid);
        setIsFollowing(isCurrentlyFollowing);
      }

    } catch (error) {
      console.error('Error fetching profile data:', error);
      setError('Error loading profile');
    } finally {
      setLoading(false);
    }
  };

  // Use fetchProfileData in useEffect
  useEffect(() => {
    if (targetUserId) {
      fetchProfileData();
    }
  }, [targetUserId]);

  useEffect(() => {
    const checkFirestoreData = async () => {
      try {
        // Check userUpcomingEvents
        const userEventsRef = collection(db, 'userUpcomingEvents');
        const userEventsQuery = query(userEventsRef, where('userId', '==', targetUserId));
        const userEventsSnap = await getDocs(userEventsQuery);
        console.log('userUpcomingEvents docs:', userEventsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })));

        // Check events collection
        const eventsRef = collection(db, 'events');
        const eventsSnap = await getDocs(eventsRef);
        console.log('events collection docs:', eventsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })));

        // Check race results
        const resultsRef = collection(db, 'race_results');
        const resultsQuery = query(resultsRef, where('userId', '==', targetUserId));
        const resultsSnap = await getDocs(resultsQuery);
        console.log('race_results docs:', resultsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })));

      } catch (error) {
        console.error('Error checking Firestore data:', error);
      }
    };

    if (targetUserId) {
      checkFirestoreData();
    }
  }, [targetUserId]);

  // Get unique distances for the selected event type
  const getUniqueDistances = () => {
    const distances = new Set();
    races
      .filter(result => result.type === selectedEventType)
      .forEach(result => distances.add(result.distance));
    return Array.from(distances).sort();
  };

  // Convert time string (HH:MM:SS) to minutes
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    if (parts.length === 3) {
      return (+parts[0] * 60) + (+parts[1]) + (+parts[2] / 60);
    } else if (parts.length === 2) {
      return (+parts[0] * 60) + (+parts[1]);
    }
    return 0;
  };

  // Format minutes to HH:MM display
  const formatTimeDisplay = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  };

  // Calculate relative heights for the chart points
  const maxTime = Math.max(...chartData.map(d => d.time), 0);
  const minTime = Math.min(...chartData.map(d => d.time), maxTime);
  const normalizeHeight = (time) => {
    if (chartData.length < 2) return 50;
    // Invert the normalization so faster times are higher
    return 80 - ((time - minTime) / (maxTime - minTime || 1) * 60);
  };

  // Generate SVG path for the line
  const generatePath = () => {
    if (chartData.length < 2) return '';
    const width = 100 / (chartData.length - 1);
    return chartData.map((point, i) => {
      const x = i * width;
      const y = normalizeHeight(point.time);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  useEffect(() => {
    // Reset selected distance when event type changes
    setSelectedDistance('all');
  }, [selectedEventType]);

  useEffect(() => {
    // Filter results by event type and distance
    const filteredResults = races
      .filter(result => {
        const matchesType = result.type === selectedEventType;
        const matchesDistance = selectedDistance === 'all' || result.distance === selectedDistance;
        return matchesType && matchesDistance;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Process results into chart data
    const data = filteredResults.map(result => ({
      date: new Date(result.date),
      time: timeToMinutes(result.time)
    }));

    setChartData(data);
  }, [selectedEventType, selectedDistance, races]);

  const handleImageSelect = (event) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      
      // Basic validation
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Size validation (e.g., 5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert('Please select an image smaller than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target.result);
        setShowCropModal(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCroppedImage = async (blob) => {
    if (!currentUser) {
      console.error('No current user');
      return;
    }

    try {
      const timestamp = Date.now();
      const filename = `profile_${currentUser.uid}_${timestamp}.jpg`;
      const storageRef = ref(storage, `profileImages/${filename}`);
      
      console.log('Uploading image to Firebase Storage...');
      await uploadBytes(storageRef, blob);
      
      console.log('Getting download URL...');
      const downloadURL = await getDownloadURL(storageRef);
      console.log('Download URL:', downloadURL);
      
      // Update user document with new profile image URL
      const userRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('Updating user document with new profile image URL...');
        await setDoc(userRef, {
          ...userData,
          profileImage: downloadURL,
          lastUpdated: new Date()
        }, { merge: true });
        
        // Update local state
        console.log('Updating local state with new profile image...');
        setProfileData(prev => ({
          ...prev,
          profileImage: downloadURL
        }));
      }
      
      setShowCropModal(false);
    } catch (error) {
      console.error('Error uploading profile image:', error);
    }
  };

  const handleAddResult = async (resultData) => {
    try {
      await addDoc(collection(db, 'user_race_results'), {
        userId: currentUser.uid,
        source: 'manual',
        addedAt: new Date(),
        eventName: resultData.title,
        title: resultData.title,
        ...resultData
      });
      
      await fetchProfileData();
      setShowAddResult(false);
    } catch (error) {
      console.error('Error adding manual result:', error);
    }
  };

  const getProfileUrl = () => {
    const baseUrl = window.location.origin;
    const profilePath = `/profile/${userId || currentUser?.uid}`;
    const loginRedirect = encodeURIComponent(`${baseUrl}${profilePath}`);
    const shareMessage = encodeURIComponent(`Follow ${profileData?.displayName || 'this athlete'} on Blister!`);
    return `${baseUrl}/login?redirect=${loginRedirect}&message=${shareMessage}`;
  };

  // Add this function to handle profile updates
  const handleProfileUpdate = async (formData) => {
    try {
      console.log('Updating profile with data:', formData);
      const userRef = doc(db, 'users', currentUser.uid);
      
      // Update user document with new data
      const updateData = {
        ...profileData,
        displayName: formData.displayName,
        location: formData.location,
        profileImage: formData.profileImage,
        lastUpdated: new Date(),
        searchableTerms: [
          formData.displayName.toLowerCase(),
          profileData.email.toLowerCase(),
          formData.location?.toLowerCase()
        ].filter(Boolean)
      };

      console.log('Saving update data:', updateData);
      await setDoc(userRef, updateData, { merge: true });
      console.log('Profile updated successfully');

      // Update local state
      setProfileData(updateData);
      
      // Close the modal
      setShowEditProfile(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleDeleteResult = async (resultId) => {
    if (!currentUser || !profileData) return;
    
    if (window.confirm('Are you sure you want to delete this race result?')) {
      try {
        console.log('Deleting result:', resultId);
        
        // Delete from user_race_results collection
        const raceRef = doc(db, 'user_race_results', resultId);
        await deleteDoc(raceRef);
        
        // Update local state
        setRaces(prevRaces => prevRaces.filter(race => race.id !== resultId));
        
        // Update profile data with new count
        setProfileData(prev => ({
          ...prev,
          totalRaces: Math.max(0, (prev.totalRaces || 0) - 1)
        }));

        console.log('Result deleted successfully');
        
      } catch (error) {
        console.error('Error deleting race result:', error);
        console.error('Error details:', {
          resultId,
          error: error.message
        });
        alert('Failed to delete race result. Please try again.');
      }
    }
  };

  const handleEditResult = async (updatedData) => {
    try {
      if (!selectedRaceToEdit?.id) {
        throw new Error('No race selected for editing');
      }

      // Format the date properly
      const formattedDate = new Date(updatedData.date);
      if (isNaN(formattedDate.getTime())) {
        throw new Error('Invalid date format');
      }

      // Prepare the update data
      const updateData = {
        ...selectedRaceToEdit, // Keep existing data
        ...updatedData, // Override with new data
        date: formattedDate,
        eventName: updatedData.title || updatedData.eventName,
        title: updatedData.title, // Keep title in sync
        lastUpdated: new Date()
      };

      // Remove any undefined or null values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined || updateData[key] === null) {
          delete updateData[key];
        }
      });

      console.log('Updating race with data:', updateData);

      // Update the document
      const raceRef = doc(db, 'user_race_results', selectedRaceToEdit.id);
      await setDoc(raceRef, updateData, { merge: true });
      
      // Refresh the data
      await fetchProfileData();
      setSelectedRaceToEdit(null);

    } catch (error) {
      console.error('Error updating race result:', error);
      console.error('Error details:', {
        message: error.message,
        selectedRace: selectedRaceToEdit,
        updatedData: updatedData
      });
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUser || !targetUserId || currentUser.uid === targetUserId) return;

    try {
      if (isFollowing) {
        await unfollowUser(currentUser.uid, targetUserId);
      } else {
        await followUser(currentUser.uid, targetUserId);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const handleDeleteProfileImage = async () => {
    if (!currentUser) return;
    
    try {
      // Update user document to remove profile image
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, {
        ...profileData,
        profileImage: ''
      }, { merge: true });

      // Update local state
      setProfileData(prev => ({
        ...prev,
        profileImage: ''
      }));
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to delete profile picture. Please try again.');
    }
  };

  // Add this effect to fetch upcoming events
  useEffect(() => {
    const loadUpcomingEvents = async () => {
      if (!targetUserId) return;
      
      try {
        console.log('Loading upcoming events for user:', targetUserId);
        const events = await getUpcomingEvents(targetUserId);
        console.log('Loaded upcoming events:', events);
        setUpcomingEvents(events);
      } catch (error) {
        console.error('Error loading upcoming events:', error);
      }
    };

    loadUpcomingEvents();
  }, [targetUserId]);

  // Add this debug function
  const debugRaceData = async () => {
    try {
      console.log('Debugging race data for user:', targetUserId);
      
      // Check manual results collection
      const manualRef = collection(db, 'user_manual_results');
      const manualSnap = await getDocs(manualRef);
      console.log('All manual results:', manualSnap.docs.map(doc => ({
        id: doc.id,
        data: doc.data()
      })));

      // Check automatic results collection
      const autoRef = collection(db, 'raceResults');
      const autoSnap = await getDocs(autoRef);
      console.log('All auto results:', autoSnap.docs.map(doc => ({
        id: doc.id,
        data: doc.data()
      })));

      // Log all collections for this user
      const userRacesQuery = query(
        collection(db, 'raceResults'),
        where('userId', '==', targetUserId)
      );
      const userRaces = await getDocs(userRacesQuery);
      console.log('User race results:', userRaces.docs.map(doc => ({
        id: doc.id,
        data: doc.data()
      })));

    } catch (error) {
      console.error('Error debugging race data:', error);
    }
  };

  // Call it in useEffect
  useEffect(() => {
    if (targetUserId) {
      debugRaceData();
    }
  }, [targetUserId]);

  // Optimized search function
  const searchAthleteResults = async (searchText) => {
    if (!searchText.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      console.log('Executing search for:', searchText);
      const searchTerm = searchText.toLowerCase().trim();

      const resultsRef = collection(db, 'race_results');
      
      // First try exact match
      const exactQuery = query(resultsRef,
        where('athlete_name', '==', searchText),
        where('source', '==', 'runsignup'),
        limit(20)
      );

      let snapshot = await getDocs(exactQuery);
      
      // If no exact matches, try contains
      if (snapshot.empty) {
        console.log('No exact matches, trying contains...');
        // Get all RunSignUp results and filter in memory
        const allQuery = query(resultsRef,
          where('source', '==', 'runsignup'),
          limit(1000)
        );
        
        snapshot = await getDocs(allQuery);
        
        const results = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            event_date: doc.data().event_date ? new Date(doc.data().event_date) : null
          }))
          .filter(result => 
            result.athlete_name && 
            result.athlete_name.toLowerCase().includes(searchTerm)
          )
          .slice(0, 20);

        console.log(`Found ${results.length} partial matches`);
        setSearchResults(results);
        return;
      }

      // Process exact matches
      const results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        event_date: doc.data().event_date ? new Date(doc.data().event_date) : null
      }));

      console.log(`Found ${results.length} exact matches`);
      setSearchResults(results);

    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Update claimResult to use the now-accessible fetchProfileData
  const claimResult = async (result) => {
    try {
      console.log('Claiming result:', result);

      const resultToSave = {
        userId: currentUser.uid,
        originalResultId: result.id,
        claimed: true,
        claimedAt: new Date(),
        eventId: result.event_id,
        eventName: result.event_name,
        date: result.event_date,
        time: result.chip_time || result.finish_time || result.raw_time_data?.chip_time || null,
        source: 'claimed', // Indicate this was claimed from search
        event_distance: result.event_distance,
        city: result.city,
        state: result.state,
        athlete_name: result.athlete_name,
        placement_overall: result.placement_overall,
        placement_gender: result.placement_gender,
        placement_division: result.placement_division
      };

      console.log('Saving result:', resultToSave);

      // Save to user_race_results
      await addDoc(collection(db, 'user_race_results'), resultToSave);

      await fetchProfileData();
      setSearchResults(prev => prev.filter(r => r.id !== result.id));

    } catch (error) {
      console.error('Error claiming result:', error);
      console.error('Error details:', {
        message: error.message,
        result: result
      });
    }
  };

  // Add this function near your other functions
  const debugSearchData = async () => {
    try {
      const resultsRef = collection(db, 'race_results');
      const snapshot = await getDocs(resultsRef);
      
      // Get a sample of results
      const sampleResults = snapshot.docs.slice(0, 5).map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          athlete_name: data.athlete_name,
          searchName: data.athlete_name?.toLowerCase(),
          source: data.source
        };
      });
      
      console.log('Sample results:', sampleResults);
      
      // Specifically look for Robbie
      const robbieResults = snapshot.docs.filter(doc => {
        const data = doc.data();
        return data.athlete_name && 
          data.athlete_name.toLowerCase().includes('robbie shattuck'.toLowerCase());
      });
      
      console.log('Found Robbie results:', robbieResults.map(doc => doc.data()));
      
    } catch (error) {
      console.error('Debug error:', error);
    }
  };

  const unclaimResult = async (race) => {
    try {
      console.log('Unclaiming result:', race);

      // Delete from user_race_results
      await deleteDoc(doc(db, 'user_race_results', race.id));

      // Refresh the profile data
      await fetchProfileData();

      // Show success message
      console.log('Result unclaimed successfully');
    } catch (error) {
      console.error('Error unclaiming result:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!profileData && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Profile Not Found</h2>
          <p className="text-slate-600">The requested profile could not be found.</p>
        </div>
      </div>
    );
  }

  const isCurrentUser = currentUser?.uid === (targetUserId || currentUser?.uid);

  const getProfileImageUrl = (imageUrl, displayName = 'User') => {
    if (!imageUrl || imageUrl.trim() === '') {
      // Generate a placeholder avatar using UI Avatars
      const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase();
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=7C3AED&color=fff&size=200`;
    }
    return imageUrl;
  };

  return (
    <div className="min-h-screen bg-sand-50">
      <Helmet>
        <title>Profile | Blister</title>
        <meta name="description" content="View and manage your running and triathlon profile. Track your upcoming events, personal records, and connect with other athletes in the Bay Area endurance sports community." />
        <meta property="og:title" content="Profile | Blister" />
        <meta property="og:description" content="View and manage your running and triathlon profile. Track your upcoming events, personal records, and connect with other athletes in the Bay Area endurance sports community." />
      </Helmet>
      <div className="bg-gradient-to-r from-purple-600 to-turquoise-500">
        <div className="container mx-auto px-6 py-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="relative group">
                {isCurrentUser && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                  >
                    <Pencil className="w-6 h-6 text-white" />
                  </button>
                )}
                <img
                  src={getProfileImageUrl(profileData.profileImage, profileData.displayName)}
                  alt={profileData.displayName}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white/40 shadow-lg"
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageSelect}
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">
                  {profileData.displayName}
                </h1>
                {profileData.location && (
                  <div className="flex items-center text-white/80 mb-2">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span>{profileData.location}</span>
                  </div>
                )}
                <div className="flex items-center space-x-4 text-white/90">
                  <button
                    onClick={() => setShowFollowersModal(true)}
                    className="text-sm hover:text-white transition-colors"
                  >
                    <span className="font-semibold">{connections.followers?.length || 0}</span> followers
                  </button>
                  <button
                    onClick={() => setShowFollowingModal(true)}
                    className="text-sm hover:text-white transition-colors"
                  >
                    <span className="font-semibold">{connections.following?.length || 0}</span> following
                  </button>
                </div>
              </div>
            </div>
            <div className="flex space-x-4">
              {isCurrentUser ? (
                <>
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <Share2 className="w-5 h-5 text-white" />
                  </button>
                  <button
                    onClick={() => setIsConnectPlatformsOpen(true)}
                    className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white font-medium flex items-center"
                  >
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Connect Platforms
                  </button>
                  <button
                    onClick={() => setShowEditProfile(true)}
                    className="px-6 py-3 rounded-full bg-white text-purple-600 hover:bg-white/90 transition-colors font-medium"
                  >
                    Edit Profile
                  </button>
                </>
              ) : (
                <button
                  onClick={handleFollowToggle}
                  className={`px-6 py-3 rounded-full bg-white text-purple-600 hover:bg-white/90 transition-colors font-medium ${
                    isFollowing ? 'bg-slate-100 text-slate-700' : ''
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <QuickStats 
          stats={{
            totalRaces: races.length,
            races: races,
            upcomingRaces: upcomingEvents.length,
            connections: connections
          }}
          userId={targetUserId || currentUser?.uid}
        />

        <UpcomingEvents events={upcomingEvents} />

        <div className="grid grid-cols-3 gap-8 mt-8">
          <div className="col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800">Race Results</h3>
                {isCurrentUser && (
                  <div className="flex gap-4">
                    <button
                      onClick={() => setShowAddResult(true)}
                      className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Add Result
                    </button>
                  </div>
                )}
              </div>

              {/* Search Results Section */}
              {isCurrentUser && (
                <div className="mb-6">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search for your race results by name..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <button
                      onClick={() => searchAthleteResults(searchQuery)}
                      disabled={isSearching}
                      className={`px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center`}
                    >
                      {isSearching ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      ) : (
                        <Search className="w-5 h-5 mr-2" />
                      )}
                      Search
                    </button>
                  </div>

                  {/* Search Results Display */}
                  <div className="mt-4">
                    {isSearching && (
                      <div className="text-center text-gray-600">
                        Searching...
                      </div>
                    )}
                    
                    {!isSearching && searchResults.length > 0 && (
                      <div className="space-y-4">
                        {searchResults.map((result) => (
                          <div 
                            key={result.id}
                            className="flex items-center justify-between p-4 bg-white shadow-sm rounded-lg hover:shadow-md transition-shadow"
                          >
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">
                                {result.athlete_name}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                <span className="font-medium">{result.event_name}</span>
                                {result.event_distance && (
                                  <>
                                    <span className="mx-2">•</span>
                                    <span>{result.event_distance}</span>
                                  </>
                                )}
                                <span className="mx-2">•</span>
                                <span>{new Date(result.event_date).toLocaleDateString()}</span>
                                {result.chip_time && (
                                  <>
                                    <span className="mx-2">•</span>
                                    <span>{result.chip_time}</span>
                                  </>
                                )}
                              </div>
                              {result.city && result.state && (
                                <div className="text-sm text-gray-500">
                                  {result.city}, {result.state}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => claimResult(result)}
                              className="ml-4 flex items-center px-4 py-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors"
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Claim Result
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {!isSearching && searchQuery.trim() !== '' && searchResults.length === 0 && (
                      <div className="text-center text-gray-600">
                        No results found for "{searchQuery}"
                      </div>
                    )}
                  </div>
                </div>
              )}

              {showAddResult && (
                <RaceResultForm
                  initialData={null}
                  onSubmit={handleAddResult}
                  onCancel={() => setShowAddResult(false)}
                />
              )}

              {selectedRaceToEdit && (
                <RaceResultForm
                  initialData={selectedRaceToEdit}
                  onSubmit={handleEditResult}
                  onCancel={() => setSelectedRaceToEdit(null)}
                />
              )}

              <div className="space-y-4">
                {races
                  .sort((a, b) => {
                    // Convert both dates to timestamps for comparison
                    const dateA = a.date instanceof Date ? a.date : new Date(a.date);
                    const dateB = b.date instanceof Date ? b.date : new Date(b.date);
                    return dateB - dateA; // Most recent first
                  })
                  .map((race) => (
                    <RaceResult
                      key={race.id}
                      race={race}
                      onEdit={(race) => setSelectedRaceToEdit(race)}
                      onDelete={handleDeleteResult}
                      onUnclaim={unclaimResult}
                      isCurrentUser={isCurrentUser}
                    />
                  ))}
              </div>
            </div>
          </div>

          <div>
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800">Progress</h3>
                <select
                  value={selectedEventType}
                  onChange={(e) => setSelectedEventType(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-slate-700"
                >
                  <option value="run">Running</option>
                  <option value="tri">Triathlon</option>
                </select>
              </div>
              <div className="flex justify-end mb-4">
                <select
                  value={selectedDistance}
                  onChange={(e) => setSelectedDistance(e.target.value)}
                  className="px-4 py-2 text-base rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-[120px]"
                >
                  <option value="all">All Distances</option>
                  {getUniqueDistances().map(distance => (
                    <option key={distance} value={distance}>{distance}</option>
                  ))}
                </select>
              </div>
              <div className="h-64 bg-gradient-to-b from-purple-50/50 to-transparent rounded-lg">
                {chartData.length > 0 ? (
                  <div className="relative h-full w-full">
                    {/* Y-axis labels */}
                    <div className="absolute left-0 top-0 bottom-8 w-16 flex flex-col justify-between text-xs text-slate-400">
                      {[0, 1, 2].map((i) => {
                        const time = minTime + (i * ((maxTime - minTime) / 2));
                        return (
                          <span key={i} className="text-right pr-2">
                            {formatTimeDisplay(time)}
                          </span>
                        );
                      })}
                    </div>
                    
                    <div className="ml-16 h-full">
                      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        {/* Background grid lines */}
                        {[0, 1, 2].map((i) => (
                          <line
                            key={i}
                            x1="0"
                            y1={20 + (i * 30)}
                            x2="100"
                            y2={20 + (i * 30)}
                            stroke="#E2E8F0"
                            strokeWidth="1"
                            strokeDasharray="4 2"
                          />
                        ))}
                        
                        {chartData.length > 1 && (
                          <path
                            d={generatePath()}
                            fill="none"
                            stroke="url(#progressGradient)"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        )}
                        
                        <defs>
                          <linearGradient id="progressGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#9333EA" />
                            <stop offset="100%" stopColor="#14B8A6" />
                          </linearGradient>
                        </defs>

                        {chartData.length === 1 ? (
                          // Single point centered
                          <circle
                            cx="50"
                            cy={normalizeHeight(chartData[0].time)}
                            r="3"
                            fill="#9333EA"
                          />
                        ) : (
                          // Multiple points
                          chartData.map((point, i) => {
                            const x = (i / (chartData.length - 1)) * 100;
                            const y = normalizeHeight(point.time);
                            return (
                              <circle
                                key={i}
                                cx={x}
                                cy={y}
                                r="3"
                                fill={i === 0 ? "#9333EA" : i === chartData.length - 1 ? "#14B8A6" : "url(#progressGradient)"}
                              />
                            );
                          })
                        )}
                      </svg>
                    </div>

                    <div className="absolute bottom-0 left-16 right-0 flex justify-between text-sm text-slate-400 px-2">
                      {chartData.length === 1 ? (
                        // Center the year for single point
                        <span className="w-full text-center">
                          {new Date(chartData[0].date).getFullYear()}
                        </span>
                      ) : (
                        // Show range for multiple points
                        <>
                          <span>{new Date(chartData[0].date).getFullYear()}</span>
                          <span>{new Date(chartData[chartData.length - 1].date).getFullYear()}</span>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500">
                    No data available for selected criteria
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showShareModal && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          profileUrl={getProfileUrl()}
        />
      )}

      {showEditProfile && (
        <EditProfileModal
          isOpen={showEditProfile}
          onClose={() => setShowEditProfile(false)}
          user={profileData}
          onSave={handleProfileUpdate}
        />
      )}

      <FollowersModal
        isOpen={showFollowersModal}
        onClose={() => setShowFollowersModal(false)}
        userId={targetUserId || currentUser?.uid}
        type="followers"
      />

      <FollowersModal
        isOpen={showFollowingModal}
        onClose={() => setShowFollowingModal(false)}
        userId={targetUserId || currentUser?.uid}
        type="following"
      />

      <ConnectPlatformsModal 
        isOpen={isConnectPlatformsOpen} 
        setIsOpen={setIsConnectPlatformsOpen} 
      />

      {showCropModal && selectedImage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Crop Profile Picture</h3>
            <ReactCrop
              crop={crop}
              onChange={setCrop}
              onComplete={c => setCompletedCrop(c)}
              aspect={1}
              circularCrop
            >
              <img src={selectedImage} alt="Crop preview" />
            </ReactCrop>
            <div className="flex justify-end space-x-4 mt-4">
              <button
                onClick={() => {
                  setShowCropModal(false);
                  setSelectedImage(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  const image = new Image();
                  image.src = selectedImage;
                  image.onload = () => {
                    canvas.width = crop.width;
                    canvas.height = crop.height;
                    ctx.drawImage(
                      image,
                      crop.x,
                      crop.y,
                      crop.width,
                      crop.height,
                      0,
                      0,
                      crop.width,
                      crop.height
                    );
                    canvas.toBlob(
                      (blob) => handleCroppedImage(blob),
                      'image/jpeg',
                      0.95
                    );
                  };
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePage; 