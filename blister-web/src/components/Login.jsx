import React from 'react';
import { Link } from 'react-router-dom';
import SignInForm from './SignInForm';

function Login() {
  return (
    <div className="min-h-screen bg-sand-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-slate-800">
            Welcome back
          </h2>
        </div>
        
        <SignInForm />

        <div className="text-center text-sm">
          <span className="text-slate-600">Don't have an account?</span>{' '}
          <Link to="/signup" className="font-medium text-purple-600 hover:text-purple-500">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Login; 