import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (req.userRole !== 'admin') {
        res.status(403).json({ error: 'Access denied. Admin privileges required.' });
        return;
    }
    next();
};
