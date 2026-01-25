import api from '../api.js';

class CreditCardService {
    async getSummary(month, year) {
        let url = '/credit-cards/summary';
        if (month && year) {
            url += `?month=${month}&year=${year}`;
        }
        const response = await api.get(url);
        return response.data;
    }

    async getAll(month, year) {
        let url = '/credit-cards';
        if (month && year) {
            url += `?month=${month}&year=${year}`;
        }
        const response = await api.get(url);
        return response.data;
    }

    async create(cardData) {
        const response = await api.post('/credit-cards', cardData);
        return response.data;
    }

    async update(id, cardData) {
        const response = await api.put(`/credit-cards/${id}`, cardData);
        return response.data;
    }

    async delete(id) {
        await api.delete(`/credit-cards/${id}`);
    }

    async getTransactions(cardId) {
        const response = await api.get(`/credit-cards/${cardId}/transactions`);
        return response.data;
    }

    async addTransaction(cardId, transactionData) {
        const response = await api.post(`/credit-cards/${cardId}/transactions`, transactionData);
        return response.data;
    }

    async updateTransaction(cardId, transactionId, transactionData) {
        const response = await api.put(`/credit-cards/${cardId}/transactions/${transactionId}`, transactionData);
        return response.data;
    }

    async deleteTransaction(cardId, transactionId) {
        await api.delete(`/credit-cards/${cardId}/transactions/${transactionId}`);
    }

    async getInvoice(cardId, month, year) {
        const response = await api.get(`/credit-cards/${cardId}/invoice/${month}/${year}`);
        return response.data;
    }

    async payInvoice(cardId, month, year, amount) {
        const response = await api.post(`/credit-cards/${cardId}/invoice/pay`, { month, year, amount });
        return response.data;
    }

    async planInvoices(cardId, plans) {
        const response = await api.post(`/credit-cards/${cardId}/invoice/plan`, { plans });
        return response.data;
    }

    async getBalance(cardId) {
        const response = await api.get(`/credit-cards/${cardId}/balance`);
        return response.data;
    }
}

export default new CreditCardService();
