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
 * GET /api/reservations
 * Fetch all reservations from SQL Server
 * @returns {Object} { success: boolean, reservations: Array }
 */
router.get('/', async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const query = 'SELECT * FROM [OnlinePusaraDB].[dbo].[Reservations]';
    const result = await pool.request().query(query);

    return res.status(200).json({
      success: true,
      reservations: result.recordset
    });
  } catch (error) {
    console.error('[ReservationRoutes] Error fetching all reservations:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch reservations',
      details: error.message
    });
  }
});

/**
 * GET /api/reservations/:id
 * Fetch a single reservation by reservation_id from SQL Server
 * @param {string} id - The reservation ID (will be parsed as integer)
 * @returns {Object} { success: boolean, reservation: Object }
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const reservationIdInt = parseInt(id, 10);

    if (Number.isNaN(reservationIdInt) || reservationIdInt <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reservation_id. Must be a positive integer.'
      });
    }

    const pool = await poolPromise;
    if (!pool) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const query = `
      SELECT * 
      FROM [OnlinePusaraDB].[dbo].[Reservations] 
      WHERE reservation_id = @id
    `;
    const result = await pool.request()
      .input('id', sql.Int, reservationIdInt)
      .query(query);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    return res.status(200).json({
      success: true,
      reservation: result.recordset[0]
    });

  } catch (error) {
    console.error('[ReservationRoutes] Error fetching reservation:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch reservation details',
      details: error.message
    });
  }
});

module.exports = router;
