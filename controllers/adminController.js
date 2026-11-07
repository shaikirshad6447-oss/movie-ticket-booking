/**
 * Admin Controller
 * Provides administrative analytics, customer user inspection, and booking management.
 */
const pool = require('../config/db');

/**
 * Get dashboard overview metrics
 * GET /api/admin/dashboard
 */
async function getDashboard(req, res, next) {
    try {
        const [moviesCount] = await pool.query('SELECT COUNT(*) AS total FROM movies');
        const [showsCount] = await pool.query('SELECT COUNT(*) AS total FROM shows');
        const [usersCount] = await pool.query("SELECT COUNT(*) AS total FROM users WHERE role = 'customer'");
        const [bookingsCount] = await pool.query('SELECT COUNT(*) AS total FROM bookings');
        const [revenue] = await pool.query("SELECT COALESCE(SUM(total_amount), 0) AS total FROM bookings WHERE booking_status = 'Confirmed'");

        // Recent 5 bookings
        const [recentBookings] = await pool.query(
            `SELECT b.booking_id, b.seats, b.total_amount, b.booking_status, b.seat_numbers, b.booking_date,
                    u.name AS user_name, u.email AS user_email,
                    m.title AS movie_title,
                    s.theatre_name, s.show_date, s.show_time
             FROM bookings b
             JOIN users u ON b.user_id = u.user_id
             JOIN shows s ON b.show_id = s.show_id
             JOIN movies m ON s.movie_id = m.movie_id
             ORDER BY b.booking_id DESC
             LIMIT 5`
        );

        // Top 5 popular movies by bookings
        const [topMovies] = await pool.query(
            `SELECT m.movie_id, m.title, m.poster_url, m.rating,
                    COUNT(b.booking_id) AS booking_count,
                    COALESCE(SUM(b.total_amount), 0) AS revenue
             FROM movies m
             LEFT JOIN shows s ON m.movie_id = s.movie_id
             LEFT JOIN bookings b ON s.show_id = b.show_id AND b.booking_status = 'Confirmed'
             GROUP BY m.movie_id
             ORDER BY booking_count DESC, revenue DESC
             LIMIT 5`
        );

        res.json({
            success: true,
            stats: {
                total_movies: moviesCount[0].total,
                total_shows: showsCount[0].total,
                total_users: usersCount[0].total,
                total_bookings: bookingsCount[0].total,
                total_revenue: parseFloat(revenue[0].total)
            },
            recent_bookings: recentBookings,
            top_movies: topMovies
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Get registered customers list
 * GET /api/admin/users
 */
async function getUsers(req, res, next) {
    try {
        const [users] = await pool.query(
            `SELECT u.user_id, u.name, u.email, u.role, u.created_at,
                    COUNT(b.booking_id) AS total_bookings,
                    COALESCE(SUM(CASE WHEN b.booking_status = 'Confirmed' THEN b.total_amount ELSE 0 END), 0) AS total_spent
             FROM users u
             LEFT JOIN bookings b ON u.user_id = b.user_id
             GROUP BY u.user_id
             ORDER BY u.created_at DESC`
        );

        res.json({
            success: true,
            count: users.length,
            users
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Get all bookings with filtering
 * GET /api/admin/bookings
 */
async function getAdminBookings(req, res, next) {
    try {
        const { status } = req.query;
        let sql = `
            SELECT b.*, 
                   s.theatre_name, s.show_date, s.show_time, s.ticket_price,
                   m.title AS movie_title, m.poster_url,
                   u.name AS user_name, u.email AS user_email
            FROM bookings b
            JOIN shows s ON b.show_id = s.show_id
            JOIN movies m ON s.movie_id = m.movie_id
            JOIN users u ON b.user_id = u.user_id
        `;
        const params = [];

        if (status && status !== 'All') {
            sql += ' WHERE b.booking_status = ?';
            params.push(status);
        }

        sql += ' ORDER BY b.booking_id DESC';

        const [bookings] = await pool.query(sql, params);

        res.json({
            success: true,
            count: bookings.length,
            bookings
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Update booking status (e.g. Confirmed, Cancelled, Completed)
 * PUT /api/admin/bookings/:id/status
 */
async function updateBookingStatus(req, res, next) {
    try {
        const bookingId = parseInt(req.params.id, 10);
        const { status } = req.body;

        if (isNaN(bookingId)) {
            return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
        }

        const validStatuses = ['Confirmed', 'Cancelled', 'Completed'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Status must be one of: ${validStatuses.join(', ')}`
            });
        }

        const [existing] = await pool.query('SELECT booking_id FROM bookings WHERE booking_id = ?', [bookingId]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        await pool.query('UPDATE bookings SET booking_status = ? WHERE booking_id = ?', [status, bookingId]);

        res.json({
            success: true,
            message: `Booking #${bookingId} status updated to ${status}.`
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getDashboard,
    getUsers,
    getAdminBookings,
    updateBookingStatus
};
