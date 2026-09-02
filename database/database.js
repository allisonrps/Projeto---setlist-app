import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';

const isWeb = Platform.OS === 'web';

export const SAMPLE_POP_ROCK_SONGS = [
  {
    name: 'Yellow',
    originalBand: 'Coldplay',
    style: 'Pop Rock, Indie Rock, 2000s, Acoustic',
    duration: '04:29',
    defaultView: 'chords',
    lyrics: `[Verse 1]
Look at the stars
Look how they shine for you
And everything you do
Yeah, they were all yellow

I came along
I wrote a song for you
And all the things you do
And it was called "Yellow"

So then I took my turn
Oh, what a thing to have done
And it was all yellow

[Chorus]
Your skin, oh yeah, your skin and bones
Turn into something beautiful
You know, you know I love you so
You know I love you so

[Verse 2]
I swam across
I jumped across for you
Oh, what a thing to do
'Cause you were all yellow

I drew a line
I drew a line for you
Oh, what a thing to do
And it was all yellow

[Chorus]
Your skin, oh yeah, your skin and bones
Turn into something beautiful
And you know, for you, I'd bleed myself dry
For you, I'd bleed myself dry

[Bridge]
It's true
Look how they shine for you
Look how they shine for you
Look how they shine for
Look how they shine for you
Look how they shine for you
Look how they shine

[Outro]
Look at the stars
Look how they shine for you
And all the things you do`,
    chords: `[Intro]
B   B   F#   F#   E   E   B   B

[Verse 1]
B
Look at the stars
                     F#
Look how they shine for you
                   E
And everything you do
                   B
Yeah, they were all yellow

B
I came along
                F#
I wrote a song for you
                   E
And all the things you do
                   B
And it was called "Yellow"

B                  F#
So then I took my turn
                     E
Oh, what a thing to have done
                   B
And it was all yellow

[Chorus]
E                      G#m     F#
Your skin, oh yeah, your skin and bones
E                G#m      F#
Turn into something beautiful
E               G#m     F#         E
You know, you know I love you so
                   B
You know I love you so

[Verse 2]
B
I swam across
               F#
I jumped across for you
                   E
Oh, what a thing to do
                   B
'Cause you were all yellow

B
I drew a line
                F#
I drew a line for you
                   E
Oh, what a thing to do
                   B
And it was all yellow

[Chorus]
E                      G#m     F#
Your skin, oh yeah, your skin and bones
E                G#m      F#
Turn into something beautiful
E               G#m        F#            E
And you know, for you, I'd bleed myself dry
                         B
For you, I'd bleed myself dry

[Bridge]
       B
It's true
                     F#
Look how they shine for you
                   E
Look how they shine for you
                   B
Look how they shine for

       B
It's true
                     F#
Look how they shine for you
                   E
Look how they shine for you
                   B
Look how they shine

[Outro]
B
Look at the stars
                     F#m
Look how they shine for you
                   E
And all the things you do`,
    tabs: `[Intro Riff - Guitar 1 (Standard Tuning / EADGBE)]:
e|---------------------------------------------------|
B|-----4-----4-----4-----4-----2-----2-----2-----2---|
G|---4-----4-----4-----4-----3-----3-----3-----3-----|
D|-4-----4-----4-----4-----4-----4-----4-----4-------|
A|---------------------------------------------------|
E|---------------------------------------------------|`,
  },
  {
    name: "Sweet Child O' Mine",
    originalBand: "Guns N' Roses",
    style: "Classic Rock, Hard Rock, Pop Rock, 80s",
    duration: "05:56",
    defaultView: "chords",
    lyrics: `[Verse 1]
She's got a smile that it seems to me
Reminds me of childhood memories
Where everything was as fresh as the bright blue sky

Now and then when I see her face
She takes me away to that special place
And if I stared too long, I'd probably break down and cry

[Chorus]
Whoa, oh, oh, sweet child o' mine
Whoa, oh, oh, oh, sweet love of mine

[Verse 2]
She's got eyes of the bluest skies
As if they thought of rain
I'd hate to look into those eyes and see an ounce of pain

Her hair reminds me of a warm safe place
Where as a child I'd hide
And pray for the thunder and the rain to quietly pass me by

[Chorus]
Whoa, oh, oh, sweet child o' mine
Whoa, oh, oh, oh, sweet love of mine
Whoa, oh, oh, sweet child o' mine
Ooh, yeah, sweet love of mine

[Guitar Solo]

[Outro]
Where do we go?
Where do we go now?
Where do we go?
Ooh, oh, where do we go?
Where do we go now?
Where do we go now?
Where do we go?
Sweet child o' mine`,
    chords: `[Intro]
D   Cadd9   G   D  (x2)

[Verse 1]
D
She's got a smile that it seems to me
Cadd9
Reminds me of childhood memories
G                                            D
Where everything was as fresh as the bright blue sky

D
Now and then when I see her face
Cadd9
She takes me away to that special place
G                                              D
And if I stared too long, I'd probably break down and cry

[Chorus]
A5           B5  C5              D
Whoa, oh, oh, sweet child o' mine
A5           B5  C5             D
Whoa, oh, oh, oh, sweet love of mine

[Verse 2]
D
She's got eyes of the bluest skies
Cadd9
As if they thought of rain
G                                              D
I'd hate to look into those eyes and see an ounce of pain

D
Her hair reminds me of a warm safe place
Cadd9
Where as a child I'd hide
G                                                  D
And pray for the thunder and the rain to quietly pass me by

[Chorus]
A5           B5  C5              D
Whoa, oh, oh, sweet child o' mine
A5           B5  C5             D
Whoa, oh, oh, oh, sweet love of mine
A5           B5  C5              D
Whoa, oh, oh, sweet child o' mine
A5          B5  C5              D
Ooh, yeah, sweet love of mine

[Solo]
Em   C   B7   Am  (x2)
Em   G   A   C  D  (x2)

[Outro]
Em                 G
Where do we go?
A                  C    D
Where do we go now?
Em                 G
Where do we go?
A                  C    D
Where do we go now?
Em                 G      A    C    D
Where do we go now?
Em              G     A     C    D    Em
Sweet child o' mine`,
    tabs: `[Main Intro Riff - Slash]:
eb|-------15--------14--------12--------14----|
Bb|----15----15--15----15--15----15--15----15-|
Gb|-14---------14--------14--------14---------|
Db|-------------------------------------------|
Ab|-------------------------------------------|
Eb|-------------------------------------------|`,
  },
  {
    name: "Wonderwall",
    originalBand: "Oasis",
    style: "Britpop, Pop Rock, 90s, Acoustic",
    duration: "04:18",
    defaultView: "chords",
    lyrics: `[Verse 1]
Today is gonna be the day
That they're gonna throw it back to you
By now you should've somehow
Realized what you gotta do
I don't believe that anybody
Feels the way I do about you now

[Verse 2]
Backbeat, the word is on the street
That the fire in your heart is out
I'm sure you've heard it all before
But you never really had a doubt
I don't believe that anybody
Feels the way I do about you now

[Pre-Chorus]
And all the roads we have to walk are winding
And all the lights that lead us there are blinding
There are many things that I would like to say to you
But I don't know how

[Chorus]
Because maybe
You're gonna be the one that saves me
And after all
You're my wonderwall

[Verse 3]
Today was gonna be the day
But they'll never throw it back to you
By now you should've somehow
Realized what you're not to do
I don't believe that anybody
Feels the way I do about you now

[Pre-Chorus]
And all the roads that lead you there were winding
And all the lights that light the way are blinding
There are many things that I would like to say to you
But I don't know how

[Chorus]
I said maybe
You're gonna be the one that saves me
And after all
You're my wonderwall

[Outro]
I said maybe
You're gonna be the one that saves me
You're gonna be the one that saves me
You're gonna be the one that saves me`,
    chords: `[Intro]
Em7   G   Dsus4   A7sus4  (x4)

[Verse 1]
Em7              G
Today is gonna be the day
               Dsus4                  A7sus4
That they're gonna throw it back to you
Em7                 G
By now you should've somehow
     Dsus4           A7sus4
Realized what you gotta do
Em7                 G          Dsus4
I don't believe that anybody feels the way
   A7sus4            Cadd9  Dsus4  A7sus4
I do about you now

[Verse 2]
Em7                    G
Backbeat, the word is on the street
          Dsus4                A7sus4
That the fire in your heart is out
Em7                     G
I'm sure you've heard it all before
         Dsus4           A7sus4
But you never really had a doubt
Em7                 G          Dsus4
I don't believe that anybody feels the way
   A7sus4            Em7  G  Dsus4  A7sus4
I do about you now

[Pre-Chorus]
      Cadd9             Dsus4              Em7
And all the roads we have to walk are winding
      Cadd9             Dsus4              Em7
And all the lights that lead us there are blinding
Cadd9              Dsus4
There are many things that I would like to
G       D/F#   Em7   Dsus4   A7sus4
Say to you, but I don't know how

[Chorus]
           Cadd9  Em7  G
Because maybe
       Em7                   Cadd9   Em7  G
You're gonna be the one that saves me
    Em7   Cadd9  Em7  G
And after all
        Em7        Cadd9  Em7  G  Em7
You're my wonderwall

[Verse 3]
Em7                 G
Today was gonna be the day
             Dsus4                   A7sus4
But they'll never throw it back to you
Em7                  G
By now you should've somehow
     Dsus4              A7sus4
Realized what you're not to do
Em7                 G          Dsus4
I don't believe that anybody feels the way
   A7sus4            Em7  G  Dsus4  A7sus4
I do about you now

[Pre-Chorus]
      Cadd9             Dsus4                 Em7
And all the roads that lead you there were winding
      Cadd9             Dsus4                 Em7
And all the lights that light the way are blinding
Cadd9              Dsus4
There are many things that I would like to
G       D/F#   Em7   Dsus4   A7sus4
Say to you, but I don't know how

[Chorus]
        Cadd9  Em7  G
I said maybe
       Em7                   Cadd9   Em7  G
You're gonna be the one that saves me
    Em7   Cadd9  Em7  G
And after all
        Em7        Cadd9  Em7  G  Em7
You're my wonderwall

[Outro]
        Cadd9  Em7  G  Em7
I said maybe
       Em7                   Cadd9   Em7  G
You're gonna be the one that saves me
       Em7                   Cadd9   Em7  G
You're gonna be the one that saves me
       Em7                   Cadd9   Em7  G  Em7
You're gonna be the one that saves me`,
    tabs: `[Acoustic Guitar - Capo 2nd Fret]:
Chords used:
Em7    (022033)
G      (320033)
Dsus4  (xx0233)
A7sus4 (x02033)
Cadd9  (x32033)
D/F#   (200233)`,
  },
];

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
    // Inserir músicas de exemplo no mock Web se não houver músicas
    if (!data.songs.some(s => s.id >= 0)) {
      SAMPLE_POP_ROCK_SONGS.forEach((sample, idx) => {
        data.songs.push({
          id: idx + 1,
          ...sample,
          isFavorite: 0,
        });
      });
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

    // Inserir as 3 músicas de exemplo padrão do Pop Rock Internacional caso o usuário ainda não tenha músicas
    try {
      const existingSongs = await db.getAllAsync('SELECT COUNT(*) as count FROM songs WHERE id >= 0;');
      const songCount = existingSongs && existingSongs[0] ? existingSongs[0].count : 0;
      if (songCount === 0) {
        for (const sample of SAMPLE_POP_ROCK_SONGS) {
          await db.runAsync(
            `INSERT INTO songs (name, originalBand, style, duration, defaultView, lyrics, chords, tabs, isFavorite) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0);`,
            [sample.name, sample.originalBand, sample.style, sample.duration, sample.defaultView, sample.lyrics, sample.chords, sample.tabs || '']
          );
        }
        console.log("Nativo: 3 Músicas de exemplo do Pop Rock Internacional inseridas com sucesso!");
      }
    } catch (e) {
      console.log("Nativo: Erro ao inserir músicas de exemplo:", e.message);
    }

  } catch (error) {
    console.error('Erro ao inicializar tabelas nativas:', error);
    throw error;
  }
};