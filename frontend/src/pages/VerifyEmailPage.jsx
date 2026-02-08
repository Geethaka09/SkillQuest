import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authService } from '../services/api';
import '../styles/login.css'; // Reuse login styles for consistent look

const VerifyEmailPage = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [message, setMessage] = useState('Verifying your email...');
    const hasFetched = useRef(false);

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Invalid verification link.');
            return;
        }

        if (hasFetched.current) return;
        hasFetched.current = true;

        const verify = async () => {
            try {
                await authService.verifyEmail(token);
                setStatus('success');
                setMessage('Email verified successfully! You can now log in.');
            } catch (error) {
                setStatus('error');
                setMessage(error.response?.data?.message || 'Verification failed. Link may be expired.');
            }
        };

        verify();
    }, [token]);

    return (
        <div className="login-page">
            <div className="login-background"></div>

            <div className="login-container" style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                width: '100%',
                zIndex: 2,
                position: 'relative'
            }}>
                <div className="login-card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center', padding: '40px' }}>
                    <div className="logo" style={{ marginBottom: '20px' }}>
                        <img src="/skillquest-logo.jpg" alt="SkillQuest" style={{ width: '60px', borderRadius: '12px' }} />
                    </div>

                    <h2>Email Verification</h2>

                    <div style={{ margin: '30px 0' }}>
                        {status === 'verifying' && (
                            <div className="spinner" style={{ margin: '0 auto' }}></div>
                        )}

                        {status === 'success' && (
                            <div style={{ color: '#10B981', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                </svg>
                                <p style={{ fontSize: '1.1rem' }}>{message}</p>
                            </div>
                        )}

                        {status === 'error' && (
                            <div style={{ color: '#EF4444', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="8" x2="12" y2="12"></line>
                                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                </svg>
                                <p style={{ fontSize: '1.1rem' }}>{message}</p>
                            </div>
                        )}
                    </div>

                    {status !== 'verifying' && (
                        <Link to="/" className="submit-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>
                            Go to Login
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VerifyEmailPage;
