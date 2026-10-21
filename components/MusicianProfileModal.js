import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  Image,
  StyleSheet,
  StatusBar,
  Platform,
  Linking,
  Share,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  LayoutAnimation,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';
import { bandService } from '../services/bandService';
import { musiciansService } from '../services/musiciansService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const getBandInitials = (name) => {
  if (!name) return 'BD';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const parseDateForSort = (dateStr) => {
  if (!dateStr) return 0;
  const clean = String(dateStr).split(' • ')[0].trim();
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
  const clean = String(dateStr).split(' • ')[0].trim();
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

const getFormattedDateBadge = (dateStr, lang = 'pt') => {
  if (!dateStr || !String(dateStr).trim()) return { day: '--', month: '---' };
  const clean = String(dateStr).split(' • ')[0].trim();
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
  if (!dateStr || !String(dateStr).trim()) return lang === 'en' ? 'OTHER' : lang === 'es' ? 'OTROS' : 'OUTROS';
  const clean = String(dateStr).split(' • ')[0].trim();
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

export default function MusicianProfileModal({ visible, musician: propMusician, onClose, onInvite, onOpenBandProfile }) {
  const { colors } = useTheme();
  const isDark = colors.isDark;
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

  const [tabScrollEnabled, setTabScrollEnabled] = useState(true);

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
        setTabScrollEnabled(false);
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
        setTabScrollEnabled(true);
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
        setTabScrollEnabled(true);
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
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [myBands, setMyBands] = useState([]);
  const [selectedBandId, setSelectedBandId] = useState(null);
  const [inviteMessage, setInviteMessage] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [expandedPastMonths, setExpandedPastMonths] = useState([]);
  const [freshMusician, setFreshMusician] = useState(propMusician);

  useEffect(() => {
    setFreshMusician(propMusician);
    if (visible && propMusician) {
      setActiveTab('bio');
      loadMyBands();

      // Atualiza o perfil em tempo real diretamente da Cloud API
      const uName = propMusician.username || propMusician.name;
      if (uName) {
        musiciansService.getMusicianByUsername(uName, propMusician.name).then(fresh => {
          if (fresh) {
            setFreshMusician(prev => ({ ...(prev || {}), ...fresh }));
          }
        }).catch(() => {});
      }
    }
  }, [visible, propMusician]);

  const loadMyBands = async () => {
    try {
      const bands = await bandService.getAll();
      setMyBands(bands || []);
      if (bands && bands.length > 0) {
        setSelectedBandId(bands[0].id);
      }
    } catch (e) {
      console.log('Erro ao carregar bandas para convite:', e);
    }
  };

  const musician = freshMusician || propMusician;
  if (!musician) return null;
  const activeMusician = musician;

  // ── Normalização idêntica ao ProfileScreen ──
  const currentDisplayName = activeMusician.displayName || activeMusician.name || activeMusician.username || 'Músico';
  const cleanUsername = String(activeMusician.username || activeMusician.name || 'musico').toLowerCase().replace(/^@+/, '');
  const profileImage = activeMusician.imageUri || activeMusician.profileImage || activeMusician.pictureUrl || null;

  // Nível de interesse
  const interestLevel = Array.isArray(activeMusician.interestLevel)
    ? activeMusician.interestLevel
    : (typeof activeMusician.interestLevel === 'string' && activeMusician.interestLevel.startsWith('[')
        ? JSON.parse(activeMusician.interestLevel)
        : (activeMusician.interestLevel ? [activeMusician.interestLevel] : ['Profissional']));

  // Disponibilidade
  const availability = activeMusician.availability || 'Disponível';

  // Bio
  const bio = activeMusician.bio || 'Músico ativo na cena musical e na comunidade Setlist.';

  // Influências (com estrelas)
  let rawInfluences = [];
  if (Array.isArray(activeMusician.influences)) {
    rawInfluences = activeMusician.influences;
  } else if (typeof activeMusician.influences === 'string' && activeMusician.influences.trim()) {
    try {
      const parsedInf = JSON.parse(activeMusician.influences);
      rawInfluences = Array.isArray(parsedInf) ? parsedInf : [parsedInf];
    } catch {
      rawInfluences = activeMusician.influences.split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  const influences = rawInfluences.map((inf, idx) => {
    if (typeof inf === 'string') {
      const cleanName = inf.replace(/[{}\"]/g, '').replace(/^name:\s*/, '').replace(/^#+/, '').trim();
      return { id: String(idx + 1), name: cleanName, stars: idx === 0 ? 5 : (5 - Math.min(2, idx)) };
    }
    const cleanName = String(inf?.name || inf?.tag || '').replace(/[{}\"]/g, '').replace(/^name:\s*/, '').replace(/^#+/, '').trim();
    return {
      id: String(inf?.id || idx + 1),
      name: cleanName,
      stars: typeof inf?.stars === 'number' ? inf.stars : 5
    };
  }).filter(inf => Boolean(inf.name));

  // Habilidades (com indicação de principal e estrelas)
  const rawSkills = Array.isArray(musician.skills) && musician.skills.length > 0
    ? musician.skills
    : (Array.isArray(musician.primaryInstruments) && musician.primaryInstruments.length > 0
        ? musician.primaryInstruments.map((pi, idx) => ({
            id: String(idx + 1),
            instrument: typeof pi === 'string' ? pi : (pi.instrument || pi.name || 'Instrumento'),
            stars: typeof pi === 'object' && pi.stars ? pi.stars : (musician.stars || 5),
            isPrimary: typeof pi === 'object' && pi.isPrimary !== undefined ? pi.isPrimary : (idx < 2)
          }))
        : (musician.primaryInstrument ? [{ id: '1', instrument: musician.primaryInstrument, stars: musician.stars || 5, isPrimary: true }] : [])
      );

  const skills = rawSkills.map((s, idx) => ({
    id: String(s.id || idx + 1),
    instrument: s.instrument || s.name || 'Instrumento',
    stars: typeof s.stars === 'number' ? s.stars : 5,
    isPrimary: s.isPrimary !== undefined ? s.isPrimary : (idx < 2)
  }));

  // Equipamentos (Gear)
  const gear = Array.isArray(musician.gear) && musician.gear.length > 0
    ? musician.gear.map((g, idx) => ({
        id: String(g.id || idx + 1),
        category: g.category || 'Equipamento',
        name: g.name || 'Setup Principal',
        details: g.details || '',
        isPrimary: g.isPrimary !== undefined ? g.isPrimary : (idx === 0),
        isNegotiable: !!g.isNegotiable,
        price: g.price || ''
      }))
    : [];

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
    const preset = PRESET_EXTRA_SKILLS.find(p => p.key.toLowerCase() === name.toLowerCase());
    if (preset) {
      return t(preset.transKey) || preset.key;
    }
    return name;
  };

  // Habilidades Extras
  let extraSkills = [];
  try {
    let raw = activeMusician.extraSkills || activeMusician.extraSkillsJson;
    if (typeof raw === 'string') {
      raw = JSON.parse(raw);
    }
    if (Array.isArray(raw)) extraSkills = raw;
  } catch (e) {
    extraSkills = [];
  }

  // Bandas e Projetos
  const rawProjects = (() => {
    const rawList = (Array.isArray(musician.projects) && musician.projects.length > 0)
      ? musician.projects
      : (Array.isArray(musician.bands) && musician.bands.length > 0)
        ? musician.bands
        : [];

    if (rawList.length === 0) {
      return [];
    }

    // Deduplicar projetos/bandas por nome para nunca exibir bandas repetidas
    const candidateList = [];
    const seenNames = new Set();
    for (const item of rawList) {
      if (!item) continue;
      const pName = (item.name || item.bandName || '').trim().toLowerCase();
      if (!pName || seenNames.has(pName)) continue;
      seenNames.add(pName);
      candidateList.push(item);
    }

    return candidateList.map((b, idx) => {
      let parsedGenres = [];
      if (b.genres) {
        try {
          parsedGenres = typeof b.genres === 'string' && b.genres.startsWith('[')
            ? JSON.parse(b.genres)
            : (Array.isArray(b.genres) ? b.genres : String(b.genres).split(',').map(s => s.trim()).filter(Boolean));
        } catch (e) {
          parsedGenres = Array.isArray(b.genres) ? b.genres : String(b.genres).split(',').map(s => s.trim()).filter(Boolean);
        }
      }
      if (parsedGenres.length === 0) {
        parsedGenres = (influences.length > 0 ? influences.slice(0, 3).map(i => i.name || i) : ['Rock', 'Pop']);
      }

      let startYear = '2022';
      const rawSince = String(b.since || b.period || b.startDate || '').trim();
      if (rawSince) {
        if (rawSince.includes('/')) {
          startYear = rawSince.split('/').pop().trim();
        } else if (rawSince.includes('-') && /^\d{4}/.test(rawSince)) {
          startYear = rawSince.split('-')[0].trim();
        } else {
          const match = rawSince.match(/\b(19\d{2}|20\d{2})\b/);
          startYear = match ? match[0] : (rawSince.length === 4 ? rawSince : '2022');
        }
      }

      // Procura banda correspondente nas bandas locais para resgatar logo ou localização se estiverem vazios
      let resolvedImage = b.imageUri || b.logo || null;
      let resolvedCity = b.city || '';
      let resolvedState = b.state || '';
      let resolvedCountry = b.country || '';
      if (Array.isArray(myBands) && myBands.length > 0) {
        const bName = (b.name || b.bandName || '').trim().toLowerCase();
        const matchBand = myBands.find(mb =>
          (mb.id && b.id && String(mb.id) === String(b.id)) ||
          (mb.name && bName && mb.name.trim().toLowerCase() === bName)
        );
        if (matchBand) {
          if (!resolvedImage) resolvedImage = matchBand.imageUri;
          if (!resolvedCity) resolvedCity = matchBand.city || '';
          if (!resolvedState) resolvedState = matchBand.state || '';
          if (!resolvedCountry) resolvedCountry = matchBand.country || '';
          if (parsedGenres.length === 0 && matchBand.genres) {
            try {
              parsedGenres = typeof matchBand.genres === 'string' ? JSON.parse(matchBand.genres) : matchBand.genres;
            } catch (e) {}
          }
        }
      }

      return {
        ...b,
        id: String(b.id || idx + 1),
        name: b.name || b.bandName || 'Projeto Musical',
        bandName: b.name || b.bandName || 'Projeto Musical',
        imageUri: resolvedImage,
        logo: resolvedImage,
        role: b.role || skills[0]?.instrument || 'Músico',
        since: startYear,
        memberType: b.memberType || 'Membro / Integrante',
        city: resolvedCity || musician.city || '',
        state: resolvedState || musician.state || '',
        country: resolvedCountry || musician.country || '',
        genres: parsedGenres
      };
    });
  })();

  // Agenda (mostra os próximos shows do músico / bandas do músico)
  const agenda = (() => {
    let directAgenda = (Array.isArray(musician.agenda) && musician.agenda.length > 0)
      ? [...musician.agenda]
      : (Array.isArray(musician.schedule) && musician.schedule.length > 0)
        ? [...musician.schedule]
        : (Array.isArray(musician.shows) && musician.shows.length > 0)
          ? [...musician.shows]
          : [];

    // Se directAgenda estiver vazia, tentar extrair dos projetos/bandas do músico
    if (directAgenda.length === 0 && Array.isArray(rawProjects) && rawProjects.length > 0) {
      for (const p of rawProjects) {
        const pShows = Array.isArray(p.agenda) ? p.agenda : (Array.isArray(p.setlists) ? p.setlists : []);
        for (const show of pShows) {
          if (!show) continue;
          let formattedDate = show.date || 'A definir';
          if (show.time) formattedDate += ` • ${show.time}`;
          directAgenda.push({
            id: String(show.id || `${p.id}-${directAgenda.length}`),
            bandId: p.id,
            band: p.name,
            bandName: p.name,
            name: show.name || show.title || 'Show',
            title: show.name || show.title || 'Show',
            date: formattedDate,
            rawDate: show.date || '',
            time: show.time || '',
            local: show.local || show.venue || show.location || 'Local a definir',
            city: p.city || '',
            logo: p.imageUri || p.logo || null,
            status: (show.cacheStatus || 'paid') === 'paid' ? 'Confirmed' : 'Pending',
            bandObj: p
          });
        }
      }
    }

    // Deduplicar agenda por nome + data + local
    const seenEventKeys = new Set();
    return directAgenda.filter(ev => {
      if (!ev) return false;
      const evKey = `${(ev.name || ev.title || '').trim().toLowerCase()}|${(ev.rawDate || ev.date || '').trim()}|${(ev.local || '').trim().toLowerCase()}`;
      if (seenEventKeys.has(evKey)) return false;
      seenEventKeys.add(evKey);
      return true;
    });
  })();

  const handleOpenLink = async (url) => {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert(t('notice') || 'Aviso', (t('couldNotOpenLinkMsg') || 'Não foi possível abrir o link: ') + url);
    }
  };

  const handleOpenInstagram = () => {
    if (!musician.instagram) return;
    const user = musician.instagram.replace(/^@+/, '').trim();
    if (user.startsWith('http://') || user.startsWith('https://')) {
      handleOpenLink(user);
    } else {
      handleOpenLink(`https://instagram.com/${user}`);
    }
  };

  const handleOpenYouTube = () => {
    if (!musician.youtube) return;
    const yt = musician.youtube.trim();
    if (yt.startsWith('http://') || yt.startsWith('https://')) {
      handleOpenLink(yt);
    } else {
      handleOpenLink(`https://youtube.com/@${yt.replace(/^@+/, '')}`);
    }
  };

  const handleOpenTwitter = () => {
    if (!musician.twitter) return;
    const tw = musician.twitter.replace(/^@+/, '').trim();
    if (tw.startsWith('http://') || tw.startsWith('https://')) {
      handleOpenLink(tw);
    } else {
      handleOpenLink(`https://x.com/${tw}`);
    }
  };

  const handleOpenFacebook = () => {
    if (!musician.facebook) return;
    const fb = musician.facebook.trim();
    if (fb.startsWith('http://') || fb.startsWith('https://')) {
      handleOpenLink(fb);
    } else {
      handleOpenLink(fb.startsWith('facebook.com') ? `https://${fb}` : `https://facebook.com/${fb.replace(/^@+/, '')}`);
    }
  };

  const handleOpenSpotify = () => {
    if (!musician.spotify) return;
    const sp = musician.spotify.trim();
    if (sp.startsWith('http://') || sp.startsWith('https://')) {
      handleOpenLink(sp);
    } else {
      handleOpenLink(`https://open.spotify.com/artist/${sp}`);
    }
  };

  const handleOpenTikTok = () => {
    if (!musician.tiktok) return;
    const tt = musician.tiktok.replace(/^@+/, '').trim();
    if (tt.startsWith('http://') || tt.startsWith('https://')) {
      handleOpenLink(tt);
    } else {
      handleOpenLink(`https://tiktok.com/@${tt}`);
    }
  };

  const handleShareProfile = async () => {
    try {
      const mainInst = skills[0]?.instrument || 'Músico';
      const stylesStr = influences.slice(0, 3).map(s => `#${s.name}`).join(' ');
      await Share.share({
        title: `Página Pública de ${currentDisplayName} - Setlist`,
        message: `🎵 Conheça o perfil de ${currentDisplayName} (@${cleanUsername}) no Setlist App!\n🎸 Instrumento: ${mainInst}\n📍 ${[musician.city, musician.state].filter(Boolean).join(', ') || musician.country || ''}\n✨ Estilos: ${stylesStr || '#Música'}\n🌐 Confira a página pública no aplicativo Setlist!`
      });
    } catch (err) {
      console.log('Erro ao compartilhar perfil:', err);
    }
  };

  const handleTriggerInvite = () => {
    if (onInvite) {
      onInvite(musician);
      return;
    }
    if (myBands.length === 0) {
      Alert.alert(
        t('noBandsFoundTitle') || 'Nenhuma Banda Encontrada',
        t('noBandsFoundMsg') || 'Você ainda não possui bandas cadastradas. Crie uma banda na aba Bandas primeiro.'
      );
      return;
    }
    setInviteMessage('');
    setShowInviteModal(true);
  };

  const sanitizeInviteText = (str) => {
    if (!str) return '';
    return str
      .replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, '')
      .trim()
      .slice(0, 500);
  };

  const handleConfirmInvite = async () => {
    if (!selectedBandId) {
      Alert.alert(t('selectBandTitle') || 'Selecione uma Banda', t('selectBandPrompt') || 'Por favor, selecione a banda para a qual deseja convidar o músico.');
      return;
    }
    const targetBand = myBands.find(b => b.id === selectedBandId);
    if (!targetBand) return;

    try {
      setIsSendingInvite(true);
      const role = skills[0]?.instrument || 'Músico';
      const currentYear = new Date().getFullYear().toString();
      const defaultMessage = `Olá ${currentDisplayName}! Convidamos você para ser ${role} na banda ${targetBand.name}.`;
      const cleanedMessage = sanitizeInviteText(inviteMessage);
      const finalMessage = cleanedMessage || defaultMessage;

      const memberId = await bandService.addBandMember(
        targetBand.id,
        currentDisplayName,
        role,
        musician.phone || '',
        currentYear,
        '',
        'pending',
        '[]',
        cleanUsername,
        finalMessage
      );

      let myUser = '';
      let myName = '';
      try {
        const cachedUserStr = (await AsyncStorage.getItem('user_profile_cache')) || (await AsyncStorage.getItem('user_info'));
        if (cachedUserStr) {
          const parsedU = JSON.parse(cachedUserStr);
          myUser = parsedU.username || '';
          myName = parsedU.displayName || parsedU.name || '';
        }
      } catch (e) {}

      await musiciansService.sendInvitation({
        bandMemberId: memberId,
        bandId: targetBand.id,
        bandName: targetBand.name,
        role,
        invitedUsername: cleanUsername,
        invitedName: currentDisplayName,
        senderUsername: myUser,
        senderName: myName,
        message: finalMessage,
        city: targetBand.city || musician.city || '',
        state: targetBand.state || musician.state || ''
      });

      setShowInviteModal(false);
      setInviteMessage('');
      Alert.alert(
        t('candidateInviteSentTitle') || 'Convite Enviado! ✉️',
        (t('candidateInviteSentMsg') || 'Você convidou {name} para integrar a banda "{band}".')
          .replace('{name}', `${currentDisplayName} (@${cleanUsername})`)
          .replace('{band}', targetBand.name) + '\n\n' + (t('candidateInviteSuccessDetail') || 'O integrante foi adicionado como "Pendente" na aba de integrantes da banda.')
      );
    } catch (e) {
      console.log('Erro ao enviar convite:', e);
      Alert.alert(t('errorTitle') || 'Erro', t('inviteErrorMsg') || 'Não foi possível enviar o convite. Tente novamente.');
    } finally {
      setIsSendingInvite(false);
    }
  };

  // ── Helper de estrelas (suporta de 0 a 5 estrelas) – igual ao ProfileScreen ──
  const renderStars = (count, size = 16) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(s => {
        const isFilled = s <= count;
        return (
          <Ionicons
            key={s}
            name={isFilled ? 'star' : 'star-outline'}
            size={size}
            color={isFilled ? colors.primary : (isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)')}
          />
        );
      })}
    </View>
  );

  // ── Pill helper: idêntico ao ProfileScreen (apenas exibição) ──
  const Pill = ({ label, selected, flex }) => (
    <View
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
    </View>
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

  // ── 1. BIO TAB (IDÊNTICO AO PROFILE SCREEN, SEM BOTÕES DE EDITAR) ──
  const renderBioTab = () => (
    <View style={styles.tabContentClean}>
      {/* Faixa: NÍVEL DE INTERESSE & DISPONIBILIDADE (CÍRCULOS FIGMA PADRÃO WEB) */}
      <SectionBanner title={t('interestLevelSection') || "Nível de Interesse"} isFirst={true} />
      {(() => {
        const isHobbie = interestLevel.some(val => String(val || '').toLowerCase().includes('hobb'));
        const isProf = interestLevel.some(val => String(val || '').toLowerCase().includes('prof'));
        const isCasual = interestLevel.some(val => {
          const v = String(val || '').toLowerCase();
          return v.includes('casual') || v.includes('ver') || v.includes('see');
        });
        const isAvail = availability === 'Disponível' || String(availability).toLowerCase() === 'available';

        return (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 14,
            paddingHorizontal: 8,
            marginBottom: 12,
            borderRadius: 16,
            backgroundColor: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.02)',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'
          }}>
            {/* 1. Hobbie */}
            <View style={{ flex: 1, alignItems: 'center' }}>
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
            </View>

            {/* 2. Profissional */}
            <View style={{ flex: 1, alignItems: 'center' }}>
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
            </View>

            {/* 3. Casual */}
            <View style={{ flex: 1, alignItems: 'center' }}>
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
            </View>

            {/* Divisor vertical discreto */}
            <View style={{
              width: 1.5,
              height: 40,
              backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
              marginHorizontal: 4,
              borderRadius: 1
            }} />

            {/* 4. Disponível / Indisponível (por último!) */}
            <View style={{ flex: 1.15, alignItems: 'center' }}>
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
            </View>
          </View>
        );
      })()}

      {/* Faixa: SOBRE MIM (Sem botão de editar) */}
      <SectionBanner title={t('aboutMeSection') || "Sobre mim"} />
      <View style={{ paddingHorizontal: 4 }}>
        <Text style={[styles.cleanBodyText, { color: colors.text }]}>{bio}</Text>
      </View>

      {/* Faixa: INFLUÊNCIAS MUSICAIS (Sem botão gerenciar) */}
      <SectionBanner title={(t('musicalInfluencesCount') || "Influências Musicais ({count}/5)").replace('{count}', influences.length)} />
      <View style={{ paddingHorizontal: 4 }}>
        {influences.length === 0 ? (
          <Text style={{ color: colors.textMuted, fontStyle: 'italic', fontSize: 13, marginTop: 4 }}>
            {t('noInfluencesAdded') || 'Nenhuma influência adicionada.'}
          </Text>
        ) : (
          <View style={{ gap: 6 }}>
            {influences.map((inf) => (
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

      {/* Faixa: LOCALIZAÇÃO (Sem botão de editar) */}
      <SectionBanner title={t('locationLabel') || "Localização"} />
      <View style={{ paddingHorizontal: 4 }}>
        <View style={styles.cleanLinkRow}>
          <Ionicons name='location-sharp' size={20} color={colors.primary} style={{ width: 26 }} />
          <Text style={[styles.cleanLinkText, { color: (musician.city || musician.state || musician.country) ? colors.text : colors.textMuted, flex: 1 }]}>
            {[musician.city, musician.state].filter(Boolean).join(', ') 
              ? `${[musician.city, musician.state].filter(Boolean).join(', ')}${musician.country ? ` • ${musician.country}` : ''}`
              : (musician.country || '')}
          </Text>
        </View>
      </View>

      {/* Faixa: REDES SOCIAIS (Alinhadas na mesma linha, apenas as cadastradas) */}
      <SectionBanner title={t('externalLinksSection') || "Redes Sociais"} />
      <View style={{ paddingHorizontal: 4, paddingVertical: 6 }}>
        {(() => {
          const links = [];
          if (musician.instagram) {
            links.push({ id: 'instagram', name: 'Instagram', iconType: 'ion', icon: 'logo-instagram', onPress: handleOpenInstagram });
          }
          if (musician.youtube) {
            links.push({ id: 'youtube', name: 'YouTube', iconType: 'ion', icon: 'logo-youtube', onPress: handleOpenYouTube });
          }
          if (musician.twitter) {
            links.push({ id: 'twitter', name: 'X (Twitter)', iconType: 'ion', icon: 'logo-twitter', onPress: handleOpenTwitter });
          }
          if (musician.facebook) {
            links.push({ id: 'facebook', name: 'Facebook', iconType: 'ion', icon: 'logo-facebook', onPress: handleOpenFacebook });
          }
          if (musician.spotify) {
            links.push({ id: 'spotify', name: 'Spotify', iconType: 'mci', icon: 'spotify', onPress: handleOpenSpotify });
          }
          if (musician.tiktok) {
            links.push({ id: 'tiktok', name: 'TikTok', iconType: 'ion', icon: 'logo-tiktok', onPress: handleOpenTikTok });
          }

          if (links.length === 0) {
            return (
              <Text style={{ color: colors.textMuted, fontSize: 13, fontStyle: 'italic', paddingHorizontal: 6, paddingVertical: 4 }}>
                {t('noSocialLinksProvided') || 'Nenhuma rede social informada.'}
              </Text>
            );
          }

          return (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {links.map(item => (
                <Pressable
                  key={item.id}
                  onPress={item.onPress}
                  style={({ pressed }) => [{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    opacity: pressed ? 0.7 : 1
                  }]}
                  hitSlop={8}
                  accessibilityLabel={item.name}
                >
                  {item.iconType === 'mci' ? (
                    <MaterialCommunityIcons name={item.icon} size={22} color={colors.primary} />
                  ) : (
                    <Ionicons name={item.icon} size={22} color={colors.primary} />
                  )}
                </Pressable>
              ))}
            </View>
          );
        })()}
      </View>
    </View>
  );

  // ── 2. HABILIDADES TAB (IDÊNTICO AO PROFILE SCREEN, SEM BOTÕES DE EDITAR/EXCLUIR) ──
  const renderSkillsTab = () => (
    <View style={styles.tabContent}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>{t('skillsTab') || 'Habilidades'}</Text>
      </View>

      <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 12, paddingHorizontal: 2 }}>
        {t('skillsSectionSubtitle') || 'Instrumentos e habilidades técnicas do músico.'}
      </Text>

      {skills.length === 0 ? (
        <View style={[styles.fullWidthCard, { backgroundColor: colors.cardBackground, borderTopColor: colors.border, borderBottomColor: colors.border, alignItems: 'center', paddingVertical: 24 }]}>
          <Text style={{ color: colors.textMuted, fontSize: 13, fontStyle: 'italic' }}>
            {t('noSkillsRegistered') || 'Nenhuma habilidade cadastrada.'}
          </Text>
        </View>
      ) : (
        skills.map((skill) => {
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
            </View>
          );
        })
      )}

      {/* 2. HABILIDADES EXTRAS (DIFERENCIAIS P/ BANDA) */}
      {extraSkills.length > 0 && (
        <View style={{ marginTop: 22 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, paddingHorizontal: 2 }}>
            <Ionicons name="sparkles" size={16} color="#fbbf24" />
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {t('extraSkills') || 'Habilidades Extras'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 2 }}>
            {extraSkills.map((es, idx) => (
              <View 
                key={es.id || idx}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 16,
                  backgroundColor: isDark ? 'rgba(251, 191, 36, 0.12)' : 'rgba(251, 191, 36, 0.15)',
                  borderWidth: 1,
                  borderColor: 'rgba(251, 191, 36, 0.35)',
                }}
              >
                <Ionicons name="sparkles" size={13} color="#fbbf24" />
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: isDark ? '#fef3c7' : '#92400e' }}>
                  {es.name || es}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  // ── 3. INSTRUMENTOS / EQUIPAMENTOS TAB (IDÊNTICO AO PROFILE SCREEN, SEM BOTÕES DE EDITAR/ARRASTAR) ──
  const renderInstrumentsTab = () => (
    <View style={styles.tabContent}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ backgroundColor: colors.primary + '18', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800' }}>{gear.length}</Text>
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>{t('myGearTitle') || 'Meus Equipamentos'}</Text>
        </View>
      </View>

      {gear.length === 0 ? (
        <View style={[styles.fullWidthCard, { backgroundColor: colors.cardBackground, borderTopColor: colors.border, borderBottomColor: colors.border, alignItems: 'center', paddingVertical: 28 }]}>
          <MaterialCommunityIcons name="guitar-acoustic" size={48} color={colors.textMuted} />
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: 'bold', marginTop: 10 }}>{t('noGearRegistered') || 'Nenhum equipamento cadastrado'}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 4, paddingHorizontal: 20 }}>
            {t('gearSubtitle') || 'Equipamentos regulados para apresentações ao vivo e ensaios.'}
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
              {/* LINHA 1 (ACIMA): Badge Categoria + Marca/Modelo + Negociável */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8, flexWrap: 'wrap', gap: 8 }}>
                  <View style={{ backgroundColor: colors.primary + '18', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: colors.primary + '30' }}>
                    <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>{item.category}</Text>
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.text }} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>

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

  // ── 4. PROJETOS TAB (IDÊNTICO AO PROFILE SCREEN) ──
  const renderProjectsTab = () => (
    <View style={styles.tabContent}>
      <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 14 }]}>{t('bandsAndProjectsTitle') || 'Bandas e Projetos'}</Text>
      {rawProjects.length === 0 ? (
        <View style={[styles.fullWidthCard, { backgroundColor: colors.cardBackground, borderTopColor: colors.border, borderBottomColor: colors.border, alignItems: 'center', paddingVertical: 24 }]}>
          <Text style={{ color: colors.textMuted, fontSize: 13, fontStyle: 'italic' }}>
            {t('noProjectsRegistered') || 'Nenhum projeto cadastrado.'}
          </Text>
        </View>
      ) : (
        rawProjects.map(proj => {
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
              key={proj.id} 
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
                  {/* Linha 1: Nome da banda (fonte ampliada) + Chevron indicativo */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={[styles.projectName, { color: colors.text, fontSize: 18.5, fontWeight: '800', flex: 1 }]} numberOfLines={1}>
                      {proj.name}
                    </Text>
                    <Ionicons name="chevron-forward" size={17} color={colors.textMuted} style={{ marginLeft: 6 }} />
                  </View>

                  {/* Linha 2: Função/Instrumentos e Localização */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                    <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }} numberOfLines={1}>
                      {getProjectInstrument(proj.role, skills)}
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

              {/* Rodapé: Desde... Membro/Proprietário */}
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
    const rawAgenda = Array.isArray(agenda) ? agenda : [];
    const upcomingEvents = rawAgenda
      .filter(e => isFutureDate(e.rawDate || e.date))
      .sort((a, b) => parseDateForSort(a.rawDate || a.date) - parseDateForSort(b.rawDate || b.date));

    const pastEvents = rawAgenda
      .filter(e => !isFutureDate(e.rawDate || e.date))
      .sort((a, b) => parseDateForSort(b.rawDate || b.date) - parseDateForSort(a.rawDate || a.date));

    const pastMonthsMap = pastEvents.reduce((acc, event) => {
      const header = getMonthYearHeader(event.rawDate || event.date, language);
      if (!acc[header]) acc[header] = [];
      acc[header].push(event);
      return acc;
    }, {});

    const renderEventCard = (event) => {
      const badge = getFormattedDateBadge(event.rawDate || event.date, language);
      const eventTime = event.time || (event.date && String(event.date).includes(' • ') ? String(event.date).split(' • ')[1] : '');
      const eventTitle = event.name || event.title || event.local || 'Show';
      const eventLocal = event.local || event.venue || '';

      // Resolver a banda correspondente para abrir ao clicar no logo
      const bandNameStr = (event.band || event.bandName || '').trim();
      const targetBand = (Array.isArray(rawProjects) ? rawProjects : []).find(p => 
        (event.bandId && p.id && String(p.id) === String(event.bandId)) ||
        (bandNameStr && p.name && p.name.trim().toLowerCase() === bandNameStr.toLowerCase()) ||
        (bandNameStr && p.bandName && p.bandName.trim().toLowerCase() === bandNameStr.toLowerCase())
      ) || (Array.isArray(myBands) ? myBands : []).find(mb => 
        (event.bandId && mb.id && String(mb.id) === String(event.bandId)) ||
        (bandNameStr && mb.name && mb.name.trim().toLowerCase() === bandNameStr.toLowerCase())
      ) || (bandNameStr ? { 
        id: event.bandId, 
        name: bandNameStr, 
        bandName: bandNameStr, 
        imageUri: event.logo || event.imageUri, 
        logo: event.logo || event.imageUri 
      } : null);

      const bandLogoUri = event.logo || event.imageUri || targetBand?.imageUri || targetBand?.logo || null;
      const bandDisplayName = bandNameStr || targetBand?.name || '';

      const handlePressBand = () => {
        if (targetBand && onOpenBandProfile) {
          onOpenBandProfile(targetBand);
        }
      };

      return (
        <View 
          key={event.id} 
          style={[
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
            }
          ]}
        >
          {/* Badge de Data com Dia e Mês reais */}
          <View style={{ width: 54, backgroundColor: colors.primary + '15', justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: colors.border, paddingVertical: 10 }}>
            <Text style={{ color: colors.primary, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' }}>{badge.month}</Text>
            <Text style={{ color: colors.primary, fontSize: 18, fontWeight: '900', lineHeight: 20 }}>{badge.day}</Text>
          </View>

          {/* Dados: Nome do evento no topo, localização e horário abaixo (apenas local e horário) */}
          <View style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: 'bold' }} numberOfLines={1}>
                {eventTitle}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, flexWrap: 'wrap', gap: 8 }}>
                {eventLocal ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 1 }}>
                    <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                    <Text style={{ color: colors.textMuted, fontSize: 11 }} numberOfLines={1}>{eventLocal}</Text>
                  </View>
                ) : null}
                {eventTime ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Ionicons name="time-outline" size={12} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>{eventTime}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Logo da banda na lateral direita (Clicável para abrir o perfil da banda) */}
            {(bandLogoUri || bandDisplayName) ? (
              <Pressable
                onPress={handlePressBand}
                disabled={!targetBand && !onOpenBandProfile}
                hitSlop={8}
                style={({ pressed }) => [
                  {
                    opacity: pressed ? 0.75 : 1,
                    transform: [{ scale: pressed ? 0.94 : 1 }]
                  }
                ]}
                accessibilityLabel={`Abrir perfil da banda ${bandDisplayName}`}
              >
                {bandLogoUri ? (
                  <Image source={{ uri: bandLogoUri }} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border }} />
                ) : (
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary + '18', borderWidth: 1, borderColor: colors.primary + '35', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: '900', color: colors.primary }}>
                      {getBandInitials(bandDisplayName)}
                    </Text>
                  </View>
                )}
              </Pressable>
            ) : null}
          </View>
        </View>
      );
    };

    let lastUpcomingHeader = null;

    return (
      <View style={styles.tabContent}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 14 }]}>
          {t('upcomingShowsTitle') || 'Próximos Shows'}
        </Text>

        {rawAgenda.length === 0 ? (
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
                  <View key={event.id}>
                    {showHeader && (() => {
                      const mCount = upcomingEvents.filter(e => getMonthYearHeader(e.rawDate || e.date, language) === header).length;
                      return (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 8, gap: 8 }}>
                          <Text style={{ fontSize: 11, fontWeight: '900', color: colors.primary, letterSpacing: 0.8 }}>
                            {header}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 2 }}>
                            <Ionicons name="calendar-outline" size={13} color={colors.primary} />
                            <Text style={{ fontSize: 11, fontWeight: '900', color: colors.primary }}>{mCount}</Text>
                          </View>
                          <View style={{ flex: 1, height: 1, backgroundColor: colors.border, opacity: 0.5 }} />
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
                            opacity: pressed ? 0.75 : 1,
                          }
                        ]}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '900', color: colors.primary, letterSpacing: 0.8 }}>
                          {header}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 2 }}>
                          <Ionicons name="calendar-outline" size={13} color={colors.primary} />
                          <Text style={{ fontSize: 11, fontWeight: '900', color: colors.primary }}>{monthEvents.length}</Text>
                        </View>
                        <View style={{ flex: 1, height: 1, backgroundColor: colors.border, opacity: 0.5 }} />
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
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={colors.cardBackground}
        />

        {/* ── HEADER (ESTILO IDÊNTICO AO PROFILE SCREEN, COM VOLTAR, CONVIDAR E COMPARTILHAR) ── */}
        <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
          {/* Barra Superior: Voltar + Convidar + Compartilhar */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable 
              onPress={onClose}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              hitSlop={8}
            >
              <Ionicons name="arrow-back" size={20} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '700' }}>{t('backBtn') || 'Voltar'}</Text>
            </Pressable>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {/* Botão Convidar para Banda */}
              <Pressable
                onPress={handleTriggerInvite}
                style={({ pressed }) => [
                  styles.inviteHeaderBtn,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }
                ]}
                hitSlop={8}
              >
                <Ionicons name="person-add" size={13} color="#ffffff" />
                <Text style={styles.inviteHeaderBtnText}>{t('inviteToBandHeader') || 'Convidar para Banda'}</Text>
              </Pressable>

              {/* Botão Compartilhar */}
              <Pressable
                onPress={handleShareProfile}
                style={styles.shareHeaderBtn}
                hitSlop={8}
              >
                <Ionicons name="share-social-outline" size={20} color={colors.text} />
              </Pressable>
            </View>
          </View>

          {/* Topo do Perfil: Avatar (86x86), Nome, @username e Localização */}
          <View style={styles.headerTop}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>{currentDisplayName.charAt(0).toUpperCase()}</Text>
              </View>
            )}

            <View style={[styles.userInfo, { flex: 1, justifyContent: 'center' }]}>
              {/* Linha 1: Nome */}
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {currentDisplayName}
              </Text>

              {/* Linha 2: username + verificado */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <Text style={[styles.uniqueId, { color: colors.textMuted }]}>
                  @{cleanUsername}
                </Text>

                {musician.isEmailConfirmed ? (
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
              {(musician.age != null || (musician.city || musician.state || musician.country)) ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  {musician.age != null && (
                    <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '600' }}>
                      {`${musician.age} ${t('yearsOld') || 'anos'}`}
                    </Text>
                  )}
                  {musician.age != null && (musician.city || musician.state || musician.country) && (
                    <Text style={{ color: colors.textMuted, opacity: 0.4, fontSize: 12 }}>•</Text>
                  )}
                  {(musician.city || musician.state || musician.country) ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Ionicons name="location-outline" size={13} color={colors.primary} />
                      <Text style={{ fontSize: 13, color: colors.textMuted }} numberOfLines={1}>
                        {[musician.city, musician.state].filter(Boolean).join(', ') || musician.country || ''}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          </View>

        {/* ── ABAS DE OPÇÕES IDÊNTICAS AO PROFILE SCREEN COM OS MESMOS ÍCONES ── */}
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
            showsVerticalScrollIndicator={false}
            scrollEnabled={tabScrollEnabled}
          >
            {activeTab === 'bio' && renderBioTab()}
            {activeTab === 'skills' && renderSkillsTab()}
            {activeTab === 'instruments' && renderInstrumentsTab()}
            {activeTab === 'projects' && renderProjectsTab()}
            {activeTab === 'agenda' && renderAgendaTab()}
          </ScrollView>
        </Animated.View>

        {/* ── MODAL SELETOR DE BANDA PARA CONVIDAR O MÚSICO ── */}
        <Modal
          visible={showInviteModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowInviteModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.inviteModalBackdrop}
          >
            <View style={[styles.inviteModalCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <View style={styles.inviteModalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="mail-outline" size={20} color={colors.primary} />
                  <Text style={[styles.inviteModalTitle, { color: colors.text }]}>{t('inviteMusicianTitle') || 'Convidar Músico'}</Text>
                </View>
                <Pressable onPress={() => setShowInviteModal(false)} hitSlop={8}>
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </Pressable>
              </View>

              <Text style={[styles.inviteModalSubtitle, { color: colors.textMuted }]}>
                Selecione a banda para a qual deseja convidar <Text style={{ fontWeight: '800', color: colors.text }}>{currentDisplayName}</Text> (@{cleanUsername}):
              </Text>

              <ScrollView style={{ maxHeight: 140, marginVertical: 8 }}>
                {myBands.map(b => {
                  const isSelected = selectedBandId === b.id;
                  return (
                    <Pressable
                      key={b.id}
                      style={[
                        styles.bandSelectRow,
                        {
                          backgroundColor: isSelected ? colors.primary + '18' : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'),
                          borderColor: isSelected ? colors.primary : colors.border
                        }
                      ]}
                      onPress={() => setSelectedBandId(b.id)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <Ionicons
                          name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                          size={18}
                          color={isSelected ? colors.primary : colors.textMuted}
                        />
                        <Text style={[styles.bandSelectName, { color: colors.text, fontWeight: isSelected ? '800' : '600' }]}>
                          {b.name}
                        </Text>
                      </View>
                      {b.genre ? (
                        <Text style={[styles.bandSelectGenre, { color: colors.textMuted }]}>{b.genre}</Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* CAMPO DE MENSAGEM SANITIZADO COM MAXLENGTH */}
              <View style={{ marginTop: 2, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted }}>
                    {t('inviteMessageOptionalLower') || 'Mensagem do convite (opcional)'}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: inviteMessage.length >= 480 ? '#ef4444' : colors.textMuted }}>
                    {inviteMessage.length}/500
                  </Text>
                </View>
                <TextInput
                  maxLength={500}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  value={inviteMessage}
                  onChangeText={(text) => {
                    const sanitized = text.slice(0, 500).replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, '');
                    setInviteMessage(sanitized);
                  }}
                  placeholder={`Olá ${currentDisplayName}! Convidamos você para integrar nossa banda.`}
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.inviteMessageInput,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                      borderColor: colors.border,
                      color: colors.text,
                    }
                  ]}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <Pressable
                  style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                  onPress={() => setShowInviteModal(false)}
                >
                  <Text style={[styles.modalCancelBtnText, { color: colors.text }]}>{t('cancelBtn') || 'Cancelar'}</Text>
                </Pressable>

                <Pressable
                  style={[styles.modalConfirmBtn, { backgroundColor: colors.primary, opacity: isSendingInvite ? 0.6 : 1 }]}
                  onPress={handleConfirmInvite}
                  disabled={isSendingInvite}
                >
                  <Ionicons name="paper-plane" size={16} color="#ffffff" />
                  <Text style={styles.modalConfirmBtnText}>
                    {isSendingInvite ? (t('sendingInviteStatus') || 'Enviando...') : (t('sendInviteBtn') || 'Enviar Convite')}
                  </Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </Modal>
  );
}

// ── ESTILOS IDÊNTICOS AO PROFILESCREEN.JS ──
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 20) + 10 : 44 },
  headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16 },
  
  // Avatar aumentado e marcante – 86x86
  avatar: { width: 86, height: 86, borderRadius: 43, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 38, fontWeight: 'bold', color: '#fff' },
  
  userInfo: { flex: 1, marginLeft: 16 },
  name: { fontSize: 21, fontWeight: 'bold' },
  uniqueId: { fontSize: 14, marginTop: 3 },

  inviteHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 5
  },
  inviteHeaderBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800'
  },
  shareHeaderBtn: {
    padding: 6,
  },
  
  // Abas de opções com ícones – idêntico ao ProfileScreen
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

  // Modal Seletor de Banda para Convite
  inviteModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  inviteModalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  inviteModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  inviteModalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  inviteModalSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  bandSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  bandSelectName: {
    fontSize: 14,
  },
  bandSelectGenre: {
    fontSize: 11.5,
  },
  inviteMessageInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    minHeight: 70,
    maxHeight: 110,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalConfirmBtn: {
    flex: 1.5,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
