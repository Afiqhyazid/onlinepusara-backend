// routes/payment.js
// Express routes for ToyyibPay payment operations (Render-only, JSON + HTML fallback)

const express = require('express');
const router = express.Router();
const axios = require('axios');
const path = require('path');

// Middleware to parse URL-encoded body (for ToyyibPay callback)
router.use(express.urlencoded({ extended: true }));

/**
 * POST /api/payment/create
 * Create a ToyyibPay bill for a reservation
 */
router.post('/create', async (req, res) => {
  try {
    const { reservation_id, name, email, phone, amount } = req.body;

    if (!reservation_id || !name || !email || !phone || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: reservation_id, name, email, phone, amount'
      });
    }

    const reservationIdInt = parseInt(reservation_id, 10);
    const amountFloat = parseFloat(amount);

    if (Number.isNaN(reservationIdInt) || reservationIdInt <= 0 || Number.isNaN(amountFloat) || amountFloat <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reservation_id or amount'
      });
    }

    const TOYYIBPAY_SECRET_KEY = process.env.TOYYIBPAY_API_KEY?.trim();
    const TOYYIBPAY_CATEGORY_CODE = process.env.TOYYIBPAY_CATEGORY_CODE?.trim();
    const TOYYIBPAY_BASE_URL = process.env.TOYYIBPAY_BASE_URL?.trim();

    if (!TOYYIBPAY_SECRET_KEY || !TOYYIBPAY_CATEGORY_CODE || !TOYYIBPAY_BASE_URL) {
      return res.status(500).json({ success: false, message: 'ToyyibPay configuration missing' });
    }

    const billAmountInSen = Math.round(amountFloat * 100);
    const billName = `Reservation #${reservationIdInt}`.substring(0, 30);
    const billDescription = `Payment for Reservation #${reservationIdInt} (RM ${amountFloat.toFixed(2)})`;

    const toyyibPayParams = new URLSearchParams({
      userSecretKey: TOYYIBPAY_SECRET_KEY,
      categoryCode: TOYYIBPAY_CATEGORY_CODE,
      billName,
      billDescription,
      billPriceSetting: '1',
      billPayorInfo: '1',
      billAmount: billAmountInSen.toString(),
      billTo: name.trim(),
      billEmail: email.trim(),
      billPhone: phone.trim(),
      billReturnUrl: "https://onlinepusara-backend.onrender.com/api/payment/return",
      billCallbackUrl: "https://onlinepusara-backend.onrender.com/api/payment/callback"
    });

    const toyyibPayUrl = `${TOYYIBPAY_BASE_URL}/index.php/api/createBill`;

    const toyyibPayResponse = await axios.post(toyyibPayUrl, toyyibPayParams.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30000
    });

    if (!Array.isArray(toyyibPayResponse.data) || !toyyibPayResponse.data[0]?.BillCode) {
      return res.status(500).json({ success: false, message: 'Failed to create ToyyibPay bill' });
    }

    const billCode = toyyibPayResponse.data[0].BillCode;
    const paymentUrl = `${TOYYIBPAY_BASE_URL}/${billCode}`;

    return res.status(200).json({ success: true, billCode, paymentUrl });

  } catch (error) {
    console.error('[PaymentRoutes] Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to create ToyyibPay bill',
      details: error.response?.data || error.message
    });
  }
});

/**
 * GET /api/payment/return
 * Redirected here after payment in WebView
 */
router.get('/return', async (req, res) => {
  const { statusId, billCode, order_id, msg, transaction_id } = req.query;

  console.log("🎉 [RETURN] User returned from ToyyibPay:", req.query);

  // Optional: update your database here if needed

  // Respond JSON for Android app
  res.json({
    success: true,
    statusId: statusId || null,
    billCode: billCode || null,
    message: msg || null,
    transactionId: transaction_id || null
  });
});

/**
 * POST /api/payment/callback
 * Server-to-server notification from ToyyibPay
 */
router.post('/callback', async (req, res) => {
  const statusId = req.body.statusId || req.query.statusId;
  const billCode = req.body.billCode || req.query.billCode;
  const order_id = req.body.order_id || req.query.order_id;
  const msg = req.body.msg || req.query.msg;
  const transaction_id = req.body.transaction_id || req.query.transaction_id;
  const amount = req.body.amount || req.query.amount;

  console.log("📥 [CALLBACK] ToyyibPay callback received:", {
    statusId, billCode, order_id, msg, transaction_id, amount
  });

  // Optional: update database here

  // Respond RECEIVEOK to ToyyibPay
  res.status(200).send("RECEIVEOK");
});

module.exports = router;
