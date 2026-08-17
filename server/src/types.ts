export const feedbackCategories = [
  '课程与学业',
  '校园生活与设施',
  '活动与竞赛',
  '奇思妙想与吐槽'
] as const;

export type FeedbackCategory = (typeof feedbackCategories)[number];

export type Feedback = {
  id: number;
  category: FeedbackCategory;
  title: string;
  content: string;
  supportCount: number;
  createdAt: string;
};

export type NewFeedback = {
  category: FeedbackCategory;
  title: string;
  content: string;
};