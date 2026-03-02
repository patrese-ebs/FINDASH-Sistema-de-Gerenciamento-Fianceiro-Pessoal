import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema, resetPasswordSchema, createExpenseSchema, createCreditCardSchema } from '../../middleware/schemas';

describe('Validation Schemas', () => {

    // ==================== PASSWORD POLICY ====================
    describe('Password Policy (registerSchema)', () => {
        it('should reject password shorter than 8 chars', () => {
            const result = registerSchema.safeParse({ email: 'a@b.com', password: 'Ab1!', name: 'Test' });
            expect(result.success).toBe(false);
        });

        it('should reject password without uppercase', () => {
            const result = registerSchema.safeParse({ email: 'a@b.com', password: 'abcdefg1!', name: 'Test' });
            expect(result.success).toBe(false);
        });

        it('should reject password without number', () => {
            const result = registerSchema.safeParse({ email: 'a@b.com', password: 'Abcdefgh!', name: 'Test' });
            expect(result.success).toBe(false);
        });

        it('should reject password without special char', () => {
            const result = registerSchema.safeParse({ email: 'a@b.com', password: 'Abcdefg1', name: 'Test' });
            expect(result.success).toBe(false);
        });

        it('should accept valid strong password', () => {
            const result = registerSchema.safeParse({ email: 'a@b.com', password: 'Abcdefg1!', name: 'Test' });
            expect(result.success).toBe(true);
        });
    });

    // ==================== EMAIL VALIDATION ====================
    describe('Email Validation', () => {
        it('should reject invalid email', () => {
            const result = loginSchema.safeParse({ email: 'not-an-email', password: 'test' });
            expect(result.success).toBe(false);
        });

        it('should accept valid email', () => {
            const result = loginSchema.safeParse({ email: 'user@example.com', password: 'test' });
            expect(result.success).toBe(true);
        });
    });

    // ==================== EXPENSE VALIDATION ====================
    describe('Expense Validation', () => {
        it('should reject negative amount', () => {
            const result = createExpenseSchema.safeParse({
                description: 'Test', amount: -100, category: 'Food', date: '2026-01-01'
            });
            expect(result.success).toBe(false);
        });

        it('should reject empty description', () => {
            const result = createExpenseSchema.safeParse({
                description: '', amount: 100, category: 'Food', date: '2026-01-01'
            });
            expect(result.success).toBe(false);
        });

        it('should accept valid expense', () => {
            const result = createExpenseSchema.safeParse({
                description: 'Almoço', amount: 25.50, category: 'Alimentação', date: '2026-01-01'
            });
            expect(result.success).toBe(true);
        });
    });

    // ==================== CREDIT CARD VALIDATION ====================
    describe('Credit Card Validation', () => {
        it('should reject lastFourDigits with wrong length', () => {
            const result = createCreditCardSchema.safeParse({
                name: 'Nubank', lastFourDigits: '123', brand: 'Visa',
                creditLimit: 5000, closingDay: 10, dueDay: 17
            });
            expect(result.success).toBe(false);
        });

        it('should reject dueDay > 31', () => {
            const result = createCreditCardSchema.safeParse({
                name: 'Nubank', lastFourDigits: '1234', brand: 'Visa',
                creditLimit: 5000, closingDay: 10, dueDay: 32
            });
            expect(result.success).toBe(false);
        });

        it('should accept valid credit card', () => {
            const result = createCreditCardSchema.safeParse({
                name: 'Nubank', lastFourDigits: '1234', brand: 'Visa',
                creditLimit: 5000, closingDay: 10, dueDay: 17
            });
            expect(result.success).toBe(true);
        });
    });

    // ==================== RESET PASSWORD ====================
    describe('Reset Password Validation', () => {
        it('should reject non-UUID token', () => {
            const result = resetPasswordSchema.safeParse({ token: 'not-a-uuid', newPassword: 'Abcdefg1!' });
            expect(result.success).toBe(false);
        });
    });
});
