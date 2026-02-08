import { useState, useRef } from 'react';
import { authService } from '../services/api';
import { Link } from 'react-router-dom';
import '../styles/login.css';

/**
 * Login Page
 * 
 * Entry point for the application.
 * Features:
 * - Dual Mode: Toggles between Login and "Quick Sign-up" (though full registration is usually separate).
 * - Adaptive Redirection:
 *   - New Users (status 0) -> redirected to Initial Quiz (Placement Test).
 *   - Returning Users (status 1) -> redirected to Dashboard.
 * - Error Handling: Displays auth errors inline.
 */
const LoginPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showResend, setShowResend] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '',
        phone: '',
        rememberMe: false
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            if (isLogin) {
                const response = await authService.login(
                    formData.email,
                    formData.password,
                    formData.rememberMe
                );
                setSuccess('Login successful! Redirecting...');
                console.log('Login successful:', response);
                console.log('User status:', response.user.status, typeof response.user.status);

                // Redirect Logic:
                // Status 0: New student, needs placement test.
                // Status 1: Active student, goes to dashboard.
                setTimeout(() => {
                    if (response.user.status == 0) {
                        window.location.href = '/initial-quiz';
                    } else {
                        window.location.href = '/dashboard';
                    }
                }, 1500);
            } else {
                // Quick registration flow (Optional usage, typically RegisterPage is preferred)
                const response = await authService.register(
                    formData.email,
                    formData.password,
                    formData.fullName,
                    formData.phone
                );
                setSuccess('Registration successful! Please sign in.');
                console.log('Registration successful:', response);
                // Redirect to login page after registration
                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);
            }
        } catch (err) {
            const message = err.response?.data?.message || 'An error occurred. Please try again.';
            setError(message);
            if (message.toLowerCase().includes('verify')) {
                setShowResend(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        try {
            setLoading(true);
            await authService.resendVerificationEmail(formData.email);
            setSuccess('Verification email resent! Please check your inbox.');
            setError('');
            setShowResend(false);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to resend email.');
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setError('');
        setSuccess('');
        setFormData({
            email: '',
            password: '',
            fullName: '',
            phone: '',
            rememberMe: false
        });
    };

    return (
        <div className="login-page">
            {/* Background */}
            <div className="login-background"></div>

            {/* Close Button */}
            <button className="close-button">×</button>

            {/* Left Side - Hero Content */}
            <div className="login-left">
                <div className="logo">
                    <img src="/skillquest-logo.jpg" alt="SkillQuest" className="logo-image" />
                </div>

                <div className="hero-content">
                    <h1>
                        Unlock Your<br />
                        <span className="highlight">Potential.</span>
                    </h1>
                    <p>
                        Join a world-class community of learners. Adaptive AI-driven
                        paths designed to transform your programming skills.
                    </p>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="login-right">
                <div className="login-card">
                    <h2>{isLogin ? 'Sign in' : 'Create Account'}</h2>
                    <p className="subtitle">
                        {isLogin
                            ? 'Welcome back! Please enter your details.'
                            : 'Get started with your free account.'}
                    </p>

                    {error && (
                        <div
                            className="error-message"
                            style={{
                                flexDirection: showResend ? 'column' : 'row',
                                alignItems: showResend ? 'flex-start' : 'center'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="8" x2="12" y2="12"></line>
                                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                </svg>
                                <span>{error}</span>
                            </div>
                            {showResend && (
                                <button
                                    onClick={handleResend}
                                    className="resend-action-btn"
                                >
                                    Resend Verification Email
                                </button>
                            )}
                        </div>
                    )}

                    {success && (
                        <div className="success-message">
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {!isLogin && (
                            <div className="form-group">
                                <label>Full Name</label>
                                <input
                                    type="text"
                                    name="fullName"
                                    placeholder="John Doe"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                />
                            </div>
                        )}

                        <div className="form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                name="email"
                                placeholder="name@company.com"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Password</label>
                            <div className="input-wrapper">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                            <line x1="1" y1="1" x2="23" y2="23"></line>
                                        </svg>
                                    ) : (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                            <circle cx="12" cy="12" r="3"></circle>
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {!isLogin && (
                            <div className="form-group">
                                <label>Phone (Optional)</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    placeholder="+1 234 567 8900"
                                    value={formData.phone}
                                    onChange={handleChange}
                                />
                            </div>
                        )}

                        {isLogin && (
                            <div className="form-options">
                                <label className="remember-me">
                                    <input
                                        type="checkbox"
                                        name="rememberMe"
                                        checked={formData.rememberMe}
                                        onChange={handleChange}
                                    />
                                    <span>Remember</span>
                                </label>
                                <Link to="/forgot-password" className="forgot-link">Forgot?</Link>
                            </div>
                        )}

                        <button type="submit" className="submit-btn" disabled={loading}>
                            {loading && <span className="spinner"></span>}
                            {isLogin ? 'Sign in to SkillQuest' : 'Create Account'}
                        </button>
                    </form>

                    <p className="register-link">
                        Don't have an account?
                        <a href="/register">Register now</a>
                    </p>
                </div>
            </div>

            {/* Footer */}
            <div className="footer">
                SKILLQUEST © 2026 • ADAPTIVE LEARNING PLATFORM
            </div>
        </div>
    );
};

export default LoginPage;
