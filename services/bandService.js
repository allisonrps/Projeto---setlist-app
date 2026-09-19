import { db } from '../database/database';

export const bandService = {
  async getAll() {
    try {
      const result = await db.getAllAsync('SELECT * FROM my_bands ORDER BY name ASC;');
      return result || [];
    } catch (error) {
      console.error('Error in bandService.getAll:', error);
      throw error;
    }
  },

  async insert(name, imageUri, startDate = '', endDate = '') {
    try {
      const result = await db.runAsync(
        'INSERT INTO my_bands (name, imageUri, startDate, endDate) VALUES (?, ?, ?, ?);',
        [name, imageUri, startDate || '', endDate || '']
      );
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Error in bandService.insert:', error);
      throw error;
    }
  },

  async update(id, name, imageUri, startDate = '', endDate = '') {
    try {
      await db.runAsync(
        'UPDATE my_bands SET name = ?, imageUri = ?, startDate = ?, endDate = ? WHERE id = ?;',
        [name, imageUri, startDate || '', endDate || '', id]
      );
    } catch (error) {
      console.error('Error in bandService.update:', error);
      throw error;
    }
  },

  async delete(id) {
    try {
      await db.runAsync('DELETE FROM my_bands WHERE id = ?;', [id]);
    } catch (error) {
      console.error('Error in bandService.delete:', error);
      throw error;
    }
  },

  async updateMyMemberId(bandId, memberId) {
    try {
      await db.runAsync('UPDATE my_bands SET myMemberId = ? WHERE id = ?;', [memberId, bandId]);
    } catch (error) {
      console.error('Error in bandService.updateMyMemberId:', error);
    }
  },

  // ===== GESTÃO DE REPERTÓRIO DA BANDA (band_songs) =====
  async getBandSongs(bandId) {
    try {
      const result = await db.getAllAsync(
        'SELECT s.*, bs.isFavorite as isBandFavorite FROM band_songs bs JOIN songs s ON bs.songId = s.id WHERE bs.bandId = ? ORDER BY s.name ASC;',
        [bandId]
      );
      if (!result) return [];
      
      // Carregar song_links para cada música do repertório da banda e usar o isFavorite específico da banda
      const songsWithLinks = await Promise.all(
        result.map(async (song) => {
          const links = await db.getAllAsync('SELECT * FROM song_links WHERE songId = ?;', [song.id]);
          return { 
            ...song, 
            isFavorite: song.isBandFavorite !== undefined ? Boolean(song.isBandFavorite) : Boolean(song.isFavorite),
            links: links || [] 
          };
        })
      );
      return songsWithLinks;
    } catch (error) {
      console.error('Error in bandService.getBandSongs:', error);
      return [];
    }
  },

  async toggleBandSongFavorite(bandId, songId, currentIsFavorite) {
    try {
      const newStatus = currentIsFavorite ? 0 : 1;
      await db.runAsync(
        'UPDATE band_songs SET isFavorite = ? WHERE bandId = ? AND songId = ?;',
        [newStatus, bandId, songId]
      );
      return newStatus;
    } catch (error) {
      console.error('Error in bandService.toggleBandSongFavorite:', error);
      throw error;
    }
  },

  async addSongToBand(bandId, songId) {
    try {
      await db.runAsync(
        'INSERT OR IGNORE INTO band_songs (bandId, songId) VALUES (?, ?);',
        [bandId, songId]
      );
    } catch (error) {
      console.error('Error in bandService.addSongToBand:', error);
    }
  },

  async addSongsToBand(bandId, songIds) {
    try {
      if (!Array.isArray(songIds)) return;
      for (const songId of songIds) {
        await db.runAsync(
          'INSERT OR IGNORE INTO band_songs (bandId, songId) VALUES (?, ?);',
          [bandId, songId]
        );
      }
    } catch (error) {
      console.error('Error in bandService.addSongsToBand:', error);
    }
  },

  async removeSongFromBand(bandId, songId) {
    try {
      await db.runAsync(
        'DELETE FROM band_songs WHERE bandId = ? AND songId = ?;',
        [bandId, songId]
      );
    } catch (error) {
      console.error('Error in bandService.removeSongFromBand:', error);
    }
  },

  // ===== GESTÃO FINANCEIRA DA BANDA (band_finances) =====
  async getBandFinances(bandId) {
    try {
      const result = await db.getAllAsync(
        'SELECT * FROM band_finances WHERE bandId = ? ORDER BY date DESC, id DESC;',
        [bandId]
      );
      return result || [];
    } catch (error) {
      console.error('Error in bandService.getBandFinances:', error);
      return [];
    }
  },

  async addFinancialEntry(bandId, title, amount, type, date, status = 'paid', notes = '', setlistId = null) {
    try {
      const result = await db.runAsync(
        'INSERT INTO band_finances (bandId, title, amount, type, date, status, notes, setlistId) VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
        [bandId, title, parseFloat(amount) || 0, type, date || '', status, notes || '', setlistId]
      );
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Error in bandService.addFinancialEntry:', error);
      throw error;
    }
  },

  async updateFinancialEntry(id, title, amount, type, date, status, notes) {
    try {
      await db.runAsync(
        'UPDATE band_finances SET title = ?, amount = ?, type = ?, date = ?, status = ?, notes = ? WHERE id = ?;',
        [title, parseFloat(amount) || 0, type, date || '', status, notes || '', id]
      );
    } catch (error) {
      console.error('Error in bandService.updateFinancialEntry:', error);
      throw error;
    }
  },

  async toggleFinanceStatus(id, currentStatus) {
    try {
      const nextStatus = currentStatus === 'paid' ? 'pending' : 'paid';
      await db.runAsync(
        'UPDATE band_finances SET status = ? WHERE id = ?;',
        [nextStatus, id]
      );
      return nextStatus;
    } catch (error) {
      console.error('Error in bandService.toggleFinanceStatus:', error);
      throw error;
    }
  },

  async deleteFinancialEntry(id) {
    try {
      await db.runAsync('DELETE FROM band_finances WHERE id = ?;', [id]);
    } catch (error) {
      console.error('Error in bandService.deleteFinancialEntry:', error);
      throw error;
    }
  },

  // ===== GESTÃO DE INTEGRANTES DA BANDA (band_members) =====
  async getBandMembers(bandId) {
    try {
      const result = await db.getAllAsync(
        'SELECT * FROM band_members WHERE bandId = ? ORDER BY status ASC, name ASC;',
        [bandId]
      );
      return result || [];
    } catch (error) {
      console.error('Error in bandService.getBandMembers:', error);
      return [];
    }
  },

  async addBandMember(bandId, name, role, phone = '', startDate = '', endDate = '', status = 'active') {
    try {
      const result = await db.runAsync(
        'INSERT INTO band_members (bandId, name, role, phone, startDate, endDate, status) VALUES (?, ?, ?, ?, ?, ?, ?);',
        [bandId, name, role, phone, startDate, endDate, status]
      );
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Error in bandService.addBandMember:', error);
      throw error;
    }
  },

  async updateBandMember(id, name, role, phone = '', startDate = '', endDate = '', status = 'active') {
    try {
      await db.runAsync(
        'UPDATE band_members SET name = ?, role = ?, phone = ?, startDate = ?, endDate = ?, status = ? WHERE id = ?;',
        [name, role, phone, startDate, endDate, status, id]
      );
    } catch (error) {
      console.error('Error in bandService.updateBandMember:', error);
      throw error;
    }
  },

  async deleteBandMember(id) {
    try {
      await db.runAsync('DELETE FROM band_members WHERE id = ?;', [id]);
    } catch (error) {
      console.error('Error in bandService.deleteBandMember:', error);
      throw error;
    }
  },

  // ===== GESTÃO DE DIVISÃO DE CACHÊ POR INTEGRANTE =====
  async saveShowCacheSplit(setlistId, splitsMap) {
    try {
      const key = `cache_split_${setlistId}`;
      const jsonVal = JSON.stringify(splitsMap || {});
      try {
        await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);', [key, jsonVal]);
      } catch (sqle) {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, jsonVal);
        }
      }
    } catch (error) {
      console.error('Error in bandService.saveShowCacheSplit:', error);
    }
  },

  async getShowCacheSplit(setlistId) {
    try {
      const key = `cache_split_${setlistId}`;
      try {
        const rows = await db.getAllAsync('SELECT value FROM settings WHERE key = ?;', [key]);
        if (rows && rows.length > 0 && rows[0].value) {
          return JSON.parse(rows[0].value);
        }
      } catch (sqle) {}

      if (typeof localStorage !== 'undefined') {
        const data = localStorage.getItem(key);
        if (data) return JSON.parse(data);
      }
      return {};
    } catch (error) {
      console.error('Error in bandService.getShowCacheSplit:', error);
      return {};
    }
  }
};
