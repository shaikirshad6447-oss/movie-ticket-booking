/**
 * Booking Routes
 * Group: BOOKING APIs
 */
const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');

// GET /api/bookings/my (Customer booking history)
router.get('/my', authenticateToken, bookingController.getMyBookings);

// GET /api/bookings/:id (Specific booking details)
router.get('/:id', authenticateToken, bookingController.getBookingById);

// GET /api/bookings (Admin: all bookings)
router.get('/', authenticateToken, requireAdmin, bookingController.getAllBookings);

// POST /api/bookings (Confirm ticket booking with transactional locking)
router.post('/', authenticateToken, bookingController.createBooking);

module.exports = router;
