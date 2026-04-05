import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'game_database.db');
const db = new Database(dbPath);

// Initialize Tables
db.pragma('journal_mode = WAL'); // Performance mode

// Users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    ip_address TEXT,
    nickname TEXT,
    solo_high_score INTEGER DEFAULT 0,
    coop_high_score INTEGER DEFAULT 0,
    versus_wins INTEGER DEFAULT 0,
    last_login DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Match History Table
db.exec(`
  CREATE TABLE IF NOT EXISTS match_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mode TEXT,
    player_uid TEXT,
    score INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Database Helper Methods
export function getUser(uid) {
  return db.prepare('SELECT * FROM users WHERE uid = ?').get(uid);
}

export function upsertUser(uid, ip, nickname) {
  const existing = getUser(uid);
  if (!existing) {
    db.prepare(`
      INSERT INTO users (uid, ip_address, nickname) 
      VALUES (?, ?, ?)
    `).run(uid, ip, nickname);
  } else {
    db.prepare(`
      UPDATE users SET ip_address = ?, nickname = ?, last_login = CURRENT_TIMESTAMP WHERE uid = ?
    `).run(ip || existing.ip_address, nickname || existing.nickname, uid);
  }
  return getUser(uid);
}

export function updateHighScore(uid, mode, score) {
  const user = getUser(uid);
  if (!user) return;
  
  if (mode === 'solo' && score > user.solo_high_score) {
    db.prepare('UPDATE users SET solo_high_score = ? WHERE uid = ?').run(score, uid);
    db.prepare('INSERT INTO match_history (mode, player_uid, score) VALUES (?, ?, ?)').run('solo', uid, score);
  } else if (mode === 'coop' && score > user.coop_high_score) {
    db.prepare('UPDATE users SET coop_high_score = ? WHERE uid = ?').run(score, uid);
    db.prepare('INSERT INTO match_history (mode, player_uid, score) VALUES (?, ?, ?)').run('coop', uid, score);
  }
}

export function addVersusWin(uid) {
  db.prepare('UPDATE users SET versus_wins = versus_wins + 1 WHERE uid = ?').run(uid);
  db.prepare('INSERT INTO match_history (mode, player_uid, score) VALUES (?, ?, ?)').run('versus_win', uid, 1);
}

export function getLeaderboards() {
  const solo = db.prepare('SELECT nickname, solo_high_score FROM users WHERE solo_high_score > 0 ORDER BY solo_high_score DESC LIMIT 10').all();
  const coop = db.prepare('SELECT nickname, coop_high_score FROM users WHERE coop_high_score > 0 ORDER BY coop_high_score DESC LIMIT 10').all();
  const versus = db.prepare('SELECT nickname, versus_wins FROM users WHERE versus_wins > 0 ORDER BY versus_wins DESC LIMIT 10').all();
  
  return { solo, coop, versus };
}

export default db;
