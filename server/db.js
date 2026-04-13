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

// Rooms Table
db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    roomId TEXT PRIMARY KEY,
    mode TEXT,
    sharedScore INTEGER DEFAULT 0,
    sharedBoard TEXT,
    sharedShapes TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Team Records Table
db.exec(`
  CREATE TABLE IF NOT EXISTS team_records (
    team_hash TEXT,
    mode TEXT,
    high_score INTEGER DEFAULT 0,
    player_names TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (team_hash, mode)
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

export function logGameOver(uid, mode, score) {
  try {
    db.prepare('INSERT INTO match_history (mode, player_uid, score) VALUES (?, ?, ?)').run(`${mode}_gameover`, uid, score || 0);
  } catch (e) {
    console.error('Error logging game over:', e);
  }
}

export function getTeamRecord(teamHash, mode) {
  return db.prepare('SELECT * FROM team_records WHERE team_hash = ? AND mode = ?').get(teamHash, mode);
}

export function updateTeamRecord(teamHash, mode, score, playerNames) {
  const existing = getTeamRecord(teamHash, mode);
  if (!existing) {
    db.prepare('INSERT INTO team_records (team_hash, mode, high_score, player_names) VALUES (?, ?, ?, ?)').run(teamHash, mode, score, playerNames);
  } else if (score > existing.high_score) {
    db.prepare('UPDATE team_records SET high_score = ?, player_names = ?, updated_at = CURRENT_TIMESTAMP WHERE team_hash = ? AND mode = ?').run(score, playerNames, teamHash, mode);
  }
}

export function getLeaderboards() {
  const solo = db.prepare('SELECT nickname, solo_high_score FROM users WHERE solo_high_score > 0 ORDER BY solo_high_score DESC LIMIT 10').all();
  const coop = db.prepare('SELECT nickname, coop_high_score FROM users WHERE coop_high_score > 0 ORDER BY coop_high_score DESC LIMIT 10').all();
  const versus = db.prepare('SELECT nickname, versus_wins FROM users WHERE versus_wins > 0 ORDER BY versus_wins DESC LIMIT 10').all();
  
  return { solo, coop, versus };
}

export function upsertRoom(roomId, mode, sharedScore, sharedBoard, sharedShapes) {
  const existing = getRoom(roomId);
  const boardStr = sharedBoard ? JSON.stringify(sharedBoard) : null;
  const shapesStr = sharedShapes ? JSON.stringify(sharedShapes) : null;
  
  if (!existing) {
    db.prepare(`
      INSERT INTO rooms (roomId, mode, sharedScore, sharedBoard, sharedShapes)
      VALUES (?, ?, ?, ?, ?)
    `).run(roomId, mode, sharedScore || 0, boardStr, shapesStr);
  } else {
    db.prepare(`
      UPDATE rooms 
      SET mode = ?, sharedScore = ?, sharedBoard = ?, sharedShapes = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE roomId = ?
    `).run(mode, sharedScore || 0, boardStr, shapesStr, roomId);
  }
}

export function getRoom(roomId) {
  const room = db.prepare('SELECT * FROM rooms WHERE roomId = ?').get(roomId);
  if (room) {
    try {
      room.sharedBoard = room.sharedBoard ? JSON.parse(room.sharedBoard) : null;
      room.sharedShapes = room.sharedShapes ? JSON.parse(room.sharedShapes) : null;
    } catch (e) {
      console.error('Error parsing room data from DB:', e);
    }
  }
  return room;
}

export function deleteRoom(roomId) {
  try {
    db.prepare('DELETE FROM rooms WHERE roomId = ?').run(roomId);
  } catch (e) {
    console.error(`Error deleting room ${roomId}:`, e);
  }
}

export function deleteOldRooms(days = 30) {
  try {
    const info = db.prepare(`
      DELETE FROM rooms WHERE updated_at <= datetime('now', '-' || ? || ' days')
    `).run(days);
    if (info.changes > 0) {
      console.log(`Cleaned up ${info.changes} old rooms from database.`);
    }
  } catch (e) {
    console.error('Error deleting old rooms:', e);
  }
}

export default db;
