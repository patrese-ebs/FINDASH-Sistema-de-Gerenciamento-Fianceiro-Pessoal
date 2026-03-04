import { z } from 'zod';

// ==================== AUTH ====================

export const registerSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string()
        .min(8, 'Senha deve ter no mínimo 8 caracteres')
        .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
        .regex(/[0-9]/, 'Senha deve conter pelo menos um número')
        .regex(/[^A-Za-z0-9]/, 'Senha deve conter pelo menos um caractere especial'),
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100),
});

export const loginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'Senha é obrigatória'),
});

export const forgotPasswordSchema = z.object({
    email: z.string().email('Email inválido'),
});

export const resetPasswordSchema = z.object({
    token: z.string().uuid('Token inválido'),
    newPassword: z.string()
        .min(8, 'Senha deve ter no mínimo 8 caracteres')
        .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
        .regex(/[0-9]/, 'Senha deve conter pelo menos um número')
        .regex(/[^A-Za-z0-9]/, 'Senha deve conter pelo menos um caractere especial'),
});

export const updateProfileSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    email: z.string().email('Email inválido').optional(),
    password: z.string()
        .min(8, 'Senha deve ter no mínimo 8 caracteres')
        .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
        .regex(/[0-9]/, 'Senha deve conter pelo menos um número')
        .regex(/[^A-Za-z0-9]/, 'Senha deve conter pelo menos um caractere especial')
        .optional(),
});

// ==================== EXPENSE ====================

export const createExpenseSchema = z.object({
    description: z.string().min(1, 'Descrição é obrigatória').max(255),
    amount: z.number().positive('Valor deve ser positivo'),
    category: z.string().min(1).max(50),
    date: z.string().min(1, 'Data é obrigatória'),
    paymentMethod: z.string().optional(),
    creditCardId: z.string().uuid().optional().nullable(),
    isRecurring: z.boolean().optional(),
    recurrenceFrequency: z.string().optional().nullable(),
    recurrenceEndDate: z.string().optional().nullable(),
    isPaid: z.boolean().optional(),
    installments: z.number().int().min(1).optional(),
});

export const updateExpenseSchema = z.object({
    description: z.string().min(1).max(255).optional(),
    amount: z.number().positive().optional(),
    category: z.string().min(1).max(50).optional(),
    date: z.string().optional(),
    paymentMethod: z.string().optional(),
    creditCardId: z.string().uuid().optional().nullable(),
    isRecurring: z.boolean().optional(),
    isPaid: z.boolean().optional(),
});

// ==================== INCOME ====================

export const createIncomeSchema = z.object({
    description: z.string().min(1, 'Descrição é obrigatória').max(255),
    amount: z.number().positive('Valor deve ser positivo'),
    category: z.string().min(1).max(50),
    date: z.string().min(1, 'Data é obrigatória'),
    isRecurring: z.boolean().optional(),
    recurrenceFrequency: z.string().optional().nullable(),
    recurrenceEndDate: z.string().optional().nullable(),
    isPaid: z.boolean().optional(),
});

export const updateIncomeSchema = z.object({
    description: z.string().min(1).max(255).optional(),
    amount: z.number().positive().optional(),
    category: z.string().min(1).max(50).optional(),
    date: z.string().optional(),
    isRecurring: z.boolean().optional(),
    isPaid: z.boolean().optional(),
});

// ==================== CREDIT CARD ====================

export const createCreditCardSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório').max(100),
    lastFourDigits: z.string().length(4, 'Últimos 4 dígitos obrigatórios'),
    brand: z.string().min(1).max(50),
    imageUrl: z.union([z.string().url(), z.literal('')]).optional().nullable(),
    creditLimit: z.number().positive('Limite deve ser positivo'),
    closingDay: z.number().int().min(1).max(31),
    dueDay: z.number().int().min(1).max(31),
    sharedLimitCardId: z.string().uuid().optional().nullable(),
    enabled: z.boolean().optional(),
});

export const updateCreditCardSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    lastFourDigits: z.string().length(4).optional(),
    brand: z.string().min(1).max(50).optional(),
    imageUrl: z.union([z.string().url(), z.literal('')]).optional().nullable(),
    creditLimit: z.number().positive().optional(),
    closingDay: z.number().int().min(1).max(31).optional(),
    dueDay: z.number().int().min(1).max(31).optional(),
    sharedLimitCardId: z.string().uuid().optional().nullable(),
    enabled: z.boolean().optional(),
});

export const addTransactionSchema = z.object({
    description: z.string().min(1).max(255),
    totalAmount: z.number().positive(),
    installments: z.number().int().min(1),
    category: z.string().min(1).max(50),
    purchaseDate: z.string().min(1),
});

export const payInvoiceSchema = z.object({
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2000).max(2100),
    amount: z.number().positive().optional(),
});

// ==================== INVESTMENT ====================

export const createInvestmentSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório').max(255),
    type: z.string().min(1).max(50),
    amountInvested: z.number().positive(),
    currentValue: z.number().min(0),
    purchaseDate: z.string().min(1),
    notes: z.string().max(500).optional().nullable(),
});

export const updateInvestmentSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    type: z.string().min(1).max(50).optional(),
    amountInvested: z.number().positive().optional(),
    currentValue: z.number().min(0).optional(),
    purchaseDate: z.string().optional(),
    notes: z.string().max(500).optional().nullable(),
});

// ==================== AI ====================

export const aiSearchDebtSchema = z.object({
    query: z.string().min(1, 'Pergunta é obrigatória').max(500),
});

export const aiParseTextSchema = z.object({
    text: z.string().min(1).max(2000).optional(),
});

// ==================== ADMIN ====================

export const adminCreateUserSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string()
        .min(8, 'Senha deve ter no mínimo 8 caracteres')
        .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
        .regex(/[0-9]/, 'Senha deve conter pelo menos um número')
        .regex(/[^A-Za-z0-9]/, 'Senha deve conter pelo menos um caractere especial'),
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100),
    role: z.enum(['user', 'admin']).optional(),
});

export const adminUpdateUserSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    email: z.string().email('Email inválido').optional(),
    role: z.enum(['user', 'admin']).optional(),
});

export const adminResetPasswordSchema = z.object({
    newPassword: z.string()
        .min(8, 'Senha deve ter no mínimo 8 caracteres')
        .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
        .regex(/[0-9]/, 'Senha deve conter pelo menos um número')
        .regex(/[^A-Za-z0-9]/, 'Senha deve conter pelo menos um caractere especial'),
});

// ==================== UUID PARAM ====================

export const uuidParamSchema = z.object({
    id: z.string().uuid('ID inválido'),
});
