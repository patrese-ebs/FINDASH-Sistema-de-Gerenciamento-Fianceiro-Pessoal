import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
    console.error('Error:', err);

    if (err.name === 'SequelizeValidationError') {
        res.status(400).json({
            error: 'Validation error',
            details: err.message,
        });
        return;
    }

    if (err.name === 'SequelizeUniqueConstraintError') {
        res.status(409).json({
            error: 'Resource already exists',
            details: err.message,
        });
        return;
    }

    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    });
};
