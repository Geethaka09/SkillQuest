const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

/**
 * Auth Controller
 * Handles student registration, login, and account management.
 */

/**
 * Login Student
 * 
 * 1. Validates email/password presence.
 * 2. Fetches user by email.
 * 3. Compares password (supports both plain text for legacy users and bcrypt hash).
 * 4. Updates `last_login` timestamp.
 * 5. Issues JWT token.
 */
const login = async (req, res) => {
    try {
        const { email, password, rememberMe } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

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

        // Check if email is verified
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

        // Create JWT token
        const tokenExpiry = rememberMe ? '30d' : '24h';
        const token = jwt.sign(
            { id: student.student_ID, email: student.email },
            process.env.JWT_SECRET,
            { expiresIn: tokenExpiry }
        );

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
 * Register New Student
 * 
 * 1. Validates input fields.
 * 2. Checks for existing email/username.
 * 3. Auto-generates unique Student ID (S0001, S0002...).
 * 4. Hashes password.
 * 5. Creates student record with default values (Level: Beginner, Status: 0).
 * 6. Returns JWT token for immediate login.
 */
const register = async (req, res) => {
    try {
        const { email, password, firstName, lastName, userName } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        if (!firstName || !lastName) {
            return res.status(400).json({
                success: false,
                message: 'Please provide first name and last name'
            });
        }

        // Check if email already exists
        const [existingEmail] = await pool.execute(
            'SELECT student_ID FROM student WHERE email = ?',
            [email]
        );

        if (existingEmail.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        // Check if username already exists
        if (userName) {
            const [existingUsername] = await pool.execute(
                'SELECT student_ID FROM student WHERE username = ?',
                [userName]
            );

            if (existingUsername.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Username already taken'
                });
            }
        }

        // Auto-generate student_ID (format: S0001, S0002, etc.)
        const [lastStudent] = await pool.execute(
            'SELECT student_ID FROM student ORDER BY student_ID DESC LIMIT 1'
        );

        let studentId;
        if (lastStudent.length > 0 && lastStudent[0].student_ID) {
            const lastId = lastStudent[0].student_ID;
            // Extract number from last ID and increment
            const numPart = parseInt(lastId.replace(/\D/g, '')) || 0;
            studentId = 'S' + String(numPart + 1).padStart(4, '0');
        } else {
            studentId = 'S0001';
        }

        // Make sure studentId is max 10 chars
        studentId = studentId.substring(0, 10);

        // Combine first and last name
        const fullName = `${firstName} ${lastName}`;

        // Generate verification token
        const verificationToken = crypto.randomBytes(20).toString('hex');
        // Token expires in 24 hours
        const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Insert student with username column - status=0 means quiz pending
        // Added is_verified, verification_token, verification_token_expires
        await pool.execute(
            `INSERT INTO student (student_ID, name, email, username, password, status, level, at_score, p_score, ct_score, 
        ct_tol_easy, ct_tol_med, ct_tol_hard, at_tol_easy, at_tol_med, at_tol_hard, 
        p_tol_easy, p_tol_med, p_tol_hard, is_verified, verification_token, verification_token_expires) 
       VALUES (?, ?, ?, ?, ?, 0, 'beginner', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ?, ?)`,
            [studentId, fullName, email, userName || '', passwordHash, verificationToken, verificationTokenExpires]
        );

        // Send verification email
        try {
            const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
            const message = `
                <h1>Email Verification</h1>
                <p>Please click the link below to verify your email address:</p>
                <a href="${verificationUrl}" clicktracking=off>${verificationUrl}</a>
            `;

            await sendEmail({
                email: email,
                subject: 'SkillQuest Email Verification',
                message
            });
        } catch (error) {
            console.error('Email sending failed:', error);
            // We don't rollback registration, but user might need to request resend
        }

        // Create JWT token
        const token = jwt.sign(
            { id: studentId, email: email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            success: true,
            message: 'Check your email to activate your account.',
            token,
            user: {
                id: studentId,
                email: email,
                name: fullName,
                userName: userName,
                level: 'beginner',
                status: 0
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// Get current student
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

// Get account information for profile page
const getAccountInfo = async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT email, status, created_at, last_login FROM student WHERE student_ID = ?',
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        const student = rows[0];

        // Calculate days on platform
        const createdAt = student.created_at ? new Date(student.created_at) : new Date();
        const now = new Date();
        const diffTime = Math.abs(now - createdAt);
        const daysOnPlatform = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Determine account status text
        const statusText = student.status === 1 ? 'Active' : 'Pending Quiz';

        res.json({
            success: true,
            data: {
                email: student.email,
                memberSince: createdAt.toISOString(),
                accountStatus: statusText,
                daysOnPlatform: daysOnPlatform,
                lastActive: student.last_login ? new Date(student.last_login).toISOString() : null
            }
        });
    } catch (error) {
        console.error('Get account info error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Get personal best records for profile page
const getPersonalBests = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get longest streak from student table
        const [streakRows] = await pool.execute(
            'SELECT longest_streak, current_streak FROM student WHERE student_ID = ?',
            [userId]
        );

        if (streakRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        const longestStreak = Math.max(
            streakRows[0].longest_streak || 0,
            streakRows[0].current_streak || 0
        );

        // Get highest quiz score (percentage) - calculate as (correct answers / total questions * 100)
        // Each quiz attempt for a step has multiple question rows, so we need to group by attempt
        const [scoreRows] = await pool.execute(
            `SELECT 
                week_number, step_ID, attempt_number,
                SUM(is_correct) as correct_count,
                COUNT(*) as total_count,
                ROUND(SUM(is_correct) / COUNT(*) * 100, 0) as score_percentage
             FROM quiz_attempts 
             WHERE student_ID = ?
             GROUP BY week_number, step_ID, attempt_number
             ORDER BY score_percentage DESC
             LIMIT 1`,
            [userId]
        );

        const highestScore = scoreRows.length > 0 ? scoreRows[0].score_percentage : null;

        // Get fastest quiz completion time
        // Calculate duration between attempted_at (start) and finished_at (end) for each attempt
        const [timeRows] = await pool.execute(
            `SELECT 
                week_number, step_ID, attempt_number,
                MIN(attempted_at) as start_time,
                MAX(finished_at) as end_time,
                TIMESTAMPDIFF(SECOND, MIN(attempted_at), MAX(finished_at)) as duration_seconds
             FROM quiz_attempts 
             WHERE student_ID = ? 
               AND attempted_at IS NOT NULL 
               AND finished_at IS NOT NULL
             GROUP BY week_number, step_ID, attempt_number
             HAVING duration_seconds > 0
             ORDER BY duration_seconds ASC
             LIMIT 1`,
            [userId]
        );

        let fastestTime = null;
        if (timeRows.length > 0 && timeRows[0].duration_seconds) {
            const seconds = timeRows[0].duration_seconds;
            if (seconds < 60) {
                fastestTime = `${seconds}s`;
            } else {
                const mins = Math.floor(seconds / 60);
                const secs = seconds % 60;
                fastestTime = secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
            }
        }

        res.json({
            success: true,
            data: {
                highestScore: highestScore !== null ? `${highestScore}%` : null,
                longestStreak: longestStreak,
                fastestTime: fastestTime
            }
        });
    } catch (error) {
        console.error('Get personal bests error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

const multer = require('multer');
const path = require('path');

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: function (req, file, cb) {
        cb(null, 'profile-' + Date.now() + path.extname(file.originalname));
    }
});

// Check file type
const checkFileType = (file, cb) => {
    // Allowed ext
    const filetypes = /jpeg|jpg|png|gif/;
    // Check ext
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5000000 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
});

// Upload profile picture middleware
const uploadProfilePic = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const userId = req.user.id;
        const profilePicUrl = `/uploads/${req.file.filename}`;

        // Update student profile picture
        await pool.execute(
            'UPDATE student SET profile_pic = ? WHERE student_ID = ?',
            [profilePicUrl, userId]
        );

        res.json({
            success: true,
            message: 'Profile picture updated',
            profilePic: profilePicUrl
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during upload'
        });
    }
};

// Update profile details
const updateProfile = async (req, res) => {
    try {
        const { name, bio } = req.body;
        const userId = req.user.id;

        if (!name || name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Name is required'
            });
        }

        // Verify user exists
        const [userCheck] = await pool.execute(
            'SELECT student_ID FROM student WHERE student_ID = ?',
            [userId]
        );
        if (userCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        // Update student name and bio
        await pool.execute(
            'UPDATE student SET name = ?, bio = ? WHERE student_ID = ?',
            [name, bio || null, userId]
        );

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                name,
                bio: bio || null
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Change password
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Please provide current and new password'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        // Get student to check current password
        const [rows] = await pool.execute(
            'SELECT password FROM student WHERE student_ID = ?',
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const student = rows[0];

        // Check if current password matches
        let isMatch = false;

        // Handling both plain text (legacy) and bcrypt passwords
        if (currentPassword === student.password) {
            isMatch = true;
        } else {
            try {
                isMatch = await bcrypt.compare(currentPassword, student.password);
            } catch (e) {
                isMatch = false;
            }
        }

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Incorrect current password'
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        // Update password
        await pool.execute(
            'UPDATE student SET password = ? WHERE student_ID = ?',
            [passwordHash, userId]
        );

        res.json({
            success: true,
            message: 'Password updated successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Change email
const changeEmail = async (req, res) => {
    try {
        const { newEmail } = req.body;
        const userId = req.user.id;

        if (!newEmail || newEmail.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid email address'
            });
        }

        // Check if email already exists
        const [existingEmail] = await pool.execute(
            'SELECT student_ID FROM student WHERE email = ? AND student_ID != ?',
            [newEmail, userId]
        );

        if (existingEmail.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'This email is already registered to another account'
            });
        }

        // Verify user exists
        const [userCheck] = await pool.execute(
            'SELECT student_ID FROM student WHERE student_ID = ?',
            [userId]
        );
        if (userCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        // Update email
        await pool.execute(
            'UPDATE student SET email = ? WHERE student_ID = ?',
            [newEmail, userId]
        );

        res.json({
            success: true,
            message: 'Email updated successfully',
            email: newEmail
        });
    } catch (error) {
        console.error('Change email error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Log exit - handles navigator.sendBeacon() when user closes browser/tab
const logExit = async (req, res) => {
    try {
        let studentId, timestamp;

        // Handle different content types from sendBeacon
        // sendBeacon may send as text/plain, application/json, or blob
        if (typeof req.body === 'string') {
            // Parse text/plain body
            try {
                const parsed = JSON.parse(req.body);
                studentId = parsed.student_ID || parsed.studentId;
                timestamp = parsed.timestamp;
            } catch (e) {
                // If not JSON, try to parse as query string or other format
                console.error('Failed to parse text body:', e);
                return res.status(400).json({
                    success: false,
                    message: 'Invalid request body format'
                });
            }
        } else if (req.body && typeof req.body === 'object') {
            // Standard JSON body
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
            // Convert timestamp to MySQL datetime format
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

// Delete account - removes all student data from database
const deleteAccount = async (req, res) => {
    try {
        const userId = req.user.id;

        // Start transaction-like deletion (delete from child tables first)
        // Delete quiz attempts
        await pool.execute(
            'DELETE FROM quiz_attempts WHERE student_ID = ?',
            [userId]
        );

        // Delete study plan records
        await pool.execute(
            'DELETE FROM study_plan WHERE student_ID = ?',
            [userId]
        );

        // Delete initial question paper records
        await pool.execute(
            'DELETE FROM initial_question_paper WHERE student_ID = ?',
            [userId]
        );

        // Finally delete the student record
        await pool.execute(
            'DELETE FROM student WHERE student_ID = ?',
            [userId]
        );

        res.json({
            success: true,
            message: 'Account deleted successfully'
        });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete account. Please try again.'
        });
    }
};

// Verify Email
const verifyEmail = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Invalid verification token'
            });
        }

        // Find user with matching token and not expired
        const [rows] = await pool.execute(
            'SELECT student_ID FROM student WHERE verification_token = ? AND verification_token_expires > NOW()',
            [token]
        );

        if (rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired verification token'
            });
        }

        const student = rows[0];

        // Update user to verified and clear token
        await pool.execute(
            'UPDATE student SET is_verified = 1, verification_token = NULL, verification_token_expires = NULL WHERE student_ID = ?',
            [student.student_ID]
        );

        res.json({
            success: true,
            message: 'Email verified successfully. You can now login.'
        });

    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};


// Resend Verification Email
const resendVerification = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an email address'
            });
        }

        // Check user exists
        const [rows] = await pool.execute(
            'SELECT student_ID, is_verified, name FROM student WHERE email = ?',
            [email]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const student = rows[0];

        if (student.is_verified) {
            return res.status(400).json({
                success: false,
                message: 'Account already verified. Please login.'
            });
        }

        // Generate new token
        const verificationToken = crypto.randomBytes(20).toString('hex');
        // Set expiry to 10 minutes from now
        const verificationTokenExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

        // Update database
        await pool.execute(
            'UPDATE student SET verification_token = ?, verification_token_expires = ? WHERE student_ID = ?',
            [verificationToken, verificationTokenExpires, student.student_ID]
        );

        // Send email
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
        const message = `
            <h1>Email Verification</h1>
            <p>Hi ${student.name},</p>
            <p>Please click the link below to verify your account:</p>
            <a href="${verificationUrl}" clicktracking=off>${verificationUrl}</a>
            <p>This link will expire in 10 minutes.</p>
        `;

        await sendEmail({
            email: email,
            subject: 'Resend: SkillQuest Email Verification',
            message
        });

        res.json({
            success: true,
            message: 'Verification email resent. Please check your inbox.'
        });

    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};


// Forgot Password
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Please provide an email address' });
        }

        const [rows] = await pool.execute('SELECT student_ID, name FROM student WHERE email = ?', [email]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const student = rows[0];
        const resetToken = crypto.randomBytes(20).toString('hex');
        const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '); // 1 hour

        await pool.execute(
            'UPDATE student SET reset_password_token = ?, reset_password_expires = ? WHERE student_ID = ?',
            [resetToken, resetTokenExpires, student.student_ID]
        );

        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
        const message = `
            <h1>Password Reset Request</h1>
            <p>Hi ${student.name},</p>
            <p>You requested a password reset. Please click the link below to set a new password:</p>
            <a href="${resetUrl}" clicktracking=off>${resetUrl}</a>
            <p>This link will expire in 1 hour.</p>
        `;

        await sendEmail({
            email: email,
            subject: 'SkillQuest Password Reset',
            message
        });

        res.json({ success: true, message: 'Password reset email sent.' });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Reset Password
const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ success: false, message: 'Please provide a new password' });
        }

        const [rows] = await pool.execute(
            'SELECT student_ID FROM student WHERE reset_password_token = ? AND reset_password_expires > NOW()',
            [token]
        );

        if (rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid or expired token' });
        }

        const student = rows[0];
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await pool.execute(
            'UPDATE student SET password = ?, reset_password_token = NULL, reset_password_expires = NULL WHERE student_ID = ?',
            [hashedPassword, student.student_ID]
        );

        res.json({ success: true, message: 'Password reset successful. You can now login.' });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = { login, register, getMe, getAccountInfo, getPersonalBests, upload, uploadProfilePic, updateProfile, changePassword, changeEmail, deleteAccount, logExit, verifyEmail, resendVerification, forgotPassword, resetPassword };
