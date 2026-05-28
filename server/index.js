import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import paymentRoute from './routes/payment.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

if (!PAYSTACK_SECRET_KEY) {
  console.error('Missing PAYSTACK_SECRET_KEY in environment.');
  process.exit(1);
}

if (!process.env.MONGODB_URI) {
  console.error('Missing MONGODB_URI in environment.');
  process.exit(1);
}

app.use(cors({ origin: ['http://localhost:5173', 'https://breadwrapz.netlify.app'] }));
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  },
}));

app.use('/api', paymentRoute);

app.listen(PORT, () => {
  console.log(`Paystack API server running on http://localhost:${PORT}`);
});
