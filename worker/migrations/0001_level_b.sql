-- OpenVireo level B (docs/EXTERNAL-SERVICES.md §4, decided 2026-10-27). Times are integer ms UTC; ids are 128-bit
-- random base64url. Level C (classes, members, submissions) is additive: new tables referencing users/investigations.
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  alias TEXT,
  role TEXT NOT NULL DEFAULT 'student',
  terms_version TEXT,
  age_confirmed_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE TABLE login_tokens (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);
CREATE INDEX login_tokens_email ON login_tokens(email);
CREATE INDEX login_tokens_expiry ON login_tokens(expires_at);
CREATE TABLE sessions (
  id_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE TABLE rate_limits (
  bucket TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (bucket, window_start)
);
CREATE TABLE investigations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  size_bytes INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  format TEXT NOT NULL,
  format_version INTEGER NOT NULL,
  exercises TEXT NOT NULL, -- JSON array of exercise ids whose sections the file contains (progress.ts)
  created_at INTEGER NOT NULL
);
CREATE INDEX investigations_user ON investigations(user_id, created_at);
CREATE TABLE preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  doc TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE exercise_progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  investigation_id TEXT REFERENCES investigations(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  results TEXT NOT NULL,
  deriver_version TEXT NOT NULL,
  derived_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, exercise_id)
);
-- Written only by the dev email sink (EMAIL_MODE=dev-sink with a loopback APP_ORIGIN); empty in any real deployment.
CREATE TABLE dev_outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
