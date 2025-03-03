import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, getDocs, deleteDoc, doc, query, orderBy, updateDoc, writeBatch, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { getEventImage } from '../utils/eventImages';
import EventScraper from './EventScraper';
import { Trash2, Search, Edit2, RefreshCw, Database } from 'lucide-react';

function EventDashboard() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [eventData, setEventData] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    type: 'road',
    distances: [],
    sourceUrl: '',
    latitude: '',
    longitude: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [newDistance, setNewDistance] = useState('');
  const [events, setEvents] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingEvent, setEditingEvent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsMessage, setResultsMessage] = useState(null);

  const geocodeAddress = async (address) => {
    const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
    
    // Check if token exists
    if (!mapboxToken) {
      console.error('Mapbox token is not configured');
      setMessage('Location lookup is currently unavailable. You can still save the event with the location name.');
      return null;
    }

    try {
      // Remove country bias to allow for better city searches
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxToken}&limit=1&types=place,locality`
      );
      
      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const [longitude, latitude] = feature.center;
        
        // Extract city, state, and country from the context
        const city = feature.text || '';
        const state = feature.context?.find(c => c.id.startsWith('region'))?.text || '';
        const country = feature.context?.find(c => c.id.startsWith('country'))?.text || '';
        
        return { 
          latitude, 
          longitude,
          formattedLocation: city + (state ? `, ${state}` : '') + (country ? `, ${country}` : '')
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      setMessage('Location lookup failed. You can still save the event with the location name.');
      return null;
    }
  };

  const handleLocationChange = async (e) => {
    const location = e.target.value;
    // Always update the raw input value first
    setEventData(prev => ({ 
      ...prev, 
      location,
      // Clear coordinates when location is cleared
      ...(location.trim() === '' && { latitude: '', longitude: '' })
    }));
    setMessage('');
    
    // Debounce geocoding to avoid aggressive updates
    if (location.trim().length >= 3) {
      // Wait for user to stop typing for 500ms
      clearTimeout(window.geocodeTimer);
      window.geocodeTimer = setTimeout(async () => {
        const coords = await geocodeAddress(location);
        if (coords) {
          // Don't automatically update the location field, just store coordinates
          setEventData(prev => ({
            ...prev,
            latitude: coords.latitude,
            longitude: coords.longitude,
          }));
          // Show a success message instead of auto-filling
          setMessage('Location found! Coordinates will be saved with your custom location name.');
        } else {
          if (location.trim().length > 3) {
            setMessage('Could not find coordinates for this location. You can still save the event with this location name, or enter coordinates manually.');
          }
        }
      }, 500);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      if (!eventData.title || !eventData.date) {
        throw new Error('Please fill in at least the event title and date');
      }

      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(eventData.date)) {
        throw new Error('Invalid date format. Please use YYYY-MM-DD format.');
      }

      // Try geocoding one last time if we have a location but no coordinates
      if (eventData.location && (!eventData.latitude || !eventData.longitude)) {
        const coords = await geocodeAddress(eventData.location);
        if (coords) {
          eventData.latitude = coords.latitude;
          eventData.longitude = coords.longitude;
          eventData.location = coords.formattedLocation || eventData.location;
        }
      }

      // Format distances properly
      const distances = eventData.distances.length > 0 ? eventData.distances : [];
      // Join distances with commas and spaces for display
      const distanceDisplay = distances.join(', ');

      const eventToSave = {
        title: eventData.title.trim(),
        date: eventData.date, // Use the validated date directly
        time: eventData.time || null,
        location: eventData.location.trim(),
        type: eventData.type,
        distances: distances, // Array for future use
        distance: distanceDisplay, // String format for current display
        sourceUrl: eventData.sourceUrl.trim() || '',
        latitude: Number(eventData.latitude) || null,
        longitude: Number(eventData.longitude) || null,
        createdAt: serverTimestamp(),
        city: eventData.location.trim(),
        imageUrl: eventData.image || ''
      };

      // Only validate coordinates if they exist
      if (eventToSave.latitude !== null && (eventToSave.latitude < -90 || eventToSave.latitude > 90)) {
        throw new Error('Invalid latitude value. Must be between -90 and 90.');
      }
      if (eventToSave.longitude !== null && (eventToSave.longitude < -180 || eventToSave.longitude > 180)) {
        throw new Error('Invalid longitude value. Must be between -180 and 180.');
      }

      await addDoc(collection(db, 'events'), eventToSave);

      setEventData({
        title: '',
        date: '',
        time: '',
        location: '',
        type: 'road',
        distances: [],
        sourceUrl: '',
        latitude: '',
        longitude: '',
        image: ''
      });
      setNewDistance('');
      setSuccess('Event added successfully!');
      setTimeout(() => navigate('/run'), 2000);
    } catch (error) {
      console.error('Error adding event:', error);
      setError(error.message || 'Error adding event. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEventData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddDistance = (e) => {
    e.preventDefault();
    if (newDistance.trim()) {
      // Standardize distance format
      let formattedDistance = newDistance.trim();
      // Ensure consistent capitalization for K (kilometer)
      formattedDistance = formattedDistance.replace(/k$/i, 'K');
      // Add K if number only
      if (/^\d+$/.test(formattedDistance)) {
        formattedDistance += 'K';
      }
      
      setEventData(prev => ({
        ...prev,
        distances: [...prev.distances, formattedDistance]
      }));
      setNewDistance('');
    }
  };

  const handleRemoveDistance = (index) => {
    setEventData(prev => ({
      ...prev,
      distances: prev.distances.filter((_, i) => i !== index)
    }));
  };

  // Fetch events
  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoadingEvents(true);
      try {
        const eventsQuery = query(collection(db, 'events'), orderBy('date', 'desc'));
        const querySnapshot = await getDocs(eventsQuery);
        const eventsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setEvents(eventsData);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setIsLoadingEvents(false);
      }
    };

    fetchEvents();
  }, []);

  // Handle event deletion
  const handleDeleteEvent = async (eventId) => {
    if (!confirm('Are you sure you want to delete this event?')) {
      return;
    }

    try {
      const eventRef = doc(db, 'events', eventId);
      await deleteDoc(eventRef);
      
      // Optionally refresh the events list or remove from local state
      setEvents(events.filter(event => event.id !== eventId));
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event. Please try again.');
    }
  };

  // Update the search filtering logic
  useEffect(() => {
    if (!events) return;
    
    const filtered = events.filter(event => {
      const searchLower = searchQuery.toLowerCase();
      return (
        event.title?.toLowerCase().includes(searchLower) ||
        event.location?.address?.toLowerCase().includes(searchLower) || // Handle nested location
        (typeof event.location === 'string' && event.location.toLowerCase().includes(searchLower)) || // Handle string location
        event.type?.toLowerCase().includes(searchLower) ||
        event.distance?.toLowerCase().includes(searchLower)
      );
    });

    setFilteredEvents(filtered);
  }, [searchQuery, events]);

  // Add this new function for handling edit mode
  const handleEditClick = (event) => {
    setEditingEvent({
      ...event,
      date: event.date.split('T')[0], // Format date for input field
    });
    setIsEditing(true);
  };

  // Add this function to handle saving edits
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (!editingEvent.title || !editingEvent.date) {
        throw new Error('Please fill in at least the event title and date');
      }

      // Try geocoding if location changed and no coordinates
      if (editingEvent.location && (!editingEvent.latitude || !editingEvent.longitude)) {
        const coords = await geocodeAddress(editingEvent.location);
        if (coords) {
          editingEvent.latitude = coords.latitude;
          editingEvent.longitude = coords.longitude;
        }
      }

      const [year, month, day] = editingEvent.date.split('-').map(Number);
      const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      const eventToSave = {
        ...editingEvent,
        date: formattedDate,
        latitude: Number(editingEvent.latitude) || null,
        longitude: Number(editingEvent.longitude) || null,
        distance: editingEvent.distances.join(', '),
      };

      // Update the document in Firebase
      await updateDoc(doc(db, 'events', editingEvent.id), eventToSave);

      // Update local state
      setEvents(prevEvents => 
        prevEvents.map(event => 
          event.id === editingEvent.id ? eventToSave : event
        )
      );

      setSuccess('Event updated successfully!');
      setIsEditing(false);
      setEditingEvent(null);
    } catch (error) {
      console.error('Error updating event:', error);
      setError(error.message || 'Error updating event. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Add this function to cleanup past events
  const cleanupPastEvents = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    try {
      const pastEvents = events.filter(event => new Date(event.date) < today);
      
      if (pastEvents.length === 0) {
        setMessage('No past events to clean up.');
        return;
      }

      if (window.confirm(`Are you sure you want to remove ${pastEvents.length} past events?`)) {
        const batch = writeBatch(db);
        
        pastEvents.forEach(event => {
          batch.delete(doc(db, 'events', event.id));
        });

        await batch.commit();
        
        // Update local state
        setEvents(prevEvents => 
          prevEvents.filter(event => new Date(event.date) >= today)
        );
        
        setSuccess(`Successfully removed ${pastEvents.length} past events.`);
      }
    } catch (error) {
      console.error('Error cleaning up past events:', error);
      setError('Failed to clean up past events. Please try again.');
    }
  };

  const handleFetchPastEvents = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    
    try {
      const startTime = Date.now();
      console.log('Initiating RunSignUp past events fetch...', {
        time: new Date().toISOString()
      });
      
      const functionUrl = 'https://us-central1-blister-4781e.cloudfunctions.net/getRunSignUpPastEventsHttp';
      const response = await fetch(functionUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Fetch initiated:', {
        ...data,
        durationMs: Date.now() - startTime
      });
      
      setMessage(`${data.message} Request ID: ${data.requestId}`);
      
      // Start polling for new events
      let pollCount = 0;
      const pollInterval = setInterval(async () => {
        console.log('Polling for new events...', { pollCount });
        await refreshEvents();
        pollCount++;
        
        if (pollCount >= 10) { // Stop after 5 minutes (10 * 30 seconds)
          clearInterval(pollInterval);
          console.log('Stopped polling for new events');
        }
      }, 30000);
      
    } catch (err) {
      console.error('Error fetching RunSignUp past events:', err);
      setError(`Failed to fetch past events: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Add a function to refresh the events list
  const refreshEvents = async () => {
    try {
      console.log('Refreshing events from collection:', 'runsignup_past_events');
      const pastEventsQuery = query(
        collection(db, 'runsignup_past_events'),
        orderBy('date', 'desc')
      );
      
      const pastSnapshot = await getDocs(pastEventsQuery);
      const pastEvents = pastSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setEvents(pastEvents);
      console.log('Events refreshed:', {
        pastEvents: pastEvents.length,
        total: pastEvents.length,
        collection: 'runsignup_past_events'
      });
    } catch (error) {
      console.error('Error refreshing events:', error);
      setError('Failed to refresh events: ' + error.message);
    }
  };

  const handleFetchRunSignUpResults = async () => {
    setResultsLoading(true);
    setError(null);
    setResultsMessage(null);
    
    try {
      console.log('Initiating RunSignUp results fetch...');
      const functionUrl = 'https://us-central1-blister-4781e.cloudfunctions.net/getRunSignUpResultsHttp';
      
      // Get all RunSignUp events
      const eventsSnapshot = await getDocs(
        query(
          collection(db, 'runsignup_past_events'),
          where('source', '==', 'runsignup')
        )
      );

      const events = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`Found ${events.length} RunSignUp events to process`);
      let processedEvents = 0;
      let totalResults = 0;

      // Process each event
      for (const event of events) {
        if (!event.sourceId) {
          console.warn(`Skipping event ${event.id}: No sourceId`);
          continue;
        }

        console.log(`Processing event: ${event.name} (${event.sourceId})`);
        const response = await fetch(`${functionUrl}?raceId=${event.sourceId}`);
        
        if (!response.ok) {
          console.error(`Error fetching results for ${event.name}:`, response.statusText);
          continue;
        }
        
        const data = await response.json();
        console.log(`Results for ${event.name}:`, data);
        
        totalResults += data.totalResults;
        processedEvents++;
        
        // Update UI with progress
        setResultsMessage(`Processing events... ${processedEvents}/${events.length}`);
      }

      setResultsMessage(`Completed! Processed ${totalResults} results from ${processedEvents} events`);
      
    } catch (err) {
      console.error('Error fetching RunSignUp results:', err);
      setError(`Failed to fetch results: ${err.message}`);
    } finally {
      setResultsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sand-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Event Management</h2>
            <div className="flex gap-4">
              <button
                onClick={handleFetchPastEvents}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:bg-green-400"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Fetching Past Races...' : 'Fetch RunSignUp Past Races'}
              </button>
              
              <button
                onClick={handleFetchRunSignUpResults}
                disabled={resultsLoading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:bg-blue-400"
              >
                <Database className={`w-4 h-4 mr-2 ${resultsLoading ? 'animate-spin' : ''}`} />
                {resultsLoading ? 'Fetching Results...' : 'Fetch RunSignUp Results'}
              </button>
            </div>
          </div>
          
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4">Event Scraper</h3>
            <EventScraper />
          </div>
          
          <div className="min-h-screen bg-sand-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl w-full space-y-8 bg-white rounded-2xl shadow-lg p-8">
              <div>
                <h2 className="text-center text-3xl font-bold text-slate-800">
                  Create New Event
                </h2>
                <p className="mt-2 text-center text-sm text-slate-600">
                  Fill in the details below to create a new event
                </p>
              </div>

              {error && (
                <div className="bg-red-50 text-red-500 p-4 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-50 text-green-500 p-4 rounded-lg text-sm">
                  {success}
                </div>
              )}

              {resultsMessage && (
                <div className="bg-blue-50 text-blue-600 p-4 rounded-lg mb-4 whitespace-pre-line">
                  {resultsMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                <div className="space-y-6">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-slate-700">
                      Event Title
                    </label>
                    <input
                      id="title"
                      type="text"
                      name="title"
                      value={eventData.title}
                      onChange={handleChange}
                      className="mt-1 appearance-none rounded-lg relative block w-full px-4 py-3 border border-slate-300 placeholder-slate-500 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="date" className="block text-sm font-medium text-slate-700">
                      Date
                    </label>
                    <input
                      id="date"
                      type="date"
                      name="date"
                      value={eventData.date}
                      onChange={handleChange}
                      className="mt-1 appearance-none rounded-lg relative block w-full px-4 py-3 border border-slate-300 placeholder-slate-500 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="time" className="block text-sm font-medium text-slate-700">
                      Time
                    </label>
                    <input
                      id="time"
                      type="time"
                      name="time"
                      value={eventData.time}
                      onChange={handleChange}
                      className="mt-1 appearance-none rounded-lg relative block w-full px-4 py-3 border border-slate-300 placeholder-slate-500 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="location" className="block text-sm font-medium text-slate-700">
                      Location
                    </label>
                    <input
                      id="location"
                      type="text"
                      name="location"
                      value={eventData.location}
                      onChange={handleLocationChange}
                      placeholder="Enter city or full address"
                      className="mt-1 appearance-none rounded-lg relative block w-full px-4 py-3 border border-slate-300 placeholder-slate-500 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                    {message && (
                      <p className="mt-1 text-sm text-amber-600">
                        {message}
                      </p>
                    )}
                    
                    {/* Manual Coordinates Input */}
                    <div className="mt-4">
                      <p className="text-sm text-slate-500 mb-2">
                        Optional: Manually enter coordinates if known
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="latitude" className="block text-sm font-medium text-slate-700">
                            Latitude
                          </label>
                          <input
                            id="latitude"
                            type="text"
                            name="latitude"
                            value={eventData.latitude}
                            onChange={handleChange}
                            placeholder="e.g., 44.9778"
                            className="mt-1 appearance-none rounded-lg relative block w-full px-4 py-3 border border-slate-300 placeholder-slate-500 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          />
                        </div>
                        <div>
                          <label htmlFor="longitude" className="block text-sm font-medium text-slate-700">
                            Longitude
                          </label>
                          <input
                            id="longitude"
                            type="text"
                            name="longitude"
                            value={eventData.longitude}
                            onChange={handleChange}
                            placeholder="e.g., -93.2650"
                            className="mt-1 appearance-none rounded-lg relative block w-full px-4 py-3 border border-slate-300 placeholder-slate-500 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="type" className="block text-sm font-medium text-slate-700">
                      Event Type
                    </label>
                    <select
                      id="type"
                      name="type"
                      value={eventData.type}
                      onChange={handleChange}
                      className="mt-1 appearance-none rounded-lg relative block w-full px-4 py-3 border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      required
                    >
                      <option value="road">Road</option>
                      <option value="trail">Trail</option>
                      <option value="ultra">Ultra</option>
                      <option value="tri">Triathlon</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Event Distances
                    </label>
                    <div className="mt-1 flex gap-2">
                      <input
                        type="text"
                        value={newDistance}
                        onChange={(e) => setNewDistance(e.target.value)}
                        placeholder="e.g., 5K, 10K, Half Marathon"
                        className="flex-1 appearance-none rounded-lg px-4 py-3 border border-slate-300 placeholder-slate-500 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                      <button
                        onClick={handleAddDistance}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                      >
                        Add
                      </button>
                    </div>
                    {eventData.distances.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {eventData.distances.map((distance, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800"
                          >
                            {distance}
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                handleRemoveDistance(index);
                              }}
                              className="ml-2 text-purple-600 hover:text-purple-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="sourceUrl" className="block text-sm font-medium text-slate-700">
                      Event URL
                    </label>
                    <input
                      id="sourceUrl"
                      type="url"
                      name="sourceUrl"
                      value={eventData.sourceUrl}
                      onChange={handleChange}
                      placeholder="https://example.com/event"
                      className="mt-1 appearance-none rounded-lg relative block w-full px-4 py-3 border border-slate-300 placeholder-slate-500 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="image" className="block text-sm font-medium text-slate-700">
                      Image URL (optional)
                    </label>
                    <input
                      id="image"
                      type="url"
                      name="image"
                      value={eventData.image}
                      onChange={handleChange}
                      className="mt-1 appearance-none rounded-lg relative block w-full px-4 py-3 border border-slate-300 placeholder-slate-500 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => navigate('/events')}
                    className="py-3 px-6 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="py-3 px-6 border border-transparent rounded-lg text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Adding Event...' : 'Add Event'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Events List */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Manage Events</h2>
            <button
              onClick={cleanupPastEvents}
              className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors"
            >
              Clean Up Past Events
            </button>
          </div>
          
          {deleteError && (
            <div className="mb-4 bg-red-50 text-red-500 p-4 rounded-lg text-sm">
              {deleteError}
            </div>
          )}

          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search events by title, location, type, or distance..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>

          {isLoadingEvents ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            </div>
          ) : filteredEvents.length === 0 ? (
            <p className="text-center text-gray-500 py-4">
              {searchQuery ? 'No events found matching your search' : 'No events found'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distance</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(event.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {event.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {typeof event.location === 'string' 
                          ? event.location 
                          : event.location?.address || 'Location not specified'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium
                          ${event.type === 'road' ? 'bg-blue-100 text-blue-800' :
                            event.type === 'trail' ? 'bg-green-100 text-green-800' :
                            event.type === 'ultra' ? 'bg-purple-100 text-purple-800' :
                            'bg-orange-100 text-orange-800'}`}>
                          {event.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {event.distance}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEditClick(event)}
                            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors gap-2"
                            title="Edit event"
                          >
                            <Edit2 className="w-4 h-4" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
                            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors gap-2"
                            title="Delete event"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {isEditing && editingEvent ? (
            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">Edit Event</h3>
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Title</label>
                    <input
                      type="text"
                      value={editingEvent.title}
                      onChange={(e) => setEditingEvent({...editingEvent, title: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date</label>
                    <input
                      type="date"
                      value={editingEvent.date}
                      onChange={(e) => setEditingEvent({...editingEvent, date: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Location</label>
                    <input
                      type="text"
                      value={typeof editingEvent.location === 'string' 
                        ? editingEvent.location 
                        : editingEvent.location?.address || ''}
                      onChange={(e) => setEditingEvent({
                        ...editingEvent, 
                        location: {
                          address: e.target.value,
                          coordinates: editingEvent.location?.coordinates || {}
                        }
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <select
                      value={editingEvent.type}
                      onChange={(e) => setEditingEvent({...editingEvent, type: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    >
                      <option value="road">Road</option>
                      <option value="trail">Trail</option>
                      <option value="ultra">Ultra</option>
                      <option value="tri">Triathlon</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setEditingEvent(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default EventDashboard;
