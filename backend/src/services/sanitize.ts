/**
 * Sanitiza input do usuário antes de enviar ao modelo de IA.
 * Previne prompt injection removendo padrões perigosos.
 */
export function sanitizePromptInput(input: string): string {
    // Remove tentativas de manipulação de prompt
    let sanitized = input
        // Remove instruções que tentam sobrescrever o system prompt
        .replace(/ignore\s+(previous|all|above)\s+(instructions?|prompts?)/gi, '[REDACTED]')
        .replace(/you\s+are\s+now/gi, '[REDACTED]')
        .replace(/forget\s+(everything|all|previous)/gi, '[REDACTED]')
        .replace(/new\s+instructions?:/gi, '[REDACTED]')
        .replace(/system\s*prompt/gi, '[REDACTED]')
        .replace(/act\s+as\s+(if|a)/gi, '[REDACTED]')
        .replace(/pretend\s+(you|to\s+be)/gi, '[REDACTED]');

    // Limita comprimento
    sanitized = sanitized.slice(0, 2000);

    return sanitized.trim();
}
