import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Feedback, FeedbackCategory, NewFeedback } from './types.js';

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
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_feedback_category ON feedback(category);
`);

type FeedbackRow = {
  id: number;
  category: FeedbackCategory;
  title: string;
  content: string;
  support_count: number;
  created_at: string;
};

const mapFeedback = (row: FeedbackRow): Feedback => ({
  id: row.id,
  category: row.category,
  title: row.title,
  content: row.content,
  supportCount: row.support_count,
  createdAt: row.created_at
});

export const listFeedback = (category?: FeedbackCategory): Feedback[] => {
  const rows = category
    ? db
        .prepare(
          `SELECT id, category, title, content, support_count, created_at
           FROM feedback
           WHERE category = ?
           ORDER BY datetime(created_at) DESC, id DESC`
        )
        .all(category)
    : db
        .prepare(
          `SELECT id, category, title, content, support_count, created_at
           FROM feedback
           ORDER BY datetime(created_at) DESC, id DESC`
        )
        .all();

  return rows.map((row) => mapFeedback(row as FeedbackRow));
};

export const createFeedback = (feedback: NewFeedback): Feedback => {
  const result = db
    .prepare('INSERT INTO feedback (category, title, content) VALUES (?, ?, ?)')
    .run(feedback.category, feedback.title, feedback.content);

  const row = db
    .prepare(
      `SELECT id, category, title, content, support_count, created_at
       FROM feedback
       WHERE id = ?`
    )
    .get(result.lastInsertRowid);

  return mapFeedback(row as FeedbackRow);
};

export const supportFeedback = (id: number): Feedback | null => {
  const result = db
    .prepare('UPDATE feedback SET support_count = support_count + 1 WHERE id = ?')
    .run(id);

  if (result.changes === 0) {
    return null;
  }

  const row = db
    .prepare(
      `SELECT id, category, title, content, support_count, created_at
       FROM feedback
       WHERE id = ?`
    )
    .get(id);

  return mapFeedback(row as FeedbackRow);
};