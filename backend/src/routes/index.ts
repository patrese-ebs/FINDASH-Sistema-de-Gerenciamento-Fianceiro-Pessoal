import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { IncomeController } from '../controllers/IncomeController';
import { ExpenseController } from '../controllers/ExpenseController';
import { CreditCardController } from '../controllers/CreditCardController';
import { InvestmentController } from '../controllers/InvestmentController';
import { FinancialPlanController } from '../controllers/FinancialPlanController';
import { ReportController } from '../controllers/ReportController';
import aiRoutes from './aiRoutes';
import { authMiddleware } from '../middleware/auth';

import rateLimit from 'express-rate-limit';

const router = Router();

// Rate Limiters
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { error: 'Too many login attempts, please try again after 15 minutes' },
    validate: { xForwardedForHeader: false }, // Disable strict validation for proxy
    standardHeaders: true,
    legacyHeaders: false,
});

// Initialize controllers
const authController = new AuthController();
const incomeController = new IncomeController();
const expenseController = new ExpenseController();
const creditCardController = new CreditCardController();
const investmentController = new InvestmentController();
const financialPlanController = new FinancialPlanController();
const reportController = new ReportController();

// Auth routes
// Apply rate limit specifically to login/register/forgot
router.post('/auth/register', authLimiter, authController.register.bind(authController));
router.post('/auth/login', authLimiter, authController.login.bind(authController));
router.post('/auth/forgot-password', authLimiter, authController.forgotPassword.bind(authController));
router.post('/auth/reset-password', authLimiter, authController.resetPassword.bind(authController));
router.get('/auth/me', authMiddleware, authController.getMe.bind(authController));

// Income routes
router.get('/incomes', authMiddleware, incomeController.getAll.bind(incomeController));
router.post('/incomes', authMiddleware, incomeController.create.bind(incomeController));
router.put('/incomes/:id', authMiddleware, incomeController.update.bind(incomeController));
router.delete('/incomes/:id', authMiddleware, incomeController.delete.bind(incomeController));

// Expense routes
router.get('/expenses', authMiddleware, expenseController.getAll.bind(expenseController));
router.post('/expenses', authMiddleware, expenseController.create.bind(expenseController));
router.put('/expenses/:id', authMiddleware, expenseController.update.bind(expenseController));
router.delete('/expenses/:id', authMiddleware, expenseController.delete.bind(expenseController));

// Credit Card routes
router.get('/credit-cards', authMiddleware, creditCardController.getAll.bind(creditCardController));
router.post('/credit-cards', authMiddleware, creditCardController.create.bind(creditCardController));
router.put('/credit-cards/:id', authMiddleware, creditCardController.update.bind(creditCardController));
router.delete('/credit-cards/:id', authMiddleware, creditCardController.delete.bind(creditCardController));
router.get('/credit-cards/:id/transactions', authMiddleware, creditCardController.getTransactions.bind(creditCardController));
router.post('/credit-cards/:id/transactions', authMiddleware, creditCardController.addTransaction.bind(creditCardController));
router.get('/credit-cards/:id/invoice/:month/:year', authMiddleware, creditCardController.getInvoice.bind(creditCardController));
router.post('/credit-cards/:id/invoice/pay', authMiddleware, creditCardController.payInvoice.bind(creditCardController));
router.get('/credit-cards/:id/balance', authMiddleware, creditCardController.getBalance.bind(creditCardController));

// Investment routes
router.get('/investments', authMiddleware, investmentController.getAll.bind(investmentController));
router.post('/investments', authMiddleware, investmentController.create.bind(investmentController));
router.put('/investments/:id', authMiddleware, investmentController.update.bind(investmentController));
router.delete('/investments/:id', authMiddleware, investmentController.delete.bind(investmentController));

// Financial Plan routes
router.get('/financial-plans', authMiddleware, financialPlanController.getAll.bind(financialPlanController));
router.post('/financial-plans', authMiddleware, financialPlanController.create.bind(financialPlanController));
router.put('/financial-plans/:id', authMiddleware, financialPlanController.update.bind(financialPlanController));
router.delete('/financial-plans/:id', authMiddleware, financialPlanController.delete.bind(financialPlanController));

// Report routes
router.get('/reports/dashboard', authMiddleware, reportController.getDashboard.bind(reportController));
router.get('/reports/monthly/:month/:year', authMiddleware, reportController.getMonthlyReport.bind(reportController));

// AI routes
router.use('/ai', aiRoutes);

export default router;
