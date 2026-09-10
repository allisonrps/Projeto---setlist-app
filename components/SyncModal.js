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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../hooks/useTheme';

const { width } = Dimensions.get('window');
const SCANNER_SIZE = width * 0.68;

const SYNC_API_DEFAULT = 'https://proud-mushroom-0a35a1e0f.azurestaticapps.net/api/sync';

export default function SyncModal({
  visible,
  onClose,
  getAllDataForBackup,
  onRestoreBackupData,
  onSyncSuccess,
}) {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'pin'
  const [pinInput, setPinInput] = useState('');
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [connectedSession, setConnectedSession] = useState(null);
  const [torch, setTorch] = useState(false);

  useEffect(() => {
    if (visible) {
      setScanned(false);
      setLoading(false);
      setStatusMessage('');
      setConnectedSession(null);
      setPinInput('');
      setTorch(false);
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
        // Raw PIN or text
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
    setStatusMessage('Localizando sessão do PC...');

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
      // Fallback connected session
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
    setStatusMessage('Preparando repertório e setlists...');

    try {
      const fullBackup = await getAllDataForBackup();
      setStatusMessage('Enviando dados para a tela do PC...');

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

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="qr-code-outline" size={22} color={colors.primary} />
              <Text style={[styles.title, { color: colors.text }]}>Sincronizar com Web (PC)</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Session Connected Action Panel */}
          {connectedSession ? (
            <View style={styles.connectedContainer}>
              <View style={[styles.connectedBadge, { backgroundColor: colors.primary + '18', borderColor: colors.primary }]}>
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                <Text style={[styles.connectedText, { color: colors.primary }]}>
                  {statusMessage || 'PC Conectado com Sucesso!'}
                </Text>
              </View>

              <Text style={[styles.connectedSubtext, { color: colors.textSecondary }]}>
                Escolha o que deseja fazer agora:
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
                  >
                    <Ionicons name="cloud-upload-outline" size={24} color="#fff" />
                    <View style={styles.actionBtnTextCol}>
                      <Text style={styles.actionBtnTitle}>Enviar do Celular ➔ PC</Text>
                      <Text style={styles.actionBtnDesc}>Sobe todas as músicas e setlists deste aparelho para o Web Editor</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Action 2 */}
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnSecondary, { borderColor: colors.border, backgroundColor: colors.card }]}
                    onPress={handlePullFromWeb}
                  >
                    <Ionicons name="cloud-download-outline" size={24} color={colors.primary} />
                    <View style={styles.actionBtnTextCol}>
                      <Text style={[styles.actionBtnTitle, { color: colors.text }]}>Baixar do PC ➔ Celular</Text>
                      <Text style={[styles.actionBtnDesc, { color: colors.textSecondary }]}>Puxa as músicas e setlists editados no PC para este celular</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Rescan Button */}
                  <TouchableOpacity
                    style={styles.rescanBtn}
                    onPress={() => { setConnectedSession(null); setScanned(false); }}
                  >
                    <Ionicons name="refresh" size={16} color={colors.textSecondary} />
                    <Text style={[styles.rescanBtnText, { color: colors.textSecondary }]}>Escanear outro QR Code</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <>
              {/* Tabs: Camera vs PIN */}
              <View style={[styles.tabRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.tabBtn, activeTab === 'camera' && [styles.activeTabBtn, { backgroundColor: colors.primary }]]}
                  onPress={() => setActiveTab('camera')}
                >
                  <Ionicons
                    name="camera-outline"
                    size={16}
                    color={activeTab === 'camera' ? '#fff' : colors.textSecondary}
                  />
                  <Text style={[styles.tabBtnText, { color: activeTab === 'camera' ? '#fff' : colors.textSecondary }]}>
                    Ler QR Code
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabBtn, activeTab === 'pin' && [styles.activeTabBtn, { backgroundColor: colors.primary }]]}
                  onPress={() => setActiveTab('pin')}
                >
                  <Ionicons
                    name="keypad-outline"
                    size={16}
                    color={activeTab === 'pin' ? '#fff' : colors.textSecondary}
                  />
                  <Text style={[styles.tabBtnText, { color: activeTab === 'pin' ? '#fff' : colors.textSecondary }]}>
                    Digitar Código PIN
                  </Text>
                </TouchableOpacity>
              </View>

              {/* TAB 1: CAMERA SCANNER */}
              {activeTab === 'camera' ? (
                <View style={styles.scannerWrapper}>
                  {!permission?.granted ? (
                    <View style={styles.permissionBox}>
                      <Ionicons name="camera-off-outline" size={44} color={colors.textSecondary} />
                      <Text style={[styles.permissionText, { color: colors.text }]}>
                        Permissão de Câmera Necessária
                      </Text>
                      <Text style={[styles.permissionSub, { color: colors.textSecondary }]}>
                        Para escanear o QR Code exibido no monitor do seu computador, precisamos de acesso à câmera.
                      </Text>
                      <TouchableOpacity
                        style={[styles.permissionBtn, { backgroundColor: colors.primary }]}
                        onPress={requestPermission}
                      >
                        <Text style={styles.permissionBtnText}>Permitir Acesso à Câmera</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.cameraBox}>
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
                      <View style={styles.reticleContainer}>
                        <View style={[styles.reticle, { borderColor: colors.primary }]}>
                          <View style={[styles.corner, styles.tl, { borderColor: colors.primary }]} />
                          <View style={[styles.corner, styles.tr, { borderColor: colors.primary }]} />
                          <View style={[styles.corner, styles.bl, { borderColor: colors.primary }]} />
                          <View style={[styles.corner, styles.br, { borderColor: colors.primary }]} />
                        </View>
                      </View>

                      {/* Torch button */}
                      <TouchableOpacity
                        style={[styles.torchBtn, torch && { backgroundColor: colors.primary }]}
                        onPress={() => setTorch(!torch)}
                      >
                        <Ionicons name={torch ? 'flashlight' : 'flashlight-outline'} size={20} color="#fff" />
                      </TouchableOpacity>

                      <Text style={styles.scanInstruction}>
                        Aponte para o QR Code na tela do seu computador
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                /* TAB 2: PIN INPUT */
                <View style={styles.pinWrapper}>
                  <Ionicons name="desktop-outline" size={48} color={colors.primary} style={{ marginBottom: 12 }} />
                  <Text style={[styles.pinTitle, { color: colors.text }]}>
                    Digite o PIN de 6 Dígitos
                  </Text>
                  <Text style={[styles.pinDesc, { color: colors.textSecondary }]}>
                    Exibido no modal de Sincronização do Web Editor no seu PC:
                  </Text>

                  <TextInput
                    style={[styles.pinInput, { color: colors.text, borderColor: colors.primary, backgroundColor: colors.card }]}
                    placeholder="Ex: 849201"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={pinInput}
                    onChangeText={setPinInput}
                  />

                  <TouchableOpacity
                    style={[styles.connectPinBtn, { backgroundColor: colors.primary }]}
                    onPress={handleConnectByPin}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="link-outline" size={18} color="#fff" />
                        <Text style={styles.connectPinBtnText}>Conectar Sessão</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
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
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  tabRow: {
    flexDirection: 'row',
    margin: 16,
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
  },
  activeTabBtn: {},
  tabBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  scannerWrapper: {
    height: 320,
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  cameraBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reticleContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reticle: {
    width: SCANNER_SIZE * 0.85,
    height: SCANNER_SIZE * 0.85,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 22,
    height: 22,
  },
  tl: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 10 },
  tr: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 10 },
  bl: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 10 },
  br: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 10 },
  torchBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 8,
    borderRadius: 20,
  },
  scanInstruction: {
    position: 'absolute',
    bottom: 16,
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  permissionBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 12,
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
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  permissionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  pinWrapper: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 10,
  },
  pinTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  pinDesc: {
    fontSize: 12.5,
    textAlign: 'center',
    marginBottom: 16,
  },
  pinInput: {
    width: '80%',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 6,
    marginBottom: 18,
  },
  connectPinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '80%',
  },
  connectPinBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  connectedContainer: {
    padding: 20,
    alignItems: 'center',
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  connectedText: {
    fontSize: 13,
    fontWeight: '800',
  },
  connectedSubtext: {
    fontSize: 13,
    marginBottom: 18,
  },
  actionsBox: {
    width: '100%',
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    gap: 14,
  },
  actionBtnSecondary: {
    borderWidth: 1.5,
  },
  actionBtnTextCol: {
    flex: 1,
  },
  actionBtnTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 2,
  },
  actionBtnDesc: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 14,
  },
  rescanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginTop: 4,
  },
  rescanBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingBox: {
    padding: 30,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13.5,
    fontWeight: '700',
    textAlign: 'center',
  },
});