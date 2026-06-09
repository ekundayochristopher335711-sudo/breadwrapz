
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { menuDataNoImages } from './menuData.js';
import Footer from './components/Footer.jsx';
import { supabase } from './lib/supabase.js';

const API = import.meta.env.VITE_API_URL || '';
// Decoded from Plus Code 489F+47 Abeokuta → full code 6FV5489F+47
const RESTAURANT_LOCATION = { lat: 7.1178, lng: 3.3232 };
const RESTAURANT_MAPS_QUERY = encodeURIComponent('489F+47 Abeokuta');
const DELIVERY_RATE_PER_KM = 50;
const MIN_DELIVERY_FEE = 50;

function calcPaystackFee(amount) {
  if (amount <= 0) return 0;
  let fee = Math.ceil(amount * 0.015);
  if (amount > 2500) fee += 100;
  return Math.min(fee, 2000);
}

function calculateDistanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateDeliveryFee(distanceKm) {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return MIN_DELIVERY_FEE;
  return Math.max(MIN_DELIVERY_FEE, Math.ceil(distanceKm) * DELIVERY_RATE_PER_KM);
}

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activePage, setActivePage] = useState('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasScrolledPastHero, setHasScrolledPastHero] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState(() => {
    try {
      const raw = localStorage.getItem('cart');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [popularityCounts, setPopularityCounts] = useState(() => {
    try {
      const raw = localStorage.getItem('popularityCounts');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [deliveryCoords, setDeliveryCoords] = useState(null);
  const [deliveryDistanceKm, setDeliveryDistanceKm] = useState(null);
  const [deliveryFee, setDeliveryFee] = useState(MIN_DELIVERY_FEE);
  const [locationError, setLocationError] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authStatusMessage, setAuthStatusMessage] = useState('');
  const [passwordRecoveryMode, setPasswordRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [approvedReviews, setApprovedReviews] = useState([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [backendOrderHistory, setBackendOrderHistory] = useState([]);
  const [savedAddresses, setSavedAddresses] = useState(() => {
    try {
      const raw = localStorage.getItem('savedAddresses');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [orderHistory, setOrderHistory] = useState(() => {
    try {
      const raw = localStorage.getItem('orderHistory');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [orderId, setOrderId] = useState('');
  const [orderEmailOrPhone, setOrderEmailOrPhone] = useState('');
  const [orderReference, setOrderReference] = useState('');
  const [paymentMessage, setPaymentMessage] = useState('');
  const [trackStatus, setTrackStatus] = useState(null);
  const [trackError, setTrackError] = useState('');
  const [showPhoneNumber, setShowPhoneNumber] = useState(false);

  const navRef = useRef(null);
  const homeRef = useRef(null);
  const menuRef = useRef(null);
  const locationRef = useRef(null);
  const cartRef = useRef(null);
  const trackRef = useRef(null);
  const deliveryRef = useRef(null);

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
      fetch(`${API}/verify-payment`, {
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

  const displayNavbar = true;

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

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + (item.quantity || 1), 0), [cart]);
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0), [cart]);
  const paystackFee = useMemo(() => calcPaystackFee(subtotal + deliveryFee), [subtotal, deliveryFee]);
  const total = useMemo(() => subtotal + deliveryFee + paystackFee, [subtotal, deliveryFee, paystackFee]);

  useEffect(() => {
    try {
      localStorage.setItem('popularityCounts', JSON.stringify(popularityCounts));
      localStorage.setItem('cart', JSON.stringify(cart));
      localStorage.setItem('savedAddresses', JSON.stringify(savedAddresses));
      localStorage.setItem('orderHistory', JSON.stringify(orderHistory));
      localStorage.setItem('customerProfile', JSON.stringify(user || { customerName, customerEmail, customerPhone }));
      localStorage.setItem('authToken', authToken);
    } catch {
      // ignore localStorage write errors
    }
  }, [popularityCounts, cart, savedAddresses, orderHistory, user, authToken, customerName, customerEmail, customerPhone]);

  useEffect(() => {
    loadApprovedReviews();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) applySession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecoveryMode(true);
        setActivePage('profile');
        if (session) applySession(session);
      } else if (session) {
        applySession(session);
      } else {
        setAuthToken('');
        setUser(null);
        setPasswordRecoveryMode(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  function applySession(session) {
    const u = session.user;
    const meta = u.user_metadata || {};
    setAuthToken(session.access_token);
    setUser({ userId: u.id, name: meta.name || '', email: u.email || '', phone: meta.phone || '' });
    if (meta.name) setCustomerName(meta.name);
    if (u.email) setCustomerEmail(u.email);
    if (meta.phone) setCustomerPhone(meta.phone);
  }

  useEffect(() => {
    if (!user?.userId) {
      setBackendOrderHistory([]);
      return;
    }

    const fetchOrders = async () => {
      try {
        const { data: orders } = await supabase
          .from('orders')
          .select('order_id, reference, amount, status, delivery_location, delivery_fee, delivery_distance_km, created_at')
          .eq('user_id', user.userId)
          .order('created_at', { ascending: false });

        setBackendOrderHistory(
          (orders || []).map((o) => ({
            orderId: o.order_id,
            reference: o.reference,
            amount: o.amount,
            status: o.status,
            deliveryLocation: o.delivery_location,
            deliveryFee: o.delivery_fee,
            deliveryDistanceKm: o.delivery_distance_km,
            createdAt: o.created_at,
          })),
        );
      } catch {
        // ignore
      }
    };

    fetchOrders();
  }, [user]);

  const topItems = useMemo(() => {
    const itemsWithCount = menuDataNoImages.map(i => ({ ...i, orders: popularityCounts[i.id] || 0 }));
    itemsWithCount.sort((a, b) => b.orders - a.orders || (b.available === a.available ? 0 : (a.available ? -1 : 1)));
    return itemsWithCount.slice(0, 3);
  }, [popularityCounts]);

  const historyToShow = user ? backendOrderHistory : orderHistory;

  const trackOrder = async () => {
    setTrackError('');
    const normalizedOrderId = orderId.trim().toUpperCase();

    if (!normalizedOrderId) {
      setTrackStatus(null);
      setTrackError('Please enter your order ID.');
      return;
    }

    try {
      const response = await fetch(`${API}/track-order/${encodeURIComponent(normalizedOrderId)}`);
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
      const response = await fetch(`${API}/verify-payment`, {
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

  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find((cartItem) => cartItem.id === item.id);
      if (existing) {
        return prev.map((cartItem) => cartItem.id === item.id
          ? { ...cartItem, quantity: (cartItem.quantity || 1) + 1 }
          : cartItem
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    setPopularityCounts(prev => ({
      ...prev,
      [item.id]: (prev[item.id] || 0) + 1,
    }));
    showToast(`${item.name} added to cart`);
  };

  const removeFromCart = (itemId) => {
    setCart(prev => prev.flatMap((cartItem) => {
      if (cartItem.id !== itemId) return cartItem;
      const quantity = cartItem.quantity || 1;
      if (quantity > 1) {
        return { ...cartItem, quantity: quantity - 1 };
      }
      return [];
    }));
  };

  const logout = () => {
    supabase.auth.signOut();
    setAuthError('');
    showToast('Logged out successfully');
  };

  const authenticate = async (mode) => {
    setAuthError('');
    setAuthStatusMessage('');

    if (!customerEmail.trim() || !authPassword) {
      setAuthError('Please enter email and password.');
      return;
    }

    try {
      if (mode === 'register') {
        if (!customerName.trim()) {
          setAuthError('Please enter your name.');
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: customerEmail.trim(),
          password: authPassword,
          options: { data: { name: customerName.trim(), phone: customerPhone.trim() } },
        });
        if (error) { setAuthError(error.message); return; }
        setAuthStatusMessage('Verification link sent. Check your email before logging in.');
        setAuthMode('login');
        setAuthPassword('');
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: customerEmail.trim(),
        password: authPassword,
      });
      if (error) { setAuthError(error.message); return; }
      // onAuthStateChange fires and calls applySession
      setAuthPassword('');
      setActivePage('profile');
      showToast('Welcome back!');
    } catch (error) {
      console.error('auth error:', error);
      setAuthError('Unable to complete authentication. Please try again.');
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    const { error } = await supabase.auth.updateUser({
      data: { name: customerName, phone: customerPhone },
    });
    if (error) {
      showToast('Failed to save profile', 'error');
    } else {
      setUser((prev) => ({ ...prev, name: customerName, phone: customerPhone }));
      showToast('Profile saved!');
    }
  };

  const forgotPassword = async () => {
    if (!customerEmail.trim()) { setAuthError('Please enter your email address.'); return; }
    setAuthError('');
    const { error } = await supabase.auth.resetPasswordForEmail(customerEmail.trim(), {
      redirectTo: window.location.origin,
    });
    if (error) { setAuthError(error.message); } else {
      setAuthStatusMessage('Reset link sent! Check your email.');
    }
  };

  const updatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error'); return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { showToast('Failed to update password', 'error'); } else {
      setPasswordRecoveryMode(false);
      setNewPassword('');
      showToast('Password updated successfully!');
    }
  };

  const loadApprovedReviews = async () => {
    const { data } = await supabase
      .from('reviews')
      .select('id, user_name, rating, comment, created_at')
      .eq('approved', true)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setApprovedReviews(data);
  };

  const submitReview = async () => {
    if (!user) {
      showToast('Please log in to submit a review', 'error');
      return;
    }
    if (!reviewComment.trim()) { showToast('Please write a comment', 'error'); return; }
    setReviewSubmitting(true);
    const { error } = await supabase.from('reviews').insert({
      user_id: user.userId,
      user_name: customerName || customerEmail.split('@')[0],
      rating: reviewRating,
      comment: reviewComment.trim(),
    });
    setReviewSubmitting(false);
    if (error) {
      console.error('Review submission error:', error);
      showToast(`Failed to submit review: ${error.message}`, 'error');
    } else {
      showToast('Review submitted! Awaiting approval.');
      setReviewComment('');
      setReviewRating(5);
    }
  };

  const saveCurrentAddress = () => {
    const address = deliveryLocation.trim();
    if (!address) return;
    setSavedAddresses((prev) => {
      if (prev.includes(address)) return prev;
      showToast('Address saved!');
      return [address, ...prev].slice(0, 6);
    });
  };

  const requestDeliveryLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not available in this browser.');
      return;
    }

    setLocationError('Requesting location permission...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const distanceKm = calculateDistanceKm(RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng, latitude, longitude);
        const fee = calculateDeliveryFee(distanceKm);
        setDeliveryCoords({ lat: latitude, lng: longitude });
        setDeliveryDistanceKm(distanceKm);
        setDeliveryFee(fee);
        setDeliveryLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        setLocationError('');
      },
      () => {
        setLocationError('Location permission denied or unavailable. Please enter your address manually or try again.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  const clearDeliveryLocation = () => {
    setDeliveryCoords(null);
    setDeliveryDistanceKm(null);
    setDeliveryFee(MIN_DELIVERY_FEE);
    setLocationError('');
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
      const headers = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }
      const response = await fetch(`${API}/initialize-payment`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: customerEmail.trim(),
          contact: customerPhone.trim(),
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          items: cart,
          deliveryLocation: deliveryLocation.trim(),
          deliveryDistanceKm,
          deliveryFee,
          deliveryCoords,
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
      setOrderHistory((prev) => [
        {
          orderId: data.order.orderId,
          reference: data.order.reference,
          amount: data.order.amount,
          status: data.order.status,
          deliveryLocation: deliveryLocation.trim(),
          deliveryFee,
          deliveryDistanceKm,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ].slice(0, 20));
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
        <nav ref={navRef} className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">

            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer flex-shrink-0" onClick={() => { setActivePage('home'); scrollTo(homeRef); }}>
              <img src="/images/logo.png" alt="Breadwrapz" className="h-10 w-10 object-contain" />
              <span className="font-black text-gray-900 text-base hidden sm:block tracking-tight">BREADWRAPZ</span>
            </div>

            {/* Desktop Search */}
            <div className="relative hidden md:block flex-1 max-w-sm mx-6">
              <input
                type="text"
                placeholder="Search for food..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => searchTerm && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full pl-4 pr-10 py-2 rounded-full border border-gray-300 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:border-brand-orange transition"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                  {searchSuggestions.map((s, i) => (
                    <div key={i} className="px-4 py-3 hover:bg-orange-50 cursor-pointer text-sm text-gray-800 border-b border-gray-100 last:border-0"
                      onMouseDown={() => { setSearchTerm(s); setShowSuggestions(false); }}>
                      {s}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-1">
              {['home','menu','location','track','profile'].map(page => (
                <button key={page} onClick={() => setActivePage(page)}
                  className={`px-3 py-2 rounded-lg text-sm font-bold uppercase tracking-wide transition ${activePage === page ? 'text-brand-orange' : 'text-gray-700 hover:text-brand-orange'}`}>
                  {page}
                </button>
              ))}
              <button onClick={() => setActivePage('cart')}
                className="ml-2 flex items-center gap-1.5 bg-brand-orange text-white px-4 py-2 rounded-full text-sm font-black hover:bg-brand-orange-dark transition">
                🛒 Cart {cartCount > 0 && <span className="bg-white text-brand-orange rounded-full w-5 h-5 flex items-center justify-center text-xs font-black">{cartCount}</span>}
              </button>
            </div>

            {/* Mobile Controls */}
            <div className="flex md:hidden items-center gap-2">
              <button onClick={() => setActivePage('cart')}
                className="flex items-center gap-1 bg-brand-orange text-white px-3 py-1.5 rounded-full text-sm font-black hover:bg-brand-orange-dark transition">
                🛒 {cartCount > 0 && <span className="bg-white text-brand-orange rounded-full w-4 h-4 flex items-center justify-center text-xs font-black">{cartCount}</span>}
              </button>
              <button onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {isMenuOpen && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="md:hidden absolute top-full right-0 w-[60vw] max-w-xs min-h-[calc(100vh-4rem)] bg-white border border-gray-100 px-4 pb-4 shadow-lg rounded-bl-3xl rounded-tl-3xl">
              {/* Mobile Search */}
              <div className="relative mt-3 mb-3">
                <input type="text" placeholder="Search for food..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => searchTerm && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="w-full pl-4 pr-10 py-2.5 rounded-full border border-gray-300 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:border-brand-orange transition"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                {showSuggestions && searchSuggestions.length > 0 && (
                  <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                    {searchSuggestions.map((s, i) => (
                      <div key={i} className="px-4 py-3 hover:bg-orange-50 cursor-pointer text-sm text-gray-800"
                        onMouseDown={() => { setSearchTerm(s); setShowSuggestions(false); }}>
                        {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Mobile Nav Links */}
              <div className="grid grid-cols-1 gap-3">
                {['home','menu','location','track','profile'].map(page => (
                  <button key={page} onClick={() => { setActivePage(page); setIsMenuOpen(false); }}
                    className={`w-full py-3 rounded-xl text-sm font-bold uppercase tracking-wide transition ${activePage === page ? 'bg-brand-orange text-white' : 'bg-gray-100 text-gray-700 hover:bg-orange-50 hover:text-brand-orange'}`}>
                    {page}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </nav>
      )}

      <main className={displayNavbar ? 'pt-16 sm:pt-20' : 'pt-0'}>
        <section ref={homeRef} className={activePage === 'home' ? 'relative min-h-screen w-full overflow-hidden bg-[#f86f1d] text-white' : 'hidden'}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.12),_transparent_25%)]" />
          <div className="absolute inset-0 bg-[url('/images/landingpage.png')] bg-cover bg-center opacity-20" />
          <div className="relative z-10 flex flex-col items-center justify-center min-h-screen">
            <div className="max-w-7xl mx-auto px-6">
              <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] items-center">
                <div className="space-y-8 text-left">
                  <span className="inline-flex items-center rounded-full bg-white/15 px-4 py-2 text-sm uppercase tracking-[0.35em] text-white/90 shadow-inner shadow-black/10">
                    Get your best food in Abeokuta
                  </span>
                  <h1 className="text-6xl sm:text-7xl md:text-8xl font-black leading-tight tracking-tight">
                    Fresh Nigerian meals delivered fast.
                  </h1>
                  <p className="max-w-xl text-xl sm:text-2xl text-white/90">
                    Order premium wraps, rice meals and combos with instant checkout, fast delivery, and easy tracking.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <button
                      onClick={() => setActivePage('menu')}
                      className="rounded-full bg-black text-white px-8 py-4 text-lg font-black uppercase tracking-[0.16em] shadow-2xl shadow-black/20 transition hover:bg-gray-900"
                    >
                      Order Now
                    </button>
                    <button
                      onClick={() => setActivePage('location')}
                      className="rounded-full border-2 border-white/80 bg-white/10 px-8 py-4 text-lg font-black uppercase tracking-[0.16em] text-white transition hover:bg-white/20"
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
                      className="w-full h-[700px] object-cover"
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

        <section className={activePage === 'home' ? 'bg-gray-50 py-20' : 'hidden'}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <p className="text-sm uppercase tracking-[0.4em] text-brand-orange font-bold">Reviews</p>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 mt-4">What our customers say</h2>
              <p className="text-gray-500 mt-4 max-w-xl mx-auto">Real people, real orders, real satisfaction.</p>
            </div>

            {/* Approved reviews grid */}
            {approvedReviews.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No reviews yet — be the first!</p>
            ) : (
              <div className="grid gap-6 md:grid-cols-3 mb-12">
                {approvedReviews.map((review) => (
                  <div key={review.id} className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col gap-4">
                    <div className="flex gap-0.5 text-brand-orange text-lg">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={i < review.rating ? 'text-brand-orange' : 'text-gray-200'}>★</span>
                      ))}
                    </div>
                    <p className="text-gray-700 text-base leading-relaxed flex-1">"{review.comment}"</p>
                    <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                      <div className="w-10 h-10 rounded-full bg-brand-orange/10 flex items-center justify-center font-black text-brand-orange text-sm">
                        {review.user_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-gray-900 text-sm">{review.user_name}</p>
                        <p className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Review submission */}
            <div className="max-w-xl mx-auto">
              {user ? (
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                  <h3 className="font-black text-gray-900 text-lg mb-5">Leave a Review</h3>
                  {/* Star selector */}
                  <div className="flex gap-1 mb-4">
                    {[1,2,3,4,5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setReviewRating(star)}
                        className={`text-3xl transition ${star <= reviewRating ? 'text-brand-orange' : 'text-gray-200 hover:text-brand-orange/50'}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Share your experience..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-brand-orange focus:bg-white transition resize-none"
                  />
                  <button
                    onClick={submitReview}
                    disabled={reviewSubmitting}
                    className="mt-3 w-full rounded-2xl bg-brand-orange text-white py-3 font-bold text-sm uppercase tracking-wide shadow-lg hover:bg-brand-orange-dark disabled:opacity-60 transition"
                  >
                    {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                  </button>
                  <p className="text-xs text-gray-400 mt-2 text-center">Reviews are reviewed before being published.</p>
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 text-center">
                  <p className="text-gray-500 text-sm mb-4">Sign in to leave a review</p>
                  <button
                    onClick={() => { setActivePage('profile'); setAuthMode('login'); }}
                    className="px-6 py-3 rounded-2xl bg-brand-orange text-white font-bold text-sm uppercase tracking-wide hover:bg-brand-orange-dark transition"
                  >
                    Sign In
                  </button>
                </div>
              )}
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
          <div className="max-w-7xl mx-auto px-6">
            <h3 className="text-4xl font-black text-brand-orange mb-12">Your Tray</h3>
            {cart.length === 0 ? (
              <div className="rounded-[2rem] bg-white/90 glass p-10 shadow-xl border border-gray-200/50 text-center backdrop-blur-sm">
                <p className="text-gray-500 text-lg">Your tray is empty. Add delicious food from the menu to start checkout.</p>
              </div>
            ) : (
              <div className="grid gap-10 lg:grid-cols-[1fr_350px] items-start">
                {/* Cart Items Grid */}
                <div className="grid gap-6 sm:grid-cols-2">
                  {cart.map((item) => {
                    const menuItem = menuDataNoImages.find(m => m.id === item.id);
                    return (
                      <div key={item.id} className="bg-white/90 glass rounded-[2rem] overflow-hidden shadow-xl border border-gray-200/50 hover:shadow-2xl transition backdrop-blur-sm">
                        {/* Product Image */}
                        <div className="h-48 overflow-hidden bg-gray-100">
                          <img src={menuItem?.image || '/images/logo.png'} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        
                        {/* Product Details */}
                        <div className="p-6 flex flex-col">
                          <h4 className="text-xl font-black text-gray-900 mb-1">{item.name}</h4>
                          <p className="text-sm text-gray-500 mb-3">{menuItem?.desc}</p>
                          
                          {/* Price */}
                          <div className="mb-4">
                            <p className="text-2xl font-black text-brand-orange">₦{item.price.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">each</p>
                          </div>
                          
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-3 mb-4 bg-gray-50 rounded-full p-2">
                            <button
                              onClick={() => {
                                const newCart = [...cart];
                                const idx = newCart.findIndex(c => c.id === item.id);
                                if (newCart[idx].quantity > 1) newCart[idx].quantity--;
                                setCart(newCart);
                              }}
                              className="w-8 h-8 rounded-full bg-white text-gray-900 font-bold hover:bg-brand-orange hover:text-white transition"
                            >
                              −
                            </button>
                            <span className="flex-1 text-center font-bold text-gray-900">{item.quantity || 1}</span>
                            <button
                              onClick={() => {
                                const newCart = [...cart];
                                const idx = newCart.findIndex(c => c.id === item.id);
                                newCart[idx].quantity = (newCart[idx].quantity || 1) + 1;
                                setCart(newCart);
                              }}
                              className="w-8 h-8 rounded-full bg-white text-gray-900 font-bold hover:bg-brand-orange hover:text-white transition"
                            >
                              +
                            </button>
                          </div>
                          
                          {/* Line Total & Remove */}
                          <div className="flex items-center justify-between mb-4 pt-3 border-t border-gray-100">
                            <div>
                              <p className="text-xs text-gray-500">Line total</p>
                              <p className="font-black text-gray-900">₦{(item.price * (item.quantity || 1)).toLocaleString()}</p>
                            </div>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="w-10 h-10 rounded-full bg-red-100 text-red-500 hover:bg-red-500 hover:text-white font-black text-lg flex items-center justify-center transition"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Order Summary Sidebar */}
                <div className="rounded-[2rem] bg-white/90 glass p-8 shadow-xl border border-gray-200/50 backdrop-blur-sm sticky top-32">
                  <h4 className="text-2xl font-black text-gray-900 mb-6">Order Summary</h4>
                  <div className="space-y-3 mb-6 pb-6 border-b border-gray-100">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Subtotal</span>
                      <span>₦{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Delivery fee</span>
                      <span>₦{deliveryFee.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Paystack fee</span>
                      <span>₦{paystackFee.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-2xl font-black text-gray-900 mb-6">
                    <span>Total</span>
                    <span className="text-brand-orange">₦{total.toLocaleString()}</span>
                  </div>
                  <button
                    onClick={() => scrollTo(deliveryRef)}
                    className="w-full px-6 py-4 rounded-full bg-brand-orange text-white font-black uppercase tracking-wider transition hover:bg-brand-orange-dark"
                  >
                    Fill Delivery Details ↓
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Delivery & Checkout Section */}
          {cart.length > 0 && (
            <div ref={deliveryRef} className="mt-16">
              <h3 className="text-3xl font-black text-gray-900 mb-8">Delivery Information</h3>
              <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
                <div className="rounded-[2rem] bg-white/90 glass p-6 sm:p-8 shadow-xl border border-gray-200/50 backdrop-blur-sm">
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
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="Email address"
                      className={`w-full px-5 py-4 border-2 rounded-3xl text-lg text-gray-900 bg-white focus:outline-none transition-colors ${
                        customerEmail.trim() ? 'border-green-500 focus:border-green-600' : 'border-gray-300 focus:border-brand-orange'
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
                      placeholder="Enter your full address or coordinates"
                      className={`w-full px-5 py-4 border-2 rounded-3xl text-lg text-gray-900 bg-white focus:outline-none transition-colors ${
                        deliveryLocation.trim() ? 'border-green-500 focus:border-green-600' : 'border-gray-300 focus:border-brand-orange'
                      }`}
                    />
                  </div>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={requestDeliveryLocation}
                      className="w-full sm:w-auto px-5 py-4 rounded-full bg-brand-orange text-white font-bold transition hover:bg-brand-orange-dark"
                    >
                      Use my location
                    </button>
                    <button
                      onClick={saveCurrentAddress}
                      className="w-full sm:w-auto px-5 py-4 rounded-full border-2 border-brand-orange text-brand-orange font-bold transition hover:bg-brand-orange/10"
                    >
                      Save address
                    </button>
                    <button
                      onClick={clearDeliveryLocation}
                      className="w-full sm:w-auto px-5 py-4 rounded-full border-2 border-gray-300 text-gray-700 font-bold transition hover:bg-gray-100"
                    >
                      Clear location
                    </button>
                  </div>
                  {locationError && <p className="text-sm text-red-600 mt-3">{locationError}</p>}
                  {deliveryDistanceKm !== null && (
                    <p className="text-sm text-gray-600 mt-3">
                      Delivery distance: <span className="font-semibold">{deliveryDistanceKm.toFixed(1)} km</span> • fee: <span className="font-semibold">₦{deliveryFee.toLocaleString()}</span>
                    </p>
                  )}
                  {deliveryCoords && (
                    <div className="mt-4 overflow-hidden rounded-3xl border border-gray-200">
                    <iframe
                      src={`https://maps.google.com/maps?q=${deliveryCoords.lat},${deliveryCoords.lng}&z=15&output=embed`}
                      className="w-full h-64"
                      loading="lazy"
                      title="Your delivery location"
                    />
                  </div>
                )}
                <p className="text-sm text-gray-500 mt-3">Include landmarks, street name and house number for fast delivery.</p>
                </div>

                {/* Checkout Button */}
                <div className="rounded-[2rem] bg-white/90 glass p-8 shadow-xl border border-gray-200/50 backdrop-blur-sm h-fit sticky top-32">
                  <button
                    onClick={sendOrder}
                    className="w-full bg-brand-orange text-white py-6 rounded-full font-black text-lg uppercase tracking-wider shadow-2xl hover:bg-brand-orange-dark transition mb-4"
                  >
                    Checkout with Paystack
                  </button>
                  {paymentMessage && (
                    <div className="rounded-3xl bg-green-50 border border-green-200 p-4 text-green-700 text-sm font-semibold">
                      {paymentMessage}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
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

        <section className={activePage === 'profile' ? 'bg-gradient-to-br from-gray-50 to-white py-20' : 'hidden'}>
          <div className="max-w-2xl mx-auto px-4 sm:px-6">
            {/* Header */}
            <div className="text-center mb-10">
              <p className="text-xs uppercase tracking-[0.3em] text-brand-orange font-bold">My Account</p>
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mt-3">Your Profile</h2>
            </div>

            {!user ? (
              /* Logged-out: centered auth card */
              <div className="rounded-3xl bg-white/95 backdrop-blur-sm p-6 sm:p-8 shadow-lg border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-brand-orange/10 flex items-center justify-center text-2xl">👤</div>
                  <h3 className="text-xl font-black text-gray-900">
                    {authMode === 'register' ? 'Create Account' : authMode === 'forgot' ? 'Reset Password' : 'Sign In'}
                  </h3>
                </div>

                {authMode === 'forgot' ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-500">Enter your email and we'll send you a reset link.</p>
                    <div>
                      <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Email Address</label>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-2xl text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-brand-orange focus:bg-white transition"
                      />
                    </div>
                    {authStatusMessage && <p className="text-xs text-green-600 bg-green-50 p-3 rounded-xl">{authStatusMessage}</p>}
                    {authError && <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl">{authError}</p>}
                    <button
                      onClick={forgotPassword}
                      className="w-full mt-2 rounded-2xl bg-brand-orange text-white py-3 font-bold text-sm uppercase tracking-wide shadow-lg hover:bg-brand-orange-dark transition"
                    >
                      Send Reset Link
                    </button>
                    <button
                      onClick={() => { setAuthMode('login'); setAuthError(''); setAuthStatusMessage(''); }}
                      className="w-full rounded-2xl border border-gray-200 text-gray-700 py-3 font-bold text-sm uppercase tracking-wide transition hover:bg-gray-50"
                    >
                      Back to Login
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {authMode === 'register' && (
                      <div>
                        <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Full Name</label>
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Your name"
                          className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-2xl text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-brand-orange focus:bg-white transition"
                        />
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Email Address</label>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-2xl text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-brand-orange focus:bg-white transition"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Password</label>
                        {authMode === 'login' && (
                          <button
                            onClick={() => { setAuthMode('forgot'); setAuthError(''); setAuthStatusMessage(''); }}
                            className="text-xs text-brand-orange hover:text-brand-orange-dark font-bold"
                          >
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <input
                        type="password"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-2xl text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-brand-orange focus:bg-white transition"
                      />
                    </div>
                    {authStatusMessage && <p className="text-xs text-green-600 bg-green-50 p-3 rounded-xl">{authStatusMessage}</p>}
                    {authError && <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl">{authError}</p>}
                    <button
                      onClick={() => authenticate(authMode)}
                      className="w-full mt-4 rounded-2xl bg-brand-orange text-white py-3 font-bold text-sm uppercase tracking-wide shadow-lg hover:bg-brand-orange-dark transition"
                    >
                      {authMode === 'register' ? 'Create Account' : 'Login'}
                    </button>
                    <button
                      onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); setAuthStatusMessage(''); }}
                      className="w-full rounded-2xl border border-gray-200 text-gray-700 py-3 font-bold text-sm uppercase tracking-wide transition hover:bg-gray-50"
                    >
                      {authMode === 'login' ? 'Create Account Instead' : 'Already have an account? Login'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Logged-in: profile + orders + addresses stacked */
              <div className="space-y-6">
                {/* Profile Card */}
                <div className="rounded-3xl bg-white/95 backdrop-blur-sm p-6 sm:p-8 shadow-lg border border-gray-100">
                  {/* Avatar + identity row */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full bg-brand-orange flex items-center justify-center text-2xl font-black text-white flex-shrink-0">
                      {customerName ? customerName.charAt(0).toUpperCase() : customerEmail?.charAt(0).toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-black text-gray-900 truncate">{customerName || 'Welcome back!'}</h3>
                      <p className="text-sm text-gray-500 truncate mt-0.5">{customerEmail}</p>
                    </div>
                  </div>

                  {/* Editable fields */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Full Name</label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-2xl text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-brand-orange focus:bg-white transition"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Phone Number</label>
                        <button
                          onClick={() => setShowPhoneNumber(!showPhoneNumber)}
                          className="text-xs text-brand-orange hover:text-brand-orange-dark font-bold"
                        >
                          {showPhoneNumber ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      {showPhoneNumber ? (
                        <input
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-2xl text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-brand-orange focus:bg-white transition"
                        />
                      ) : (
                        <div className="mt-1 px-4 py-3 border border-gray-200 rounded-2xl bg-gray-50 text-sm text-gray-500">
                          {customerPhone ? '••• ••• ' + customerPhone.slice(-4) : 'No phone added'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={saveProfile}
                      className="flex-1 rounded-2xl bg-brand-orange text-white py-3 font-bold text-sm uppercase tracking-wide shadow-lg hover:bg-brand-orange-dark transition"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={logout}
                      className="flex-1 rounded-2xl border border-gray-200 text-gray-700 py-3 font-bold text-sm uppercase tracking-wide transition hover:bg-gray-50"
                    >
                      Logout
                    </button>
                  </div>
                </div>

                {/* Set New Password (shown after clicking reset link) */}
                {passwordRecoveryMode && (
                  <div className="rounded-3xl bg-white/95 backdrop-blur-sm p-6 sm:p-8 shadow-lg border border-brand-orange/30">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-12 h-12 rounded-full bg-brand-orange/10 flex items-center justify-center text-2xl">🔑</div>
                      <div>
                        <h4 className="font-black text-gray-900">Set New Password</h4>
                        <p className="text-xs text-gray-500 mt-0.5">Choose a new password for your account</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide">New Password</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-2xl text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-brand-orange focus:bg-white transition"
                        />
                      </div>
                      <button
                        onClick={updatePassword}
                        className="w-full rounded-2xl bg-brand-orange text-white py-3 font-bold text-sm uppercase tracking-wide shadow-lg hover:bg-brand-orange-dark transition"
                      >
                        Update Password
                      </button>
                      <button
                        onClick={() => { setPasswordRecoveryMode(false); setNewPassword(''); }}
                        className="w-full rounded-2xl border border-gray-200 text-gray-700 py-2 font-bold text-sm uppercase tracking-wide transition hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Order History */}
                <div className="rounded-3xl bg-white/95 backdrop-blur-sm p-6 sm:p-8 shadow-lg border border-gray-100">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 rounded-full bg-brand-orange/10 flex items-center justify-center text-2xl">📦</div>
                    <div>
                      <h4 className="font-black text-gray-900">Order History</h4>
                      <p className="text-xs text-gray-500 mt-0.5">{historyToShow.length} order{historyToShow.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  {historyToShow.length === 0 ? (
                    <div className="rounded-2xl bg-gray-50 p-6 text-center">
                      <p className="text-sm text-gray-500">No orders yet — place your first order!</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {historyToShow.map((order) => (
                        <div key={order.reference || order.orderId} className="rounded-2xl border border-gray-200 bg-gray-50 hover:bg-gray-100 p-4 transition">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-500 font-semibold">Order ID</p>
                              <p className="font-bold text-gray-900 text-sm break-all">{order.orderId}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-xs text-gray-500 font-semibold">Status</p>
                                <p className="font-bold text-brand-orange text-sm">{order.status}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-500 font-semibold">Total</p>
                                <p className="font-bold text-gray-900 text-sm">₦{order.amount?.toLocaleString() || 'N/A'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Delivery Addresses */}
                <div className="rounded-3xl bg-white/95 backdrop-blur-sm p-6 sm:p-8 shadow-lg border border-gray-100">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 rounded-full bg-brand-orange/10 flex items-center justify-center text-2xl">📍</div>
                    <div>
                      <h4 className="font-black text-gray-900">Delivery Addresses</h4>
                      <p className="text-xs text-gray-500 mt-0.5">{savedAddresses.length} saved</p>
                    </div>
                  </div>
                  {savedAddresses.length === 0 ? (
                    <div className="rounded-2xl bg-gray-50 p-6 text-center">
                      <p className="text-sm text-gray-500">Save addresses during checkout to reuse them faster.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {savedAddresses.map((address, index) => (
                        <button
                          key={index}
                          onClick={() => setDeliveryLocation(address)}
                          className="w-full text-left rounded-2xl border border-gray-200 bg-gray-50 hover:border-brand-orange hover:bg-brand-orange/5 px-4 py-3 text-sm text-gray-700 transition"
                        >
                          {address}
                        </button>
                      ))}
                      <button
                        onClick={() => setSavedAddresses([])}
                        className="w-full mt-3 rounded-2xl border border-red-200 text-red-600 py-2 text-sm font-bold uppercase tracking-wide transition hover:bg-red-50"
                      >
                        Clear All
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        <section ref={locationRef} className={activePage === 'location' ? 'max-w-7xl mx-auto px-6 py-20' : 'hidden'}>
          <div className="text-center mb-12">
            <p className="text-sm uppercase tracking-[0.4em] text-brand-orange font-bold">Location</p>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mt-4">Find Us</h2>
          </div>
          <div className="rounded-[2rem] overflow-hidden shadow-2xl border border-gray-100">
            <div className="bg-white/95 backdrop-blur-sm p-10 text-center border-b border-gray-100">
              <div className="w-16 h-16 rounded-full bg-brand-orange/10 flex items-center justify-center text-3xl mx-auto mb-5">📍</div>
              <h3 className="text-2xl font-black text-gray-900">3 Adeshina Street, Delight Ventures Complex</h3>
              <p className="text-gray-600 mt-1 text-sm">Along Idi Mango Road, Afobaje Idi Mango, Adigbe</p>
              <p className="text-brand-orange font-bold text-lg mt-1">Abeokuta 110104, Ogun State, Nigeria</p>
              <p className="mt-3 text-gray-500 max-w-md mx-auto">The home of premium Nigerian dishes, made fresh daily and ready for your order.</p>
              <div className="flex flex-wrap gap-3 justify-center mt-6">
                <button
                  onClick={() => window.open('https://wa.me/2348086900533?text='+encodeURIComponent('Hello Breadwrapz Foods, I would like to make a reservation.'))}
                  className="inline-flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white font-bold py-3 px-6 rounded-full shadow-lg transition"
                >
                  💬 Reserve on WhatsApp
                </button>
                <button
                  onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${RESTAURANT_MAPS_QUERY}`)}
                  className="inline-flex items-center gap-2 border-2 border-gray-200 text-gray-700 hover:border-brand-orange hover:text-brand-orange font-bold py-3 px-6 rounded-full transition"
                >
                  🗺️ Get Directions
                </button>
              </div>
            </div>
            <div className="h-96 overflow-hidden">
              <iframe
                src={`https://maps.google.com/maps?q=${RESTAURANT_MAPS_QUERY}&z=16&output=embed`}
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
      {/* Floating WhatsApp Button */}
      <a
        href={'https://wa.me/2348086900533?text='+encodeURIComponent('Hello Breadwrapz Foods, I would like to place an order.')}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-2xl transition hover:scale-105 active:scale-95"
      >
        <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>

      {/* Toast notifications */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.18 }}
              className={`px-5 py-3 rounded-2xl text-white text-sm font-bold shadow-2xl whitespace-nowrap ${toast.type === 'error' ? 'bg-red-500' : 'bg-gray-900'}`}
            >
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Footer />
    </div>
  );
}
export default App;
