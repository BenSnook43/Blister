import { storage } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import imageCompression from 'browser-image-compression';

export const IMAGE_QUALITY = {
  HIGH: { maxSizeMB: 1.0, maxWidthOrHeight: 2048 },
  MEDIUM: { maxSizeMB: 0.5, maxWidthOrHeight: 1024 },
  LOW: { maxSizeMB: 0.2, maxWidthOrHeight: 800 },
  THUMBNAIL: { maxSizeMB: 0.1, maxWidthOrHeight: 400 }
};

export async function optimizeImage(file, quality = IMAGE_QUALITY.MEDIUM) {
  try {
    // Compress the image
    const compressedFile = await imageCompression(file, {
      ...quality,
      useWebWorker: true,
      fileType: 'image/webp' // Convert to WebP format
    });

    return compressedFile;
  } catch (error) {
    console.error('Error optimizing image:', error);
    throw error;
  }
}

export async function uploadOptimizedImage(file, path, quality = IMAGE_QUALITY.MEDIUM) {
  try {
    // Optimize the image first
    const optimizedFile = await optimizeImage(file, quality);
    
    // Create storage reference
    const storageRef = ref(storage, path);
    
    // Upload with metadata
    const metadata = {
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000' // Cache for 1 year
    };
    
    // Upload the optimized file
    const uploadResult = await uploadBytes(storageRef, optimizedFile, metadata);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(uploadResult.ref);
    
    return {
      url: downloadURL,
      size: optimizedFile.size,
      type: optimizedFile.type
    };
  } catch (error) {
    console.error('Error uploading optimized image:', error);
    throw error;
  }
}

export function generateBlurDataUrl(width = 400, height = 300) {
  return `data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}'%3E%3Cfilter id='b' color-interpolation-filters='sRGB'%3E%3CfeGaussianBlur stdDeviation='20'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' fill='%23f3f4f6'/%3E%3C/svg%3E`;
}

export function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height
      });
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export function calculateAspectRatio(width, height) {
  return width / height;
}

export function getSrcSet(url) {
  // Generate srcset for different viewport sizes
  return [
    `${url} 400w`,
    `${url} 800w`,
    `${url} 1200w`,
    `${url} 1600w`,
    `${url} 2000w`
  ].join(', ');
} 