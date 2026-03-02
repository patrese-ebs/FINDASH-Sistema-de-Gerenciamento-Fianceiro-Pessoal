import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { parseExpense, getInsights, searchDebt } from '../controllers/AiController';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { aiSearchDebtSchema } from '../middleware/schemas';

const router = Router();

// Secure multer config: 5MB limit, allowed types only, sanitized filenames
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (_req, file, cb) => {
        const uniqueName = crypto.randomBytes(16).toString('hex') + path.extname(file.originalname);
        cb(null, uniqueName);
    },
});

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (_req, file, cb) => {
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de arquivo não suportado. Use JPEG, PNG, WEBP ou PDF.'));
        }
    },
});

// POST /api/ai/parse
router.post('/parse', authMiddleware, upload.single('file'), parseExpense);

// GET /api/ai/insights
router.get('/insights', authMiddleware, getInsights);

// POST /api/ai/search-debt
router.post('/search-debt', authMiddleware, validate(aiSearchDebtSchema), searchDebt);

export default router;
