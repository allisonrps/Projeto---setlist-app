import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Dimensions,
  Vibration,
  Linking,
  StatusBar,
  Animated,
  PanResponder,
  Share,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { bandService } from '../services/bandService';
import { musiciansService } from '../services/musiciansService';
import { api } from '../services/api';
import MusicianProfileModal from './MusicianProfileModal';
import SongListItem from './SongListItem';
import ShareAgendaModal, { shareAgendaPillStyles } from './ShareAgendaModal';
import YearPickerModal from './YearPickerModal';
import PublishBandModal from './PublishBandModal';

const { width } = Dimensions.get('window');

const getBandInitials = (name) => {
  if (!name || !name.trim()) return '?';
  const words = name.trim().split(/\s+/);
  const initials = words.map(w => w[0]).join('').toUpperCase();
  return initials.slice(0, 3);
};

const getFormattedDateBadge = (dateStr, lang) => {
  if (!dateStr || !dateStr.trim()) return { day: '--', month: '---' };
  const clean = dateStr.trim();
  let day = '';
  let monthNum = 0;
  
  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length === 3) {
      day = parseInt(parts[2], 10);
      monthNum = parseInt(parts[1], 10) - 1;
    }
  }
  
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 3) {
      day = parseInt(parts[0], 10);
      monthNum = parseInt(parts[1], 10) - 1;
    }
  }
  
  if (!day) return { day: '--', month: '---' };
  
  const monthsPT = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const monthsEN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const monthsES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  
  let months = monthsPT;
  if (lang === 'en') months = monthsEN;
  if (lang === 'es') months = monthsES;
  
  return { day: String(day).padStart(2, '0'), month: months[monthNum] || '---' };
};

const isFutureDate = (dateStr) => {
  if (!dateStr) return false;
  const clean = String(dateStr).trim();
  
  // Format: DD/MM/YYYY or DD/MM/YY
  const dmyRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/;
  const match = clean.match(dmyRegex);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    let year = parseInt(match[3], 10);
    if (year < 100) year += 2000;
    const parsedDate = new Date(year, month, day, 23, 59, 59);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return parsedDate >= today;
  }

  // Format: YYYY-MM-DD
  const ymdRegex = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/;
  const matchYmd = clean.match(ymdRegex);
  if (matchYmd) {
    const year = parseInt(matchYmd[1], 10);
    const month = parseInt(matchYmd[2], 10) - 1;
    const day = parseInt(matchYmd[3], 10);
    const parsedDate = new Date(year, month, day, 23, 59, 59);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return parsedDate >= today;
  }

  try {
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return parsed >= today;
    }
  } catch (e) {}

  return false;
};

const parseDateForSort = (dateStr) => {
  if (!dateStr) return 0;
  const clean = String(dateStr).trim();
  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length === 3) return new Date(parts[0], parts[1] - 1, parts[2]).getTime();
  } else if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 3) {
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return new Date(year, parts[1] - 1, parts[0]).getTime();
    }
  }
  return 0;
};

const getMonthInfo = (dateStr, lang = 'pt') => {
  const clean = String(dateStr || '').trim();
  if (!clean) return { name: lang === 'en' ? 'OTHER' : lang === 'es' ? 'OTROS' : 'OUTROS', year: 0, index: -1 };
  let year = 0;
  let monthNum = -1;

  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        year = parseInt(parts[0], 10);
        monthNum = parseInt(parts[1], 10) - 1;
      } else {
        year = parts[2].length === 2 ? parseInt('20' + parts[2], 10) : parseInt(parts[2], 10);
        monthNum = parseInt(parts[1], 10) - 1;
      }
    } else if (parts.length === 2) {
      if (parts[0].length === 4) {
        year = parseInt(parts[0], 10);
        monthNum = parseInt(parts[1], 10) - 1;
      } else if (parts[1].length === 4) {
        year = parseInt(parts[1], 10);
        monthNum = parseInt(parts[0], 10) - 1;
      } else {
        monthNum = parseInt(parts[1], 10) - 1;
        year = new Date().getFullYear();
      }
    }
  } else if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        year = parseInt(parts[0], 10);
        monthNum = parseInt(parts[1], 10) - 1;
      } else {
        year = parts[2].length === 2 ? parseInt('20' + parts[2], 10) : parseInt(parts[2], 10);
        monthNum = parseInt(parts[1], 10) - 1;
      }
    } else if (parts.length === 2) {
      if (parts[0].length === 4) {
        year = parseInt(parts[0], 10);
        monthNum = parseInt(parts[1], 10) - 1;
      } else if (parts[1].length === 4) {
        year = parseInt(parts[1], 10);
        monthNum = parseInt(parts[0], 10) - 1;
      } else {
        monthNum = parseInt(parts[1], 10) - 1;
        year = new Date().getFullYear();
      }
    }
  }

  if (monthNum < 0) {
    const ptMonths = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const lower = clean.toLowerCase();
    for (let i = 0; i < 12; i++) {
      if (lower.includes(ptMonths[i]) || lower.includes(ptMonths[i].slice(0, 3))) {
        monthNum = i;
        const yearMatch = clean.match(/\b(20\d{2})\b/);
        year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();
        break;
      }
    }
  }

  const monthsPt = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
  const monthsEn = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  const monthsEs = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

  const months = lang === 'en' ? monthsEn : lang === 'es' ? monthsEs : monthsPt;

  if (monthNum >= 0 && monthNum < 12) {
    return { name: months[monthNum], year: year || new Date().getFullYear(), index: monthNum };
  }
  return { name: lang === 'en' ? 'OTHER' : lang === 'es' ? 'OTROS' : 'OUTROS', year: year || 0, index: -1 };
};

const getMonthYearHeader = (dateStr, lang = 'pt') => {
  const m = getMonthInfo(dateStr, lang);
  return m.name;
};

const STYLE_COLOR_PALETTE = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#eab308', '#10b981', '#06b6d4', '#6366f1', '#f43f5e', '#a855f7', '#84cc16'
];

const formatTimelineDescription = (desc, actionType, lang) => {
  if (!desc) return '';
  if (lang === 'pt') return desc;
  let text = String(desc);
  if (lang === 'en') {
    text = text
      .replace(/conectou a banda à comunidade online!/gi, 'connected the band to the online community!')
      .replace(/conectou a banda a comunidade online!/gi, 'connected the band to the online community!')
      .replace(/publicou a banda na nuvem como @([\w\d_.-]+)!/gi, 'published band to cloud as @$1!')
      .replace(/criou a banda/gi, 'created the band')
      .replace(/atualizou os dados da banda:/gi, 'updated band details:')
      .replace(/atualizou as informações da banda/gi, 'updated band information')
      .replace(/atualizou as informacoes da banda/gi, 'updated band information')
      .replace(/atualizou o saldo do caixa da banda para/gi, 'updated band cash balance to')
      .replace(/adicionou a música:/gi, 'added song:')
      .replace(/adicionou a musica:/gi, 'added song:')
      .replace(/removeu a música:/gi, 'removed song:')
      .replace(/removeu a musica:/gi, 'removed song:')
      .replace(/adicionou (\d+) música\(s\) do Songbook ao repertório/gi, 'added $1 song(s) from Songbook to repertoire')
      .replace(/adicionou (\d+) músicas do Songbook ao repertório/gi, 'added $1 songs from Songbook to repertoire')
      .replace(/adicionou (\d+) música do Songbook ao repertório/gi, 'added $1 song from Songbook to repertoire')
      .replace(/adicionou (\d+) música\(s\) ao repertório/gi, 'added $1 song(s) to repertoire')
      .replace(/adicionou (\d+) músicas ao repertório/gi, 'added $1 songs to repertoire')
      .replace(/adicionou (\d+) música ao repertório/gi, 'added $1 song to repertoire')
      .replace(/removeu "(.*?)" do repertório/gi, 'removed "$1" from repertoire')
      .replace(/removeu "(.*?)" do repertorio/gi, 'removed "$1" from repertoire')
      .replace(/registrou financeiro:/gi, 'recorded financial entry:')
      .replace(/atualizou financeiro:/gi, 'updated financial entry:')
      .replace(/removeu registro financeiro:/gi, 'deleted financial entry:')
      .replace(/adicionou o integrante:/gi, 'added member:')
      .replace(/adicionou o membro/gi, 'added member')
      .replace(/atualizou o integrante:/gi, 'updated member:')
      .replace(/removeu o integrante:/gi, 'removed member:')
      .replace(/removeu o membro/gi, 'removed member')
      .replace(/atualizou os dados do integrante/gi, 'updated member details')
      .replace(/criou a setlist:/gi, 'created setlist:')
      .replace(/editou a setlist:/gi, 'edited setlist:')
      .replace(/excluiu a setlist:/gi, 'deleted setlist:')
      .replace(/realizou uma alteração/gi, 'made a change')
      .replace(/realizou uma alteracao/gi, 'made a change');
  } else if (lang === 'es') {
    text = text
      .replace(/conectou a banda à comunidade online!/gi, '¡conectó la banda a la comunidad online!')
      .replace(/conectou a banda a comunidade online!/gi, '¡conectó la banda a la comunidad online!')
      .replace(/publicou a banda na nuvem como @([\w\d_.-]+)!/gi, '¡publicó la banda en la nube como @$1!')
      .replace(/criou a banda/gi, 'creó la banda')
      .replace(/atualizou os dados da banda:/gi, 'actualizó los datos de la banda:')
      .replace(/atualizou as informações da banda/gi, 'actualizó la información de la banda')
      .replace(/atualizou as informacoes da banda/gi, 'actualizó la información de la banda')
      .replace(/atualizou o saldo do caixa da banda para/gi, 'actualizó el saldo de caja de la banda a')
      .replace(/adicionou a música:/gi, 'añadió la canción:')
      .replace(/adicionou a musica:/gi, 'añadió la canción:')
      .replace(/removeu a música:/gi, 'eliminó la canción:')
      .replace(/removeu a musica:/gi, 'eliminó la canción:')
      .replace(/adicionou (\d+) música\(s\) do Songbook ao repertório/gi, 'añadió $1 canción(es) del Songbook al repertorio')
      .replace(/adicionou (\d+) músicas do Songbook ao repertório/gi, 'añadió $1 canciones del Songbook al repertorio')
      .replace(/adicionou (\d+) música do Songbook ao repertório/gi, 'añadió $1 canción del Songbook al repertorio')
      .replace(/adicionou (\d+) música\(s\) ao repertório/gi, 'añadió $1 canción(es) al repertorio')
      .replace(/adicionou (\d+) músicas ao repertório/gi, 'añadió $1 canciones al repertorio')
      .replace(/adicionou (\d+) música ao repertório/gi, 'añadió $1 canción al repertorio')
      .replace(/removeu "(.*?)" do repertório/gi, 'eliminó "$1" del repertorio')
      .replace(/removeu "(.*?)" do repertorio/gi, 'eliminó "$1" del repertorio')
      .replace(/registrou financeiro:/gi, 'registró finanza:')
      .replace(/atualizou financeiro:/gi, 'actualizó finanza:')
      .replace(/removeu registro financeiro:/gi, 'eliminó registro financiero:')
      .replace(/adicionou o integrante:/gi, 'añadió al integrante:')
      .replace(/adicionou o membro/gi, 'añadió al miembro')
      .replace(/atualizou o integrante:/gi, 'actualizó al integrante:')
      .replace(/removeu o integrante:/gi, 'eliminó al integrante:')
      .replace(/removeu o membro/gi, 'eliminó al miembro')
      .replace(/atualizou os dados do integrante/gi, 'actualizó los datos del integrante')
      .replace(/criou a setlist:/gi, 'creó el setlist:')
      .replace(/editou a setlist:/gi, 'editó el setlist:')
      .replace(/excluiu a setlist:/gi, 'eliminó el setlist:')
      .replace(/realizou uma alteração/gi, 'realizó una modificación')
      .replace(/realizou uma alteracao/gi, 'realizó una modificación');
  }
  return text;
};

const formatActivityDateTime = (dateStr, lang = 'pt') => {
  if (!dateStr) return '';
  try {
    let clean = String(dateStr).trim();
    if (!clean.includes('T') && clean.includes(' ')) {
      clean = clean.replace(' ', 'T');
      if (!clean.endsWith('Z')) clean = clean + 'Z';
    }
    const d = new Date(clean);
    if (isNaN(d.getTime())) return String(dateStr);
    const day = d.getDate();
    const monthsPt = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthsEs = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const monthList = lang === 'en' ? monthsEn : lang === 'es' ? monthsEs : monthsPt;
    const monthName = monthList[d.getMonth()] || '';
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    if (lang === 'en') {
      return `${monthName} ${day}, ${hours}:${minutes}`;
    } else if (lang === 'es') {
      return `${day} de ${monthName} a las ${hours}:${minutes}`;
    }
    return `${day} de ${monthName} às ${hours}:${minutes}`;
  } catch (e) {
    return String(dateStr);
  }
};

const getActivityIconAndColor = (actionType, colors) => {
  switch (actionType) {
    // Aba Agenda / Setlists
    case 'created_setlist':
    case 'updated_setlist':
    case 'deleted_setlist':
    case 'show_scheduled':
      return { icon: 'calendar', color: '#38bdf8', bg: '#38bdf820' };
    case 'rehearsal_scheduled':
      return { icon: 'headset', color: '#fbbf24', bg: '#fbbf2420' };

    // Aba Repertório / Músicas
    case 'added_song':
    case 'added_songs':
    case 'removed_song':
    case 'updated_tabs':
    case 'updated_chords':
    case 'updated_lyrics':
    case 'updated_song':
    case 'update_song':
      return { icon: 'musical-notes', color: '#8b5cf6', bg: '#8b5cf620' };

    // Sincronização do Repertório
    case 'repertoire_sync':
      return { icon: 'cloud-done', color: '#10b981', bg: '#10b98120' };

    // Aba Integrantes / Membros
    case 'added_member':
    case 'updated_member':
    case 'update_member':
    case 'removed_member':
      return { icon: 'people', color: '#06b6d4', bg: '#06b6d420' };

    // Candidato interessado
    case 'candidate_interest':
      return { icon: 'paper-plane', color: '#22c55e', bg: '#22c55e20' };

    // Aba Financeiro
    case 'added_finance':
    case 'updated_finance':
    case 'deleted_finance':
      return { icon: 'wallet', color: '#eab308', bg: '#eab30820' };

    // Aba Estatísticas
    case 'stats_update':
      return { icon: 'stats-chart', color: '#3b82f6', bg: '#3b82f620' };

    // Modo Online
    case 'online_mode':
      return { icon: 'cloud-done', color: '#10b981', bg: '#10b98120' };

    // Criação da Banda / Fundação
    case 'band_created':
    case 'created_band':
      return { icon: 'flag', color: '#a855f7', bg: '#a855f720' };

    // Dados da Banda
    case 'updated_band':
    case 'update_band':
    default:
      return { icon: 'time', color: colors.primary, bg: colors.primary + '20' };
  }
};


export default function BandDetailScreen({
  visible,
  band,
  allGeneralSongs = [],
  allSetlists = [],
  onBack,
  onEditBand,
  onDeleteBand,
  onSelectSong,
  onSelectSetlist,
  onOpenNewSongForBand,
  onOpenNewSetlistForBand,
  onStartPerformance,
  onExportDoc,
  onShareSetlist,
  onToggleFavoriteSetlist,
  onToggleFavoriteSong,
  onToggleRehearsalStatus,
  onUpdateSongRehearsalNotes,
  onCopy,
  onReloadAll,
  onOpenPublicProfile,
}) {
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const isDark = colors.isDark;

  // Dedicated Tab Pages: 'feed' (Histórico) | 'repertoire' | 'members' | 'stats' | 'financial' | 'setlists'
  const [activeTab, setActiveTab] = useState('feed');
  const BAND_TABS = ['feed', 'repertoire', 'members', 'stats', 'financial', 'setlists'];
  const translateX = useRef(new Animated.Value(0)).current;
  const tabOpacity = useRef(new Animated.Value(1)).current;
  const activeTabRef = useRef('feed');
  activeTabRef.current = activeTab;

  const handleTabChange = (nextTabId) => {
    if (nextTabId === activeTabRef.current) return;
    const oldIdx = BAND_TABS.indexOf(activeTabRef.current);
    const newIdx = BAND_TABS.indexOf(nextTabId);
    const direction = newIdx > oldIdx ? -1 : 1;

    // Transição suave com esmaecimento (fade-out + slide out, depois fade-in + slide in)
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: direction * 35,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.timing(tabOpacity, {
        toValue: 0.15,
        duration: 90,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setActiveTab(nextTabId);
      translateX.setValue(-direction * 35);
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          tension: 75,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(tabOpacity, {
          toValue: 1,
          duration: 140,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const [isTabSwiping, setIsTabSwiping] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 7 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 0.85;
      },
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 8 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 0.85;
      },
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => {
        translateX.stopAnimation();
        tabOpacity.stopAnimation();
        setIsTabSwiping(true);
      },
      onPanResponderMove: (evt, gestureState) => {
        const curIdx = BAND_TABS.indexOf(activeTabRef.current);
        const isFirst = curIdx === 0 && gestureState.dx > 0;
        const isLast = curIdx === BAND_TABS.length - 1 && gestureState.dx < 0;
        const damped = isFirst || isLast ? gestureState.dx * 0.22 : gestureState.dx;
        translateX.setValue(damped);

        // Esmaecimento dinâmico e suave conforme o usuário arrasta para o lado
        const dragProgress = Math.min(1, Math.abs(damped) / (width * 0.45));
        tabOpacity.setValue(Math.max(0.2, 1 - dragProgress * 0.8));
      },
      onPanResponderRelease: (evt, gestureState) => {
        setIsTabSwiping(false);
        const curIdx = BAND_TABS.indexOf(activeTabRef.current);
        const swipeThreshold = 25;
        const speedThreshold = 0.18;

        if ((gestureState.dx < -swipeThreshold || gestureState.vx < -speedThreshold) && curIdx < BAND_TABS.length - 1) {
          const nextTab = BAND_TABS[curIdx + 1];
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: -width * 0.35,
              duration: 90,
              useNativeDriver: true,
            }),
            Animated.timing(tabOpacity, {
              toValue: 0.1,
              duration: 90,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setActiveTab(nextTab);
            translateX.setValue(width * 0.35);
            Animated.parallel([
              Animated.spring(translateX, {
                toValue: 0,
                tension: 85,
                friction: 12,
                useNativeDriver: true,
              }),
              Animated.timing(tabOpacity, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
              }),
            ]).start();
          });
        } else if ((gestureState.dx > swipeThreshold || gestureState.vx > speedThreshold) && curIdx > 0) {
          const prevTab = BAND_TABS[curIdx - 1];
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: width * 0.35,
              duration: 90,
              useNativeDriver: true,
            }),
            Animated.timing(tabOpacity, {
              toValue: 0.1,
              duration: 90,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setActiveTab(prevTab);
            translateX.setValue(-width * 0.35);
            Animated.parallel([
              Animated.spring(translateX, {
                toValue: 0,
                tension: 85,
                friction: 12,
                useNativeDriver: true,
              }),
              Animated.timing(tabOpacity, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
              }),
            ]).start();
          });
        } else {
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: 0,
              tension: 85,
              friction: 12,
              useNativeDriver: true,
            }),
            Animated.timing(tabOpacity, {
              toValue: 1,
              duration: 140,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
      onPanResponderTerminate: () => {
        setIsTabSwiping(false);
        Animated.parallel([
          Animated.spring(translateX, {
            toValue: 0,
            tension: 85,
            friction: 12,
            useNativeDriver: true,
          }),
          Animated.timing(tabOpacity, {
            toValue: 1,
            duration: 140,
            useNativeDriver: true,
          }),
        ]).start();
      },
    })
  ).current;
  const [activityLogs, setActivityLogs] = useState([]);
  const [candidateInterests, setCandidateInterests] = useState([]);
  const [expandedTimelineMonths, setExpandedTimelineMonths] = useState({});
  const toggleTimelineMonth = (monthKey) => {
    setExpandedTimelineMonths(prev => ({
      ...prev,
      [monthKey]: !prev[monthKey]
    }));
  };
  const [onlineSetlists, setOnlineSetlists] = useState([]);
  const [isLoadingOnline, setIsLoadingOnline] = useState(false);
  const [isTurningOnline, setIsTurningOnline] = useState(false);

  // Band Image state with resilient error fallback
  const [currentBandImage, setCurrentBandImage] = useState(band?.bandImage || band?.imageUri || band?.image || band?.logo || '');
  const [imageLoadError, setImageLoadError] = useState(false);

  useEffect(() => {
    setCurrentBandImage(band?.bandImage || band?.imageUri || band?.image || band?.logo || '');
    setImageLoadError(false);
  }, [band?.id, band?.bandImage, band?.imageUri, band?.image, band?.logo]);

  // Compartilhar Agenda da banda (mesmo sistema da agenda do perfil)
  const [showShareAgendaModal, setShowShareAgendaModal] = useState(false);

  // Network Sync / Visibility & Cloud Collaboration State
  const [isNetworkVisible, setIsNetworkVisible] = useState(band?.isNetworkVisible === 1 || band?.isNetworkVisible === true);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusInfo, setSyncStatusInfo] = useState({
    isSynced: false,
    localVersion: band?.cloudVersion || 1,
    remoteVersion: band?.cloudVersion || 1,
    hasRemoteUpdates: false,
    lastSyncedAt: band?.lastSyncedAt || null
  });

  useEffect(() => {
    setIsNetworkVisible(band?.isNetworkVisible === 1 || band?.isNetworkVisible === true);
  }, [band?.id, band?.isNetworkVisible]);

  const loadSyncStatus = useCallback(async () => {
    if (!band?.id) return;
    try {
      const status = await bandService.checkSyncStatus(band.id);
      if (status) {
        setSyncStatusInfo(prev => ({
          ...prev,
          isSynced: status.isSynced,
          localVersion: status.localVersion !== undefined ? status.localVersion : prev.localVersion,
          remoteVersion: status.remoteVersion !== undefined ? status.remoteVersion : prev.remoteVersion,
          hasRemoteUpdates: Boolean(status.hasRemoteUpdates),
          lastSyncedAt: status.lastSyncedAt || prev.lastSyncedAt
        }));
      }
    } catch (e) {
      console.log('Error checking band sync status:', e);
    }
  }, [band?.id]);

  useEffect(() => {
    loadSyncStatus();
  }, [loadSyncStatus]);

  const handleToggleNetworkVisibility = async () => {
    const logged = await api.isLoggedIn();
    if (!logged) {
      Alert.alert(
        t('networkProfileRequired') || 'Perfil na Rede Necessário',
        t('networkProfileRequiredMsg') || 'Para sincronizar sua banda na rede BandLink e conectá-la a outros músicos, faça login ou complete seu perfil na aba Rede.',
        [{ text: t('ok') || 'Entendi' }]
      );
      return;
    }

    try {
      Vibration.vibrate(40);
    } catch (e) {}

    const nextState = !isNetworkVisible;
    setIsNetworkVisible(nextState);
    if (band) {
      band.isNetworkVisible = nextState ? 1 : 0;
    }

    if (band?.id) {
      await bandService.toggleNetworkVisibility(band.id, nextState);
      if (band.cloudId) {
        try {
          await api.toggleBandNetworkVisibility(band.cloudId, nextState);
        } catch (err) {
          console.warn('Erro ao atualizar visibilidade na nuvem:', err);
        }
      }
      if (onReloadAll) onReloadAll();
    }
  };

  const handlePushSyncToCloud = async () => {
    const logged = await api.isLoggedIn();
    if (!logged) {
      Alert.alert(t('attention') || 'Atenção', t('loginRequiredSync') || 'Faça login na sua conta BandLink para sincronizar com a nuvem.', [{ text: 'OK' }]);
      return;
    }

    try {
      setIsSyncing(true);
      Vibration.vibrate(50);
      const res = await bandService.syncBandToCloud(band.id, true);
      setSyncStatusInfo(prev => ({
        ...prev,
        isSynced: true,
        localVersion: res.version,
        remoteVersion: res.version,
        hasRemoteUpdates: false,
        lastSyncedAt: res.lastSyncedAt
      }));
      setIsNetworkVisible(Boolean(res.isNetworkVisible));
      if (band) {
        band.cloudId = res.cloudId;
        band.cloudVersion = res.version;
        band.lastSyncedAt = res.lastSyncedAt;
        band.isNetworkVisible = res.isNetworkVisible ? 1 : 0;
      }
      Alert.alert(t('syncSuccess') || 'Sincronizado!', t('syncSuccessAlert') || 'Todas as músicas, cifras, integrantes e setlists foram enviados para a nuvem.');
      if (onReloadAll) onReloadAll();
    } catch (err) {
      Alert.alert(t('attention') || 'Atenção', err.message || t('syncErrorAlert') || 'Falha ao sincronizar com a nuvem.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTurnBandOnline = async () => {
    const logged = await api.isLoggedIn();
    if (!logged) {
      Alert.alert(
        t('attention') || 'Atenção',
        t('loginRequiredSync') || 'Faça login na sua conta BandLink para conectar a banda à comunidade online.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setIsTurningOnline(true);
      if (typeof Vibration !== 'undefined') Vibration.vibrate(60);
      const res = await bandService.syncBandToCloud(band.id, true);
      if (res && res.cloudId) {
        band.cloudId = res.cloudId;
        band.cloudVersion = res.version;
        band.lastSyncedAt = res.lastSyncedAt;
        await bandService.logBandActivity(band.id, 'online_mode', 'conectou a banda à comunidade online!');
        await loadData();
        await loadSyncStatus();
        Alert.alert(
          t('onlineBand') || 'Banda Online',
          t('turnBandOnlineSuccess') || 'Banda conectada à nuvem com sucesso! Agora todas as alterações serão compartilhadas com os integrantes.'
        );
        if (onReloadAll) onReloadAll();
      }
    } catch (err) {
      console.error('Error turning band online:', err);
      Alert.alert(t('attention') || 'Atenção', err.message || 'Falha ao conectar banda à nuvem.');
    } finally {
      setIsTurningOnline(false);
    }
  };

  const handlePullSyncFromCloud = async () => {
    const logged = await api.isLoggedIn();
    if (!logged) {
      Alert.alert(t('attention') || 'Atenção', t('loginRequiredPull') || 'Faça login na sua conta BandLink para baixar as atualizações do líder.', [{ text: 'OK' }]);
      return;
    }

    try {
      setIsSyncing(true);
      Vibration.vibrate(50);
      await bandService.pullBandFromCloud(band.id);
      await loadData();
      await loadSyncStatus();
      Alert.alert(t('success') || 'Atualizado!', t('pullSuccessAlert') || 'Todas as músicas, cifras e setlists foram gravados no seu app offline!');
      if (onReloadAll) onReloadAll();
    } catch (err) {
      Alert.alert(t('attention') || 'Atenção', err.message || t('pullErrorAlert') || 'Falha ao baixar dados da nuvem.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSharePublicBandLink = async () => {
    const publicId = band?.cloudId || band?.id;
    const url = `https://bandlink.pro/banda?id=${publicId}`;
    try {
      await Share.share({
        title: `Banda ${band?.name || ''} no BandLink`,
        message: `Confira o perfil, repertório e agenda da banda ${band?.name || ''} no BandLink: ${url}`,
        url: url
      });
    } catch (e) {
      console.log('Error sharing band link:', e);
    }
  };

  // Band Repertoire Data
  const [bandSongs, setBandSongs] = useState([]);
  const [repertoireSearch, setRepertoireSearch] = useState('');
  const [showStyleFilters, setShowStyleFilters] = useState(false);
  const [selectedStyleFilters, setSelectedStyleFilters] = useState([]);

  // Song Collection Picker Modal with Checkboxes
  const [showSongPickerModal, setShowSongPickerModal] = useState(false);
  const [selectedPickerSongIds, setSelectedPickerSongIds] = useState(new Set());
  const [pickerSearch, setPickerSearch] = useState('');

  // Member Modal State
  const [members, setMembers] = useState([]);
  const [memberPhotos, setMemberPhotos] = useState({});
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [memberUsername, setMemberUsername] = useState('');
  const [selectedMusicianProfile, setSelectedMusicianProfile] = useState(null);
  const [showMusicianProfileModal, setShowMusicianProfileModal] = useState(false);
  const [memberStartDate, setMemberStartDate] = useState('');
  const [memberEndDate, setMemberEndDate] = useState('');
  const [memberStatus, setMemberStatus] = useState('active'); // 'active' | 'inactive' | 'pending'
  const [memberIsLeader, setMemberIsLeader] = useState(false);
  const [initialMemberStatus, setInitialMemberStatus] = useState('active');
  const [memberCycles, setMemberCycles] = useState([]);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [showInactiveMembers, setShowInactiveMembers] = useState(false);
  const [expandedMemberIds, setExpandedMemberIds] = useState(new Set());

  // Financial Modal State
  const [finances, setFinances] = useState([]);
  const [showAddFinanceModal, setShowAddFinanceModal] = useState(false);
  const [editingFinanceItem, setEditingFinanceItem] = useState(null);
  const [finTitle, setFinTitle] = useState('');
  const [finAmount, setFinAmount] = useState('');
  const [finType, setFinType] = useState('income'); // 'income' | 'expense'
  const [finDate, setFinDate] = useState('');
  const [finStatus, setFinStatus] = useState('paid'); // 'paid' | 'pending'
  const [finNotes, setFinNotes] = useState('');
  const [showFinDatePicker, setShowFinDatePicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [finShowMemberSplit, setFinShowMemberSplit] = useState(false);
  const [finMemberSplits, setFinMemberSplits] = useState({});

  // Repertoire Sort State
  const [repertoireSort, setRepertoireSort] = useState('name_asc'); // 'name_asc' | 'name_desc' | 'band_asc' | 'band_desc'
  const [showSortModal, setShowSortModal] = useState(false);


  // Year and Expansion state for Events and Finance
  const currentYearNum = new Date().getFullYear();
  const currentMonthNum = new Date().getMonth();
  const [selectedEventYear, setSelectedEventYear] = useState(currentYearNum);
  const [showEventYearPicker, setShowEventYearPicker] = useState(false);
  const [expandedEventMonths, setExpandedEventMonths] = useState({});
  const [selectedFinanceYear, setSelectedFinanceYear] = useState(currentYearNum);
  const [showFinanceYearPicker, setShowFinanceYearPicker] = useState(false);
  const [expandedFinanceMonths, setExpandedFinanceMonths] = useState({});
  const [showEditBandCashModal, setShowEditBandCashModal] = useState(false);
  const [bandCashInput, setBandCashInput] = useState('');
  const [bandCashNotesInput, setBandCashNotesInput] = useState('');
  const [bandCashBalance, setBandCashBalance] = useState(band?.manualCashBalance !== undefined && band?.manualCashBalance !== null ? band.manualCashBalance : null);

  const toggleEventMonth = (monthName) => {
    setExpandedEventMonths(prev => {
      const currentVal = prev[monthName] !== undefined ? prev[monthName] : true;
      return { ...prev, [monthName]: !currentVal };
    });
  };
  const toggleFinanceMonth = (monthName) => {
    setExpandedFinanceMonths(prev => ({ ...prev, [monthName]: !prev[monthName] }));
  };

  // My Member Profile State ("Quem é você nesta banda")
  const [myMemberId, setMyMemberId] = useState(band?.myMemberId || null);
  const [showWhoAreYouModal, setShowWhoAreYouModal] = useState(false);

  useEffect(() => {
    if (band) {
      setMyMemberId(band.myMemberId || null);
      if (band.manualCashBalance !== undefined && band.manualCashBalance !== null) {
        setBandCashBalance(band.manualCashBalance);
      }
    }
  }, [band]);

  // Band Header Action & Social Menus
  const [showBandOptionsMenu, setShowBandOptionsMenu] = useState(false);
  const [showBandSocialMenu, setShowBandSocialMenu] = useState(false);

  const getBandSocialLinks = () => {
    let parsed = {};
    if (band?.links) {
      try {
        parsed = typeof band.links === 'string' ? JSON.parse(band.links) : band.links;
      } catch (e) {}
    }
    return {
      instagram: band?.instagram || parsed?.instagram || '',
      youtube: band?.youtube || parsed?.youtube || '',
      spotify: band?.spotify || parsed?.spotify || '',
      tiktok: band?.tiktok || parsed?.tiktok || '',
      facebook: band?.facebook || parsed?.facebook || '',
    };
  };

  const handleOpenSocialLink = async (network, value) => {
    if (!value) return;
    const clean = value.trim();
    let url = clean;
    if (network === 'instagram') {
      const u = clean.replace(/^@+/, '');
      url = clean.startsWith('http') ? clean : `https://instagram.com/${u}`;
    } else if (network === 'youtube') {
      const u = clean.replace(/^@+/, '');
      url = clean.startsWith('http') ? clean : `https://youtube.com/@${u}`;
    } else if (network === 'spotify') {
      url = clean.startsWith('http') ? clean : (clean.includes('spotify.com') ? clean : `https://open.spotify.com/artist/${clean}`);
    } else if (network === 'tiktok') {
      const u = clean.replace(/^@+/, '');
      url = clean.startsWith('http') ? clean : `https://tiktok.com/@${u}`;
    } else if (network === 'facebook') {
      const u = clean.replace(/^@+/, '');
      url = clean.startsWith('http') ? clean : (clean.includes('facebook.com') ? `https://${clean}` : `https://facebook.com/${u}`);
    }

    try {
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert(t('error') || 'Erro', (t('couldNotOpenLinkMsg') || 'Não foi possível abrir o link: ') + url);
    }
  };

  const meMember = members.find(m => m.id === myMemberId);
  const hasAnyExplicitLeader = members.some(m => Number(m.isLeader) === 1);
  // O usuário é Líder se for marcado como isLeader === 1, ou se nenhum líder foi definido ainda (criador)
  const isUserLeader = meMember 
    ? (Number(meMember.isLeader) === 1 || !hasAnyExplicitLeader)
    : true;

  const bandSocialLinks = getBandSocialLinks();
  const hasAnySocialLink = Boolean(
    bandSocialLinks.instagram ||
    bandSocialLinks.youtube ||
    bandSocialLinks.spotify ||
    bandSocialLinks.tiktok ||
    bandSocialLinks.facebook
  );

  const detailBandTags = (() => {
    if (!band) return [];
    if (band.genres) {
      try {
        const parsed = typeof band.genres === 'string' && band.genres.startsWith('[')
          ? JSON.parse(band.genres)
          : String(band.genres).split(/[,/•;]+/).map(s => s.trim()).filter(Boolean);
        return parsed.slice(0, 6);
      } catch (e) {
        return String(band.genres).split(/[,/•;]+/).map(s => s.trim()).filter(Boolean).slice(0, 6);
      }
    }
    return [];
  })();

  const handleSelectMyMember = async (memberId) => {
    const newId = myMemberId === memberId ? null : memberId;
    setMyMemberId(newId);
    if (band && band.id) {
      await bandService.updateMyMemberId(band.id, newId);
    }
  };

  // Draggable Floating FAB PanResponder for Add (+) Button with screen border clamping
  const fabPan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const fabPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4;
      },
      onPanResponderGrant: () => {
        fabPan.setOffset({
          x: fabPan.x._value,
          y: fabPan.y._value,
        });
        fabPan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: fabPan.x, dy: fabPan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        fabPan.flattenOffset();
        const currentX = fabPan.x._value;
        const currentY = fabPan.y._value;
        const screenWidth = Dimensions.get('window').width;
        const screenHeight = Dimensions.get('window').height;

        // Calculate maximum allowed translation so button stays inside screen
        const minX = -(screenWidth - 60);
        const maxX = 10;
        const minY = -(screenHeight - 160);
        const maxY = 50;

        const clampedX = Math.max(minX, Math.min(maxX, currentX));
        const clampedY = Math.max(minY, Math.min(maxY, currentY));

        if (clampedX !== currentX || clampedY !== currentY) {
          Animated.spring(fabPan, {
            toValue: { x: clampedX, y: clampedY },
            useNativeDriver: false,
            friction: 7,
            tension: 50,
          }).start();
        }
      },
    })
  ).current;

  // Member Cachet Split Modal State
  const [showCacheSplitModal, setShowCacheSplitModal] = useState(false);
  const [selectedShowForSplit, setSelectedShowForSplit] = useState(null);
  const [selectedShowCacheStatus, setSelectedShowCacheStatus] = useState('paid');
  const [splitBandFund, setSplitBandFund] = useState('');
  const [memberSplits, setMemberSplits] = useState({});
  const [substitutes, setSubstitutes] = useState([]);

  // Load Band Data when modal opens or updates
  // REGRA MÓVEL: No modo online, APENAS consulte dados da API (nunca SQLite).
  // No modo offline, sempre o SQLite.
  const loadData = useCallback(async () => {
    if (!band || !band.id) return;

    if (band.cloudId) {
      // ==========================================
      // MODO ONLINE: APENAS DADOS DA API (NUNCA SQLITE)
      // ==========================================
      try {
        setIsLoadingOnline(true);
        const cloudData = await api.pullBand(band.cloudId);
        if (cloudData) {
          const pulledImg = cloudData.imageUri || (typeof cloudData.syncDataJson === 'string' ? (() => { try { return JSON.parse(cloudData.syncDataJson)?.band?.imageUri; } catch(e){ return null; } })() : cloudData.syncDataJson?.band?.imageUri);
          if (pulledImg) {
            setCurrentBandImage(pulledImg);
            setImageLoadError(false);
          }
          const snapshot = typeof cloudData.syncDataJson === 'string'
            ? (JSON.parse(cloudData.syncDataJson || '{}') || {})
            : (cloudData.syncDataJson || {});

          // 1. Músicas do Repertório da API (com fallback para SQLite)
          let apiSongs = Array.isArray(snapshot.songs) ? snapshot.songs : [];
          if (apiSongs.length === 0) {
            try {
              const sqliteSongs = await bandService.getBandSongs(band.id);
              if (sqliteSongs && sqliteSongs.length > 0) {
                apiSongs = sqliteSongs;
              }
            } catch (e) {}
          }
          setBandSongs(apiSongs.map(s => ({
            ...s,
            id: s.id || `cloud_${s.name}`,
            isFavorite: Boolean(s.isFavorite)
          })));

          // 2. Integrantes da API (tabela relacional da nuvem + dados do snapshot unificados)
          const cloudMembers = Array.isArray(cloudData.members) && cloudData.members.length > 0
            ? cloudData.members
            : [];
          const snapshotMembers = Array.isArray(snapshot.members) ? snapshot.members : [];

          const seenMemberKeys = new Set();
          const mergedApiMembers = [];

          for (const cm of cloudMembers) {
            const uClean = (cm.username || '').trim().toLowerCase().replace(/^@+/, '');
            const nameClean = (cm.displayName || cm.name || cm.username || '').trim().toLowerCase();
            const key = uClean || nameClean;
            if (key) seenMemberKeys.add(key);

            const matchSnap = snapshotMembers.find(sm => {
              const smUser = (sm.username || '').trim().toLowerCase().replace(/^@+/, '');
              const smName = (sm.name || '').trim().toLowerCase();
              return (smUser && smUser === uClean) || (smName && smName === nameClean);
            });

            mergedApiMembers.push({
              id: cm.id || cm.userId || `cloud_mem_${mergedApiMembers.length}`,
              userId: cm.userId || null,
              name: cm.displayName || cm.name || cm.username || matchSnap?.name || 'Membro',
              username: uClean,
              role: cm.role || matchSnap?.role || 'Member',
              phone: matchSnap?.phone || '',
              startDate: matchSnap?.startDate || '',
              endDate: matchSnap?.endDate || '',
              status: cm.status === 'Accepted' ? 'active' : (cm.status || 'active'),
              isLeader: cm.isLeader ? 1 : (cm.role === 'Leader' || cm.role === 'Admin' || matchSnap?.isLeader ? 1 : 0),
              pictureUrl: cm.pictureUrl || matchSnap?.pictureUrl || ''
            });
          }

          for (const sm of snapshotMembers) {
            const smUser = (sm.username || '').trim().toLowerCase().replace(/^@+/, '');
            const smName = (sm.name || '').trim().toLowerCase();
            const key = smUser || smName;
            if (key && seenMemberKeys.has(key)) continue;
            if (!sm.name && !smUser) continue;
            if (key) seenMemberKeys.add(key);

            mergedApiMembers.push({
              id: sm.id || `snap_mem_${mergedApiMembers.length}`,
              userId: sm.userId || null,
              name: sm.name || sm.displayName || sm.username || 'Membro',
              username: smUser,
              role: sm.role || 'Member',
              phone: sm.phone || '',
              startDate: sm.startDate || '',
              endDate: sm.endDate || '',
              status: sm.status === 'Accepted' ? 'active' : (sm.status || 'active'),
              isLeader: sm.isLeader ? 1 : (sm.role === 'Leader' || sm.role === 'Admin' ? 1 : 0),
              pictureUrl: sm.pictureUrl || ''
            });
          }

          if (mergedApiMembers.length === 0) {
            try {
              const sqliteMems = await bandService.getBandMembers(band.id);
              if (sqliteMems && sqliteMems.length > 0) {
                mergedApiMembers.push(...sqliteMems);
              }
            } catch (e) {}
          }
          setMembers(mergedApiMembers);

          // Fotos dos membros
          const photosMap = {};
          mergedApiMembers.forEach(m => {
            if (m.pictureUrl) photosMap[m.id] = m.pictureUrl;
          });
          setMemberPhotos(photosMap);

          // 3. Setlists / Agenda da API (snapshot + /api/Events)
          let apiSetlists = Array.isArray(snapshot.setlists) ? [...snapshot.setlists] : [];
          try {
            const apiEvents = await api.getEvents();
            if (Array.isArray(apiEvents)) {
              apiEvents.forEach(ev => {
                if (ev.bandId && String(ev.bandId) === String(band.cloudId)) {
                  const exists = apiSetlists.some(sl => 
                    (sl.cloudEventId && sl.cloudEventId === ev.id) ||
                    (String(sl.name || sl.title || '').toLowerCase().trim() === String(ev.title || '').toLowerCase().trim() && (sl.date || '').trim() === (ev.date || '').trim())
                  );
                  if (!exists) {
                    apiSetlists.push({
                      id: `cloud_ev_${ev.id}`,
                      cloudEventId: ev.id,
                      name: ev.title || 'Show',
                      title: ev.title || 'Show',
                      type: (ev.eventType || 'show').toLowerCase() === 'rehearsal' ? 'ensaio' : 'show',
                      date: ev.date || '',
                      time: ev.time || '',
                      local: ev.location || ev.city || '',
                      cachê: ev.cacheValue != null ? String(ev.cacheValue) : '',
                      notes: ev.notes || '',
                      status: ev.status,
                      cacheStatus: (ev.status === 'Confirmed' || ev.status === 'paid' || ev.status === 'Recebido') ? 'paid' : 'pending',
                      songs: []
                    });
                  }
                }
              });
            }
          } catch (e) {}

          let localBandSetlists = [];
          try {
            const localSl = await setlistService.getAll();
            const matchedSl = (localSl || []).filter(item => item && String(item.myBandId) === String(band.id));
            if (matchedSl.length > 0) {
              localBandSetlists = await Promise.all(
                matchedSl.map(async (lsl) => {
                  const lSongs = await setlistService.getSongsForSetlist(lsl.id);
                  return { ...lsl, songs: lSongs || [] };
                })
              );
            }
          } catch (e) {}

          if (apiSetlists.length === 0 && localBandSetlists.length > 0) {
            apiSetlists.push(...localBandSetlists);
          } else if (localBandSetlists.length > 0) {
            // Mescla setlists locais que ainda não estejam no apiSetlists (UI otimista para cópias e criações recentes)
            let hasUnsyncedLocalSetlists = false;
            for (const lsl of localBandSetlists) {
              const existsInApi = apiSetlists.some(asl =>
                (asl.id && String(asl.id) === String(lsl.id)) ||
                (asl.name && lsl.name && asl.name.trim().toLowerCase() === lsl.name.trim().toLowerCase() && String(asl.date || '').trim() === String(lsl.date || '').trim())
              );
              if (!existsInApi) {
                apiSetlists.push(lsl);
                hasUnsyncedLocalSetlists = true;
              }
            }
            if (hasUnsyncedLocalSetlists && band?.id && band?.cloudId) {
              bandService.syncBandToCloud(band.id).catch(err => {
                console.log('[BandSync] Auto-push de eventos locais pendentes para a nuvem:', err.message);
              });
            }
          }

          const allKnownBandSongs = [...(apiSongs || []), ...(allGeneralSongs || [])];

          setOnlineSetlists(apiSetlists.map(sl => {
            const isSlPaid = (sl.cacheStatus === 'paid' || sl.cacheStatus === 'Recebido') ||
                             (sl.cacheSplit?.status === 'paid') ||
                             (sl.status === 'Confirmed' || sl.status === 'paid' || sl.status === 'Recebido') ||
                             (!sl.cacheStatus && !sl.cacheSplit && !sl.status);
            const resolvedCacheStatus = isSlPaid ? 'paid' : 'pending';
            const localMatch = localBandSetlists.find(lsl =>
              (sl.id && String(lsl.id) === String(sl.id)) ||
              (lsl.name && sl.name && lsl.name.trim().toLowerCase() === sl.name.trim().toLowerCase() && String(lsl.date || '').trim() === String(sl.date || '').trim())
            );
            const rawSongs = (Array.isArray(sl.songs) && sl.songs.length > 0)
              ? sl.songs
              : (localMatch && Array.isArray(localMatch.songs) ? localMatch.songs : []);
            const hydratedSongs = rawSongs.map(s => {
              const sId = (s.id === -1 || s.id === -2) ? s.id : (s.songId !== undefined && s.songId !== null ? s.songId : s.id);
              if (sId === -1 || sId === -2) return { ...s, id: sId, songId: sId };
              const fullSong = allKnownBandSongs.find(ks =>
                (s.name && ks.name && ks.name.trim().toLowerCase() === s.name.trim().toLowerCase()) ||
                String(ks.id) === String(sId)
              );
              return {
                ...(fullSong || {}),
                ...s,
                id: fullSong?.id ?? sId,
                songId: fullSong?.id ?? sId,
              };
            });
            return {
              ...sl,
              id: localMatch?.id || sl.id || `cloud_sl_${sl.name}_${sl.date}`,
              myBandId: band.id,
              type: sl.type || 'show',
              date: sl.date || '',
              time: sl.time || '',
              local: sl.local || sl.venue || sl.location || '',
              cachê: sl.cache || sl.cachê || '',
              notes: sl.notes || '',
              cacheStatus: resolvedCacheStatus,
              cacheSplit: sl.cacheSplit || null,
              songs: hydratedSongs
            };
          }));

          // 4. Finanças da API
          const apiFinances = Array.isArray(snapshot.finances) ? snapshot.finances : [];
          setFinances(apiFinances.map((f, idx) => ({
            ...f,
            id: f.id || `cloud_fin_${idx}`,
            bandId: band.id,
            title: f.title || '',
            amount: f.amount || 0,
            type: f.type || 'income',
            date: f.date || '',
            status: f.status || 'paid',
            notes: f.notes || ''
          })));

          // 5. Linha do Tempo / Logs da API
          const apiLogs = Array.isArray(snapshot.activityLogs) ? snapshot.activityLogs : [];
          setActivityLogs(apiLogs.map((log, idx) => ({
            ...log,
            id: log.id || `cloud_log_${idx}`,
            bandId: band.id,
            actionType: log.actionType || 'update',
            authorName: log.authorName || 'Membro',
            description: log.description || '',
            createdAt: log.createdAt || ''
          })));

          // 6. Candidatos interessados
          try {
            const rawCand = await AsyncStorage.getItem('bandlink_candidate_interests');
            if (rawCand) {
              const parsedCand = JSON.parse(rawCand);
              if (Array.isArray(parsedCand)) {
                const bNameClean = (band.name || '').trim().toLowerCase();
                const matched = parsedCand.filter(item => {
                  if (band.id && item.bandId && String(item.bandId) === String(band.id)) return true;
                  if (band.cloudId && item.bandId && String(item.bandId) === String(band.cloudId)) return true;
                  if (bNameClean && item.bandName && item.bandName.trim().toLowerCase() === bNameClean) return true;
                  return false;
                });
                setCandidateInterests(matched);
              }
            }
          } catch (e) {}

          // 7. Saldo manual do Caixa da Banda (se configurado)
          if (snapshot.manualCashBalance !== undefined && snapshot.manualCashBalance !== null) {
            setBandCashBalance(parseFloat(snapshot.manualCashBalance) || 0);
          } else {
            setBandCashBalance(null);
          }
        }
      } catch (err) {
        console.error('Erro ao consultar dados da banda na API (Modo Online):', err);
      } finally {
        setIsLoadingOnline(false);
      }
    } else {
      // ==========================================
      // MODO OFFLINE: APENAS DADOS DO SQLITE
      // ==========================================
      try {
        const bSongs = await bandService.getBandSongs(band.id);
        setBandSongs(bSongs || []);

        const bMem = await bandService.getBandMembers(band.id);
        setMembers(bMem || []);

        // Carregar fotos dos membros vinculados com @username
        const photosMap = {};
        for (const m of (bMem || [])) {
          if (m.username) {
            try {
              const prof = await musiciansService.getMusicianByUsername(m.username, m.name);
              if (prof && prof.imageUri) {
                photosMap[m.id] = prof.imageUri;
              }
            } catch (e) {}
          }
        }
        setMemberPhotos(photosMap);

        const bFin = await bandService.getBandFinances(band.id);
        setFinances(bFin || []);

        const bLogs = await bandService.getBandActivityLogs(band.id, 50);
        setActivityLogs(bLogs || []);

        if (band.manualCashBalance !== undefined && band.manualCashBalance !== null) {
          setBandCashBalance(parseFloat(band.manualCashBalance) || 0);
        } else {
          try {
            const freshBand = await bandService.getBandById(band.id);
            if (freshBand && freshBand.manualCashBalance !== undefined && freshBand.manualCashBalance !== null) {
              setBandCashBalance(parseFloat(freshBand.manualCashBalance) || 0);
            }
          } catch (e) {}
        }
      } catch (err) {
        console.error('Erro ao consultar dados da banda no SQLite (Modo Offline):', err);
      }
    }
  }, [band]);

  const handleToggleBandSongFavorite = async (songId, currentIsFav) => {
    if (band && band.id) {
      if (band.cloudId) {
        try {
          setBandSongs(prev => prev.map(s => s.id === songId ? { ...s, isFavorite: !currentIsFav } : s));
          const cloudData = await api.pullBand(band.cloudId);
          const snapshot = typeof cloudData.syncDataJson === 'string'
            ? JSON.parse(cloudData.syncDataJson || '{}')
            : (cloudData.syncDataJson || {});
          if (Array.isArray(snapshot.songs)) {
            const matchS = snapshot.songs.find(s => s.id === songId || s.name === songId);
            if (matchS) matchS.isFavorite = !currentIsFav;
            await api.syncBand(band.cloudId, {
              name: band.name,
              genre: band.genre || '',
              description: band.description || '',
              imageUri: band.imageUri || '',
              city: band.city || '',
              state: band.state || '',
              country: band.country || '',
              syncDataJson: JSON.stringify(snapshot)
            });
          }
        } catch (e) {
          console.warn('Erro ao favoritar música online:', e);
        }
      } else {
        await bandService.toggleBandSongFavorite(band.id, songId, currentIsFav);
        await loadData();
      }
    }
  };

  useEffect(() => {
    if (visible && band && band.id) {
      loadData();
    }
  }, [visible, band?.id, band?.cloudId, loadData]);

  // Filter setlists belonging to this band sorted by date
  // MODO ONLINE: APENAS consulta os setlists da API (onlineSetlists) - NUNCA SQLite
  // MODO OFFLINE: consulta os setlists do SQLite (allSetlists)
  const bandSetlists = (band?.cloudId
    ? (onlineSetlists || [])
    : (allSetlists || []).filter(s => {
        if (!s || !band) return false;
        const sBandId = Number(s.myBandId || s.bandId);
        const bId = Number(band?.id);
        if (sBandId && sBandId === bId) return true;
        if (s.bandName && band?.name && s.bandName.trim().toLowerCase() === band.name.trim().toLowerCase()) return true;
        return false;
      })
  ).sort((a, b) => parseDateForSort(b.date) - parseDateForSort(a.date));

  // Eventos (shows) da banda no formato da arte de agenda do perfil
  const bandLogoUri = band?.imageUri || band?.image || band?.logo ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(band?.name || 'Banda')}&background=random`;
  const getShareDateInfo = (dateStr) => {
    const ts = parseDateForSort(dateStr);
    const badge = getFormattedDateBadge(dateStr, language);
    const d = ts ? new Date(ts) : null;
    const daysPt = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const daysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const daysEs = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const days = language === 'en' ? daysEn : language === 'es' ? daysEs : daysPt;
    const weekDay = d ? days[d.getDay()] : '';
    const month = badge.month ? (badge.month.length > 3 ? badge.month.slice(0, 3) : badge.month).toUpperCase() : '';
    return {
      day: badge.day,
      month,
      weekDay,
      formattedFull: d ? `${weekDay}, ${badge.day} ${badge.month}` : (dateStr || '')
    };
  };
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const shareableAgendaEvents = (bandSetlists || [])
    .filter(s => s && s.type === 'show')
    .slice()
    .sort((a, b) => parseDateForSort(a.date) - parseDateForSort(b.date))
    .map(s => {
      const dInfo = getShareDateInfo(s.date);
      return {
        id: s.id,
        name: s.name || s.local || t('untitledShow') || 'Show',
        local: s.local || '',
        time: s.time || '',
        date: dInfo.formattedFull,
        day: dInfo.day,
        month: dInfo.month,
        weekDay: dInfo.weekDay,
        band: band?.name || '',
        logo: bandLogoUri,
        _ts: parseDateForSort(s.date)
      };
    });
  const upcomingAgendaIds = shareableAgendaEvents.filter(e => e._ts >= todayStart.getTime()).map(e => e.id);
  const bandQrSlug = String(band?.name || 'banda').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const openShareBandAgenda = () => {
    if (shareableAgendaEvents.length === 0) {
      Alert.alert(
        t('emptyAgendaShareTitle') || 'Agenda vazia',
        t('emptyAgendaShareAlert') || 'Cadastre ao menos um show desta banda para compartilhar a agenda.'
      );
      return;
    }
    setShowShareAgendaModal(true);
  };

  // Separate pending, active and inactive members (rejected members are excluded so their card disappears)
  const pendingMembers = (members || []).filter(m => m.status === 'pending');
  const activeMembers = (members || []).filter(m => (m.status === 'active' || m.status === 'accepted' || (!m.status && m.status !== 'inactive' && m.status !== 'pending' && m.status !== 'rejected')) && m.status !== 'pending' && m.status !== 'rejected' && m.status !== 'inactive');
  const inactiveMembers = (members || []).filter(m => m.status === 'inactive');

  const handleOpenMemberProfile = async (member) => {
    const prof = await musiciansService.getMusicianByUsername(member?.username, member?.name);
    if (prof) {
      setSelectedMusicianProfile(prof);
      setShowMusicianProfileModal(true);
    }
  };

  // Member Cachet Split Handlers
  const handleOpenCacheSplitModal = async (showSetlist) => {
    setSelectedShowForSplit(showSetlist);
    setSelectedShowCacheStatus(showSetlist.cacheStatus || 'paid');
    let existing = await bandService.getShowCacheSplit(showSetlist.id);
    if (!existing || Object.keys(existing).length === 0) {
      if (showSetlist.cacheSplit && typeof showSetlist.cacheSplit === 'object') {
        existing = showSetlist.cacheSplit;
      }
    }
    const rawCache = showSetlist.cachê || showSetlist.cache || showSetlist.valCache || showSetlist.value;
    const totalVal = parseCurrency(rawCache);

    let initialFund = 0;
    if (existing && typeof existing === 'object') {
      if (existing.bandFund !== undefined) initialFund = parseFloat(existing.bandFund) || 0;
      else if (existing.band_fund !== undefined) initialFund = parseFloat(existing.band_fund) || 0;
      else if (showSetlist.cacheSplit?.bandFund !== undefined) initialFund = parseFloat(showSetlist.cacheSplit.bandFund) || 0;
    }
    setSplitBandFund(initialFund > 0 ? String(initialFund) : '');

    if (existing && Object.keys(existing).length > 0) {
      const subs = [];
      const memberEntries = {};

      if (existing.members && typeof existing.members === 'object') {
        Object.assign(memberEntries, existing.members);
      }

      if (Array.isArray(existing.substitutes)) {
        setSubstitutes(existing.substitutes);
      } else {
        Object.keys(existing).forEach(key => {
          if (key.startsWith('sub_')) {
            const idx = parseInt(key.split('_')[1], 10);
            subs[idx] = existing[key];
          } else if (key !== 'bandFund' && key !== 'band_fund' && key !== 'status' && key !== 'updatedAt' && key !== 'members' && key !== 'substitutes') {
            if (!memberEntries[key]) memberEntries[key] = existing[key];
          }
        });
        const parsedSubs = subs.filter(Boolean).map(s => {
          if (typeof s === 'object') return s;
          try { return JSON.parse(s); } catch(e) { return { name: '', amount: s }; }
        });
        setSubstitutes(parsedSubs.length > 0 ? parsedSubs : []);
      }
      setMemberSplits(memberEntries);
    } else {
      const activeM = activeMembers;
      const share = activeM.length > 0 ? (totalVal / activeM.length).toFixed(2) : '0';
      const initial = {};
      activeM.forEach(m => {
        initial[m.id] = share;
      });
      setMemberSplits(initial);
      setSubstitutes([]);
    }
    setShowCacheSplitModal(true);
  };

  const handleDivideCachetEqually = () => {
    if (!selectedShowForSplit) return;
    const rawCache = selectedShowForSplit.cachê || selectedShowForSplit.cache || selectedShowForSplit.valCache || selectedShowForSplit.value;
    const totalVal = parseCurrency(rawCache);
    const activeM = activeMembers;
    if (activeM.length === 0) return;

    // Subtrai valor destinado ao caixa da banda e aos substitutos (idêntico à Web)
    const fundVal = parseFloat(String(splitBandFund || '0').replace(',', '.')) || 0;
    let subsTotal = 0;
    substitutes.forEach(s => {
      subsTotal += parseFloat(String(s.amount || '0').replace(',', '.')) || 0;
    });

    const remain = Math.max(0, totalVal - fundVal - subsTotal);
    const share = (remain / activeM.length).toFixed(2);
    const updated = {};
    activeM.forEach(m => {
      updated[m.id] = share;
    });
    setMemberSplits(updated);
  };

  const handleSaveCachetSplit = async () => {
    if (!selectedShowForSplit) return;
    try {
      const fundVal = parseFloat(String(splitBandFund || '0').replace(',', '.')) || 0;
      // Merge member splits with substitute entries and bandFund
      const fullSplits = {
        ...memberSplits,
        bandFund: fundVal,
        band_fund: fundVal,
        status: selectedShowCacheStatus
      };

      // Mapeia tambem por nome, username e userId para garantir resolucao perfeita em todas as telas
      (activeMembers || []).forEach(m => {
        const val = memberSplits[m.id];
        if (val !== undefined && val !== null && val !== '') {
          if (m.name) fullSplits[m.name.trim()] = val;
          if (m.username) fullSplits[m.username.trim()] = val;
          if (m.userId) fullSplits[String(m.userId)] = val;
        }
      });

      substitutes.forEach((sub, idx) => {
        if (sub.name || sub.amount) {
          fullSplits[`sub_${idx}`] = JSON.stringify({ name: sub.name, amount: sub.amount });
        }
      });
      await bandService.saveShowCacheSplit(selectedShowForSplit.id, fullSplits, selectedShowCacheStatus);
      if (selectedShowForSplit.name && selectedShowForSplit.date) {
        const nameDateKey = `${selectedShowForSplit.name.trim().toLowerCase()}_${String(selectedShowForSplit.date).trim()}`;
        await bandService.saveShowCacheSplit(nameDateKey, fullSplits, selectedShowCacheStatus);
      }

      // Se for banda online, sincroniza o split no snapshot da nuvem
      if (band?.cloudId) {
        try {
          const cloudData = await api.pullBand(band.cloudId);
          const snapshot = typeof cloudData?.syncDataJson === 'string'
            ? (JSON.parse(cloudData.syncDataJson || '{}') || {})
            : (cloudData?.syncDataJson || {});

          if (Array.isArray(snapshot.setlists)) {
            const targetSl = snapshot.setlists.find(s =>
              (selectedShowForSplit.id && s.id === selectedShowForSplit.id) ||
              (s.name === selectedShowForSplit.name && s.date === selectedShowForSplit.date)
            );
            if (targetSl) {
              targetSl.cacheSplit = {
                members: { ...fullSplits },
                substitutes: [...substitutes],
                bandFund: fundVal,
                band_fund: fundVal,
                status: selectedShowCacheStatus,
                updatedAt: new Date().toISOString()
              };
              targetSl.cacheStatus = selectedShowCacheStatus;
              await api.syncBand(band.cloudId, {
                name: band.name,
                genre: band.genre || '',
                description: band.description || '',
                imageUri: band.imageUri || '',
                city: band.city || '',
                state: band.state || '',
                country: band.country || '',
                syncDataJson: JSON.stringify(snapshot)
              });
              if (band?.id) {
                await bandService.updateBandSyncDataJson(band.id, snapshot);
              }
            }
          }
        } catch (syncErr) {
          console.warn('Erro ao sincronizar split com a nuvem:', syncErr);
        }
      } else if (band?.id) {
        try {
          const localB = await bandService.getBandById(band.id);
          if (localB && localB.syncDataJson) {
            const snapshot = typeof localB.syncDataJson === 'string'
              ? JSON.parse(localB.syncDataJson || '{}')
              : (localB.syncDataJson || {});
            if (Array.isArray(snapshot.setlists)) {
              const targetSl = snapshot.setlists.find(s =>
                (selectedShowForSplit.id && s.id === selectedShowForSplit.id) ||
                (s.name === selectedShowForSplit.name && s.date === selectedShowForSplit.date)
              );
              if (targetSl) {
                targetSl.cacheSplit = {
                  members: { ...fullSplits },
                  substitutes: [...substitutes],
                  bandFund: fundVal,
                  band_fund: fundVal,
                  status: selectedShowCacheStatus,
                  updatedAt: new Date().toISOString()
                };
                targetSl.cacheStatus = selectedShowCacheStatus;
                await bandService.updateBandSyncDataJson(band.id, snapshot);
              }
            }
          }
        } catch (localErr) {}
      }

      await loadData();
      if (onReloadAll) onReloadAll();
      setShowCacheSplitModal(false);
      Alert.alert(t('success') || 'Sucesso', t('cacheSplitSuccess') || 'Divisão de cachê por integrante salva com sucesso!');
    } catch (err) {
      console.error('Error saving cache split:', err);
      Alert.alert(t('error') || 'Erro', t('errorSavingCacheSplit') || 'Não foi possível salvar a divisão do cachê.');
    }
  };

  const handleAddSubstitute = () => {
    setSubstitutes(prev => [...prev, { name: '', amount: '' }]);
  };

  const handleRemoveSubstitute = (idx) => {
    setSubstitutes(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateSubstitute = (idx, field, value) => {
    setSubstitutes(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const handleSaveBandCash = async () => {
    const cleanVal = String(bandCashInput).replace(/[^\d.,]/g, '').replace(',', '.');
    const parsedVal = parseFloat(cleanVal);
    if (isNaN(parsedVal) || parsedVal < 0) {
      Alert.alert(t('error') || 'Erro', t('validAmountRequired') || 'Informe um valor válido para o saldo do caixa.');
      return;
    }

    try {
      setBandCashBalance(parsedVal);
      if (band?.cloudId) {
        const cloudData = await api.pullBand(band.cloudId);
        const snapshot = typeof cloudData?.syncDataJson === 'string'
          ? (JSON.parse(cloudData.syncDataJson || '{}') || {})
          : (cloudData?.syncDataJson || {});

        snapshot.manualCashBalance = parsedVal;
        snapshot.manualCashUpdatedAt = new Date().toISOString();

        const notes = bandCashNotesInput.trim();
        if (notes) {
          if (!Array.isArray(snapshot.finances)) snapshot.finances = [];
          snapshot.finances.push({
            id: `fin_adjust_${Date.now()}`,
            title: `Ajuste de Caixa: ${notes}`,
            amount: parsedVal,
            type: 'income',
            date: new Date().toISOString().split('T')[0],
            status: 'paid',
            notes: notes,
            createdAt: new Date().toISOString()
          });
        }

        await api.syncBand(band.cloudId, {
          name: band.name,
          genre: band.genre || '',
          description: band.description || '',
          imageUri: band.imageUri || '',
          city: band.city || '',
          state: band.state || '',
          country: band.country || '',
          syncDataJson: JSON.stringify(snapshot)
        });
      } else {
        await bandService.updateBandCashBalance(band.id, parsedVal);
        const notes = bandCashNotesInput.trim();
        if (notes) {
          await bandService.addBandFinance(
            band.id,
            `Ajuste de Caixa: ${notes}`,
            parsedVal,
            'income',
            new Date().toISOString().split('T')[0],
            'paid',
            notes
          );
        }
        await bandService.logBandActivity(
          band.id,
          'updated_finance',
          `atualizou o saldo do caixa da banda para $ ${parsedVal.toFixed(2)}`
        );
      }

      setShowEditBandCashModal(false);
      setBandCashNotesInput('');
      await loadData();
      Alert.alert(t('success') || 'Sucesso', t('cashAdjustSuccess') || 'Saldo do caixa da banda atualizado com sucesso!');
    } catch (err) {
      console.error('Error saving band cash:', err);
      Alert.alert(t('error') || 'Erro', 'Não foi possível atualizar o saldo do caixa.');
    }
  };

  // Toggle member card expansion
  const handleToggleExpandMember = (id) => {
    if (typeof Vibration !== 'undefined') Vibration.vibrate(10);
    setExpandedMemberIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Financial Calculations including Show Caches
    const parseCurrency = (valStr) => {
    if (!valStr) return 0;
    if (typeof valStr === 'number') return valStr;
    let s = String(valStr);
    if (s.includes(',') && s.includes('.')) {
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
        s = s.replace(/\./g, '').replace(',', '.');
      } else {
        s = s.replace(/,/g, '');
      }
    } else if (s.includes(',')) {
      s = s.replace(',', '.');
    }
    return parseFloat(s.replace(/[^\d.-]/g, '')) || 0;
  };

  const autoShowFinances = [];
  bandSetlists.forEach(sl => {
    const rawCache = sl.cachê || sl.cache || sl.valCache || sl.value;
    if (sl.type === 'show' && rawCache) {
      const amt = parseCurrency(rawCache);
      if (amt > 0) {
        const isSlPaid = (sl.cacheStatus === 'paid' || sl.cacheStatus === 'Recebido') ||
                         (sl.cacheSplit?.status === 'paid') ||
                         (sl.status === 'Confirmed' || sl.status === 'paid' || sl.status === 'Recebido') ||
                         (!sl.cacheStatus && !sl.cacheSplit && !sl.status);
        autoShowFinances.push({
          id: `auto_show_${sl.id}`,
          title: `Show: ${sl.name || 'Sem título'}`,
          amount: amt,
          type: 'income',
          date: sl.date || '',
          status: isSlPaid ? 'paid' : 'pending',
          isAutoShow: true,
          rawSetlist: sl,
        });
      }
    }
  });

  const combinedFinances = [...autoShowFinances, ...finances];

  let totalIncome = 0;
  let totalExpense = 0;

  combinedFinances.forEach(f => {
    const itemYear = getMonthInfo(f.date, language).year;
    if (itemYear !== selectedFinanceYear) return;
    const amt = typeof f.amount === 'number' ? f.amount : (parseFloat(f.amount) || 0);
    if (f.type === 'income') {
      if (f.status === 'paid') totalIncome += amt;
    } else {
      if (f.status === 'paid') totalExpense += amt;
    }
  });

  const netBalance = totalIncome - totalExpense;

  // Caixa da Banda (Fundo de Reserva):
  // Se definido manualmente pelo usuário, usa bandCashBalance;
  // Caso contrário, calcula: (reserva dos shows + entradas manuais - despesas manuais)
  const effectiveBandCash = useMemo(() => {
    if (bandCashBalance !== null && bandCashBalance !== undefined && !isNaN(bandCashBalance)) {
      return parseFloat(bandCashBalance) || 0;
    }
    let totalFromShows = 0;
    (bandSetlists || []).forEach(sl => {
      if (sl.type === 'show') {
        const isPaid = (sl.cacheStatus === 'paid' || sl.cacheStatus === 'Recebido') ||
                       (sl.cacheSplit?.status === 'paid') ||
                       (sl.status === 'Confirmed' || sl.status === 'paid' || sl.status === 'Recebido') ||
                       (!sl.cacheStatus && !sl.cacheSplit && !sl.status);
        if (isPaid) {
          if (sl.cacheSplit?.bandFund !== undefined) {
            totalFromShows += (parseFloat(sl.cacheSplit.bandFund) || 0);
          } else if (sl.cacheSplit?.['band_fund'] !== undefined) {
            totalFromShows += (parseFloat(sl.cacheSplit['band_fund']) || 0);
          }
        }
      }
    });
    let manualInc = 0;
    let manualExp = 0;
    (finances || []).forEach(f => {
      const amt = typeof f.amount === 'number' ? f.amount : (parseFloat(f.amount) || 0);
      if (f.status === 'paid') {
        if (f.type === 'income') manualInc += amt;
        else manualExp += amt;
      }
    });
    return Math.max(0, totalFromShows + manualInc - manualExp);
  }, [bandCashBalance, autoShowFinances, finances]);

  const formatCompactMoney = (number) => {
    if (number == null || isNaN(number)) return '0';
    const num = Math.abs(Number(number));
    if (num >= 1000000) return (number / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 10000) return (number / 1000).toFixed(0) + 'k';
    if (num >= 1000) return (number / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return Math.round(number).toString();
  };

  // Filtered band repertoire (Favoritas no topo)
  const filteredBandSongs = bandSongs.filter(song => {
    const query = repertoireSearch.toLowerCase().trim();
    const matchesSearch = !query || 
      (song.name || '').toLowerCase().includes(query) ||
      (song.originalBand || '').toLowerCase().includes(query) ||
      (song.style || '').toLowerCase().includes(query);

    const matchesStyle = selectedStyleFilters.length === 0 || 
      selectedStyleFilters.some(filterTag => (song.style || '').toLowerCase().includes(filterTag.toLowerCase()));

    return matchesSearch && matchesStyle;
  }).sort((a, b) => {
    // Favoritas no topo
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;

    const safeCompare = (str1, str2) => {
      const s1 = (str1 || '').toLowerCase();
      const s2 = (str2 || '').toLowerCase();
      if (s1 < s2) return -1;
      if (s1 > s2) return 1;
      return 0;
    };

    if (repertoireSort === 'name_desc') {
      return safeCompare(b.name, a.name);
    } else if (repertoireSort === 'band_asc') {
      return safeCompare(a.originalBand, b.originalBand) || safeCompare(a.name, b.name);
    } else if (repertoireSort === 'band_desc') {
      return safeCompare(b.originalBand, a.originalBand) || safeCompare(a.name, b.name);
    } else {
      // default: name_asc
      return safeCompare(a.name, b.name);
    }
  });

  // Extract unique tags for repertoire filter
  const uniqueBandStyles = Array.from(new Set(
    bandSongs.flatMap(s => (s.style || '').split(/[,/•;]+/).map(tag => tag.trim()).filter(Boolean))
  ));

  // Calculate style breakdown percentages for the Statistics Dedicated Page
  const getStyleBreakdown = () => {
    if (bandSongs.length === 0) return [];
    const counts = {};
    let totalTags = 0;

    bandSongs.forEach(song => {
      if (song.style && song.style.trim()) {
        const tags = song.style.split(/[,/•;]+/).map(t => t.trim()).filter(Boolean);
        tags.forEach(tag => {
          counts[tag] = (counts[tag] || 0) + 1;
          totalTags += 1;
        });
      }
    });

    const items = Object.keys(counts).map((tag, idx) => ({
      tag,
      count: counts[tag],
      percentage: totalTags > 0 ? Math.round((counts[tag] / totalTags) * 100) : 0,
      color: STYLE_COLOR_PALETTE[idx % STYLE_COLOR_PALETTE.length]
    }));

    items.sort((a, b) => b.count - a.count);
    return items;
  };

  const styleBreakdown = getStyleBreakdown();

  // Available general songs for picker modal
  const availableGeneralSongs = allGeneralSongs.filter(s => {
    if (s.id < 0) return false;
    if (!pickerSearch.trim()) return true;
    const q = pickerSearch.toLowerCase().trim();
    return (s.name || '').toLowerCase().includes(q) || (s.originalBand || '').toLowerCase().includes(q);
  });

  // Song Checkbox Handlers
  const handleOpenSongPicker = () => {
    const currentIds = new Set(bandSongs.map(s => s.id));
    setSelectedPickerSongIds(currentIds);
    setPickerSearch('');
    setShowSongPickerModal(true);
  };

  const handleTogglePickerCheck = (songId) => {
    if (typeof Vibration !== 'undefined') Vibration.vibrate(10);
    setSelectedPickerSongIds(prev => {
      const next = new Set(prev);
      if (next.has(songId)) {
        next.delete(songId);
      } else {
        next.add(songId);
      }
      return next;
    });
  };

  const handleToggleSelectAllPicker = () => {
    if (selectedPickerSongIds.size === availableGeneralSongs.length) {
      setSelectedPickerSongIds(new Set());
    } else {
      const allIds = new Set(availableGeneralSongs.map(s => s.id));
      setSelectedPickerSongIds(allIds);
    }
  };

  const handleSavePickerSongs = async () => {
    try {
      if (typeof Vibration !== 'undefined') Vibration.vibrate(10);
      const targetIds = Array.from(selectedPickerSongIds);

      if (band.cloudId) {
        // MODO ONLINE: salva diretamente no snapshot da API
        const selectedSongsList = (allGeneralSongs || []).filter(s => targetIds.includes(s.id));
        const cloudData = await api.pullBand(band.cloudId);
        const snapshot = typeof cloudData.syncDataJson === 'string'
          ? JSON.parse(cloudData.syncDataJson || '{}')
          : (cloudData.syncDataJson || {});

        snapshot.songs = selectedSongsList.map(s => ({
          id: s.id,
          name: s.name,
          originalBand: s.originalBand || '',
          style: s.style || '',
          duration: s.duration || '',
          defaultView: s.defaultView || 'lyrics',
          lyrics: s.lyrics || '',
          chords: s.chords || '',
          tabs: s.tabs || '',
          isFavorite: bandSongs.find(bs => bs.id === s.id)?.isFavorite || false
        }));

        await api.syncBand(band.cloudId, {
          name: band.name,
          genre: band.genre || '',
          description: band.description || '',
          imageUri: band.imageUri || '',
          city: band.city || '',
          state: band.state || '',
          country: band.country || '',
          syncDataJson: JSON.stringify(snapshot)
        });
      } else {
        // MODO OFFLINE: salva no SQLite
        const currentIds = new Set(bandSongs.map(s => s.id));
        const toAdd = targetIds.filter(id => !currentIds.has(id));
        const toRemove = Array.from(currentIds).filter(id => !selectedPickerSongIds.has(id));

        if (toAdd.length > 0) {
          await bandService.addSongsToBand(band.id, toAdd);
        }
        for (const remId of toRemove) {
          await bandService.removeSongFromBand(band.id, remId);
        }
      }

      setShowSongPickerModal(false);
      await loadData();
    } catch (err) {
      console.error('Error saving band repertoire songs:', err);
      Alert.alert(t('error') || 'Erro', t('errorUpdatingBandSongs') || 'Não foi possível atualizar as músicas da banda.');
    }
  };

  const handleUnlinkSongConfirm = (song) => {
    Alert.alert(
      t('attention') || 'Atenção',
      `Remover "${song.name}" do repertório da banda ${band.name}? (A música continuará salva na Coleção Geral)`,
      [
        { text: t('cancel') || 'Cancelar', style: 'cancel' },
        {
          text: t('remove') || 'Remover',
          style: 'destructive',
          onPress: async () => {
            if (band.cloudId) {
              try {
                const cloudData = await api.pullBand(band.cloudId);
                const snapshot = typeof cloudData.syncDataJson === 'string'
                  ? JSON.parse(cloudData.syncDataJson || '{}')
                  : (cloudData.syncDataJson || {});
                if (Array.isArray(snapshot.songs)) {
                  snapshot.songs = snapshot.songs.filter(s => s.id !== song.id && s.name !== song.name);
                  await api.syncBand(band.cloudId, {
                    name: band.name,
                    genre: band.genre || '',
                    description: band.description || '',
                    imageUri: band.imageUri || '',
                    city: band.city || '',
                    state: band.state || '',
                    country: band.country || '',
                    syncDataJson: JSON.stringify(snapshot)
                  });
                }
              } catch (e) {
                console.warn('Erro ao desvincular música na nuvem:', e);
              }
            } else {
              await bandService.removeSongFromBand(band.id, song.id);
            }
            await loadData();
          },
        },
      ]
    );
  };

  // Band Member Handlers (Save / Edit / Delete)
  const handleSaveMember = async () => {
    if (!memberName.trim()) {
      Alert.alert(t('attention') || 'Atenção', t('enterMemberName') || 'Por favor, informe o nome do integrante.');
      return;
    }
    const roleTag = memberRole.trim() || (t('memberFallback') || 'Integrante');
    
    let updatedCycles = [...memberCycles];
    let finalStartDate = memberStartDate.trim();
    let finalEndDate = memberEndDate.trim();

    if (initialMemberStatus === 'active' && memberStatus === 'inactive') {
      if (!finalEndDate) {
        const today = new Date();
        finalEndDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
      }
      updatedCycles.push({
        startDate: finalStartDate,
        endDate: finalEndDate
      });
      finalStartDate = '';
      finalEndDate = '';
    } else if (initialMemberStatus === 'inactive' && memberStatus === 'active') {
      const today = new Date();
      finalStartDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
      finalEndDate = '';
    }

    try {
      const cleanUsername = memberUsername.trim().replace(/^@+/, '');
      if (band.cloudId) {
        // MODO ONLINE: salva diretamente na API e no snapshot da nuvem (nunca SQLite)
        if (cleanUsername) {
          try {
            await api.addBandMember(band.cloudId, {
              username: cleanUsername,
              role: roleTag,
              isLeader: Boolean(memberIsLeader)
            });
          } catch (apiErr) {
            console.warn('Erro ao salvar membro na API:', apiErr);
          }
        }
        try {
          const cloudData = await api.pullBand(band.cloudId);
          const snapshot = typeof cloudData.syncDataJson === 'string'
            ? JSON.parse(cloudData.syncDataJson || '{}')
            : (cloudData.syncDataJson || {});
          if (!snapshot.members) snapshot.members = [];
          const mIdx = snapshot.members.findIndex(m => m.id === editingMemberId || (cleanUsername && m.username && m.username.toLowerCase() === cleanUsername.toLowerCase()));
          const memPayload = {
            id: editingMemberId || `m_${Date.now()}`,
            name: memberName.trim(),
            role: roleTag,
            phone: memberPhone.trim(),
            startDate: finalStartDate,
            endDate: finalEndDate,
            status: memberStatus,
            cycles: JSON.stringify(updatedCycles),
            username: cleanUsername,
            isLeader: memberIsLeader ? 1 : 0
          };
          if (mIdx >= 0) {
            snapshot.members[mIdx] = { ...snapshot.members[mIdx], ...memPayload };
          } else {
            snapshot.members.push(memPayload);
          }
          await api.syncBand(band.cloudId, {
            name: band.name,
            genre: band.genre || '',
            description: band.description || '',
            imageUri: band.imageUri || '',
            city: band.city || '',
            state: band.state || '',
            country: band.country || '',
            syncDataJson: JSON.stringify(snapshot)
          });
        } catch (syncErr) {
          console.warn('Erro ao sincronizar membro no snapshot:', syncErr);
        }
      } else {
        // MODO OFFLINE: salva no SQLite
        if (editingMemberId) {
          const existingMember = members.find(m => m.id === editingMemberId);
          await bandService.updateBandMember(
            editingMemberId,
            memberName.trim(),
            roleTag,
            memberPhone.trim(),
            finalStartDate,
            finalEndDate,
            memberStatus,
            JSON.stringify(updatedCycles),
            cleanUsername,
            existingMember?.inviteMessage || '',
            existingMember?.replyMessage || '',
            memberIsLeader ? 1 : 0
          );
        } else {
          await bandService.addBandMember(
            band.id,
            memberName.trim(),
            roleTag,
            memberPhone.trim(),
            finalStartDate,
            finalEndDate,
            memberStatus,
            JSON.stringify(updatedCycles),
            cleanUsername,
            '',
            '',
            memberIsLeader ? 1 : 0
          );
        }
      }
      setMemberName('');
      setMemberRole('');
      setMemberPhone('');
      setMemberUsername('');
      setMemberStartDate('');
      setMemberEndDate('');
      setMemberStatus('active');
      setMemberIsLeader(false);
      setEditingMemberId(null);
      setShowMemberModal(false);
      await loadData();
    } catch (e) {
      console.error('Error in handleSaveMember:', e);
      Alert.alert(t('error') || 'Erro', t('errorSavingMember') || 'Não foi possível salvar o integrante.');
    }
  };

  const handleOpenAddMember = () => {
    setEditingMemberId(null);
    setMemberName('');
    setMemberRole('');
    setMemberPhone('');
    setMemberUsername('');
    setMemberStartDate('');
    setMemberEndDate('');
    setMemberStatus('active');
    setMemberIsLeader(false);
    setInitialMemberStatus('active');
    setMemberCycles([]);
    setShowMemberModal(true);
  };

  const handleOpenEditMember = (member) => {
    setEditingMemberId(member.id);
    setMemberName(member.name || '');
    setMemberRole(member.role || '');
    setMemberPhone(member.phone || '');
    setMemberUsername(member.username ? `@${member.username.replace(/^@+/, '')}` : '');
    setMemberStartDate(member.startDate || '');
    setMemberEndDate(member.endDate || '');
    setMemberStatus(member.status || 'active');
    setMemberIsLeader(Number(member.isLeader) === 1);
    setInitialMemberStatus(member.status || 'active');
    let cycles = [];
    if (member.cycles) {
      try {
        cycles = typeof member.cycles === 'string' ? JSON.parse(member.cycles) : member.cycles;
      } catch (e) {}
    }
    setMemberCycles(cycles);
    setShowMemberModal(true);
  };

  const handleCancelEditMember = () => {
    setEditingMemberId(null);
    setMemberName('');
    setMemberRole('');
    setMemberPhone('');
    setMemberUsername('');
    setMemberStartDate('');
    setMemberEndDate('');
    setMemberStatus('active');
    setMemberIsLeader(false);
    setInitialMemberStatus('active');
    setMemberCycles([]);
    setShowMemberModal(false);
  };

  const handleToggleMemberRole = (member) => {
    if (!isUserLeader) {
      Alert.alert(
        t('attention') || 'Atenção',
        t('onlyLeadersCanChangeRoles') || 'Apenas o criador ou líderes da banda podem alterar cargos e privilégios.'
      );
      return;
    }

    const currentlyLeader = Number(member.isLeader) === 1;
    if (currentlyLeader) {
      // Se for o único líder, avisar
      const totalLeaders = members.filter(m => Number(m.isLeader) === 1).length;
      if (member.id === myMemberId && totalLeaders <= 1) {
        Alert.alert(
          t('attention') || 'Atenção',
          'A banda precisa ter ao menos um líder ativo para continuar sendo gerenciada.'
        );
        return;
      }

      Alert.alert(
        t('changeMemberPositionTitle') || 'Nível de Acesso do Integrante',
        (t('demoteMemberConfirm') || 'Deseja alterar o nível de "{name}" para Membro?\n\nEle não poderá mais editar a banda, apenas visualizar e compartilhar a agenda.').replace('{name}', member.name),
        [
          { text: t('cancel') || 'Cancelar', style: 'cancel' },
          {
            text: t('demoteToMember') || 'Alterar para Membro',
            style: 'destructive',
            onPress: async () => {
              await bandService.updateMemberLeaderStatus(member.id, 0);
              await loadData();
            }
          }
        ]
      );
    } else {
      Alert.alert(
        t('changeMemberPositionTitle') || 'Nível de Acesso do Integrante',
        (t('promoteMemberConfirm') || 'Deseja promover "{name}" a Líder da banda?\n\nEle terá privilégios para editar informações, gerenciar integrantes, repertório e finanças.').replace('{name}', member.name),
        [
          { text: t('cancel') || 'Cancelar', style: 'cancel' },
          {
            text: t('promoteToLeader') || 'Promover a Líder',
            onPress: async () => {
              if (band.cloudId) {
                try {
                  const cloudData = await api.pullBand(band.cloudId);
                  const snapshot = typeof cloudData.syncDataJson === 'string'
                    ? JSON.parse(cloudData.syncDataJson || '{}')
                    : (cloudData.syncDataJson || {});
                  if (Array.isArray(snapshot.members)) {
                    const matchM = snapshot.members.find(m => m.id === member.id || (member.username && m.username === member.username));
                    if (matchM) {
                      matchM.isLeader = 1;
                      matchM.role = 'Leader';
                    }
                    await api.syncBand(band.cloudId, {
                      name: band.name,
                      genre: band.genre || '',
                      description: band.description || '',
                      imageUri: band.imageUri || '',
                      city: band.city || '',
                      state: band.state || '',
                      country: band.country || '',
                      syncDataJson: JSON.stringify(snapshot)
                    });
                  }
                } catch (e) {
                  console.warn('Erro ao promover membro online:', e);
                }
              } else {
                await bandService.updateMemberLeaderStatus(member.id, 1);
              }
              await loadData();
            }
          }
        ]
      );
    }
  };

  const handleDeleteMember = (member) => {
    Alert.alert(
      t('attention') || 'Atenção',
      `${t('removeMemberConfirmTitle')} ${member.name} (${member.role || (t('memberFallback') || 'Integrante')}) ${t('removeMemberConfirmMsg')}?`,
      [
        { text: t('cancel') || 'Cancelar', style: 'cancel' },
        {
          text: t('removeMemberConfirmTitle') || 'Remover',
          style: 'destructive',
          onPress: async () => {
            if (band.cloudId) {
              // MODO ONLINE: remove da API e do snapshot
              if (member.userId) {
                try {
                  await api.removeBandMember(band.cloudId, member.userId);
                } catch (e) {}
              }
              try {
                const cloudData = await api.pullBand(band.cloudId);
                const snapshot = typeof cloudData.syncDataJson === 'string'
                  ? JSON.parse(cloudData.syncDataJson || '{}')
                  : (cloudData.syncDataJson || {});
                if (Array.isArray(snapshot.members)) {
                  snapshot.members = snapshot.members.filter(m => m.id !== member.id && (!member.username || m.username !== member.username));
                  await api.syncBand(band.cloudId, {
                    name: band.name,
                    genre: band.genre || '',
                    description: band.description || '',
                    imageUri: band.imageUri || '',
                    city: band.city || '',
                    state: band.state || '',
                    country: band.country || '',
                    syncDataJson: JSON.stringify(snapshot)
                  });
                }
              } catch (e) {}
            } else {
              // MODO OFFLINE: remove do SQLite
              await bandService.deleteBandMember(member.id);
            }
            if (editingMemberId === member.id) handleCancelEditMember();
            await loadData();
          }
        }
      ]
    );
  };

  const handleOpenWhatsApp = (phoneStr) => {
    if (!phoneStr) return;
    const cleanNumber = phoneStr.replace(/[^\d]/g, '');
    if (!cleanNumber) return;
    const fullNumber = cleanNumber.length <= 11 ? `55${cleanNumber}` : cleanNumber;
    const url = `https://wa.me/${fullNumber}`;
    Linking.openURL(url).catch(() => {
      Alert.alert(t('error') || 'Erro', t('errorWhatsApp') || 'Não foi possível abrir o WhatsApp.');
    });
  };

  // Handlers for Financial Entry Modal
  const handleOpenAddFinance = () => {
    setEditingFinanceItem(null);
    setFinTitle('');
    setFinAmount('');
    setFinType('income');
    const today = new Date().toLocaleDateString('pt-BR');
    setFinDate(today);
    setFinStatus('paid');
    setFinNotes('');
    setFinShowMemberSplit(false);
    setFinMemberSplits({});
    setShowAddFinanceModal(true);
  };

  const handleOpenEditFinance = (item) => {
    setEditingFinanceItem(item);
    setFinTitle(item.title);
    setFinAmount(String(item.amount));
    setFinType(item.type);
    setFinDate(item.date || '');
    setFinStatus(item.status || 'paid');
    // Parse member splits from notes if they exist
    let notes = item.notes || '';
    let savedSplits = {};
    try {
      if (notes.startsWith('{"_memberSplits":')) {
        const parsed = JSON.parse(notes);
        savedSplits = parsed._memberSplits || {};
        notes = parsed._notes || '';
      }
    } catch (e) {}
    setFinNotes(notes);
    setFinMemberSplits(savedSplits);
    setFinShowMemberSplit(Object.keys(savedSplits).length > 0);
    setShowAddFinanceModal(true);
  };

  const handleSaveFinanceEntry = async () => {
    if (!finTitle.trim()) {
      Alert.alert(t('attention') || 'Atenção', t('enterFinanceDesc') || 'Por favor, informe a descrição do lançamento.');
      return;
    }
    const parsedAmt = parseCurrency(finAmount);
    if (parsedAmt <= 0) {
      Alert.alert(t('attention') || 'Atenção', t('enterValidAmount') || 'Por favor, informe um valor válido.');
      return;
    }

    // Encode member splits into notes JSON if enabled
    let notesToSave = finNotes.trim();
    if (finShowMemberSplit && Object.keys(finMemberSplits).length > 0) {
      notesToSave = JSON.stringify({ _memberSplits: finMemberSplits, _notes: finNotes.trim() });
    }

    try {
      if (band.cloudId) {
        // MODO ONLINE: salva diretamente no snapshot da API
        const cloudData = await api.pullBand(band.cloudId);
        const snapshot = typeof cloudData.syncDataJson === 'string'
          ? JSON.parse(cloudData.syncDataJson || '{}')
          : (cloudData.syncDataJson || {});
        if (!snapshot.finances) snapshot.finances = [];
        const finPayload = {
          id: editingFinanceItem?.id || `fin_${Date.now()}`,
          title: finTitle.trim(),
          amount: parsedAmt,
          type: finType,
          date: finDate.trim(),
          status: finStatus,
          notes: notesToSave
        };
        const fIdx = snapshot.finances.findIndex(f => f.id === editingFinanceItem?.id);
        if (fIdx >= 0) {
          snapshot.finances[fIdx] = finPayload;
        } else {
          snapshot.finances.unshift(finPayload);
        }
        await api.syncBand(band.cloudId, {
          name: band.name,
          genre: band.genre || '',
          description: band.description || '',
          imageUri: band.imageUri || '',
          city: band.city || '',
          state: band.state || '',
          country: band.country || '',
          syncDataJson: JSON.stringify(snapshot)
        });
      } else {
        // MODO OFFLINE: salva no SQLite
        if (editingFinanceItem) {
          await bandService.updateFinancialEntry(
            editingFinanceItem.id,
            finTitle.trim(),
            parsedAmt,
            finType,
            finDate.trim(),
            finStatus,
            notesToSave
          );
        } else {
          await bandService.addFinancialEntry(
            band.id,
            finTitle.trim(),
            parsedAmt,
            finType,
            finDate.trim(),
            finStatus,
            notesToSave
          );
        }
      }
      setShowAddFinanceModal(false);
      await loadData();
    } catch (e) {
      console.error('Error saving financial entry:', e);
      Alert.alert(t('error') || 'Erro', t('errorSavingFinance') || 'Não foi possível salvar o lançamento financeiro.');
    }
  };

  const handleFinDivideEqually = () => {
    const parsedAmt = parseCurrency(finAmount);
    const activeM = activeMembers;
    if (activeM.length === 0 || parsedAmt <= 0) return;
    const share = (parsedAmt / activeM.length).toFixed(2);
    const updated = {};
    activeM.forEach(m => { updated[m.id] = share; });
    setFinMemberSplits(updated);
  };

  const handleToggleFinanceStatus = async (item) => {
    try {
      if (band.cloudId) {
        // MODO ONLINE: atualiza no snapshot da nuvem
        const nextStatus = item.status === 'paid' ? 'pending' : 'paid';
        const cloudData = await api.pullBand(band.cloudId);
        const snapshot = typeof cloudData.syncDataJson === 'string'
          ? JSON.parse(cloudData.syncDataJson || '{}')
          : (cloudData.syncDataJson || {});
        if (Array.isArray(snapshot.finances)) {
          const matchF = snapshot.finances.find(f => f.id === item.id);
          if (matchF) matchF.status = nextStatus;
          await api.syncBand(band.cloudId, {
            name: band.name,
            genre: band.genre || '',
            description: band.description || '',
            imageUri: band.imageUri || '',
            city: band.city || '',
            state: band.state || '',
            country: band.country || '',
            syncDataJson: JSON.stringify(snapshot)
          });
        }
      } else {
        await bandService.toggleFinanceStatus(item.id, item.status || 'paid');
      }
      await loadData();
    } catch (e) {
      console.error('Error toggling finance status:', e);
    }
  };

  const handleDeleteFinanceEntry = (item) => {
    Alert.alert(
      t('attention') || 'Atenção',
      `${t('deleteFinanceConfirmMsg') || 'Excluir o lançamento'} "${item.title}"?`,
      [
        { text: t('cancel') || 'Cancelar', style: 'cancel' },
        {
          text: t('delete') || 'Excluir',
          style: 'destructive',
          onPress: async () => {
            if (band.cloudId) {
              // MODO ONLINE: remove da nuvem
              try {
                const cloudData = await api.pullBand(band.cloudId);
                const snapshot = typeof cloudData.syncDataJson === 'string'
                  ? JSON.parse(cloudData.syncDataJson || '{}')
                  : (cloudData.syncDataJson || {});
                if (Array.isArray(snapshot.finances)) {
                  snapshot.finances = snapshot.finances.filter(f => f.id !== item.id);
                  await api.syncBand(band.cloudId, {
                    name: band.name,
                    genre: band.genre || '',
                    description: band.description || '',
                    imageUri: band.imageUri || '',
                    city: band.city || '',
                    state: band.state || '',
                    country: band.country || '',
                    syncDataJson: JSON.stringify(snapshot)
                  });
                }
              } catch (e) {}
            } else {
              await bandService.deleteFinancialEntry(item.id);
            }
            await loadData();
          }
        }
      ]
    );
  };

  // Helper for Member Period Badge Display
  const getMemberPeriodText = (m) => {
    const start = (m.startDate || '').trim();
    const end = (m.endDate || '').trim();
    if (!start && !end) return null;
    if (start && end) return `${start} ${t('until') || 'até'} ${end}`;
    if (start && !end) return m.status === 'inactive' ? `${t('since') || 'Desde'} ${start}` : `${t('since') || 'Desde'} ${start} (${t('current') || 'Atual'})`;
    if (!start && end) return `${t('untilCapital') || 'Até'} ${end}`;
    return null;
  };

  const parseTimelineDate = (dStr) => {
    if (!dStr) return 0;
    const clean = String(dStr).trim();
    if (clean.includes('/')) {
      const parts = clean.split('/');
      if (parts.length === 3) {
        let yr = parseInt(parts[2], 10);
        if (yr < 100) yr += 2000;
        return new Date(yr, parseInt(parts[1], 10) - 1, parseInt(parts[0], 10)).getTime();
      }
    } else if (clean.includes('-')) {
      const parts = clean.split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getTime();
      }
    }
    const d = new Date(clean);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  };

  const unifiedTimelineEvents = useMemo(() => {
    if (!band) return [];
    const list = [];
    const seenEventKeys = new Set();

    // 1. Mensagens de candidatos interessados
    (candidateInterests || []).forEach(ci => {
      const d = ci.createdAt ? new Date(ci.createdAt) : null;
      const ts = d && !isNaN(d.getTime()) ? d.getTime() : Date.now();
      list.push({
        id: `cand_${ci.id || ts}_${list.length}`,
        timestamp: ts,
        isInterest: true,
        actionType: 'candidate_interest',
        title: language === 'en'
          ? `${ci.authorDisplayName || ci.authorUsername || 'Candidate'} showed interest in the opening for ${ci.instrument || 'Musician'}!`
          : language === 'es'
          ? `¡${ci.authorDisplayName || ci.authorUsername || 'Candidato'} demostró interés en la vacante de ${ci.instrument || 'Músico'}!`
          : `${ci.authorDisplayName || ci.authorUsername || 'Candidato'} demonstrou interesse na vaga de ${ci.instrument || 'Músico'}!`,
        message: ci.message,
        phone: ci.phone,
        username: ci.authorUsername,
        createdAt: new Date(ts).toISOString(),
      });
    });

    // 2. Logs de atividade explícitos (do snapshot ou SQLite)
    (activityLogs || []).forEach(l => {
      if (l.actionType === 'created_band' || l.actionType === 'band_created') return;
      const d = l.createdAt ? new Date(l.createdAt) : null;
      const ts = d && !isNaN(d.getTime()) ? d.getTime() : Date.now();
      const desc = l.description || 'realizou uma alteração';
      const key = `${l.actionType}_${desc}_${l.createdAt}`;
      if (seenEventKeys.has(key)) return;
      seenEventKeys.add(key);

      list.push({
        id: l.id || `act_${ts}_${list.length}`,
        timestamp: ts,
        actionType: l.actionType || 'update',
        authorName: l.authorName || 'Integrante',
        description: desc,
        createdAt: l.createdAt || new Date(ts).toISOString(),
      });
    });

    // 3. Eventos e Setlists da Agenda adicionados na banda
    (bandSetlists || []).forEach(sl => {
      const isRehearsal = sl.type === 'rehearsal' || (sl.name || '').toLowerCase().includes('ensaio');
      let ts = 0;
      if (sl.updatedAt) {
        const d = new Date(sl.updatedAt);
        if (!isNaN(d.getTime())) ts = d.getTime();
      }
      if (!ts && sl.createdAt) {
        const d = new Date(sl.createdAt);
        if (!isNaN(d.getTime())) ts = d.getTime();
      }
      if (!ts && sl.date) {
        ts = parseTimelineDate(sl.date);
      }
      if (!ts) ts = Date.now();

      const desc = `${isRehearsal ? (t('rehearsalScheduled') || 'Ensaio agendado') : (t('showScheduled') || 'Show agendado')}: ${sl.name || 'Sem título'}${sl.local ? ` em ${sl.local}` : ''}`;
      const key = `sl_${sl.name}_${sl.date}`;
      if (seenEventKeys.has(key)) return;
      seenEventKeys.add(key);

      list.push({
        id: `sl_${sl.id || ts}`,
        timestamp: ts,
        actionType: isRehearsal ? 'rehearsal_scheduled' : 'show_scheduled',
        authorName: t('agenda') || 'Agenda',
        description: desc,
        createdAt: new Date(ts).toISOString(),
      });
    });

    // 4. Registro de sincronização do repertório
    const songsCount = (bandSongs || []).length;
    const setlistsCount = (bandSetlists || []).length;
    if (songsCount > 0 || setlistsCount > 0) {
      let ts = Date.now();
      if (band?.lastSyncedAt) {
        const d = new Date(band.lastSyncedAt);
        if (!isNaN(d.getTime())) ts = d.getTime();
      }
      const songWord = language === 'en' ? (songsCount === 1 ? 'song' : 'songs') : (language === 'es' ? (songsCount === 1 ? 'canción' : 'canciones') : (songsCount === 1 ? 'música' : 'músicas'));
      const setlistWord = language === 'en' ? (setlistsCount === 1 ? 'setlist' : 'setlists') : (language === 'es' ? (setlistsCount === 1 ? 'setlist' : 'setlists') : (setlistsCount === 1 ? 'setlist' : 'setlists'));
      const andWord = language === 'en' ? 'and' : (language === 'es' ? 'y' : 'e');
      const syncedWord = language === 'en' ? 'synced' : (language === 'es' ? 'sincronizados' : 'sincronizados');
      const repWord = language === 'en' ? 'Repertoire' : (language === 'es' ? 'Repertorio' : 'Repertório');

      list.push({
        id: `sync_${ts}`,
        timestamp: ts,
        actionType: 'repertoire_sync',
        authorName: t('syncLabel') || 'Sincronização',
        description: `${repWord}: ${songsCount} ${songWord} ${andWord} ${setlistsCount} ${setlistWord} ${syncedWord}`,
        createdAt: new Date(ts).toISOString(),
      });
    }

    // 5. Criação do projeto / banda
    let createdTs = 0;
    if (band?.createdAt) {
      const d = new Date(band.createdAt);
      if (!isNaN(d.getTime())) createdTs = d.getTime();
    }
    if (!createdTs && band?.sinceYear) {
      const y = parseInt(band.sinceYear, 10);
      if (!isNaN(y)) createdTs = new Date(y, 0, 1).getTime();
    }
    if (!createdTs) createdTs = new Date(2020, 0, 1).getTime();

    const createdWord = language === 'en' ? 'Creation of project' : (language === 'es' ? 'Creación del proyecto' : 'Criação do projeto');
    const inWord = language === 'en' ? 'in' : (language === 'es' ? 'en' : 'em');

    list.push({
      id: `created_${createdTs}`,
      timestamp: createdTs,
      actionType: 'band_created',
      authorName: t('foundation') || 'Fundação',
      description: `${createdWord} ${band?.name || 'Banda'}${band?.city ? ` ${inWord} ${band.city}${band?.state ? '/' + band.state : ''}` : ''}`,
      createdAt: new Date(createdTs).toISOString(),
    });

    list.sort((a, b) => b.timestamp - a.timestamp);
    return list;
  }, [candidateInterests, activityLogs, bandSetlists, bandSongs, band, language]);

  const timelineMonthGroups = useMemo(() => {
    const monthNames = language === 'en'
      ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      : language === 'es'
      ? ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
      : ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    const groups = {};
    const keys = [];

    (unifiedTimelineEvents || []).forEach(ev => {
      const dt = new Date(ev.timestamp);
      let yr = dt.getFullYear();
      let mIdx = dt.getMonth();
      if (isNaN(yr) || yr < 1970) {
        yr = new Date().getFullYear();
        mIdx = new Date().getMonth();
      }
      const key = `${yr}-${String(mIdx + 1).padStart(2, '0')}`;
      if (!groups[key]) {
        groups[key] = {
          key,
          title: `${monthNames[mIdx] || 'Mês'} ${yr}`,
          list: []
        };
        keys.push(key);
      }
      groups[key].list.push(ev);
    });

    keys.sort((a, b) => b.localeCompare(a));
    return { groups, keys };
  }, [unifiedTimelineEvents, language]);

  if (!visible || !band) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onBack}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        
        {/* OUTER SCROLLVIEW COM CABEÇALHO RETRÁTIL E MENU DE ABAS FIXO (STICKY) */}
        <ScrollView
          style={{ flex: 1 }}
          stickyHeaderIndices={[1]}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          scrollEnabled={!isTabSwiping}
        >
          {/* INDEX 0: HEADER HERO MODERNO COM IMAGEM TRANSLÚCIDA E DEGRADÊ */}
          <View style={[styles.headerHeroContainer, { backgroundColor: isDark ? '#09090b' : '#1e293b' }]}>
            {/* 1. Imagem da banda em full-width */}
            {(currentBandImage && !imageLoadError) ? (
              <View style={[StyleSheet.absoluteFillObject, { opacity: isDark ? 0.85 : 0.92, overflow: 'hidden' }]} pointerEvents="none">
                <Image
                  source={{ uri: currentBandImage }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                  onError={() => setImageLoadError(true)}
                />
              </View>
            ) : (
              <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.primary, opacity: 0.15 }]}>
                <Ionicons name="musical-notes" size={60} color={colors.primary} style={{position: 'absolute', top: 20, left: 30, opacity: 0.3, transform: [{rotate: '-15deg'}]}} />
                <Ionicons name="mic-outline" size={80} color={colors.primary} style={{position: 'absolute', top: 60, right: 40, opacity: 0.2, transform: [{rotate: '25deg'}]}} />
                <Ionicons name="headset-outline" size={50} color={colors.primary} style={{position: 'absolute', bottom: 40, left: '40%', opacity: 0.25}} />
              </View>
            )}

            {/* 2. Degradê suave mantendo a foto do background bem visível */}
            <LinearGradient
              colors={[
                'rgba(0, 0, 0, 0.50)',
                'transparent',
                'transparent',
                'rgba(0, 0, 0, 0.20)',
              ]}
              locations={[0, 0.22, 0.65, 1]}
              style={StyleSheet.absoluteFillObject}
              pointerEvents="none"
            />

            {/* Barra de Navegação Superior - Glassmorphism */}
            <View style={styles.topRowNav}>
              <Pressable style={[styles.headerIconButton, { backgroundColor: 'rgba(0,0,0,0.35)', borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1 }]} onPress={onBack}>
                <Ionicons name="arrow-back" size={20} color="#ffffff" />
              </Pressable>

              <View style={styles.topRowActions}>
                {/* MENU EXPANDIDO DE OPÇÕES DA BANDA (Delete, Nuvem, Página Pública, Editar) */}
                {showBandOptionsMenu ? (
                  <View style={styles.headerActionPillRow}>
                    {/* Botão Publicar Banda Online (Exibido quando a banda for Offline) */}
                    {!band?.cloudId && (
                      <Pressable
                        style={[
                          styles.headerActionPillBtn,
                          { backgroundColor: 'rgba(56, 189, 248, 0.25)', borderColor: '#38bdf8', borderWidth: 1 }
                        ]}
                        onPress={async () => {
                          setShowBandOptionsMenu(false);
                          const logged = await api.isLoggedIn();
                          if (!logged) {
                            Alert.alert(
                              t('attention') || 'Atenção',
                              'Você precisa estar conectado a uma conta para publicar a banda na nuvem.',
                              [{ text: 'OK' }]
                            );
                            return;
                          }
                          setShowPublishModal(true);
                        }}
                        accessibilityLabel="Publicar Banda Online"
                      >
                        <Ionicons name="cloud-upload" size={17} color="#38bdf8" />
                      </Pressable>
                    )}

                    {/* Página Pública da Banda */}
                    {onOpenPublicProfile && (
                      <Pressable
                        style={styles.headerActionPillBtn}
                        onPress={() => {
                          setShowBandOptionsMenu(false);
                          onOpenPublicProfile(band);
                        }}
                        accessibilityLabel="Página Pública da Banda"
                      >
                        <Ionicons name="globe-outline" size={17} color="#38bdf8" />
                      </Pressable>
                    )}

                    {/* Editar Banda */}
                    {isUserLeader && (
                      <Pressable
                        style={styles.headerActionPillBtn}
                        onPress={() => {
                          setShowBandOptionsMenu(false);
                          onEditBand(band);
                        }}
                        accessibilityLabel="Editar Banda"
                      >
                        <Ionicons name="pencil" size={16} color="#fbbf24" />
                      </Pressable>
                    )}

                    {/* Excluir Banda */}
                    {isUserLeader && (
                      <Pressable
                        style={[styles.headerActionPillBtn, { backgroundColor: 'rgba(239,68,68,0.25)' }]}
                        onPress={() => {
                          setShowBandOptionsMenu(false);
                          onDeleteBand(band);
                        }}
                        accessibilityLabel="Excluir Banda"
                      >
                        <Ionicons name="trash-outline" size={16} color="#fca5a5" />
                      </Pressable>
                    )}

                    {/* Fechar Opções */}
                    <Pressable
                      style={[styles.headerActionPillBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                      onPress={() => setShowBandOptionsMenu(false)}
                      accessibilityLabel="Fechar Opções"
                    >
                      <Ionicons name="close" size={17} color="#ffffff" />
                    </Pressable>
                  </View>
                ) : showBandSocialMenu ? (
                  /* MENU EXPANDIDO DE REDES SOCIAIS / LINKS EXTERNOS */
                  <View style={styles.headerActionPillRow}>
                    {bandSocialLinks.instagram ? (
                      <Pressable
                        style={styles.headerActionPillBtn}
                        onPress={() => handleOpenSocialLink('instagram', bandSocialLinks.instagram)}
                        accessibilityLabel="Instagram"
                      >
                        <Ionicons name="logo-instagram" size={17} color="#E1306C" />
                      </Pressable>
                    ) : null}

                    {bandSocialLinks.youtube ? (
                      <Pressable
                        style={styles.headerActionPillBtn}
                        onPress={() => handleOpenSocialLink('youtube', bandSocialLinks.youtube)}
                        accessibilityLabel="YouTube"
                      >
                        <Ionicons name="logo-youtube" size={17} color="#FF0000" />
                      </Pressable>
                    ) : null}

                    {bandSocialLinks.spotify ? (
                      <Pressable
                        style={styles.headerActionPillBtn}
                        onPress={() => handleOpenSocialLink('spotify', bandSocialLinks.spotify)}
                        accessibilityLabel="Spotify"
                      >
                        <FontAwesome name="spotify" size={17} color="#1DB954" />
                      </Pressable>
                    ) : null}

                    {bandSocialLinks.tiktok ? (
                      <Pressable
                        style={styles.headerActionPillBtn}
                        onPress={() => handleOpenSocialLink('tiktok', bandSocialLinks.tiktok)}
                        accessibilityLabel="TikTok"
                      >
                        <Ionicons name="logo-tiktok" size={16} color="#ffffff" />
                      </Pressable>
                    ) : null}

                    {bandSocialLinks.facebook ? (
                      <Pressable
                        style={styles.headerActionPillBtn}
                        onPress={() => handleOpenSocialLink('facebook', bandSocialLinks.facebook)}
                        accessibilityLabel="Facebook"
                      >
                        <Ionicons name="logo-facebook" size={17} color="#1877F2" />
                      </Pressable>
                    ) : null}

                    {!hasAnySocialLink && (
                      <Pressable
                        style={{ paddingHorizontal: 8, paddingVertical: 4 }}
                        onPress={() => {
                          setShowBandSocialMenu(false);
                          if (isUserLeader && onEditBand) onEditBand(band);
                        }}
                      >
                        <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700' }}>
                          {isUserLeader ? (t('addSocialLinksInEdit') || '+ Adicionar Links') : (t('noSocialLinksSet') || 'Sem redes')}
                        </Text>
                      </Pressable>
                    )}

                    {/* Fechar Redes */}
                    <Pressable
                      style={[styles.headerActionPillBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                      onPress={() => setShowBandSocialMenu(false)}
                      accessibilityLabel="Fechar Redes Sociais"
                    >
                      <Ionicons name="close" size={17} color="#ffffff" />
                    </Pressable>
                  </View>
                ) : (
                  /* ESTADO PADRÃO: BOTÕES COMPACTOS (NUVEM + REDES SOCIAIS + OPÇÕES) */
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {/* Botão Único de Redes Sociais */}
                    {(hasAnySocialLink || isUserLeader) && (
                      <Pressable
                        style={[
                          styles.headerIconButton,
                          {
                            backgroundColor: 'rgba(0,0,0,0.35)',
                            borderColor: hasAnySocialLink ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.15)',
                            borderWidth: 1,
                          }
                        ]}
                        onPress={() => {
                          setShowBandSocialMenu(true);
                          setShowBandOptionsMenu(false);
                        }}
                        accessibilityLabel={t('socialNetworks') || 'Redes Sociais'}
                      >
                        <Ionicons name="link-outline" size={18} color="#ffffff" />
                      </Pressable>
                    )}

                    {/* Botão Único de Opções da Banda */}
                    <Pressable
                      style={[
                        styles.headerIconButton,
                        {
                          backgroundColor: 'rgba(0,0,0,0.35)',
                          borderColor: 'rgba(255,255,255,0.15)',
                          borderWidth: 1,
                        }
                      ]}
                      onPress={() => {
                        setShowBandOptionsMenu(true);
                        setShowBandSocialMenu(false);
                      }}
                      accessibilityLabel={t('bandOptions') || 'Opções da Banda'}
                    >
                      <Ionicons name="ellipsis-vertical" size={18} color="#ffffff" />
                    </Pressable>
                  </View>
                )}
              </View>
            </View>

            {/* NOME DA BANDA SOBRE O DEGRADÊ (base do header) */}
            <View style={styles.headerBandInfoBottom}>
              {(!currentBandImage || imageLoadError) && (
                <Text style={styles.headerInitialsBig}>{getBandInitials(band.name)}</Text>
              )}
              <Text style={styles.headerBandNameText}>{band.name}</Text>

              {/* 2ª Linha: Cidade, Estado, País */}
              {(band.city || band.state || band.country) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 4 }}>
                  <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.95)" />
                  <Text style={{
                    color: '#ffffff',
                    fontSize: 12,
                    fontWeight: '600',
                    textAlign: 'center',
                    textShadowColor: 'rgba(0, 0, 0, 0.85)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 4,
                  }}>
                    {[band.city, band.state].filter(Boolean).join(', ')
                      ? `${[band.city, band.state].filter(Boolean).join(', ')}${band.country ? ` • ${band.country}` : ''}`
                      : band.country}
                  </Text>
                </View>
              )}

              {/* 3ª Linha: Pílulas Cover / Autoral + Status Online/Offline + Tags de Estilo */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 6 }}>
                {/* Status Online / Offline */}
                <View style={{
                  backgroundColor: band.cloudId ? 'rgba(16, 185, 129, 0.25)' : 'rgba(148, 163, 184, 0.25)',
                  borderColor: band.cloudId ? '#10b981' : 'rgba(255, 255, 255, 0.4)',
                  borderWidth: 1,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: band.cloudId ? '#10b981' : '#94a3b8' }} />
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                    {band.cloudId ? (t('onlineBand') || 'Online') : (t('offlineBand') || 'Offline')}
                  </Text>
                </View>

                {(band.isCover === 1 || band.isCover === true || (band.bandType && band.bandType.includes('cover')) || (!band.bandType && band.isCover === undefined)) && (
                  <View style={{ backgroundColor: 'rgba(56, 189, 248, 0.2)', borderColor: 'rgba(56, 189, 248, 0.4)', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                    <Text style={{ color: '#38bdf8', fontSize: 11, fontWeight: '700' }}>{t('proposalCover') || 'Cover'}</Text>
                  </View>
                )}
                {(band.isAutoral === 1 || band.isAutoral === true || (band.bandType && band.bandType.includes('autoral'))) && (
                  <View style={{ backgroundColor: 'rgba(168, 85, 247, 0.2)', borderColor: 'rgba(168, 85, 247, 0.4)', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                    <Text style={{ color: '#c084fc', fontSize: 11, fontWeight: '700' }}>{t('proposalOriginal') || 'Autoral'}</Text>
                  </View>
                )}
                {(band.isProfissional === 1 || band.isProfissional === true || (band.interestLevel && band.interestLevel.includes('profissional'))) && (
                  <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: 'rgba(16, 185, 129, 0.4)', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                    <Text style={{ color: '#34d399', fontSize: 11, fontWeight: '700' }}>{t('proposalProfessional') || 'Profissional'}</Text>
                  </View>
                )}
                {(band.isCasual === 1 || band.isCasual === true || (band.interestLevel && band.interestLevel.includes('casual'))) && (
                  <View style={{ backgroundColor: 'rgba(236, 72, 153, 0.2)', borderColor: 'rgba(236, 72, 153, 0.4)', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                    <Text style={{ color: '#f472b6', fontSize: 11, fontWeight: '700' }}>{t('proposalCasual') || 'Casual'}</Text>
                  </View>
                )}
                {detailBandTags.map((tag, idx) => (
                  <View key={idx} style={{ backgroundColor: 'rgba(0,0,0,0.4)', borderColor: 'rgba(255,255,255,0.25)', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

        {/* TOP TAB BAR DE 6 PÁGINAS SOMENTE ÍCONES COM DEGRADÊ CINTILANTE */}
        <View style={[styles.tabBarContainer, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
          <View style={styles.tabBarRow}>
            
            <Pressable
              style={[styles.tabItemIconOnly, activeTab === 'feed' && [styles.activeTabItem, { borderBottomColor: colors.primary }]]}
              onPress={() => handleTabChange('feed')}
            >
              <View style={{ position: 'relative', paddingHorizontal: 4 }}>
                <Ionicons
                  name={activeTab === 'feed' ? "time" : "time-outline"}
                  size={22}
                  color={activeTab === 'feed' ? colors.primary : colors.textMuted}
                />
                {syncStatusInfo.hasRemoteUpdates && (
                  <View style={{ position: 'absolute', top: -3, right: -4, backgroundColor: '#ef4444', borderRadius: 6, width: 8, height: 8 }} />
                )}
              </View>
            </Pressable>

            <Pressable
              style={[styles.tabItemIconOnly, activeTab === 'repertoire' && [styles.activeTabItem, { borderBottomColor: colors.primary }]]}
              onPress={() => handleTabChange('repertoire')}
            >
              <View style={{position: 'relative', paddingHorizontal: 4}}>
                <Ionicons
                  name={activeTab === 'repertoire' ? "musical-notes" : "musical-notes-outline"}
                  size={22}
                  color={activeTab === 'repertoire' ? colors.primary : colors.textMuted}
                />
                {bandSongs.length > 0 && (
                  <View style={{position: 'absolute', top: -4, right: -4, backgroundColor: colors.primary, borderRadius: 10, minWidth: 14, height: 14, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3}}>
                    <Text style={{color: '#ffffff', fontSize: 9, fontWeight: 'bold'}}>{bandSongs.length}</Text>
                  </View>
                )}
              </View>
            </Pressable>

            <Pressable
              style={[styles.tabItemIconOnly, activeTab === 'members' && [styles.activeTabItem, { borderBottomColor: colors.primary }]]}
              onPress={() => handleTabChange('members')}
            >
              <View style={{position: 'relative', paddingHorizontal: 4}}>
                <Ionicons
                  name={activeTab === 'members' ? "people" : "people-outline"}
                  size={22}
                  color={activeTab === 'members' ? colors.primary : colors.textMuted}
                />
                {activeMembers.length > 0 && (
                  <View style={{position: 'absolute', top: -4, right: -4, backgroundColor: colors.primary, borderRadius: 10, minWidth: 14, height: 14, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3}}>
                    <Text style={{color: '#ffffff', fontSize: 9, fontWeight: 'bold'}}>{activeMembers.length}</Text>
                  </View>
                )}
              </View>
            </Pressable>

            <Pressable
              style={[styles.tabItemIconOnly, activeTab === 'stats' && [styles.activeTabItem, { borderBottomColor: colors.primary }]]}
              onPress={() => handleTabChange('stats')}
            >
              <Ionicons
                name={activeTab === 'stats' ? "stats-chart" : "stats-chart-outline"}
                size={22}
                color={activeTab === 'stats' ? colors.primary : colors.textMuted}
              />
            </Pressable>

            <Pressable
              style={[styles.tabItemIconOnly, activeTab === 'financial' && [styles.activeTabItem, { borderBottomColor: colors.primary }]]}
              onPress={() => handleTabChange('financial')}
            >
              <Ionicons
                name={activeTab === 'financial' ? "wallet" : "wallet-outline"}
                size={22}
                color={activeTab === 'financial' ? colors.primary : colors.textMuted}
              />
            </Pressable>

            <Pressable
              style={[styles.tabItemIconOnly, activeTab === 'setlists' && [styles.activeTabItem, { borderBottomColor: colors.primary }]]}
              onPress={() => handleTabChange('setlists')}
              accessibilityLabel={t('bandAgendaTab') || 'Agenda e Setlists'}
            >
              <Ionicons
                name={activeTab === 'setlists' ? "calendar" : "calendar-outline"}
                size={22}
                color={activeTab === 'setlists' ? colors.primary : colors.textMuted}
              />
            </Pressable>

          </View>
        </View>

        {/* ── CONTEÚDO DAS ABAS DA BANDA COM TRANSIÇÃO SUAVE E GESTO DE ARRASTAR ── */}
        <Animated.View
          {...panResponder.panHandlers}
          style={{ flex: 1, opacity: tabOpacity, transform: [{ translateX }] }}
        >
        {/* ABA 0: FEED DE ATIVIDADES E SINCRONIZAÇÃO */}
        {activeTab === 'feed' && (
          <ScrollView
            style={styles.tabContentFlex}
            contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Status Card: Offline ou Online */}
            {!band.cloudId ? (
              // BANDA OFFLINE
              <View style={{
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 16,
                padding: 16,
                marginBottom: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 6,
                elevation: 2,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? '#334155' : '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                    <Ionicons name="cloud-offline-outline" size={22} color={colors.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{t('offlineBand') || 'Banda Offline'}</Text>
                      <View style={{ backgroundColor: isDark ? '#334155' : '#e2e8f0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted }}>LOCAL</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                      {t('turnBandOnlineDesc') || 'Esta banda está armazenada apenas neste dispositivo. Conecte-a à comunidade para sincronizar com os integrantes.'}
                    </Text>
                  </View>
                </View>

                <Pressable
                  style={{
                    backgroundColor: colors.primary,
                    borderRadius: 12,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    marginTop: 4,
                  }}
                  onPress={handleTurnBandOnline}
                  disabled={isTurningOnline}
                >
                  {isTurningOnline ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload" size={18} color="#ffffff" />
                      <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 14 }}>
                        {t('turnBandOnline') || 'Tornar Banda Online'}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            ) : null}

            {/* Cabeçalho da Linha do Tempo / Histórico */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <View>
                <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>
                  {t('bandFeedTitle') || 'Alterações'}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  {t('bandFeedSubtitle') || 'Linha do tempo das mudanças feitas na banda'}
                </Text>
              </View>
              {unifiedTimelineEvents.length > 0 && (
                <View style={{ backgroundColor: colors.cardBackground, borderColor: colors.border, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted }}>
                    {unifiedTimelineEvents.length} {unifiedTimelineEvents.length === 1 ? (t('record') || 'registro') : (t('records') || 'registros')}
                  </Text>
                </View>
              )}
            </View>

            {/* Lista da Linha do Tempo com Réguas Mensais */}
            {unifiedTimelineEvents.length === 0 ? (
              <View style={{
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 16,
                padding: 32,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 8
              }}>
                <Ionicons name="time-outline" size={44} color={colors.textMuted} style={{ marginBottom: 12, opacity: 0.6 }} />
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'center' }}>
                  {t('noBandActivity') || 'Nenhuma atividade registrada ainda.'}
                </Text>
                <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 18 }}>
                  Criações e edições de setlists, inclusões de músicas, membros e cifras aparecerão aqui em tempo real.
                </Text>
              </View>
            ) : (
              <View style={{ marginTop: 4 }}>
                {(() => {
                  const now = new Date();
                  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

                  return (timelineMonthGroups?.keys || []).map((monthKey, gIdx) => {
                    const g = timelineMonthGroups?.groups?.[monthKey];
                    if (!g) return null;
                    const isCurrentMonth = monthKey === currentMonthKey;
                    const isExpanded = expandedTimelineMonths[monthKey] !== undefined ? expandedTimelineMonths[monthKey] : (gIdx === 0 || isCurrentMonth);

                    return (
                      <View key={monthKey} style={{ marginBottom: 10 }}>
                        {/* Régua Mensal (Cabeçalho do Mês) */}
                        <Pressable
                          onPress={() => toggleTimelineMonth(monthKey)}
                          style={{
                            marginTop: 10,
                            marginBottom: 8,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8
                          }}
                        >
                          <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            backgroundColor: colors.primary + '18',
                            borderColor: colors.primary + '40',
                            borderWidth: 1,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 12
                          }}>
                            <Ionicons name="time-outline" size={12} color={colors.primary} />
                            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary }}>
                              {g.list.length}
                            </Text>
                          </View>

                          <Text style={{ fontSize: 11, fontWeight: '900', color: colors.primary, letterSpacing: 0.8 }}>
                            {g.title.toUpperCase()}
                          </Text>

                          <View style={{ flex: 1, height: 1, backgroundColor: colors.border, opacity: 0.5 }} />

                          <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
                        </Pressable>

                        {/* Itens do Mês */}
                        {isExpanded && (
                          <View style={{ marginTop: 2 }}>
                            {g.list.map((logItem, index) => {
                              const itemStyle = getActivityIconAndColor(logItem.actionType, colors);
                              const isLast = index === g.list.length - 1;

                              if (logItem.isInterest) {
                                return (
                                  <View
                                    key={`tl_${logItem.id || index}_${index}`}
                                    style={{
                                      backgroundColor: '#22c55e10',
                                      borderColor: '#22c55e35',
                                      borderWidth: 1,
                                      borderRadius: 14,
                                      padding: 12,
                                      marginBottom: isLast ? 6 : 10,
                                    }}
                                  >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                      <View style={{ backgroundColor: '#22c55e25', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: '#22c55e50' }}>
                                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#22c55e' }}>
                                          {t('candidateLabel') || 'CANDIDATO'}
                                        </Text>
                                      </View>
                                      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted }}>
                                        {formatActivityDateTime(logItem.createdAt, language)}
                                      </Text>
                                    </View>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 4 }}>
                                      {logItem.title}
                                    </Text>
                                    {logItem.message ? (
                                      <View style={{
                                        backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.7)',
                                        borderLeftWidth: 3,
                                        borderLeftColor: '#22c55e',
                                        padding: 8,
                                        borderRadius: 6,
                                        marginVertical: 6,
                                      }}>
                                        <Text style={{ fontSize: 12, color: colors.text, fontStyle: 'italic', lineHeight: 16 }}>
                                          "{logItem.message}"
                                        </Text>
                                      </View>
                                    ) : null}
                                    {logItem.phone ? (
                                      <Text style={{ fontSize: 11, color: '#22c55e', fontWeight: '600', marginTop: 2 }}>
                                        {(t('contact') || 'Contato')}: {logItem.phone}
                                      </Text>
                                    ) : null}
                                  </View>
                                );
                              }

                              return (
                                <View key={logItem.id || index} style={{ flexDirection: 'row', minHeight: 64 }}>
                                  {/* Timeline Coluna Esquerda: Ícone e Linha Conectora */}
                                  <View style={{ alignItems: 'center', width: 38, marginRight: 12 }}>
                                    <View style={{
                                      width: 36,
                                      height: 36,
                                      borderRadius: 18,
                                      backgroundColor: itemStyle.bg,
                                      justifyContent: 'center',
                                      alignItems: 'center',
                                      borderWidth: 1.5,
                                      borderColor: itemStyle.color
                                    }}>
                                      <Ionicons name={itemStyle.icon} size={17} color={itemStyle.color} />
                                    </View>
                                    {!isLast && (
                                      <View style={{
                                        width: 2,
                                        flex: 1,
                                        backgroundColor: colors.border,
                                        marginVertical: 4,
                                      }} />
                                    )}
                                  </View>

                                  {/* Card de Conteúdo da Atividade */}
                                  <View style={{
                                    flex: 1,
                                    backgroundColor: colors.cardBackground,
                                    borderColor: colors.border,
                                    borderWidth: 1,
                                    borderRadius: 12,
                                    padding: 12,
                                    marginBottom: isLast ? 6 : 12,
                                  }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted }}>
                                        {formatActivityDateTime(logItem.createdAt, language)}
                                      </Text>
                                      {logItem.authorName && (
                                        <View style={{ backgroundColor: isDark ? '#1e293b' : '#f1f5f9', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 }}>
                                          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>
                                            {logItem.authorName === 'Integrante' ? (language === 'en' ? 'Member' : 'Integrante') : (logItem.authorName === 'Fundação' ? (t('foundation') || 'Fundação') : (logItem.authorName === 'Sincronização' ? (t('syncLabel') || 'Sincronização') : (logItem.authorName === 'Agenda' ? (t('agenda') || 'Agenda') : logItem.authorName)))}
                                          </Text>
                                        </View>
                                      )}
                                    </View>

                                    <Text style={{ fontSize: 13, color: colors.text, lineHeight: 18, fontWeight: '500' }}>
                                      {logItem.description ? (formatTimelineDescription(logItem.description, logItem.actionType, language).charAt(0).toUpperCase() + formatTimelineDescription(logItem.description, logItem.actionType, language).slice(1)) : ''}
                                    </Text>
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    );
                  });
                })()}
              </View>
            )}
          </ScrollView>
        )}

        {/* ABA 1: REPERTÓRIO */}
        {activeTab === 'repertoire' && (
          <View style={styles.tabContentFlex}>
            <View style={[styles.searchToolbar, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border, paddingHorizontal: 20, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
              <View style={[styles.searchInputWrapper, { flex: 1, backgroundColor: colors.cardBackground, borderColor: colors.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 44, flexDirection: 'row', alignItems: 'center' }]}>
                <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: 6 }} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text, flex: 1, fontSize: 13 }]}
                  placeholder={t('searchRepertoire') || 'Buscar no repertório...'}
                  placeholderTextColor={colors.textMuted}
                  value={repertoireSearch}
                  onChangeText={setRepertoireSearch}
                  maxLength={100}
                />
                {repertoireSearch.length > 0 && (
                  <Pressable onPress={() => setRepertoireSearch('')}>
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </Pressable>
                )}
              </View>

              {/* BOTÕES SOMENTE ÍCONE E REDONDOS NA ABA REPERTÓRIO */}
              {uniqueBandStyles.length > 0 && (
                <Pressable
                  style={[
                    styles.roundIconButton,
                    {
                      backgroundColor: showStyleFilters ? colors.primary : (colors.secondary + '18'),
                      borderColor: showStyleFilters ? colors.primary : (colors.secondary + '40'),
                      borderWidth: 1,
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      justifyContent: 'center',
                      alignItems: 'center'
                    }
                  ]}
                  onPress={() => setShowStyleFilters(!showStyleFilters)}
                >
                  <Ionicons
                    name="pricetag-outline"
                    size={18}
                    color={showStyleFilters ? '#ffffff' : colors.secondary}
                  />
                </Pressable>
              )}

              {/* Botão de Reordenar Lista (Do lado do botão de tags!) */}
              <Pressable
                style={[
                  styles.roundIconButton,
                  {
                    backgroundColor: colors.primary + '18',
                    borderColor: colors.primary + '40',
                    borderWidth: 1,
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    justifyContent: 'center',
                    alignItems: 'center'
                  }
                ]}
                onPress={() => setShowSortModal(true)}
              >
                <Ionicons name="swap-vertical" size={20} color={colors.primary} />
              </Pressable>

              {/* Botão de Adicionar Músicas do Songbook no Repertório */}
              {isUserLeader && (
                <Pressable
                  style={[
                    styles.roundIconButton,
                    {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                      borderWidth: 1,
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      justifyContent: 'center',
                      alignItems: 'center'
                    }
                  ]}
                  onPress={handleOpenSongPicker}
                  accessibilityLabel="Adicionar Músicas do Songbook"
                >
                  <Ionicons name="add" size={24} color="#ffffff" />
                </Pressable>
              )}
            </View>

            {showStyleFilters && uniqueBandStyles.length > 0 && (
              <View style={[styles.styleFilterWrapContainer, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
                <Pressable
                  style={({ pressed }) => [
                    styles.stylePillCompact,
                    {
                      backgroundColor: selectedStyleFilters.length === 0 ? colors.primary + '18' : colors.cardBackground,
                      borderColor: selectedStyleFilters.length === 0 ? colors.primary : colors.border,
                      borderWidth: 1,
                      transform: [{ scale: pressed ? 0.95 : 1 }]
                    }
                  ]}
                  onPress={() => setSelectedStyleFilters([])}
                >
                  <Text style={[styles.stylePillTextCompact, { color: selectedStyleFilters.length === 0 ? colors.primary : colors.text }]}>
                    {t('allPlural') || 'Todas'} ({bandSongs.length})
                  </Text>
                </Pressable>

                {uniqueBandStyles.map(st => {
                  const isSel = selectedStyleFilters.some(s => s.toLowerCase() === st.toLowerCase());
                  return (
                    <Pressable
                      key={st}
                      style={({ pressed }) => [
                        styles.stylePillCompact,
                        {
                          backgroundColor: isSel ? colors.primary + '18' : colors.cardBackground,
                          borderColor: isSel ? colors.primary : colors.border,
                          borderWidth: 1,
                          transform: [{ scale: pressed ? 0.95 : 1 }]
                        }
                      ]}
                      onPress={() => {
                        if (isSel) {
                          setSelectedStyleFilters(selectedStyleFilters.filter(s => s.toLowerCase() !== st.toLowerCase()));
                        } else {
                          if (selectedStyleFilters.length < 4) {
                            setSelectedStyleFilters([...selectedStyleFilters, st]);
                          } else {
                            Alert.alert(t('attention') || 'Atenção', t('maxTagsSelected') || 'Você pode selecionar no máximo 4 tags ao mesmo tempo.');
                          }
                        }
                      }}
                    >
                      <Text style={[styles.stylePillTextCompact, { color: isSel ? colors.primary : colors.text }]}>
                        {st}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <ScrollView contentContainerStyle={styles.listPadding}>
              {filteredBandSongs.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="disc-outline" size={48} color={colors.textMuted} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('noSongsInRepertoire')}</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                    {t('bandSongsSubtitle')}
                  </Text>
                  {isUserLeader && (
                    <Pressable
                      style={{
                        backgroundColor: colors.primary,
                        marginTop: 16,
                        paddingHorizontal: 20,
                        paddingVertical: 12,
                        borderRadius: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        elevation: 2,
                        shadowColor: colors.primary,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4
                      }}
                      onPress={handleOpenSongPicker}
                    >
                      <Ionicons name="add-circle" size={20} color="#ffffff" />
                      <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 14 }}>
                        Adicionar Músicas do Songbook
                      </Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                (() => {
                  const favoriteSongs = filteredBandSongs.filter(s => s.isFavorite);
                  const otherSongs = filteredBandSongs.filter(s => !s.isFavorite);

                  const renderSong = (song) => (
                    <SongListItem
                      key={song.id}
                      song={song}
                      onSelect={() => onSelectSong(song)}
                      onPress={() => onSelectSong(song)}
                      onToggleFavorite={() => handleToggleBandSongFavorite(song.id, song.isFavorite)}
                      showRehearsalControls={true}
                      onToggleRehearsalStatus={() => onToggleRehearsalStatus && onToggleRehearsalStatus(song.id)}
                      onUpdateRehearsalNotes={(notes) => onUpdateSongRehearsalNotes && onUpdateSongRehearsalNotes(song.id, notes)}
                      extraRightComponent={
                        isUserLeader ? (
                          <Pressable
                            style={styles.unlinkSongBtn}
                            onPress={() => handleUnlinkSongConfirm(song)}
                            hitSlop={8}
                          >
                            <Ionicons name="trash-outline" size={18} color="#ef4444" />
                          </Pressable>
                        ) : null
                      }
                    />
                  );

                  return (
                    <>
                      {favoriteSongs.length > 0 && (
                        <View style={{ marginBottom: 10 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 8, gap: 8 }}>
                            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fbbf2422', borderColor: '#fbbf2455', borderWidth: 1, alignItems: 'center', justifyContent: 'center' }}>
                              <Ionicons name="star" size={12} color="#fbbf24" />
                            </View>
                            <Text style={{ fontSize: 11, fontWeight: '900', color: '#fbbf24', letterSpacing: 0.8 }}>
                              {t('favorites') || 'FAVORITOS'} ({favoriteSongs.length})
                            </Text>
                            <View style={{ flex: 1, height: 1, backgroundColor: colors.border, opacity: 0.5 }} />
                          </View>
                          {favoriteSongs.map(renderSong)}
                        </View>
                      )}

                      {otherSongs.length > 0 && (
                        <View>
                          {favoriteSongs.length > 0 && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 8, gap: 8 }}>
                              <Text style={{ fontSize: 11, fontWeight: '900', color: colors.textMuted, letterSpacing: 0.8 }}>
                                {t('allSongs') || 'TODAS AS MÚSICAS'} ({otherSongs.length})
                              </Text>
                              <View style={{ flex: 1, height: 1, backgroundColor: colors.border, opacity: 0.3 }} />
                            </View>
                          )}
                          {otherSongs.map(renderSong)}
                        </View>
                      )}
                    </>
                  );
                })()
              )}
            </ScrollView>

            {/* BOTÃO DE MAIS FLUTUANTE TRANSPARENTE E ARRASTÁVEL (DRAGGABLE FAB) */}
            {isUserLeader && (
              <Animated.View
                {...fabPanResponder.panHandlers}
                style={[
                  styles.draggableFabButton,
                  {
                    backgroundColor: colors.primary + '85',
                    borderColor: colors.primary,
                    transform: [{ translateX: fabPan.x }, { translateY: fabPan.y }],
                  }
                ]}
              >
                <Pressable
                  style={styles.draggableFabInnerPressable}
                  onPress={handleOpenSongPicker}
                  hitSlop={8}
                >
                  <Ionicons name="add" size={24} color="#ffffff" />
                </Pressable>
              </Animated.View>
            )}
          </View>
        )}

        {/* ABA 2: INTEGRANTES */}
        {activeTab === 'members' && (
          <ScrollView contentContainerStyle={styles.dedicatedTabPadding}>
            
            {/* LINHA DE PERFIL ('VOCÊ:') + BOTÃO REDONDO '+' DE ADICIONAR INTEGRANTE */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              {(() => {
                const meMember = members.find(m => m.id === myMemberId);
                return (
                  <Pressable
                    style={({ pressed }) => [
                      styles.whoAreYouEnhancedBar,
                      {
                        flex: 1,
                        marginBottom: 0,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
                        borderColor: meMember ? colors.primary + '60' : colors.border,
                        borderWidth: 1.5,
                        opacity: pressed ? 0.85 : 1,
                        transform: [{ scale: pressed ? 0.99 : 1 }],
                        paddingVertical: 12,
                        paddingHorizontal: 14,
                        borderRadius: 12,
                      }
                    ]}
                    onPress={() => setShowWhoAreYouModal(true)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>
                        {t('you') || 'Você:'}
                      </Text>
                      <Text style={{ fontSize: 14, fontWeight: '900', color: meMember ? colors.primary : colors.textMuted }} numberOfLines={1}>
                        {meMember ? meMember.name : '+'}
                      </Text>
                    </View>
                  </Pressable>
                );
              })()}

              {/* BOTÃO REDONDO DE ADICIONAR INTEGRANTE (SINAL DE + DO LADO DO CARD VOCÊ) */}
              {isUserLeader && (
                <Pressable
                  style={({ pressed }) => [
                    {
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: colors.primary,
                      justifyContent: 'center',
                      alignItems: 'center',
                      elevation: 3,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 3,
                      transform: [{ scale: pressed ? 0.94 : 1 }]
                    }
                  ]}
                  onPress={handleOpenAddMember}
                  accessibilityLabel={t('addMember') || 'Adicionar Integrante'}
                >
                  <Ionicons name="add" size={26} color="#ffffff" />
                </Pressable>
              )}
            </View>

            {/* SEÇÃO 0: CONVITES PENDENTES / AGUARDANDO CONFIRMAÇÃO */}
            {pendingMembers.length > 0 && (
              <View style={{ marginBottom: 18 }}>
                <View style={styles.memberSectionHeader}>
                  <View style={styles.sectionHeaderTitleGroup}>
                    <View style={[styles.pillBadge, { backgroundColor: '#f59e0b1a', borderColor: '#f59e0b55' }]}>
                      <Text style={[styles.pillBadgeText, { color: '#f59e0b' }]}>{pendingMembers.length}</Text>
                    </View>
                    <Ionicons name="time" size={16} color="#f59e0b" style={{ marginRight: 6 }} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      {pendingMembers.length === 1 ? (t('pendingInvite') || 'CONVITE PENDENTE') : (t('pendingInvites') || 'CONVITES PENDENTES')}
                    </Text>
                  </View>
                </View>

                {pendingMembers.map(item => {
                  const photoUri = memberPhotos[item.id] || item.photoUri || item.imageUri;
                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.memberCardNoBorder,
                        {
                          backgroundColor: colors.card,
                        }
                      ]}
                    >
                      <View style={styles.memberCardTopRow}>
                        <View style={styles.memberCardLeft}>
                          {/* Avatar do membro: carrega a foto ao vincular com @, clicável para página dele */}
                          <Pressable
                            style={[
                              styles.memberAvatarCircle,
                              { backgroundColor: colors.primary + '20' }
                            ]}
                            onPress={() => handleOpenMemberProfile(item)}
                          >
                            {photoUri ? (
                              <Image source={{ uri: photoUri }} style={styles.memberAvatarImg} />
                            ) : (
                              <Text style={[styles.memberAvatarInitial, { color: colors.primary }]}>
                                {item.name ? item.name.charAt(0).toUpperCase() : '?'}
                              </Text>
                            )}
                          </Pressable>

                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                              <Pressable onPress={() => handleOpenMemberProfile(item)}>
                                <Text style={[styles.memberNameText, { color: colors.text }]}>
                                  {item.name}
                                </Text>
                              </Pressable>

                              {(item.role || '').split(',').map(r => r.trim()).filter(Boolean).map((roleTag, idx) => (
                                <View key={idx} style={[styles.roleBadge, { backgroundColor: colors.primary }]}>
                                  <Text style={styles.roleBadgeText}>{roleTag}</Text>
                                </View>
                              ))}
                            </View>

                            {/* Nome de usuário na rede com link direto para a página pública */}
                            {item.username ? (
                              <Pressable
                                style={styles.memberUsernameLinkRow}
                                onPress={() => handleOpenMemberProfile(item)}
                              >
                                <Ionicons name="at" size={13} color={colors.primary} />
                                <Text style={[styles.memberUsernameLinkText, { color: colors.primary }]}>
                                  {item.username.replace(/^@+/, '')}
                                </Text>
                              </Pressable>
                            ) : null}
                          </View>
                        </View>

                        {/* Ações da direita: cancelar convite pendente */}
                        {isUserLeader && (
                          <View style={styles.memberCardRightActions}>
                            <Pressable
                              style={styles.iconActionBtn}
                              onPress={() => {
                                Alert.alert(
                                  'Cancelar Convite',
                                  `Deseja cancelar o convite enviado para ${item.name}? O card será removido da banda.`,
                                  [
                                    { text: 'Voltar', style: 'cancel' },
                                    {
                                      text: 'Cancelar Convite',
                                      style: 'destructive',
                                      onPress: async () => {
                                        await bandService.deleteBandMember(item.id);
                                        await loadData();
                                      }
                                    }
                                  ]
                                );
                              }}
                              hitSlop={8}
                            >
                              <Ionicons name="trash-outline" size={18} color="#ef4444" />
                            </Pressable>
                          </View>
                        )}
                      </View>

                      {/* Mensagem de Retorno do Músico (se houver) */}
                      {item.replyMessage ? (
                        <View
                          style={[
                            styles.memberReplyMessageBox,
                            {
                              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                            }
                          ]}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                            <Ionicons name="chatbubble-ellipses-outline" size={12} color={colors.primary} />
                            <Text style={[styles.memberReplyHeader, { color: colors.primary }]}>
                              Mensagem de retorno do músico:
                            </Text>
                          </View>
                          <Text style={[styles.memberReplyText, { color: colors.text }]}>
                            "{item.replyMessage}"
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}

            {/* SEÇÃO 1: INTEGRANTES ATIVOS */}
            <View style={styles.memberSectionHeader}>
              <View style={styles.sectionHeaderTitleGroup}>
                <View style={{
                  backgroundColor: '#10b98120',
                  borderColor: '#10b98155',
                  borderWidth: 1.5,
                  borderRadius: 14,
                  width: 28,
                  height: 28,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 8
                }}>
                  <Text style={{ color: '#10b981', fontSize: 13, fontWeight: '800' }}>{activeMembers.length}</Text>
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text, textTransform: 'none', fontSize: 16 }]}>{t('membersTab') || 'Membros'}</Text>
              </View>
            </View>

            {activeMembers.length === 0 ? (
              <View style={[styles.cardPanelNoBorder, { backgroundColor: colors.card, alignItems: 'center', padding: 24 }]}>
                <Text style={{ color: colors.textMuted, fontSize: 14 }}>{t('noActiveMembers')}</Text>
              </View>
            ) : (
              activeMembers.map(item => {
                const photoUri = memberPhotos[item.id] || item.photoUri || item.imageUri;
                const periodText = getMemberPeriodText(item);
                const isExpanded = expandedMemberIds.has(item.id);
                const hasExtraDetails = periodText || item.phone || (item.cycles && item.cycles !== '[]' && item.cycles !== 'null');
                const isMe = item.id === myMemberId;

                return (
                  <View key={item.id} style={[styles.memberCardNoBorder, { backgroundColor: colors.card, borderColor: isMe ? colors.primary + '50' : 'transparent', borderWidth: isMe ? 1.5 : 0 }]}>
                    <View style={styles.memberCardTopRow}>
                      <View style={styles.memberCardLeft}>
                        {/* Avatar do membro com tamanho aumentado em 50% (54x54) */}
                        <Pressable
                          style={[styles.memberAvatarCircle, { backgroundColor: isMe ? colors.primary : colors.primary + '20' }]}
                          onPress={() => handleOpenMemberProfile(item)}
                        >
                          {photoUri ? (
                            <Image source={{ uri: photoUri }} style={styles.memberAvatarImg} />
                          ) : isMe ? (
                            <Ionicons name="star" size={24} color="#ffffff" />
                          ) : (
                            <Text style={[styles.memberAvatarInitial, { color: colors.primary }]}>
                              {item.name ? item.name.charAt(0).toUpperCase() : '?'}
                            </Text>
                          )}
                        </Pressable>
                        <View style={{ flex: 1 }}>
                          {/* LINHA 1: BADGE DE NÍVEL (LÍDER/MEMBRO), NOME E USERNAME */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                            {/* Botão / Ícone de Cargo / Nível (Líder ou Membro) no lado esquerdo do nome */}
                            <Pressable
                              style={[
                                styles.roleLevelBadgeBtn,
                                Number(item.isLeader) === 1
                                  ? { backgroundColor: '#f59e0b18', borderColor: '#f59e0b55' }
                                  : { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)' }
                              ]}
                              onPress={() => handleToggleMemberRole(item)}
                              hitSlop={6}
                              accessibilityLabel={Number(item.isLeader) === 1 ? 'Líder da banda' : 'Membro da banda'}
                            >
                              <Ionicons
                                name={Number(item.isLeader) === 1 ? "shield-checkmark" : "person-outline"}
                                size={13}
                                color={Number(item.isLeader) === 1 ? "#f59e0b" : colors.textMuted}
                              />
                            </Pressable>

                            <Pressable onPress={() => handleOpenMemberProfile(item)}>
                              <Text style={[styles.memberNameText, { color: colors.text }]}>{item.name}</Text>
                            </Pressable>

                            {item.username ? (
                              <Pressable
                                style={styles.memberUsernameLinkRow}
                                onPress={() => handleOpenMemberProfile(item)}
                              >
                                <Ionicons name="at" size={13} color={colors.primary} />
                                <Text style={[styles.memberUsernameLinkText, { color: colors.primary }]}>
                                  {item.username.replace(/^@+/, '')}
                                </Text>
                              </Pressable>
                            ) : null}
                          </View>

                          {/* LINHA 2: FUNÇÕES (PÍLULAS COMPACTAS) */}
                          {item.role && item.role.trim() ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                              {(item.role || '').split(',').map(r => r.trim()).filter(Boolean).map((roleTag, idx) => (
                                <View key={idx} style={[styles.roleBadgeCompact, { backgroundColor: colors.primary + '18' }]}>
                                  <Text style={[styles.roleBadgeTextCompact, { color: colors.primary }]}>{roleTag}</Text>
                                </View>
                              ))}
                            </View>
                          ) : null}
                        </View>
                      </View>

                      <View style={styles.memberCardRightActions}>
                        {(isUserLeader || item.id === myMemberId) && (
                          <Pressable style={styles.iconActionBtn} onPress={() => handleOpenEditMember(item)}>
                            <Ionicons name="pencil" size={18} color={colors.primary} />
                          </Pressable>
                        )}
                      </View>
                    </View>

                    {/* INFORMAÇÕES EXIBIDAS DIRETAMENTE SEM PRECISAR EXPANDIR */}
                    {hasExtraDetails && (
                      <View style={{ width: '100%' }}>
                        <View style={[styles.memberCardExpandedRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                          {periodText ? (
                            <Text style={[styles.memberPeriodText, { color: colors.textMuted }]}>
                              <Ionicons name="calendar-outline" size={12} color={colors.textMuted} /> {periodText}
                            </Text>
                          ) : null}

                          {item.phone ? (
                            <Pressable style={styles.whatsAppBadge} onPress={() => handleOpenWhatsApp(item.phone)}>
                              <Ionicons name="logo-whatsapp" size={14} color="#25D366" style={{ marginRight: 4 }} />
                              <Text style={styles.whatsAppBadgeText}>{item.phone}</Text>
                            </Pressable>
                          ) : null}
                        </View>
                        {(() => {
                           let cycles = [];
                           try { cycles = typeof item.cycles === 'string' ? JSON.parse(item.cycles) : item.cycles; } catch(e) {}
                           if (cycles && cycles.length > 0) {
                             return (
                               <View style={{ marginTop: 6, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', paddingTop: 6 }}>
                                 <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, marginBottom: 3 }}>Histórico de Ciclos:</Text>
                                 {cycles.map((c, idx) => (
                                   <Text key={idx} style={{ fontSize: 11, color: colors.text, marginLeft: 8 }}>
                                     • {c.startDate || '?'} {c.endDate ? `até ${c.endDate}` : ''}
                                   </Text>
                                 ))}
                               </View>
                             );
                           }
                           return null;
                        })()}
                      </View>
                    )}
                  </View>
                );
              })
            )}

            {/* SEÇÃO 2: INTEGRANTES INATIVOS (COM EXPANSÃO '+') */}
            {inactiveMembers.length > 0 && (
              <View style={{ marginTop: 20 }}>
                <Pressable
                  style={[styles.toggleInactiveBtn, { backgroundColor: colors.cardBackground, borderColor: colors.border, borderWidth: 1 }]}
                  onPress={() => setShowInactiveMembers(!showInactiveMembers)}
                >
                  <View style={[styles.pillBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', borderColor: colors.border, marginRight: 8 }]}>
                    <Text style={[styles.pillBadgeText, { color: colors.textMuted }]}>{inactiveMembers.length}</Text>
                  </View>
                  <Ionicons
                    name={showInactiveMembers ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={colors.text}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.toggleInactiveBtnText, { color: colors.text }]}>
                    {showInactiveMembers
                      ? t('hideInactiveMembers')
                      : t('showInactiveMembers')}
                  </Text>
                </Pressable>

                {showInactiveMembers && (
                  <View style={{ marginTop: 12 }}>
                    {inactiveMembers.map(item => {
                      const photoUri = memberPhotos[item.id] || item.photoUri || item.imageUri;
                      const periodText = getMemberPeriodText(item);
                      const isExpanded = expandedMemberIds.has(item.id);
                      const hasExtraDetails = periodText || item.phone || (item.cycles && item.cycles !== '[]' && item.cycles !== 'null');

                      return (
                        <View key={item.id} style={[styles.memberCardNoBorderInactive, { backgroundColor: colors.cardBackground }]}>
                          <View style={styles.memberCardTopRow}>
                            <View style={styles.memberCardLeft}>
                              {/* Avatar do membro inativo aumentado em 50% (54x54) */}
                              <Pressable
                                style={[styles.memberAvatarCircle, { backgroundColor: '#6b728020' }]}
                                onPress={() => handleOpenMemberProfile(item)}
                              >
                                {photoUri ? (
                                  <Image source={{ uri: photoUri }} style={styles.memberAvatarImg} />
                                ) : (
                                  <Ionicons name="person-outline" size={24} color="#6b7280" />
                                )}
                              </Pressable>
                              <View style={{ flex: 1 }}>
                                {/* LINHA 1: BADGE DE NÍVEL, NOME, USERNAME E STATUS INATIVO */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                  {/* Botão / Ícone de Cargo / Nível (Líder ou Membro) no lado esquerdo do nome */}
                                  <Pressable
                                    style={[
                                      styles.roleLevelBadgeBtn,
                                      Number(item.isLeader) === 1
                                        ? { backgroundColor: '#f59e0b18', borderColor: '#f59e0b55' }
                                        : { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)' }
                                    ]}
                                    onPress={() => handleToggleMemberRole(item)}
                                    hitSlop={6}
                                    accessibilityLabel={Number(item.isLeader) === 1 ? 'Líder da banda' : 'Membro da banda'}
                                  >
                                    <Ionicons
                                      name={Number(item.isLeader) === 1 ? "shield-checkmark" : "person-outline"}
                                      size={13}
                                      color={Number(item.isLeader) === 1 ? "#f59e0b" : colors.textMuted}
                                    />
                                  </Pressable>

                                  <Pressable onPress={() => handleOpenMemberProfile(item)}>
                                    <Text style={[styles.memberNameText, { color: colors.textMuted }]}>{item.name}</Text>
                                  </Pressable>
                                  {item.username ? (
                                    <Pressable
                                      style={styles.memberUsernameLinkRow}
                                      onPress={() => handleOpenMemberProfile(item)}
                                    >
                                      <Ionicons name="at" size={13} color={colors.textMuted} />
                                      <Text style={[styles.memberUsernameLinkText, { color: colors.textMuted }]}>
                                        {item.username.replace(/^@+/, '')}
                                      </Text>
                                    </Pressable>
                                  ) : null}
                                  <View style={styles.inactivePill}>
                                    <Text style={styles.inactivePillText}>{t('inactive')}</Text>
                                  </View>
                                </View>

                                {/* LINHA 2: FUNÇÕES (PÍLULAS COMPACTAS) */}
                                {item.role && item.role.trim() ? (
                                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                                    {(item.role || '').split(',').map(r => r.trim()).filter(Boolean).map((roleTag, idx) => (
                                      <View key={idx} style={[styles.roleBadgeCompact, { backgroundColor: '#6b728025' }]}>
                                        <Text style={[styles.roleBadgeTextCompact, { color: '#6b7280' }]}>{roleTag}</Text>
                                      </View>
                                    ))}
                                  </View>
                                ) : null}
                              </View>
                            </View>

                            <View style={styles.memberCardRightActions}>
                              {(isUserLeader || item.id === myMemberId) && (
                                <Pressable style={styles.iconActionBtn} onPress={() => handleOpenEditMember(item)}>
                                  <Ionicons name="pencil" size={18} color={colors.primary} />
                                </Pressable>
                              )}
                            </View>
                          </View>

                          {/* INFORMAÇÕES EXIBIDAS DIRETAMENTE SEM PRECISAR EXPANDIR */}
                          {hasExtraDetails && (
                            <View style={{ width: '100%' }}>
                              <View style={[styles.memberCardExpandedRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                                {periodText ? (
                                  <Text style={[styles.memberPeriodText, { color: colors.textMuted }]}>
                                    <Ionicons name="calendar-outline" size={12} color={colors.textMuted} /> {periodText}
                                  </Text>
                                ) : null}

                                {item.phone ? (
                                  <Pressable style={styles.whatsAppBadge} onPress={() => handleOpenWhatsApp(item.phone)}>
                                    <Ionicons name="logo-whatsapp" size={14} color="#25D366" style={{ marginRight: 4 }} />
                                    <Text style={styles.whatsAppBadgeText}>{item.phone}</Text>
                                  </Pressable>
                                ) : null}
                              </View>
                              {(() => {
                                 let cycles = [];
                                 try { cycles = typeof item.cycles === 'string' ? JSON.parse(item.cycles) : item.cycles; } catch(e) {}
                                 if (cycles && cycles.length > 0) {
                                   return (
                                     <View style={{ marginTop: 6, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', paddingTop: 6 }}>
                                       <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, marginBottom: 3 }}>Histórico de Ciclos:</Text>
                                       {cycles.map((c, idx) => (
                                         <Text key={idx} style={{ fontSize: 11, color: colors.textMuted, marginLeft: 8 }}>
                                           • {c.startDate || '?'} {c.endDate ? `até ${c.endDate}` : ''}
                                         </Text>
                                       ))}
                                     </View>
                                   );
                                 }
                                 return null;
                              })()}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

          </ScrollView>
        )}

        {/* ABA 3: ESTATÍSTICAS (SEM CONTORNO DE TABELA, APENAS TÍTULO "Estilos do Repertorio") */}
        {activeTab === 'stats' && (
          <ScrollView contentContainerStyle={styles.dedicatedTabPadding}>
            <View style={[styles.cardPanelNoBorder, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.cardPanelHeaderRow}>
                <Ionicons name="stats-chart" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.cardPanelTitle, { color: colors.text }]}>
                  {t('repertoireStyles')}
                </Text>
              </View>

              {styleBreakdown.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="pie-chart-outline" size={40} color={colors.textMuted} />
                  <Text style={[styles.emptySubtitle, { color: colors.textMuted, marginTop: 8 }]}>
                    {t('noStyleTags')}
                  </Text>
                </View>
              ) : (
                <View style={{ marginTop: 12 }}>
                  {styleBreakdown.map(item => (
                    <View key={item.tag} style={styles.styleBreakdownRow}>
                      <View style={styles.styleBreakdownHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={[styles.styleDot, { backgroundColor: item.color }]} />
                          <Text style={[styles.styleTagName, { color: colors.text }]}>{item.tag}</Text>
                        </View>
                        <Text style={[styles.styleTagMeta, { color: colors.textMuted }]}>
                          {item.count} {item.count === 1 ? (t('songSingular') || 'música') : (t('songPlural') || 'músicas')} ({item.percentage}%)
                        </Text>
                      </View>

                      <View style={[styles.progressBarTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { backgroundColor: item.color, width: `${Math.min(100, Math.max(5, item.percentage))}%` }
                          ]}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        )}

        {/* ABA 4: FINANCEIRO */}
        {activeTab === 'financial' && (
          <ScrollView contentContainerStyle={styles.dedicatedTabPadding}>
            {/* CARD 1: RESUMO FINANCEIRO DE 4 CÍRCULOS (ANO, RECEITA, CAIXA, DESPESAS) NO ESTILO DA WEB */}
            <View style={[styles.cardPanel, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <View style={[styles.agendaSummaryRow, { paddingVertical: 4 }]}>
                {/* CÍRCULO 1: ANO */}
                <View style={styles.summaryCircleCol}>
                  <Pressable
                    onPress={() => setShowFinanceYearPicker(true)}
                    hitSlop={6}
                    style={({ pressed }) => [
                      styles.summaryCircle,
                      {
                        backgroundColor: colors.primary + '15',
                        borderColor: colors.primary + '35',
                        opacity: pressed ? 0.7 : 1,
                      }
                    ]}
                    accessibilityLabel="Selecionar ano financeiro"
                  >
                    <Text style={[styles.summaryCircleValue, { color: colors.primary, fontSize: 16 }]}>
                      {selectedFinanceYear}
                    </Text>
                  </Pressable>
                  <Text style={[styles.summaryCircleLabel, { color: colors.textMuted }]}>
                    {t('year') || 'Ano'}
                  </Text>
                </View>

                {/* CÍRCULO 2: RECEITA */}
                <View style={styles.summaryCircleCol}>
                  <View style={styles.summaryOverlapWrapper}>
                    <View style={[styles.summaryCircle, { backgroundColor: '#38bdf818', borderColor: '#38bdf845' }]}>
                      <Text style={[styles.summaryCircleValue, { color: '#ffffff', fontSize: 14, paddingLeft: 4 }]}>
                        {formatCompactMoney(totalIncome)}
                      </Text>
                    </View>
                    <View style={[styles.summaryOverlapIconCircle, { backgroundColor: colors.cardBackground, borderColor: '#38bdf8' }]}>
                      <Ionicons name="trending-up-outline" size={13} color="#38bdf8" />
                    </View>
                  </View>
                  <Text style={[styles.summaryCircleLabel, { color: colors.textMuted }]}>
                    {t('revenueLabel') || t('incomes') || 'Receita'}
                  </Text>
                </View>

                {/* CÍRCULO 3: CAIXA (CLICÁVEL PARA AJUSTAR O SALDO) */}
                <View style={styles.summaryCircleCol}>
                  <Pressable
                    onPress={() => {
                      setBandCashInput(effectiveBandCash ? String(effectiveBandCash) : '0');
                      setBandCashNotesInput('');
                      setShowEditBandCashModal(true);
                    }}
                    hitSlop={6}
                    style={({ pressed }) => [
                      styles.summaryOverlapWrapper,
                      { opacity: pressed ? 0.75 : 1 }
                    ]}
                    accessibilityLabel="Ajustar caixa da banda"
                  >
                    <View style={[styles.summaryCircle, { backgroundColor: '#fbbf2418', borderColor: '#fbbf2445' }]}>
                      <Text style={[styles.summaryCircleValue, { color: '#fbbf24', fontSize: 14, paddingLeft: 4 }]}>
                        {formatCompactMoney(effectiveBandCash)}
                      </Text>
                    </View>
                    <View style={[styles.summaryOverlapIconCircle, { backgroundColor: colors.cardBackground, borderColor: '#fbbf24' }]}>
                      <Ionicons name="wallet-outline" size={13} color="#fbbf24" />
                    </View>
                  </Pressable>
                  <Text style={[styles.summaryCircleLabel, { color: '#fbbf24', fontWeight: '800' }]}>
                    {t('bandCash') || 'Caixa'}
                  </Text>
                </View>

                {/* CÍRCULO 4: DESPESAS */}
                <View style={styles.summaryCircleCol}>
                  <View style={styles.summaryOverlapWrapper}>
                    <View style={[styles.summaryCircle, { backgroundColor: '#ef444418', borderColor: '#ef444445' }]}>
                      <Text style={[styles.summaryCircleValue, { color: '#f87171', fontSize: 14, paddingLeft: 4 }]}>
                        {formatCompactMoney(totalExpense)}
                      </Text>
                    </View>
                    <View style={[styles.summaryOverlapIconCircle, { backgroundColor: colors.cardBackground, borderColor: '#f87171' }]}>
                      <Ionicons name="trending-down-outline" size={13} color="#f87171" />
                    </View>
                  </View>
                  <Text style={[styles.summaryCircleLabel, { color: colors.textMuted }]}>
                    {t('expenses') || 'Despesas'}
                  </Text>
                </View>
              </View>

              {isUserLeader && (
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                  <Pressable
                    style={[styles.addFinanceBtn, { flex: 1, backgroundColor: colors.primary }]}
                    onPress={handleOpenAddFinance}
                  >
                    <Ionicons name="add" size={18} color="#ffffff" style={{ marginRight: 4 }} />
                    <Text style={styles.addFinanceBtnText}>{t('newEntry')}</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.addFinanceBtn, { backgroundColor: '#fbbf2420', borderColor: '#fbbf2450', borderWidth: 1, paddingHorizontal: 14 }]}
                    onPress={() => {
                      setBandCashInput(effectiveBandCash ? String(effectiveBandCash) : '0');
                      setBandCashNotesInput('');
                      setShowEditBandCashModal(true);
                    }}
                  >
                    <Ionicons name="wallet-outline" size={16} color="#fbbf24" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#fbbf24', fontWeight: '800', fontSize: 13 }}>{t('adjustBandCash') || 'Ajustar Caixa'}</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* CARD 2: TIMELINE DE LANÇAMENTOS FINANCEIROS ORGANIZADA POR MÊS */}
            <View style={[styles.cardPanel, { backgroundColor: colors.cardBackground, borderColor: colors.border, marginTop: 16 }]}>
              <View style={styles.cardPanelHeaderRow}>
                <Ionicons name="cash-outline" size={20} color="#10b981" style={{ marginRight: 8 }} />
                <Text style={[styles.cardPanelTitle, { color: colors.text }]}>
                  {t('showsAndCaches')}
                </Text>
              </View>

              {(() => {
                const combinedItems = [
                  ...(bandSetlists || []).filter(s => s && s.type === 'show').map(sl => {
                    const rawCache = sl.cachê || sl.cache || sl.valCache || sl.value;
                    const isSlPaid = (sl.cacheStatus === 'paid' || sl.cacheStatus === 'Recebido') ||
                                     (sl.cacheSplit?.status === 'paid') ||
                                     (sl.status === 'Confirmed' || sl.status === 'paid' || sl.status === 'Recebido') ||
                                     (!sl.cacheStatus && !sl.cacheSplit && !sl.status);
                    return {
                      id: `show_${sl.id}`,
                      date: sl.date,
                      title: sl.name || t('untitledShow'),
                      subtitle: sl.local || t('noLocationSpecified'),
                      amount: parseCurrency(rawCache),
                      type: 'income',
                      isShow: true,
                      rawSetlist: sl,
                      status: isSlPaid ? 'paid' : 'pending',
                    };
                  }),
                  ...(finances || []).map(item => ({
                    id: `fin_${item.id}`,
                    date: item.date,
                    title: item.title || 'Lançamento',
                    subtitle: item.category || (item.type === 'income' ? 'Entrada' : 'Saída'),
                    amount: typeof item.amount === 'number' ? item.amount : (parseFloat(item.amount) || 0),
                    type: item.type || 'expense',
                    isShow: false,
                    rawFinance: item,
                    status: item.status || 'paid',
                  }))
                ]
                .filter(i => getMonthInfo(i.date, language).year === selectedFinanceYear)
                .sort((a, b) => parseDateForSort(b.date) - parseDateForSort(a.date));

                if (combinedItems.length === 0) {
                  return (
                    <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                      <Text style={{ color: colors.textMuted, fontSize: 13, fontStyle: 'italic' }}>
                        {t('noShowsForBand')}
                      </Text>
                    </View>
                  );
                }

                let lastFinMonthHeader = '';
                return combinedItems.map((item, index) => {
                  const monthInfo = getMonthInfo(item.date, language);
                  const header = monthInfo.name;
                  const showHeader = header !== lastFinMonthHeader;
                  if (showHeader) lastFinMonthHeader = header;
                  
                  const isPastMonth = selectedFinanceYear < currentYearNum || (selectedFinanceYear === currentYearNum && monthInfo.index < currentMonthNum);
                  const isExpanded = expandedFinanceMonths[header] !== undefined ? expandedFinanceMonths[header] : !isPastMonth;

                  const badgeDate = getFormattedDateBadge(item.date, language);
                  const isIncome = item.type === 'income';
                  const valueColor = item.status === 'pending' ? '#eab308' : (isIncome ? '#10b981' : '#ef4444');

                  return (
                    <View key={`fin_item_${item.id || index}_${index}`}>

                      {showHeader && (() => {
                        const monthGroup = combinedItems.filter(i => getMonthInfo(i.date, language).name === header);
                        const monthIncomeTotal = monthGroup
                          .filter(i => i.type === 'income')
                          .reduce((acc, curr) => acc + (curr.amount || 0), 0);
                        const monthExpenseTotal = monthGroup
                          .filter(i => i.type === 'expense')
                          .reduce((acc, curr) => acc + (curr.amount || 0), 0);
                        const monthNetProfit = monthIncomeTotal - monthExpenseTotal;
                        const activeMembersCount = activeMembers.length || members.length || 1;
                        const myShare = monthNetProfit > 0 ? (monthNetProfit / activeMembersCount) : 0;
                        const meMember = members.find(m => m.id === myMemberId);

                        return (
                          <Pressable onPress={() => toggleFinanceMonth(header)} style={{ marginTop: 14, marginBottom: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <Text style={{ fontSize: 11, fontWeight: '900', color: colors.primary, letterSpacing: 0.8 }}>
                                {header}
                              </Text>

                              {/* Pílula 1: Cachê Total (Apenas Ícone + Valor) */}
                              <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                                backgroundColor: '#10b98115',
                                borderColor: '#10b98140',
                                borderWidth: 1,
                                paddingHorizontal: 8,
                                paddingVertical: 2.5,
                                borderRadius: 12
                              }}>
                                <Ionicons name="trending-up" size={12} color="#10b981" />
                                <Text style={{ fontSize: 10, fontWeight: '900', color: '#10b981' }}>
                                  + $ {monthIncomeTotal.toFixed(2)}
                                </Text>
                              </View>

                              <View style={{ flex: 1, height: 1, backgroundColor: colors.border, opacity: 0.5 }} />
                              <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
                            </View>
                          </Pressable>
                        );
                      })()}
                      
                      {isExpanded && (

                      <Pressable
                        style={({ pressed }) => [
                          styles.financeItemRow,
                          { borderBottomColor: colors.border, opacity: pressed ? 0.75 : 1 }
                        ]}
                        onPress={() => {
                          if (item.isShow) {
                            handleOpenCacheSplitModal(item.rawSetlist);
                          } else if (isUserLeader) {
                            handleOpenEditFinance(item.rawFinance);
                          }
                        }}
                      >
                        {/* Badge de Data */}
                        <View style={{
                          width: 44,
                          height: 44,
                          borderRadius: 10,
                          backgroundColor: (isIncome ? '#10b981' : '#ef4444') + '15',
                          borderColor: (isIncome ? '#10b981' : '#ef4444') + '30',
                          borderWidth: 1,
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginRight: 10
                        }}>
                          <Text style={{ fontSize: 14, fontWeight: '900', color: colors.text, lineHeight: 16 }}>{badgeDate.day}</Text>
                          <Text style={{ fontSize: 9, fontWeight: '800', color: isIncome ? '#10b981' : '#ef4444' }}>{badgeDate.month}</Text>
                        </View>

                        {/* Nome e Descrição */}
                        <View style={{ flex: 1, paddingRight: 6 }}>
                          <Text style={[styles.financeItemTitle, { color: colors.text }]} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <Text style={[styles.financeItemMeta, { color: colors.textMuted }]} numberOfLines={1}>
                            {item.isShow ? (
                              <>
                                <Ionicons name="location-outline" size={11} color={colors.textMuted} /> {item.subtitle}
                              </>
                            ) : (
                              item.subtitle
                            )}
                          </Text>
                        </View>

                        {/* Valor e Badge / Lixeira */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 14, fontWeight: '900', color: valueColor }}>
                              {isIncome ? '+' : '-'} $ {item.amount.toFixed(2)}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                              <View style={{
                                backgroundColor: valueColor + '20',
                                paddingHorizontal: 6,
                                paddingVertical: 1.5,
                                borderRadius: 4
                              }}>
                                <Text style={{ color: valueColor, fontSize: 9, fontWeight: '900' }}>
                                  {item.isShow
                                    ? (item.amount > 0 ? t('showCachet') : t('toBeDefined'))
                                    : (isIncome ? t('income') : t('expense'))}
                                </Text>
                              </View>
                              <View style={{
                                backgroundColor: item.status === 'pending' ? '#eab30820' : '#10b98120',
                                borderColor: item.status === 'pending' ? '#eab30850' : '#10b98150',
                                borderWidth: 1,
                                paddingHorizontal: 5,
                                paddingVertical: 1.5,
                                borderRadius: 4
                              }}>
                                <Text style={{
                                  color: item.status === 'pending' ? '#eab308' : '#10b981',
                                  fontSize: 8.5,
                                  fontWeight: '900'
                                }}>
                                  {item.status === 'pending' ? (t('pendingStatus') || 'PENDENTE') : (item.type === 'income' ? (t('receivedStatus') || 'RECEBIDO') : (t('paidStatus') || 'PAGO'))}
                                </Text>
                              </View>
                            </View>
                          </View>

                          {!item.isShow && isUserLeader && (
                            <Pressable 
                              style={{ padding: 4 }} 
                              onPress={(e) => {
                                e.stopPropagation();
                                handleDeleteFinanceEntry(item.rawFinance);
                              }}
                              hitSlop={8}
                            >
                              <Ionicons name="trash-outline" size={18} color={colors.danger} />
                            </Pressable>
                          )}
                        </View>
                      </Pressable>
                      )}
                    </View>
                  );
                });
              })()}
            </View>
          </ScrollView>
        )}

        {/* ABA 5: EVENTOS DESTA BANDA */}
        {activeTab === 'setlists' && (
          <ScrollView contentContainerStyle={styles.dedicatedTabPadding}>
            {/* NOVO: CARD 1: RESUMO DE EVENTOS - 3 CÍRCULOS (ANO, SHOWS, ENSAIOS) */}
            {(() => {
              const yearEvents = bandSetlists.filter(s => {
                const m = getMonthInfo(s.date, language);
                return m.year === selectedEventYear || m.year === 0 || !s.date;
              });
              const showCount = yearEvents.filter(s => s.type === 'show').length;
              const rehearsalCount = yearEvents.filter(s => s.type !== 'show').length;

              return (
                <View style={[styles.agendaSummaryCard, { backgroundColor: colors.cardBackground, borderColor: colors.border, marginBottom: 16 }]}>
                  <View style={styles.agendaSummaryRow}>
                    
                    {/* CÍRCULO 1: ANO (SEM ÍCONE E SEM FLECHAS, CLICÁVEL PARA ABRIR CALENDÁRIO NATIVO) */}
                    <View style={styles.summaryCircleCol}>
                      <Pressable
                        onPress={() => setShowEventYearPicker(true)}
                        hitSlop={6}
                        style={({ pressed }) => [
                          styles.summaryCircle,
                          {
                            backgroundColor: colors.primary + '15',
                            borderColor: colors.primary + '35',
                            opacity: pressed ? 0.7 : 1,
                          }
                        ]}
                        accessibilityLabel="Selecionar ano no calendário"
                      >
                        <Text style={[styles.summaryCircleValue, { color: colors.primary, fontSize: 16 }]}>
                          {selectedEventYear}
                        </Text>
                      </Pressable>
                      <Text style={[styles.summaryCircleLabel, { color: colors.textMuted }]}>
                        {t('year') || 'Ano'}
                      </Text>
                    </View>

                    {/* CÍRCULO 2: SHOWS (ÍCONE EM CÍRCULO MENOR SOBREPONDO À ESQUERDA) */}
                    <View style={styles.summaryCircleCol}>
                      <View style={styles.summaryOverlapWrapper}>
                        <View style={[styles.summaryCircle, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '35' }]}>
                          <Text style={[styles.summaryCircleValue, { color: colors.text, fontSize: 17, paddingLeft: 4 }]}>
                            {showCount}
                          </Text>
                        </View>
                        <View style={[styles.summaryOverlapIconCircle, { backgroundColor: colors.cardBackground, borderColor: colors.primary }]}>
                          <Ionicons name="calendar-outline" size={13} color={colors.primary} />
                        </View>
                      </View>
                      <Text style={[styles.summaryCircleLabel, { color: colors.textMuted }]}>
                        {showCount === 1 ? (t('show') || 'Show') : (t('shows') || 'Shows')}
                      </Text>
                    </View>

                    {/* CÍRCULO 3: ENSAIOS (ÍCONE EM CÍRCULO MENOR SOBREPONDO À ESQUERDA) */}
                    <View style={styles.summaryCircleCol}>
                      <View style={styles.summaryOverlapWrapper}>
                        <View style={[styles.summaryCircle, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '35' }]}>
                          <Text style={[styles.summaryCircleValue, { color: colors.text, fontSize: 17, paddingLeft: 4 }]}>
                            {rehearsalCount}
                          </Text>
                        </View>
                        <View style={[styles.summaryOverlapIconCircle, { backgroundColor: colors.cardBackground, borderColor: colors.primary }]}>
                          <Ionicons name="headset-outline" size={13} color={colors.primary} />
                        </View>
                      </View>
                      <Text style={[styles.summaryCircleLabel, { color: colors.textMuted }]}>
                        {rehearsalCount === 1 ? (t('rehearsal') || 'Ensaio') : (t('rehearsals') || 'Ensaios')}
                      </Text>
                    </View>

                  </View>

                  {/* SELETOR EXCLUSIVO DE ANOS */}
                  <YearPickerModal
                    visible={showEventYearPicker}
                    selectedYear={selectedEventYear}
                    onSelectYear={(year) => setSelectedEventYear(year)}
                    onClose={() => setShowEventYearPicker(false)}
                  />
                </View>
              );
            })()}

            {/* Botões Novo Evento e Compartilhar Agenda na mesma linha */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              {isUserLeader && (
                <Pressable
                  style={({ pressed }) => [
                    styles.createEventBtn,
                    {
                      flex: 1,
                      backgroundColor: colors.primary,
                      marginBottom: 0,
                      opacity: pressed ? 0.85 : 1,
                      height: 42,
                      borderRadius: 10,
                      paddingHorizontal: 8,
                    }
                  ]}
                  onPress={() => onOpenNewSetlistForBand && onOpenNewSetlistForBand(band.id)}
                >
                  <Ionicons name="add" size={19} color="#ffffff" style={{ marginRight: 4 }} />
                  <Text style={styles.createEventBtnText} numberOfLines={1}>{t('newEvent')}</Text>
                </Pressable>
              )}

              <Pressable
                style={({ pressed }) => [
                  shareAgendaPillStyles.btn,
                  {
                    flex: 1,
                    backgroundColor: colors.primary + '18',
                    borderColor: colors.primary,
                    opacity: pressed ? 0.75 : 1,
                    marginBottom: 0,
                    height: 42,
                    borderRadius: 10,
                    paddingHorizontal: 8,
                    paddingVertical: 0,
                  }
                ]}
                onPress={openShareBandAgenda}
              >
                <Ionicons name='share-social' size={16} color={colors.primary} />
                <Text style={[shareAgendaPillStyles.text, { color: colors.primary }]} numberOfLines={1}>
                  {t('shareAgenda') || 'Compartilhar Agenda'}
                </Text>
              </Pressable>
            </View>

            {bandSetlists.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('noEventsScheduled')}</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                  {t('bandEventsSubtitle')}
                </Text>
              </View>
            ) : (
              (() => {
                const yearEvents = bandSetlists.filter(s => {
                  const m = getMonthInfo(s.date, language);
                  return m.year === selectedEventYear || m.year === 0 || !s.date;
                });
                if (yearEvents.length === 0) {
                  return (
                    <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                      <Text style={{ color: colors.textMuted, fontSize: 13, fontStyle: 'italic' }}>
                        {t('noEventsScheduled')}
                      </Text>
                    </View>
                  );
                }

                // Próximos eventos no topo (cronológico ascendente) e passados descendo até janeiro (decrescente)
                const upcomingEvents = yearEvents
                  .filter(s => isFutureDate(s.date))
                  .sort((a, b) => parseDateForSort(a.date) - parseDateForSort(b.date));
                const pastEvents = yearEvents
                  .filter(s => !isFutureDate(s.date))
                  .sort((a, b) => parseDateForSort(b.date) - parseDateForSort(a.date));

                const upcomingMonthsMap = upcomingEvents.reduce((acc, s) => {
                  const header = getMonthInfo(s.date, language).name;
                  if (!acc[header]) acc[header] = [];
                  acc[header].push(s);
                  return acc;
                }, {});

                const pastMonthsMap = pastEvents.reduce((acc, s) => {
                  const header = getMonthInfo(s.date, language).name;
                  if (!acc[header]) acc[header] = [];
                  acc[header].push(s);
                  return acc;
                }, {});

                const renderEventCard = (setlist) => {
                  const dateBadge = getFormattedDateBadge(setlist.date, language);
                  return (
                    <Pressable
                      key={setlist.id}
                      style={[styles.eventCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => onSelectSetlist ? onSelectSetlist(setlist) : onExportDoc(setlist)}
                    >
                      <View style={[styles.dateBadgeBox, { backgroundColor: colors.primary + '15' }]}>
                        <Text style={[styles.dateBadgeDay, { color: colors.primary }]}>{dateBadge.day}</Text>
                        <Text style={[styles.dateBadgeMonth, { color: colors.primary }]}>{dateBadge.month}</Text>
                      </View>

                      <View style={styles.eventCardBody}>
                        <Text style={[styles.eventTitle, { color: colors.text }]}>{setlist.name}</Text>
                        
                        <View style={styles.eventMetaRow}>
                          <View style={[
                            styles.typePill,
                            { backgroundColor: setlist.type === 'show' ? '#ef444420' : '#3b82f620' }
                          ]}>
                            <Text style={[
                              styles.typePillText,
                              { color: setlist.type === 'show' ? '#ef4444' : '#3b82f6' }
                            ]}>
                              {(setlist.type === 'show' ? (t('show') || 'SHOW') : (t('rehearsal') || 'ENSAIO')).toUpperCase()}
                            </Text>
                          </View>

                          {setlist.local ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 1, marginRight: setlist.time ? 8 : 0 }}>
                              <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                              <Text style={[styles.eventLocalText, { color: colors.textMuted }]} numberOfLines={1}>
                                {setlist.local}
                              </Text>
                            </View>
                          ) : null}

                          {setlist.time ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 1 }}>
                              <Ionicons name="time-outline" size={13} color={colors.primary} />
                              <Text style={[styles.eventLocalText, { color: colors.textMuted }]} numberOfLines={1}>
                                {setlist.time}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </View>

                    </Pressable>
                  );
                };

                return (
                  <View>
                    {/* Próximos Eventos por Mês (Ascendente) */}
                    {Object.keys(upcomingMonthsMap).map(header => {
                      const mEvents = upcomingMonthsMap[header];
                      const isExpanded = expandedEventMonths[header] !== undefined ? expandedEventMonths[header] : true;
                      const mShows = mEvents.filter(s => s.type === 'show').length;
                      const mRehearsals = mEvents.filter(s => s.type !== 'show').length;
                      return (
                        <View key={'upcoming-' + header} style={{ marginBottom: 6 }}>
                          <Pressable onPress={() => toggleEventMonth(header)} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: 8, gap: 8 }}>
                            <Text style={{ fontSize: 11, fontWeight: '900', color: colors.primary, letterSpacing: 0.8 }}>
                              {header}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 2 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                <Ionicons name="calendar-outline" size={13} color={colors.primary} />
                                <Text style={{ fontSize: 11, fontWeight: '900', color: colors.primary }}>{mShows}</Text>
                              </View>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                <Ionicons name="headset-outline" size={13} color={colors.primary} />
                                <Text style={{ fontSize: 11, fontWeight: '900', color: colors.primary }}>{mRehearsals}</Text>
                              </View>
                            </View>
                            <View style={{ flex: 1, height: 1, backgroundColor: colors.border, opacity: 0.5 }} />
                            <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
                          </Pressable>
                          {isExpanded && mEvents.map(renderEventCard)}
                        </View>
                      );
                    })}

                    {/* Eventos Anteriores por Mês (Descendente até Janeiro) */}
                    {pastEvents.length > 0 && (
                      <View style={{ marginTop: upcomingEvents.length > 0 ? 14 : 0 }}>
                        {upcomingEvents.length > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 10 }}>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                              {t('pastEvents') || 'Eventos Anteriores'}
                            </Text>
                            <View style={{ flex: 1, height: 1, backgroundColor: colors.border, opacity: 0.3 }} />
                          </View>
                        )}
                        {Object.keys(pastMonthsMap).map(header => {
                          const mEvents = pastMonthsMap[header];
                          const pastKey = 'past-' + header;
                          const isExpanded = expandedEventMonths[pastKey] !== undefined ? expandedEventMonths[pastKey] : true;
                          const mShows = mEvents.filter(s => s.type === 'show').length;
                          const mRehearsals = mEvents.filter(s => s.type !== 'show').length;
                          return (
                            <View key={pastKey} style={{ marginBottom: 6 }}>
                              <Pressable onPress={() => toggleEventMonth(pastKey)} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 8, gap: 8 }}>
                                <Text style={{ fontSize: 11, fontWeight: '900', color: colors.textMuted, letterSpacing: 0.8 }}>
                                  {header}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 2 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                    <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                                    <Text style={{ fontSize: 11, fontWeight: '900', color: colors.textMuted }}>{mShows}</Text>
                                  </View>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                    <Ionicons name="headset-outline" size={13} color={colors.textMuted} />
                                    <Text style={{ fontSize: 11, fontWeight: '900', color: colors.textMuted }}>{mRehearsals}</Text>
                                  </View>
                                </View>
                                <View style={{ flex: 1, height: 1, backgroundColor: colors.border, opacity: 0.5 }} />
                                <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
                              </Pressable>
                              {isExpanded && mEvents.map(renderEventCard)}
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })()
            )}
          </ScrollView>
        )}

        </Animated.View>
        </ScrollView>
      </View>

      {/* MODAL CHECKBOX DA COLEÇÃO DE MÚSICAS */}
      <Modal visible={showSongPickerModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.pickerModalContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitleText, { color: colors.text }]}>{t('linkCollectionSongs')}</Text>
              <Pressable onPress={() => setShowSongPickerModal(false)}>
                <Ionicons name="close-circle" size={24} color={colors.textMuted} />
              </Pressable>
            </View>

            <View style={[styles.pickerSearchInputWrapper, { backgroundColor: colors.cardBackground, borderColor: colors.border, borderWidth: 1 }]}>
              <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: 6 }} />
              <TextInput
                style={[styles.searchInput, { color: colors.text, flex: 1, fontSize: 13 }]}
                placeholder={t('searchCollectionSong')}
                placeholderTextColor={colors.textMuted}
                value={pickerSearch}
                onChangeText={setPickerSearch}
                maxLength={100}
              />
            </View>

            <View style={styles.selectAllRow}>
              <Pressable style={styles.selectAllBtn} onPress={handleToggleSelectAllPicker}>
                <Ionicons
                  name={selectedPickerSongIds.size === availableGeneralSongs.length ? "checkbox" : "square-outline"}
                  size={20}
                  color={colors.primary}
                />
                <Text style={[styles.selectAllText, { color: colors.text }]}>{t('selectAll')}</Text>
              </Pressable>
              <Text style={[styles.selectedCounterText, { color: colors.textMuted }]}>
                {selectedPickerSongIds.size} {t('selectedSongsCount')}
              </Text>
            </View>

            <ScrollView style={{ flex: 1 }}>
              {availableGeneralSongs.length === 0 ? (
                <Text style={{ textAlign: 'center', color: colors.textMuted, marginVertical: 20 }}>
                  {t('noSongsCollection')}
                </Text>
              ) : (
                availableGeneralSongs.map(song => {
                  const isChecked = selectedPickerSongIds.has(song.id);
                  return (
                    <Pressable
                      key={song.id}
                      style={[styles.checkboxItemRow, { borderBottomColor: colors.border }]}
                      onPress={() => handleTogglePickerCheck(song.id)}
                    >
                      <Ionicons
                        name={isChecked ? "checkbox" : "square-outline"}
                        size={22}
                        color={isChecked ? colors.primary : colors.textMuted}
                        style={{ marginRight: 12 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.songItemName, { color: colors.text }]}>{song.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 3 }}>
                          {song.originalBand ? (
                            <Text style={[styles.songItemBand, { color: colors.textMuted, marginRight: 4 }]}>
                              {song.originalBand}
                            </Text>
                          ) : null}
                          {(song.style ? song.style.split(/[,/•;]+/).map(s => s.trim()).filter(Boolean) : []).map((tag, tIdx) => (
                            <View key={tIdx} style={{ backgroundColor: colors.primary + '18', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, borderWidth: 0.5, borderColor: colors.primary + '40' }}>
                              <Text style={{ fontSize: 10, color: colors.primary, fontWeight: '600' }}>{tag}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>

            <View style={styles.modalFooterRow}>
              <Pressable
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowSongPickerModal(false)}
              >
                <Text style={{ color: colors.text }}>{t('cancel')}</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirmBtn, { backgroundColor: colors.primary }]}
                onPress={handleSavePickerSongs}
              >
                <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>{t('saveRepertoire')}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL ADICIONAR/EDITAR FINANCEIRO */}
      <Modal visible={showAddFinanceModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.pickerModalContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border, maxHeight: '90%' }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary + '18', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="cash-outline" size={18} color={colors.primary} />
                </View>
                <Text style={[styles.modalTitleText, { color: colors.text }]}>
                  {editingFinanceItem ? t('editEntry') : t('newEntry')}
                </Text>
              </View>
              <Pressable onPress={() => setShowAddFinanceModal(false)}>
                <Ionicons name="close-circle" size={24} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Descrição */}
              <Text style={[styles.cleanInputLabel, { color: colors.text }]}>{t('descriptionLabel')}</Text>
              <TextInput
                style={[styles.cleanInput, { backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : '#f8fafc', color: colors.text, borderColor: colors.border }]}
                placeholder=""
                placeholderTextColor={colors.textMuted}
                value={finTitle}
                onChangeText={setFinTitle}
                maxLength={200}
              />

              {/* Valor */}
              <Text style={[styles.cleanInputLabel, { color: colors.text, marginTop: 14 }]}>{t('amountLabel')}</Text>
              <TextInput
                style={[styles.cleanInput, { backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : '#f8fafc', color: colors.text, borderColor: colors.border, fontSize: 18, fontWeight: '800' }]}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={finAmount}
                onChangeText={setFinAmount}
                maxLength={20}
              />

              {/* Tipo: Entrada / Saída */}
              <Text style={[styles.cleanInputLabel, { color: colors.text, marginTop: 14 }]}>{t('entryTypeLabel')}</Text>
              <View style={{ flexDirection: 'row', marginTop: 6, marginBottom: 12, gap: 8 }}>
                <Pressable
                  style={[
                    styles.typeSelectBtn,
                    { backgroundColor: finType === 'income' ? '#10b981' : (isDark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.15)'), borderColor: '#10b981', borderWidth: 1.5 }
                  ]}
                  onPress={() => setFinType('income')}
                >
                  <Ionicons name="trending-up" size={16} color={finType === 'income' ? '#fff' : '#10b981'} style={{ marginRight: 4 }} />
                  <Text style={[styles.typeSelectText, { color: finType === 'income' ? '#ffffff' : '#10b981' }]}>{t('incomeEntry')}</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.typeSelectBtn,
                    { backgroundColor: finType === 'expense' ? '#ef4444' : (isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.15)'), borderColor: '#ef4444', borderWidth: 1.5 }
                  ]}
                  onPress={() => setFinType('expense')}
                >
                  <Ionicons name="trending-down" size={16} color={finType === 'expense' ? '#fff' : '#ef4444'} style={{ marginRight: 4 }} />
                  <Text style={[styles.typeSelectText, { color: finType === 'expense' ? '#ffffff' : '#ef4444' }]}>{t('expenseEntry')}</Text>
                </Pressable>
              </View>

              {/* Data */}
              <Text style={[styles.cleanInputLabel, { color: colors.text }]}>{t('dateLabel') || 'Data'}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Pressable style={{ flex: 1 }} onPress={() => setShowFinDatePicker(true)}>
                  <View pointerEvents="none">
                    <TextInput
                      style={[styles.cleanInput, { backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : '#f8fafc', color: colors.text, borderColor: colors.border }]}
                      placeholder={t('datePlaceholder') || 'DD/MM/AAAA'}
                      placeholderTextColor={colors.textMuted}
                      value={finDate}
                      editable={false}
                      maxLength={20}
                    />
                  </View>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [{
                    height: 42, paddingHorizontal: 12, borderRadius: 8,
                    backgroundColor: colors.primary + '18', borderColor: colors.primary + '40', borderWidth: 1,
                    justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 4,
                    opacity: pressed ? 0.7 : 1
                  }]}
                  onPress={() => {
                    const now = new Date();
                    const day = String(now.getDate()).padStart(2, '0');
                    const month = String(now.getMonth() + 1).padStart(2, '0');
                    const year = now.getFullYear();
                    setFinDate(`${day}/${month}/${year}`);
                  }}
                >
                  <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.primary }}>{t('today')}</Text>
                </Pressable>
              </View>

              {showFinDatePicker && (
                <DateTimePicker
                  value={(() => {
                    if (finDate && finDate.includes('/')) {
                      const [d, m, y] = finDate.split('/').map(n => parseInt(n, 10));
                      if (y && m && d) return new Date(y, m - 1, d);
                    }
                    return new Date();
                  })()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowFinDatePicker(Platform.OS === 'ios');
                    if (selectedDate && event.type !== 'dismissed') {
                      const dd = String(selectedDate.getDate()).padStart(2, '0');
                      const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
                      const yyyy = selectedDate.getFullYear();
                      setFinDate(`${dd}/${mm}/${yyyy}`);
                    }
                  }}
                />
              )}

              {/* Status: Pago / Pendente */}
              <Text style={[styles.cleanInputLabel, { color: colors.text, marginTop: 14 }]}>{t('statusLabel')}</Text>
              <View style={{ flexDirection: 'row', marginTop: 6, gap: 8 }}>
                <Pressable
                  style={[styles.statusPillBtn, {
                    backgroundColor: finStatus === 'paid' ? '#10b981' : 'transparent',
                    borderColor: '#10b981'
                  }]}
                  onPress={() => setFinStatus('paid')}
                >
                  <Ionicons name="checkmark-circle" size={16} color={finStatus === 'paid' ? '#fff' : '#10b981'} style={{ marginRight: 4 }} />
                  <Text style={[styles.statusPillText, { color: finStatus === 'paid' ? '#ffffff' : '#10b981' }]}>{t('paidStatus')}</Text>
                </Pressable>
                <Pressable
                  style={[styles.statusPillBtn, {
                    backgroundColor: finStatus === 'pending' ? '#eab308' : 'transparent',
                    borderColor: '#eab308'
                  }]}
                  onPress={() => setFinStatus('pending')}
                >
                  <Ionicons name="time-outline" size={16} color={finStatus === 'pending' ? '#fff' : '#eab308'} style={{ marginRight: 4 }} />
                  <Text style={[styles.statusPillText, { color: finStatus === 'pending' ? '#ffffff' : '#eab308' }]}>{t('pendingStatus')}</Text>
                </Pressable>
              </View>

              {/* Observações */}
              <Text style={[styles.cleanInputLabel, { color: colors.text, marginTop: 14 }]}>{t('notesLabel')}</Text>
              <TextInput
                style={[styles.cleanInput, { backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : '#f8fafc', color: colors.text, borderColor: colors.border, height: 70, textAlignVertical: 'top', paddingTop: 10 }]}
                placeholder={t('notesPlaceholder') || ''}
                placeholderTextColor={colors.textMuted}
                value={finNotes}
                onChangeText={setFinNotes}
                multiline
                maxLength={500}
              />

              {/* Divisão entre Membros */}
              <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14 }}>
                <Pressable
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                  onPress={() => setFinShowMemberSplit(!finShowMemberSplit)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="people-outline" size={18} color={colors.primary} />
                    <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>{t('splitAmongMembers')}</Text>
                  </View>
                  <Ionicons name={finShowMemberSplit ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
                </Pressable>

                {finShowMemberSplit && (
                  <View style={{ marginTop: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}>
                      <Pressable
                        style={[styles.equalSplitBtn, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}
                        onPress={handleFinDivideEqually}
                      >
                        <Ionicons name="calculator-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                        <Text style={{ fontSize: 11, fontWeight: '900', color: colors.primary }}>{t('divideEqually')}</Text>
                      </Pressable>
                    </View>
                    {activeMembers.map(m => {
                      const val = finMemberSplits[m.id] !== undefined ? finMemberSplits[m.id] : '';
                      return (
                        <View key={m.id} style={[styles.memberSplitRow, { borderBottomColor: colors.border }]}>
                          <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center', marginRight: 8 }}>
                            <Text style={{ fontSize: 11, fontWeight: '900', color: colors.primary }}>{getBandInitials(m.name)}</Text>
                          </View>
                          <View style={{ flex: 1, paddingRight: 6 }}>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>{m.name}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={{ fontSize: 13, fontWeight: '900', color: colors.primary, marginRight: 4 }}>$</Text>
                            <TextInput
                              style={[styles.splitCurrencyInput, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? '#18181b' : '#f4f4f5', width: 80, height: 34, fontSize: 12 }]}
                              keyboardType="numeric"
                              value={String(val)}
                              onChangeText={(txt) => setFinMemberSplits(prev => ({ ...prev, [m.id]: txt }))}
                              placeholder="0.00"
                              placeholderTextColor={colors.textMuted}
                              maxLength={20}
                            />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalFooterRow}>
              <Pressable
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowAddFinanceModal(false)}
              >
                <Text style={{ color: colors.text }}>{t('cancel')}</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirmBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveFinanceEntry}
              >
                <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>{t('save')}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL ADICIONAR/EDITAR INTEGRANTE (BOTTOM SHEET) */}
      <Modal visible={showMemberModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.pickerModalContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border, maxHeight: '85%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitleText, { color: colors.text }]}>
                {editingMemberId ? t('editMember') : t('newMember')}
              </Text>
              <Pressable onPress={handleCancelEditMember}>
                <Ionicons name="close-circle" size={24} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView>
              <Text style={[styles.cleanInputLabel, { color: colors.text }]}>{t('memberNameLabel')}</Text>
              <TextInput
                style={[styles.cleanInput, { backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : '#f8fafc', color: colors.text, borderColor: colors.border }]}
                placeholder=""
                placeholderTextColor={colors.textMuted}
                value={memberName}
                onChangeText={setMemberName}
                maxLength={100}
              />

              <Text style={[styles.cleanInputLabel, { color: colors.text, marginTop: 12 }]}>{t('memberRoleLabel')}</Text>
              <TextInput
                style={[styles.cleanInput, { backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : '#f8fafc', color: colors.text, borderColor: colors.border }]}
                placeholder={t('rolePlaceholder') || 'Ex: Vocal, Guitarra, Baixo'}
                placeholderTextColor={colors.textMuted}
                value={memberRole}
                onChangeText={setMemberRole}
                maxLength={100}
              />

              <Text style={[styles.cleanInputLabel, { color: colors.text, marginTop: 12 }]}>Nome de Usuário (@rede / explorar)</Text>
              <TextInput
                style={[styles.cleanInput, { backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : '#f8fafc', color: colors.text, borderColor: colors.border }]}
                placeholder="Ex: @lucas_bass"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                value={memberUsername}
                onChangeText={setMemberUsername}
                maxLength={50}
              />

              <View style={[styles.periodRow, { marginTop: 12 }]}>
                <View style={[styles.cleanFormGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.cleanInputLabel, { color: colors.text }]}>{t('startDateLabel')}</Text>
                  <Pressable onPress={() => setShowStartDatePicker(true)}>
                    <View pointerEvents="none">
                      <TextInput
                        style={[styles.cleanInput, { backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : '#f8fafc', color: colors.text, borderColor: colors.border }]}
                        placeholder={t('datePlaceholder') || 'DD/MM/AAAA'}
                        placeholderTextColor={colors.textMuted}
                        value={memberStartDate}
                        editable={false}
                        maxLength={20}
                      />
                    </View>
                  </Pressable>
                </View>

                <View style={[styles.cleanFormGroup, { flex: 1 }]}>
                  <Text style={[styles.cleanInputLabel, { color: colors.text }]}>{t('endDateLabel')}</Text>
                  <Pressable onPress={() => setShowEndDatePicker(true)}>
                    <View pointerEvents="none">
                      <TextInput
                        style={[styles.cleanInput, { backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : '#f8fafc', color: colors.text, borderColor: colors.border }]}
                        placeholder="DD/MM/AAAA"
                        placeholderTextColor={colors.textMuted}
                        value={memberEndDate}
                        editable={false}
                        maxLength={20}
                      />
                    </View>
                  </Pressable>
                </View>
              </View>

              {showStartDatePicker && (
                <DateTimePicker
                  value={(() => {
                    if (memberStartDate && memberStartDate.includes('/')) {
                      const [d, m, y] = memberStartDate.split('/').map(n => parseInt(n, 10));
                      if (y && m && d) return new Date(y, m - 1, d);
                    }
                    return new Date();
                  })()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowStartDatePicker(Platform.OS === 'ios');
                    if (selectedDate && event.type !== 'dismissed') {
                      const dd = String(selectedDate.getDate()).padStart(2, '0');
                      const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
                      const yyyy = selectedDate.getFullYear();
                      setMemberStartDate(`${dd}/${mm}/${yyyy}`);
                    }
                  }}
                />
              )}

              {showEndDatePicker && (
                <DateTimePicker
                  value={(() => {
                    if (memberEndDate && memberEndDate.includes('/')) {
                      const [d, m, y] = memberEndDate.split('/').map(n => parseInt(n, 10));
                      if (y && m && d) return new Date(y, m - 1, d);
                    }
                    return new Date();
                  })()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowEndDatePicker(Platform.OS === 'ios');
                    if (selectedDate && event.type !== 'dismissed') {
                      const dd = String(selectedDate.getDate()).padStart(2, '0');
                      const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
                      const yyyy = selectedDate.getFullYear();
                      setMemberEndDate(`${dd}/${mm}/${yyyy}`);
                    }
                  }}
                />
              )}

              {/* Seletor de Nível / Posição (Líder vs Membro) */}
              <Text style={[styles.cleanInputLabel, { color: colors.text, marginTop: 14 }]}>
                {t('bandPosition') || 'POSIÇÃO / NÍVEL NA BANDA'}
              </Text>
              <View style={styles.statusPillGroup}>
                <Pressable
                  style={[
                    styles.statusPillBtn,
                    memberIsLeader && { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
                    !isUserLeader && { opacity: 0.5 }
                  ]}
                  onPress={() => {
                    if (!isUserLeader) {
                      Alert.alert(t('error') || 'Aviso', t('onlyLeadersCanChangeRoles') || 'Apenas líderes podem alterar cargos e privilégios.');
                      return;
                    }
                    setMemberIsLeader(true);
                  }}
                >
                  <Ionicons name="shield-checkmark" size={16} color={memberIsLeader ? '#ffffff' : colors.textMuted} style={{ marginRight: 4 }} />
                  <Text style={[styles.statusPillText, { color: memberIsLeader ? '#ffffff' : colors.text }]}>
                    {t('leader') || 'Líder'}
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.statusPillBtn,
                    !memberIsLeader && { backgroundColor: '#6b7280', borderColor: '#6b7280' },
                    !isUserLeader && { opacity: 0.5 }
                  ]}
                  onPress={() => {
                    if (!isUserLeader) {
                      Alert.alert(t('error') || 'Aviso', t('onlyLeadersCanChangeRoles') || 'Apenas líderes podem alterar cargos e privilégios.');
                      return;
                    }
                    setMemberIsLeader(false);
                  }}
                >
                  <Ionicons name="person" size={16} color={!memberIsLeader ? '#ffffff' : colors.textMuted} style={{ marginRight: 4 }} />
                  <Text style={[styles.statusPillText, { color: !memberIsLeader ? '#ffffff' : colors.text }]}>
                    {t('member') || 'Membro'}
                  </Text>
                </Pressable>
              </View>
              <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, fontStyle: 'italic', marginBottom: 2 }}>
                {memberIsLeader 
                  ? (t('leaderPrivilegesHint') || 'Líderes podem gerenciar repertório, integrantes, finanças e dados da banda.')
                  : (t('memberPrivilegesHint') || 'Membros comuns têm acesso à agenda e repertório sem permissão de edição.')}
              </Text>

              <Text style={[styles.cleanInputLabel, { color: colors.text, marginTop: 12 }]}>{t('memberStatusLabel')}</Text>
              <View style={styles.statusPillGroup}>
                <Pressable
                  style={[
                    styles.statusPillBtn,
                    memberStatus === 'active' && { backgroundColor: '#10b981', borderColor: '#10b981' }
                  ]}
                  onPress={() => setMemberStatus('active')}
                >
                  <Ionicons name="checkmark-circle" size={16} color={memberStatus === 'active' ? '#ffffff' : colors.textMuted} style={{ marginRight: 4 }} />
                  <Text style={[styles.statusPillText, { color: memberStatus === 'active' ? '#ffffff' : colors.text }]}>{t('active')}</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.statusPillBtn,
                    memberStatus === 'inactive' && { backgroundColor: '#6b7280', borderColor: '#6b7280' }
                  ]}
                  onPress={() => setMemberStatus('inactive')}
                >
                  <Ionicons name="close-circle" size={16} color={memberStatus === 'inactive' ? '#ffffff' : colors.textMuted} style={{ marginRight: 4 }} />
                  <Text style={[styles.statusPillText, { color: memberStatus === 'inactive' ? '#ffffff' : colors.text }]}>{t('inactive')}</Text>
                </Pressable>
              </View>
            </ScrollView>

            <View style={styles.modalFooterRow}>
              {editingMemberId && isUserLeader ? (
                <Pressable
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: (colors.danger || '#ef4444') + '15',
                    borderWidth: 1,
                    borderColor: (colors.danger || '#ef4444') + '30',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 'auto',
                  }}
                  onPress={() => {
                    const memberToDelete = members.find(m => m.id === editingMemberId);
                    if (memberToDelete) handleDeleteMember(memberToDelete);
                  }}
                  hitSlop={8}
                  accessibilityLabel={t('deleteMember') || "Excluir integrante"}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.danger || '#ef4444'} />
                </Pressable>
              ) : null}
              <Pressable
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={handleCancelEditMember}
              >
                <Text style={{ color: colors.text }}>{t('cancel')}</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirmBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveMember}
              >
                <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>{t('saveMember')}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL BOTTOM SHEET DE ORDENAÇÃO DO REPERTÓRIO */}
      <Modal visible={showSortModal} animationType="slide" transparent onRequestClose={() => setShowSortModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowSortModal(false)}>
          <View style={[styles.bottomSheetContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitleText, { color: colors.text }]}>{t('organizeRepertoire')}</Text>
              <Pressable onPress={() => setShowSortModal(false)}>
                <Ionicons name="close-circle" size={24} color={colors.textMuted} />
              </Pressable>
            </View>

            <View style={{ gap: 8, marginVertical: 12 }}>
              {[
                { id: 'name_asc', label: t('songNameAsc'), icon: 'text' },
                { id: 'name_desc', label: t('songNameDesc'), icon: 'text' },
                { id: 'band_asc', label: t('bandNameAsc'), icon: 'disc' },
                { id: 'band_desc', label: t('bandNameDesc'), icon: 'disc' },
              ].map(opt => {
                const isSelected = repertoireSort === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    style={({ pressed }) => [
                      styles.sortOptionRow,
                      {
                        backgroundColor: isSelected ? colors.primary + '18' : isDark ? '#27272a' : '#f4f4f5',
                        borderColor: isSelected ? colors.primary : colors.border,
                        transform: [{ scale: pressed ? 0.98 : 1 }]
                      }
                    ]}
                    onPress={() => {
                      setRepertoireSort(opt.id);
                      setShowSortModal(false);
                    }}
                  >
                    <Ionicons name={opt.icon} size={18} color={isSelected ? colors.primary : colors.text} style={{ marginRight: 10 }} />
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: isSelected ? '900' : '600', color: isSelected ? colors.primary : colors.text }}>
                      {opt.label}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* MODAL BOTTOM SHEET SELETOR: QUEM É VOCÊ NESTA BANDA */}
      <Modal visible={showWhoAreYouModal} animationType="slide" transparent onRequestClose={() => setShowWhoAreYouModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowWhoAreYouModal(false)}>
          <Pressable
            style={[styles.bottomSheetContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="star" size={20} color={colors.primary} />
                <Text style={[styles.modalTitleText, { color: colors.text }]}>{t('whoAreYouInBand') || 'Quem é você nesta Banda?'}</Text>
              </View>
              <Pressable onPress={() => setShowWhoAreYouModal(false)}>
                <Ionicons name="close-circle" size={24} color={colors.textMuted} />
              </Pressable>
            </View>

            <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 14 }}>
              {t('selectYourProfile') || 'Selecione seu perfil de integrante para vincular e calcular sua parte no financeiro da banda.'}
            </Text>

            {members.length === 0 ? (
              <Text style={{ fontSize: 13, color: colors.textMuted, fontStyle: 'italic', textAlign: 'center', marginVertical: 20 }}>
                {t('noMembersRegistered') || 'Nenhum integrante cadastrado nesta banda ainda.'}
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 320 }}>
                {members.map(m => {
                  const isMe = myMemberId === m.id;
                  return (
                    <Pressable
                      key={m.id}
                      style={({ pressed }) => [
                        styles.whoAreYouModalRow,
                        {
                          backgroundColor: isMe ? colors.primary + '18' : (isDark ? '#27272a' : '#f4f4f5'),
                          borderColor: isMe ? colors.primary : colors.border,
                          borderWidth: 1,
                          marginVertical: 4,
                          borderRadius: 12,
                          padding: 12,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          opacity: pressed ? 0.8 : 1,
                        }
                      ]}
                      onPress={async () => {
                        await handleSelectMyMember(m.id);
                        setShowWhoAreYouModal(false);
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <View style={[styles.memberAvatarCircle, { backgroundColor: isMe ? colors.primary : colors.primary + '20' }]}>
                          <Ionicons name={isMe ? "star" : "person"} size={16} color={isMe ? "#ffffff" : colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '900', color: colors.text }}>{m.name}</Text>
                          {m.role ? <Text style={{ fontSize: 11, color: colors.textMuted }}>{m.role}</Text> : null}
                        </View>
                      </View>

                      {isMe ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
                          <Ionicons name="checkmark" size={14} color="#ffffff" />
                          <Text style={{ fontSize: 10, fontWeight: '900', color: '#ffffff' }}>VOCÊ</Text>
                        </View>
                      ) : (
                        <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary }}>{t('selectBtn') || 'Selecionar'}</Text>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* MODAL BOTTOM SHEET DE DIVISÃO DE CACHÊ POR INTEGRANTE */}
      <Modal visible={showCacheSplitModal} animationType="slide" transparent onRequestClose={() => setShowCacheSplitModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.bottomSheetContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitleText, { color: colors.text }]}>{t('cacheSplitTitle')}</Text>
                <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '700', marginTop: 2 }}>
                  {selectedShowForSplit ? selectedShowForSplit.name : ''}
                </Text>
              </View>
              <Pressable onPress={() => setShowCacheSplitModal(false)}>
                <Ionicons name="close-circle" size={24} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* Subcabeçalho com botão Dividir Igualmente */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 10, paddingHorizontal: 4 }}>
              <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '700' }}>
                {t('totalCachet')} <Text style={{ color: '#10b981', fontWeight: '900', fontSize: 14 }}>$ {(parseCurrency(selectedShowForSplit ? (selectedShowForSplit.cachê || selectedShowForSplit.cache || selectedShowForSplit.valCache || selectedShowForSplit.value) : 0)).toFixed(2)}</Text>
              </Text>
              <Pressable
                style={[styles.equalSplitBtn, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}
                onPress={handleDivideCachetEqually}
              >
                <Ionicons name="calculator-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 11, fontWeight: '900', color: colors.primary }}>{t('divideEqually')}</Text>
              </Pressable>
            </View>

            
            {/* OPÇÃO: CAIXA DA BANDA (IDÊNTICO À WEB) */}
            <View style={{
              backgroundColor: isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(56, 189, 248, 0.1)',
              borderColor: 'rgba(56, 189, 248, 0.25)',
              borderWidth: 1,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 9,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginVertical: 4
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={{
                  width: 34, height: 34, borderRadius: 10,
                  backgroundColor: 'rgba(56, 189, 248, 0.18)',
                  borderColor: 'rgba(56, 189, 248, 0.35)',
                  borderWidth: 1,
                  alignItems: 'center', justifyContent: 'center'
                }}>
                  <Ionicons name="wallet-outline" size={17} color="#38bdf8" />
                </View>
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>
                    {t('bandCash') || 'Caixa da Banda'}
                  </Text>
                  <Text style={{ fontSize: 10.5, color: colors.textMuted }}>
                    {t('destinedToReserve') || 'Valor retido para o fundo da banda'}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 14, fontWeight: '900', color: '#38bdf8' }}>$</Text>
                <TextInput
                  style={[styles.splitCurrencyInput, {
                    color: '#38bdf8',
                    borderColor: 'rgba(56, 189, 248, 0.4)',
                    backgroundColor: isDark ? '#18181b' : '#f4f4f5',
                    width: 85,
                    fontWeight: '900'
                  }]}
                  keyboardType="numeric"
                  value={splitBandFund}
                  onChangeText={setSplitBandFund}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  maxLength={12}
                />
              </View>
            </View>

            {/* Toggle Pago/Pendente */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 12 }}>
              <Pressable 
                style={{ 
                  flexDirection: 'row', alignItems: 'center', 
                  backgroundColor: selectedShowCacheStatus === 'paid' ? colors.primary + '30' : 'transparent',
                  paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8,
                  borderWidth: 1, borderColor: selectedShowCacheStatus === 'paid' ? colors.primary : colors.border
                }}
                onPress={() => setSelectedShowCacheStatus('paid')}
              >
                <Ionicons name="checkmark-circle" size={16} color={selectedShowCacheStatus === 'paid' ? colors.primary : colors.textMuted} style={{marginRight: 4}} />
                <Text style={{ color: selectedShowCacheStatus === 'paid' ? colors.primary : colors.textMuted, fontWeight: '600', fontSize: 13 }}>{t('paidStatus')}</Text>
              </Pressable>
              <Pressable 
                style={{ 
                  flexDirection: 'row', alignItems: 'center', 
                  backgroundColor: selectedShowCacheStatus === 'pending' ? '#eab30830' : 'transparent',
                  paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
                  borderWidth: 1, borderColor: selectedShowCacheStatus === 'pending' ? '#eab308' : colors.border
                }}
                onPress={() => setSelectedShowCacheStatus('pending')}
              >
                <Ionicons name="time" size={16} color={selectedShowCacheStatus === 'pending' ? '#eab308' : colors.textMuted} style={{marginRight: 4}} />
                <Text style={{ color: selectedShowCacheStatus === 'pending' ? '#eab308' : colors.textMuted, fontWeight: '600', fontSize: 13 }}>{t('pendingStatus')}</Text>
              </Pressable>
            </View>

            {/* Lista de Integrantes Ativos e Input de Cachê */}
            <ScrollView style={{ maxHeight: 350, marginVertical: 8 }} showsVerticalScrollIndicator={false}>
              {activeMembers.length === 0 ? (
                <Text style={{ textAlign: 'center', color: colors.textMuted, marginVertical: 20 }}>
                  {t('noActiveMembersBand')}
                </Text>
              ) : (
                activeMembers.map(m => {
                  const val = memberSplits[m.id] !== undefined ? memberSplits[m.id] : '';
                  return (
                    <View key={m.id} style={[styles.memberSplitRow, { borderBottomColor: colors.border }]}>
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                        <Text style={{ fontSize: 14, fontWeight: '900', color: colors.primary }}>{getBandInitials(m.name)}</Text>
                      </View>
                      <View style={{ flex: 1, paddingRight: 6 }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>{m.name}</Text>
                        <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '700' }}>{m.role || (t('memberFallback') || 'Integrante')}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 14, fontWeight: '900', color: colors.primary, marginRight: 4 }}>$</Text>
                        <TextInput
                          style={[styles.splitCurrencyInput, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? '#18181b' : '#f4f4f5' }]}
                          keyboardType="numeric"
                          value={String(val)}
                          onChangeText={(txt) => {
                            setMemberSplits(prev => ({ ...prev, [m.id]: txt }));
                          }}
                          placeholder="0.00"
                          placeholderTextColor={colors.textMuted}
                          maxLength={20}
                        />
                      </View>
                    </View>
                  );
                })
              )}

              {/* SEÇÃO DE SUBSTITUTOS */}
              <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="swap-horizontal-outline" size={16} color="#eab308" />
                    <Text style={{ fontSize: 13, fontWeight: '900', color: colors.text }}>{t('substitutesLabel')}</Text>
                  </View>
                  <Pressable
                    style={[styles.equalSplitBtn, { backgroundColor: '#eab30818', borderColor: '#eab30840' }]}
                    onPress={handleAddSubstitute}
                  >
                    <Ionicons name="add" size={14} color="#eab308" style={{ marginRight: 2 }} />
                    <Text style={{ fontSize: 11, fontWeight: '900', color: '#eab308' }}>{t('addSubstitute')}</Text>
                  </Pressable>
                </View>

                {substitutes.map((sub, idx) => (
                  <View key={`sub_${idx}`} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 }}>
                    <TextInput
                      style={[styles.cleanInput, {
                        flex: 1, height: 38, backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : '#f8fafc',
                        color: colors.text, borderColor: '#eab30840', fontSize: 12
                      }]}
                      placeholder={t('substituteName')}
                      placeholderTextColor={colors.textMuted}
                      value={sub.name}
                      onChangeText={(txt) => handleUpdateSubstitute(idx, 'name', txt)}
                      maxLength={100}
                    />
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, fontWeight: '900', color: '#eab308', marginRight: 3 }}>$</Text>
                      <TextInput
                        style={[styles.splitCurrencyInput, {
                          color: colors.text, borderColor: '#eab30840',
                          backgroundColor: isDark ? '#18181b' : '#f4f4f5', width: 80
                        }]}
                        keyboardType="numeric"
                        value={sub.amount}
                        onChangeText={(txt) => handleUpdateSubstitute(idx, 'amount', txt)}
                        placeholder="0.00"
                        placeholderTextColor={colors.textMuted}
                        maxLength={20}
                      />
                    </View>
                    <Pressable onPress={() => handleRemoveSubstitute(idx)} style={{ padding: 4 }}>
                      <Ionicons name="close-circle" size={20} color={colors.danger || '#ef4444'} />
                    </Pressable>
                  </View>
                ))}

                {substitutes.length === 0 && (
                  <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center', marginVertical: 4, fontStyle: 'italic' }}>
                    {t('noSubstitutes') || '—'}
                  </Text>
                )}
              </View>
            </ScrollView>

            {/* RESUMO CONTÁBIL DA DIVISÃO (4 COLUNAS: TOTAL SHOW, CAIXA, MÚSICOS, SALDO) */}
            {(() => {
              const rawCache = selectedShowForSplit ? (selectedShowForSplit.cachê || selectedShowForSplit.cache || selectedShowForSplit.valCache || selectedShowForSplit.value) : 0;
              const grossNum = parseCurrency(rawCache);
              const fundNum = parseFloat(String(splitBandFund || '0').replace(',', '.')) || 0;

              let membersSum = 0;
              Object.values(memberSplits).forEach(v => {
                membersSum += parseFloat(String(v || '0').replace(',', '.')) || 0;
              });

              let subsSum = 0;
              substitutes.forEach(s => {
                subsSum += parseFloat(String(s.amount || '0').replace(',', '.')) || 0;
              });

              const totalDistributed = membersSum + subsSum;
              const balance = grossNum - (fundNum + totalDistributed);

              const isBalanced = Math.abs(balance) < 0.01;
              const isExcess = balance < -0.01;
              const balanceColor = isBalanced ? '#4ade80' : isExcess ? '#f87171' : '#fbbf24';

              return (
                <View style={{
                  backgroundColor: isDark ? '#101624' : '#f8fafc',
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 8,
                  marginTop: 6,
                  marginBottom: 10,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: 9.5, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase' }}>
                      {t('showTotal') || 'Total Show'}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: '900', color: colors.text, marginTop: 2 }}>
                      $ {grossNum.toFixed(2)}
                    </Text>
                  </View>

                  <View style={{ width: 1, height: 24, backgroundColor: colors.border }} />

                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: 9.5, color: '#38bdf8', fontWeight: '700', textTransform: 'uppercase' }}>
                      {t('bandCash') || 'Caixa'}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: '900', color: '#38bdf8', marginTop: 2 }}>
                      $ {fundNum.toFixed(2)}
                    </Text>
                  </View>

                  <View style={{ width: 1, height: 24, backgroundColor: colors.border }} />

                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: 9.5, color: '#4ade80', fontWeight: '700', textTransform: 'uppercase' }}>
                      {t('musicians') || 'Músicos'}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: '900', color: '#4ade80', marginTop: 2 }}>
                      $ {totalDistributed.toFixed(2)}
                    </Text>
                  </View>

                  <View style={{ width: 1, height: 24, backgroundColor: colors.border }} />

                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: 9.5, color: balanceColor, fontWeight: '700', textTransform: 'uppercase' }}>
                      {t('remaining') || 'Saldo'}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: '900', color: balanceColor, marginTop: 2 }}>
                      $ {isBalanced ? '0.00' : balance.toFixed(2)}
                    </Text>
                  </View>
                </View>
              );
            })()}

            <View style={styles.modalFooterRow}>
              <Pressable style={[styles.modalCancelBtn, { borderColor: colors.border }]} onPress={() => setShowCacheSplitModal(false)}>
                <Text style={{ color: colors.text }}>{t('cancel')}</Text>
              </Pressable>
              <Pressable style={[styles.modalConfirmBtn, { backgroundColor: colors.primary }]} onPress={handleSaveCachetSplit}>
                <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>{t('saveSplit')}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL DE PERFIL DO MÚSICO */}
      <MusicianProfileModal
        visible={showMusicianProfileModal}
        musician={selectedMusicianProfile}
        onClose={() => {
          setShowMusicianProfileModal(false);
          setSelectedMusicianProfile(null);
        }}
      />

      {/* MODAL COMPARTILHAR AGENDA DA BANDA (mesmo sistema da agenda do perfil) */}
      <ShareAgendaModal
        visible={showShareAgendaModal}
        onClose={() => setShowShareAgendaModal(false)}
        events={shareableAgendaEvents}
        initialSelectedIds={upcomingAgendaIds}
        displayName={band.name}
        headerLogo={bandLogoUri}
        qrValue={'https://bandlink.pro/b/' + bandQrSlug}
      />

      {/* MODAL DE SINCRONIZAÇÃO EM NUVEM E REDE BANDLINK */}
      <Modal visible={showSyncModal} animationType="slide" transparent onRequestClose={() => setShowSyncModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.bottomSheetContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border, maxHeight: '88%' }]}>
            
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary + '22', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="cloud-outline" size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.modalTitleText, { color: colors.text }]}>{t('cloudSyncNetworkTitle') || 'Sincronização & Rede'}</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>{t('cloudSyncOfflineFirst') || 'BandLink Cloud (Offline-First)'}</Text>
                </View>
              </View>
              <Pressable onPress={() => setShowSyncModal(false)} style={{ padding: 6 }}>
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
              {/* Se a banda for offline, oferece botão direto para publicar online */}
              {!band?.cloudId && (
                <View style={{
                  backgroundColor: 'rgba(56, 189, 248, 0.1)',
                  borderColor: 'rgba(56, 189, 248, 0.3)',
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 16,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Ionicons name="cloud-offline-outline" size={20} color="#38bdf8" />
                    <Text style={{ color: '#38bdf8', fontWeight: '800', fontSize: 14 }}>
                      Banda em Modo Offline
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 18, marginBottom: 12 }}>
                    Esta banda está salva apenas neste dispositivo. Para sincronizar com outros integrantes e acessar via web, publique-a no BandLink Cloud.
                  </Text>
                  <Pressable
                    onPress={async () => {
                      setShowSyncModal(false);
                      const logged = await api.isLoggedIn();
                      if (!logged) {
                        Alert.alert(
                          t('attention') || 'Atenção',
                          'Você precisa estar conectado a uma conta para publicar a banda na nuvem.',
                          [{ text: 'OK' }]
                        );
                        return;
                      }
                      setShowPublishModal(true);
                    }}
                    style={{
                      backgroundColor: '#38bdf8',
                      borderRadius: 10,
                      paddingVertical: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 6
                    }}
                  >
                    <Ionicons name="cloud-upload-outline" size={16} color="#ffffff" />
                    <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 13 }}>
                      Publicar Banda na Nuvem
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* Role & Status Banner */}
              <View style={{
                backgroundColor: isUserLeader ? 'rgba(56, 189, 248, 0.1)' : 'rgba(168, 85, 247, 0.1)',
                borderColor: isUserLeader ? 'rgba(56, 189, 248, 0.3)' : 'rgba(168, 85, 247, 0.3)',
                borderWidth: 1,
                borderRadius: 12,
                padding: 14,
                marginBottom: 16,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name={isUserLeader ? "ribbon-outline" : "people-outline"} size={18} color={isUserLeader ? "#38bdf8" : "#a855f7"} />
                    <Text style={{ color: isUserLeader ? "#38bdf8" : "#a855f7", fontWeight: '700', fontSize: 13 }}>
                      {isUserLeader ? (t('youAreLeader') || "Você é o Líder da Banda") : (t('youAreMember') || "Você é Integrante da Banda")}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ fontSize: 11, color: colors.text, fontWeight: '700' }}>
                      v{syncStatusInfo.localVersion || 1}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 17 }}>
                  {isUserLeader
                    ? (t('leaderSyncDesc') || "Como líder, você atualiza o repertório, cifras e setlists e envia as novidades para a nuvem. Todos os integrantes receberão as alterações.")
                    : (t('memberSyncDesc') || "Como integrante, você recebe as músicas, cifras e alterações salvas pelo líder e armazena tudo no SQLite offline para tocar nos shows.")}
                </Text>
              </View>

              {/* Alert: Remote updates available */}
              {syncStatusInfo.hasRemoteUpdates && !isUserLeader && (
                <View style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.12)',
                  borderColor: 'rgba(245, 158, 11, 0.4)',
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 16,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Ionicons name="sparkles" size={18} color="#f59e0b" />
                    <Text style={{ color: '#f59e0b', fontWeight: '700', fontSize: 13 }}>
                      {t('leaderUpdateAvailable') || "Atualização Disponível do Líder!"}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: colors.text, opacity: 0.9, lineHeight: 17 }}>
                    {(t('leaderUpdateDesc') || "O líder publicou a versão v{version}. Baixe agora para atualizar seu repertório e cifras locais.").replace('{version}', syncStatusInfo.remoteVersion || 1)}
                  </Text>
                </View>
              )}

              {/* Network Visibility Switch (Leader Only) */}
              <View style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 12,
                padding: 14,
                marginBottom: 16,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>
                      {t('visibleOnMusicNetwork') || "Visível na Rede Musical"}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                      {isNetworkVisible
                        ? (t('bandIsOnlineNetwork') || "Sua banda está online na Rede e possui página pública no ar.")
                        : (t('bandIsPrivateNetwork') || "Sua banda está privada/offline. Ninguém na rede pode visualizá-la.")}
                    </Text>
                  </View>
                  {isUserLeader ? (
                    <Pressable
                      onPress={handleToggleNetworkVisibility}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 20,
                        backgroundColor: isNetworkVisible ? '#10b981' : (isDark ? '#27272a' : '#e4e4e7'),
                      }}
                    >
                      <Text style={{ color: isNetworkVisible ? '#ffffff' : colors.textMuted, fontSize: 12, fontWeight: '700' }}>
                        {isNetworkVisible ? 'ONLINE' : 'OFFLINE'}
                      </Text>
                    </Pressable>
                  ) : (
                    <View style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 12,
                      backgroundColor: isNetworkVisible ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                    }}>
                      <Text style={{ color: isNetworkVisible ? '#10b981' : colors.textMuted, fontSize: 11, fontWeight: '700' }}>
                        {isNetworkVisible ? 'ONLINE' : (t('private') || 'PRIVADA')}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Public Link Preview */}
                {isNetworkVisible && (
                  <View style={{
                    marginTop: 8,
                    paddingTop: 10,
                    borderTopWidth: 1,
                    borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ fontSize: 10, color: colors.textMuted }}>{t('publicBandLink') || 'LINK PÚBLICO DA BANDA'}</Text>
                      <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }} numberOfLines={1}>
                        bandlink.pro/banda?id={band?.cloudId || band?.id}
                      </Text>
                    </View>
                    <Pressable
                      onPress={handleSharePublicBandLink}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: colors.primary + '22',
                      }}
                    >
                      <Ionicons name="share-social-outline" size={14} color={colors.primary} />
                      <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>{t('share') || 'Compartilhar'}</Text>
                    </Pressable>
                  </View>
                )}
              </View>

              {/* Sync Details Card */}
              <View style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 12,
                padding: 14,
                marginBottom: 20,
              }}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13, marginBottom: 10 }}>
                  {t('syncInfoTitle') || 'Informações de Sincronização'}
                </Text>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t('deviceVersion') || 'Versão no Dispositivo:'}</Text>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 12 }}>v{syncStatusInfo.localVersion || 1}</Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t('cloudVersion') || 'Versão na Nuvem:'}</Text>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 12 }}>v{syncStatusInfo.remoteVersion || 1}</Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t('lastSyncLabel') || 'Última Sincronização:'}</Text>
                  <Text style={{ color: colors.text, fontSize: 12 }}>
                    {syncStatusInfo.lastSyncedAt
                      ? new Date(syncStatusInfo.lastSyncedAt).toLocaleString(language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                      : (t('pendingSync') || 'Pendente')}
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              {isUserLeader ? (
                <View style={{ gap: 10 }}>
                  <Pressable
                    onPress={handlePushSyncToCloud}
                    disabled={isSyncing}
                    style={{
                      backgroundColor: colors.primary,
                      borderRadius: 12,
                      paddingVertical: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 8,
                      opacity: isSyncing ? 0.7 : 1,
                    }}
                  >
                    {isSyncing ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Ionicons name="cloud-upload-outline" size={18} color="#ffffff" />
                        <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 14 }}>
                          {t('pushChangesToCloud') || 'Enviar Alterações para a Nuvem'}
                        </Text>
                      </>
                    )}
                  </Pressable>

                  <Pressable
                    onPress={handlePullSyncFromCloud}
                    disabled={isSyncing}
                    style={{
                      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                      borderRadius: 12,
                      paddingVertical: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 8,
                      opacity: isSyncing ? 0.7 : 1,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Ionicons name="cloud-download-outline" size={17} color={colors.text} />
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>
                      {t('restoreFromCloud') || 'Restaurar / Baixar da Nuvem'}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={handlePullSyncFromCloud}
                  disabled={isSyncing}
                  style={{
                    backgroundColor: syncStatusInfo.hasRemoteUpdates ? '#f59e0b' : colors.primary,
                    borderRadius: 12,
                    paddingVertical: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 8,
                    opacity: isSyncing ? 0.7 : 1,
                  }}
                >
                  {isSyncing ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="cloud-download-outline" size={18} color="#ffffff" />
                      <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 14 }}>
                        {t('pullUpdatesFromLeader') || 'Baixar Atualizações do Líder'}
                      </Text>
                    </>
                  )}
                </Pressable>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL DE PUBLICAR BANDA OFFLINE NA NUVEM */}
      <PublishBandModal
        visible={showPublishModal}
        band={band}
        onClose={() => setShowPublishModal(false)}
        onSuccess={async (updatedBand) => {
          setShowPublishModal(false);
          if (updatedBand) {
            band.cloudId = updatedBand.cloudId;
            band.publicSlug = updatedBand.publicSlug;
          }
          await loadData();
          await loadSyncStatus();
          if (onReloadAll) onReloadAll();
        }}
      />

      {/* SELETOR EXCLUSIVO DE ANOS PARA O FINANCEIRO */}
      <YearPickerModal
        visible={showFinanceYearPicker}
        selectedYear={selectedFinanceYear}
        onSelectYear={(y) => {
          setSelectedFinanceYear(y);
          setShowFinanceYearPicker(false);
        }}
        onClose={() => setShowFinanceYearPicker(false)}
      />

      {/* MODAL: AJUSTE MANUAL DO CAIXA DA BANDA */}
      <Modal
        visible={showEditBandCashModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditBandCashModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground, maxWidth: 440, borderRadius: 20 }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeaderRow, { marginBottom: 16 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: '#fbbf2420', borderWidth: 1, borderColor: '#fbbf2450', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="wallet-outline" size={20} color="#fbbf24" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitleText, { color: colors.text, fontSize: 16, marginBottom: 2 }]}>
                    {t('adjustBandCash') || 'Ajustar Caixa da Banda'}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>
                    {t('bandCashSubtitle') || 'Fundo de reserva disponível'}
                  </Text>
                </View>
              </View>
              <Pressable onPress={() => setShowEditBandCashModal(false)} hitSlop={8}>
                <Ionicons name="close-circle" size={24} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* Modal Body */}
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#fbbf24', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {t('bandCashBalanceLabel') || 'Saldo do Caixa da Banda ($) *'}
                </Text>
                <TextInput
                  style={{
                    backgroundColor: colors.background,
                    borderColor: '#fbbf2470',
                    borderWidth: 1.5,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontSize: 22,
                    fontWeight: '900',
                    color: '#fbbf24',
                    textAlign: 'right'
                  }}
                  value={bandCashInput}
                  onChangeText={setBandCashInput}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  maxLength={15}
                />
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 6, lineHeight: 15 }}>
                  {t('bandCashHelp') || 'Ao salvar, este valor se tornará o saldo oficial do fundo de reserva da banda.'}
                </Text>
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 6 }}>
                  {t('adjustReason') || 'Motivo do Ajuste (Opcional)'}
                </Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={bandCashNotesInput}
                  onChangeText={setBandCashNotesInput}
                  placeholder={t('adjustReasonPlaceholder') || 'Ex: Aporte inicial, conferência de saldo, retirada...'}
                  placeholderTextColor={colors.textMuted}
                  maxLength={200}
                />
              </View>

              {/* Actions */}
              <View style={[styles.modalFooterRow, { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }]}>
                <Pressable
                  style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                  onPress={() => setShowEditBandCashModal(false)}
                >
                  <Text style={{ color: colors.text }}>{t('cancel') || 'Cancelar'}</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalConfirmBtn, { backgroundColor: '#fbbf24', borderColor: '#fbbf24' }]}
                  onPress={handleSaveBandCash}
                >
                  <Text style={{ color: '#000000', fontWeight: '900' }}>
                    {t('saveBalance') || 'Salvar Saldo'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0,
    paddingBottom: Platform.OS === 'android' ? 12 : 0,
  },
  headerHeroContainer: {
    width: '100%',
    height: 280,
    position: 'relative',
    overflow: 'hidden',
  },
  topRowNav: { position: 'absolute', top: 0, left: 0, right: 0, width: '100%', elevation: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 48 : 24, paddingHorizontal: 16, zIndex: 10 },
  topRowActions: { flexDirection: 'row', alignItems: 'center' },
  headerActionPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 6,
  },
  headerActionPillBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  headerBandInfoBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.70)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
  },
  headerInitialsBig: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 4,
    opacity: 0.9,
    textAlign: 'center',
  },
  headerBandNameText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.90)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    textAlign: 'center',
  },
  headerMemberCount: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
    marginTop: 4,
    opacity: 0.9,
  },

  tabBarContainer: { borderBottomWidth: 1, height: 48, zIndex: 10 },
  tabBarRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', height: 48 },
  tabItemIconOnly: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 48,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTabItem: { borderBottomWidth: 3 },

  tabContentFlex: { flex: 1 },
  searchToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  searchInput: { flex: 1, fontSize: 14, height: 38 },
  roundIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },

  styleFilterWrapContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
  },
  stylePillCompact: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stylePillTextCompact: { fontSize: 10.5, fontWeight: '800' },

  listPadding: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 110 },
  dedicatedTabPadding: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 110 },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 12 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', marginTop: 6, paddingHorizontal: 20 },

  unlinkSongBtn: { padding: 6 },

  openFormBtn: {
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 16,
  },
  openFormBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },

  cardPanel: { borderRadius: 12, borderWidth: 1, padding: 16 },
  cardPanelHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardPanelTitle: { fontSize: 16, fontWeight: 'bold' },

  cleanFormGroup: { marginBottom: 12 },
  cleanInputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  cleanInput: { height: 42, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, fontSize: 14 },
  periodRow: { flexDirection: 'row', marginBottom: 4 },

  statusPillGroup: { flexDirection: 'row', marginTop: 4 },
  statusPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 10,
  },
  statusPillText: { fontSize: 13, fontWeight: '600' },

  formActionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  cancelFormBtn: { paddingHorizontal: 16, height: 40, justifyContent: 'center', marginRight: 8 },
  cancelFormBtnText: { fontSize: 14, fontWeight: '600' },
  saveFormBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
  },
  saveFormBtnText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },

  memberSectionHeader: { marginTop: 16, marginBottom: 12 },
  sectionHeaderTitleGroup: { flexDirection: 'row', alignItems: 'center' },
  pillBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  roleLevelBadgeBtn: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981', marginRight: 8 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold' },

  cardPanelNoBorder: { borderRadius: 12, padding: 16, marginBottom: 10 },
  memberCardNoBorder: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  memberCardNoBorderInactive: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    opacity: 0.8,
  },
  memberCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  memberAvatarCircle: { width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden' },
  memberAvatarImg: { width: 54, height: 54, borderRadius: 27 },
  memberAvatarInitial: { fontSize: 22, fontWeight: 'bold' },
  memberNameText: { fontSize: 15, fontWeight: '800', marginRight: 4 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginRight: 6 },
  roleBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: 'bold' },
  roleBadgeCompact: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  roleBadgeTextCompact: { fontSize: 10.5, fontWeight: '700' },
  youBadge: { paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 5 },
  youBadgeText: { fontSize: 9.5, fontWeight: '800' },
  inactivePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: '#6b7280' },
  inactivePillText: { color: '#ffffff', fontSize: 10, fontWeight: 'bold' },
  memberCardRightActions: { flexDirection: 'row', alignItems: 'center' },
  iconActionBtn: { padding: 6, marginLeft: 2 },
  expandToggleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  memberCardExpandedRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  memberPeriodText: { fontSize: 12 },
  whatsAppBadge: { flexDirection: 'row', alignItems: 'center' },
  whatsAppBadgeText: { fontSize: 12, color: '#25D366', fontWeight: 'bold' },
  memberUsernameLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 3,
  },
  memberUsernameLinkText: {
    fontSize: 12,
    fontWeight: '700',
  },
  profileLinkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  profileLinkBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  deleteRejectedCardBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberReplyMessageBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  memberReplyHeader: {
    fontSize: 11,
    fontWeight: '800',
  },
  memberReplyText: {
    fontSize: 12.5,
    fontStyle: 'italic',
    lineHeight: 18,
  },

  toggleInactiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  toggleInactiveBtnText: { fontSize: 13, fontWeight: 'bold' },

  styleBreakdownRow: { marginBottom: 14 },
  styleBreakdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  styleDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  styleTagName: { fontSize: 14, fontWeight: 'bold' },
  styleTagMeta: { fontSize: 12 },
  progressBarTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },

  agendaSummaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  agendaSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryCircleCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryOverlapWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 54,
    height: 54,
  },
  summaryOverlapIconCircle: {
    position: 'absolute',
    left: -10,
    top: 14,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
  },
  summaryCircleValue: {
    fontWeight: '900',
  },
  summaryCircleLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    marginTop: 6,
    letterSpacing: 0.2,
  },

  financeSummaryGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  financeSummaryCard: { flex: 1, padding: 10, borderRadius: 8, marginHorizontal: 3, alignItems: 'center' },
  financeSummaryLabel: { fontSize: 11, fontWeight: 'bold' },
  financeSummaryValue: { fontSize: 14, fontWeight: 'bold', marginTop: 4 },
  addFinanceBtn: { height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  addFinanceBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
  financeItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  financeItemTitle: { fontSize: 14, fontWeight: 'bold' },
  financeItemMeta: { fontSize: 12 },
  financeItemAmount: { fontSize: 14, fontWeight: 'bold', marginHorizontal: 8 },
  financeStatusBadge: { padding: 4 },

  // Old background glow and floating icons were removed
  bandMetaBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  bandMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  bandMetaPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  createEventBtn: { height: 44, borderRadius: 8, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', marginBottom: 16 },
  createEventBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  eventCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
  dateBadgeBox: { width: 50, height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  dateBadgeDay: { fontSize: 18, fontWeight: 'bold' },
  dateBadgeMonth: { fontSize: 10, fontWeight: 'bold' },
  eventCardBody: { flex: 1 },
  eventTitle: { fontSize: 15, fontWeight: 'bold' },
  eventMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  typePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8 },
  typePillText: { fontSize: 10, fontWeight: 'bold' },
  eventLocalText: { fontSize: 12, flex: 1 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  pickerModalContainer: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, height: '85%', maxHeight: '90%' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitleText: { fontSize: 18, fontWeight: 'bold' },
  pickerSearchInputWrapper: { flexDirection: 'row', alignItems: 'center', height: 40, borderRadius: 8, paddingHorizontal: 10, marginBottom: 12 },
  selectAllRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  selectAllBtn: { flexDirection: 'row', alignItems: 'center' },
  selectAllText: { marginLeft: 8, fontWeight: 'bold' },
  selectedCounterText: { fontSize: 12 },
  checkboxItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  songItemName: { fontSize: 14, fontWeight: 'bold' },
  songItemBand: { fontSize: 12 },
  modalFooterRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  modalCancelBtn: { paddingHorizontal: 16, height: 40, borderRadius: 8, borderWidth: 1, justifyContent: 'center', marginRight: 8 },
  modalConfirmBtn: { paddingHorizontal: 16, height: 40, borderRadius: 8, justifyContent: 'center' },

  typeSelectBtn: { flex: 1, height: 38, borderRadius: 8, borderWidth: 1, borderColor: '#ccc', justifyContent: 'center', alignItems: 'center', marginHorizontal: 4 },
  typeSelectText: { fontWeight: 'bold', fontSize: 13 },

  tabContentFlex: {
    flex: 1,
    position: 'relative',
  },
  fabSortButtonCircular: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 999,
  },
  fabSortButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    elevation: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    zIndex: 999,
  },
  draggableFabButton: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    zIndex: 999,
  },
  draggableFabInnerPressable: {
    width: '100%',
    height: '100%',
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whoAreYouEnhancedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  whoAreYouAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  whoAreYouActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  whoAreYouCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  whoAreYouHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  whoAreYouIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  whoAreYouTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  whoAreYouSub: {
    fontSize: 11,
    marginTop: 2,
  },
  whoAreYouChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  whoAreYouChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  fabSortText: { color: '#ffffff', fontWeight: '900', fontSize: 12 },
  bottomSheetContainer: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    maxHeight: '82%',
  },
  sortOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  equalSplitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  memberSplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  splitCurrencyInput: {
    width: 90,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
});
