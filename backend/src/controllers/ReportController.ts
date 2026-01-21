import { Response } from 'express';
import { Income, Expense, CreditCard, CreditCardTransaction, CreditCardInvoice } from '../models';
import { AuthRequest } from '../types';

export class ReportController {
    async getDashboard(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.userId;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const currentDate = new Date();
            const queryMonth = req.query.month ? parseInt(req.query.month as string) : null;
            const queryYear = req.query.year ? parseInt(req.query.year as string) : null;

            const currentMonth = queryMonth || currentDate.getMonth() + 1;
            const currentYear = queryYear || currentDate.getFullYear();

            // Get monthly income
            const incomes = await Income.findAll({
                where: { userId, month: currentMonth, year: currentYear },
            });
            const totalIncome = incomes.reduce((sum, income) => sum + parseFloat(income.amount.toString()), 0);

            // Get monthly expenses
            const expenses = await Expense.findAll({
                where: { userId, month: currentMonth, year: currentYear },
            });
            let totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount.toString()), 0);

            // Get Credit Card Expenses
            const creditCards = await CreditCard.findAll({ where: { userId } });
            const creditCardIds = creditCards.map(cc => cc.id);

            const ccTransactions = await CreditCardTransaction.findAll({
                where: { creditCardId: creditCardIds }
            });

            // Fetch Invoices for the current month/year
            const invoices = await CreditCardInvoice.findAll({
                where: {
                    creditCardId: creditCardIds,
                    month: currentMonth,
                    year: currentYear
                }
            });

            // Map keys "cardId" -> isPaid (since we filter by specific month/year)
            const invoicePaidMap: Record<string, boolean> = {};
            invoices.forEach(inv => {
                invoicePaidMap[inv.creditCardId] = inv.isPaid;
            });

            let totalCreditCardExpenses = 0;
            let paidCreditCardExpenses = 0;
            let pendingCreditCardExpenses = 0;

            const ccExpensesByCategory: Record<string, number> = {};

            ccTransactions.forEach(transaction => {
                // Safe date parsing from "YYYY-MM-DD"
                const dateStr = transaction.purchaseDate.toString();
                const [pYear, pMonth, pDay] = dateStr.includes('T')
                    ? dateStr.split('T')[0].split('-').map(Number)
                    : dateStr.split('-').map(Number);

                const monthsElapsed = (currentYear - pYear) * 12 + (currentMonth - pMonth);

                if (monthsElapsed >= 0 && monthsElapsed < transaction.installments) {
                    const val = parseFloat(transaction.installmentAmount.toString());
                    totalCreditCardExpenses += val;

                    // Determine if this installment is paid based on the card's invoice status
                    const isPaid = invoicePaidMap[transaction.creditCardId] || false;
                    if (isPaid) {
                        paidCreditCardExpenses += val;
                    } else {
                        pendingCreditCardExpenses += val;
                    }

                    const category = transaction.category;
                    if (!ccExpensesByCategory[category]) {
                        ccExpensesByCategory[category] = 0;
                    }
                    ccExpensesByCategory[category] += val;
                }
            });

            // Merge totals
            totalExpenses += totalCreditCardExpenses;

            // Calculate detailed metrics
            const receivedIncome = incomes
                .filter(i => i.isPaid)
                .reduce((sum, i) => sum + parseFloat(i.amount.toString()), 0);

            const pendingIncome = incomes
                .filter(i => !i.isPaid)
                .reduce((sum, i) => sum + parseFloat(i.amount.toString()), 0);

            // Paid expenses = Standard Paid + CC Paid
            const paidStandardExpenses = expenses
                .filter(e => e.isPaid)
                .reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
            const paidExpenses = paidStandardExpenses + paidCreditCardExpenses;

            // Pending includes normal unpaid + CC Pending
            const pendingStandard = expenses
                .filter(e => !e.isPaid)
                .reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
            const pendingExpenses = pendingStandard + pendingCreditCardExpenses;

            // Current Balance (Liquid: Received - Paid)
            const currentBalance = receivedIncome - paidExpenses;

            // Projected Balance (Total Income - Total Expenses)
            const projectedBalance = totalIncome - totalExpenses;

            // Remaining Budget (Simple: Projected Balance)
            const remainingBudget = projectedBalance;

            // Get expense breakdown by category
            const expensesByCategory = expenses.reduce((acc: any, expense) => {
                const category = expense.category;
                if (!acc[category]) {
                    acc[category] = 0;
                }
                acc[category] += parseFloat(expense.amount.toString());
                return acc;
            }, {});

            // Merge CC categories
            Object.keys(ccExpensesByCategory).forEach(cat => {
                if (!expensesByCategory[cat]) {
                    expensesByCategory[cat] = 0;
                }
                expensesByCategory[cat] += ccExpensesByCategory[cat];
            });

            // Get cash flow for last 6 months
            const cashFlow = [];
            for (let i = 5; i >= 0; i--) {
                const date = new Date(currentYear, currentMonth - 1 - i, 1);
                const month = date.getMonth() + 1;
                const year = date.getFullYear();

                const monthIncomes = await Income.findAll({
                    where: { userId, month, year },
                });
                const monthExpenses = await Expense.findAll({
                    where: { userId, month, year },
                });

                let monthCCTotal = 0;
                ccTransactions.forEach(transaction => {
                    const dateStr = transaction.purchaseDate.toString();
                    const [pYear, pMonth] = dateStr.includes('T')
                        ? dateStr.split('T')[0].split('-').map(Number)
                        : dateStr.split('-').map(Number);

                    const mElapsed = (year - pYear) * 12 + (month - pMonth);
                    if (mElapsed >= 0 && mElapsed < transaction.installments) {
                        monthCCTotal += parseFloat(transaction.installmentAmount.toString());
                    }
                });

                const income = monthIncomes.reduce((sum, inc) => sum + parseFloat(inc.amount.toString()), 0);
                const expense = monthExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0) + monthCCTotal;

                cashFlow.push({
                    month: date.toLocaleString('default', { month: 'short' }),
                    income,
                    expense,
                });
            }

            res.status(200).json({
                totalBalance: currentBalance, // Actual money on hand
                projectedBalance,             // Expected money at end of month
                monthlyIncome: totalIncome,
                receivedIncome,
                pendingIncome,
                monthlyExpenses: totalExpenses,
                paidExpenses,
                pendingExpenses,
                remainingBudget,
                expensesByCategory,
                cashFlow,
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch dashboard data' });
        }
    }

    async getMonthlyReport(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { month, year } = req.params;
            const userId = req.userId;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const monthNum = parseInt(month as string);
            const yearNum = parseInt(year as string);

            const incomes = await Income.findAll({
                where: { userId, month: monthNum, year: yearNum },
            });

            const expenses = await Expense.findAll({
                where: { userId, month: monthNum, year: yearNum },
            });

            // Calculate CC expenses
            const creditCards = await CreditCard.findAll({ where: { userId } });
            const creditCardIds = creditCards.map(cc => cc.id);
            const ccTransactions = await CreditCardTransaction.findAll({
                where: { creditCardId: creditCardIds }
            });

            let totalCreditCardExpenses = 0;
            ccTransactions.forEach(transaction => {
                const dateStr = transaction.purchaseDate.toString();
                const [pYear, pMonth] = dateStr.includes('T')
                    ? dateStr.split('T')[0].split('-').map(Number)
                    : dateStr.split('-').map(Number);

                const monthsElapsed = (yearNum - pYear) * 12 + (monthNum - pMonth);

                if (monthsElapsed >= 0 && monthsElapsed < transaction.installments) {
                    totalCreditCardExpenses += parseFloat(transaction.installmentAmount.toString());
                }
            });

            const totalIncome = incomes.reduce((sum, income) => sum + parseFloat(income.amount.toString()), 0);
            const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount.toString()), 0) + totalCreditCardExpenses;

            res.status(200).json({
                month: monthNum,
                year: yearNum,
                incomes,
                expenses,
                totalIncome,
                totalExpenses,
                balance: totalIncome - totalExpenses,
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch monthly report' });
        }
    }
}
