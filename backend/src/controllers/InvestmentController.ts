import { Response } from 'express';
import { Investment } from '../models';
import { AuthRequest } from '../types';

export class InvestmentController {
    async getAll(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.userId;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const investments = await Investment.findAll({
                where: { userId },
                order: [['purchaseDate', 'DESC']],
            });

            res.status(200).json(investments);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch investments' });
        }
    }

    async create(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { name, type, amountInvested, currentValue, purchaseDate, notes } = req.body;
            const userId = req.userId;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const investment = await Investment.create({
                userId,
                name,
                type,
                amountInvested,
                currentValue,
                purchaseDate: new Date(purchaseDate),
                notes: notes || null,
            });

            res.status(201).json(investment);
        } catch (error) {
            res.status(500).json({ error: 'Failed to create investment' });
        }
    }

    async update(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { name, type, amountInvested, currentValue, purchaseDate, notes } = req.body;
            const userId = req.userId;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const investment = await Investment.findOne({ where: { id, userId } });

            if (!investment) {
                res.status(404).json({ error: 'Investment not found' });
                return;
            }

            await investment.update({
                name: name || investment.name,
                type: type || investment.type,
                amountInvested: amountInvested || investment.amountInvested,
                currentValue: currentValue || investment.currentValue,
                purchaseDate: purchaseDate ? new Date(purchaseDate) : investment.purchaseDate,
                notes: notes !== undefined ? notes : investment.notes,
            });

            res.status(200).json(investment);
        } catch (error) {
            res.status(500).json({ error: 'Failed to update investment' });
        }
    }

    async delete(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userId = req.userId;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const investment = await Investment.findOne({ where: { id, userId } });

            if (!investment) {
                res.status(404).json({ error: 'Investment not found' });
                return;
            }

            await investment.destroy();
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: 'Failed to delete investment' });
        }
    }
}
