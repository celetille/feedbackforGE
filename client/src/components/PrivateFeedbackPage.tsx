import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  fetchPrivateAccountStatus,
  fetchPrivateFeedback,
  loginPrivateAccount,
  setupPrivateAccount
} from '../api';
import type { Feedback } from '../types';

const formatTime = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value.replace(' ', 'T') + 'Z'));

const sortPrivateFeedback = (items: Feedback[]) =>
  [...items].sort(
    (left, right) =>
      new Date(right.createdAt.replace(' ', 'T')).getTime() -
      new Date(left.createdAt.replace(' ', 'T')).getTime()
  );

export default function PrivateFeedbackPage() {
  const [hasAccount, setHasAccount] = useState<boolean | null>(null);
  const [accountName, setAccountName] = useState('');
  const [feedback, setFeedback] = useState<Feedback[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void fetchPrivateAccountStatus()
      .then(setHasAccount)
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : '页面加载失败');
      });
  }, []);

  const isCreating = useMemo(() => hasAccount === false, [hasAccount]);

  const unlock = async (name: string) => {
    const items = await fetchPrivateFeedback(name);
    setFeedback(sortPrivateFeedback(items));
    setIsUnlocked(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedAccountName = accountName.trim();

    if (trimmedAccountName.length < 2) {
      setError('账户名至少需要 2 个字');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (isCreating) {
        await setupPrivateAccount(trimmedAccountName);
        setHasAccount(true);
      } else {
        await loginPrivateAccount(trimmedAccountName);
      }

      await unlock(trimmedAccountName);
    } catch (loadError) {
      setFeedback(null);
      setIsUnlocked(false);
      setError(loadError instanceof Error ? loadError.message : '操作失败，请稍后再试');
    } finally {
      setIsLoading(false);
    }
  };

  if (hasAccount === null) {
    return <main className="app-shell private-shell private-mode" />;
  }

  return (
    <main className="app-shell private-shell private-mode">
      {!isUnlocked ? (
        <section className="panel private-unlock-panel" aria-labelledby="private-unlock-title">
          <div className="section-heading">
            <p className="eyebrow">私密留言区</p>
            <h2 id="private-unlock-title">{isCreating ? '首次创建账户名' : '输入账户名进入'}</h2>
          </div>

          <form className="feedback-form private-unlock-form" onSubmit={handleSubmit}>
            <label className="field-block">
              <span>账户名</span>
              <input
                autoComplete={isCreating ? 'new-password' : 'username'}
                minLength={2}
                onChange={(event) => setAccountName(event.target.value)}
                type="text"
                value={accountName}
              />
            </label>

            <button className="submit-button" disabled={isLoading} type="submit">
              {isLoading ? '处理中...' : isCreating ? '创建并进入' : '进入'}
            </button>

            {error ? (
              <p className="form-message error" role="status">
                {error}
              </p>
            ) : null}
          </form>
        </section>
      ) : (
        <div className="private-list">
          {feedback && feedback.length > 0 ? (
            feedback.map((item) => (
              <article className="private-card" key={item.id}>
                <div className="card-meta">
                  <span>{item.category}</span>
                  <time dateTime={item.createdAt}>{formatTime(item.createdAt)}</time>
                </div>
                <h3>{item.title}</h3>
                {item.content ? <p>{item.content}</p> : null}
              </article>
            ))
          ) : (
            <div className="empty-state">
              <strong>还没有私密留言</strong>
            </div>
          )}
        </div>
      )}
    </main>
  );
}