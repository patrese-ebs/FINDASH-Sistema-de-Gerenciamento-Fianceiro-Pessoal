import { Response } from 'express';
import { CreditCard, CreditCardTransaction, CreditCardInvoice } from '../models';
import { AuthRequest } from '../types';

export class CreditCardController {
    async getAll(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.userId;
            const now = new Date();
            const queryMonth = req.query.month ? parseInt(req.query.month as string) : undefined;
            const queryYear = req.query.year ? parseInt(req.query.year as string) : undefined;

            const currentMonth = queryMonth || now.getMonth() + 1;
            const currentYear = queryYear || now.getFullYear();

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

                // 1. Total Pending (Liability) - Future + Current
                const totalLiability = transactions.reduce((sum: number, transaction: any) => {
                    const remainingInstallments = transaction.installments - transaction.currentInstallment + 1;
                    return sum + (parseFloat(transaction.installmentAmount.toString()) * remainingInstallments);
                }, 0);

                // 2. Current Invoice Amount (Estimate for current calendar month)
                // Reusing invoice filter logic roughly
                const currentInvoiceAmount = transactions.reduce((sum: number, transaction: any) => {
                    const dateStr = transaction.purchaseDate.toString();
                    const [pYear, pMonth] = dateStr.includes('T')
                        ? dateStr.split('T')[0].split('-').map(Number)
                        : dateStr.split('-').map(Number);

                    const monthsElapsed = (currentYear - pYear) * 12 + (currentMonth - pMonth);

                    const hasInstallmentThisMonth = monthsElapsed >= 0 &&
                        monthsElapsed < transaction.installments &&
                        transaction.currentInstallment + monthsElapsed <= transaction.installments;

                    if (hasInstallmentThisMonth) {
                        return sum + parseFloat(transaction.installmentAmount.toString());
                    }
                    return sum;
                }, 0);

                const creditLimit = parseFloat(card.creditLimit.toString());
                const availableCredit = creditLimit - totalLiability;
                const usagePercentage = creditLimit > 0 ? (totalLiability / creditLimit) * 100 : 0;

                return {
                    ...card.toJSON(),
                    currentInvoiceAmount, // Due this month
                    totalLiability,       // Total debt
                    currentBalance: totalLiability, // Keeping for backward compat, but UI should prefer totalLiability
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

    async getSummary(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.userId;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            // We can reuse getAll logic or re-query. Re-using logic is safer to keep consistent.
            // Since getAll helps construct the response, we can just call the internal logic 
            // but we can't easily call 'getAll' because it sends a response.
            // Let's duplicate the aggregation logic briefly or refactor. 
            // For now, duplication with shared logic is fine for speed.

            const now = new Date();
            const queryMonth = req.query.month ? parseInt(req.query.month as string) : undefined;
            const queryYear = req.query.year ? parseInt(req.query.year as string) : undefined;

            const currentMonth = queryMonth || now.getMonth() + 1;
            const currentYear = queryYear || now.getFullYear();

            const creditCards = await CreditCard.findAll({
                where: { userId },
                include: [{ model: CreditCardTransaction, as: 'transactions' }]
            });

            let totalLimit = 0;
            let totalLiability = 0;
            let totalDueThisMonth = 0;

            creditCards.forEach(card => {
                const transactions = (card as any).transactions || [];
                const creditLimit = parseFloat(card.creditLimit.toString());

                totalLimit += creditLimit;

                transactions.forEach((transaction: any) => {
                    const remainingInstallments = transaction.installments - transaction.currentInstallment + 1;
                    const installmentAmount = parseFloat(transaction.installmentAmount.toString());

                    totalLiability += (installmentAmount * remainingInstallments);

                    // Check for current month due
                    const dateStr = transaction.purchaseDate.toString();
                    const [pYear, pMonth] = dateStr.includes('T') ? dateStr.split('T')[0].split('-').map(Number) : dateStr.split('-').map(Number);
                    const monthsElapsed = (currentYear - pYear) * 12 + (currentMonth - pMonth);

                    if (monthsElapsed >= 0 && monthsElapsed < transaction.installments && transaction.currentInstallment + monthsElapsed <= transaction.installments) {
                        totalDueThisMonth += installmentAmount;
                    }
                });
            });

            const totalAvailable = totalLimit - totalLiability;

            res.status(200).json({
                totalLimit,
                totalLiability,
                totalAvailable,
                totalDueThisMonth
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch summary' });
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

    async updateTransaction(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id, transactionId } = req.params;
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

            const transaction = await CreditCardTransaction.findOne({
                where: { id: transactionId, creditCardId: id }
            });

            if (!transaction) {
                res.status(404).json({ error: 'Transaction not found' });
                return;
            }

            // Calculate new installment amount if needed
            const newTotal = totalAmount !== undefined ? totalAmount : transaction.totalAmount;
            const newInstallments = installments !== undefined ? installments : transaction.installments;
            const installmentAmount = newTotal / newInstallments;

            await transaction.update({
                description: description || transaction.description,
                totalAmount: newTotal,
                installments: newInstallments,
                installmentAmount: installmentAmount,
                category: category || transaction.category,
                purchaseDate: purchaseDate ? new Date(purchaseDate) : transaction.purchaseDate
            });

            res.status(200).json(transaction);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to update transaction' });
        }
    }

    async deleteTransaction(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id, transactionId } = req.params;
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

            const transaction = await CreditCardTransaction.findOne({
                where: { id: transactionId, creditCardId: id }
            });

            if (!transaction) {
                res.status(404).json({ error: 'Transaction not found' });
                return;
            }

            await transaction.destroy();
            res.status(204).send();
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to delete transaction' });
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
            // amount here is the PAYMENT amount entered by user
            // If amount is provided, we check logic. If missing, assumes full toggle (legacy behavior or just toggle).
            const { month, year, amount } = req.body;
            const userId = req.userId;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            // 1. Get Current Invoice Total to check for Partial
            const creditCard = await CreditCard.findOne({ where: { id, userId } });
            if (!creditCard) {
                res.status(404).json({ error: 'Card not found' });
                return;
            }

            // Fetch transactions to calculate real total
            const transactions = await CreditCardTransaction.findAll({ where: { creditCardId: id } });

            // Calculate total for this specific month/year (Reusing logic from getInvoice roughly)
            // Simplified sum logic for performance, assuming frontend sent correct 'amount' if full. 
            // Better to trust the user input 'amount' implies what they WANT to pay.
            // But to do Rollover, we need the ACTUAL total.

            // Let's rely on a helper or reuse getInvoice logic if possible, 
            // but for now let's reproduce the filter quickly to get accurate total.
            const invoiceItems = transactions.filter(transaction => {
                const dateStr = transaction.purchaseDate.toString();
                const [pYear, pMonth] = dateStr.includes('T') ? dateStr.split('T')[0].split('-').map(Number) : dateStr.split('-').map(Number);
                const monthsElapsed = (year - pYear) * 12 + (month - pMonth);
                return monthsElapsed >= 0 && monthsElapsed < transaction.installments;
            }).map(t => {
                return { ...t.toJSON(), installmentAmount: parseFloat(t.installmentAmount.toString()) };
            });

            const currentTotal = invoiceItems.reduce((sum, item) => sum + item.installmentAmount, 0);

            // Handle Invoice Record
            let invoice = await CreditCardInvoice.findOne({
                where: { creditCardId: id as string, month, year }
            });

            const paymentAmount = parseFloat(amount);
            const isPartial = paymentAmount < currentTotal && paymentAmount > 0;

            if (isPartial) {
                const remainder = currentTotal - paymentAmount;

                // 1. Create Negative Transaction in CURRENT month to reduce balance
                // "Pagamento Parcial - Abatimento"
                // Date: 1st of current month (or today)
                await CreditCardTransaction.create({
                    creditCardId: id as string,
                    description: 'Pagamento Parcial (Abatimento)',
                    totalAmount: -paymentAmount,
                    installments: 1,
                    currentInstallment: 1,
                    installmentAmount: -paymentAmount,
                    purchaseDate: new Date(year, month - 1, 10), // mid-month
                    category: 'Pagamentos'
                });

                // 2. Create Positive Transaction in NEXT month for Rollover
                // "Restante Fatura Anterior"
                // Date: 1 month later
                // Handle year rollover
                let nextMonth = month + 1;
                let nextYear = year;
                if (nextMonth > 12) { nextMonth = 1; nextYear++; }

                await CreditCardTransaction.create({
                    creditCardId: id as string,
                    description: 'Restante Fatura Anterior',
                    totalAmount: remainder,
                    installments: 1,
                    currentInstallment: 1,
                    installmentAmount: remainder,
                    purchaseDate: new Date(nextYear, nextMonth - 1, 10),
                    category: 'Dívidas'
                });

                // 3. Mark invoice as Paid (Settled)
                if (invoice) {
                    await invoice.update({ isPaid: true, amount: paymentAmount, paymentDate: new Date() });
                } else {
                    invoice = await CreditCardInvoice.create({
                        creditCardId: id as string,
                        month,
                        year,
                        amount: paymentAmount,
                        isPaid: true,
                        paymentDate: new Date()
                    });
                }
            } else {
                // Full Payment (Standard Behavior)
                if (invoice) {
                    await invoice.update({ isPaid: !invoice.isPaid }); // Toggle
                } else {
                    invoice = await CreditCardInvoice.create({
                        creditCardId: id as string,
                        month,
                        year,
                        amount: paymentAmount, // Store full amount
                        isPaid: true,
                        paymentDate: new Date()
                    });
                }
            }

            res.status(200).json(invoice);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to update invoice status' });
        }
    }


}
