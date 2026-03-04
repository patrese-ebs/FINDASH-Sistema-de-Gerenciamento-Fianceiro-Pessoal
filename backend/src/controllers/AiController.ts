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
        const { Expense, Income, CreditCard, CreditCardTransaction } = await import('../models');

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

        let allTransactions: any[] = [];
        if (creditCardIds.length > 0) {
            allTransactions = await CreditCardTransaction.findAll({ where: { creditCardId: creditCardIds } });
        }

        // Helper robusto para extrair mês e ano exatamente como o Dashboard faz no frontend
        const getSafeDate = (dateVal: any) => {
            if (!dateVal) return { month: 0, year: 0 };
            const dateStr = dateVal.toString();
            // Se for string ISO ou YYYY-MM-DD
            if (dateStr.includes('-')) {
                const parts = dateStr.split('T')[0].split('-').map(Number);
                if (parts.length >= 2) return { year: parts[0], month: parts[1] };
            }
            // Fallback para Objeto Date
            const d = new Date(dateVal);
            return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
        };

        // Buscar TODAS as despesas e receitas, igual ao Frontend
        const allExpensesDb = await Expense.findAll({ where: { userId } });
        const allIncomesDb = await Income.findAll({ where: { userId } });

        for (const target of targetMonths) {
            // Filtrar na memória igual ao dashboard.component.ts
            const expenses = allExpensesDb.filter((e: any) => {
                const { year, month } = getSafeDate(e.date);
                return month === target.month && year === target.year;
            });
            allExpenses = [...allExpenses, ...expenses];

            const incomes = allIncomesDb.filter((i: any) => {
                const { year, month } = getSafeDate(i.date);
                return month === target.month && year === target.year;
            });
            allIncomes = [...allIncomes, ...incomes];

            if (creditCardIds.length > 0) {
                creditCards.forEach((card: any) => {
                    const cardTx = allTransactions.filter((t: any) => t.creditCardId === card.id);
                    const items = cardTx.filter((t: any) => {
                        const { year: pYear, month: pMonth } = getSafeDate(t.purchaseDate);
                        if (!pYear) return false;
                        const monthsElapsed = (target.year - pYear) * 12 + (target.month - pMonth);
                        return monthsElapsed >= 0 && monthsElapsed < t.installments;
                    });

                    const total = items.reduce((sum, i) => sum + parseFloat(i.installmentAmount.toString()), 0);

                    if (total > 0) {
                        allInvoices.push({
                            id: `virtual-invoice-${card.id}-${target.month}-${target.year}`,
                            creditCard: card,
                            amount: total,
                            month: target.month,
                            year: target.year
                        });
                    }
                });
            }
        }

        const allTx = [
            ...allExpenses.map((e: any) => {
                const { year, month } = getSafeDate(e.date);
                return { ...e.dataValues, type: 'expense', month, year };
            }),
            ...allIncomes.map((i: any) => {
                const { year, month } = getSafeDate(i.date);
                return { ...i.dataValues, type: 'income', month, year };
            }),
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
