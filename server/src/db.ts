import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  CountBucket,
  DailyTrafficPoint,
  Feedback,
  FeedbackCategory,
  NewFeedback,
  PageVisit,
  SiteStats,
  VisitDevice
} from './types.js';

const currentDir = dirname(fileURLToPath(import.meta.url));
const dataDir = join(currentDir, '..', 'data');
const configuredPath = process.env.DATABASE_PATH?.trim();
const databasePath = configuredPath
  ? isAbsolute(configuredPath)
    ? configuredPath
    : join(process.cwd(), configuredPath)
  : join(dataDir, 'feedback.sqlite');

mkdirSync(dirname(databasePath), { recursive: true });

const db = new DatabaseSync(databasePath);
db.exec('PRAGMA journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    support_count INTEGER NOT NULL DEFAULT 0,
    is_private INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS page_visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL,
    referrer TEXT,
    device TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_feedback_category ON feedback(category);
  CREATE INDEX IF NOT EXISTS idx_page_visits_created_at ON page_visits(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_page_visits_path ON page_visits(path);
`);

const feedbackColumns = db.prepare('PRAGMA table_info(feedback)').all() as Array<{ name: string }>;
if (!feedbackColumns.some((column) => column.name === 'is_private')) {
  db.exec('ALTER TABLE feedback ADD COLUMN is_private INTEGER NOT NULL DEFAULT 0');
}

type FeedbackRow = {
  id: number;
  category: FeedbackCategory;
  title: string;
  content: string;
  support_count: number;
  is_private: number;
  created_at: string;
};

type VisitRow = {
  id: number;
  path: string;
  referrer: string | null;
  device: VisitDevice;
  created_at: string;
};

const mapFeedback = (row: FeedbackRow): Feedback => ({
  id: row.id,
  category: row.category,
  title: row.title,
  content: row.content,
  supportCount: row.support_count,
  createdAt: row.created_at,
  isPrivate: row.is_private === 1
});

const mapVisit = (row: VisitRow): PageVisit => ({
  id: row.id,
  path: row.path,
  referrer: row.referrer,
  device: row.device,
  createdAt: row.created_at
});

const getCount = (
  sql: string,
  params: Array<string | number | bigint | null | Uint8Array | Buffer> = []
): number => {
  const row = db.prepare(sql).get(...params) as { count?: number } | undefined;
  return row?.count ?? 0;
};

const getBuckets = <T extends CountBucket>(sql: string, rowsKey: string): T[] => {
  const rows = db.prepare(sql).all() as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    label: String(row[rowsKey]),
    count: Number(row.count ?? 0)
  })) as T[];
};

export const hasPrivateAccount = (): boolean => getCount('SELECT COUNT(*) AS count FROM accounts') > 0;

export const createPrivateAccount = (username: string): boolean => {
  const result = db.prepare('INSERT INTO accounts (username) VALUES (?)').run(username);
  return result.changes === 1;
};

export const verifyPrivateAccount = (username: string): boolean => {
  const row = db.prepare('SELECT username FROM accounts WHERE username = ?').get(username) as
    | { username: string }
    | undefined;
  return row?.username === username;
};

export const accountExists = hasPrivateAccount;

export const createAccount = (username: string): string => {
  createPrivateAccount(username);
  return username;
};

export const findAccount = (username: string): string | null =>
  verifyPrivateAccount(username) ? username : null;

export const listFeedback = (
  category?: FeedbackCategory,
  isPrivate = false
): Feedback[] => {
  const visibilityClause = isPrivate ? 'is_private = 1' : 'is_private = 0';
  const rows = category
    ? db
        .prepare(
          `SELECT id, category, title, content, support_count, is_private, created_at
           FROM feedback
           WHERE category = ? AND ${visibilityClause}
           ORDER BY support_count DESC, datetime(created_at) DESC, id DESC`
        )
        .all(category)
    : db
        .prepare(
          `SELECT id, category, title, content, support_count, is_private, created_at
           FROM feedback
           WHERE ${visibilityClause}
           ORDER BY support_count DESC, datetime(created_at) DESC, id DESC`
        )
        .all();

  return rows.map((row) => mapFeedback(row as FeedbackRow));
};

export const createFeedback = (feedback: NewFeedback): Feedback => {
  const result = db
    .prepare('INSERT INTO feedback (category, title, content, is_private) VALUES (?, ?, ?, ?)')
    .run(feedback.category, feedback.title, feedback.content, feedback.isPrivate ? 1 : 0);

  const row = db
    .prepare(
      `SELECT id, category, title, content, support_count, is_private, created_at
       FROM feedback
       WHERE id = ?`
    )
    .get(result.lastInsertRowid);

  return mapFeedback(row as FeedbackRow);
};

export const supportFeedback = (id: number, isPrivate = false): Feedback | null => {
  const visibilityClause = isPrivate ? 'is_private = 1' : 'is_private = 0';
  const result = db
    .prepare(`UPDATE feedback SET support_count = support_count + 1 WHERE id = ? AND ${visibilityClause}`)
    .run(id);

  if (result.changes === 0) {
    return null;
  }

  const row = db
    .prepare(
      `SELECT id, category, title, content, support_count, is_private, created_at
       FROM feedback
       WHERE id = ? AND ${visibilityClause}`
    )
    .get(id);

  return mapFeedback(row as FeedbackRow);
};

export const logPageVisit = (visit: {
  path: string;
  referrer: string | null;
  device: VisitDevice;
}): PageVisit => {
  const result = db
    .prepare('INSERT INTO page_visits (path, referrer, device) VALUES (?, ?, ?)')
    .run(visit.path, visit.referrer, visit.device);

  const row = db
    .prepare(
      `SELECT id, path, referrer, device, created_at
       FROM page_visits
       WHERE id = ?`
    )
    .get(result.lastInsertRowid);

  return mapVisit(row as VisitRow);
};

const buildDailyTraffic = (): DailyTrafficPoint[] => {
  const rows = db
    .prepare(
      `SELECT date(created_at, 'localtime') AS day, COUNT(*) AS count
       FROM page_visits
       WHERE created_at >= datetime('now', '-6 days')
       GROUP BY day
       ORDER BY day ASC`
    )
    .all() as Array<{ day: string; count: number }>;

  const counts = new Map(rows.map((row) => [row.day, row.count]));
  const baseDate = new Date();

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() - (6 - index));
    const day = date.toISOString().slice(0, 10);

    return {
      date: day,
      count: counts.get(day) ?? 0
    };
  });
};

const buildRecentVisits = (): PageVisit[] => {
  const rows = db
    .prepare(
      `SELECT id, path, referrer, device, created_at
       FROM page_visits
       ORDER BY datetime(created_at) DESC, id DESC
       LIMIT 20`
    )
    .all() as VisitRow[];

  return rows.map((row) => mapVisit(row));
};

const buildBreakdown = (
  sql: string,
  key: string
): CountBucket[] =>
  db
    .prepare(sql)
    .all()
    .map((row) => ({
      label: String((row as Record<string, unknown>)[key]),
      count: Number((row as Record<string, unknown>).count ?? 0)
    }));

export const getSiteStats = (): SiteStats => {
  const totalVisits = getCount('SELECT COUNT(*) AS count FROM page_visits');
  const todayVisits = getCount(
    `SELECT COUNT(*) AS count
     FROM page_visits
     WHERE date(created_at, 'localtime') = date('now', 'localtime')`
  );
  const weekVisits = getCount(
    `SELECT COUNT(*) AS count
     FROM page_visits
     WHERE datetime(created_at) >= datetime('now', '-6 days')`
  );
  const totalFeedback = getCount('SELECT COUNT(*) AS count FROM feedback');
  const todayFeedback = getCount(
    `SELECT COUNT(*) AS count
     FROM feedback
     WHERE date(created_at, 'localtime') = date('now', 'localtime')`
  );
  const totalSupports = getCount('SELECT COALESCE(SUM(support_count), 0) AS count FROM feedback');
  const uniquePages = getCount('SELECT COUNT(DISTINCT path) AS count FROM page_visits');
  const deviceBreakdown = buildBreakdown(
    `SELECT device AS label, COUNT(*) AS count
     FROM page_visits
     GROUP BY device
     ORDER BY count DESC, device ASC`,
    'label'
  ).map((item) => ({
    device: item.label as VisitDevice,
    count: item.count
  }));
  const categoryBreakdown = buildBreakdown(
    `SELECT category AS label, COUNT(*) AS count
     FROM feedback
     GROUP BY category
     ORDER BY count DESC, category ASC`,
    'label'
  ).map((item) => ({
    category: item.label as FeedbackCategory,
    count: item.count
  }));
  const pageBreakdown = buildBreakdown(
    `SELECT path AS label, COUNT(*) AS count
     FROM page_visits
     GROUP BY path
     ORDER BY count DESC, path ASC`,
    'label'
  );
  const topReferrers = buildBreakdown(
    `SELECT COALESCE(referrer, '直接访问') AS label, COUNT(*) AS count
     FROM page_visits
     WHERE referrer IS NOT NULL AND referrer <> ''
     GROUP BY COALESCE(referrer, '直接访问')
     ORDER BY count DESC, label ASC
     LIMIT 8`,
    'label'
  );

  return {
    summary: {
      totalVisits,
      todayVisits,
      weekVisits,
      uniquePages,
      totalFeedback,
      todayFeedback,
      totalSupports,
      mobileVisits: deviceBreakdown.find((item) => item.device === 'mobile')?.count ?? 0,
      tabletVisits: deviceBreakdown.find((item) => item.device === 'tablet')?.count ?? 0,
      desktopVisits: deviceBreakdown.find((item) => item.device === 'desktop')?.count ?? 0
    },
    pageBreakdown,
    categoryBreakdown,
    deviceBreakdown,
    dailyTraffic: buildDailyTraffic(),
    recentVisits: buildRecentVisits(),
    topReferrers
  };
};