/**
 * Centralized Error & 404 Handlers
 */

function notFoundHandler(req, res, next) {
    res.status(404).json({
        success: false,
        message: `Endpoint not found: [${req.method}] ${req.originalUrl}`
    });
}

function errorHandler(err, req, res, next) {
    console.error(`❌ [Error] ${req.method} ${req.originalUrl}:`, err);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'An internal server error occurred.';

    res.status(statusCode).json({
        success: false,
        message: message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
}

module.exports = {
    notFoundHandler,
    errorHandler
};
