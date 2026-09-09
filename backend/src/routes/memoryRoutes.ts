import { Router } from 'express';
import { memoryController } from '../controllers/memoryController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All memory routes require authentication
router.use(requireAuth);

router.get('/', memoryController.getMemories);
router.post('/', memoryController.createMemory);
router.patch('/:id', memoryController.updateMemory);
router.delete('/:id', memoryController.deleteMemory);

export default router;
