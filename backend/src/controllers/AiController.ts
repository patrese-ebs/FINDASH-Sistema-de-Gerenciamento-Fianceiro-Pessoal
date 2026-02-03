import { Request, Response } from 'express';
import aiService from '../services/AiService';

export const parseExpense = async (req: Request, res: Response) => {
    try {
        const text = req.body.text;
        const file = req.file;

        if (!text && !file) {
            res.status(400).json({ error: 'Please provide text or a file.' });
            return;
        }

        let result;
        if (file) {
            // Check for supported mime types
            const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
            if (!supportedTypes.includes(file.mimetype)) {
                res.status(400).json({ error: 'Unsupported file type. Use JPEG, PNG, WEBP, or PDF.' });
                return;
            }

            result = await aiService.parseExpense({
                path: file.path,
                mimeType: file.mimetype
            });
        } else {
            result = await aiService.parseExpense(text);
        }

        res.json(result);
    } catch (error: any) {
        console.error('AI Parse Error:', error);
        res.status(500).json({ error: 'Failed to process request', details: error.message || JSON.stringify(error) });
    }
};

export const getInsights = async (req: Request, res: Response) => {
    try {
        // In a real app, inject TransactionService to fetch data
        // For now, we might need to duplicate fetching logic or import the service dynamically
        // simpler: let frontend pass summary? No, secure backend should do it.
        // Let's assume we can fetch transactions here.
        // Importing standard TransactionService might be circular if not careful.
        // Let's use direct DB call or import.

        // Dynamic import to avoid circular dep issues if any
        const { Expense, Income } = await import('../models');

        const expenses = await Expense.findAll({ limit: 50, order: [['date', 'DESC']] });
        const incomes = await Income.findAll({ limit: 50, order: [['date', 'DESC']] });

        const allTx = [
            ...expenses.map(e => ({ ...e.dataValues, type: 'expense' })),
            ...incomes.map(i => ({ ...i.dataValues, type: 'income' }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const insights = await aiService.generateInsights(allTx);
        res.json({ insights });
    } catch (error: any) {
        console.error('AI Insight Controller Error:', error);
        res.status(500).json({ error: 'Failed to generate insights' });
    }
};

export const searchDebt = async (req: Request, res: Response) => {
    try {
        const { query } = req.body;
        const userId = (req as any).userId;

        if (!query) {
            res.status(400).json({ error: 'Por favor, forneça uma pergunta.' });
            return;
        }

        if (!userId) {
            res.status(401).json({ error: 'Não autorizado' });
            return;
        }

        const result = await aiService.searchDebt(query, userId);
        res.json({ result });
    } catch (error: any) {
        console.error('AI Debt Search Controller Error:', error);
        res.status(500).json({ error: 'Falha ao pesquisar dívida' });
    }
};
