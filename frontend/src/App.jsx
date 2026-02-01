import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import InitialQuizPage from './pages/InitialQuizPage';
import LearningPage from './pages/LearningPage';
import StepQuizPage from './pages/StepQuizPage';
import { authService } from './services/api';

// Protected Route component - checks authentication and quiz completion status
const ProtectedRoute = ({ children, requireQuizComplete = true }) => {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  const user = authService.getCurrentUser();

  // If quiz is required and user hasn't completed it (status = 0), redirect to quiz
  if (requireQuizComplete && user?.status == 0) {
    return <Navigate to="/initial-quiz" replace />;
  }

  return children;
};

// Quiz Route - only for users who haven't completed the quiz
const QuizRoute = ({ children }) => {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  const user = authService.getCurrentUser();

  // If user has already completed quiz (status = 1), redirect to dashboard
  if (user?.status == 1) {
    return <Navigate to="/dashboard" replace />;
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
          path="/initial-quiz"
          element={
            <QuizRoute>
              <InitialQuizPage />
            </QuizRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/learn/:weekNumber"
          element={
            <ProtectedRoute>
              <LearningPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quiz/:weekNumber/:stepId"
          element={
            <ProtectedRoute>
              <StepQuizPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <AnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
