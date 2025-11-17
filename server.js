// 1️⃣ Ensure dotenv is loaded at the very top
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const paymentRoutes = require('./routes/payment.js');
const reservationRoutes = require('./routes/reservationRoutes.js');
const { poolPromise } = require('./db');

// 2️⃣ Debug loaded environment variables
console.log("✅ Loaded environment variables:");
console.log("TOYYIBPAY_API_KEY:", process.env.TOYYIBPAY_API_KEY ? process.env.TOYYIBPAY_API_KEY.substring(0, 10) + '...' : 'NOT SET');
console.log("TOYYIBPAY_CATEGORY_CODE:", process.env.TOYYIBPAY_CATEGORY_CODE || 'NOT SET');
console.log("TOYYIBPAY_BASE_URL:", process.env.TOYYIBPAY_BASE_URL || 'NOT SET');
console.log('Dotenv config loaded. Environment variables available:', Object.keys(process.env).length);
console.log('Route types: paymentRoutes =', typeof paymentRoutes, ', reservationRoutes =', typeof reservationRoutes);

const app = express();
app.use(express.json());
app.use(cors());

// Ensure database connection is established
poolPromise.then(() => {
  console.log("Database pool created, ready for queries.");
}).catch(err => {
  console.error("Database pool creation failed:", err);
});

// Routes
app.use('/api/payment', paymentRoutes);
app.use('/api/reservations', reservationRoutes);

// Default route
app.get('/', (req, res) => {
  res.send('OnlinePusara ToyyibPay Backend is running successfully');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://172.20.10.5:${PORT}`);
});
