// index.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');

// Try to require routes with error handling
let paymentRoutes, reservationRoutes, poolPromise;

try {
  console.log('📦 Loading payment routes...');
  paymentRoutes = require('./routes/payment.js');
  console.log('✅ Payment routes loaded');
} catch (error) {
  console.error('❌ Error loading payment routes:', error);
  throw error;
}

try {
  console.log('📦 Loading reservation routes...');
  reservationRoutes = require('./routes/reservationRoutes.js');
  console.log('✅ Reservation routes loaded');
} catch (error) {
  console.error('❌ Error loading reservation routes:', error);
  throw error;
}

try {
  console.log('📦 Loading database connection...');
  const dbModule = require('./db');
  poolPromise = dbModule.poolPromise;
  console.log('✅ Database module loaded');
} catch (error) {
  console.error('❌ Error loading database module:', error);
  throw error;
}

const app = express();

// 1️⃣ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For ToyyibPay callback
app.use(cors());

// 2️⃣ Ensure database connection is established
poolPromise.then(() => {
  console.log("✅ Database pool created, ready for queries.");
}).catch(err => {
  console.error("❌ Database pool creation failed:", err);
});

// 3️⃣ Routes
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

// 4️⃣ Default route
app.get('/', (req, res) => {
  res.send('✅ OnlinePusara ToyyibPay Backend is running successfully');
});

// 5️⃣ 404 Handler - must be after all routes
app.use((req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// 6️⃣ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running at port ${PORT}`);
  console.log(`✅ Reservation API: http://localhost:${PORT}/api/reservations/:id`);
  console.log(`✅ Payment API: http://localhost:${PORT}/api/payment/create`);
});
