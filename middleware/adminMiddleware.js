/**
 * Admin Authorization Middleware
 * Enforces role-based access control for administrative endpoints.
 */
function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required.'
        });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access forbidden. Administrative privileges required.'
        });
    }

    next();
}

module.exports = {
    requireAdmin
};
