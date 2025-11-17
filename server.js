// server.js - Render-ready version (ToyyibPay + HTML pages)
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const paymentRoutes = require('./routes/payment.js');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Serve static HTML pages from "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Debug environment variables
console.log("✅ Loaded environment variables:");
console.log(
  "TOYYIBPAY_API_KEY:",
  process.env.TOYYIBPAY_API_KEY ? process.env.TOYYIBPAY_API_KEY.substring(0, 10) + '...' : 'NOT SET'
);
console.log("TOYYIBPAY_CATEGORY_CODE:", process.env.TOYYIBPAY_CATEGORY_CODE || 'NOT SET');
console.log("TOYYIBPAY_BASE_URL:", process.env.TOYYIBPAY_BASE_URL || 'NOT SET');

// Routes
app.use('/api/payment', paymentRoutes);

// 👉 NEW: Return route - serve HTML page
app.get('/api/payment/return', (req, res) => {
  console.log("🎉 [RETURN] User returned from ToyyibPay:", req.query);

  // Serve return.html from public folder
  res.sendFile(path.join(__dirname, 'public', 'return.html'));
});

// 👉 NEW: Callback route - serve HTML page
app.post('/api/payment/callback', (req, res) => {
  console.log("📥 [CALLBACK] ToyyibPay callback received:", req.body);

  // Serve callback.html from public folder
  res.sendFile(path.join(__dirname, 'public', 'callback.html'));
});

// Default route
app.get('/', (req, res) => {
  res.send('✅ OnlinePusara ToyyibPay Backend is running successfully');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on Render at port ${PORT}`);
});
