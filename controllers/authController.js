/**
 * Auth Controller
 * Handles customer registration, secure authentication, role verification, and JWT issuance.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'super_cinematic_jwt_secret_key_2026_shaik_irshad_token';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Register a new user
 * POST /api/auth/register
 */
async function register(req, res, next) {
    try {
        const { name, email, password, confirmPassword } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'All fields (name, email, password) are required.'
            });
        }

        const trimmedName = name.trim();
        const trimmedEmail = email.trim().toLowerCase();

        // Basic email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address.'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long.'
            });
        }

        if (confirmPassword && password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match.'
            });
        }

        // Check if email already registered
        const [existing] = await pool.query(
            'SELECT user_id FROM users WHERE email = ?',
            [trimmedEmail]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'An account with this email address already exists.'
            });
        }

        // Hash password with bcrypt
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert new customer
        const [result] = await pool.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [trimmedName, trimmedEmail, hashedPassword, 'customer']
        );

        const newUserId = result.insertId;

        // Sign JWT
        const token = jwt.sign(
            { user_id: newUserId, email: trimmedEmail, role: 'customer' },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.status(201).json({
            success: true,
            message: 'Account registered successfully! Welcome to CineNova.',
            token,
            user: {
                user_id: newUserId,
                name: trimmedName,
                email: trimmedEmail,
                role: 'customer'
            }
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Log in an existing user
 * POST /api/auth/login
 */
async function login(req, res, next) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required.'
            });
        }

        const trimmedEmail = email.trim().toLowerCase();

        // Retrieve user by email
        const [rows] = await pool.query(
            'SELECT user_id, name, email, password, role FROM users WHERE email = ?',
            [trimmedEmail]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        const user = rows[0];

        // Compare password hash
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        // Sign JWT
        const token = jwt.sign(
            { user_id: user.user_id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.json({
            success: true,
            message: `Welcome back, ${user.name}!`,
            token,
            user: {
                user_id: user.user_id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Log out user
 * POST /api/auth/logout
 */
async function logout(req, res) {
    res.json({
        success: true,
        message: 'Logged out successfully.'
    });
}

/**
 * Get current authenticated user profile
 * GET /api/auth/me
 */
async function getMe(req, res, next) {
    try {
        const [bookings] = await pool.query(
            'SELECT COUNT(*) AS total_bookings FROM bookings WHERE user_id = ?',
            [req.user.user_id]
        );

        res.json({
            success: true,
            user: {
                ...req.user,
                total_bookings: bookings[0].total_bookings
            }
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    register,
    login,
    logout,
    getMe
};
