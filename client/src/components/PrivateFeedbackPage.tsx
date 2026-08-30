import { useEffect, useState } from 'react';
import { fetchPrivateFeedback, submitPrivateFeedback } from '../api';
import FeedbackForm from './FeedbackForm';
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
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFeedback = async () => {
    setIsLoading(true);
    setError('');

    try {
      setFeedback(sortPrivateFeedback(await fetchPrivateFeedback()));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '私密留言加载失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadFeedback();
  }, []);

  const handleSubmit = async (item: Parameters<typeof submitPrivateFeedback>[0]) => {
    const created = await submitPrivateFeedback(item);
    setFeedback((items) => sortPrivateFeedback([created, ...items]));
  };

  return (
    <main className="app-shell private-shell">
      <header className="hero private-hero">
        <div>
          <p className="eyebrow">私密留言区</p>
          <h1>只在这里查看的留言</h1>
          <p className="private-intro">
            通过私密入口提交的内容不会出现在公开看板中。此页面依靠网址保密，不等同于账号权限保护。
          </p>
        </div>
        <a className="home-link" href="/">
          返回公开看板
        </a>
      </header>

      <div className="private-layout">
        <FeedbackForm onSubmit={handleSubmit} />
        <section className="panel private-board" aria-labelledby="private-board-title">
          <div className="section-heading board-heading">
            <div>
              <p className="eyebrow">仅限私密入口</p>
              <h2 id="private-board-title">私密留言</h2>
              <p>这些留言不会混入公开面板。</p>
            </div>
            <span className="feedback-count">{feedback.length} 条</span>
          </div>

          {error ? <p className="state-message error">{error}</p> : null}
          {isLoading ? <p className="state-message">正在加载私密留言...</p> : null}
          {!isLoading && !error && feedback.length === 0 ? (
            <div className="empty-state">
              <strong>还没有私密留言</strong>
              <p>想说的话可以从左侧开始。</p>
            </div>
          ) : null}

          <div className="private-list">
            {feedback.map((item) => (
              <article className="private-card" key={item.id}>
                <div className="card-meta">
                  <span>{item.category}</span>
                  <time dateTime={item.createdAt}>{formatTime(item.createdAt)}</time>
                </div>
                <h3>{item.title}</h3>
                {item.content ? <p>{item.content}</p> : null}
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}