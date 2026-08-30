import { useEffect, useMemo, useState } from 'react';
import {
  fetchFeedback,
  fetchSiteStats,
  logVisit,
  submitFeedback,
  supportFeedback
} from './api';
import AdminStatsPage from './components/AdminStatsPage';
import FeedbackBoard from './components/FeedbackBoard';
import FeedbackForm from './components/FeedbackForm';
import PrivateFeedbackPage from './components/PrivateFeedbackPage';
import type {
  Feedback,
  FeedbackCategory,
  FeedbackFilter,
  NewFeedback,
  SiteStats,
  VisitDevice
} from './types';

const loggedVisitPaths = new Set<string>();

const toCategory = (filter: FeedbackFilter): FeedbackCategory | undefined =>
  filter === '全部' ? undefined : filter;

const detectDevice = (): VisitDevice => {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

const usePageVisitTracking = () => {
  useEffect(() => {
    const pathname = window.location.pathname || '/';
    const signature = `${pathname}|${detectDevice()}`;

    if (loggedVisitPaths.has(signature)) {
      return;
    }

    loggedVisitPaths.add(signature);

    void logVisit({
      path: pathname,
      referrer: document.referrer || null,
      device: detectDevice()
    }).catch(() => {
      loggedVisitPaths.delete(signature);
    });
  }, []);
};

const sortFeedback = (items: Feedback[]) =>
  [...items].sort((left, right) => {
    if (right.supportCount !== left.supportCount) {
      return right.supportCount - left.supportCount;
    }

    return new Date(right.createdAt.replace(' ', 'T')).getTime() - new Date(left.createdAt.replace(' ', 'T')).getTime();
  });

function HomePage() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [filter, setFilter] = useState<FeedbackFilter>('全部');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFeedback = async (activeFilter: FeedbackFilter) => {
    setIsLoading(true);
    setError('');

    try {
      const items = await fetchFeedback(toCategory(activeFilter));
      setFeedback(sortFeedback(items));
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
      setFeedback((items) => sortFeedback([created, ...items]));
    }
  };

  const handleSupport = async (id: number) => {
    const updated = await supportFeedback(id);
    setFeedback((items) => sortFeedback(items.map((item) => (item.id === id ? updated : item))));
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

      <a className="private-link" href="/private">
        进入私密留言区
      </a>
    </main>
  );
}

function StatsRoute() {
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = async () => {
    setIsLoading(true);
    setError('');

    try {
      const result = await fetchSiteStats();
      setStats(result);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '统计加载失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadStats();
  }, []);

  const handleRetry = () => {
    void loadStats();
  };

  return <AdminStatsPage error={error} isLoading={isLoading} onRetry={handleRetry} stats={stats} />;
}

export default function App() {
  usePageVisitTracking();

  const pathname = useMemo(() => window.location.pathname || '/', []);

  if (pathname.startsWith('/private')) {
    return <PrivateFeedbackPage />;
  }

  if (pathname.startsWith('/admin/stats')) {
    return <StatsRoute />;
  }

  return <HomePage />;
}