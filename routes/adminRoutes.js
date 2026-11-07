/**
 * Admin Routes
 * Group: ADMIN APIs
 */
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');

// All admin routes are protected by both auth and role verification
router.use(authenticateToken, requireAdmin);

// GET /api/admin/dashboard
router.get('/dashboard', adminController.getDashboard);

// GET /api/admin/users
router.get('/users', adminController.getUsers);

// GET /api/admin/bookings
router.get('/bookings', adminController.getAdminBookings);

// PUT /api/admin/bookings/:id/status
router.put('/bookings/:id/status', adminController.updateBookingStatus);

module.exports = router;
