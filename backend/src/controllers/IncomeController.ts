import { Response } from 'express';
import { Income } from '../models';
import { AuthRequest } from '../types';

export class IncomeController {
    async getAll(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { month, year } = req.query;
            const userId = req.userId;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const where: any = { userId };

            if (month) {
                where.month = parseInt(month as string);
            }

            if (year) {
                where.year = parseInt(year as string);
            }

            const incomes = await Income.findAll({
                where,
                order: [['date', 'DESC']],
            });

            res.status(200).json(incomes);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch incomes' });
        }
    }

    async create(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { description, amount, category, date, isRecurring, recurrenceFrequency, recurrenceEndDate, isPaid } = req.body;
            const userId = req.userId;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const initialDate = new Date(date);
            const incomesToCreate = [];

            // Add the initial income
            incomesToCreate.push({
                userId,
                description,
                amount,
                category,
                date: initialDate,
                month: initialDate.getMonth() + 1,
                year: initialDate.getFullYear(),
                isRecurring: isRecurring || false,
                recurrenceFrequency: isRecurring ? recurrenceFrequency : null,
                recurrenceEndDate: isRecurring ? recurrenceEndDate : null,
                isPaid: isPaid ?? false,
            });

            // Generate future incomes if recurring
            if (isRecurring) {
                let endDate: Date;
                if (recurrenceEndDate) {
                    endDate = new Date(recurrenceEndDate);
                } else {
                    // Default to 5 years if indefinite
                    endDate = new Date(initialDate);
                    endDate.setFullYear(endDate.getFullYear() + 5);
                }
                let nextDate = new Date(initialDate);

                // Advance to next month for the first recurring entry
                nextDate.setMonth(nextDate.getMonth() + 1);

                while (nextDate <= endDate) {
                    incomesToCreate.push({
                        userId,
                        description,
                        amount,
                        category,
                        date: new Date(nextDate),
                        month: nextDate.getMonth() + 1,
                        year: nextDate.getFullYear(),
                        isRecurring: true,
                        recurrenceFrequency,
                        recurrenceEndDate: recurrenceEndDate || null,
                        isPaid: false, // Future recurring items default to unpaid
                    });

                    // Advance to next month
                    // TODO: Handle other frequencies if needed, currently assuming monthly
                    nextDate.setMonth(nextDate.getMonth() + 1);
                }
            }

            const createdIncomes = await Income.bulkCreate(incomesToCreate);

            res.status(201).json(createdIncomes[0]);
        } catch (error) {
            console.error('Error creating income:', error);
            res.status(500).json({ error: 'Failed to create income' });
        }
    }

    async update(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { description, amount, category, date, isRecurring, isPaid } = req.body;
            const userId = req.userId;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const income = await Income.findOne({ where: { id, userId } });

            if (!income) {
                res.status(404).json({ error: 'Income not found' });
                return;
            }

            const incomeDate = date ? new Date(date) : new Date(income.date);
            const month = incomeDate.getMonth() + 1;
            const year = incomeDate.getFullYear();

            await income.update({
                description: description || income.description,
                amount: amount || income.amount,
                category: category || income.category,
                date: incomeDate,
                month,
                year,
                isRecurring: isRecurring !== undefined ? isRecurring : income.isRecurring,
                isPaid: isPaid !== undefined ? isPaid : income.isPaid,
            });

            res.status(200).json(income);
        } catch (error) {
            res.status(500).json({ error: 'Failed to update income' });
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

            const income = await Income.findOne({ where: { id, userId } });

            if (!income) {
                res.status(404).json({ error: 'Income not found' });
                return;
            }

            await income.destroy();
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: 'Failed to delete income' });
        }
    }
}
