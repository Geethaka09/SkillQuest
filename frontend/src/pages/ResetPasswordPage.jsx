import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { authService } from '../services/api';
import '../styles/login.css';

const ResetPasswordPage = () => {
    const { token } = useParams();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        setMessage('');
        setError('');

        try {
            await authService.resetPassword(token, password);
            setMessage('Password reset successful! You can now log in with your new password.');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset password. Link may be expired.');
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

                    <h2 style={{ textAlign: 'center' }}>Reset Password</h2>
                    <p className="subtitle" style={{ textAlign: 'center', marginBottom: '30px' }}>
                        Enter your new password below.
                    </p>

                    {message && (
                        <div className="success-message">
                            {message}
                            <div style={{ marginTop: '10px', textAlign: 'center' }}>
                                <Link to="/" style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 'bold' }}>
                                    Go to Login
                                </Link>
                            </div>
                        </div>
                    )}

                    {error && <div className="error-message">{error}</div>}

                    {!message && (
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>New Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Confirm Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                />
                            </div>

                            <button type="submit" className="submit-btn" disabled={loading}>
                                {loading && <span className="spinner"></span>}
                                Reset Password
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
