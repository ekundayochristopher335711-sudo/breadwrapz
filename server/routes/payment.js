import express from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { Resend } from 'resend';
import { createOrder, getOrder, getOrderByReference, updateOrder } from '../data/orderStore.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const OWNER_EMAIL = 'arlotechweb@gmail.com';

async function notifyOwnerNewOrder(order) {
  if (!process.env.RESEND_API_KEY) return;
  const itemList = (order.items || []).map(i => `• ${i.name} — ₦${Number(i.price).toLocaleString()}`).join('\n');
  await resend.emails.send({
    from: 'Breadwrapz Orders <onboarding@resend.dev>',
    to: OWNER_EMAIL,
    subject: `New Order ${order.orderId} — ₦${Number(order.amount).toLocaleString()}`,
    text: `New order received!\n\nOrder ID: ${order.orderId}\nCustomer: ${order.customerName || 'N/A'}\nPhone: ${order.customerPhone || order.contact}\nDelivery: ${order.deliveryLocation}\n\nItems:\n${itemList}\n\nTotal: ₦${Number(order.amount).toLocaleString()}\n\nStatus: ${order.status}`,
  }).catch(err => console.error('Email error:', err));
}

async function notifyOwnerPaymentConfirmed(order) {
  if (!process.env.RESEND_API_KEY) return;
  await resend.emails.send({
    from: 'Breadwrapz Orders <onboarding@resend.dev>',
    to: OWNER_EMAIL,
    subject: `✅ Payment Confirmed — ${order.orderId}`,
    text: `Payment confirmed for order ${order.orderId}.\n\nCustomer: ${order.customerName || 'N/A'}\nPhone: ${order.customerPhone || order.contact}\nDelivery: ${order.deliveryLocation}\nTotal: ₦${Number(order.amount).toLocaleString()}\n\nYou can now prepare this order.`,
  }).catch(err => console.error('Email error:', err));
}

const router = express.Router();

router.post('/initialize-payment', async (req, res) => {
  try {
    const { email, amount, items, deliveryLocation, contact, customerName, customerPhone } = req.body;
    const normalizedEmail = email?.trim().toLowerCase() || `customer+${Date.now()}@breadwrapz.com`;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Amount is required and must be greater than zero.' });
    }

    const orderId = `BRD-${Date.now()}`;
    const reference = orderId;
    const order = await createOrder({
      orderId,
      reference,
      email: normalizedEmail,
      contact,
      customerName,
      customerPhone,
      amount,
      items,
      deliveryLocation,
      status: 'Order Received',
      createdAt: new Date().toISOString(),
    });

    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: normalizedEmail,
        amount: Math.round(amount * 100),
        reference,
        callback_url: process.env.PAYSTACK_CALLBACK_URL || 'http://localhost:5173/',
        metadata: {
          orderId,
          contact,
          deliveryLocation,
          items,
        },
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
      order,
      paystack: response.data.data,
    });
  } catch (error) {
    console.error(error.response?.data || error.message || error);
    return res.status(500).json({
      error: 'Payment initialization failed',
      details: error.response?.data || error.message,
    });
  }
});

router.post('/verify-payment', async (req, res) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({ error: 'Reference is required.' });
    }

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
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

    return res.json({
      paymentData,
      order: order ? await getOrder(order.orderId) : null,
    });
  } catch (error) {
    console.error(error.response?.data || error.message || error);
    return res.status(500).json({
      error: 'Payment verification failed',
      details: error.response?.data || error.message,
    });
  }
});

router.get('/track-order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required.' });
    }

    const order = await getOrder(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    return res.json(order);
  } catch (error) {
    console.error(error.message || error);
    return res.status(500).json({ error: 'Failed to fetch order status.' });
  }
});

router.post('/webhook', async (req, res) => {
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET;
  if (!secret) {
    console.error('PAYSTACK_WEBHOOK_SECRET not set — webhook ignored.');
    return res.sendStatus(200);
  }

  const signature = req.headers['x-paystack-signature'];
  const hash = crypto
    .createHmac('sha512', secret)
    .update(req.rawBody)
    .digest('hex');

  if (hash !== signature) {
    return res.status(400).send('Invalid signature');
  }

  const event = req.body;

  if (event.event === 'charge.success') {
    const { reference } = event.data;
    const order = await getOrderByReference(reference);
    if (order) {
      await updateOrder(order.orderId, {
        status: 'Confirmed',
        paymentVerified: true,
      });
      console.log(`Webhook: order ${order.orderId} confirmed via Paystack.`);
      notifyOwnerPaymentConfirmed(order);
    }
  }

  res.sendStatus(200);
});

export default router;
