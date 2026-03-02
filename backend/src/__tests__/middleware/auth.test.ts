import { describe, it, expect, vi, beforeAll } from 'vitest';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

/**
 * Testa o middleware de autenticação JWT.
 * Verificamos que:
 * 1. Tokens com algorithm HS256 válidos são aceitos
 * 2. Tokens inválidos são rejeitados
 * 3. Requests sem token são rejeitados
 */

// Mock da config para evitar dependência de .env
vi.mock('../../config/env', () => ({
    config: {
        jwt: {
            secret: 'test-secret-for-unit-tests',
            expiresIn: '1h',
        },
    },
}));

let authMiddleware: any;

beforeAll(async () => {
    const mod = await import('../../middleware/auth');
    authMiddleware = mod.authMiddleware;
});

describe('Auth Middleware', () => {
    const mockRes = () => {
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        } as unknown as Response;
        return res;
    };

    const mockNext: NextFunction = vi.fn();

    it('should reject request without Authorization header', () => {
        const req = { headers: {} } as Request;
        const res = mockRes();

        authMiddleware(req as any, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
    });

    it('should reject malformed token (no Bearer prefix)', () => {
        const req = { headers: { authorization: 'Token abc123' } } as Request;
        const res = mockRes();

        authMiddleware(req as any, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Token malformatted' });
    });

    it('should accept valid HS256 JWT token', () => {
        const token = jwt.sign(
            { userId: 'user-123', email: 'test@test.com' },
            'test-secret-for-unit-tests',
            { algorithm: 'HS256', expiresIn: '1h' }
        );

        const req = { headers: { authorization: `Bearer ${token}` } } as Request;
        const res = mockRes();
        const next = vi.fn();

        authMiddleware(req as any, res, next);

        expect(next).toHaveBeenCalled();
        expect((req as any).userId).toBe('user-123');
    });

    it('should reject expired JWT token', () => {
        const token = jwt.sign(
            { userId: 'user-123', email: 'test@test.com' },
            'test-secret-for-unit-tests',
            { algorithm: 'HS256', expiresIn: '-1s' } // already expired
        );

        const req = { headers: { authorization: `Bearer ${token}` } } as Request;
        const res = mockRes();
        const next = vi.fn();

        authMiddleware(req as any, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('should reject JWT signed with wrong secret', () => {
        const token = jwt.sign(
            { userId: 'user-123', email: 'test@test.com' },
            'wrong-secret',
            { algorithm: 'HS256' }
        );

        const req = { headers: { authorization: `Bearer ${token}` } } as Request;
        const res = mockRes();
        const next = vi.fn();

        authMiddleware(req as any, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });
});
