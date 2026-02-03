import { Response } from 'express';
import { CreditCard, CreditCardTransaction, CreditCardInvoice, Expense } from '../models';
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

            // First pass: Calculate individual liabilities and invoice amounts
            const cardCalculations = creditCards.map(card => {
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

                // 3. Check invoice status for current month
                const currentInvoice = allInvoices.find(inv => inv.creditCardId === card.id);
                const currentInvoiceIsPaid = currentInvoice ? currentInvoice.isPaid : false;

                // 4. Check if overdue (past due day and not paid)
                const dueDay = card.dueDay || 10;
                const today = now.getDate();
                const isOverdue = !currentInvoiceIsPaid && currentInvoiceAmount > 0 && today > dueDay;

                return {
                    id: card.id,
                    instance: card,
                    totalLiability,
                    currentInvoiceAmount,
                    currentInvoiceIsPaid,
                    isOverdue
                };
            });

            // Second pass: Adjust for Shared Limits
            // We need to group liabilities by "Family" (Parent Card + Children)
            const parentCards = cardCalculations.filter(c => !c.instance.sharedLimitCardId);
            const childCards = cardCalculations.filter(c => c.instance.sharedLimitCardId);

            const response = cardCalculations.map(calc => {
                const card = calc.instance;
                let creditLimit = parseFloat(card.creditLimit.toString());
                let totalLiability = calc.totalLiability;

                // If this is a child card, find its parent to correctly display "Available Credit"
                if (card.sharedLimitCardId) {
                    const parent = cardCalculations.find(c => c.id === card.sharedLimitCardId);
                    if (parent) {
                        // The limit displayed for the child should ideally be the Parent's limit (shared pool)
                        creditLimit = parseFloat(parent.instance.creditLimit.toString());

                        // BUT, to calculate available credit, we need the FAMILY total liability
                        const parentLiability = parent.totalLiability;

                        // Find all siblings (other children of the same parent)
                        const siblings = childCards.filter(c => c.instance.sharedLimitCardId === parent.id && c.id !== card.id);
                        const siblingsLiability = siblings.reduce((sum, s) => sum + s.totalLiability, 0);

                        // Family Liability = Parent + Me + Siblings
                        const familyLiability = parentLiability + calc.totalLiability + siblingsLiability;

                        // Available Credit is based on the shared pool
                        var availableCredit = creditLimit - familyLiability;
                    } else {
                        // Orphaned child (shouldn't happen with integrity checks but safe fallback)
                        var availableCredit = creditLimit - totalLiability;
                    }
                } else {
                    // Parent Card: Need to sum up all its children's liabilities
                    const children = childCards.filter(c => c.instance.sharedLimitCardId === card.id);
                    const childrenLiability = children.reduce((sum, c) => sum + c.totalLiability, 0);

                    const familyLiability = totalLiability + childrenLiability;
                    var availableCredit = creditLimit - familyLiability;
                }

                const usagePercentage = creditLimit > 0 ? ((creditLimit - availableCredit!) / creditLimit) * 100 : 0;

                return {
                    ...card.toJSON(),
                    currentInvoiceAmount: calc.currentInvoiceAmount,
                    totalLiability: calc.totalLiability, // Keeping individual liability for display
                    currentBalance: calc.totalLiability,
                    availableCredit, // This is the shared available credit
                    usagePercentage: parseFloat(usagePercentage.toFixed(2)),
                    currentInvoiceIsPaid: calc.currentInvoiceIsPaid,
                    isOverdue: calc.isOverdue
                };
            });

            res.status(200).json(response);
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
                // Only add to Total Limit if it's a Parent Card (not shared) AND is enabled
                if (!card.sharedLimitCardId && card.enabled) {
                    const creditLimit = parseFloat(card.creditLimit.toString());
                    totalLimit += creditLimit;
                }

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
            const { name, lastFourDigits, brand, imageUrl, creditLimit, closingDay, dueDay, sharedLimitCardId, enabled } = req.body;
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
                sharedLimitCardId: sharedLimitCardId || null,
                enabled: enabled !== undefined ? enabled : true,
            });

            res.status(201).json(creditCard);
        } catch (error) {
            res.status(500).json({ error: 'Failed to create credit card' });
        }
    }

    async update(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { name, lastFourDigits, brand, imageUrl, creditLimit, closingDay, dueDay, sharedLimitCardId, enabled } = req.body;
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
                sharedLimitCardId: sharedLimitCardId !== undefined ? sharedLimitCardId : creditCard.sharedLimitCardId,
                enabled: enabled !== undefined ? enabled : creditCard.enabled,
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

            // Fetch ALL transactions to correctly calculate what is already "Real" in those months
            const allTransactions = await CreditCardTransaction.findAll({
                where: { creditCardId: id }
            });

            // Iterate over each plan request
            for (const plan of plans) {
                const targetMonth = parseInt(plan.month);
                const targetYear = parseInt(plan.year);
                const targetTotal = parseFloat(plan.amount);

                // 1. Identify Existing Transactions for this Invoice Month
                // Logic mirrors getInvoice/yearOverview: find transactions that have an installment falling in this month
                const invoiceTransactions = allTransactions.filter(t => {
                    const dateStr = t.purchaseDate.toString();
                    const [pYear, pMonth] = dateStr.includes('T')
                        ? dateStr.split('T')[0].split('-').map(Number)
                        : dateStr.split('-').map(Number);

                    // Calculate offset
                    const monthsElapsed = (targetYear - pYear) * 12 + (targetMonth - pMonth);

                    return monthsElapsed >= 0 &&
                        monthsElapsed < t.installments &&
                        t.currentInstallment + monthsElapsed <= t.installments;
                });

                // 2. Separate into Real vs Planned
                // We identify "Planned" by specific description or flag.
                const plannedTransactions = invoiceTransactions.filter(t => t.description === 'Fatura Estimada (Planejamento)');
                const realTransactions = invoiceTransactions.filter(t => t.description !== 'Fatura Estimada (Planejamento)');

                // 3. Calculate Real Sum
                const realSum = realTransactions.reduce((sum, t) => sum + parseFloat(t.installmentAmount.toString()), 0);

                // 4. Calculate Difference
                const neededAmount = Math.max(0, targetTotal - realSum);

                // 5. Delete Existing Planned Transactions for this month
                if (plannedTransactions.length > 0) {
                    const idsToDelete = plannedTransactions.map(t => t.id);
                    await CreditCardTransaction.destroy({ where: { id: idsToDelete } });
                }

                // 6. Create New Planned Transaction if needed
                if (neededAmount > 0) {
                    const closingDay = creditCard.closingDay || 10;
                    let purchaseDay = closingDay - 1;
                    if (purchaseDay < 1) purchaseDay = 1;

                    // Ensure purchase date is in the correct month to hit this invoice
                    const purchaseDate = new Date(targetYear, targetMonth - 1, purchaseDay);

                    await CreditCardTransaction.create({
                        creditCardId: id as string,
                        description: 'Fatura Estimada (Planejamento)',
                        totalAmount: neededAmount,
                        installments: 1,
                        currentInstallment: 1,
                        installmentAmount: neededAmount,
                        purchaseDate: purchaseDate,
                        category: 'Outros'
                    });
                }
            }

            res.status(200).json({ message: 'Invoices updated successfully' });
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
            const { description, totalAmount, installments, category, purchaseDate, updateMode, refMonth, refYear } = req.body;
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

            // Normal update
            if (updateMode !== 'future' || !refMonth || !refYear || transaction.installments <= 1) {
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
                return;
            }

            // Future Update (Split)
            const pDate = new Date(transaction.purchaseDate);
            const pMonth = pDate.getMonth() + 1;
            const pYear = pDate.getFullYear();

            const monthsElapsed = (refYear - pYear) * 12 + (refMonth - pMonth);

            if (monthsElapsed <= 0) {
                // Editing from start, treat as normal update
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
                return;
            }

            // 1. Stop Old
            const oldInstallments = monthsElapsed;
            const oldTotal = transaction.installmentAmount * oldInstallments;

            await transaction.update({
                installments: oldInstallments,
                totalAmount: oldTotal
            });

            // 2. Start New
            const newPurchaseDate = new Date(refYear, refMonth - 1, 1);

            const nextInstallments = installments !== undefined ? installments : (transaction.installments - monthsElapsed);
            const nextTotal = totalAmount !== undefined ? totalAmount : (transaction.installmentAmount * nextInstallments);
            const nextInstallmentAmount = nextTotal / nextInstallments;

            const newTransaction = await CreditCardTransaction.create({
                creditCardId: id as string,
                description: description || transaction.description,
                totalAmount: nextTotal,
                installments: nextInstallments,
                currentInstallment: 1,
                installmentAmount: nextInstallmentAmount,
                purchaseDate: newPurchaseDate,
                category: category || transaction.category
            });

            res.status(200).json(newTransaction);

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

            const { deleteMode, refMonth, refYear } = req.body || {};
            console.log('Delete Transaction Params:', { id, transactionId, deleteMode, refMonth, refYear, body: req.body });

            if (deleteMode === 'future' && refMonth && refYear && transaction.installments > 1) {
                // Logic to "stop" the recurrence
                // 1. Calculate how many installments have passed until the reference date
                const purchaseDate = new Date(transaction.purchaseDate);
                const pMonth = purchaseDate.getMonth() + 1; // 1-12
                const pYear = purchaseDate.getFullYear();

                const monthsElapsed = (refYear - pYear) * 12 + (refMonth - pMonth);

                // If monthsElapsed <= 0, it means we are deleting from the start (or before), so delete all.
                if (monthsElapsed <= 0) {
                    await transaction.destroy();
                } else {
                    // Update installments to stop before the reference month
                    // The new number of installments is equal to monthsElapsed
                    // Example: Purchase Jan ($100, 10x). Delete Future from March (3rd month).
                    // Elapsed: (3-1) = 2 months. We want 2 installments (Jan, Feb).

                    const newInstallments = monthsElapsed;

                    if (newInstallments < transaction.currentInstallment) {
                        // Should not happen if logic is correct, but safety check
                        await transaction.destroy();
                    } else {
                        const newTotal = transaction.installmentAmount * newInstallments;

                        await transaction.update({
                            installments: newInstallments,
                            totalAmount: newTotal
                        });
                    }
                }
            } else {
                // Default: Delete all
                await transaction.destroy();
            }

            res.status(200).send();
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

            // If shared, we need the parent ID. If parent, we need all children.
            // Simplified: Fetch logic similar to getAll but targeted?
            // Actually, easier to fetch ALL user cards to calculate "Group Liability" correctly
            // without recursing/complex queries.

            const allUserCards = await CreditCard.findAll({
                where: { userId },
                include: [{ model: CreditCardTransaction, as: 'transactions' }]
            });

            // Identify the relevant card in the list
            const currentCard = allUserCards.find(c => c.id === id);
            if (!currentCard) throw new Error("Card not found in list");

            // Identify Parent and Children
            let parentCard = currentCard;
            if (currentCard.sharedLimitCardId) {
                const foundParent = allUserCards.find(c => c.id === currentCard.sharedLimitCardId);
                if (foundParent) parentCard = foundParent;
            }

            // Find all children of this parent (including the current card if it's a child)
            const childrenCards = allUserCards.filter(c => c.sharedLimitCardId === parentCard.id);
            const familyCards = [parentCard, ...childrenCards];

            // Calculate Total Family Liability
            let familyLiability = 0;
            familyCards.forEach(card => {
                const transactions = (card as any).transactions || [];
                const cardLiability = transactions.reduce((sum: number, transaction: any) => {
                    const remainingInstallments = transaction.installments - transaction.currentInstallment + 1;
                    return sum + (parseFloat(transaction.installmentAmount.toString()) * remainingInstallments);
                }, 0);
                familyLiability += cardLiability;
            });

            // Available Credit Calculation
            const parentLimit = parseFloat(parentCard.creditLimit.toString());
            const availableCredit = parentLimit - familyLiability;

            // Current Card's Specific Liability (for reference)
            const transactions = (currentCard as any).transactions || [];
            const currentCardLiability = transactions.reduce((sum: number, transaction: any) => {
                const remainingInstallments = transaction.installments - transaction.currentInstallment + 1;
                return sum + (parseFloat(transaction.installmentAmount.toString()) * remainingInstallments);
            }, 0);

            // Display values
            const usagePercentage = (familyLiability / parentLimit) * 100;

            res.status(200).json({
                creditLimit: parentLimit, // Show Parent Limit as effective limit
                currentBalance: currentCardLiability, // My specific balance
                availableCredit, // Shared available credit
                usagePercentage: parseFloat(usagePercentage.toFixed(2)),
                shared: !!currentCard.sharedLimitCardId || childrenCards.length > 0
            });
        } catch (error) {
            console.error(error);
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

            // Create Expense to reflect payment in dashboard balance
            const paymentDate = new Date();
            await Expense.create({
                userId,
                description: `Pagamento ${isFullyPaid ? 'Fatura' : 'Parcial'} - ${creditCard.name}`,
                amount: paymentAmount,
                date: paymentDate,
                month: paymentDate.getMonth() + 1,
                year: paymentDate.getFullYear(),
                category: 'Cartão de Crédito',
                paymentMethod: 'transfer',
                isPaid: true
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

            // Set invoice as unpaid and clear amount
            await invoice.update({
                isPaid: false,
                amount: 0,
                paymentDate: null
            });

            res.status(200).json({ message: 'Payment undone successfully', invoice });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to undo payment' });
        }
    }


}
