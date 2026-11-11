-- migrations/0001_initial_schema.sql
-- Cloudflare D1 SQLite schema for skipass-earlybird-checker

CREATE TABLE IF NOT EXISTS checker_configurations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  is_active INTEGER NOT NULL DEFAULT 1,
  target_date TEXT NOT NULL,
  target_label TEXT NOT NULL,
  is_mail_alert INTEGER NOT NULL DEFAULT 0,
  mail_alert_address TEXT,
  mail_alert_contact TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_checker_config_active 
ON checker_configurations(is_active);

CREATE TABLE IF NOT EXISTS checker_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  http_code TEXT,
  full_url TEXT NOT NULL,
  target_date TEXT,
  target_label TEXT,
  price REAL,
  response_text TEXT
);

CREATE INDEX IF NOT EXISTS idx_checker_history_created 
ON checker_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_checker_history_target 
ON checker_history(target_date, target_label);
