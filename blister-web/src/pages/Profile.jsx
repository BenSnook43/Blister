import React from 'react';
import { useAuth } from '../utils/AuthContext';

export default function Profile() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          </div>
          
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Email</h2>
              <p className="mt-1 text-gray-600">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 