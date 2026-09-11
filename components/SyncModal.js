import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
  SafeAreaView,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';

const { width, height } = Dimensions.get('window');
const SCANNER_SIZE = Math.min(width * 0.72, 280);

const SYNC_API_DEFAULT = 'https://proud-mushroom-0a35a1e0f.azurestaticapps.net/api/sync';

export default function SyncModal({
  visible,
  onClose,
  getAllDataForBackup,
  onRestoreBackupData,
  onSyncSuccess,
}) {
  const { colors, themeMode } = useTheme();
  const { t } = useLanguage();
  const isDark = colors.isDark;
  
  const [permission, requestPermission] = useCameraPermissions();
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'generate' | 'pin'
  const [pinInput, setPinInput] = useState('');
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [connectedSession, setConnectedSession] = useState(null);
  const [torch, setTorch] = useState(false);

  // Phone-to-phone QR generation state
  const [generatingQr, setGeneratingQr] = useState(false);
  const [generatedSession, setGeneratedSession] = useState(null);
  const [qrTransferred, setQrTransferred] = useState(false);
  const pollIntervalRef = useRef(null);

  // Reset states when modal opens
  useEffect(() => {
    if (visible) {
      setScanned(false);
      setLoading(false);
      setStatusMessage('');
      setConnectedSession(null);
      setPinInput('');
      setTorch(false);
      setGeneratedSession(null);
      setQrTransferred(false);

      if (!permission?.granted) {
        requestPermission();
      }
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
  }, [visible]);

  // Handle Tab Switch
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setScanned(false);
    setConnectedSession(null);
    if (tab === 'generate' && !generatedSession) {
      handleGenerateQrCode();
    }
  };

  // Generate QR Code for another phone to scan
  const handleGenerateQrCode = async () => {
    setGeneratingQr(true);
    setQrTransferred(false);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    try {
      // 1. Get local database backup
      const fullBackup = await getAllDataForBackup();

      // 2. Create session on relay API
      const createRes = await fetch(`${SYNC_API_DEFAULT}?action=create_session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_session' }),
      });
      const sessionData = await createRes.json();

      if (sessionData && sessionData.success) {
        const { sessionId, pin } = sessionData;

        // 3. Upload data to session for the other phone to receive
        await fetch(`${SYNC_API_DEFAULT}?action=send_data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send_data',
            sessionId,
            pin,
            target: 'app',
            data: fullBackup,
          }),
        });

        const qrPayload = JSON.stringify({
          app: 'SetlistsAppSync',
          version: 1,
          sessionId,
          pin,
          action: 'send_to_app',
          apiUrl: SYNC_API_DEFAULT,
        });

        setGeneratedSession({ sessionId, pin, qrPayload });

        // 4. Start polling to detect when friend downloads it
        pollIntervalRef.current = setInterval(async () => {
          try {
            const checkRes = await fetch(`${SYNC_API_DEFAULT}?action=status&sessionId=${sessionId}`);
            const checkData = await checkRes.json();
            // If data was consumed
            if (checkData && (checkData.status === 'consumed' || checkData.consumed)) {
              setQrTransferred(true);
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
              Alert.alert(t('transferSuccessTitle'), t('transferSuccessMsg'));
            }
          } catch (e) {
            // silent poll
          }
        }, 3000);
      } else {
        Alert.alert(t('error') || 'Erro', t('sessionGenerateError'));
      }
    } catch (err) {
      console.error('Error generating QR code:', err);
      Alert.alert(t('connectionErrorTitle'), t('connectionErrorMsg'));
    } finally {
      setGeneratingQr(false);
    }
  };

  // Handle QR Barcode Scan
  const handleBarcodeScanned = async ({ type, data }) => {
    if (scanned || loading) return;
    setScanned(true);

    try {
      let parsed = null;
      try {
        parsed = JSON.parse(data);
      } catch (e) {
        if (data && data.length === 6 && !isNaN(data)) {
          parsed = { pin: data, apiUrl: SYNC_API_DEFAULT };
        }
      }

      if (parsed && (parsed.sessionId || parsed.pin)) {
        // If it's a direct phone-to-phone share (action = 'send_to_app' or from PC send)
        if (parsed.action === 'send_to_app' || parsed.action === 'send') {
          // Immediately pull and restore data!
          await autoPullAndRestore(parsed);
        } else {
          // Connected to PC session with choice to send or pull
          setConnectedSession(parsed);
          setStatusMessage(`${t('connectedToSession')} (PIN: ${parsed.pin || 'OK'})`);
        }
      } else {
        Alert.alert(t('invalidQrTitle'), t('invalidQrMsg'));
        setTimeout(() => setScanned(false), 2000);
      }
    } catch (err) {
      Alert.alert(t('error') || 'Erro', t('processQrError'));
      setTimeout(() => setScanned(false), 2000);
    }
  };

  // Direct auto pull & restore for Phone-to-Phone sharing
  const autoPullAndRestore = async (sessionInfo) => {
    setLoading(true);
    setStatusMessage(t('pullingData'));

    try {
      const apiUrl = sessionInfo.apiUrl || SYNC_API_DEFAULT;
      const res = await fetch(`${apiUrl}?action=poll_data&pin=${sessionInfo.pin}&sessionId=${sessionInfo.sessionId || ''}&receiver=app`);
      const result = await res.json();

      if (result && result.success && result.data) {
        setStatusMessage(t('savingSongsLocally'));
        await onRestoreBackupData(JSON.stringify(result.data));

        Alert.alert(
          t('repertoireReceivedTitle'),
          t('repertoireReceivedMsg'),
          [{ text: t('done') || 'OK', onPress: () => { onClose(); if (onSyncSuccess) onSyncSuccess(); } }]
        );
      } else {
        // Fallback to manual choice
        setConnectedSession(sessionInfo);
        setStatusMessage(`${t('connectedToPin')} ${sessionInfo.pin}`);
      }
    } catch (err) {
      console.error('Erro no auto pull:', err);
      Alert.alert(t('error') || 'Erro', t('connectionErrorMsg'));
      setTimeout(() => setScanned(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  // Connect via PIN
  const handleConnectByPin = async () => {
    const cleanPin = pinInput.trim().replace(/\s+/g, '');
    if (!cleanPin || cleanPin.length < 4) {
      Alert.alert(t('invalidPinTitle'), t('invalidPinMsg'));
      return;
    }

    setLoading(true);
    setStatusMessage(t('connectingPin'));

    try {
      // First try to auto-pull (in case a friend sent data with this PIN)
      const res = await fetch(`${SYNC_API_DEFAULT}?action=poll_data&pin=${cleanPin}&receiver=app`);
      const result = await res.json();

      if (result && result.success && result.data) {
        setStatusMessage(t('savingSongsLocally'));
        await onRestoreBackupData(JSON.stringify(result.data));

        Alert.alert(
          t('repertoireReceivedTitle'),
          t('repertoireReceivedPinMsg'),
          [{ text: t('done') || 'OK', onPress: () => { onClose(); if (onSyncSuccess) onSyncSuccess(); } }]
        );
      } else if (result && result.success) {
        setConnectedSession({ pin: cleanPin, apiUrl: SYNC_API_DEFAULT });
        setStatusMessage(`${t('connectedToPin')} ${cleanPin}`);
      } else {
        Alert.alert(t('sessionNotFoundTitle'), (result && result.error) || t('sessionNotFoundMsg'));
      }
    } catch (err) {
      setConnectedSession({ pin: cleanPin, apiUrl: SYNC_API_DEFAULT });
      setStatusMessage(`${t('connectedToPin')} ${cleanPin}`);
    } finally {
      setLoading(false);
    }
  };

  // Action 1: Enviar dados do Celular para o Web Editor no PC
  const handleSendToWeb = async () => {
    if (!connectedSession) return;
    setLoading(true);
    setStatusMessage(t('collectingRepertoire'));

    try {
      const fullBackup = await getAllDataForBackup();
      setStatusMessage(t('transmittingToPc'));

      const apiUrl = connectedSession.apiUrl || SYNC_API_DEFAULT;
      const res = await fetch(`${apiUrl}?action=send_data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_data',
          sessionId: connectedSession.sessionId,
          pin: connectedSession.pin,
          target: 'web',
          data: fullBackup,
        }),
      });

      const result = await res.json();
      if (result && result.success) {
        Alert.alert(
          t('transmittedSuccessTitle'),
          t('transmittedSuccessMsg'),
          [{ text: t('done') || 'OK', onPress: () => { onClose(); if (onSyncSuccess) onSyncSuccess(); } }]
        );
      } else {
        Alert.alert(t('transmissionErrorTitle'), (result && result.error) || t('transmissionErrorMsg'));
      }
    } catch (err) {
      console.error('Erro ao enviar dados para o PC:', err);
      Alert.alert(t('connectionErrorTitle'), t('connectionErrorMsg'));
    } finally {
      setLoading(false);
    }
  };

  // Action 2: Baixar dados do Web Editor (PC) para o Celular
  const handlePullFromWeb = async () => {
    if (!connectedSession) return;
    setLoading(true);
    setStatusMessage(t('fetchingWebData'));

    try {
      const apiUrl = connectedSession.apiUrl || SYNC_API_DEFAULT;
      const res = await fetch(`${apiUrl}?action=poll_data&pin=${connectedSession.pin}&sessionId=${connectedSession.sessionId || ''}&receiver=app`);
      const result = await res.json();

      if (result && result.success && result.data) {
        setStatusMessage(t('updatingDatabaseMsg'));
        await onRestoreBackupData(JSON.stringify(result.data));
        
        Alert.alert(
          t('syncCompletedTitle'),
          t('syncCompletedMsg'),
          [{ text: t('done') || 'OK', onPress: () => { onClose(); if (onSyncSuccess) onSyncSuccess(); } }]
        );
      } else {
        Alert.alert(
          t('awaitingDataTitle'),
          t('awaitingDataMsg')
        );
      }
    } catch (err) {
      console.error('Erro ao baixar dados do PC:', err);
      Alert.alert(t('connectionErrorTitle'), t('connectionErrorMsg'));
    } finally {
      setLoading(false);
    }
  };

  // Solid background colors
  const cardBg = isDark ? '#131b2e' : '#ffffff';
  const innerBg = isDark ? '#0b0f19' : '#f1f5f9';
  const borderColor = isDark ? '#253047' : '#cbd5e1';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderColor }]}>
          
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: borderColor }]}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.headerIconCircle, { backgroundColor: colors.primary + '22' }]}>
                <Ionicons name="qr-code-outline" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.text }]}>{t('syncModalTitle')}</Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t('syncModalSubtitle')}</Text>
              </View>
            </View>
            
            {/* Prominent Close Button */}
            <TouchableOpacity 
              onPress={onClose} 
              style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={styles.bodyScroll}>
            {/* Session Connected Action Panel */}
            {connectedSession ? (
              <View style={styles.connectedContainer}>
                <View style={[styles.connectedBadge, { backgroundColor: colors.primary + '18', borderColor: colors.primary }]}>
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  <Text style={[styles.connectedText, { color: colors.primary }]}>
                    {statusMessage || t('connectedSuccess')}
                  </Text>
                </View>

                <Text style={[styles.connectedSubtext, { color: colors.textMuted }]}>
                  {t('chooseAction')}
                </Text>

                {loading ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.text }]}>{statusMessage}</Text>
                  </View>
                ) : (
                  <View style={styles.actionsBox}>
                    {/* Action 1: Enviar */}
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                      onPress={handleSendToWeb}
                      activeOpacity={0.85}
                    >
                      <View style={styles.actionIconBox}>
                        <Ionicons name="cloud-upload-outline" size={24} color="#fff" />
                      </View>
                      <View style={styles.actionBtnTextCol}>
                        <Text style={styles.actionBtnTitle}>{t('sendToPcTitle')}</Text>
                        <Text style={styles.actionBtnDesc}>{t('sendToPcDesc')}</Text>
                      </View>
                      <Ionicons name="arrow-forward" size={18} color="#ffffffaa" />
                    </TouchableOpacity>

                    {/* Action 2: Puxar */}
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnSecondary, { borderColor: borderColor, backgroundColor: innerBg }]}
                      onPress={handlePullFromWeb}
                      activeOpacity={0.85}
                    >
                      <View style={[styles.actionIconBox, { backgroundColor: colors.primary + '20' }]}>
                        <Ionicons name="cloud-download-outline" size={24} color={colors.primary} />
                      </View>
                      <View style={styles.actionBtnTextCol}>
                        <Text style={[styles.actionBtnTitle, { color: colors.text }]}>{t('pullFromPcTitle')}</Text>
                        <Text style={[styles.actionBtnDesc, { color: colors.textMuted }]}>{t('pullFromPcDesc')}</Text>
                      </View>
                      <Ionicons name="arrow-forward" size={18} color={colors.primary} />
                    </TouchableOpacity>

                    {/* Rescan Button */}
                    <TouchableOpacity
                      style={styles.rescanBtn}
                      onPress={() => { setConnectedSession(null); setScanned(false); }}
                    >
                      <Ionicons name="refresh" size={16} color={colors.textMuted} />
                      <Text style={[styles.rescanBtnText, { color: colors.textMuted }]}>{t('scanAnotherCode')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              <>
                {/* Tabs: Ler QR | Gerar QR | Digitar PIN */}
                <View style={[styles.tabRow, { backgroundColor: innerBg, borderColor: borderColor }]}>
                  <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'camera' && [styles.activeTabBtn, { backgroundColor: colors.primary }]]}
                    onPress={() => handleTabChange('camera')}
                  >
                    <Ionicons
                      name="scan-outline"
                      size={15}
                      color={activeTab === 'camera' ? '#fff' : colors.textMuted}
                    />
                    <Text style={[styles.tabBtnText, { color: activeTab === 'camera' ? '#fff' : colors.textMuted }]}>
                      {t('tabScanQr')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'generate' && [styles.activeTabBtn, { backgroundColor: colors.primary }]]}
                    onPress={() => handleTabChange('generate')}
                  >
                    <Ionicons
                      name="share-social-outline"
                      size={15}
                      color={activeTab === 'generate' ? '#fff' : colors.textMuted}
                    />
                    <Text style={[styles.tabBtnText, { color: activeTab === 'generate' ? '#fff' : colors.textMuted }]}>
                      {t('tabGenerateQr')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'pin' && [styles.activeTabBtn, { backgroundColor: colors.primary }]]}
                    onPress={() => handleTabChange('pin')}
                  >
                    <Ionicons
                      name="keypad-outline"
                      size={15}
                      color={activeTab === 'pin' ? '#fff' : colors.textMuted}
                    />
                    <Text style={[styles.tabBtnText, { color: activeTab === 'pin' ? '#fff' : colors.textMuted }]}>
                      {t('tabPin')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* TAB 1: CAMERA SCANNER */}
                {activeTab === 'camera' && (
                  <View style={styles.scannerOuter}>
                    {!permission?.granted ? (
                      <View style={[styles.permissionBox, { backgroundColor: innerBg, borderColor: borderColor }]}>
                        <View style={[styles.permissionIconCircle, { backgroundColor: colors.primary + '20' }]}>
                          <Ionicons name="camera-outline" size={32} color={colors.primary} />
                        </View>
                        <Text style={[styles.permissionText, { color: colors.text }]}>
                          {t('cameraPermRequired')}
                        </Text>
                        <Text style={[styles.permissionSub, { color: colors.textMuted }]}>
                          {t('cameraPermDesc')}
                        </Text>
                        <TouchableOpacity
                          style={[styles.permissionBtn, { backgroundColor: colors.primary }]}
                          onPress={requestPermission}
                        >
                          <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                          <Text style={styles.permissionBtnText}>{t('allowCameraBtn')}</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={[styles.cameraContainer, { borderColor: borderColor }]}>
                        {visible && activeTab === 'camera' && permission?.granted && (
                          <CameraView
                            key={`camera-scanner-${visible}-${activeTab}-${torch}`}
                            style={styles.cameraView}
                            facing="back"
                            enableTorch={torch}
                            barcodeScannerSettings={{
                              barcodeTypes: ['qr'],
                            }}
                            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                          />
                        )}

                        {/* Reticle Overlay */}
                        <View style={styles.reticleContainer} pointerEvents="none">
                          <View style={[styles.reticle, { borderColor: colors.primary }]}>
                            <View style={[styles.corner, styles.tl, { borderColor: colors.primary }]} />
                            <View style={[styles.corner, styles.tr, { borderColor: colors.primary }]} />
                            <View style={[styles.corner, styles.bl, { borderColor: colors.primary }]} />
                            <View style={[styles.corner, styles.br, { borderColor: colors.primary }]} />
                          </View>
                        </View>

                        {/* Torch Button */}
                        <TouchableOpacity
                          style={[styles.torchBtn, torch && { backgroundColor: colors.primary }]}
                          onPress={() => setTorch(!torch)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name={torch ? 'flash' : 'flash-outline'} size={18} color="#fff" />
                        </TouchableOpacity>

                        {/* Bottom Instruction */}
                        <View style={styles.scanInstructionPill}>
                          <Ionicons name="scan" size={14} color="#fff" />
                          <Text style={styles.scanInstructionText}>
                            {t('pointCameraInstruction')}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {/* TAB 2: GERAR QR CODE PARA OUTRO CELULAR */}
                {activeTab === 'generate' && (
                  <View style={[styles.generateWrapper, { backgroundColor: innerBg, borderColor: borderColor }]}>
                    {generatingQr ? (
                      <View style={styles.generateLoadingBox}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={[styles.generateLoadingText, { color: colors.text }]}>
                          {t('preparingQrCode')}
                        </Text>
                      </View>
                    ) : generatedSession ? (
                      <View style={styles.qrDisplayBox}>
                        {/* QR Code Image */}
                        <View style={styles.qrImageContainer}>
                          <Image
                            source={{
                              uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                                generatedSession.qrPayload
                              )}`,
                            }}
                            style={styles.qrImage}
                            resizeMode="contain"
                          />
                        </View>

                        {/* PIN Display */}
                        <View style={[styles.qrPinBox, { backgroundColor: cardBg, borderColor: borderColor }]}>
                          <Text style={[styles.qrPinLabel, { color: colors.textMuted }]}>{t('pinCodeLabel')}</Text>
                          <Text style={[styles.qrPinValue, { color: colors.primary }]}>
                            {generatedSession.pin.slice(0, 3)} {generatedSession.pin.slice(3)}
                          </Text>
                        </View>

                        {/* Instruction */}
                        <View style={styles.qrInstructionBox}>
                          <Ionicons name="phone-portrait-outline" size={18} color={colors.primary} />
                          <Text style={[styles.qrInstructionText, { color: colors.text }]}>
                            {t('qrInstruction')}
                          </Text>
                        </View>

                        {/* Status / Regenerate */}
                        <TouchableOpacity
                          style={[styles.refreshQrBtn, { borderColor: borderColor }]}
                          onPress={handleGenerateQrCode}
                        >
                          <Ionicons name="refresh" size={16} color={colors.textMuted} />
                          <Text style={[styles.refreshQrBtnText, { color: colors.textMuted }]}>{t('generateNewCode')}</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.generateEmptyBox}>
                        <Ionicons name="share-social-outline" size={42} color={colors.primary} />
                        <Text style={[styles.generateEmptyTitle, { color: colors.text }]}>
                          {t('shareWithNearbyPhone')}
                        </Text>
                        <Text style={[styles.generateEmptyDesc, { color: colors.textMuted }]}>
                          {t('shareWithNearbyPhoneDesc')}
                        </Text>
                        <TouchableOpacity
                          style={[styles.generateActionBtn, { backgroundColor: colors.primary }]}
                          onPress={handleGenerateQrCode}
                        >
                          <Ionicons name="qr-code-outline" size={18} color="#fff" />
                          <Text style={styles.generateActionBtnText}>{t('generateQrNowBtn')}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}

                {/* TAB 3: PIN INPUT */}
                {activeTab === 'pin' && (
                  <View style={[styles.pinWrapper, { backgroundColor: innerBg, borderColor: borderColor }]}>
                    <View style={[styles.pinIconCircle, { backgroundColor: colors.primary + '20' }]}>
                      <Ionicons name="keypad-outline" size={30} color={colors.primary} />
                    </View>
                    <Text style={[styles.pinTitle, { color: colors.text }]}>
                      {t('enterPinTitle')}
                    </Text>
                    <Text style={[styles.pinDesc, { color: colors.textMuted }]}>
                      {t('enterPinDesc')}
                    </Text>

                    <TextInput
                      style={[styles.pinInput, { color: colors.text, borderColor: colors.primary, backgroundColor: cardBg }]}
                      placeholder="849201"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                      maxLength={6}
                      value={pinInput}
                      onChangeText={setPinInput}
                    />

                    <TouchableOpacity
                      style={[styles.connectPinBtn, { backgroundColor: colors.primary }]}
                      onPress={handleConnectByPin}
                      disabled={loading}
                      activeOpacity={0.85}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="link-outline" size={20} color="#fff" />
                          <Text style={styles.connectPinBtnText}>{t('connectByPinBtn')}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </>
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
    maxWidth: 420,
    maxHeight: height * 0.90,
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
    fontSize: 15.5,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyScroll: {
    padding: 16,
    gap: 14,
  },
  tabRow: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 8,
  },
  activeTabBtn: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  scannerOuter: {
    width: '100%',
    alignItems: 'center',
  },
  cameraContainer: {
    width: SCANNER_SIZE,
    height: SCANNER_SIZE,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.5,
  },
  cameraView: {
    width: '100%',
    height: '100%',
  },
  reticleContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticle: {
    width: SCANNER_SIZE * 0.72,
    height: SCANNER_SIZE * 0.72,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: '#38bdf8',
  },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 4 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 4 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 4 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 4 },
  torchBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanInstructionPill: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  scanInstructionText: {
    color: '#fff',
    fontSize: 10.5,
    fontWeight: '700',
  },
  permissionBox: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    textAlign: 'center',
    width: '100%',
  },
  permissionIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  permissionSub: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  permissionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  permissionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  generateWrapper: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  generateLoadingBox: {
    padding: 30,
    alignItems: 'center',
    gap: 12,
  },
  generateLoadingText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  qrDisplayBox: {
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  qrImageContainer: {
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  qrImage: {
    width: 175,
    height: 175,
  },
  qrPinBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  qrPinLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  qrPinValue: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },
  qrInstructionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
  },
  qrInstructionText: {
    fontSize: 11.5,
    lineHeight: 16,
    flex: 1,
  },
  refreshQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  refreshQrBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  generateEmptyBox: {
    padding: 20,
    alignItems: 'center',
    textAlign: 'center',
    gap: 10,
  },
  generateEmptyTitle: {
    fontSize: 15.5,
    fontWeight: '800',
  },
  generateEmptyDesc: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 17,
  },
  generateActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 6,
  },
  generateActionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  pinWrapper: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    width: '100%',
  },
  pinIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  pinTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    marginBottom: 4,
  },
  pinDesc: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 14,
  },
  pinInput: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 6,
    marginBottom: 14,
  },
  connectPinBtn: {
    width: '100%',
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  connectPinBtnText: {
    color: '#fff',
    fontSize: 13.5,
    fontWeight: '800',
  },
  connectedContainer: {
    gap: 14,
    width: '100%',
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  connectedText: {
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  connectedSubtext: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  loadingBox: {
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionsBox: {
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    gap: 12,
  },
  actionBtnSecondary: {
    borderWidth: 1.5,
  },
  actionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnTextCol: {
    flex: 1,
  },
  actionBtnTitle: {
    color: '#fff',
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  actionBtnDesc: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 14,
  },
  rescanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  rescanBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
