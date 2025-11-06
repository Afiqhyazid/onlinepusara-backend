require('dotenv').config();
const express = require('express');
const cors = require('cors');
const paymentRoutes = require('./routes/payment');

const app = express();
app.use(express.json());
app.use(cors());

// Routes
app.use('/api/payment', paymentRoutes);

// Default route
app.get('/', (req, res) => {
  res.send('🟢 OnlinePusara ToyyibPay Backend is running successfully.');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
