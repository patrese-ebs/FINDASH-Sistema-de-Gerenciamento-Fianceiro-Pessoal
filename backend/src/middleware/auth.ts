import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { AuthRequest, JWTPayload } from '../types';

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            res.status(401).json({ error: 'No token provided' });
            return;
        }

        const parts = authHeader.split(' ');

        if (parts.length !== 2) {
            res.status(401).json({ error: 'Token error' });
            return;
        }

        const [scheme, token] = parts;

        if (!/^Bearer$/i.test(scheme)) {
            res.status(401).json({ error: 'Token malformatted' });
            return;
        }

        jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] }, (err, decoded) => {
            if (err) {
                res.status(401).json({ error: 'Token invalid' });
                return;
            }

            const payload = decoded as JWTPayload;
            req.userId = payload.userId;
            return next();
        });
    } catch (error) {
        res.status(401).json({ error: 'Token invalid' });
    }
};
