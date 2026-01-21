import { Response } from 'express';
import { CreditCard, CreditCardTransaction, CreditCardInvoice } from '../models';
import { AuthRequest } from '../types';

export class CreditCardController {
    async getAll(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.userId;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const creditCards = await CreditCard.findAll({
                where: { userId },
                include: [{
                    model: CreditCardTransaction,
                    as: 'transactions',
                }],
            });

            // Calculate balance info for each card
            const cardsWithBalance = creditCards.map(card => {
                const transactions = (card as any).transactions || [];

                // Calculate total pending installments (current balance/invoice total roughly)
                const totalPending = transactions.reduce((sum: number, transaction: any) => {
                    const remainingInstallments = transaction.installments - transaction.currentInstallment + 1;
                    return sum + (parseFloat(transaction.installmentAmount.toString()) * remainingInstallments);
                }, 0);

                const creditLimit = parseFloat(card.creditLimit.toString());
                const availableCredit = creditLimit - totalPending;
                const usagePercentage = creditLimit > 0 ? (totalPending / creditLimit) * 100 : 0;

                return {
                    ...card.toJSON(),
                    currentBalance: totalPending,
                    availableCredit,
                    usagePercentage: usagePercentage.toFixed(2)
                };
            });

            res.status(200).json(cardsWithBalance);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch credit cards' });
        }
    }

    async create(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { name, lastFourDigits, brand, creditLimit, closingDay, dueDay } = req.body;
            const userId = req.userId;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const creditCard = await CreditCard.create({
                userId,
                name,
                lastFourDigits,
                brand,
                creditLimit,
                closingDay,
                dueDay,
            });

            res.status(201).json(creditCard);
        } catch (error) {
            res.status(500).json({ error: 'Failed to create credit card' });
        }
    }

    async update(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { name, lastFourDigits, brand, creditLimit, closingDay, dueDay } = req.body;
            const userId = req.userId;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const creditCard = await CreditCard.findOne({ where: { id, userId } });

            if (!creditCard) {
                res.status(404).json({ error: 'Credit card not found' });
                return;
            }

            await creditCard.update({
                name: name || creditCard.name,
                lastFourDigits: lastFourDigits || creditCard.lastFourDigits,
                brand: brand || creditCard.brand,
                creditLimit: creditLimit || creditCard.creditLimit,
                closingDay: closingDay || creditCard.closingDay,
                dueDay: dueDay || creditCard.dueDay,
            });

            res.status(200).json(creditCard);
        } catch (error) {
            res.status(500).json({ error: 'Failed to update credit card' });
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

            const creditCard = await CreditCard.findOne({ where: { id, userId } });

            if (!creditCard) {
                res.status(404).json({ error: 'Credit card not found' });
                return;
            }

            await creditCard.destroy();
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: 'Failed to delete credit card' });
        }
    }

    async getTransactions(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userId = req.userId;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const creditCard = await CreditCard.findOne({ where: { id, userId } });

            if (!creditCard) {
                res.status(404).json({ error: 'Credit card not found' });
                return;
            }

            const transactions = await CreditCardTransaction.findAll({
                where: { creditCardId: id },
                order: [['purchaseDate', 'DESC']],
            });

            res.status(200).json(transactions);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch transactions' });
        }
    }

    async addTransaction(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { description, totalAmount, installments, category, purchaseDate } = req.body;
            const userId = req.userId;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const creditCard = await CreditCard.findOne({ where: { id, userId } });

            if (!creditCard) {
                res.status(404).json({ error: 'Credit card not found' });
                return;
            }

            // Calculate installment amount
            const installmentAmount = totalAmount / installments;

            const transaction = await CreditCardTransaction.create({
                creditCardId: id as string,
                description,
                totalAmount,
                installments,
                currentInstallment: 1,
                installmentAmount,
                purchaseDate: new Date(purchaseDate),
                category,
            });

            res.status(201).json(transaction);
        } catch (error) {
            res.status(500).json({ error: 'Failed to add transaction' });
        }
    }

    async getInvoice(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id, month, year } = req.params;
            const userId = req.userId;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const creditCard = await CreditCard.findOne({ where: { id, userId } });

            if (!creditCard) {
                res.status(404).json({ error: 'Credit card not found' });
                return;
            }

            // Get all transactions for this card
            const transactions = await CreditCardTransaction.findAll({
                where: { creditCardId: id },
            });

            // Fetch Invoice Status
            const invoiceRecord = await CreditCardInvoice.findOne({
                where: {
                    creditCardId: id,
                    month: parseInt(month as string),
                    year: parseInt(year as string)
                }
            });

            const isPaid = invoiceRecord ? invoiceRecord.isPaid : false;

            // Filter transactions that have an installment due in this month/year
            const invoiceItems = transactions.filter(transaction => {
                const dateStr = transaction.purchaseDate.toString();
                const [pYear, pMonth, pDay] = dateStr.includes('T')
                    ? dateStr.split('T')[0].split('-').map(Number)
                    : dateStr.split('-').map(Number);

                const monthsElapsed = (parseInt(year as string) - pYear) * 12 +
                    (parseInt(month as string) - pMonth);

                // Check if this transaction has an installment due this month
                return monthsElapsed >= 0 &&
                    monthsElapsed < transaction.installments &&
                    transaction.currentInstallment + monthsElapsed <= transaction.installments;
            }).map(transaction => {
                const dateStr = transaction.purchaseDate.toString();
                const [pYear, pMonth, pDay] = dateStr.includes('T')
                    ? dateStr.split('T')[0].split('-').map(Number)
                    : dateStr.split('-').map(Number);

                const monthsElapsed = (parseInt(year as string) - pYear) * 12 +
                    (parseInt(month as string) - pMonth);

                const installmentNumber = 1 + monthsElapsed; // Installments are 1-based

                return {
                    ...transaction.toJSON(),
                    installmentNumber,
                    displayText: `${transaction.description} - Parcela ${installmentNumber}/${transaction.installments}`,
                };
            });

            const totalAmount = invoiceItems.reduce((sum, item) => sum + parseFloat(item.installmentAmount.toString()), 0);

            res.status(200).json({
                creditCard,
                month: parseInt(month as string),
                year: parseInt(year as string),
                items: invoiceItems,
                totalAmount,
                isPaid,
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch invoice' });
        }
    }

    async getBalance(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userId = req.userId;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const creditCard = await CreditCard.findOne({ where: { id, userId } });

            if (!creditCard) {
                res.status(404).json({ error: 'Credit card not found' });
                return;
            }

            const transactions = await CreditCardTransaction.findAll({
                where: { creditCardId: id },
            });

            // Calculate total pending installments
            const totalPending = transactions.reduce((sum, transaction) => {
                const remainingInstallments = transaction.installments - transaction.currentInstallment + 1;
                return sum + (parseFloat(transaction.installmentAmount.toString()) * remainingInstallments);
            }, 0);

            const availableCredit = parseFloat(creditCard.creditLimit.toString()) - totalPending;
            const usagePercentage = (totalPending / parseFloat(creditCard.creditLimit.toString())) * 100;

            res.status(200).json({
                creditLimit: creditCard.creditLimit,
                currentBalance: totalPending,
                availableCredit,
                usagePercentage: usagePercentage.toFixed(2),
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch balance' });
        }
    }

    async payInvoice(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { month, year, amount } = req.body;
            const userId = req.userId;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            // Find or create invoice record
            let invoice = await CreditCardInvoice.findOne({
                where: {
                    creditCardId: id as string,
                    month,
                    year
                }
            });

            if (invoice) {
                // Toggle status
                await invoice.update({ isPaid: !invoice.isPaid });
            } else {
                // Create new record as Paid
                invoice = await CreditCardInvoice.create({
                    creditCardId: id as string,
                    month,
                    year,
                    amount,
                    isPaid: true,
                    paymentDate: new Date()
                });
            }

            res.status(200).json(invoice);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to update invoice status' });
        }
    }


}
