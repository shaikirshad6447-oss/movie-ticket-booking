/**
 * Movie Routes
 * Group: MOVIE APIs
 */
const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movieController');
const showController = require('../controllers/showController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');

// Public endpoints
// GET /api/movies
router.get('/', movieController.getAllMovies);

// GET /api/movies/:id/shows
router.get('/:id/shows', showController.getShowsByMovie);

// GET /api/movies/:id
router.get('/:id', movieController.getMovieById);

// Admin-protected endpoints
// POST /api/movies
router.post('/', authenticateToken, requireAdmin, movieController.createMovie);

// PUT /api/movies/:id
router.put('/:id', authenticateToken, requireAdmin, movieController.updateMovie);

// DELETE /api/movies/:id
router.delete('/:id', authenticateToken, requireAdmin, movieController.deleteMovie);

module.exports = router;
