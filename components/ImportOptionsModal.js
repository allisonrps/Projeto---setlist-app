import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';

export default function ImportOptionsModal({
  visible,
  onClose,
  type = 'song', // 'song' | 'setlist' | 'backup'
  onSelectOption, // (option: 'qr' | 'file' | 'text') => void
}) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const isDark = colors.isDark;

  if (!visible) return null;

  const cardBg = isDark ? '#131b2e' : '#ffffff';
  const innerBg = isDark ? '#0b0f19' : '#f8fafc';
  const borderColor = isDark ? '#253047' : '#e2e8f0';

  const isSong = type === 'song';
  const isSetlist = type === 'setlist';
  const isBackup = type === 'backup';

  let badgeText = (t('shareSongLabel') || 'MÚSICA').toUpperCase();
  let mainTitle = t('importTitleSong') || 'Importar Música';
  let subTitle = t('importSongSubtitle') || 'Adicione uma nova música ao seu repertório';
  let headerIcon = 'musical-note';

  if (isSetlist) {
    badgeText = (t('shareSetlistLabel') || 'SETLIST').toUpperCase();
    mainTitle = t('importTitleSetlist') || 'Importar Setlist';
    subTitle = t('importSetlistSubtitle') || 'Importe um roteiro de show ou ensaio';
    headerIcon = 'list';
  } else if (isBackup) {
    badgeText = (t('fileTypeLabelBackup') || 'BACKUP').toUpperCase();
    mainTitle = t('restoreBackupTitle') || 'Restaurar Backup';
    subTitle = t('restoreBackupSubtitle') || 'Restaure dados completos do app';
    headerIcon = 'save-outline';
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.card, { backgroundColor: cardBg, borderColor }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Top Pill Handle */}
          <View style={styles.pillHandle} />

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: borderColor }]}>
            <View style={styles.headerTitleRow}>
              <View
                style={[
                  styles.headerIconCircle,
                  { backgroundColor: colors.primary + '20' },
                ]}
              >
                <Ionicons
                  name={headerIcon}
                  size={22}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.typeBadge, { color: colors.primary, backgroundColor: colors.primary + '18' }]}>
                    {badgeText}
                  </Text>
                </View>
                <Text
                  style={[styles.title, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {mainTitle}
                </Text>
                <Text
                  style={[styles.subtitle, { color: colors.textMuted }]}
                  numberOfLines={1}
                >
                  {subTitle}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeBtn,
                {
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(0,0,0,0.06)',
                },
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Body Options */}
          <View style={styles.body}>
            <Text style={[styles.promptText, { color: colors.textMuted }]}>
              {t('importOptionsSubtitle') || 'Escolha como deseja importar:'}
            </Text>

            {/* Option 1: SCAN QR CODE / PIN (Highlighted) */}
            <TouchableOpacity
              style={[
                styles.optionCard,
                styles.optionCardPrimary,
                {
                  backgroundColor: isDark ? 'rgba(14, 165, 233, 0.12)' : 'rgba(14, 165, 233, 0.08)',
                  borderColor: colors.primary,
                },
              ]}
              activeOpacity={0.8}
              onPress={() => onSelectOption('qr')}
            >
              <View
                style={[
                  styles.optionIconCircle,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Ionicons name="qr-code" size={22} color="#ffffff" />
              </View>
              <View style={styles.optionTextCol}>
                <View style={styles.optionTitleRow}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>
                    {t('importOptionQrTitle') || 'Ler QR Code (Câmera ou PIN)'}
                  </Text>
                  <View style={[styles.badgeRecommend, { backgroundColor: colors.primary }]}>
                    <Text style={styles.badgeRecommendText}>INSTANTÂNEO</Text>
                  </View>
                </View>
                <Text style={[styles.optionDesc, { color: colors.textMuted }]}>
                  {t('importOptionQrDesc') || 'Aponte a câmera para o QR de outro celular/PC ou digite o PIN.'}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>

            {/* Option 2: JSON File */}
            <TouchableOpacity
              style={[
                styles.optionCard,
                { backgroundColor: innerBg, borderColor },
              ]}
              activeOpacity={0.8}
              onPress={() => onSelectOption('file')}
            >
              <View
                style={[
                  styles.optionIconCircle,
                  { backgroundColor: colors.secondary + '25' },
                ]}
              >
                <Ionicons
                  name="folder-open-outline"
                  size={22}
                  color={colors.secondary}
                />
              </View>
              <View style={styles.optionTextCol}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>
                  {t('importOptionFileTitle') || 'Selecionar Arquivo (.json)'}
                </Text>
                <Text style={[styles.optionDesc, { color: colors.textMuted }]}>
                  {t('importOptionFileDesc') || 'Abra um arquivo .json salvo no seu aparelho ou WhatsApp.'}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            {/* Option 3: Formatted Text / Code */}
            <TouchableOpacity
              style={[
                styles.optionCard,
                { backgroundColor: innerBg, borderColor },
              ]}
              activeOpacity={0.8}
              onPress={() => onSelectOption('text')}
            >
              <View
                style={[
                  styles.optionIconCircle,
                  { backgroundColor: 'rgba(245, 158, 11, 0.18)' },
                ]}
              >
                <Ionicons
                  name="clipboard-outline"
                  size={22}
                  color="#f59e0b"
                />
              </View>
              <View style={styles.optionTextCol}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>
                  {t('importOptionTextTitle') || 'Colar Código / Texto JSON'}
                </Text>
                <Text style={[styles.optionDesc, { color: colors.textMuted }]}>
                  {t('importOptionTextDesc') || 'Cole o código ou texto copiado no editor de texto.'}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor }]}
              activeOpacity={0.7}
              onPress={onClose}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>
                {t('cancel') || 'Cancelar'}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.65,
    shadowRadius: 24,
    elevation: 24,
  },
  pillHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: -4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  headerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 20,
    gap: 12,
  },
  promptText: {
    fontSize: 12.5,
    fontWeight: '700',
    marginBottom: 4,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 14,
  },
  optionCardPrimary: {
    borderWidth: 1.8,
  },
  optionIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextCol: {
    flex: 1,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  badgeRecommend: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeRecommendText: {
    color: '#fff',
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  optionDesc: {
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 15,
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
