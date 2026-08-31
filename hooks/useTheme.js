import React, { createContext, useContext, useState, useEffect } from 'react';
import { settingsService } from '../services/settingsService';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [themeMode, setThemeMode] = useState('dark');
  const [primaryColor, setPrimaryColor] = useState('#0ea5e9'); // Azul Claro default
  const [secondaryColor, setSecondaryColor] = useState('#0ea5e9'); // Azul Claro default
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPrefs() {
      try {
        const prefs = await settingsService.getPreferences();
        setThemeMode(prefs.themeMode);
        setPrimaryColor(prefs.primaryColor);
        setSecondaryColor(prefs.secondaryColor);
      } catch (error) {
        console.error('Error loading theme preferences:', error);
      } finally {
        setLoading(false);
      }
    }
    loadPrefs();
  }, []);

  const setThemePreferences = async (mode, primary, secondary) => {
    setThemeMode(mode);
    setPrimaryColor(primary);
    setSecondaryColor(secondary);
    await settingsService.savePreferences(mode, primary, secondary);
  };

  const getColors = () => {
    const isDark = themeMode === 'dark';
    return {
      background: isDark ? '#0b0f19' : '#f8fafc',
      cardBackground: isDark ? '#171e2e' : '#ffffff',
      border: isDark ? '#253047' : '#e2e8f0',
      text: isDark ? '#ffffff' : '#0f172a',
      textMuted: isDark ? '#94a3b8' : '#64748b',
      inputBackground: isDark ? '#1e293b' : '#f1f5f9',
      inputText: isDark ? '#ffffff' : '#0f172a',
      primary: primaryColor,
      secondary: secondaryColor,
      success: '#10b981',
      danger: '#ef4444',
      warning: '#f59e0b',
      shadowColor: isDark ? '#000000' : '#64748b',
      isDark,
    };
  };

  const colors = getColors();

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        primaryColor,
        secondaryColor,
        colors,
        loading,
        setThemePreferences,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
