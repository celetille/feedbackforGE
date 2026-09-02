import { Router } from 'express';
import { z } from 'zod';
import { createFeedback, hasPrivateAccount, listFeedback, supportFeedback, verifyPrivateAccount, createPrivateAccount } from '../db.js';
import { feedbackCategories } from '../types.js';

const router = Router();

const categorySchema = z.enum(feedbackCategories);
const accountNameSchema = z.string().trim().min(2, '密码至少需要 2 个字').max(32, '密码不能超过 32 个字');

const readPrivateAccountName = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? '';
  }

  return value?.trim() ?? '';
};

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
  response.json({ hasAccount: hasPrivateAccount() });
});

router.post('/private/setup', (request, response) => {
  const parsedAccountName = accountNameSchema.safeParse(request.body?.accountName);

  if (!parsedAccountName.success) {
    response.status(400).json({ message: parsedAccountName.error.issues[0]?.message ?? '密码不符合要求' });
    return;
  }

  if (hasPrivateAccount()) {
    response.status(409).json({ message: '密码已经创建过，不能重复创建' });
    return;
  }

  if (!createPrivateAccount(parsedAccountName.data)) {
    response.status(500).json({ message: '密码创建失败' });
    return;
  }

  response.status(201).json({ accountName: parsedAccountName.data });
});

router.post('/private/login', (request, response) => {
  const parsedAccountName = accountNameSchema.safeParse(request.body?.accountName);

  if (!parsedAccountName.success) {
    response.status(400).json({ message: parsedAccountName.error.issues[0]?.message ?? '密码不符合要求' });
    return;
  }

  if (!hasPrivateAccount()) {
    response.status(503).json({ message: '密码尚未创建' });
    return;
  }

  if (!verifyPrivateAccount(parsedAccountName.data)) {
    response.status(401).json({ message: '密码不正确' });
    return;
  }

  response.json({ accountName: parsedAccountName.data });
});

router.get('/private', (request, response) => {
  const parsedCategory = categorySchema.optional().safeParse(request.query.category);

  if (!parsedCategory.success) {
    response.status(400).json({ message: '反馈分类不存在' });
    return;
  }

  const accountName = readPrivateAccountName(request.header('x-private-account-name'));

  if (!hasPrivateAccount()) {
    response.status(503).json({ message: '密码尚未创建' });
    return;
  }

  if (!verifyPrivateAccount(accountName)) {
    response.status(401).json({ message: '密码不正确' });
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