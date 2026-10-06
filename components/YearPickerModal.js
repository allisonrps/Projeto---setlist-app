import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';

export default function YearPickerModal({
  visible,
  selectedYear,
  onSelectYear,
  onClose,
}) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  const [decadeStart, setDecadeStart] = useState(() => {
    const y = selectedYear || currentYear;
    return Math.floor(y / 12) * 12;
  });

  useEffect(() => {
    if (visible && selectedYear) {
      setDecadeStart(Math.floor(selectedYear / 12) * 12);
    }
  }, [visible, selectedYear]);

  if (!visible) return null;

  const years = Array.from({ length: 12 }, (_, i) => decadeStart + i);

  const handlePrev = () => {
    setDecadeStart(prev => prev - 12);
  };

  const handleNext = () => {
    setDecadeStart(prev => prev + 12);
  };

  const handleSelect = (year) => {
    onSelectYear(year);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheetContent, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
          {/* Alça superior (Drag Handle) */}
          <View style={[styles.dragHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />

          {/* Cabeçalho */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.headerIconCircle, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name="calendar-outline" size={17} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>
                {t('selectYear') || 'Selecionar Ano'}
              </Text>
            </View>

            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Barra de Navegação do Período (< 2020 – 2031 >) */}
          <View style={[styles.navBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}>
            <Pressable
              onPress={handlePrev}
              style={({ pressed }) => [styles.arrowBtn, pressed && { opacity: 0.6 }]}
              hitSlop={8}
            >
              <Ionicons name="chevron-back" size={18} color={colors.primary} />
            </Pressable>

            <Text style={[styles.rangeText, { color: colors.text }]}>
              {decadeStart} – {decadeStart + 11}
            </Text>

            <Pressable
              onPress={handleNext}
              style={({ pressed }) => [styles.arrowBtn, pressed && { opacity: 0.6 }]}
              hitSlop={8}
            >
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </Pressable>
          </View>

          {/* Grade 3x4 de Anos */}
          <View style={styles.grid}>
            {years.map((year) => {
              const isSelected = year === selectedYear;
              const isCurrent = year === currentYear;

              return (
                <Pressable
                  key={year}
                  onPress={() => handleSelect(year)}
                  style={({ pressed }) => [
                    styles.yearCard,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.035)'),
                      borderColor: isSelected
                        ? colors.primary
                        : isCurrent
                        ? colors.primary + '70'
                        : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                      borderWidth: isSelected ? 0 : (isCurrent ? 1.5 : 1),
                      opacity: pressed ? 0.75 : 1,
                    }
                  ]}
                >
                  <Text
                    style={[
                      styles.yearText,
                      {
                        color: isSelected ? '#ffffff' : (isCurrent ? colors.primary : colors.text),
                        fontWeight: isSelected || isCurrent ? '900' : '700',
                      }
                    ]}
                  >
                    {year}
                  </Text>
                  {isCurrent && (
                    <View style={[styles.currentBadge, { backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : colors.primary + '18' }]}>
                      <Text style={[styles.currentBadgeText, { color: isSelected ? '#ffffff' : colors.primary }]}>
                        {t('currentYear') || 'Atual'}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Ações Inferiores (Ano Atual e Fechar) */}
          <View style={styles.footerRow}>
            {selectedYear !== currentYear && (
              <Pressable
                onPress={() => handleSelect(currentYear)}
                style={({ pressed }) => [
                  styles.currentYearBtn,
                  { backgroundColor: colors.primary + '18', borderColor: colors.primary + '35' },
                  pressed && { opacity: 0.75 },
                ]}
              >
                <Ionicons name="today-outline" size={15} color={colors.primary} />
                <Text style={[styles.currentYearBtnText, { color: colors.primary }]}>
                  {t('currentYear') || 'Ano Atual'} ({currentYear})
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.cancelBtn,
                { borderColor: colors.border },
                pressed && { opacity: 0.75 },
              ]}
            >
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>
                {t('close') || 'Fechar'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 12,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  closeBtn: {
    padding: 6,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  arrowBtn: {
    padding: 6,
    borderRadius: 8,
  },
  rangeText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  yearCard: {
    width: '31.3%',
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearText: {
    fontSize: 15,
    letterSpacing: 0.3,
  },
  currentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginTop: 2,
  },
  currentBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  currentYearBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  currentYearBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
});
