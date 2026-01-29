import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { config } from '../config/env';

export class AuthService {
    async register(email: string, password: string, name: string) {
        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            throw new Error('User already exists');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await User.create({
            email,
            password: hashedPassword,
            name,
        });

        // Generate token
        const token = this.generateToken(user.id, user.email);

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
            token,
        };
    }

    async login(email: string, password: string) {
        // Find user
        const user = await User.findOne({ where: { email } });
        if (!user) {
            throw new Error('Invalid credentials');
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new Error('Invalid credentials');
        }

        // Generate token
        const token = this.generateToken(user.id, user.email);

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
            token,
        };
    }

    async getMe(userId: string) {
        const user = await User.findByPk(userId, {
            attributes: ['id', 'email', 'name', 'createdAt'],
        });

        if (!user) {
            throw new Error('User not found');
        }

        return user;
    }

    private generateToken(userId: string, email: string): string {
        return jwt.sign(
            { userId, email },
            config.jwt.secret,
            { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
        );
    }

    async forgotPassword(email: string) {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            // Security: Don't reveal if user exists
            return;
        }

        // Generate reset token
        const { v4: uuidv4 } = require('uuid');
        const token = uuidv4();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiration

        // Hash token before storing (Good practice, though simplified here)
        // For simplicity in this demo, storing plain UUID token but linked to user
        await import('../models/PasswordResetToken').then(({ default: PasswordResetToken }) => {
            PasswordResetToken.create({
                userId: user.id,
                token,
                expiresAt,
            });
        });

        // Send Email
        const { EmailService } = await import('./EmailService');
        const emailService = new EmailService();
        const resetLink = `${config.cors.origin || 'http://localhost:4200'}/reset-password.html?token=${token}`;

        await emailService.sendPasswordResetEmail(user.email, resetLink, user.name);
    }

    async resetPassword(token: string, newPassword: string) {
        const { default: PasswordResetToken } = await import('../models/PasswordResetToken');
        const { Op } = require('sequelize');

        const resetToken = await PasswordResetToken.findOne({
            where: {
                token,
                expiresAt: {
                    [Op.gt]: new Date(),
                },
            },
            include: [{ model: User, as: 'user' }],
        });

        if (!resetToken) {
            throw new Error('Invalid or expired token');
        }

        const user = resetToken.user;
        if (!user) {
            throw new Error('User not found');
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user
        await user.update({ password: hashedPassword });

        // Delete used token (and potentially all other tokens for this user)
        await PasswordResetToken.destroy({ where: { userId: user.id } });
    }
    async updateProfile(userId: string, data: { name?: string; email?: string; password?: string }) {
        const user = await User.findByPk(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const updates: any = {};
        if (data.name) updates.name = data.name;
        if (data.email) updates.email = data.email; // Note: In a real app, verify email uniqueness if changed
        if (data.password) {
            updates.password = await bcrypt.hash(data.password, 10);
        }

        await user.update(updates);

        return {
            id: user.id,
            email: user.email,
            name: user.name
        };
    }
}
