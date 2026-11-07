/**
 * Booking Controller
 * Manages atomic seat reservations, transaction isolation, duplicate seat prevention,
 * and user booking histories.
 */
const pool = require('../config/db');

/**
 * Get booked seats for a specific show
 * GET /api/shows/:id/seats
 */
async function getBookedSeats(req, res, next) {
    try {
        const showId = parseInt(req.params.id, 10);
        if (isNaN(showId)) {
            return res.status(400).json({ success: false, message: 'Invalid show ID.' });
        }

        // Fetch show details
        const [shows] = await pool.query(
            `SELECT s.*, m.title AS movie_title, m.poster_url, m.language, m.genre
             FROM shows s
             JOIN movies m ON s.movie_id = m.movie_id
             WHERE s.show_id = ?`,
            [showId]
        );

        if (shows.length === 0) {
            return res.status(404).json({ success: false, message: 'Show not found.' });
        }

        // Retrieve all confirmed bookings for this show
        const [bookings] = await pool.query(
            `SELECT seat_numbers 
             FROM bookings 
             WHERE show_id = ? AND booking_status = 'Confirmed'`,
            [showId]
        );

        // Aggregate booked seats
        const bookedSeats = [];
        for (const b of bookings) {
            let seats = b.seat_numbers;
            if (typeof seats === 'string') {
                try {
                    seats = JSON.parse(seats);
                } catch (e) {
                    seats = [];
                }
            }
            if (Array.isArray(seats)) {
                bookedSeats.push(...seats);
            }
        }

        res.json({
            success: true,
            show: shows[0],
            booked_seats: bookedSeats,
            total_booked: bookedSeats.length
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Create a new ticket booking with database transaction and row-level locking
 * POST /api/bookings
 */
async function createBooking(req, res, next) {
    const connection = await pool.getConnection();
    try {
        const { show_id, seat_numbers } = req.body;
        const userId = req.user.user_id;

        // Validation
        if (!show_id || !Array.isArray(seat_numbers) || seat_numbers.length === 0) {
            connection.release();
            return res.status(400).json({
                success: false,
                message: 'Show ID and at least one selected seat are required.'
            });
        }

        // Clean and uppercase seat labels (e.g. "a1" -> "A1")
        const requestedSeats = seat_numbers.map(s => String(s).trim().toUpperCase());
        const seatCount = requestedSeats.length;

        // Validate max seats per booking (e.g. 10)
        if (seatCount > 10) {
            connection.release();
            return res.status(400).json({
                success: false,
                message: 'You can reserve a maximum of 10 seats per booking.'
            });
        }

        // START TRANSACTION
        await connection.beginTransaction();

        // 1. Lock the show row to guarantee price and schedule integrity
        const [shows] = await connection.query(
            `SELECT s.*, m.title AS movie_title 
             FROM shows s 
             JOIN movies m ON s.movie_id = m.movie_id 
             WHERE s.show_id = ? 
             FOR UPDATE`,
            [show_id]
        );

        if (shows.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({ success: false, message: 'The selected show does not exist.' });
        }

        const show = shows[0];

        // 2. Query all existing confirmed bookings for this show with row locks
        const [existingBookings] = await connection.query(
            `SELECT seat_numbers 
             FROM bookings 
             WHERE show_id = ? AND booking_status = 'Confirmed' 
             FOR UPDATE`,
            [show_id]
        );

        // Build set of currently reserved seats
        const alreadyBookedSet = new Set();
        for (const b of existingBookings) {
            let seats = b.seat_numbers;
            if (typeof seats === 'string') {
                try {
                    seats = JSON.parse(seats);
                } catch (e) {
                    seats = [];
                }
            }
            if (Array.isArray(seats)) {
                seats.forEach(s => alreadyBookedSet.add(String(s).toUpperCase()));
            }
        }

        // 3. Collision check
        const conflicts = requestedSeats.filter(seat => alreadyBookedSet.has(seat));
        if (conflicts.length > 0) {
            await connection.rollback();
            connection.release();
            return res.status(409).json({
                success: false,
                message: `Sorry, seat(s) ${conflicts.join(', ')} were just reserved by another customer. Please choose different seats.`,
                conflicting_seats: conflicts
            });
        }

        // 4. Calculate total amount
        const ticketPrice = parseFloat(show.ticket_price);
        const totalAmount = parseFloat((seatCount * ticketPrice).toFixed(2));

        // 5. Insert booking record
        const [insertResult] = await connection.query(
            `INSERT INTO bookings (user_id, show_id, seats, total_amount, booking_status, seat_numbers)
             VALUES (?, ?, ?, ?, 'Confirmed', ?)`,
            [
                userId,
                show_id,
                seatCount,
                totalAmount,
                JSON.stringify(requestedSeats)
            ]
        );

        // COMMIT TRANSACTION
        await connection.commit();
        connection.release();

        const bookingId = insertResult.insertId;

        // Fetch full booking details for ticket confirmation receipt
        const [newBooking] = await pool.query(
            `SELECT b.*, 
                    s.theatre_name, s.show_date, s.show_time, s.ticket_price,
                    m.title AS movie_title, m.poster_url, m.duration, m.language, m.genre,
                    u.name AS user_name, u.email AS user_email
             FROM bookings b
             JOIN shows s ON b.show_id = s.show_id
             JOIN movies m ON s.movie_id = m.movie_id
             JOIN users u ON b.user_id = u.user_id
             WHERE b.booking_id = ?`,
            [bookingId]
        );

        res.status(201).json({
            success: true,
            message: '🎉 Booking confirmed successfully! Enjoy your movie.',
            booking: newBooking[0]
        });
    } catch (err) {
        try {
            await connection.rollback();
        } catch (rbErr) {
            console.error('Rollback error:', rbErr);
        }
        connection.release();
        next(err);
    }
}

/**
 * Get current logged in customer's booking history
 * GET /api/bookings/my
 */
async function getMyBookings(req, res, next) {
    try {
        const userId = req.user.user_id;

        const [bookings] = await pool.query(
            `SELECT b.*, 
                    s.theatre_name, s.show_date, s.show_time, s.ticket_price,
                    m.title AS movie_title, m.poster_url, m.duration, m.language, m.genre
             FROM bookings b
             JOIN shows s ON b.show_id = s.show_id
             JOIN movies m ON s.movie_id = m.movie_id
             WHERE b.user_id = ?
             ORDER BY b.booking_id DESC`,
            [userId]
        );

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
 * Get booking details by ID (Owner or Admin)
 * GET /api/bookings/:id
 */
async function getBookingById(req, res, next) {
    try {
        const bookingId = parseInt(req.params.id, 10);
        if (isNaN(bookingId)) {
            return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
        }

        const [rows] = await pool.query(
            `SELECT b.*, 
                    s.theatre_name, s.show_date, s.show_time, s.ticket_price,
                    m.title AS movie_title, m.poster_url, m.duration, m.language, m.genre,
                    u.name AS user_name, u.email AS user_email
             FROM bookings b
             JOIN shows s ON b.show_id = s.show_id
             JOIN movies m ON s.movie_id = m.movie_id
             JOIN users u ON b.user_id = u.user_id
             WHERE b.booking_id = ?`,
            [bookingId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        const booking = rows[0];

        // Authorization check: User must own the booking or be an admin
        if (req.user.role !== 'admin' && booking.user_id !== req.user.user_id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied: You are not authorized to view this booking.'
            });
        }

        res.json({
            success: true,
            booking
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Get all bookings (Admin only)
 * GET /api/bookings
 */
async function getAllBookings(req, res, next) {
    try {
        const [bookings] = await pool.query(
            `SELECT b.*, 
                    s.theatre_name, s.show_date, s.show_time, s.ticket_price,
                    m.title AS movie_title, m.poster_url,
                    u.name AS user_name, u.email AS user_email
             FROM bookings b
             JOIN shows s ON b.show_id = s.show_id
             JOIN movies m ON s.movie_id = m.movie_id
             JOIN users u ON b.user_id = u.user_id
             ORDER BY b.booking_id DESC`
        );

        res.json({
            success: true,
            count: bookings.length,
            bookings
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getBookedSeats,
    createBooking,
    getMyBookings,
    getBookingById,
    getAllBookings
};
