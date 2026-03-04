import { Request, Response } from 'express';
import aiService from '../services/AiService';
import redisService from '../services/RedisService';

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
        const userId = (req as any).userId;

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const { month, year, force } = req.query;

        // 1. Verificar Cache no Redis (evita consultas ao banco e API)
        let cacheKey = `insight:${userId}`;
        if (month && year) {
            cacheKey = `insight:${userId}:${year}:${month}`;
        }

        // Se force=true, ignoramos o cache para gerar um novo
        if (force !== 'true') {
            const cachedInsights = await redisService.get(cacheKey);
            if (cachedInsights) {
                res.json({ insights: cachedInsights });
                return;
            }
        }

        // 2. Busca no banco de dados e gera com a IA (Mes Atual + 2 Meses Futuros para Previsão)
        const { Expense, Income, CreditCard, CreditCardInvoice } = await import('../models');

        const baseMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
        const baseYear = year ? parseInt(year as string) : new Date().getFullYear();

        // Calcular os 3 meses que queremos buscar
        const targetMonths = [
            { month: baseMonth, year: baseYear },
            { month: baseMonth === 12 ? 1 : baseMonth + 1, year: baseMonth === 12 ? baseYear + 1 : baseYear },
            { month: baseMonth >= 11 ? baseMonth - 10 : baseMonth + 2, year: baseMonth >= 11 ? baseYear + 1 : baseYear }
        ];

        let allExpenses: any[] = [];
        let allIncomes: any[] = [];
        let allInvoices: any[] = [];

        // Buscar cartões de crédito para incluir as faturas no cálculo
        const creditCards = await CreditCard.findAll({ where: { userId } });
        const creditCardIds = creditCards.map((c: any) => c.id);

        for (const target of targetMonths) {
            const expenses = await Expense.findAll({ where: { userId, month: target.month, year: target.year } });
            allExpenses = [...allExpenses, ...expenses];

            const incomes = await Income.findAll({ where: { userId, month: target.month, year: target.year } });
            allIncomes = [...allIncomes, ...incomes];

            if (creditCardIds.length > 0) {
                const invoices = await CreditCardInvoice.findAll({
                    where: { creditCardId: creditCardIds, month: target.month, year: target.year },
                    include: [{ model: CreditCard, as: 'creditCard', attributes: ['name', 'dueDay'] }]
                });
                allInvoices = [...allInvoices, ...invoices];
            }
        }

        const allTx = [
            ...allExpenses.map((e: any) => ({ ...e.dataValues, type: 'expense' })),
            ...allIncomes.map((i: any) => ({ ...i.dataValues, type: 'income' })),
            ...allInvoices.map((inv: any) => {
                const dueDay = inv.creditCard?.dueDay || 10;
                const dueDate = new Date(inv.year, inv.month - 1, dueDay).toISOString().split('T')[0];
                return {
                    id: inv.id,
                    description: `Fatura Cartão ${inv.creditCard?.name || ''}`.trim(),
                    amount: inv.amount,
                    category: 'Cartão de Crédito',
                    date: dueDate,
                    month: inv.month,
                    year: inv.year,
                    type: 'expense'
                };
            })
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const insights = await aiService.generateInsights(allTx);

        // 3. Salva no Redis com TTL de 24 horas (86400 segundos) como fallback
        // (O cache será invalidado manualmente nas operações de CRUD)
        if (insights && !insights.startsWith('Erro')) {
            await redisService.set(cacheKey, insights, 86400);
        }

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
