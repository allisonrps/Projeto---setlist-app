import { db } from '../database/database';
import { sanitizeText, sanitizeJson } from './sanitize';
import { api } from './api';

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

  async insert(name, imageUri, startDate = '', endDate = '', bandType = 'cover', isCover = 1, isAutoral = 0, city = '', state = '', country = '', genres = '[]', links = '{}', instagram = '', youtube = '', spotify = '', tiktok = '', facebook = '') {
    try {
      const result = await db.runAsync(
        'INSERT INTO my_bands (name, imageUri, startDate, endDate, bandType, isCover, isAutoral, city, state, country, genres, links, instagram, youtube, spotify, tiktok, facebook) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
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
          sanitizeText(facebook, 200) || ''
        ]
      );
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Error in bandService.insert:', error);
      throw error;
    }
  },

  async update(id, name, imageUri, startDate = '', endDate = '', bandType = 'cover', isCover = 1, isAutoral = 0, city = '', state = '', country = '', genres = '[]', links = '{}', instagram = '', youtube = '', spotify = '', tiktok = '', facebook = '') {
    try {
      await db.runAsync(
        'UPDATE my_bands SET name = ?, imageUri = ?, startDate = ?, endDate = ?, bandType = ?, isCover = ?, isAutoral = ?, city = ?, state = ?, country = ?, genres = ?, links = ?, instagram = ?, youtube = ?, spotify = ?, tiktok = ?, facebook = ? WHERE id = ?;',
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
          id
        ]
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
        [bandId, sanitizeText(title, 200), parseFloat(amount) || 0, sanitizeText(type, 20), sanitizeText(date, 20) || '', sanitizeText(status, 20), sanitizeText(notes, 500) || '', setlistId]
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
        [sanitizeText(title, 200), parseFloat(amount) || 0, sanitizeText(type, 20), sanitizeText(date, 20) || '', sanitizeText(status, 20), sanitizeText(notes, 500) || '', id]
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

  async addBandMember(bandId, name, role, phone = '', startDate = '', endDate = '', status = 'active', cycles = '[]', username = '', inviteMessage = '', replyMessage = '', isLeader = 0) {
    try {
      const result = await db.runAsync(
        'INSERT INTO band_members (bandId, name, role, phone, startDate, endDate, status, cycles, username, inviteMessage, replyMessage, isLeader) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
        [bandId, sanitizeText(name, 100), sanitizeText(role, 100), sanitizeText(phone, 20), sanitizeText(startDate, 20), sanitizeText(endDate, 20), sanitizeText(status, 20), sanitizeJson(cycles), sanitizeText(username, 50) || '', sanitizeText(inviteMessage, 500) || '', sanitizeText(replyMessage, 500) || '', isLeader ? 1 : 0]
      );
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Error in bandService.addBandMember:', error);
      throw error;
    }
  },

  async updateBandMember(id, name, role, phone = '', startDate = '', endDate = '', status = 'active', cycles = '[]', username = '', inviteMessage = '', replyMessage = '', isLeader = 0) {
    try {
      await db.runAsync(
        'UPDATE band_members SET name = ?, role = ?, phone = ?, startDate = ?, endDate = ?, status = ?, cycles = ?, username = ?, inviteMessage = ?, replyMessage = ?, isLeader = ? WHERE id = ?;',
        [sanitizeText(name, 100), sanitizeText(role, 100), sanitizeText(phone, 20), sanitizeText(startDate, 20), sanitizeText(endDate, 20), sanitizeText(status, 20), sanitizeJson(cycles), sanitizeText(username, 50) || '', sanitizeText(inviteMessage, 500) || '', sanitizeText(replyMessage, 500) || '', isLeader ? 1 : 0, id]
      );
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
        'UPDATE my_bands SET cloudId = ?, cloudVersion = ?, lastSyncedAt = ?, isNetworkVisible = ? WHERE id = ?;',
        [cloudId, cloudVersion, lastSyncedAt, isNetworkVisible ? 1 : 0, id]
      );
    } catch (error) {
      console.error('Error in bandService.updateCloudInfo:', error);
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
      const members = await this.getMembers(bandId);
      const repertoireSongs = await this.getBandSongs(bandId);

      // Gather setlists for this band
      let setlists = [];
      try {
        const rawSetlists = await db.getAllAsync('SELECT * FROM setlists WHERE myBandId = ? ORDER BY date DESC, id DESC;', [bandId]);
        if (rawSetlists && rawSetlists.length > 0) {
          setlists = await Promise.all(rawSetlists.map(async (sl) => {
            const songsInSetlist = await db.getAllAsync(
              'SELECT ss.*, s.name, s.originalBand, s.duration, s.style FROM setlist_songs ss JOIN songs s ON ss.songId = s.id WHERE ss.setlistId = ? ORDER BY ss.position ASC;',
              [sl.id]
            );
            return { ...sl, songs: songsInSetlist || [] };
          }));
        }
      } catch (sle) {
        console.warn('Could not read setlists for band sync:', sle);
      }

      // Snapshot structure
      const syncPayloadData = {
        band: {
          name: localBand.name,
          imageUri: localBand.imageUri,
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
        songs: (repertoireSongs || []).map(s => ({
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
        genre: localBand.genres || '',
        description: localBand.city ? `${localBand.city}${localBand.state ? ', ' + localBand.state : ''}` : '',
        imageUri: localBand.imageUri || '',
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

      // 1. Update band basic metadata
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
            snapshot.band.imageUri,
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

          // Link song to this band repertoire
          if (localSongId) {
            await db.runAsync(
              'INSERT OR IGNORE INTO band_songs (bandId, songId, isFavorite) VALUES (?, ?, ?);',
              [bandId, localSongId, song.isFavorite ? 1 : 0]
            );
          }
        }
      }

      // 3. Synchronize setlists into local SQLite
      if (snapshot.setlists && Array.isArray(snapshot.setlists)) {
        for (const sl of snapshot.setlists) {
          if (!sl.name) continue;
          const existingSl = await db.getAllAsync(
            'SELECT id FROM setlists WHERE myBandId = ? AND LOWER(name) = ?;',
            [bandId, sl.name.trim().toLowerCase()]
          );

          let localSetlistId = existingSl && existingSl.length > 0 ? existingSl[0].id : null;

          if (!localSetlistId) {
            const insSl = await db.runAsync(
              `INSERT INTO setlists (name, date, time, local, notes, cache, myBandId, isFavorite)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
              [
                sl.name,
                sl.date || '',
                sl.time || '',
                sl.local || '',
                sl.notes || '',
                sl.cache || '',
                bandId,
                sl.isFavorite ? 1 : 0
              ]
            );
            localSetlistId = insSl.lastInsertRowId;
          }

          // Link songs in setlist
          if (localSetlistId && sl.songs && Array.isArray(sl.songs)) {
            for (let i = 0; i < sl.songs.length; i++) {
              const slSong = sl.songs[i];
              const matchSong = await db.getAllAsync(
                'SELECT id FROM songs WHERE LOWER(name) = ?;',
                [slSong.name.trim().toLowerCase()]
              );
              if (matchSong && matchSong.length > 0) {
                const sId = matchSong[0].id;
                await db.runAsync(
                  'INSERT OR IGNORE INTO setlist_songs (setlistId, songId, position, customDuration, customNotes) VALUES (?, ?, ?, ?, ?);',
                  [localSetlistId, sId, i, slSong.customDuration || '', slSong.customNotes || '']
                );
              }
            }
          }
        }
      }

      return {
        success: true,
        version: cloudData.version,
        message: 'Todas as músicas, cifras e setlists atualizados no seu app offline!'
      };
    } catch (error) {
      console.error('Error in bandService.pullBandFromCloud:', error);
      throw error;
    }
  }
};
