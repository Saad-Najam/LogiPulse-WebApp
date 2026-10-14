import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validate, parseId } from '../middleware/validate.js';
import { messageLimiter } from '../middleware/rateLimiter.js';
import { listMessages, createMessage } from '../services/messages.js';

// Mounted at /api/orders/:id/messages - chat is always scoped to one order.
const router = Router({ mergeParams: true });
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  res.json(await listMessages(parseId(req.params.id), req.user));
}));

router.post('/', requireRole('user', 'rider'), messageLimiter, validate(z.object({ content: z.string().trim().min(1).max(1000) })),
  asyncHandler(async (req, res) => {
    res.status(201).json(await createMessage(parseId(req.params.id), req.user, req.body.content));
  }));

export default router;
