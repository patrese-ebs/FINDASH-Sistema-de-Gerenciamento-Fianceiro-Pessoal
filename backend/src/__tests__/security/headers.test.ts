import { describe, it, expect } from 'vitest';
import express from 'express';
import helmet from 'helmet';
import request from 'supertest';

/**
 * Testa que o Helmet adiciona os security headers esperados.
 * Usamos um mini-app Express para isolar o teste (sem precisar do DB).
 */
describe('Security Headers (Helmet)', () => {
    const app = express();
    app.use(helmet());
    app.get('/test', (_req, res) => {
        res.json({ ok: true });
    });

    it('should include X-Content-Type-Options: nosniff', async () => {
        const res = await request(app).get('/test');
        expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should include X-Frame-Options header', async () => {
        const res = await request(app).get('/test');
        expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    });

    it('should remove X-Powered-By header', async () => {
        const res = await request(app).get('/test');
        expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('should include Strict-Transport-Security header', async () => {
        const res = await request(app).get('/test');
        expect(res.headers['strict-transport-security']).toBeDefined();
    });
});
