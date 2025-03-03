import React, { Fragment } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Mountain as MountainIcon, User, Settings, LogOut, Link as LinkIcon, BarChart2 } from 'lucide-react';
import { useAuth } from '../utils/AuthContext';
import { getAuth } from 'firebase/auth';
import { Menu, Transition } from '@headlessui/react';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

const Layout = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  // Get first part of email (everything before @)
  const displayName = user ? user.email.split('@')[0] : '';

  const handleLogout = () => {
    const auth = getAuth();
    auth.signOut();
  };

  return (
    <div className="min-h-screen bg-sand-50 text-slate-800">
      {/* Persistent Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <MountainIcon className="w-8 h-8 text-purple-600" />
              <div className="text-2xl font-bold">Blister</div>
            </Link>
            <div className="flex items-center space-x-8">
              <Link to="/run" className="hover:text-purple-600 transition-colors">Run</Link>
              <Link to="/tri" className="hover:text-purple-600 transition-colors">Triathlon</Link>
              <Link to="/search" className="hover:text-purple-600 transition-colors">Find Athletes</Link>
              <Link to="/lab" className="hover:text-purple-600 transition-colors flex items-center">
              Performance Lab
              </Link>
              {isAdmin && (
                <Link to="/dashboard" className="hover:text-purple-600 transition-colors">Add Event</Link>
              )}
              {user ? (
                <div className="flex items-center space-x-4">
                  <Menu as="div" className="relative">
                    <Menu.Button className="flex items-center space-x-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2">
                      <User className="h-4 w-4" />
                      <span className="capitalize font-medium">{displayName}</span>
                    </Menu.Button>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-200"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to="/profile"
                              className={classNames(
                                active ? 'bg-gray-100' : '',
                                'flex px-4 py-2 text-sm text-gray-700 items-center'
                              )}
                            >
                              <User className="h-4 w-4 mr-3" />
                              Profile
                            </Link>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to="/settings"
                              className={classNames(
                                active ? 'bg-gray-100' : '',
                                'flex px-4 py-2 text-sm text-gray-700 items-center'
                              )}
                            >
                              <Settings className="h-4 w-4 mr-3" />
                              Settings
                            </Link>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={handleLogout}
                              className={classNames(
                                active ? 'bg-gray-100' : '',
                                'flex w-full px-4 py-2 text-sm text-gray-700 items-center'
                              )}
                            >
                              <LogOut className="h-4 w-4 mr-3" />
                              Sign out
                            </button>
                          )}
                        </Menu.Item>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                </div>
              ) : (
                <>
                  <Link to="/login" className="hover:text-purple-600 transition-colors">Login</Link>
                  <Link 
                    to="/signup" 
                    className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <main className="flex-grow">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout; 