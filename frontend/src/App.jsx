import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { authService } from './services/api';

// Simple Dashboard placeholder
const Dashboard = () => {
  const user = authService.getCurrentUser();

  const handleLogout = () => {
    authService.logout();
    window.location.href = '/';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontFamily: 'Inter, sans-serif',
      padding: '20px'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '20px' }}>🎉 Welcome to SkillQuest!</h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '10px' }}>
        You are logged in as: <strong>{user?.email || 'User'}</strong>
      </p>
      <p style={{ opacity: 0.8, marginBottom: '30px' }}>
        This is your dashboard. Start exploring your learning journey!
      </p>
      <button
        onClick={handleLogout}
        style={{
          padding: '12px 32px',
          background: 'white',
          color: '#1e3a8a',
          border: 'none',
          borderRadius: '10px',
          fontSize: '1rem',
          fontWeight: '600',
          cursor: 'pointer'
        }}
      >
        Logout
      </button>
    </div>
  );
};

// Protected Route component
const ProtectedRoute = ({ children }) => {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
