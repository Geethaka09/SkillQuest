const jwt = require('jsonwebtoken');

/**
 * Authentication Middleware
 * Verifies the JWT token from the 'Authorization' header.
 * 
 * Flow:
 * 1. Check if 'Authorization' header exists and starts with 'Bearer '.
 * 2. Extract the token.
 * 3. Verify token signature using JWT_SECRET.
 * 4. Attach decoded user payload to `req.user`.
 * 5. Call `next()` to proceed to the route handler.
 */
const auth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        // 1. Check for token presence
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        // 2. Extract and verify token
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 3. Attach user info to request object
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};

module.exports = auth;
