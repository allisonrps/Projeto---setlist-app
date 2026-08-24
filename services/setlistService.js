import { db } from '../database/database';

export const setlistService = {
  async getAll() {
    try {
      const result = await db.getAllAsync(`
        SELECT s.*, b.name as bandName, b.imageUri as bandImageUri 
        FROM setlists s
        LEFT JOIN my_bands b ON s.myBandId = b.id
        ORDER BY s.isFavorite DESC, s.date DESC, s.createdAt DESC;
      `);
      return result || [];
    } catch (error) {
      console.error('Error in setlistService.getAll:', error);
      throw error;
    }
  },

  async insert(name, type, myBandId, date, local, cachê, notes, songIds = []) {
    try {
      const result = await db.runAsync(
        'INSERT INTO setlists (name, type, myBandId, date, local, cachê, notes, isFavorite) VALUES (?, ?, ?, ?, ?, ?, ?, 0);',
        [name, type, myBandId, date, local, cachê, notes]
      );
      const setlistId = result.lastInsertRowId;

      // Salvar as músicas associadas em ordem
      for (let order = 0; order < songIds.length; order++) {
        const item = songIds[order];
        const songId = typeof item === 'object' && item !== null ? item.id : item;
        const customNotes = typeof item === 'object' && item !== null ? item.customNotes : '';
        const customDuration = typeof item === 'object' && item !== null ? item.customDuration : '';
        const rehearsalStatus = typeof item === 'object' && item !== null ? item.rehearsalStatus : 'none';
        const rehearsalNotes = typeof item === 'object' && item !== null ? item.rehearsalNotes : '';

        await db.runAsync(
          'INSERT INTO setlist_songs (setlistId, songId, order_num, customNotes, customDuration, rehearsalStatus, rehearsalNotes) VALUES (?, ?, ?, ?, ?, ?, ?);',
          [setlistId, songId, order, customNotes || '', customDuration || '', rehearsalStatus || 'none', rehearsalNotes || '']
        );
      }

      return setlistId;
    } catch (error) {
      console.error('Error in setlistService.insert:', error);
      throw error;
    }
  },

  async update(id, name, type, myBandId, date, local, cachê, notes, songIds = []) {
    try {
      await db.runAsync(
        'UPDATE setlists SET name = ?, type = ?, myBandId = ?, date = ?, local = ?, cachê = ?, notes = ? WHERE id = ?;',
        [name, type, myBandId, date, local, cachê, notes, id]
      );

      // Deletar associações antigas
      await db.runAsync('DELETE FROM setlist_songs WHERE setlistId = ?;', [id]);

      // Salvar as novas músicas associadas em ordem
      for (let order = 0; order < songIds.length; order++) {
        const item = songIds[order];
        const songId = typeof item === 'object' && item !== null ? item.id : item;
        const customNotes = typeof item === 'object' && item !== null ? item.customNotes : '';
        const customDuration = typeof item === 'object' && item !== null ? item.customDuration : '';
        const rehearsalStatus = typeof item === 'object' && item !== null ? item.rehearsalStatus : 'none';
        const rehearsalNotes = typeof item === 'object' && item !== null ? item.rehearsalNotes : '';

        await db.runAsync(
          'INSERT INTO setlist_songs (setlistId, songId, order_num, customNotes, customDuration, rehearsalStatus, rehearsalNotes) VALUES (?, ?, ?, ?, ?, ?, ?);',
          [id, songId, order, customNotes || '', customDuration || '', rehearsalStatus || 'none', rehearsalNotes || '']
        );
      }
    } catch (error) {
      console.error('Error in setlistService.update:', error);
      throw error;
    }
  },

  async delete(id) {
    try {
      await db.runAsync('DELETE FROM setlists WHERE id = ?;', [id]);
    } catch (error) {
      console.error('Error in setlistService.delete:', error);
      throw error;
    }
  },

  async getSongsForSetlist(setlistId) {
    try {
      const result = await db.getAllAsync(`
        SELECT s.*, ss.customNotes, ss.customDuration, ss.rehearsalStatus, ss.rehearsalNotes 
        FROM setlist_songs ss
        JOIN songs s ON ss.songId = s.id
        WHERE ss.setlistId = ?
        ORDER BY ss.order_num ASC;
      `, [setlistId]);

      const songsWithLinks = await Promise.all(
        (result || []).map(async (song) => {
          const links = await db.getAllAsync('SELECT * FROM song_links WHERE songId = ?;', [song.id]);
          return { ...song, links: links || [] };
        })
      );

      return songsWithLinks;
    } catch (error) {
      console.error('Error in setlistService.getSongsForSetlist:', error);
      throw error;
    }
  },

  async duplicate(setlistId) {
    try {
      const rawSetlist = await db.getAllAsync('SELECT * FROM setlists WHERE id = ? LIMIT 1;', [setlistId]);
      if (!rawSetlist || rawSetlist.length === 0) {
        throw new Error('Setlist original não encontrado');
      }
      const sl = rawSetlist[0];

      const copyName = sl.name ? `${sl.name} - Cópia` : 'Setlist Cópia';
      const result = await db.runAsync(
        'INSERT INTO setlists (name, type, myBandId, date, local, cachê, notes, isFavorite) VALUES (?, ?, ?, ?, ?, ?, ?, 0);',
        [copyName, sl.type, sl.myBandId, sl.date, sl.local, sl.cachê, sl.notes]
      );
      const newSetlistId = result.lastInsertRowId;

      const slSongs = await db.getAllAsync('SELECT songId, order_num, customNotes, customDuration, rehearsalStatus, rehearsalNotes FROM setlist_songs WHERE setlistId = ? ORDER BY order_num ASC;', [setlistId]);
      for (const song of slSongs) {
        await db.runAsync(
          'INSERT INTO setlist_songs (setlistId, songId, order_num, customNotes, customDuration, rehearsalStatus, rehearsalNotes) VALUES (?, ?, ?, ?, ?, ?, ?);',
          [newSetlistId, song.songId, song.order_num, song.customNotes || '', song.customDuration || '', song.rehearsalStatus || 'none', song.rehearsalNotes || '']
        );
      }
      return newSetlistId;
    } catch (error) {
      console.error('Error in setlistService.duplicate:', error);
      throw error;
    }
  },

  async updateSongRehearsal(setlistId, songId, order_num, status, notes) {
    try {
      await db.runAsync(
        'UPDATE setlist_songs SET rehearsalStatus = ?, rehearsalNotes = ? WHERE setlistId = ? AND songId = ? AND order_num = ?;',
        [status, notes || '', setlistId, songId, order_num]
      );
    } catch (error) {
      console.error('Error in setlistService.updateSongRehearsal:', error);
      throw error;
    }
  },

  async toggleFavorite(id, currentStatus) {
    try {
      const newStatus = currentStatus ? 0 : 1;
      await db.runAsync('UPDATE setlists SET isFavorite = ? WHERE id = ?;', [newStatus, id]);
      return newStatus;
    } catch (error) {
      console.error('Error in setlistService.toggleFavorite:', error);
      throw error;
    }
  }
};
