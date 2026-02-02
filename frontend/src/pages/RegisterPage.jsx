import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';
import '../styles/register.css';

const RegisterPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        userName: '',
        password: '',
        confirmPassword: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        // Validation
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            setLoading(false);
            return;
        }

        try {
            const response = await authService.register(
                formData.email,
                formData.password,
                formData.firstName,
                formData.lastName,
                formData.userName
            );
            setSuccess('Account created successfully! Redirecting to login...');
            console.log('Registration successful:', response);
            // Redirect to login page
            setTimeout(() => {
                navigate('/');
            }, 1500);
        } catch (err) {
            const message = err.response?.data?.message || 'Registration failed. Please try again.';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-page">
            {/* Background */}
            <div className="register-background"></div>

            {/* Back to Login */}
            <Link to="/" className="back-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back to Login
            </Link>

            {/* Register Card */}
            <div className="register-card">
                <div className="register-logo">
                    <img src="/skillquest-logo.jpg" alt="SkillQuest" />
                </div>

                <h1>Join SkillQuest</h1>
                <p className="subtitle">Start your adaptive learning journey today</p>

                {error && (
                    <div className="error-message">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        {error}
                    </div>
                )}

                {success && (
                    <div className="success-message">
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label>FIRST NAME</label>
                            <input
                                type="text"
                                name="firstName"
                                placeholder="Yasindu"
                                value={formData.firstName}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>LAST NAME</label>
                            <input
                                type="text"
                                name="lastName"
                                placeholder="Jay"
                                value={formData.lastName}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>EMAIL ADDRESS</label>
                        <input
                            type="email"
                            name="email"
                            placeholder="yasindu@example.com"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>USER NAME</label>
                        <input
                            type="text"
                            name="userName"
                            placeholder="yasindu_jay"
                            value={formData.userName}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>PASSWORD</label>
                            <input
                                type="password"
                                name="password"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>RE-ENTER PASSWORD</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                placeholder="••••••••"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className="submit-btn" disabled={loading}>
                        {loading && <span className="spinner"></span>}
                        Create Account
                    </button>
                </form>

                <p className="login-link">
                    Already have an account? <Link to="/">Sign In</Link>
                </p>
            </div>

            {/* Footer */}
            <div className="register-footer">
                SKILLQUEST © 2025 • ADAPTIVE LEARNING PLATFORM
            </div>
        </div>
    );
};

export default RegisterPage;
