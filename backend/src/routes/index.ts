import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { IncomeController } from '../controllers/IncomeController';
import { ExpenseController } from '../controllers/ExpenseController';
import { CreditCardController } from '../controllers/CreditCardController';
import { InvestmentController } from '../controllers/InvestmentController';
import aiRoutes from './aiRoutes';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
    registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, updateProfileSchema,
    createExpenseSchema, updateExpenseSchema,
    createIncomeSchema, updateIncomeSchema,
    createCreditCardSchema, updateCreditCardSchema, addTransactionSchema, payInvoiceSchema,
    createInvestmentSchema, updateInvestmentSchema,
} from '../middleware/schemas';

import rateLimit from 'express-rate-limit';

const router = Router();

// Rate Limiters
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // Limit each IP to 15 requests per windowMs (reduced from 100)
    message: { error: 'Too many login attempts, please try again after 15 minutes' },
    validate: { xForwardedForHeader: false },
    standardHeaders: true,
    legacyHeaders: false,
});

// Initialize controllers
const authController = new AuthController();
const incomeController = new IncomeController();
const expenseController = new ExpenseController();
const creditCardController = new CreditCardController();
const investmentController = new InvestmentController();

// Auth routes
router.post('/auth/register', authLimiter, validate(registerSchema), authController.register.bind(authController));
router.post('/auth/login', authLimiter, validate(loginSchema), authController.login.bind(authController));
router.post('/auth/forgot-password', authLimiter, validate(forgotPasswordSchema), authController.forgotPassword.bind(authController));
router.post('/auth/reset-password', authLimiter, validate(resetPasswordSchema), authController.resetPassword.bind(authController));
router.get('/auth/me', authMiddleware, authController.getMe.bind(authController));
router.put('/auth/me', authMiddleware, validate(updateProfileSchema), authController.updateProfile.bind(authController));

// Income routes
router.get('/incomes', authMiddleware, incomeController.getAll.bind(incomeController));
router.post('/incomes', authMiddleware, validate(createIncomeSchema), incomeController.create.bind(incomeController));
router.put('/incomes/:id', authMiddleware, validate(updateIncomeSchema), incomeController.update.bind(incomeController));
router.delete('/incomes/:id', authMiddleware, incomeController.delete.bind(incomeController));

// Expense routes
router.get('/expenses', authMiddleware, expenseController.getAll.bind(expenseController));
router.post('/expenses', authMiddleware, validate(createExpenseSchema), expenseController.create.bind(expenseController));
router.put('/expenses/:id', authMiddleware, validate(updateExpenseSchema), expenseController.update.bind(expenseController));
router.delete('/expenses/:id', authMiddleware, expenseController.delete.bind(expenseController));

// Credit Card routes
router.get('/credit-cards/summary', authMiddleware, creditCardController.getSummary.bind(creditCardController));
router.get('/credit-cards', authMiddleware, creditCardController.getAll.bind(creditCardController));
router.post('/credit-cards', authMiddleware, validate(createCreditCardSchema), creditCardController.create.bind(creditCardController));
router.put('/credit-cards/:id', authMiddleware, validate(updateCreditCardSchema), creditCardController.update.bind(creditCardController));
router.delete('/credit-cards/:id', authMiddleware, creditCardController.delete.bind(creditCardController));
router.get('/credit-cards/:id/transactions', authMiddleware, creditCardController.getTransactions.bind(creditCardController));
router.post('/credit-cards/:id/transactions', authMiddleware, validate(addTransactionSchema), creditCardController.addTransaction.bind(creditCardController));
router.delete('/credit-cards/:id/transactions/:transactionId', authMiddleware, creditCardController.deleteTransaction.bind(creditCardController));
router.put('/credit-cards/:id/transactions/:transactionId', authMiddleware, creditCardController.updateTransaction.bind(creditCardController));
router.get('/credit-cards/:id/invoice/:month/:year', authMiddleware, creditCardController.getInvoice.bind(creditCardController));
router.post('/credit-cards/:id/invoice/pay', authMiddleware, validate(payInvoiceSchema), creditCardController.payInvoice.bind(creditCardController));
router.post('/credit-cards/:id/invoice/unpay', authMiddleware, creditCardController.unpayInvoice.bind(creditCardController));
router.post('/credit-cards/:id/invoice/plan', authMiddleware, creditCardController.planInvoices.bind(creditCardController));
router.get('/credit-cards/:id/balance', authMiddleware, creditCardController.getBalance.bind(creditCardController));
router.get('/credit-cards/:id/yearly-overview/:year', authMiddleware, creditCardController.getYearlyOverview.bind(creditCardController));

// Investment routes
router.get('/investments', authMiddleware, investmentController.getAll.bind(investmentController));
router.post('/investments', authMiddleware, validate(createInvestmentSchema), investmentController.create.bind(investmentController));
router.put('/investments/:id', authMiddleware, validate(updateInvestmentSchema), investmentController.update.bind(investmentController));
router.delete('/investments/:id', authMiddleware, investmentController.delete.bind(investmentController));

// AI routes
router.use('/ai', aiRoutes);

export default router;
