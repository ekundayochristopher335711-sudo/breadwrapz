import express from 'express';
import axios from 'axios';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';
import { createOrder, getOrder, getOrderByReference, updateOrder, getAllOrders } from '../data/orderStore.js';
import { calculateTotal, calculateDeliveryFee, DELIVERY_FEE } from '../data/menuPrices.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const OWNER_EMAIL = 'ekundayochristopher335711@gmail.com';
const MAX_ORDER_AMOUNT = 500000; // ₦500,000 hard cap per order
const JWT_SECRET = process.env.JWT_SECRET || 'breadwrapz_secret';

function getUserIdFromToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload.userId;
  } catch {
    return null;
  }
}

function adminKeyValid(provided) {
  const expected = process.env.ADMIN_KEY;
  if (!provided || !expected) return false;
  try {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

async function notifyOwnerNewOrder(order) {
  if (!process.env.RESEND_API_KEY) return;
  const itemList = (order.items || []).map(i => `• ${i.name} — ₦${Number(i.price).toLocaleString()}`).join('\n');
  const fromAddress = `${process.env.RESEND_FROM_NAME || 'Breadwrapz Orders'} <${process.env.RESEND_FROM || 'onboarding@resend.dev'}>`;
  await resend.emails.send({
    from: fromAddress,
    to: OWNER_EMAIL,
    subject: `New Order ${order.orderId} — ₦${Number(order.amount).toLocaleString()}`,
    text: `New order received!\n\nOrder ID: ${order.orderId}\nCustomer: ${order.customerName || 'N/A'}\nPhone: ${order.customerPhone || order.contact}\nDelivery: ${order.deliveryLocation}\n\nItems:\n${itemList}\n\nTotal: ₦${Number(order.amount).toLocaleString()}\n\nStatus: ${order.status}`,
  }).catch(err => console.error('Email error:', err));
}

async function notifyOwnerPaymentConfirmed(order) {
  if (!process.env.RESEND_API_KEY) return;
  const fromAddress2 = `${process.env.RESEND_FROM_NAME || 'Breadwrapz Orders'} <${process.env.RESEND_FROM || 'onboarding@resend.dev'}>`;
  await resend.emails.send({
    from: fromAddress2,
    to: OWNER_EMAIL,
    subject: `✅ Payment Confirmed — ${order.orderId}`,
    text: `Payment confirmed for order ${order.orderId}.\n\nCustomer: ${order.customerName || 'N/A'}\nPhone: ${order.customerPhone || order.contact}\nDelivery: ${order.deliveryLocation}\nTotal: ₦${Number(order.amount).toLocaleString()}\n\nYou can now prepare this order.`,
  }).catch(err => console.error('Email error:', err));
}

const router = express.Router();

const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many checkout attempts. Please wait 15 minutes and try again.' },
});

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait and try again.' },
});

router.post('/initialize-payment', checkoutLimiter, async (req, res) => {
  try {
    const { email, items, deliveryLocation, contact, customerName, customerPhone, deliveryDistanceKm } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty.' });
    }

    if (!deliveryLocation?.trim()) {
      return res.status(400).json({ error: 'Delivery location is required.' });
    }

    const parsedDistance = Number(deliveryDistanceKm);
    const computedDeliveryFee = Number.isFinite(parsedDistance) && parsedDistance > 0
      ? calculateDeliveryFee(parsedDistance)
      : DELIVERY_FEE;

    // Always calculate amount server-side — never trust client amount
    const amount = calculateTotal(items, computedDeliveryFee);

    if (amount <= 0) {
      return res.status(400).json({ error: 'Order total must be greater than zero.' });
    }

    if (amount > MAX_ORDER_AMOUNT) {
      return res.status(400).json({ error: 'Order total exceeds maximum allowed amount.' });
    }

    const normalizedEmail = email?.trim().toLowerCase() || `customer+${Date.now()}@breadwrapz.com`;
    const orderId = `BRD-${Date.now()}`;
    const reference = orderId;

    const userId = getUserIdFromToken(req);
    const order = await createOrder({
      orderId,
      reference,
      userId,
      email: normalizedEmail,
      contact,
      customerName,
      customerPhone,
      amount,
      items,
      deliveryLocation: deliveryLocation.trim(),
      deliveryDistanceKm: Number.isFinite(parsedDistance) && parsedDistance > 0 ? parsedDistance : null,
      deliveryFee: computedDeliveryFee,
      status: 'Order Received',
      createdAt: new Date().toISOString(),
    });

    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: normalizedEmail,
        amount: Math.round(amount * 100),
        reference,
        callback_url: process.env.PAYSTACK_CALLBACK_URL || process.env.FRONTEND_URL || 'http://localhost:5173',
        metadata: { orderId, contact, deliveryLocation, items, deliveryDistanceKm: parsedDistance, deliveryFee: computedDeliveryFee },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    notifyOwnerNewOrder(order);

    return res.json({
      order: { orderId: order.orderId, reference: order.reference, amount: order.amount, status: order.status, deliveryFee: order.deliveryFee, deliveryDistanceKm: order.deliveryDistanceKm },
      paystack: response.data.data,
    });
  } catch (error) {
    console.error('initialize-payment error:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Payment initialization failed. Please try again.' });
  }
});

router.post('/verify-payment', verifyLimiter, async (req, res) => {
  try {
    const { reference } = req.body;

    if (!reference || typeof reference !== 'string') {
      return res.status(400).json({ error: 'Reference is required.' });
    }

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );

    const paymentData = response.data.data;
    const order = await getOrderByReference(reference);

    if (paymentData.status === 'success' && order) {
      await updateOrder(order.orderId, {
        status: 'Confirmed',
        paymentVerified: true,
        updatedAt: new Date().toISOString(),
      });
    }

    const updatedOrder = order ? await getOrder(order.orderId) : null;
    return res.json({
      paymentData: { status: paymentData.status },
      order: updatedOrder ? {
        orderId: updatedOrder.orderId,
        status: updatedOrder.status,
        amount: updatedOrder.amount,
        items: updatedOrder.items,
        createdAt: updatedOrder.createdAt,
      } : null,
    });
  } catch (error) {
    console.error('verify-payment error:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Payment verification failed. Please try again.' });
  }
});

router.get('/track-order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId || typeof orderId !== 'string') {
      return res.status(400).json({ error: 'Order ID is required.' });
    }

    const order = await getOrder(orderId.trim().toUpperCase());
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    // Return only public-safe fields — no email or private contact info
    return res.json({
      orderId: order.orderId,
      status: order.status,
      amount: order.amount,
      items: order.items,
      deliveryLocation: order.deliveryLocation,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    });
  } catch (error) {
    console.error('track-order error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch order status.' });
  }
});

router.get('/admin/orders', async (req, res) => {
  if (!adminKeyValid(req.headers['x-admin-key'])) {
    return res.status(401).json({ error: 'Unauthorised' });
  }
  const orders = await getAllOrders();
  return res.json(orders);
});

router.post('/admin/orders/:orderId/status', async (req, res) => {
  if (!adminKeyValid(req.headers['x-admin-key'])) {
    return res.status(401).json({ error: 'Unauthorised' });
  }
  const { orderId } = req.params;
  const { status } = req.body;
  const validStatuses = ['Order Received', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status.', validStatuses });
  }
  const updated = await updateOrder(orderId, { status });
  if (!updated) return res.status(404).json({ error: 'Order not found.' });
  return res.json(updated);
});

router.post('/webhook', async (req, res) => {
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET;
  if (!secret) {
    console.error('PAYSTACK_WEBHOOK_SECRET not set — webhook rejected.');
    return res.sendStatus(200);
  }

  const signature = req.headers['x-paystack-signature'];
  if (!signature) return res.status(400).send('Missing signature');

  const hash = crypto.createHmac('sha512', secret).update(req.rawBody).digest('hex');
  if (hash !== signature) return res.status(400).send('Invalid signature');

  const event = req.body;

  if (event.event === 'charge.success') {
    const { reference } = event.data;
    const order = await getOrderByReference(reference);
    if (order) {
      await updateOrder(order.orderId, { status: 'Confirmed', paymentVerified: true });
      console.log(`Webhook: order ${order.orderId} confirmed.`);
      notifyOwnerPaymentConfirmed(order);
    }
  }

  res.sendStatus(200);
});

export default router;
