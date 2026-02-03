import { Router } from 'express';
import multer from 'multer';
import { parseExpense, getInsights, searchDebt } from '../controllers/AiController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const upload = multer({ dest: 'uploads/' });

// POST /api/ai/parse
router.post('/parse', authMiddleware, upload.single('file'), parseExpense);

// GET /api/ai/insights
router.get('/insights', authMiddleware, getInsights);

// POST /api/ai/search-debt
router.post('/search-debt', authMiddleware, searchDebt);

export default router;
