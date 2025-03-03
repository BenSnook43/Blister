import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Heart, Check } from 'lucide-react';
import { getEventImage } from '../utils/eventImages';
import OptimizedImage from './OptimizedImage';

function EventCard({ event, onToggleInterest, userEventStatus }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Determine the route based on event type
  const getEventRoute = (type) => {
    // Map 'tri' to 'triathlon' for image lookup
    const imageType = type === 'tri' ? 'triathlon' : type;
    return type === 'tri' ? '/tri' : '/run';
  };

  // Get the correct image type for the event
  const getEventImageType = (type) => {
    return type === 'tri' ? 'triathlon' : type;
  };

  return (
    <div className="relative h-[275px] rounded-2xl shadow-lg overflow-hidden hover:scale-102 transition-transform duration-300">
      <Link to={getEventRoute(event.type)} className="block h-full">
        {/* Image */}
        <div className="absolute inset-0">
          <OptimizedImage
            src={event.imageUrl || getEventImage(getEventImageType(event.type))}
            alt={event.title}
            className="h-full w-full object-cover"
            width={800}
            height={600}
            onError={(e) => {
              setImageError(true);
              e.target.src = getEventImage(getEventImageType(event.type));
            }}
          />
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        </div>

        {/* Content overlay */}
        <div className="absolute inset-0 p-6 flex flex-col justify-end text-white">
          <h3 className="text-xl font-bold mb-2">{event.title}</h3>
          <div className="flex flex-col space-y-2 text-sm text-white/90">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>{new Date(event.date).toLocaleDateString()}</span>
            </div>
            {event.location && (
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="line-clamp-1">{event.location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Interest button */}
        {onToggleInterest && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onToggleInterest(event);
            }}
            className={`absolute top-4 right-4 p-2 rounded-full backdrop-blur-sm transition-colors ${
              userEventStatus === 'going'
                ? 'bg-green-500 text-white'
                : userEventStatus === 'interested'
                ? 'bg-purple-500 text-white'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {userEventStatus === 'going' ? (
              <Check className="w-5 h-5" />
            ) : (
              <Heart className={`w-5 h-5 ${userEventStatus === 'interested' ? 'fill-current' : ''}`} />
            )}
          </button>
        )}
      </Link>
    </div>
  );
}

export default EventCard; 