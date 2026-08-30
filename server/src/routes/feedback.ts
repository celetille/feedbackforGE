import { Router } from 'express';
import { z } from 'zod';
import { createFeedback, listFeedback, supportFeedback } from '../db.js';
import { feedbackCategories } from '../types.js';

const router = Router();

const categorySchema = z.enum(feedbackCategories);

const createFeedbackSchema = z.object({
  category: categorySchema,
  title: z.string().trim().min(2, '标题至少需要 2 个字').max(60, '标题不能超过 60 个字'),
  content: z.string().trim().max(600, '内容不能超过 600 个字').optional().default('')
});

router.get('/', (request, response) => {
  const parsedCategory = categorySchema.optional().safeParse(request.query.category);

  if (!parsedCategory.success) {
    response.status(400).json({ message: '反馈分类不存在' });
    return;
  }

  response.json({ feedback: listFeedback(parsedCategory.data, false) });
});

router.get('/private', (request, response) => {
  const parsedCategory = categorySchema.optional().safeParse(request.query.category);

  if (!parsedCategory.success) {
    response.status(400).json({ message: '反馈分类不存在' });
    return;
  }

  response.json({ feedback: listFeedback(parsedCategory.data, true) });
});

router.post('/', (request, response) => {
  const parsedBody = createFeedbackSchema.safeParse(request.body);

  if (!parsedBody.success) {
    response.status(400).json({ message: parsedBody.error.issues[0]?.message ?? '反馈内容不符合要求' });
    return;
  }

  const feedback = createFeedback(parsedBody.data);
  response.status(201).json({ feedback });
});

router.post('/private', (request, response) => {
  const parsedBody = createFeedbackSchema.safeParse(request.body);

  if (!parsedBody.success) {
    response.status(400).json({ message: parsedBody.error.issues[0]?.message ?? '私密留言不符合要求' });
    return;
  }

  const feedback = createFeedback({ ...parsedBody.data, isPrivate: true });
  response.status(201).json({ feedback });
});

router.post('/:id/support', (request, response) => {
  const id = Number(request.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    response.status(400).json({ message: '反馈 ID 不合法' });
    return;
  }

  const feedback = supportFeedback(id, false);

  if (!feedback) {
    response.status(404).json({ message: '反馈不存在' });
    return;
  }

  response.json({ feedback });
});

export default router;