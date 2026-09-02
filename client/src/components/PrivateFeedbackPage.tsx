import { FormEvent, useEffect, useState } from 'react';
import {
  fetchPrivateAccessStatus,
  fetchPrivateFeedback,
  setupPrivatePassword
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
  const [isPasswordConfigured, setIsPasswordConfigured] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [feedback, setFeedback] = useState<Feedback[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void fetchPrivateAccessStatus()
      .then(setIsPasswordConfigured)
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : '页面加载失败');
      });
  }, []);

  const unlock = async (loginPassword: string) => {
    const items = await fetchPrivateFeedback(loginPassword);
    setFeedback(sortPrivateFeedback(items));
    setIsUnlocked(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedPassword = password.trim();

    if (trimmedPassword.length < 8) {
      setError('管理员密码至少需要 8 位');
      return;
    }

    if (isPasswordConfigured === false && trimmedPassword !== confirmPassword.trim()) {
      setError('两次输入的密码不一致');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (isPasswordConfigured === false) {
        await setupPrivatePassword(trimmedPassword);
        setIsPasswordConfigured(true);
      }
      await unlock(trimmedPassword);
    } catch (loadError) {
      setFeedback(null);
      setIsUnlocked(false);
      setError(loadError instanceof Error ? loadError.message : '操作失败，请稍后再试');
    } finally {
      setIsLoading(false);
    }
  };

  if (isPasswordConfigured === null) {
    return <main className="app-shell private-shell private-mode" />;
  }

  return (
    <main className="app-shell private-shell private-mode">
      {!isUnlocked ? (
        <section className="panel private-unlock-panel" aria-labelledby="private-unlock-title">
          <div className="section-heading">
            <p className="eyebrow">私密留言区</p>
            <h2 id="private-unlock-title">
              {isPasswordConfigured ? '请输入管理员密码' : '首次设置管理员密码'}
            </h2>
          </div>

          <form className="feedback-form private-unlock-form" onSubmit={handleSubmit}>
            <label className="field-block">
              <span>管理员密码</span>
              <input
                autoComplete={isPasswordConfigured ? 'current-password' : 'new-password'}
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
            </label>

            {!isPasswordConfigured ? (
              <label className="field-block">
                <span>再次输入密码</span>
                <input
                  autoComplete="new-password"
                  minLength={8}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  type="password"
                  value={confirmPassword}
                />
              </label>
            ) : null}

            <button className="submit-button" disabled={isLoading} type="submit">
              {isLoading ? '处理中...' : isPasswordConfigured ? '登录查看' : '创建密码并登录'}
            </button>

            {error ? <p className="form-message error" role="status">{error}</p> : null}
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