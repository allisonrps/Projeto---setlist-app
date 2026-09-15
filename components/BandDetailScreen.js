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

const PRESET_INSTRUMENTS = [
  'Vocal', 'Guitarra', 'Baixo', 'Bateria', 'Teclado', 'Violão', 'Saxofone', 'Trompete', 'Percussão', 'Backing Vocal', 'Sanfona', 'DJ / FX'
];

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

  // Tabs state: 'repertoire' | 'financial' | 'setlists'
  const [activeTab, setActiveTab] = useState('repertoire');

  // Band Repertoire Data
  const [bandSongs, setBandSongs] = useState([]);
  const [repertoireSearch, setRepertoireSearch] = useState('');
  const [showStyleFilters, setShowStyleFilters] = useState(false);
  const [selectedStyleFilter, setSelectedStyleFilter] = useState('');

  // Song Collection Picker Modal with Checkboxes
  const [showSongPickerModal, setShowSongPickerModal] = useState(false);
  const [selectedPickerSongIds, setSelectedPickerSongIds] = useState(new Set());
  const [pickerSearch, setPickerSearch] = useState('');

  // Band Members Data & Modal
  const [members, setMembers] = useState([]);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [editingMemberId, setEditingMemberId] = useState(null);

  // Style Breakdown Chart Modal
  const [showStyleChartModal, setShowStyleChartModal] = useState(false);

  // Financial Data
  const [finances, setFinances] = useState([]);
  const [showAddFinanceModal, setShowAddFinanceModal] = useState(false);
  const [editingFinanceItem, setEditingFinanceItem] = useState(null);

  // Form states for custom financial entry
  const [finTitle, setFinTitle] = useState('');
  const [finAmount, setFinAmount] = useState('');
  const [finType, setFinType] = useState('income'); // 'income' | 'expense'
  const [finDate, setFinDate] = useState('');
  const [finStatus, setFinStatus] = useState('paid'); // 'paid' | 'pending'
  const [finNotes, setFinNotes] = useState('');

  // Load band specific data when visible or band changes
  const loadData = useCallback(async () => {
    if (band && band.id) {
      try {
        const bSongs = await bandService.getBandSongs(band.id);
        setBandSongs(bSongs || []);

        const bFin = await bandService.getBandFinances(band.id);
        setFinances(bFin || []);

        const bMem = await bandService.getBandMembers(band.id);
        setMembers(bMem || []);
      } catch (err) {
        console.error('Error loading BandDetailScreen data:', err);
      }
    }
  }, [band]);

  useEffect(() => {
    if (visible && band && band.id) {
      loadData();
    }
  }, [visible, band, loadData]);

  if (!visible || !band) return null;

  // Filter setlists belonging to this band
  const bandSetlists = allSetlists.filter(s => s.myBandId === band.id);

  // Financial Calculations
  const parseCurrency = (valStr) => {
    if (!valStr) return 0;
    const clean = String(valStr)
      .replace(/[^\d.,]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    return parseFloat(clean) || 0;
  };

  let totalSetlistIncome = 0;
  bandSetlists.forEach(sl => {
    if (sl.type === 'show' && sl.cachê) {
      const val = parseCurrency(sl.cachê);
      totalSetlistIncome += val;
    }
  });

  let customPaidIncome = 0;
  let customPaidExpense = 0;
  let customPendingIncome = 0;

  finances.forEach(f => {
    const amt = parseFloat(f.amount) || 0;
    if (f.type === 'income') {
      if (f.status === 'paid') customPaidIncome += amt;
      else customPendingIncome += amt;
    } else {
      if (f.status === 'paid') customPaidExpense += amt;
    }
  });

  const totalIncome = totalSetlistIncome + customPaidIncome;
  const totalExpense = customPaidExpense;
  const netBalance = totalIncome - totalExpense;

  // Filtered band repertoire
  const filteredBandSongs = bandSongs.filter(song => {
    const query = repertoireSearch.toLowerCase().trim();
    const matchesSearch = !query || 
      (song.name || '').toLowerCase().includes(query) ||
      (song.originalBand || '').toLowerCase().includes(query) ||
      (song.style || '').toLowerCase().includes(query);

    const matchesStyle = !selectedStyleFilter || 
      (song.style || '').toLowerCase().includes(selectedStyleFilter.toLowerCase());

    return matchesSearch && matchesStyle;
  });

  // Extract unique tags for repertoire filter
  const uniqueBandStyles = Array.from(new Set(
    bandSongs.flatMap(s => (s.style || '').split(',').map(tag => tag.trim()).filter(Boolean))
  ));

  // Calculate style breakdown percentages for the Chart Modal
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
  const bandSongIds = new Set(bandSongs.map(s => s.id));
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

  // Band Member Handlers (Aberto com WhatsApp)
  const handleSaveMember = async () => {
    if (!memberName.trim()) {
      Alert.alert('Atenção', 'Informe o nome do integrante.');
      return;
    }
    const roleTag = memberRole.trim() || 'Integrante';
    try {
      if (editingMemberId) {
        await bandService.updateBandMember(editingMemberId, memberName.trim(), roleTag, memberPhone.trim());
      } else {
        await bandService.addBandMember(band.id, memberName.trim(), roleTag, memberPhone.trim());
      }
      setMemberName('');
      setMemberRole('');
      setMemberPhone('');
      setEditingMemberId(null);
      await loadData();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar o integrante.');
    }
  };

  const handleOpenEditMember = (member) => {
    setEditingMemberId(member.id);
    setMemberName(member.name || '');
    setMemberRole(member.role || '');
    setMemberPhone(member.phone || '');
  };

  const handleCancelEditMember = () => {
    setEditingMemberId(null);
    setMemberName('');
    setMemberRole('');
    setMemberPhone('');
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
      Alert.alert('Erro', 'Não foi possível salvar o lançamento.');
    }
  };

  const handleToggleFinanceStatus = async (item) => {
    try {
      if (typeof Vibration !== 'undefined') Vibration.vibrate(10);
      await bandService.toggleFinanceStatus(item.id, item.status);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteFinanceConfirm = (item) => {
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
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onBack}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* ========================================================
            CAMADA 1: CABEÇALHO HERO DA BANDA (COM LOGO SOBREPOSTA)
           ======================================================== */}
        <View style={[styles.headerHeroCard, { backgroundColor: isDark ? '#0f172a' : '#1e293b' }]}>
          {/* Top Navigation Row */}
          <View style={styles.headerTopNavRow}>
            {/* Left: Voltar Button */}
            <Pressable
              style={({ pressed }) => [styles.headerNavBtn, pressed && { opacity: 0.7 }]}
              onPress={onBack}
            >
              <Ionicons name="arrow-back" size={17} color="#fff" />
              <Text style={styles.headerNavBtnText}>{t('back') || 'Voltar'}</Text>
            </Pressable>

            {/* Right: Floating Circle Actions */}
            <View style={styles.headerActionsGroup}>
              <Pressable
                style={({ pressed }) => [styles.headerIconBtn, pressed && { opacity: 0.75 }]}
                onPress={() => onEditBand(band)}
              >
                <Ionicons name="pencil-outline" size={16} color="#fff" />
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.headerIconBtn,
                  { backgroundColor: 'rgba(239,68,68,0.22)', borderColor: 'rgba(239,68,68,0.4)' },
                  pressed && { opacity: 0.75 }
                ]}
                onPress={() => onDeleteBand(band.id)}
              >
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
              </Pressable>
            </View>
          </View>

          {/* Hero Banner Central Area (Logo Maior Sobreposta no Meio dos Botões) */}
          <View style={styles.heroCenterSection}>
            {/* Avatar Frame Overlapping the Top Row Line */}
            <View style={[styles.bandHeaderAvatarHeroOverlapping, { borderColor: colors.primary }]}>
              {band.imageUri ? (
                <Image source={{ uri: band.imageUri }} style={styles.bandHeaderImage} />
              ) : (
                <View style={[styles.bandHeaderPlaceholder, { backgroundColor: colors.primary }]}>
                  <Text style={styles.bandHeaderInitials}>{getBandInitials(band.name)}</Text>
                </View>
              )}
            </View>

            {/* Title */}
            <View style={styles.heroTitleBox}>
              <Text
                style={styles.headerBandNameHero}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.8}
              >
                {band.name}
              </Text>
            </View>

            {/* Header Action Pills: Integrantes & Gráfico de Estilos */}
            <View style={styles.heroQuickPillsRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.heroQuickPill,
                  { backgroundColor: colors.primary + '18', borderColor: colors.primary + '38' },
                  pressed && { opacity: 0.8 }
                ]}
                onPress={() => setShowMembersModal(true)}
              >
                <Ionicons name="people-outline" size={12} color={colors.primary} />
                <Text style={[styles.heroQuickPillText, { color: colors.primary }]}>
                  INTEGRANTES ({members.length})
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.heroQuickPill,
                  { backgroundColor: colors.secondary + '18', borderColor: colors.secondary + '38' },
                  pressed && { opacity: 0.8 }
                ]}
                onPress={() => setShowStyleChartModal(true)}
              >
                <Ionicons name="pie-chart-outline" size={12} color={colors.secondary} />
                <Text style={[styles.heroQuickPillText, { color: colors.secondary }]}>
                  ESTILOS ({styleBreakdown.length})
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Abas de Navegação (Com Contadores Nativos) */}
          <View style={styles.navTabsBar}>
            <Pressable
              style={[
                styles.navTabBtn,
                activeTab === 'repertoire' && [styles.navTabBtnActive, { backgroundColor: colors.primary }]
              ]}
              onPress={() => setActiveTab('repertoire')}
            >
              <Ionicons
                name="musical-notes"
                size={13}
                color={activeTab === 'repertoire' ? '#fff' : '#94a3b8'}
              />
              <Text style={[styles.navTabText, activeTab === 'repertoire' && styles.navTabTextActive]} numberOfLines={1}>
                REPERTÓRIO ({bandSongs.length})
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.navTabBtn,
                activeTab === 'financial' && [styles.navTabBtnActive, { backgroundColor: colors.primary }]
              ]}
              onPress={() => setActiveTab('financial')}
            >
              <Ionicons
                name="cash"
                size={13}
                color={activeTab === 'financial' ? '#fff' : '#94a3b8'}
              />
              <Text style={[styles.navTabText, activeTab === 'financial' && styles.navTabTextActive]} numberOfLines={1}>
                FINANCEIRO
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.navTabBtn,
                activeTab === 'setlists' && [styles.navTabBtnActive, { backgroundColor: colors.primary }]
              ]}
              onPress={() => setActiveTab('setlists')}
            >
              <Ionicons
                name="calendar"
                size={13}
                color={activeTab === 'setlists' ? '#fff' : '#94a3b8'}
              />
              <Text style={[styles.navTabText, activeTab === 'setlists' && styles.navTabTextActive]} numberOfLines={1}>
                EVENTOS ({bandSetlists.length})
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ========================================================
            CAMADA 3: CONTEÚDO DAS ABAS
           ======================================================== */}
        <View style={{ flex: 1 }}>
          {/* ==================== ABA 1: REPERTÓRIO DA BANDA ==================== */}
          {activeTab === 'repertoire' && (
            <View style={{ flex: 1, paddingHorizontal: 12, paddingTop: 10 }}>
              {/* Botão Único Principal: + ADICIONAR MÚSICAS */}
              <View style={styles.tabActionBar}>
                <Pressable
                  style={({ pressed }) => [
                    styles.singleMainAddBtn,
                    { backgroundColor: colors.primary, transform: [{ scale: pressed ? 0.98 : 1 }] }
                  ]}
                  onPress={handleOpenSongPicker}
                >
                  <Ionicons name="add-circle" size={18} color="#fff" />
                  <Text style={styles.singleMainAddBtnText}>+ ADICIONAR MÚSICAS</Text>
                </Pressable>
              </View>

              {/* Barra de Busca + Botão Etiqueta TAGS (Substitui o Olho) */}
              <View style={styles.searchFilterRow}>
                <View style={[styles.searchBox, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                  <Ionicons name="search-outline" size={15} color={colors.textMuted} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.inputText }]}
                    placeholder="Buscar no repertório da banda..."
                    placeholderTextColor={colors.textMuted}
                    value={repertoireSearch}
                    onChangeText={setRepertoireSearch}
                  />
                  {repertoireSearch.length > 0 && (
                    <Pressable onPress={() => setRepertoireSearch('')}>
                      <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                    </Pressable>
                  )}
                </View>

                {/* Botão Etiqueta TAGS (Substitui o olho) */}
                <Pressable
                  style={({ pressed }) => [
                    styles.tagToggleFilterBtn,
                    {
                      backgroundColor: showStyleFilters 
                        ? colors.primary 
                        : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                      borderColor: showStyleFilters ? colors.primary : colors.border,
                    },
                    pressed && { opacity: 0.8 }
                  ]}
                  onPress={() => setShowStyleFilters(!showStyleFilters)}
                >
                  <Ionicons 
                    name="pricetag-outline" 
                    size={12} 
                    color={showStyleFilters ? "#ffffff" : colors.textMuted} 
                  />
                  <Text style={[styles.tagToggleFilterText, { color: showStyleFilters ? "#ffffff" : colors.textMuted }]}>
                    TAGS
                  </Text>
                </Pressable>
              </View>

              {/* Filtros por estilo (Expansível via Botão TAGS) */}
              {showStyleFilters && uniqueBandStyles.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6, paddingBottom: 8 }}
                >
                  <Pressable
                    style={[
                      styles.styleTagChipCompact,
                      !selectedStyleFilter && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}
                    onPress={() => setSelectedStyleFilter('')}
                  >
                    <Text style={[styles.styleTagTextCompact, !selectedStyleFilter && { color: '#fff' }]}>
                      TODOS
                    </Text>
                  </Pressable>
                  {uniqueBandStyles.map(st => {
                    const isSel = selectedStyleFilter === st;
                    return (
                      <Pressable
                        key={st}
                        style={[
                          styles.styleTagChipCompact,
                          isSel && { backgroundColor: colors.primary, borderColor: colors.primary }
                        ]}
                        onPress={() => setSelectedStyleFilter(isSel ? '' : st)}
                      >
                        <Text style={[styles.styleTagTextCompact, isSel && { color: '#fff' }]}>
                          {st.toUpperCase()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}

              {/* Lista de Músicas do Repertório da Banda */}
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
              >
                {filteredBandSongs.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="musical-notes-outline" size={44} color={colors.textMuted} />
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                      {repertoireSearch || selectedStyleFilter
                        ? 'Nenhuma música encontrada com esse filtro.'
                        : `Nenhuma música vinculada à banda ${band.name} ainda.`}
                    </Text>
                    <Pressable
                      style={[styles.emptyAddBtn, { backgroundColor: colors.primary }]}
                      onPress={handleOpenSongPicker}
                    >
                      <Ionicons name="add-circle-outline" size={16} color="#fff" />
                      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>
                        Adicionar da Coleção
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  filteredBandSongs.map((song, idx) => (
                    <View key={song.id} style={{ position: 'relative' }}>
                      <SongListItem
                        song={song}
                        index={idx}
                        onPress={() => onSelectSong && onSelectSong(song)}
                        onToggleFavorite={onToggleFavoriteSong}
                      />
                      {/* Botão de Desvincular da Banda */}
                      <Pressable
                        style={({ pressed }) => [
                          styles.unlinkBtn,
                          { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)' },
                          pressed && { opacity: 0.7 }
                        ]}
                        onPress={() => handleUnlinkSongConfirm(song)}
                        hitSlop={6}
                      >
                        <Ionicons name="trash-outline" size={14} color={colors.danger} />
                      </Pressable>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          )}

          {/* ==================== ABA 2: CONTROLE FINANCEIRO ==================== */}
          {activeTab === 'financial' && (
            <View style={{ flex: 1, paddingHorizontal: 12, paddingTop: 10 }}>
              {/* Dashboard Cards Summary */}
              <View style={styles.financeGrid}>
                {/* Saldo Líquido Card */}
                <View style={[styles.financeCard, { backgroundColor: isDark ? 'rgba(30,41,59,0.6)' : 'rgba(255,255,255,0.9)', borderColor: netBalance >= 0 ? '#22c55e40' : '#ef444440' }]}>
                  <Text style={[styles.financeCardLabel, { color: colors.textMuted }]}>SALDO LÍQUIDO DO PROJETO</Text>
                  <Text style={[styles.financeCardValue, { color: netBalance >= 0 ? '#22c55e' : '#ef4444' }]}>
                    R$ {netBalance.toFixed(2)}
                  </Text>
                  <Text style={[styles.financeCardSubtext, { color: colors.textMuted }]}>
                    Receitas efetuadas menos despesas pagas
                  </Text>
                </View>

                {/* Grid 2 colunas: Receita Total vs Despesa Total */}
                <View style={styles.financeRowCards}>
                  <View style={[styles.financeMiniCard, { backgroundColor: isDark ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.06)', borderColor: '#22c55e30' }]}>
                    <Text style={[styles.miniCardLabel, { color: '#22c55e' }]}>RECEITA TOTAL (+)</Text>
                    <Text style={[styles.miniCardValue, { color: '#22c55e' }]}>R$ {totalIncome.toFixed(2)}</Text>
                  </View>
                  <View style={[styles.financeMiniCard, { backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.06)', borderColor: '#ef444430' }]}>
                    <Text style={[styles.miniCardLabel, { color: '#ef4444' }]}>DESPESA TOTAL (-)</Text>
                    <Text style={[styles.miniCardValue, { color: '#ef4444' }]}>R$ {totalExpense.toFixed(2)}</Text>
                  </View>
                </View>
              </View>

              {/* Botão + Adicionar Lançamento */}
              <View style={{ marginVertical: 10 }}>
                <Pressable
                  style={({ pressed }) => [
                    styles.addFinanceBtn,
                    { backgroundColor: colors.primary, transform: [{ scale: pressed ? 0.98 : 1 }] }
                  ]}
                  onPress={handleOpenAddFinance}
                >
                  <Ionicons name="add-circle" size={16} color="#fff" />
                  <Text style={styles.addFinanceBtnText}>+ LANÇAMENTO FINANCEIRO</Text>
                </Pressable>
              </View>

              {/* Lista de Lançamentos Customizados da Banda */}
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
              >
                <Text style={[styles.financeSectionTitle, { color: colors.text }]}>
                  HISTÓRICO DE LANÇAMENTOS (${finances.length})
                </Text>

                {finances.length === 0 ? (
                  <View style={[styles.emptyFinanceBox, { borderColor: colors.border }]}>
                    <Ionicons name="cash-outline" size={32} color={colors.textMuted} style={{ opacity: 0.5, marginBottom: 4 }} />
                    <Text style={[styles.emptyFinanceText, { color: colors.textMuted }]}>
                      Nenhum lançamento customizado registrado ainda.
                    </Text>
                  </View>
                ) : (
                  finances.map(item => {
                    const isIncome = item.type === 'income';
                    const isPaid = item.status === 'paid';
                    const itemColor = isIncome ? '#22c55e' : '#ef4444';

                    return (
                      <View
                        key={item.id}
                        style={[
                          styles.financeItemRow,
                          {
                            backgroundColor: isDark ? 'rgba(30,41,59,0.4)' : 'rgba(255,255,255,0.7)',
                            borderColor: colors.border
                          }
                        ]}
                      >
                        <Pressable
                          style={{ flex: 1 }}
                          onPress={() => handleOpenEditFinance(item)}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons
                              name={isIncome ? 'arrow-down-circle' : 'arrow-up-circle'}
                              size={16}
                              color={itemColor}
                            />
                            <Text style={[styles.financeItemTitle, { color: colors.text }]} numberOfLines={1}>
                              {item.title}
                            </Text>
                          </View>

                          <Text style={[styles.financeItemDate, { color: colors.textMuted }]}>
                            {item.date || 'Sem data'} {item.notes ? `• ${item.notes}` : ''}
                          </Text>
                        </Pressable>

                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                          <Text style={[styles.financeItemAmount, { color: itemColor }]}>
                            {isIncome ? '+' : '-'} R$ {parseFloat(item.amount).toFixed(2)}
                          </Text>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Pressable
                              style={[
                                styles.paidStatusBadge,
                                {
                                  backgroundColor: isPaid ? '#22c55e18' : '#f59e0b18',
                                  borderColor: isPaid ? '#22c55e40' : '#f59e0b40'
                                }
                              ]}
                              onPress={() => handleToggleFinanceStatus(item)}
                            >
                              <Ionicons
                                name={isPaid ? 'checkmark-circle' : 'time-outline'}
                                size={10}
                                color={isPaid ? '#22c55e' : '#f59e0b'}
                              />
                              <Text style={[styles.paidStatusText, { color: isPaid ? '#22c55e' : '#f59e0b' }]}>
                                {isPaid ? 'PAGO' : 'PENDENTE'}
                              </Text>
                            </Pressable>

                            <Pressable onPress={() => handleDeleteFinanceConfirm(item)}>
                              <Ionicons name="trash-outline" size={13} color={colors.danger} />
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </View>
          )}

          {/* ==================== ABA 3: EVENTOS DA BANDA (SHOW OU ENSAIO) ==================== */}
          {activeTab === 'setlists' && (
            <View style={{ flex: 1, paddingHorizontal: 12, paddingTop: 10 }}>
              {/* Botão + Novo Evento */}
              <View style={{ marginBottom: 12 }}>
                <Pressable
                  style={({ pressed }) => [
                    styles.singleMainAddBtn,
                    { backgroundColor: colors.primary, transform: [{ scale: pressed ? 0.98 : 1 }] }
                  ]}
                  onPress={() => onOpenNewSetlistForBand(band)}
                >
                  <Ionicons name="add-circle" size={18} color="#fff" />
                  <Text style={styles.singleMainAddBtnText}>+ NOVO EVENTO (SHOW OU ENSAIO)</Text>
                </Pressable>
              </View>

              {/* Listagem de Eventos da Banda (Card Simplificado Clicável) */}
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
              >
                {bandSetlists.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="calendar-outline" size={44} color={colors.textMuted} />
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                      Nenhum evento registrado para a banda {band.name} ainda.
                    </Text>
                    <Pressable
                      style={[styles.emptyAddBtn, { backgroundColor: colors.primary }]}
                      onPress={() => onOpenNewSetlistForBand(band)}
                    >
                      <Ionicons name="add-circle-outline" size={16} color="#fff" />
                      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>
                        Criar Primeiro Evento
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  bandSetlists.map(setlist => {
                    const badgeDate = getFormattedDateBadge(setlist.date, language);
                    const songCount = setlist.songs ? setlist.songs.filter(s => s.id !== -1 && s.id !== -2).length : 0;
                    const typeColor = setlist.type === 'show' ? colors.primary : colors.secondary;

                    return (
                      <Pressable
                        key={setlist.id}
                        style={({ pressed }) => [
                          styles.simplifiedEventCard,
                          {
                            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(255, 255, 255, 0.85)',
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)',
                            transform: [{ scale: pressed ? 0.98 : 1 }]
                          }
                        ]}
                        onPress={() => onOpenNewSetlistForBand(band, setlist)}
                      >
                        {/* Data Badge */}
                        <View style={[styles.eventDateSquare, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: colors.border }]}>
                          <Text style={[styles.eventDateDay, { color: colors.text }]}>{badgeDate.day}</Text>
                          <Text style={[styles.eventDateMonth, { color: colors.primary }]}>{badgeDate.month}</Text>
                        </View>

                        {/* Detalhes do Evento (Tags alinhadas na mesma linha) */}
                        <View style={{ flex: 1, paddingRight: 6 }}>
                          <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1}>
                            {setlist.name || 'Sem Nome'}
                          </Text>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4, flexWrap: 'wrap' }}>
                            {/* Type Pill (Show vs Ensaio) */}
                            <View style={[styles.eventTypePill, { backgroundColor: typeColor + '18', borderColor: typeColor + '40' }]}>
                              <Ionicons
                                name={setlist.type === 'show' ? 'mic' : 'musical-notes'}
                                size={10}
                                color={typeColor}
                              />
                              <Text style={[styles.eventTypeText, { color: typeColor }]}>
                                {(setlist.type === 'ensaio' || setlist.type === 'rehearsal' ? 'ENSAIO' : 'SHOW')}
                              </Text>
                            </View>

                            {/* Songs Badge */}
                            <View style={[styles.eventTypePill, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
                              <Ionicons name="musical-notes-outline" size={10} color={colors.primary} />
                              <Text style={[styles.eventTypeText, { color: colors.primary }]}>
                                {songCount} {t('songsBadge') || 'músicas'}
                              </Text>
                            </View>

                            {/* Cachê Badge */}
                            {setlist.cachê ? (
                              <View style={[styles.eventTypePill, { backgroundColor: '#22c55e18', borderColor: '#22c55e40' }]}>
                                <Ionicons name="cash-outline" size={10} color="#22c55e" />
                                <Text style={[styles.eventTypeText, { color: '#22c55e' }]}>
                                  R$ {setlist.cachê}
                                </Text>
                              </View>
                            ) : null}

                            {/* Location Pill (Alinhado na mesma linha) */}
                            {setlist.local ? (
                              <View style={[styles.eventTypePill, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }]}>
                                <Ionicons name="location-outline" size={10} color={colors.textMuted} />
                                <Text style={[styles.eventTypeText, { color: colors.textMuted }]} numberOfLines={1}>
                                  {setlist.local}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>

                        {/* Seta para indicar que abre a página do evento */}
                        <View style={styles.eventChevronBox}>
                          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            </View>
          )}
        </View>

        {/* ========================================================
            MODAL 1: INTEGRANTES DA BANDA (ULTRA CLEAN)
           ======================================================== */}
        <Modal
          visible={showMembersModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            handleCancelEditMember();
            setShowMembersModal(false);
          }}
        >
          <View style={[styles.sheetOverlay, { backgroundColor: 'rgba(0,0,0,0.75)' }]}>
            <View style={[styles.sheetContentBox, { backgroundColor: colors.background }]}>
              {/* Header */}
              <View style={styles.sheetHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="people" size={20} color={colors.primary} />
                  <Text style={[styles.sheetTitle, { color: colors.text }]}>Integrantes da Banda</Text>
                </View>
                <Pressable onPress={() => {
                  handleCancelEditMember();
                  setShowMembersModal(false);
                }}>
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </Pressable>
              </View>

              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {/* Form Ultra Clean Adicionar / Editar Integrante */}
                <View style={[styles.addMemberFormClean, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }]}>
                  <Text style={[styles.cleanFormHeaderTitle, { color: colors.text }]}>
                    {editingMemberId ? 'Editar Integrante' : 'Novo Integrante'}
                  </Text>

                  {/* 1. Nome */}
                  <Text style={[styles.inputLabelClean, { color: colors.textMuted }]}>Nome:</Text>
                  <TextInput
                    style={[styles.cleanInputBox, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border }]}
                    value={memberName}
                    onChangeText={setMemberName}
                  />

                  {/* 2. Função */}
                  <Text style={[styles.inputLabelClean, { color: colors.textMuted }]}>Função:</Text>
                  <TextInput
                    style={[styles.cleanInputBox, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border }]}
                    value={memberRole}
                    onChangeText={setMemberRole}
                  />

                  {/* 3. Contato (whatsapp) */}
                  <Text style={[styles.inputLabelClean, { color: colors.textMuted }]}>Contato: (whatsapp)</Text>
                  <TextInput
                    style={[styles.cleanInputBox, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border }]}
                    keyboardType="phone-pad"
                    value={memberPhone}
                    onChangeText={setMemberPhone}
                  />

                  {/* Botões Ação */}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    {editingMemberId && (
                      <Pressable
                        style={[styles.confirmMemberAddBtn, { backgroundColor: colors.textMuted, flex: 1 }]}
                        onPress={handleCancelEditMember}
                      >
                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>CANCELAR</Text>
                      </Pressable>
                    )}
                    <Pressable
                      style={[styles.confirmMemberAddBtn, { backgroundColor: colors.primary, flex: 1.5 }]}
                      onPress={handleSaveMember}
                    >
                      <Ionicons name={editingMemberId ? "checkmark-circle" : "person-add"} size={15} color="#fff" />
                      <Text style={{ color: '#fff', fontWeight: '900', fontSize: 12 }}>
                        {editingMemberId ? 'SALVAR INTEGRANTE' : '+ ADICIONAR INTEGRANTE'}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Lista de Integrantes Cadastrados */}
                <Text style={[styles.financeSectionTitle, { color: colors.text, marginTop: 10 }]}>
                  INTEGRANTES CADASTRADOS (${members.length})
                </Text>

                {members.length === 0 ? (
                  <Text style={{ fontStyle: 'italic', color: colors.textMuted, textAlign: 'center', marginVertical: 20 }}>
                    Nenhum integrante cadastrado nesta banda ainda.
                  </Text>
                ) : (
                  members.map(m => (
                    <View
                      key={m.id}
                      style={[
                        styles.memberRowCard,
                        { backgroundColor: isDark ? 'rgba(30,41,59,0.4)' : 'rgba(255,255,255,0.7)', borderColor: colors.border }
                      ]}
                    >
                      <Pressable style={{ flex: 1 }} onPress={() => handleOpenEditMember(m)}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={[styles.memberAvatarCircle, { backgroundColor: colors.primary + '20' }]}>
                            <Ionicons name="person" size={16} color={colors.primary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.memberNameText, { color: colors.text }]}>{m.name}</Text>
                            
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                              {/* Tag do Instrumento */}
                              <View style={[styles.roleTagPill, { backgroundColor: colors.secondary + '18', borderColor: colors.secondary + '38' }]}>
                                <Ionicons name="musical-note" size={10} color={colors.secondary} />
                                <Text style={[styles.roleTagText, { color: colors.secondary }]}>{m.role}</Text>
                              </View>

                              {/* WhatsApp Direct Action Button */}
                              {m.phone ? (
                                <Pressable
                                  style={[styles.roleTagPill, { backgroundColor: '#22c55e18', borderColor: '#22c55e40' }]}
                                  onPress={() => handleOpenWhatsApp(m.phone)}
                                >
                                  <Ionicons name="logo-whatsapp" size={10} color="#22c55e" />
                                  <Text style={[styles.roleTagText, { color: '#22c55e' }]}>{m.phone}</Text>
                                </Pressable>
                              ) : null}
                            </View>
                          </View>
                        </View>
                      </Pressable>

                      {/* Botão de Excluir */}
                      <Pressable onPress={() => handleDeleteMember(m)} hitSlop={6} style={{ padding: 4 }}>
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      </Pressable>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ========================================================
            MODAL 2: GRÁFICO DE ESTILOS DO REPERTÓRIO (BOTTOM SHEET)
           ======================================================== */}
        <Modal
          visible={showStyleChartModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowStyleChartModal(false)}
        >
          <View style={[styles.sheetOverlay, { backgroundColor: 'rgba(0,0,0,0.75)' }]}>
            <View style={[styles.sheetContentBox, { backgroundColor: colors.background }]}>
              {/* Header */}
              <View style={styles.sheetHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="pie-chart" size={20} color={colors.secondary} />
                  <Text style={[styles.sheetTitle, { color: colors.text }]}>Estilos do Repertório</Text>
                </View>
                <Pressable onPress={() => setShowStyleChartModal(false)}>
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </Pressable>
              </View>

              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {/* Resumo do Repertório */}
                <View style={[styles.chartSummaryBox, { backgroundColor: isDark ? 'rgba(30,41,59,0.5)' : 'rgba(255,255,255,0.8)', borderColor: colors.border }]}>
                  <View style={{ alignItems: 'center', flex: 1 }}>
                    <Text style={[styles.summaryVal, { color: colors.primary }]}>{bandSongs.length}</Text>
                    <Text style={[styles.summaryLbl, { color: colors.textMuted }]}>MÚSICAS</Text>
                  </View>
                  <View style={{ width: 1, backgroundColor: colors.border, height: '80%' }} />
                  <View style={{ alignItems: 'center', flex: 1 }}>
                    <Text style={[styles.summaryVal, { color: colors.secondary }]}>{styleBreakdown.length}</Text>
                    <Text style={[styles.summaryLbl, { color: colors.textMuted }]}>ESTILOS</Text>
                  </View>
                </View>

                {/* Lista de Gêneros com Barras de Progresso */}
                {styleBreakdown.length === 0 ? (
                  <Text style={{ fontStyle: 'italic', color: colors.textMuted, textAlign: 'center', marginVertical: 30 }}>
                    Nenhuma música com estilo/gênero cadastrado no repertório.
                  </Text>
                ) : (
                  styleBreakdown.map((item) => (
                    <View key={item.tag} style={styles.chartRow}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={[styles.chartTagTitle, { color: colors.text }]}>{item.tag}</Text>
                        <Text style={[styles.chartTagPercent, { color: item.color }]}>
                          {item.count} {item.count === 1 ? 'música' : 'músicas'} ({item.percentage}%)
                        </Text>
                      </View>
                      <View style={[styles.progressBarTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                        <View style={[styles.progressBarFill, { width: `${item.percentage}%`, backgroundColor: item.color }]} />
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ========================================================
            MODAL 3: SELETOR DE MÚSICAS DA COLEÇÃO (COM CHECKBOXES)
           ======================================================== */}
        <Modal
          visible={showSongPickerModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowSongPickerModal(false)}
        >
          <View style={[styles.pickerOverlay, { backgroundColor: 'rgba(0,0,0,0.75)' }]}>
            <View style={[styles.pickerModalBox, { backgroundColor: colors.background }]}>
              {/* Cabeçalho */}
              <View style={styles.pickerHeader}>
                <View>
                  <Text style={[styles.pickerTitle, { color: colors.text }]}>
                    Adicionar Músicas
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>
                    Selecione as músicas da coleção para a banda {band.name}
                  </Text>
                </View>
                <Pressable onPress={() => setShowSongPickerModal(false)}>
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </Pressable>
              </View>

              {/* Busca na Coleção */}
              <View style={styles.pickerSearchRow}>
                <Ionicons name="search-outline" size={15} color={colors.textMuted} style={{ marginRight: 6 }} />
                <TextInput
                  style={[styles.pickerSearchInput, { color: colors.inputText }]}
                  placeholder="Buscar na coleção de músicas..."
                  placeholderTextColor={colors.textMuted}
                  value={pickerSearch}
                  onChangeText={setPickerSearch}
                />
              </View>

              {/* Opção Selecionar Todas */}
              <View style={styles.pickerActionBar}>
                <Pressable
                  style={styles.pickerSelectAllBtn}
                  onPress={handleToggleSelectAllPicker}
                >
                  <Ionicons
                    name={selectedPickerSongIds.size === availableGeneralSongs.length ? "checkbox" : "square-outline"}
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                    {selectedPickerSongIds.size === availableGeneralSongs.length ? 'DESSELECIONAR TODAS' : 'SELECIONAR TODAS'}
                  </Text>
                </Pressable>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted }}>
                  {selectedPickerSongIds.size} selecionada(s)
                </Text>
              </View>

              {/* Lista de Músicas com Checkboxes */}
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {availableGeneralSongs.length === 0 ? (
                  <Text style={{ fontStyle: 'italic', color: colors.textMuted, textAlign: 'center', marginVertical: 20 }}>
                    Nenhuma música encontrada na coleção.
                  </Text>
                ) : (
                  availableGeneralSongs.map(s => {
                    const isChecked = selectedPickerSongIds.has(s.id);
                    return (
                      <Pressable
                        key={s.id}
                        style={({ pressed }) => [
                          styles.pickerSongRowCheckbox,
                          {
                            backgroundColor: isChecked
                              ? colors.primary + '12'
                              : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
                            borderColor: isChecked ? colors.primary + '40' : 'transparent',
                          },
                          pressed && { opacity: 0.8 }
                        ]}
                        onPress={() => handleTogglePickerCheck(s.id)}
                      >
                        {/* Checkbox Icon */}
                        <View style={[styles.checkboxSquare, { borderColor: isChecked ? colors.primary : colors.border, backgroundColor: isChecked ? colors.primary : 'transparent' }]}>
                          {isChecked && <Ionicons name="checkmark" size={14} color="#fff" />}
                        </View>

                        {/* Detalhes da Música */}
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.pickerSongName, { color: colors.text }]}>{s.name}</Text>
                          <Text style={{ fontSize: 11, color: colors.textMuted }}>{s.originalBand} {s.style ? `• ${s.style}` : ''}</Text>
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>

              {/* Botão de Salvar Alterações */}
              <Pressable
                style={[styles.pickerConfirmBtn, { backgroundColor: colors.primary }]}
                onPress={handleSavePickerSongs}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 }}>
                  SALVAR REPERTÓRIO DA BANDA ({selectedPickerSongIds.size})
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* ========================================================
            MODAL 4: ADICIONAR / EDITAR LANÇAMENTO FINANCEIRO
           ======================================================== */}
        <Modal
          visible={showAddFinanceModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowAddFinanceModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.pickerOverlay, { backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center' }]}
          >
            <View style={[styles.customEditorBox, { backgroundColor: colors.background, borderColor: colors.primary }]}>
              <Text style={[styles.pickerTitle, { color: colors.text, marginBottom: 14 }]}>
                {editingFinanceItem ? 'Editar Lançamento' : 'Novo Lançamento Financeiro'}
              </Text>

              {/* Alternar Receita / Despesa */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                <Pressable
                  style={[
                    styles.typePillBtn,
                    finType === 'income' && { backgroundColor: '#22c55e', borderColor: '#22c55e' }
                  ]}
                  onPress={() => setFinType('income')}
                >
                  <Ionicons name="arrow-down-circle" size={14} color={finType === 'income' ? '#fff' : colors.textMuted} />
                  <Text style={[styles.typePillText, finType === 'income' && { color: '#fff' }]}>RECEITA (+)</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.typePillBtn,
                    finType === 'expense' && { backgroundColor: '#ef4444', borderColor: '#ef4444' }
                  ]}
                  onPress={() => setFinType('expense')}
                >
                  <Ionicons name="arrow-up-circle" size={14} color={finType === 'expense' ? '#fff' : colors.textMuted} />
                  <Text style={[styles.typePillText, finType === 'expense' && { color: '#fff' }]}>DESPESA (-)</Text>
                </Pressable>
              </View>

              {/* Título do Lançamento */}
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>DESCRIÇÃO / TÍTULO *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border }]}
                placeholder="Ex: Ensaio no Estúdio, Frete Som, Cachê extra..."
                placeholderTextColor={colors.textMuted}
                value={finTitle}
                onChangeText={setFinTitle}
              />

              {/* Valor e Data */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.textMuted }]}>VALOR (R$) *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border }]}
                    placeholder="250.00"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={finAmount}
                    onChangeText={setFinAmount}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.textMuted }]}>DATA</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border }]}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor={colors.textMuted}
                    value={finDate}
                    onChangeText={setFinDate}
                  />
                </View>
              </View>

              {/* Status PAGO / PENDENTE */}
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>STATUS</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                <Pressable
                  style={[
                    styles.typePillBtn,
                    finStatus === 'paid' && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  onPress={() => setFinStatus('paid')}
                >
                  <Ionicons name="checkmark-circle" size={14} color={finStatus === 'paid' ? '#fff' : colors.textMuted} />
                  <Text style={[styles.typePillText, finStatus === 'paid' && { color: '#fff' }]}>PAGO</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.typePillBtn,
                    finStatus === 'pending' && { backgroundColor: '#f59e0b', borderColor: '#f59e0b' }
                  ]}
                  onPress={() => setFinStatus('pending')}
                >
                  <Ionicons name="time" size={14} color={finStatus === 'pending' ? '#fff' : colors.textMuted} />
                  <Text style={[styles.typePillText, finStatus === 'pending' && { color: '#fff' }]}>PENDENTE</Text>
                </Pressable>
              </View>

              {/* Botões Ação */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <Pressable
                  style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                  onPress={() => setShowAddFinanceModal(false)}
                >
                  <Text style={{ color: colors.textMuted, fontWeight: '700' }}>CANCELAR</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSaveFinanceEntry}
                >
                  <Text style={{ color: '#fff', fontWeight: '900' }}>SALVAR</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Cabeçalho Hero da Banda (Com Logo Sobreposta no Meio da Barra)
  headerHeroCard: {
    paddingTop: Platform.OS === 'ios' ? 44 : 28,
    paddingBottom: 12,
    paddingHorizontal: 14,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  headerTopNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  headerNavBtnText: {
    color: '#fff',
    fontSize: 12.5,
    fontWeight: '800',
  },
  heroCenterSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  bandHeaderAvatarHeroOverlapping: {
    width: 76,
    height: 76,
    borderRadius: 38,
    overflow: 'hidden',
    borderWidth: 3,
    marginTop: -26,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  heroTitleBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  headerBandNameHero: {
    color: '#fff',
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  heroQuickPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  heroQuickPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
  },
  heroQuickPillText: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bandHeaderImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bandHeaderPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bandHeaderInitials: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 24,
  },
  headerActionsGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Nav Tabs Bar
  navTabsBar: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.25)',
    padding: 4,
    borderRadius: 14,
  },
  navTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
  },
  navTabBtnActive: {
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  navTabText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.3,
  },
  navTabTextActive: {
    color: '#fff',
  },

  // Tab Action Bar
  tabActionBar: {
    marginBottom: 10,
  },
  singleMainAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    elevation: 2,
  },
  singleMainAddBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // Search & Filter
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    padding: 0,
  },
  tagToggleFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  tagToggleFilterText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  styleTagChipCompact: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.3)',
    marginRight: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  styleTagTextCompact: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#94a3b8',
  },

  // Unlink Button on Song Item
  unlinkBtn: {
    position: 'absolute',
    right: 12,
    top: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 14,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },

  // Finance Dashboard
  financeGrid: {
    gap: 8,
    marginBottom: 8,
  },
  financeCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  financeCardLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  financeCardValue: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  financeCardSubtext: {
    fontSize: 11,
    marginTop: 2,
  },
  financeRowCards: {
    flexDirection: 'row',
    gap: 8,
  },
  financeMiniCard: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  miniCardLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  miniCardValue: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 4,
  },

  addFinanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
  },
  addFinanceBtnText: {
    color: '#fff',
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  financeSectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  emptyFinanceBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyFinanceText: {
    fontSize: 11.5,
    fontStyle: 'italic',
  },

  financeItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  financeItemTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  financeItemDate: {
    fontSize: 11,
    marginTop: 2,
  },
  financeItemAmount: {
    fontSize: 13.5,
    fontWeight: '900',
  },
  paidStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  paidStatusText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.2,
  },

  // Simplified Event Card
  simplifiedEventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  eventDateSquare: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDateDay: {
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 17,
  },
  eventDateMonth: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  eventTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  eventTypeText: {
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  eventLocalText: {
    fontSize: 11,
    marginTop: 3,
  },
  eventChevronBox: {
    paddingLeft: 4,
  },

  // Bottom Sheet Modal Shared Styles
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContentBox: {
    height: '78%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.15)',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '900',
  },

  // Band Members
  addMemberFormClean: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  cleanFormHeaderTitle: {
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  inputLabelClean: {
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 3,
    marginTop: 2,
  },
  cleanInputBox: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 12.5,
    marginBottom: 8,
  },
  instTagChipCompact: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.3)',
  },
  instTagTextCompact: {
    fontSize: 10,
    color: '#94a3b8',
  },
  instTagChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.3)',
  },
  instTagText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  confirmMemberAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  memberRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  memberAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberNameText: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  roleTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  roleTagText: {
    fontSize: 9.5,
    fontWeight: '800',
  },

  // Style Chart
  chartSummaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  summaryVal: {
    fontSize: 22,
    fontWeight: '900',
  },
  summaryLbl: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  chartRow: {
    marginBottom: 12,
  },
  chartTagTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  chartTagPercent: {
    fontSize: 11.5,
    fontWeight: '900',
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

  // Picker Modal
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  pickerModalBox: {
    height: '82%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  pickerSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  pickerSearchInput: {
    flex: 1,
    fontSize: 12.5,
    padding: 0,
  },
  pickerActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  pickerSelectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pickerSongRowCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    gap: 12,
  },
  checkboxSquare: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerSongName: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  pickerConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 10,
  },

  // Custom Finance Modal Box
  customEditorBox: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  typePillBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.3)',
  },
  typePillText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94a3b8',
  },
  inputLabel: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 13,
    marginBottom: 10,
  },
  modalCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalSaveBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
});
