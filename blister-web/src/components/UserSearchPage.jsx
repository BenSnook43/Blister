import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, MapPin, Trophy } from 'lucide-react';
import { useAuth } from '../utils/AuthContext';
import { followUser, unfollowUser, isFollowing } from '../utils/connections';
import { Helmet } from 'react-helmet-async';

function UserCard({ user, currentUserId, onFollowToggle }) {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkFollowStatus = async () => {
      const status = await isFollowing(currentUserId, user.userId);
      setFollowing(status);
    };
    if (currentUserId && user.userId) {
      checkFollowStatus();
    }
  }, [currentUserId, user.userId]);

  const handleFollowToggle = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (following) {
        await unfollowUser(currentUserId, user.userId);
      } else {
        await followUser(currentUserId, user.userId);
      }
      setFollowing(!following);
      if (onFollowToggle) onFollowToggle();
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4 flex items-center justify-between">
      <Link to={`/profile/${user.userId}`} className="flex items-center flex-1">
        <img
          src={user.profileImage || '/default-avatar.png'}
          alt={user.displayName}
          className="w-12 h-12 rounded-full object-cover mr-4"
        />
        <div>
          <h3 className="font-semibold text-lg">{user.displayName}</h3>
          {user.location && (
            <p className="text-gray-600 text-sm">{user.location}</p>
          )}
          <p className="text-gray-500 text-sm">{user.totalRaces || 0} races completed</p>
        </div>
      </Link>
      {currentUserId !== user.userId && (
        <button
          onClick={handleFollowToggle}
          disabled={loading}
          className={`px-4 py-2 rounded-md ${
            following
              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              : 'bg-purple-600 text-white hover:bg-purple-700'
          } transition-colors duration-200`}
        >
          {loading ? 'Loading...' : following ? 'Unfollow' : 'Follow'}
        </button>
      )}
    </div>
  );
}

export default function UserSearchPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const searchUsers = async (searchText) => {
    if (!searchText.trim() || !currentUser) {
      setUsers([]);
      return;
    }

    setLoading(true);
    try {
      console.log('Searching users with query:', searchText);
      const usersRef = collection(db, 'users');
      
      // Get all users
      const querySnapshot = await getDocs(usersRef);
      console.log('Total users in database:', querySnapshot.size);
      
      const allUsers = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('User data:', {
          userId: doc.id,
          displayName: data.displayName,
          email: data.email,
          searchableTerms: data.searchableTerms
        });
        return {
          userId: doc.id,
          ...data
        };
      });
      
      // Filter users client-side
      const usersData = allUsers.filter(user => {
        // Create searchable text from user data
        const searchableFields = [
          user.displayName,
          user.email,
          user.location,
          ...(user.searchableTerms || [])
        ].filter(Boolean);
        
        // Join all searchable fields and convert to lowercase
        const searchableText = searchableFields.join(' ').toLowerCase();
        const searchTerm = searchText.toLowerCase();
        
        console.log('Checking user:', {
          userId: user.userId,
          displayName: user.displayName,
          searchableText,
          searchTerm,
          matches: searchableText.includes(searchTerm)
        });
        
        return searchableText.includes(searchTerm);
      });

      console.log('Found users:', usersData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error searching users:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery && !authLoading) {
        searchUsers(searchQuery);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, authLoading]);

  if (authLoading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  if (!currentUser) {
    return <div className="text-center py-4">Please sign in to search users.</div>;
  }

  return (
    <div className="min-h-screen bg-sand-50">
      <Helmet>
        <title>Find Athletes | Blister</title>
        <meta name="description" content="Connect with fellow runners and triathletes in the Bay Area. Find training partners, follow other athletes, and build your endurance sports network." />
        <meta property="og:title" content="Find Athletes | Blister" />
        <meta property="og:description" content="Connect with fellow runners and triathletes in the Bay Area. Find training partners, follow other athletes, and build your endurance sports network." />
      </Helmet>
      <div className="max-w-3xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Find Athletes</h1>
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by name or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          {loading ? (
            <div className="text-center py-4">Loading...</div>
          ) : users.length > 0 ? (
            users.map((user) => (
              <UserCard
                key={user.userId}
                user={user}
                currentUserId={currentUser.uid}
                onFollowToggle={() => searchUsers(searchQuery)}
              />
            ))
          ) : searchQuery ? (
            <div className="text-center py-4 text-gray-600">
              No users found matching your search.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
} 