import { db } from '../database/database';

export const songService = {
  async getAll() {
    const result = await db.allAsync('SELECT * FROM songs ORDER BY name ASC;');
    const songsWithLinks = await Promise.all(
      (result || []).map(async (song) => {
        const links = await db.allAsync('SELECT * FROM song_links WHERE songId = ?;', [song.id]);
        return { ...song, links: links || [] };
      })
    );
    return songsWithLinks;
  },

  async insert(name, originalBand, style, lyrics) {
    const result = await db.runAsync(
      'INSERT INTO songs (name, originalBand, style, lyrics) VALUES (?, ?, ?, ?);',
      [name, originalBand, style, lyrics]
    );
    return result.lastInsertRowId;
  },

  async update(id, name, originalBand, style, lyrics) {
    await db.runAsync(
      'UPDATE songs SET name = ?, originalBand = ?, style = ?, lyrics = ? WHERE id = ?;',
      [name, originalBand, style, lyrics, id]
    );
  },

  async delete(id) {
    await db.runAsync('DELETE FROM songs WHERE id = ?;', [id]);
  },

  async syncLinks(songId, links) {
    await db.runAsync('DELETE FROM song_links WHERE songId = ?;', [songId]);
    for (const link of links) {
      if (link.url.trim()) {
        await db.runAsync('INSERT INTO song_links (songId, type, url) VALUES (?, ?, ?);', [songId, link.type, link.url]);
      }
    }
  }
};