import { Response } from 'express';
import { FinancialPlan } from '../models';
import { AuthRequest } from '../types';

export class FinancialPlanController {
    async getAll(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.userId;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const plans = await FinancialPlan.findAll({
                where: { userId },
                order: [['deadline', 'ASC']],
            });

            res.status(200).json(plans);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch financial plans' });
        }
    }

    async create(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { name, targetAmount, currentAmount, deadline, category } = req.body;
            const userId = req.userId;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const plan = await FinancialPlan.create({
                userId,
                name,
                targetAmount,
                currentAmount: currentAmount || 0,
                deadline: new Date(deadline),
                category,
            });

            res.status(201).json(plan);
        } catch (error) {
            res.status(500).json({ error: 'Failed to create financial plan' });
        }
    }

    async update(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { name, targetAmount, currentAmount, deadline, category } = req.body;
            const userId = req.userId;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const plan = await FinancialPlan.findOne({ where: { id, userId } });

            if (!plan) {
                res.status(404).json({ error: 'Financial plan not found' });
                return;
            }

            await plan.update({
                name: name || plan.name,
                targetAmount: targetAmount || plan.targetAmount,
                currentAmount: currentAmount !== undefined ? currentAmount : plan.currentAmount,
                deadline: deadline ? new Date(deadline) : plan.deadline,
                category: category || plan.category,
            });

            res.status(200).json(plan);
        } catch (error) {
            res.status(500).json({ error: 'Failed to update financial plan' });
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

            const plan = await FinancialPlan.findOne({ where: { id, userId } });

            if (!plan) {
                res.status(404).json({ error: 'Financial plan not found' });
                return;
            }

            await plan.destroy();
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: 'Failed to delete financial plan' });
        }
    }
}
