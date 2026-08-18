import { Router } from 'express';
import { z } from 'zod';
import { getSiteStats, logPageVisit } from '../db.js';

const router = Router();

const visitSchema = z.object({
  path: z.string().trim().min(1).max(160),
  referrer: z.string().trim().max(300).optional().nullable(),
  device: z.enum(['mobile', 'tablet', 'desktop'])
});

router.get('/stats', (_request, response) => {
  response.json({ stats: getSiteStats() });
});

router.post('/visit', (request, response) => {
  const parsedBody = visitSchema.safeParse(request.body);

  if (!parsedBody.success) {
    response.status(400).json({ message: '访问记录格式不正确' });
    return;
  }

  const visit = logPageVisit({
    path: parsedBody.data.path,
    referrer: parsedBody.data.referrer || null,
    device: parsedBody.data.device
  });

  response.status(201).json({ visit });
});

export default router;