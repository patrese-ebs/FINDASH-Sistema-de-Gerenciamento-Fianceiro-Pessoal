import { Request, Response } from 'express';
import aiService from '../services/AiService';

export const parseExpense = async (req: Request, res: Response) => {
    try {
        const text = req.body.text;
        const file = req.file;

        if (!text && !file) {
            res.status(400).json({ error: 'Please provide text or a file.' });
            return;
        }

        let result;
        if (file) {
            // Check for supported mime types
            const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
            if (!supportedTypes.includes(file.mimetype)) {
                res.status(400).json({ error: 'Unsupported file type. Use JPEG, PNG, WEBP, or PDF.' });
                return;
            }

            result = await aiService.parseExpense({
                path: file.path,
                mimeType: file.mimetype
            });
        } else {
            result = await aiService.parseExpense(text);
        }

        res.json(result);
    } catch (error: any) {
        console.error('AI Parse Error:', error);
        res.status(500).json({ error: 'Failed to process request', details: error.message || JSON.stringify(error) });
    }
};
