const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// Login student
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

        // Check password - first try direct comparison (for plain text passwords)
        // then try bcrypt comparison (for hashed passwords)
        let isMatch = false;

        // First check if password matches directly (plain text)
        if (password === student.password) {
            isMatch = true;
        } else {
            // Try bcrypt comparison (for hashed passwords)
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
                profilePic: student.profile_pic
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

// Register new student
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

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Insert student with username column - status=0 means quiz pending
        await pool.execute(
            `INSERT INTO student (student_ID, name, email, username, password, status, level, at_score, p_score, ct_score, 
        ct_tol_easy, ct_tol_med, ct_tol_hard, at_tol_easy, at_tol_med, at_tol_hard, 
        p_tol_easy, p_tol_med, p_tol_hard) 
       VALUES (?, ?, ?, ?, ?, 0, 'beginner', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)`,
            [studentId, fullName, email, userName || '', passwordHash]
        );

        // Create JWT token
        const token = jwt.sign(
            { id: studentId, email: email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            success: true,
            message: 'Registration successful',
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
            message: 'Server error. Please try again.'
        });
    }
};

// Get current student
const getMe = async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT student_ID, name, email, profile_pic, status, level, at_score, p_score, ct_score FROM student WHERE student_ID = ?',
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
        const { name } = req.body;
        const userId = req.user.id;

        if (!name || name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Name is required'
            });
        }

        // Update student name
        await pool.execute(
            'UPDATE student SET name = ? WHERE student_ID = ?',
            [name, userId]
        );

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                name
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

module.exports = { login, register, getMe, upload, uploadProfilePic, updateProfile, changePassword };
