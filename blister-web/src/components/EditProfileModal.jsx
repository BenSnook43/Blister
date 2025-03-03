import { useState, useRef } from 'react';
import { useAuth } from '../utils/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import { X, Loader, Trash2, Camera } from 'lucide-react';
import ImageCropper from './ImageCropper';

const getProfileImageUrl = (imageUrl, displayName = 'User') => {
  if (!imageUrl || imageUrl.trim() === '') {
    // Generate a placeholder avatar using UI Avatars
    const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=7C3AED&color=fff&size=200`;
  }
  return imageUrl;
};

export default function EditProfileModal({ isOpen, onClose, user, onUpdate }) {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    location: user?.location || '',
    profileImage: user?.profileImage || ''
  });
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(URL.createObjectURL(file));
      setShowCropModal(true);
    }
  };

  const handleCroppedImage = async (blob) => {
    if (!currentUser) {
      console.error('No current user');
      return;
    }

    setIsUploading(true);
    try {
      // Create a unique filename
      const timestamp = Date.now();
      const filename = `${timestamp}.jpg`;
      const storagePath = `profileImages/${currentUser.uid}/${filename}`;
      console.log('Uploading to path:', storagePath);
      
      const storageRef = ref(storage, storagePath);
      
      // Upload the image with metadata
      const metadata = {
        contentType: 'image/jpeg',
        customMetadata: {
          'userId': currentUser.uid
        }
      };
      
      // Upload with metadata
      const uploadResult = await uploadBytes(storageRef, blob, metadata);
      console.log('Upload successful:', uploadResult);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);
      console.log('Download URL obtained:', downloadURL);
      
      // Update form data with new image URL
      setFormData(prev => ({
        ...prev,
        profileImage: downloadURL
      }));
      
      setShowCropModal(false);
    } catch (error) {
      console.error('Detailed upload error:', error);
      if (error.code === 'storage/unauthorized') {
        alert('Permission denied. Please try logging out and back in.');
      } else if (error.code === 'storage/quota-exceeded') {
        alert('Storage quota exceeded. Please contact support.');
      } else {
        alert('Failed to upload profile image. Please try again.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      alert('You must be logged in to update your profile.');
      return;
    }
    
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userRef);
      
      const updateData = {
        ...(userDoc.exists() ? userDoc.data() : {}),
        displayName: formData.displayName,
        location: formData.location,
        profileImage: formData.profileImage,
        lastUpdated: new Date(),
        userId: currentUser.uid
      };
      
      await setDoc(userRef, updateData);
      
      if (onUpdate) {
        onUpdate(updateData);
      }
      
      onClose();
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      alert('Failed to save profile changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Edit Profile</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700"
            disabled={isUploading || isSaving}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <div className="relative w-32 h-32 mx-auto mb-4">
              <img
                src={getProfileImageUrl(formData.profileImage, formData.displayName)}
                alt={`${formData.displayName || 'User'}'s profile`}
                className="w-full h-full rounded-full object-cover border-4 border-white shadow-lg"
                onError={(e) => {
                  const initials = (formData.displayName || 'U').split(' ').map(n => n[0]).join('').toUpperCase();
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=7C3AED&color=fff&size=200`;
                }}
              />
              {isUploading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                  <Loader className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
              <div className="absolute -bottom-2 right-0 flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700 transition-colors disabled:opacity-50"
                  disabled={isUploading}
                  title="Upload new photo"
                >
                  <Camera className="w-4 h-4" />
                </button>
                {formData.profileImage && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to delete your profile picture?')) {
                        try {
                          setFormData(prev => ({
                            ...prev,
                            profileImage: ''
                          }));
                          
                          // Notify parent component
                          onUpdate?.({ ...user, profileImage: '' });
                        } catch (error) {
                          console.error('Error updating profile:', error);
                          alert('Failed to delete profile picture. Please try again.');
                        }
                      }
                    }}
                    className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition-colors"
                    title="Delete photo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              className="hidden"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Name
            </label>
            <input
              type="text"
              name="displayName"
              value={formData.displayName}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
              disabled={isUploading || isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              disabled={isUploading || isSaving}
            >
              {isSaving && <Loader className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>

        {showCropModal && (
          <ImageCropper
            image={selectedImage}
            onCrop={handleCroppedImage}
            onClose={() => setShowCropModal(false)}
            initialCrop={{
              unit: '%',
              width: 100,
              height: 100,
              x: 0,
              y: 0,
              aspect: 1
            }}
          />
        )}
      </div>
    </div>
  );
} 