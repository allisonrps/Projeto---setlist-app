import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';

const bgRock = require('../assets/bg_rock.jpg');
const bgPop = require('../assets/bg_pop.jpg');
const bgAcoustic = require('../assets/bg_acoustic.jpg');
const bgJazz = require('../assets/bg_jazz.jpg');
const bgElectronic = require('../assets/bg_electronic.jpg');
const bgReggae = require('../assets/bg_reggae.jpg');
const bgGospel = require('../assets/bg_gospel.jpg');
const bgNotes = require('../assets/bg_notes.jpg');
const bgClassic = require('../assets/bg_classic.jpg');

const LAYOUT_TEMPLATES = [
  { id: 1, name: 'Rock & Metal', icon: 'skull' },
  { id: 2, name: 'Folk Acústico', icon: 'leaf' },
  { id: 3, name: 'Pop Synthwave', icon: 'flash' },
  { id: 4, name: 'Jazz & Blues', icon: 'musical-notes' },
  { id: 5, name: 'Eletrônica EDM', icon: 'headset' },
  { id: 6, name: 'Reggae Roots', icon: 'sunny' },
  { id: 7, name: 'Gospel & Worship', icon: 'flame' },
  { id: 8, name: 'Música Genérica (Notas)', icon: 'disc' },
  { id: 9, name: 'Clássico & Orquestra', icon: 'sparkles' }
];

/**
 * Modal de compartilhamento de agenda para Bandas e Músicos.
 *
 * Props:
 * - visible: boolean
 * - onClose: () => void
 * - events: [{ id, name, date, time, local, day, month, weekDay, band, logo }]
 * - initialSelectedIds?: array de ids pré-selecionados (padrão: todos)
 * - displayName: nome exibido no subtítulo da arte ("Próximos Shows • nome")
 * - headerLogo?: uri da imagem / logo no topo da arte
 * - qrValue: link codificado no QR Code
 */
export default function ShareAgendaModal({
  visible,
  onClose,
  events = [],
  initialSelectedIds,
  displayName = '',
  headerLogo = null,
  qrValue = 'https://setlistbandmanager.com'
}) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const isDark = colors.isDark;
  const viewShotRef = useRef();

  const [selectedLayout, setSelectedLayout] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [customBgUri, setCustomBgUri] = useState(null);

  // Carrega a arte personalizada salva (mesma chave usada no perfil)
  useEffect(() => {
    AsyncStorage.getItem('agenda_custom_bg')
      .then(uri => { if (uri) setCustomBgUri(uri); })
      .catch(() => {});
  }, []);

  // Ao abrir, pré-seleciona os eventos
  useEffect(() => {
    if (visible) {
      const allIds = events.map(e => e.id);
      const initial = Array.isArray(initialSelectedIds) && initialSelectedIds.length > 0
        ? initialSelectedIds.filter(id => allIds.includes(id))
        : allIds;
      setSelectedIds(initial.length > 0 ? initial : allIds);
    }
  }, [visible]);

  const getBgImage = (id) => {
    if (id === 'custom') {
      if (customBgUri) return { uri: customBgUri };
      return bgRock;
    }
    switch (id) {
      case 1: return bgRock;
      case 2: return bgAcoustic;
      case 3: return bgPop;
      case 4: return bgJazz;
      case 5: return bgElectronic;
      case 6: return bgReggae;
      case 7: return bgGospel;
      case 8: return bgNotes;
      case 9: return bgClassic;
      default: return bgRock;
    }
  };

  const toggleSelectEvent = (id) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length === 1) {
        Alert.alert(t('attention') || 'Aviso', t('selectAtLeastOneShow') || 'Selecione ao menos um show para a arte.');
        return;
      }
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const toggleSelectAll = () => {
    const allIds = events.map(e => e.id);
    if (selectedIds.length === allIds.length) {
      setSelectedIds(allIds.slice(0, 1));
    } else {
      setSelectedIds(allIds);
    }
  };

  const pickCustomBgImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.85,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const uri = result.assets[0].uri;
        setCustomBgUri(uri);
        setSelectedLayout('custom');
        await AsyncStorage.setItem('agenda_custom_bg', uri);
      }
    } catch (err) {
      console.log('Error picking custom bg image:', err);
    }
  };

  const captureAndShare = async () => {
    try {
      setTimeout(async () => {
        try {
          const uri = await viewShotRef.current.capture();
          await Sharing.shareAsync(uri, { dialogTitle: t('shareAgenda') || 'Compartilhar Agenda' });
          onClose && onClose();
        } catch (e) {
          Alert.alert(t('attention') || 'Erro', 'Falha ao gerar imagem.');
        }
      }, 500);
    } catch (error) {
      Alert.alert(t('attention') || 'Erro', 'Falha ao gerar imagem.');
    }
  };

  const selectedEvents = events.filter(e => selectedIds.length === 0 || selectedIds.includes(e.id));

  // Logo da arte: se headerLogo não fornecido, usa logo do primeiro evento
  const artLogo = headerLogo || (selectedEvents[0] && selectedEvents[0].logo);

  // Helper para extrair partes da data (dia, mês, dia da semana, horário)
  const getEventDateDetails = (event) => {
    let day = event.day || '';
    let month = event.month || '';
    let weekDay = event.weekDay || '';
    let time = event.time || '';

    if (day && month) {
      return { day, month, weekDay, time };
    }

    let rawDate = event.date || '';
    if (rawDate.includes('•')) {
      const parts = rawDate.split('•');
      rawDate = parts[0].trim();
      if (!time && parts[1]) {
        time = parts[1].trim();
      }
    }

    const matchNamed = rawDate.match(/(?:([A-Za-zÀ-ÿ]+),?\s+)?(\d{1,2})\s+([A-Za-zÀ-ÿ]+)/);
    if (matchNamed) {
      weekDay = weekDay || matchNamed[1] || '';
      day = matchNamed[2];
      month = matchNamed[3].toUpperCase();
    } else if (rawDate.includes('-')) {
      const parts = rawDate.split('-');
      if (parts.length === 3) {
        day = String(parseInt(parts[2], 10));
        month = parts[1];
      }
    } else if (rawDate.includes('/')) {
      const parts = rawDate.split('/');
      if (parts.length >= 2) {
        day = String(parseInt(parts[0], 10));
        month = parts[1];
      }
    } else {
      day = rawDate;
    }

    return { day, month, weekDay, time };
  };

  return (
    <>
      {/* ── OFF-SCREEN VIEWSHOT ── */}
      {visible && (
        <View style={{ position: 'absolute', top: -5000, left: -5000 }} pointerEvents="none">
          <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 1.0 }}>
            <ImageBackground source={getBgImage(selectedLayout)} style={{ width: 1080, height: 1920 }}>
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.52)', padding: 75, justifyContent: 'space-between' }}>
                <View>
                  {/* TOP ROW: Logo da banda do lado esquerdo no topo da arte */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 55, marginTop: 10 }}>
                    {artLogo ? (
                      <Image
                        source={{ uri: artLogo }}
                        style={{
                          width: 145,
                          height: 145,
                          borderRadius: 72.5,
                          marginRight: 28,
                          borderWidth: 4,
                          borderColor: colors.primary || '#eab308',
                          backgroundColor: 'rgba(0,0,0,0.4)'
                        }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 145,
                          height: 145,
                          borderRadius: 72.5,
                          marginRight: 28,
                          borderWidth: 4,
                          borderColor: colors.primary || '#eab308',
                          backgroundColor: colors.primary || '#eab308',
                          justifyContent: 'center',
                          alignItems: 'center'
                        }}
                      >
                        <Text style={{ fontSize: 54, fontWeight: '900', color: '#ffffff' }}>
                          {(displayName || 'BD').substring(0, 2).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      {/* Linha 1: AGENDA */}
                      <Text style={{ fontSize: 82, fontWeight: '900', color: '#ffffff', textTransform: 'uppercase', letterSpacing: 2, lineHeight: 90 }}>
                        {t('agendaFlyerTitle') || 'AGENDA'}
                      </Text>
                      {/* Linha debaixo da agenda: Próximos Shows */}
                      <Text style={{ fontSize: 34, fontWeight: '700', color: colors.primary || '#eab308', marginTop: 4 }}>
                        {t('upcomingShows') || 'Próximos Shows'}{displayName ? ` • ${displayName}` : ''}
                      </Text>
                    </View>
                  </View>

                  {/* CARDS DE EVENTOS */}
                  {selectedEvents.map(event => {
                    const { day, month, weekDay, time } = getEventDateDetails(event);
                    const eventTitle = event.name || event.local || event.band || 'Show';
                    const eventLocal = event.local || (event.band && event.name ? event.band : '');

                    return (
                      <View
                        key={event.id}
                        style={{
                          marginBottom: 34,
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: 'rgba(0,0,0,0.68)',
                          paddingVertical: 24,
                          paddingHorizontal: 26,
                          borderRadius: 22,
                          borderWidth: 1.5,
                          borderColor: 'rgba(255,255,255,0.12)'
                        }}
                      >
                        {/* Data do lado esquerdo do card */}
                        <View
                          style={{
                            minWidth: 145,
                            paddingVertical: 12,
                            paddingHorizontal: 14,
                            borderRadius: 16,
                            backgroundColor: 'rgba(255,255,255,0.08)',
                            borderWidth: 2,
                            borderColor: colors.primary || '#eab308',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 26,
                          }}
                        >
                          {weekDay ? (
                            <Text style={{ fontSize: 18, fontWeight: '800', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: 2 }}>
                              {weekDay}
                            </Text>
                          ) : null}
                          <Text style={{ fontSize: 48, fontWeight: '900', color: '#ffffff', lineHeight: 52 }}>
                            {day}
                          </Text>
                          {month ? (
                            <Text style={{ fontSize: 22, fontWeight: '900', color: colors.primary || '#eab308', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 2 }}>
                              {month}
                            </Text>
                          ) : null}
                        </View>

                        {/* Informações do evento à direita da data */}
                        <View style={{ flex: 1, justifyContent: 'center' }}>
                          {/* Primeira linha: Nome do Evento */}
                          <Text
                            style={{
                              fontSize: 38,
                              fontWeight: '900',
                              color: '#ffffff',
                              marginBottom: 8,
                              lineHeight: 46
                            }}
                            numberOfLines={2}
                          >
                            {eventTitle}
                          </Text>

                          {/* Segunda linha: Local e horário */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                            {eventLocal ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: time ? 22 : 0 }}>
                                <Ionicons name="location-sharp" size={28} color="rgba(255,255,255,0.85)" style={{ marginRight: 8 }} />
                                <Text style={{ fontSize: 30, color: 'rgba(255,255,255,0.85)', fontWeight: '600' }} numberOfLines={1}>
                                  {eventLocal}
                                </Text>
                              </View>
                            ) : null}

                            {time ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="time" size={28} color={colors.primary || '#eab308'} style={{ marginRight: 8 }} />
                                <Text style={{ fontSize: 30, color: colors.primary || '#eab308', fontWeight: '800' }}>
                                  {time}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* BOTTOM BANNER: QR CODE & DIVULGAÇÃO DO APP */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'rgba(10, 15, 26, 0.82)',
                  padding: 38,
                  borderRadius: 28,
                  borderWidth: 1.5,
                  borderColor: 'rgba(255,255,255,0.22)'
                }}>
                  <View style={{ flex: 1, marginRight: 28 }}>
                    <View style={{ backgroundColor: colors.primary || '#eab308', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 12 }}>
                      <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff', textTransform: 'uppercase', letterSpacing: 1 }}>
                        {t('knowTheApp') || 'Conheça o App'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 34, fontWeight: 'bold', color: '#fff', lineHeight: 44 }}>
                      {t('scanToLearnMore') || 'Aponte a câmera para ver repertórios, agenda completa e novidades!'}
                    </Text>
                    <Text style={{ fontSize: 25, color: 'rgba(255,255,255,0.75)', marginTop: 8, fontWeight: '600' }}>
                      {t('appSlogan') || 'Setlist Band Manager • A rede dos músicos'}
                    </Text>
                  </View>
                  <View style={{
                    backgroundColor: '#fff',
                    padding: 16,
                    borderRadius: 20,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <QRCode value={qrValue} size={150} />
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0b0f19', marginTop: 8, textTransform: 'uppercase' }}>
                      {t('scanQr') || 'Escanear'}
                    </Text>
                  </View>
                </View>
              </View>
            </ImageBackground>
          </ViewShot>
        </View>
      )}

      {/* ── SHARE MODAL (BOTTOM SHEET - ESCOLHER SHOWS E ESTILO/ARTE) ── */}
      <Modal visible={!!visible} transparent animationType='slide' onRequestClose={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={onClose} />
          <View style={[styles.bottomSheetContent, { backgroundColor: colors.cardBackground, borderColor: colors.border, maxHeight: '90%' }]}>
            <View style={[styles.dragHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('shareAgenda') || 'Compartilhar Agenda'}</Text>
              <Pressable onPress={onClose} hitSlop={10}>
                <Ionicons name='close' size={24} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* 1. SELEÇÃO DE SHOWS */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginTop: 4 }}>
                <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700' }}>
                  {(t('includedShows') || 'SHOWS INCLUÍDOS')} ({selectedIds.length}/{events.length})
                </Text>
                <Pressable onPress={toggleSelectAll} hitSlop={8}>
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>
                    {selectedIds.length === events.length ? (t('deselectAllShows') || 'Desmarcar Todos') : (t('selectAllShows') || 'Selecionar Todos')}
                  </Text>
                </Pressable>
              </View>

              <View style={{ gap: 6, marginBottom: 18 }}>
                {events.map(event => {
                  const isSelected = selectedIds.includes(event.id);
                  const displayEventName = event.name || event.local || event.band || 'Show';
                  return (
                    <Pressable
                      key={event.id}
                      onPress={() => toggleSelectEvent(event.id)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 10,
                        borderRadius: 10,
                        backgroundColor: isSelected ? colors.primary + '18' : (isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc'),
                        borderWidth: 1.5,
                        borderColor: isSelected ? colors.primary : colors.border
                      }}
                    >
                      <View style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        borderWidth: 1.5,
                        borderColor: isSelected ? colors.primary : colors.textMuted,
                        backgroundColor: isSelected ? colors.primary : 'transparent',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 10
                      }}>
                        {isSelected && <Ionicons name="checkmark" size={15} color="#fff" />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>{displayEventName}</Text>
                        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                          {event.date}{event.time ? ` • ${event.time}` : ''}{event.local && event.local !== displayEventName ? ` • ${event.local}` : ''}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {/* 2. ESTILO DA ARTE */}
              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 8 }}>
                {t('artStyleBackground') || 'ESTILO DA ARTE / FUNDO'}
              </Text>

              {/* Arte Personalizada */}
              <Pressable
                style={[
                  styles.layoutOption,
                  {
                    backgroundColor: selectedLayout === 'custom' ? colors.primary + '22' : (isDark ? '#1e293b' : '#f3f4f6'),
                    borderColor: selectedLayout === 'custom' ? colors.primary : colors.border,
                    marginBottom: 8
                  }
                ]}
                onPress={() => {
                  if (!customBgUri) {
                    pickCustomBgImage();
                  } else {
                    setSelectedLayout('custom');
                  }
                }}
              >
                {customBgUri ? (
                  <Image source={{ uri: customBgUri }} style={{ width: 34, height: 42, borderRadius: 6, marginRight: 4 }} />
                ) : (
                  <Ionicons name="image-outline" size={22} color={selectedLayout === 'custom' ? colors.primary : colors.textMuted} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.layoutName, { color: selectedLayout === 'custom' ? colors.primary : colors.text }]}>
                    {t('customArtTitle') || 'Arte Personalizada (Foto da Galeria)'}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                    {customBgUri ? (t('customArtSaved') || 'Imagem salva da galeria') : (t('customArtPrompt') || 'Toque para escolher uma imagem')}
                  </Text>
                </View>

                {customBgUri && (
                  <Pressable onPress={pickCustomBgImage} hitSlop={8} style={{ padding: 6 }}>
                    <Ionicons name="camera-reverse-outline" size={20} color={colors.primary} />
                  </Pressable>
                )}

                {selectedLayout === 'custom' && (
                  <Ionicons name='checkmark-circle' size={20} color={colors.primary} />
                )}
              </Pressable>

              {/* Templates Pré-definidos */}
              {LAYOUT_TEMPLATES.map(item => (
                <Pressable
                  key={item.id}
                  style={[styles.layoutOption, { backgroundColor: selectedLayout === item.id ? colors.primary + '22' : (isDark ? '#1e293b' : '#f3f4f6'), borderColor: selectedLayout === item.id ? colors.primary : colors.border }]}
                  onPress={() => setSelectedLayout(item.id)}
                >
                  <Ionicons name={item.icon} size={22} color={selectedLayout === item.id ? colors.primary : colors.textMuted} />
                  <Text style={[styles.layoutName, { color: selectedLayout === item.id ? colors.primary : colors.text }]}>{item.name}</Text>
                  {selectedLayout === item.id && <Ionicons name='checkmark-circle' size={20} color={colors.primary} style={{ marginLeft: 'auto' }} />}
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={[styles.syncButton, { backgroundColor: colors.primary, marginTop: 14 }]} onPress={captureAndShare}>
              <Ionicons name='share-outline' size={18} color='#fff' />
              <Text style={styles.syncButtonText}>{(t('generateAndShare') || 'Gerar e Compartilhar')} ({selectedIds.length})</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  bottomSheetContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 36, borderWidth: 1, borderBottomWidth: 0, maxHeight: '88%' },
  dragHandle: { width: 44, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  layoutOption: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8, gap: 12 },
  layoutName: { fontSize: 15, fontWeight: '600' },
  syncButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 8 },
  syncButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
});

// Estilo do botão-pílula "Compartilhar Agenda" (idêntico ao do perfil), exportado para reutilização
export const shareAgendaPillStyles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 8,
    marginBottom: 10,
    alignSelf: 'stretch',
  },
  text: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
