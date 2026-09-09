import { Router } from 'express';
import { chatController } from '../controllers/chatController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All chat routes require authentication
router.use(requireAuth);

router.post('/message', chatController.sendMessage);
router.get('/history', chatController.getHistory);

export default router;
