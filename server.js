// server.js - Render-ready version (ToyyibPay only)
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const paymentRoutes = require('./routes/payment.js');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Debug environment variables
console.log("✅ Loaded environment variables:");
console.log("TOYYIBPAY_API_KEY:", process.env.TOYYIBPAY_API_KEY ? process.env.TOYYIBPAY_API_KEY.substring(0, 10) + '...' : 'NOT SET');
console.log("TOYYIBPAY_CATEGORY_CODE:", process.env.TOYYIBPAY_CATEGORY_CODE || 'NOT SET');
console.log("TOYYIBPAY_BASE_URL:", process.env.TOYYIBPAY_BASE_URL || 'NOT SET');

// Routes
app.use('/api/payment', paymentRoutes);

// Default route
app.get('/', (req, res) => {
  res.send('✅ OnlinePusara ToyyibPay Backend is running successfully');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on Render at port ${PORT}`);
});
