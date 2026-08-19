import { feedbackCategories, type Feedback, type FeedbackFilter } from '../types';

const filters: FeedbackFilter[] = ['全部', ...feedbackCategories];

const formatTime = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value.replace(' ', 'T') + 'Z'));

type FeedbackBoardProps = {
  feedback: Feedback[];
  filter: FeedbackFilter;
  isLoading: boolean;
  error: string;
  onFilterChange: (filter: FeedbackFilter) => void;
  onSupport: (id: number) => Promise<void>;
};

export default function FeedbackBoard({
  feedback,
  filter,
  isLoading,
  error,
  onFilterChange,
  onSupport
}: FeedbackBoardProps) {
  return (
    <section className="panel board-panel" aria-labelledby="feedback-board-title">
      <div className="section-heading board-heading">
        <div>
          <p className="eyebrow">公开看板</p>
          <h2 id="feedback-board-title">大家正在关心什么</h2>
          <p>默认按支持量从多到少排序，支持按分类快速筛选。</p>
        </div>
        <span className="feedback-count">{feedback.length} 条</span>
      </div>

      <div className="filter-bar" aria-label="反馈分类筛选">
        {filters.map((item) => (
          <button
            className={`filter-chip ${filter === item ? 'active' : ''}`}
            key={item}
            onClick={() => onFilterChange(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>

      {error ? <p className="state-message error">{error}</p> : null}
      {isLoading ? <p className="state-message">正在加载反馈...</p> : null}

      {!isLoading && !error && feedback.length === 0 ? (
        <div className="empty-state">
          <strong>还没有这类反馈</strong>
          <p>成为第一个提出想法的人。</p>
        </div>
      ) : null}

      <div className="card-grid">
        {feedback.map((item) => (
          <article className="feedback-card" key={item.id}>
            <div className="card-meta">
              <span>{item.category}</span>
              <time dateTime={item.createdAt}>{formatTime(item.createdAt)}</time>
            </div>
            <h3>{item.title}</h3>
            {item.content ? <p>{item.content}</p> : null}
            <button className="support-button" onClick={() => onSupport(item.id)} type="button">
              支持 {item.supportCount}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}