import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  Pressable, 
  StyleSheet, 
  ScrollView, 
  Modal, 
  Alert, 
  TextInput, 
  Image, 
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
  Animated,
  ActivityIndicator,
  RefreshControl,
  StatusBar as RNStatusBar,
  LayoutAnimation,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { api } from '../services/api';
import { bandService } from '../services/bandService';
import { setlistService } from '../services/setlistService';
import { musiciansService } from '../services/musiciansService';
import MusicianProfileModal from './MusicianProfileModal';
import ShareAgendaModal from './ShareAgendaModal';
import YearPickerModal from './YearPickerModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import { useLanguage } from '../hooks/useLanguage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import QRCode from 'react-native-qrcode-svg';

const bgRock = require('../assets/bg_rock.jpg');
const bgPop = require('../assets/bg_pop.jpg');
const bgAcoustic = require('../assets/bg_acoustic.jpg');
const bgJazz = require('../assets/bg_jazz.jpg');
const bgElectronic = require('../assets/bg_electronic.jpg');
const bgReggae = require('../assets/bg_reggae.jpg');
const bgGospel = require('../assets/bg_gospel.jpg');
const bgNotes = require('../assets/bg_notes.jpg');
const bgClassic = require('../assets/bg_classic.jpg');

const getBandInitials = (name) => {
  if (!name) return 'BD';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const parseDateForSort = (dateStr) => {
  if (!dateStr) return 0;
  const clean = dateStr.split(' • ')[0].trim();
  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getTime();
      } else {
        return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10)).getTime();
      }
    }
  } else if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getTime();
      } else {
        const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        return new Date(parseInt(year, 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10)).getTime();
      }
    }
  }
  const d = new Date(clean);
  return isNaN(d.getTime()) ? 0 : d.getTime();
};

const isFutureDate = (dateStr) => {
  if (!dateStr) return false;
  const clean = dateStr.split(' • ')[0].trim();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dmyRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/;
  const matchDmy = clean.match(dmyRegex);
  if (matchDmy) {
    const day = parseInt(matchDmy[1], 10);
    const month = parseInt(matchDmy[2], 10) - 1;
    let year = parseInt(matchDmy[3], 10);
    if (year < 100) year += 2000;
    const parsedDate = new Date(year, month, day, 23, 59, 59);
    return parsedDate >= today;
  }

  const ymdRegex = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/;
  const matchYmd = clean.match(ymdRegex);
  if (matchYmd) {
    const year = parseInt(matchYmd[1], 10);
    const month = parseInt(matchYmd[2], 10) - 1;
    const day = parseInt(matchYmd[3], 10);
    const parsedDate = new Date(year, month, day, 23, 59, 59);
    return parsedDate >= today;
  }

  try {
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      d.setHours(23, 59, 59);
      return d >= today;
    }
  } catch (e) {}

  return false;
};

const isMonthEnded = (dateStr) => {
  if (!dateStr) return false;
  const clean = String(dateStr).split(' • ')[0].trim();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  let year = null;
  let month = null;

  const dmyMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmyMatch) {
    month = parseInt(dmyMatch[2], 10) - 1;
    year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;
  } else {
    const ymdMatch = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (ymdMatch) {
      year = parseInt(ymdMatch[1], 10);
      month = parseInt(ymdMatch[2], 10) - 1;
    } else {
      try {
        const d = new Date(clean);
        if (!isNaN(d.getTime())) {
          year = d.getFullYear();
          month = d.getMonth();
        }
      } catch (e) {}
    }
  }

  if (year !== null && month !== null) {
    if (year < currentYear) return true;
    if (year === currentYear && month < currentMonth) return true;
    return false;
  }

  return false;
};

const getFormattedDateBadge = (dateStr, lang = 'pt') => {
  if (!dateStr || !dateStr.trim()) return { day: '--', month: '---' };
  const clean = dateStr.split(' • ')[0].trim();
  let day = '';
  let monthNum = -1;

  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        day = parseInt(parts[2], 10);
        monthNum = parseInt(parts[1], 10) - 1;
      } else {
        day = parseInt(parts[0], 10);
        monthNum = parseInt(parts[1], 10) - 1;
      }
    }
  } else if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        day = parseInt(parts[2], 10);
        monthNum = parseInt(parts[1], 10) - 1;
      } else {
        day = parseInt(parts[0], 10);
        monthNum = parseInt(parts[1], 10) - 1;
      }
    }
  }

  if (!day || isNaN(day) || monthNum < 0 || monthNum > 11) {
    return { day: '--', month: '---' };
  }

  const monthsPT = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const monthsEN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const monthsES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

  const months = lang === 'en' ? monthsEN : lang === 'es' ? monthsES : monthsPT;
  return { day: String(day).padStart(2, '0'), month: months[monthNum] || '---' };
};

const getMonthYearHeader = (dateStr, lang = 'pt') => {
  if (!dateStr || !dateStr.trim()) return lang === 'en' ? 'OTHER' : lang === 'es' ? 'OTROS' : 'OUTROS';
  const clean = dateStr.split(' • ')[0].trim();
  let year = '';
  let monthNum = -1;

  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        year = parts[0];
        monthNum = parseInt(parts[1], 10) - 1;
      } else {
        year = parts[2];
        monthNum = parseInt(parts[1], 10) - 1;
      }
    }
  } else if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        year = parts[0];
        monthNum = parseInt(parts[1], 10) - 1;
      } else {
        year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        monthNum = parseInt(parts[1], 10) - 1;
      }
    }
  }

  const monthsPt = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
  const monthsEn = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  const monthsEs = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

  const months = lang === 'en' ? monthsEn : lang === 'es' ? monthsEs : monthsPt;

  if (monthNum >= 0 && monthNum < 12) {
    return months[monthNum];
  }
  return lang === 'en' ? 'EVENTS' : lang === 'es' ? 'EVENTOS' : 'EVENTOS';
};

const STANDARD_CATEGORIES = [
  'Guitarra',
  'Baixo',
  'Violão',
  'Bateria',
  'Teclado',
  'Amplificador',
  'Pedal',
  'Microfone',
  'Outros'
];

const BRAZIL_STATES = [
  { uf: 'AC', name: 'Acre' },
  { uf: 'AL', name: 'Alagoas' },
  { uf: 'AP', name: 'Amapá' },
  { uf: 'AM', name: 'Amazonas' },
  { uf: 'BA', name: 'Bahia' },
  { uf: 'CE', name: 'Ceará' },
  { uf: 'DF', name: 'Distrito Federal' },
  { uf: 'ES', name: 'Espírito Santo' },
  { uf: 'GO', name: 'Goiás' },
  { uf: 'MA', name: 'Maranhão' },
  { uf: 'MT', name: 'Mato Grosso' },
  { uf: 'MS', name: 'Mato Grosso do Sul' },
  { uf: 'MG', name: 'Minas Gerais' },
  { uf: 'PA', name: 'Pará' },
  { uf: 'PB', name: 'Paraíba' },
  { uf: 'PR', name: 'Paraná' },
  { uf: 'PE', name: 'Pernambuco' },
  { uf: 'PI', name: 'Piauí' },
  { uf: 'RJ', name: 'Rio de Janeiro' },
  { uf: 'RN', name: 'Rio Grande do Norte' },
  { uf: 'RS', name: 'Rio Grande do Sul' },
  { uf: 'RO', name: 'Rondônia' },
  { uf: 'RR', name: 'Roraima' },
  { uf: 'SC', name: 'Santa Catarina' },
  { uf: 'SP', name: 'São Paulo' },
  { uf: 'SE', name: 'Sergipe' },
  { uf: 'TO', name: 'Tocantins' }
];

const COUNTRIES = [
  'Brasil', 'Portugal', 'Estados Unidos', 'Argentina', 'Reino Unido',
  'Espanha', 'Alemanha', 'Itália', 'França', 'Canadá',
  'Uruguai', 'Chile', 'México', 'Colômbia', 'Outro'
];

export default function ProfileScreen({ onLogout, onBack, onOpenBandProfile, onOpenSetlist }) {
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const getInterestLevelLabel = (opt) => {
    switch (opt) {
      case 'Hobbie': return t('proposalHobby') || 'Hobbie';
      case 'Profissional': return t('proposalProfessional') || 'Profissional';
      case 'Casual':
      case 'Ver no que dá': return t('proposalCasual') || t('proposalSeeWhatHappens') || 'Casual';
      case 'Cover': return t('proposalCover') || 'Cover';
      case 'Autoral': return t('proposalOriginal') || 'Autoral';
      default: return opt;
    }
  };

  const getMemberPositionLabel = (type, role) => {
    const tLower = String(type || '').toLowerCase();
    const rLower = String(role || '').toLowerCase();
    if (tLower.includes('líder') || tLower.includes('lider') || rLower.includes('líder') || rLower.includes('lider') || rLower.includes('leader')) {
      return t('leaderBadge') || 'Líder';
    }
    if (tLower.includes('proprietário') || tLower.includes('proprietario') || tLower.includes('owner') || rLower.includes('proprietário') || rLower.includes('owner')) {
      if (tLower.includes('membro') || tLower.includes('integrante')) {
        return t('memberOwnerBadge') || 'Integrante / Proprietário';
      }
      return t('ownerBadge') || 'Proprietário';
    }
    if (tLower.includes('fundador') || tLower.includes('fundadora') || rLower.includes('fundador') || rLower.includes('founder')) {
      return t('founderBadge') || 'Fundador';
    }
    return t('memberBadge') || 'Integrante';
  };

  const getProjectInstrument = (role, skillsList) => {
    if (!role) {
      return skillsList?.[0]?.instrument || (t('musicianFallback') || 'Músico');
    }
    const clean = String(role)
      .replace(/&?\s*(líder|lider|fundador|fundadora|proprietário|proprietária|proprietario|integrante|membro|leader|owner|member|founder)/gi, '')
      .replace(/^[&,\s-]+|[&,\s-]+$/g, '')
      .trim();
    if (!clean || clean.toLowerCase() === 'músico' || clean.toLowerCase() === 'musician' || clean.toLowerCase() === 'integrante') {
      return skillsList?.[0]?.instrument || (t('musicianFallback') || 'Músico');
    }
    return clean;
  };

  const getGearCategoryLabel = (cat) => {
    switch (cat) {
      case 'Guitarra': return t('catGuitar') || 'Guitarra / Violão';
      case 'Baixo': return t('catBass') || 'Baixo';
      case 'Bateria': return t('catDrums') || 'Bateria';
      case 'Teclado': return t('catKeyboard') || 'Teclado';
      case 'Voz / Microfone': return t('catVocals') || 'Voz / Microfone';
      case 'Amplificador': return t('catAmp') || 'Amplificador';
      case 'Pedal':
      case 'Pedal/Efeito':
      case 'Pedal / Pedaleira': return t('catPedal') || 'Pedal';
      case 'Acessório': return t('catAccessory') || 'Acessório';
      case 'Outro': return t('catOther') || 'Outro';
      default: return cat;
    }
  };

  const isDark = colors.isDark;
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('bio');
  const MUSICIAN_TABS = ['bio', 'skills', 'instruments', 'projects', 'agenda'];
  const translateX = useRef(new Animated.Value(0)).current;
  const tabOpacity = useRef(new Animated.Value(1)).current;
  const activeTabRef = useRef('bio');
  activeTabRef.current = activeTab;

  const handleTabChange = (nextTabId) => {
    if (nextTabId === activeTabRef.current) return;
    const oldIdx = MUSICIAN_TABS.indexOf(activeTabRef.current);
    const newIdx = MUSICIAN_TABS.indexOf(nextTabId);
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
        setScrollEnabled(false);
      },
      onPanResponderMove: (evt, gestureState) => {
        const curIdx = MUSICIAN_TABS.indexOf(activeTabRef.current);
        const isFirst = curIdx === 0 && gestureState.dx > 0;
        const isLast = curIdx === MUSICIAN_TABS.length - 1 && gestureState.dx < 0;
        const damped = isFirst || isLast ? gestureState.dx * 0.22 : gestureState.dx;
        translateX.setValue(damped);

        // Esmaecimento dinâmico suave durante o arraste
        const dragProgress = Math.min(1, Math.abs(damped) / (SCREEN_WIDTH * 0.45));
        tabOpacity.setValue(Math.max(0.2, 1 - dragProgress * 0.8));
      },
      onPanResponderRelease: (evt, gestureState) => {
        setScrollEnabled(true);
        const curIdx = MUSICIAN_TABS.indexOf(activeTabRef.current);
        const swipeThreshold = 25;
        const speedThreshold = 0.18;

        if ((gestureState.dx < -swipeThreshold || gestureState.vx < -speedThreshold) && curIdx < MUSICIAN_TABS.length - 1) {
          const nextTab = MUSICIAN_TABS[curIdx + 1];
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: -SCREEN_WIDTH * 0.35,
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
            translateX.setValue(SCREEN_WIDTH * 0.35);
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
          const prevTab = MUSICIAN_TABS[curIdx - 1];
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: SCREEN_WIDTH * 0.35,
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
            translateX.setValue(-SCREEN_WIDTH * 0.35);
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
        setScrollEnabled(true);
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
  const [profileImage, setProfileImage] = useState(null);

  // Modals (all bottom sheets)
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState(1);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editField, setEditField] = useState({ key: '', title: '', value: '' });

  // Unified Edit Profile Modal (Header button)
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfileUsername, setEditProfileUsername] = useState('');
  const [editProfilePictureUrl, setEditProfilePictureUrl] = useState('');
  const [usernameStatus, setUsernameStatus] = useState('available'); // 'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  const [usernameMessage, setUsernameMessage] = useState('');
  const usernameDebounceRef = useRef(null);
  const [editProfileBirthDate, setEditProfileBirthDate] = useState('');
  const [editProfileCity, setEditProfileCity] = useState('');
  const [editProfileState, setEditProfileState] = useState('');
  const [editProfileCountry, setEditProfileCountry] = useState('Brasil');

  // Habilidades Extras (Diferenciais p/ Banda)
  const [extraSkills, setExtraSkills] = useState([]);
  const [showExtraSkillModal, setShowExtraSkillModal] = useState(false);
  const [customExtraSkill, setCustomExtraSkill] = useState('');
  const [selectedPresetExtraSkill, setSelectedPresetExtraSkill] = useState('');

  const PRESET_EXTRA_SKILLS = [
    { key: 'Transporte Próprio (Van/Carro)', transKey: 'skill_transport' },
    { key: 'Técnico de Som / PA', transKey: 'skill_sound_tech' },
    { key: 'Design Gráfico & Flyers', transKey: 'skill_design' },
    { key: 'Filmagem & Edição de Vídeo', transKey: 'skill_video' },
    { key: 'Social Media & Anúncios', transKey: 'skill_social' },
    { key: 'Roadie & Montagem de Palco', transKey: 'skill_roadie' },
    { key: 'Venda de Shows & Booking', transKey: 'skill_booking' },
    { key: 'Luthieria & Regulagem', transKey: 'skill_luthier' },
    { key: 'Fotografia Profissional', transKey: 'skill_photo' },
    { key: 'Técnico de Iluminação / Luz', transKey: 'skill_lighting' },
    { key: 'Produção Musical & Gravação', transKey: 'skill_production' },
  ];

  const getExtraSkillDisplay = (item) => {
    const name = typeof item === 'string' ? item : (item.name || item.title || '');
    if (!name) return '';
    const preset = PRESET_EXTRA_SKILLS.find(p => 
      p.key.toLowerCase() === name.toLowerCase() || 
      (p.transKey && t(p.transKey)?.toLowerCase() === name.toLowerCase())
    );
    if (preset) {
      return t(preset.transKey) || preset.key;
    }
    return name;
  };

  // Location Modal
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locCity, setLocCity] = useState('');
  const [locState, setLocState] = useState('');
  const [locCountry, setLocCountry] = useState('');
  const [customLocCountryInput, setCustomLocCountryInput] = useState('');
  
  // Skills
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);
  const [skillName, setSkillName] = useState('');
  const [skillStars, setSkillStars] = useState(3);

  // Influences bottom sheet modal
  const [showInfluenceModal, setShowInfluenceModal] = useState(false);
  const [newInfluenceName, setNewInfluenceName] = useState('');
  const [newInfluenceStars, setNewInfluenceStars] = useState(5);

  // Gear / Equipment tab state
  const [gear, setGear] = useState([]);
  const [showGearModal, setShowGearModal] = useState(false);
  const [editingGear, setEditingGear] = useState(null);
  const [gearCategory, setGearCategory] = useState('Guitarra');
  const [customCategory, setCustomCategory] = useState('');
  const [gearName, setGearName] = useState('');
  const [gearDetails, setGearDetails] = useState('');
  const [gearIsNegotiable, setGearIsNegotiable] = useState(false);
  const [gearPrice, setGearPrice] = useState('');

  // Drag-and-drop state for equipment
  const [draggingIdx, setDraggingIdx] = useState(null);
  const dragY = useRef(new Animated.Value(0)).current;
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const gearRef = useRef(gear);
  gearRef.current = gear;

  // Agenda State (seleção de ano e dados analíticos)
  const [selectedAgendaYear, setSelectedAgendaYear] = useState(new Date().getFullYear());
  const [showYearPickerModal, setShowYearPickerModal] = useState(false);
  const [failedBandLogos, setFailedBandLogos] = useState({});

  // Agenda Sharing State (com seleção de eventos e arte personalizada)
  const [selectedAgendaEventIds, setSelectedAgendaEventIds] = useState([]);
  const [customBgUri, setCustomBgUri] = useState(null);
  const [expandedPastMonths, setExpandedPastMonths] = useState([]);

  // Modal de visualização da Página Pública do próprio usuário
  const [showPublicPage, setShowPublicPage] = useState(false);
  const [myPublicProfile, setMyPublicProfile] = useState(null);

  const handleOpenMyPublicPage = async () => {
    try {
      const prof = await musiciansService.getMusicianByUsername('me');
      if (prof) {
        const userAgenda = (user?.agenda && user.agenda.length > 0) ? user.agenda : (prof.agenda || []);
        setMyPublicProfile({
          ...prof,
          agenda: userAgenda
        });
        setShowPublicPage(true);
      }
    } catch (e) {
      console.log('Erro ao carregar página pública:', e);
    }
  };

  const getBgImage = (id) => {
    if (id === 'custom') {
      if (customBgUri) return { uri: customBgUri };
      return bgRock;
    }
    switch(id) {
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

  const openShareAgendaModal = () => {
    const allIds = (user?.agenda || []).map(e => e.id);
    setSelectedAgendaEventIds(allIds);
    setShowShareModal(true);
  };

  const toggleSelectAgendaEvent = (id) => {
    if (selectedAgendaEventIds.includes(id)) {
      if (selectedAgendaEventIds.length === 1) {
        Alert.alert(t('notice') || 'Aviso', t('selectAtLeastOneShowMsg') || 'Selecione ao menos um show para a arte.');
        return;
      }
      setSelectedAgendaEventIds(selectedAgendaEventIds.filter(i => i !== id));
    } else {
      setSelectedAgendaEventIds([...selectedAgendaEventIds, id]);
    }
  };

  const toggleSelectAllAgendaEvents = () => {
    const allIds = (user?.agenda || []).map(e => e.id);
    if (selectedAgendaEventIds.length === allIds.length) {
      setSelectedAgendaEventIds(allIds.slice(0, 1));
    } else {
      setSelectedAgendaEventIds(allIds);
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

  const removeCustomBgImage = async () => {
    setCustomBgUri(null);
    if (selectedLayout === 'custom') setSelectedLayout(1);
    await AsyncStorage.removeItem('agenda_custom_bg');
  };

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const applyProfileData = async (data) => {
    if (!data) return;
    try {
      const userId = data.id || data.userId;
      const userScopedPic = userId ? await AsyncStorage.getItem(`profileImage_${userId}`) : null;
      const cloudPic = data.pictureUrl || data.imageUri || userScopedPic || null;
      setProfileImage(cloudPic);
      if (cloudPic && userId) {
        await AsyncStorage.setItem(`profileImage_${userId}`, cloudPic);
      }
      // Limpa chave legada não-escopada para evitar contaminação entre contas
      await AsyncStorage.removeItem('profileImage');
      const savedDisplayName = await AsyncStorage.getItem('user_display_name');
      const resolvedDisplayName = data.displayName || data.name || savedDisplayName || data.username || '';
      if (data.displayName) {
        await AsyncStorage.setItem('user_display_name', data.displayName);
      } else if (savedDisplayName && savedDisplayName.trim()) {
        api.updateProfile({ displayName: savedDisplayName }).catch(() => {});
      }

      const savedCustomBg = await AsyncStorage.getItem('agenda_custom_bg');
      if (savedCustomBg) setCustomBgUri(savedCustomBg);

      // Load Gear from API (priority) or AsyncStorage
      let parsedGear = [];
      if (data.gearJson) {
        try {
          const parsed = typeof data.gearJson === 'string' ? JSON.parse(data.gearJson) : data.gearJson;
          if (Array.isArray(parsed)) parsedGear = parsed;
        } catch (e) {}
      }
      if (!parsedGear || parsedGear.length === 0) {
        const savedGear = await AsyncStorage.getItem('user_gear');
        if (savedGear) {
          try { parsedGear = JSON.parse(savedGear); } catch (e) {}
          // Push existing local gear to cloud API so it's persisted forever
          if (parsedGear && parsedGear.length > 0) {
            api.updateProfile({ gearJson: JSON.stringify(parsedGear) }).catch(() => {});
          }
        }
      }
      setGear(parsedGear || []);
      if (parsedGear && parsedGear.length > 0) {
        await AsyncStorage.setItem('user_gear', JSON.stringify(parsedGear));
      }

      // Load Extra Skills from API or AsyncStorage
      let parsedExtra = [];
      const rawExtra = data.extraSkills || data.extraSkillsJson;
      if (rawExtra) {
        try {
          const parsed = typeof rawExtra === 'string' ? JSON.parse(rawExtra) : rawExtra;
          if (Array.isArray(parsed)) parsedExtra = parsed;
        } catch (e) {}
      }
      if (!parsedExtra || parsedExtra.length === 0) {
        const savedExtra = await AsyncStorage.getItem('user_extra_skills');
        if (savedExtra) {
          try { parsedExtra = JSON.parse(savedExtra); } catch (e) {}
        }
      }
      setExtraSkills(parsedExtra || []);
      if (parsedExtra && parsedExtra.length > 0) {
        await AsyncStorage.setItem('user_extra_skills', JSON.stringify(parsedExtra));
      }

      let parsedSkills = null;
      const rawInst = data.skillsJson || data.instruments || data.skills;
      if (rawInst) {
        try {
          const parsed = typeof rawInst === 'string' ? JSON.parse(rawInst) : rawInst;
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsedSkills = parsed;
          }
        } catch (e) {}
      }

      if (!parsedSkills) {
        parsedSkills = [];
      }

      // Garante que até 2 habilidades venham marcadas como principais por padrão se nenhuma estiver
      const hasAnyPrimary = parsedSkills.some(s => s.isPrimary);
      if (!hasAnyPrimary && parsedSkills.length > 0) {
        parsedSkills = parsedSkills.map((s, idx) => ({
          ...s,
          isPrimary: idx < 2
        }));
      }

      let projectsData = [];
      let allLocalBands = [];

      try {
        allLocalBands = (await bandService.getAll()) || [];
        // Apenas bandas sincronizadas na nuvem aparecem no perfil online (bandas offline ficam privadas no aparelho)
        const localBands = allLocalBands.filter(b => b && b.cloudId);
        if (localBands && localBands.length > 0) {
          const loadedProjects = await Promise.all(localBands.map(async b => {
            let role = 'Músico';
            let isMember = false;
            let isOwner = true;

            try {
              const members = await bandService.getBandMembers(b.id);
              if (b.myMemberId && members && members.length > 0) {
                const found = members.find(m => m.id === b.myMemberId);
                if (found) {
                  role = found.role || 'Músico';
                  isMember = true;
                }
              }
              if (!isMember && members && members.length > 0) {
                const myName = (savedDisplayName || data.displayName || data.username || '').toLowerCase();
                const matched = members.find(m => m.name && m.name.toLowerCase() === myName);
                if (matched) {
                  role = matched.role || 'Músico';
                  isMember = true;
                }
              }
            } catch (e) {
              console.log('Error fetching members for band', b.id, e);
            }

            if (role === 'Músico' && parsedSkills.length > 0) {
              role = parsedSkills[0].instrument;
            }

            let memberType = 'Proprietário';
            if (isOwner && isMember) {
              memberType = 'Membro / Proprietário';
            } else if (isOwner) {
              memberType = 'Proprietário';
            } else {
              memberType = 'Membro';
            }

            let sinceYear = '2023';
            if (b.startDate) {
              if (String(b.startDate).includes('/')) {
                sinceYear = String(b.startDate).split('/').pop().trim();
              } else if (String(b.startDate).includes('-')) {
                sinceYear = String(b.startDate).split('-')[0].trim();
              } else {
                const match = String(b.startDate).match(/\b(19\d{2}|20\d{2})\b/);
                sinceYear = match ? match[0] : String(b.startDate).substring(0, 4);
              }
            }

            return {
              id: b.id,
              name: b.name,
              imageUri: b.imageUri,
              logo: b.imageUri,
              role: role,
              memberType: memberType,
              since: sinceYear,
              needsSync: false,
              city: b.city || '',
              state: b.state || '',
              country: b.country || '',
              genres: b.genres || '[]'
            };
          }));
          projectsData = loadedProjects;
        }
      } catch (err) {
        console.log('Error loading local bands for projects:', err);
      }

      // Parse structured influences with stars (without #)
      let parsedInfluences = [];
      if (data.influences) {
        try {
          const raw = typeof data.influences === 'string' ? JSON.parse(data.influences) : data.influences;
          if (Array.isArray(raw)) {
            parsedInfluences = raw.map((item, idx) => {
              if (typeof item === 'string') {
                return { id: String(idx + 1), name: item.replace(/^#/, ''), stars: 5 };
              }
              return {
                id: item.id || String(idx + 1),
                name: (item.name || '').replace(/^#/, ''),
                stars: typeof item.stars === 'number' ? Math.max(0, Math.min(5, item.stars)) : 5
              };
            });
          }
        } catch (e) {
          console.log('Error parsing influences:', e);
        }
      }
      const enrichedProfile = {
        ...data,
        imageUri: cloudPic || null,
        displayName: savedDisplayName || data.displayName || data.username || 'Músico',
        bio: data.bio || 'Escreva algo sobre você...',
        city: data.city || '',
        state: data.state || '',
        country: data.country || '',
        birthDate: data.birthDate || '',
        age: data.age != null ? data.age : null,
        isEmailConfirmed: !!data.isEmailConfirmed,
        instagram: data.instagram || '',
        youtube: data.youtube || '',
        twitter: data.twitter || '',
        facebook: data.facebook || '',
        spotify: data.spotify || '',
        tiktok: data.tiktok || '',
        availability: data.availability || 'Indisponível',
        interestLevel: data.interestLevel ? (typeof data.interestLevel === 'string' && data.interestLevel.startsWith('[') ? JSON.parse(data.interestLevel) : (Array.isArray(data.interestLevel) ? data.interestLevel : [data.interestLevel])) : ['Hobbie'],
        influences: parsedInfluences,
        skills: parsedSkills,
        instruments: JSON.stringify(parsedSkills),
        projects: projectsData,
        agenda: await (async () => {
          try {
            let currentLoggedUser = null;
            try {
              const uInfo = await AsyncStorage.getItem('user_info');
              if (uInfo) currentLoggedUser = JSON.parse(uInfo);
            } catch (e) {}

            const cleanMyUser = (data.username || currentLoggedUser?.username || '').toLowerCase().replace(/^@+/, '').trim();
            const cleanMyDisplay = (data.displayName || data.name || currentLoggedUser?.name || currentLoggedUser?.displayName || '').toLowerCase().trim();
            const myUserIdStr = data.id ? String(data.id) : (currentLoggedUser?.id ? String(currentLoggedUser.id) : null);

            const allSetlists = (await setlistService.getAll()) || [];
            const bandLogoMap = {};
            const eventsFromBands = [];
            const processedSetlistKeys = new Set();

            const parseCash = (val) => {
              if (typeof val === 'number') return val;
              if (!val) return 0;
              const clean = String(val).replace(/[^\d.,-]/g, '');
              if (clean.includes(',') && clean.includes('.')) {
                if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
                  return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
                } else {
                  return parseFloat(clean.replace(/,/g, '')) || 0;
                }
              } else if (clean.includes(',')) {
                return parseFloat(clean.replace(',', '.')) || 0;
              }
              return parseFloat(clean) || 0;
            };

            for (const b of (allLocalBands || [])) {
              if (!b) continue;
              const bIdStr = b.id ? String(b.id) : '';
              const bNameStr = (b.name || '').trim();
              if (bIdStr) bandLogoMap[bIdStr] = b.imageUri;
              if (bNameStr) bandLogoMap[bNameStr.toLowerCase()] = b.imageUri;

              let mems = [];
              try {
                mems = (await bandService.getBandMembers(b.id)) || [];
              } catch (e) {}

              let snap = null;
              if (b.syncDataJson) {
                try {
                  snap = typeof b.syncDataJson === 'string' ? JSON.parse(b.syncDataJson) : b.syncDataJson;
                } catch (e) {}
              }

              if (snap?.members && Array.isArray(snap.members) && snap.members.length > 0) {
                for (const sm of snap.members) {
                  const smName = (sm.name || sm.displayName || '').trim();
                  if (smName && !mems.some(m => (m.name || '').trim().toLowerCase() === smName.toLowerCase())) {
                    mems.push({
                      id: sm.id || sm.userId || sm.name,
                      name: smName,
                      username: sm.username || '',
                      role: sm.role || '',
                      status: sm.status || 'active'
                    });
                  }
                }
              }

              const activeMems = mems.filter(m => m.status !== 'inactive' && m.status !== 'rejected');
              const activeCount = activeMems.length > 0 ? activeMems.length : (b.membersCount || 1);

              // Identifica o integrante correspondente ao usuário logado nesta banda
              let userMem = mems.find(m => {
                if (myUserIdStr && m.userId && String(m.userId) === myUserIdStr) return true;
                if (b.myMemberId && String(m.id) === String(b.myMemberId)) return true;
                const mUser = (m.username || '').toLowerCase().replace(/^@+/, '').trim();
                if (mUser && (mUser === cleanMyUser || mUser === 'me')) return true;
                const mName = (m.name || '').toLowerCase().trim();
                if (mName === 'você' || mName === 'voce') return true;
                if (cleanMyDisplay && mName === cleanMyDisplay) return true;
                if (cleanMyUser && mName === cleanMyUser) return true;
                if (cleanMyDisplay && mName && (cleanMyDisplay.startsWith(mName) || mName.startsWith(cleanMyDisplay))) return true;
                return false;
              });

              if (!userMem && activeMems.length === 1) {
                userMem = activeMems[0];
              }

              // Puxa setlists da banda: referência primária na página da banda (snapshot e SQLite)
              const bandRawSetlists = [];
              const seenBandSlKeys = new Set();

              if (snap?.setlists && Array.isArray(snap.setlists)) {
                for (const sl of snap.setlists) {
                  if (!sl) continue;
                  const k = `${(sl.name || '').trim().toLowerCase()}_${(sl.date || '').trim()}`;
                  seenBandSlKeys.add(k);
                  bandRawSetlists.push({
                    ...sl,
                    bandName: b.name,
                    myBandId: b.id,
                    bandImageUri: b.imageUri
                  });
                }
              }

              const localBandSetlists = allSetlists.filter(s =>
                (b.id && String(s.myBandId) === String(b.id)) ||
                (s.bandName && b.name && s.bandName.trim().toLowerCase() === b.name.trim().toLowerCase())
              );

              for (const sl of localBandSetlists) {
                const k = `${(sl.name || '').trim().toLowerCase()}_${(sl.date || '').trim()}`;
                if (!seenBandSlKeys.has(k)) {
                  seenBandSlKeys.add(k);
                  bandRawSetlists.push({
                    ...sl,
                    bandName: b.name,
                    myBandId: b.id,
                    bandImageUri: b.imageUri
                  });
                }
              }

              // Processa cada evento da banda
              for (const s of bandRawSetlists) {
                if (!((s.date && s.date.trim()) || (s.local && s.local.trim()))) continue;
                const setlistKey = `${(s.name || s.local || '').trim().toLowerCase()}_${(s.date || '').trim()}`;
                processedSetlistKeys.add(setlistKey);

                let formattedDate = s.date || 'A definir';
                if (s.time) formattedDate += ` • ${s.time}`;
                const bandLogo = s.bandImageUri || b.imageUri || null;
                const totalGross = parseCash(s.cachê || s.cache || s.valCache || s.value || 0);

                // Busca a divisão de cachê configurada na página da banda
                let splitData = s.cacheSplit || null;
                const nameDateKey = `${(s.name || s.local || '').trim().toLowerCase()}_${(s.date || '').trim()}`;
                if (!splitData || Object.keys(splitData).length === 0) {
                  try {
                    if (s.id) splitData = await bandService.getShowCacheSplit(s.id);
                  } catch (e) {}
                  if (!splitData || Object.keys(splitData).length === 0) {
                    try {
                      splitData = await bandService.getShowCacheSplit(nameDateKey);
                    } catch (e) {}
                  }
                }

                // Subtrai valor destinado ao caixa da banda e substitutos (idêntico à página da banda)
                const fundVal = parseFloat(splitData?.bandFund ?? splitData?.band_fund ?? splitData?.fund ?? 0) || 0;
                let subsTotal = 0;
                if (Array.isArray(splitData?.substitutes)) {
                  splitData.substitutes.forEach(sub => {
                    subsTotal += parseFloat(String(sub?.amount || '0').replace(',', '.')) || 0;
                  });
                } else if (splitData && typeof splitData === 'object') {
                  for (const [k, v] of Object.entries(splitData)) {
                    if (k.startsWith('sub_')) {
                      try {
                        const parsedSub = typeof v === 'string' ? JSON.parse(v) : v;
                        subsTotal += parseFloat(String(parsedSub?.amount || '0').replace(',', '.')) || 0;
                      } catch (e) {}
                    }
                  }
                }
                const netToDivide = Math.max(0, totalGross - fundVal - subsTotal);

                let memberSplits = null;
                if (splitData && typeof splitData === 'object') {
                  memberSplits = splitData.members && typeof splitData.members === 'object'
                    ? splitData.members
                    : splitData;
                }

                let myShare = 0;
                let foundSplit = false;

                if (memberSplits && typeof memberSplits === 'object' && Object.keys(memberSplits).length > 0) {
                  const keysToTry = [
                    userMem?.id,
                    userMem?.id ? String(userMem.id) : null,
                    userMem?.userId ? String(userMem.userId) : null,
                    userMem?.username,
                    userMem?.name,
                    'me',
                    cleanMyUser,
                    cleanMyDisplay
                  ].filter(Boolean);

                  for (const k of keysToTry) {
                    if (memberSplits[k] !== undefined && memberSplits[k] !== null && memberSplits[k] !== '') {
                      myShare = parseCash(memberSplits[k]);
                      foundSplit = true;
                      break;
                    }
                  }

                  if (!foundSplit) {
                    for (const [k, v] of Object.entries(memberSplits)) {
                      if (k === 'bandFund' || k === 'band_fund' || k === 'fund' || k === 'status' || k === 'updatedAt' || k === 'substitutes' || k.startsWith('sub_')) continue;
                      const kLower = String(k).toLowerCase().trim();
                      if (userMem?.name && kLower === userMem.name.toLowerCase().trim()) {
                        myShare = parseCash(v);
                        foundSplit = true;
                        break;
                      }
                      if (userMem?.username && kLower === userMem.username.toLowerCase().trim()) {
                        myShare = parseCash(v);
                        foundSplit = true;
                        break;
                      }
                      if (cleanMyDisplay && kLower === cleanMyDisplay) {
                        myShare = parseCash(v);
                        foundSplit = true;
                        break;
                      }
                      if (cleanMyUser && kLower === cleanMyUser) {
                        myShare = parseCash(v);
                        foundSplit = true;
                        break;
                      }
                    }
                  }
                }

                // Se não há divisão explícita específica salva por integrante, divide o líquido restante igualmente
                if (!foundSplit) {
                  myShare = netToDivide > 0 ? (netToDivide / activeCount) : 0;
                }

                eventsFromBands.push({
                  ...s,
                  setlistRef: s,
                  id: s.id || `bandev_${b.id}_${eventsFromBands.length}`,
                  name: s.name || s.local || 'Show',
                  type: (s.type || 'show').toLowerCase(),
                  band: b.name || s.bandName || '',
                  date: s.date || '',
                  rawDate: s.date || '',
                  time: s.time || '',
                  formattedDate: formattedDate,
                  local: s.local || s.venue || s.location || '',
                  cachê: totalGross,
                  myShareNum: myShare,
                  logo: bandLogo
                });
              }
            }

            // Setlists locais avulsos não pertencentes às bandas processadas acima
            for (const s of allSetlists) {
              if (!((s.date && s.date.trim()) || (s.local && s.local.trim()))) continue;
              const setlistKey = `${(s.name || s.local || '').trim().toLowerCase()}_${(s.date || '').trim()}`;
              if (processedSetlistKeys.has(setlistKey)) continue;
              processedSetlistKeys.add(setlistKey);

              let formattedDate = s.date || 'A definir';
              if (s.time) formattedDate += ` • ${s.time}`;
              const sBandName = (s.bandName || '').trim();
              const sBandId = s.myBandId ? String(s.myBandId) : '';
              const bandLogo = s.bandImageUri || (sBandId ? bandLogoMap[sBandId] : null) || (sBandName ? bandLogoMap[sBandName.toLowerCase()] : null) || null;
              const totalGross = parseCash(s.cachê || s.cache || s.value || 0);

              let splitData = null;
              try {
                if (s.id) splitData = await bandService.getShowCacheSplit(s.id);
              } catch (e) {}
              if (!splitData || Object.keys(splitData).length === 0) {
                try {
                  const sNameDateKey = `${(s.name || s.local || '').trim().toLowerCase()}_${(s.date || '').trim()}`;
                  splitData = await bandService.getShowCacheSplit(sNameDateKey);
                } catch (e) {}
              }

              const fundVal = parseFloat(splitData?.bandFund ?? splitData?.band_fund ?? splitData?.fund ?? 0) || 0;
              let subsTotal = 0;
              if (Array.isArray(splitData?.substitutes)) {
                splitData.substitutes.forEach(sub => {
                  subsTotal += parseFloat(String(sub?.amount || '0').replace(',', '.')) || 0;
                });
              } else if (splitData && typeof splitData === 'object') {
                for (const [k, v] of Object.entries(splitData)) {
                  if (k.startsWith('sub_')) {
                    try {
                      const parsedSub = typeof v === 'string' ? JSON.parse(v) : v;
                      subsTotal += parseFloat(String(parsedSub?.amount || '0').replace(',', '.')) || 0;
                    } catch (e) {}
                  }
                }
              }
              const netToDivide = Math.max(0, totalGross - fundVal - subsTotal);

              let memberSplits = splitData?.members || splitData;
              let myShare = netToDivide;
              let foundSoloSplit = false;
              if (memberSplits && typeof memberSplits === 'object' && Object.keys(memberSplits).length > 0) {
                const keysToTry = [
                  user?.id ? String(user.id) : null,
                  user?.username,
                  user?.displayName,
                  'me',
                  cleanMyUser,
                  cleanMyDisplay
                ].filter(Boolean);

                for (const k of keysToTry) {
                  if (memberSplits[k] !== undefined && memberSplits[k] !== null && memberSplits[k] !== '') {
                    myShare = parseCash(memberSplits[k]);
                    foundSoloSplit = true;
                    break;
                  }
                }

                if (!foundSoloSplit) {
                  for (const [k, v] of Object.entries(memberSplits)) {
                    if (k === 'bandFund' || k === 'band_fund' || k === 'fund' || k === 'status' || k === 'updatedAt' || k === 'substitutes' || k.startsWith('sub_')) continue;
                    myShare = parseCash(v);
                    foundSoloSplit = true;
                    break;
                  }
                }
              }
              if (!foundSoloSplit) {
                myShare = netToDivide;
              }

              eventsFromBands.push({
                ...s,
                setlistRef: s,
                id: s.id,
                name: s.name || s.local || 'Show',
                type: (s.type || 'show').toLowerCase(),
                band: s.bandName || '',
                date: s.date || '',
                rawDate: s.date || '',
                time: s.time || '',
                formattedDate: formattedDate,
                local: s.local || '',
                cachê: totalGross,
                myShareNum: myShare,
                logo: bandLogo
              });
            }

            // Eventos da API
            try {
              const resEvents = await api.getEvents();
              if (Array.isArray(resEvents)) {
                for (const ev of resEvents) {
                  const evKey = `${(ev.title || '').trim().toLowerCase()}_${(ev.date || '').trim()}`;
                  if (processedSetlistKeys.has(evKey)) continue;
                  processedSetlistKeys.add(evKey);

                  let formattedDate = ev.date || 'A definir';
                  if (ev.time) formattedDate += ` • ${ev.time}`;
                  const evBandName = (ev.bandName || '').trim();
                  const evBandId = ev.bandId ? String(ev.bandId) : '';
                  const bandLogo = ev.bandImage || ev.bandLogo || (evBandId ? bandLogoMap[evBandId] : null) || (evBandName ? bandLogoMap[evBandName.toLowerCase()] : null) || null;
                  const cGross = parseCash(ev.cacheValue != null ? ev.cacheValue : (ev.cachê || ev.cache || ev.value || 0));

                  let splitData = null;
                  try {
                    if (ev.id) splitData = await bandService.getShowCacheSplit(ev.id);
                  } catch (e) {}
                  if (!splitData || Object.keys(splitData).length === 0) {
                    try {
                      splitData = await bandService.getShowCacheSplit(evKey);
                    } catch (e) {}
                  }

                  const fundVal = parseFloat(splitData?.bandFund ?? splitData?.band_fund ?? splitData?.fund ?? 0) || 0;
                  let subsTotal = 0;
                  if (Array.isArray(splitData?.substitutes)) {
                    splitData.substitutes.forEach(sub => {
                      subsTotal += parseFloat(String(sub?.amount || '0').replace(',', '.')) || 0;
                    });
                  } else if (splitData && typeof splitData === 'object') {
                    for (const [k, v] of Object.entries(splitData)) {
                      if (k.startsWith('sub_')) {
                        try {
                          const parsedSub = typeof v === 'string' ? JSON.parse(v) : v;
                          subsTotal += parseFloat(String(parsedSub?.amount || '0').replace(',', '.')) || 0;
                        } catch (e) {}
                      }
                    }
                  }
                  const netToDivide = Math.max(0, cGross - fundVal - subsTotal);

                  let memberSplits = splitData?.members || splitData;
                  let myShare = netToDivide;
                  if (memberSplits && typeof memberSplits === 'object' && Object.keys(memberSplits).length > 0) {
                    const keysToTry = [
                      user?.id ? String(user.id) : null,
                      user?.username,
                      user?.displayName,
                      'me',
                      cleanMyUser,
                      cleanMyDisplay
                    ].filter(Boolean);

                    for (const k of keysToTry) {
                      if (memberSplits[k] !== undefined && memberSplits[k] !== null && memberSplits[k] !== '') {
                        myShare = parseCash(memberSplits[k]);
                        break;
                      }
                    }
                  }

                  eventsFromBands.push({
                    ...ev,
                    id: `cloudev_${ev.id}`,
                    name: ev.title || 'Show',
                    type: (ev.eventType || 'show').toLowerCase(),
                    band: ev.bandName || '',
                    date: ev.date || '',
                    rawDate: ev.date || '',
                    time: ev.time || '',
                    formattedDate: formattedDate,
                    local: ev.location || ev.city || '',
                    cachê: cGross,
                    myShareNum: myShare,
                    logo: bandLogo
                  });
                }
              }
            } catch (ce) {}

            return eventsFromBands;
          } catch (err) {
            console.log('Error loading band events for agenda:', err);
            return [];
          }
        })()
      };

      setUser(enrichedProfile);
      try {
        await AsyncStorage.setItem('user_profile_cache', JSON.stringify(enrichedProfile));
      } catch (cacheErr) {}
    } catch (err) {
      console.log('Error in applyProfileData:', err);
    }
  };

  const loadUser = async () => {
    setLoading(true);
    setLoadError(null);

    // 1. Tentar primeiro o cache local para exibição imediata (sem tela preta)
    let hasLocalData = false;
    try {
      const cached = await AsyncStorage.getItem('user_profile_cache');
      if (cached) {
        await applyProfileData(JSON.parse(cached));
        hasLocalData = true;
        setLoading(false);
      } else {
        const userInfo = await AsyncStorage.getItem('user_info');
        if (userInfo) {
          const parsed = JSON.parse(userInfo);
          await applyProfileData({
            id: parsed.id || 1,
            username: parsed.username || 'Musico',
            email: parsed.email || '',
            displayName: parsed.displayName || parsed.username || 'Músico',
            city: parsed.city || '',
            state: parsed.state || '',
            country: parsed.country || ''
          });
          hasLocalData = true;
          setLoading(false);
        }
      }
    } catch (cacheErr) {
      console.log('Error loading cached profile:', cacheErr);
    }

    // 2. Sincronizar com a API
    try {
      const data = await api.getProfile();
      await applyProfileData(data);
      if ((data.city && data.city.trim()) || (data.skills && data.skills.length > 0) || data.instruments) {
        await AsyncStorage.setItem('user_profile_completed', 'true');
      }
      setLoadError(null);
    } catch (e) {
      console.log('Error fetching profile from API:', e);
      if (e.isAuthError || e.message?.includes('401') || e.message?.includes('Sessão expirada')) {
        Alert.alert(t('sessionExpiredTitle') || 'Sessão Expirada', t('sessionExpiredMsg') || 'Por favor, faça login novamente.');
        await handleLogout();
        return;
      }
      if (!hasLocalData && !user) {
        setLoadError(e.message || 'Não foi possível conectar ao servidor.');
      }
    } finally {
      setLoading(false);
    }
  };

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handlePullToRefresh = async () => {
    setIsRefreshing(true);
    await loadUser();
    setIsRefreshing(false);
  };

  useEffect(() => { loadUser(); }, []);

  const handleLogout = async () => { await api.logout(); onLogout(); };

  const isProfileComplete = Boolean(
    (user?.skills && user.skills.length > 0) ||
    (user?.city && user.city.trim().length > 0)
  );

  const handleBackToFeed = async () => {
    if (!isProfileComplete) {
      Alert.alert(
        t('incompleteProfileTitle') || 'Complete seu Perfil',
        t('incompleteProfileMsg') || 'Adicione ao menos seus instrumentos ou localização para liberar seu acesso ao feed da Rede BandLink.',
        [{ text: t('ok') || 'Entendi' }]
      );
      return;
    }
    await AsyncStorage.setItem('user_profile_completed', 'true');
    if (onBack) onBack();
  };

  const pickProfileImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];

        // Limite de tamanho de arquivo: máximo 5MB
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert(
            t('fileTooLargeTitle') || 'Arquivo Muito Grande',
            t('avatarSizeLimitMsg') || 'A foto de perfil deve ter no máximo 5MB.'
          );
          return;
        }

        const tempUri = asset.uri;
        let finalUri = tempUri;

        if (Platform.OS !== 'web' && FileSystem && FileSystem.documentDirectory) {
          try {
            const targetDir = FileSystem.documentDirectory;
            const permanentFile = `${targetDir}user_profile_avatar.jpg`;

            // Sempre remove a imagem anterior para substituir e não acumular arquivos
            const fileInfo = await FileSystem.getInfoAsync(permanentFile);
            if (fileInfo.exists) {
              await FileSystem.deleteAsync(permanentFile, { idempotent: true });
            }

            // Copia a nova imagem para o local permanente
            await FileSystem.copyAsync({
              from: tempUri,
              to: permanentFile,
            });

            // Parâmetro timestamp para invalidar cache de imagem em memória do React Native
            finalUri = `${permanentFile}?t=${Date.now()}`;
          } catch (fsErr) {
            console.log('Erro ao salvar foto de perfil permanente:', fsErr);
            finalUri = tempUri;
          }
        }

        setProfileImage(finalUri);
        if (user?.id) {
          await AsyncStorage.setItem(`profileImage_${user.id}`, finalUri);
        }
        await AsyncStorage.removeItem('profileImage');

        // Prepara Base64 portátil para sincronizar na nuvem
        let base64Photo = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : null;
        if (!base64Photo && tempUri && Platform.OS !== 'web' && FileSystem) {
          try {
            const b64 = await FileSystem.readAsStringAsync(tempUri, { encoding: FileSystem.EncodingType.Base64 });
            if (b64) base64Photo = `data:image/jpeg;base64,${b64}`;
          } catch (e) {}
        }

        // Atualiza o estado do usuário e o cache persistente do perfil
        const updatedUser = { ...user, imageUri: finalUri, pictureUrl: base64Photo || finalUri };
        setUser(updatedUser);
        await AsyncStorage.setItem('user_profile_cache', JSON.stringify(updatedUser));

        // Sincroniza foto na nuvem para toda a rede
        if (base64Photo) {
          try {
            await api.updateProfile({ pictureUrl: base64Photo });
          } catch (upErr) {
            console.log('Error syncing profile picture to cloud:', upErr);
          }
        }
      }
    } catch (err) {
      console.log('Erro ao selecionar foto de perfil:', err);
      Alert.alert(t('errorTitle') || 'Erro', 'Não foi possível carregar a imagem selecionada.');
    }
  };

  // ── Availability & Interest (inline toggle) ──
  const toggleAvailability = async (val) => {
    const updated = { ...user, availability: val };
    setUser(updated);
    try { await api.updateProfile({ availability: val }); } catch {}
  };

  const toggleInterest = async (val) => {
    const current = user.interestLevel || [];
    const isMatching = (item) => {
      const v = String(item || '').toLowerCase();
      const k = String(val).toLowerCase();
      if ((k.includes('casual') || k.includes('ver')) && (v.includes('casual') || v.includes('ver') || v.includes('see'))) return true;
      return v === k;
    };
    const exists = current.some(isMatching);
    const next = exists ? current.filter(v => !isMatching(v)) : [...current.filter(v => !isMatching(v)), val];
    const updated = { ...user, interestLevel: next };
    setUser(updated);
    try { await api.updateProfile({ interestLevel: JSON.stringify(next) }); } catch {}
  };

  // ── Skills ──
  const openAddSkill = () => {
    setEditingSkill(null);
    setSkillName('');
    setSkillStars(3);
    setShowSkillModal(true);
  };

  const openEditSkill = (skill) => {
    setEditingSkill(skill);
    setSkillName(skill.instrument);
    setSkillStars(skill.stars);
    setShowSkillModal(true);
  };

  const handleSaveSkill = async () => {
    if (!skillName.trim()) return;
    let updatedSkills;
    if (editingSkill) {
      updatedSkills = user.skills.map(s => s.id === editingSkill.id ? { ...s, instrument: skillName, stars: skillStars } : s);
    } else {
      updatedSkills = [...user.skills, { id: Date.now(), instrument: skillName, stars: skillStars }];
    }
    const updatedUser = { 
      ...user, 
      skills: updatedSkills, 
      instruments: JSON.stringify(updatedSkills) 
    };
    setUser(updatedUser);
    setShowSkillModal(false);
    try {
      await AsyncStorage.setItem('user_profile_cache', JSON.stringify(updatedUser));
      await AsyncStorage.setItem('user_profile_completed', 'true');
      await api.updateProfile({ 
        instruments: JSON.stringify(updatedSkills),
        skillsJson: JSON.stringify(updatedSkills)
      });
    } catch (e) {
      console.log('Error saving skill:', e);
    }
  };

  const handleRemoveSkill = async (id) => {
    const updatedSkills = user.skills.filter(s => s.id !== id);
    const updatedUser = { 
      ...user, 
      skills: updatedSkills, 
      instruments: JSON.stringify(updatedSkills) 
    };
    setUser(updatedUser);
    try { 
      await AsyncStorage.setItem('user_profile_cache', JSON.stringify(updatedUser));
      await api.updateProfile({ 
        instruments: JSON.stringify(updatedSkills),
        skillsJson: JSON.stringify(updatedSkills)
      }); 
    } catch (e) {
      console.log('Error removing skill:', e);
    }
  };

  // ── Marcar Instrumento Principal (Até 2, circulado selecionado) ──
  const togglePrimarySkill = async (id) => {
    const currentSkills = user?.skills || [];
    const target = currentSkills.find(s => s.id === id);
    if (!target) return;

    const isCurrentlyPrimary = !!target.isPrimary;
    const selectedCount = currentSkills.filter(s => s.isPrimary).length;

    if (!isCurrentlyPrimary && selectedCount >= 2) {
      Alert.alert(
        t('limit2InstrumentsTitle') || 'Limite de 2 Instrumentos',
        t('limit2InstrumentsMsg') || 'Você já selecionou 2 instrumentos principais para seu perfil. Desmarque um antes de marcar outro.'
      );
      return;
    }

    const updatedSkills = currentSkills.map(s => {
      if (s.id === id) {
        return { ...s, isPrimary: !isCurrentlyPrimary };
      }
      return s;
    });

    const primaryList = updatedSkills.filter(s => s.isPrimary).map(s => s.instrument);
    const updatedUser = {
      ...user,
      skills: updatedSkills,
      instruments: JSON.stringify(updatedSkills),
      primaryInstruments: primaryList
    };

    setUser(updatedUser);

    try {
      await AsyncStorage.setItem('user_profile_cache', JSON.stringify(updatedUser));
      await AsyncStorage.setItem('user_primary_instruments', JSON.stringify(primaryList));
      await api.updateProfile({ 
        instruments: JSON.stringify(updatedSkills),
        skillsJson: JSON.stringify(updatedSkills)
      });
    } catch (e) {
      console.log('Error saving primary skills:', e);
    }
  };

  // ── Gear / Equipamentos ──
  const saveGearList = async (updatedGear) => {
    setGear(updatedGear);
    await AsyncStorage.setItem('user_gear', JSON.stringify(updatedGear));
    try {
      await api.updateProfile({ gearJson: JSON.stringify(updatedGear) });
    } catch (err) {
      console.log('Error syncing gear to cloud API:', err);
    }
  };

  const togglePrimaryGear = (gearId) => {
    const currentGear = gearRef.current || [];
    const target = currentGear.find(g => g.id === gearId);
    if (!target) return;

    const isCurrentlyPrimary = !!target.isPrimary;
    const selectedCount = currentGear.filter(g => g.isPrimary).length;

    if (!isCurrentlyPrimary && selectedCount >= 2) {
      Alert.alert(
        t('limit2GearTitle') || 'Limite de 2 Instrumentos',
        t('limit2GearMsg') || 'Você já selecionou 2 equipamentos/instrumentos principais. Desmarque um antes de marcar outro.'
      );
      return;
    }

    const updated = currentGear.map(g => g.id === gearId ? { ...g, isPrimary: !isCurrentlyPrimary } : g);
    saveGearList(updated);
  };

  const openAddGear = () => {
    setEditingGear(null);
    setGearCategory('Guitarra');
    setCustomCategory('');
    setGearName('');
    setGearDetails('');
    setGearIsNegotiable(false);
    setGearPrice('');
    setShowGearModal(true);
  };

  const openEditGear = (item) => {
    setEditingGear(item);
    
    const isStandard = STANDARD_CATEGORIES.some(c => c !== 'Outros' && c.toLowerCase() === (item.category || '').toLowerCase());
    if (isStandard) {
      setGearCategory(item.category);
      setCustomCategory('');
    } else {
      setGearCategory('Outros');
      setCustomCategory(item.category || '');
    }
    
    setGearName(item.name || '');
    setGearDetails(item.details || '');
    setGearIsNegotiable(!!item.isNegotiable);
    setGearPrice(item.price ? String(item.price).replace(/^(\$|R\$)\s*/i, '').trim() : '');
    setShowGearModal(true);
  };

  const handleSaveGear = () => {
    if (!gearName.trim()) {
      Alert.alert(t('fieldRequired') || 'Campo Obrigatório', t('fillBrandModelError') || 'Preencha a Marca / Modelo do equipamento.');
      return;
    }

    const finalCategory = (gearCategory === 'Outros' && customCategory.trim()) 
      ? customCategory.trim() 
      : gearCategory;

    let updated;
    if (editingGear) {
      updated = gear.map(g => g.id === editingGear.id ? {
        ...g,
        category: finalCategory,
        name: gearName.trim(),
        details: gearDetails.trim(),
        isNegotiable: !!gearIsNegotiable,
        price: gearIsNegotiable ? gearPrice.trim() : ''
      } : g);
    } else {
      updated = [
        ...gear,
        {
          id: String(Date.now()),
          category: finalCategory,
          name: gearName.trim(),
          details: gearDetails.trim(),
          isNegotiable: !!gearIsNegotiable,
          price: gearIsNegotiable ? gearPrice.trim() : ''
        }
      ];
    }
    saveGearList(updated);
    setShowGearModal(false);
  };

  // Habilidades Extras Handlers
  const handleAddExtraSkill = async (name) => {
    const cleanName = (name || '').trim();
    if (!cleanName) return;

    const preset = PRESET_EXTRA_SKILLS.find(p => 
      p.key.toLowerCase() === cleanName.toLowerCase() || 
      (p.transKey && t(p.transKey)?.toLowerCase() === cleanName.toLowerCase())
    );
    const canonicalKey = preset ? preset.key : cleanName;

    const alreadyAdded = extraSkills.some(s => {
      const sName = (s.name || s || '').toLowerCase();
      return sName === canonicalKey.toLowerCase() || 
             (preset && preset.transKey && t(preset.transKey)?.toLowerCase() === sName);
    });

    if (alreadyAdded) {
      Alert.alert(t('attention') || 'Atenção', `${t('alreadyAddedSkill') || 'Você já adicionou'} "${preset ? (t(preset.transKey) || preset.key) : cleanName}".`);
      return;
    }

    const newSkill = {
      id: `es_${Date.now()}`,
      name: canonicalKey
    };
    const updated = [...extraSkills, newSkill];
    setExtraSkills(updated);
    await AsyncStorage.setItem('user_extra_skills', JSON.stringify(updated));
    try {
      const cached = await AsyncStorage.getItem('user_profile_cache');
      if (cached) {
        const uObj = JSON.parse(cached);
        uObj.extraSkills = JSON.stringify(updated);
        uObj.extraSkillsJson = JSON.stringify(updated);
        await AsyncStorage.setItem('user_profile_cache', JSON.stringify(uObj));
      }
    } catch (e) {}
    try {
      await api.updateProfile({ 
        extraSkills: JSON.stringify(updated),
        extraSkillsJson: JSON.stringify(updated)
      });
    } catch (e) {
      console.log('Error syncing extra skills:', e);
    }
    setCustomExtraSkill('');
    setSelectedPresetExtraSkill('');
  };

  const handleRemoveExtraSkill = async (idOrName) => {
    const updated = extraSkills.filter(s => {
      if (s.id && typeof idOrName === 'object' && idOrName.id) return s.id !== idOrName.id;
      if (s.id) return s.id !== idOrName;
      return s !== idOrName;
    });
    setExtraSkills(updated);
    await AsyncStorage.setItem('user_extra_skills', JSON.stringify(updated));
    try {
      const cached = await AsyncStorage.getItem('user_profile_cache');
      if (cached) {
        const uObj = JSON.parse(cached);
        uObj.extraSkills = JSON.stringify(updated);
        uObj.extraSkillsJson = JSON.stringify(updated);
        await AsyncStorage.setItem('user_profile_cache', JSON.stringify(uObj));
      }
    } catch (e) {}
    try {
      await api.updateProfile({ 
        extraSkills: JSON.stringify(updated),
        extraSkillsJson: JSON.stringify(updated)
      });
    } catch (e) {
      console.log('Error removing extra skill:', e);
    }
  };

  // Username live check handler
  const handleUsernameChange = (val) => {
    const clean = val.replace(/^@+/, '').trim();
    setEditProfileUsername(clean);

    if (usernameDebounceRef.current) {
      clearTimeout(usernameDebounceRef.current);
    }

    if (!clean) {
      setUsernameStatus('invalid');
      setUsernameMessage('Nome de usuário obrigatório.');
      return;
    }

    if (clean.toLowerCase() === (user?.username || '').toLowerCase()) {
      setUsernameStatus('available');
      setUsernameMessage(t('usernameAvailable') || 'Seu nome de usuário atual.');
      return;
    }

    if (clean.length < 3) {
      setUsernameStatus('invalid');
      setUsernameMessage('Mínimo de 3 caracteres.');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
      setUsernameStatus('invalid');
      setUsernameMessage('Use apenas letras, números e sublinhados (_).');
      return;
    }

    setUsernameStatus('checking');
    setUsernameMessage(t('checkingUsername') || 'Verificando...');

    usernameDebounceRef.current = setTimeout(async () => {
      try {
        const res = await api.checkUsername(clean);
        if (res && res.available) {
          setUsernameStatus('available');
          setUsernameMessage(t('usernameAvailable') || 'Nome de usuário disponível');
        } else {
          setUsernameStatus('taken');
          setUsernameMessage(res?.message || t('usernameTaken') || 'Nome de usuário já está em uso');
        }
      } catch (err) {
        setUsernameStatus('idle');
        setUsernameMessage('');
      }
    }, 450);
  };

  const handleRemoveGear = (id) => {
    const updated = gear.filter(g => g.id !== id);
    saveGearList(updated);
  };

  const confirmDeleteGear = () => {
    if (!editingGear) return;
    Alert.alert(
      t('deleteGearTitle') || 'Excluir Equipamento',
      (t('deleteGearConfirm') || 'Deseja realmente remover "{name}"?').replace('{name}', editingGear.name),
      [
        { text: t('cancelBtn') || 'Cancelar', style: 'cancel' },
        { 
          text: t('deleteBtn') || 'Excluir', 
          style: 'destructive', 
          onPress: () => {
            handleRemoveGear(editingGear.id);
            setShowGearModal(false);
          } 
        }
      ]
    );
  };

  // ── PanResponder para Arrastar e Organizar Equipamentos ──
  const createGearPanResponder = (index) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => {
        setDraggingIdx(index);
        dragY.setValue(0);
        setScrollEnabled(false);
      },
      onPanResponderMove: Animated.event([null, { dy: dragY }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gestureState) => {
        setScrollEnabled(true);
        const approxHeight = 74;
        const slots = Math.round(gestureState.dy / approxHeight);
        const currentList = gearRef.current;
        const targetIndex = Math.max(0, Math.min(currentList.length - 1, index + slots));
        if (targetIndex !== index) {
          const reordered = [...currentList];
          const [moved] = reordered.splice(index, 1);
          reordered.splice(targetIndex, 0, moved);
          saveGearList(reordered);
        }
        setDraggingIdx(null);
        dragY.setValue(0);
      },
      onPanResponderTerminate: () => {
        setScrollEnabled(true);
        setDraggingIdx(null);
        dragY.setValue(0);
      }
    });
  };

  // ── Influences (0-5 stars, up to 5, without #) ──
  const handleSaveInfluencesList = async (updatedList) => {
    setUser({ ...user, influences: updatedList });
    try {
      await api.updateProfile({ influences: JSON.stringify(updatedList) });
    } catch (e) {
      console.log('Error saving influences:', e);
    }
  };

  const handleAddInfluence = () => {
    const cleanName = newInfluenceName.replace(/^#/, '').trim();
    if (!cleanName) return;
    const currentList = user.influences || [];
    if (currentList.length >= 5) {
      Alert.alert(t('limitTitle') || 'Limite', t('limit5InfluencesMsg') || 'Você pode adicionar no máximo 5 influências.');
      return;
    }
    const updated = [
      ...currentList,
      { id: String(Date.now()), name: cleanName, stars: newInfluenceStars }
    ];
    handleSaveInfluencesList(updated);
    setNewInfluenceName('');
    setNewInfluenceStars(5);
  };

  const handleUpdateInfluenceStars = (id, stars) => {
    const updated = (user.influences || []).map(inf =>
      inf.id === id ? { ...inf, stars } : inf
    );
    handleSaveInfluencesList(updated);
  };

  const handleRemoveInfluence = (id) => {
    const updated = (user.influences || []).filter(inf => inf.id !== id);
    handleSaveInfluencesList(updated);
  };

  const formatBirthDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const parts = dateStr.slice(0, 10).split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const formatBirthDateInput = (text) => {
    const cleaned = (text || '').replace(/\D/g, '').slice(0, 8);
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4)}`;
  };

  const openEditProfileModal = () => {
    setEditProfileName(user?.displayName || user?.name || user?.username || '');
    setEditProfileBirthDate(user?.birthDate ? formatBirthDateDisplay(user.birthDate) : '');
    setEditProfileCity(user?.city || '');
    setEditProfileState(user?.state || '');
    setEditProfileCountry(user?.country || 'Brasil');
    setShowEditProfileModal(true);
  };

  const handleSaveUserProfile = async () => {
    try {
      const cleanName = editProfileName.trim() || user?.username || 'Músico';
      const cleanUsername = editProfileUsername.trim().toLowerCase().replace(/^@+/, '');

      if (!cleanName) {
        Alert.alert(t('attention') || 'Atenção', 'O nome de exibição é obrigatório.');
        return;
      }

      if (cleanUsername && cleanUsername !== (user?.username || '').toLowerCase()) {
        if (usernameStatus === 'taken' || usernameStatus === 'invalid') {
          Alert.alert(t('attention') || 'Atenção', usernameMessage || 'Nome de usuário inválido ou indisponível.');
          return;
        }
        if (usernameStatus === 'checking') {
          Alert.alert(t('attention') || 'Atenção', 'Aguarde a verificação do nome de usuário.');
          return;
        }
      }

      const cleanCity = editProfileCity.trim();
      const cleanState = editProfileState.trim();
      const cleanCountry = editProfileCountry.trim();
      const finalPic = editProfilePictureUrl.trim() || profileImage || '';

      let isoBirthDate = null;
      if (editProfileBirthDate.trim()) {
        const cleaned = editProfileBirthDate.replace(/\D/g, '');
        if (cleaned.length === 8) {
          const d = parseInt(cleaned.slice(0, 2), 10);
          const m = parseInt(cleaned.slice(2, 4), 10);
          const y = parseInt(cleaned.slice(4), 10);
          const currY = new Date().getFullYear();
          if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1920 || y > currY) {
            Alert.alert(t('attention') || 'Atenção', 'Data de nascimento inválida.');
            return;
          }
          isoBirthDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        } else if (/^\d{4}-\d{2}-\d{2}/.test(editProfileBirthDate.trim())) {
          isoBirthDate = editProfileBirthDate.trim().slice(0, 10);
        } else {
          Alert.alert(t('attention') || 'Atenção', 'Data de nascimento incompleta. Use o formato DD/MM/AAAA.');
          return;
        }
      }

      let newAge = user?.age;
      if (isoBirthDate) {
        const b = new Date(isoBirthDate);
        const today = new Date();
        let calcAge = today.getFullYear() - b.getFullYear();
        const m = today.getMonth() - b.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < b.getDate())) {
          calcAge--;
        }
        newAge = calcAge >= 0 ? calcAge : null;
      }

      const updatedUser = {
        ...user,
        username: cleanUsername || user?.username,
        displayName: cleanName,
        pictureUrl: finalPic,
        imageUri: finalPic,
        birthDate: isoBirthDate || '',
        age: newAge,
        city: cleanCity,
        state: cleanState,
        country: cleanCountry
      };

      setUser(updatedUser);
      setProfileImage(finalPic);
      await AsyncStorage.setItem('user_display_name', cleanName);
      await AsyncStorage.setItem('user_profile_cache', JSON.stringify(updatedUser));
      if (finalPic && user?.id) {
        await AsyncStorage.setItem(`profileImage_${user.id}`, finalPic);
      }

      if (cleanCity) {
        await AsyncStorage.setItem('user_profile_completed', 'true');
      }

      await api.updateProfile({
        displayName: cleanName,
        username: cleanUsername !== (user?.username || '').toLowerCase() ? cleanUsername : undefined,
        pictureUrl: finalPic,
        birthDate: isoBirthDate || '',
        city: cleanCity,
        state: cleanState,
        country: cleanCountry
      });

      setShowEditProfileModal(false);
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
    } catch (e) {
      console.log('Erro ao atualizar perfil:', e);
      Alert.alert(t('errorTitle') || 'Erro', 'Falha ao salvar dados do perfil.');
    }
  };

  // ── Generic edit (bio, links, etc.) ──
  const openEdit = (key, title, currentValue) => {
    setEditField({ key, title, value: currentValue || '' });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      const cleanVal = (editField.value || '').trim();
      if (editField.key === 'displayName') {
        const val = cleanVal || user?.username || user?.name || '';
        await AsyncStorage.setItem('user_display_name', val);
        const updated = { ...user, displayName: val };
        setUser(updated);
        await AsyncStorage.setItem('user_profile_cache', JSON.stringify(updated));
        try { await api.updateProfile({ displayName: val }); } catch (e) {}
        setShowEditModal(false);
        return;
      }

      let updateData = { [editField.key]: cleanVal };
      await api.updateProfile(updateData);
      const updatedUser = { ...user, [editField.key]: cleanVal };
      setUser(updatedUser);
      await AsyncStorage.setItem('user_profile_cache', JSON.stringify(updatedUser));
      setShowEditModal(false);
    } catch (e) {
      Alert.alert(t('errorTitle') || 'Erro', t('failedToSaveMsg') || 'Falha ao salvar.');
    }
  };

  const openLocationModal = () => {
    setLocCity(user?.city || '');
    setLocState(user?.state || '');
    setLocCountry(user?.country || '');
    setShowLocationModal(true);
  };

  const handleSaveLocation = async () => {
    try {
      const trimmedCity = locCity.trim();
      const updatedUser = {
        ...user,
        city: trimmedCity,
        state: locState,
        country: locCountry
      };
      setUser(updatedUser);
      await AsyncStorage.setItem('user_profile_cache', JSON.stringify(updatedUser));
      if (trimmedCity) {
        await AsyncStorage.setItem('user_profile_completed', 'true');
      }
      try {
        await api.updateProfile({
          city: trimmedCity,
          state: locState,
          country: locCountry
        });
      } catch (err) {
        console.log('Error updating profile location in API:', err);
      }
      setShowLocationModal(false);
    } catch (e) {
      Alert.alert(t('errorTitle') || 'Erro', t('failedToSaveLocationMsg') || 'Falha ao salvar localização.');
    }
  };


  // ── Helper de estrelas (suporta de 0 a 5 estrelas) ──
  const renderStars = (count, size = 16, interactive = false, onSelect = null) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(s => {
        const isFilled = s <= count;
        const starElement = (
          <Ionicons
            key={s}
            name={isFilled ? 'star' : 'star-outline'}
            size={size}
            color={isFilled ? colors.primary : (isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)')}
          />
        );
        if (interactive && onSelect) {
          return (
            <Pressable
              key={s}
              onPress={() => {
                if (count === s) {
                  onSelect(s - 1);
                } else {
                  onSelect(s);
                }
              }}
              hitSlop={6}
            >
              {starElement}
            </Pressable>
          );
        }
        return starElement;
      })}
    </View>
  );

  // ── Pill helper: compacto, translúcido com contorno acentuado ──
  const Pill = ({ label, selected, onPress, flex }) => (
    <Pressable
      onPress={onPress}
      style={{
        flex: flex || undefined,
        paddingVertical: 5,
        paddingHorizontal: 6,
        borderRadius: 8,
        backgroundColor: selected ? colors.primary + '22' : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
        borderWidth: 1.5,
        borderColor: selected ? colors.primary : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ 
        color: selected ? colors.primary : colors.textMuted, 
        fontSize: 11, 
        fontWeight: selected ? '800' : '600', 
        textAlign: 'center' 
      }}>
        {label}
      </Text>
    </Pressable>
  );

  // ── Faixa/Fundo simétrico com o cabeçalho lateralmente (full width) ──
  const SectionBanner = ({ title, rightElement, isFirst = false }) => (
    <View style={[
      styles.sectionBannerContainer, 
      { 
        backgroundColor: isDark ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.035)',
        borderTopColor: colors.border,
        borderBottomColor: colors.border,
        marginTop: isFirst ? 2 : 18
      }
    ]}>
      <Text style={[styles.sectionBannerTitle, { color: colors.text }]}>{title}</Text>
      {rightElement}
    </View>
  );

  // ══════════════ TABS ══════════════

  // ── 1. BIO TAB (COM FAIXAS SIMÉTRICAS AO CABEÇALHO E SEM TABELAS) ──
  const renderBioTab = () => (
    <View style={styles.tabContentClean}>
      {/* Faixa: NÍVEL DE INTERESSE & DISPONIBILIDADE (CÍRCULOS FIGMA PADRÃO WEB) */}
      <SectionBanner title={t('interestLevelSection') || "Nível de Interesse"} isFirst={true} />
      {(() => {
        const isHobbie = (user.interestLevel || []).some(val => String(val || '').toLowerCase().includes('hobb'));
        const isProf = (user.interestLevel || []).some(val => String(val || '').toLowerCase().includes('prof'));
        const isCasual = (user.interestLevel || []).some(val => {
          const v = String(val || '').toLowerCase();
          return v.includes('casual') || v.includes('ver') || v.includes('see');
        });
        const isAvail = user.availability === 'Disponível' || String(user.availability).toLowerCase() === 'available';

        return (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 14,
            paddingHorizontal: 8,
            marginBottom: 14,
            borderRadius: 16,
            backgroundColor: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.02)',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'
          }}>
            {/* 1. Hobbie */}
            <Pressable 
              onPress={() => toggleInterest('Hobbie')} 
              style={({ pressed }) => [{ flex: 1, alignItems: 'center', opacity: pressed ? 0.75 : 1 }]}
              hitSlop={6}
            >
              <View style={{
                width: 54,
                height: 54,
                borderRadius: 27,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isHobbie ? '#38bdf8' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                borderWidth: 2,
                borderColor: isHobbie ? '#7dd3fc' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                elevation: isHobbie ? 4 : 0,
                shadowColor: '#38bdf8',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isHobbie ? 0.45 : 0,
                shadowRadius: 6,
              }}>
                <Ionicons name="sparkles" size={22} color={isHobbie ? '#0f172a' : (isDark ? '#64748b' : '#94a3b8')} />
              </View>
              <Text style={{
                fontSize: 11,
                fontWeight: isHobbie ? '800' : '600',
                color: isHobbie ? '#38bdf8' : colors.textMuted,
                marginTop: 6,
                textAlign: 'center'
              }}>
                Hobbie
              </Text>
            </Pressable>

            {/* 2. Profissional */}
            <Pressable 
              onPress={() => toggleInterest('Profissional')} 
              style={({ pressed }) => [{ flex: 1, alignItems: 'center', opacity: pressed ? 0.75 : 1 }]}
              hitSlop={6}
            >
              <View style={{
                width: 54,
                height: 54,
                borderRadius: 27,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isProf ? '#38bdf8' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                borderWidth: 2,
                borderColor: isProf ? '#7dd3fc' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                elevation: isProf ? 4 : 0,
                shadowColor: '#38bdf8',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isProf ? 0.45 : 0,
                shadowRadius: 6,
              }}>
                <Ionicons name="briefcase" size={22} color={isProf ? '#0f172a' : (isDark ? '#64748b' : '#94a3b8')} />
              </View>
              <Text style={{
                fontSize: 11,
                fontWeight: isProf ? '800' : '600',
                color: isProf ? '#38bdf8' : colors.textMuted,
                marginTop: 6,
                textAlign: 'center'
              }}>
                Profissional
              </Text>
            </Pressable>

            {/* 3. Casual */}
            <Pressable 
              onPress={() => toggleInterest('Casual')} 
              style={({ pressed }) => [{ flex: 1, alignItems: 'center', opacity: pressed ? 0.75 : 1 }]}
              hitSlop={6}
            >
              <View style={{
                width: 54,
                height: 54,
                borderRadius: 27,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isCasual ? '#38bdf8' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                borderWidth: 2,
                borderColor: isCasual ? '#7dd3fc' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                elevation: isCasual ? 4 : 0,
                shadowColor: '#38bdf8',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isCasual ? 0.45 : 0,
                shadowRadius: 6,
              }}>
                <Ionicons name="beer-outline" size={23} color={isCasual ? '#0f172a' : (isDark ? '#64748b' : '#94a3b8')} />
              </View>
              <Text style={{
                fontSize: 11,
                fontWeight: isCasual ? '800' : '600',
                color: isCasual ? '#38bdf8' : colors.textMuted,
                marginTop: 6,
                textAlign: 'center'
              }}>
                Casual
              </Text>
            </Pressable>

            {/* Divisor vertical discreto */}
            <View style={{
              width: 1.5,
              height: 40,
              backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
              marginHorizontal: 4,
              borderRadius: 1
            }} />

            {/* 4. Disponível / Indisponível (por último!) */}
            <Pressable 
              onPress={() => toggleAvailability(isAvail ? 'Indisponível' : 'Disponível')} 
              style={({ pressed }) => [{ flex: 1.15, alignItems: 'center', opacity: pressed ? 0.75 : 1 }]}
              hitSlop={6}
            >
              <View style={{
                width: 54,
                height: 54,
                borderRadius: 27,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isAvail ? '#22c55e' : '#ef4444',
                borderWidth: 2,
                borderColor: isAvail ? '#86efac' : '#fca5a5',
                elevation: 4,
                shadowColor: isAvail ? '#22c55e' : '#ef4444',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.45,
                shadowRadius: 6,
              }}>
                <Ionicons 
                  name={isAvail ? "checkmark-circle" : "close-circle"} 
                  size={26} 
                  color={isAvail ? '#064e3b' : '#450a0a'} 
                />
              </View>
              <Text style={{
                fontSize: 11,
                fontWeight: '800',
                color: isAvail ? '#22c55e' : '#ef4444',
                marginTop: 6,
                textAlign: 'center'
              }}>
                {isAvail ? (t('availableStatus') || 'Disponível') : (t('unavailableStatus') || 'Indisponível')}
              </Text>
            </Pressable>
          </View>
        );
      })()}

      {/* Faixa: SOBRE MIM */}
      <SectionBanner 
        title={t('aboutMeSection') || "Sobre mim"} 
        rightElement={
          <Pressable 
            onPress={() => openEdit('bio', t('aboutMeSection') || 'Sobre mim', user.bio)}
            style={styles.cleanActionBtn}
            hitSlop={8}
          >
            <Ionicons name='pencil' size={14} color={colors.primary} />
            <Text style={[styles.cleanActionText, { color: colors.primary }]}>{t('editBtn') || 'Editar'}</Text>
          </Pressable>
        }
      />
      <View style={{ paddingHorizontal: 4 }}>
        <Text style={[styles.cleanBodyText, { color: colors.text }]}>{user.bio}</Text>
      </View>

      {/* Faixa: INFLUÊNCIAS MUSICAIS (sem #) */}
      <SectionBanner 
        title={(t('musicalInfluencesCount') || "Influências Musicais ({count}/5)").replace('{count}', (user.influences || []).length)}
        rightElement={
          <Pressable 
            onPress={() => setShowInfluenceModal(true)}
            style={styles.cleanActionBtn}
            hitSlop={8}
          >
            <Ionicons name='pencil' size={14} color={colors.primary} />
            <Text style={[styles.cleanActionText, { color: colors.primary }]}>{t('manageBtn') || 'Gerenciar'}</Text>
          </Pressable>
        }
      />
      <View style={{ paddingHorizontal: 4 }}>
        {(!user.influences || user.influences.length === 0) ? (
          <Text style={{ color: colors.textMuted, fontStyle: 'italic', fontSize: 13, marginTop: 4 }}>
            {t('noInfluencesManagePrompt') || 'Nenhuma influência adicionada. Toque em Gerenciar para listar até 5 estilos.'}
          </Text>
        ) : (
          <View style={{ gap: 6 }}>
            {user.influences.map((inf) => (
              <View key={inf.id} style={styles.influenceRowClean}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary }} />
                  <Text style={[styles.influenceNameClean, { color: colors.text }]}>{inf.name}</Text>
                </View>
                {renderStars(inf.stars, 14)}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Faixa: LINKS EXTERNOS */}
      <SectionBanner title={t('externalLinksSection') || "Links Externos"} />
      <View style={{ paddingHorizontal: 4, gap: 4 }}>
        {/* Instagram */}
        <Pressable 
          style={styles.cleanLinkRow} 
          onPress={() => openEdit('instagram', t('editInstagramTitle') || 'Editar Instagram', user.instagram)}
        >
          <Ionicons name='logo-instagram' size={20} color={colors.primary} style={{ width: 26 }} />
          <Text style={[styles.cleanLinkText, { color: user.instagram ? colors.text : colors.textMuted, flex: 1 }]}>
            {user.instagram ? `@${user.instagram.replace(/^@+/, '')}` : (t('instagramPlaceholder') || 'Adicionar Instagram (@usuario)')}
          </Text>
          <Ionicons name='pencil' size={14} color={colors.textMuted} />
        </Pressable>

        {/* YouTube */}
        <Pressable 
          style={styles.cleanLinkRow} 
          onPress={() => openEdit('youtube', t('editYouTubeTitle') || 'Editar YouTube', user.youtube)}
        >
          <Ionicons name='logo-youtube' size={20} color={colors.primary} style={{ width: 26 }} />
          <Text style={[styles.cleanLinkText, { color: user.youtube ? colors.text : colors.textMuted, flex: 1 }]}>
            {user.youtube || (t('youtubePlaceholder') || 'Adicionar canal do YouTube')}
          </Text>
          <Ionicons name='pencil' size={14} color={colors.textMuted} />
        </Pressable>

        {/* X / Twitter */}
        <Pressable 
          style={styles.cleanLinkRow} 
          onPress={() => openEdit('twitter', t('editTwitterTitle') || 'Editar X (Twitter)', user.twitter)}
        >
          <Ionicons name='logo-twitter' size={20} color={colors.primary} style={{ width: 26 }} />
          <Text style={[styles.cleanLinkText, { color: user.twitter ? colors.text : colors.textMuted, flex: 1 }]}>
            {user.twitter ? `@${user.twitter.replace(/^@+/, '')}` : (t('socialTwitterPlaceholder') || 'Adicionar perfil do X (@usuario)')}
          </Text>
          <Ionicons name='pencil' size={14} color={colors.textMuted} />
        </Pressable>

        {/* Facebook */}
        <Pressable 
          style={styles.cleanLinkRow} 
          onPress={() => openEdit('facebook', t('editFacebookTitle') || 'Editar Facebook', user.facebook)}
        >
          <Ionicons name='logo-facebook' size={20} color={colors.primary} style={{ width: 26 }} />
          <Text style={[styles.cleanLinkText, { color: user.facebook ? colors.text : colors.textMuted, flex: 1 }]}>
            {user.facebook || (t('socialFacebookPlaceholder') || 'Adicionar perfil do Facebook')}
          </Text>
          <Ionicons name='pencil' size={14} color={colors.textMuted} />
        </Pressable>

        {/* Spotify */}
        <Pressable 
          style={styles.cleanLinkRow} 
          onPress={() => openEdit('spotify', t('editSpotifyTitle') || 'Editar Spotify', user.spotify)}
        >
          <MaterialCommunityIcons name='spotify' size={22} color={colors.primary} style={{ width: 26 }} />
          <Text style={[styles.cleanLinkText, { color: user.spotify ? colors.text : colors.textMuted, flex: 1 }]}>
            {user.spotify || (t('socialSpotifyPlaceholder') || 'Adicionar link do Spotify')}
          </Text>
          <Ionicons name='pencil' size={14} color={colors.textMuted} />
        </Pressable>

        {/* TikTok */}
        <Pressable 
          style={styles.cleanLinkRow} 
          onPress={() => openEdit('tiktok', t('editTikTokTitle') || 'Editar TikTok', user.tiktok)}
        >
          <Ionicons name='logo-tiktok' size={20} color={colors.primary} style={{ width: 26 }} />
          <Text style={[styles.cleanLinkText, { color: user.tiktok ? colors.text : colors.textMuted, flex: 1 }]}>
            {user.tiktok ? `@${user.tiktok.replace(/^@+/, '')}` : (t('socialTikTokPlaceholder') || 'Adicionar perfil do TikTok (@usuario)')}
          </Text>
          <Ionicons name='pencil' size={14} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );

  // ── 2. HABILIDADES TAB (CARDS EXPANDIDOS LATERALMENTE E BOTÃO CIRCULAR NO TOPO) ──
  const renderSkillsTab = () => (
    <View style={styles.tabContent}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>{t('skillsTab') || 'Habilidades'}</Text>
        <Pressable
          onPress={openAddSkill}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.primary,
            justifyContent: 'center',
            alignItems: 'center',
          }}
          hitSlop={8}
          accessibilityLabel="Nova Habilidade"
        >
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 12, paddingHorizontal: 2 }}>
        {t('skillsSectionSubtitle') || 'Instrumentos e habilidades técnicas do músico.'}
      </Text>

      {(user.skills || []).length === 0 ? (
        <View style={[styles.fullWidthCard, { backgroundColor: colors.cardBackground, borderTopColor: colors.border, borderBottomColor: colors.border, alignItems: 'center', paddingVertical: 24 }]}>
          <Text style={{ color: colors.textMuted, fontSize: 13, fontStyle: 'italic' }}>
            {t('noSkillsAddHint') || 'Nenhuma habilidade cadastrada. Toque no botão + para adicionar.'}
          </Text>
        </View>
      ) : (
        (user.skills || []).map((skill) => {
          return (
            <View 
              key={skill.id} 
              style={[
                styles.fullWidthCard, 
                styles.skillRow, 
                { 
                  backgroundColor: colors.cardBackground, 
                  borderTopColor: colors.border,
                  borderBottomColor: colors.border,
                  borderLeftWidth: 0,
                  borderRightWidth: 0,
                }
              ]}
            >
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <Text style={[styles.skillName, { color: colors.text, marginBottom: 0 }]}>{skill.instrument}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>{renderStars(skill.stars, 20)}</View>
              </View>

              <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                <Pressable onPress={() => openEditSkill(skill)} hitSlop={10} style={{ padding: 4 }}>
                  <Ionicons name="pencil" size={18} color={colors.textMuted} />
                </Pressable>
                <Pressable onPress={() => handleRemoveSkill(skill.id)} hitSlop={10} style={{ padding: 4 }}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger || '#ef4444'} />
                </Pressable>
              </View>
            </View>
          );
        })
      )}

      {/* 2. HABILIDADES EXTRAS (DIFERENCIAIS P/ BANDA & PRODUÇÃO) */}
      <View style={{ marginTop: 24, paddingTop: 18, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="sparkles" size={16} color="#fbbf24" />
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {t('extraSkills') || 'Habilidades Extras'}
            </Text>
          </View>
          <Pressable 
            style={({ pressed }) => [
              {
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor: 'rgba(251, 191, 36, 0.15)',
                borderWidth: 1.2,
                borderColor: 'rgba(251, 191, 36, 0.45)',
                opacity: pressed ? 0.75 : 1,
              }
            ]} 
            onPress={() => setShowExtraSkillModal(true)}
            hitSlop={8}
            accessibilityLabel={t('addExtraSkill') || 'Adicionar Habilidade Extra'}
          >
            <Ionicons name="add" size={16} color="#fbbf24" />
            <Text style={{ color: '#fbbf24', fontSize: 12.5, fontWeight: '800', marginLeft: 4 }}>
              {t('addBtn') || 'Adicionar'}
            </Text>
          </Pressable>
        </View>

        <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 12, paddingHorizontal: 2 }}>
          {t('extraSkillsSubtitle') || 'Diferenciais para bandas e produção.'}
        </Text>

        {extraSkills.length === 0 ? (
          <View style={[styles.fullWidthCard, { backgroundColor: colors.cardBackground, borderTopColor: colors.border, borderBottomColor: colors.border, alignItems: 'center', paddingVertical: 20 }]}>
            <Text style={{ color: colors.textMuted, fontSize: 13, fontStyle: 'italic', textAlign: 'center' }}>
              {t('noExtraSkillsHint') || 'Nenhuma habilidade extra cadastrada. Toque em Adicionar para incluir.'}
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {extraSkills.map((es, idx) => (
              <View 
                key={es.id || idx}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingLeft: 12,
                  paddingRight: 8,
                  paddingVertical: 7,
                  borderRadius: 16,
                  backgroundColor: isDark ? 'rgba(251, 191, 36, 0.12)' : 'rgba(251, 191, 36, 0.15)',
                  borderWidth: 1,
                  borderColor: 'rgba(251, 191, 36, 0.35)',
                }}
              >
                <Ionicons name="sparkles" size={13} color="#fbbf24" />
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: isDark ? '#fef3c7' : '#92400e' }}>
                  {getExtraSkillDisplay(es)}
                </Text>
                <Pressable onPress={() => handleRemoveExtraSkill(es.id || es)} hitSlop={6} style={{ padding: 2 }}>
                  <Ionicons name="close-circle" size={16} color={isDark ? '#fbbf24' : '#b45309'} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  // ── 3. INSTRUMENTOS & EQUIPAMENTOS TAB (EXPANDIDO LATERALMENTE, REORDENÁVEL POR ARRASTE) ──
  const renderInstrumentsTab = () => (
    <View style={styles.tabContent}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ backgroundColor: colors.primary + '18', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800' }}>{gear.length}</Text>
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>{t('myGearTitle') || 'Meus Equipamentos'}</Text>
        </View>

        <Pressable
          onPress={openAddGear}
          style={{ backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{t('addBtn') || 'Adicionar'}</Text>
        </Pressable>
      </View>

      {gear.length === 0 ? (
        <View style={[styles.fullWidthCard, { backgroundColor: colors.cardBackground, borderTopColor: colors.border, borderBottomColor: colors.border, alignItems: 'center', paddingVertical: 28 }]}>
          <MaterialCommunityIcons name="guitar-acoustic" size={48} color={colors.textMuted} />
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: 'bold', marginTop: 10 }}>{t('noGearRegistered') || 'Nenhum equipamento cadastrado'}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 4, paddingHorizontal: 20 }}>
            {t('gearRegisterSubtitle') || 'Cadastre suas guitarras, violões, amplificadores, pedais, microfones e outros instrumentos.'}
          </Text>
        </View>
      ) : (
        gear.map((item) => {
          return (
            <View 
              key={item.id} 
              style={[
                styles.gearCardFullWidth, 
                { 
                  backgroundColor: colors.cardBackground, 
                  borderTopColor: colors.border,
                  borderBottomColor: colors.border,
                  borderLeftWidth: 0,
                  borderRightWidth: 0,
                }
              ]}
            >
              {/* LINHA 1 (ACIMA): Badge Categoria + Marca/Modelo + Negociável + Editar */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8, flexWrap: 'wrap', gap: 8 }}>
                  <View style={{ backgroundColor: colors.primary + '18', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: colors.primary + '30' }}>
                    <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>{getGearCategoryLabel(item.category)}</Text>
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.text }} numberOfLines={1}>
                    {item.name}
                  </Text>

                  {item.isNegotiable ? (
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                      backgroundColor: 'rgba(34, 197, 94, 0.15)',
                      borderWidth: 1,
                      borderColor: 'rgba(34, 197, 94, 0.35)'
                    }}>
                      <Ionicons name="pricetag-outline" size={11} color="#4ade80" />
                      <Text style={{ color: '#4ade80', fontSize: 11, fontWeight: '800' }}>
                        {item.price ? `$ ${String(item.price).replace(/^(\$|R\$)\s*/i, '').trim()}` : (t('negotiable') || 'Negociável')}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Pressable onPress={() => openEditGear(item)} hitSlop={8} style={{ padding: 4 }}>
                  <Ionicons name="pencil" size={17} color={colors.textMuted} />
                </Pressable>
              </View>

              {/* LINHA 2 (ABAIXO): Observações adicionais */}
              {item.details ? (
                <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                  <Text style={{ color: colors.textMuted, fontSize: 12.5, lineHeight: 18 }}>
                    {item.details}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })
      )}
    </View>
  );

  // ── 4. PROJETOS TAB (CARDS EXPANDIDOS LATERALMENTE) ──
  const renderProjectsTab = () => (
    <View style={styles.tabContent}>
      <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 14 }]}>{t('bandsAndProjectsTitle') || 'Bandas e Projetos'}</Text>
      {(user.projects || []).length === 0 ? (
        <View style={[styles.fullWidthCard, { backgroundColor: colors.cardBackground, borderTopColor: colors.border, borderBottomColor: colors.border, alignItems: 'center', paddingVertical: 24 }]}>
          <Text style={{ color: colors.textMuted, fontSize: 13, fontStyle: 'italic' }}>
            {t('noProjectsRegistered') || 'Nenhum projeto cadastrado.'}
          </Text>
        </View>
      ) : (
        (user.projects || []).map(proj => {
          const projTags = (() => {
            if (!proj.genres) return [];
            try {
              const parsed = typeof proj.genres === 'string' && proj.genres.startsWith('[')
                ? JSON.parse(proj.genres)
                : String(proj.genres).split(',').map(s => s.trim()).filter(Boolean);
              return parsed.slice(0, 4);
            } catch (e) {
              return String(proj.genres).split(',').map(s => s.trim()).filter(Boolean).slice(0, 4);
            }
          })();

          return (
            <Pressable 
              key={`proj_${proj.id || idx}_${idx}`} 
              onPress={() => onOpenBandProfile && onOpenBandProfile(proj)}
              style={({ pressed }) => [
                styles.fullWidthCard, 
                { 
                  backgroundColor: colors.cardBackground, 
                  borderTopColor: colors.border,
                  borderBottomColor: colors.border,
                  paddingVertical: 12,
                  opacity: pressed ? 0.85 : 1,
                }
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {/* Logo da banda (somente a logo do lado esquerdo) */}
                <View style={{
                  width: 82,
                  height: 82,
                  borderRadius: 41,
                  borderWidth: 2,
                  borderColor: colors.primary,
                  backgroundColor: colors.primary + '18',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 14,
                  overflow: 'hidden',
                }}>
                  {proj.imageUri || proj.logo ? (
                    <Image source={{ uri: proj.imageUri || proj.logo }} style={{ width: 82, height: 82, borderRadius: 41 }} />
                  ) : (
                    <Text style={{ fontSize: 28, fontWeight: '900', color: colors.primary }}>
                      {getBandInitials(proj.name)}
                    </Text>
                  )}
                </View>

                {/* Informações da banda do lado direito da logo (3 linhas) */}
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  {/* Linha 1: Nome da banda (fonte ampliada) + Ícone de Sync */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={[styles.projectName, { color: colors.text, fontSize: 18.5, fontWeight: '800', flex: 1 }]} numberOfLines={1}>
                      {proj.name}
                    </Text>
                    {proj.needsSync ? (
                      <Pressable
                        onPress={() => {
                          Alert.alert(
                            t('pendingSyncTitle') || 'Sincronização Pendente',
                            (t('pendingSyncConfirm') || 'Deseja sincronizar os dados e repertório de "{name}" com a nuvem?').replace('{name}', proj.name),
                            [
                              { text: t('cancelBtn') || 'Cancelar', style: 'cancel' },
                              { 
                                text: t('syncBtn') || 'Sincronizar', 
                                onPress: () => {
                                  Alert.alert(t('success') || 'Sucesso', (t('bandSyncedSuccess') || '"{name}" sincronizado com sucesso!').replace('{name}', proj.name));
                                  setUser(prev => ({
                                    ...prev,
                                    projects: (prev.projects || []).map(p => p.id === proj.id ? { ...p, needsSync: false } : p)
                                  }));
                                } 
                              }
                            ]
                          );
                        }}
                        style={({ pressed }) => [
                          styles.syncRoundIcon,
                          { 
                            backgroundColor: 'rgba(234, 179, 8, 0.16)', 
                            borderColor: 'rgba(234, 179, 8, 0.45)',
                            opacity: pressed ? 0.7 : 1,
                            marginLeft: 6
                          }
                        ]}
                        hitSlop={8}
                      >
                        <Ionicons name="alert-circle" size={18} color="#eab308" />
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() => {
                          Alert.alert(t('syncedTitle') || 'Sincronizado', (t('bandAlreadySyncedMsg') || '"{name}" está totalmente sincronizado com a nuvem.').replace('{name}', proj.name));
                        }}
                        style={({ pressed }) => [
                          styles.syncRoundIcon,
                          { 
                            backgroundColor: 'rgba(34, 197, 94, 0.16)', 
                            borderColor: 'rgba(34, 197, 94, 0.45)',
                            opacity: pressed ? 0.7 : 1,
                            marginLeft: 6
                          }
                        ]}
                        hitSlop={8}
                      >
                        <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                      </Pressable>
                    )}
                    <Ionicons name="chevron-forward" size={17} color={colors.textMuted} style={{ marginLeft: 6 }} />
                  </View>

                  {/* Linha 2: Função/Instrumentos e Localização */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                    <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }} numberOfLines={1}>
                      {getProjectInstrument(proj.role, user?.skills)}
                    </Text>
                    {(proj.city || proj.state || proj.country) && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                        <Text style={{ color: colors.textMuted, fontSize: 11, opacity: 0.5 }}>•</Text>
                        <Ionicons name="location-outline" size={11} color={colors.textMuted} />
                        <Text style={{ fontSize: 11, fontWeight: '500', color: colors.textMuted }} numberOfLines={1}>
                          {[proj.city, proj.state].filter(Boolean).join(', ')
                            ? `${[proj.city, proj.state].filter(Boolean).join(', ')}${proj.country ? ` • ${proj.country}` : ''}`
                            : proj.country}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Linha 3: Tags de Estilo da Banda (até 4) do lado direito da logo */}
                  {projTags.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                      {projTags.map((tag, idx) => (
                        <View key={idx} style={{ backgroundColor: colors.primary + '18', borderColor: colors.primary + '30', borderWidth: 1, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5 }}>
                          <Text style={{ fontSize: 9, fontWeight: '800', color: colors.primary }}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* Onde estava o botão atualizado, agora fica: Desde... Membro/Proprietário */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: 10,
                paddingTop: 8,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                gap: 6
              }}>
                <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600' }}>
                  {t('since') || 'Desde'} {proj.since}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, opacity: 0.4 }}>•</Text>
                <Ionicons name="shield-checkmark-outline" size={13} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600' }}>
                  {getMemberPositionLabel(proj.memberType, proj.role)}
                </Text>
              </View>
            </Pressable>
          );
        })
      )}
    </View>
  );

  // ── 5. AGENDA TAB (ORGANIZADA POR MÊS, EVENTO NO TOPO E PASSADAS EM SEPARADORES OCULTOS) ──
  const renderAgendaTab = () => {
    const rawAgenda = user?.agenda || [];

    // Helper para extrair o ano da data do evento
    const getEventYear = (dateStr) => {
      if (!dateStr) return null;
      const clean = String(dateStr).split(' • ')[0].trim();
      const match = clean.match(/\b(19\d{2}|20\d{2})\b/);
      return match ? parseInt(match[0], 10) : null;
    };

    const currentYear = new Date().getFullYear();

    // Filtra eventos pelo ano selecionado nos círculos de resumo
    const yearEvents = rawAgenda.filter(e => {
      const y = getEventYear(e.rawDate || e.date);
      return y ? y === selectedAgendaYear : (selectedAgendaYear === currentYear);
    });

    // Contadores analíticos do ano (Shows vs Ensaios vs Entradas)
    const yearShows = yearEvents.filter(s => {
      const t = (s.type || '').toLowerCase();
      return t !== 'ensaio' && t !== 'rehearsal';
    }).length;

    const yearRehearsals = yearEvents.filter(s => {
      const t = (s.type || '').toLowerCase();
      return t === 'ensaio' || t === 'rehearsal';
    }).length;

    const parseIncome = (val) => {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      const clean = String(val).replace(/[^\d.,-]/g, '');
      if (clean.includes(',') && clean.includes('.')) {
        if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
          return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
        } else {
          return parseFloat(clean.replace(/,/g, '')) || 0;
        }
      } else if (clean.includes(',')) {
        return parseFloat(clean.replace(',', '.')) || 0;
      }
      return parseFloat(clean) || 0;
    };

    const yearTotalIncome = yearEvents.reduce((acc, ev) => {
      const share = ev.myShareNum !== undefined ? ev.myShareNum : parseIncome(ev.cachê || ev.cache || ev.value || 0);
      return acc + share;
    }, 0);

    const formatCompactNumber = (num) => {
      const val = Number(num) || 0;
      if (Math.abs(val) < 1000) {
        if (val % 1 === 0) return String(val);
        return val.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
      }
      if (Math.abs(val) < 1000000) {
        const k = val / 1000;
        if (k % 1 === 0) {
          return `${k.toFixed(0)}k`;
        }
        return `${k.toFixed(1).replace('.0', '')}k`;
      }
      const m = val / 1000000;
      return `${m.toFixed(1).replace('.0', '')}M`;
    };

    const upcomingEvents = yearEvents
      .filter(e => !isMonthEnded(e.rawDate || e.date))
      .sort((a, b) => parseDateForSort(a.rawDate || a.date) - parseDateForSort(b.rawDate || b.date));

    const pastEvents = yearEvents
      .filter(e => isMonthEnded(e.rawDate || e.date))
      .sort((a, b) => parseDateForSort(b.rawDate || b.date) - parseDateForSort(a.rawDate || a.date));

    const pastMonthsMap = pastEvents.reduce((acc, event) => {
      const header = getMonthYearHeader(event.rawDate || event.date, language);
      if (!acc[header]) acc[header] = [];
      acc[header].push(event);
      return acc;
    }, {});

    const renderEventCard = (event) => {
      const badge = getFormattedDateBadge(event.rawDate || event.date, language);
      const eventTime = event.time || (event.date && event.date.includes(' • ') ? event.date.split(' • ')[1] : '');
      const eventTitle = event.name || event.title || event.local || 'Show';
      const eventLocal = event.local || '';
      const eventBand = event.band && event.band !== eventTitle ? event.band : '';
      const logoUri = !failedBandLogos[event.id] ? (event.logo || event.bandImageUri || event.bandImage || null) : null;

      return (
        <Pressable 
          key={`agenda_ev_${event.id || index}_${index}`} 
          onPress={() => {
            if (onOpenSetlist) {
              onOpenSetlist(event.setlistRef || event);
            }
          }}
          style={({ pressed }) => [
            styles.fullWidthCard, 
            { 
              backgroundColor: colors.cardBackground, 
              borderTopColor: colors.border, 
              borderBottomColor: colors.border,
              padding: 0, 
              overflow: 'hidden', 
              flexDirection: 'row',
              marginBottom: 8,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              opacity: pressed ? 0.75 : 1,
            }
          ]}
        >
          {/* Badge de Data com Dia e Mês reais */}
          <View style={{ width: 54, backgroundColor: colors.primary + '15', justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: colors.border, paddingVertical: 10 }}>
            <Text style={{ color: colors.primary, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' }}>{badge.month}</Text>
            <Text style={{ color: colors.primary, fontSize: 18, fontWeight: '900', lineHeight: 20 }}>{badge.day}</Text>
          </View>

          {/* Dados: Pílula de tipo, Nome do evento, localização e horário abaixo */}
          <View style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              {/* Linha 1: Pílula discreta de tipo (SHOW/ENSAIO) + Nome do Evento */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {(() => {
                  const evType = (event.type || '').toLowerCase();
                  const isRehearsal = evType === 'ensaio' || evType === 'rehearsal';
                  return (
                    <View style={{
                      backgroundColor: !isRehearsal ? '#ef444420' : '#3b82f620',
                      paddingHorizontal: 5,
                      paddingVertical: 1.5,
                      borderRadius: 5,
                      borderWidth: 0.5,
                      borderColor: !isRehearsal ? '#ef444445' : '#3b82f645'
                    }}>
                      <Text style={{
                        fontSize: 8.5,
                        fontWeight: '900',
                        color: !isRehearsal ? '#ef4444' : '#3b82f6',
                        textTransform: 'uppercase'
                      }}>
                        {!isRehearsal ? (t('show') || 'SHOW') : (t('rehearsal') || 'ENSAIO')}
                      </Text>
                    </View>
                  );
                })()}

                <Text style={{ color: colors.text, fontSize: 14, fontWeight: 'bold', flexShrink: 1 }}>
                  {eventTitle}
                </Text>
              </View>

              {/* Linha 2: Localização completa (sem truncar com ...), horário e pílula de cachê */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap', gap: 8 }}>
                {eventLocal ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Ionicons name="location-outline" size={12} color={colors.textMuted} style={{ marginTop: 0.5 }} />
                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                      {`${eventLocal} `}
                    </Text>
                  </View>
                ) : null}
                {eventTime ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Ionicons name="time-outline" size={12} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>{eventTime}</Text>
                  </View>
                ) : null}
                {(() => {
                  const eventCacheVal = event.myShareNum !== undefined 
                    ? event.myShareNum 
                    : parseIncome(event.cachê || event.cache || event.value || 0);
                  if (eventCacheVal > 0) {
                    return (
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 3,
                        backgroundColor: 'rgba(16, 185, 129, 0.12)',
                        paddingHorizontal: 6,
                        paddingVertical: 1.5,
                        borderRadius: 6,
                        borderWidth: 0.5,
                        borderColor: 'rgba(16, 185, 129, 0.35)'
                      }}>
                        <Ionicons name="cash-outline" size={11} color="#10b981" />
                        <Text style={{ color: '#10b981', fontSize: 11, fontWeight: '800' }}>
                          {`R$ ${eventCacheVal.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}
                        </Text>
                      </View>
                    );
                  }
                  return null;
                })()}
              </View>
            </View>

            {/* Logo da banda ou iniciais de fallback se não houver imagem ou se falhar o carregamento */}
            {logoUri ? (
              <Image 
                source={{ uri: logoUri }} 
                style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: colors.border }} 
                onError={() => setFailedBandLogos(prev => ({ ...prev, [event.id]: true }))}
              />
            ) : (
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary + '18', borderWidth: 1, borderColor: colors.primary + '35', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '900', color: colors.primary }}>
                  {getBandInitials(eventBand || eventTitle)}
                </Text>
              </View>
            )}
          </View>
        </Pressable>
      );
    };

    let lastUpcomingHeader = null;

    return (
      <View style={styles.tabContent}>
        {/* Botão compartilhar agenda */}
        <Pressable
          style={({ pressed }) => [
            styles.shareAgendaPillBtn,
            {
              backgroundColor: colors.primary + '18',
              borderColor: colors.primary,
              opacity: pressed ? 0.75 : 1
            }
          ]}
          onPress={openShareAgendaModal}
        >
          <Ionicons name='share-social' size={16} color={colors.primary} />
          <Text style={[styles.shareAgendaPillText, { color: colors.primary }]}>{t('shareAgenda') || 'Compartilhar Agenda'}</Text>
        </Pressable>

        {/* ── RESUMO DA AGENDA EM 5 CÍRCULOS (ANO, EVENTOS, SHOWS, ENSAIOS, ENTRADAS) ── */}
        <View style={[styles.bandAgendaSummary, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          {/* Círculo 1: Ano */}
          <View style={styles.agendaCircleCol}>
            <Pressable 
              onPress={() => setShowYearPickerModal(true)}
              style={({ pressed }) => [
                styles.agendaCircleWrapper,
                { opacity: pressed ? 0.75 : 1 }
              ]}
              hitSlop={6}
            >
              <View style={[styles.agendaCircleDisc, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '50' }]}>
                <Text style={[styles.agendaCircleText, { color: colors.primary, fontSize: 13 }]}>
                  {selectedAgendaYear}
                </Text>
              </View>
            </Pressable>
            <Text style={[styles.agendaCircleLabel, { color: colors.textMuted }]}>
              {t('agendaYear') || 'Ano'}
            </Text>
          </View>

          {/* Círculo 2: Total de Eventos */}
          <View style={styles.agendaCircleCol}>
            <View style={styles.agendaCircleWrapper}>
              <View style={[styles.agendaCircleDisc, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40', paddingLeft: 6 }]}>
                <Text style={[styles.agendaCircleText, { color: colors.text }]}>
                  {yearEvents.length}
                </Text>
              </View>
              <View style={[styles.agendaCircleOverlapIcon, { backgroundColor: colors.cardBackground, borderColor: colors.primary }]}>
                <Ionicons name="list-outline" size={11} color={colors.primary} />
              </View>
            </View>
            <Text style={[styles.agendaCircleLabel, { color: colors.textMuted }]}>
              {t('agendaEvents') || 'Eventos'}
            </Text>
          </View>

          {/* Círculo 3: Shows */}
          <View style={styles.agendaCircleCol}>
            <View style={styles.agendaCircleWrapper}>
              <View style={[styles.agendaCircleDisc, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40', paddingLeft: 6 }]}>
                <Text style={[styles.agendaCircleText, { color: colors.text }]}>
                  {yearShows}
                </Text>
              </View>
              <View style={[styles.agendaCircleOverlapIcon, { backgroundColor: colors.cardBackground, borderColor: colors.primary }]}>
                <Ionicons name="calendar-outline" size={11} color={colors.primary} />
              </View>
            </View>
            <Text style={[styles.agendaCircleLabel, { color: colors.textMuted }]}>
              {t('agendaShows') || 'Shows'}
            </Text>
          </View>

          {/* Círculo 4: Ensaios */}
          <View style={styles.agendaCircleCol}>
            <View style={styles.agendaCircleWrapper}>
              <View style={[styles.agendaCircleDisc, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40', paddingLeft: 6 }]}>
                <Text style={[styles.agendaCircleText, { color: colors.text }]}>
                  {yearRehearsals}
                </Text>
              </View>
              <View style={[styles.agendaCircleOverlapIcon, { backgroundColor: colors.cardBackground, borderColor: colors.primary }]}>
                <Ionicons name="headset-outline" size={11} color={colors.primary} />
              </View>
            </View>
            <Text style={[styles.agendaCircleLabel, { color: colors.textMuted }]}>
              {t('agendaRehearsals') || 'Ensaios'}
            </Text>
          </View>

          {/* Círculo 5: Entradas */}
          <View style={styles.agendaCircleCol}>
            <View style={styles.agendaCircleWrapper}>
              <View style={[styles.agendaCircleDisc, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.45)', paddingLeft: 6 }]}>
                <Text style={[styles.agendaCircleText, { color: '#34d399', fontSize: 11 }]}>
                  {formatCompactNumber(yearTotalIncome)}
                </Text>
              </View>
              <View style={[styles.agendaCircleOverlapIcon, { backgroundColor: '#132420', borderColor: '#10b981' }]}>
                <Ionicons name="cash-outline" size={11} color="#34d399" />
              </View>
            </View>
            <Text style={[styles.agendaCircleLabel, { color: '#34d399' }]}>
              {t('agendaIncome') || 'Entradas'}
            </Text>
          </View>
        </View>

        {yearEvents.length === 0 ? (
          <View style={[styles.fullWidthCard, { backgroundColor: colors.cardBackground, borderTopColor: colors.border, borderBottomColor: colors.border, alignItems: 'center', paddingVertical: 20 }]}>
            <Text style={{ color: colors.textMuted, fontSize: 13, fontStyle: 'italic' }}>
              {t('noEventsScheduledShort') || 'Nenhum evento agendado.'}
            </Text>
          </View>
        ) : (
          <>
            {/* PRÓXIMOS EVENTOS (ORGANIZADOS COM SEPARADORES POR MÊS) */}
            {upcomingEvents.length === 0 ? (
              <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                <Text style={{ color: colors.textMuted, fontSize: 12, fontStyle: 'italic' }}>
                  {t('noUpcomingEvents') || 'Nenhum evento próximo agendado.'}
                </Text>
              </View>
            ) : (
              upcomingEvents.map(event => {
                const header = getMonthYearHeader(event.rawDate || event.date, language);
                const showHeader = header !== lastUpcomingHeader;
                if (showHeader) lastUpcomingHeader = header;

                return (
                  <View key={`up_ev_${event.id || idx}_${idx}`}>
                    {showHeader && (() => {
                      const mEvents = upcomingEvents.filter(e => getMonthYearHeader(e.rawDate || e.date, language) === header);
                      const mShows = mEvents.filter(s => {
                        const t = (s.type || '').toLowerCase();
                        return t !== 'ensaio' && t !== 'rehearsal';
                      }).length;
                      const mRehearsals = mEvents.filter(s => {
                        const t = (s.type || '').toLowerCase();
                        return t === 'ensaio' || t === 'rehearsal';
                      }).length;
                      const mTotalIncome = mEvents.reduce((acc, ev) => {
                        const share = ev.myShareNum !== undefined ? ev.myShareNum : parseIncome(ev.cachê || ev.cache || ev.value || 0);
                        return acc + share;
                      }, 0);

                      return (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
                          <Text style={{ fontSize: 11, fontWeight: '900', color: colors.primary, letterSpacing: 0.8 }}>
                            {header}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 2 }}>
                            <Ionicons name="calendar-outline" size={12} color={colors.primary} />
                            <Text style={{ fontSize: 11, fontWeight: '900', color: colors.primary }}>{mShows}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 3 }}>
                            <Ionicons name="headset-outline" size={12} color={colors.primary} />
                            <Text style={{ fontSize: 11, fontWeight: '900', color: colors.primary }}>{mRehearsals}</Text>
                          </View>
                          {mTotalIncome > 0 && (
                            <View style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 3,
                              marginLeft: 3,
                              backgroundColor: 'rgba(16, 185, 129, 0.12)',
                              paddingHorizontal: 6,
                              paddingVertical: 1.5,
                              borderRadius: 6,
                              borderWidth: 0.5,
                              borderColor: 'rgba(16, 185, 129, 0.35)'
                            }}>
                              <Ionicons name="cash-outline" size={11} color="#10b981" />
                              <Text style={{ fontSize: 10.5, fontWeight: '900', color: '#10b981' }}>
                                {`R$ ${formatCompactNumber(mTotalIncome)}`}
                              </Text>
                            </View>
                          )}
                          <View style={{ flex: 1, minWidth: 15, height: 1, backgroundColor: colors.border, opacity: 0.5 }} />
                        </View>
                      );
                    })()}
                    {renderEventCard(event)}
                  </View>
                );
              })
            )}

            {/* EVENTOS ANTERIORES (MAIS VELHAS TODAS OCULTAS NOS SEPARADORES) */}
            {pastEvents.length > 0 && (
              <View style={{ marginTop: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <View style={{ backgroundColor: colors.primary + '15', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1, borderWidth: 1, borderColor: colors.primary + '30' }}>
                    <Text style={{ color: colors.primary, fontSize: 11, fontWeight: 'bold' }}>{pastEvents.length}</Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '900', color: colors.textMuted, letterSpacing: 0.6 }}>
                    {t('pastEvents') || 'EVENTOS ANTERIORES'}
                  </Text>
                </View>

                {Object.keys(pastMonthsMap).map(header => {
                  const monthEvents = pastMonthsMap[header];
                  const isExpanded = expandedPastMonths.includes(header);
                  const mShows = monthEvents.filter(s => {
                    const t = (s.type || '').toLowerCase();
                    return t !== 'ensaio' && t !== 'rehearsal';
                  }).length;
                  const mRehearsals = monthEvents.filter(s => {
                    const t = (s.type || '').toLowerCase();
                    return t === 'ensaio' || t === 'rehearsal';
                  }).length;
                  const mTotalIncome = monthEvents.reduce((acc, ev) => {
                    const share = ev.myShareNum !== undefined ? ev.myShareNum : parseIncome(ev.cachê || ev.cache || ev.value || 0);
                    return acc + share;
                  }, 0);

                  return (
                    <View key={header} style={{ marginBottom: 4 }}>
                      <Pressable
                        onPress={() => {
                          if (Platform.OS !== 'web') {
                            try { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); } catch (e) {}
                          }
                          setExpandedPastMonths(prev =>
                            prev.includes(header) ? prev.filter(h => h !== header) : [...prev, header]
                          );
                        }}
                        style={({ pressed }) => [
                          {
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginTop: 10,
                            marginBottom: 8,
                            gap: 8,
                            flexWrap: 'wrap',
                            opacity: pressed ? 0.75 : 1,
                          }
                        ]}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '900', color: colors.primary, letterSpacing: 0.8 }}>
                          {header}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 2 }}>
                          <Ionicons name="calendar-outline" size={12} color={colors.primary} />
                          <Text style={{ fontSize: 11, fontWeight: '900', color: colors.primary }}>{mShows}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 3 }}>
                          <Ionicons name="headset-outline" size={12} color={colors.primary} />
                          <Text style={{ fontSize: 11, fontWeight: '900', color: colors.primary }}>{mRehearsals}</Text>
                        </View>
                        {mTotalIncome > 0 && (
                          <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 3,
                            marginLeft: 3,
                            backgroundColor: 'rgba(16, 185, 129, 0.12)',
                            paddingHorizontal: 6,
                            paddingVertical: 1.5,
                            borderRadius: 6,
                            borderWidth: 0.5,
                            borderColor: 'rgba(16, 185, 129, 0.35)'
                          }}>
                            <Ionicons name="cash-outline" size={11} color="#10b981" />
                            <Text style={{ fontSize: 10.5, fontWeight: '900', color: '#10b981' }}>
                              {`R$ ${formatCompactNumber(mTotalIncome)}`}
                            </Text>
                          </View>
                        )}
                        <View style={{ flex: 1, minWidth: 15, height: 1, backgroundColor: colors.border, opacity: 0.5 }} />
                        <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={14} color={colors.primary} />
                      </Pressable>

                      {isExpanded && (
                        <View style={{ marginTop: 2 }}>
                          {monthEvents.map(event => renderEventCard(event))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}

        {/* Modal de seleção de Ano */}
        <YearPickerModal
          visible={showYearPickerModal}
          selectedYear={selectedAgendaYear}
          onSelectYear={(yr) => setSelectedAgendaYear(yr)}
          onClose={() => setShowYearPickerModal(false)}
        />
      </View>
    );
  };

  if (loading && !user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textMuted, marginTop: 14, fontSize: 14, fontWeight: '600' }}>
          {t('loadingProfile') || 'Carregando perfil...'}
        </Text>
      </View>
    );
  }

  if (loadError && !user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: (colors.danger || '#ef4444') + '18', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
          <Ionicons name="cloud-offline-outline" size={44} color={colors.danger || '#ef4444'} />
        </View>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 8 }}>
          {t('noServerConnectionTitle') || 'Sem Conexão com o Servidor'}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 28, paddingHorizontal: 16 }}>
          {loadError || 'Não foi possível conectar ao servidor de dados. Verifique se o servidor está ativo ou tente reconectar.'}
        </Text>

        <Pressable
          style={{ backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, width: '100%', justifyContent: 'center' }}
          onPress={loadUser}
        >
          <Ionicons name="reload" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: 'bold' }}>{t('tryAgain') || 'Tentar Novamente'}</Text>
        </Pressable>

        <Pressable
          style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', justifyContent: 'center' }}
          onPress={handleLogout}
        >
          <Ionicons name='power' size={18} color={colors.text} />
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{t('switchAccountOrLogout') || 'Trocar de Conta / Sair'}</Text>
        </Pressable>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const currentDisplayName = user?.displayName || user?.name || user?.username || 'Músico';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        {/* Barra superior de ações: Back to Network à esquerda e botões padronizados circulares à direita */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingTop: 4,
          paddingBottom: 10,
        }}>
          {onBack ? (
            <Pressable 
              onPress={handleBackToFeed}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              hitSlop={8}
            >
              <Ionicons name="arrow-back" size={20} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '700' }}>{t('backToNetwork') || 'Voltar para Rede'}</Text>
            </Pressable>
          ) : (
            <View />
          )}

          {/* Botões padronizados circulares: Editar Perfil, Ver Página Pública, Exit */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* Editar Perfil */}
            <Pressable
              onPress={openEditProfileModal}
              style={({ pressed }) => [{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
                justifyContent: 'center',
                alignItems: 'center',
                opacity: pressed ? 0.7 : 1
              }]}
              hitSlop={8}
              accessibilityLabel={t('editProfile') || 'Editar Perfil'}
            >
              <Ionicons name="pencil" size={16} color={colors.primary} />
            </Pressable>

            {/* Ver Página Pública */}
            <Pressable 
              onPress={handleOpenMyPublicPage}
              style={({ pressed }) => [{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
                justifyContent: 'center',
                alignItems: 'center',
                opacity: pressed ? 0.7 : 1
              }]}
              hitSlop={8}
              accessibilityLabel={t('viewPublicPage') || 'Ver Página Pública'}
            >
              <Ionicons name="globe-outline" size={17} color={colors.primary} />
            </Pressable>

            {/* Exit / Sair */}
            <Pressable 
              onPress={handleLogout}
              style={({ pressed }) => [{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: (colors.danger || '#ef4444') + '15',
                borderWidth: 1,
                borderColor: (colors.danger || '#ef4444') + '35',
                justifyContent: 'center',
                alignItems: 'center',
                opacity: pressed ? 0.7 : 1
              }]}
              hitSlop={8}
              accessibilityLabel={t('logout') || 'Sair'}
            >
              <Ionicons name='power' size={18} color={colors.danger || '#ef4444'} />
            </Pressable>
          </View>
        </View>
        <View style={styles.headerTop}>
          <Pressable onPress={pickProfileImage}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>{currentDisplayName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={[styles.cameraIcon, { backgroundColor: colors.primary, borderColor: colors.cardBackground }]}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </Pressable>
          <View style={[styles.userInfo, { flex: 1, justifyContent: 'center' }]}>
            {/* Linha 1: Nome */}
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {currentDisplayName}
            </Text>

            {/* Linha 2: username + verificado */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <Text style={[styles.uniqueId, { color: colors.textMuted }]}>
                @{String(user?.username || user?.name || 'musico').toLowerCase().replace(/\s+/g, '')}
              </Text>

              {user.isEmailConfirmed ? (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#10B98120',
                  borderColor: '#10B98160',
                  borderWidth: 1,
                  paddingHorizontal: 6,
                  paddingVertical: 1.5,
                  borderRadius: 10,
                  gap: 3
                }}>
                  <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#10B981' }}>
                    {t('emailVerifiedBadge') || 'Verificado'}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Linha 3: Idade + Cidade */}
            {(user.age != null || (user.city || user.state || user.country)) ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                {user.age != null && (
                  <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '600' }}>
                    {`${user.age} ${t('yearsOld') || 'anos'}`}
                  </Text>
                )}
                {user.age != null && (user.city || user.state || user.country) && (
                  <Text style={{ color: colors.textMuted, opacity: 0.4, fontSize: 12 }}>•</Text>
                )}
                {(user.city || user.state || user.country) ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Ionicons name="location-outline" size={13} color={colors.primary} />
                    <Text style={{ fontSize: 13, color: colors.textMuted }} numberOfLines={1}>
                      {[user.city, user.state].filter(Boolean).join(', ') || user.country}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>

        {/* ── ABAS DE OPÇÕES COM DEGRADÊ CINTILANTE ── */}
        <View style={styles.tabBar}>
          {[
            { id: 'bio', type: 'ion', icon: 'document-text', iconOutline: 'document-text-outline', label: t('bioTab') || 'Bio' },
            { id: 'skills', type: 'ion', icon: 'flash', iconOutline: 'flash-outline', label: t('skillsTab') || 'Habilidades' },
            { id: 'instruments', type: 'mci', icon: 'guitar-acoustic', label: t('instrumentsTab') || 'Instrumentos' },
            { id: 'projects', type: 'ion', icon: 'people', iconOutline: 'people-outline', label: t('projectsTab') || 'Projetos' },
            { id: 'agenda', type: 'ion', icon: 'calendar', iconOutline: 'calendar-outline', label: t('agendaTab') || 'Agenda' }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <Pressable 
                key={tab.id} 
                style={[styles.tabItem, isActive && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 }]} 
                onPress={() => handleTabChange(tab.id)}
                accessibilityLabel={tab.label}
              >
                {tab.type === 'mci' ? (
                  <MaterialCommunityIcons 
                    name={tab.icon} 
                    size={26} 
                    color={isActive ? colors.primary : colors.textMuted} 
                  />
                ) : (
                  <Ionicons 
                    name={isActive ? tab.icon : tab.iconOutline} 
                    size={24} 
                    color={isActive ? colors.primary : colors.textMuted} 
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ── CONTEÚDO DAS ABAS COM TRANSIÇÃO SUAVE E GESTO DE ARRASTAR ── */}
      <Animated.View
        {...panResponder.panHandlers}
        style={{ flex: 1, opacity: tabOpacity, transform: [{ translateX }] }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          scrollEnabled={scrollEnabled}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handlePullToRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {!isProfileComplete && (
            <View style={[styles.incompleteProfileBanner, { backgroundColor: colors.isDark ? 'rgba(234, 179, 8, 0.15)' : '#fef9c3', borderColor: colors.isDark ? 'rgba(234, 179, 8, 0.35)' : '#fde047' }]}>
              <Ionicons name="information-circle-outline" size={22} color={colors.isDark ? '#facc15' : '#ca8a04'} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.incompleteProfileBannerTitle, { color: colors.isDark ? '#facc15' : '#854d0e' }]}>
                  {t('incompleteProfileTitle') || 'Complete seu Perfil'}
                </Text>
                <Text style={[styles.incompleteProfileBannerText, { color: colors.isDark ? '#e2e8f0' : '#713f12' }]}>
                  {t('incompleteProfileMsg') || 'Adicione ao menos seus instrumentos ou localização para liberar seu acesso ao feed da Rede BandLink.'}
                </Text>
              </View>
            </View>
          )}
          {activeTab === 'bio' && renderBioTab()}
          {activeTab === 'skills' && renderSkillsTab()}
          {activeTab === 'instruments' && renderInstrumentsTab()}
          {activeTab === 'projects' && renderProjectsTab()}
          {activeTab === 'agenda' && renderAgendaTab()}
        </ScrollView>
      </Animated.View>

      {/* ── MODAL DE COMPARTILHAMENTO DE AGENDA DO MÚSICO ── */}
      <ShareAgendaModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        events={(user?.agenda || []).map(event => {
          const badge = getFormattedDateBadge(event.rawDate || event.date, language);
          const ts = parseDateForSort(event.rawDate || event.date);
          const d = ts ? new Date(ts) : null;
          const daysPt = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
          const daysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const daysEs = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
          const weekDay = d ? (language === 'en' ? daysEn[d.getDay()] : language === 'es' ? daysEs[d.getDay()] : daysPt[d.getDay()]) : '';
          return {
            id: event.id,
            name: event.name || event.title || event.local || 'Show',
            local: event.local || '',
            time: event.time || (event.date && event.date.includes(' • ') ? event.date.split(' • ')[1] : ''),
            date: event.formattedDate || event.date || '',
            day: badge.day,
            month: badge.month,
            weekDay: weekDay,
            band: event.band || '',
            logo: event.logo || null,
            _ts: ts
          };
        })}
        displayName={currentDisplayName}
        headerLogo={profileImage || (currentDisplayName ? `https://ui-avatars.com/api/?name=${encodeURIComponent(currentDisplayName)}&background=random` : null)}
        qrValue={'https://bandlink.pro/u/' + String(user?.username || 'user').toLowerCase().replace(/\s+/g, '')}
      />

      {/* ── 2. SKILL MODAL (BOTTOM SHEET) ── */}
      <Modal visible={showSkillModal} transparent animationType='slide' onRequestClose={() => setShowSkillModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowSkillModal(false)} />
          <View style={[styles.bottomSheetContent, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
            <View style={[styles.dragHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
            <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 16 }]}>
              {editingSkill ? 'Editar Habilidade Musical' : 'Habilidade Musical'}
            </Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9' }]}
              value={skillName}
              onChangeText={setSkillName}
              maxLength={100}
            />
            <Text style={{ color: colors.text, marginBottom: 8, marginTop: 16, fontWeight: 'bold' }}>{t('masteryLevel') || 'Nível de Domínio'}</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24, justifyContent: 'center' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <Pressable key={star} onPress={() => setSkillStars(star)} hitSlop={4}>
                  <Ionicons name={star <= skillStars ? 'star' : 'star-outline'} size={34} color={star <= skillStars ? colors.primary : colors.border} />
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable style={[styles.syncButton, { flex: 1, backgroundColor: isDark ? '#1e293b' : '#e5e7eb' }]} onPress={() => setShowSkillModal(false)}>
                <Text style={{ color: colors.text, fontWeight: 'bold' }}>{t('cancelBtn') || 'Cancelar'}</Text>
              </Pressable>
              <Pressable style={[styles.syncButton, { flex: 1, backgroundColor: colors.primary }]} onPress={handleSaveSkill}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{editingSkill ? (t('saveBtn') || 'Salvar') : (t('addBtn') || 'Adicionar')}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── 3. INFLUENCES MODAL (BOTTOM SHEET - SEM #, 0 A 5 ESTRELAS, ATÉ 5 ESTILOS) ── */}
      <Modal visible={showInfluenceModal} transparent animationType='slide' onRequestClose={() => setShowInfluenceModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowInfluenceModal(false)} />
          <View style={[styles.bottomSheetContent, { backgroundColor: colors.cardBackground, borderTopColor: colors.border, maxHeight: '90%' }]}>
            <View style={[styles.dragHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
            
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{t('influencesAndStylesTitle') || 'Influências e Estilos'}</Text>
                <View style={{ backgroundColor: colors.primary + '18', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '800' }}>
                    {(user.influences || []).length}/5
                  </Text>
                </View>
              </View>
              <Pressable onPress={() => setShowInfluenceModal(false)} hitSlop={10}>
                <Ionicons name='close' size={24} color={colors.text} />
              </Pressable>
            </View>

            {/* Campo para Adicionar Nova Influência (se menor que 5) */}
            {(user.influences || []).length < 5 ? (
              <View style={{ marginBottom: 14, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 8 }}>{t('addInfluenceLabel') || 'ADICIONAR INFLUÊNCIA'}</Text>
                <TextInput
                  style={[styles.input, { minHeight: 44, paddingVertical: 8, marginBottom: 8, color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9' }]}
                  value={newInfluenceName}
                  onChangeText={setNewInfluenceName}
                  maxLength={300}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>{t('weightLabel') || 'Peso:'}</Text>
                    {renderStars(newInfluenceStars, 22, true, setNewInfluenceStars)}
                    <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary }}>{newInfluenceStars}★</Text>
                  </View>
                  <Pressable 
                    onPress={handleAddInfluence}
                    style={{ backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{t('includeBtn') || 'Incluir'}</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={{ backgroundColor: colors.primary + '15', padding: 8, borderRadius: 8, marginBottom: 12, alignItems: 'center' }}>
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>{t('maxInfluencesReached') || 'Limite de 5 influências atingido.'}</Text>
              </View>
            )}

            {/* Lista de Influências cadastradas (limpa, sem subtexto de estrelas) */}
            <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
              {(!user.influences || user.influences.length === 0) ? (
                <Text style={{ color: colors.textMuted, fontStyle: 'italic', paddingVertical: 12, textAlign: 'center' }}>{t('noInfluencesRegistered') || 'Nenhuma influência cadastrada.'}</Text>
              ) : (
                user.influences.map((inf) => (
                  <View 
                    key={inf.id} 
                    style={{ 
                      flexDirection: 'row', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      paddingVertical: 10, 
                      paddingHorizontal: 12,
                      marginBottom: 6,
                      borderRadius: 10,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
                      borderWidth: 1,
                      borderColor: colors.border
                    }}
                  >
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>{inf.name}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      {renderStars(inf.stars, 20, true, (newStars) => handleUpdateInfluenceStars(inf.id, newStars))}
                      <Pressable onPress={() => handleRemoveInfluence(inf.id)} hitSlop={8} style={{ padding: 4 }}>
                        <Ionicons name="trash-outline" size={18} color={colors.danger || '#ef4444'} />
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <Pressable 
              style={[styles.syncButton, { backgroundColor: colors.primary, marginTop: 14 }]} 
              onPress={() => setShowInfluenceModal(false)}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('doneBtn') || 'Concluir'}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── 4. GEAR / EQUIPAMENTOS MODAL (CATEGORIA + MARCA/MODELO COM EXCLUSÃO SEGURA) ── */}
      <Modal visible={showGearModal} transparent animationType='slide' onRequestClose={() => setShowGearModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowGearModal(false)} />
          <View style={[styles.bottomSheetContent, { backgroundColor: colors.cardBackground, borderTopColor: colors.border, maxHeight: '90%' }]}>
            <View style={[styles.dragHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
            
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingGear ? (t('editGearTitle') || 'Editar Equipamento') : (t('addGearTitle') || 'Novo Equipamento')}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                {editingGear && (
                  <Pressable 
                    onPress={confirmDeleteGear} 
                    hitSlop={8}
                    accessibilityLabel="Excluir equipamento"
                  >
                    <Ionicons name="trash-outline" size={22} color={colors.danger || '#ef4444'} />
                  </Pressable>
                )}
                <Pressable onPress={() => setShowGearModal(false)} hitSlop={10}>
                  <Ionicons name='close' size={24} color={colors.text} />
                </Pressable>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* 1. CATEGORIA */}
              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 8 }}>{t('categoryLabel') || 'CATEGORIA'}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {STANDARD_CATEGORIES.map(cat => (
                  <Pressable
                    key={cat}
                    onPress={() => setGearCategory(cat)}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      borderWidth: 1.5,
                      borderColor: gearCategory === cat ? colors.primary : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'),
                      backgroundColor: gearCategory === cat ? colors.primary + '22' : 'transparent',
                    }}
                  >
                    <Text style={{
                      fontSize: 12,
                      fontWeight: gearCategory === cat ? '800' : '600',
                      color: gearCategory === cat ? colors.primary : colors.textMuted
                    }}>
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* SE CATEGORIA 'OUTROS' FOR MARCADA, DIGITAR A CATEGORIA PERSONALIZADA */}
              {gearCategory === 'Outros' && (
                <View style={{ marginBottom: 14, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '800', marginBottom: 6 }}>{t('whichCategoryLabel') || 'QUAL A CATEGORIA?'}</Text>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9', minHeight: 44, paddingVertical: 8 }]}
                    value={customCategory}
                    onChangeText={setCustomCategory}
                    maxLength={100}
                  />
                </View>
              )}

              {/* 2. MARCA / MODELO */}
              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>{t('brandModelLabel') || 'MARCA / MODELO *'}</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9', marginBottom: 14 }]}
                value={gearName}
                onChangeText={setGearName}
                maxLength={200}
              />

              {/* 3. OBSERVAÇÕES ADICIONAIS */}
              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>{t('additionalNotesLabel') || 'OBSERVAÇÕES ADICIONAIS (OPCIONAL)'}</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9', minHeight: 64, marginBottom: 16 }]}
                value={gearDetails}
                onChangeText={setGearDetails}
                multiline
                maxLength={1000}
              />

              {/* 4. MARCADOR DE NEGOCIÁVEL & VALOR */}
              <View style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                borderRadius: 10,
                padding: 12,
                marginBottom: 14
              }}>
                <Pressable
                  onPress={() => setGearIsNegotiable(!gearIsNegotiable)}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="pricetag-outline" size={18} color={gearIsNegotiable ? '#22c55e' : colors.textMuted} />
                    <Text style={{ fontWeight: '700', color: colors.text, fontSize: 14 }}>
                      {t('negotiable') || 'Negociável'}
                    </Text>
                  </View>
                  <Ionicons 
                    name={gearIsNegotiable ? "checkbox" : "square-outline"} 
                    size={22} 
                    color={gearIsNegotiable ? '#22c55e' : colors.textMuted} 
                  />
                </Pressable>

                {gearIsNegotiable && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '700', marginBottom: 6 }}>
                      {t('intendedPrice') || 'VALOR PRETENDIDO ($)'}
                    </Text>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9',
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      height: 42
                    }}>
                      <Text style={{ fontWeight: '900', color: '#22c55e', fontSize: 14, marginRight: 6 }}>$</Text>
                      <TextInput
                        style={{ flex: 1, color: colors.text, fontWeight: '700', fontSize: 14 }}
                        placeholder="0,00"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        value={gearPrice}
                        onChangeText={setGearPrice}
                        maxLength={12}
                      />
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Botão de Excluir dentro do Modal de Edição */}
            {editingGear && (
              <Pressable 
                style={[
                  styles.syncButton, 
                  { 
                    backgroundColor: (colors.danger || '#ef4444') + '15', 
                    borderWidth: 1, 
                    borderColor: (colors.danger || '#ef4444') + '40',
                    marginBottom: 12,
                    marginTop: 4
                  }
                ]} 
                onPress={confirmDeleteGear}
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger || '#ef4444'} />
                <Text style={{ color: colors.danger || '#ef4444', fontWeight: 'bold' }}>{t('deleteGearBtn') || 'Excluir Equipamento'}</Text>
              </Pressable>
            )}

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
              <Pressable style={[styles.syncButton, { flex: 1, backgroundColor: isDark ? '#1e293b' : '#e5e7eb' }]} onPress={() => setShowGearModal(false)}>
                <Text style={{ color: colors.text, fontWeight: 'bold' }}>{t('cancelBtn') || 'Cancelar'}</Text>
              </Pressable>
              <Pressable style={[styles.syncButton, { flex: 1, backgroundColor: colors.primary }]} onPress={handleSaveGear}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{editingGear ? (t('saveBtn') || 'Salvar') : (t('addBtn') || 'Adicionar')}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── UNIFIED EDIT PROFILE MODAL (STANDARDIZED WITH WEB VERSION) ── */}
      <Modal visible={showEditProfileModal} transparent animationType='slide' onRequestClose={() => setShowEditProfileModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowEditProfileModal(false)} />
          <View style={[styles.bottomSheetContent, { backgroundColor: colors.cardBackground, borderTopColor: colors.border, maxHeight: '88%' }]}>
            <View style={[styles.dragHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
            
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Ionicons name="person-circle-outline" size={24} color={colors.primary} />
              <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 0 }]}>{t('editProfile') || 'Editar Perfil & Foto'}</Text>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              
              {/* 1. FOTO DE PERFIL COM PREVIEW CIRCULAR & BOTÃO DE UPLOAD */}
              <View style={{ marginBottom: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                <Text style={[styles.inputSubLabel, { color: colors.textMuted, marginBottom: 8 }]}>{t('profilePhoto') || 'FOTO DE PERFIL'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: isDark ? '#121824' : '#e2e8f0',
                    borderWidth: 2,
                    borderColor: colors.primary,
                    overflow: 'hidden',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {(editProfilePictureUrl || profileImage) ? (
                      <Image source={{ uri: editProfilePictureUrl || profileImage }} style={{ width: '100%', height: '100%' }} />
                    ) : (
                      <Text style={{ fontSize: 22, fontWeight: '900', color: colors.primary }}>
                        {(editProfileName || user?.username || 'M')[0].toUpperCase()}
                      </Text>
                    )}
                  </View>

                  <View style={{ flex: 1, gap: 6 }}>
                    <Pressable 
                      onPress={pickProfileImage}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        backgroundColor: colors.primary + '18',
                        borderWidth: 1,
                        borderColor: colors.primary + '40',
                        borderRadius: 8,
                        paddingVertical: 8,
                        paddingHorizontal: 12
                      }}
                    >
                      <Ionicons name="cloud-upload-outline" size={16} color={colors.primary} />
                      <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
                        {t('uploadPhoto') || 'Carregar Foto'}
                      </Text>
                    </Pressable>

                    {(editProfilePictureUrl || profileImage) ? (
                      <Pressable 
                        onPress={() => {
                          setEditProfilePictureUrl('');
                          setProfileImage(null);
                        }}
                        style={{ alignSelf: 'center', paddingVertical: 2 }}
                      >
                        <Text style={{ color: '#ef4444', fontSize: 11, fontWeight: '700' }}>
                          {t('removePhoto') || 'Remover Foto'}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>

                {/* URL da Foto (Opcional) */}
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9', marginTop: 10, height: 38, fontSize: 12 }]}
                  value={editProfilePictureUrl}
                  onChangeText={setEditProfilePictureUrl}
                  placeholder={t('photoUrlPlaceholder') || 'Ou informe a URL da foto...'}
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* 2. USERNAME COM VERIFICAÇÃO LIVE (@) */}
              <View style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={[styles.inputSubLabel, { color: colors.textMuted, marginBottom: 0 }]}>USERNAME (@)</Text>
                  {usernameStatus === 'checking' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>{t('checkingUsername') || 'Verificando...'}</Text>
                    </View>
                  )}
                  {usernameStatus === 'available' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                      <Text style={{ fontSize: 11, color: '#22c55e', fontWeight: '700' }}>{usernameMessage || 'Disponível'}</Text>
                    </View>
                  )}
                  {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="alert-circle" size={14} color="#ef4444" />
                      <Text style={{ fontSize: 11, color: '#ef4444', fontWeight: '700' }}>{usernameMessage}</Text>
                    </View>
                  )}
                </View>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9',
                  borderWidth: 1,
                  borderColor: (usernameStatus === 'taken' || usernameStatus === 'invalid') ? '#ef4444' : (usernameStatus === 'available' ? '#22c55e' : colors.border),
                  borderRadius: 8,
                  paddingHorizontal: 10
                }}>
                  <Text style={{ color: colors.textMuted, fontWeight: '800', fontSize: 14, marginRight: 2 }}>@</Text>
                  <TextInput
                    style={{ flex: 1, height: 42, color: colors.text, fontWeight: '700', fontSize: 14 }}
                    value={editProfileUsername}
                    onChangeText={handleUsernameChange}
                    placeholder="allison_rps"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={30}
                  />
                </View>
              </View>

              {/* 3. NOME DE EXIBIÇÃO */}
              <View style={{ marginBottom: 14 }}>
                <Text style={[styles.inputSubLabel, { color: colors.textMuted }]}>{t('displayName') || 'NOME DE EXIBIÇÃO (NOME COMPLETO / ARTÍSTICO) *'}</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9' }]}
                  value={editProfileName}
                  onChangeText={setEditProfileName}
                  placeholder={t('displayNamePlaceholder') || 'e.g. Allison Rodrigues'}
                  placeholderTextColor={colors.textMuted}
                  maxLength={100}
                />
              </View>

              {/* 4. DATA DE NASCIMENTO */}
              <View style={{ marginBottom: 14 }}>
                <Text style={[styles.inputSubLabel, { color: colors.textMuted }]}>{t('birthDate') || 'DATA DE NASCIMENTO'}</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9' }]}
                  value={editProfileBirthDate}
                  onChangeText={(val) => setEditProfileBirthDate(formatBirthDateInput(val))}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={10}
                />
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
                  Sua idade será calculada automaticamente e exibida no cabeçalho do perfil.
                </Text>
              </View>

              {/* 5. LOCALIZAÇÃO */}
              <View style={{ marginBottom: 14 }}>
                <Text style={[styles.inputSubLabel, { color: colors.textMuted }]}>{t('locationLabel') || 'LOCALIZAÇÃO'}</Text>
                
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                  <View style={{ flex: 1.5 }}>
                    <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '700', marginBottom: 2 }}>CIDADE</Text>
                    <TextInput
                      style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9', height: 40 }]}
                      value={editProfileCity}
                      onChangeText={setEditProfileCity}
                      placeholder="e.g. Curitiba"
                      placeholderTextColor={colors.textMuted}
                      maxLength={100}
                    />
                  </View>
                  <View style={{ flex: 0.8 }}>
                    <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '700', marginBottom: 2 }}>ESTADO (UF)</Text>
                    <TextInput
                      style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9', height: 40 }]}
                      value={editProfileState}
                      onChangeText={setEditProfileState}
                      placeholder="e.g. PR"
                      placeholderTextColor={colors.textMuted}
                      maxLength={50}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '700', marginBottom: 2 }}>PAÍS</Text>
                    <TextInput
                      style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9', height: 40 }]}
                      value={editProfileCountry}
                      onChangeText={setEditProfileCountry}
                      placeholder="e.g. Brasil"
                      placeholderTextColor={colors.textMuted}
                      maxLength={50}
                    />
                  </View>
                </View>

                {/* Nota de rodapé idêntica à Web */}
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, lineHeight: 16 }}>
                  {t('otherSectionsNote') || 'Demais seções (Bio, Habilidades, Influências e Redes) são editadas diretamente nos botões verdes do perfil.'}
                </Text>
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <Pressable style={[styles.syncButton, { flex: 1, backgroundColor: isDark ? '#1e293b' : '#e5e7eb' }]} onPress={() => setShowEditProfileModal(false)}>
                <Text style={{ color: colors.text, fontWeight: 'bold' }}>{t('cancelBtn') || 'Cancelar'}</Text>
              </Pressable>
              <Pressable style={[styles.syncButton, { flex: 1, backgroundColor: colors.primary }]} onPress={handleSaveUserProfile}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('saveBtn') || 'Salvar Perfil'}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL PARA ADICIONAR HABILIDADE EXTRA ── */}
      <Modal visible={showExtraSkillModal} transparent animationType='slide' onRequestClose={() => setShowExtraSkillModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowExtraSkillModal(false)} />
          <View style={[styles.bottomSheetContent, { backgroundColor: colors.cardBackground, borderTopColor: colors.border, maxHeight: '85%' }]}>
            <View style={[styles.dragHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
            
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Ionicons name="sparkles" size={20} color="#fbbf24" />
              <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 0 }]}>
                {t('addExtraSkill') || 'Habilidade Extra / Produção'}
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Opções Sugeridas */}
              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 8 }}>
                {t('selectSuggestedOption') || 'SELECIONE UMA OPÇÃO SUGERIDA:'}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {PRESET_EXTRA_SKILLS.map(presetObj => {
                  const isAdded = extraSkills.some(s => {
                    const sName = (s.name || s || '').toLowerCase();
                    return sName === presetObj.key.toLowerCase() || 
                           (presetObj.transKey && t(presetObj.transKey)?.toLowerCase() === sName);
                  });
                  const label = t(presetObj.transKey) || presetObj.key;
                  return (
                    <Pressable
                      key={presetObj.key}
                      disabled={isAdded}
                      onPress={() => handleAddExtraSkill(presetObj.key)}
                      style={({ pressed }) => [{
                        paddingVertical: 7,
                        paddingHorizontal: 12,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: isAdded ? colors.border : 'rgba(251, 191, 36, 0.4)',
                        backgroundColor: isAdded ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)') : 'rgba(251, 191, 36, 0.12)',
                        opacity: isAdded ? 0.4 : (pressed ? 0.8 : 1)
                      }]}
                    >
                      <Text style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: isAdded ? colors.textMuted : (isDark ? '#fef3c7' : '#92400e')
                      }}>
                        {isAdded ? '✓ ' : '+ '}{label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Opção personalizada */}
              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 8 }}>
                {t('orTypeCustomSkill') || 'OU DIGITE UMA OPÇÃO PERSONALIZADA:'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                <TextInput
                  style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9' }]}
                  value={customExtraSkill}
                  onChangeText={setCustomExtraSkill}
                  placeholder={t('customSkillPlaceholder') || 'Ex: Direção de Palco, Gravação, Mixagem...'}
                  placeholderTextColor={colors.textMuted}
                  maxLength={100}
                />
                <Pressable
                  onPress={() => handleAddExtraSkill(customExtraSkill)}
                  style={({ pressed }) => [{
                    backgroundColor: '#f59e0b',
                    borderRadius: 8,
                    paddingHorizontal: 16,
                    justifyContent: 'center',
                    alignItems: 'center',
                    opacity: pressed ? 0.8 : 1
                  }]}
                  hitSlop={6}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>{t('addBtn') || 'Adicionar'}</Text>
                </Pressable>
              </View>

              {/* Habilidades cadastradas no perfil */}
              {extraSkills.length > 0 && (
                <View style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                  <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 8 }}>
                    {t('registeredExtraSkills') || 'HABILIDADES CADASTRADAS NO SEU PERFIL:'}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {extraSkills.map((es, idx) => (
                      <View 
                        key={es.id || idx}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          paddingLeft: 10,
                          paddingRight: 6,
                          paddingVertical: 6,
                          borderRadius: 14,
                          backgroundColor: isDark ? 'rgba(251, 191, 36, 0.12)' : 'rgba(251, 191, 36, 0.15)',
                          borderWidth: 1,
                          borderColor: 'rgba(251, 191, 36, 0.35)',
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#fef3c7' : '#92400e' }}>
                          {getExtraSkillDisplay(es)}
                        </Text>
                        <Pressable onPress={() => handleRemoveExtraSkill(es.id || es)} hitSlop={6}>
                          <Ionicons name="close-circle" size={16} color={isDark ? '#fbbf24' : '#b45309'} />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={{ marginTop: 16 }}>
              <Pressable style={[styles.syncButton, { backgroundColor: colors.primary }]} onPress={() => setShowExtraSkillModal(false)}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('done') || 'Concluir'}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL DE VISUALIZAÇÃO DA PÁGINA PÚBLICA ── */}
      <MusicianProfileModal
        visible={showPublicPage}
        musician={myPublicProfile}
        onClose={() => {
          setShowPublicPage(false);
          setMyPublicProfile(null);
        }}
        onOpenBandProfile={onOpenBandProfile}
        onOpenSetlist={onOpenSetlist}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    borderBottomWidth: 1, 
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) + 10 : 44 
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16 },
  
  // Avatar aumentado e marcante
  avatar: { width: 86, height: 86, borderRadius: 43, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 38, fontWeight: 'bold', color: '#fff' },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2.5 },
  
  userInfo: { flex: 1, marginLeft: 16 },
  name: { fontSize: 21, fontWeight: 'bold' },
  uniqueId: { fontSize: 14, marginTop: 3 },
  logoutIcon: { padding: 8 },
  
  // Abas de opções com ícones
  tabBar: { flexDirection: 'row', paddingHorizontal: 8 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  
  scrollContent: { padding: 16, paddingBottom: 40 },
  tabContent: { flex: 1 },
  
  // Clean Bio Tab Styles (com faixas simétricas com o cabeçalho)
  tabContentClean: { flex: 1 },
  sectionBannerContainer: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6
  },
  cleanActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 6 },
  cleanActionText: { fontSize: 12, fontWeight: '700' },
  cleanBodyText: { fontSize: 14, lineHeight: 22 },
  cleanLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  cleanLinkText: { fontSize: 14, flex: 1 },
  influenceRowClean: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  influenceNameClean: { fontSize: 14, fontWeight: '600' },

  // General Card Styles (for Skills, Projects, Agenda)
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, marginLeft: 2 },
  card: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 12 },
  skillRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skillName: { fontSize: 16, fontWeight: '600' },
  skillSelectCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primarySkillTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  primarySkillTagText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  projectName: { fontSize: 18, fontWeight: 'bold' },
  syncButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 8 },
  syncButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  shareButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8, marginBottom: 16 },
  shareButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  syncRoundIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  shareAgendaPillBtn: {
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
  shareAgendaPillText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // Resumo da Agenda em 5 Círculos (Ano, Eventos, Shows, Ensaios, Entradas)
  bandAgendaSummary: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  agendaCircleCol: {
    alignItems: 'center',
    flex: 1,
  },
  agendaCircleWrapper: {
    position: 'relative',
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agendaCircleDisc: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agendaCircleOverlapIcon: {
    position: 'absolute',
    left: -2,
    top: '50%',
    marginTop: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  agendaCircleText: {
    fontSize: 14,
    fontWeight: '900',
  },
  agendaCircleLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    marginTop: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    textAlign: 'center',
  },

  // Full-width Card (Symmetric with header - used for Skills, Gear, Projects, Agenda)
  fullWidthCard: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderRadius: 0,
    marginBottom: 8,
  },
  gearCardFullWidth: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderRadius: 0,
    marginBottom: 8,
  },

  // Bottom Sheet Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  bottomSheetContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 36, borderWidth: 1, borderBottomWidth: 0, maxHeight: '88%' },
  dragHandle: { width: 44, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  layoutOption: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8, gap: 12 },
  layoutName: { fontSize: 15, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, minHeight: 48, textAlignVertical: 'top' },
  inputSubLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
  pickerButton: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerButtonText: { fontSize: 14 },
  pickerOptionRow: { paddingVertical: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth },
  incompleteProfileBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  incompleteProfileBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  incompleteProfileBannerText: {
    fontSize: 12,
    lineHeight: 17,
  },
});
