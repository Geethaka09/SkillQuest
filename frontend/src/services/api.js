import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add token to requests if available
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auth services
export const authService = {
    login: async (email, password, rememberMe = false) => {
        const response = await api.post('/auth/login', { email, password, rememberMe });
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    },

    register: async (email, password, firstName, lastName, userName) => {
        const response = await api.post('/auth/register', {
            email,
            password,
            firstName,
            lastName,
            userName
        });
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    },

    uploadProfilePic: async (formData) => {
        const response = await api.post('/auth/upload-profile-pic', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        // Update local storage if successful
        if (response.data.success && response.data.profilePic) {
            const user = JSON.parse(localStorage.getItem('user'));
            if (user) {
                user.profilePic = response.data.profilePic;
                localStorage.setItem('user', JSON.stringify(user));
            }
        }
        return response.data;
    },

    updateProfile: async (data) => {
        const response = await api.put('/auth/update-profile', data);
        if (response.data.success && response.data.user) {
            const user = JSON.parse(localStorage.getItem('user'));
            if (user) {
                // Merge new data (e.g. name)
                const updatedUser = { ...user, ...response.data.user };
                localStorage.setItem('user', JSON.stringify(updatedUser));
            }
        }
        return response.data;
    },

    changePassword: async (data) => {
        const response = await api.put('/auth/change-password', data);
        return response.data;
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    getCurrentUser: () => {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    isAuthenticated: () => {
        return !!localStorage.getItem('token');
    }
};

// Quiz services
export const quizService = {
    getInitialQuiz: async () => {
        const response = await api.get('/quiz/initial');
        return response.data;
    },

    completeQuiz: async (data) => {
        const response = await api.post('/quiz/complete', data);
        return response.data;
    }
};

// Gamification services
export const gamificationService = {
    getDashboardStats: async () => {
        const response = await api.get('/gamification/dashboard');
        return response.data;
    },

    addXP: async (amount) => {
        const response = await api.post('/gamification/add-xp', { amount });
        return response.data;
    },

    getDailyGoals: async () => {
        const response = await api.get('/gamification/daily-goals');
        return response.data;
    }
};

// Study Plan services
export const studyPlanService = {
    getProgress: async () => {
        const response = await api.get('/study-plan/progress');
        return response.data;
    },

    getWeekContent: async (weekNumber) => {
        const response = await api.get(`/study-plan/week/${weekNumber}`);
        return response.data;
    },

    getStepContent: async (weekNumber, stepId) => {
        const response = await api.get(`/study-plan/step/${weekNumber}/${stepId}`);
        return response.data;
    },

    submitQuiz: async (data) => {
        const response = await api.post('/study-plan/submit-quiz', data);
        return response.data;
    }
};

// Analytics services
export const analyticsService = {
    getWeeklyEngagement: async (range = '7days') => {
        const response = await api.get(`/analytics/weekly-engagement?range=${range}`);
        return response.data;
    }
};

export default api;
