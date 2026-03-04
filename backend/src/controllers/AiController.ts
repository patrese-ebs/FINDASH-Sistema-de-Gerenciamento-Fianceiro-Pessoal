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

        // 1. Verificar Cache no Redis (evita consultas ao banco e API)
        const cacheKey = `insight:${userId}`;
        const cachedInsights = await redisService.get(cacheKey);

        if (cachedInsights) {
            // Se existir no cache, retorna imediatamente
            res.json({ insights: cachedInsights });
            return;
        }

        // 2. Se não estiver no cache, busca no banco de dados e gera com a IA
        const { Expense, Income } = await import('../models');

        const expenses = await Expense.findAll({ where: { userId }, limit: 50, order: [['date', 'DESC']] });
        const incomes = await Income.findAll({ where: { userId }, limit: 50, order: [['date', 'DESC']] });

        const allTx = [
            ...expenses.map((e: any) => ({ ...e.dataValues, type: 'expense' })),
            ...incomes.map((i: any) => ({ ...i.dataValues, type: 'income' }))
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
