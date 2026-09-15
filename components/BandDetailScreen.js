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
import SetlistCard from './SetlistCard';

const { width } = Dimensions.get('window');

const getBandInitials = (name) => {
  if (!name || !name.trim()) return '?';
  const words = name.trim().split(/\s+/);
  const initials = words.map(w => w[0]).join('').toUpperCase();
  return initials.slice(0, 3);
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
  const [selectedStyleFilter, setSelectedStyleFilter] = useState('');
  const [showGeneralPickerModal, setShowGeneralPickerModal] = useState(false);
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
        setBandSongs(bSongs);

        const bFin = await bandService.getBandFinances(band.id);
        setFinances(bFin);
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
  let totalSetlistPending = 0;

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
  const totalPending = totalSetlistPending + customPendingIncome;

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

  // General songs not yet in band's repertoire
  const bandSongIds = new Set(bandSongs.map(s => s.id));
  const availableGeneralSongs = allGeneralSongs.filter(s => {
    if (s.id < 0) return false;
    if (bandSongIds.has(s.id)) return false;
    if (!pickerSearch.trim()) return true;
    const q = pickerSearch.toLowerCase().trim();
    return (s.name || '').toLowerCase().includes(q) || (s.originalBand || '').toLowerCase().includes(q);
  });

  // Handlers for Repertoire
  const handleToggleLinkSongToBand = async (songId) => {
    try {
      if (typeof Vibration !== 'undefined') Vibration.vibrate(10);
      if (bandSongIds.has(songId)) {
        await bandService.removeSongFromBand(band.id, songId);
      } else {
        await bandService.addSongToBand(band.id, songId);
      }
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUnlinkSongConfirm = (song) => {
    Alert.alert(
      t('attention') || 'Atenção',
      `Remover "${song.name}" do repertório da banda ${band.name}? (A música continuará salva no Repertório Geral)`,
      [
        { text: t('cancel') || 'Cancelar', style: 'cancel' },
        {
          text: t('remove') || 'Remover',
          style: 'destructive',
          onPress: async () => {
            await handleToggleLinkSongToBand(song.id);
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
      Alert.alert(t('attention') || 'Atenção', 'Por favor, informe o título do lançamento.');
      return;
    }
    const parsedAmt = parseCurrency(finAmount);
    if (parsedAmt <= 0) {
      Alert.alert(t('attention') || 'Atenção', 'Por favor, informe um valor maior que zero.');
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
            CAMADA 1: CABEÇALHO SUPERIOR DA BANDA (ESCUTO)
           ======================================================== */}
        <View style={[styles.headerBar, { backgroundColor: isDark ? '#0f172a' : '#1e293b' }]}>
          {/* Linha Superior: Botão Voltar, Avatar/Logo, Titulo e Ações */}
          <View style={styles.headerMainRow}>
            {/* Voltar */}
            <Pressable
              style={({ pressed }) => [styles.headerBackBtn, pressed && { opacity: 0.7 }]}
              onPress={onBack}
            >
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </Pressable>

            {/* Avatar / Logo da Banda */}
            <View style={styles.bandHeaderAvatar}>
              {band.imageUri ? (
                <Image source={{ uri: band.imageUri }} style={styles.bandHeaderImage} />
              ) : (
                <View style={[styles.bandHeaderPlaceholder, { backgroundColor: colors.primary }]}>
                  <Text style={styles.bandHeaderInitials}>{getBandInitials(band.name)}</Text>
                </View>
              )}
            </View>

            {/* Informações da Banda */}
            <View style={styles.headerTitleBox}>
              <Text style={styles.headerBandName} numberOfLines={1}>
                {band.name}
              </Text>
              <Text style={styles.headerSubtitleText}>
                {bandSongs.length} {t('songsBadge') || 'músicas'} • {bandSetlists.length} setlists
              </Text>
            </View>

            {/* Ações: Editar e Excluir */}
            <View style={styles.headerActionsGroup}>
              <Pressable
                style={({ pressed }) => [styles.headerIconBtn, pressed && { opacity: 0.7 }]}
                onPress={() => onEditBand(band)}
              >
                <Ionicons name="pencil-outline" size={17} color="#fff" />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.headerIconBtn, { backgroundColor: 'rgba(239,68,68,0.2)' }, pressed && { opacity: 0.7 }]}
                onPress={() => onDeleteBand(band.id)}
              >
                <Ionicons name="trash-outline" size={17} color="#ef4444" />
              </Pressable>
            </View>
          </View>

          {/* Badges de Estatísticas Rápidas */}
          <View style={styles.headerStatsRow}>
            <View style={[styles.headerStatBadge, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
              <Ionicons name="musical-notes-outline" size={12} color={colors.primary} />
              <Text style={[styles.headerStatText, { color: '#fff' }]}>
                {bandSongs.length} Repertório
              </Text>
            </View>

            <View style={[styles.headerStatBadge, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
              <Ionicons name="list-outline" size={12} color={colors.secondary} />
              <Text style={[styles.headerStatText, { color: '#fff' }]}>
                {bandSetlists.length} Setlists
              </Text>
            </View>

            <View style={[styles.headerStatBadge, { backgroundColor: netBalance >= 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)' }]}>
              <Ionicons name="cash-outline" size={12} color={netBalance >= 0 ? '#22c55e' : '#ef4444'} />
              <Text style={[styles.headerStatText, { color: netBalance >= 0 ? '#4ade80' : '#f87171', fontWeight: '900' }]}>
                R$ {netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>

          {/* Abas de Navegação (Pílulas Superiores) */}
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
                size={14}
                color={activeTab === 'repertoire' ? '#fff' : '#94a3b8'}
              />
              <Text style={[styles.navTabText, activeTab === 'repertoire' && styles.navTabTextActive]}>
                REPERTÓRIO
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
                size={14}
                color={activeTab === 'financial' ? '#fff' : '#94a3b8'}
              />
              <Text style={[styles.navTabText, activeTab === 'financial' && styles.navTabTextActive]}>
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
                name="list"
                size={14}
                color={activeTab === 'setlists' ? '#fff' : '#94a3b8'}
              />
              <Text style={[styles.navTabText, activeTab === 'setlists' && styles.navTabTextActive]}>
                SETLISTS ({bandSetlists.length})
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ========================================================
            CAMADA 3: CONTEÚDO DAS ABAS
           ======================================================== */}
        <View style={{ flex: 1 }}>
          {/* ==================== ABA 1: REPERTÓRIO ==================== */}
          {activeTab === 'repertoire' && (
            <View style={{ flex: 1, paddingHorizontal: 12, paddingTop: 10 }}>
              {/* Barra de Ações Rápidas: + Nova Música | + Adicionar do Repertório Geral */}
              <View style={styles.tabActionBar}>
                <Pressable
                  style={({ pressed }) => [
                    styles.tabActionBtnPrimary,
                    { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }
                  ]}
                  onPress={() => onOpenNewSongForBand(band)}
                >
                  <Ionicons name="add-circle" size={16} color="#fff" />
                  <Text style={styles.tabActionBtnText}>+ NOVA MÚSICA</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.tabActionBtnSecondary,
                    { backgroundColor: colors.secondary + '20', borderColor: colors.secondary + '60' },
                    pressed && { opacity: 0.85 }
                  ]}
                  onPress={() => setShowGeneralPickerModal(true)}
                >
                  <Ionicons name="library-outline" size={15} color={colors.secondary} />
                  <Text style={[styles.tabActionBtnText, { color: colors.secondary }]}>
                    DO REPERTÓRIO GERAL
                  </Text>
                </Pressable>
              </View>

              {/* Busca e Filtros de Gênero */}
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
              </View>

              {/* Chips de Estilo Musical */}
              {uniqueBandStyles.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10, maxHeight: 32 }}>
                  <Pressable
                    style={[
                      styles.styleTagChip,
                      !selectedStyleFilter && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}
                    onPress={() => setSelectedStyleFilter('')}
                  >
                    <Text style={[styles.styleTagText, !selectedStyleFilter && { color: '#fff' }]}>TODOS</Text>
                  </Pressable>
                  {uniqueBandStyles.map(tag => {
                    const isSel = selectedStyleFilter === tag;
                    return (
                      <Pressable
                        key={tag}
                        style={[
                          styles.styleTagChip,
                          isSel && { backgroundColor: colors.primary, borderColor: colors.primary }
                        ]}
                        onPress={() => setSelectedStyleFilter(isSel ? '' : tag)}
                      >
                        <Text style={[styles.styleTagText, isSel && { color: '#fff' }]}>{tag}</Text>
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
                      Nenhuma música cadastrada no repertório desta banda ainda.
                    </Text>
                    <Pressable
                      style={[styles.emptyAddBtn, { backgroundColor: colors.primary }]}
                      onPress={() => setShowGeneralPickerModal(true)}
                    >
                      <Ionicons name="add" size={16} color="#fff" />
                      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>
                        Adicionar do Repertório Geral
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
              {/* Dashboard Financeiro (4 Cards Inteligentes) */}
              <View style={styles.financeGrid}>
                {/* 1. Saldo Líquido */}
                <View style={[styles.financeCard, { backgroundColor: netBalance >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', borderColor: netBalance >= 0 ? '#22c55e40' : '#ef444440' }]}>
                  <Text style={[styles.financeCardLabel, { color: netBalance >= 0 ? '#22c55e' : '#ef4444' }]}>
                    SALDO LÍQUIDO ACUMULADO
                  </Text>
                  <Text style={[styles.financeCardValue, { color: netBalance >= 0 ? '#22c55e' : '#ef4444' }]}>
                    R$ {netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Text>
                  <Text style={[styles.financeCardSubtext, { color: colors.textMuted }]}>
                    {netBalance >= 0 ? 'Lucro positivo da banda' : 'Atenção: Saldo devedor'}
                  </Text>
                </View>

                {/* 2. Total Receita / Entradas */}
                <View style={styles.financeRowCards}>
                  <View style={[styles.financeMiniCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="arrow-down-circle" size={14} color="#22c55e" />
                      <Text style={[styles.miniCardLabel, { color: colors.textMuted }]}>ENTRADAS (CACHÊS)</Text>
                    </View>
                    <Text style={[styles.miniCardValue, { color: colors.text }]}>
                      R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>

                  {/* 3. Total Saídas / Despesas */}
                  <View style={[styles.financeMiniCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="arrow-up-circle" size={14} color="#ef4444" />
                      <Text style={[styles.miniCardLabel, { color: colors.textMuted }]}>SAÍDAS (CUSTOS)</Text>
                    </View>
                    <Text style={[styles.miniCardValue, { color: colors.text }]}>
                      R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Botão para Adicionar Novo Lançamento Manual */}
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

              {/* Seção 1: Cachês dos Setlists / Shows */}
              <Text style={[styles.financeSectionTitle, { color: colors.text }]}>
                CACHÊS DOS SHOWS E EVENTOS ({bandSetlists.filter(s => s.type === 'show' && s.cachê).length})
              </Text>

              {bandSetlists.filter(s => s.type === 'show' && s.cachê).length === 0 ? (
                <View style={[styles.emptyFinanceBox, { borderColor: colors.border }]}>
                  <Text style={[styles.emptyFinanceText, { color: colors.textMuted }]}>
                    Nenhum show com cachê informado nos setlists desta banda.
                  </Text>
                </View>
              ) : (
                bandSetlists.filter(s => s.type === 'show' && s.cachê).map(sl => {
                  const val = parseCurrency(sl.cachê);
                  return (
                    <View
                      key={sl.id}
                      style={[
                        styles.financeItemRow,
                        { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="mic-outline" size={14} color={colors.primary} />
                          <Text style={[styles.financeItemTitle, { color: colors.text }]} numberOfLines={1}>
                            {sl.name || 'Show da Banda'}
                          </Text>
                        </View>
                        <Text style={[styles.financeItemDate, { color: colors.textMuted }]}>
                          Data: {sl.date || 'Não informada'} {sl.local ? `• ${sl.local}` : ''}
                        </Text>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.financeItemAmount, { color: '#22c55e' }]}>
                          + R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </Text>
                        <View style={[styles.paidStatusBadge, { backgroundColor: '#22c55e20', borderColor: '#22c55e60' }]}>
                          <Ionicons name="checkmark-circle" size={10} color="#22c55e" />
                          <Text style={[styles.paidStatusText, { color: '#22c55e' }]}>Cachê de Setlist</Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}

              {/* Seção 2: Lançamentos Financeiros Manuais (Despesas e Receitas Extra) */}
              <Text style={[styles.financeSectionTitle, { color: colors.text, marginTop: 20 }]}>
                LANÇAMENTOS E DESPESAS DA BANDA ({finances.length})
              </Text>

              {finances.length === 0 ? (
                <View style={[styles.emptyFinanceBox, { borderColor: colors.border }]}>
                  <Text style={[styles.emptyFinanceText, { color: colors.textMuted }]}>
                    Nenhum lançamento manual (ensaio, frete, manutenção) registrado.
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
                            name={isInc ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
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

                        {/* Status Toggle (Pago vs Pendente) */}
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

          {/* ==================== ABA 3: SETLISTS DA BANDA ==================== */}
          {activeTab === 'setlists' && (
            <View style={{ flex: 1, paddingHorizontal: 12, paddingTop: 10 }}>
              {/* Botão + Novo Setlist */}
              <View style={{ marginBottom: 12 }}>
                <Pressable
                  style={({ pressed }) => [
                    styles.tabActionBtnPrimary,
                    { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }
                  ]}
                  onPress={() => onOpenNewSetlistForBand(band)}
                >
                  <Ionicons name="add-circle" size={18} color="#fff" />
                  <Text style={styles.tabActionBtnText}>+ NOVO SETLIST DA BANDA</Text>
                </Pressable>
              </View>

              {/* Listagem de Setlists da Banda */}
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
              >
                {bandSetlists.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="list-outline" size={44} color={colors.textMuted} />
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                      Nenhum setlist criado para a banda {band.name} ainda.
                    </Text>
                    <Pressable
                      style={[styles.emptyAddBtn, { backgroundColor: colors.primary }]}
                      onPress={() => onOpenNewSetlistForBand(band)}
                    >
                      <Ionicons name="add" size={16} color="#fff" />
                      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>
                        Criar Primeiro Setlist
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  bandSetlists.map(setlist => (
                    <SetlistCard
                      key={setlist.id}
                      setlist={setlist}
                      onEdit={() => onOpenNewSetlistForBand(band, setlist)}
                      onDelete={() => {}}
                      onCopy={() => {}}
                      onShare={onShareSetlist}
                      onStartPerformance={onStartPerformance}
                      onExportDoc={onExportDoc}
                      onToggleFavorite={onToggleFavoriteSetlist}
                      expanded={false}
                      onToggleExpand={() => {}}
                      onToggleRehearsalStatus={onToggleRehearsalStatus}
                      onUpdateSongRehearsalNotes={onUpdateSongRehearsalNotes}
                      onEditSong={onSelectSong}
                    />
                  ))
                )}
              </ScrollView>
            </View>
          )}
        </View>

        {/* ========================================================
            MODAL 1: SELETOR DE MÚSICAS DO REPERTÓRIO GERAL
           ======================================================== */}
        <Modal
          visible={showGeneralPickerModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowGeneralPickerModal(false)}
        >
          <View style={[styles.pickerOverlay, { backgroundColor: 'rgba(0,0,0,0.75)' }]}>
            <View style={[styles.pickerModalBox, { backgroundColor: colors.background }]}>
              {/* Cabeçalho */}
              <View style={styles.pickerHeader}>
                <Text style={[styles.pickerTitle, { color: colors.text }]}>
                  Adicionar ao Repertório de {band.name}
                </Text>
                <Pressable onPress={() => setShowGeneralPickerModal(false)}>
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </Pressable>
              </View>

              {/* Busca */}
              <View style={styles.pickerSearchRow}>
                <Ionicons name="search-outline" size={15} color={colors.textMuted} style={{ marginRight: 6 }} />
                <TextInput
                  style={[styles.pickerSearchInput, { color: colors.inputText }]}
                  placeholder="Buscar no repertório geral..."
                  placeholderTextColor={colors.textMuted}
                  value={pickerSearch}
                  onChangeText={setPickerSearch}
                />
              </View>

              {/* Lista de Músicas Disponíveis */}
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {availableGeneralSongs.length === 0 ? (
                  <Text style={{ fontStyle: 'italic', color: colors.textMuted, textAlign: 'center', marginVertical: 20 }}>
                    Todas as músicas disponíveis já estão no repertório da banda.
                  </Text>
                ) : (
                  availableGeneralSongs.map(s => (
                    <Pressable
                      key={s.id}
                      style={({ pressed }) => [
                        styles.pickerSongRow,
                        { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' },
                        pressed && { opacity: 0.7 }
                      ]}
                      onPress={() => handleToggleLinkSongToBand(s.id)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.pickerSongName, { color: colors.text }]}>{s.name}</Text>
                        <Text style={{ fontSize: 11, color: colors.textMuted }}>{s.originalBand}</Text>
                      </View>
                      <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                    </Pressable>
                  ))
                )}
              </ScrollView>

              <Pressable
                style={[styles.pickerConfirmBtn, { backgroundColor: colors.primary }]}
                onPress={() => setShowGeneralPickerModal(false)}
              >
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>CONCLUÍDO</Text>
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
                placeholder="Ex: Aluguel de Estúdio Ensaio, Frete Som..."
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
  headerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  headerBackBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bandHeaderAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
  },
  bandHeaderImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bandHeaderPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bandHeaderInitials: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
  },
  headerTitleBox: {
    flex: 1,
  },
  headerBandName: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  headerSubtitleText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  headerActionsGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  headerIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header Stats
  headerStatsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  headerStatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 10,
  },
  headerStatText: {
    fontSize: 10.5,
    fontWeight: '700',
  },

  // Nav Tabs Bar
  navTabsBar: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 4,
    borderRadius: 14,
  },
  navTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
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
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  tabActionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabActionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  tabActionBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  // Search & Filter
  searchFilterRow: {
    marginBottom: 8,
  },
  searchBox: {
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
  styleTagChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.3)',
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  styleTagText: {
    fontSize: 10,
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

  // Picker Modal
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  pickerModalBox: {
    height: '75%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pickerTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  pickerSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  pickerSearchInput: {
    flex: 1,
    fontSize: 12.5,
    padding: 0,
  },
  pickerSongRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
  },
  pickerSongName: {
    fontSize: 13,
    fontWeight: '800',
  },
  pickerConfirmBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
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
