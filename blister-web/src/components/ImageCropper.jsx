import { useState, useRef } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X } from 'lucide-react';

export default function ImageCropper({ image, onCrop, onClose, initialCrop }) {
  const [crop, setCrop] = useState(initialCrop || {
    unit: '%',
    width: 100,
    height: 100,
    x: 0,
    y: 0,
    aspect: 1
  });
  const imgRef = useRef(null);

  const getCroppedImg = async () => {
    try {
      const image = imgRef.current;
      const canvas = document.createElement('canvas');
      
      // Calculate scaling based on the original image dimensions
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      // Set canvas size to match the crop dimensions
      const cropWidth = crop.width * scaleX;
      const cropHeight = crop.height * scaleY;
      
      // Create a square canvas with the size of the crop
      const size = Math.max(cropWidth, cropHeight);
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext('2d');
      
      // Clear the canvas and set properties
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingQuality = 'high';
      
      // Create circular clipping path
      ctx.beginPath();
      ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();

      // Draw the image centered in the circular crop area
      ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        cropWidth,
        cropHeight,
        0,
        0,
        size,
        size
      );
      
      // Convert the canvas to a blob
      const blob = await new Promise((resolve) => {
        canvas.toBlob(
          (blob) => resolve(blob),
          'image/jpeg',
          1
        );
      });
      
      return blob;
    } catch (e) {
      console.error('Error getting cropped image:', e);
      throw e;
    }
  };

  const handleSave = async () => {
    try {
      const croppedImage = await getCroppedImg();
      await onCrop(croppedImage);
    } catch (e) {
      console.error('Error saving cropped image:', e);
      alert('Failed to save cropped image. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Crop Profile Picture</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="max-h-[60vh] overflow-auto mb-4">
          <ReactCrop
            crop={crop}
            onChange={setCrop}
            aspect={1}
            circularCrop
            keepSelection
          >
            <img
              ref={imgRef}
              src={image}
              alt="Crop preview"
              className="max-w-full"
              onLoad={(e) => {
                // Center the crop on load
                const { width, height } = e.currentTarget;
                const size = Math.min(width, height);
                setCrop({
                  unit: 'px',
                  width: size,
                  height: size,
                  x: (width - size) / 2,
                  y: (height - size) / 2,
                  aspect: 1
                });
              }}
            />
          </ReactCrop>
        </div>
        
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
} 