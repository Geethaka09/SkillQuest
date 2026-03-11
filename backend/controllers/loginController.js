const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

/**
 * Login Controller
 * 
 * Functional Requirements:
 *   P6 — Submit Login Details: Students provide username and password via login screen.
 *   P7 — Validate Login Credentials: System matches credentials against DB, confirms account is active.
 *   P8 — Redirect to Dashboard: Upon success, system initiates session (JWT) and redirects to home.
 */

/**
 * Login Student (P6 → P8)
 * 
 * Flow:
 *   P6: Receives email and password from login form
 *   P7: Validates credentials — checks email exists, verifies password (bcrypt + legacy plain text)
 *   P8: Issues JWT token for session, returns user data for frontend redirect
 */
const login = async (req, res) => {
    try {
        // ─── P6: Submit Login Details ───
        const { email, password, rememberMe } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        // ─── P7: Validate Login Credentials ───
        // Find student by email
        const [rows] = await pool.execute(
            'SELECT * FROM student WHERE email = ?',
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const student = rows[0];

        // Check if email is verified (account must be active)
        if (!student.is_verified) {
            return res.status(401).json({
                success: false,
                message: 'Please verify your email address to login.'
            });
        }

        // Check password - first try direct comparison (for legacy plain text passwords)
        // then try bcrypt comparison (for hashed passwords)
        let isMatch = false;

        if (password === student.password) {
            isMatch = true;
        } else {
            try {
                isMatch = await bcrypt.compare(password, student.password);
            } catch (e) {
                isMatch = false;
            }
        }

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Update last_login timestamp
        await pool.execute(
            'UPDATE student SET last_login = NOW() WHERE student_ID = ?',
            [student.student_ID]
        );

        // ─── P8: Redirect to Dashboard (Issue JWT Session) ───
        const tokenExpiry = rememberMe ? '30d' : '24h';
        const token = jwt.sign(
            { id: student.student_ID, email: student.email },
            process.env.JWT_SECRET,
            { expiresIn: tokenExpiry }
        );

        // ─── Trigger Background Content Generation ───
        // Fire-and-forget: If the student has an active plan, this will resume 
        // generation for any steps that are still missing content (e.g. Week 2+)
        try {
            const [planRows] = await pool.execute(
                'SELECT plan_id FROM study_plan WHERE student_ID = ? LIMIT 1',
                [student.student_ID]
            );
            if (planRows.length > 0) {
                const planId = planRows[0].plan_id;
                const ContentGenerationService = require('../services/ContentGenerationService');
                
                ContentGenerationService.fillPlanContent(student.student_ID, planId)
                    .then(r => {
                        if (r.stepsFilled > 0) {
                            console.log(`[Login] Background generation resumed: ${r.stepsFilled} steps filled.`);
                        }
                    })
                    .catch(e => console.error('[Login] Background generation error:', e.message));
            }
        } catch (err) {
            console.error('[Login] Failed to check for plan for background generation:', err.message);
        }

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: student.student_ID,
                email: student.email,
                name: student.name,
                level: student.level,
                status: student.status,
                profilePic: student.profile_pic,
                bio: student.bio
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.'
        });
    }
};

/**
 * Get Current Student (P8 — Session Verification)
 * 
 * Validates the JWT token and returns the current user's context.
 * Used by frontend to verify session is still active on page load.
 */
const getMe = async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT student_ID, name, email, profile_pic, status, level, at_score, p_score, ct_score, bio FROM student WHERE student_ID = ?',
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        res.json({
            success: true,
            user: rows[0]
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

module.exports = { login, getMe };
