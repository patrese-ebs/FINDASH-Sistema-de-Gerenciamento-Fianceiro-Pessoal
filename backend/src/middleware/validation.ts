import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, ZodIssue } from 'zod';

/**
 * Middleware genérico de validação com Zod.
 * Pode validar body, query ou params.
 */
export const validate = (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            const data = schema.parse(req[source]);
            // Substitui os dados pelo resultado parseado (coerção de tipos)
            req[source] = data;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                res.status(400).json({
                    error: 'Validation error',
                    details: error.issues.map((e: ZodIssue) => ({
                        field: e.path.join('.'),
                        message: e.message,
                    })),
                });
                return;
            }
            next(error);
        }
    };
};
