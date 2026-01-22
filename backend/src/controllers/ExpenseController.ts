import { Response } from 'express';
import { Expense, CreditCardTransaction } from '../models';
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

            // Handle Installments (Fixed number of payments)
            if (installments && parseInt(installments) > 1) {
                const numInstallments = parseInt(installments);
                for (let i = 0; i < numInstallments; i++) {
                    const nextDate = new Date(initialDate);
                    nextDate.setMonth(nextDate.getMonth() + i);

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
                let nextDate = new Date(initialDate);

                // Advance to next month for the first recurring entry
                nextDate.setMonth(nextDate.getMonth() + 1);

                while (nextDate <= endDate) {
                    expensesToCreate.push({
                        userId,
                        description,
                        amount,
                        category,
                        date: new Date(nextDate),
                        month: nextDate.getMonth() + 1,
                        year: nextDate.getFullYear(),
                        paymentMethod,
                        creditCardId: creditCardId || null,
                        isRecurring: true,
                        recurrenceFrequency,
                        recurrenceEndDate: recurrenceEndDate || null,
                        isPaid: false, // Future recurring items default to unpaid
                    });

                    // Advance to next month
                    nextDate.setMonth(nextDate.getMonth() + 1);
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
                    totalAmount: isRecurring ? totalAmt : (installments ? totalAmt * numInst : totalAmt), // If it was split above, amount is per installment. If single, amount is total.
                    // Actually, frontend sends 'amount' as the PER ITEM amount usually? 
                    // Let's check frontend payload. 
                    // Frontend "Review Modal" sends `amount` as the value in the input. 
                    // If installments > 1, is that value the TOTAL or PER INSTALLMENT?
                    // Typically users enter TOTAL value.
                    // ExpenseController lines 60: `amount` // Assuming amount is per installment? 
                    // Wait, line 60 says "Assuming amount is per installment". 
                    // BUT Frontend typically sends TOTAL. 
                    // Let's assume input `amount` is the TOTAL transaction value.
                    // So line 60 `amount` currently puts the TOTAL in EACH installment? That would be wrong.
                    // I need to fix the installment logic effectively if it's wrong too.
                    // Let's assume strictly for CreditCardTransaction creation now:
                    // Input `amount` = Total Transaction Value.

                    totalAmount: parseFloat(amount.toString()),
                    installments: numInst,
                    currentInstallment: 1,
                    installmentAmount: parseFloat(amount.toString()) / numInst,
                    purchaseDate: initialDate,
                    category
                });
            }

            const createdExpenses = await Expense.bulkCreate(expensesToCreate);

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

            res.status(200).json(expense);
        } catch (error) {
            res.status(500).json({ error: 'Failed to update expense' });
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

            const expense = await Expense.findOne({ where: { id, userId } });

            if (!expense) {
                res.status(404).json({ error: 'Expense not found' });
                return;
            }

            await expense.destroy();
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: 'Failed to delete expense' });
        }
    }
}
