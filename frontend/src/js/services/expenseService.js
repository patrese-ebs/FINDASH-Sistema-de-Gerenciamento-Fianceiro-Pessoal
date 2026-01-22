import api from '../api.js';

class ExpenseService {
    async getAll(month, year) {
        const params = new URLSearchParams();
        if (month) params.append('month', month);
        if (year) params.append('year', year);

        const response = await api.get(`/expenses?${params.toString()}`);
        return response.data;
    }

    async create(expenseData) {
        const response = await api.post('/expenses', expenseData);
        return response.data;
    }

    async update(id, expenseData) {
        const response = await api.put(`/expenses/${id}`, expenseData);
        return response.data;
    }

    async delete(id) {
        await api.delete(`/expenses/${id}`);
    }
}

export default new ExpenseService();
