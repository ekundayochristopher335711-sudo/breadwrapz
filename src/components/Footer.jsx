import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-[#151515] text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] items-start">
          <div className="space-y-6">
            <p className="text-sm uppercase tracking-[0.4em] text-brand-orange font-bold">Delivery & Community</p>
            <h3 className="text-3xl sm:text-4xl font-black">Hungry? Let’s Solve That.</h3>
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-3">
              <a
                href="/menu"
                className="inline-flex items-center justify-center bg-brand-orange text-white px-6 py-3 rounded-full font-black uppercase tracking-wider shadow-lg hover:bg-brand-orange-dark transition"
              >
                Order Online Now
              </a>
              <a
                href="https://maps.google.com?q=7.717851,5.253719"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center border border-white/20 text-white px-6 py-3 rounded-full font-black uppercase tracking-wider hover:bg-white/10 transition"
              >
                Find Us on Google Maps
              </a>
            </div>
          </div>

          <div className="rounded-[2rem] bg-white/5 border border-white/10 p-6 sm:p-8 backdrop-blur-xl">
            <p className="text-sm uppercase tracking-[0.35em] text-brand-orange font-bold mb-4">Get the Juice</p>
            <p className="text-gray-300 text-sm sm:text-base mb-6">Sign up for our newsletter to get 10% off your first online order.</p>
            <form className="flex flex-col sm:flex-row gap-3">
              <label className="sr-only" htmlFor="newsletter-email">Email address</label>
              <input
                id="newsletter-email"
                type="email"
                placeholder="Enter your email address"
                className="w-full rounded-full border border-white/20 bg-white/5 px-5 py-3 text-white placeholder:text-gray-400 focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-brand-orange px-6 py-3 font-black uppercase tracking-wider text-white hover:bg-brand-orange-dark transition"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-10 grid gap-10 lg:grid-cols-3">
          <div>
            <h4 className="text-lg font-bold mb-3">Follow the Flavor</h4>
            <div className="flex flex-wrap gap-3 text-sm">
              <a href="#" className="px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition">TikTok</a>
              <a href="#" className="px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition">Instagram</a>
              <a href="#" className="px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition">Facebook</a>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-bold mb-3">Quick Support</h4>
            <p className="text-gray-300 text-sm">Need help with an order? Call us directly at</p>
            <a href="tel:+2349001112222" className="mt-2 inline-block text-white font-black text-lg">+234 900 111 2222</a>
          </div>

          <div className="flex flex-col justify-between">
            <div>
              <h4 className="text-lg font-bold mb-3">Operating Hours</h4>
              <p className="text-gray-300 text-sm">Mon - Sun: 10am - 10pm</p>
            </div>
            <p className="text-sm text-gray-400 opacity-90">© 2026 Breadwrapz.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
