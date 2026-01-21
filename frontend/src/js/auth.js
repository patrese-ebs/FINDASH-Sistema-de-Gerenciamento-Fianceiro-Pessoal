import api from './api.js';

class AuthService {
    async register(email, password, name) {
        try {
            const response = await api.post('/auth/register', { email, password, name });
            this.setSession(response.data);
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.error || 'Registration failed');
        }
    }

    async login(email, password) {
        try {
            const response = await api.post('/auth/login', { email, password });
            this.setSession(response.data);
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.error || 'Login failed');
        }
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    }

    setSession(data) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
    }

    getUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }

    isAuthenticated() {
        return !!localStorage.getItem('token');
    }

    async getMe() {
        try {
            const response = await api.get('/auth/me');
            return response.data;
        } catch (error) {
            throw new Error('Failed to get user data');
        }
    }
}

export default new AuthService();
