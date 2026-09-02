import { useEffect, useState } from 'react';
import { fetchPrivateFeedback } from '../api';
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

  return (
    <main className="app-shell private-shell private-mode">
      {error ? <p className="state-message error">{error}</p> : null}
      {isLoading ? <p className="state-message">正在加载私密留言...</p> : null}
      {!isLoading && !error && feedback.length === 0 ? (
        <div className="empty-state">
          <strong>还没有私密留言</strong>
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
    </main>
  );
}