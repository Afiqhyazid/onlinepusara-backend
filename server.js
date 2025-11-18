// server.js - Render-ready version (ToyyibPay + JSON + HTML fallback)
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

// ✅ Make sure the path is correct relative to server.js
const paymentRoutes = require(path.join(__dirname, 'routes', 'payment.js'));

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For ToyyibPay callback (URL-encoded form data)
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

// Optional root route for testing
app.get('/', (req, res) => {
  res.send('✅ OnlinePusara ToyyibPay Backend is running successfully');
});

// Fallback for 404s
app.use((req, res) => {
  res.status(404).send('❌ Route not found');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on Render at port ${PORT}`);
});
