import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { chatService } from '../services/chat.js';

export const chatController = {
  async sendMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { content } = req.body;

      if (!content || typeof content !== 'string' || !content.trim()) {
        res.status(400).json({ error: 'Message content is required' });
        return;
      }

      const result = await chatService.processMessage(userId, content.trim());
      res.status(200).json(result);
    } catch (err: any) {
      if (err.message === 'assistant_unavailable') {
        res.status(503).json({ error: 'assistant_unavailable', retryable: true });
        return;
      }
      console.error('Chat message error:', err);
      res.status(500).json({ error: 'assistant_unavailable', retryable: true });
    }
  },

  async getHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string, 10) || 50;

      const messages = await chatService.getChatHistory(userId, limit);
      res.status(200).json({ messages });
    } catch (err: any) {
      console.error('Chat history error:', err);
      res.status(500).json({ error: 'Failed to retrieve chat history' });
    }
  },
};
