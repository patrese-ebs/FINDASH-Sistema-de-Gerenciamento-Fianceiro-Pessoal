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
            const { description, amount, category, date, paymentMethod, creditCardId, isRecurring, recurrenceFrequency, recurrenceEndDate, isPaid, installments, owner, detailOnly } = req.body;
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

            let createdTransactionId: string | undefined = undefined;

            // Sync with Credit Card System FIRST to get its ID
            if (paymentMethod === 'credit' && creditCardId) {
                const totalAmt = parseFloat(amount.toString());
                const numInst = installments ? parseInt(installments.toString()) : 1;

                const transaction = await CreditCardTransaction.create({
                    creditCardId,
                    description,
                    totalAmount: totalAmt,
                    installments: numInst,
                    currentInstallment: 1,
                    installmentAmount: totalAmt / numInst,
                    purchaseDate: initialDate,
                    category,
                    owner: owner || null,
                    detailOnly: detailOnly || false
                });
                createdTransactionId = transaction.id;
            }

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
                        creditCardTransactionId: createdTransactionId,
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
                    creditCardTransactionId: createdTransactionId,
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
                        creditCardTransactionId: createdTransactionId,
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
                    creditCardTransactionId: createdTransactionId,
                });
            }

            const createdExpenses = await Expense.bulkCreate(expensesToCreate);

            // Invalidate AI insights cache
            await redisService.delPattern(`insight:${userId}*`);

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
                isPaid: isPaid !== undefined ? isPaid : expense.isPaid,
            });

            // Sync update to associated CreditCardTransaction if it exists
            if (expense.creditCardTransactionId) {
                const transaction = await CreditCardTransaction.findByPk(expense.creditCardTransactionId);
                if (transaction) {
                    // Update only if relevant fields changed
                    const newTotal = amount !== undefined ? amount : transaction.totalAmount;
                    const newInstallmentAmount = Number(newTotal) / transaction.installments;

                    await transaction.update({
                        description: description || transaction.description,
                        totalAmount: newTotal,
                        installmentAmount: newInstallmentAmount,
                        category: category || transaction.category,
                        purchaseDate: date ? new Date(date) : transaction.purchaseDate
                    });
                }
            }

            // Invalidate AI insights cache
            await redisService.delPattern(`insight:${userId}*`);

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

            const transactionIdToDelete = expense.creditCardTransactionId;

            if (deleteRecurring === 'true' && expense.recurrenceId) {
                const { Op } = require('sequelize');
                // First get all expenses to find their transaction IDs
                const expensesToDelete = await Expense.findAll({
                    where: {
                        userId,
                        recurrenceId: expense.recurrenceId,
                        date: {
                            [Op.gte]: expense.date
                        }
                    }
                });

                const transactionIds: string[] = expensesToDelete
                    .map(e => e.creditCardTransactionId)
                    .filter((id): id is string => id !== null && id !== undefined);
                
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

                // Also delete associated transactions if they exist
                if (transactionIds.length > 0) {
                     await CreditCardTransaction.destroy({
                         where: {
                             id: {
                                 [Op.in]: transactionIds
                             }
                         }
                     });
                }
            } else {
                await expense.destroy();
                if (transactionIdToDelete) {
                    await CreditCardTransaction.destroy({ where: { id: transactionIdToDelete } });
                }
            }

            // Invalidate AI insights cache
            await redisService.delPattern(`insight:${userId}*`);

            res.status(204).send();
        } catch (error) {
            console.error('Error deleting expense:', error);
            res.status(500).json({ error: 'Failed to delete expense' });
        }
    }
}
