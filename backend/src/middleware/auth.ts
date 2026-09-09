import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { db } from '../config/db.js';
import { AuthUser } from '../types/index.js';

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function verifyJwtToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthUser;
    return decoded;
  } catch {
    return null;
  }
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token: string | null = null;

  // 1. Check Bearer token in Authorization header
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // 2. Check query param for direct browser navigation: ?token=...
  if (!token && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  // If token is provided, verify it
  if (token) {
    const user = verifyJwtToken(token);
    if (user) {
      req.user = user;
      return next();
    }
  }

  // 3. Seamless Local Dev Fallback:
  // If no auth is passed (e.g. visiting /api/memories directly in the browser),
  // auto-assign to the default local user so developers aren't blocked by 401s!
  try {
    let devUser = await db.findUserByEmail('demo@companion.local');
    if (!devUser) {
      devUser = await db.createUser('demo@companion.local', 'demo_password_hash');
      await db.getOrCreateConversation(devUser.id);
    }
    req.user = { id: devUser.id, email: devUser.email };
    return next();
  } catch {
    res.status(401).json({ error: 'Unauthorized: missing or invalid authorization header' });
  }
}
