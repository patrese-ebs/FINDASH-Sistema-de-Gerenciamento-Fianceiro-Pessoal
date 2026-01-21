import api from '../api.js';

class DashboardService {
    async getDashboard(month, year) {
        const response = await api.get('/reports/dashboard', {
            params: { month, year }
        });
        return response.data;
    }

    async getMonthlyReport(month, year) {
        const response = await api.get(`/reports/monthly/${month}/${year}`);
        return response.data;
    }
}

export default new DashboardService();
