import React, { useState } from 'react';

const Menu = ({ onAddToCart }) => {
  const [videoModal, setVideoModal] = useState({ isOpen: false, videoUrl: '' });

  const menuItems = [
    { id: 1, name: 'Jollof Rice', price: 3500, description: 'Smoky, rich, and served with spiced chicken.', image: '/images/menu/jollof-rice.jpg', videoUrl: 'https://videos.pexels.com/video-files/3571326/3571326-sd_640_360_30fps.mp4' },
    { id: 2, name: 'Fried Rice', price: 4000, description: 'Stir-fried with fresh veggies and savory spices.', image: '/images/menu/fried-rice.jpg', videoUrl: 'https://videos.pexels.com/video-files/4454187/4454187-sd_640_360_30fps.mp4' },
    { id: 3, name: 'Ofada Rice', price: 3200, description: 'Local rice served with rich pepper sauce and tender beef.', image: '/images/menu/placeholder.svg', videoUrl: 'https://videos.pexels.com/video-files/3571326/3571326-sd_640_360_30fps.mp4' },
    { id: 4, name: 'Amala', price: 2800, description: 'Soft amala served with your choice of traditional soups.', image: '/images/amala.jpg', videoUrl: 'https://videos.pexels.com/video-files/3571326/3571326-sd_640_360_30fps.mp4' },
    { id: 5, name: 'Pounded Yam', price: 4500, description: 'Smooth pounded yam with hearty egusi soup.', image: '/images/menu/pounded-yam.jpg', videoUrl: 'https://videos.pexels.com/video-files/4454187/4454187-sd_640_360_30fps.mp4' },
    { id: 6, name: 'Ofada Stew', price: 2200, description: 'Spicy local stew made especially for Ofada rice.', image: '/images/menu/placeholder.svg', videoUrl: 'https://videos.pexels.com/video-files/3571326/3571326-sd_640_360_30fps.mp4' },
    { id: 7, name: 'Efo Riro', price: 2400, description: 'Leafy spinach stew cooked with spices and protein.', image: '/images/menu/placeholder.svg', videoUrl: 'https://videos.pexels.com/video-files/4454187/4454187-sd_640_360_30fps.mp4' },
    { id: 8, name: 'Egusi Soup', price: 2800, description: 'Traditional melon seed soup with meat and greens.', image: '/images/menu/placeholder.svg', videoUrl: 'https://videos.pexels.com/video-files/3571326/3571326-sd_640_360_30fps.mp4' },
    { id: 9, name: 'Fresh Fish', price: 5200, description: 'Pan-fried fish in a delicious Nigerian sauce.', image: '/images/fresh-fish.jpg', videoUrl: 'https://videos.pexels.com/video-files/4454187/4454187-sd_640_360_30fps.mp4' },
    { id: 10, name: 'Ewedu with Gbegiri', price: 2100, description: 'Classic jollof pairing served with ewedu and gbegiri soup.', image: '/images/menu/placeholder.svg', videoUrl: 'https://videos.pexels.com/video-files/3571326/3571326-sd_640_360_30fps.mp4' },
    { id: 11, name: 'Chicken or Turkey', price: 4200, description: 'Juicy chicken/turkey cooked with aromatic spices.', image: '/images/menu/placeholder.svg', videoUrl: 'https://videos.pexels.com/video-files/4454187/4454187-sd_640_360_30fps.mp4' },
    { id: 12, name: 'Assorted Beef (9ja Exotic)', price: 4800, description: 'Mixed beef cuts cooked in an exotic Nigerian sauce.', image: '/images/menu/placeholder.svg', videoUrl: 'https://videos.pexels.com/video-files/3571326/3571326-sd_640_360_30fps.mp4' },
    { id: 13, name: 'Vegetable Salad', price: 1600, description: 'Fresh vegetable salad tossed in a light dressing.', image: '/images/menu/placeholder.svg', videoUrl: 'https://videos.pexels.com/video-files/4454187/4454187-sd_640_360_30fps.mp4' },
    { id: 14, name: 'Moi Moi', price: 900, description: 'Steamed bean pudding seasoned with peppers and herbs.', image: '/images/menu/placeholder.svg', videoUrl: 'https://videos.pexels.com/video-files/3571326/3571326-sd_640_360_30fps.mp4' },
    { id: 15, name: 'Beans (Ewa Agoyin) with Dodo', price: 2600, description: 'Spicy beans served with sweet fried plantain.', image: '/images/beans-dodo.jpg', videoUrl: 'https://videos.pexels.com/video-files/4454187/4454187-sd_640_360_30fps.mp4' },
    { id: 16, name: 'Yam Pottage', price: 2700, description: 'Comforting yam pottage cooked in rich spices.', image: '/images/yam-pottage.jpg', videoUrl: 'https://videos.pexels.com/video-files/3571326/3571326-sd_640_360_30fps.mp4' },
    { id: 17, name: 'Chinese Rice', price: 3800, description: 'Savory Chinese rice with veggies and egg.', image: '/images/menu/placeholder.svg', videoUrl: 'https://videos.pexels.com/video-files/4454187/4454187-sd_640_360_30fps.mp4' },
    { id: 18, name: 'Singapore Noodles', price: 3900, description: 'Spicy noodles tossed with shrimp, egg, and vegetables.', image: '/images/singapore-noodles.jpg', videoUrl: 'https://videos.pexels.com/video-files/3571326/3571326-sd_640_360_30fps.mp4' },
    { id: 19, name: 'Shredded Beef with Green Pepper', price: 5200, description: 'Tender shredded beef cooked with green pepper.', image: '/images/menu/placeholder.svg', videoUrl: 'https://videos.pexels.com/video-files/4454187/4454187-sd_640_360_30fps.mp4' },
    { id: 20, name: 'Diced Chicken with Mixed Vegetables', price: 4400, description: 'Diced chicken stir-fried with mixed vegetables in soy sauce.', image: '/images/menu/placeholder.svg', videoUrl: 'https://videos.pexels.com/video-files/3571326/3571326-sd_640_360_30fps.mp4' },
    { id: 21, name: 'Sweet and Sour Fish', price: 6000, description: 'Fish in ginger and garlic sweet and sour sauce.', image: '/images/menu/placeholder.svg', videoUrl: 'https://videos.pexels.com/video-files/4454187/4454187-sd_640_360_30fps.mp4' },
    { id: 22, name: 'Prawns in Sweet Chili Sauce', price: 6200, description: 'Succulent prawns glazed in sweet chili sauce.', image: '/images/menu/placeholder.svg', videoUrl: 'https://videos.pexels.com/video-files/3571326/3571326-sd_640_360_30fps.mp4' },
  ];

  const openVideoModal = (videoUrl) => {
    setVideoModal({ isOpen: true, videoUrl });
  };

  const closeVideoModal = () => {
    setVideoModal({ isOpen: false, videoUrl: '' });
  };

  return (
    <>
      <section className="min-h-screen bg-gray-50 py-16 pt-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-item-red mb-4">
              Our Menu
            </h2>
            <p className="text-gray-600 text-lg">
              Delicious Nigerian dishes prepared with love
            </p>
          </div>

          {/* Menu Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {menuItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300"
              >
                {/* Food Image */}
                <div className="relative h-56 overflow-hidden bg-gray-200">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute top-4 right-4 bg-item-red text-white px-3 py-1 rounded-full text-sm font-bold">
                    ₦{item.price.toLocaleString()}
                  </div>
                </div>

                {/* Food Info */}
                <div className="p-6">
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    {item.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    {item.description}
                  </p>

                  {/* Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => onAddToCart(item)}
                      className="btn-primary flex-1 text-sm py-2"
                    >
                      Add to Cart
                    </button>
                    <button
                      onClick={() => openVideoModal(item.videoUrl)}
                      className="btn-secondary flex-1 text-sm py-2"
                    >
                      Watch Preview
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Video Modal */}
      {videoModal.isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-40 p-4 modal-overlay"
          onClick={closeVideoModal}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative pt-[56.25%] bg-black">
              <video
                src={videoModal.videoUrl}
                controls
                autoPlay
                className="absolute inset-0 w-full h-full"
              />
            </div>
            <div className="p-4 text-right">
              <button
                onClick={closeVideoModal}
                className="bg-item-red text-white px-6 py-2 rounded-lg font-semibold hover:bg-item-dark-red transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Menu;
