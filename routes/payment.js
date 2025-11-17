// routes/payment.js
// Express routes for ToyyibPay payment operations (Render-ready, HTML pages)

const express = require('express');
const router = express.Router();
const axios = require('axios');
const path = require('path');

/**
 * POST /api/payment/create
 * Create a ToyyibPay bill for a reservation
 */
router.post('/create', async (req, res) => {
  try {
    const { reservation_id, name, email, phone, amount } = req.body;

    console.log('[PaymentRoutes] Incoming request body:', JSON.stringify(req.body, null, 2));

    // Validate required fields
    if (!reservation_id || !name || !email || !phone || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: reservation_id, name, email, phone, amount'
      });
    }

    // Validate reservation_id
    const reservationIdInt = parseInt(reservation_id, 10);
    if (Number.isNaN(reservationIdInt) || reservationIdInt <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reservation_id. Must be a positive integer.'
      });
    }

    // Validate amount
    const amountFloat = parseFloat(amount);
    if (Number.isNaN(amountFloat) || amountFloat <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount. Must be a positive number.'
      });
    }

    // Environment variables
    const TOYYIBPAY_SECRET_KEY = process.env.TOYYIBPAY_API_KEY?.trim();
    const TOYYIBPAY_CATEGORY_CODE = process.env.TOYYIBPAY_CATEGORY_CODE?.trim();
    const TOYYIBPAY_BASE_URL = process.env.TOYYIBPAY_BASE_URL?.trim();

    if (!TOYYIBPAY_SECRET_KEY || !TOYYIBPAY_CATEGORY_CODE || !TOYYIBPAY_BASE_URL) {
      return res.status(500).json({
        success: false,
        message: 'ToyyibPay configuration missing'
      });
    }

    // Prepare ToyyibPay request
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
      return res.status(500).json({
        success: false,
        message: 'Failed to create ToyyibPay bill: Invalid response'
      });
    }

    const billCode = toyyibPayResponse.data[0].BillCode;
    const url = `${TOYYIBPAY_BASE_URL}/${billCode}`;

    return res.status(200).json({
      success: true,
      billcode: billCode,
      url
    });

  } catch (axiosError) {
    console.error('[PaymentRoutes] Error calling ToyyibPay API:', axiosError.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to create ToyyibPay bill',
      details: axiosError.response?.data || axiosError.message
    });
  }
});

// 🔥 Serve HTML page for Return URL
router.get('/return', (req, res) => {
  console.log("🎉 [RETURN] User returned from ToyyibPay:", req.query);
  res.sendFile(path.join(__dirname, '..', 'public', 'return.html'));
});

// 🔥 Serve HTML page for Callback URL
router.post('/callback', (req, res) => {
  console.log("📥 [CALLBACK] ToyyibPay callback received:", req.body);
  res.sendFile(path.join(__dirname, '..', 'public', 'callback.html'));
});

module.exports = router;
