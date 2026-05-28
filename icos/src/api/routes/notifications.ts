import { Router, Request, Response } from 'express';
import { requireAuth } from '../../auth/middleware';

// In-memory subscriber map — sufficient for pilot (single instance)
const subscribers = new Map<string, Response>();

export function notifySubscribers(event: object, forRoles?: string[]): void {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const [, res] of subscribers) {
    const user = (res as any).__user;
    if (!forRoles || !user || forRoles.includes(user.role) || user.is_master) {
      try { res.write(data); } catch { /* client disconnected */ }
    }
  }
}

export function notificationsRouter(): Router {
  const router = Router();

  router.get('/stream', requireAuth, (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    (res as any).__user = req.user;
    const subId = `${req.user!.user_id}-${Date.now()}`;
    subscribers.set(subId, res);

    // Keepalive every 30 seconds
    const keepalive = setInterval(() => {
      try { res.write(': keepalive\n\n'); } catch { clearInterval(keepalive); }
    }, 30_000);

    res.on('close', () => {
      clearInterval(keepalive);
      subscribers.delete(subId);
    });
  });

  return router;
}
