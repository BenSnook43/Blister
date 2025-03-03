import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

// Generate a unique filename with timestamp
const generateImageFileName = (originalName) => {
  const timestamp = Date.now();
  const extension = originalName.split('.').pop();
  return `${timestamp}.${extension}`;
};

// Upload image to Firebase Storage with optimization
export const uploadEventImage = async (file, eventId) => {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    // Generate optimized image before upload
    const optimizedImage = await optimizeImage(file);
    
    // Upload original size
    const originalRef = ref(storage, `events/${eventId}/original_${generateImageFileName(file.name)}`);
    await uploadBytes(originalRef, optimizedImage);
    const originalUrl = await getDownloadURL(originalRef);

    // Generate and upload thumbnail
    const thumbnailBlob = await createThumbnail(optimizedImage);
    const thumbnailRef = ref(storage, `events/${eventId}/thumbnail_${generateImageFileName(file.name)}`);
    await uploadBytes(thumbnailRef, thumbnailBlob);
    const thumbnailUrl = await getDownloadURL(thumbnailRef);

    return {
      original: originalUrl,
      thumbnail: thumbnailUrl
    };
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

// Optimize image before upload
const optimizeImage = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Max dimensions
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress image
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => resolve(blob),
          'image/jpeg',
          0.8 // compression quality
        );
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Create thumbnail version
const createThumbnail = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Thumbnail dimensions
        const THUMB_WIDTH = 300;
        const THUMB_HEIGHT = 300;
        
        canvas.width = THUMB_WIDTH;
        canvas.height = THUMB_HEIGHT;
        
        // Calculate dimensions to maintain aspect ratio
        const aspectRatio = img.width / img.height;
        let drawWidth = THUMB_WIDTH;
        let drawHeight = THUMB_HEIGHT;
        
        if (aspectRatio > 1) {
          drawWidth = THUMB_HEIGHT * aspectRatio;
          drawHeight = THUMB_HEIGHT;
        } else {
          drawWidth = THUMB_WIDTH;
          drawHeight = THUMB_WIDTH / aspectRatio;
        }
        
        // Center the image
        const x = (THUMB_WIDTH - drawWidth) / 2;
        const y = (THUMB_HEIGHT - drawHeight) / 2;
        
        ctx.drawImage(img, x, y, drawWidth, drawHeight);
        canvas.toBlob(
          (blob) => resolve(blob),
          'image/jpeg',
          0.7 // slightly more compression for thumbnails
        );
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Get the optimized image URL for a given image and size
export function getOptimizedImageUrl(imagePath, size = 'md') {
  if (!imagePath) return null;
  
  // If it's an external URL (e.g., from Firebase Storage), return as is
  if (imagePath.startsWith('http')) {
    return imagePath;
  }

  try {
    // If it's already an optimized path, just return it
    if (imagePath.includes('/optimized/')) {
      return imagePath;
    }

    // Get the filename and type from the path
    const parts = imagePath.split('/');
    const type = parts[parts.length - 2]; // e.g., 'road', 'trail', etc.
    const fullFilename = parts[parts.length - 1];
    const filename = fullFilename.replace(/\.[^/.]+$/, ''); // Remove extension
    
    // Return the optimized version
    return `/assets/event-images/optimized/${type}/${filename}-${size}.webp`;
  } catch (error) {
    console.error('Error processing image path:', error);
    return imagePath;
  }
}

// Get the placeholder image URL
export function getPlaceholderUrl(imagePath) {
  if (!imagePath) return null;
  
  // If it's an external URL, return null (we'll use CSS blur instead)
  if (imagePath.startsWith('http')) {
    return null;
  }

  try {
    // If it's already an optimized path, just modify the suffix
    if (imagePath.includes('/optimized/')) {
      return imagePath.replace(/-[^-]+\.webp$/, '-placeholder.webp');
    }

    // Get the filename and type from the path
    const parts = imagePath.split('/');
    const type = parts[parts.length - 2]; // e.g., 'road', 'trail', etc.
    const fullFilename = parts[parts.length - 1];
    const filename = fullFilename.replace(/\.[^/.]+$/, ''); // Remove extension
    
    // Return the placeholder version
    return `/assets/event-images/optimized/${type}/${filename}-placeholder.webp`;
  } catch (error) {
    console.error('Error processing image path:', error);
    return null;
  }
}

// Get srcSet for responsive images
export function getSrcSet(imagePath) {
  if (!imagePath || imagePath.startsWith('http')) {
    return null;
  }

  try {
    // If it's already an optimized path, generate srcset from it
    if (imagePath.includes('/optimized/')) {
      return [
        imagePath.replace(/-[^-]+\.webp$/, '-sm.webp 400w'),
        imagePath.replace(/-[^-]+\.webp$/, '-md.webp 800w'),
        imagePath.replace(/-[^-]+\.webp$/, '-lg.webp 1200w'),
        imagePath.replace(/-[^-]+\.webp$/, '-xl.webp 1600w'),
        imagePath.replace(/-[^-]+\.webp$/, '-2xl.webp 2000w')
      ].join(', ');
    }

    // Get the filename and type from the path
    const parts = imagePath.split('/');
    const type = parts[parts.length - 2]; // e.g., 'road', 'trail', etc.
    const fullFilename = parts[parts.length - 1];
    const filename = fullFilename.replace(/\.[^/.]+$/, ''); // Remove extension
    
    // Return the srcSet
    return [
      `/assets/event-images/optimized/${type}/${filename}-sm.webp 400w`,
      `/assets/event-images/optimized/${type}/${filename}-md.webp 800w`,
      `/assets/event-images/optimized/${type}/${filename}-lg.webp 1200w`,
      `/assets/event-images/optimized/${type}/${filename}-xl.webp 1600w`,
      `/assets/event-images/optimized/${type}/${filename}-2xl.webp 2000w`
    ].join(', ');
  } catch (error) {
    console.error('Error generating srcSet:', error);
    return null;
  }
}

// Get sizes attribute for responsive images
export function getSizes(className) {
  return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';
}

// Preload critical images
export function preloadCriticalImages(images) {
  if (typeof window === 'undefined') return;
  
  images.forEach(imagePath => {
    if (!imagePath) return;
    
    try {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = getOptimizedImageUrl(imagePath, 'md');
      document.head.appendChild(link);
    } catch (error) {
      console.error('Error preloading image:', error);
    }
  });
} 