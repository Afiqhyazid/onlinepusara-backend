// index.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const paymentRoutes = require('./routes/payment.js');

const app = express();

// 1️⃣ Middleware
app.use(express.json());
app.use(cors());

// 2️⃣ Routes
app.use('/api/payment', paymentRoutes);

// 3️⃣ Default route
app.get('/', (req, res) => {
  res.send('✅ OnlinePusara ToyyibPay Backend is running successfully');
});

// 4️⃣ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running at port ${PORT}`);
});
