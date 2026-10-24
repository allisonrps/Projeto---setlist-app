import { db } from '../database/database';
import { sanitizeText, sanitizeMultiline } from './sanitize';
import { bandService } from './bandService';

export const setlistService = {
  async cleanDuplicateSetlists() {
    try {
      // Apenas desassocia eventos de bandas que foram excluídas (setando myBandId = NULL para NÃO perder o setlist/evento criado)
      try {
        await db.runAsync(`
          UPDATE setlists 
          SET myBandId = NULL 
          WHERE myBandId IS NOT NULL 
          AND myBandId NOT IN (SELECT id FROM my_bands);
        `);
      } catch (e) {}
    } catch (err) {
      console.warn('Erro ao verificar integridade de setlists:', err);
    }
  },

  async resolveLocalSongId(item) {
    if (item === null || item === undefined) return null;
    const rawId = typeof item === 'object'
      ? (item.songId !== undefined && item.songId !== null ? item.songId : item.id)
      : item;

    if (rawId === -1 || rawId === -2) return rawId;

    if (typeof item === 'object' && item.name && String(item.name).trim()) {
      const cleanName = String(item.name).trim();
      const cleanBand = String(item.originalBand || item.artist || '').trim();

      if (rawId !== undefined && rawId !== null) {
        try {
          const byId = await db.getAllAsync('SELECT id, name FROM songs WHERE id = ? LIMIT 1;', [rawId]);
          if (byId && byId.length > 0 && String(byId[0].name || '').trim().toLowerCase() === cleanName.toLowerCase()) {
            return byId[0].id;
          }
        } catch (e) {}
      }

      try {
        if (cleanBand) {
          const byNameBand = await db.getAllAsync(
            "SELECT id FROM songs WHERE LOWER(TRIM(name)) = ? AND LOWER(TRIM(COALESCE(originalBand, ''))) = ? LIMIT 1;",
            [cleanName.toLowerCase(), cleanBand.toLowerCase()]
          );
          if (byNameBand && byNameBand.length > 0) {
            return byNameBand[0].id;
          }
        }
        const byName = await db.getAllAsync(
          'SELECT id FROM songs WHERE LOWER(TRIM(name)) = ? LIMIT 1;',
          [cleanName.toLowerCase()]
        );
        if (byName && byName.length > 0) {
          return byName[0].id;
        }
      } catch (e) {}

      // Caso a música venha do Songbook Online ou do snapshot da banda e ainda não exista no SQLite local, insere para manter a integridade do setlist
      try {
        const ins = await db.runAsync(
          `INSERT INTO songs (name, originalBand, style, lyrics, chords, tabs, defaultView, duration, scrollSpeed, isFavorite)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            sanitizeText(cleanName, 200),
            sanitizeText(cleanBand, 200),
            sanitizeText(item.style || '', 300),
            sanitizeMultiline(item.lyrics || '', 50000),
            sanitizeMultiline(item.chords || '', 50000),
            sanitizeMultiline(item.tabs || '', 50000),
            item.defaultView || 'chords',
            sanitizeText(item.duration || '', 20),
            item.scrollSpeed || 'none',
            item.isFavorite ? 1 : 0
          ]
        );
        return ins.lastInsertRowId;
      } catch (e) {}
    }

    return rawId;
  },

  async getAll() {
    try {
      await this.cleanDuplicateSetlists();
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

  async insert(name, type, myBandId, date, local, cachê, notes, songIds = [], time = '') {
    try {
      const result = await db.runAsync(
        'INSERT INTO setlists (name, type, myBandId, date, time, local, cachê, notes, isFavorite) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0);',
        [sanitizeText(name, 200), sanitizeText(type, 50), myBandId, sanitizeText(date, 20), sanitizeText(time, 20), sanitizeText(local, 200), sanitizeText(cachê, 20), sanitizeText(notes, 1000)]
      );
      const setlistId = result.lastInsertRowId;

      const cappedSongs = (songIds || []).slice(0, 100);
      // Salvar as músicas associadas em ordem (máximo 100)
      for (let order = 0; order < cappedSongs.length; order++) {
        const item = cappedSongs[order];
        const songId = await this.resolveLocalSongId(item);
        if (songId === null || songId === undefined) continue;
        const customNotes = typeof item === 'object' && item !== null ? item.customNotes : '';
        const customDuration = typeof item === 'object' && item !== null ? item.customDuration : '';
        const rehearsalStatus = typeof item === 'object' && item !== null ? item.rehearsalStatus : 'none';
        const rehearsalNotes = typeof item === 'object' && item !== null ? item.rehearsalNotes : '';

        await db.runAsync(
          'INSERT INTO setlist_songs (setlistId, songId, order_num, customNotes, customDuration, rehearsalStatus, rehearsalNotes) VALUES (?, ?, ?, ?, ?, ?, ?);',
          [setlistId, songId, order, customNotes || '', customDuration || '', rehearsalStatus || 'none', rehearsalNotes || '']
        );
      }

      if (myBandId) {
        try {
          await bandService.logBandActivity(myBandId, 'create_setlist', `criou a setlist: ${name.trim() || 'Sem título'}`);
        } catch (e) {}
      }

      return setlistId;
    } catch (error) {
      console.error('Error in setlistService.insert:', error);
      throw error;
    }
  },

  async update(id, name, type, myBandId, date, local, cachê, notes, songIds = [], time = '') {
    try {
      let targetSetlistId = id;
      let existsLocally = false;

      if (targetSetlistId && !String(targetSetlistId).startsWith('cloud_')) {
        try {
          const check = await db.getAllAsync('SELECT id FROM setlists WHERE id = ? LIMIT 1;', [targetSetlistId]);
          if (check && check.length > 0) {
            existsLocally = true;
            targetSetlistId = check[0].id;
          }
        } catch (e) {}
      }

      if (!existsLocally && myBandId && name) {
        try {
          const byNameDate = await db.getAllAsync(
            'SELECT id FROM setlists WHERE myBandId = ? AND LOWER(TRIM(name)) = ? AND TRIM(COALESCE(date, "")) = ? LIMIT 1;',
            [myBandId, String(name).trim().toLowerCase(), String(date || '').trim()]
          );
          if (byNameDate && byNameDate.length > 0) {
            existsLocally = true;
            targetSetlistId = byNameDate[0].id;
          }
        } catch (e) {}
      }

      if (existsLocally) {
        await db.runAsync(
          'UPDATE setlists SET name = ?, type = ?, myBandId = ?, date = ?, time = ?, local = ?, cachê = ?, notes = ? WHERE id = ?;',
          [sanitizeText(name, 200), sanitizeText(type, 50), myBandId, sanitizeText(date, 20), sanitizeText(time, 20), sanitizeText(local, 200), sanitizeText(cachê, 20), sanitizeText(notes, 1000), targetSetlistId]
        );
      } else {
        const ins = await db.runAsync(
          'INSERT INTO setlists (name, type, myBandId, date, time, local, cachê, notes, isFavorite) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0);',
          [sanitizeText(name, 200), sanitizeText(type, 50), myBandId, sanitizeText(date, 20), sanitizeText(time, 20), sanitizeText(local, 200), sanitizeText(cachê, 20), sanitizeText(notes, 1000)]
        );
        targetSetlistId = ins.lastInsertRowId;
      }

      // Deletar associações antigas
      await db.runAsync('DELETE FROM setlist_songs WHERE setlistId = ?;', [targetSetlistId]);

      const cappedSongs = (songIds || []).slice(0, 100);
      // Salvar as novas músicas associadas em ordem (máximo 100)
      for (let order = 0; order < cappedSongs.length; order++) {
        const item = cappedSongs[order];
        const songId = await this.resolveLocalSongId(item);
        if (songId === null || songId === undefined) continue;
        const customNotes = typeof item === 'object' && item !== null ? item.customNotes : '';
        const customDuration = typeof item === 'object' && item !== null ? item.customDuration : '';
        const rehearsalStatus = typeof item === 'object' && item !== null ? item.rehearsalStatus : 'none';
        const rehearsalNotes = typeof item === 'object' && item !== null ? item.rehearsalNotes : '';

        await db.runAsync(
          'INSERT INTO setlist_songs (setlistId, songId, order_num, customNotes, customDuration, rehearsalStatus, rehearsalNotes) VALUES (?, ?, ?, ?, ?, ?, ?);',
          [targetSetlistId, songId, order, customNotes || '', customDuration || '', rehearsalStatus || 'none', rehearsalNotes || '']
        );
      }

      if (myBandId) {
        try {
          await bandService.logBandActivity(myBandId, 'update_setlist', `editou a setlist: ${name.trim() || 'Sem título'}`);
        } catch (e) {}
      }

      return targetSetlistId;
    } catch (error) {
      console.error('Error in setlistService.update:', error);
      throw error;
    }
  },

  async delete(id) {
    try {
      const existing = await db.getAllAsync('SELECT name, myBandId FROM setlists WHERE id = ?;', [id]);
      const myBandId = existing && existing[0] ? existing[0].myBandId : null;
      const setlistName = existing && existing[0] ? existing[0].name : '';
      await db.runAsync('DELETE FROM setlists WHERE id = ?;', [id]);
      if (myBandId) {
        try {
          await bandService.logBandActivity(myBandId, 'delete_setlist', `excluiu a setlist: ${setlistName || 'Setlist'}`);
        } catch (e) {}
      }
    } catch (error) {
      console.error('Error in setlistService.delete:', error);
      throw error;
    }
  },

  async getSongsForSetlist(setlistId) {
    try {
      const rawResult = await db.getAllAsync(`
        SELECT s.*, ss.songId, ss.customNotes, ss.customDuration, ss.rehearsalStatus, ss.rehearsalNotes 
        FROM setlist_songs ss
        LEFT JOIN songs s ON ss.songId = s.id
        WHERE ss.setlistId = ?
        ORDER BY ss.order_num ASC;
      `, [setlistId]);

      // Retorna as músicas associadas em sua ordem real configurada (limitando a 100 itens de segurança)
      const result = (rawResult || [])
        .map(row => ({
          ...row,
          id: (row.songId === -1 || row.songId === -2) ? row.songId : (row.id || row.songId),
          songId: row.songId !== undefined && row.songId !== null ? row.songId : row.id,
        }))
        .filter(row => row.id === -1 || row.id === -2 || Boolean(row.name))
        .slice(0, 100);
      if (result.length === 0) return [];

      try {
        const songIds = result.filter(s => s.id >= 0).map(s => s.id);
        if (songIds.length === 0) {
          return result.map(song => ({ ...song, links: [] }));
        }
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
          links: linksBySongId[song.id] || []
        }));
      } catch (linkErr) {
        return result.map(song => ({ ...song, links: [] }));
      }
    } catch (error) {
      console.error('Error in setlistService.getSongsForSetlist:', error);
      throw error;
    }
  },

  async getSongsBySetlistId(setlistId) {
    return this.getSongsForSetlist(setlistId);
  },

  async duplicate(setlistId, lang = 'pt') {
    try {
      let sl = null;
      let rawId = null;
      if (typeof setlistId === 'object' && setlistId !== null) {
        sl = setlistId;
        rawId = sl.id;
      } else {
        rawId = setlistId;
        const rawSetlist = await db.getAllAsync('SELECT * FROM setlists WHERE id = ? LIMIT 1;', [rawId]);
        if (rawSetlist && rawSetlist.length > 0) {
          sl = rawSetlist[0];
        }
      }
      if (!sl) {
        throw new Error('Setlist original não encontrado');
      }

      const prefix = lang === 'en' ? 'Copy' : lang === 'es' ? 'Copia' : 'Cópia';
      const copyName = sl.name ? `${prefix} - ${sl.name}` : `${prefix} Setlist`;
      const result = await db.runAsync(
        'INSERT INTO setlists (name, type, myBandId, date, time, local, cachê, notes, isFavorite) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0);',
        [copyName, sl.type || 'show', sl.myBandId || null, sl.date || '', sl.time || '', sl.local || '', sl.cachê || sl.cache || '', sl.notes || '']
      );
      const newSetlistId = result.lastInsertRowId;

      let slSongs = [];
      if (rawId && (!isNaN(Number(rawId)) && Number(rawId) > 0)) {
        slSongs = await db.getAllAsync('SELECT songId, order_num, customNotes, customDuration, rehearsalStatus, rehearsalNotes FROM setlist_songs WHERE setlistId = ? ORDER BY order_num ASC;', [rawId]);
      }
      if ((!slSongs || slSongs.length === 0) && Array.isArray(sl.songs)) {
        slSongs = sl.songs.map((s, idx) => ({
          songId: s.id !== undefined && s.id !== null ? s.id : (s.songId !== undefined && s.songId !== null ? s.songId : -1),
          order_num: s.order_num !== undefined ? s.order_num : idx + 1,
          customNotes: s.customNotes || '',
          customDuration: s.customDuration || '',
          rehearsalStatus: s.rehearsalStatus || 'none',
          rehearsalNotes: s.rehearsalNotes || ''
        }));
      }

      for (const song of (slSongs || [])) {
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
