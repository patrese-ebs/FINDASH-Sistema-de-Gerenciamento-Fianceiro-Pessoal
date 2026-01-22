import { Router } from 'express';
import multer from 'multer';
import { parseExpense } from '../controllers/AiController';

const router = Router();
const upload = multer({ dest: 'uploads/' });

// POST /api/ai/parse
router.post('/parse', upload.single('file'), parseExpense);

export default router;
