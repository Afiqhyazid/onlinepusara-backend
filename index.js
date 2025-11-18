// index.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const paymentRoutes = require('./routes/payment.js');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For ToyyibPay callback
app.use(cors());

// Routes
app.use('/api/payment', paymentRoutes);

// Default route
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
  console.log(`Server running at port ${PORT}`);
});
