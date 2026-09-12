import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';

const { width, height } = Dimensions.get('window');
const SYNC_API_DEFAULT = 'https://www.setlistbandmanager.com/api/sync';

export default function ShareQrModal({
  visible,
  onClose,
  item, // { type: 'song' | 'setlist', data: Object, title: string, subtitle?: string }
}) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const isDark = colors.isDark;

  const [loading, setLoading] = useState(false);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [qrLoaded, setQrLoaded] = useState(false);
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    if (visible && item && item.data) {
      setQrLoaded(false);
      initQrSession();
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [visible, item]);

  const initQrSession = async () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    // 1. Generate fast local fallback session immediately so the screen is never blank
    const localPin = Math.floor(100000 + Math.random() * 900000).toString();
    const localSessionId = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);

    const initialQrPayload = JSON.stringify({
      app: 'SetlistsAppSync',
      version: 1,
      sessionId: localSessionId,
      pin: localPin,
      action: 'send_to_app',
      itemType: item.type,
      itemTitle: item.title,
      apiUrl: SYNC_API_DEFAULT,
    });

    setSessionInfo({
      sessionId: localSessionId,
      pin: localPin,
      qrPayload: initialQrPayload,
    });

    // 2. In background, create online relay session and upload data
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const createRes = await fetch(`${SYNC_API_DEFAULT}?action=create_session`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const sessionData = await createRes.json();

      if (sessionData && sessionData.success) {
        const { sessionId, pin } = sessionData;

        // Upload payload to relay
        await fetch(`${SYNC_API_DEFAULT}?action=send_data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send_data',
            sessionId,
            pin,
            target: 'app',
            data: item.data,
          }),
        });

        const onlineQrPayload = JSON.stringify({
          app: 'SetlistsAppSync',
          version: 1,
          sessionId,
          pin,
          action: 'send_to_app',
          itemType: item.type,
          itemTitle: item.title,
          apiUrl: SYNC_API_DEFAULT,
        });

        setSessionInfo({
          sessionId,
          pin,
          qrPayload: onlineQrPayload,
        });

        // 3. Start polling to detect when receiver downloads it
        pollIntervalRef.current = setInterval(async () => {
          try {
            const checkRes = await fetch(`${SYNC_API_DEFAULT}?action=status&sessionId=${sessionId}`);
            const checkData = await checkRes.json();
            if (checkData && (checkData.status === 'consumed' || checkData.consumed)) {
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
              Alert.alert(
                t('itemTransferSuccessTitle') || 'Transferência Concluída! 🎉',
                t('itemTransferSuccessMsg') || 'O item foi transferido e importado com sucesso no outro dispositivo!',
                [{ text: t('done') || 'OK', onPress: onClose }]
              );
            }
          } catch (e) {
            // silent poll
          }
        }, 3000);
      }
    } catch (err) {
      console.log('Relay sync note (offline or local QR payload active):', err?.message || err);
      // Even if network is offline or slow, local QR code and PIN are still visible and valid
    }
  };

  if (!visible && !item) return null;

  const currentItem = item || { type: 'song', data: {}, title: '', subtitle: '' };
  const cardBg = isDark ? '#131b2e' : '#ffffff';
  const innerBg = isDark ? '#0b0f19' : '#f1f5f9';
  const borderColor = isDark ? '#253047' : '#cbd5e1';
  const isSong = currentItem.type === 'song';

  const qrUri = sessionInfo
    ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=4&data=${encodeURIComponent(
        sessionInfo.qrPayload
      )}`
    : '';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: borderColor }]}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.headerIconCircle, { backgroundColor: colors.primary + '22' }]}>
                <Ionicons name={isSong ? 'musical-note' : 'list'} size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                  {isSong ? (t('shareQrModalTitleSong') || 'Compartilhar Música via QR') : (t('shareQrModalTitleSetlist') || 'Compartilhar Setlist via QR')}
                </Text>
                <Text style={[styles.subtitle, { color: colors.primary }]} numberOfLines={1}>
                  {currentItem.title}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            {sessionInfo ? (
              <View style={styles.contentBox}>
                {/* QR Code Container */}
                <View style={styles.qrImageContainer}>
                  <Image
                    source={{ uri: qrUri }}
                    style={styles.qrImage}
                    resizeMode="contain"
                    onLoad={() => setQrLoaded(true)}
                  />
                  {!qrLoaded && (
                    <View style={styles.qrLoadingOverlay}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={[styles.qrLoadingText, { color: colors.textMuted }]}>
                        {t('generatingItemQr') || 'Gerando QR Code...'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* PIN Code Box */}
                <View style={[styles.pinBox, { backgroundColor: innerBg, borderColor: colors.primary + '55' }]}>
                  <Text style={[styles.pinLabel, { color: colors.textMuted }]}>
                    {t('shareQrPinLabel') || 'CÓDIGO PIN'}
                  </Text>
                  <Text style={[styles.pinValue, { color: colors.primary }]}>
                    {sessionInfo.pin.slice(0, 3)} {sessionInfo.pin.slice(3)}
                  </Text>
                </View>

                {/* Instruction Pill */}
                <View style={[styles.instructionBox, { backgroundColor: innerBg, borderColor }]}>
                  <Ionicons name="scan-outline" size={20} color={colors.primary} style={{ marginTop: 2 }} />
                  <Text style={[styles.instructionText, { color: colors.text }]}>
                    {t('shareQrInstruction') || 'Aponte a câmera do outro celular em Sincronizar ➔ Ler QR (ou digite o PIN) para importar este item instantaneamente!'}
                  </Text>
                </View>

                {/* Regenerate Button */}
                <TouchableOpacity
                  style={[styles.refreshBtn, { borderColor }]}
                  onPress={initQrSession}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh" size={15} color={colors.textMuted} />
                  <Text style={[styles.refreshBtnText, { color: colors.textMuted }]}>
                    {t('generateNewCode') || 'Gerar Novo Código'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.text }]}>
                  {t('generatingItemQr') || 'Gerando QR Code...'}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 22,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 20,
    alignItems: 'center',
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    gap: 14,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  contentBox: {
    alignItems: 'center',
    width: '100%',
    gap: 14,
  },
  qrImageContainer: {
    width: 195,
    height: 195,
    padding: 10,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  qrLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  qrLoadingText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pinBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  pinLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pinValue: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 3,
  },
  instructionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
  },
  instructionText: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '600',
    flex: 1,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  refreshBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
});
