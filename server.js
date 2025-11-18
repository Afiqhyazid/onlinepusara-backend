// server.js - Render-ready version (ToyyibPay + JSON + HTML fallback)
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

// ✅ Correct path relative to server.js
const paymentRoutes = require('./routes/payment.js');
const reservationRoutes = require('./routes/reservationRoutes.js');
const { poolPromise } = require('./db');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For ToyyibPay callback
app.use(cors());

// Serve static HTML pages from "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Debug environment variables for ToyyibPay only
console.log("✅ Loaded environment variables:");
console.log(
  "TOYYIBPAY_API_KEY:",
  process.env.TOYYIBPAY_API_KEY ? process.env.TOYYIBPAY_API_KEY.substring(0, 10) + '...' : 'NOT SET'
);
console.log("TOYYIBPAY_CATEGORY_CODE:", process.env.TOYYIBPAY_CATEGORY_CODE || 'NOT SET');
console.log("TOYYIBPAY_BASE_URL:", process.env.TOYYIBPAY_BASE_URL || 'NOT SET');

// Ensure database connection is established
poolPromise.then(() => {
  console.log("✅ Database pool created, ready for queries.");
}).catch(err => {
  console.error("❌ Database pool creation failed:", err);
});

// Routes
console.log('🔗 Mounting routes...');
app.use('/api/payment', paymentRoutes);
console.log('✅ /api/payment routes mounted');

app.use('/api/reservations', reservationRoutes); // For fetching reservation details
console.log('✅ /api/reservations routes mounted');

// Test route to verify routing works
app.get('/api/reservations/test', (req, res) => {
  res.json({ success: true, message: 'Reservation API test endpoint is working!' });
});
console.log('✅ /api/reservations/test route added');

// Optional root route for testing
app.get('/', (req, res) => {
  res.send('✅ OnlinePusara ToyyibPay Backend is running successfully');
});

// Fallback for 404s
app.use((req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on Render at port ${PORT}`);
  console.log(`✅ Reservation API: https://onlinepusara-backend.onrender.com/api/reservations/:id`);
  console.log(`✅ Payment API: https://onlinepusara-backend.onrender.com/api/payment/create`);
});
