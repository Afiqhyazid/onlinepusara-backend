// routes/reservationRoutes.js
// Express routes for reservation operations

const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { poolPromise } = require('../db');

/**
 * GET /api/reservations/test
 * Simple test endpoint
 * @returns {Object} { success: boolean, message: string }
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Reservation API is working'
  });
});

/**
 * GET /api/reservations/:id
 * Fetch a single reservation by reservation_id from SQL Server
 * 
 * @param {string} id - The reservation ID (will be parsed as integer)
 * @returns {Object} { success: boolean, reservation: Object }
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('[ReservationRoutes] ========== GET /:id ==========');
    console.log('[ReservationRoutes] Incoming request:', req.params.id);
    console.log('[ReservationRoutes] Raw id from params:', id, `(type: ${typeof id})`);
    
    // Validate and parse reservation_id
    const reservationIdInt = parseInt(id, 10);
    if (Number.isNaN(reservationIdInt) || reservationIdInt <= 0) {
      console.error('[ReservationRoutes] Invalid reservation_id:', id);
      return res.status(400).json({
        success: false,
        message: 'Invalid reservation_id. Must be a positive integer.'
      });
    }
    
    console.log('[ReservationRoutes] Parsed reservation_id:', reservationIdInt);
    
    // Get database connection pool
    const pool = await poolPromise;
    if (!pool) {
      console.error('[ReservationRoutes] Database pool not available');
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }
    
    // SQL query to fetch reservation
    // Using SELECT * as per requirements
    const reservationQuery = `
      SELECT * 
      FROM [OnlinePusaraDB].[dbo].[Reservations] 
      WHERE reservation_id = @id
    `;
    
    console.log('[ReservationRoutes] Executing SQL query');
    console.log('[ReservationRoutes] Query parameter (id):', reservationIdInt);
    
    // Execute query
    const result = await pool.request()
      .input('id', sql.Int, reservationIdInt)
      .query(reservationQuery);
    
    console.log('[ReservationRoutes] Query executed successfully');
    console.log('[ReservationRoutes] Rows returned:', result.recordset.length);
    
    // Check if reservation was found
    if (result.recordset.length === 0) {
      console.error(`[ReservationRoutes] Reservation not found: ${reservationIdInt}`);
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }
    
    // Get the first (and should be only) reservation
    const reservation = result.recordset[0];
    
    console.log('[ReservationRoutes] Reservation found:');
    console.log('[ReservationRoutes] Reservation ID:', reservation.reservation_id);
    console.log('[ReservationRoutes] Customer Name:', reservation.customer_name);
    console.log('[ReservationRoutes] Total Amount:', reservation.total_amount);
    
    // Return success response
    return res.status(200).json({
      success: true,
      reservation: reservation
    });
    
  } catch (error) {
    console.error('[ReservationRoutes] ========== ERROR ==========');
    console.error('[ReservationRoutes] Error fetching reservation:', error.message);
    console.error('[ReservationRoutes] Error stack:', error.stack);
    console.error('[ReservationRoutes] ===========================');
    
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch reservation details',
      details: error.message
    });
  }
});

module.exports = router;

