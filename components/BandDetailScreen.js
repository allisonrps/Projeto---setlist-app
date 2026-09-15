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

  // Setlist cachês auto-derived entries
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
            CAMADA 1: CABEÇALHO SUPERIOR DA BANDA (TOTALMENTE CENTRALIZADO)
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

          {/* Hero Banner Central Area */}
          <View style={styles.heroCenterSection}>
            {/* Avatar Frame with Glowing Primary Border */}
            <View style={[styles.bandHeaderAvatarHero, { borderColor: colors.primary }]}>
              {band.imageUri ? (
                <Image source={{ uri: band.imageUri }} style={styles.bandHeaderImage} />
              ) : (
                <View style={[styles.bandHeaderPlaceholder, { backgroundColor: colors.primary }]}>
                  <Text style={styles.bandHeaderInitials}>{getBandInitials(band.name)}</Text>
                </View>
              )}
            </View>

            {/* Title & Subtitle Badge */}
            <View style={styles.heroTitleBox}>
              <Text
                style={styles.headerBandNameHero}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.8}
              >
                {band.name}
              </Text>
              
              {/* Subtitle Pill Badge */}
              <View style={[styles.heroSubBadge, { backgroundColor: colors.primary + '22', borderColor: colors.primary + '45' }]}>
                <Ionicons name="people" size={11} color={colors.primary} />
                <Text style={[styles.heroSubBadgeText, { color: colors.primary }]}>
                  PROJETO MUSICAL • {bandSongs.length} {bandSongs.length === 1 ? 'MÚSICA' : 'MÚSICAS'}
                </Text>
              </View>
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

              {/* Busca e Botão Olho de Tags (Mesmo padrão da coleção) */}
              <View style={styles.searchFilterRow}>
                <View style={[styles.searchBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: colors.border }]}>
                  <Ionicons name="search-outline" size={15} color={colors.textMuted} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.inputText }]}
                    placeholder="Buscar no repertório da banda..."
                    placeholderTextColor={colors.textMuted}
                    value={repertoireSearch}
                    onChangeText={setRepertoireSearch}
                  />
                  {repertoireSearch ? (
                    <Pressable onPress={() => setRepertoireSearch('')}>
                      <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                    </Pressable>
                  ) : null}
                </View>

                {/* Botão Olho de Ocultar/Exibir Tags */}
                <Pressable
                  style={({ pressed }) => [
                    styles.eyeFilterBtn,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', borderColor: showStyleFilters ? colors.primary : colors.border },
                    pressed && { opacity: 0.7 }
                  ]}
                  onPress={() => setShowStyleFilters(!showStyleFilters)}
                >
                  <Ionicons
                    name={showStyleFilters ? "eye-outline" : "eye-off-outline"}
                    size={16}
                    color={showStyleFilters ? colors.primary : colors.textMuted}
                  />
                </Pressable>
              </View>

              {/* Carousel de Chips de Estilo Musical (Pílulas Menores) */}
              {showStyleFilters && uniqueBandStyles.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10, maxHeight: 30 }}>
                  <Pressable
                    style={[
                      styles.styleTagChipCompact,
                      !selectedStyleFilter && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}
                    onPress={() => setSelectedStyleFilter('')}
                  >
                    <Text style={[styles.styleTagTextCompact, !selectedStyleFilter && { color: '#fff' }]}>TODOS</Text>
                  </Pressable>
                  {uniqueBandStyles.map(tag => {
                    const isSel = selectedStyleFilter === tag;
                    return (
                      <Pressable
                        key={tag}
                        style={[
                          styles.styleTagChipCompact,
                          isSel && { backgroundColor: colors.primary, borderColor: colors.primary }
                        ]}
                        onPress={() => setSelectedStyleFilter(isSel ? '' : tag)}
                      >
                        <Text style={[styles.styleTagTextCompact, isSel && { color: '#fff' }]}>{tag}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}

              {/* Lista de Músicas do Repertório da Banda */}
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 30 }}
                showsVerticalScrollIndicator={false}
              >
                {filteredBandSongs.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="musical-notes-outline" size={44} color={colors.textMuted} />
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                      Nenhuma música vinculada ao repertório da banda {band.name} ainda.
                    </Text>
                    <Pressable
                      style={[styles.emptyAddBtn, { backgroundColor: colors.primary }]}
                      onPress={handleOpenSongPicker}
                    >
                      <Ionicons name="add-circle-outline" size={16} color="#fff" />
                      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>
                        Adicionar da Coleção de Músicas
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  filteredBandSongs.map(song => (
                    <View key={song.id} style={{ position: 'relative' }}>
                      <SongListItem
                        song={song}
                        onPress={() => onSelectSong(song)}
                        onToggleFavorite={onToggleFavoriteSong}
                      />
                      {/* Botão de Desvincular do Repertório da Banda */}
                      <Pressable
                        style={({ pressed }) => [
                          styles.unlinkBtn,
                          { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)' },
                          pressed && { opacity: 0.6 }
                        ]}
                        onPress={() => handleUnlinkSongConfirm(song)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
            <ScrollView
              style={{ flex: 1, paddingHorizontal: 12, paddingTop: 10 }}
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Dashboard Financeiro (Cards) */}
              <View style={styles.financeGrid}>
                {/* Saldo Líquido */}
                <View style={[styles.financeCard, { backgroundColor: netBalance >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', borderColor: netBalance >= 0 ? '#22c55e40' : '#ef444440' }]}>
                  <Text style={[styles.financeCardLabel, { color: netBalance >= 0 ? '#22c55e' : '#ef4444' }]}>
                    SALDO LÍQUIDO ACUMULADO
                  </Text>
                  <Text style={[styles.financeCardValue, { color: netBalance >= 0 ? '#22c55e' : '#ef4444' }]}>
                    R$ {netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Text>
                  <Text style={[styles.financeCardSubtext, { color: colors.textMuted }]}>
                    {netBalance >= 0 ? 'Lucro líquido acumulado da banda' : 'Atenção: Saldo devedor'}
                  </Text>
                </View>

                {/* Resumo de Entradas vs Custos */}
                <View style={styles.financeRowCards}>
                  <View style={[styles.financeMiniCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="arrow-down-circle" size={14} color="#22c55e" />
                      <Text style={[styles.miniCardLabel, { color: colors.textMuted }]}>TOTAL CACHÊS / RECEITAS</Text>
                    </View>
                    <Text style={[styles.miniCardValue, { color: colors.text }]}>
                      R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>

                  <View style={[styles.financeMiniCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="arrow-up-circle" size={14} color="#ef4444" />
                      <Text style={[styles.miniCardLabel, { color: colors.textMuted }]}>DESPESAS / DESCONTOS</Text>
                    </View>
                    <Text style={[styles.miniCardValue, { color: colors.text }]}>
                      R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Botão de Novo Lançamento Manual */}
              <View style={{ marginVertical: 12 }}>
                <Pressable
                  style={({ pressed }) => [
                    styles.addFinanceBtn,
                    { backgroundColor: colors.primary, transform: [{ scale: pressed ? 0.98 : 1 }] }
                  ]}
                  onPress={handleOpenAddFinance}
                >
                  <Ionicons name="add-circle" size={18} color="#fff" />
                  <Text style={styles.addFinanceBtnText}>+ ADICIONAR LANÇAMENTO FINANCEIRO</Text>
                </Pressable>
              </View>

              {/* Seção 1: Eventos e Shows com Cachê */}
              <Text style={[styles.financeSectionTitle, { color: colors.text }]}>
                EVENTOS E SHOWS COM CACHÊ ({bandSetlists.filter(s => s.cachê).length})
              </Text>

              {bandSetlists.filter(s => s.cachê).length === 0 ? (
                <View style={[styles.emptyFinanceBox, { borderColor: colors.border }]}>
                  <Text style={[styles.emptyFinanceText, { color: colors.textMuted }]}>
                    Nenhum evento com cachê cadastrado para esta banda.
                  </Text>
                </View>
              ) : (
                bandSetlists.filter(s => s.cachê).map(sl => {
                  const val = parseCurrency(sl.cachê);
                  return (
                    <Pressable
                      key={sl.id}
                      style={({ pressed }) => [
                        styles.financeItemRow,
                        { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: colors.border },
                        pressed && { opacity: 0.8 }
                      ]}
                      onPress={() => onOpenNewSetlistForBand(band, sl)}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="mic" size={14} color={colors.primary} />
                          <Text style={[styles.financeItemTitle, { color: colors.text }]} numberOfLines={1}>
                            {sl.name || 'Evento da Banda'}
                          </Text>
                        </View>
                        <Text style={[styles.financeItemDate, { color: colors.textMuted }]}>
                          Data: {sl.date || 'Sem data'} {sl.local ? `• ${sl.local}` : ''}
                        </Text>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.financeItemAmount, { color: '#22c55e' }]}>
                          + R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </Text>
                        <View style={[styles.paidStatusBadge, { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: '#22c55e60' }]}>
                          <Ionicons name="checkmark-circle" size={10} color="#22c55e" />
                          <Text style={[styles.paidStatusText, { color: '#22c55e' }]}>Evento da Banda</Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })
              )}

              {/* Seção 2: Lançamentos Financeiros Manuais */}
              <Text style={[styles.financeSectionTitle, { color: colors.text, marginTop: 20 }]}>
                LANÇAMENTOS E DESPESAS DA BANDA ({finances.length})
              </Text>

              {finances.length === 0 ? (
                <View style={[styles.emptyFinanceBox, { borderColor: colors.border }]}>
                  <Text style={[styles.emptyFinanceText, { color: colors.textMuted }]}>
                    Nenhum lançamento manual (ensaio, transporte, som) registrado.
                  </Text>
                </View>
              ) : (
                finances.map(item => {
                  const isInc = item.type === 'income';
                  const isPaid = item.status === 'paid';
                  const amt = parseFloat(item.amount) || 0;

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.financeItemRow,
                        { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons
                            name={isInc ? 'arrow-down-circle' : 'arrow-up-circle'}
                            size={16}
                            color={isInc ? '#22c55e' : '#ef4444'}
                          />
                          <Text style={[styles.financeItemTitle, { color: colors.text }]} numberOfLines={1}>
                            {item.title}
                          </Text>
                        </View>
                        <Text style={[styles.financeItemDate, { color: colors.textMuted }]}>
                          {item.date ? item.date : 'Sem data'} {item.notes ? `• ${item.notes}` : ''}
                        </Text>
                      </View>

                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text style={[styles.financeItemAmount, { color: isInc ? '#22c55e' : '#ef4444' }]}>
                          {isInc ? '+' : '-'} R$ {amt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </Text>

                        {/* Status Toggle */}
                        <Pressable
                          style={[
                            styles.paidStatusBadge,
                            {
                              backgroundColor: isPaid ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)',
                              borderColor: isPaid ? '#22c55e' : '#eab308'
                            }
                          ]}
                          onPress={() => handleToggleFinanceStatus(item)}
                        >
                          <Ionicons
                            name={isPaid ? 'checkmark-circle' : 'time-outline'}
                            size={10}
                            color={isPaid ? '#22c55e' : '#eab308'}
                          />
                          <Text style={[styles.paidStatusText, { color: isPaid ? '#22c55e' : '#eab308' }]}>
                            {isPaid ? 'PAGO / RECEBIDO' : 'PENDENTE'}
                          </Text>
                        </Pressable>

                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                          <Pressable onPress={() => handleOpenEditFinance(item)}>
                            <Ionicons name="pencil" size={13} color={colors.primary} />
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

                            {/* Location Pill (Agora alinhado no mesmo flex row que as demais tags) */}
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
            MODAL 1: SELETOR DE MÚSICAS DA COLEÇÃO (COM CHECKBOXES)
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
            MODAL 2: ADICIONAR / EDITAR LANÇAMENTO FINANCEIRO
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
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.textMuted }]}>VALOR (R$) *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border }]}
                    placeholder="0,00"
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

              {/* Status: Pago vs Pendente */}
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>STATUS DE PAGAMENTO</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                <Pressable
                  style={[
                    styles.typePillBtn,
                    finStatus === 'paid' && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  onPress={() => setFinStatus('paid')}
                >
                  <Ionicons name="checkmark-circle" size={14} color={finStatus === 'paid' ? '#fff' : colors.textMuted} />
                  <Text style={[styles.typePillText, finStatus === 'paid' && { color: '#fff' }]}>PAGO / RECEBIDO</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.typePillBtn,
                    finStatus === 'pending' && { backgroundColor: '#eab308', borderColor: '#eab308' }
                  ]}
                  onPress={() => setFinStatus('pending')}
                >
                  <Ionicons name="time-outline" size={14} color={finStatus === 'pending' ? '#fff' : colors.textMuted} />
                  <Text style={[styles.typePillText, finStatus === 'pending' && { color: '#fff' }]}>PENDENTE</Text>
                </Pressable>
              </View>

              {/* Botões de Ação */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <Pressable
                  style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                  onPress={() => setShowAddFinanceModal(false)}
                >
                  <Text style={{ color: colors.text, fontWeight: '700' }}>CANCELAR</Text>
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
  headerBar: {
    paddingTop: Platform.OS === 'ios' ? 44 : 28,
    paddingHorizontal: 12,
    paddingBottom: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  headerMainRowCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenterColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  bandHeaderAvatarCentered: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 4,
  },
  bandHeaderImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bandHeaderPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bandHeaderInitials: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 18,
  },
  headerBandNameCentered: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  headerActionsGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.1)',
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
  eyeFilterBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
