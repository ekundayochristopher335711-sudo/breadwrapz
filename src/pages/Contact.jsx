import React from 'react';

const Contact = () => {
  return (
    <section className="min-h-screen bg-gray-50 py-16 pt-32">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-item-red mb-4">
            Get in Touch
          </h2>
          <p className="text-gray-600 text-lg">
            Have questions? We'd love to hear from you!
          </p>
        </div>

        {/* Contact Info Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Contact Details */}
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Contact Information</h3>
            
            <div className="space-y-6">
              {/* Phone */}
              <div className="flex items-start space-x-4">
                <div className="text-3xl text-item-red">📞</div>
                <div>
                  <h4 className="font-bold text-gray-800">Phone / WhatsApp</h4>
                  <p className="text-gray-600">
                    <a href="https://wa.me/2348086900533" className="text-item-red hover:underline">
                      0808 690 0533
                    </a>
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Available 24/7</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start space-x-4">
                <div className="text-3xl text-item-red">✉️</div>
                <div>
                  <h4 className="font-bold text-gray-800">Email</h4>
                  <p className="text-gray-600">
                      <a href="mailto:breadwrapzfoods@gmail.com" className="text-item-red hover:underline">
                        breadwrapzfoods@gmail.com
                    </a>
                  </p>
                </div>
              </div>

              {/* Address */}
              <div className="flex items-start space-x-4">
                <div className="text-3xl text-item-red">📍</div>
                <div>
                  <h4 className="font-bold text-gray-800">Address</h4>
                  <p className="text-gray-600">
                    3 Adeshina Street, Delight Ventures Complex<br />
                    Along Idi Mango Road, Adigbe<br />
                    Abeokuta 110104, Ogun State, Nigeria
                  </p>
                </div>
              </div>

              {/* Hours */}
              <div className="flex items-start space-x-4">
                <div className="text-3xl text-item-red">⏰</div>
                <div>
                  <h4 className="font-bold text-gray-800">Hours of Operation</h4>
                  <p className="text-gray-600">
                    Monday - Sunday<br />
                    9:00 AM - 11:00 PM
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Send us a Message</h3>
            
            <form className="space-y-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Name</label>
                <input
                  type="text"
                  placeholder="Your name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-item-red"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">Email</label>
                <input
                  type="email"
                  placeholder="Your email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-item-red"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">Message</label>
                <textarea
                  placeholder="Your message"
                  rows="4"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-item-red"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full btn-primary"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>

        {/* Map Section */}
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">Find Us on the Map</h3>
          <div className="w-full h-96 rounded-lg overflow-hidden">
            <iframe
              width="100%"
              height="100%"
              frameBorder="0"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3964.8503485230847!2d3.3864853!3d6.5244!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x103b8b2afc72bc6b%3A0x98765!2sLagos%2C%20Nigeria!5e0!3m2!1sen!2s!4v1234567890"
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
