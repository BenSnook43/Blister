import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Login from './components/Login';
import RunEventsPage from './components/RunEventsPage';
import TriEventsPage from './components/TriEventsPage';
import EventDashboard from './components/EventDashboard';
import ProfilePage from './components/ProfilePage';
import SignUp from './components/SignUp';
import LandingPage from './components/LandingPage';
import { AuthProvider } from './utils/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import UserSearchPage from './components/UserSearchPage';
import UserSettings from './components/UserSettings';
import PrivacyPolicy from './components/PrivacyPolicy';
import ConnectPlatforms from './components/ConnectPlatforms';
import OAuthCallback from './components/OAuthCallback';
import Footer from './components/Footer';
import Layout from './components/Layout';
import PerformanceLab from './pages/PerformanceLab';

function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <div className="flex flex-col min-h-screen">
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/run" element={<RunEventsPage />} />
              <Route path="/run/:id" element={<RunEventsPage />} />
              <Route path="/tri" element={<TriEventsPage />} />
              <Route path="/tri/:id" element={<TriEventsPage />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route 
                path="/settings/connections" 
                element={
                  <ProtectedRoute>
                    <ConnectPlatforms />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/auth/:platform/callback" 
                element={
                  <ProtectedRoute>
                    <OAuthCallback />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile/:userId" 
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute adminOnly>
                    <EventDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/search" 
                element={
                  <ProtectedRoute>
                    <UserSearchPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <UserSettings />
                  </ProtectedRoute>
                } 
              />
              <Route path="/lab" element={<PerformanceLab />} />
            </Route>
          </Routes>
          <Footer />
        </div>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;