import { Request } from 'express';

export interface AuthRequest extends Request {
    userId?: string;
    userRole?: 'user' | 'admin';
}

export interface JWTPayload {
    userId: string;
    email: string;
    role: 'user' | 'admin';
}

export interface PaginationQuery {
    page?: number;
    limit?: number;
}

export interface MonthYearFilter {
    month?: number;
    year?: number;
}

export interface TransactionFromImage {
    description: string;
    amount: number;
    category?: string;
    date?: string;
}

export interface TransactionFromText {
    description: string;
    amount: number;
    type: 'income' | 'expense';
    category?: string;
}

export interface FinancialInsight {
    title: string;
    description: string;
    type: 'warning' | 'success' | 'info';
    amount?: number;
}
