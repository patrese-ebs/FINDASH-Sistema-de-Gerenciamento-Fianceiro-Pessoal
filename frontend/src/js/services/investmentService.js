import api from '../api.js';

class InvestmentService {
    async getAll() {
        const response = await api.get('/investments');
        return response.data;
    }

    async create(investmentData) {
        const response = await api.post('/investments', investmentData);
        return response.data;
    }

    async update(id, investmentData) {
        const response = await api.put(`/investments/${id}`, investmentData);
        return response.data;
    }

    async delete(id) {
        await api.delete(`/investments/${id}`);
    }
}

export default new InvestmentService();
