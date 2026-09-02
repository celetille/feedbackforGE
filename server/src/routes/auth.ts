import { Router } from 'express';
import { z } from 'zod';
import { accountExists, createAccount, findAccount, getPrivateAccountUsername } from '../db.js';

const router = Router();
const usernameSchema = z
  .string()
  .trim()
  .min(2, '账户名至少需要 2 个字')
  .max(24, '账户名不能超过 24 个字')
  .regex(/^[\p{L}\p{N}_-]+$/u, '账户名只能使用字母、数字、下划线或连字符');

router.get('/status', (_request, response) => {
  response.json({ hasAccount: accountExists() });
});

router.get('/current', (_request, response) => {
  const username = getPrivateAccountUsername();

  if (!username) {
    response.status(404).json({ message: '账户尚未创建' });
    return;
  }

  response.json({ username });
});

router.post('/register', (request, response) => {
  const parsedUsername = usernameSchema.safeParse(request.body?.username);

  if (!parsedUsername.success) {
    response.status(400).json({ message: parsedUsername.error.issues[0]?.message ?? '账户名不符合要求' });
    return;
  }

  if (accountExists()) {
    response.status(409).json({ message: '账户已经创建，请直接登录' });
    return;
  }

  try {
    response.status(201).json({ username: createAccount(parsedUsername.data) });
  } catch {
    response.status(409).json({ message: '账户已经创建，请直接登录' });
  }
});

router.post('/login', (request, response) => {
  const parsedUsername = usernameSchema.safeParse(request.body?.username);

  if (!parsedUsername.success) {
    response.status(400).json({ message: parsedUsername.error.issues[0]?.message ?? '账户名不符合要求' });
    return;
  }

  const username = findAccount(parsedUsername.data);
  if (!username) {
    response.status(401).json({ message: '账户名不正确，请重新输入' });
    return;
  }

  response.json({ username });
});

export default router;