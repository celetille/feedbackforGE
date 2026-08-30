export const feedbackCategories = [
  '课程与学业',
  '校园生活与设施',
  '活动与竞赛',
  '奇思妙想与吐槽'
] as const;

export type FeedbackCategory = (typeof feedbackCategories)[number];
export type FeedbackFilter = '全部' | FeedbackCategory;

export type Feedback = {
  id: number;
  category: FeedbackCategory;
  title: string;
  content: string;
  supportCount: number;
  createdAt: string;
  isPrivate: boolean;
};

export type NewFeedback = {
  category: FeedbackCategory;
  title: string;
  content: string;
  isPrivate?: boolean;
};

export type VisitDevice = 'mobile' | 'tablet' | 'desktop';

export type PageVisit = {
  id: number;
  path: string;
  referrer: string | null;
  device: VisitDevice;
  createdAt: string;
};

export type CountBucket = {
  label: string;
  count: number;
};

export type DailyTrafficPoint = {
  date: string;
  count: number;
};

export type SiteStats = {
  summary: {
    totalVisits: number;
    todayVisits: number;
    weekVisits: number;
    uniquePages: number;
    totalFeedback: number;
    todayFeedback: number;
    totalSupports: number;
    mobileVisits: number;
    tabletVisits: number;
    desktopVisits: number;
  };
  pageBreakdown: CountBucket[];
  categoryBreakdown: Array<{ category: FeedbackCategory; count: number }>;
  deviceBreakdown: Array<{ device: VisitDevice; count: number }>;
  dailyTraffic: DailyTrafficPoint[];
  recentVisits: PageVisit[];
  topReferrers: CountBucket[];
};