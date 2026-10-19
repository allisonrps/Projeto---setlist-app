import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';
import { bandService } from '../services/bandService';
import { api } from '../services/api';

export default function PublishBandModal({ visible, band, onClose, onSuccess }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const isDark = colors.isDark;

  const [username, setUsername] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const checkTimerRef = useRef(null);

  useEffect(() => {
    if (visible && band) {
      const initialSlug = (band.publicSlug || '')
        .trim()
        .toLowerCase()
        .replace('@', '') ||
        (band.name || '')
          .trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9_]+/g, '_')
          .replace(/^_+|_+$/g, '')
          .slice(0, 30);

      setUsername(initialSlug);
      if (initialSlug && initialSlug.length >= 3) {
        runUsernameCheck(initialSlug);
      } else {
        setIsAvailable(null);
        setFeedbackMsg('');
      }
    } else {
      setUsername('');
      setIsAvailable(null);
      setFeedbackMsg('');
      setIsPublishing(false);
    }
  }, [visible, band]);

  const runUsernameCheck = (val) => {
    if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    const clean = (val || '').trim().toLowerCase().replace('@', '');

    if (!clean) {
      setIsAvailable(null);
      setFeedbackMsg('');
      return;
    }

    if (clean.length < 3) {
      setIsAvailable(false);
      setFeedbackMsg(t('minCharsError') || 'Mínimo de 3 caracteres.');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
      setIsAvailable(false);
      setFeedbackMsg(t('validCharsError') || 'Apenas letras, números e sublinhados (_).');
      return;
    }

    setIsChecking(true);
    setIsAvailable(null);
    setFeedbackMsg(t('checkingAvailability') || 'Verificando disponibilidade...');

    checkTimerRef.current = setTimeout(async () => {
      try {
        const res = await api.checkBandUsername(clean, band?.cloudId || null);
        setIsChecking(false);
        if (res.available) {
          setIsAvailable(true);
          setFeedbackMsg(`@${clean} está disponível`);
        } else {
          setIsAvailable(false);
          setFeedbackMsg(res.message || `@${clean} já está em uso por outra banda`);
        }
      } catch (err) {
        setIsChecking(false);
        setIsAvailable(null);
        setFeedbackMsg('');
      }
    }, 350);
  };

  const handleUsernameChange = (val) => {
    const clean = (val || '').toLowerCase().replace(/[^a-z0-9_@]/g, '').slice(0, 30);
    setUsername(clean);
    runUsernameCheck(clean);
  };

  const handlePublish = async () => {
    const clean = (username || '').trim().toLowerCase().replace('@', '');
    if (!clean || clean.length < 3) {
      Alert.alert(t('attention') || 'Atenção', 'Informe um username válido com pelo menos 3 caracteres.');
      return;
    }
    if (isAvailable === false) {
      Alert.alert(t('attention') || 'Atenção', feedbackMsg || 'Este username não está disponível.');
      return;
    }

    const logged = await api.isLoggedIn();
    if (!logged) {
      Alert.alert(
        t('attention') || 'Atenção',
        'Você precisa estar conectado a uma conta BandLink para publicar a banda na nuvem.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setIsPublishing(true);
      const syncRes = await bandService.publishOfflineBandToCloud(band.id, clean);
      setIsPublishing(false);

      Alert.alert(
        t('success') || 'Sucesso!',
        `A banda "${band.name}" foi sincronizada com a nuvem como @${clean} com sucesso!`,
        [
          {
            text: 'OK',
            onPress: () => {
              if (onSuccess) onSuccess({ ...band, cloudId: syncRes?.cloudId, publicSlug: clean });
              onClose();
            }
          }
        ]
      );
    } catch (err) {
      setIsPublishing(false);
      console.error('Error publishing band to cloud:', err);
      Alert.alert(
        t('error') || 'Erro',
        err.message || 'Falha ao sincronizar banda com a nuvem. Tente novamente.'
      );
    }
  };

  if (!visible || !band) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <Pressable style={styles.backdropPressable} onPress={onClose} />

        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            }
          ]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.headerIconCircle, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="cloud-upload" size={22} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {t('publishBandTitle') || 'Publicar Banda Online'}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>
                  BandLink Cloud
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
            {/* Band preview card */}
            <View
              style={[
                styles.bandCardPreview,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
                }
              ]}
            >
              <View style={[styles.logoCircle, { backgroundColor: colors.primary + '18', borderColor: colors.primary }]}>
                {band.imageUri ? (
                  <Image source={{ uri: band.imageUri }} style={{ width: 48, height: 48, borderRadius: 24 }} />
                ) : (
                  <Text style={{ fontSize: 20, fontWeight: '900', color: colors.primary }}>
                    {(band.name || 'B').slice(0, 2).toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.previewBandName, { color: colors.text }]} numberOfLines={1}>
                  {band.name}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  {band.city ? `${band.city}${band.state ? ', ' + band.state : ''}` : 'Banda Offline'}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
                <Ionicons name="cloud-offline-outline" size={12} color="#f59e0b" />
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#f59e0b' }}>Offline</Text>
              </View>
            </View>

            {/* Explanatory text */}
            <Text style={[styles.explanationText, { color: colors.textMuted }]}>
              {t('publishBandExplanation') || 'Para publicar esta banda na nuvem e permitir compartilhamento com os integrantes, escolha um username exclusivo (@handle):'}
            </Text>

            {/* Username Input Container */}
            <View style={{ marginBottom: 16 }}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                {t('bandUsernameLabel') || 'Username da Banda'} *
              </Text>
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    borderColor: isAvailable === true ? '#10b981' : isAvailable === false ? '#ef4444' : colors.border
                  }
                ]}
              >
                <Text style={[styles.atSymbol, { color: isAvailable === true ? '#10b981' : colors.textMuted }]}>@</Text>
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  value={username}
                  onChangeText={handleUsernameChange}
                  placeholder="nomedabanda"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={30}
                  editable={!isPublishing}
                />
                {isChecking && <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />}
                {!isChecking && isAvailable === true && (
                  <Ionicons name="checkmark-circle" size={18} color="#10b981" style={{ marginRight: 8 }} />
                )}
                {!isChecking && isAvailable === false && (
                  <Ionicons name="close-circle" size={18} color="#ef4444" style={{ marginRight: 8 }} />
                )}
              </View>

              {feedbackMsg ? (
                <Text
                  style={[
                    styles.feedbackText,
                    { color: isAvailable === true ? '#10b981' : isAvailable === false ? '#ef4444' : colors.textMuted }
                  ]}
                >
                  {feedbackMsg}
                </Text>
              ) : (
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
                  Use letras, números e sublinhados (_)
                </Text>
              )}
            </View>

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <Pressable
                style={[
                  styles.cancelBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    borderColor: colors.border
                  }
                ]}
                onPress={onClose}
                disabled={isPublishing}
              >
                <Text style={[styles.cancelBtnText, { color: colors.text }]}>
                  {t('cancel') || 'Cancelar'}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.publishBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: (isAvailable === false || isChecking || isPublishing || !username.trim()) ? 0.5 : 1
                  }
                ]}
                onPress={handlePublish}
                disabled={isAvailable === false || isChecking || isPublishing || !username.trim()}
              >
                {isPublishing ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={16} color="#ffffff" />
                    <Text style={styles.publishBtnText}>
                      {t('publishNowBtn') || 'Publicar na Nuvem'}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 20,
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  closeBtn: {
    padding: 6,
  },
  bandCardPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  previewBandName: {
    fontSize: 16,
    fontWeight: '900',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  explanationText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    height: 48,
  },
  atSymbol: {
    fontSize: 16,
    fontWeight: '900',
    marginRight: 6,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    paddingVertical: 0,
  },
  feedbackText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  publishBtn: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  publishBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
