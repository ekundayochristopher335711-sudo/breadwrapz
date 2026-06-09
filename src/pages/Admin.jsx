import { useState, useEffect, useCallback } from 'react';

const API = import.meta.env.VITE_API_URL || '';
const STATUSES = ['Order Received', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered'];
const CATEGORIES = ['Swallow', 'Rice Meals', 'Special Orders', 'Xmas Combo', 'Wraps and goodies', 'Protein and sides'];

const BLANK_FORM = { name: '', description: '', price: '', category: 'Rice Meals', image_url: '' };

export default function Admin() {
  const [key, setKey] = useState(() => sessionStorage.getItem('adminKey') || '');
  const [input, setInput] = useState('');
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [tab, setTab] = useState('orders');

  // Reviews
  const [pendingReviews, setPendingReviews] = useState([]);
  const [reviewAction, setReviewAction] = useState(null);

  // Menu management
  const [menuItems, setMenuItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuMsg, setMenuMsg] = useState('');
  const [menuError, setMenuError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState(BLANK_FORM);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(BLANK_FORM);
  const [togglingId, setTogglingId] = useState(null);
  const [unavailableUntil, setUnavailableUntil] = useState({});

  // ── Fetchers ──────────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async (adminKey) => {
    try {
      const res = await fetch(`${API}/admin-orders`, { headers: { 'x-admin-key': adminKey } });
      if (res.status === 401) { setError('Wrong password.'); return; }
      if (!res.ok) { setError('Server error.'); return; }
      setOrders(await res.json()); setError('');
    } catch { setError('Could not connect to server.'); }
  }, []);

  const fetchReviews = useCallback(async (adminKey) => {
    try {
      const res = await fetch(`${API}/admin-reviews`, { headers: { 'x-admin-key': adminKey } });
      if (res.ok) setPendingReviews(await res.json());
    } catch { /* silent */ }
  }, []);

  const fetchMenu = useCallback(async (adminKey) => {
    setMenuLoading(true);
    try {
      const res = await fetch(`${API}/admin-menu`, { headers: { 'x-admin-key': adminKey } });
      if (res.ok) setMenuItems(await res.json());
    } catch { /* silent */ }
    setMenuLoading(false);
  }, []);

  useEffect(() => {
    if (!key) return;
    fetchOrders(key); fetchReviews(key); fetchMenu(key);
    const iv = setInterval(() => { fetchOrders(key); fetchReviews(key); }, 30000);
    return () => clearInterval(iv);
  }, [key, fetchOrders, fetchReviews, fetchMenu]);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const login = async () => {
    const k = input.trim();
    if (!k) { setError('Please enter the admin password.'); return; }
    setError(''); setLoggingIn(true);
    try {
      const res = await fetch(`${API}/admin-orders`, { headers: { 'x-admin-key': k } });
      if (res.status === 401) { setError('Wrong password.'); return; }
      if (!res.ok) { setError('Could not connect to server.'); return; }
      sessionStorage.setItem('adminKey', k);
      setKey(k); setOrders(await res.json());
    } catch { setError('Could not connect to server.'); }
    finally { setLoggingIn(false); }
  };

  // ── Orders ─────────────────────────────────────────────────────────────────
  const updateStatus = async (orderId, status) => {
    setUpdating(orderId);
    try {
      await fetch(`${API}/admin-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
        body: JSON.stringify({ orderId, status }),
      });
      await fetchOrders(key);
    } catch { alert('Failed to update status.'); }
    setUpdating(null);
  };

  // ── Reviews ────────────────────────────────────────────────────────────────
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

  // ── Menu CRUD ──────────────────────────────────────────────────────────────
  const menuCall = async (body) => {
    setMenuMsg(''); setMenuError('');
    const res = await fetch(`${API}/admin-menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { setMenuError(data.error || 'Action failed.'); return false; }
    return true;
  };

  const addItem = async () => {
    if (!addForm.name.trim() || !addForm.price || !addForm.category) {
      setMenuError('Name, price, and category are required.'); return;
    }
    const ok = await menuCall({ action: 'add', ...addForm, price: Number(addForm.price) });
    if (ok) { setMenuMsg('Item added!'); setAddForm(BLANK_FORM); setShowAddForm(false); await fetchMenu(key); }
  };

  const saveEdit = async () => {
    const ok = await menuCall({ action: 'edit', id: editingId, ...editForm, price: Number(editForm.price) });
    if (ok) { setMenuMsg('Item updated!'); setEditingId(null); await fetchMenu(key); }
  };

  const deleteItem = async (id, name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const ok = await menuCall({ action: 'delete', id });
    if (ok) { setMenuMsg('Item deleted.'); await fetchMenu(key); }
  };

  const toggleAvailability = async (item) => {
    const newAvailable = !item.available;
    const until = unavailableUntil[item.id];
    setTogglingId(item.id);
    const ok = await menuCall({
      action: 'toggle', id: item.id, available: newAvailable,
      unavailableUntil: newAvailable ? null : (until ? new Date(until).toISOString() : new Date(Date.now() + 3600000).toISOString()),
    });
    if (ok) await fetchMenu(key);
    setTogglingId(null);
  };

  // ── Login screen ───────────────────────────────────────────────────────────
  if (!key) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-sm">
          <img src="/images/logo.png" alt="Breadwrapz" className="h-16 mx-auto mb-6 object-contain" />
          <h2 className="text-2xl font-black text-center text-gray-900 mb-6">Admin Login</h2>
          <input
            type="password" placeholder="Enter admin password" value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loggingIn && login()}
            className="w-full px-5 py-4 border-2 border-gray-300 rounded-2xl text-gray-900 focus:outline-none focus:border-orange-500 mb-4"
          />
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <button onClick={login} disabled={loggingIn}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-black py-4 rounded-2xl transition">
            {loggingIn ? 'Checking...' : 'Login'}
          </button>
        </div>
      </div>
    );
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-10 px-4 md:py-10 pt-10">
      <div className="max-w-5xl mx-auto">

        {/* Desktop header */}
        <div className="hidden md:flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <img src="/images/logo.png" alt="Breadwrapz" className="h-12 object-contain" />
            <h1 className="text-3xl font-black text-gray-900">Dashboard</h1>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { fetchOrders(key); fetchReviews(key); fetchMenu(key); }}
              className="px-5 py-2 bg-orange-500 text-white rounded-full font-bold hover:bg-orange-600 transition">Refresh</button>
            <button onClick={() => { sessionStorage.removeItem('adminKey'); setKey(''); }}
              className="px-5 py-2 bg-gray-200 text-gray-700 rounded-full font-bold hover:bg-gray-300 transition">Logout</button>
          </div>
        </div>

        {/* Mobile header */}
        <div className="md:hidden fixed top-0 left-0 right-0 bg-white shadow-sm z-40 px-4 py-3 flex items-center justify-between">
          <img src="/images/logo.png" alt="Breadwrapz" className="h-10 object-contain" />
          <div className="flex gap-2">
            <button onClick={() => { fetchOrders(key); fetchReviews(key); fetchMenu(key); }}
              className="p-2 bg-orange-100 text-orange-500 rounded-full">↻</button>
            <button onClick={() => { sessionStorage.removeItem('adminKey'); setKey(''); }}
              className="p-2 bg-gray-100 text-gray-600 rounded-full">✕</button>
          </div>
        </div>

        {/* Desktop tabs */}
        <div className="hidden md:flex gap-2 mb-8 flex-wrap">
          {[
            { id: 'orders', label: 'Orders', badge: orders.length },
            { id: 'reviews', label: 'Reviews', badge: pendingReviews.length, badgeLabel: 'pending' },
            { id: 'menu', label: 'Menu', badge: 0 },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-6 py-2.5 rounded-full font-bold text-sm transition ${tab === t.id ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-orange-50'}`}>
              {t.label}
              {t.badge > 0 && <span className="ml-1.5 bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full text-xs">{t.badge}</span>}
            </button>
          ))}
        </div>

        {/* ── ORDERS TAB ──────────────────────────────────────────────────── */}
        {tab === 'orders' && (
          orders.length === 0
            ? <div className="bg-white rounded-3xl p-16 text-center shadow"><p className="text-gray-500 text-lg">No confirmed orders yet.</p></div>
            : <div className="space-y-6">
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
                          order.status === 'Confirmed' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                        }`}>{order.status}</span>
                      </div>
                    </div>
                    <div className="border-t border-gray-100 pt-4 mb-5">
                      <p className="text-xs font-bold text-gray-400 uppercase mb-2">Items ordered</p>
                      {(order.items || []).map((item, i) => (
                        <div key={i} className="flex justify-between text-sm text-gray-700">
                          <span>{item.name}</span>
                          <span className="font-semibold">₦{Number(item.price).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase mb-3">Update status</p>
                      <div className="flex flex-wrap gap-2">
                        {STATUSES.map(status => (
                          <button key={status} onClick={() => updateStatus(order.orderId, status)}
                            disabled={updating === order.orderId || order.status === status}
                            className={`px-4 py-2 rounded-full text-sm font-bold transition ${order.status === status ? 'bg-orange-500 text-white cursor-default' : 'bg-gray-100 text-gray-700 hover:bg-orange-100 hover:text-orange-700'} disabled:opacity-60`}>
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
        )}

        {/* ── REVIEWS TAB ─────────────────────────────────────────────────── */}
        {tab === 'reviews' && (
          pendingReviews.length === 0
            ? <div className="bg-white rounded-3xl p-16 text-center shadow"><p className="text-gray-500 text-lg">No pending reviews.</p></div>
            : <div className="space-y-4">
                {pendingReviews.map(review => (
                  <div key={review.id} className="bg-white rounded-3xl shadow p-5 border border-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center font-black text-orange-500 text-sm flex-shrink-0">
                        {review.user_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-gray-900 text-sm">{review.user_name}</p>
                        <p className="text-xs text-gray-400">{new Date(review.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-0.5 text-orange-400 text-sm flex-shrink-0">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} className={i < review.rating ? 'text-orange-400' : 'text-gray-200'}>★</span>
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed mb-4">"{review.comment}"</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleReview(review.id, 'approve')} disabled={reviewAction === review.id}
                        className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white rounded-2xl font-bold text-sm transition">
                        Approve
                      </button>
                      <button onClick={() => handleReview(review.id, 'reject')} disabled={reviewAction === review.id}
                        className="flex-1 py-2.5 bg-red-100 hover:bg-red-200 disabled:opacity-60 text-red-600 rounded-2xl font-bold text-sm transition">
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
        )}

        {/* ── MENU TAB ────────────────────────────────────────────────────── */}
        {tab === 'menu' && (
          <div>
            {(menuMsg || menuError) && (
              <div className={`mb-4 rounded-2xl p-3 text-sm font-bold ${menuError ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                {menuError || menuMsg}
              </div>
            )}

            {/* Add new item button / form */}
            {!showAddForm ? (
              <button onClick={() => { setShowAddForm(true); setMenuError(''); setMenuMsg(''); }}
                className="w-full mb-6 py-3 rounded-2xl border-2 border-dashed border-orange-300 text-orange-500 font-bold text-sm hover:bg-orange-50 transition">
                + Add New Menu Item
              </button>
            ) : (
              <div className="bg-white rounded-3xl shadow p-6 border border-orange-200 mb-6">
                <h3 className="font-black text-gray-900 mb-4">New Menu Item</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <input placeholder="Item name *" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                    className="px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-orange-500" />
                  <input placeholder="Price (₦) *" type="number" value={addForm.price} onChange={e => setAddForm(f => ({ ...f, price: e.target.value }))}
                    className="px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-orange-500" />
                  <select value={addForm.category} onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))}
                    className="px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-orange-500">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <input placeholder="Image URL (optional)" value={addForm.image_url} onChange={e => setAddForm(f => ({ ...f, image_url: e.target.value }))}
                    className="px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-orange-500" />
                  <input placeholder="Description (optional)" value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
                    className="px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-orange-500 sm:col-span-2" />
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={addItem} className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold text-sm transition">Save Item</button>
                  <button onClick={() => { setShowAddForm(false); setAddForm(BLANK_FORM); setMenuError(''); }}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold text-sm transition">Cancel</button>
                </div>
              </div>
            )}

            {/* Menu items list */}
            {menuLoading ? (
              <div className="text-center py-12 text-gray-400">Loading menu...</div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {menuItems.map(item => (
                  <div key={item.id} className={`bg-white rounded-3xl shadow p-5 border ${!item.available ? 'border-red-100 opacity-80' : 'border-gray-100'}`}>

                    {editingId === item.id ? (
                      /* Edit form */
                      <div className="space-y-3">
                        <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500" placeholder="Name" />
                        <div className="flex gap-2">
                          <input type="number" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500" placeholder="Price" />
                          <select value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500">
                            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                          </select>
                        </div>
                        <input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500" placeholder="Description" />
                        <input value={editForm.image_url} onChange={e => setEditForm(f => ({ ...f, image_url: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500" placeholder="Image URL" />
                        <div className="flex gap-2">
                          <button onClick={saveEdit} className="flex-1 py-2 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition">Save</button>
                          <button onClick={() => setEditingId(null)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      /* Normal card */
                      <>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-gray-900 text-sm truncate">{item.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{item.category}</p>
                          </div>
                          <p className="font-black text-orange-500 text-sm flex-shrink-0">₦{Number(item.price).toLocaleString()}</p>
                        </div>

                        {/* Availability */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.available ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className={`text-xs font-bold ${item.available ? 'text-green-600' : 'text-red-600'}`}>
                            {item.available ? 'Available' : 'Unavailable'}
                          </span>
                          {!item.available && item.unavailable_until && (
                            <span className="text-xs text-gray-400">until {new Date(item.unavailable_until).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                          )}
                        </div>

                        {/* Unavailable-until picker (shown when marking unavailable) */}
                        {item.available && (
                          <input type="datetime-local" value={unavailableUntil[item.id] || ''}
                            onChange={e => setUnavailableUntil(p => ({ ...p, [item.id]: e.target.value }))}
                            className="w-full mb-3 px-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-orange-400" />
                        )}

                        <div className="flex gap-2">
                          <button onClick={() => toggleAvailability(item)} disabled={togglingId === item.id}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition disabled:opacity-60 ${item.available ? 'bg-red-100 hover:bg-red-200 text-red-600' : 'bg-green-100 hover:bg-green-200 text-green-600'}`}>
                            {togglingId === item.id ? '...' : (item.available ? 'Mark Unavailable' : 'Mark Available')}
                          </button>
                          <button onClick={() => { setEditingId(item.id); setEditForm({ name: item.name, description: item.description || '', price: item.price, category: item.category, image_url: item.image_url || '' }); }}
                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition">Edit</button>
                          <button onClick={() => deleteItem(item.id, item.name)}
                            className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl text-xs font-bold transition">Del</button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-50">
        <div className="flex justify-around items-center max-w-md mx-auto">
          {[
            { id: 'orders', icon: '📋', label: 'Orders', badge: orders.length },
            { id: 'reviews', icon: '⭐', label: 'Reviews', badge: pendingReviews.length },
            { id: 'menu', icon: '🍽️', label: 'Menu', badge: 0 },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center py-3 transition ${tab === t.id ? 'text-orange-500 border-t-2 border-orange-500' : 'text-gray-500 border-t-2 border-transparent'}`}>
              <span className="text-xl mb-0.5">{t.icon}</span>
              <span className="text-xs font-bold">{t.label}</span>
              {t.badge > 0 && <span className="text-xs bg-orange-500 text-white rounded-full px-1.5 mt-0.5">{t.badge}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
