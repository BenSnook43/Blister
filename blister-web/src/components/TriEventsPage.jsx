import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Calendar, Clock, MapPin, Tag, Search, Filter, Plus, Check } from 'lucide-react';
import EventMap from './EventMap';
import { getEventImage } from '../utils/eventImages';
import { getAuth } from 'firebase/auth';
import { Link } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import { Helmet } from 'react-helmet-async';
import { addUpcomingEvent, removeUpcomingEvent, isEventUpcoming } from '../utils/eventUtils';

function formatDate(dateString) {
  const date = new Date(dateString);
  const options = { 
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  };
  
  // Get the day number for ordinal suffix
  const day = date.getDate();
  const ordinalSuffix = getOrdinalSuffix(day);
  
  // Format the date and replace the day number with one including the ordinal suffix
  const formattedDate = date.toLocaleDateString('en-US', options);
  return formattedDate.replace(day, `${day}${ordinalSuffix}`);
}

// Helper function to get ordinal suffix (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(day) {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

function TriEventsPage() {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredEventId, setHoveredEventId] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'
  const eventsContainerRef = useRef(null);
  
  // Filter states
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedDistance, setSelectedDistance] = useState('all');
  const [upcomingEventIds, setUpcomingEventIds] = useState(new Set());
  const currentUser = getAuth().currentUser;

  const auth = getAuth();
  const isAdmin = auth.currentUser?.email === import.meta.env.VITE_ADMIN_EMAIL;

  const mapRef = useRef(null);

  // Sort events by date
  const sortEvents = (eventsToSort, order) => {
    return [...eventsToSort].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return order === 'asc' ? dateA - dateB : dateB - dateA;
    });
  };

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const eventsCollection = collection(db, 'events');
        const eventsSnapshot = await getDocs(eventsCollection);
        const eventsList = eventsSnapshot.docs
          .map(doc => {
            const data = doc.data();
            // Handle nested coordinates structure
            const coordinates = data.location?.coordinates || {};
            return {
              id: doc.id,
              ...data,
              latitude: coordinates.latitude || data.latitude,
              longitude: coordinates.longitude || data.longitude,
              image: data.image || getEventImage('triathlon')
            };
          })
          .filter(event => event.type === 'tri');
        
        const validEvents = eventsList.filter(event => {
          const hasValidCoords = !isNaN(event.latitude) && 
                               !isNaN(event.longitude) && 
                               event.latitude !== 0 && 
                               event.longitude !== 0;
          return hasValidCoords;
        });
        
        // Sort events by date initially
        const sortedEvents = sortEvents(validEvents, sortOrder);
        setEvents(sortedEvents);
        setFilteredEvents(sortedEvents);
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    };

    fetchEvents();
  }, [sortOrder]);

  useEffect(() => {
    const loadUpcomingStatus = async () => {
      if (!currentUser) return;
      
      try {
        const upcomingEvents = await Promise.all(
          events.map(event => isEventUpcoming(currentUser.uid, event.id))
        );
        const upcomingIds = new Set(
          events
            .filter((_, index) => upcomingEvents[index])
            .map(event => event.id)
        );
        setUpcomingEventIds(upcomingIds);
      } catch (error) {
        console.error('Error loading upcoming events:', error);
      }
    };

    loadUpcomingStatus();
  }, [events, currentUser]);

  const handleMapLoad = (mapInstance) => {
    mapRef.current = mapInstance;
  };

  const handleEventClick = (eventId) => {
    setSelectedEventId(eventId);
    
    // Find the event
    const selectedEvent = filteredEvents.find(e => e.id === eventId);
    if (!selectedEvent || !mapRef.current) return;

    // Remove existing popups
    const popups = document.getElementsByClassName('mapboxgl-popup');
    Array.from(popups).forEach(popup => popup.remove());

    // Format the date for the popup
    const formattedDate = formatDate(selectedEvent.date);

    // Create new popup
    new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: true,
      maxWidth: '300px',
      offset: [0, -10]
    })
      .setLngLat([selectedEvent.longitude, selectedEvent.latitude])
      .setHTML(`
        <div class="p-4">
          <h3 class="font-bold text-lg mb-2">${selectedEvent.title}</h3>
          <div class="flex items-center gap-2 mb-2">
            <span class="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Triathlon
            </span>
            ${selectedEvent.distances && selectedEvent.distances.map((distance, index) => `
              <span class="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                ${distance}
              </span>
            `).join('')}
          </div>
          <div class="flex items-center text-sm text-slate-500 mb-2">
            <span>${formattedDate}</span>
          </div>
          <div class="flex items-center text-sm text-slate-500">
            <span>${selectedEvent.location?.address || 'Location not specified'}</span>
          </div>
        </div>
      `)
      .addTo(mapRef.current);

    // Pan to the event location
    mapRef.current.flyTo({
      center: [selectedEvent.longitude, selectedEvent.latitude],
      zoom: 9,
      duration: 1000,
      essential: true
    });

    // Find and scroll to the corresponding event card
    const eventCard = document.getElementById(`event-${eventId}`);
    if (eventCard) {
      eventCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Remove the hover effect on event cards that was triggering map updates
  const handleMouseEnter = () => {};
  const handleMouseLeave = () => {};

  // Filter events based on search query and distance
  useEffect(() => {
    let filtered = events;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(query) ||
        event.location?.address.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query)
      );
    }

    if (selectedDistance !== 'all') {
      switch (selectedDistance) {
        case 'sprint':
          filtered = filtered.filter(event => 
            event.distances?.some(d => d.toLowerCase().includes('sprint')) ||
            event.title.toLowerCase().includes('sprint')
          );
          break;
        case 'olympic':
          filtered = filtered.filter(event => 
            event.distances?.some(d => d.toLowerCase().includes('olympic')) ||
            event.title.toLowerCase().includes('olympic')
          );
          break;
        case '70.3':
          filtered = filtered.filter(event => 
            event.distances?.some(d => d.toLowerCase().includes('70.3')) ||
            event.distances?.some(d => d.toLowerCase().includes('half')) ||
            event.title.toLowerCase().includes('70.3') ||
            event.title.toLowerCase().includes('half')
          );
          break;
        case '140.6':
          filtered = filtered.filter(event => 
            event.distances?.some(d => d.toLowerCase().includes('140.6')) ||
            event.distances?.some(d => d.toLowerCase().includes('full')) ||
            event.title.toLowerCase().includes('140.6') ||
            event.title.toLowerCase().includes('ironman')
          );
          break;
      }
    }

    setFilteredEvents(filtered);
  }, [searchQuery, events, selectedDistance]);

  const clearFilters = () => {
    setDateRange({ start: '', end: '' });
    setSelectedDistance('all');
    setSearchQuery('');
  };

  // Add this function to handle upcoming event toggle
  const handleUpcomingToggle = async (event) => {
    if (!currentUser) return;

    try {
      const isUpcoming = await isEventUpcoming(currentUser.uid, event.id);
      if (isUpcoming) {
        await removeUpcomingEvent(currentUser.uid, event.id);
        setUpcomingEventIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(event.id);
          return newSet;
        });
      } else {
        await addUpcomingEvent(currentUser.uid, event);
        setUpcomingEventIds(prev => new Set([...prev, event.id]));
      }
    } catch (error) {
      console.error('Error toggling upcoming event:', error);
    }
  };

  return (
    <div className="min-h-screen bg-sand-50">
      <Helmet>
        <title>Triathlon Events | Blister</title>
        <meta name="description" content="Discover and join triathlon events in the Bay Area. From sprint to Ironman distances, find your next triathlon race and connect with the local triathlon community." />
        <meta property="og:title" content="Triathlon Events | Blister" />
        <meta property="og:description" content="Discover and join triathlon events in the Bay Area. From sprint to Ironman distances, find your next triathlon race and connect with the local triathlon community." />
      </Helmet>
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-slate-800 mb-4 sm:mb-0">Triathlon Events</h1>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-4">
              <select
                value={selectedDistance}
                onChange={(e) => setSelectedDistance(e.target.value)}
                className="px-3 sm:px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm sm:text-base"
              >
                <option value="all">All Distances</option>
                <option value="sprint">Sprint</option>
                <option value="olympic">Olympic</option>
                <option value="70.3">70.3</option>
                <option value="140.6">140.6</option>
              </select>

              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="px-3 sm:px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm sm:text-base"
              >
                <option value="asc">Soonest First</option>
                <option value="desc">Latest First</option>
              </select>

              <button
                onClick={clearFilters}
                className="flex items-center justify-center px-3 sm:px-4 py-2 text-slate-600 hover:text-purple-600 transition-colors border border-slate-200 rounded-lg text-sm sm:text-base"
              >
                <Filter className="w-4 h-4 mr-2" />
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Events Grid and Map */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Events List */}
          <div 
            ref={eventsContainerRef}
            className="space-y-4 sm:space-y-6 max-h-[600px] sm:max-h-[800px] overflow-y-auto pr-2 sm:pr-4"
          >
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                id={`event-${event.id}`}
                onClick={() => handleEventClick(event.id)}
                className={`cursor-pointer transition-all duration-200 ${
                  selectedEventId === event.id ? 'ring-2 ring-purple-500 ring-opacity-50 rounded-xl' : ''
                }`}
              >
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="flex flex-col sm:flex-row">
                    {/* Image Section */}
                    <div className="relative w-48 h-48 flex-shrink-0">
                      <div className="w-full h-full">
                        <img
                          src={event.image || getEventImage('triathlon')}
                          alt={event.title}
                          className="absolute w-full h-full object-cover object-center"
                        />
                        {/* Date Overlay */}
                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg p-2 text-center min-w-[60px] z-10">
                          <div className="text-sm font-semibold text-purple-600">
                            {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
                          </div>
                          <div className="text-xl font-bold text-slate-800">
                            {new Date(event.date).getDate()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="relative flex-1 p-4">
                      {currentUser && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpcomingToggle(event);
                          }}
                          className={`absolute top-2 right-2 z-10 p-2 rounded-full transition-colors ${
                            upcomingEventIds.has(event.id)
                              ? 'bg-purple-100 text-purple-600'
                              : 'bg-white/90 text-slate-600 hover:bg-purple-50 hover:text-purple-600'
                          }`}
                          title={upcomingEventIds.has(event.id) ? "Remove from upcoming" : "Add to upcoming"}
                        >
                          {upcomingEventIds.has(event.id) ? (
                            <Check className="w-5 h-5" />
                          ) : (
                            <Plus className="w-5 h-5" />
                          )}
                        </button>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        {event.distances && event.distances.map((distance, index) => (
                          <span 
                            key={index} 
                            className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                          >
                            {distance}
                          </span>
                        ))}
                      </div>
                      <h3 className="text-lg font-semibold text-slate-800 mb-2">{event.title}</h3>
                      <div className="flex items-center text-sm text-slate-500 mb-2">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>{formatDate(event.date)}</span>
                      </div>
                      <div className="flex items-center text-sm text-slate-500">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span>{event.location?.address || 'Location not specified'}</span>
                      </div>
                      {event.sourceUrl ? (
                        <a
                          href={event.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-4 text-sm text-purple-600 hover:text-purple-800 font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Learn More →
                        </a>
                      ) : (
                        <Link
                          to={`/event/${event.id}`}
                          className="inline-block mt-4 text-sm text-purple-600 hover:text-purple-800 font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Learn More →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Map */}
          <div className="sticky top-24 h-[calc(100vh-6rem)]">
            <EventMap
              events={filteredEvents}
              hoveredEventId={hoveredEventId}
              selectedEventId={selectedEventId}
              onEventClick={handleEventClick}
              onMapLoad={handleMapLoad}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default TriEventsPage; 