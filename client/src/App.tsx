import { useEffect, useState } from 'react';
import { fetchFeedback, submitFeedback, supportFeedback } from './api';
import FeedbackBoard from './components/FeedbackBoard';
import FeedbackForm from './components/FeedbackForm';
import type { Feedback, FeedbackCategory, FeedbackFilter, NewFeedback } from './types';

const toCategory = (filter: FeedbackFilter): FeedbackCategory | undefined =>
  filter === '全部' ? undefined : filter;

export default function App() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [filter, setFilter] = useState<FeedbackFilter>('全部');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFeedback = async (activeFilter: FeedbackFilter) => {
    setIsLoading(true);
    setError('');

    try {
      const items = await fetchFeedback(toCategory(activeFilter));
      setFeedback(items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '看板加载失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadFeedback(filter);
  }, [filter]);

  const handleSubmit = async (newFeedback: NewFeedback) => {
    const created = await submitFeedback(newFeedback);

    if (filter === '全部' || filter === created.category) {
      setFeedback((items) => [created, ...items]);
    }
  };

  const handleSupport = async (id: number) => {
    const updated = await supportFeedback(id);
    setFeedback((items) => items.map((item) => (item.id === id ? updated : item)));
  };

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Campus Voice</p>
          <h1>校园意见箱与公开面板</h1>
        </div>
      </header>

      <div className="content-layout">
        <FeedbackForm onSubmit={handleSubmit} />
        <FeedbackBoard
          error={error}
          feedback={feedback}
          filter={filter}
          isLoading={isLoading}
          onFilterChange={setFilter}
          onSupport={handleSupport}
        />
      </div>
    </main>
  );
}