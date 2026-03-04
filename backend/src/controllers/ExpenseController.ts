import { Response } from 'express';
import { Expense, CreditCardTransaction } from '../models';
import redisService from '../services/RedisService';
import { AuthRequest } from '../types';

export class ExpenseController {
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

            const expenses = await Expense.findAll({
                where,
                order: [['date', 'DESC']],
            });

            res.status(200).json(expenses);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch expenses' });
        }
    }

    async create(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { description, amount, category, date, paymentMethod, creditCardId, isRecurring, recurrenceFrequency, recurrenceEndDate, isPaid, installments } = req.body;
            const userId = req.userId;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const initialDate = new Date(date);
            const expensesToCreate = [];
            const { v4: uuidv4 } = require('uuid');
            const recurrenceId = (isRecurring || (installments && parseInt(installments.toString()) > 1)) ? uuidv4() : null;

            const originalDay = initialDate.getDate();
            const getNextDate = (startDate: Date, offset: number) => {
                const d = new Date(startDate);
                d.setMonth(d.getMonth() + offset);
                if (d.getDate() !== originalDay) {
                    d.setDate(0);
                }
                return d;
            };

            // Handle Installments (Fixed number of payments)
            if (installments && parseInt(installments.toString()) > 1) {
                const numInstallments = parseInt(installments.toString());
                for (let i = 0; i < numInstallments; i++) {
                    // Use helper for correctness, though i=0 is just initialDate
                    const nextDate = getNextDate(initialDate, i);

                    expensesToCreate.push({
                        userId,
                        description: `${description} (${i + 1}/${numInstallments})`,
                        amount, // Assuming amount is per installment
                        category,
                        date: nextDate,
                        month: nextDate.getMonth() + 1,
                        year: nextDate.getFullYear(),
                        paymentMethod,
                        creditCardId: creditCardId || null,
                        isRecurring: false,
                        // Installments are technically recurring but treated as separate entries here, 
                        // but let's link them with recurrenceId for easier management if desired
                        recurrenceId,
                        isPaid: i === 0 ? (isPaid ?? false) : false, // Only first one adopts the paid status
                    });
                }
            }
            // Handle Recurrence (Indefinite or End Date)
            else if (isRecurring) {
                // Add the initial expense
                expensesToCreate.push({
                    userId,
                    description,
                    amount,
                    category,
                    date: initialDate,
                    month: initialDate.getMonth() + 1,
                    year: initialDate.getFullYear(),
                    paymentMethod,
                    creditCardId: creditCardId || null,
                    isRecurring: true,
                    recurrenceFrequency,
                    recurrenceEndDate,
                    recurrenceId,
                    isPaid: isPaid ?? false,
                });

                let endDate: Date;
                if (recurrenceEndDate) {
                    endDate = new Date(recurrenceEndDate);
                } else {
                    // Default to 5 years if indefinite
                    endDate = new Date(initialDate);
                    endDate.setFullYear(endDate.getFullYear() + 5);
                }

                let currentMonthOffset = 1;
                let nextDate = getNextDate(initialDate, currentMonthOffset);

                while (nextDate <= endDate) {
                    expensesToCreate.push({
                        userId,
                        description,
                        amount,
                        category,
                        date: nextDate,
                        month: nextDate.getMonth() + 1,
                        year: nextDate.getFullYear(),
                        paymentMethod,
                        creditCardId: creditCardId || null,
                        isRecurring: true,
                        recurrenceFrequency,
                        recurrenceEndDate: recurrenceEndDate || null,
                        recurrenceId,
                        isPaid: false, // Future recurring items default to unpaid
                    });

                    // Advance to next month
                    currentMonthOffset++;
                    nextDate = getNextDate(initialDate, currentMonthOffset);
                }
            }
            // Single Expense
            else {
                expensesToCreate.push({
                    userId,
                    description,
                    amount,
                    category,
                    date: initialDate,
                    month: initialDate.getMonth() + 1,
                    year: initialDate.getFullYear(),
                    paymentMethod,
                    creditCardId: creditCardId || null,
                    isRecurring: false,
                    isPaid: isPaid ?? false,
                });
            }

            // Sync with Credit Card System
            if (paymentMethod === 'credit' && creditCardId) {
                const totalAmt = parseFloat(amount.toString());
                const numInst = installments ? parseInt(installments.toString()) : 1;

                await CreditCardTransaction.create({
                    creditCardId,
                    description,
                    totalAmount: totalAmt,
                    installments: numInst,
                    currentInstallment: 1,
                    installmentAmount: totalAmt / numInst,
                    purchaseDate: initialDate,
                    category
                });
            }

            const createdExpenses = await Expense.bulkCreate(expensesToCreate);

            // Invalidate AI insights cache
            await redisService.del(`insight:${userId}`);

            res.status(201).json(createdExpenses[0]);
        } catch (error) {
            console.error('Error creating expense:', error);
            res.status(500).json({ error: 'Failed to create expense' });
        }
    }

    async update(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { description, amount, category, date, paymentMethod, creditCardId, isRecurring, isPaid } = req.body;
            const userId = req.userId;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const expense = await Expense.findOne({ where: { id, userId } });

            if (!expense) {
                res.status(404).json({ error: 'Expense not found' });
                return;
            }

            const expenseDate = date ? new Date(date) : new Date(expense.date);
            const month = expenseDate.getMonth() + 1;
            const year = expenseDate.getFullYear();

            await expense.update({
                description: description || expense.description,
                amount: amount || expense.amount,
                category: category || expense.category,
                date: expenseDate,
                month,
                year,
                paymentMethod: paymentMethod || expense.paymentMethod,
                creditCardId: creditCardId !== undefined ? creditCardId : expense.creditCardId,
                isRecurring: isRecurring !== undefined ? isRecurring : expense.isRecurring,
            });

            // Invalidate AI insights cache
            await redisService.del(`insight:${userId}`);

            res.status(200).json(expense);
        } catch (error) {
            res.status(500).json({ error: 'Failed to update expense' });
        }
    }

    async delete(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { deleteRecurring } = req.query; // Check for query param
            const userId = req.userId;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const expense = await Expense.findOne({ where: { id, userId } });

            if (!expense) {
                res.status(404).json({ error: 'Expense not found' });
                return;
            }

            if (deleteRecurring === 'true' && expense.recurrenceId) {
                const { Op } = require('sequelize');
                // Delete all future occurrences (including this one)
                await Expense.destroy({
                    where: {
                        userId,
                        recurrenceId: expense.recurrenceId,
                        date: {
                            [Op.gte]: expense.date
                        }
                    }
                });
            } else {
                await expense.destroy();
            }

            // Invalidate AI insights cache
            await redisService.del(`insight:${userId}`);

            res.status(204).send();
        } catch (error) {
            console.error('Error deleting expense:', error);
            res.status(500).json({ error: 'Failed to delete expense' });
        }
    }
}
