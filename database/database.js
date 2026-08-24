import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';

const isWeb = Platform.OS === 'web';

// Mock de banco de dados para Web usando localStorage
const createWebDB = () => {
  const data = {
    my_bands: [],
    songs: [{ id: -1, name: 'PAUSA', originalBand: '', style: 'PAUSA' }, { id: -2, name: 'ANOTAÇÃO', originalBand: '', style: 'ANOTAÇÃO' }],
    song_links: [],
    setlists: [],
    setlist_songs: [],
    settings: [],
  };

  const loadFromStorage = () => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('setlist-app-db');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          Object.assign(data, parsed);
        } catch (e) {
          console.error('Erro ao ler do localStorage:', e);
        }
      }
    }
    // Garantir que as músicas especiais PAUSA e ANOTAÇÃO sempre existam no mock Web
    if (!data.songs.some(s => s.id === -1)) {
      data.songs.push({ id: -1, name: 'PAUSA', originalBand: '', style: 'PAUSA' });
    }
    if (!data.songs.some(s => s.id === -2)) {
      data.songs.push({ id: -2, name: 'ANOTAÇÃO', originalBand: '', style: 'ANOTAÇÃO' });
    }
  };

  const saveToStorage = () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('setlist-app-db', JSON.stringify(data));
    }
  };

  loadFromStorage();

  return {
    async getAllAsync(sql, params = []) {
      console.log('Web SQL Query (getAllAsync):', sql, params);
      loadFromStorage();

      if (sql.includes('SELECT * FROM my_bands')) {
        const list = [...data.my_bands];
        list.sort((a, b) => a.name.localeCompare(b.name));
        return list;
      }

      if (sql.includes('SELECT * FROM songs')) {
        let list = [...data.songs];
        
        // Simular filtro LIKE
        if (sql.includes('LIKE') && params.length >= 3) {
          const search = params[0].replace(/%/g, '').toLowerCase();
          list = list.filter(s => 
            s.name.toLowerCase().includes(search) || 
            s.originalBand.toLowerCase().includes(search) || 
            (s.style && s.style.toLowerCase().includes(search))
          );
        }

        // Simular filtro por estilo
        if (sql.includes('style = ?')) {
          const styleParam = params[params.length - 1];
          list = list.filter(s => s.style === styleParam);
        }

        list.sort((a, b) => a.name.localeCompare(b.name));
        return list;
      }

      if (sql.includes('SELECT DISTINCT style FROM songs')) {
        const styles = [...new Set(data.songs.map(s => s.style).filter(Boolean))];
        styles.sort();
        return styles.map(style => ({ style }));
      }

      if (sql.includes('SELECT * FROM song_links WHERE songId = ?')) {
        const songId = params[0];
        return data.song_links.filter(l => l.songId === songId);
      }

      if (sql.includes('FROM setlists')) {
        const list = data.setlists.map(sl => {
          const band = data.my_bands.find(b => b.id === sl.myBandId);
          return { ...sl, bandName: band ? band.name : null, bandImageUri: band ? band.imageUri : null };
        });
        
        // Ordenar por isFavorite desc, date desc, createdAt desc
        list.sort((a, b) => {
          const favA = a.isFavorite || 0;
          const favB = b.isFavorite || 0;
          if (favA !== favB) return favB - favA;

          const dateCompare = (b.date || '').localeCompare(a.date || '');
          if (dateCompare !== 0) return dateCompare;
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        });
        return list;
      }

      if (sql.includes('FROM setlist_songs ss JOIN songs s')) {
        const setlistId = params[0];
        const associations = data.setlist_songs.filter(ss => ss.setlistId === setlistId);
        associations.sort((a, b) => a.order_num - b.order_num);
        
        const result = associations.map(assoc => {
          const song = data.songs.find(s => s.id === assoc.songId);
          return song ? { 
            ...song, 
            customNotes: assoc.customNotes || '', 
            customDuration: assoc.customDuration || '',
            rehearsalStatus: assoc.rehearsalStatus || 'none',
            rehearsalNotes: assoc.rehearsalNotes || '',
            order_num: assoc.order_num 
          } : null;
        }).filter(Boolean);

        return result;
      }

      if (sql.includes('SELECT value FROM settings WHERE key = ?')) {
        const key = params[0];
        const found = data.settings.find(s => s.key === key);
        return found ? [found] : [];
      }

      return [];
    },

    async runAsync(sql, params = []) {
      console.log('Web SQL Query (runAsync):', sql, params);
      loadFromStorage();

      // INSERT / UPDATE / DELETE de Bandas
      if (sql.includes('INSERT INTO my_bands')) {
        const id = Math.max(...data.my_bands.map(b => b.id || 0), 0) + 1;
        data.my_bands.push({ id, name: params[0], imageUri: params[1] });
        saveToStorage();
        return { lastInsertRowId: id };
      }
      if (sql.includes('UPDATE my_bands')) {
        const band = data.my_bands.find(b => b.id === params[2]);
        if (band) {
          band.name = params[0];
          band.imageUri = params[1];
          saveToStorage();
        }
        return {};
      }
      if (sql.includes('DELETE FROM my_bands')) {
        const id = params[0];
        data.my_bands = data.my_bands.filter(b => b.id !== id);
        // Cascata no setlist
        data.setlists = data.setlists.map(s => s.myBandId === id ? { ...s, myBandId: null } : s);
        saveToStorage();
        return {};
      }

      // INSERT / UPDATE / DELETE de Músicas
      if (sql.includes('INSERT INTO songs')) {
        const id = Math.max(...data.songs.map(s => s.id || 0), 0) + 1;
        data.songs.push({
          id,
          name: params[0],
          originalBand: params[1],
          style: params[2],
          lyrics: params[3],
          chords: params[4],
          tabs: params[5],
          defaultView: params[6],
          duration: params[7],
          scrollSpeed: params[8] || 'none',
          createdAt: new Date().toISOString(),
        });
        saveToStorage();
        return { lastInsertRowId: id };
      }
      if (sql.includes('UPDATE songs')) {
        const song = data.songs.find(s => s.id === params[9]);
        if (song) {
          song.name = params[0];
          song.originalBand = params[1];
          song.style = params[2];
          song.lyrics = params[3];
          song.chords = params[4];
          song.tabs = params[5];
          song.defaultView = params[6];
          song.duration = params[7];
          song.scrollSpeed = params[8] || 'none';
          saveToStorage();
        }
        return {};
      }
      if (sql.includes('DELETE FROM songs')) {
        const id = params[0];
        data.songs = data.songs.filter(s => s.id !== id);
        data.song_links = data.song_links.filter(l => l.songId !== id);
        data.setlist_songs = data.setlist_songs.filter(ss => ss.songId !== id);
        saveToStorage();
        return {};
      }

      // INSERT / DELETE de Links de músicas
      if (sql.includes('INSERT INTO song_links')) {
        const id = Math.max(...data.song_links.map(l => l.id || 0), 0) + 1;
        data.song_links.push({ id, songId: params[0], type: params[1], url: params[2] });
        saveToStorage();
        return { lastInsertRowId: id };
      }
      if (sql.includes('DELETE FROM song_links WHERE songId = ?')) {
        const songId = params[0];
        data.song_links = data.song_links.filter(l => l.songId !== songId);
        saveToStorage();
        return {};
      }

      // INSERT / UPDATE / DELETE de Setlists
      if (sql.includes('INSERT INTO setlists')) {
        const id = Math.max(...data.setlists.map(s => s.id || 0), 0) + 1;
        data.setlists.push({
          id,
          type: params[0],
          myBandId: params[1],
          date: params[2],
          local: params[3],
          cachê: params[4],
          createdAt: new Date().toISOString(),
        });
        saveToStorage();
        return { lastInsertRowId: id };
      }
      if (sql.includes('UPDATE setlists')) {
        const setlist = data.setlists.find(s => s.id === params[5]);
        if (setlist) {
          setlist.type = params[0];
          setlist.myBandId = params[1];
          setlist.date = params[2];
          setlist.local = params[3];
          setlist.cachê = params[4];
          saveToStorage();
        }
        return {};
      }
      if (sql.includes('DELETE FROM setlists')) {
        const id = params[0];
        data.setlists = data.setlists.filter(s => s.id !== id);
        data.setlist_songs = data.setlist_songs.filter(ss => ss.setlistId !== id);
        saveToStorage();
        return {};
      }

      // INSERT / DELETE de setlist_songs
      if (sql.includes('INSERT INTO setlist_songs')) {
        const id = Math.max(...data.setlist_songs.map(ss => ss.id || 0), 0) + 1;
        data.setlist_songs.push({ 
          id, 
          setlistId: params[0], 
          songId: params[1], 
          order_num: params[2],
          customNotes: params[3] || '',
          customDuration: params[4] || '',
          rehearsalStatus: params[5] || 'none',
          rehearsalNotes: params[6] || ''
        });
        saveToStorage();
        return { lastInsertRowId: id };
      }
      if (sql.includes('DELETE FROM setlist_songs WHERE setlistId = ?')) {
        const setlistId = params[0];
        data.setlist_songs = data.setlist_songs.filter(ss => ss.setlistId !== setlistId);
        saveToStorage();
        return {};
      }
      if (sql.includes('UPDATE setlist_songs SET rehearsalStatus = ?, rehearsalNotes = ?')) {
        const status = params[0];
        const notes = params[1];
        const setlistId = params[2];
        const songId = params[3];
        const order_num = params[4];
        
        const assoc = data.setlist_songs.find(ss => 
          ss.setlistId === setlistId && 
          ss.songId === songId && 
          ss.order_num === order_num
        );
        if (assoc) {
          assoc.rehearsalStatus = status;
          assoc.rehearsalNotes = notes;
          saveToStorage();
        }
        return {};
      }

      // Configurações
      if (sql.includes('INSERT OR REPLACE INTO settings')) {
        const key = params[0];
        const value = params[1];
        data.settings = data.settings.filter(s => s.key !== key);
        data.settings.push({ key, value });
        saveToStorage();
        return {};
      }

      return {};
    },

    async execAsync(statements) {
      console.log('Web SQL execAsync (ignored):', statements);
      return;
    }
  };
};

// Expor conexão unificada
let dbInstance = null;

if (isWeb) {
  dbInstance = createWebDB();
} else {
  dbInstance = SQLite.openDatabaseSync('setlist.db');
}

export const db = dbInstance;

export const createTables = async () => {
  if (isWeb) {
    console.log("Web: Simulando tabelas do banco.");
    return;
  }

  try {
    // Ativar chaves estrangeiras no SQLite real
    await db.execAsync('PRAGMA foreign_keys = ON;');

    // Criar as tabelas nativas de forma combinada (execAsync aceita múltiplas queries)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS my_bands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        imageUri TEXT
      );
      CREATE TABLE IF NOT EXISTS songs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        originalBand TEXT NOT NULL,
        style TEXT,
        lyrics TEXT,
        chords TEXT,
        tabs TEXT,
        defaultView TEXT DEFAULT 'lyrics',
        imageUri TEXT,
        isFavorite INTEGER DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS song_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        songId INTEGER NOT NULL,
        type TEXT,
        url TEXT,
        FOREIGN KEY (songId) REFERENCES songs(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS setlists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        type TEXT NOT NULL,
        myBandId INTEGER,
        date TEXT,
        local TEXT,
        cachê TEXT,
        notes TEXT,
        isFavorite INTEGER DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (myBandId) REFERENCES my_bands(id) ON DELETE SET NULL
      );
      CREATE TABLE IF NOT EXISTS setlist_songs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setlistId INTEGER NOT NULL,
        songId INTEGER NOT NULL,
        order_num INTEGER,
        FOREIGN KEY (setlistId) REFERENCES setlists(id) ON DELETE CASCADE,
        FOREIGN KEY (songId) REFERENCES songs(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
    
    console.log("Nativo: Tabelas preparadas com sucesso!");

    // Migração da coluna duration em songs
    try {
      await db.execAsync('ALTER TABLE songs ADD COLUMN duration TEXT;');
      console.log("Nativo: Coluna 'duration' adicionada em 'songs'!");
    } catch (e) {
      if (e.message && e.message.includes("duplicate column name")) {
        console.log("Nativo: Coluna 'duration' já existe.");
      } else {
        console.log("Nativo: Nota da migração:", e.message);
      }
    }

    // Migração da coluna notes em setlists
    try {
      await db.execAsync('ALTER TABLE setlists ADD COLUMN notes TEXT;');
      console.log("Nativo: Coluna 'notes' adicionada em 'setlists'!");
    } catch (e) {
      if (e.message && e.message.includes("duplicate column name")) {
        console.log("Nativo: Coluna 'notes' já existe.");
      } else {
        console.log("Nativo: Nota da migração de setlists:", e.message);
      }
    }

    // Migração da coluna name em setlists
    try {
      await db.execAsync('ALTER TABLE setlists ADD COLUMN name TEXT;');
      console.log("Nativo: Coluna 'name' adicionada em 'setlists'!");
    } catch (e) {
      if (e.message && e.message.includes("duplicate column name")) {
        console.log("Nativo: Coluna 'name' já existe.");
      } else {
        console.log("Nativo: Nota da migração de setlists name:", e.message);
      }
    }

    // Migração de chords em songs
    try {
      await db.execAsync('ALTER TABLE songs ADD COLUMN chords TEXT;');
      console.log("Nativo: Coluna 'chords' adicionada em 'songs'!");
    } catch (e) {
      if (e.message && e.message.includes("duplicate column name")) {
        console.log("Nativo: Coluna 'chords' já existe.");
      } else {
        console.log("Nativo: Nota da migração de chords:", e.message);
      }
    }

    // Migração de tabs em songs
    try {
      await db.execAsync('ALTER TABLE songs ADD COLUMN tabs TEXT;');
      console.log("Nativo: Coluna 'tabs' adicionada em 'songs'!");
    } catch (e) {
      if (e.message && e.message.includes("duplicate column name")) {
        console.log("Nativo: Coluna 'tabs' já existe.");
      } else {
        console.log("Nativo: Nota da migração de tabs:", e.message);
      }
    }

    // Migração de defaultView em songs
    try {
      await db.execAsync("ALTER TABLE songs ADD COLUMN defaultView TEXT DEFAULT 'lyrics';");
      console.log("Nativo: Coluna 'defaultView' adicionada em 'songs'!");
    } catch (e) {
      if (e.message && e.message.includes("duplicate column name")) {
        console.log("Nativo: Coluna 'defaultView' já existe.");
      } else {
        console.log("Nativo: Nota da migração de defaultView:", e.message);
      }
    }

    // Migração de customNotes em setlist_songs
    try {
      await db.execAsync('ALTER TABLE setlist_songs ADD COLUMN customNotes TEXT;');
      console.log("Nativo: Coluna 'customNotes' adicionada em 'setlist_songs'!");
    } catch (e) {
      if (e.message && e.message.includes("duplicate column name")) {
        console.log("Nativo: Coluna 'customNotes' já existe.");
      } else {
        console.log("Nativo: Nota da migração de customNotes:", e.message);
      }
    }

    // Migração de customDuration em setlist_songs
    try {
      await db.execAsync('ALTER TABLE setlist_songs ADD COLUMN customDuration TEXT;');
      console.log("Nativo: Coluna 'customDuration' adicionada em 'setlist_songs'!");
    } catch (e) {
      if (e.message && e.message.includes("duplicate column name")) {
        console.log("Nativo: Coluna 'customDuration' já existe.");
      } else {
        console.log("Nativo: Nota da migração de customDuration:", e.message);
      }
    }

    // Migração de scrollSpeed em songs
    try {
      await db.execAsync("ALTER TABLE songs ADD COLUMN scrollSpeed TEXT DEFAULT 'none';");
      console.log("Nativo: Coluna 'scrollSpeed' adicionada em 'songs'!");
    } catch (e) {
      if (e.message && e.message.includes("duplicate column name")) {
        console.log("Nativo: Coluna 'scrollSpeed' já existe.");
      } else {
        console.log("Nativo: Nota da migração de scrollSpeed:", e.message);
      }
    }

    // Migração de isFavorite em songs
    try {
      await db.execAsync('ALTER TABLE songs ADD COLUMN isFavorite INTEGER DEFAULT 0;');
      console.log("Nativo: Coluna 'isFavorite' adicionada em 'songs'!");
    } catch (e) {
      if (e.message && e.message.includes("duplicate column name")) {
        console.log("Nativo: Coluna 'isFavorite' já existe em songs.");
      } else {
        console.log("Nativo: Nota da migração de isFavorite em songs:", e.message);
      }
    }

    // Migração de isFavorite em setlists
    try {
      await db.execAsync('ALTER TABLE setlists ADD COLUMN isFavorite INTEGER DEFAULT 0;');
      console.log("Nativo: Coluna 'isFavorite' adicionada em 'setlists'!");
    } catch (e) {
      if (e.message && e.message.includes("duplicate column name")) {
        console.log("Nativo: Coluna 'isFavorite' já existe em setlists.");
      } else {
        console.log("Nativo: Nota da migração de isFavorite em setlists:", e.message);
      }
    }

    // Migração de rehearsalStatus em setlist_songs
    try {
      await db.execAsync("ALTER TABLE setlist_songs ADD COLUMN rehearsalStatus TEXT DEFAULT 'none';");
      console.log("Nativo: Coluna 'rehearsalStatus' adicionada em 'setlist_songs'!");
    } catch (e) {
      if (e.message && e.message.includes("duplicate column name")) {
        console.log("Nativo: Coluna 'rehearsalStatus' já existe.");
      } else {
        console.log("Nativo: Nota da migração de rehearsalStatus:", e.message);
      }
    }

    // Migração de rehearsalNotes em setlist_songs
    try {
      await db.execAsync("ALTER TABLE setlist_songs ADD COLUMN rehearsalNotes TEXT;");
      console.log("Nativo: Coluna 'rehearsalNotes' adicionada em 'setlist_songs'!");
    } catch (e) {
      if (e.message && e.message.includes("duplicate column name")) {
        console.log("Nativo: Coluna 'rehearsalNotes' já existe.");
      } else {
        console.log("Nativo: Nota da migração de rehearsalNotes:", e.message);
      }
    }

    // Inserir música especial PAUSA (id: -1) - Removemos a palavra INTERVALO
    try {
      await db.execAsync("INSERT OR REPLACE INTO songs (id, name, originalBand, style) VALUES (-1, 'PAUSA', '', 'PAUSA');");
      console.log("Nativo: Registro especial 'PAUSA' garantido!");
    } catch (e) {
      console.log("Nativo: Erro ao garantir registro especial PAUSA:", e.message);
    }

    // Inserir música especial ANOTAÇÃO (id: -2)
    try {
      await db.execAsync("INSERT OR REPLACE INTO songs (id, name, originalBand, style) VALUES (-2, 'ANOTAÇÃO', '', 'ANOTAÇÃO');");
      console.log("Nativo: Registro especial 'ANOTAÇÃO' garantido!");
    } catch (e) {
      console.log("Nativo: Erro ao garantir registro especial ANOTAÇÃO:", e.message);
    }

  } catch (error) {
    console.error('Erro ao inicializar tabelas nativas:', error);
    throw error;
  }
};