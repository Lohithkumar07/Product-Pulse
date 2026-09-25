import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_FILE = path.resolve(process.cwd(), 'productpulse.sqlite');

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    try {
      const buffer = fs.readFileSync(DB_FILE);
      dbInstance = new SQL.Database(buffer);
    } catch (err) {
      console.warn('Could not read existing SQLite database, creating fresh one:', err);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  // Enable foreign keys
  dbInstance.run("PRAGMA foreign_keys = ON;");

  initSchema(dbInstance);
  saveDb();
  return dbInstance;
}

export function saveDb(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Error saving SQLite database to file:', err);
  }
}

function initSchema(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS datasets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      filename TEXT NOT NULL,
      row_count INTEGER DEFAULT 0,
      analysis_status TEXT DEFAULT 'completed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      dataset_id TEXT,
      product_id TEXT NOT NULL,
      content TEXT NOT NULL,
      rating INTEGER DEFAULT 3,
      source TEXT DEFAULT 'Website',
      date TEXT NOT NULL,
      sentiment TEXT NOT NULL, -- positive, neutral, negative
      sentiment_score REAL DEFAULT 0,
      sentiment_confidence REAL DEFAULT 0.85,
      topic TEXT NOT NULL,
      priority TEXT NOT NULL, -- high, medium, low
      issue_group TEXT,
      ai_summary TEXT,
      detected_problem TEXT,
      possible_cause TEXT,
      user_impact TEXT,
      suggested_action TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS decisions (
      id TEXT PRIMARY KEY,
      dataset_id TEXT,
      product_id TEXT NOT NULL,
      title TEXT NOT NULL,
      affected_feature TEXT NOT NULL,
      priority TEXT NOT NULL, -- high, medium, low
      trend TEXT DEFAULT 'increasing', -- increasing, stable, decreasing
      supporting_feedback_count INTEGER DEFAULT 1,
      suggested_action TEXT NOT NULL,
      status TEXT DEFAULT 'Planned', -- New, Reviewing, Planned, In Progress, Completed, Rejected
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      dataset_id TEXT,
      product_id TEXT NOT NULL,
      title TEXT NOT NULL,
      period TEXT DEFAULT '30d',
      content_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );
  `);

  // Safe column migrations for existing tables
  try {
    db.run('ALTER TABLE feedback ADD COLUMN dataset_id TEXT;');
  } catch (e) {
    // Column already exists
  }
  try {
    db.run('ALTER TABLE decisions ADD COLUMN dataset_id TEXT;');
  } catch (e) {
    // Column already exists
  }
  try {
    db.run('ALTER TABLE reports ADD COLUMN dataset_id TEXT;');
  } catch (e) {
    // Column already exists
  }

  // Safe index creation
  try {
    db.run(`
      CREATE INDEX IF NOT EXISTS idx_datasets_created ON datasets(created_at);
      CREATE INDEX IF NOT EXISTS idx_feedback_dataset ON feedback(dataset_id);
      CREATE INDEX IF NOT EXISTS idx_feedback_product ON feedback(product_id);
      CREATE INDEX IF NOT EXISTS idx_feedback_sentiment ON feedback(sentiment);
      CREATE INDEX IF NOT EXISTS idx_feedback_topic ON feedback(topic);
      CREATE INDEX IF NOT EXISTS idx_feedback_priority ON feedback(priority);
      CREATE INDEX IF NOT EXISTS idx_feedback_date ON feedback(date);
      CREATE INDEX IF NOT EXISTS idx_decisions_dataset ON decisions(dataset_id);
      CREATE INDEX IF NOT EXISTS idx_decisions_product ON decisions(product_id);
      CREATE INDEX IF NOT EXISTS idx_reports_dataset ON reports(dataset_id);
    `);
  } catch (e) {
    console.warn('Index creation warning:', e);
  }
}
