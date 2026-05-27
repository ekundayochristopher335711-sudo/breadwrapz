import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = ({ cartCount, onCartClick }) => {
  return (
    <nav className="fixed top-0 left-0 right-0 bg-item-red text-white shadow-lg z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition">
            <img
              src="/images/logo.png"
              alt="Breadwrapz Logo"
              className="h-28 w-28 md:h-36 md:w-36 object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </Link>

          {/* Navigation Links */}
            <nav className="fixed top-0 left-0 right-0 bg-item-red text-white shadow z-50">
            <Link to="/" className="hover:text-gray-100 transition font-semibold">
                <div className="flex justify-between items-center h-12">
            </Link>
                  <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition -mt-3">
                    <img
                      src="/images/logo.png"
                      alt="Breadwrapz Logo"
                      className="h-28 w-28 md:h-36 md:w-36 object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </Link>

          {/* Cart Icon */}
          <button
            onClick={onCartClick}
            className="relative p-2 hover:bg-item-dark-red rounded-lg transition"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            {cartCount > 0 && (
              <span className="absolute top-0 right-0 bg-white text-item-red rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
