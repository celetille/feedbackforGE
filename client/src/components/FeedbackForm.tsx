import { FormEvent, useMemo, useState } from 'react';
import { feedbackCategories, type FeedbackCategory, type NewFeedback } from '../types';

const TITLE_LIMIT = 60;
const CONTENT_LIMIT = 600;

type FeedbackFormProps = {
  onSubmit: (feedback: NewFeedback) => Promise<void>;
};

export default function FeedbackForm({ onSubmit }: FeedbackFormProps) {
  const [category, setCategory] = useState<FeedbackCategory | ''>('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validationMessage = useMemo(() => {
    if (!category) return '请选择一个反馈分类';
    if (title.trim().length < 2) return '标题至少需要 2 个字';
    if (title.length > TITLE_LIMIT) return '标题字数超出限制';
    if (content.length > CONTENT_LIMIT) return '内容字数超出限制';
    return '';
  }, [category, content, title]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (validationMessage || !category) {
      setMessage(validationMessage);
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      await onSubmit({
        category,
        title: title.trim(),
        content: content.trim()
      });
      setCategory('');
      setTitle('');
      setContent('');
      setMessage('提交成功，感谢你让校园变得更好。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '提交失败，请稍后再试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="panel feedback-form-panel" aria-labelledby="feedback-form-title">
      <div className="section-heading">
        <p className="eyebrow">匿名入口</p>
        <h2 id="feedback-form-title">提交你的校园反馈</h2>
        <p>无需登录，不填写姓名、学号或联系方式；只填标题也可以发布。</p>
      </div>

      <form className="feedback-form" onSubmit={handleSubmit}>
        <fieldset>
          <legend>反馈分类</legend>
          <div className="category-grid">
            {feedbackCategories.map((item) => (
              <button
                aria-pressed={category === item}
                className={`chip ${category === item ? 'active' : ''}`}
                key={item}
                onClick={() => setCategory(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="feedback-fields-card">
          <label className="field-block">
            <span>标题</span>
            <input
              maxLength={TITLE_LIMIT + 10}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例如：图书馆自习区插座不够用"
              value={title}
            />
            <small className={title.length > TITLE_LIMIT ? 'over-limit' : ''}>{title.length}/{TITLE_LIMIT}</small>
          </label>

          <label className="field-block">
            <span>反馈内容（选填）</span>
            <textarea
              maxLength={CONTENT_LIMIT + 40}
              onChange={(event) => setContent(event.target.value)}
              placeholder="可以补充具体场景、影响和你期待的改进方向。"
              rows={8}
              value={content}
            />
            <small className={content.length > CONTENT_LIMIT ? 'over-limit' : ''}>{content.length}/{CONTENT_LIMIT}</small>
          </label>
        </div>

        <button className="submit-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? '提交中...' : '提交匿名反馈'}
        </button>

        {message ? <p className="form-message" role="status">{message}</p> : null}
      </form>
    </section>
  );
}