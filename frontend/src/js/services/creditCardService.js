import api from '../api.js';

class CreditCardService {
    async getAll() {
        const response = await api.get('/credit-cards');
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

    async getInvoice(cardId, month, year) {
        const response = await api.get(`/credit-cards/${cardId}/invoice/${month}/${year}`);
        return response.data;
    }

    async payInvoice(cardId, month, year, amount) {
        const response = await api.post(`/credit-cards/${cardId}/invoice/pay`, { month, year, amount });
        return response.data;
    }

    async getBalance(cardId) {
        const response = await api.get(`/credit-cards/${cardId}/balance`);
        return response.data;
    }
}

export default new CreditCardService();
