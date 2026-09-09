import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { memoryService } from '../services/memory.js';

export const memoryController = {
  async getMemories(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const search = req.query.search as string | undefined;

      const memories = await memoryService.getMemories(userId, search);
      res.status(200).json({ memories });
    } catch (err: any) {
      console.error('Get memories error:', err);
      res.status(500).json({ error: 'Failed to retrieve memories' });
    }
  },

  async createMemory(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { content } = req.body;

      if (!content || typeof content !== 'string' || !content.trim()) {
        res.status(400).json({ error: 'Memory content is required' });
        return;
      }

      const memory = await memoryService.createMemory(userId, content.trim());
      res.status(201).json({ memory });
    } catch (err: any) {
      console.error('Create memory error:', err);
      res.status(500).json({ error: 'Failed to create memory' });
    }
  },

  async updateMemory(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const id = req.params.id as string;
      const { content } = req.body;

      if (!content || typeof content !== 'string' || !content.trim()) {
        res.status(400).json({ error: 'Memory content is required' });
        return;
      }

      const memory = await memoryService.updateMemory(id, userId, content.trim());
      if (!memory) {
        res.status(404).json({ error: 'Memory not found' });
        return;
      }

      res.status(200).json({ memory });
    } catch (err: any) {
      console.error('Update memory error:', err);
      res.status(500).json({ error: 'Failed to update memory' });
    }
  },

  async deleteMemory(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const id = req.params.id as string;

      const success = await memoryService.deleteMemory(id, userId);
      if (!success) {
        res.status(404).json({ error: 'Memory not found' });
        return;
      }

      res.status(200).json({ success: true });
    } catch (err: any) {
      console.error('Delete memory error:', err);
      res.status(500).json({ error: 'Failed to delete memory' });
    }
  },
};
