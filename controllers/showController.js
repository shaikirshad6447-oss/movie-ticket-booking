/**
 * Show Controller
 * Handles theatre show schedules, show query operations, and admin show management.
 */
const pool = require('../config/db');

/**
 * Get all shows with movie details
 * GET /api/shows
 */
async function getAllShows(req, res, next) {
    try {
        const { date, theatre } = req.query;

        let sql = `
            SELECT s.*, 
                   m.title AS movie_title, 
                   m.poster_url, 
                   m.duration, 
                   m.language, 
                   m.genre, 
                   m.rating
            FROM shows s
            JOIN movies m ON s.movie_id = m.movie_id
        `;
        const params = [];
        const whereClauses = [];

        if (date) {
            whereClauses.push('s.show_date = ?');
            params.push(date);
        }

        if (theatre) {
            whereClauses.push('s.theatre_name LIKE ?');
            params.push(`%${theatre.trim()}%`);
        }

        if (whereClauses.length > 0) {
            sql += ' WHERE ' + whereClauses.join(' AND ');
        }

        sql += ' ORDER BY s.show_date ASC, s.show_time ASC';

        const [shows] = await pool.query(sql, params);

        res.json({
            success: true,
            count: shows.length,
            shows
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Get show by ID with movie info
 * GET /api/shows/:id
 */
async function getShowById(req, res, next) {
    try {
        const showId = parseInt(req.params.id, 10);
        if (isNaN(showId)) {
            return res.status(400).json({ success: false, message: 'Invalid show ID.' });
        }

        const [rows] = await pool.query(
            `SELECT s.*, 
                    m.title AS movie_title, 
                    m.poster_url, 
                    m.duration, 
                    m.language, 
                    m.genre, 
                    m.rating,
                    m.description
             FROM shows s
             JOIN movies m ON s.movie_id = m.movie_id
             WHERE s.show_id = ?`,
            [showId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Show not found.' });
        }

        res.json({
            success: true,
            show: rows[0]
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Get all shows for a specific movie
 * GET /api/movies/:id/shows
 */
async function getShowsByMovie(req, res, next) {
    try {
        const movieId = parseInt(req.params.id, 10);
        if (isNaN(movieId)) {
            return res.status(400).json({ success: false, message: 'Invalid movie ID.' });
        }

        const [shows] = await pool.query(
            `SELECT s.*, 
                    m.title AS movie_title, 
                    m.poster_url, 
                    m.duration, 
                    m.language, 
                    m.genre, 
                    m.rating
             FROM shows s
             JOIN movies m ON s.movie_id = m.movie_id
             WHERE s.movie_id = ?
             ORDER BY s.show_date ASC, s.show_time ASC`,
            [movieId]
        );

        res.json({
            success: true,
            count: shows.length,
            shows
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Create a new show (Admin only)
 * POST /api/shows
 */
async function createShow(req, res, next) {
    try {
        const { movie_id, theatre_name, show_date, show_time, ticket_price } = req.body;

        if (!movie_id || !theatre_name || !show_date || !show_time || !ticket_price) {
            return res.status(400).json({
                success: false,
                message: 'All fields (movie_id, theatre_name, show_date, show_time, ticket_price) are required.'
            });
        }

        // Validate movie exists
        const [movie] = await pool.query('SELECT title FROM movies WHERE movie_id = ?', [movie_id]);
        if (movie.length === 0) {
            return res.status(404).json({ success: false, message: 'Referenced movie does not exist.' });
        }

        const [result] = await pool.query(
            `INSERT INTO shows (movie_id, theatre_name, show_date, show_time, ticket_price)
             VALUES (?, ?, ?, ?, ?)`,
            [
                parseInt(movie_id, 10),
                theatre_name.trim(),
                show_date,
                show_time,
                parseFloat(ticket_price)
            ]
        );

        const [newShow] = await pool.query(
            `SELECT s.*, m.title AS movie_title 
             FROM shows s 
             JOIN movies m ON s.movie_id = m.movie_id 
             WHERE s.show_id = ?`,
            [result.insertId]
        );

        res.status(201).json({
            success: true,
            message: 'Show created successfully!',
            show: newShow[0]
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Update an existing show (Admin only)
 * PUT /api/shows/:id
 */
async function updateShow(req, res, next) {
    try {
        const showId = parseInt(req.params.id, 10);
        if (isNaN(showId)) {
            return res.status(400).json({ success: false, message: 'Invalid show ID.' });
        }

        const { theatre_name, show_date, show_time, ticket_price, movie_id } = req.body;

        const [existing] = await pool.query('SELECT * FROM shows WHERE show_id = ?', [showId]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Show not found.' });
        }

        await pool.query(
            `UPDATE shows SET
                theatre_name = COALESCE(?, theatre_name),
                show_date = COALESCE(?, show_date),
                show_time = COALESCE(?, show_time),
                ticket_price = COALESCE(?, ticket_price),
                movie_id = COALESCE(?, movie_id)
             WHERE show_id = ?`,
            [
                theatre_name ? theatre_name.trim() : null,
                show_date || null,
                show_time || null,
                ticket_price ? parseFloat(ticket_price) : null,
                movie_id ? parseInt(movie_id, 10) : null,
                showId
            ]
        );

        const [updated] = await pool.query(
            `SELECT s.*, m.title AS movie_title 
             FROM shows s 
             JOIN movies m ON s.movie_id = m.movie_id 
             WHERE s.show_id = ?`,
            [showId]
        );

        res.json({
            success: true,
            message: 'Show updated successfully!',
            show: updated[0]
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Delete a show (Admin only)
 * DELETE /api/shows/:id
 */
async function deleteShow(req, res, next) {
    try {
        const showId = parseInt(req.params.id, 10);
        if (isNaN(showId)) {
            return res.status(400).json({ success: false, message: 'Invalid show ID.' });
        }

        const [existing] = await pool.query('SELECT show_id FROM shows WHERE show_id = ?', [showId]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Show not found.' });
        }

        await pool.query('DELETE FROM shows WHERE show_id = ?', [showId]);

        res.json({
            success: true,
            message: 'Show deleted successfully.'
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getAllShows,
    getShowById,
    getShowsByMovie,
    createShow,
    updateShow,
    deleteShow
};
