import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../hooks/useLanguage';

export default function FeatureTutorialModal({ visible, onClose, feature }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const isDark = colors.isDark;

  if (!feature) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          
          {/* Cabeçalho do Modal */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <View style={[styles.iconBox, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '30' }]}>
                <Ionicons name={feature.icon || 'information-circle-outline'} size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={[styles.badgeContainer, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[styles.badgeText, { color: colors.primary }]}>
                    {t('tutorialGuide') || 'TUTORIAL PRÁTICO'}
                  </Text>
                </View>
                <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
                  {feature.title}
                </Text>
              </View>
            </View>

            <Pressable
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={({ pressed }) => [styles.closeButton, { backgroundColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
              onPress={onClose}
            >
              <Ionicons name="close" size={18} color={colors.text} />
            </Pressable>
          </View>

          {/* Conteúdo com Scroll */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Descrição Resumida */}
            {feature.subtitle ? (
              <View style={[styles.subtitleBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }]}>
                <Ionicons name="information-circle-outline" size={18} color={colors.primary} style={{ marginTop: 1 }} />
                <Text style={[styles.subtitleText, { color: colors.textMuted }]}>
                  {feature.subtitle}
                </Text>
              </View>
            ) : null}

            {/* Passo a Passo */}
            <Text style={[styles.sectionHeading, { color: colors.text }]}>
              {t('stepByStep') || 'COMO USAR PASSO A PASSO:'}
            </Text>

            <View style={styles.stepsList}>
              {feature.steps && feature.steps.map((step, idx) => (
                <View key={idx} style={styles.stepItem}>
                  <View style={[styles.stepNumberBadge, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '35' }]}>
                    <Text style={[styles.stepNumberText, { color: colors.primary }]}>
                      {String(idx + 1).padStart(2, '0')}
                    </Text>
                  </View>
                  <Text style={[styles.stepText, { color: colors.text }]}>
                    {step}
                  </Text>
                </View>
              ))}
            </View>

            {/* Dica Prática (Pro Tip) */}
            {feature.proTip ? (
              <View style={[styles.proTipBox, { backgroundColor: '#eab30815', borderColor: '#eab30840' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Ionicons name="bulb-outline" size={16} color="#eab308" />
                  <Text style={[styles.proTipHeading, { color: '#eab308' }]}>
                    {t('proTip') || 'DICA DE OURO:'}
                  </Text>
                </View>
                <Text style={[styles.proTipText, { color: isDark ? '#fef08a' : '#854d0e' }]}>
                  {feature.proTip}
                </Text>
              </View>
            ) : null}
          </ScrollView>

          {/* Botão Inferior de Fechar */}
          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }
              ]}
              onPress={onClose}
            >
              <Text style={styles.actionBtnText}>
                {t('understood') || 'ENTENDIDO'}
              </Text>
            </Pressable>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxHeight: '85%',
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeContainer: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    marginBottom: 3,
  },
  badgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  scrollArea: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: 16,
  },
  subtitleBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  subtitleText: {
    fontSize: 12.5,
    lineHeight: 18,
    flex: 1,
    fontWeight: '500',
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  stepsList: {
    gap: 12,
    marginBottom: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: '900',
  },
  stepText: {
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
    fontWeight: '600',
  },
  proTipBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  proTipHeading: {
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  proTipText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  modalFooter: {
    padding: 14,
    borderTopWidth: 1,
  },
  actionBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
