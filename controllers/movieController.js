/**
 * Movie Controller
 * Handles movie catalog retrieval, filtering, search, and admin CRUD operations.
 */
const pool = require('../config/db');

/**
 * Get all movies with optional search, genre, language filters and sorting
 * GET /api/movies
 */
async function getAllMovies(req, res, next) {
    try {
        const { search, genre, language, sortBy, order } = req.query;

        let sql = `
            SELECT m.*, 
                   COUNT(DISTINCT s.show_id) AS total_shows
            FROM movies m
            LEFT JOIN shows s ON m.movie_id = s.movie_id
        `;
        const params = [];
        const whereClauses = [];

        if (search) {
            whereClauses.push('(m.title LIKE ? OR m.description LIKE ?)');
            const term = `%${search.trim()}%`;
            params.push(term, term);
        }

        if (genre && genre !== 'All') {
            whereClauses.push('m.genre LIKE ?');
            params.push(`%${genre.trim()}%`);
        }

        if (language && language !== 'All') {
            whereClauses.push('m.language = ?');
            params.push(language.trim());
        }

        if (whereClauses.length > 0) {
            sql += ' WHERE ' + whereClauses.join(' AND ');
        }

        sql += ' GROUP BY m.movie_id';

        // Sorting
        const allowedSort = ['rating', 'release_date', 'title', 'duration'];
        const sortColumn = allowedSort.includes(sortBy) ? `m.${sortBy}` : 'm.rating';
        const sortOrder = order && order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        sql += ` ORDER BY ${sortColumn} ${sortOrder}, m.movie_id DESC`;

        const [movies] = await pool.query(sql, params);

        res.json({
            success: true,
            count: movies.length,
            movies
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Get single movie details by ID along with its available shows
 * GET /api/movies/:id
 */
async function getMovieById(req, res, next) {
    try {
        const movieId = parseInt(req.params.id, 10);
        if (isNaN(movieId)) {
            return res.status(400).json({ success: false, message: 'Invalid movie ID.' });
        }

        const [movies] = await pool.query(
            'SELECT * FROM movies WHERE movie_id = ?',
            [movieId]
        );

        if (movies.length === 0) {
            return res.status(404).json({ success: false, message: 'Movie not found.' });
        }

        const movie = movies[0];

        // Fetch upcoming shows for this movie
        const [shows] = await pool.query(
            `SELECT show_id, theatre_name, show_date, show_time, ticket_price
             FROM shows
             WHERE movie_id = ?
             ORDER BY show_date ASC, show_time ASC`,
            [movieId]
        );

        res.json({
            success: true,
            movie,
            shows
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Add a new movie (Admin only)
 * POST /api/movies
 */
async function createMovie(req, res, next) {
    try {
        const { title, genre, language, duration, release_date, poster_url, description, rating, trailer_url } = req.body;

        if (!title || !genre || !language || !duration || !release_date) {
            return res.status(400).json({
                success: false,
                message: 'Title, genre, language, duration, and release date are required.'
            });
        }

        const [result] = await pool.query(
            `INSERT INTO movies (title, genre, language, duration, release_date, poster_url, description, rating, trailer_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title.trim(),
                genre.trim(),
                language.trim(),
                parseInt(duration, 10),
                release_date,
                poster_url || null,
                description || null,
                parseFloat(rating) || 8.0,
                trailer_url || null
            ]
        );

        const [newMovie] = await pool.query('SELECT * FROM movies WHERE movie_id = ?', [result.insertId]);

        res.status(201).json({
            success: true,
            message: 'Movie added successfully!',
            movie: newMovie[0]
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Update an existing movie (Admin only)
 * PUT /api/movies/:id
 */
async function updateMovie(req, res, next) {
    try {
        const movieId = parseInt(req.params.id, 10);
        if (isNaN(movieId)) {
            return res.status(400).json({ success: false, message: 'Invalid movie ID.' });
        }

        const { title, genre, language, duration, release_date, poster_url, description, rating, trailer_url } = req.body;

        const [existing] = await pool.query('SELECT movie_id FROM movies WHERE movie_id = ?', [movieId]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Movie not found.' });
        }

        await pool.query(
            `UPDATE movies SET
                title = COALESCE(?, title),
                genre = COALESCE(?, genre),
                language = COALESCE(?, language),
                duration = COALESCE(?, duration),
                release_date = COALESCE(?, release_date),
                poster_url = COALESCE(?, poster_url),
                description = COALESCE(?, description),
                rating = COALESCE(?, rating),
                trailer_url = COALESCE(?, trailer_url)
             WHERE movie_id = ?`,
            [
                title ? title.trim() : null,
                genre ? genre.trim() : null,
                language ? language.trim() : null,
                duration ? parseInt(duration, 10) : null,
                release_date || null,
                poster_url || null,
                description || null,
                rating ? parseFloat(rating) : null,
                trailer_url || null,
                movieId
            ]
        );

        const [updated] = await pool.query('SELECT * FROM movies WHERE movie_id = ?', [movieId]);

        res.json({
            success: true,
            message: 'Movie updated successfully!',
            movie: updated[0]
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Delete a movie (Admin only)
 * DELETE /api/movies/:id
 */
async function deleteMovie(req, res, next) {
    try {
        const movieId = parseInt(req.params.id, 10);
        if (isNaN(movieId)) {
            return res.status(400).json({ success: false, message: 'Invalid movie ID.' });
        }

        const [existing] = await pool.query('SELECT title FROM movies WHERE movie_id = ?', [movieId]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Movie not found.' });
        }

        await pool.query('DELETE FROM movies WHERE movie_id = ?', [movieId]);

        res.json({
            success: true,
            message: `Movie "${existing[0].title}" deleted successfully.`
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getAllMovies,
    getMovieById,
    createMovie,
    updateMovie,
    deleteMovie
};
