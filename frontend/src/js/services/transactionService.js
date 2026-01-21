import api from '../api.js';

class TransactionService {
    // Income methods
    async getIncomes(month, year) {
        const params = new URLSearchParams();
        if (month) params.append('month', month);
        if (year) params.append('year', year);

        const response = await api.get(`/incomes?${params.toString()}`);
        return response.data;
    }

    async createIncome(incomeData) {
        const response = await api.post('/incomes', incomeData);
        return response.data;
    }

    async updateIncome(id, incomeData) {
        const response = await api.put(`/incomes/${id}`, incomeData);
        return response.data;
    }

    async deleteIncome(id) {
        await api.delete(`/incomes/${id}`);
    }

    // Expense methods
    async getExpenses(month, year) {
        const params = new URLSearchParams();
        if (month) params.append('month', month);
        if (year) params.append('year', year);

        const response = await api.get(`/expenses?${params.toString()}`);
        return response.data;
    }

    async createExpense(expenseData) {
        const response = await api.post('/expenses', expenseData);
        return response.data;
    }

    async updateExpense(id, expenseData) {
        const response = await api.put(`/expenses/${id}`, expenseData);
        return response.data;
    }

    async deleteExpense(id) {
        await api.delete(`/expenses/${id}`);
    }
}

export default new TransactionService();
