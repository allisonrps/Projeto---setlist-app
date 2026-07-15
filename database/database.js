import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('setlist.db');

export const createTables = async () => {
  try {
    const sqls = [
      `PRAGMA foreign_keys = ON;`,
      `CREATE TABLE IF NOT EXISTS my_bands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        imageUri TEXT
      );`,
      `CREATE TABLE IF NOT EXISTS songs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        originalBand TEXT NOT NULL,
        style TEXT,
        lyrics TEXT,
        imageUri TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS song_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        songId INTEGER NOT NULL,
        type TEXT,
        url TEXT,
        FOREIGN KEY (songId) REFERENCES songs(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS setlists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        myBandId INTEGER,
        date TEXT,
        local TEXT,
        cachê TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (myBandId) REFERENCES my_bands(id)
      );`,
      `CREATE TABLE IF NOT EXISTS setlist_songs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setlistId INTEGER NOT NULL,
        songId INTEGER NOT NULL,
        order_num INTEGER,
        FOREIGN KEY (setlistId) REFERENCES setlists(id) ON DELETE CASCADE,
        FOREIGN KEY (songId) REFERENCES songs(id) ON DELETE CASCADE
      );`
    ];
    
    for (const sql of sqls) {
      await db.execAsync([{ sql, args: [] }]);
    }
    console.log("Tabelas prontas!");
  } catch (error) {
    console.error('Create tables error:', error);
  }
};