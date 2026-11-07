/**
 * Authentication Middleware
 * Protects routes requiring user authentication via JWT.
 */
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'super_cinematic_jwt_secret_key_2026_shaik_irshad_token';

async function authenticateToken(req, res, next) {
    let token = null;

    // Check Authorization header: Bearer <token>
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else if (req.headers['x-access-token']) {
        token = req.headers['x-access-token'];
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access denied. Authentication token required.'
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Fetch current user details from database to ensure user is active and exists
        const [rows] = await pool.query(
            'SELECT user_id, name, email, role FROM users WHERE user_id = ?',
            [decoded.user_id]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid session: User account no longer exists.'
            });
        }

        req.user = rows[0];
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token. Please log in again.'
        });
    }
}

module.exports = {
    authenticateToken
};
