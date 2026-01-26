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

            // Fetch all invoices for current month/year in one query
            const allInvoices = await CreditCardInvoice.findAll({
                where: {
                    month: currentMonth,
                    year: currentYear
                }
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

                // 3. Check invoice status for current month
                const currentInvoice = allInvoices.find(inv => inv.creditCardId === card.id);
                const currentInvoiceIsPaid = currentInvoice ? currentInvoice.isPaid : false;

                // 4. Check if overdue (past due day and not paid)
                const dueDay = card.dueDay || 10;
                const today = now.getDate();
                const isOverdue = !currentInvoiceIsPaid && currentInvoiceAmount > 0 && today > dueDay;

                return {
                    ...card.toJSON(),
                    currentInvoiceAmount,
                    totalLiability,
                    currentBalance: totalLiability,
                    availableCredit,
                    usagePercentage: usagePercentage.toFixed(2),
                    currentInvoiceIsPaid,
                    isOverdue
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
            let totalPaidThisMonth = 0;

            // We need to check invoice status for each card to know if "Due" is "Paid"
            for (const card of creditCards) {
                const creditLimit = parseFloat(card.creditLimit.toString());
                totalLimit += creditLimit;

                const transactions = (card as any).transactions || [];
                let cardDueThisMonth = 0;

                transactions.forEach((transaction: any) => {
                    const remainingInstallments = transaction.installments - transaction.currentInstallment + 1;
                    const installmentAmount = parseFloat(transaction.installmentAmount.toString());
                    totalLiability += (installmentAmount * remainingInstallments);

                    // Month Check
                    const dateStr = transaction.purchaseDate.toString();
                    const [pYear, pMonth] = dateStr.includes('T') ? dateStr.split('T')[0].split('-').map(Number) : dateStr.split('-').map(Number);
                    const monthsElapsed = (currentYear - pYear) * 12 + (currentMonth - pMonth);

                    if (monthsElapsed >= 0 && monthsElapsed < transaction.installments && transaction.currentInstallment + monthsElapsed <= transaction.installments) {
                        cardDueThisMonth += installmentAmount;
                    }
                });

                // Check if this card's invoice for this month exists and get paid amount
                const invoice = await CreditCardInvoice.findOne({
                    where: {
                        creditCardId: card.id,
                        month: currentMonth,
                        year: currentYear
                    }
                });

                // Use the actual paid amount from invoice, not just if isPaid
                if (invoice) {
                    const paidAmount = parseFloat(invoice.amount.toString());
                    totalPaidThisMonth += paidAmount;
                }

                // Add to total due anyway (it's the monthly bill size)
                totalDueThisMonth += cardDueThisMonth;
            }

            const totalAvailable = totalLimit - totalLiability;
            const totalPendingThisMonth = Math.max(0, totalDueThisMonth - totalPaidThisMonth);

            res.status(200).json({
                totalLimit,
                totalLiability,
                totalAvailable,
                totalDueThisMonth,
                totalPaidThisMonth,
                totalPendingThisMonth
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch summary' });
        }
    }

    async getYearlyOverview(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id, year } = req.params;
            const userId = req.userId;
            const targetYear = parseInt(year as string);

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const creditCard = await CreditCard.findOne({ where: { id, userId } });
            if (!creditCard) {
                res.status(404).json({ error: 'Card not found' });
                return;
            }

            const transactions = await CreditCardTransaction.findAll({ where: { creditCardId: id } });
            const invoices = await CreditCardInvoice.findAll({
                where: { creditCardId: id, year: targetYear }
            });

            // Calc 12 months
            const overview = [];
            for (let m = 1; m <= 12; m++) {
                // Filter transactions for this month
                const items = transactions.filter(t => {
                    const dateStr = t.purchaseDate.toString();
                    const [pYear, pMonth] = dateStr.includes('T') ? dateStr.split('T')[0].split('-').map(Number) : dateStr.split('-').map(Number);
                    const monthsElapsed = (targetYear - pYear) * 12 + (m - pMonth);
                    return monthsElapsed >= 0 && monthsElapsed < t.installments;
                }).map(t => {
                    const dateStr = t.purchaseDate.toString();
                    const [pYear, pMonth] = dateStr.includes('T') ? dateStr.split('T')[0].split('-').map(Number) : dateStr.split('-').map(Number);
                    const monthsElapsed = (targetYear - pYear) * 12 + (m - pMonth);
                    return {
                        ...t.toJSON(),
                        installmentNumber: 1 + monthsElapsed,
                        installmentAmount: parseFloat(t.installmentAmount.toString())
                    };
                });

                const total = items.reduce((sum, i) => sum + i.installmentAmount, 0);
                const inv = invoices.find(i => i.month === m);

                // Calculate paid amount and remaining
                const paidAmount = inv ? parseFloat(inv.amount.toString()) : 0;
                const remainingAmount = Math.max(0, total - paidAmount);
                const isPartiallyPaid = paidAmount > 0 && paidAmount < total;
                const isFullyPaid = inv ? inv.isPaid && remainingAmount <= 0 : false;

                overview.push({
                    month: m,
                    year: targetYear,
                    total,
                    paidAmount,
                    remainingAmount,
                    isPaid: isFullyPaid,
                    isPartiallyPaid,
                    items // Include items for accordion View
                });
            }

            res.status(200).json(overview);

        } catch (error) {
            console.error('Yearly overview failed', error);
            res.status(500).json({ error: 'Failed' });
        }
    }

    async create(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { name, lastFourDigits, brand, imageUrl, creditLimit, closingDay, dueDay } = req.body;
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
                imageUrl,
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
            const { name, lastFourDigits, brand, imageUrl, creditLimit, closingDay, dueDay } = req.body;
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
                imageUrl: imageUrl !== undefined ? imageUrl : creditCard.imageUrl,
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

    async planInvoices(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { plans } = req.body; // Array of { month, year, amount }
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

            if (!Array.isArray(plans)) {
                res.status(400).json({ error: 'Plans must be an array' });
                return;
            }

            const transactionsToCreate = plans.map(plan => {
                // Determine due date (using card's due day or default to 10th)
                const dueDay = creditCard.dueDay || 10;
                // We want the purchase date to fall into the billing cycle of that month.
                // Simplified: Set purchase date to ~30 days before the due date of that month to ensure it hits the invoice.
                // OR: Just set it to the 1st of that month if we trust the "Month" filter logic which looks at installmnets.

                // Better approach based on current logic:
                // If the user wants this for "March 2026", and it's a 1x installment, 
                // the purchase date should be early enough in March (or late Feb) to appear in March Invoice.

                // Let's use the 1st of the target month. 
                // If closing day is early (e.g. 5th), purchase on 1st might fall in PREVIOUS month invoice if buying before closing?
                // Actually typical logic: Purchase before closing day = Current Month Invoice. Purchase after closing = Next Month.
                // To force it into "March" Invoice:
                // If Closing Day > 1: Purchase on Month, (ClosingDay - 1). 
                // Example: Closing Day 10. Purchase on March 9 -> March Invoice.

                const closingDay = creditCard.closingDay || 10;
                let purchaseDay = closingDay - 1;
                if (purchaseDay < 1) purchaseDay = 1; // Safety

                const purchaseDate = new Date(plan.year, plan.month - 1, purchaseDay);

                return {
                    creditCardId: id as string,
                    description: 'Fatura Estimada (Planejamento)',
                    totalAmount: parseFloat(plan.amount),
                    installments: 1,
                    currentInstallment: 1,
                    installmentAmount: parseFloat(plan.amount),
                    purchaseDate: purchaseDate,
                    category: 'Outros'
                };
            });

            await CreditCardTransaction.bulkCreate(transactionsToCreate);

            res.status(201).json({ message: 'Invoices planned successfully', count: transactionsToCreate.length });
        } catch (error) {
            console.error('Failed to plan invoices:', error);
            res.status(500).json({ error: 'Failed to plan invoices' });
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

            // Get previous paid amount if exists
            const previousPaidAmount = invoice ? parseFloat(invoice.amount.toString()) : 0;
            const newTotalPaid = previousPaidAmount + paymentAmount;

            // Check if this makes it fully paid
            const isFullyPaid = newTotalPaid >= currentTotal;

            if (invoice) {
                // Update existing invoice with accumulated payment
                await invoice.update({
                    isPaid: isFullyPaid,
                    amount: newTotalPaid,
                    paymentDate: new Date()
                });
            } else {
                // Create new invoice record
                invoice = await CreditCardInvoice.create({
                    creditCardId: id as string,
                    month,
                    year,
                    amount: paymentAmount,
                    isPaid: isFullyPaid,
                    paymentDate: new Date()
                });
            }

            // Create negative transaction as record of payment (optional for tracking)
            await CreditCardTransaction.create({
                creditCardId: id as string,
                description: isFullyPaid ? 'Pagamento Fatura' : 'Pagamento Parcial',
                totalAmount: -paymentAmount,
                installments: 1,
                currentInstallment: 1,
                installmentAmount: -paymentAmount,
                purchaseDate: new Date(year, month - 1, 15),
                category: 'Pagamentos'
            });

            res.status(200).json({
                ...invoice.toJSON(),
                currentTotal,
                newTotalPaid,
                remainingAmount: Math.max(0, currentTotal - newTotalPaid),
                isFullyPaid
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to update invoice status' });
        }
    }

    async unpayInvoice(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { month, year } = req.body;
            const userId = req.userId;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const creditCard = await CreditCard.findOne({ where: { id, userId } });
            if (!creditCard) {
                res.status(404).json({ error: 'Card not found' });
                return;
            }

            // Find and update the invoice
            const invoice = await CreditCardInvoice.findOne({
                where: { creditCardId: id as string, month, year }
            });

            if (!invoice) {
                res.status(404).json({ error: 'Invoice not found' });
                return;
            }

            // Remove any "Pagamento Parcial" transactions created for this month
            await CreditCardTransaction.destroy({
                where: {
                    creditCardId: id as string,
                    description: 'Pagamento Parcial (Abatimento)',
                    category: 'Pagamentos'
                }
            });

            // Remove any "Restante Fatura Anterior" transaction in the next month
            let nextMonth = month + 1;
            let nextYear = year;
            if (nextMonth > 12) { nextMonth = 1; nextYear++; }

            await CreditCardTransaction.destroy({
                where: {
                    creditCardId: id as string,
                    description: 'Restante Fatura Anterior',
                    category: 'Dívidas'
                }
            });

            // Set invoice as unpaid
            await invoice.update({ isPaid: false, paymentDate: undefined });

            res.status(200).json({ message: 'Payment undone successfully', invoice });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to undo payment' });
        }
    }


}
