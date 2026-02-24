const pool = require('../config/database');

/**
 * Session Controller
 * 
 * Functional Requirements:
 *   P19 — Terminate Session: When a student logs out, the system terminates the active session
 *         and redirects them to the login page.
 *   P20 — Handle Session Expiration: If a session expires due to inactivity, the system
 *         automatically detects this and forces a redirect to the login page.
 * 
 * Implementation Notes:
 *   - P19 is handled by logExit() which records the exit timestamp via navigator.sendBeacon()
 *   - P20 is handled by JWT token expiry (configured in loginController.js) and the
 *     frontend auth middleware that detects expired tokens and redirects to login.
 */

/**
 * Log Exit (P19 — Terminate Session)
 * 
 * Handles navigator.sendBeacon() when user closes browser/tab or logs out.
 * Records the closed_at timestamp for session tracking and analytics.
 * 
 * Supports multiple content types since sendBeacon may send as:
 * - text/plain
 * - application/json
 * - blob
 */
const logExit = async (req, res) => {
    try {
        let studentId, timestamp;

        // Handle different content types from sendBeacon
        if (typeof req.body === 'string') {
            try {
                const parsed = JSON.parse(req.body);
                studentId = parsed.student_ID || parsed.studentId;
                timestamp = parsed.timestamp;
            } catch (e) {
                console.error('Failed to parse text body:', e);
                return res.status(400).json({
                    success: false,
                    message: 'Invalid request body format'
                });
            }
        } else if (req.body && typeof req.body === 'object') {
            studentId = req.body.student_ID || req.body.studentId;
            timestamp = req.body.timestamp;
        } else {
            return res.status(400).json({
                success: false,
                message: 'No request body provided'
            });
        }

        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: 'Student ID is required'
            });
        }

        // Verify student exists
        const [studentCheck] = await pool.execute(
            'SELECT student_ID FROM student WHERE student_ID = ?',
            [studentId]
        );
        if (studentCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        // Use provided timestamp or current server time
        let closedAt;
        if (timestamp) {
            closedAt = new Date(timestamp).toISOString().slice(0, 19).replace('T', ' ');
        } else {
            closedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
        }

        // Update closed_at timestamp
        await pool.execute(
            'UPDATE student SET closed_at = ? WHERE student_ID = ?',
            [closedAt, studentId]
        );

        res.json({
            success: true,
            message: 'Exit logged successfully'
        });
    } catch (error) {
        console.error('Log exit error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

module.exports = { logExit };
