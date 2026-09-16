import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';
import { Ionicons } from '@expo/vector-icons';
import { bandService } from '../services/bandService';
import SongListItem from './SongListItem';

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

const STYLE_COLOR_PALETTE = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#f43f5e', '#a855f7', '#84cc16'
];

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
  onReloadAll,
}) {
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const isDark = colors.isDark;

  // Dedicated Tab Pages: 'repertoire' | 'members' | 'stats' | 'financial' | 'setlists'
  const [activeTab, setActiveTab] = useState('repertoire');

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
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [memberStartDate, setMemberStartDate] = useState('');
  const [memberEndDate, setMemberEndDate] = useState('');
  const [memberStatus, setMemberStatus] = useState('active'); // 'active' | 'inactive'
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

  // Load Band Data when modal opens or updates
  const loadData = useCallback(async () => {
    if (band && band.id) {
      try {
        const bSongs = await bandService.getBandSongs(band.id);
        setBandSongs(bSongs || []);

        const bMem = await bandService.getBandMembers(band.id);
        setMembers(bMem || []);

        const bFin = await bandService.getBandFinances(band.id);
        setFinances(bFin || []);
      } catch (err) {
        console.error('Error loading BandDetailScreen data:', err);
      }
    }
  }, [band]);

  const handleToggleBandSongFavorite = async (songId, currentIsFav) => {
    if (band && band.id) {
      await bandService.toggleBandSongFavorite(band.id, songId, currentIsFav);
      await loadData();
    }
  };

  useEffect(() => {
    if (visible && band && band.id) {
      loadData();
    }
  }, [visible, band, loadData]);

  if (!visible || !band) return null;

  // Filter setlists belonging to this band
  const bandSetlists = (allSetlists || []).filter(s => s && s.myBandId === band.id);

  // Separate active and inactive members
  const activeMembers = (members || []).filter(m => (m.status || 'active') === 'active');
  const inactiveMembers = (members || []).filter(m => m.status === 'inactive');

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
    const clean = String(valStr)
      .replace(/[^\d.,]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    return parseFloat(clean) || 0;
  };

  const autoShowFinances = [];
  bandSetlists.forEach(sl => {
    const rawCache = sl.cachê || sl.cache || sl.valCache || sl.value;
    if (sl.type === 'show' && rawCache) {
      const amt = parseCurrency(rawCache);
      if (amt > 0) {
        autoShowFinances.push({
          id: `auto_show_${sl.id}`,
          title: `Show: ${sl.name || 'Sem título'}`,
          amount: amt,
          type: 'income',
          date: sl.date || '',
          status: 'paid',
          isAutoShow: true,
        });
      }
    }
  });

  const combinedFinances = [...autoShowFinances, ...finances];

  let totalIncome = 0;
  let totalExpense = 0;

  combinedFinances.forEach(f => {
    const amt = typeof f.amount === 'number' ? f.amount : (parseFloat(f.amount) || 0);
    if (f.type === 'income') {
      if (f.status === 'paid') totalIncome += amt;
    } else {
      if (f.status === 'paid') totalExpense += amt;
    }
  });

  const netBalance = totalIncome - totalExpense;

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
    const favA = a.isFavorite ? 1 : 0;
    const favB = b.isFavorite ? 1 : 0;
    if (favA !== favB) return favB - favA;
    return (a.name || '').localeCompare(b.name || '');
  });

  // Extract unique tags for repertoire filter
  const uniqueBandStyles = Array.from(new Set(
    bandSongs.flatMap(s => (s.style || '').split(',').map(tag => tag.trim()).filter(Boolean))
  ));

  // Calculate style breakdown percentages for the Statistics Dedicated Page
  const getStyleBreakdown = () => {
    if (bandSongs.length === 0) return [];
    const counts = {};
    let totalTags = 0;

    bandSongs.forEach(song => {
      if (song.style && song.style.trim()) {
        const tags = song.style.split(',').map(t => t.trim()).filter(Boolean);
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

      const currentIds = new Set(bandSongs.map(s => s.id));
      const toAdd = targetIds.filter(id => !currentIds.has(id));
      const toRemove = Array.from(currentIds).filter(id => !selectedPickerSongIds.has(id));

      if (toAdd.length > 0) {
        await bandService.addSongsToBand(band.id, toAdd);
      }
      for (const remId of toRemove) {
        await bandService.removeSongFromBand(band.id, remId);
      }

      setShowSongPickerModal(false);
      await loadData();
    } catch (err) {
      console.error('Error saving band repertoire songs:', err);
      Alert.alert('Erro', 'Não foi possível atualizar as músicas da banda.');
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
            await bandService.removeSongFromBand(band.id, song.id);
            await loadData();
          },
        },
      ]
    );
  };

  // Band Member Handlers (Save / Edit / Delete)
  const handleSaveMember = async () => {
    if (!memberName.trim()) {
      Alert.alert('Atenção', 'Por favor, informe o nome do integrante.');
      return;
    }
    const roleTag = memberRole.trim() || 'Integrante';
    try {
      if (editingMemberId) {
        await bandService.updateBandMember(
          editingMemberId,
          memberName.trim(),
          roleTag,
          memberPhone.trim(),
          memberStartDate.trim(),
          memberEndDate.trim(),
          memberStatus
        );
      } else {
        await bandService.addBandMember(
          band.id,
          memberName.trim(),
          roleTag,
          memberPhone.trim(),
          memberStartDate.trim(),
          memberEndDate.trim(),
          memberStatus
        );
      }
      setMemberName('');
      setMemberRole('');
      setMemberPhone('');
      setMemberStartDate('');
      setMemberEndDate('');
      setMemberStatus('active');
      setEditingMemberId(null);
      setShowMemberModal(false);
      await loadData();
    } catch (e) {
      console.error('Error in handleSaveMember:', e);
      Alert.alert('Erro', 'Não foi possível salvar o integrante.');
    }
  };

  const handleOpenAddMember = () => {
    setEditingMemberId(null);
    setMemberName('');
    setMemberRole('');
    setMemberPhone('');
    setMemberStartDate('');
    setMemberEndDate('');
    setMemberStatus('active');
    setShowMemberModal(true);
  };

  const handleOpenEditMember = (member) => {
    setEditingMemberId(member.id);
    setMemberName(member.name || '');
    setMemberRole(member.role || '');
    setMemberPhone(member.phone || '');
    setMemberStartDate(member.startDate || '');
    setMemberEndDate(member.endDate || '');
    setMemberStatus(member.status || 'active');
    setShowMemberModal(true);
  };

  const handleCancelEditMember = () => {
    setEditingMemberId(null);
    setMemberName('');
    setMemberRole('');
    setMemberPhone('');
    setMemberStartDate('');
    setMemberEndDate('');
    setMemberStatus('active');
    setShowMemberModal(false);
  };

  const handleDeleteMember = (member) => {
    Alert.alert(
      'Atenção',
      `Remover ${member.name} (${member.role}) da banda?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            await bandService.deleteBandMember(member.id);
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
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
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
    setShowAddFinanceModal(true);
  };

  const handleOpenEditFinance = (item) => {
    setEditingFinanceItem(item);
    setFinTitle(item.title);
    setFinAmount(String(item.amount));
    setFinType(item.type);
    setFinDate(item.date || '');
    setFinStatus(item.status || 'paid');
    setFinNotes(item.notes || '');
    setShowAddFinanceModal(true);
  };

  const handleSaveFinanceEntry = async () => {
    if (!finTitle.trim()) {
      Alert.alert(t('attention') || 'Atenção', 'Por favor, informe a descrição do lançamento.');
      return;
    }
    const parsedAmt = parseCurrency(finAmount);
    if (parsedAmt <= 0) {
      Alert.alert(t('attention') || 'Atenção', 'Por favor, informe um valor válido.');
      return;
    }

    try {
      if (editingFinanceItem) {
        await bandService.updateFinancialEntry(
          editingFinanceItem.id,
          finTitle.trim(),
          parsedAmt,
          finType,
          finDate.trim(),
          finStatus,
          finNotes.trim()
        );
      } else {
        await bandService.addFinancialEntry(
          band.id,
          finTitle.trim(),
          parsedAmt,
          finType,
          finDate.trim(),
          finStatus,
          finNotes.trim()
        );
      }
      setShowAddFinanceModal(false);
      await loadData();
    } catch (e) {
      console.error('Error saving financial entry:', e);
      Alert.alert('Erro', 'Não foi possível salvar o lançamento financeiro.');
    }
  };

  const handleToggleFinanceStatus = async (item) => {
    try {
      await bandService.toggleFinanceStatus(item.id, item.status || 'paid');
      await loadData();
    } catch (e) {
      console.error('Error toggling finance status:', e);
    }
  };

  const handleDeleteFinanceEntry = (item) => {
    Alert.alert(
      t('attention') || 'Atenção',
      `Excluir o lançamento "${item.title}"?`,
      [
        { text: t('cancel') || 'Cancelar', style: 'cancel' },
        {
          text: t('delete') || 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await bandService.deleteFinancialEntry(item.id);
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
    if (start && end) return `${start} até ${end}`;
    if (start && !end) return m.status === 'inactive' ? `Desde ${start}` : `Desde ${start} (Atual)`;
    if (!start && end) return `Até ${end}`;
    return null;
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onBack}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        
        {/* OUTER SCROLLVIEW COM CABEÇALHO RETRÁTIL E MENU DE ABAS FIXO (STICKY) */}
        <ScrollView
          style={{ flex: 1 }}
          stickyHeaderIndices={[1]}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        >
          {/* INDEX 0: HEADER HERO COM TEXTURAS, DESENHOS DE MÚSICA E LOGO AMPLIADO */}
          <View style={[styles.headerHeroContainer, { backgroundColor: isDark ? '#09090b' : '#f8fafc' }]}>
            {/* 1. Imagem de Marca d'Água no fundo (com opacidade suave) */}
            {(band.imageUri || band.image || band.logo) && (
              <Image
                source={{ uri: band.imageUri || band.image || band.logo }}
                style={[StyleSheet.absoluteFillObject, { opacity: 0.18 }]}
                resizeMode="cover"
                blurRadius={2}
              />
            )}

            {/* 2. Texturas e Desenhos Artísticos de Música no Fundo */}
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
              <View style={[styles.bgHeaderGlow, { backgroundColor: colors.primary + '22' }]} />
              
              <Ionicons name="musical-notes" size={54} color={colors.primary} style={styles.floatingIcon1} />
              <Ionicons name="disc-outline" size={60} color={colors.secondary} style={styles.floatingIcon2} />
              <Ionicons name="radio-outline" size={42} color={colors.textMuted} style={styles.floatingIcon3} />
              <Ionicons name="sparkles" size={32} color={colors.primary} style={styles.floatingIcon4} />
              <Ionicons name="headset-outline" size={48} color={colors.secondary} style={styles.floatingIcon5} />
            </View>

            {/* Barra de Navegação Superior */}
            <View style={styles.topRowNav}>
              <Pressable style={[styles.headerIconButton, { backgroundColor: colors.cardBackground, borderColor: colors.border, borderWidth: 1 }]} onPress={onBack}>
                <Ionicons name="arrow-back" size={20} color={colors.text} />
              </Pressable>

              <View style={styles.topRowActions}>
                <Pressable style={[styles.headerIconButton, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40', borderWidth: 1 }]} onPress={() => onEditBand(band)}>
                  <Ionicons name="pencil" size={18} color={colors.primary} />
                </Pressable>
                <Pressable style={[styles.headerIconButton, { backgroundColor: colors.danger + '18', borderColor: colors.danger + '40', borderWidth: 1 }]} onPress={() => onDeleteBand(band)}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </Pressable>
              </View>
            </View>

            {/* LOGO CENTRALIZADO AMPLIADO */}
            <View style={styles.logoCenterContainerTop}>
              <View style={[styles.avatarGlowOuter, { borderColor: colors.primary + '50', backgroundColor: colors.primary + '12' }]}>
                <View style={[styles.avatarCircleCompact, { backgroundColor: colors.cardBackground, borderColor: colors.primary }]}>
                  {band.imageUri ? (
                    <Image source={{ uri: band.imageUri }} style={styles.avatarImageCompact} />
                  ) : (
                    <Text style={[styles.avatarInitialsCompact, { color: colors.primary }]}>
                      {getBandInitials(band.name)}
                    </Text>
                  )}
                </View>
              </View>
              <Text style={[styles.bandTitleText, { color: colors.text }]}>{band.name}</Text>
            </View>
          </View>

        {/* TOP TAB BAR DE 5 PÁGINAS SOMENTE ÍCONES */}
        <View style={[styles.tabBarContainer, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
          <View style={styles.tabBarRow}>
            
            <Pressable
              style={[styles.tabItemIconOnly, activeTab === 'repertoire' && [styles.activeTabItem, { borderBottomColor: colors.primary }]]}
              onPress={() => setActiveTab('repertoire')}
            >
              <Ionicons
                name={activeTab === 'repertoire' ? "musical-notes" : "musical-notes-outline"}
                size={22}
                color={activeTab === 'repertoire' ? colors.primary : colors.textMuted}
              />
            </Pressable>

            <Pressable
              style={[styles.tabItemIconOnly, activeTab === 'members' && [styles.activeTabItem, { borderBottomColor: colors.primary }]]}
              onPress={() => setActiveTab('members')}
            >
              <Ionicons
                name={activeTab === 'members' ? "people" : "people-outline"}
                size={22}
                color={activeTab === 'members' ? colors.primary : colors.textMuted}
              />
            </Pressable>

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

            <Pressable
              style={[styles.tabItemIconOnly, activeTab === 'financial' && [styles.activeTabItem, { borderBottomColor: colors.primary }]]}
              onPress={() => setActiveTab('financial')}
            >
              <Ionicons
                name={activeTab === 'financial' ? "wallet" : "wallet-outline"}
                size={22}
                color={activeTab === 'financial' ? colors.primary : colors.textMuted}
              />
            </Pressable>

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

        {/* ABA 1: REPERTÓRIO */}
        {activeTab === 'repertoire' && (
          <View style={styles.tabContentFlex}>
            <View style={[styles.searchToolbar, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
              <View style={[styles.searchInputWrapper, { flex: 1, backgroundColor: colors.cardBackground, borderColor: colors.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 44, flexDirection: 'row', alignItems: 'center' }]}>
                <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: 6 }} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text, flex: 1, fontSize: 13 }]}
                  placeholder="Buscar no repertório..."
                  placeholderTextColor={colors.textMuted}
                  value={repertoireSearch}
                  onChangeText={setRepertoireSearch}
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

              <Pressable
                style={[
                  styles.roundIconButton,
                  {
                    backgroundColor: colors.primary,
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    justifyContent: 'center',
                    alignItems: 'center'
                  }
                ]}
                onPress={handleOpenSongPicker}
              >
                <Ionicons name="add" size={22} color="#ffffff" />
              </Pressable>
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
                    Todas ({bandSongs.length})
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
                            Alert.alert(t('attention') || 'Atenção', 'Você pode selecionar no máximo 4 tags ao mesmo tempo.');
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
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhuma música no repertório</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                    Clique no botão "+" para vincular músicas da sua coleção a esta banda.
                  </Text>
                </View>
              ) : (
                filteredBandSongs.map(song => (
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
                      <Pressable
                        style={styles.unlinkSongBtn}
                        onPress={() => handleUnlinkSongConfirm(song)}
                        hitSlop={8}
                      >
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                      </Pressable>
                    }
                  />
                ))
              )}
            </ScrollView>
          </View>
        )}

        {/* ABA 2: INTEGRANTES */}
        {activeTab === 'members' && (
          <ScrollView contentContainerStyle={styles.dedicatedTabPadding}>
            
            {/* BOTÃO PARA ABRIR MODAL DE NOVO INTEGRANTE */}
            <Pressable
              style={[styles.openFormBtn, { backgroundColor: colors.primary }]}
              onPress={handleOpenAddMember}
            >
              <Ionicons name="person-add-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.openFormBtnText}>Adicionar Integrante</Text>
            </Pressable>

            {/* SEÇÃO 1: INTEGRANTES ATIVOS (MOSTRAM APENAS NOME E FUNÇÃO + BOTÃO DE EXPANDIR '+') */}
            <View style={styles.memberSectionHeader}>
              <View style={styles.sectionHeaderTitleGroup}>
                <View style={styles.activeDot} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>INTEGRANTES ATIVOS ({activeMembers.length})</Text>
              </View>
            </View>

            {activeMembers.length === 0 ? (
              <View style={[styles.cardPanelNoBorder, { backgroundColor: colors.card, alignItems: 'center', padding: 24 }]}>
                <Text style={{ color: colors.textMuted, fontSize: 14 }}>Nenhum integrante ativo cadastrado.</Text>
              </View>
            ) : (
              activeMembers.map(item => {
                const periodText = getMemberPeriodText(item);
                const isExpanded = expandedMemberIds.has(item.id);
                const hasExtraDetails = periodText || item.phone;

                return (
                  <View key={item.id} style={[styles.memberCardNoBorder, { backgroundColor: colors.card }]}>
                    <View style={styles.memberCardTopRow}>
                      <View style={styles.memberCardLeft}>
                        <View style={[styles.memberAvatarCircle, { backgroundColor: colors.primary + '20' }]}>
                          <Ionicons name="person" size={18} color={colors.primary} />
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', flex: 1, gap: 4 }}>
                          <Text style={[styles.memberNameText, { color: colors.text }]}>{item.name}</Text>
                          {(item.role || '').split(',').map(r => r.trim()).filter(Boolean).map((roleTag, idx) => (
                            <View key={idx} style={[styles.roleBadge, { backgroundColor: colors.primary }]}>
                              <Text style={styles.roleBadgeText}>{roleTag}</Text>
                            </View>
                          ))}
                        </View>
                      </View>

                      <View style={styles.memberCardRightActions}>
                        <Pressable style={styles.iconActionBtn} onPress={() => handleOpenEditMember(item)}>
                          <Ionicons name="pencil" size={18} color={colors.primary} />
                        </Pressable>
                        <Pressable style={styles.iconActionBtn} onPress={() => handleDeleteMember(item)}>
                          <Ionicons name="trash-outline" size={18} color="#ef4444" />
                        </Pressable>
                        {hasExtraDetails && (
                          <Pressable style={styles.expandToggleBtn} onPress={() => handleToggleExpandMember(item.id)}>
                            <Ionicons name={isExpanded ? "remove" : "add"} size={20} color={colors.primary} />
                          </Pressable>
                        )}
                      </View>
                    </View>

                    {/* REVELAR CONTATO E PERÍODO APENAS AO APERTAR O '+' */}
                    {isExpanded && hasExtraDetails && (
                      <View style={[styles.memberCardExpandedRow, { borderTopColor: isDark ? '#3f3f46' : '#e4e4e7' }]}>
                        {periodText ? (
                          <Text style={[styles.memberPeriodText, { color: colors.textMuted }]}>
                            <Ionicons name="calendar-outline" size={13} color={colors.textMuted} /> {periodText}
                          </Text>
                        ) : null}

                        {item.phone ? (
                          <Pressable style={styles.whatsAppBadge} onPress={() => handleOpenWhatsApp(item.phone)}>
                            <Ionicons name="logo-whatsapp" size={14} color="#25D366" style={{ marginRight: 4 }} />
                            <Text style={styles.whatsAppBadgeText}>{item.phone}</Text>
                          </Pressable>
                        ) : null}
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
                  <Ionicons
                    name={showInactiveMembers ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={colors.text}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.toggleInactiveBtnText, { color: colors.text }]}>
                    {showInactiveMembers
                      ? `Ocultar Integrantes Inativos (${inactiveMembers.length})`
                      : `Exibir Integrantes Inativos (${inactiveMembers.length})`}
                  </Text>
                </Pressable>

                {showInactiveMembers && (
                  <View style={{ marginTop: 12 }}>
                    {inactiveMembers.map(item => {
                      const periodText = getMemberPeriodText(item);
                      const isExpanded = expandedMemberIds.has(item.id);
                      const hasExtraDetails = periodText || item.phone;

                      return (
                        <View key={item.id} style={[styles.memberCardNoBorderInactive, { backgroundColor: colors.cardBackground }]}>
                          <View style={styles.memberCardTopRow}>
                            <View style={styles.memberCardLeft}>
                              <View style={[styles.memberAvatarCircle, { backgroundColor: '#6b728020' }]}>
                                <Ionicons name="person-outline" size={18} color="#6b7280" />
                              </View>
                              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', flex: 1, gap: 4 }}>
                                <Text style={[styles.memberNameText, { color: colors.textMuted }]}>{item.name}</Text>
                                {(item.role || '').split(',').map(r => r.trim()).filter(Boolean).map((roleTag, idx) => (
                                  <View key={idx} style={[styles.roleBadge, { backgroundColor: '#6b7280' }]}>
                                    <Text style={styles.roleBadgeText}>{roleTag}</Text>
                                  </View>
                                ))}
                                <View style={styles.inactivePill}>
                                  <Text style={styles.inactivePillText}>Inativo</Text>
                                </View>
                              </View>
                            </View>

                            <View style={styles.memberCardRightActions}>
                              <Pressable style={styles.iconActionBtn} onPress={() => handleOpenEditMember(item)}>
                                <Ionicons name="pencil" size={18} color={colors.primary} />
                              </Pressable>
                              <Pressable style={styles.iconActionBtn} onPress={() => handleDeleteMember(item)}>
                                <Ionicons name="trash-outline" size={18} color="#ef4444" />
                              </Pressable>
                              {hasExtraDetails && (
                                <Pressable style={styles.expandToggleBtn} onPress={() => handleToggleExpandMember(item.id)}>
                                  <Ionicons name={isExpanded ? "remove" : "add"} size={20} color={colors.primary} />
                                </Pressable>
                              )}
                            </View>
                          </View>

                          {isExpanded && hasExtraDetails && (
                            <View style={[styles.memberCardExpandedRow, { borderTopColor: isDark ? '#3f3f46' : '#e4e4e7' }]}>
                              {periodText ? (
                                <Text style={[styles.memberPeriodText, { color: colors.textMuted }]}>
                                  <Ionicons name="calendar-outline" size={13} color={colors.textMuted} /> {periodText}
                                </Text>
                              ) : null}

                              {item.phone ? (
                                <Pressable style={styles.whatsAppBadge} onPress={() => handleOpenWhatsApp(item.phone)}>
                                  <Ionicons name="logo-whatsapp" size={14} color="#25D366" style={{ marginRight: 4 }} />
                                  <Text style={styles.whatsAppBadgeText}>{item.phone}</Text>
                                </Pressable>
                              ) : null}
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
                  Estilos do Repertorio
                </Text>
              </View>

              {styleBreakdown.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="pie-chart-outline" size={40} color={colors.textMuted} />
                  <Text style={[styles.emptySubtitle, { color: colors.textMuted, marginTop: 8 }]}>
                    Nenhuma tag de estilo definida nas músicas desta banda.
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
                          {item.count} {item.count === 1 ? 'música' : 'músicas'} ({item.percentage}%)
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
            {/* CARD 1: RESUMO FINANCEIRO */}
            <View style={[styles.cardPanel, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <View style={styles.cardPanelHeaderRow}>
                <Ionicons name="wallet-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.cardPanelTitle, { color: colors.text }]}>Resumo Financeiro</Text>
              </View>

              <View style={styles.financeSummaryGrid}>
                <View style={[styles.financeSummaryCard, { backgroundColor: '#10b98115' }]}>
                  <Text style={[styles.financeSummaryLabel, { color: '#10b981' }]}>Entradas</Text>
                  <Text style={[styles.financeSummaryValue, { color: '#10b981' }]}>
                    $ {totalIncome.toFixed(2)}
                  </Text>
                </View>

                <View style={[styles.financeSummaryCard, { backgroundColor: '#ef444415' }]}>
                  <Text style={[styles.financeSummaryLabel, { color: '#ef4444' }]}>Saídas</Text>
                  <Text style={[styles.financeSummaryValue, { color: '#ef4444' }]}>
                    $ {totalExpense.toFixed(2)}
                  </Text>
                </View>

                <View style={[styles.financeSummaryCard, { backgroundColor: netBalance >= 0 ? '#3b82f615' : '#f59e0b15' }]}>
                  <Text style={[styles.financeSummaryLabel, { color: netBalance >= 0 ? '#3b82f6' : '#f59e0b' }]}>Saldo</Text>
                  <Text style={[styles.financeSummaryValue, { color: netBalance >= 0 ? '#3b82f6' : '#f59e0b' }]}>
                    $ {netBalance.toFixed(2)}
                  </Text>
                </View>
              </View>

              <Pressable
                style={[styles.addFinanceBtn, { backgroundColor: colors.primary }]}
                onPress={handleOpenAddFinance}
              >
                <Ionicons name="add" size={18} color="#ffffff" style={{ marginRight: 4 }} />
                <Text style={styles.addFinanceBtnText}>Novo Lançamento Financeiro</Text>
              </Pressable>
            </View>

            {/* CARD 2: SHOWS E CACHÊS DOS EVENTOS DA BANDA */}
            <View style={[styles.cardPanel, { backgroundColor: colors.cardBackground, borderColor: colors.border, marginTop: 16 }]}>
              <View style={styles.cardPanelHeaderRow}>
                <Ionicons name="cash-outline" size={20} color="#10b981" style={{ marginRight: 8 }} />
                <Text style={[styles.cardPanelTitle, { color: colors.text }]}>
                  {t('showsAndCaches') || 'Shows e Cachês dos Eventos'}
                </Text>
              </View>

              {(() => {
                const showEvents = (bandSetlists || []).filter(s => s && s.type === 'show');
                if (showEvents.length === 0) {
                  return (
                    <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                      <Text style={{ color: colors.textMuted, fontSize: 13, fontStyle: 'italic' }}>
                        Nenhum show cadastrado para esta banda ainda.
                      </Text>
                    </View>
                  );
                }

                return showEvents.map(sl => {
                  const rawCache = sl.cachê || sl.cache || sl.valCache || sl.value;
                  const cacheVal = parseCurrency(rawCache);
                  const badgeDate = getFormattedDateBadge(sl.date, language);

                  return (
                    <Pressable
                      key={sl.id}
                      style={({ pressed }) => [
                        styles.financeItemRow,
                        { borderBottomColor: colors.border, opacity: pressed ? 0.75 : 1 }
                      ]}
                      onPress={() => onSelectSetlist && onSelectSetlist(sl)}
                    >
                      {/* Badge de Data */}
                      <View style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        backgroundColor: colors.primary + '12',
                        borderColor: colors.primary + '30',
                        borderWidth: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 10
                      }}>
                        <Text style={{ fontSize: 14, fontWeight: '900', color: colors.text, lineHeight: 16 }}>{badgeDate.day}</Text>
                        <Text style={{ fontSize: 9, fontWeight: '800', color: colors.primary }}>{badgeDate.month}</Text>
                      </View>

                      {/* Nome e Local do Show */}
                      <View style={{ flex: 1, paddingRight: 6 }}>
                        <Text style={[styles.financeItemTitle, { color: colors.text }]} numberOfLines={1}>
                          {sl.name || 'Show Sem Nome'}
                        </Text>
                        <Text style={[styles.financeItemMeta, { color: colors.textMuted }]} numberOfLines={1}>
                          <Ionicons name="location-outline" size={11} color={colors.textMuted} /> {sl.local || 'Local não informado'}
                        </Text>
                      </View>

                      {/* Valor do Cachê */}
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 14, fontWeight: '900', color: cacheVal > 0 ? '#10b981' : colors.textMuted }}>
                          {cacheVal > 0 ? `$ ${cacheVal.toFixed(2)}` : (t('noCachetDefined') || 'Sem Cachê')}
                        </Text>
                        <View style={{ backgroundColor: cacheVal > 0 ? '#10b98120' : isDark ? '#3f3f46' : '#e4e4e7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 2 }}>
                          <Text style={{ color: cacheVal > 0 ? '#10b981' : colors.textMuted, fontSize: 9, fontWeight: '900' }}>
                            {cacheVal > 0 ? 'CACHÊ DE SHOW' : 'A DEFINIR'}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                });
              })()}
            </View>

            {/* CARD 3: OUTROS LANÇAMENTOS MANUAIS */}
            {finances.length > 0 && (
              <View style={[styles.cardPanel, { backgroundColor: colors.cardBackground, borderColor: colors.border, marginTop: 16 }]}>
                <Text style={[styles.cardPanelTitle, { color: colors.text, marginBottom: 12 }]}>Lançamentos Manuais</Text>
                {finances.map(item => {
                  const amtVal = typeof item.amount === 'number' ? item.amount : (parseFloat(item.amount) || 0);
                  return (
                    <View key={item.id} style={[styles.financeItemRow, { borderBottomColor: colors.border }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.financeItemTitle, { color: colors.text }]}>{item.title}</Text>
                        <Text style={[styles.financeItemMeta, { color: colors.textMuted }]}>{item.date || ''}</Text>
                      </View>

                      <Text style={[
                        styles.financeItemAmount,
                        { color: item.type === 'income' ? '#10b981' : '#ef4444' }
                      ]}>
                        {item.type === 'income' ? '+' : '-'} $ {amtVal.toFixed(2)}
                      </Text>

                      <Pressable
                        style={styles.financeStatusBadge}
                        onPress={() => handleToggleFinanceStatus(item)}
                      >
                        <Ionicons
                          name={item.status === 'paid' ? 'checkmark-circle' : 'time-outline'}
                          size={16}
                          color={item.status === 'paid' ? '#10b981' : '#f59e0b'}
                        />
                      </Pressable>

                      <Pressable style={{ marginLeft: 8 }} onPress={() => handleDeleteFinanceEntry(item)}>
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        )}

        {/* ABA 5: EVENTOS DESTA BANDA */}
        {activeTab === 'setlists' && (
          <ScrollView contentContainerStyle={styles.dedicatedTabPadding}>
            <Pressable
              style={[styles.createEventBtn, { backgroundColor: colors.primary }]}
              onPress={() => onOpenNewSetlistForBand && onOpenNewSetlistForBand(band.id)}
            >
              <Ionicons name="add" size={20} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.createEventBtnText}>Criar Evento para esta Banda</Text>
            </Pressable>

            {bandSetlists.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhum evento agendado</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                  Os shows e ensaios desta banda aparecerão nesta lista.
                </Text>
              </View>
            ) : (
              bandSetlists.map(setlist => {
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
                            {setlist.type === 'show' ? 'SHOW' : 'ENSAIO'}
                          </Text>
                        </View>

                        {setlist.local ? (
                          <Text style={[styles.eventLocalText, { color: colors.textMuted }]} numberOfLines={1}>
                            📍 {setlist.local}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        )}

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
              <Text style={[styles.modalTitleText, { color: colors.text }]}>Vincular Músicas da Coleção</Text>
              <Pressable onPress={() => setShowSongPickerModal(false)}>
                <Ionicons name="close-circle" size={24} color={colors.textMuted} />
              </Pressable>
            </View>

            <View style={[styles.pickerSearchInputWrapper, { backgroundColor: colors.cardBackground, borderColor: colors.border, borderWidth: 1 }]}>
              <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: 6 }} />
              <TextInput
                style={[styles.searchInput, { color: colors.text, flex: 1, fontSize: 13 }]}
                placeholder="Buscar música da coleção..."
                placeholderTextColor={colors.textMuted}
                value={pickerSearch}
                onChangeText={setPickerSearch}
              />
            </View>

            <View style={styles.selectAllRow}>
              <Pressable style={styles.selectAllBtn} onPress={handleToggleSelectAllPicker}>
                <Ionicons
                  name={selectedPickerSongIds.size === availableGeneralSongs.length ? "checkbox" : "square-outline"}
                  size={20}
                  color={colors.primary}
                />
                <Text style={[styles.selectAllText, { color: colors.text }]}>Selecionar Todas</Text>
              </Pressable>
              <Text style={[styles.selectedCounterText, { color: colors.textMuted }]}>
                {selectedPickerSongIds.size} selecionadas
              </Text>
            </View>

            <ScrollView style={{ flex: 1 }}>
              {availableGeneralSongs.length === 0 ? (
                <Text style={{ textAlign: 'center', color: colors.textMuted, marginVertical: 20 }}>
                  Nenhuma música encontrada na coleção.
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
                        <Text style={[styles.songItemBand, { color: colors.textMuted }]}>
                          {song.originalBand || ''}
                        </Text>
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
                <Text style={{ color: colors.text }}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirmBtn, { backgroundColor: colors.primary }]}
                onPress={handleSavePickerSongs}
              >
                <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Salvar Repertório</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL ADICIONAR/EDITAR FINANCEIRO */}
      <Modal visible={showAddFinanceModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.pickerModalContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border, maxHeight: '80%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitleText, { color: colors.text }]}>
                {editingFinanceItem ? 'Editar Lançamento' : 'Novo Lançamento Financeiro'}
              </Text>
              <Pressable onPress={() => setShowAddFinanceModal(false)}>
                <Ionicons name="close-circle" size={24} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView>
              <Text style={[styles.cleanInputLabel, { color: colors.text }]}>Descrição: *</Text>
              <TextInput
                style={[styles.cleanInput, { backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : '#f8fafc', color: colors.text, borderColor: colors.border }]}
                placeholder=""
                placeholderTextColor={colors.textMuted}
                value={finTitle}
                onChangeText={setFinTitle}
              />

              <Text style={[styles.cleanInputLabel, { color: colors.text, marginTop: 12 }]}>Valor (R$): *</Text>
              <TextInput
                style={[styles.cleanInput, { backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : '#f8fafc', color: colors.text, borderColor: colors.border }]}
                placeholder=""
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={finAmount}
                onChangeText={setFinAmount}
              />

              <Text style={[styles.cleanInputLabel, { color: colors.text, marginTop: 12 }]}>Tipo:</Text>
              <View style={{ flexDirection: 'row', marginTop: 6, marginBottom: 12 }}>
                <Pressable
                  style={[
                    styles.typeSelectBtn,
                    { backgroundColor: finType === 'income' ? '#10b981' : 'rgba(16, 185, 129, 0.25)', borderColor: '#10b981', borderWidth: 1 }
                  ]}
                  onPress={() => setFinType('income')}
                >
                  <Text style={[styles.typeSelectText, { color: '#ffffff' }]}>Entrada (+)</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.typeSelectBtn,
                    { backgroundColor: finType === 'expense' ? '#ef4444' : 'rgba(239, 68, 68, 0.25)', borderColor: '#ef4444', borderWidth: 1 }
                  ]}
                  onPress={() => setFinType('expense')}
                >
                  <Text style={[styles.typeSelectText, { color: '#ffffff' }]}>Saída (-)</Text>
                </Pressable>
              </View>

              <Text style={[styles.cleanInputLabel, { color: colors.text }]}>Data (DD/MM/AAAA):</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                  style={[styles.cleanInput, { flex: 1, backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : '#f8fafc', color: colors.text, borderColor: colors.border }]}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={colors.textMuted}
                  value={finDate}
                  onChangeText={setFinDate}
                />
                <Pressable
                  style={({ pressed }) => [
                    {
                      height: 42,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      backgroundColor: colors.primary + '18',
                      borderColor: colors.primary + '40',
                      borderWidth: 1,
                      justifyContent: 'center',
                      alignItems: 'center',
                      flexDirection: 'row',
                      gap: 4,
                      opacity: pressed ? 0.7 : 1
                    }
                  ]}
                  onPress={() => {
                    const now = new Date();
                    const day = String(now.getDate()).padStart(2, '0');
                    const month = String(now.getMonth() + 1).padStart(2, '0');
                    const year = now.getFullYear();
                    setFinDate(`${day}/${month}/${year}`);
                  }}
                >
                  <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.primary }}>Hoje</Text>
                </Pressable>
              </View>
            </ScrollView>

            <View style={styles.modalFooterRow}>
              <Pressable
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowAddFinanceModal(false)}
              >
                <Text style={{ color: colors.text }}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirmBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveFinanceEntry}
              >
                <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Salvar</Text>
              </Pressable>
            </View>
          </View>
        </View>
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
                {editingMemberId ? 'Editar Integrante' : 'Novo Integrante'}
              </Text>
              <Pressable onPress={handleCancelEditMember}>
                <Ionicons name="close-circle" size={24} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView>
              <Text style={[styles.cleanInputLabel, { color: colors.text }]}>Nome: *</Text>
              <TextInput
                style={[styles.cleanInput, { backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : '#f8fafc', color: colors.text, borderColor: colors.border }]}
                placeholder=""
                placeholderTextColor={colors.textMuted}
                value={memberName}
                onChangeText={setMemberName}
              />

              <Text style={[styles.cleanInputLabel, { color: colors.text, marginTop: 12 }]}>Função / Instrumento (separe por vírgula):</Text>
              <TextInput
                style={[styles.cleanInput, { backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : '#f8fafc', color: colors.text, borderColor: colors.border }]}
                placeholder="Ex: Vocal, Guitarra, Baixo"
                placeholderTextColor={colors.textMuted}
                value={memberRole}
                onChangeText={setMemberRole}
              />

              <Text style={[styles.cleanInputLabel, { color: colors.text, marginTop: 12 }]}>Contato (WhatsApp):</Text>
              <TextInput
                style={[styles.cleanInput, { backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : '#f8fafc', color: colors.text, borderColor: colors.border }]}
                placeholder="Ex: (11) 99999-9999"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={memberPhone}
                onChangeText={setMemberPhone}
              />

              <View style={[styles.periodRow, { marginTop: 12 }]}>
                <View style={[styles.cleanFormGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.cleanInputLabel, { color: colors.text }]}>Data Início:</Text>
                  <TextInput
                    style={[styles.cleanInput, { backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : '#f8fafc', color: colors.text, borderColor: colors.border }]}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor={colors.textMuted}
                    value={memberStartDate}
                    onChangeText={setMemberStartDate}
                  />
                </View>

                <View style={[styles.cleanFormGroup, { flex: 1 }]}>
                  <Text style={[styles.cleanInputLabel, { color: colors.text }]}>Data Fim:</Text>
                  <TextInput
                    style={[styles.cleanInput, { backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : '#f8fafc', color: colors.text, borderColor: colors.border }]}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor={colors.textMuted}
                    value={memberEndDate}
                    onChangeText={setMemberEndDate}
                  />
                </View>
              </View>

              <Text style={[styles.cleanInputLabel, { color: colors.text, marginTop: 12 }]}>Status do Integrante:</Text>
              <View style={styles.statusPillGroup}>
                <Pressable
                  style={[
                    styles.statusPillBtn,
                    memberStatus === 'active' && { backgroundColor: '#10b981', borderColor: '#10b981' }
                  ]}
                  onPress={() => setMemberStatus('active')}
                >
                  <Ionicons name="checkmark-circle" size={16} color={memberStatus === 'active' ? '#ffffff' : colors.textMuted} style={{ marginRight: 4 }} />
                  <Text style={[styles.statusPillText, { color: memberStatus === 'active' ? '#ffffff' : colors.text }]}>Ativo</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.statusPillBtn,
                    memberStatus === 'inactive' && { backgroundColor: '#6b7280', borderColor: '#6b7280' }
                  ]}
                  onPress={() => setMemberStatus('inactive')}
                >
                  <Ionicons name="close-circle" size={16} color={memberStatus === 'inactive' ? '#ffffff' : colors.textMuted} style={{ marginRight: 4 }} />
                  <Text style={[styles.statusPillText, { color: memberStatus === 'inactive' ? '#ffffff' : colors.text }]}>Inativo</Text>
                </Pressable>
              </View>
            </ScrollView>

            <View style={styles.modalFooterRow}>
              <Pressable
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={handleCancelEditMember}
              >
                <Text style={{ color: colors.text }}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirmBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveMember}
              >
                <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Salvar Integrante</Text>
              </Pressable>
            </View>
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
    paddingTop: Platform.OS === 'ios' ? 44 : 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  topRowNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topRowActions: { flexDirection: 'row' },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  logoCenterContainerTop: {
    alignItems: 'center',
    marginTop: -8,
    marginBottom: 6,
  },
  avatarCircleCompact: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  avatarImageCompact: { width: 86, height: 86, borderRadius: 43 },
  avatarInitialsCompact: { fontSize: 30, fontWeight: '900' },
  bandTitleText: { fontSize: 24, fontWeight: '900', textAlign: 'center', marginTop: 8 },

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

  listPadding: { padding: 16, paddingBottom: 40 },
  dedicatedTabPadding: { padding: 16, paddingBottom: 40 },

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
  memberAvatarCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  memberNameText: { fontSize: 15, fontWeight: 'bold', marginRight: 8 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginRight: 6 },
  roleBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: 'bold' },
  inactivePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, backgroundColor: '#6b7280' },
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

  bgHeaderGlow: {
    position: 'absolute',
    top: -40,
    alignSelf: 'center',
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.6,
  },
  floatingIcon1: { position: 'absolute', top: 20, left: 16, opacity: 0.12, transform: [{ rotate: '-15deg' }] },
  floatingIcon2: { position: 'absolute', top: 75, right: 20, opacity: 0.10, transform: [{ rotate: '20deg' }] },
  floatingIcon3: { position: 'absolute', bottom: 15, left: 35, opacity: 0.08 },
  floatingIcon4: { position: 'absolute', top: 30, right: 75, opacity: 0.15 },
  floatingIcon5: { position: 'absolute', bottom: 25, right: 45, opacity: 0.09, transform: [{ rotate: '-10deg' }] },

  avatarGlowOuter: {
    padding: 3,
    borderRadius: 30,
    borderWidth: 1.5,
    marginBottom: 6,
  },
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
});
