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

  async insert(name, imageUri) {
    try {
      const result = await db.runAsync(
        'INSERT INTO my_bands (name, imageUri) VALUES (?, ?);',
        [name, imageUri]
      );
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Error in bandService.insert:', error);
      throw error;
    }
  },

  async update(id, name, imageUri) {
    try {
      await db.runAsync(
        'UPDATE my_bands SET name = ?, imageUri = ? WHERE id = ?;',
        [name, imageUri, id]
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
  }
};
