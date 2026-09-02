import { Router } from 'express';
import { z } from 'zod';
import {
  createAdminPassword,
  createFeedback,
  isAdminPasswordConfigured,
  listFeedback,
  supportFeedback,
  verifyAdminPassword
} from '../db.js';
import { feedbackCategories } from '../types.js';

const router = Router();

const categorySchema = z.enum(feedbackCategories);

const privateFeedbackPasswordHeader = 'x-private-feedback-password';
const adminPasswordSchema = z.string().trim().min(8, '管理员密码至少需要 8 位').max(128, '管理员密码不能超过 128 位');

const readPrivateFeedbackPassword = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? '';
  }

  return value?.trim() ?? '';
};

const canReadPrivateFeedback = (password: string) => verifyAdminPassword(password);

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

router.get('/private/status', (_request, response) => {
  response.json({ isPasswordConfigured: isAdminPasswordConfigured() });
});

router.post('/private/setup', (request, response) => {
  const parsedPassword = adminPasswordSchema.safeParse(request.body?.password);

  if (!parsedPassword.success) {
    response.status(400).json({ message: parsedPassword.error.issues[0]?.message ?? '管理员密码不符合要求' });
    return;
  }

  if (!createAdminPassword(parsedPassword.data)) {
    response.status(409).json({ message: '管理员密码已经设置，不能重复创建' });
    return;
  }

  response.status(201).json({ message: '管理员密码设置成功' });
});

router.get('/private', (request, response) => {
  const parsedCategory = categorySchema.optional().safeParse(request.query.category);

  if (!parsedCategory.success) {
    response.status(400).json({ message: '反馈分类不存在' });
    return;
  }

  const password = readPrivateFeedbackPassword(request.header(privateFeedbackPasswordHeader));

  if (!isAdminPasswordConfigured()) {
    response.status(503).json({ message: '管理员密码未配置' });
    return;
  }

  if (!canReadPrivateFeedback(password)) {
    response.status(401).json({ message: '管理员密码不正确' });
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