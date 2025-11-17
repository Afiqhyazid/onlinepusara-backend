// server.js
// 1️⃣ Load environment variables at the top
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { poolPromise } = require('./db');
const paymentRoutes = require('./routes/payment.js');
const reservationRoutes = require('./routes/reservationRoutes.js');

// 2️⃣ Debug loaded environment variables
console.log("✅ Loaded environment variables:");
console.log("TOYYIBPAY_API_KEY:", process.env.TOYYIBPAY_API_KEY ? process.env.TOYYIBPAY_API_KEY.substring(0, 10) + '...' : 'NOT SET');
console.log("TOYYIBPAY_CATEGORY_CODE:", process.env.TOYYIBPAY_CATEGORY_CODE || 'NOT SET');
console.log("TOYYIBPAY_BASE_URL:", process.env.TOYYIBPAY_BASE_URL || 'NOT SET');
console.log('Dotenv config loaded. Environment variables available:', Object.keys(process.env).length);
console.log('Route types: paymentRoutes =', typeof paymentRoutes, ', reservationRoutes =', typeof reservationRoutes);

const app = express();

// 3️⃣ Middleware
app.use(express.json());
app.use(cors());

// 4️⃣ Ensure database connection is established
poolPromise.then(() => {
  console.log("✅ Database pool created, ready for queries.");
}).catch(err => {
  console.error("❌ Database pool creation failed:", err);
});

// 5️⃣ Routes
// Payment routes handle ToyyibPay bill creation and callbacks
app.use('/api/payment', paymentRoutes);

// Reservation routes handle SQL Server reservation CRUD
app.use('/api/reservations', reservationRoutes);

// 6️⃣ Default route
app.get('/', (req, res) => {
  res.send('✅ OnlinePusara ToyyibPay Backend is running successfully');
});

// 7️⃣ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT} or on Render at port ${PORT}`);
});
