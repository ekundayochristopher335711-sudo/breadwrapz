import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import paymentRoute from './routes/payment.js';
import authRoute from './routes/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

if (!PAYSTACK_SECRET_KEY) {
  console.error('Missing PAYSTACK_SECRET_KEY in environment.');
  process.exit(1);
}

if (!process.env.MONGODB_URI) {
  console.error('Missing MONGODB_URI in environment.');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('Missing JWT_SECRET in environment.');
  process.exit(1);
}

if (!process.env.ADMIN_KEY) {
  console.error('Missing ADMIN_KEY in environment.');
  process.exit(1);
}

app.use(cors({ origin: [FRONTEND_URL, 'https://breadwrapz2.netlify.app'] }));
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  },
}));

app.use('/api/auth', authRoute);
app.use('/api', paymentRoute);

app.listen(PORT, () => {
  console.log(`Paystack API server running on http://localhost:${PORT}`);
  console.log(`Frontend allowed origin: ${FRONTEND_URL}`);
});
