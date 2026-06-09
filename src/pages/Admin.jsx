import { useState, useEffect, useCallback } from 'react';
import { menuDataNoImages } from '../menuData';

const API = import.meta.env.VITE_API_URL || '';
const STATUSES = ['Order Received', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered'];

export default function Admin() {
  const [key, setKey] = useState('');
  const [input, setInput] = useState('');
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [tab, setTab] = useState('orders');
  const [pendingReviews, setPendingReviews] = useState([]);
  const [reviewAction, setReviewAction] = useState(null);
  const [foodAvailability, setFoodAvailability] = useState([]);
  const [foodError, setFoodError] = useState('');
  const [foodMessage, setFoodMessage] = useState('');
  const [updatingFood, setUpdatingFood] = useState(null);
  const [foodUnavailableUntil, setFoodUnavailableUntil] = useState({});

  const fetchOrders = useCallback(async (adminKey) => {
    try {
      const res = await fetch(`${API}/admin-orders`, {
        headers: { 'x-admin-key': adminKey },
      });
      if (res.status === 401) { setError('Wrong password.'); return; }
      if (!res.ok) { setError('Server error. Try again.'); return; }
      const data = await res.json();
      setOrders(data);
      setError('');
    } catch {
      setError('Could not connect to server.');
    }
  }, []);

  const fetchReviews = useCallback(async (adminKey) => {
    try {
      const res = await fetch(`${API}/admin-reviews`, {
        headers: { 'x-admin-key': adminKey },
      });
      if (res.ok) setPendingReviews(await res.json());
    } catch { /* silent */ }
  }, []);

  const fetchFoodAvailability = useCallback(async (adminKey) => {
    try {
      const res = await fetch(`${API}/admin-food-availability`, {
        headers: { 'x-admin-key': adminKey },
      });
      if (res.ok) {
        setFoodAvailability(await res.json());
        setFoodError('');
      } else {
        const data = await res.json().catch(() => null);
        setFoodError(data?.error || 'Failed to load food availability.');
      }
    } catch (err) {
      setFoodError('Unable to fetch food availability.');
    }
  }, []);

  const handleReview = async (id, action) => {
    setReviewAction(id);
    try {
      await fetch(`${API}/admin-reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
        body: JSON.stringify({ id, action }),
      });
      await fetchReviews(key);
    } catch { alert('Action failed.'); }
    setReviewAction(null);
  };

  const updateFoodAvailability = async (foodId, foodName, isAvailable) => {
    const selectedTime = foodUnavailableUntil[foodId];
    const defaultTime = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16);
    const unavailableUntil = !isAvailable ? (selectedTime || defaultTime) : null;

    if (!isAvailable && !selectedTime) {
      alert('No restore time selected. Defaulting to 1 hour from now.');
      setFoodUnavailableUntil((prev) => ({ ...prev, [foodId]: defaultTime }));
    }

    setUpdatingFood(foodId);
    setFoodMessage('');
    setFoodError('');

    try {
      const res = await fetch(`${API}/admin-food-availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
        body: JSON.stringify({ foodId, foodName, isAvailable, unavailableUntil }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFoodError(data?.error || 'Failed to update food availability.');
      } else {
        setFoodMessage('Food availability updated successfully.');
        await fetchFoodAvailability(key);
      }
    } catch (err) {
      setFoodError('Failed to update food availability.');
    }
    setUpdatingFood(null);
  };

  useEffect(() => {
    if (!key) return;
    fetchOrders(key);
    fetchReviews(key);
    fetchFoodAvailability(key);
    const interval = setInterval(() => { fetchOrders(key); fetchReviews(key); fetchFoodAvailability(key); }, 30000);
    return () => clearInterval(interval);
  }, [key, fetchOrders, fetchReviews, fetchFoodAvailability]);

  const login = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) { setError('Please enter the admin password.'); return; }
    setError('');
    setLoggingIn(true);
    try {
      const res = await fetch(`${API}/admin-orders`, {
        headers: { 'x-admin-key': trimmedInput },
      });
      if (res.status === 401) { setError('Wrong password.'); return; }
      if (!res.ok) { setError('Could not connect to server.'); return; }
      const data = await res.json();
      sessionStorage.setItem('adminKey', trimmedInput);
      setKey(trimmedInput);
      setOrders(data);
    } catch {
      setError('Could not connect to server.');
    } finally {
      setLoggingIn(false);
    }
  };

  const updateStatus = async (orderId, status) => {
    setUpdating(orderId);
    try {
      await fetch(`${API}/admin-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
        body: JSON.stringify({ orderId, status }),
      });
      await fetchOrders(key);
    } catch {
      alert('Failed to update status.');
    }
    setUpdating(null);
  };

  if (!key) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-sm">
          <img src="/images/logo.png" alt="Breadwrapz" className="h-16 mx-auto mb-6 object-contain" />
          <h2 className="text-2xl font-black text-center text-gray-900 mb-6">Admin Login</h2>
          <input
            type="password"
            placeholder="Enter admin password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loggingIn && login()}
            className="w-full px-5 py-4 border-2 border-gray-300 rounded-2xl text-gray-900 focus:outline-none focus:border-orange-500 mb-4"
          />
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <button
            onClick={login}
            disabled={loggingIn}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-black py-4 rounded-2xl transition"
          >
            {loggingIn ? 'Checking...' : 'Login'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-10 px-4 md:py-10 pt-10">
      <div className="max-w-5xl mx-auto">
        {/* Header - Hidden on mobile */}
        <div className="hidden md:flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <img src="/images/logo.png" alt="Breadwrapz" className="h-12 object-contain" />
            <h1 className="text-3xl font-black text-gray-900">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { fetchOrders(key); fetchReviews(key); fetchFoodAvailability(key); }}
              className="px-5 py-2 bg-orange-500 text-white rounded-full font-bold hover:bg-orange-600 transition"
            >
              Refresh
            </button>
            <button
              onClick={() => { sessionStorage.removeItem('adminKey'); setKey(''); setOrders([]); setPendingReviews([]); }}
              className="px-5 py-2 bg-gray-200 text-gray-700 rounded-full font-bold hover:bg-gray-300 transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between mb-6 fixed top-0 left-0 right-0 bg-white shadow-sm z-40 px-4 py-3">
          <img src="/images/logo.png" alt="Breadwrapz" className="h-10 object-contain" />
          <div className="flex items-center gap-2">
            <button
              onClick={() => { fetchOrders(key); fetchReviews(key); fetchFoodAvailability(key); }}
              className="p-2 bg-orange-100 text-orange-500 rounded-full hover:bg-orange-200 transition"
              title="Refresh"
            >
              ↻
            </button>
            <button
              onClick={() => { sessionStorage.removeItem('adminKey'); setKey(''); setOrders([]); setPendingReviews([]); }}
              className="p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition"
              title="Logout"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Desktop Tabs */}
        <div className="hidden md:flex gap-2 mb-8 flex-wrap">
          <button
            onClick={() => setTab('orders')}
            className={`px-6 py-2.5 rounded-full font-bold text-sm transition ${tab === 'orders' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-orange-50'}`}
          >
            Orders {orders.length > 0 && <span className="ml-1 bg-white/20 px-1.5 py-0.5 rounded-full text-xs">{orders.length}</span>}
          </button>
          <button
            onClick={() => setTab('reviews')}
            className={`px-6 py-2.5 rounded-full font-bold text-sm transition ${tab === 'reviews' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-orange-50'}`}
          >
            Reviews {pendingReviews.length > 0 && <span className="ml-1 bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full text-xs">{pendingReviews.length} pending</span>}
          </button>
          <button
            onClick={() => setTab('food')}
            className={`px-6 py-2.5 rounded-full font-bold text-sm transition ${tab === 'food' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-orange-50'}`}
          >
            Food Availability
          </button>
        </div>

        {tab === 'reviews' && (
          <div className="space-y-4">
            {pendingReviews.length === 0 ? (
              <div className="bg-white rounded-3xl p-16 text-center shadow">
                <p className="text-gray-500 text-lg">No pending reviews.</p>
              </div>
            ) : pendingReviews.map((review) => (
              <div key={review.id} className="bg-white rounded-3xl shadow p-6 border border-gray-100">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center font-black text-orange-500 text-sm">
                        {review.user_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-gray-900 text-sm">{review.user_name}</p>
                        <p className="text-xs text-gray-400">{new Date(review.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-0.5 text-orange-400 text-sm ml-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} className={i < review.rating ? 'text-orange-400' : 'text-gray-200'}>★</span>
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed pl-12">"{review.comment}"</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleReview(review.id, 'approve')}
                      disabled={reviewAction === review.id}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white rounded-full font-bold text-sm transition"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReview(review.id, 'reject')}
                      disabled={reviewAction === review.id}
                      className="px-4 py-2 bg-red-100 hover:bg-red-200 disabled:opacity-60 text-red-600 rounded-full font-bold text-sm transition"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'orders' && orders.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center shadow">
            <p className="text-gray-500 text-lg">No orders yet.</p>
          </div>
        ) : tab === 'orders' && (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.orderId} className="bg-white rounded-3xl shadow p-6 border border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
                  <div>
                    <p className="text-xs text-orange-500 font-bold uppercase tracking-widest">{order.orderId}</p>
                    <p className="text-xl font-black text-gray-900 mt-1">{order.customerName || 'N/A'}</p>
                    <p className="text-gray-500 text-sm mt-1">{order.customerPhone || order.contact}</p>
                    <p className="text-gray-600 text-sm mt-1">📍 {order.deliveryLocation}</p>
                    <p className="text-gray-400 text-xs mt-1">{new Date(order.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-orange-500">₦{Number(order.amount).toLocaleString()}</p>
                    <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${
                      order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                      order.status === 'Out for Delivery' ? 'bg-blue-100 text-blue-700' :
                      order.status === 'Preparing' ? 'bg-yellow-100 text-yellow-700' :
                      order.status === 'Confirmed' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4 mb-5">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-2">Items ordered</p>
                  <div className="space-y-1">
                    {(order.items || []).map((item, i) => (
                      <div key={i} className="flex justify-between text-sm text-gray-700">
                        <span>{item.name}</span>
                        <span className="font-semibold">₦{Number(item.price).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase mb-3">Update status</p>
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.map((status) => (
                      <button
                        key={status}
                        onClick={() => updateStatus(order.orderId, status)}
                        disabled={updating === order.orderId || order.status === status}
                        className={`px-4 py-2 rounded-full text-sm font-bold transition ${
                          order.status === status
                            ? 'bg-orange-500 text-white cursor-default'
                            : 'bg-gray-100 text-gray-700 hover:bg-orange-100 hover:text-orange-700'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'food' && (
          <div className="space-y-4">
            {(foodError || foodMessage) && (
              <div className={`rounded-3xl p-4 text-sm ${foodError ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
                {foodError || foodMessage}
              </div>
            )}
            {menuDataNoImages.length === 0 ? (
              <div className="bg-white rounded-3xl p-16 text-center shadow">
                <p className="text-gray-500 text-lg">No food items available.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {menuDataNoImages.map((food) => {
                  const availability = foodAvailability.find(f => f.food_id === food.id);
                  const isAvailable = availability ? availability.is_available : food.available;
                  const unavailableUntil = availability?.unavailable_until;
                  
                  return (
                    <div key={food.id} className="bg-white rounded-3xl shadow p-6 border border-gray-100">
                      <div className="mb-4">
                        <p className="font-black text-gray-900 text-sm">{food.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{food.category}</p>
                        <p className="text-gray-600 text-sm mt-2">₦{Number(food.price).toLocaleString()}</p>
                      </div>

                      <div className="border-t border-gray-100 pt-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${isAvailable ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span className={`text-sm font-bold ${isAvailable ? 'text-green-600' : 'text-red-600'}`}>
                            {isAvailable ? 'Available' : 'Unavailable'}
                          </span>
                        </div>
                        {unavailableUntil && !isAvailable && (
                          <p className="text-xs text-gray-500 mt-2">
                            Available at: {new Date(unavailableUntil).toLocaleString()}
                          </p>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-bold text-gray-600 block mb-2">Available again at</label>
                          <input
                            type="datetime-local"
                            value={foodUnavailableUntil[food.id] || unavailableUntil || ''}
                            onChange={(e) => setFoodUnavailableUntil({
                              ...foodUnavailableUntil,
                              [food.id]: e.target.value,
                            })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500"
                          />
                          <p className="text-xs text-gray-400 mt-1">
                            Pick a time to auto-enable this food when it becomes unavailable.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateFoodAvailability(food.id, food.name, !isAvailable)}
                            disabled={updatingFood === food.id}
                            className={`flex-1 px-3 py-2 rounded-xl text-sm font-bold transition ${
                              isAvailable
                                ? 'bg-orange-100 hover:bg-orange-200 text-orange-600'
                                : 'bg-green-100 hover:bg-green-200 text-green-600'
                            } disabled:opacity-60`}
                          >
                            {updatingFood === food.id ? 'Updating...' : (isAvailable ? 'Mark Unavailable' : 'Mark Available')}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-50">
        <div className="flex justify-around items-center max-w-md mx-auto w-full">
          <button
            onClick={() => setTab('orders')}
            className={`flex-1 flex flex-col items-center justify-center py-3 px-2 transition ${
              tab === 'orders'
                ? 'text-orange-500 border-t-2 border-orange-500'
                : 'text-gray-600 border-t-2 border-transparent hover:text-orange-500'
            }`}
          >
            <span className="text-xl mb-1">📋</span>
            <span className="text-xs font-bold">Orders</span>
            {orders.length > 0 && <span className="text-xs bg-orange-500 text-white rounded-full px-1.5 py-0.5 mt-1">{orders.length}</span>}
          </button>
          <button
            onClick={() => setTab('reviews')}
            className={`flex-1 flex flex-col items-center justify-center py-3 px-2 transition ${
              tab === 'reviews'
                ? 'text-orange-500 border-t-2 border-orange-500'
                : 'text-gray-600 border-t-2 border-transparent hover:text-orange-500'
            }`}
          >
            <span className="text-xl mb-1">⭐</span>
            <span className="text-xs font-bold">Reviews</span>
            {pendingReviews.length > 0 && <span className="text-xs bg-orange-500 text-white rounded-full px-1.5 py-0.5 mt-1">{pendingReviews.length}</span>}
          </button>
          <button
            onClick={() => setTab('food')}
            className={`flex-1 flex flex-col items-center justify-center py-3 px-2 transition ${
              tab === 'food'
                ? 'text-orange-500 border-t-2 border-orange-500'
                : 'text-gray-600 border-t-2 border-transparent hover:text-orange-500'
            }`}
          >
            <span className="text-xl mb-1">🍽️</span>
            <span className="text-xs font-bold">Food</span>
          </button>
        </div>
      </div>
    </div>
  );
}
