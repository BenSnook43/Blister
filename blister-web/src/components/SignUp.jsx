import React from 'react';
import { Link } from 'react-router-dom';
import SignUpForm from './SignUpForm';

function SignUp() {
  return (
    <div className="min-h-screen bg-sand-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-slate-800">
            Create your account
          </h2>
        </div>
        
        <SignUpForm />

        <div className="text-center text-sm">
          <span className="text-slate-600">Already have an account?</span>{' '}
          <Link to="/login" className="font-medium text-purple-600 hover:text-purple-500">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

export default SignUp;
