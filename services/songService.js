import { db } from '../database/database';
import { sanitizeText, sanitizeMultiline, sanitizeUrl } from './sanitize';
import { bandService } from './bandService';

export const songService = {
  async getAll(searchQuery = '', styleFilter = '', sortBy = 'name', sortOrder = 'asc') {
    try {
      let query = 'SELECT * FROM songs';
      const params = [];
      const conditions = ['id >= 0'];

      if (searchQuery.trim()) {
        conditions.push('(name LIKE ? OR originalBand LIKE ? OR style LIKE ?)');
        const searchPattern = `%${searchQuery}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      const result = await db.getAllAsync(query, params);
      
      let filteredResult = result || [];
      if (styleFilter) {
        const filters = Array.isArray(styleFilter) ? styleFilter : [styleFilter];
        const cleanFilters = filters.map(f => f.trim().toLowerCase()).filter(Boolean);
        
        if (cleanFilters.length > 0) {
          filteredResult = filteredResult.filter(song => {
            if (!song.style) return false;
            const songTags = song.style.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
            return cleanFilters.every(filterTag => songTags.includes(filterTag));
          });
        }
      }

      // Ordenar resultados: Favoritos sempre no topo, depois pelo critério escolhido
      filteredResult.sort((a, b) => {
        const favA = a.isFavorite || 0;
        const favB = b.isFavorite || 0;
        if (favA !== favB) {
          return favB - favA; // 1 (favorito) vem antes de 0
        }

        let valA = '';
        let valB = '';

        if (sortBy === 'band') {
          valA = (a.originalBand || '').trim().toLowerCase();
          valB = (b.originalBand || '').trim().toLowerCase();
        } else {
          valA = (a.name || '').trim().toLowerCase();
          valB = (b.name || '').trim().toLowerCase();
        }

        if (valA !== valB) {
          const comp = valA.localeCompare(valB, undefined, { sensitivity: 'base', numeric: true });
          return sortOrder === 'desc' ? -comp : comp;
        }

        return a.name.localeCompare(b.name);
      });

      if (filteredResult.length === 0) {
        return [];
      }

      // Buscar todos os links das músicas filtradas em uma única query otimizada
      try {
        const songIds = filteredResult.map(s => s.id);
        const placeholders = songIds.map(() => '?').join(',');
        const allLinks = await db.getAllAsync(`SELECT * FROM song_links WHERE songId IN (${placeholders});`, songIds);
        
        const linksBySongId = {};
        if (allLinks && allLinks.length > 0) {
          for (const l of allLinks) {
            if (!linksBySongId[l.songId]) linksBySongId[l.songId] = [];
            linksBySongId[l.songId].push(l);
          }
        }

        return filteredResult.map(song => ({
          ...song,
          links: linksBySongId[song.id] || []
        }));
      } catch (linkErr) {
        // Fallback seguro caso haja falha transitória na tabela song_links
        return filteredResult.map(song => ({ ...song, links: [] }));
      }
    } catch (error) {
      console.error('Error in songService.getAll:', error);
      throw error;
    }
  },

  async insert(name, originalBand, style, lyrics, chords, tabs, defaultView, duration, scrollSpeed) {
    try {
      const result = await db.runAsync(
        'INSERT INTO songs (name, originalBand, style, lyrics, chords, tabs, defaultView, duration, scrollSpeed, isFavorite) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0);',
        [sanitizeText(name, 200), sanitizeText(originalBand, 200), sanitizeText(style, 300), sanitizeMultiline(lyrics, 10000), sanitizeMultiline(chords, 10000), sanitizeMultiline(tabs, 20000), sanitizeText(defaultView, 20) || 'lyrics', sanitizeText(duration, 10) || null, sanitizeText(scrollSpeed, 20) || 'none']
      );
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Error in songService.insert:', error);
      throw error;
    }
  },

  async update(id, name, originalBand, style, lyrics, chords, tabs, defaultView, duration, scrollSpeed) {
    try {
      // Obter dados anteriores da música para identificar exatamente a aba/conteúdo alterado
      let oldSong = null;
      try {
        const oldRows = await db.getAllAsync('SELECT * FROM songs WHERE id = ?;', [id]);
        if (oldRows && oldRows.length > 0) oldSong = oldRows[0];
      } catch (e) {}

      await db.runAsync(
        'UPDATE songs SET name = ?, originalBand = ?, style = ?, lyrics = ?, chords = ?, tabs = ?, defaultView = ?, duration = ?, scrollSpeed = ? WHERE id = ?;',
        [sanitizeText(name, 200), sanitizeText(originalBand, 200), sanitizeText(style, 300), sanitizeMultiline(lyrics, 10000), sanitizeMultiline(chords, 10000), sanitizeMultiline(tabs, 20000), sanitizeText(defaultView, 20) || 'lyrics', sanitizeText(duration, 10) || null, sanitizeText(scrollSpeed, 20) || 'none', id]
      );

      // Notificar todas as bandas que possuem essa música no repertório
      try {
        const bandRows = await db.getAllAsync('SELECT bandId FROM band_songs WHERE songId = ?;', [id]);
        if (bandRows && bandRows.length > 0) {
          const sName = (name || (oldSong && oldSong.name) || 'música').trim();
          const changedTabs = oldSong && (oldSong.tabs || '').trim() !== (tabs || '').trim();
          const changedChords = oldSong && (oldSong.chords || '').trim() !== (chords || '').trim();
          const changedLyrics = oldSong && (oldSong.lyrics || '').trim() !== (lyrics || '').trim();

          let actionType = 'update_song';
          let description = `alterou dados de: ${sName}`;

          if (changedTabs && !changedChords && !changedLyrics) {
            actionType = 'updated_tabs';
            description = `alterou a tablatura de: ${sName}`;
          } else if (changedChords && !changedTabs && !changedLyrics) {
            actionType = 'updated_chords';
            description = `alterou a cifra de: ${sName}`;
          } else if (changedLyrics && !changedTabs && !changedChords) {
            actionType = 'updated_lyrics';
            description = `alterou a letra de: ${sName}`;
          } else if (changedTabs && changedChords && !changedLyrics) {
            actionType = 'updated_chords';
            description = `alterou cifras e tablaturas de: ${sName}`;
          } else if (changedTabs && changedLyrics) {
            actionType = 'updated_tabs';
            description = `alterou letra e tablatura de: ${sName}`;
          } else if (changedChords && changedLyrics) {
            actionType = 'updated_chords';
            description = `alterou letra e cifra de: ${sName}`;
          }

          for (const row of bandRows) {
            await bandService.logBandActivity(row.bandId, actionType, description);
          }
        }
      } catch (bErr) {}
    } catch (error) {
      console.error('Error in songService.update:', error);
      throw error;
    }
  },

  async delete(id) {
    try {
      await db.runAsync('DELETE FROM songs WHERE id = ?;', [id]);
    } catch (error) {
      console.error('Error in songService.delete:', error);
      throw error;
    }
  },

  async syncLinks(songId, links) {
    try {
      await db.runAsync('DELETE FROM song_links WHERE songId = ?;', [songId]);
      for (const link of links) {
        const cleanUrl = sanitizeUrl(link.url);
        if (cleanUrl) {
          await db.runAsync(
            'INSERT INTO song_links (songId, type, url) VALUES (?, ?, ?);',
            [songId, sanitizeText(link.type, 50), cleanUrl]
          );
        }
      }
    } catch (error) {
      console.error('Error in songService.syncLinks:', error);
      throw error;
    }
  },

  async getStyles() {
    try {
      const result = await db.getAllAsync('SELECT style FROM songs WHERE id >= 0 AND style IS NOT NULL AND style != "";');
      const uniqueTags = new Set();
      (result || []).forEach(row => {
        if (row.style) {
          row.style.split(',').forEach(tag => {
            const clean = tag.trim();
            if (clean) {
              uniqueTags.add(clean);
            }
          });
        }
      });
      return Array.from(uniqueTags).sort((a, b) => a.localeCompare(b));
    } catch (error) {
      console.error('Error in songService.getStyles:', error);
      return [];
    }
  },

  async toggleFavorite(id, currentStatus) {
    try {
      const newStatus = currentStatus ? 0 : 1;
      await db.runAsync('UPDATE songs SET isFavorite = ? WHERE id = ?;', [newStatus, id]);
      return newStatus;
    } catch (error) {
      console.error('Error in songService.toggleFavorite:', error);
      throw error;
    }
  }
};