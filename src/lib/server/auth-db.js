import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, 'data');
const DB_PATH = path.join(DATA_DIR, 'suryqata-auth.db');

export const SESSION_COOKIE = 'suryqata_session';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER,
    mode TEXT NOT NULL,
    display_name TEXT NOT NULL,
    email TEXT,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );
`);

export function cleanupExpiredSessions() {
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
}

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function findUserByEmail(email) {
  if (!email) {
    return null;
  }

  return db.prepare('SELECT id, name, email, password_hash FROM users WHERE email = ?').get(email) || null;
}

export function createUser({ name, email, password }) {
  const passwordHash = hashPassword(password);

  db.prepare('INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, ?)').run(
    name,
    email,
    passwordHash,
    Date.now()
  );

  return findUserByEmail(email);
}

export function createSession(details) {
  const now = Date.now();
  const expiresAt = now + SESSION_DURATION_MS;
  const sessionId = crypto.randomBytes(24).toString('hex');

  db.prepare(
    'INSERT INTO sessions (id, user_id, mode, display_name, email, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(sessionId, details.userId, details.mode, details.displayName, details.email, now, expiresAt);

  return db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
}

export function findValidSessionById(sessionId) {
  if (!sessionId) {
    return null;
  }

  return db.prepare('SELECT * FROM sessions WHERE id = ? AND expires_at > ?').get(sessionId, Date.now()) || null;
}

export function deleteSessionById(sessionId) {
  if (!sessionId) {
    return;
  }

  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password, storedHash) {
  const parts = String(storedHash || '').split(':');
  const salt = parts[0];
  const originalHash = parts[1];

  if (!salt || !originalHash) {
    return false;
  }

  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  const expectedBuffer = Buffer.from(originalHash, 'hex');
  const actualBuffer = Buffer.from(derivedKey, 'hex');

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

export function setSessionCookie(cookies, sessionId, expiresAt) {
  cookies.set(SESSION_COOKIE, sessionId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    expires: new Date(expiresAt)
  });
}

export function clearSessionCookie(cookies) {
  cookies.delete(SESSION_COOKIE, {
    path: '/'
  });
}
