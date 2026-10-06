import { db } from '../database/database';
import { sanitizeText } from './sanitize';

export const settingsService = {
  async getSetting(key, defaultValue = null) {
    try {
      const cleanKey = sanitizeText(key, 100);
      const result = await db.getAllAsync('SELECT value FROM settings WHERE key = ? LIMIT 1;', [cleanKey]);
      if (result && result.length > 0) {
        return result[0].value;
      }
      return defaultValue;
    } catch (error) {
      console.error(`Error in settingsService.getSetting (${key}):`, error);
      return defaultValue;
    }
  },

  async setSetting(key, value) {
    try {
      const cleanKey = sanitizeText(key, 100);
      const cleanValue = sanitizeText(String(value), 1000);
      await db.runAsync(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);',
        [cleanKey, cleanValue]
      );
    } catch (error) {
      console.error(`Error in settingsService.setSetting (${key}):`, error);
      throw error;
    }
  },

  async getPreferences() {
    try {
      const themeMode = await this.getSetting('themeMode', 'dark');
      const primaryColor = await this.getSetting('primaryColor', '#0ea5e9'); // Ciano BandLink default
      const secondaryColor = await this.getSetting('secondaryColor', '#8b5cf6'); // Violeta BandLink default
      return { themeMode, primaryColor, secondaryColor };
    } catch (error) {
      console.error('Error in settingsService.getPreferences:', error);
      return { themeMode: 'dark', primaryColor: '#0ea5e9', secondaryColor: '#8b5cf6' };
    }
  },

  async savePreferences(themeMode, primaryColor, secondaryColor) {
    try {
      await this.setSetting('themeMode', themeMode);
      await this.setSetting('primaryColor', primaryColor);
      await this.setSetting('secondaryColor', secondaryColor);
    } catch (error) {
      console.error('Error in settingsService.savePreferences:', error);
      throw error;
    }
  }
};
