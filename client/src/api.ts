import type { Feedback, FeedbackCategory, NewFeedback } from './types';

const jsonHeaders = {
  'Content-Type': 'application/json'
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';
const apiPath = (path: string) => `${apiBaseUrl}${path}`;

const readError = async (response: Response) => {
  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  return body?.message ?? '请求失败，请稍后再试';
};

export const fetchFeedback = async (category?: FeedbackCategory): Promise<Feedback[]> => {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  const response = await fetch(apiPath(`/api/feedback${query}`));

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const body = (await response.json()) as { feedback: Feedback[] };
  return body.feedback;
};

export const submitFeedback = async (feedback: NewFeedback): Promise<Feedback> => {
  const response = await fetch(apiPath('/api/feedback'), {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(feedback)
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const body = (await response.json()) as { feedback: Feedback };
  return body.feedback;
};

export const supportFeedback = async (id: number): Promise<Feedback> => {
  const response = await fetch(apiPath(`/api/feedback/${id}/support`), { method: 'POST' });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const body = (await response.json()) as { feedback: Feedback };
  return body.feedback;
};