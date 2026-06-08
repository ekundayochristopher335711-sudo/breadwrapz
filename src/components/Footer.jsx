import React from 'react';

const PHONE = '0808 690 0533';
const PHONE_INTL = '+2348086900533';
const EMAIL = 'breadwrapzfoods@gmail.com';
const ADDRESS_LINE1 = '3 Adeshina Street, Delight Ventures Complex';
const ADDRESS_LINE2 = 'Along Idi Mango Road, Afobaje Idi Mango, Adigbe';
const ADDRESS_LINE3 = 'Abeokuta 110104, Ogun State, Nigeria';

const SOCIAL = [
  {
    name: 'Instagram',
    href: 'https://www.instagram.com/breadwrapz?igsh=bG9icWNtenJncDBo&utm_source=qr',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    name: 'TikTok',
    href: 'https://www.tiktok.com/@breadwrapzfoods?_r=1&_t=ZS-972DsEmMfzO',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34v-6.7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.03z" />
      </svg>
    ),
  },
  {
    name: 'Facebook',
    href: 'https://web.facebook.com/people/Breadwrapz/61568424126167/',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
];

const Footer = () => {
  return (
    <footer className="bg-[#151515] text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Top row */}
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] items-start">
          <div className="space-y-6">
            <p className="text-sm uppercase tracking-[0.4em] text-brand-orange font-bold">Delivery & Community</p>
            <h3 className="text-3xl sm:text-4xl font-black">Hungry? Let's Solve That.</h3>
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-3">
              <a
                href="/menu"
                className="inline-flex items-center justify-center bg-brand-orange text-white px-6 py-3 rounded-full font-black uppercase tracking-wider shadow-lg hover:bg-brand-orange-dark transition"
              >
                Order Online Now
              </a>
              <a
                href="https://www.google.com/maps/dir/?api=1&destination=489F%2B47+Abeokuta"
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

        {/* Bottom row */}
        <div className="mt-12 border-t border-white/10 pt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">

          {/* Social */}
          <div>
            <h4 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4">Follow the Flavor</h4>
            <div className="flex gap-3">
              {SOCIAL.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.name}
                  className="w-10 h-10 flex items-center justify-center rounded-full border border-white/10 bg-white/5 hover:bg-brand-orange hover:border-brand-orange transition text-white"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4">Contact Us</h4>
            <div className="space-y-2 text-sm">
              <a href={`tel:${PHONE_INTL}`} className="flex items-center gap-2 text-gray-300 hover:text-white transition">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0 text-brand-orange">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                </svg>
                {PHONE}
              </a>
              <a href={`mailto:${EMAIL}`} className="flex items-center gap-2 text-gray-300 hover:text-white transition">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0 text-brand-orange">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
                {EMAIL}
              </a>
            </div>
          </div>

          {/* Address */}
          <div>
            <h4 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4">Location</h4>
            <address className="not-italic text-sm text-gray-300 leading-relaxed">
              {ADDRESS_LINE1}<br />
              {ADDRESS_LINE2}<br />
              {ADDRESS_LINE3}
            </address>
          </div>

          {/* Hours + copyright */}
          <div className="flex flex-col justify-between gap-6">
            <div>
              <h4 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4">Hours</h4>
              <p className="text-gray-300 text-sm">Mon – Sun: 10am – 10pm</p>
            </div>
            <p className="text-xs text-gray-500">© {new Date().getFullYear()} Breadwrapz Foods. All rights reserved.</p>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
