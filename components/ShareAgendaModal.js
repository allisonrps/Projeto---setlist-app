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
const bandlinkLogoWide = require('../assets/bandlink_logo_transparent_wide.png');

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.setlistbandmanager.com';
const MAX_FLYER_EVENTS = 6;

const LAYOUT_TEMPLATES = [
  { id: 1, name: 'Rock & Metal', icon: 'skull' },
  { id: 2, name: 'Folk Acústico', icon: 'leaf' },
  { id: 3, name: 'Pop Synthwave', icon: 'flash' },
  { id: 4, name: 'Jazz & Blues', icon: 'musical-notes' },
  { id: 5, name: 'Eletrônica EDM', icon: 'headset' },
  { id: 6, name: 'Reggae Roots', icon: 'sunny' },
  { id: 7, name: 'Gospel & Worship', icon: 'flame' },
  { id: 8, name: 'Música Genérica (Notas)', icon: 'disc' },
  { id: 9, name: 'Clássico & Orquestra', icon: 'sparkles' },
];

const WEEKDAYS_MAP = {
  pt: ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'],
  en: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
  es: ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'],
};

const MONTHS_MAP = {
  pt: ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'],
  en: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
  es: ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'],
};

const MONTH_NAME_TO_INDEX = {
  jan: 0, janeiro: 0, january: 0, enero: 0, '01': 0, '1': 0,
  fev: 1, fevereiro: 1, feb: 1, february: 1, febrero: 1, '02': 1, '2': 1,
  mar: 2, marco: 2, março: 2, march: 2, marzo: 2, '03': 2, '3': 2,
  abr: 3, abril: 3, apr: 3, april: 3, '04': 3, '4': 3,
  mai: 4, maio: 4, may: 4, mayo: 4, '05': 4, '5': 4,
  jun: 5, junho: 5, june: 5, junio: 5, '06': 5, '6': 5,
  jul: 6, julho: 6, july: 6, julio: 6, '07': 6, '7': 6,
  ago: 7, agosto: 7, aug: 7, august: 7, '08': 7, '8': 7,
  set: 8, setembro: 8, sep: 8, sept: 8, september: 8, setiembre: 8, septiembre: 8, '09': 8, '9': 8,
  out: 9, outubro: 9, oct: 9, october: 9, octubre: 9, '10': 9,
  nov: 10, novembro: 10, november: 10, noviembre: 10, '11': 10,
  dez: 11, dezembro: 11, dec: 11, december: 11, diciembre: 11, '12': 11,
};

const WEEKDAY_TO_INDEX = {
  dom: 0, domingo: 0, sun: 0, sunday: 0,
  seg: 1, segunda: 1, 'segunda-feira': 1, mon: 1, monday: 1, lun: 1, lunes: 1,
  ter: 2, terca: 2, terça: 2, 'terça-feira': 2, tue: 2, tuesday: 2, mar: 2, martes: 2,
  qua: 3, quarta: 3, 'quarta-feira': 3, wed: 3, wednesday: 3, mie: 3, mié: 3, miercoles: 3, miércoles: 3,
  qui: 4, quinta: 4, 'quinta-feira': 4, thu: 4, thursday: 4, jue: 4, jueves: 4,
  sex: 5, sexta: 5, 'sexta-feira': 5, fri: 5, friday: 5, vie: 5, viernes: 5,
  sab: 6, sáb: 6, sabado: 6, sábado: 6, sat: 6, saturday: 6,
};

const getAppSummary = (lang) => {
  if (lang === 'en') {
    return 'Create your musician profile, post band & audition ads, and manage setlists & chords with auto-scroll and offline sync.';
  }
  if (lang === 'es') {
    return 'Crea tu perfil en la comunidad, publica anuncios de bandas y audiciones, y gestiona setlists y acordes con desplazamiento y sincronización offline.';
  }
  return 'Crie seu perfil na comunidade, faça anúncios de bandas e gerencie setlists e cifras com rolagem e sincronização offline.';
};

const getAppFooterSlogan = (lang) => {
  if (lang === 'en') return 'Band Link • Available on Google Play Store';
  if (lang === 'es') return 'Band Link • Disponible en Google Play Store';
  return 'Band Link • Disponível na Google Play Store';
};

const getScanQrText = (lang) => {
  if (lang === 'en') return 'SCAN ME';
  return 'ESCANEAR';
};

const getDefaultEventTitle = (lang) => {
  if (lang === 'en') return 'Live Show';
  if (lang === 'es') return 'Concierto';
  return 'Show';
};

/**
 * Modal de compartilhamento de agenda para Bandas e Músicos (Flyer Band Link).
 */
export default function ShareAgendaModal({
  visible,
  onClose,
  events = [],
  initialSelectedIds,
  displayName = '',
  headerLogo = null,
  qrValue = PLAY_STORE_URL,
}) {
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const isDark = colors.isDark;
  const viewShotRef = useRef();

  const [selectedLayout, setSelectedLayout] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [customBgUri, setCustomBgUri] = useState(null);
  const [isSharing, setIsSharing] = useState(false);

  const activeLang = ['pt', 'en', 'es'].includes(language) ? language : 'pt';

  // Carrega a arte personalizada salva
  useEffect(() => {
    AsyncStorage.getItem('agenda_custom_bg')
      .then(uri => { if (uri) setCustomBgUri(uri); })
      .catch(() => {});
  }, []);

  // Ao abrir, pré-seleciona os eventos respeitando o limite máximo de 6
  useEffect(() => {
    if (visible) {
      const allIds = (events || []).map(e => e.id);
      const initial = Array.isArray(initialSelectedIds) && initialSelectedIds.length > 0
        ? initialSelectedIds.filter(id => allIds.includes(id))
        : allIds;
      const limited = (initial.length > 0 ? initial : allIds).slice(0, MAX_FLYER_EVENTS);
      setSelectedIds(limited);
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
      if (selectedIds.length >= MAX_FLYER_EVENTS) {
        Alert.alert(
          t('attention') || 'Aviso',
          t('maxSixEventsFlyer') || `Você pode selecionar no máximo ${MAX_FLYER_EVENTS} eventos para o flyer.`
        );
        return;
      }
      setSelectedIds([...selectedIds, id]);
    }
  };

  const toggleSelectAll = () => {
    const allIds = (events || []).map(e => e.id);
    const maxSelectable = Math.min(MAX_FLYER_EVENTS, allIds.length);
    if (selectedIds.length >= maxSelectable) {
      setSelectedIds(allIds.slice(0, 1));
    } else {
      setSelectedIds(allIds.slice(0, MAX_FLYER_EVENTS));
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
    if (isSharing) return;
    setIsSharing(true);
    try {
      // Breve pausa para garantir renderização de fontes e layout nativo
      await new Promise(resolve => setTimeout(resolve, 350));

      if (!viewShotRef.current || typeof viewShotRef.current.capture !== 'function') {
        throw new Error('ViewShot capture method not available');
      }

      const uri = await viewShotRef.current.capture();
      if (!uri) {
        throw new Error('Capture returned empty URI');
      }

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(t('attention') || 'Aviso', t('shareNotAvailable') || 'Compartilhamento não disponível neste aparelho.');
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'image/jpeg',
        dialogTitle: t('shareAgenda') || 'Compartilhar Agenda',
        UTI: 'public.jpeg',
      });

      onClose && onClose();
    } catch (error) {
      const msg = String(error?.message || '');
      // Ignora quando o usuário apenas fecha ou cancela a folha nativa de compartilhamento
      if (msg.toLowerCase().includes('cancel') || msg.toLowerCase().includes('dismiss')) {
        return;
      }
      console.log('Error in captureAndShare:', error);
      Alert.alert(t('attention') || 'Erro', t('failedToGenerateImageMsg') || 'Falha ao gerar imagem.');
    } finally {
      setIsSharing(false);
    }
  };

  const selectedEvents = events
    .filter(e => selectedIds.includes(e.id))
    .slice(0, MAX_FLYER_EVENTS);

  // Logo da arte: se headerLogo não fornecido, usa logo do primeiro evento
  const artLogo = headerLogo || (selectedEvents[0] && selectedEvents[0].logo);

  // Helper para extrair e traduzir partes da data (dia, mês, dia da semana, horário)
  const getEventDateDetails = (event) => {
    let day = event.day ? String(event.day).trim() : '';
    let month = event.month ? String(event.month).trim() : '';
    let weekDay = event.weekDay ? String(event.weekDay).trim() : '';
    let time = event.time ? String(event.time).trim() : '';

    let rawDate = (event.date ? String(event.date) : '').trim();
    if (rawDate.includes('•')) {
      const parts = rawDate.split('•');
      rawDate = parts[0].trim();
      if (!time && parts[1]) {
        time = parts[1].trim();
      }
    }

    let parsedMonthIndex = null;
    let parsedWeekdayIndex = null;

    if (month) {
      const cleanM = month.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (MONTH_NAME_TO_INDEX[cleanM] !== undefined) {
        parsedMonthIndex = MONTH_NAME_TO_INDEX[cleanM];
      }
    }

    if (weekDay) {
      const cleanW = weekDay.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (WEEKDAY_TO_INDEX[cleanW] !== undefined) {
        parsedWeekdayIndex = WEEKDAY_TO_INDEX[cleanW];
      }
    }

    if ((!day || parsedMonthIndex === null) && rawDate) {
      if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
        const parts = rawDate.split('-');
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2].slice(0, 2), 10);
        day = String(d);
        parsedMonthIndex = m;
        const dt = new Date(y, m, d);
        if (!isNaN(dt.getTime())) {
          parsedWeekdayIndex = dt.getDay();
        }
      } else if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(rawDate)) {
        const parts = rawDate.split('/');
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2].slice(0, 4), 10);
        day = String(d);
        parsedMonthIndex = m;
        const dt = new Date(y, m, d);
        if (!isNaN(dt.getTime())) {
          parsedWeekdayIndex = dt.getDay();
        }
      } else {
        const match = rawDate.match(/(?:([A-Za-zÀ-ÿ]+),?\s+)?(\d{1,2})\s+([A-Za-zÀ-ÿ]+)/);
        if (match) {
          if (match[1] && parsedWeekdayIndex === null) {
            const cleanW = match[1].toLowerCase().replace(/[^a-z0-9]/g, '');
            if (WEEKDAY_TO_INDEX[cleanW] !== undefined) parsedWeekdayIndex = WEEKDAY_TO_INDEX[cleanW];
          }
          day = match[2];
          const cleanM = match[3].toLowerCase().replace(/[^a-z0-9]/g, '');
          if (MONTH_NAME_TO_INDEX[cleanM] !== undefined) {
            parsedMonthIndex = MONTH_NAME_TO_INDEX[cleanM];
          }
        } else if (!day) {
          day = rawDate;
        }
      }
    }

    if (parsedWeekdayIndex === null && (event._ts || event.timestamp)) {
      const dt = new Date(event._ts || event.timestamp);
      if (!isNaN(dt.getTime())) {
        parsedWeekdayIndex = dt.getDay();
        if (parsedMonthIndex === null) parsedMonthIndex = dt.getMonth();
        if (!day) day = String(dt.getDate());
      }
    }

    const translatedMonth = parsedMonthIndex !== null && parsedMonthIndex >= 0 && parsedMonthIndex < 12
      ? MONTHS_MAP[activeLang][parsedMonthIndex]
      : (month || '').toUpperCase();

    const translatedWeekDay = parsedWeekdayIndex !== null && parsedWeekdayIndex >= 0 && parsedWeekdayIndex < 7
      ? WEEKDAYS_MAP[activeLang][parsedWeekdayIndex]
      : (weekDay || '').toUpperCase();

    return {
      day: day || '',
      month: translatedMonth,
      weekDay: translatedWeekDay,
      time: time || '',
    };
  };

  // Escala dinâmica dos elementos para comportar com elegância de 1 até 6 eventos sem transbordar
  const eventCount = selectedEvents.length;
  const isCompact = eventCount >= 5;
  const isMedium = eventCount === 4;

  const headerLogoSize = isCompact ? 115 : (isMedium ? 130 : 145);
  const headerTitleFontSize = isCompact ? 68 : (isMedium ? 74 : 82);
  const headerTitleLineHeight = isCompact ? 72 : (isMedium ? 80 : 88);
  const headerSubtitleFontSize = isCompact ? 26 : (isMedium ? 30 : 34);
  const headerMarginBottom = isCompact ? 24 : (isMedium ? 36 : 48);

  const cardMarginBottom = isCompact ? 14 : (isMedium ? 20 : 28);
  const cardPaddingVertical = isCompact ? 12 : (isMedium ? 18 : 22);
  const cardPaddingHorizontal = isCompact ? 20 : (isMedium ? 24 : 26);
  const cardBorderRadius = isCompact ? 16 : (isMedium ? 18 : 22);

  const dateBadgeMinWidth = isCompact ? 115 : (isMedium ? 130 : 145);
  const dateBadgePaddingV = isCompact ? 8 : (isMedium ? 10 : 12);
  const dateBadgeMarginRight = isCompact ? 18 : (isMedium ? 22 : 26);
  const dateBadgeWeekDayFontSize = isCompact ? 14 : (isMedium ? 16 : 18);
  const dateBadgeDayFontSize = isCompact ? 38 : (isMedium ? 44 : 48);
  const dateBadgeDayLineHeight = isCompact ? 42 : (isMedium ? 48 : 52);
  const dateBadgeMonthFontSize = isCompact ? 17 : (isMedium ? 20 : 22);

  const eventTitleFontSize = isCompact ? 28 : (isMedium ? 33 : 38);
  const eventTitleLineHeight = isCompact ? 34 : (isMedium ? 40 : 46);
  const eventTitleMarginBottom = isCompact ? 4 : (isMedium ? 6 : 8);
  const eventInfoFontSize = isCompact ? 22 : (isMedium ? 26 : 30);
  const eventInfoIconSize = isCompact ? 22 : (isMedium ? 25 : 28);

  const footerPadding = isCompact ? 24 : (isMedium ? 30 : 36);
  const footerBorderRadius = isCompact ? 22 : (isMedium ? 24 : 28);
  const footerBadgeFontSize = isCompact ? 19 : 22;
  const footerSummaryFontSize = isCompact ? 23 : (isMedium ? 26 : 30);
  const footerSummaryLineHeight = isCompact ? 30 : (isMedium ? 34 : 38);
  const footerSloganFontSize = isCompact ? 18 : (isMedium ? 20 : 22);
  const footerQrSize = isCompact ? 125 : (isMedium ? 135 : 145);
  const footerScanFontSize = isCompact ? 14 : 16;

  return (
    <>
      {/* ── OFF-SCREEN VIEWSHOT (Dimensões nativas 1080x1920 com collapsable={false}) ── */}
      {visible && (
        <View
          style={{
            position: 'absolute',
            left: -9999,
            top: 0,
            width: 1080,
            height: 1920,
            opacity: 0.01,
          }}
          pointerEvents="none"
          collapsable={false}
        >
          <ViewShot
            ref={viewShotRef}
            collapsable={false}
            options={{
              format: 'jpg',
              quality: 0.95,
              result: 'tmpfile',
            }}
            style={{ width: 1080, height: 1920 }}
          >
            <ImageBackground
              source={getBgImage(selectedLayout)}
              style={{ width: 1080, height: 1920 }}
              collapsable={false}
            >
              <View
                collapsable={false}
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(0,0,0,0.58)',
                  paddingHorizontal: 70,
                  paddingVertical: isCompact ? 50 : 65,
                  justifyContent: 'space-between',
                }}
              >
                <View collapsable={false}>
                  {/* TOP ROW: Logo da banda do lado esquerdo no topo da arte */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: headerMarginBottom, marginTop: 10 }}>
                    {artLogo ? (
                      <Image
                        source={{ uri: artLogo }}
                        style={{
                          width: headerLogoSize,
                          height: headerLogoSize,
                          borderRadius: headerLogoSize / 2,
                          marginRight: 26,
                          borderWidth: 4,
                          borderColor: colors.primary || '#eab308',
                          backgroundColor: 'rgba(0,0,0,0.4)',
                        }}
                      />
                    ) : (
                      <View
                        style={{
                          width: headerLogoSize,
                          height: headerLogoSize,
                          borderRadius: headerLogoSize / 2,
                          marginRight: 26,
                          borderWidth: 4,
                          borderColor: colors.primary || '#eab308',
                          backgroundColor: colors.primary || '#eab308',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontSize: isCompact ? 46 : 54, fontWeight: '900', color: '#ffffff' }}>
                          {(displayName || 'BD').substring(0, 2).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      {/* Linha 1: AGENDA */}
                      <Text style={{ fontSize: headerTitleFontSize, fontWeight: '900', color: '#ffffff', textTransform: 'uppercase', letterSpacing: 3, lineHeight: headerTitleLineHeight }}>
                        {t('agendaFlyerTitle') || 'AGENDA'}
                      </Text>
                      {/* Linha 2: Próximos Shows • Nome */}
                      <Text style={{ fontSize: headerSubtitleFontSize, fontWeight: '700', color: colors.primary || '#eab308', marginTop: 4 }}>
                        {t('upcomingShows') || (activeLang === 'en' ? 'Upcoming Shows' : activeLang === 'es' ? 'Próximos Conciertos' : 'Próximos Shows')}
                        {displayName ? ` • ${displayName}` : ''}
                      </Text>
                    </View>
                  </View>

                  {/* CARDS DE EVENTOS (ATÉ 6 EVENTOS COM ESCALA ADAPTATIVA) */}
                  {selectedEvents.map(event => {
                    const { day, month, weekDay, time } = getEventDateDetails(event);
                    const eventTitle = (event.name || event.local || event.band || getDefaultEventTitle(activeLang)).trim();
                    const eventLocal = event.local || (event.band && event.name ? event.band : '');

                    return (
                      <View
                        key={event.id}
                        collapsable={false}
                        style={{
                          marginBottom: cardMarginBottom,
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: 'rgba(0,0,0,0.70)',
                          paddingVertical: cardPaddingVertical,
                          paddingHorizontal: cardPaddingHorizontal,
                          borderRadius: cardBorderRadius,
                          borderWidth: 1.5,
                          borderColor: 'rgba(255,255,255,0.14)',
                        }}
                      >
                        {/* Data do lado esquerdo do card */}
                        <View
                          style={{
                            minWidth: dateBadgeMinWidth,
                            paddingVertical: dateBadgePaddingV,
                            paddingHorizontal: 12,
                            borderRadius: isCompact ? 12 : 16,
                            backgroundColor: 'rgba(255,255,255,0.08)',
                            borderWidth: 2,
                            borderColor: colors.primary || '#eab308',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: dateBadgeMarginRight,
                          }}
                        >
                          {weekDay ? (
                            <Text style={{ fontSize: dateBadgeWeekDayFontSize, fontWeight: '800', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: 2 }}>
                              {weekDay}
                            </Text>
                          ) : null}
                          <Text style={{ fontSize: dateBadgeDayFontSize, fontWeight: '900', color: '#ffffff', lineHeight: dateBadgeDayLineHeight }}>
                            {day}
                          </Text>
                          {month ? (
                            <Text style={{ fontSize: dateBadgeMonthFontSize, fontWeight: '900', color: colors.primary || '#eab308', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 2 }}>
                              {month}
                            </Text>
                          ) : null}
                        </View>

                        {/* Informações do evento à direita da data */}
                        <View style={{ flex: 1, justifyContent: 'center' }}>
                          <Text
                            style={{
                              fontSize: eventTitleFontSize,
                              fontWeight: '900',
                              color: '#ffffff',
                              marginBottom: eventTitleMarginBottom,
                              lineHeight: eventTitleLineHeight,
                            }}
                            numberOfLines={isCompact ? 1 : 2}
                          >
                            {eventTitle}
                          </Text>

                          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                            {eventLocal ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: time ? 20 : 0 }}>
                                <Ionicons name="location-sharp" size={eventInfoIconSize} color="rgba(255,255,255,0.85)" style={{ marginRight: 6 }} />
                                <Text style={{ fontSize: eventInfoFontSize, color: 'rgba(255,255,255,0.85)', fontWeight: '600' }} numberOfLines={1}>
                                  {eventLocal}
                                </Text>
                              </View>
                            ) : null}

                            {time ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="time" size={eventInfoIconSize} color={colors.primary || '#eab308'} style={{ marginRight: 6 }} />
                                <Text style={{ fontSize: eventInfoFontSize, color: colors.primary || '#eab308', fontWeight: '800' }}>
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

                {/* BOTTOM BANNER: BAND LINK, RESUMO DO APP TRADUZIDO & QR CODE PLAY STORE */}
                <View
                  collapsable={false}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'rgba(10, 15, 26, 0.88)',
                    padding: footerPadding,
                    borderRadius: footerBorderRadius,
                    borderWidth: 1.5,
                    borderColor: 'rgba(255,255,255,0.22)',
                  }}
                >
                  <View style={{ flex: 1, marginRight: 24 }}>
                    {/* Logo Oficial Band Link no Rodapé */}
                    <Image
                      source={bandlinkLogoWide}
                      style={{
                        width: isCompact ? 240 : 280,
                        height: isCompact ? 64 : 76,
                        resizeMode: 'contain',
                        marginBottom: 10,
                        alignSelf: 'flex-start',
                      }}
                    />
                    <Text style={{ fontSize: footerSummaryFontSize, fontWeight: 'bold', color: '#fff', lineHeight: footerSummaryLineHeight }}>
                      {getAppSummary(activeLang)}
                    </Text>
                    <Text style={{ fontSize: footerSloganFontSize, color: 'rgba(255,255,255,0.75)', marginTop: 8, fontWeight: '600' }}>
                      {getAppFooterSlogan(activeLang)}
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: '#fff',
                      padding: isCompact ? 14 : 16,
                      borderRadius: 20,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <QRCode value={PLAY_STORE_URL} size={footerQrSize} />
                    <Text style={{ fontSize: footerScanFontSize, fontWeight: '900', color: '#0b0f19', marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      {getScanQrText(activeLang)}
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
              {/* 1. SELEÇÃO DE SHOWS (ATÉ 6) */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginTop: 4 }}>
                <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700' }}>
                  {(t('includedShows') || 'SHOWS INCLUÍDOS')} ({selectedIds.length}/{Math.min(MAX_FLYER_EVENTS, events.length)})
                </Text>
                <Pressable onPress={toggleSelectAll} hitSlop={8}>
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>
                    {selectedIds.length >= Math.min(MAX_FLYER_EVENTS, events.length)
                      ? (t('deselectAllShows') || 'Desmarcar Todos')
                      : (t('selectAllShows') || 'Selecionar Todos')}
                  </Text>
                </Pressable>
              </View>

              <View style={{ gap: 6, marginBottom: 18 }}>
                {events.map(event => {
                  const isSelected = selectedIds.includes(event.id);
                  const displayEventName = (event.name || event.local || event.band || getDefaultEventTitle(activeLang)).trim();
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
                        borderColor: isSelected ? colors.primary : colors.border,
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
                        marginRight: 10,
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
                    marginBottom: 8,
                  },
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

            <Pressable
              style={[styles.syncButton, { backgroundColor: colors.primary, marginTop: 14, opacity: isSharing ? 0.7 : 1 }]}
              onPress={captureAndShare}
              disabled={isSharing}
            >
              <Ionicons name={isSharing ? 'hourglass-outline' : 'share-outline'} size={18} color='#fff' />
              <Text style={styles.syncButtonText}>
                {isSharing ? (t('generatingFlyer') || 'Gerando flyer...') : `${t('generateAndShare') || 'Gerar e Compartilhar'} (${selectedIds.length})`}
              </Text>
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
