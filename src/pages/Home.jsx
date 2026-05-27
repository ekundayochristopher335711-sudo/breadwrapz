import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <section className="relative h-screen w-full overflow-hidden pt-16">
      {/* Landing Page Background Image */}
      <img
        src="/images/landingpage.png"
        alt="Breadwrapz Landing Page"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-40"></div>

      {/* Content */}
      <div className="relative h-full flex items-center justify-center text-center px-4">
        <div className="max-w-3xl animate-fade-in-up">
          <h2 className="text-5xl md:text-7xl font-bold text-white mb-4 font-poppins">
            Welcome to Breadwrapz
          </h2>
          <p className="text-xl md:text-2xl text-gray-100 mb-8 font-light">
            Experience authentic Nigerian cuisine at its finest
          </p>
          <Link
            to="/menu"
            className="btn-primary inline-block"
          >
            Order Now
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Home;
