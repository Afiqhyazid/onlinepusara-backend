// routes/payment.js
// Express routes for ToyyibPay payment operations (Render-only, JSON + HTML fallback)

const express = require('express');
const router = express.Router();
const axios = require('axios');
const path = require('path');
const multer = require('multer');
const sql = require('mssql');
const { supabase } = require('../supabaseClient');

const SUPABASE_TABLE = process.env.SUPABASE_PAYMENT_TABLE || 'payment_orders';

// SQL Server connection config (only used when needed, not on startup)
const getSqlConfig = () => ({
  server: process.env.SQL_SERVER || '172.20.10.5',
  port: parseInt(process.env.SQL_PORT || '1433'),
  database: process.env.SQL_DATABASE || 'OnlinePusaraDB',
  user: process.env.SQL_USER || 'sa',
  password: process.env.SQL_PASSWORD || '12345',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    requestTimeout: 5000, // 5 second timeout
    connectionTimeout: 5000 // 5 second connection timeout
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
});

// Middleware to parse URL-encoded body (for ToyyibPay return)
router.use(express.urlencoded({ extended: true }));

// Multer middleware for parsing multipart/form-data (for ToyyibPay callback)
// No storage needed, just parsing
const upload = multer();

const deriveToyyibErrorMessage = (details) => {
  if (!details) {
    return null;
  }

  if (typeof details === 'string') {
    return details;
  }

  if (Array.isArray(details) && details.length > 0) {
    const first = details[0];
    if (!first) return null;
    if (typeof first === 'string') return first;
    if (first.msg) return first.msg;
    if (first.Msg) return first.Msg;
    if (first.message) return first.message;
  }

  if (details.msg) return details.msg;
  if (details.Msg) return details.Msg;
  if (details.message) return details.message;

  try {
    return JSON.stringify(details);
  } catch (err) {
    return null;
  }
};

/**
 * POST /api/payment/create
 * Create a ToyyibPay bill for a reservation
 */
router.post('/create', async (req, res) => {
  const startTime = Date.now();
  console.log('[PaymentRoutes] 📥 POST /api/payment/create received at', new Date().toISOString());
  console.log('[PaymentRoutes] Request body:', JSON.stringify(req.body));

  try {
    const { reservation_id, name, email, phone, amount, items } = req.body;

    if (!reservation_id || !name || !email || !phone || !amount) {
      console.log('[PaymentRoutes] ❌ Missing required fields');
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

    const nowIso = new Date().toISOString();

    if (!supabase) {
      console.error('[PaymentRoutes] Supabase client not initialized');
      return res.status(500).json({ success: false, message: 'Supabase client is not initialized' });
    }

    console.log('[PaymentRoutes] Inserting pending order into Supabase:', {
      reservation_id: reservationIdInt,
      name,
      email,
      phone,
      amount: amountFloat,
      items: items || null
    });

    const supabaseInsertStart = Date.now();
    const { data: pendingOrder, error: insertError } = await supabase
      .from(SUPABASE_TABLE)
      .insert({
        reservation_id: reservationIdInt,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        amount: amountFloat,
        items: items || null,
        status: 'pending',
        created_at: nowIso,
        updated_at: nowIso
      })
      .select()
      .single();
    const supabaseInsertTime = Date.now() - supabaseInsertStart;
    console.log(`[PaymentRoutes] Supabase insert took ${supabaseInsertTime}ms`);

    if (insertError) {
      console.error('[PaymentRoutes] Failed to insert pending order into Supabase:', insertError);
      return res.status(500).json({ success: false, message: 'Failed to store payment record', details: insertError.message });
    }
    console.log('[PaymentRoutes] ✅ Supabase insert successful, order ID:', pendingOrder?.id);

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
    console.log('[PaymentRoutes] Calling ToyyibPay API:', toyyibPayUrl);

    const toyyibPayStart = Date.now();
    const toyyibPayResponse = await axios.post(toyyibPayUrl, toyyibPayParams.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 25000 // 25 seconds timeout
    });
    const toyyibPayTime = Date.now() - toyyibPayStart;
    console.log(`[PaymentRoutes] ToyyibPay API call took ${toyyibPayTime}ms`);

    if (!Array.isArray(toyyibPayResponse.data) || !toyyibPayResponse.data[0]?.BillCode) {
      return res.status(500).json({ success: false, message: 'Failed to create ToyyibPay bill' });
    }

    const billCode = toyyibPayResponse.data[0].BillCode;
    const paymentUrl = `${TOYYIBPAY_BASE_URL}/${billCode}`;

    console.log('[PaymentRoutes] Updating Supabase record with bill code:', billCode);

    const { error: updateError } = await supabase
      .from(SUPABASE_TABLE)
      .update({
        bill_code: billCode,
        updated_at: new Date().toISOString()
      })
      .eq('id', pendingOrder.id);

    if (updateError) {
      console.error('[PaymentRoutes] Failed to update bill code in Supabase:', updateError);
      // Continue even if update fails to avoid blocking payment
    } else {
      console.log('[PaymentRoutes] ✅ Bill code updated in Supabase');
    }

    // Insert into PaymentBillMapping table in SQL Server (optional - won't block if it fails)
    try {
      const pool = await sql.connect(getSqlConfig());
      await pool.request()
        .input('billCode', sql.NVarChar, billCode)
        .input('reservationId', sql.Int, reservationIdInt)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM PaymentBillMapping WHERE bill_code = @billCode)
          BEGIN
            INSERT INTO PaymentBillMapping (bill_code, reservation_id, created_at)
            VALUES (@billCode, @reservationId, GETDATE())
          END
        `);
      console.log('[PaymentRoutes] ✅ PaymentBillMapping updated in SQL Server');
      await pool.close();
    } catch (sqlError) {
      console.error('[PaymentRoutes] Failed to update PaymentBillMapping:', sqlError.message || sqlError);
      // Continue even if SQL update fails - we don't want to block payment creation
      // This is optional functionality
    }

    const totalTime = Date.now() - startTime;
    console.log(`[PaymentRoutes] ✅ Payment bill created successfully in ${totalTime}ms: billCode=${billCode}`);
    return res.status(200).json({ success: true, billCode, paymentUrl });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    const errorDetails = error.response?.data;
    const errorStatus = error.response?.status;
    const friendlyMessage =
      deriveToyyibErrorMessage(errorDetails) ||
      error.message ||
      'Failed to create ToyyibPay bill';

    console.error(`[PaymentRoutes] ❌ ToyyibPay createBill failed after ${totalTime}ms`, {
      status: errorStatus || 'unknown',
      message: error.message,
      details: errorDetails || null,
      stack: error.stack
    });

    // If it's a timeout error, provide a more specific message
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return res.status(504).json({
        success: false,
        message: 'Request timeout - ToyyibPay API took too long to respond',
        details: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: friendlyMessage,
      details: errorDetails || error.message
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

  if (billCode && supabase) {
    const statusMap = {
      '1': 'success',
      '2': 'failed',
      '3': 'pending'
    };
    const normalizedStatus = statusMap[statusId] || 'unknown';

    console.log('[PaymentRoutes] Updating Supabase via return endpoint:', {
      billCode,
      status: normalizedStatus,
      transaction_id
    });

    const { error: returnUpdateError } = await supabase
      .from(SUPABASE_TABLE)
      .update({
        status: normalizedStatus,
        message: msg || null,
        transaction_id: transaction_id || null,
        updated_at: new Date().toISOString()
      })
      .eq('bill_code', billCode);

    if (returnUpdateError) {
      console.error('[PaymentRoutes] Failed to update Supabase on return:', returnUpdateError);
    }
  } else {
    console.warn('[PaymentRoutes] Missing billCode or Supabase client during return update.');
  }

  // Also update SQL Server database if billCode is available (optional - won't block if it fails)
  if (billCode) {
    try {
      const pool = await sql.connect(getSqlConfig());
      const mappingResult = await pool.request()
        .input('billCode', sql.NVarChar, billCode)
        .query('SELECT reservation_id FROM PaymentBillMapping WHERE bill_code = @billCode');
      
      if (mappingResult.recordset.length > 0) {
        const reservationId = mappingResult.recordset[0].reservation_id;
        const statusIdStr = statusId ? String(statusId).trim() : null;
        
        // Determine status and payment_status based on statusId
        let dbStatus = 'pending';
        let paymentStatus = 'pending';
        
        if (statusIdStr === '1') {
          // Payment successful
          dbStatus = 'pending';  // Keep status as "pending" (waiting for admin approval)
          paymentStatus = 'paid';  // Set payment_status to "paid"
        } else if (statusIdStr === '2') {
          // Payment failed
          dbStatus = 'rejected';
          paymentStatus = 'failed';
        } else if (statusIdStr === '3') {
          // Payment pending
          dbStatus = 'pending';
          paymentStatus = 'pending';
        }
        
        // Update Reservations table
        await pool.request()
          .input('status', sql.NVarChar, dbStatus)
          .input('paymentStatus', sql.NVarChar, paymentStatus)
          .input('transactionId', sql.NVarChar, transaction_id || null)
          .input('reservationId', sql.Int, reservationId)
          .query(`
            UPDATE Reservations 
            SET status = @status, 
                payment_status = @paymentStatus, 
                payment_transaction_id = @transactionId, 
                payment_method = 'ToyyibPay', 
                payment_date = GETDATE() 
            WHERE reservation_id = @reservationId
          `);
        
        console.log('[PaymentRoutes] ✅ Successfully updated SQL Server database via return endpoint for reservation_id:', reservationId);
        await pool.close();
      } else {
        console.warn('[PaymentRoutes] No reservation_id found for billCode in return endpoint:', billCode);
        await pool.close();
      }
    } catch (sqlError) {
      console.error('[PaymentRoutes] Failed to update SQL Server database on return:', sqlError.message || sqlError);
      // Continue even if SQL update fails - this is optional functionality
    }
  }

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
 * ToyyibPay sends multipart/form-data, so we use multer to parse it
 */
router.post('/callback', upload.any(), async (req, res) => {
  // Log raw request for debugging
  console.log("📥 [CALLBACK] Raw request received:");
  console.log("  - Content-Type:", req.headers['content-type']);
  console.log("  - req.body:", JSON.stringify(req.body));
  console.log("  - req.query:", JSON.stringify(req.query));
  console.log("  - req.files (multer):", req.files ? JSON.stringify(req.files) : 'N/A');

  // Try multiple ways to extract data (ToyyibPay may send in different formats)
  // ToyyibPay sends: status_id, status, billcode, transaction_id, etc.
  const statusId = req.body?.statusId || req.body?.StatusId || req.body?.status_id || req.body?.Status_id || req.body?.status || req.query?.statusId || req.query?.status_id;
  const billCode = req.body?.billCode || req.body?.BillCode || req.body?.billcode || req.body?.Billcode || req.query?.billCode || req.query?.billcode;
  const order_id = req.body?.order_id || req.body?.orderId || req.body?.OrderId || req.body?.orderId || req.query?.order_id;
  const msg = req.body?.msg || req.body?.Msg || req.body?.message || req.body?.Message || req.body?.reason || req.query?.msg;
  const transaction_id = req.body?.transaction_id || req.body?.transactionId || req.body?.TransactionId || req.body?.refno || req.query?.transaction_id;
  const amount = req.body?.amount || req.body?.Amount || req.query?.amount;

  console.log("📥 [CALLBACK] Parsed values:", {
    statusId, billCode, order_id, msg, transaction_id, amount
  });

  // Check if Supabase client is available
  if (!supabase) {
    console.error('[PaymentRoutes] Supabase client is not initialized');
    // Still respond RECEIVEOK to ToyyibPay to avoid retries
    return res.status(200).send("RECEIVEOK");
  }

  // If billCode is missing, we can't update
  if (!billCode) {
    console.warn('[PaymentRoutes] Missing billCode in callback. Cannot update Supabase.');
    console.warn('[PaymentRoutes] This usually means ToyyibPay sent an empty/invalid callback.');
    // Still respond RECEIVEOK to avoid retries
    return res.status(200).send("RECEIVEOK");
  }

  // Update Supabase
  // Normalize statusId to string (ToyyibPay may send as string "1" or number 1)
  const statusIdStr = statusId ? String(statusId).trim() : null;
  const statusMap = {
    '1': 'success',
    '2': 'failed',
    '3': 'pending'
  };
  const normalizedStatus = statusIdStr ? (statusMap[statusIdStr] || 'unknown') : 'unknown';

  console.log('[PaymentRoutes] Updating Supabase via callback endpoint:', {
    billCode,
    status: normalizedStatus,
    transaction_id
  });

  const { error: callbackUpdateError } = await supabase
    .from(SUPABASE_TABLE)
    .update({
      status: normalizedStatus,
      message: msg || null,
      transaction_id: transaction_id || null,
      updated_at: new Date().toISOString()
    })
    .eq('bill_code', billCode);

  if (callbackUpdateError) {
    console.error('[PaymentRoutes] Failed to update Supabase on callback:', callbackUpdateError);
  } else {
    console.log('[PaymentRoutes] ✅ Successfully updated Supabase for billCode:', billCode);
  }

  // Also update SQL Server database (optional - won't block if it fails)
  try {
    // Get reservation_id from PaymentBillMapping table
    const pool = await sql.connect(getSqlConfig());
    const mappingResult = await pool.request()
      .input('billCode', sql.NVarChar, billCode)
      .query('SELECT reservation_id FROM PaymentBillMapping WHERE bill_code = @billCode');
    
    if (mappingResult.recordset.length > 0) {
      const reservationId = mappingResult.recordset[0].reservation_id;
      
      // Determine status and payment_status based on statusId
      let dbStatus = 'pending';
      let paymentStatus = 'pending';
      
      if (statusIdStr === '1') {
        // Payment successful
        dbStatus = 'pending';  // Keep status as "pending" (waiting for admin approval)
        paymentStatus = 'paid';  // Set payment_status to "paid"
      } else if (statusIdStr === '2') {
        // Payment failed
        dbStatus = 'rejected';
        paymentStatus = 'failed';
      } else if (statusIdStr === '3') {
        // Payment pending
        dbStatus = 'pending';
        paymentStatus = 'pending';
      }
      
      // Update Reservations table
      const updateResult = await pool.request()
        .input('status', sql.NVarChar, dbStatus)
        .input('paymentStatus', sql.NVarChar, paymentStatus)
        .input('transactionId', sql.NVarChar, transaction_id || null)
        .input('reservationId', sql.Int, reservationId)
        .query(`
          UPDATE Reservations 
          SET status = @status, 
              payment_status = @paymentStatus, 
              payment_transaction_id = @transactionId, 
              payment_method = 'ToyyibPay', 
              payment_date = GETDATE() 
          WHERE reservation_id = @reservationId
        `);
      
      console.log('[PaymentRoutes] ✅ Successfully updated SQL Server database for reservation_id:', reservationId);
      console.log('[PaymentRoutes]   - status:', dbStatus);
      console.log('[PaymentRoutes]   - payment_status:', paymentStatus);
      
      await pool.close();
    } else {
      console.warn('[PaymentRoutes] No reservation_id found for billCode:', billCode);
      await pool.close();
    }
    } catch (sqlError) {
      console.error('[PaymentRoutes] Failed to update SQL Server database:', sqlError.message || sqlError);
      // Continue even if SQL update fails - we don't want to block the callback response
      // This is optional functionality, Supabase update is the primary record
    }

  // Respond RECEIVEOK to ToyyibPay
  res.status(200).send("RECEIVEOK");
});

/**
 * GET /api/payment/summary/:reservation_id
 * Fetch payment summary from Supabase
 */
router.get('/summary/:reservation_id', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ success: false, message: 'Supabase client is not initialized' });
    }

    const reservationIdInt = parseInt(req.params.reservation_id, 10);
    if (Number.isNaN(reservationIdInt) || reservationIdInt <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid reservation_id' });
    }

    console.log('[PaymentRoutes] Fetching payment summary from Supabase:', reservationIdInt);

    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .select('reservation_id,name,email,phone,amount,items,bill_code,status,transaction_id,created_at,updated_at,message')
      .eq('reservation_id', reservationIdInt)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('[PaymentRoutes] Supabase summary fetch error:', error);
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    return res.json({
      success: true,
      summary: {
        reservation_id: data.reservation_id,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        amount: data.amount,
        bill_code: data.bill_code,
        status: data.status,
        transaction_id: data.transaction_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
        items: data.items || null,
        message: data.message || null
      }
    });

  } catch (error) {
    console.error('[PaymentRoutes] Unexpected error fetching summary:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payment summary',
      details: error.message
    });
  }
});

module.exports = router;
