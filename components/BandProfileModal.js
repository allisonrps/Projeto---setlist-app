import React, { useState, useEffect, useCallback } from 'react';
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
  Share,
  Dimensions,
  ActivityIndicator,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';
import { bandService } from '../services/bandService';
import { setlistService } from '../services/setlistService';
import { musiciansService } from '../services/musiciansService';
import MusicianProfileModal from './MusicianProfileModal';
import DateTimePicker from '@react-native-community/datetimepicker';

const STYLE_COLOR_PALETTE = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#eab308', '#10b981', '#06b6d4', '#6366f1', '#f43f5e', '#a855f7', '#84cc16'
];

const getBandInitials = (name) => {
  if (!name || !name.trim()) return 'BD';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const getMonthInfo = (dateStr, lang = 'pt') => {
  if (!dateStr || !dateStr.trim()) return { name: lang === 'en' ? 'OTHER' : lang === 'es' ? 'OTROS' : 'OUTROS', year: 0, index: -1 };
  const clean = dateStr.trim();
  let monthNum = -1;
  let year = 0;

  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length >= 2) {
      year = parseInt(parts[0], 10);
      monthNum = parseInt(parts[1], 10) - 1;
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
    }
  }

  const monthsPt = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
  const monthsEn = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  const monthsEs = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

  const months = lang === 'en' ? monthsEn : lang === 'es' ? monthsEs : monthsPt;

  if (monthNum >= 0 && monthNum < 12 && year > 0) {
    return { name: months[monthNum], year, index: monthNum };
  }
  return { name: lang === 'en' ? 'OTHER' : lang === 'es' ? 'OTROS' : 'OUTROS', year: 0, index: -1 };
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

  const monthsPt = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const monthsEn = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const monthsEs = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

  const months = lang === 'en' ? monthsEn : lang === 'es' ? monthsEs : monthsPt;

  return { day: String(day).padStart(2, '0'), month: months[monthNum] || '---' };
};

export default function BandProfileModal({
  visible,
  band,
  onClose,
  onAcceptInvite,
  onRejectInvite,
  onOpenBandProfile
}) {
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const isDark = colors.isDark;

  // Active Tab: 'members' | 'stats' | 'setlists' (sem repertório e finanças)
  const [activeTab, setActiveTab] = useState('members');

  // Loaded data
  const [members, setMembers] = useState([]);
  const [memberPhotos, setMemberPhotos] = useState({});
  const [bandSongs, setBandSongs] = useState([]);
  const [bandSetlists, setBandSetlists] = useState([]);
  const [loading, setLoading] = useState(false);

  // Expanded member IDs
  const [expandedMemberIds, setExpandedMemberIds] = useState(new Set());

  // Musician Profile modal
  const [selectedMusicianProfile, setSelectedMusicianProfile] = useState(null);
  const [showMusicianProfileModal, setShowMusicianProfileModal] = useState(false);
  const [showSocialMenu, setShowSocialMenu] = useState(false);

  // Year and month expansion for events
  const currentYearNum = new Date().getFullYear();
  const currentMonthNum = new Date().getMonth();
  const [selectedEventYear, setSelectedEventYear] = useState(currentYearNum);
  const [showEventYearPicker, setShowEventYearPicker] = useState(false);
  const [expandedEventMonths, setExpandedEventMonths] = useState({});

  const toggleEventMonth = (monthName) => {
    setExpandedEventMonths(prev => ({ ...prev, [monthName]: !prev[monthName] }));
  };

  const handleToggleExpandMember = (id) => {
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

  const loadBandData = useCallback(async () => {
    if (!band) return;
    setLoading(true);
    try {
      let loadedMembers = [];
      let loadedSongs = [];
      let loadedSetlists = [];

      // Se for uma banda cadastrada no SQLite
      const bandIdNum = typeof band.id === 'number' ? band.id : (band.id && !isNaN(Number(band.id)) ? Number(band.id) : null);
      if (bandIdNum != null) {
        try {
          const bMem = await bandService.getBandMembers(bandIdNum);
          loadedMembers = bMem || [];
        } catch (e) {}

        try {
          const bSongs = await bandService.getBandSongs(bandIdNum);
          loadedSongs = bSongs || [];
        } catch (e) {}

        try {
          const allSetlists = await setlistService.getAll();
          loadedSetlists = (allSetlists || [])
            .filter(s => s.myBandId === bandIdNum && s.date && (s.type === 'show' || !s.type))
            .sort((a, b) => parseDateForSort(b.date) - parseDateForSort(a.date));
        } catch (e) {}
      } else {
        // Objeto de convite ou mock
        if (Array.isArray(band.members)) {
          loadedMembers = band.members;
        } else if (band.senderName) {
          loadedMembers = [
            {
              id: 'sender',
              name: band.senderName,
              role: 'Líder / Guitarrista',
              username: band.senderUsername || '',
              status: 'active',
              startDate: '2022'
            },
            {
              id: 'invitee',
              name: 'Você (Pendente)',
              role: band.role || 'Músico',
              username: '',
              status: 'pending',
              startDate: 'Aguardando'
            }
          ];
        }

        if (Array.isArray(band.songs)) {
          loadedSongs = band.songs;
        }

        if (Array.isArray(band.schedule)) {
          loadedSetlists = band.schedule
            .filter(s => s.type === 'show' || !s.type)
            .map(s => ({
              id: s.id,
              name: s.title || s.name,
              date: s.date,
              local: s.local || s.venue || '',
              type: s.type || 'show'
            }));
        } else if (Array.isArray(band.agenda)) {
          loadedSetlists = band.agenda
            .filter(s => s.type === 'show' || !s.type)
            .map(s => ({
              id: s.id,
              name: s.title || s.name,
              date: s.date,
              local: s.local || s.venue || '',
              type: s.type || 'show'
            }));
        }
      }

      setMembers(loadedMembers);
      setBandSongs(loadedSongs);
      setBandSetlists(loadedSetlists);

      // Carregar fotos dos membros vinculados com @username
      const photosMap = {};
      for (const m of loadedMembers) {
        if (m.username) {
          try {
            const prof = await musiciansService.getMusicianByUsername(m.username, m.name);
            if (prof && prof.imageUri) {
              photosMap[m.id || m.username] = prof.imageUri;
            }
          } catch (e) {}
        }
      }
      setMemberPhotos(photosMap);
    } finally {
      setLoading(false);
    }
  }, [band]);

  useEffect(() => {
    if (visible && band) {
      setActiveTab('members');
      loadBandData();
    }
  }, [visible, band, loadBandData]);

  const handleOpenMemberProfile = async (member) => {
    const prof = await musiciansService.getMusicianByUsername(member?.username, member?.name);
    if (prof) {
      setSelectedMusicianProfile(prof);
      setShowMusicianProfileModal(true);
    }
  };

  const handleShare = async () => {
    if (!band) return;
    try {
      await Share.share({
        message: `Confira a página da banda "${band.bandName || band.name}" no Setlist Band Manager!`,
      });
    } catch (e) {}
  };

  const getMemberPeriodText = (m) => {
    const start = (m.startDate || '').trim();
    const end = (m.endDate || '').trim();
    if (!start && !end) return null;
    if (start && end) return `${start} ${t('until') || 'até'} ${end}`;
    if (start && !end) return m.status === 'inactive' ? `${t('since') || 'Desde'} ${start}` : `${t('since') || 'Desde'} ${start} (${t('current') || 'Atual'})`;
    if (!start && end) return `${t('untilCapital') || 'Até'} ${end}`;
    return null;
  };

  if (!visible || !band) return null;

  const bandName = band.bandName || band.name || 'Banda';
  const bandImage = band.bandImage || band.imageUri || band.logo || '';
  const bandCity = band.city || '';
  const bandState = band.state || '';
  const bandCountry = band.country || '';
  const isInvite = (band.status === 'pending' || band.isInvite === true || band.hasPendingInvite === true) && (!!onAcceptInvite || !!onRejectInvite);

  // Tags do estilo da banda (sem hashtag)
  let rawGenres = band.genres || [];
  if (typeof rawGenres === 'string') {
    try { rawGenres = JSON.parse(rawGenres); } catch (e) { rawGenres = rawGenres.split(',').map(s => s.trim()).filter(Boolean); }
  }
  const detailBandTags = (Array.isArray(rawGenres) ? rawGenres : [])
    .map(g => String(g).replace(/^#+/, '').trim())
    .filter(Boolean)
    .slice(0, 4);

  const isCover = band.isCover === 1 || (band.bandType && band.bandType.includes('cover')) || (!band.bandType && band.isCover === undefined);
  const isAutoral = band.isAutoral === 1 || (band.bandType && band.bandType.includes('autoral'));

  // Membros ativos e aceitos (apenas membros confirmados na página pública da banda)
  const activeMembers = members.filter(m => (m.status === 'active' || m.status === 'accepted' || (!m.status && m.status !== 'inactive' && m.status !== 'pending' && m.status !== 'rejected')) && m.status !== 'inactive' && m.status !== 'pending' && m.status !== 'rejected');

  // Breakdown de estilos do repertório
  const getStyleBreakdown = () => {
    if (bandSongs.length > 0) {
      const counts = {};
      let totalTags = 0;

      bandSongs.forEach(song => {
        const st = song.style || song.styles || song.genres;
        if (st && String(st).trim()) {
          const tags = String(st).replace(/[\[\]"]/g, '').split(',').map(t => t.trim().replace(/^#+/, '')).filter(Boolean);
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
      if (items.length > 0) return items;
    }

    // Fallback: se não tiver músicas cadastradas, usar gêneros da banda
    if (detailBandTags.length > 0) {
      return detailBandTags.map((tag, idx) => ({
        tag,
        count: 1,
        percentage: Math.round(100 / detailBandTags.length),
        color: STYLE_COLOR_PALETTE[idx % STYLE_COLOR_PALETTE.length]
      }));
    }

    return [];
  };

  const styleBreakdown = getStyleBreakdown();

  // Redes Sociais e Links Externos da Banda
  let parsedSocialLinks = {};
  if (band.links) {
    try {
      parsedSocialLinks = typeof band.links === 'string' ? JSON.parse(band.links) : band.links;
    } catch (e) {}
  }
  const bandInstagram = band.instagram || parsedSocialLinks.instagram || '';
  const bandYoutube = band.youtube || parsedSocialLinks.youtube || '';
  const bandSpotify = band.spotify || parsedSocialLinks.spotify || '';
  const bandTiktok = band.tiktok || parsedSocialLinks.tiktok || '';
  const bandFacebook = band.facebook || parsedSocialLinks.facebook || '';
  const hasAnySocialLink = !!(bandInstagram || bandYoutube || bandSpotify || bandTiktok || bandFacebook);

  const handleOpenExternalSocialLink = async (rawUrl, prefix = '') => {
    if (!rawUrl) return;
    let url = rawUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = prefix ? `${prefix}${url}` : `https://${url}`;
    }
    try {
      await Linking.openURL(url);
    } catch (e) {}
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={[styles.container, { backgroundColor: colors.background }]}>

        {/* OUTER SCROLLVIEW COM CABEÇALHO RETRÁTIL E MENU DE ABAS FIXO (STICKY) - IDÊNTICO AO BANDDETAILSCREEN */}
        <ScrollView
          style={{ flex: 1 }}
          stickyHeaderIndices={[1]}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          contentContainerStyle={{ paddingBottom: isInvite ? 110 : 40 }}
        >
          {/* INDEX 0: HEADER HERO MODERNO COM IMAGEM TRANSLÚCIDA E DEGRADÊ */}
          <View style={[styles.headerHeroContainer, { backgroundColor: isDark ? '#09090b' : '#1e293b' }]}>
            {/* 1. Imagem da banda em full-width ou Fallback com ícones */}
            {bandImage ? (
              <View style={StyleSheet.absoluteFillObject}>
                <Image
                  source={{ uri: bandImage }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              </View>
            ) : (
              <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.primary, opacity: 0.15 }]}>
                <Ionicons name="musical-notes" size={60} color={colors.primary} style={{position: 'absolute', top: 20, left: 30, opacity: 0.3, transform: [{rotate: '-15deg'}]}} />
                <Ionicons name="mic-outline" size={80} color={colors.primary} style={{position: 'absolute', top: 60, right: 40, opacity: 0.2, transform: [{rotate: '25deg'}]}} />
                <Ionicons name="headset-outline" size={50} color={colors.primary} style={{position: 'absolute', bottom: 40, left: '40%', opacity: 0.25}} />
              </View>
            )}

            {/* 2. Degradê escuro na parte inferior para legibilidade */}
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
              <View style={{ flex: 1 }} />
              <View style={{ height: '70%', position: 'absolute', bottom: 0, left: 0, right: 0 }}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.05)' }} />
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.15)' }} />
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.30)' }} />
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.50)' }} />
                <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(9,9,11,0.80)' : 'rgba(0,0,0,0.60)' }} />
              </View>
            </View>

            {/* Barra de Navegação Superior - Glassmorphism */}
            <View style={styles.topRowNav}>
              <Pressable
                style={[styles.headerIconButton, { backgroundColor: 'rgba(0,0,0,0.35)', borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1 }]}
                onPress={onClose}
                hitSlop={8}
                accessibilityLabel="Voltar"
              >
                <Ionicons name="arrow-back" size={20} color="#ffffff" />
              </Pressable>

              <View style={styles.topRowActions}>
                {showSocialMenu ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {bandInstagram ? (
                      <Pressable
                        style={[styles.headerIconButton, { backgroundColor: '#E1306C', borderColor: '#ffffff', borderWidth: 1 }]}
                        onPress={() => handleOpenExternalSocialLink(bandInstagram, 'https://instagram.com/')}
                      >
                        <Ionicons name="logo-instagram" size={17} color="#ffffff" />
                      </Pressable>
                    ) : null}
                    {bandYoutube ? (
                      <Pressable
                        style={[styles.headerIconButton, { backgroundColor: '#FF0000', borderColor: '#ffffff', borderWidth: 1 }]}
                        onPress={() => handleOpenExternalSocialLink(bandYoutube, 'https://youtube.com/')}
                      >
                        <Ionicons name="logo-youtube" size={17} color="#ffffff" />
                      </Pressable>
                    ) : null}
                    {bandSpotify ? (
                      <Pressable
                        style={[styles.headerIconButton, { backgroundColor: '#1DB954', borderColor: '#ffffff', borderWidth: 1 }]}
                        onPress={() => handleOpenExternalSocialLink(bandSpotify, 'https://open.spotify.com/artist/')}
                      >
                        <Ionicons name="musical-notes" size={17} color="#ffffff" />
                      </Pressable>
                    ) : null}
                    {bandTiktok ? (
                      <Pressable
                        style={[styles.headerIconButton, { backgroundColor: '#000000', borderColor: '#ffffff', borderWidth: 1 }]}
                        onPress={() => handleOpenExternalSocialLink(bandTiktok, 'https://tiktok.com/@')}
                      >
                        <Ionicons name="logo-tiktok" size={17} color="#ffffff" />
                      </Pressable>
                    ) : null}
                    {bandFacebook ? (
                      <Pressable
                        style={[styles.headerIconButton, { backgroundColor: '#1877F2', borderColor: '#ffffff', borderWidth: 1 }]}
                        onPress={() => handleOpenExternalSocialLink(bandFacebook, 'https://facebook.com/')}
                      >
                        <Ionicons name="logo-facebook" size={17} color="#ffffff" />
                      </Pressable>
                    ) : null}
                    <Pressable
                      style={[styles.headerIconButton, { backgroundColor: 'rgba(255,255,255,0.25)', borderColor: 'rgba(255,255,255,0.4)', borderWidth: 1 }]}
                      onPress={() => setShowSocialMenu(false)}
                    >
                      <Ionicons name="close" size={17} color="#ffffff" />
                    </Pressable>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {hasAnySocialLink && (
                      <Pressable
                        style={[styles.headerIconButton, { backgroundColor: 'rgba(0,0,0,0.35)', borderColor: 'rgba(255,255,255,0.25)', borderWidth: 1 }]}
                        onPress={() => setShowSocialMenu(true)}
                        accessibilityLabel={t('socialNetworks') || 'Redes Sociais'}
                      >
                        <Ionicons name="link-outline" size={18} color="#ffffff" />
                      </Pressable>
                    )}
                    <Pressable
                      style={[styles.headerIconButton, { backgroundColor: 'rgba(0,0,0,0.35)', borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1 }]}
                      onPress={handleShare}
                      hitSlop={8}
                      accessibilityLabel="Compartilhar"
                    >
                      <Ionicons name="share-social-outline" size={18} color="#ffffff" />
                    </Pressable>
                  </View>
                )}
              </View>
            </View>

            {/* NOME DA BANDA SOBRE O DEGRADÊ (base do header - centralizado) */}
            <View style={styles.headerBandInfoBottom}>
              {!bandImage && (
                <Text style={styles.headerInitialsBig}>{getBandInitials(bandName)}</Text>
              )}
              <Text style={styles.headerBandNameText}>{bandName}</Text>

              {/* 2ª Linha: Cidade, Estado, País */}
              {(bandCity || bandState || bandCountry) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 4 }}>
                  <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.9)" />
                  <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600', textAlign: 'center' }}>
                    {[bandCity, bandState].filter(Boolean).join(', ')
                      ? `${[bandCity, bandState].filter(Boolean).join(', ')}${bandCountry ? ` • ${bandCountry}` : ''}`
                      : bandCountry}
                  </Text>
                </View>
              )}

              {/* 3ª Linha: Pílulas Cover / Autoral + Tags de Estilo */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 6 }}>
                {isCover && (
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', borderColor: 'rgba(255,255,255,0.3)', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{t('proposalCover') || 'Cover'}</Text>
                  </View>
                )}
                {isAutoral && (
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', borderColor: 'rgba(255,255,255,0.3)', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{t('proposalOriginal') || 'Autoral'}</Text>
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

          {/* INDEX 1: TOP TAB BAR DE 3 PÁGINAS SOMENTE ÍCONES (SEM REPERTÓRIO E FINANÇAS) */}
          <View style={[styles.tabBarContainer, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
            <View style={styles.tabBarRow}>
              
              {/* ABA 1: INTEGRANTES */}
              <Pressable
                style={[styles.tabItemIconOnly, activeTab === 'members' && [styles.activeTabItem, { borderBottomColor: colors.primary }]]}
                onPress={() => setActiveTab('members')}
              >
                <View style={{ position: 'relative', paddingHorizontal: 4 }}>
                  <Ionicons
                    name={activeTab === 'members' ? "people" : "people-outline"}
                    size={22}
                    color={activeTab === 'members' ? colors.primary : colors.textMuted}
                  />
                  {activeMembers.length > 0 && (
                    <View style={{ position: 'absolute', top: -4, right: -4, backgroundColor: colors.primary, borderRadius: 10, minWidth: 14, height: 14, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 }}>
                      <Text style={{ color: '#ffffff', fontSize: 9, fontWeight: 'bold' }}>{activeMembers.length}</Text>
                    </View>
                  )}
                </View>
              </Pressable>

              {/* ABA 2: ESTATÍSTICAS / ESTILOS DO REPERTÓRIO */}
              <Pressable
                style={[styles.tabItemIconOnly, activeTab === 'stats' && [styles.activeTabItem, { borderBottomColor: colors.primary }]]}
                onPress={() => setActiveTab('stats')}
              >
                <Ionicons
                  name={activeTab === 'stats' ? "stats-chart" : "stats-chart-outline"}
                  size={22}
                  color={activeTab === 'stats' ? colors.primary : colors.textMuted}
                />
              </Pressable>

              {/* ABA 3: EVENTOS / AGENDA */}
              <Pressable
                style={[styles.tabItemIconOnly, activeTab === 'setlists' && [styles.activeTabItem, { borderBottomColor: colors.primary }]]}
                onPress={() => setActiveTab('setlists')}
              >
                <Ionicons
                  name={activeTab === 'setlists' ? "calendar" : "calendar-outline"}
                  size={22}
                  color={activeTab === 'setlists' ? colors.primary : colors.textMuted}
                />
              </Pressable>

            </View>
          </View>

          {/* ════════════════════ ABA: INTEGRANTES ════════════════════ */}
          {activeTab === 'members' && (
            <View style={styles.dedicatedTabPadding}>
              {/* SEÇÃO: INTEGRANTES ATIVOS */}
              <View style={styles.memberSectionHeader}>
                <View style={styles.sectionHeaderTitleGroup}>
                  <View style={styles.activeDot} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {t('activeMembers')} ({activeMembers.length})
                  </Text>
                </View>
              </View>

              {activeMembers.length === 0 ? (
                <View style={[styles.cardPanelNoBorder, { backgroundColor: colors.card, alignItems: 'center', padding: 24 }]}>
                  <Text style={{ color: colors.textMuted, fontSize: 14 }}>{t('noActiveMembers')}</Text>
                </View>
              ) : (
                activeMembers.map(item => {
                  const photoUri = memberPhotos[item.id || item.username] || item.photoUri || item.imageUri;
                  const periodText = getMemberPeriodText(item);
                  const isExpanded = expandedMemberIds.has(item.id);
                  const hasExtraDetails = !!periodText;

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.memberCardNoBorder,
                        { backgroundColor: colors.card }
                      ]}
                    >
                      <View style={styles.memberCardTopRow}>
                        <View style={styles.memberCardLeft}>
                          {/* Avatar do membro com tamanho aumentado em 50% (54x54) */}
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
                            {/* LINHA 1: NOME E USERNAME */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
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
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* ════════════════════ ABA: ESTATÍSTICAS / ESTILOS DO REPERTÓRIO ════════════════════ */}
          {activeTab === 'stats' && (
            <View style={styles.dedicatedTabPadding}>
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
            </View>
          )}

          {/* ════════════════════ ABA: EVENTOS DESTA BANDA ════════════════════ */}
          {activeTab === 'setlists' && (
            <View style={styles.dedicatedTabPadding}>
              {/* CARD 1: RESUMO DE EVENTOS - 2 CÍRCULOS (ANO, SHOWS) */}
              {(() => {
                const yearEvents = bandSetlists.filter(s => getMonthInfo(s.date, language).year === selectedEventYear);
                const showCount = yearEvents.filter(s => s.type === 'show' || !s.type).length;

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

                    </View>

                    {/* SELETOR DE ANO NATIVO */}
                    {showEventYearPicker && (
                      <DateTimePicker
                        value={new Date(selectedEventYear, 0, 1)}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event, selectedDate) => {
                          setShowEventYearPicker(Platform.OS === 'ios');
                          if (selectedDate && event.type !== 'dismissed') {
                            setSelectedEventYear(selectedDate.getFullYear());
                          }
                        }}
                      />
                    )}
                  </View>
                );
              })()}

              {/* LISTA DE EVENTOS DO ANO SELECIONADO */}
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
                  const filteredEvents = bandSetlists
                    .filter(s => getMonthInfo(s.date, language).year === selectedEventYear)
                    .slice()
                    .sort((a, b) => {
                      const isCurrentYear = selectedEventYear === currentYearNum;
                      if (isCurrentYear) {
                        const aFuture = isFutureDate(a.date);
                        const bFuture = isFutureDate(b.date);
                        if (aFuture && !bFuture) return -1;
                        if (!aFuture && bFuture) return 1;
                        if (aFuture && bFuture) return parseDateForSort(a.date) - parseDateForSort(b.date);
                        return parseDateForSort(b.date) - parseDateForSort(a.date);
                      }
                      if (selectedEventYear > currentYearNum) {
                        return parseDateForSort(a.date) - parseDateForSort(b.date);
                      }
                      return parseDateForSort(b.date) - parseDateForSort(a.date);
                    });
                  if (filteredEvents.length === 0) {
                    return (
                      <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                        <Text style={{ color: colors.textMuted, fontSize: 13, fontStyle: 'italic' }}>
                          {t('noEventsScheduled')}
                        </Text>
                      </View>
                    );
                  }

                  let lastEventHeader = '';
                  return filteredEvents.map(setlist => {
                    const monthInfo = getMonthInfo(setlist.date, language);
                    const header = monthInfo.name;
                    const showHeader = header !== lastEventHeader;
                    if (showHeader) lastEventHeader = header;
                    const dateBadge = getFormattedDateBadge(setlist.date, language);

                    const isPastMonth = selectedEventYear < currentYearNum || (selectedEventYear === currentYearNum && monthInfo.index < currentMonthNum);
                    const isExpanded = expandedEventMonths[header] !== undefined ? expandedEventMonths[header] : !isPastMonth;

                    return (
                      <View key={setlist.id}>
                        {showHeader && (() => {
                          const mGroup = filteredEvents.filter(s => getMonthInfo(s.date, language).name === header);
                          const mShows = mGroup.filter(s => s.type === 'show' || !s.type).length;
                          return (
                            <Pressable onPress={() => toggleEventMonth(header)} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: 8, gap: 8 }}>
                              <Text style={{ fontSize: 11, fontWeight: '900', color: colors.primary, letterSpacing: 0.8 }}>
                                {header}
                              </Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 2 }}>
                                <Ionicons name="calendar-outline" size={13} color={colors.primary} />
                                <Text style={{ fontSize: 11, fontWeight: '900', color: colors.primary }}>{mShows}</Text>
                              </View>
                              <View style={{ flex: 1, height: 1, backgroundColor: colors.border, opacity: 0.5 }} />
                              <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
                            </Pressable>
                          );
                        })()}

                        {isExpanded && (
                          <View
                            style={[styles.eventCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                          >
                            <View style={[styles.dateBadgeBox, { backgroundColor: colors.primary + '15' }]}>
                              <Text style={[styles.dateBadgeDay, { color: colors.primary }]}>{dateBadge.day}</Text>
                              <Text style={[styles.dateBadgeMonth, { color: colors.primary }]}>{dateBadge.month}</Text>
                            </View>

                            <View style={styles.eventCardBody}>
                              <Text style={[styles.eventTitle, { color: colors.text }]}>{setlist.name || setlist.title}</Text>

                              <View style={styles.eventMetaRow}>
                                <View style={[
                                  styles.typePill,
                                  { backgroundColor: setlist.type === 'show' ? '#ef444420' : '#3b82f620' }
                                ]}>
                                  <Text style={[
                                    styles.typePillText,
                                    { color: setlist.type === 'show' ? '#ef4444' : '#3b82f6' }
                                  ]}>
                                    {setlist.type === 'show' ? (t('show') || 'SHOW').toUpperCase() : (t('rehearsal') || 'ENSAIO').toUpperCase()}
                                  </Text>
                                </View>

                                {setlist.local ? (
                                  <Text style={[styles.eventLocalText, { color: colors.textMuted }]} numberOfLines={1}>
                                    📍 {setlist.local}
                                  </Text>
                                ) : null}

                                {setlist.time ? (
                                  <Text style={[styles.eventLocalText, { color: colors.primary, fontWeight: '700' }]} numberOfLines={1}>
                                    ⏰ {setlist.time}
                                  </Text>
                                ) : null}
                              </View>
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  });
                })()
              )}
            </View>
          )}
        </ScrollView>

        {/* ── BARRA FIXA DE AÇÃO PARA CONVITES PENDENTES (SE ABERTO DE CONVITE) ── */}
        {isInvite && (
          <View style={[styles.inviteBottomBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inviteBottomBarTitle, { color: colors.text }]}>
                Convite para integrar a banda
              </Text>
              <Text style={[styles.inviteBottomBarSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                Vaga: {band.role || 'Músico'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {onRejectInvite && (
                <Pressable
                  style={styles.inviteRejectBtn}
                  onPress={() => {
                    onClose();
                    onRejectInvite(band);
                  }}
                  hitSlop={6}
                >
                  <Ionicons name="close" size={22} color="#ffffff" />
                </Pressable>
              )}

              {onAcceptInvite && (
                <Pressable
                  style={styles.inviteAcceptBtn}
                  onPress={() => {
                    onClose();
                    onAcceptInvite(band);
                  }}
                  hitSlop={6}
                >
                  <Ionicons name="checkmark" size={22} color="#ffffff" />
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* PÁGINA PÚBLICA DO INTEGRANTE CLICADO */}
        <MusicianProfileModal
          visible={showMusicianProfileModal}
          musician={selectedMusicianProfile}
          onClose={() => {
            setShowMusicianProfileModal(false);
            setSelectedMusicianProfile(null);
          }}
          onOpenBandProfile={(clickedBand) => {
            setShowMusicianProfileModal(false);
            setSelectedMusicianProfile(null);
            if (onOpenBandProfile) {
              onOpenBandProfile(clickedBand);
            }
          }}
        />
      </View>
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
    height: 220,
    position: 'relative',
    overflow: 'hidden',
  },
  topRowNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    elevation: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 48 : 24,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  topRowActions: {
    flexDirection: 'row',
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
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    textAlign: 'center',
  },
  tabBarContainer: {
    borderBottomWidth: 1,
    height: 48,
    zIndex: 10,
  },
  tabBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 48,
  },
  tabItemIconOnly: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 48,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTabItem: {
    borderBottomWidth: 3,
  },
  dedicatedTabPadding: {
    padding: 16,
    paddingBottom: 40,
  },
  memberSectionHeader: {
    marginTop: 16,
    marginBottom: 12,
  },
  sectionHeaderTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  cardPanelNoBorder: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  memberCardNoBorder: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  memberCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  memberAvatarImg: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  memberAvatarInitial: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  memberNameText: {
    fontSize: 15,
    fontWeight: '800',
    marginRight: 4,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 6,
  },
  roleBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  roleBadgeCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeTextCompact: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  memberCardRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
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
  memberPeriodText: {
    fontSize: 12,
  },
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
  cardPanel: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  cardPanelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardPanelTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  styleBreakdownRow: {
    marginBottom: 14,
  },
  styleBreakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  styleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  styleTagName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  styleTagMeta: {
    fontSize: 12,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
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
  financeSummaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  financeSummaryCard: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 3,
    alignItems: 'center',
  },
  financeSummaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  dateBadgeBox: {
    width: 50,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dateBadgeDay: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dateBadgeMonth: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  eventCardBody: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  typePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  typePillText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  eventLocalText: {
    fontSize: 12,
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
  },
  inviteBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    zIndex: 99,
  },
  inviteBottomBarTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  inviteBottomBarSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  inviteRejectBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  inviteAcceptBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
});
