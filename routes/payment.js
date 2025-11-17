// routes/payment.js
// Express routes for ToyyibPay payment operations (Render-ready, no SQL Server)

const express = require('express');
const router = express.Router();
const axios = require('axios');

/**
 * POST /api/payment/create
 * Create a ToyyibPay bill for a reservation
 * 
 * @body {number} reservation_id - The reservation ID
 * @body {string} name - Customer name (required)
 * @body {string} email - Customer email (required)
 * @body {string} phone - Customer phone (required)
 * @body {number} amount - Payment amount in RM (required)
 * @returns {Object} { success: boolean, billcode: string, url: string }
 */
router.post('/create', async (req, res) => {
  try {
    const { reservation_id, name, email, phone, amount } = req.body;

    console.log('[PaymentRoutes] Incoming request body:', JSON.stringify(req.body, null, 2));

    // Validate required fields
    if (!reservation_id || !name || !email || !phone || !amount) {
      console.error('[PaymentRoutes] Missing required fields');
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

    // Validate environment variables
    const TOYYIBPAY_SECRET_KEY = process.env.TOYYIBPAY_API_KEY?.trim();
    const TOYYIBPAY_CATEGORY_CODE = process.env.TOYYIBPAY_CATEGORY_CODE?.trim();
    const TOYYIBPAY_BASE_URL = process.env.TOYYIBPAY_BASE_URL?.trim();

    if (!TOYYIBPAY_SECRET_KEY || !TOYYIBPAY_CATEGORY_CODE || !TOYYIBPAY_BASE_URL) {
      console.error("❌ ToyyibPay environment variables missing!");
      return res.status(500).json({
        success: false,
        message: 'ToyyibPay configuration missing'
      });
    }

    // Prepare ToyyibPay request
    const billAmountInSen = Math.round(amountFloat * 100); // Convert RM to sen
    const billName = `Reservation #${reservationIdInt}`.substring(0, 30); // Max 30 chars
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
      billPhone: phone.trim()
    });

    const toyyibPayUrl = `${TOYYIBPAY_BASE_URL}/index.php/api/createBill`;

    console.log('[PaymentRoutes] Sending POST request to ToyyibPay:', toyyibPayUrl);

    // Send request to ToyyibPay
    const toyyibPayResponse = await axios.post(toyyibPayUrl, toyyibPayParams.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 30000
    });

    console.log('[PaymentRoutes] ToyyibPay response data:', JSON.stringify(toyyibPayResponse.data, null, 2));

    if (!Array.isArray(toyyibPayResponse.data) || !toyyibPayResponse.data[0]?.BillCode) {
      console.error('[PaymentRoutes] Invalid ToyyibPay response:', toyyibPayResponse.data);
      return res.status(500).json({
        success: false,
        message: 'Failed to create ToyyibPay bill: Invalid response'
      });
    }

    const billCode = toyyibPayResponse.data[0].BillCode;
    const url = `${TOYYIBPAY_BASE_URL}/${billCode}`;

    console.log('[PaymentRoutes] ✅ ToyyibPay bill created successfully! BillCode:', billCode);

    return res.status(200).json({
      success: true,
      billcode: billCode,
      url
    });

  } catch (axiosError) {
    console.error('[PaymentRoutes] ❌ Error calling ToyyibPay API:', axiosError.message);

    if (axiosError.response) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create ToyyibPay bill',
        details: axiosError.response.data
      });
    } else if (axiosError.request) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create ToyyibPay bill: No response from server'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to create ToyyibPay bill',
        details: axiosError.message
      });
    }
  }
});

module.exports = router;
