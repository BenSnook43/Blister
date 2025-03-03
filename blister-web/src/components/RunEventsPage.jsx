import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, where, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Calendar, Clock, MapPin, Tag, Search, Filter, Plus, Check } from 'lucide-react';
import EventMap from './EventMap';
import { getEventImage } from '../utils/eventImages';
import { Link } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
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

function RunEventsPage() {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredEventId, setHoveredEventId] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'
  const eventsContainerRef = useRef(null);
  const { currentUser } = useAuth();
  const [userEventStatuses, setUserEventStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedType, setSelectedType] = useState('all');
  const [selectedDistance, setSelectedDistance] = useState('all');

  const mapRef = useRef(null);
  const [upcomingEventIds, setUpcomingEventIds] = useState(new Set());

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
            
            // Handle location display
            let locationAddress = 'Location not specified';
            if (typeof data.location === 'string') {
              locationAddress = data.location;
            } else if (data.location?.address) {
              locationAddress = data.location.address;
            } else if (data.venue) {
              locationAddress = `${data.venue}${data.city ? `, ${data.city}` : ''}, ${data.state || 'CA'}`;
            }

            // Normalize the event type
            let eventType = 'road'; // default to road
            if (data.runType && ['trail', 'road', 'ultra', 'track'].includes(data.runType.toLowerCase())) {
              eventType = data.runType.toLowerCase();
            } else if (data.type && ['trail', 'road', 'ultra', 'track'].includes(data.type.toLowerCase())) {
              eventType = data.type.toLowerCase();
            }
            
            const eventImage = getEventImage(eventType);
            console.log('Event data:', {
              id: doc.id,
              type: data.type,
              runType: data.runType,
              resolvedType: eventType,
              image: eventImage
            });
            return {
              id: doc.id,
              ...data,
              location: {
                ...data.location,
                address: locationAddress
              },
              latitude: coordinates.latitude || data.latitude,
              longitude: coordinates.longitude || data.longitude,
              type: eventType,
              image: data.image || eventImage
            };
          })
          // Filter for valid events
          .filter(event => {
            const isValidType = ['trail', 'road', 'ultra', 'track'].includes(event.type);
            if (!isValidType) {
              console.log('Filtered out event:', {
                id: event.id,
                type: event.type,
                runType: event.runType
              });
            }
            return isValidType;
          });
        
        const validEvents = eventsList.filter(event => {
          const hasValidCoords = !isNaN(event.latitude) && 
                               !isNaN(event.longitude) && 
                               event.latitude !== 0 && 
                               event.longitude !== 0;
          if (!hasValidCoords) {
            console.log('Filtered out event with invalid coordinates:', event);
          }
          return hasValidCoords;
        });
        
        // Sort events by date initially
        const sortedEvents = sortEvents(validEvents, sortOrder);
        console.log('Final events list:', sortedEvents);
        setEvents(sortedEvents);
        setFilteredEvents(sortedEvents);

        // Fetch user event statuses if logged in
        if (currentUser) {
          const userEventsRef = collection(db, 'userEvents');
          const userEventsQuery = query(
            userEventsRef,
            where('userId', '==', currentUser.uid)
          );
          const userEventsSnapshot = await getDocs(userEventsQuery);
          const statuses = {};
          userEventsSnapshot.forEach(doc => {
            const data = doc.data();
            statuses[data.eventId] = data.status;
          });
          setUserEventStatuses(statuses);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching events:', error);
        setLoading(false);
      }
    };

    fetchEvents();
  }, [sortOrder, currentUser]);

  const handleToggleInterest = async (event) => {
    if (!currentUser) {
      // Handle not logged in state
      return;
    }

    try {
      const userEventRef = collection(db, 'userEvents');
      const currentStatus = userEventStatuses[event.id];
      let newStatus;

      if (!currentStatus) {
        newStatus = 'interested';
      } else if (currentStatus === 'interested') {
        newStatus = 'going';
      } else {
        newStatus = null;
      }

      // Update in Firestore
      if (newStatus) {
        await setDoc(doc(userEventRef), {
          userId: currentUser.uid,
          eventId: event.id,
          status: newStatus,
          updatedAt: new Date()
        });
      } else {
        // Remove the status
        const q = query(
          userEventRef,
          where('userId', '==', currentUser.uid),
          where('eventId', '==', event.id)
        );
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(async (doc) => {
          await deleteDoc(doc.ref);
        });
      }

      // Update local state
      setUserEventStatuses(prev => ({
        ...prev,
        [event.id]: newStatus
      }));
    } catch (error) {
      console.error('Error updating event status:', error);
    }
  };

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
          
          ${selectedEvent.distance ? `
            <span class="px-2 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
              ${selectedEvent.distance}
            </span>
          ` : ''}
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

  // Filter events based on search query, type, and distance
  useEffect(() => {
    let filtered = events;

    if (searchTerm?.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(event => 
        (event.title || '').toLowerCase().includes(query) ||
        (event.location?.address || '').toLowerCase().includes(query) ||
        (event.description || '').toLowerCase().includes(query)
      );
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter(event => {
        // Handle both old and new format
        if (event.type === 'run') {
          return event.runType === selectedType;
        }
        return event.type === selectedType;
      });
    }

    if (selectedDistance !== 'all') {
      filtered = filtered.filter(event => {
        // Check both distances array and title for distance information
        const distanceText = [
          ...(event.distances || []).join(' ').toLowerCase(),
          event.title.toLowerCase(),
          event.distance ? event.distance.toLowerCase() : ''
        ].join(' ');

        switch (selectedDistance) {
          case '5k':
            return distanceText.includes('5k');
          case '10k':
            return distanceText.includes('10k');
          case 'half':
            return distanceText.includes('13.1') || distanceText.includes('half');
          case 'marathon':
            return distanceText.includes('26.2') || distanceText.includes('marathon');
          case 'ultra':
            return distanceText.includes('50k') || 
                   distanceText.includes('50m') || 
                   distanceText.includes('100k') || 
                   distanceText.includes('100m') ||
                   distanceText.includes('ultra');
          default:
            return true;
        }
      });
    }

    setFilteredEvents(filtered);
  }, [searchTerm, events, selectedType, selectedDistance]);

  const clearFilters = () => {
    setDateRange({ start: '', end: '' });
    setSelectedType('all');
    setSelectedDistance('all');
    setSearchTerm('');
  };

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

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-sand-50">
      <Helmet>
        <title>Running Events | Blister</title>
        <meta name="description" content="Find and track running events across road, trail, and ultra distances." />
      </Helmet>
      
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-slate-800 mb-4 sm:mb-0">Running Events</h1>
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
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-4">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 sm:px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm sm:text-base"
              >
                <option value="all">All Types</option>
                <option value="road">Road</option>
                <option value="trail">Trail</option>
                <option value="ultra">Ultra</option>
                <option value="track">Track</option>
              </select>

              <select
                value={selectedDistance}
                onChange={(e) => setSelectedDistance(e.target.value)}
                className="px-3 sm:px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm sm:text-base"
              >
                <option value="all">All Distances</option>
                <option value="5k">5K</option>
                <option value="10k">10K</option>
                <option value="half">Half Marathon</option>
                <option value="marathon">Marathon</option>
                <option value="ultra">Ultra</option>
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
                          src={event.image || getEventImage(event.runType || event.type || 'road')}
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
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {event.type}
                        </span>
                        {event.distance && (
                          <span className="px-2 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
                            {event.distance}
                          </span>
                        )}
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

          {/* Map - Hide on mobile, show as modal or bottom sheet */}
          <div className="hidden lg:block sticky top-6 h-[calc(100vh-8rem)] max-h-[700px] rounded-xl overflow-hidden">
            <EventMap
              events={filteredEvents}
              onLoad={handleMapLoad}
              hoveredEventId={hoveredEventId}
              selectedEventId={selectedEventId}
              onEventClick={handleEventClick}
            />
          </div>

          {/* Mobile Map Toggle Button */}
          <div className="fixed bottom-6 right-6 lg:hidden">
            <button
              onClick={() => {/* TODO: Implement mobile map view */}}
              className="bg-purple-600 text-white p-4 rounded-full shadow-lg hover:bg-purple-700 transition-colors"
            >
              <MapPin className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RunEventsPage; 