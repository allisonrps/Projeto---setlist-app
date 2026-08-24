import React, { useState, useEffect } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';

import { useLanguage } from '../hooks/useLanguage';

const COLORS = [
  '#8b5cf6', // Roxo/Violet
  '#3b82f6', // Azul/Blue
  '#10b981', // Verde/Green
  '#ec4899', // Rosa/Pink
  '#ef4444', // Vermelho/Red
  '#f97316', // Laranja/Orange
  '#06b6d4', // Ciano/Cyan
  '#0d9488', // Teal
  '#f59e0b', // Amarelo/Yellow
  '#6366f1', // Índigo/Indigo
  '#d946ef', // Fúcsia/Fuchsia
  '#84cc16', // Verde Lima/Lime
  '#475569', // Slate
];

export default function SettingsModal({ visible, onClose }) {
  const { themeMode, primaryColor, secondaryColor, colors, setThemePreferences } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const [tempMode, setTempMode] = useState(themeMode);
  const [tempPrimary, setTempPrimary] = useState(primaryColor);
  const [tempSecondary, setTempSecondary] = useState(secondaryColor);
  const [tempLanguage, setTempLanguage] = useState(language);

  useEffect(() => {
    if (visible) {
      setTempMode(themeMode);
      setTempPrimary(primaryColor);
      setTempSecondary(secondaryColor);
      setTempLanguage(language);
    }
  }, [visible, themeMode, primaryColor, secondaryColor, language]);

  const handleSave = async () => {
    await setThemePreferences(tempMode, tempPrimary, tempSecondary);
    await setLanguage(tempLanguage);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.75)' }]}>
        <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.primary }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('themeAppearance')}</Text>
            <Pressable 
              style={({ pressed }) => [styles.closePressable, pressed && { opacity: 0.7 }]}
              onPress={onClose}
            >
              <Text style={[styles.closeButton, { color: colors.danger }]}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Tema Claro / Escuro */}
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t('themeMode')}</Text>
            <View style={styles.segmentedContainer}>
              <Pressable
                style={[
                  styles.segmentButton,
                  tempMode === 'dark' && { backgroundColor: colors.primary, borderColor: colors.primary },
                  { borderColor: colors.border }
                ]}
                onPress={() => setTempMode('dark')}
              >
                <Text style={[styles.segmentText, { color: tempMode === 'dark' ? '#fff' : colors.text }]}>
                  {t('dark')}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.segmentButton,
                  tempMode === 'light' && { backgroundColor: colors.primary, borderColor: colors.primary },
                  { borderColor: colors.border }
                ]}
                onPress={() => setTempMode('light')}
              >
                <Text style={[styles.segmentText, { color: tempMode === 'light' ? '#fff' : colors.text }]}>
                  {t('light')}
                </Text>
              </Pressable>
            </View>

            {/* Idioma */}
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t('appLanguage')}</Text>
            <View style={styles.segmentedContainer}>
              <Pressable
                style={[
                  styles.segmentButton,
                  tempLanguage === 'pt' && { backgroundColor: colors.primary, borderColor: colors.primary },
                  { borderColor: colors.border }
                ]}
                onPress={() => setTempLanguage('pt')}
              >
                <Text style={[styles.segmentText, { color: tempLanguage === 'pt' ? '#fff' : colors.text }]}>
                  Português 🇧🇷
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.segmentButton,
                  tempLanguage === 'en' && { backgroundColor: colors.primary, borderColor: colors.primary },
                  { borderColor: colors.border }
                ]}
                onPress={() => setTempLanguage('en')}
              >
                <Text style={[styles.segmentText, { color: tempLanguage === 'en' ? '#fff' : colors.text }]}>
                  English 🇺🇸
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.segmentButton,
                  tempLanguage === 'es' && { backgroundColor: colors.primary, borderColor: colors.primary },
                  { borderColor: colors.border }
                ]}
                onPress={() => setTempLanguage('es')}
              >
                <Text style={[styles.segmentText, { color: tempLanguage === 'es' ? '#fff' : colors.text }]}>
                  Español 🇪🇸
                </Text>
              </Pressable>
            </View>

            {/* Cor Primária */}
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t('primaryColor')}</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.horizontalColorScroll}
              style={styles.colorScrollWrapper}
            >
              {COLORS.map((color) => (
                <Pressable
                  key={color}
                  style={({ pressed }) => [
                    styles.colorCircle,
                    { 
                      backgroundColor: color,
                      borderColor: tempPrimary === color ? colors.text : colors.border,
                      borderWidth: tempPrimary === color ? 3.0 : 1.5,
                      transform: [{ scale: pressed ? 0.9 : 1 }]
                    }
                  ]}
                  onPress={() => setTempPrimary(color)}
                >
                  {tempPrimary === color && (
                    <View style={styles.selectedInnerDot} />
                  )}
                </Pressable>
              ))}
            </ScrollView>

            {/* Cor Secundária */}
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t('secondaryColor')}</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.horizontalColorScroll}
              style={styles.colorScrollWrapper}
            >
              {COLORS.map((color) => (
                <Pressable
                  key={color}
                  style={({ pressed }) => [
                    styles.colorCircle,
                    { 
                      backgroundColor: color,
                      borderColor: tempSecondary === color ? colors.text : colors.border,
                      borderWidth: tempSecondary === color ? 3.0 : 1.5,
                      transform: [{ scale: pressed ? 0.9 : 1 }]
                    }
                  ]}
                  onPress={() => setTempSecondary(color)}
                >
                  {tempSecondary === color && (
                    <View style={styles.selectedInnerDot} />
                  )}
                </Pressable>
              ))}
            </ScrollView>

            {/* Botão Salvar */}
            <Pressable
              style={({ pressed }) => [
                styles.saveButton, 
                { backgroundColor: colors.success },
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }
              ]}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>{t('save')}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 8,
    borderWidth: 1.5,
    maxHeight: '85%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  closePressable: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.0,
    marginBottom: 10,
    marginTop: 6,
  },
  segmentedContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 10,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  segmentText: {
    fontWeight: '800',
    fontSize: 13,
  },
  colorScrollWrapper: {
    marginBottom: 24,
    height: 54,
  },
  horizontalColorScroll: {
    paddingHorizontal: 2,
    alignItems: 'center',
    gap: 8,
  },
  colorCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginRight: 2,
  },
  selectedInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.0,
  },
});
