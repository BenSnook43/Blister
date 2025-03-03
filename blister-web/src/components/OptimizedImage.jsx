import React, { useState } from 'react';
import { getOptimizedImageUrl, getPlaceholderUrl, getSrcSet, getSizes } from '../utils/imageUtils';

const OptimizedImage = ({ 
  src, 
  alt, 
  className = '', 
  width, 
  height,
  priority = false,
  placeholder = 'blur',
  onLoad,
  onError,
  sizes
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // Get optimized image URLs
  const optimizedSrc = getOptimizedImageUrl(src);
  const placeholderUrl = getPlaceholderUrl(src);
  const srcSet = getSrcSet(src);
  const sizesAttr = sizes || getSizes(className);

  const handleLoad = (e) => {
    setIsLoading(false);
    if (onLoad) onLoad(e);
  };

  const handleError = (e) => {
    setError(true);
    setIsLoading(false);
    if (onError) onError(e);
  };

  return (
    <div className={`relative ${className}`} style={{ aspectRatio: width && height ? `${width}/${height}` : 'auto' }}>
      {/* Placeholder */}
      {placeholder === 'blur' && isLoading && !error && (
        <div 
          className="absolute inset-0 bg-cover bg-center blur-lg"
          style={{ 
            backgroundImage: placeholderUrl ? `url(${placeholderUrl})` : undefined,
            backgroundColor: !placeholderUrl ? '#f3f4f6' : undefined,
            opacity: 0.5
          }}
        />
      )}

      {/* Main image */}
      <img
        src={optimizedSrc || src}
        srcSet={srcSet}
        sizes={sizesAttr}
        alt={alt}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        loading={priority ? 'eager' : 'lazy'}
        onLoad={handleLoad}
        onError={handleError}
        width={width}
        height={height}
        decoding="async"
      />

      {/* Loading spinner */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
          <span className="text-slate-500">Failed to load image</span>
        </div>
      )}
    </div>
  );
};

export default OptimizedImage; 
