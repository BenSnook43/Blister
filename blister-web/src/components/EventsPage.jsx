import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Calendar, Clock, MapPin, Tag, Search, Filter, RefreshCw } from 'lucide-react';
import EventMap from './EventMap';
import { getEventImage, fallbackImage } from '../utils/eventImages';
import { getAuth } from 'firebase/auth';

function determineEventType(text, distance = '') {
  const normalized = (text + ' ' + distance).toLowerCase();
  
  // Ultra events (typically 50K or longer)
  if (
    normalized.includes('50k') || 
    normalized.includes('50m') || 
    normalized.includes('100k') || 
    normalized.includes('100m') ||
    normalized.includes('ultra') ||
    /\b[5-9][0-9]k|\b1[0-9][0-9]k/.test(normalized) // Matches 50k-199k
  ) {
    return 'ultra';
  }
  
  // Trail events
  if (
    normalized.includes('trail') || 
    normalized.includes('mountain') ||
    normalized.includes('hills') ||
    normalized.includes('wilderness') ||
    normalized.includes('forest')
  ) {
    return 'trail';
  }
  
  // Track events (must explicitly mention track)
  if (normalized.includes('track')) {
    return 'track';
  }
  
  // Road events (default for standard race distances)
  if (
    normalized.includes('5k') || 
    normalized.includes('10k') ||
    normalized.includes('marathon') ||
    normalized.includes('13.1') ||
    normalized.includes('26.2') ||
    normalized.includes('road') ||
    normalized.includes('street') ||
    normalized.includes('mile') ||
    normalized.includes('run')
  ) {
    return 'road';
  }
  
  // Default to road if no specific type is determined
  return 'road';
}

function EventsPage() {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredEventId, setHoveredEventId] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const eventsContainerRef = useRef(null);
  
  // Filter states
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedType, setSelectedType] = useState('all');
  const [selectedDistance, setSelectedDistance] = useState('all');
  const [isUpdating, setIsUpdating] = useState(false);

  const auth = getAuth();
  const isAdmin = auth.currentUser?.email === import.meta.env.VITE_ADMIN_EMAIL;

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const eventsCollection = collection(db, 'events');
        const eventsSnapshot = await getDocs(eventsCollection);
        const eventsList = eventsSnapshot.docs.map(doc => {
          const data = doc.data();
          console.log('Event data:', { id: doc.id, ...data }); // Debug log to check coordinates
          return {
            id: doc.id,
            ...data,
            // Ensure coordinates are numbers
            latitude: typeof data.latitude === 'string' ? parseFloat(data.latitude) : data.latitude,
            longitude: typeof data.longitude === 'string' ? parseFloat(data.longitude) : data.longitude,
            image: data.image || getEventImage(data.type || 'trail')
          };
        });
        
        // Filter out events with invalid coordinates
        const validEvents = eventsList.filter(event => {
          const hasValidCoords = !isNaN(event.latitude) && 
                               !isNaN(event.longitude) && 
                               event.latitude !== 0 && 
                               event.longitude !== 0;
          if (!hasValidCoords) {
            console.warn('Invalid coordinates for event:', event.title, { lat: event.latitude, lng: event.longitude });
          }
          return hasValidCoords;
        });

        console.log('Fetched events with coordinates:', validEvents.map(e => ({
          title: e.title,
          lat: e.latitude,
          lng: e.longitude
        })));
        
        setEvents(validEvents);
        setFilteredEvents(validEvents);
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    };

    fetchEvents();
  }, []); // Empty dependency array to fetch only on mount

  // Handle event selection from map
  const handleEventClick = (eventId) => {
    setSelectedEventId(eventId);
    // Find the event card and scroll it into view
    const eventCard = document.getElementById(`event-${eventId}`);
    if (eventCard) {
      eventCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Filter events based on search query, type, and distance
  useEffect(() => {
    let filtered = events;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(query) ||
        event.location.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(event => event.type === selectedType);
    }

    // Apply distance filter
    if (selectedDistance !== 'all') {
      switch (selectedDistance) {
        case '5k':
          filtered = filtered.filter(event => 
            event.distance?.toLowerCase().includes('5k') ||
            event.title.toLowerCase().includes('5k')
          );
          break;
        case '10k':
          filtered = filtered.filter(event => 
            event.distance?.toLowerCase().includes('10k') ||
            event.title.toLowerCase().includes('10k')
          );
          break;
        case 'half':
          filtered = filtered.filter(event => 
            event.distance?.toLowerCase().includes('13.1') ||
            event.distance?.toLowerCase().includes('half') ||
            event.title.toLowerCase().includes('half') ||
            event.title.toLowerCase().includes('13.1')
          );
          break;
        case 'marathon':
          filtered = filtered.filter(event => 
            event.distance?.toLowerCase().includes('26.2') ||
            event.distance?.toLowerCase().includes('marathon') ||
            event.title.toLowerCase().includes('marathon') ||
            event.title.toLowerCase().includes('26.2')
          );
          break;
        case 'ultra':
          filtered = filtered.filter(event => {
            const text = (event.distance + ' ' + event.title).toLowerCase();
            return text.includes('50k') || 
                   text.includes('50m') || 
                   text.includes('100k') || 
                   text.includes('100m') ||
                   text.includes('ultra') ||
                   /\b[5-9][0-9]k|\b1[0-9][0-9]k/.test(text);
          });
          break;
      }
    }

    setFilteredEvents(filtered);
  }, [searchQuery, events, selectedType, selectedDistance]);

  const clearFilters = () => {
    setDateRange({ start: '', end: '' });
    setSelectedType('all');
    setSelectedDistance('all');
    setSearchQuery('');
  };

  const updateEventTypes = async () => {
    setIsUpdating(true);
    try {
      const eventsCollection = collection(db, 'events');
      const eventsSnapshot = await getDocs(eventsCollection);
      
      const updatePromises = eventsSnapshot.docs.map(async (docRef) => {
        const eventData = docRef.data();
        const newType = determineEventType(eventData.title, eventData.distance);
        
        if (newType !== eventData.type) {
          await updateDoc(doc(db, 'events', docRef.id), {
            type: newType
          });
          return true;
        }
        return false;
      });
      
      const results = await Promise.all(updatePromises);
      const updatedCount = results.filter(Boolean).length;
      
      // Refresh the events list
      const updatedSnapshot = await getDocs(eventsCollection);
      const updatedList = updatedSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        image: doc.data().image || getEventImage(doc.data().type || 'trail')
      }));
      
      setEvents(updatedList);
      setFilteredEvents(updatedList);
      
      alert(`Updated ${updatedCount} events with new types!`);
    } catch (error) {
      console.error('Error updating event types:', error);
      alert('Error updating event types. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-sand-50">
      <div className="container mx-auto px-6 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800">Events</h1>
          {isAdmin && (
            <button
              onClick={updateEventTypes}
              disabled={isUpdating}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
              {isUpdating ? 'Updating Types...' : 'Update Event Types'}
            </button>
          )}
        </div>
        
        {/* Filter Controls */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-700 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by location or title..."
                  className="pl-10 w-full rounded-lg border-slate-200 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full rounded-lg border-slate-200 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full rounded-lg border-slate-200 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-700 mb-1">Event Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full rounded-lg border-slate-200 focus:ring-purple-500 focus:border-purple-500 capitalize"
              >
                {['all', 'trail', 'road', 'ultra', 'track'].map(type => (
                  <option key={type} value={type} className="capitalize">
                    {type === 'all' ? 'All Types' : type}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-700 mb-1">Distance</label>
              <select
                value={selectedDistance}
                onChange={(e) => setSelectedDistance(e.target.value)}
                className="w-full rounded-lg border-slate-200 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="all">All Distances</option>
                <option value="5k">5K</option>
                <option value="10k">10K</option>
                <option value="half">Half Marathon</option>
                <option value="marathon">Marathon</option>
                <option value="ultra">Ultra</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Map and Events Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Events List */}
          <div 
            ref={eventsContainerRef}
            className="space-y-6 min-h-[600px]"
          >
            {filteredEvents.map(event => (
              <div
                key={event.id}
                id={`event-${event.id}`}
                className={`bg-white rounded-xl shadow-md overflow-hidden transition-all duration-200 cursor-pointer ${
                  selectedEventId === event.id
                    ? 'ring-2 ring-purple-500 transform scale-[1.02]'
                    : 'hover:shadow-lg'
                }`}
                onClick={() => handleEventClick(event.id)}
              >
                <div className="relative h-48">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.log(`Image failed to load: ${e.target.src}`);
                      e.target.src = fallbackImage;
                      e.target.onerror = null;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-slate-800 mb-4">
                    {event.title}
                  </h3>
                  <div className="space-y-3 text-sm text-slate-600">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-purple-600" />
                      {event.date || event.time}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2 text-purple-600" />
                      {event.location}
                    </div>
                    <div className="flex items-center">
                      <Tag className="w-4 h-4 mr-2 text-purple-600" />
                      <span className="capitalize">{event.type} {event.distance && `- ${event.distance}`}</span>
                    </div>
                    {event.description && (
                      <p className="mt-2 text-sm text-slate-500 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                    {event.sourceUrl && (
                      <a 
                        href={event.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-purple-600 hover:text-purple-800 text-sm"
                      >
                        View Event →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Map Section */}
          <div className="lg:sticky lg:top-6 h-[600px]">
            <EventMap 
              events={filteredEvents}
              hoveredEventId={selectedEventId}
              onEventClick={handleEventClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventsPage;
