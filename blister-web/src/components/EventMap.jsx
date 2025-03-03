import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set your access token here
mapboxgl.accessToken = 'pk.eyJ1IjoiYmVuc25vb2sxIiwiYSI6ImNtNjY1YzFvZjIzZnAycG9kZXdueDRncmwifQ.qE9qP7n6my4joZwA_XS6tw';

// Bay Area bounds for initial view
const BAY_AREA_BOUNDS = {
  north: 38.5,  // Santa Rosa
  south: 36.9,  // Santa Cruz
  west: -123.0, // Pacific Ocean
  east: -121.5  // Livermore
};

const DEFAULT_CENTER = [-122.4194, 37.7749]; // San Francisco
const DEFAULT_ZOOM = 8;
const MIN_ZOOM = 6;
const MAX_ZOOM = 15;

// Add custom CSS for markers and popups
const customStyles = `
  .mapboxgl-popup-content {
    padding: 0;
    border-radius: 0.75rem;
  }
  .mapboxgl-popup-close-button {
    padding: 4px 8px;
    right: 4px;
    top: 4px;
    color: #4B5563;
    font-size: 16px;
    border-radius: 9999px;
    transition: all 0.2s;
    background: none;
    border: none;
    cursor: pointer;
  }
  .mapboxgl-popup-close-button:hover {
    background-color: #F3F4F6;
    color: #1F2937;
  }
  .mapboxgl-popup-close-button:focus {
    outline: 2px solid #9333EA;
    outline-offset: 2px;
  }
  .map-marker {
    width: 20px;
    height: 20px;
    position: relative;
    cursor: pointer;
  }
  .map-marker::after {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    width: 20px;
    height: 20px;
    background: #9333EA;
    border: 2px solid white;
    border-radius: 50% 50% 50% 0;
    transform: translateX(-50%) rotate(-45deg);
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
  .map-marker:hover::after {
    background: #7E22CE;
  }
  .map-marker.active::after {
    background: #7E22CE;
    transform: translateX(-50%) rotate(-45deg) scale(1.1);
  }
`;

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

function getOrdinalSuffix(day) {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

function EventMap({ events, hoveredEventId, selectedEventId, onEventClick, onMapLoad }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const popupRef = useRef(null);
  const eventsRef = useRef(events);
  const clickPopupRef = useRef(null);

  // Initialize map once
  useEffect(() => {
    if (!map.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        pitchWithRotate: false,
        dragRotate: false
      });

      map.current.on('load', () => {
        setMapLoaded(true);
        if (onMapLoad) {
          onMapLoad(map.current);
        }

        // Add custom styles to document head
        const styleSheet = document.createElement('style');
        styleSheet.textContent = customStyles;
        document.head.appendChild(styleSheet);

        // Add controls
        map.current.addControl(new mapboxgl.NavigationControl({
          showCompass: false
        }));
        map.current.addControl(new mapboxgl.FullscreenControl());

        // Add source for event points with initial data
        map.current.addSource('events', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        });

        // Add circle layer for event points
        map.current.addLayer({
          id: 'event-points',
          type: 'circle',
          source: 'events',
          paint: {
            'circle-radius': 8,
            'circle-color': '#9333EA',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        });

        // Add hover effect
        map.current.addLayer({
          id: 'event-points-hover',
          type: 'circle',
          source: 'events',
          paint: {
            'circle-radius': 9,
            'circle-color': '#7E22CE',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          },
          filter: ['==', ['get', 'id'], '']
        });

        // Change cursor to pointer when hovering over a point
        map.current.on('mouseenter', 'event-points', () => {
          map.current.getCanvas().style.cursor = 'pointer';
        });

        map.current.on('mouseleave', 'event-points', () => {
          map.current.getCanvas().style.cursor = '';
        });

        // Handle click events on points
        map.current.on('click', 'event-points', (e) => {
          if (e.features.length > 0) {
            const clickedEventId = e.features[0].properties.id;
            
            // Call onEventClick to update selected state
            if (onEventClick) {
              onEventClick(clickedEventId);
            }

            // Scroll the event card into view
            const eventCard = document.getElementById(`event-${clickedEventId}`);
            if (eventCard) {
              eventCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            // Remove any existing click popup
            if (clickPopupRef.current) {
              clickPopupRef.current.remove();
            }

            // Show popup
            const event = e.features[0].properties;
            const coordinates = e.features[0].geometry.coordinates.slice();

            clickPopupRef.current = new mapboxgl.Popup({
              closeButton: true,
              closeOnClick: false,
              maxWidth: '300px',
              offset: [0, -10]
            })
              .setLngLat(coordinates)
              .setHTML(`
                <div class="p-4 cursor-pointer" onclick="document.getElementById('event-${event.id}')?.scrollIntoView({behavior: 'smooth', block: 'center'})">
                  <h3 class="font-bold text-lg mb-2">${event.title}</h3>
                  <div class="flex items-center gap-2 mb-2">
                    <span class="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      ${event.type === 'tri' ? 'Triathlon' : event.type}
                    </span>
                    ${event.distances ? JSON.parse(event.distances).map(distance => `
                      <span class="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        ${distance}
                      </span>
                    `).join('') : ''}
                    ${event.distance ? `
                      <span class="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        ${event.distance}
                      </span>
                    ` : ''}
                  </div>
                  <p class="text-sm text-gray-600 mb-1">${formatDate(event.date)}</p>
                  <p class="text-sm text-gray-600">${event.location || ''}</p>
                </div>
              `)
              .addTo(map.current);

            // Pan to the selected event
            map.current.panTo([
              coordinates[0],
              coordinates[1]
            ], {
              duration: 800,
              essential: true,
              easing: (t) => t * (2 - t)
            });
          }
        });

        // Handle hover state
        map.current.on('mousemove', 'event-points', (e) => {
          if (e.features.length > 0) {
            map.current.setFilter('event-points-hover', [
              '==',
              ['get', 'id'],
              e.features[0].properties.id
            ]);
          }
        });

        map.current.on('mouseleave', 'event-points', () => {
          map.current.setFilter('event-points-hover', ['==', ['get', 'id'], '']);
        });

        // Set initial bounds
        map.current.fitBounds([
          [BAY_AREA_BOUNDS.west, BAY_AREA_BOUNDS.south],
          [BAY_AREA_BOUNDS.east, BAY_AREA_BOUNDS.north]
        ], {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          duration: 0
        });
      });
    }
  }, [onMapLoad]);

  // Update event points when events change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const features = events
      .map(event => {
        const lat = event.location?.coordinates?.latitude || event.latitude;
        const lng = event.location?.coordinates?.longitude || event.longitude;

        // Only validate that coordinates are valid numbers
        const isValidLat = !isNaN(lat);
        const isValidLng = !isNaN(lng);

        if (!isValidLat || !isValidLng) return null;

        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          properties: {
            id: event.id,
            title: event.title,
            location: event.location?.address || event.location,
            date: event.date,
            type: event.type,
            distance: event.distance,
            distances: event.distances
          }
        };
      })
      .filter(Boolean);

    const source = map.current.getSource('events');
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features
      });
    }
  }, [events, mapLoaded]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (popupRef.current) {
        popupRef.current.remove();
      }
      if (clickPopupRef.current) {
        clickPopupRef.current.remove();
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Handle showing popup for selected event
  useEffect(() => {
    if (!map.current || !mapLoaded || !selectedEventId) {
      if (popupRef.current) {
        popupRef.current.remove();
      }
      return;
    }

    const event = eventsRef.current.find(e => e.id === selectedEventId);
    if (!event) return;

    // Remove existing popup
    if (popupRef.current) {
      popupRef.current.remove();
    }

    // Create new popup
    popupRef.current = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: '300px',
      offset: [0, -10]
    })
      .setLngLat([
        event.location?.coordinates?.longitude || event.longitude,
        event.location?.coordinates?.latitude || event.latitude
      ])
      .setHTML(`
        <div class="p-4 cursor-pointer" onclick="document.getElementById('event-${event.id}')?.scrollIntoView({behavior: 'smooth', block: 'center'})">
          <h3 class="font-bold text-lg mb-2">${event.title}</h3>
          <div class="flex items-center gap-2 mb-2">
            <span class="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              ${event.type === 'tri' ? 'Triathlon' : event.type}
            </span>
            ${event.distances ? event.distances.map(distance => `
              <span class="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                ${distance}
              </span>
            `).join('') : ''}
            ${event.distance ? `
              <span class="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                ${event.distance}
              </span>
            ` : ''}
          </div>
          <p class="text-sm text-gray-600 mb-1">${formatDate(event.date)}</p>
          <p class="text-sm text-gray-600">${event.location?.address || event.location || ''}</p>
        </div>
      `)
      .addTo(map.current);

    // Pan to the selected event
    map.current.panTo([
      event.location?.coordinates?.longitude || event.longitude,
      event.location?.coordinates?.latitude || event.latitude
    ], {
      duration: 1500,
      essential: true,
      easing: (t) => t * (2 - t)
    });
  }, [selectedEventId, mapLoaded]);

  return (
    <div 
      ref={mapContainer} 
      className="w-full h-full rounded-xl overflow-hidden shadow-lg"
      style={{ minHeight: '500px' }}
    />
  );
}

export default EventMap; 