// routes/payment.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

const { TOYYIBPAY_API_KEY, TOYYIBPAY_CATEGORY_CODE } = process.env;

// 🧾 Create a ToyyibPay Bill
router.post('/create', async (req, res) => {
  try {
    const { name, email, amount } = req.body;

    const response = await axios.post('https://dev.toyyibpay.com/index.php/api/createBill', null, {
      params: {
        userSecretKey: TOYYIBPAY_API_KEY,
        categoryCode: TOYYIBPAY_CATEGORY_CODE,
        billName: 'OnlinePusara Payment',
        billDescription: 'Gravestone booking payment',
        billPriceSetting: 1,
        billAmount: amount * 100, // convert RM to sen
        billReturnUrl: 'https://onlinepusara.onrender.com/api/payment/success',
        billCallbackUrl: 'https://onlinepusara.onrender.com/api/payment/callback',
        billTo: name,
        billEmail: email,
      },
    });

    const billCode = response.data[0].BillCode;
    const paymentUrl = `https://dev.toyyibpay.com/${billCode}`;

    res.json({ paymentUrl });
  } catch (error) {
    console.error('❌ Error creating ToyyibPay bill:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to create ToyyibPay bill' });
  }
});

// ✅ Success page (redirect after payment)
router.get('/success', (req, res) => {
  res.send('✅ Payment successful! You can now close this page.');
});

// 🔁 Callback from ToyyibPay
router.post('/callback', (req, res) => {
  console.log('📩 Payment callback received:', req.body);
  res.sendStatus(200);
});

// 🔍 Test route to confirm API works
router.get('/test', (req, res) => {
  res.json({ message: 'Payment API is working ✅' });
});

module.exports = router;
