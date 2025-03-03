import React, { useState, useEffect } from 'react';
import { X, Loader } from 'lucide-react';
import { Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../utils/AuthContext';

export default function FollowersModal({ isOpen, onClose, userId, type }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    const loadUsers = async () => {
      if (!isOpen || !userId) return;
      
      setLoading(true);
      try {
        const connectionsRef = doc(db, 'userConnections', userId);
        const connectionsDoc = await getDoc(connectionsRef);
        
        if (!connectionsDoc.exists()) {
          setUsers([]);
          return;
        }

        const userIds = type === 'followers' 
          ? connectionsDoc.data().followers || []
          : connectionsDoc.data().following || [];

        const userDocs = await Promise.all(
          userIds.map(id => getDoc(doc(db, 'users', id)))
        );

        const userData = userDocs
          .filter(doc => doc.exists())
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

        setUsers(userData);
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [isOpen, userId, type]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-800">
            {type === 'followers' ? 'Followers' : 'Following'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader className="w-6 h-6 text-purple-600 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-center text-slate-500 py-8">
            {type === 'followers' 
              ? 'No followers yet'
              : 'Not following anyone yet'}
          </p>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {users.map(user => (
              <Link
                key={user.id}
                to={`/profile/${user.id}`}
                onClick={onClose}
                className="flex items-center p-3 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <img
                  src={user.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=7C3AED&color=fff`}
                  alt={user.displayName}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="ml-3">
                  <div className="font-medium text-slate-900">{user.displayName}</div>
                  {user.location && (
                    <div className="text-sm text-slate-500">{user.location}</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 