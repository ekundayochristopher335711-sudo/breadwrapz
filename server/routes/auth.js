import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';
import { createUser, getUserByEmailWithPassword, getUserByEmail, getUserByVerificationToken, getUserById, updateUser } from '../data/userStore.js';
import { getOrdersByUserId } from '../data/orderStore.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'breadwrapz_secret';
const JWT_EXPIRES_IN = '7d';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function createToken(user) {
  return jwt.sign({ userId: user.userId, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function createVerificationToken() {
  return crypto.randomBytes(24).toString('hex');
}

async function sendVerificationEmail(user) {
  if (!resend) {
    console.warn('RESEND_API_KEY not configured; skipping verification email.');
    return;
  }

  const verificationLink = `${FRONTEND_URL}/verify-email?token=${user.verificationToken}`;
  const text = `Hello ${user.name},\n\nPlease verify your Breadwrapz account by clicking the link below:\n\n${verificationLink}\n\nIf you did not request this, please ignore this email.\n\nThank you!`;

  try {
    await resend.emails.send({
      from: 'Breadwrapz <onboarding@resend.dev>',
      to: user.email,
      subject: 'Verify your Breadwrapz account',
      text,
    });
  } catch (error) {
    console.error('verification email send failed:', error?.message || error);
  }
}

export function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization token.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name?.trim() || !email?.trim() || !phone?.trim() || !password?.trim()) {
      return res.status(400).json({ error: 'Name, email, phone, and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await getUserByEmail(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = createVerificationToken();
    const user = {
      userId: `USR-${Date.now()}`,
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      password: passwordHash,
      verified: false,
      verificationToken,
      verificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await createUser(user);
    await sendVerificationEmail(user);

    return res.json({ message: 'Registration successful. Check your email for a verification link before logging in.' });
  } catch (error) {
    console.error('register error:', error.message);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email?.trim() || !password?.trim()) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await getUserByEmailWithPassword(email.trim().toLowerCase());
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!user.verified) {
      return res.status(403).json({ error: 'Email not verified. Check your inbox for the verification link.' });
    }

    const token = createToken(user);
    return res.json({ token, user: { userId: user.userId, name: user.name, email: user.email, phone: user.phone } });
  } catch (error) {
    console.error('login error:', error.message);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token?.trim()) {
      return res.status(400).json({ error: 'Verification token is required.' });
    }

    const user = await getUserByVerificationToken(token.trim());
    if (!user) {
      return res.status(404).json({ error: 'Verification link is invalid or has expired.' });
    }

    if (user.verified) {
      return res.json({ message: 'Your email is already verified. You can now log in.' });
    }

    if (user.verificationExpiresAt && new Date(user.verificationExpiresAt) < new Date()) {
      return res.status(400).json({ error: 'Verification link has expired. Please register again or request a new link.' });
    }

    await updateUser(user.userId, {
      verified: true,
      verificationToken: null,
      verificationExpiresAt: null,
    });

    return res.json({ message: 'Email verified successfully. Please log in to access your profile.' });
  } catch (error) {
    console.error('verify error:', error.message);
    return res.status(500).json({ error: 'Email verification failed. Please try again.' });
  }
});

router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email?.trim()) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const user = await getUserByEmail(email.trim().toLowerCase());
    if (!user) {
      return res.status(404).json({ error: 'No account found with that email.' });
    }

    if (user.verified) {
      return res.json({ message: 'Account is already verified. Please log in.' });
    }

    const verificationToken = createVerificationToken();
    await updateUser(user.userId, {
      verificationToken,
      verificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    await sendVerificationEmail({ ...user, verificationToken });
    return res.json({ message: 'A new verification link has been sent to your email.' });
  } catch (error) {
    console.error('resend verification error:', error.message);
    return res.status(500).json({ error: 'Could not resend verification email. Please try again.' });
  }
});

router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.json({ user });
  } catch (error) {
    console.error('profile error:', error.message);
    return res.status(500).json({ error: 'Unable to load profile.' });
  }
});

router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, phone } = req.body;
    const updates = {};
    if (name?.trim()) updates.name = name.trim();
    if (phone?.trim()) updates.phone = phone.trim();
    const user = await updateUser(req.user.userId, updates);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.json({ user });
  } catch (error) {
    console.error('profile update error:', error.message);
    return res.status(500).json({ error: 'Unable to update profile.' });
  }
});

router.get('/orders', authenticateToken, async (req, res) => {
  try {
    const orders = await getOrdersByUserId(req.user.userId);
    return res.json({ orders });
  } catch (error) {
    console.error('orders error:', error.message);
    return res.status(500).json({ error: 'Unable to load orders.' });
  }
});

export default router;
