import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/api';
import '../styles/login.css';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        try {
            await authService.forgotPassword(email);
            setMessage('Password reset email sent! Please check your inbox.');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send reset email.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-background"></div>

            <div className="login-centered">
                <div className="login-card">
                    <div className="logo" style={{ position: 'relative', top: 'auto', left: 'auto', marginBottom: '24px', justifyContent: 'center' }}>
                        <img src="/skillquest-logo.jpg" alt="SkillQuest" className="logo-image" style={{ height: '50px' }} />
                    </div>

                    <h2 style={{ textAlign: 'center' }}>Forgot Password</h2>
                    <p className="subtitle" style={{ textAlign: 'center', marginBottom: '30px' }}>
                        Enter your email to receive a password reset link.
                    </p>

                    {message && <div className="success-message">{message}</div>}
                    {error && <div className="error-message">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@company.com"
                                required
                            />
                        </div>

                        <button type="submit" className="submit-btn" disabled={loading}>
                            {loading && <span className="spinner"></span>}
                            Send Reset Link
                        </button>
                    </form>

                    <p className="register-link" style={{ marginTop: '24px' }}>
                        Remember your password?
                        <Link to="/">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
