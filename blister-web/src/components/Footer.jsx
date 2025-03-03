import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Shield } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex flex-wrap gap-6 md:order-2">
            <Link to="/run" className="text-gray-500 hover:text-gray-900">
              Running Events
            </Link>
            <Link to="/tri" className="text-gray-500 hover:text-gray-900">
              Triathlons
            </Link>
            <Link 
              to="/privacy" 
              className="text-gray-500 hover:text-gray-900 flex items-center"
            >
              <Shield className="h-5 w-5 mr-2" />
              Privacy Policy
            </Link>
            <a 
              href="mailto:ben@blister.dev" 
              className="text-gray-500 hover:text-gray-900 flex items-center"
            >
              <Mail className="h-5 w-5 mr-2" />
              Contact
            </a>
          </div>
          <p className="mt-8 text-base text-gray-400 md:mt-0 md:order-1">
            © {currentYear} Blister. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 