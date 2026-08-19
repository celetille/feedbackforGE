import type { DailyTrafficPoint, PageVisit, SiteStats } from '../types';

type AdminStatsPageProps = {
  stats: SiteStats | null;
  isLoading: boolean;
  error: string;
  onRetry: () => void;
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value.replace(' ', 'T') + 'Z'));

const formatDayLabel = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', weekday: 'short' }).format(
    new Date(value + 'T00:00:00+08:00')
  );

const formatDevice = (device: PageVisit['device']) => {
  if (device === 'mobile') return '手机';
  if (device === 'tablet') return '平板';
  return '电脑';
};

const formatPath = (path: string) => (path === '/' ? '首页' : path);

const StatCard = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <article className="metric-card">
    <span>{label}</span>
    <strong>{value}</strong>
    {hint ? <small>{hint}</small> : null}
  </article>
);

const sparkWidth = 100;
const sparkHeight = 48;

const buildSparkPath = (points: DailyTrafficPoint[]) => {
  if (points.length === 0) return '';

  const max = Math.max(...points.map((point) => point.count), 1);
  const step = points.length === 1 ? 0 : sparkWidth / (points.length - 1);

  return points
    .map((point, index) => {
      const x = index * step;
      const y = sparkHeight - (point.count / max) * (sparkHeight - 4) - 2;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
};

export default function AdminStatsPage({ stats, isLoading, error, onRetry }: AdminStatsPageProps) {
  return (
    <main className="app-shell stats-shell">
      <header className="hero stats-hero">
        <div>
          <p className="eyebrow">访问统计后台</p>
          <h1>校园意见箱运行概览</h1>
          <p className="stats-intro">
            这里展示的是匿名访问和反馈聚合数据，只统计时间、设备、路径和来源，不记录姓名、手机号或账号。
          </p>
        </div>
        <a className="home-link" href="/">
          返回意见箱首页
        </a>
      </header>

      {error ? (
        <div className="stats-alert">
          <p className="state-message error">{error}</p>
          <button className="inline-action" onClick={onRetry} type="button">
            重试
          </button>
        </div>
      ) : null}

      {isLoading || !stats ? (
        <section className="panel stats-panel">
          <p className="state-message">正在加载访问统计...</p>
        </section>
      ) : (
        <div className="stats-grid">
          <section className="panel stats-panel stats-summary">
            <div className="stats-summary-grid">
              <StatCard label="总访问" value={String(stats.summary.totalVisits)} hint="累计打开页面的次数" />
              <StatCard label="今日访问" value={String(stats.summary.todayVisits)} hint="今天已经访问了多少次" />
              <StatCard label="近 7 天访问" value={String(stats.summary.weekVisits)} hint="最近一周的流量" />
              <StatCard label="今日反馈" value={String(stats.summary.todayFeedback)} hint="今天新增的匿名反馈" />
              <StatCard label="总反馈" value={String(stats.summary.totalFeedback)} hint="所有分类的反馈数量" />
              <StatCard label="总支持" value={String(stats.summary.totalSupports)} hint="反馈被支持的总次数" />
            </div>
          </section>

          <section className="panel stats-panel">
            <div className="section-heading">
              <p className="eyebrow">访问趋势</p>
              <h2>最近 7 天页面访问</h2>
            </div>
            <div className="spark-card">
              <svg viewBox={`0 0 ${sparkWidth} ${sparkHeight}`} aria-hidden="true" className="sparkline">
                <path d={buildSparkPath(stats.dailyTraffic)} />
              </svg>
              <div className="spark-labels">
                {stats.dailyTraffic.map((point) => (
                  <span key={point.date}>
                    {formatDayLabel(point.date)} · {point.count}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="panel stats-panel">
            <div className="section-heading">
              <p className="eyebrow">设备分布</p>
              <h2>访问终端</h2>
            </div>
            <div className="breakdown-list">
              {stats.deviceBreakdown.map((item) => (
                <div className="breakdown-row" key={item.device}>
                  <span>{formatDevice(item.device)}</span>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
            <div className="mini-metrics">
              <StatCard label="手机" value={String(stats.summary.mobileVisits)} />
              <StatCard label="平板" value={String(stats.summary.tabletVisits)} />
              <StatCard label="电脑" value={String(stats.summary.desktopVisits)} />
            </div>
          </section>

          <section className="panel stats-panel">
            <div className="section-heading">
              <p className="eyebrow">页面热度</p>
              <h2>访问路径</h2>
            </div>
            <div className="breakdown-list">
              {stats.pageBreakdown.length === 0 ? (
                <p className="state-message">还没有页面访问记录。</p>
              ) : (
                stats.pageBreakdown.map((item) => (
                  <div className="breakdown-row" key={item.label}>
                    <span>{formatPath(item.label)}</span>
                    <strong>{item.count}</strong>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="panel stats-panel">
            <div className="section-heading">
              <p className="eyebrow">反馈分类</p>
              <h2>各分类反馈数量</h2>
            </div>
            <div className="breakdown-list">
              {stats.categoryBreakdown.map((item) => (
                <div className="breakdown-row" key={item.category}>
                  <span>{item.category}</span>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="panel stats-panel stats-wide">
            <div className="section-heading">
              <p className="eyebrow">最近访问</p>
              <h2>访问记录</h2>
            </div>
            <div className="visit-table">
              <div className="visit-table-head">
                <span>时间</span>
                <span>路径</span>
                <span>设备</span>
                <span>来源</span>
              </div>
              {stats.recentVisits.length === 0 ? (
                <p className="state-message">当前没有访问记录。</p>
              ) : (
                stats.recentVisits.map((visit) => (
                  <div className="visit-table-row" key={visit.id}>
                    <span>{formatDateTime(visit.createdAt)}</span>
                    <span>{formatPath(visit.path)}</span>
                    <span>{formatDevice(visit.device)}</span>
                    <span>{visit.referrer || '直接访问'}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}