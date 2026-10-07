-- Care Circle — D1 schema (v2, consolidated)
-- A "case" is the full CareProfile document (patient, emergencyContacts, dischargeInstructions,
-- consent, medications[], tasks[]) stored as JSON in cases.data, matching the existing frontend
-- API shape exactly. Relational tables cover identity, roles, invitations and audit.

DROP TABLE IF EXISTS case_invitations;
DROP TABLE IF EXISTS case_members;
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS cases;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS medications;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS task_comments;

CREATE TABLE users (
  id            TEXT NOT NULL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'caregiver',
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE cases (
  id                TEXT NOT NULL PRIMARY KEY,
  coordinator_id    TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  patient_name      TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'active',
  consent_given     INTEGER NOT NULL DEFAULT 0,
  data              TEXT NOT NULL DEFAULT '{}',
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);
CREATE INDEX idx_cases_coordinator ON cases(coordinator_id);
CREATE INDEX idx_cases_status ON cases(status);

CREATE TABLE case_members (
  id         TEXT NOT NULL PRIMARY KEY,
  case_id    TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(case_id, user_id)
);
CREATE INDEX idx_case_members_user ON case_members(user_id);
CREATE INDEX idx_case_members_case ON case_members(case_id);

CREATE TABLE case_invitations (
  id          TEXT NOT NULL PRIMARY KEY,
  case_id     TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  token       TEXT NOT NULL,
  expires_at  TEXT,
  created_at  TEXT NOT NULL,
  invited_by  TEXT,
  accepted_at TEXT,
  accepted_by TEXT,
  revoked_at  TEXT,
  revoked_by  TEXT
);
CREATE INDEX idx_invitations_case ON case_invitations(case_id, status);
CREATE INDEX idx_invitations_email ON case_invitations(email, status);

CREATE TABLE audit_log (
  id          TEXT NOT NULL PRIMARY KEY,
  ts          TEXT NOT NULL,
  user_id     TEXT,
  case_id     TEXT,
  action      TEXT NOT NULL,
  entity      TEXT,
  entity_id   TEXT,
  details     TEXT,
  before_json TEXT,
  after_json  TEXT
);
CREATE INDEX idx_audit_case ON audit_log(case_id);