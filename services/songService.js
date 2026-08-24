import { db } from '../database/database';

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

      const songsWithLinks = await Promise.all(
        filteredResult.map(async (song) => {
          const links = await db.getAllAsync('SELECT * FROM song_links WHERE songId = ?;', [song.id]);
          return { ...song, links: links || [] };
        })
      );
      return songsWithLinks;
    } catch (error) {
      console.error('Error in songService.getAll:', error);
      throw error;
    }
  },

  async insert(name, originalBand, style, lyrics, chords, tabs, defaultView, duration, scrollSpeed) {
    try {
      const result = await db.runAsync(
        'INSERT INTO songs (name, originalBand, style, lyrics, chords, tabs, defaultView, duration, scrollSpeed, isFavorite) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0);',
        [name, originalBand, style, lyrics, chords, tabs, defaultView || 'lyrics', duration || null, scrollSpeed || 'none']
      );
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Error in songService.insert:', error);
      throw error;
    }
  },

  async update(id, name, originalBand, style, lyrics, chords, tabs, defaultView, duration, scrollSpeed) {
    try {
      await db.runAsync(
        'UPDATE songs SET name = ?, originalBand = ?, style = ?, lyrics = ?, chords = ?, tabs = ?, defaultView = ?, duration = ?, scrollSpeed = ? WHERE id = ?;',
        [name, originalBand, style, lyrics, chords, tabs, defaultView || 'lyrics', duration || null, scrollSpeed || 'none', id]
      );
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
        if (link.url && link.url.trim()) {
          await db.runAsync(
            'INSERT INTO song_links (songId, type, url) VALUES (?, ?, ?);',
            [songId, link.type, link.url]
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