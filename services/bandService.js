import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { db } from '../database/database';
import { sanitizeText, sanitizeJson } from './sanitize';
import { api } from './api';

const normalizeDateStr = (d) => {
  if (!d) return '';
  const clean = String(d).trim();
  const dmyMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    let year = dmyMatch[3];
    if (year.length === 2) year = '20' + year;
    return `${year}-${month}-${day}`;
  }
  const ymdMatch = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return clean;
};

export const bandService = {
  async cleanDuplicateBands() {
    try {
      const all = await db.getAllAsync('SELECT id, name, cloudId FROM my_bands ORDER BY id ASC;');
      if (!all || all.length <= 1) return;
      const seen = new Map();
      const duplicateIds = [];
      for (const b of all) {
        const normName = (b.name || '').trim().toLowerCase();
        if (!normName) continue;
        if (seen.has(normName)) {
          const prev = seen.get(normName);
          if (!prev.cloudId && b.cloudId) {
            duplicateIds.push(prev.id);
            seen.set(normName, b);
          } else {
            duplicateIds.push(b.id);
          }
        } else {
          seen.set(normName, b);
        }
      }

      for (const dupId of duplicateIds) {
        try {
          await this.delete(dupId);
        } catch (e) {}
      }
    } catch (err) {
      console.warn('Erro ao limpar bandas duplicadas:', err);
    }
  },

  async getAll() {
    try {
      const result = await db.getAllAsync('SELECT * FROM my_bands ORDER BY name ASC;');
      return result || [];
    } catch (error) {
      console.error('Error in bandService.getAll:', error);
      throw error;
    }
  },

  async checkUsername(username, excludeBandId = null) {
    try {
      const clean = (username || '').trim().toLowerCase().replace('@', '');
      if (clean.length < 3) {
        return { available: false, message: 'O username da banda deve ter no mínimo 3 caracteres.' };
      }
      if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
        return { available: false, message: 'Apenas letras, números e sublinhados (_).' };
      }

      // 1. Check local SQLite bands first
      try {
        const localBands = await db.getAllAsync('SELECT id, name, publicSlug, cloudId FROM my_bands;');
        const localMatch = (localBands || []).find(b => {
          if (excludeBandId && (String(b.id) === String(excludeBandId) || (b.cloudId && String(b.cloudId) === String(excludeBandId)))) {
            return false;
          }
          const bSlug = (b.publicSlug || '').trim().toLowerCase().replace('@', '');
          const bNameSlug = (b.name || '').trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
          const bName = (b.name || '').trim().toLowerCase();
          return bSlug === clean || bNameSlug === clean || bName === clean;
        });

        if (localMatch) {
          return {
            available: false,
            message: `Você já possui a banda "${localMatch.name}" com este username (@${clean}).`,
            username: clean
          };
        }
      } catch (localErr) {
        console.warn('Erro ao verificar bandas locais:', localErr);
      }

      // 2. Check cloud API
      return await api.checkBandUsername(clean, excludeBandId);
    } catch (e) {
      console.warn('Erro no checkUsername:', e);
      return { available: true, username: (username || '').trim().toLowerCase().replace('@', '') };
    }
  },

  async insert(name, imageUri, startDate = '', endDate = '', bandType = 'cover', isCover = 1, isAutoral = 0, city = '', state = '', country = '', genres = '[]', links = '{}', instagram = '', youtube = '', spotify = '', tiktok = '', facebook = '', publicSlug = '') {
    try {
      const result = await db.runAsync(
        'INSERT INTO my_bands (name, imageUri, startDate, endDate, bandType, isCover, isAutoral, city, state, country, genres, links, instagram, youtube, spotify, tiktok, facebook, publicSlug) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
        [
          sanitizeText(name, 100),
          imageUri,
          sanitizeText(startDate, 20) || '',
          sanitizeText(endDate, 20) || '',
          sanitizeText(bandType, 20) || 'cover',
          isCover !== undefined ? isCover : 1,
          isAutoral !== undefined ? isAutoral : 0,
          sanitizeText(city, 100) || '',
          sanitizeText(state, 100) || '',
          sanitizeText(country, 100) || '',
          sanitizeJson(genres) || '[]',
          sanitizeJson(links) || '{}',
          sanitizeText(instagram, 100) || '',
          sanitizeText(youtube, 200) || '',
          sanitizeText(spotify, 200) || '',
          sanitizeText(tiktok, 100) || '',
          sanitizeText(facebook, 200) || '',
          sanitizeText(publicSlug, 50) || ''
        ]
      );
      const newId = result.lastInsertRowId;
      try {
        await this.logBandActivity(newId, 'created_band', `criou a banda ${name.trim()}`);
      } catch (e) {}
      return newId;
    } catch (error) {
      console.error('Error in bandService.insert:', error);
      throw error;
    }
  },

  async update(id, name, imageUri, startDate = '', endDate = '', bandType = 'cover', isCover = 1, isAutoral = 0, city = '', state = '', country = '', genres = '[]', links = '{}', instagram = '', youtube = '', spotify = '', tiktok = '', facebook = '', publicSlug = '') {
    try {
      await db.runAsync(
        'UPDATE my_bands SET name = ?, imageUri = ?, startDate = ?, endDate = ?, bandType = ?, isCover = ?, isAutoral = ?, city = ?, state = ?, country = ?, genres = ?, links = ?, instagram = ?, youtube = ?, spotify = ?, tiktok = ?, facebook = ?, publicSlug = ?, hasLocalChanges = 1 WHERE id = ?;',
        [
          sanitizeText(name, 100),
          imageUri,
          sanitizeText(startDate, 20) || '',
          sanitizeText(endDate, 20) || '',
          sanitizeText(bandType, 20) || 'cover',
          isCover !== undefined ? isCover : 1,
          isAutoral !== undefined ? isAutoral : 0,
          sanitizeText(city, 100) || '',
          sanitizeText(state, 100) || '',
          sanitizeText(country, 100) || '',
          sanitizeJson(genres) || '[]',
          sanitizeJson(links) || '{}',
          sanitizeText(instagram, 100) || '',
          sanitizeText(youtube, 200) || '',
          sanitizeText(spotify, 200) || '',
          sanitizeText(tiktok, 100) || '',
          sanitizeText(facebook, 200) || '',
          sanitizeText(publicSlug, 50) || '',
          id
        ]
      );
      await this.logBandActivity(id, 'update_band', `atualizou os dados da banda: ${name.trim()}`);
    } catch (error) {
      console.error('Error in bandService.update:', error);
      throw error;
    }
  },

  async delete(id) {
    try {
      // 1. Obter os dados da banda antes da exclusão (para recuperar cloudId)
      let band = null;
      try {
        const rows = await db.getAllAsync('SELECT * FROM my_bands WHERE id = ?;', [id]);
        if (rows && rows.length > 0) {
          band = rows[0];
        }
      } catch (findErr) {
        console.warn('Erro ao buscar banda para exclusão:', findErr);
      }

      // 2. Se a banda estiver sincronizada na nuvem, apagar/desvincular no servidor
      if (band && band.cloudId) {
        try {
          await api.deleteBand(band.cloudId);
        } catch (cloudErr) {
          console.warn('Erro ao excluir banda na nuvem (ou já removida):', cloudErr);
        }
      }

      // 3. Excluir dados relacionados no SQLite local (cascata manual para segurança)
      try {
        await db.runAsync('DELETE FROM band_songs WHERE bandId = ?;', [id]);
      } catch (e) {}

      try {
        await db.runAsync('DELETE FROM band_members WHERE bandId = ?;', [id]);
      } catch (e) {}

      try {
        await db.runAsync('DELETE FROM band_finances WHERE bandId = ?;', [id]);
      } catch (e) {}

      try {
        await db.runAsync('DELETE FROM band_activity_logs WHERE bandId = ?;', [id]);
      } catch (e) {}

      // 4. Excluir setlists e músicas associadas vinculadas a esta banda
      try {
        await db.runAsync(`
          DELETE FROM setlist_songs 
          WHERE setlistId IN (SELECT id FROM setlists WHERE myBandId = ?);
        `, [id]);
        await db.runAsync('DELETE FROM setlists WHERE myBandId = ?;', [id]);
      } catch (e) {}

      // 5. Excluir o registro principal da banda
      await db.runAsync('DELETE FROM my_bands WHERE id = ?;', [id]);

      // 6. Limpar cache de perfil em AsyncStorage se contiver a banda
      try {
        const cachedStr = await AsyncStorage.getItem('user_profile_cache');
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          if (cached && Array.isArray(cached.bands)) {
            cached.bands = cached.bands.filter(b => b && b.bandId !== id && b.id !== String(id));
            await AsyncStorage.setItem('user_profile_cache', JSON.stringify(cached));
          }
        }
      } catch (cacheErr) {}

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

  async toggleNetworkVisibility(id, isVisible) {
    try {
      await db.runAsync('UPDATE my_bands SET isNetworkVisible = ? WHERE id = ?;', [isVisible ? 1 : 0, id]);
    } catch (error) {
      console.error('Error in bandService.toggleNetworkVisibility:', error);
      throw error;
    }
  },

  // ===== GESTÃO DE REPERTÓRIO DA BANDA (band_songs) =====
  async getBandSongs(bandId) {
    try {
      const result = await db.getAllAsync(
        'SELECT s.*, bs.isFavorite as isBandFavorite FROM band_songs bs JOIN songs s ON bs.songId = s.id WHERE bs.bandId = ? ORDER BY s.name ASC;',
        [bandId]
      );
      if (!result || result.length === 0) return [];
      
      // Carregar song_links para as músicas em uma única query otimizada
      try {
        const songIds = result.map(s => s.id);
        const placeholders = songIds.map(() => '?').join(',');
        const allLinks = await db.getAllAsync(`SELECT * FROM song_links WHERE songId IN (${placeholders});`, songIds);

        const linksBySongId = {};
        if (allLinks && allLinks.length > 0) {
          for (const l of allLinks) {
            if (!linksBySongId[l.songId]) linksBySongId[l.songId] = [];
            linksBySongId[l.songId].push(l);
          }
        }

        return result.map(song => ({
          ...song,
          isFavorite: song.isBandFavorite !== undefined ? Boolean(song.isBandFavorite) : Boolean(song.isFavorite),
          links: linksBySongId[song.id] || []
        }));
      } catch (linkErr) {
        return result.map(song => ({
          ...song,
          isFavorite: song.isBandFavorite !== undefined ? Boolean(song.isBandFavorite) : Boolean(song.isFavorite),
          links: []
        }));
      }
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
      this.syncBandToCloud(bandId).catch(e => console.log('Background sync on favorite toggle:', e));
      return newStatus;
    } catch (error) {
      console.error('Error in bandService.toggleBandSongFavorite:', error);
      throw error;
    }
  },

  async addSongToBand(bandId, songId) {
    try {
      const existing = await db.getAllAsync(
        'SELECT 1 FROM band_songs WHERE bandId = ? AND songId = ?;',
        [bandId, songId]
      );
      if (existing && existing.length > 0) {
        // Música já pertence ao repertório desta banda!
        return;
      }
      await db.runAsync(
        'INSERT OR IGNORE INTO band_songs (bandId, songId) VALUES (?, ?);',
        [bandId, songId]
      );
      const songRow = await db.getAllAsync('SELECT name FROM songs WHERE id = ?;', [songId]);
      const songName = songRow && songRow[0] ? songRow[0].name : 'música';
      await this.logBandActivity(bandId, 'add_song', `adicionou a música: ${songName}`);
    } catch (error) {
      console.error('Error in bandService.addSongToBand:', error);
    }
  },

  async addSongsToBand(bandId, songIds) {
    try {
      if (!Array.isArray(songIds) || songIds.length === 0) return;
      let actuallyAdded = 0;
      for (const songId of songIds) {
        const existing = await db.getAllAsync(
          'SELECT 1 FROM band_songs WHERE bandId = ? AND songId = ?;',
          [bandId, songId]
        );
        if (!existing || existing.length === 0) {
          await db.runAsync(
            'INSERT OR IGNORE INTO band_songs (bandId, songId) VALUES (?, ?);',
            [bandId, songId]
          );
          actuallyAdded++;
        }
      }
      if (actuallyAdded > 0) {
        await this.logBandActivity(bandId, 'add_songs', `adicionou ${actuallyAdded} música${actuallyAdded > 1 ? 's' : ''} ao repertório`);
      }
    } catch (error) {
      console.error('Error in bandService.addSongsToBand:', error);
    }
  },

  async removeSongFromBand(bandId, songId) {
    try {
      const songRow = await db.getAllAsync('SELECT name FROM songs WHERE id = ?;', [songId]);
      const songName = songRow && songRow[0] ? songRow[0].name : 'música';
      await db.runAsync(
        'DELETE FROM band_songs WHERE bandId = ? AND songId = ?;',
        [bandId, songId]
      );
      await this.logBandActivity(bandId, 'remove_song', `removeu a música: ${songName}`);
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
        [bandId, sanitizeText(title, 200), parseFloat(amount) || 0, sanitizeText(type, 20), sanitizeText(date, 20) || '', sanitizeText(status, 20), sanitizeText(notes, 500) || '', setlistId]
      );
      const finId = result.lastInsertRowId;
      try {
        await this.logBandActivity(bandId, 'added_finance', `registrou financeiro: ${title.trim()}`);
      } catch (e) {}
      return finId;
    } catch (error) {
      console.error('Error in bandService.addFinancialEntry:', error);
      throw error;
    }
  },

  async updateFinancialEntry(id, title, amount, type, date, status, notes) {
    try {
      await db.runAsync(
        'UPDATE band_finances SET title = ?, amount = ?, type = ?, date = ?, status = ?, notes = ? WHERE id = ?;',
        [sanitizeText(title, 200), parseFloat(amount) || 0, sanitizeText(type, 20), sanitizeText(date, 20) || '', sanitizeText(status, 20), sanitizeText(notes, 500) || '', id]
      );
      try {
        const row = await db.getAllAsync('SELECT bandId FROM band_finances WHERE id = ?;', [id]);
        if (row && row[0]) {
          await this.logBandActivity(row[0].bandId, 'updated_finance', `atualizou financeiro: ${title.trim()}`);
        }
      } catch (e) {}
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
      try {
        const row = await db.getAllAsync('SELECT bandId, title FROM band_finances WHERE id = ?;', [id]);
        if (row && row[0]) {
          await this.logBandActivity(row[0].bandId, 'deleted_finance', `removeu registro financeiro: ${row[0].title.trim()}`);
        }
      } catch (e) {}
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

  async getMembers(bandId) {
    return this.getBandMembers(bandId);
  },

  async addBandMember(bandId, name, role, phone = '', startDate = '', endDate = '', status = 'active', cycles = '[]', username = '', inviteMessage = '', replyMessage = '', isLeader = 0) {
    try {
      const result = await db.runAsync(
        'INSERT INTO band_members (bandId, name, role, phone, startDate, endDate, status, cycles, username, inviteMessage, replyMessage, isLeader) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
        [bandId, sanitizeText(name, 100), sanitizeText(role, 100), sanitizeText(phone, 20), sanitizeText(startDate, 20), sanitizeText(endDate, 20), sanitizeText(status, 20), sanitizeJson(cycles), sanitizeText(username, 50) || '', sanitizeText(inviteMessage, 500) || '', sanitizeText(replyMessage, 500) || '', isLeader ? 1 : 0]
      );
      await this.logBandActivity(bandId, 'add_member', `adicionou o integrante: ${name.trim()}`);
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Error in bandService.addBandMember:', error);
      throw error;
    }
  },

  async updateBandMember(id, name, role, phone = '', startDate = '', endDate = '', status = 'active', cycles = '[]', username = '', inviteMessage = '', replyMessage = '', isLeader = 0) {
    try {
      const existing = await db.getAllAsync('SELECT bandId FROM band_members WHERE id = ?;', [id]);
      const bandId = existing && existing[0] ? existing[0].bandId : null;
      await db.runAsync(
        'UPDATE band_members SET name = ?, role = ?, phone = ?, startDate = ?, endDate = ?, status = ?, cycles = ?, username = ?, inviteMessage = ?, replyMessage = ?, isLeader = ? WHERE id = ?;',
        [sanitizeText(name, 100), sanitizeText(role, 100), sanitizeText(phone, 20), sanitizeText(startDate, 20), sanitizeText(endDate, 20), sanitizeText(status, 20), sanitizeJson(cycles), sanitizeText(username, 50) || '', sanitizeText(inviteMessage, 500) || '', sanitizeText(replyMessage, 500) || '', isLeader ? 1 : 0, id]
      );
      if (bandId) {
        await this.logBandActivity(bandId, 'update_member', `atualizou o integrante: ${name.trim()}`);
      }
    } catch (error) {
      console.error('Error in bandService.updateBandMember:', error);
      throw error;
    }
  },

  async updateMemberLeaderStatus(id, isLeader) {
    try {
      await db.runAsync(
        'UPDATE band_members SET isLeader = ? WHERE id = ?;',
        [isLeader ? 1 : 0, id]
      );
    } catch (error) {
      console.error('Error in bandService.updateMemberLeaderStatus:', error);
      throw error;
    }
  },

  async updateMemberStatusAndReply(id, status, replyMessage = '', startDate = '') {
    try {
      if (startDate) {
        await db.runAsync(
          'UPDATE band_members SET status = ?, replyMessage = ?, startDate = ? WHERE id = ?;',
          [sanitizeText(status, 20), sanitizeText(replyMessage, 500) || '', sanitizeText(startDate, 20), id]
        );
      } else {
        await db.runAsync(
          'UPDATE band_members SET status = ?, replyMessage = ? WHERE id = ?;',
          [sanitizeText(status, 20), sanitizeText(replyMessage, 500) || '', id]
        );
      }
    } catch (error) {
      console.error('Error in bandService.updateMemberStatusAndReply:', error);
    }
  },

  async deleteBandMember(id) {
    try {
      try {
        const memRows = await db.getAllAsync('SELECT bandId, name FROM band_members WHERE id = ?;', [id]);
        if (memRows && memRows[0]) {
          await this.logBandActivity(memRows[0].bandId, 'removed_member', `removeu o integrante: ${memRows[0].name.trim()}`);
        }
      } catch (e) {}
      await db.runAsync('DELETE FROM band_members WHERE id = ?;', [id]);
    } catch (error) {
      console.error('Error in bandService.deleteBandMember:', error);
      throw error;
    }
  },

  // ===== GESTÃO DE DIVISÃO DE CACHÊ POR INTEGRANTE =====
  async saveShowCacheSplit(setlistId, splitsMap, cacheStatus = 'paid') {
    try {
      const key = `cache_split_${setlistId}`;
      const jsonVal = JSON.stringify(splitsMap || {});
      try {
        await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);', [key, jsonVal]);
        await db.runAsync('UPDATE setlists SET cacheStatus = ? WHERE id = ?;', [cacheStatus, setlistId]);
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
  },

  // ==========================================
  // CLOUD COLLABORATION & SYNC (OFFLINE-FIRST)
  // ==========================================

  async getBandById(id) {
    try {
      const rows = await db.getAllAsync('SELECT * FROM my_bands WHERE id = ?;', [id]);
      return rows && rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error in bandService.getBandById:', error);
      return null;
    }
  },

  async updateCloudInfo(id, cloudId, cloudVersion, lastSyncedAt, isNetworkVisible) {
    try {
      await db.runAsync(
        'UPDATE my_bands SET cloudId = ?, cloudVersion = ?, lastSyncedAt = ?, isNetworkVisible = ?, hasLocalChanges = 0 WHERE id = ?;',
        [cloudId, cloudVersion, lastSyncedAt, isNetworkVisible ? 1 : 0, id]
      );
    } catch (error) {
      console.error('Error in bandService.updateCloudInfo:', error);
    }
  },

  async logBandActivity(bandId, actionType, description, metadata = null) {
    if (!bandId) return;
    try {
      let authorName = 'Usuário';
      let authorId = null;
      try {
        const userInfoStr = await AsyncStorage.getItem('user_info');
        if (userInfoStr) {
          const user = JSON.parse(userInfoStr);
          authorName = user.username || user.displayName || user.email || 'Usuário';
          authorId = user.id || user.userId || null;
        }
      } catch (uErr) {}

      const metaStr = metadata ? JSON.stringify(metadata) : null;
      await db.runAsync(
        'INSERT INTO band_activity_logs (bandId, actionType, authorName, authorId, description, metadataJson, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?);',
        [bandId, actionType, authorName, authorId, description, metaStr, new Date().toISOString()]
      );

      // Toda alteração marca que a banda precisa sincronizar
      await this.markBandNeedsSync(bandId);

      // Se a banda já for online, sincroniza automaticamente em background
      this.autoSyncIfOnline(bandId).catch(() => {});
    } catch (err) {
      console.warn('Error in bandService.logBandActivity:', err);
    }
  },

  async getBandActivityLogs(bandId, limit = 50) {
    try {
      const rows = await db.getAllAsync(
        'SELECT * FROM band_activity_logs WHERE bandId = ? ORDER BY createdAt DESC, id DESC LIMIT ?;',
        [bandId, limit]
      );
      return rows || [];
    } catch (err) {
      console.warn('Error in bandService.getBandActivityLogs:', err);
      return [];
    }
  },

  async autoSyncIfOnline(bandId) {
    try {
      if (!bandId) return;
      const loggedIn = await api.isLoggedIn();
      if (!loggedIn) return;

      const local = await this.getBandById(bandId);
      if (!local) return;

      // Se a banda não tiver cloudId mas o usuário estiver logado, vincula com a nuvem pelo nome ou cria
      if (!local.cloudId) {
        try {
          const myCloudBands = await api.getMyCloudBands();
          const existing = myCloudBands.find(b => b.name?.trim().toLowerCase() === local.name.trim().toLowerCase());
          if (existing && existing.id) {
            await this.updateCloudInfo(bandId, existing.id, existing.version || 0, existing.lastSyncedAt || new Date().toISOString(), existing.isNetworkVisible ? 1 : 0);
          } else {
            // Sincroniza diretamente (o próprio syncBandToCloud criará na nuvem)
            await this.syncBandToCloud(bandId);
            return;
          }
        } catch (linkErr) {
          console.log('Error auto-linking band to cloud:', linkErr);
        }
      }

      // Dispara push silencioso em background
      await this.syncBandToCloud(bandId);
    } catch (e) {
      console.log('Background auto-sync note for band', bandId, ':', e.message);
    }
  },

  async markBandNeedsSync(bandId) {
    if (!bandId) return;
    try {
      await db.runAsync('UPDATE my_bands SET hasLocalChanges = 1 WHERE id = ?;', [bandId]);
    } catch (e) {
      console.warn('Error in bandService.markBandNeedsSync:', e);
    }
  },

  async checkSyncStatus(bandId) {
    try {
      const localBand = await this.getBandById(bandId);
      if (!localBand) return { isSynced: false, hasRemoteUpdates: false };

      if (!localBand.cloudId) {
        return { isSynced: false, hasRemoteUpdates: false, localBand };
      }

      const cloudBands = await api.getMyCloudBands();
      const cloudBand = cloudBands.find(b => b.id === localBand.cloudId || b.id === Number(localBand.cloudId));

      if (!cloudBand) {
        return { isSynced: false, hasRemoteUpdates: false, localBand };
      }

      const localVersion = localBand.cloudVersion || 0;
      const remoteVersion = cloudBand.version || 0;
      const hasRemoteUpdates = remoteVersion > localVersion;

      return {
        isSynced: true,
        isLeader: cloudBand.isLeader,
        localVersion,
        remoteVersion,
        hasRemoteUpdates,
        cloudBand,
        localBand,
        lastSyncedAt: localBand.lastSyncedAt
      };
    } catch (error) {
      console.error('Error in bandService.checkSyncStatus:', error);
      return { isSynced: false, hasRemoteUpdates: false, error: error.message };
    }
  },

  async syncBandToCloud(bandId) {
    try {
      const localBand = await this.getBandById(bandId);
      if (!localBand) throw new Error('Banda não encontrada localmente.');

      const loggedIn = await api.isLoggedIn();
      if (!loggedIn) throw new Error('Você precisa estar logado na sua conta BandLink para sincronizar.');

      // 1. Gather all local data for this band
      const members = await this.getBandMembers(bandId);
      const repertoireSongs = await this.getBandSongs(bandId);
      const finances = await this.getBandFinances(bandId);

      // Convert local image to base64 if needed so it is portable to any device/user
      let syncImageUri = localBand.imageUri || '';
      if (syncImageUri && (syncImageUri.startsWith('file://') || syncImageUri.startsWith('content://'))) {
        try {
          if (Platform.OS !== 'web' && FileSystem) {
            const base64Data = await FileSystem.readAsStringAsync(syncImageUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            if (base64Data) {
              syncImageUri = `data:image/jpeg;base64,${base64Data}`;
            }
          }
        } catch (imgErr) {
          console.log('Could not convert local image to base64 for cloud sync:', imgErr);
        }
      }

      // Gather setlists (Agenda / Shows / Ensaios) for this band
      let setlists = [];
      try {
        const rawSetlists = await db.getAllAsync('SELECT * FROM setlists WHERE myBandId = ? ORDER BY date DESC, id DESC;', [bandId]);
        if (rawSetlists && rawSetlists.length > 0) {
          setlists = await Promise.all(rawSetlists.map(async (sl) => {
            const songsInSetlist = await db.getAllAsync(
              'SELECT ss.*, s.name, s.originalBand, s.duration, s.style FROM setlist_songs ss JOIN songs s ON ss.songId = s.id WHERE ss.setlistId = ? ORDER BY ss.order_num ASC;',
              [sl.id]
            );
            // Deduplicate and cap at 100
            const seenSongIds = new Set();
            const cleanList = [];
            for (const item of (songsInSetlist || [])) {
              if (item.songId >= 0 && seenSongIds.has(item.songId)) continue;
              if (item.songId >= 0) seenSongIds.add(item.songId);
              cleanList.push(item);
              if (cleanList.length >= 100) break;
            }
            return { ...sl, songs: cleanList };
          }));
        }
      } catch (sle) {
        console.warn('Could not read setlists for band sync:', sle);
      }

      // Gather activity logs for this band
      let activityLogs = [];
      try {
        activityLogs = await this.getBandActivityLogs(bandId, 60);
      } catch (ale) {
        console.warn('Could not read activity logs for band sync:', ale);
      }

      // Snapshot structure
      const syncPayloadData = {
        activityLogs: activityLogs || [],
        band: {
          name: localBand.name,
          imageUri: syncImageUri,
          city: localBand.city,
          state: localBand.state,
          country: localBand.country,
          bandType: localBand.bandType,
          genres: localBand.genres,
          links: localBand.links,
          instagram: localBand.instagram,
          youtube: localBand.youtube,
          spotify: localBand.spotify,
          tiktok: localBand.tiktok,
          facebook: localBand.facebook,
        },
        members: members || [],
        finances: finances || [],
        songs: (repertoireSongs || []).map(s => ({
          id: s.id || s.songId,
          name: s.name,
          originalBand: s.originalBand,
          style: s.style,
          duration: s.duration,
          defaultView: s.defaultView,
          lyrics: s.lyrics,
          chords: s.chords,
          tabs: s.tabs,
          isFavorite: s.isFavorite,
          links: s.links || []
        })),
        setlists: setlists || [],
        syncedAt: new Date().toISOString()
      };

      const syncPayload = {
        name: localBand.name,
        publicSlug: localBand.publicSlug || '',
        genre: localBand.genres || '',
        description: localBand.city ? `${localBand.city}${localBand.state ? ', ' + localBand.state : ''}` : '',
        imageUri: syncImageUri,
        city: localBand.city || '',
        state: localBand.state || '',
        country: localBand.country || '',
        bandType: localBand.bandType || '',
        genresJson: typeof localBand.genres === 'string' ? localBand.genres : JSON.stringify(localBand.genres || []),
        linksJson: typeof localBand.links === 'string' ? localBand.links : JSON.stringify(localBand.links || {}),
        instagram: localBand.instagram || '',
        youtube: localBand.youtube || '',
        spotify: localBand.spotify || '',
        isNetworkVisible: Boolean(localBand.isNetworkVisible),
        syncDataJson: JSON.stringify(syncPayloadData)
      };

      let cloudId = localBand.cloudId;

      // If no cloudId, check if we need to create it
      if (!cloudId) {
        // Check if already in myCloudBands with same name
        const myCloudBands = await api.getMyCloudBands();
        const existing = myCloudBands.find(b => b.name?.trim().toLowerCase() === localBand.name.trim().toLowerCase());
        if (existing) {
          cloudId = existing.id;
        } else {
          const createRes = await api.createBand({
            name: localBand.name,
            publicSlug: localBand.publicSlug || '',
            genre: localBand.genres,
            description: localBand.city
          });
          cloudId = createRes.bandId;
        }
      }

      // Sync payload to cloud
      const syncRes = await api.syncBand(cloudId, syncPayload);

      // Update local SQLite
      const now = new Date().toISOString();
      await this.updateCloudInfo(
        bandId,
        cloudId,
        syncRes.version || (localBand.cloudVersion || 0) + 1,
        now,
        syncRes.isNetworkVisible !== undefined ? syncRes.isNetworkVisible : localBand.isNetworkVisible
      );

      return {
        success: true,
        cloudId,
        version: syncRes.version,
        lastSyncedAt: now,
        isNetworkVisible: syncRes.isNetworkVisible,
        message: 'Banda e repertório sincronizados na nuvem!'
      };
    } catch (error) {
      console.error('Error in bandService.syncBandToCloud:', error);
      throw error;
    }
  },

  async pullBandFromCloud(bandId) {
    try {
      const localBand = await this.getBandById(bandId);
      if (!localBand) throw new Error('Banda não encontrada localmente.');
      if (!localBand.cloudId) throw new Error('Esta banda ainda não possui vínculo com a nuvem.');

      const loggedIn = await api.isLoggedIn();
      if (!loggedIn) throw new Error('Faça login para baixar as atualizações do líder.');

      // Pull from cloud
      const cloudData = await api.pullBand(localBand.cloudId);
      if (!cloudData || !cloudData.syncDataJson) {
        throw new Error('Nenhum dado sincronizado encontrado na nuvem para esta banda.');
      }

      const snapshot = typeof cloudData.syncDataJson === 'string'
        ? JSON.parse(cloudData.syncDataJson)
        : cloudData.syncDataJson;

      // 1. Update band basic metadata and save image locally
      let incomingImage = snapshot.band?.imageUri || cloudData.imageUri;
      let finalImageUri = localBand.imageUri;

      if (incomingImage) {
        if (incomingImage.startsWith('data:image/')) {
          if (Platform.OS !== 'web' && FileSystem && FileSystem.documentDirectory) {
            try {
              const base64Data = incomingImage.replace(/^data:image\/\w+;base64,/, '');
              const filename = `${FileSystem.documentDirectory}band_${bandId}_logo.jpg`;
              await FileSystem.writeAsStringAsync(filename, base64Data, {
                encoding: FileSystem.EncodingType.Base64,
              });
              finalImageUri = filename;
            } catch (fsErr) {
              console.log('Error saving incoming cloud image to disk:', fsErr);
              finalImageUri = incomingImage;
            }
          } else {
            finalImageUri = incomingImage;
          }
        } else if (incomingImage.startsWith('http://') || incomingImage.startsWith('https://')) {
          finalImageUri = incomingImage;
        } else if (incomingImage.startsWith('file://')) {
          if (Platform.OS !== 'web' && FileSystem) {
            try {
              const info = await FileSystem.getInfoAsync(incomingImage);
              if (info.exists) {
                finalImageUri = incomingImage;
              }
            } catch (e) {}
          }
        }
      }

      if (snapshot.band) {
        await db.runAsync(
          `UPDATE my_bands SET 
            name = ?, 
            imageUri = COALESCE(?, imageUri),
            city = COALESCE(?, city),
            state = COALESCE(?, state),
            country = COALESCE(?, country),
            bandType = COALESCE(?, bandType),
            genres = COALESCE(?, genres),
            links = COALESCE(?, links),
            instagram = COALESCE(?, instagram),
            youtube = COALESCE(?, youtube),
            spotify = COALESCE(?, spotify),
            tiktok = COALESCE(?, tiktok),
            facebook = COALESCE(?, facebook),
            isNetworkVisible = ?,
            cloudVersion = ?,
            lastSyncedAt = ?
          WHERE id = ?;`,
          [
            snapshot.band.name || localBand.name,
            finalImageUri,
            snapshot.band.city,
            snapshot.band.state,
            snapshot.band.country,
            snapshot.band.bandType,
            snapshot.band.genres,
            snapshot.band.links,
            snapshot.band.instagram,
            snapshot.band.youtube,
            snapshot.band.spotify,
            snapshot.band.tiktok,
            snapshot.band.facebook,
            cloudData.isNetworkVisible ? 1 : 0,
            cloudData.version || localBand.cloudVersion,
            new Date().toISOString(),
            bandId
          ]
        );
      }

      // 2. Synchronize songs & repertoire into local SQLite
      if (snapshot.songs && Array.isArray(snapshot.songs)) {
        for (const song of snapshot.songs) {
          if (!song.name) continue;
          // Check if song already exists in local songs table
          const existing = await db.getAllAsync(
            'SELECT id FROM songs WHERE LOWER(name) = ? AND LOWER(COALESCE(originalBand, "")) = ?;',
            [song.name.trim().toLowerCase(), (song.originalBand || '').trim().toLowerCase()]
          );

          let localSongId = existing && existing.length > 0 ? existing[0].id : null;

          if (!localSongId) {
            // Insert new song into offline SQLite
            const insertResult = await db.runAsync(
              `INSERT INTO songs (name, originalBand, style, duration, defaultView, lyrics, chords, tabs, isFavorite)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
              [
                song.name,
                song.originalBand || '',
                song.style || '',
                song.duration || '',
                song.defaultView || 'lyrics',
                song.lyrics || '',
                song.chords || '',
                song.tabs || '',
                song.isFavorite ? 1 : 0
              ]
            );
            localSongId = insertResult.lastInsertRowId;
          } else {
            // Update lyrics, chords, tabs if cloud is newer
            await db.runAsync(
              `UPDATE songs SET 
                lyrics = COALESCE(?, lyrics),
                chords = COALESCE(?, chords),
                tabs = COALESCE(?, tabs),
                duration = COALESCE(?, duration),
                style = COALESCE(?, style)
              WHERE id = ?;`,
              [song.lyrics, song.chords, song.tabs, song.duration, song.style, localSongId]
            );
          }

          // Link song to this band repertoire and keep favorite status in sync
          if (localSongId) {
            await db.runAsync(
              `INSERT INTO band_songs (bandId, songId, isFavorite) VALUES (?, ?, ?)
               ON CONFLICT(bandId, songId) DO UPDATE SET isFavorite = excluded.isFavorite;`,
              [bandId, localSongId, song.isFavorite ? 1 : 0]
            );
          }
        }
      }

      // 3. Synchronize setlists into local SQLite
      if (snapshot.setlists && Array.isArray(snapshot.setlists)) {
        // Load all local setlists for this band or orphan setlists to match accurately without collisions
        const rawLocalSetlists = await db.getAllAsync(
          'SELECT * FROM setlists WHERE myBandId = ? OR myBandId IS NULL;',
          [bandId]
        );
        const localSetlists = Array.isArray(rawLocalSetlists) ? [...rawLocalSetlists] : [];
        const matchedLocalIds = new Set();

        for (const sl of snapshot.setlists) {
          if (!sl.name) continue;
          const slNameClean = sl.name.trim().toLowerCase();
          const slNormDate = normalizeDateStr(sl.date);

          // Find an unmatched local setlist with same name and matching date
          let matchedItem = null;
          for (const item of localSetlists) {
            if (matchedLocalIds.has(item.id)) continue;
            const itemNameClean = (item.name || '').trim().toLowerCase();
            if (itemNameClean !== slNameClean) continue;

            const itemNormDate = normalizeDateStr(item.date);
            if (slNormDate) {
              if (itemNormDate === slNormDate) {
                matchedItem = item;
                break;
              }
            } else {
              if (!itemNormDate) {
                matchedItem = item;
                break;
              }
            }
          }

          let localSetlistId = matchedItem ? matchedItem.id : null;
          if (matchedItem && matchedItem.myBandId !== bandId) {
            try {
              await db.runAsync('UPDATE setlists SET myBandId = ? WHERE id = ?;', [bandId, matchedItem.id]);
            } catch (e) {}
          }

          if (!localSetlistId) {
            const slLocal = sl.local || sl.venue || sl.location || sl.place || '';
            const insSl = await db.runAsync(
              `INSERT INTO setlists (name, type, myBandId, date, time, local, cachê, notes, isFavorite)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
              [
                sl.name,
                sl.type || 'show',
                bandId,
                sl.date || '',
                sl.time || '',
                slLocal,
                sl.cache || sl.cachê || '',
                sl.notes || '',
                sl.isFavorite ? 1 : 0
              ]
            );
            localSetlistId = insSl.lastInsertRowId;
            localSetlists.push({
              id: localSetlistId,
              name: sl.name,
              type: sl.type || 'show',
              myBandId: bandId,
              date: sl.date || '',
              time: sl.time || '',
              local: slLocal
            });
            matchedLocalIds.add(localSetlistId);
          } else {
            matchedLocalIds.add(localSetlistId);
            const slLocal = sl.local || sl.venue || sl.location || sl.place || '';
            // Update existing setlist event data
            await db.runAsync(
              `UPDATE setlists SET
                type = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE type END,
                date = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE date END,
                time = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE time END,
                local = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE local END,
                cachê = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE cachê END,
                notes = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE notes END
               WHERE id = ?;`,
              [
                sl.type, sl.type, sl.type,
                sl.date, sl.date, sl.date,
                sl.time, sl.time, sl.time,
                slLocal, slLocal, slLocal,
                sl.cache || sl.cachê, sl.cache || sl.cachê, sl.cache || sl.cachê,
                sl.notes, sl.notes, sl.notes,
                localSetlistId
              ]
            );
          }

          // Link songs in setlist
          if (localSetlistId && sl.songs && Array.isArray(sl.songs)) {
            // Clean previous associations to prevent duplicating songs on repeated syncs
            await db.runAsync('DELETE FROM setlist_songs WHERE setlistId = ?;', [localSetlistId]);
            const seenSongIds = new Set();
            let orderIdx = 0;
            for (let i = 0; i < sl.songs.length; i++) {
              if (orderIdx >= 100) break;
              const slSong = sl.songs[i];
              if (!slSong || !slSong.name) continue;
              const matchSong = await db.getAllAsync(
                'SELECT id FROM songs WHERE LOWER(name) = ?;',
                [slSong.name.trim().toLowerCase()]
              );
              if (matchSong && matchSong.length > 0) {
                const sId = matchSong[0].id;
                if (seenSongIds.has(sId)) continue;
                seenSongIds.add(sId);
                await db.runAsync(
                  'INSERT INTO setlist_songs (setlistId, songId, order_num, customDuration, customNotes) VALUES (?, ?, ?, ?, ?);',
                  [localSetlistId, sId, orderIdx++, slSong.customDuration || '', slSong.customNotes || '']
                );
              }
            }
          }
        }
      }

      // 4. Synchronize band members into local SQLite
      if (snapshot.members && Array.isArray(snapshot.members)) {
        for (const m of snapshot.members) {
          if (!m.name) continue;
          const existingMem = await db.getAllAsync(
            'SELECT id FROM band_members WHERE bandId = ? AND LOWER(name) = ?;',
            [bandId, m.name.trim().toLowerCase()]
          );

          if (!existingMem || existingMem.length === 0) {
            await db.runAsync(
              'INSERT INTO band_members (bandId, name, role, phone, startDate, endDate, status) VALUES (?, ?, ?, ?, ?, ?, ?);',
              [bandId, m.name, m.role || '', m.phone || '', m.startDate || '', m.endDate || '', m.status || 'active']
            );
          } else {
            await db.runAsync(
              'UPDATE band_members SET role = COALESCE(?, role), phone = COALESCE(?, phone), startDate = COALESCE(?, startDate), endDate = COALESCE(?, endDate), status = COALESCE(?, status) WHERE id = ?;',
              [m.role, m.phone, m.startDate, m.endDate, m.status, existingMem[0].id]
            );
          }
        }
      }

      // 5. Synchronize band finances into local SQLite
      if (snapshot.finances && Array.isArray(snapshot.finances)) {
        for (const f of snapshot.finances) {
          if (!f.title) continue;
          const existingFin = await db.getAllAsync(
            'SELECT id FROM band_finances WHERE bandId = ? AND LOWER(title) = ? AND COALESCE(date, "") = ?;',
            [bandId, f.title.trim().toLowerCase(), f.date || '']
          );

          if (!existingFin || existingFin.length === 0) {
            await db.runAsync(
              'INSERT INTO band_finances (bandId, title, amount, type, date, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?);',
              [bandId, f.title, f.amount || 0, f.type || 'income', f.date || '', f.status || 'paid', f.notes || '']
            );
          }
        }
      }

      // 6. Synchronize band activity logs into local SQLite
      if (snapshot.activityLogs && Array.isArray(snapshot.activityLogs)) {
        for (const act of snapshot.activityLogs) {
          if (!act.description) continue;
          const existingAct = await db.getAllAsync(
            'SELECT id FROM band_activity_logs WHERE bandId = ? AND description = ? AND createdAt = ?;',
            [bandId, act.description, act.createdAt || '']
          );
          if (!existingAct || existingAct.length === 0) {
            await db.runAsync(
              'INSERT INTO band_activity_logs (bandId, actionType, authorName, authorId, description, metadataJson, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?);',
              [bandId, act.actionType || 'update', act.authorName || 'Membro', act.authorId || null, act.description, act.metadataJson || null, act.createdAt || new Date().toISOString()]
            );
          }
        }
      }

      // Update local band sync state
      await db.runAsync(
        'UPDATE my_bands SET cloudVersion = ?, hasLocalChanges = 0, lastSyncedAt = ? WHERE id = ?;',
        [cloudData.version || localBand.cloudVersion || 0, new Date().toISOString(), bandId]
      );

      return {
        success: true,
        version: cloudData.version,
        message: 'Todas as músicas, cifras e setlists atualizados no seu app offline!'
      };
    } catch (error) {
      console.error('Error in bandService.pullBandFromCloud:', error);
      throw error;
    }
  },

  async syncAllUserBandsFromCloud(force = false) {
    try {
      const loggedIn = await api.isLoggedIn();
      if (!loggedIn) return { success: false, reason: 'not_logged_in' };

      const myCloudBands = await api.getMyCloudBands();
      if (!Array.isArray(myCloudBands) || myCloudBands.length === 0) {
        return { success: true, count: 0 };
      }

      const localBands = await this.getAll();
      let importedOrUpdatedCount = 0;

      for (const cb of myCloudBands) {
        if (!cb || !cb.id) continue;

        // Check if band already exists locally by cloudId or by name
        let local = (localBands || []).find(b => 
          (b.cloudId && Number(b.cloudId) === Number(cb.id)) ||
          (b.name && cb.name && b.name.trim().toLowerCase() === cb.name.trim().toLowerCase())
        );

        let localBandId = local ? local.id : null;

        if (!localBandId) {
          let initialImage = null;
          if (cb.imageUri && !cb.imageUri.startsWith('file://')) {
            initialImage = cb.imageUri;
          }

          // Band exists in cloud but not locally -> create it in local SQLite!
          localBandId = await this.insert(
            cb.name || 'Minha Banda',
            initialImage,
            '',
            '',
            cb.bandType || 'cover',
            cb.bandType === 'autoral' ? 0 : 1,
            cb.bandType === 'autoral' ? 1 : 0,
            cb.city || '',
            cb.state || '',
            cb.country || 'Brasil',
            cb.genresJson || cb.genre || '[]',
            '{}',
            cb.instagram || '',
            cb.youtube || '',
            cb.spotify || '',
            '',
            ''
          );

          // Update cloud info on the new band
          await this.updateCloudInfo(
            localBandId,
            cb.id,
            0,
            cb.lastSyncedAt || new Date().toISOString(),
            cb.isNetworkVisible ? 1 : 0
          );

          // Pull all songs, setlists, and details from cloud for this band
          try {
            await this.pullBandFromCloud(localBandId);
          } catch (pullErr) {
            console.log('Error pulling band data for new band:', cb.name, pullErr);
          }

          importedOrUpdatedCount++;
        } else {
          // Band already exists locally
          if (!local.cloudId || Number(local.cloudId) !== Number(cb.id)) {
            await this.updateCloudInfo(
              localBandId,
              cb.id,
              local.cloudVersion || 0,
              local.lastSyncedAt || new Date().toISOString(),
              cb.isNetworkVisible ? 1 : (local.isNetworkVisible ? 1 : 0)
            );
          }

          // If remote version is newer, or forced, or never synced, pull updates
          const remoteVer = cb.version || 0;
          const localVer = local.cloudVersion || 0;
          if (force || remoteVer > localVer || !local.lastSyncedAt) {
            try {
              await this.pullBandFromCloud(localBandId);
              importedOrUpdatedCount++;
            } catch (pullErr) {
              console.log('Error pulling band update for:', cb.name, pullErr);
            }
          }
        }
      }

      return { success: true, count: importedOrUpdatedCount };
    } catch (err) {
      console.log('Error in syncAllUserBandsFromCloud:', err);
      return { success: false, error: err.message };
    }
  }
};
