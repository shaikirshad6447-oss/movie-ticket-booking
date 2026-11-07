/**
 * Show Routes
 * Group: SHOW APIs
 */
const express = require('express');
const router = express.Router();
const showController = require('../controllers/showController');
const bookingController = require('../controllers/bookingController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');

// Public endpoints
// GET /api/shows
router.get('/', showController.getAllShows);

// GET /api/shows/:id/seats (Seat availability matrix for a show)
router.get('/:id/seats', bookingController.getBookedSeats);

// GET /api/shows/:id
router.get('/:id', showController.getShowById);

// Admin-protected endpoints
// POST /api/shows
router.post('/', authenticateToken, requireAdmin, showController.createShow);

// PUT /api/shows/:id
router.put('/:id', authenticateToken, requireAdmin, showController.updateShow);

// DELETE /api/shows/:id
router.delete('/:id', authenticateToken, requireAdmin, showController.deleteShow);

module.exports = router;
