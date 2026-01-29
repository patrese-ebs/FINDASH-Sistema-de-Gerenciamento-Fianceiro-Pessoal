import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { AuthRequest } from '../types';

const authService = new AuthService();

export class AuthController {
    async register(req: Request, res: Response): Promise<void> {
        try {
            const { email, password, name } = req.body;

            if (!email || !password || !name) {
                res.status(400).json({ error: 'Missing required fields' });
                return;
            }

            const result = await authService.register(email, password, name);
            res.status(201).json(result);
        } catch (error) {
            if (error instanceof Error) {
                res.status(400).json({ error: error.message });
            } else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }

    async login(req: Request, res: Response): Promise<void> {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                res.status(400).json({ error: 'Missing required fields' });
                return;
            }

            const result = await authService.login(email, password);
            res.status(200).json(result);
        } catch (error) {
            if (error instanceof Error) {
                res.status(401).json({ error: error.message });
            } else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }

    async getMe(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const user = await authService.getMe(req.userId);
            res.status(200).json(user);
        } catch (error) {
            if (error instanceof Error) {
                res.status(404).json({ error: error.message });
            } else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }

    async forgotPassword(req: Request, res: Response): Promise<void> {
        try {
            const { email } = req.body;
            if (!email) {
                res.status(400).json({ error: 'Email required' });
                return;
            }

            await authService.forgotPassword(email);
            // Always return success to prevent email enumeration
            res.status(200).json({ message: 'If your email is registered, you will receive a reset link.' });
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async resetPassword(req: Request, res: Response): Promise<void> {
        try {
            const { token, newPassword } = req.body;
            if (!token || !newPassword) {
                res.status(400).json({ error: 'Token and new password required' });
                return;
            }

            await authService.resetPassword(token, newPassword);
            res.status(200).json({ message: 'Password reset successfully' });
        } catch (error) {
            if (error instanceof Error) {
                res.status(400).json({ error: error.message });
            } else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }
    async updateProfile(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const { name, email, password } = req.body;
            const updatedUser = await authService.updateProfile(req.userId, { name, email, password });

            res.status(200).json(updatedUser);
        } catch (error) {
            if (error instanceof Error) {
                res.status(400).json({ error: error.message });
            } else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }
}
