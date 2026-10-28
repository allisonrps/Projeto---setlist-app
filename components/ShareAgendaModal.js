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
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ViewShot, { captureRef } from 'react-native-view-shot';
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

const getTemplateName = (id, t) => {
  if (!t) return 'Layout';
  switch (id) {
    case 1: return t('templateRockMetal') || 'Rock & Metal';
    case 2: return t('templateAcousticFolk') || 'Folk Acústico';
    case 3: return t('templatePopSynth') || 'Pop Synthwave';
    case 4: return t('templateJazzBlues') || 'Jazz & Blues';
    case 5: return t('templateElectronicEDM') || 'Eletrônica EDM';
    case 6: return t('templateReggaeRoots') || 'Reggae Roots';
    case 7: return t('templateGospelWorship') || 'Gospel & Worship';
    case 8: return t('templateGenericNotes') || 'Música Genérica (Notas)';
    case 9: return t('templateClassicalOrchestra') || 'Clássico & Orquestra';
    default: return 'Rock & Metal';
  }
};

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
  const [cardScale, setCardScale] = useState(1.0);
  const [contactText, setContactText] = useState('');
  const [activeTabSection, setActiveTabSection] = useState('preview'); // 'preview' | 'config'

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
      // Pausa essencial para garantir que o layout 1080x1920 e os elementos visuais
      // estejam completamente renderizados pelo motor nativo
      await new Promise(resolve => setTimeout(resolve, 600));

      let uri = null;
      let captureError = null;

      // 1ª Tentativa: capture direto pelo componente ViewShot
      if (viewShotRef.current && typeof viewShotRef.current.capture === 'function') {
        try {
          uri = await viewShotRef.current.capture();
        } catch (err1) {
          captureError = err1;
          console.log('[ShareAgendaModal] Tentativa 1 (direct capture) falhou:', err1);
        }
      }

      // 2ª Tentativa: captureRef nativo com nó raiz (JPG 95%)
      if (!uri && viewShotRef.current) {
        await new Promise(resolve => setTimeout(resolve, 300));
        try {
          const targetNode = viewShotRef.current.root || viewShotRef.current;
          uri = await captureRef(targetNode, {
            format: 'jpg',
            quality: 0.95,
            result: 'tmpfile',
          });
        } catch (err2) {
          captureError = err2;
          console.log('[ShareAgendaModal] Tentativa 2 (captureRef JPG) falhou:', err2);
        }
      }

      // 3ª Tentativa: fallback com PNG (formato alternativo universal)
      if (!uri && viewShotRef.current) {
        await new Promise(resolve => setTimeout(resolve, 200));
        try {
          const targetNode = viewShotRef.current.root || viewShotRef.current;
          uri = await captureRef(targetNode, {
            format: 'png',
            quality: 1.0,
            result: 'tmpfile',
          });
        } catch (err3) {
          captureError = err3;
          console.log('[ShareAgendaModal] Tentativa 3 (captureRef PNG) falhou:', err3);
        }
      }

      if (!uri) {
        throw captureError || new Error('Falha ao capturar imagem da agenda.');
      }

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(t('attention') || 'Aviso', t('shareNotAvailable') || 'Compartilhamento não disponível neste aparelho.');
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg',
        dialogTitle: t('shareAgenda') || 'Compartilhar Agenda',
        UTI: uri.toLowerCase().endsWith('.png') ? 'public.png' : 'public.jpeg',
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

  // Escala dinâmica calibrada individualmente para 1, 2, 3, 4, 5 ou 6 eventos para preencher o flyer
  const eventCount = selectedEvents.length;
  const count = Math.max(1, Math.min(6, eventCount || 1));

  // Tabela de dimensões por quantidade para preencher o espaço vertical do flyer 1080x1920
  const flyerDim = {
    1: {
      cardHeight: 340,
      cardPaddingV: 44,
      cardPaddingH: 38,
      cardBorderRadius: 28,
      dateBadgeMinWidth: 200,
      dateBadgePadV: 26,
      dateBadgeMarginRight: 34,
      dateBadgeWeekDayFontSize: 24,
      dateBadgeDayFontSize: 74,
      dateBadgeDayLineHeight: 78,
      dateBadgeMonthFontSize: 30,
      eventTitleFontSize: 56,
      eventTitleLineHeight: 64,
      eventTitleMarginBottom: 16,
      eventInfoFontSize: 36,
      eventInfoIconSize: 36,
      headerLogoSize: 220,
      headerTitleFontSize: 92,
      headerTitleLineHeight: 98,
      headerSubtitleFontSize: 38,
      headerMarginBottom: 48,
      footerPadding: 34,
      footerBorderRadius: 28,
      footerSummaryFontSize: 28,
      footerSummaryLineHeight: 36,
      footerSloganFontSize: 22,
      footerQrSize: 145,
      footerScanFontSize: 16,
    },
    2: {
      cardHeight: 310,
      cardPaddingV: 42,
      cardPaddingH: 36,
      cardBorderRadius: 26,
      dateBadgeMinWidth: 190,
      dateBadgePadV: 24,
      dateBadgeMarginRight: 32,
      dateBadgeWeekDayFontSize: 22,
      dateBadgeDayFontSize: 68,
      dateBadgeDayLineHeight: 72,
      dateBadgeMonthFontSize: 28,
      eventTitleFontSize: 50,
      eventTitleLineHeight: 58,
      eventTitleMarginBottom: 14,
      eventInfoFontSize: 34,
      eventInfoIconSize: 34,
      headerLogoSize: 200,
      headerTitleFontSize: 88,
      headerTitleLineHeight: 94,
      headerSubtitleFontSize: 36,
      headerMarginBottom: 42,
      footerPadding: 32,
      footerBorderRadius: 26,
      footerSummaryFontSize: 28,
      footerSummaryLineHeight: 36,
      footerSloganFontSize: 22,
      footerQrSize: 145,
      footerScanFontSize: 16,
    },
    3: {
      cardHeight: 260,
      cardPaddingV: 38,
      cardPaddingH: 34,
      cardBorderRadius: 24,
      dateBadgeMinWidth: 175,
      dateBadgePadV: 20,
      dateBadgeMarginRight: 30,
      dateBadgeWeekDayFontSize: 21,
      dateBadgeDayFontSize: 60,
      dateBadgeDayLineHeight: 64,
      dateBadgeMonthFontSize: 25,
      eventTitleFontSize: 46,
      eventTitleLineHeight: 54,
      eventTitleMarginBottom: 12,
      eventInfoFontSize: 31,
      eventInfoIconSize: 31,
      headerLogoSize: 180,
      headerTitleFontSize: 84,
      headerTitleLineHeight: 90,
      headerSubtitleFontSize: 34,
      headerMarginBottom: 36,
      footerPadding: 30,
      footerBorderRadius: 24,
      footerSummaryFontSize: 26,
      footerSummaryLineHeight: 34,
      footerSloganFontSize: 20,
      footerQrSize: 140,
      footerScanFontSize: 16,
    },
    4: {
      cardHeight: 195,
      cardPaddingV: 28,
      cardPaddingH: 28,
      cardBorderRadius: 22,
      dateBadgeMinWidth: 155,
      dateBadgePadV: 15,
      dateBadgeMarginRight: 26,
      dateBadgeWeekDayFontSize: 18,
      dateBadgeDayFontSize: 52,
      dateBadgeDayLineHeight: 56,
      dateBadgeMonthFontSize: 22,
      eventTitleFontSize: 40,
      eventTitleLineHeight: 48,
      eventTitleMarginBottom: 10,
      eventInfoFontSize: 28,
      eventInfoIconSize: 28,
      headerLogoSize: 150,
      headerTitleFontSize: 78,
      headerTitleLineHeight: 84,
      headerSubtitleFontSize: 31,
      headerMarginBottom: 30,
      footerPadding: 28,
      footerBorderRadius: 24,
      footerSummaryFontSize: 25,
      footerSummaryLineHeight: 32,
      footerSloganFontSize: 20,
      footerQrSize: 135,
      footerScanFontSize: 15,
    },
    5: {
      cardHeight: 152,
      cardPaddingV: 20,
      cardPaddingH: 24,
      cardBorderRadius: 18,
      dateBadgeMinWidth: 135,
      dateBadgePadV: 10,
      dateBadgeMarginRight: 22,
      dateBadgeWeekDayFontSize: 16,
      dateBadgeDayFontSize: 44,
      dateBadgeDayLineHeight: 48,
      dateBadgeMonthFontSize: 19,
      eventTitleFontSize: 33,
      eventTitleLineHeight: 40,
      eventTitleMarginBottom: 7,
      eventInfoFontSize: 24,
      eventInfoIconSize: 24,
      headerLogoSize: 125,
      headerTitleFontSize: 70,
      headerTitleLineHeight: 76,
      headerSubtitleFontSize: 27,
      headerMarginBottom: 24,
      footerPadding: 26,
      footerBorderRadius: 22,
      footerSummaryFontSize: 24,
      footerSummaryLineHeight: 30,
      footerSloganFontSize: 19,
      footerQrSize: 130,
      footerScanFontSize: 14,
    },
    6: {
      cardHeight: 124,
      cardPaddingV: 14,
      cardPaddingH: 22,
      cardBorderRadius: 16,
      dateBadgeMinWidth: 125,
      dateBadgePadV: 8,
      dateBadgeMarginRight: 20,
      dateBadgeWeekDayFontSize: 15,
      dateBadgeDayFontSize: 38,
      dateBadgeDayLineHeight: 42,
      dateBadgeMonthFontSize: 17,
      eventTitleFontSize: 29,
      eventTitleLineHeight: 35,
      eventTitleMarginBottom: 6,
      eventInfoFontSize: 21,
      eventInfoIconSize: 21,
      headerLogoSize: 118,
      headerTitleFontSize: 68,
      headerTitleLineHeight: 72,
      headerSubtitleFontSize: 26,
      headerMarginBottom: 20,
      footerPadding: 24,
      footerBorderRadius: 22,
      footerSummaryFontSize: 23,
      footerSummaryLineHeight: 30,
      footerSloganFontSize: 18,
      footerQrSize: 125,
      footerScanFontSize: 14,
    },
  }[count];


  const renderFlyerArt = () => (
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
                  paddingTop: count <= 3 ? 55 : 45,
                  paddingBottom: count <= 3 ? 55 : 45,
                  justifyContent: 'space-between',
                }}
              >
                {/* HEADER: ADAPTATIVO (PARA POUCOS EVENTOS: LOGO NO TOPO GRANDE, AGENDA NA 2ª LINHA, UPCOMING EVENTS NA 3ª LINHA) */}
                {count <= 4 ? (
                  <View collapsable={false} style={{ alignItems: 'center', marginBottom: flyerDim.headerMarginBottom, marginTop: 10 }}>
                    {/* Linha 1: Logo no topo maior e centralizado */}
                    {artLogo ? (
                      <Image
                        source={{ uri: artLogo }}
                        style={{
                          width: flyerDim.headerLogoSize,
                          height: flyerDim.headerLogoSize,
                          borderRadius: flyerDim.headerLogoSize / 2,
                          marginBottom: 16,
                          borderWidth: 5,
                          borderColor: colors.primary || '#eab308',
                          backgroundColor: 'rgba(0,0,0,0.4)',
                        }}
                      />
                    ) : (
                      <View
                        style={{
                          width: flyerDim.headerLogoSize,
                          height: flyerDim.headerLogoSize,
                          borderRadius: flyerDim.headerLogoSize / 2,
                          marginBottom: 16,
                          borderWidth: 5,
                          borderColor: colors.primary || '#eab308',
                          backgroundColor: colors.primary || '#eab308',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontSize: count <= 2 ? 68 : 58, fontWeight: '900', color: '#ffffff' }}>
                          {(displayName || 'BD').substring(0, 2).toUpperCase()}
                        </Text>
                      </View>
                    )}

                    {/* Linha 2: AGENDA */}
                    <Text style={{
                      fontSize: flyerDim.headerTitleFontSize,
                      fontWeight: '900',
                      color: '#ffffff',
                      textTransform: 'uppercase',
                      letterSpacing: 4,
                      lineHeight: flyerDim.headerTitleLineHeight,
                      textAlign: 'center',
                    }}>
                      {t('agendaFlyerTitle') || 'AGENDA'}
                    </Text>

                    {/* Linha 3: UPCOMING EVENTS / PRÓXIMOS SHOWS • NOME */}
                    <Text style={{
                      fontSize: flyerDim.headerSubtitleFontSize,
                      fontWeight: '800',
                      color: colors.primary || '#eab308',
                      marginTop: 6,
                      textAlign: 'center',
                      letterSpacing: 1,
                    }}>
                      {t('upcomingShows') || (activeLang === 'en' ? 'Upcoming Shows' : activeLang === 'es' ? 'Próximos Conciertos' : 'Próximos Shows')}
                      {displayName ? ` • ${displayName}` : ''}
                    </Text>
                  </View>
                ) : (
                  <View collapsable={false} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: flyerDim.headerMarginBottom, marginTop: 4 }}>
                    {artLogo ? (
                      <Image
                        source={{ uri: artLogo }}
                        style={{
                          width: flyerDim.headerLogoSize,
                          height: flyerDim.headerLogoSize,
                          borderRadius: flyerDim.headerLogoSize / 2,
                          marginRight: 26,
                          borderWidth: 4,
                          borderColor: colors.primary || '#eab308',
                          backgroundColor: 'rgba(0,0,0,0.4)',
                        }}
                      />
                    ) : (
                      <View
                        style={{
                          width: flyerDim.headerLogoSize,
                          height: flyerDim.headerLogoSize,
                          borderRadius: flyerDim.headerLogoSize / 2,
                          marginRight: 26,
                          borderWidth: 4,
                          borderColor: colors.primary || '#eab308',
                          backgroundColor: colors.primary || '#eab308',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 48, fontWeight: '900', color: '#ffffff' }}>
                          {(displayName || 'BD').substring(0, 2).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      {/* Linha 1: AGENDA */}
                      <Text style={{ fontSize: flyerDim.headerTitleFontSize, fontWeight: '900', color: '#ffffff', textTransform: 'uppercase', letterSpacing: 3, lineHeight: flyerDim.headerTitleLineHeight }}>
                        {t('agendaFlyerTitle') || 'AGENDA'}
                      </Text>
                      {/* Linha 2: Próximos Shows • Nome */}
                      <Text style={{ fontSize: flyerDim.headerSubtitleFontSize, fontWeight: '700', color: colors.primary || '#eab308', marginTop: 4 }}>
                        {t('upcomingShows') || (activeLang === 'en' ? 'Upcoming Shows' : activeLang === 'es' ? 'Próximos Conciertos' : 'Próximos Shows')}
                        {displayName ? ` • ${displayName}` : ''}
                      </Text>
                    </View>
                  </View>
                )}

                {/* CARDS DE EVENTOS: PREENCHIMENTO ADAPTATIVO TOTAL DO ESPAÇO (2, 3, 4, 5 OU 6 EVENTOS) */}
                <View
                  collapsable={false}
                  style={{
                    flex: 1,
                    justifyContent: 'space-evenly',
                    marginVertical: count <= 3 ? 24 : 12,
                  }}
                >
                  {selectedEvents.map(event => {
                    const { day, month, weekDay, time } = getEventDateDetails(event);
                    const eventTitle = (event.name || event.local || event.band || getDefaultEventTitle(activeLang)).trim();
                    const eventLocal = event.local || (event.band && event.name ? event.band : '');

                    return (
                      <View
                        key={event.id}
                        collapsable={false}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: 'rgba(0,0,0,0.70)',
                          minHeight: flyerDim.cardHeight,
                          paddingVertical: flyerDim.cardPaddingV,
                          paddingHorizontal: flyerDim.cardPaddingH,
                          borderRadius: flyerDim.cardBorderRadius,
                          borderWidth: 1.5,
                          borderColor: 'rgba(255,255,255,0.14)',
                        }}
                      >
                        {/* Data do lado esquerdo do card */}
                        <View
                          style={{
                            minWidth: flyerDim.dateBadgeMinWidth,
                            paddingVertical: flyerDim.dateBadgePadV,
                            paddingHorizontal: 12,
                            borderRadius: count >= 5 ? 12 : 16,
                            backgroundColor: 'rgba(255,255,255,0.08)',
                            borderWidth: 2,
                            borderColor: colors.primary || '#eab308',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: flyerDim.dateBadgeMarginRight,
                          }}
                        >
                          {weekDay ? (
                            <Text style={{ fontSize: flyerDim.dateBadgeWeekDayFontSize, fontWeight: '800', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: 2 }}>
                              {weekDay}
                            </Text>
                          ) : null}
                          <Text style={{ fontSize: flyerDim.dateBadgeDayFontSize, fontWeight: '900', color: '#ffffff', lineHeight: flyerDim.dateBadgeDayLineHeight }}>
                            {day}
                          </Text>
                          {month ? (
                            <Text style={{ fontSize: flyerDim.dateBadgeMonthFontSize, fontWeight: '900', color: colors.primary || '#eab308', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 2 }}>
                              {month}
                            </Text>
                          ) : null}
                        </View>

                        {/* Informações do evento à direita da data */}
                        <View style={{ flex: 1, justifyContent: 'center' }}>
                          <Text
                            style={{
                              fontSize: flyerDim.eventTitleFontSize,
                              fontWeight: '900',
                              color: '#ffffff',
                              marginBottom: flyerDim.eventTitleMarginBottom,
                              lineHeight: flyerDim.eventTitleLineHeight,
                            }}
                            numberOfLines={count >= 5 ? 1 : 2}
                          >
                            {eventTitle}
                          </Text>

                          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                            {eventLocal ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: time ? 20 : 0 }}>
                                <Ionicons name="location-sharp" size={flyerDim.eventInfoIconSize} color="rgba(255,255,255,0.85)" style={{ marginRight: 6 }} />
                                <Text style={{ fontSize: flyerDim.eventInfoFontSize, color: 'rgba(255,255,255,0.85)', fontWeight: '600' }} numberOfLines={1}>
                                   {eventLocal}
                                </Text>
                              </View>
                            ) : null}

                            {time ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="time" size={flyerDim.eventInfoIconSize} color={colors.primary || '#eab308'} style={{ marginRight: 6 }} />
                                <Text style={{ fontSize: flyerDim.eventInfoFontSize, color: colors.primary || '#eab308', fontWeight: '800' }}>
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

                {/* LINHA DE CONTATO / TEXTO LIVRE PERSONALIZADO */}
                {contactText ? (
                  <View
                    collapsable={false}
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.65)',
                      paddingVertical: 12,
                      paddingHorizontal: 24,
                      borderRadius: 16,
                      borderWidth: 1.5,
                      borderColor: 'rgba(255,255,255,0.25)',
                      marginBottom: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 28,
                        fontWeight: '800',
                        color: '#ffffff',
                        textAlign: 'center',
                        letterSpacing: 0.5,
                      }}
                      numberOfLines={1}
                    >
                      {contactText}
                    </Text>
                  </View>
                ) : null}

                {/* BOTTOM BANNER: BAND LINK, RESUMO DO APP TRADUZIDO & QR CODE PLAY STORE */}
                <View
                  collapsable={false}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'rgba(10, 15, 26, 0.88)',
                    padding: flyerDim.footerPadding,
                    borderRadius: flyerDim.footerBorderRadius,
                    borderWidth: 1.5,
                    borderColor: 'rgba(255,255,255,0.22)',
                  }}
                >
                  <View style={{ flex: 1, marginRight: 24 }}>
                    {/* Logo Oficial Band Link no Rodapé */}
                    <Image
                      source={bandlinkLogoWide}
                      style={{
                        width: count >= 5 ? 240 : 280,
                        height: count >= 5 ? 64 : 76,
                        resizeMode: 'contain',
                        marginBottom: 10,
                        alignSelf: 'flex-start',
                      }}
                    />
                    <Text style={{ fontSize: flyerDim.footerSummaryFontSize, fontWeight: 'bold', color: '#fff', lineHeight: flyerDim.footerSummaryLineHeight }}>
                      {getAppSummary(activeLang)}
                    </Text>
                    <Text style={{ fontSize: flyerDim.footerSloganFontSize, color: 'rgba(255,255,255,0.75)', marginTop: 8, fontWeight: '600' }}>
                      {getAppFooterSlogan(activeLang)}
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: '#fff',
                      padding: count >= 5 ? 14 : 16,
                      borderRadius: 20,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <QRCode value={PLAY_STORE_URL} size={flyerDim.footerQrSize} />
                    <Text style={{ fontSize: flyerDim.footerScanFontSize, fontWeight: '900', color: '#0b0f19', marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      {getScanQrText(activeLang)}
                    </Text>
                  </View>
                </View>
              </View>
            </ImageBackground>
  );

  return (
    <Modal visible={!!visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        {/* ── HIGH-RES FLYER VIEWSHOT (MANTIDO MONTADO E PREVIAMENTE MEDIDO EM 1080x1920) ── */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 1080,
            height: 1920,
            zIndex: -999,
            opacity: isSharing ? 1 : 0.001,
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
            {renderFlyerArt()}
          </ViewShot>
        </View>

        {/* ── LOADING OVERLAY QUANDO GERANDO A ARTE ── */}
        {isSharing ? (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center', alignItems: 'center', zIndex: 99999 }]}>
            <ActivityIndicator size="large" color={colors.primary || '#eab308'} />
            <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginTop: 16, textAlign: 'center' }}>
              {t('generatingFlyer') || 'Gerando arte em alta definição...'}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 6 }}>
              {t('pleaseWait') || 'Aguarde um momento'}
            </Text>
          </View>
        ) : null}

        <Pressable style={styles.modalBackdrop} onPress={onClose} />
          <View style={[styles.bottomSheetContent, { backgroundColor: colors.cardBackground, borderColor: colors.border, maxHeight: '92%' }]}>
            <View style={[styles.dragHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
            
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="share-social" size={22} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>{t('shareAgenda') || 'Compartilhar Agenda'}</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10}>
                <Ionicons name='close' size={24} color={colors.text} />
              </Pressable>
            </View>

            {/* Segmented Tabs: Pré-visualização vs Configurações */}
            <View style={{ flexDirection: 'row', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', borderRadius: 12, padding: 4, marginBottom: 14 }}>
              <Pressable
                onPress={() => setActiveTabSection('preview')}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: activeTabSection === 'preview' ? colors.primary : 'transparent',
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Ionicons name="eye-outline" size={16} color={activeTabSection === 'preview' ? '#fff' : colors.textMuted} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: activeTabSection === 'preview' ? '#fff' : colors.textMuted }}>
                  Pré-visualização
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setActiveTabSection('config')}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: activeTabSection === 'config' ? colors.primary : 'transparent',
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Ionicons name="options-outline" size={16} color={activeTabSection === 'config' ? '#fff' : colors.textMuted} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: activeTabSection === 'config' ? '#fff' : colors.textMuted }}>
                  Opções & Shows ({selectedIds.length})
                </Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
              {activeTabSection === 'preview' ? (
                /* ── ABA 1: LIVE PREVIEW & CONTROLES RÁPIDOS ── */
                <View style={{ alignItems: 'center' }}>
                  
                  {/* Container da Miniatura em Proporção Exata 9:16 (270x480) */}
                  <View
                    style={{
                      width: 270,
                      height: 480,
                      borderRadius: 16,
                      overflow: 'hidden',
                      backgroundColor: '#000000',
                      borderWidth: 2,
                      borderColor: colors.primary,
                      elevation: 6,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.35,
                      shadowRadius: 10,
                      marginBottom: 14,
                    }}
                  >
                    <View
                      style={{
                        width: 1080,
                        height: 1920,
                        transform: [{ scale: 0.25 }],
                        transformOrigin: 'top left',
                      }}
                      pointerEvents="none"
                      collapsable={false}
                    >
                      {renderFlyerArt()}
                    </View>
                  </View>

                  {/* Controle de Ajuste de Tamanho dos Cards */}
                  <View style={{ width: '100%', backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>
                        TAMANHO DOS CARDS
                      </Text>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary }}>
                        {Math.round(cardScale * 100)}% ({cardScale <= 0.85 ? 'Compacto' : cardScale >= 1.15 ? 'Grande' : 'Normal'})
                      </Text>
                    </View>

                    {/* Stepper - / + e Chips Rápidos */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <Pressable
                        onPress={() => setCardScale(s => Math.max(0.65, Math.round((s - 0.05) * 100) / 100))}
                        style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0', justifyContent: 'center', alignItems: 'center' }}
                      >
                        <Ionicons name="remove" size={20} color={colors.text} />
                      </Pressable>

                      <View style={{ flexDirection: 'row', gap: 6, flex: 1, justifyContent: 'center' }}>
                        {[
                          { label: '0.8x', val: 0.8 },
                          { label: '1.0x', val: 1.0 },
                          { label: '1.15x', val: 1.15 },
                          { label: '1.3x', val: 1.3 }
                        ].map(preset => (
                          <Pressable
                            key={preset.label}
                            onPress={() => setCardScale(preset.val)}
                            style={{
                              paddingVertical: 6,
                              paddingHorizontal: 10,
                              borderRadius: 8,
                              backgroundColor: Math.abs(cardScale - preset.val) < 0.04 ? colors.primary : (isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'),
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '700', color: Math.abs(cardScale - preset.val) < 0.04 ? '#fff' : colors.text }}>
                              {preset.label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>

                      <Pressable
                        onPress={() => setCardScale(s => Math.min(1.35, Math.round((s + 0.05) * 100) / 100))}
                        style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0', justifyContent: 'center', alignItems: 'center' }}
                      >
                        <Ionicons name="add" size={20} color={colors.text} />
                      </Pressable>
                    </View>
                  </View>

                  {/* Seletor Rápido de Tema com Ícones */}
                  <View style={{ width: '100%', marginBottom: 10 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase' }}>
                      Tema de Fundo
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      <Pressable
                        onPress={() => {
                          if (!customBgUri) pickCustomBgImage();
                          else setSelectedLayout('custom');
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 7,
                          paddingHorizontal: 12,
                          borderRadius: 9,
                          backgroundColor: selectedLayout === 'custom' ? colors.primary + '25' : (isDark ? '#1e293b' : '#f1f5f9'),
                          borderWidth: 1.5,
                          borderColor: selectedLayout === 'custom' ? colors.primary : colors.border,
                          gap: 6,
                        }}
                      >
                        <Ionicons name="image-outline" size={16} color={selectedLayout === 'custom' ? colors.primary : colors.textMuted} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: selectedLayout === 'custom' ? colors.primary : colors.text }}>
                          {customBgUri ? 'Foto Salva' : 'Foto Galeria'}
                        </Text>
                      </Pressable>

                      {LAYOUT_TEMPLATES.map(item => (
                        <Pressable
                          key={item.id}
                          onPress={() => setSelectedLayout(item.id)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 7,
                            paddingHorizontal: 12,
                            borderRadius: 9,
                            backgroundColor: selectedLayout === item.id ? colors.primary + '25' : (isDark ? '#1e293b' : '#f1f5f9'),
                            borderWidth: 1.5,
                            borderColor: selectedLayout === item.id ? colors.primary : colors.border,
                            gap: 6,
                          }}
                        >
                          <Ionicons name={item.icon} size={16} color={selectedLayout === item.id ? colors.primary : colors.textMuted} />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: selectedLayout === item.id ? colors.primary : colors.text }}>
                            {getTemplateName(item.id, t)}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>

                </View>
              ) : (
                /* ── ABA 2: CONFIGURAÇÃO DE SHOWS, TEMAS E TEXTO LIVRE ── */
                <View>
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

                  {/* 2. LINHA DE CONTATO / TEXTO LIVRE */}
                  <View style={{ marginBottom: 18 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>
                      LINHA DE CONTATO / TEXTO LIVRE (OPCIONAL)
                    </Text>
                    <TextInput
                      value={contactText}
                      onChangeText={setContactText}
                      placeholder="Ex: Contato para Shows: (16) 99115-3733 • @badbadgers"
                      placeholderTextColor={colors.textMuted}
                      style={{
                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        fontSize: 13,
                        color: colors.text,
                      }}
                      maxLength={80}
                    />
                  </View>

                  {/* 3. AJUSTE DE TAMANHO DOS CARDS */}
                  <View style={{ marginBottom: 18 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700' }}>
                        TAMANHO DOS CARDS ({Math.round(cardScale * 100)}%)
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {[
                        { label: 'Compacto', val: 0.8 },
                        { label: 'Normal', val: 1.0 },
                        { label: 'Grande', val: 1.15 },
                        { label: 'Extra', val: 1.3 }
                      ].map(preset => (
                        <Pressable
                          key={preset.label}
                          onPress={() => setCardScale(preset.val)}
                          style={{
                            flex: 1,
                            paddingVertical: 8,
                            borderRadius: 8,
                            backgroundColor: Math.abs(cardScale - preset.val) < 0.04 ? colors.primary : (isDark ? '#1e293b' : '#f1f5f9'),
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: Math.abs(cardScale - preset.val) < 0.04 ? '#fff' : colors.text }}>
                            {preset.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* 4. ESTILO DA ARTE COMPLETO */}
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
                      <Text style={[styles.layoutName, { color: selectedLayout === item.id ? colors.primary : colors.text }]}>{getTemplateName(item.id, t)}</Text>
                      {selectedLayout === item.id && <Ionicons name='checkmark-circle' size={20} color={colors.primary} style={{ marginLeft: 'auto' }} />}
                    </Pressable>
                  ))}
                </View>
              )}
            </ScrollView>

            {/* Botão de Ação: Compartilhar / Baixar */}
            <Pressable
              style={[styles.syncButton, { backgroundColor: colors.primary, marginTop: 12, opacity: isSharing ? 0.7 : 1 }]}
              onPress={captureAndShare}
              disabled={isSharing}
            >
              <Ionicons name={isSharing ? 'hourglass-outline' : 'share-social'} size={18} color='#fff' />
              <Text style={styles.syncButtonText}>
                {isSharing ? (t('generatingFlyer') || 'Gerando flyer...') : `${t('generateAndShare') || 'Gerar e Compartilhar'} (${selectedIds.length} shows)`}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
