import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User, Income, Expense, CreditCard, CreditCardTransaction, Investment } from '../models';
import { AuthRequest } from '../types';

export class AdminController {
    // GET /api/admin/users — List all users
    async listUsers(req: AuthRequest, res: Response): Promise<void> {
        try {
            const users = await User.findAll({
                attributes: ['id', 'email', 'name', 'role', 'isActive', 'createdAt', 'updatedAt'],
                order: [['createdAt', 'DESC']],
            });

            res.status(200).json(users);
        } catch (error) {
            res.status(500).json({ error: 'Failed to list users' });
        }
    }

    // POST /api/admin/users — Create a new user
    async createUser(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { email, password, name, role } = req.body;

            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) {
                res.status(400).json({ error: 'User with this email already exists' });
                return;
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const user = await User.create({
                email,
                password: hashedPassword,
                name,
                role: role || 'user',
            });

            res.status(201).json({
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                isActive: user.isActive,
                createdAt: user.createdAt,
            });
        } catch (error) {
            if (error instanceof Error) {
                res.status(400).json({ error: error.message });
            } else {
                res.status(500).json({ error: 'Failed to create user' });
            }
        }
    }

    // PUT /api/admin/users/:id — Update user details
    async updateUser(req: Request, res: Response): Promise<void> {
        try {
            const id = req.params.id as string;
            const { name, email, role } = req.body;

            const user = await User.findByPk(id);
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            // Prevent admin from changing their own role
            if (id === (req as any).userId && role && role !== user.role) {
                res.status(400).json({ error: 'You cannot change your own role' });
                return;
            }

            const updates: any = {};
            if (name) updates.name = name;
            if (email) updates.email = email;
            if (role) updates.role = role;

            await user.update(updates);

            res.status(200).json({
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                isActive: user.isActive,
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to update user' });
        }
    }

    // PUT /api/admin/users/:id/toggle-status — Toggle user active status
    async toggleUserStatus(req: Request, res: Response): Promise<void> {
        try {
            const id = req.params.id as string;

            if (id === (req as any).userId) {
                res.status(400).json({ error: 'You cannot deactivate your own account' });
                return;
            }

            const user = await User.findByPk(id);
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            await user.update({ isActive: !user.isActive });

            res.status(200).json({
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                isActive: user.isActive,
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to toggle user status' });
        }
    }

    // PUT /api/admin/users/:id/reset-password — Reset user password
    async resetUserPassword(req: Request, res: Response): Promise<void> {
        try {
            const id = req.params.id as string;
            const { newPassword } = req.body;

            const user = await User.findByPk(id);
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await user.update({ password: hashedPassword });

            res.status(200).json({ message: 'Password reset successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to reset password' });
        }
    }

    // GET /api/admin/stats — Global system statistics
    async getStats(req: AuthRequest, res: Response): Promise<void> {
        try {
            const totalUsers = await User.count();
            const activeUsers = await User.count({ where: { isActive: true } });
            const totalIncomes = await Income.count();
            const totalExpenses = await Expense.count();
            const totalCreditCards = await CreditCard.count();
            const totalTransactions = await CreditCardTransaction.count();
            const totalInvestments = await Investment.count();

            // Calculate totals
            const incomeSum = await Income.sum('amount') || 0;
            const expenseSum = await Expense.sum('amount') || 0;

            res.status(200).json({
                users: {
                    total: totalUsers,
                    active: activeUsers,
                    inactive: totalUsers - activeUsers,
                },
                financial: {
                    totalIncomes,
                    totalExpenses,
                    totalCreditCards,
                    totalCreditCardTransactions: totalTransactions,
                    totalInvestments,
                    incomeSum: Number(incomeSum),
                    expenseSum: Number(expenseSum),
                },
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to get stats' });
        }
    }

    // POST /api/admin/seed — Create or promote first admin (one-time)
    async seedAdmin(req: Request, res: Response): Promise<void> {
        try {
            // Safety: Check if any admin already exists
            const anyAdmin = await User.findOne({ where: { role: 'admin' } });
            if (anyAdmin) {
                res.status(400).json({ error: 'Admin user already exists. Seed is disabled.' });
                return;
            }

            const { email, password, name } = req.body;

            const targetEmail = email || 'admin@findash.com';
            const targetPassword = password || 'Admin@123';
            const targetName = name || 'Administrador';

            // Check if user already exists
            let user = await User.findOne({ where: { email: targetEmail } });

            if (user) {
                // Promote existing user to admin
                const hashedPassword = password ? await bcrypt.hash(targetPassword, 10) : user.password;
                await user.update({
                    role: 'admin',
                    isActive: true,
                    password: hashedPassword
                });

                res.status(200).json({
                    message: `Usuário ${targetEmail} promovido a administrador com sucesso.`,
                    user: { id: user.id, email: user.email, role: 'admin' }
                });
            } else {
                // Create new admin
                const hashedPassword = await bcrypt.hash(targetPassword, 10);
                const newAdmin = await User.create({
                    email: targetEmail,
                    password: hashedPassword,
                    name: targetName,
                    role: 'admin',
                    isActive: true
                });

                res.status(201).json({
                    message: 'Primeiro administrador criado com sucesso.',
                    user: { id: newAdmin.id, email: newAdmin.email, role: 'admin' }
                });
            }
        } catch (error) {
            console.error('Seed Error:', error);
            res.status(500).json({ error: 'Failed to seed admin' });
        }
    }
}

