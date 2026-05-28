
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { menuDataNoImages } from './menuData.js';
import Footer from './components/Footer.jsx';

const API = import.meta.env.VITE_API_URL || '';
const DELIVERY_FEE = 500;

function calcPaystackFee(amount) {
  if (amount <= 0) return 0;
  let fee = Math.ceil(amount * 0.015);
  if (amount > 2500) fee += 100;
  return Math.min(fee, 2000);
}

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activePage, setActivePage] = useState('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasScrolledPastHero, setHasScrolledPastHero] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [popularityCounts, setPopularityCounts] = useState(() => {
    try {
      const raw = localStorage.getItem('popularityCounts');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderId, setOrderId] = useState('');
  const [orderEmailOrPhone, setOrderEmailOrPhone] = useState('');
  const [orderReference, setOrderReference] = useState('');
  const [paymentMessage, setPaymentMessage] = useState('');
  const [trackStatus, setTrackStatus] = useState(null);
  const [trackError, setTrackError] = useState('');

  const navRef = useRef(null);
  const homeRef = useRef(null);
  const menuRef = useRef(null);
  const locationRef = useRef(null);
  const cartRef = useRef(null);
  const trackRef = useRef(null);

  useEffect(() => {
    const onScroll = () => {
      setHasScrolledPastHero(window.scrollY > 120);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('reference') || params.get('trxref');
    if (ref) {
      window.history.replaceState({}, '', window.location.pathname);
      setOrderReference(ref);
      setActivePage('track');
      fetch(`${API}/api/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: ref }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.order) {
            setOrderId(data.order.orderId);
            setTrackStatus(data.order.status);
            setPaymentMessage(`Payment confirmed for order ${data.order.orderId}.`);
          }
        })
        .catch(() => {
          setTrackError('Unable to auto-verify payment. Please use the Verify button below.');
        });
    }
  }, []);

  useEffect(() => {
    // Ensure the page background matches the hero when on home to avoid white gap
    const originalBg = document.body.style.backgroundColor;
    if (activePage === 'home') {
      document.body.style.backgroundColor = '#f86f1d';
    } else {
      document.body.style.backgroundColor = originalBg || '#FFFFFF';
    }

    return () => {
      document.body.style.backgroundColor = originalBg || '#FFFFFF';
    };
  }, [activePage]);

  const displayNavbar = activePage !== 'home' || hasScrolledPastHero;

  const categories = useMemo(() => ['All', ...new Set(menuDataNoImages.map(item => item.category))], []);

  const orderStatusSteps = ['Order Received', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered'];
  const mockOrderData = {
    'ORD-2045': 'Preparing',
    'ORD-2046': 'On the way',
    'ORD-2047': 'Delivered',
    'ORD-2048': 'Confirmed',
  };

  const searchSuggestions = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return [];

    return [...new Set(
      menuDataNoImages
        .filter(item => item.name.toLowerCase().includes(normalized))
        .slice(0, 6)
        .map(item => item.name)
    )];
  }, [searchTerm]);

  const filteredMenuData = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    const byCategory = selectedCategory === 'All'
      ? menuDataNoImages
      : menuDataNoImages.filter(item => item.category === selectedCategory);

    if (!normalized) return byCategory;

    return byCategory.filter(item =>
      item.name.toLowerCase().includes(normalized) ||
      item.desc.toLowerCase().includes(normalized) ||
      item.category.toLowerCase().includes(normalized)
    );
  }, [searchTerm, selectedCategory]);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price, 0), [cart]);
  const paystackFee = useMemo(() => calcPaystackFee(subtotal + DELIVERY_FEE), [subtotal]);
  const total = useMemo(() => subtotal + DELIVERY_FEE + paystackFee, [subtotal, paystackFee]);

  useEffect(() => {
    try {
      localStorage.setItem('popularityCounts', JSON.stringify(popularityCounts));
    } catch {
      // ignore localStorage write errors
    }
  }, [popularityCounts]);

  const topItems = useMemo(() => {
    const itemsWithCount = menuDataNoImages.map(i => ({ ...i, orders: popularityCounts[i.id] || 0 }));
    itemsWithCount.sort((a, b) => b.orders - a.orders || (b.available === a.available ? 0 : (a.available ? -1 : 1)));
    return itemsWithCount.slice(0, 3);
  }, [popularityCounts]);

  const trackOrder = async () => {
    setTrackError('');
    const normalizedOrderId = orderId.trim().toUpperCase();

    if (!normalizedOrderId) {
      setTrackStatus(null);
      setTrackError('Please enter your order ID.');
      return;
    }

    try {
      const response = await fetch(`${API}/api/track-order/${encodeURIComponent(normalizedOrderId)}`);
      const data = await response.json();

      if (!response.ok) {
        setTrackStatus(null);
        setTrackError(data.error || 'Order not found. Check your Order ID and try again.');
        return;
      }

      setTrackStatus(data.status);
      setOrderReference(data.reference || orderReference);
      setPaymentMessage(`Order ${data.orderId} is currently ${data.status}.`);
    } catch (error) {
      console.error(error);
      setTrackStatus(null);
      setTrackError('Unable to retrieve order status. Please try again later.');
    }
  };

  const verifyPayment = async () => {
    if (!orderReference) {
      setTrackError('No payment reference available to verify.');
      return;
    }

    try {
      const response = await fetch(`${API}/api/verify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reference: orderReference }),
      });

      const data = await response.json();
      if (!response.ok) {
        setTrackError(data.error || 'Payment verification failed.');
        return;
      }

      setTrackStatus(data.order?.status || data.paymentData?.status);
      setTrackError('');
      setPaymentMessage(`Payment verified for order ${data.order?.orderId || ''}.`);
    } catch (error) {
      console.error(error);
      setTrackError('Unable to verify payment. Please try again later.');
    }
  };

  const scrollTo = (ref) => {
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const addToCart = (item) => {
    setCart(prev => [...prev, item]);
    setPopularityCounts(prev => ({
      ...prev,
      [item.id]: (prev[item.id] || 0) + 1,
    }));
  };

  const removeFromCart = (index) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const sendOrder = async () => {
    if (!customerName.trim()) {
      alert('Please enter your name for delivery before checkout.');
      return;
    }

    if (!customerPhone.trim()) {
      alert('Please enter your mobile number for delivery before checkout.');
      return;
    }

    if (!deliveryLocation.trim()) {
      alert('Please enter your delivery location before checkout.');
      return;
    }

    if (cart.length === 0) {
      alert('Your cart is empty. Add an item before checkout.');
      return;
    }

    try {
      const response = await fetch(`${API}/api/initialize-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contact: customerPhone.trim(),
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          amount: total,
          items: cart,
          deliveryLocation: deliveryLocation.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        const message = data.error || 'Failed to start checkout. Please try again.';
        alert(message);
        return;
      }

      setOrderId(data.order.orderId);
      setOrderReference(data.order.reference);
      setCart([]);

      if (data.paystack.authorization_url) {
        window.location.href = data.paystack.authorization_url;
      }
    } catch (error) {
      console.error(error);
      alert('Unable to connect to checkout. Please try again later.');
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Floating Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Elegant floating elements */}
        <div className="absolute top-20 left-10 w-24 h-24 bg-brand-orange/20 dark:bg-brand-black/15 rounded-full blur-sm animate-float"></div>
        <div className="absolute top-40 right-20 w-32 h-32 bg-brand-orange/15 dark:bg-brand-black/15 rounded-full blur-md animate-float-reverse"></div>
        <div className="absolute bottom-32 left-1/4 w-20 h-20 bg-brand-orange/15 dark:bg-brand-orange-dark/20 rounded-full blur-sm animate-float"></div>
        <div className="absolute top-1/3 right-1/3 w-16 h-16 bg-brand-orange/10 dark:bg-brand-orange-dark/12 rounded-full blur-xs animate-float-reverse"></div>
        <div className="absolute bottom-20 right-10 w-28 h-28 bg-brand-orange/15 dark:bg-brand-black/15 rounded-full blur-lg animate-float"></div>

        {/* Additional premium elements */}
        <div className="absolute top-1/4 left-1/3 w-12 h-12 bg-brand-orange/10 dark:bg-brand-black/15 rounded-full blur-sm animate-float"></div>
        <div className="absolute bottom-1/3 right-1/4 w-18 h-18 bg-brand-orange/12 dark:bg-brand-orange-dark/12 rounded-full blur-md animate-float-reverse"></div>
        <div className="absolute top-3/4 left-1/5 w-8 h-8 bg-brand-orange/12 dark:bg-brand-orange-dark/18 rounded-full blur-xs animate-float"></div>
        <div className="absolute bottom-1/4 right-2/3 w-14 h-14 bg-brand-orange/12 dark:bg-brand-black/12 rounded-full blur-sm animate-float-reverse"></div>

        {/* Subtle geometric accents */}
        <div className="absolute top-16 right-1/4 w-6 h-6 bg-brand-orange/10 dark:bg-brand-orange-dark/12 rotate-45 blur-xs animate-float"></div>
        <div className="absolute bottom-40 left-3/4 w-4 h-4 bg-brand-orange/10 dark:bg-brand-orange-dark/8 rotate-12 blur-xs animate-float-reverse"></div>
        <div className="absolute top-2/3 left-2/3 w-10 h-10 border border-brand-orange/20 dark:border-brand-orange-dark/10 rounded-full blur-sm animate-float"></div>
      </div>
      {displayNavbar && (
        <nav ref={navRef} className="fixed top-0 w-full z-50 glass mx-2 sm:mx-4 mt-0 rounded-b-2xl border-b border-white/10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 py-1 sm:py-1 px-2 sm:px-3">
          {/* Left: Logo */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollTo(homeRef)}>
              <img
                src="/images/logo.png"
                alt="Breadwrapz Logo"
                className="h-20 w-20 sm:h-28 sm:w-28 md:h-40 md:w-40 object-contain -mt-3"
              />
            </div>
          </div>

          {/* Center: Search Bar (keeps navbar sticky) */}
          <div className="flex-1 flex justify-center">
            <div className="relative hidden sm:block w-full max-w-md">
              <input
                type="text"
                placeholder="Search for food..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => searchTerm && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full px-3 py-2 rounded-full border-2 border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:border-brand-orange transition-all duration-300"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                🔍
              </div>

              {/* Search Suggestions */}
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute top-full mt-2 w-full bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                  {searchSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-900 border-b border-gray-200 last:border-b-0"
                      onClick={() => {
                        setSearchTerm(suggestion);
                        setShowSuggestions(false);
                      }}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Desktop Navigation & Mobile Controls */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-4 font-black text-sm uppercase tracking-widest">
              <button onClick={() => setActivePage('home')} className="hover:text-brand-orange transition">Home</button>
              <button onClick={() => setActivePage('menu')} className="hover:text-brand-orange transition">Menu</button>
              <button onClick={() => setActivePage('location')} className="hover:text-brand-orange transition">Location</button>
              <button onClick={() => setActivePage('track')} className="hover:text-brand-orange transition">Track</button>
              <button onClick={() => setActivePage('cart')} className="bg-brand-orange text-white px-4 py-2 rounded-full font-black hover:bg-brand-orange-dark transition">
                Cart ({cart.length})
              </button>
            </div>

            <div className="md:hidden flex items-center gap-4">
              <button onClick={() => setActivePage('cart')} className="bg-brand-orange text-white px-3 py-2 rounded-full font-bold text-sm hover:bg-brand-orange-dark transition">
                Cart ({cart.length})
              </button>
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-900 hover:text-brand-orange transition p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden glass rounded-b-2xl border-t border-white/20"
          >
            <div className="flex flex-col gap-2 p-4">
              {/* Mobile Search Bar */}
              <div className="relative mb-2">
                <input
                  type="text"
                  placeholder="Search for food..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => searchTerm && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="w-full px-4 py-2 rounded-full border-2 border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:border-brand-orange transition-all duration-300"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  🔍
                </div>
              </div>
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="rounded-3xl bg-white border border-gray-300 shadow-lg p-1 mt-2 text-sm max-h-52 overflow-y-auto">
                  {searchSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="px-4 py-3 rounded-2xl hover:bg-gray-100 cursor-pointer text-gray-900"
                      onMouseDown={() => {
                        setSearchTerm(suggestion);
                        setShowSuggestions(false);
                      }}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
              
              <button 
                onClick={() => { setActivePage('home'); setIsMenuOpen(false); }} 
                className="text-left py-3 px-4 font-bold text-sm uppercase tracking-widest hover:text-brand-orange transition rounded-lg hover:bg-white/10"
              >
                Home
              </button>
              <button 
                onClick={() => { setActivePage('menu'); setIsMenuOpen(false); }} 
                className="text-left py-3 px-4 font-bold text-sm uppercase tracking-widest hover:text-brand-orange transition rounded-lg hover:bg-white/10"
              >
                Menu
              </button>
              <button 
                onClick={() => { setActivePage('location'); setIsMenuOpen(false); }} 
                className="text-left py-3 px-4 font-bold text-sm uppercase tracking-widest hover:text-brand-orange transition rounded-lg hover:bg-white/10"
              >
                Location
              </button>
              <button 
                onClick={() => { setActivePage('track'); setIsMenuOpen(false); }} 
                className="text-left py-3 px-4 font-bold text-sm uppercase tracking-widest hover:text-brand-orange transition rounded-lg hover:bg-white/10"
              >
                Track
              </button>
            </div>
          </motion.div>
        )}
      </nav>
      )}

      <main className={displayNavbar ? 'pt-16 sm:pt-20' : 'pt-0'}>
        <section ref={homeRef} className={activePage === 'home' ? 'relative min-h-screen w-full overflow-hidden bg-[#f86f1d] text-white' : 'hidden'}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.12),_transparent_25%)]" />
          <div className="absolute inset-0 bg-[url('/images/landingpage.png')] bg-cover bg-center opacity-20" />
          <div className="relative z-10">
            <div className="max-w-7xl mx-auto px-6 pt-6 sm:pt-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-[2rem] bg-white/90 p-3 shadow-2xl backdrop-blur-xl">
                    <img
                      src="/images/logo.png"
                      alt="Breadwrapz Logo"
                      className="h-20 w-20 sm:h-20 sm:w-20 md:h-24 md:w-24 object-contain"
                    />
                  </div>
                  <div className="hidden md:block">
                    <div className="flex items-center gap-3 rounded-full bg-white px-4 py-3 shadow-xl text-gray-900 w-[420px]">
                      <span className="text-xl">🔍</span>
                      <input
                        type="text"
                        placeholder="Search for food..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => searchTerm && setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        className="w-full bg-transparent outline-none text-base text-gray-900 placeholder:text-gray-500"
                      />
                    </div>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-6 text-sm font-semibold tracking-widest">
                  <button onClick={() => setActivePage('home')} className="transition hover:text-black/90">Home</button>
                  <button onClick={() => setActivePage('menu')} className="transition hover:text-black/90">Menu</button>
                  <button onClick={() => setActivePage('location')} className="transition hover:text-black/90">Location</button>
                  <button onClick={() => setActivePage('track')} className="transition hover:text-black/90">Track</button>
                  <button
                    onClick={() => setActivePage('cart')}
                    className="rounded-full bg-black text-white px-5 py-3 font-black transition hover:bg-gray-900"
                  >
                    Cart ({cart.length})
                  </button>
                </div>
              </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24">
              <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] items-center">
                <div className="space-y-8">
                  <span className="inline-flex items-center rounded-full bg-white/15 px-4 py-2 text-sm uppercase tracking-[0.35em] text-white/90 shadow-inner shadow-black/10">
                    Get your best food
                  </span>
                  <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-tight tracking-tight">
                    Fresh Nigerian meals delivered fast.
                  </h1>
                  <p className="max-w-xl text-lg sm:text-xl text-white/90">
                    Order premium wraps, rice meals and combos with instant checkout, fast delivery, and easy tracking.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <button
                      onClick={() => setActivePage('menu')}
                      className="rounded-full bg-black text-white px-8 py-4 text-base font-black uppercase tracking-[0.16em] shadow-2xl shadow-black/20 transition hover:bg-gray-900"
                    >
                      Order Now
                    </button>
                    <button
                      onClick={() => setActivePage('location')}
                      className="rounded-full border-2 border-white/80 bg-white/10 px-8 py-4 text-base font-black uppercase tracking-[0.16em] text-white transition hover:bg-white/20"
                    >
                      View Location
                    </button>
                  </div>
                </div>

                <div className="relative flex justify-center lg:justify-end">
                  <div className="relative rounded-[3rem] overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.25)] border border-white/20 bg-white/10 backdrop-blur-xl">
                    <img
                      src="/images/landingpage.png"
                      alt="Breadwrapz special menu image"
                      className="w-full h-[520px] object-cover"
                    />
                  </div>
                  <div className="absolute top-8 left-8 h-24 w-24 rounded-full bg-white/90 blur-2xl" />
                  <div className="absolute bottom-10 right-10 h-20 w-20 rounded-full bg-white/70 blur-2xl" />
                </div>
              </div>
            </div>
          </div>

          {showSuggestions && searchSuggestions.length > 0 && (
            <div className="absolute top-28 left-1/2 z-50 hidden w-full max-w-md -translate-x-1/2 md:block rounded-3xl bg-white shadow-2xl">
              {searchSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="cursor-pointer border-b border-gray-200 px-5 py-3 text-gray-900 last:border-b-0 hover:bg-gray-100"
                  onMouseDown={() => {
                    setSearchTerm(suggestion);
                    setShowSuggestions(false);
                  }}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={activePage === 'home' ? 'bg-white py-20' : 'hidden'}>
          <div className="max-w-7xl mx-auto px-6 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
            <div className="space-y-6">
              <p className="text-sm uppercase tracking-[0.4em] text-brand-orange font-bold">Featured Section</p>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900">Breadwrapz Specials</h2>
              <p className="text-gray-600 text-lg max-w-2xl">
                See what makes Breadwrapz different: fast, flavorful wraps, combo meals, and premium rice dishes made fresh for delivery.
                Use the search and category filter to find your perfect meal in seconds.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-brand-orange/10 p-6 border border-brand-orange/10 shadow-sm">
                  <h3 className="text-xl font-bold text-gray-900">Fast Paystack Checkout</h3>
                  <p className="text-gray-600 mt-2">Add items, enter your delivery address, and pay securely via Paystack.</p>
                </div>
                <div className="rounded-3xl bg-brand-orange/10 p-6 border border-brand-orange/10 shadow-sm">
                  <h3 className="text-xl font-bold text-gray-900">Menu at a Glance</h3>
                  <p className="text-gray-600 mt-2">Browse wraps, combos, rice meals, and special orders with quick pricing and availability indicators.</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {topItems.map(item => (
                <div key={item.id} className="bg-white/90 glass rounded-[2rem] overflow-hidden shadow-xl flex flex-col">
                  <div className="h-32 sm:h-40 overflow-hidden">
                    <img
                      src={item.image || `https://via.placeholder.com/600x400?text=${encodeURIComponent(item.name)}`}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-4 sm:p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-gray-900">{item.name}</h3>
                      <p className="text-sm text-gray-500 mt-2">{item.desc}</p>
                    </div>
                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <span className="text-brand-orange font-black text-lg">₦{item.price.toLocaleString()}</span>
                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <button aria-label={`Add ${item.name} to cart`} onClick={() => addToCart(item)} className="w-full sm:w-auto px-4 py-3 bg-brand-orange text-white rounded-full font-bold">Add</button>
                        <button aria-label={`Order more ${item.name}`} onClick={() => { setSelectedCategory(item.category); setActivePage('menu'); }} className="w-full sm:w-auto px-4 py-3 border border-gray-200 rounded-full font-semibold">Order More</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section ref={menuRef} className={activePage === 'menu' ? 'max-w-7xl mx-auto px-6 py-20' : 'hidden'}>
          <div className="text-center mb-12">
            <p className="text-sm uppercase tracking-[0.4em] text-brand-orange font-bold">Menu</p>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mt-4">Choose your favorite Nigerian dishes</h2>
            <p className="text-gray-600 mt-4 max-w-2xl mx-auto">From rich Jollof to hearty Egusi, add items to your cart and checkout from one page.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-5 py-3 rounded-full font-semibold transition ${selectedCategory === category ? 'bg-brand-orange text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-brand-orange/10'}`}
              >
                {category}
              </button>
            ))}
          </div>
          {selectedCategory !== 'All' && (
            <p className="text-center text-sm text-gray-500 mb-8">Showing {selectedCategory} items only.</p>
          )}
          <div className="grid gap-8 md:grid-cols-3">
            {filteredMenuData.length > 0 ? filteredMenuData.map(item => (
              <div key={item.id} className="bg-white/80 glass rounded-[2rem] overflow-hidden shadow-xl border border-white/20 hover:shadow-2xl transition backdrop-blur-sm">
                <div className="h-56 overflow-hidden">
                  <img 
                    src={item.image || `https://via.placeholder.com/600x500/DC143C/FFFFFF?text=${encodeURIComponent(item.name)}`}
                    alt={item.name} 
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover" 
                    onError={(e) => e.target.src="https://source.unsplash.com/600x500/?nigerian-food"}
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-black uppercase tracking-tight">{item.name}</h3>
                  <p className="text-sm text-gray-500 mt-3">{item.desc}</p>
                  <div className="mt-6 flex items-center justify-between gap-4">
                    <span className="text-2xl font-black text-brand-orange">₦{item.price.toLocaleString()}</span>
                    <button
                      onClick={() => addToCart(item)}
                      disabled={!item.available}
                      className={`px-4 py-3 rounded-full font-bold text-sm uppercase transition ${item.available ? 'bg-brand-orange text-white hover:bg-brand-orange-dark' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
                    >
                      {item.available ? 'Add' : 'Out of stock'}
                    </button>
                  </div>
                  {item.note && (
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{item.note}</p>
                  )}
                </div>
              </div>
            )) : (
              <div className="md:col-span-3 rounded-[2rem] bg-white/80 glass p-10 text-center shadow-xl border border-white/20 backdrop-blur-sm">
                <p className="text-gray-600 text-lg">No items match your search or category. Please try another filter.</p>
              </div>
            )}
          </div>
        </section>

        <section className={activePage === 'cart' ? 'bg-gray-50 py-16' : 'hidden'}>
          <div className="max-w-7xl mx-auto px-6 grid gap-10 lg:grid-cols-[2fr_1fr] items-start">
            <div>
              <h3 className="text-3xl font-black text-brand-orange mb-4">Your Tray</h3>
              {cart.length === 0 ? (
                <div className="rounded-[2rem] bg-white/90 glass p-10 shadow-xl border border-gray-200/50 text-center backdrop-blur-sm">
                  <p className="text-gray-500 text-lg">Your tray is empty. Add delicious food from the menu to start checkout.</p>
                </div>
              ) : (
                <div className="rounded-[2rem] bg-white/90 glass p-8 shadow-xl border border-gray-200/50 space-y-4 backdrop-blur-sm">
                  {cart.map((item, i) => (
                    <div key={i} className="flex justify-between items-center gap-4 border-b border-gray-100 pb-4">
                      <div>
                        <p className="font-black uppercase text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-500">₦{item.price.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-brand-orange">₦{item.price.toLocaleString()}</span>
                        <button
                          onClick={() => removeFromCart(i)}
                          className="w-7 h-7 rounded-full bg-red-100 text-red-500 hover:bg-red-500 hover:text-white font-black text-sm flex items-center justify-center transition"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="pt-4 space-y-2 border-t border-gray-100">
                    <div className="flex justify-between text-gray-600 text-sm">
                      <span>Subtotal</span>
                      <span>₦{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-600 text-sm">
                      <span>Delivery fee</span>
                      <span>₦{DELIVERY_FEE.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-500 text-sm">
                      <span>Paystack fee</span>
                      <span>₦{paystackFee.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-3xl font-black text-gray-900 pt-2 border-t border-gray-200">
                      <span>Total</span>
                      <span className="text-brand-orange">₦{total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div ref={cartRef} className="space-y-6">
              <div className="rounded-[2rem] bg-white/90 glass p-6 sm:p-8 shadow-xl border border-gray-200/50 backdrop-blur-sm">
                <h4 className="text-2xl font-black text-gray-900 mb-4">Delivery Details</h4>
                <div className="space-y-4">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Your full name"
                    className={`w-full px-5 py-4 border-2 rounded-3xl text-lg text-gray-900 bg-white focus:outline-none transition-colors ${
                      customerName.trim() ? 'border-green-500 focus:border-green-600' : 'border-gray-300 focus:border-brand-orange'
                    }`}
                  />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Mobile number"
                    className={`w-full px-5 py-4 border-2 rounded-3xl text-lg text-gray-900 bg-white focus:outline-none transition-colors ${
                      customerPhone.trim() ? 'border-green-500 focus:border-green-600' : 'border-gray-300 focus:border-brand-orange'
                    }`}
                  />
                  <input
                    type="text"
                    value={deliveryLocation}
                    onChange={(e) => setDeliveryLocation(e.target.value)}
                    placeholder="Enter your full address..."
                    className={`w-full px-5 py-4 border-2 rounded-3xl text-lg text-gray-900 bg-white focus:outline-none transition-colors ${
                      deliveryLocation.trim() ? 'border-green-500 focus:border-green-600' : 'border-gray-300 focus:border-brand-orange'
                    }`}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-3">Include landmarks, street name and house number for fast delivery.</p>
              </div>
              <button
                onClick={sendOrder}
                className="w-full bg-brand-orange text-white py-5 rounded-full font-black text-xl uppercase tracking-wider shadow-2xl hover:bg-brand-orange-dark transition"
              >
                Checkout with Paystack
              </button>
              {paymentMessage && (
                <div className="mt-4 rounded-3xl bg-green-50 border border-green-200 p-4 text-green-700 text-sm font-semibold">
                  {paymentMessage}
                </div>
              )}
            </div>
          </div>
        </section>

        <section ref={trackRef} className={activePage === 'track' ? 'bg-white py-20' : 'hidden'}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-10">
              <p className="text-sm uppercase tracking-[0.4em] text-brand-orange font-bold">Track Order</p>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 mt-4">Check your order status</h2>
              <p className="text-gray-600 mt-4 max-w-2xl mx-auto">Enter your Order ID and phone or email to see the latest delivery progress.</p>
            </div>
            <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] items-start">
              <div className="rounded-[2rem] bg-brand-orange/10 p-10 shadow-xl border border-brand-orange/20">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Order ID</label>
                <input
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="e.g. ORD-2045"
                  className="w-full px-5 py-4 rounded-3xl border-2 border-gray-300 bg-white text-gray-900 focus:outline-none focus:border-brand-orange transition"
                />
                <label className="block text-sm font-semibold text-gray-700 mt-6 mb-2">Email or Phone</label>
                <input
                  value={orderEmailOrPhone}
                  onChange={(e) => setOrderEmailOrPhone(e.target.value)}
                  placeholder="Phone or email"
                  className="w-full px-5 py-4 rounded-3xl border-2 border-gray-300 bg-white text-gray-900 focus:outline-none focus:border-brand-orange transition"
                />
                <button
                  onClick={trackOrder}
                  className="mt-8 w-full bg-brand-orange text-white py-4 rounded-full font-black uppercase tracking-wider shadow-2xl hover:bg-brand-orange-dark transition"
                >
                  Track Order
                </button>
                {orderReference && (
                  <button
                    onClick={verifyPayment}
                    className="mt-4 w-full bg-brand-black text-white py-4 rounded-full font-black uppercase tracking-wider shadow-2xl hover:bg-gray-900 transition"
                  >
                    Verify Payment
                  </button>
                )}
                <p className="text-sm text-gray-500 mt-4">Use the Order ID you received after checkout. This tracker now calls the backend status API.</p>
              </div>
              <div className="rounded-[2rem] bg-white/90 glass p-10 shadow-xl border border-gray-200/50">
                {trackError ? (
                  <div className="rounded-3xl bg-red-100 border border-red-200 p-6 text-red-700 font-semibold">
                    {trackError}
                  </div>
                ) : trackStatus ? (
                  <div>
                    <div className="mb-8">
                      <p className="text-sm uppercase tracking-[0.4em] text-brand-orange font-bold">Current status</p>
                      <h3 className="text-3xl font-black text-gray-900 mt-3">{trackStatus}</h3>
                      <p className="text-gray-600 mt-2">Latest update for {orderId.toUpperCase()}.</p>
                    </div>
                    <div className="space-y-4">
                      {orderStatusSteps.map((step, index) => {
                        const activeIndex = orderStatusSteps.indexOf(trackStatus);
                        const isComplete = index <= activeIndex;
                        return (
                          <div key={step} className="flex items-center gap-4">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 ${isComplete ? 'bg-brand-orange text-white border-brand-orange' : 'bg-white text-gray-400 border-gray-300'}`}>
                              {isComplete ? '✔' : index + 1}
                            </div>
                            <div>
                              <p className={`font-bold ${isComplete ? 'text-gray-900' : 'text-gray-400'}`}>{step}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-600">
                    <p className="text-lg font-semibold">Enter an order ID to see status progress.</p>
                    <p className="mt-4">This is a demo tracker for your restaurant website.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section ref={locationRef} className={activePage === 'location' ? 'max-w-7xl mx-auto px-6 py-20' : 'hidden'}>
          <div className="text-center mb-12">
            <p className="text-sm uppercase tracking-[0.4em] text-brand-orange font-bold">Location</p>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mt-4">Find Us</h2>
          </div>
          <div className="rounded-[2rem] overflow-hidden shadow-2xl border border-gray-200">
            <div className="bg-gray-900 p-10 text-white text-center">
              <p className="text-2xl font-bold">Odiolowo street, makun, Sagamu 121102, Ogun State</p>
              <p className="mt-4 text-gray-300">The home of premium Nigerian dishes, ready for your order.</p>
                  <button
                    onClick={() => window.open('https://wa.me/12368918149?text='+encodeURIComponent('Hello Breadwrapz Foods, I would like to make a reservation.'))}
                    className="inline-flex items-center justify-center glass bg-brand-orange/90 hover:bg-brand-orange-dark/90 text-white font-bold py-3 px-6 rounded-full shadow-lg transition backdrop-blur-sm border border-white/20"
                  >
                    Reserve on WhatsApp
                  </button>
                <button
                  onClick={() => window.open(`https://maps.google.com/maps?q=${7.717851},${5.253719}&z=15`)}
                  className="inline-flex items-center justify-center glass bg-white/20 hover:bg-white/30 text-white font-bold py-3 px-6 rounded-full shadow-lg transition backdrop-blur-sm border border-white/20"
                >
                  Get Directions
                </button>
              </div>
            <div className="h-96 bg-gray-300 overflow-hidden">
              <iframe
                src="https://maps.google.com/maps?q=7.717851,5.253719&z=15&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                  title="Breadwrapz Restaurant Location"
              ></iframe>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
export default App;
