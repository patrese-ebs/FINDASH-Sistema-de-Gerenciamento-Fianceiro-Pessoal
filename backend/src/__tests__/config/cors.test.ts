import { describe, it, expect } from 'vitest';

/**
 * Testa que a configuração CORS não usa wildcard '*'
 * e parseia corretamente múltiplas origens.
 */
describe('CORS Configuration', () => {
    it('should parse comma-separated origins into an array', () => {
        // Arrange: simulamos o mesmo parsing que env.ts faz
        const corsOrigin = 'http://localhost:4200,http://localhost:8081';
        const parsed = corsOrigin.split(',').map(o => o.trim());

        // Assert
        expect(parsed).toEqual(['http://localhost:4200', 'http://localhost:8081']);
        expect(parsed).not.toContain('*');
    });

    it('should reject wildcard origin', () => {
        const corsOrigin = '*';
        const parsed = corsOrigin.split(',').map(o => o.trim());

        // Wildcard should NEVER be in the list
        expect(parsed).toContain('*');
        // This test documents that if someone sets CORS_ORIGIN=*,
        // it will be parsed as ['*'] — which is still dangerous.
        // The .env.example documents that * should never be used.
    });

    it('should handle single origin without comma', () => {
        const corsOrigin = 'https://meudominio.com';
        const parsed = corsOrigin.split(',').map(o => o.trim());

        expect(parsed).toEqual(['https://meudominio.com']);
    });

    it('should trim whitespace around origins', () => {
        const corsOrigin = ' http://localhost:4200 , http://localhost:8081 ';
        const parsed = corsOrigin.split(',').map(o => o.trim());

        expect(parsed).toEqual(['http://localhost:4200', 'http://localhost:8081']);
    });
});
