import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../hooks/useTheme';

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
  const isDark = colors.isDark;
  
  const [permission, requestPermission] = useCameraPermissions();
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'pin'
  const [pinInput, setPinInput] = useState('');
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [connectedSession, setConnectedSession] = useState(null);
  const [torch, setTorch] = useState(false);

  // When modal opens, auto-request permission if not granted yet
  useEffect(() => {
    if (visible) {
      setScanned(false);
      setLoading(false);
      setStatusMessage('');
      setConnectedSession(null);
      setPinInput('');
      setTorch(false);

      if (!permission?.granted) {
        requestPermission();
      }
    }
  }, [visible]);

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
        setConnectedSession(parsed);
        setStatusMessage(`Conectado ao Web Editor (PIN: ${parsed.pin || 'OK'})`);
      } else {
        Alert.alert('QR Code Inválido', 'O código escaneado não é do Setlist Band Manager Web Editor.');
        setTimeout(() => setScanned(false), 2000);
      }
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível ler o QR Code.');
      setTimeout(() => setScanned(false), 2000);
    }
  };

  // Connect via PIN
  const handleConnectByPin = async () => {
    const cleanPin = pinInput.trim().replace(/\s+/g, '');
    if (!cleanPin || cleanPin.length < 4) {
      Alert.alert('PIN Inválido', 'Digite o código numérico de 6 dígitos exibido na tela do PC.');
      return;
    }

    setLoading(true);
    setStatusMessage('Conectando ao Web Editor...');

    try {
      const res = await fetch(`${SYNC_API_DEFAULT}?action=poll_data&pin=${cleanPin}&receiver=app`);
      const data = await res.json();

      if (data && data.success) {
        setConnectedSession({ pin: cleanPin, apiUrl: SYNC_API_DEFAULT });
        setStatusMessage(`Conectado à sessão (PIN: ${cleanPin})`);
      } else {
        Alert.alert('Sessão Não Encontrada', data.error || 'Código PIN incorreto ou expirado.');
      }
    } catch (err) {
      setConnectedSession({ pin: cleanPin, apiUrl: SYNC_API_DEFAULT });
      setStatusMessage(`Conectado ao PIN ${cleanPin}`);
    } finally {
      setLoading(false);
    }
  };

  // Action 1: Enviar dados do Celular para o Web Editor no PC
  const handleSendToWeb = async () => {
    if (!connectedSession) return;
    setLoading(true);
    setStatusMessage('Coletando repertório e setlists...');

    try {
      const fullBackup = await getAllDataForBackup();
      setStatusMessage('Transmitindo dados para a tela do PC...');

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
          'Sucesso! 🎉',
          `Todos os dados foram transmitidos com sucesso para a tela do Web Editor no PC!`,
          [{ text: 'OK', onPress: () => { onClose(); if (onSyncSuccess) onSyncSuccess(); } }]
        );
      } else {
        Alert.alert('Erro na Transmissão', result.error || 'Não foi possível enviar os dados.');
      }
    } catch (err) {
      console.error('Erro ao enviar dados para o PC:', err);
      Alert.alert('Erro de Conexão', 'Verifique sua conexão com a internet e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Action 2: Baixar dados do Web Editor (PC) para o Celular
  const handlePullFromWeb = async () => {
    if (!connectedSession) return;
    setLoading(true);
    setStatusMessage('Buscando dados do Web Editor...');

    try {
      const apiUrl = connectedSession.apiUrl || SYNC_API_DEFAULT;
      const res = await fetch(`${apiUrl}?action=poll_data&pin=${connectedSession.pin}&sessionId=${connectedSession.sessionId || ''}&receiver=app`);
      const result = await res.json();

      if (result && result.success && result.data) {
        setStatusMessage('Atualizando banco de dados no celular...');
        await onRestoreBackupData(JSON.stringify(result.data));
        
        Alert.alert(
          'Sincronização Concluída! 🚀',
          'Todas as músicas e setlists editados no PC foram importados com sucesso para o seu celular!',
          [{ text: 'OK', onPress: () => { onClose(); if (onSyncSuccess) onSyncSuccess(); } }]
        );
      } else {
        Alert.alert(
          'Aguardando Dados',
          'Nenhum dado foi enviado do PC ainda. No Web Editor, clique na aba "Enviar para o Celular".'
        );
      }
    } catch (err) {
      console.error('Erro ao baixar dados do PC:', err);
      Alert.alert('Erro de Conexão', 'Não foi possível baixar os dados do PC.');
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
                <Text style={[styles.title, { color: colors.text }]}>Sincronizar com Web (PC)</Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>Conexão instantânea via QR Code</Text>
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
                    {statusMessage || 'PC Conectado com Sucesso!'}
                  </Text>
                </View>

                <Text style={[styles.connectedSubtext, { color: colors.textMuted }]}>
                  Escolha o sentido da sincronização:
                </Text>

                {loading ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.text }]}>{statusMessage}</Text>
                  </View>
                ) : (
                  <View style={styles.actionsBox}>
                    {/* Action 1 */}
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                      onPress={handleSendToWeb}
                      activeOpacity={0.85}
                    >
                      <View style={styles.actionIconBox}>
                        <Ionicons name="cloud-upload-outline" size={24} color="#fff" />
                      </View>
                      <View style={styles.actionBtnTextCol}>
                        <Text style={styles.actionBtnTitle}>Enviar do Celular ➔ PC</Text>
                        <Text style={styles.actionBtnDesc}>Sobe todo o seu repertório deste aparelho para o Web Editor no monitor</Text>
                      </View>
                      <Ionicons name="arrow-forward" size={18} color="#ffffffaa" />
                    </TouchableOpacity>

                    {/* Action 2 */}
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnSecondary, { borderColor: borderColor, backgroundColor: innerBg }]}
                      onPress={handlePullFromWeb}
                      activeOpacity={0.85}
                    >
                      <View style={[styles.actionIconBox, { backgroundColor: colors.primary + '20' }]}>
                        <Ionicons name="cloud-download-outline" size={24} color={colors.primary} />
                      </View>
                      <View style={styles.actionBtnTextCol}>
                        <Text style={[styles.actionBtnTitle, { color: colors.text }]}>Baixar do PC ➔ Celular</Text>
                        <Text style={[styles.actionBtnDesc, { color: colors.textMuted }]}>Puxa as músicas e setlists editados no computador para este celular</Text>
                      </View>
                      <Ionicons name="arrow-forward" size={18} color={colors.primary} />
                    </TouchableOpacity>

                    {/* Rescan Button */}
                    <TouchableOpacity
                      style={styles.rescanBtn}
                      onPress={() => { setConnectedSession(null); setScanned(false); }}
                    >
                      <Ionicons name="refresh" size={16} color={colors.textMuted} />
                      <Text style={[styles.rescanBtnText, { color: colors.textMuted }]}>Escanear outro QR Code</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              <>
                {/* Tabs: Camera vs PIN */}
                <View style={[styles.tabRow, { backgroundColor: innerBg, borderColor: borderColor }]}>
                  <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'camera' && [styles.activeTabBtn, { backgroundColor: colors.primary }]]}
                    onPress={() => setActiveTab('camera')}
                  >
                    <Ionicons
                      name="camera-outline"
                      size={17}
                      color={activeTab === 'camera' ? '#fff' : colors.textMuted}
                    />
                    <Text style={[styles.tabBtnText, { color: activeTab === 'camera' ? '#fff' : colors.textMuted }]}>
                      Câmera (QR Code)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'pin' && [styles.activeTabBtn, { backgroundColor: colors.primary }]]}
                    onPress={() => setActiveTab('pin')}
                  >
                    <Ionicons
                      name="keypad-outline"
                      size={17}
                      color={activeTab === 'pin' ? '#fff' : colors.textMuted}
                    />
                    <Text style={[styles.tabBtnText, { color: activeTab === 'pin' ? '#fff' : colors.textMuted }]}>
                      Digitar PIN
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* TAB 1: CAMERA SCANNER */}
                {activeTab === 'camera' ? (
                  <View style={styles.scannerOuter}>
                    {!permission?.granted ? (
                      <View style={[styles.permissionBox, { backgroundColor: innerBg, borderColor: borderColor }]}>
                        <View style={[styles.permissionIconCircle, { backgroundColor: colors.primary + '20' }]}>
                          <Ionicons name="camera-outline" size={32} color={colors.primary} />
                        </View>
                        <Text style={[styles.permissionText, { color: colors.text }]}>
                          Acesso à Câmera Necessário
                        </Text>
                        <Text style={[styles.permissionSub, { color: colors.textMuted }]}>
                          Para ler o QR Code exibido no monitor do computador, precisamos da permissão da câmera.
                        </Text>
                        <TouchableOpacity
                          style={[styles.permissionBtn, { backgroundColor: colors.primary }]}
                          onPress={requestPermission}
                        >
                          <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                          <Text style={styles.permissionBtnText}>Permitir Câmera</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={[styles.cameraContainer, { borderColor: borderColor }]}>
                        <CameraView
                          style={StyleSheet.absoluteFillObject}
                          facing="back"
                          enableTorch={torch}
                          barcodeScannerSettings={{
                            barcodeTypes: ['qr'],
                          }}
                          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                        />

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
                            Aponte a câmera para o QR Code no PC
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                ) : (
                  /* TAB 2: PIN INPUT */
                  <View style={[styles.pinWrapper, { backgroundColor: innerBg, borderColor: borderColor }]}>
                    <View style={[styles.pinIconCircle, { backgroundColor: colors.primary + '20' }]}>
                      <Ionicons name="desktop-outline" size={32} color={colors.primary} />
                    </View>
                    <Text style={[styles.pinTitle, { color: colors.text }]}>
                      Digite o PIN de 6 Dígitos
                    </Text>
                    <Text style={[styles.pinDesc, { color: colors.textMuted }]}>
                      Código exibido na tela de sincronização do Web Editor no PC:
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
                          <Text style={styles.connectPinBtnText}>Conectar ao Web Editor</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: height * 0.88,
    borderRadius: 22,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1.5,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  bodyScroll: {
    padding: 16,
  },
  tabRow: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  activeTabBtn: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  scannerOuter: {
    width: '100%',
    alignItems: 'center',
  },
  cameraContainer: {
    width: '100%',
    height: 280,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    backgroundColor: '#000',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reticleContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reticle: {
    width: SCANNER_SIZE * 0.75,
    height: SCANNER_SIZE * 0.75,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
  },
  tl: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 10 },
  tr: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 10 },
  bl: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 10 },
  br: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 10 },
  torchBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  scanInstructionPill: {
    position: 'absolute',
    bottom: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  scanInstructionText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '700',
  },
  permissionBox: {
    width: '100%',
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    textAlign: 'center',
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
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  permissionSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  permissionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
  },
  permissionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  pinWrapper: {
    width: '100%',
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
  },
  pinIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  pinTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  pinDesc: {
    fontSize: 11.5,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 16,
  },
  pinInput: {
    width: '85%',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 6,
    marginBottom: 16,
  },
  connectPinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '85%',
  },
  connectPinBtnText: {
    color: '#fff',
    fontSize: 13.5,
    fontWeight: '800',
  },
  connectedContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  connectedText: {
    fontSize: 13,
    fontWeight: '800',
  },
  connectedSubtext: {
    fontSize: 12.5,
    marginBottom: 16,
  },
  actionsBox: {
    width: '100%',
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    gap: 12,
  },
  actionBtnSecondary: {
    borderWidth: 1.5,
  },
  actionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnTextCol: {
    flex: 1,
  },
  actionBtnTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 2,
  },
  actionBtnDesc: {
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 14,
  },
  rescanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 4,
  },
  rescanBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  loadingBox: {
    padding: 30,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});