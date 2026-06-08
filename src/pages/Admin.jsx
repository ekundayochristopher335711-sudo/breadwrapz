import { useState, useEffect, useCallback } from 'react';

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

  useEffect(() => {
    if (!key) return;
    fetchOrders(key);
    fetchReviews(key);
    const interval = setInterval(() => { fetchOrders(key); fetchReviews(key); }, 30000);
    return () => clearInterval(interval);
  }, [key, fetchOrders, fetchReviews]);

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
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <img src="/images/logo.png" alt="Breadwrapz" className="h-12 object-contain" />
            <h1 className="text-3xl font-black text-gray-900">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { fetchOrders(key); fetchReviews(key); }}
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

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
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
      </div>
    </div>
  );
}
