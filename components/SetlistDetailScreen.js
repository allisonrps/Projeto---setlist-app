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
  Vibration,
  Animated,
  PanResponder,
  Image,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';
import { Ionicons } from '@expo/vector-icons';
import { DraggableSortableList } from './SetlistModal';
import PulsingStageButton from './PulsingStageButton';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width } = Dimensions.get('window');

function CircleHeaderActionBtn({ iconName, onPress, style }) {
  return (
    <View style={styles.actionCircleWrapper}>
      <Pressable
        style={({ pressed }) => [
          styles.circleActionBtn,
          style,
          pressed && { opacity: 0.7, transform: [{ scale: 0.92 }] },
        ]}
        onPress={onPress}
        hitSlop={6}
      >
        <Ionicons name={iconName} size={18} color="#ffffff" />
      </Pressable>
    </View>
  );
}

export default function SetlistDetailScreen({
  visible,
  setlist,
  bands = [],
  songs = [],
  onBack,
  onSave,
  onDelete,
  onCopy,
  onShare,
  onStartPerformance,
  onExportDoc,
  onToggleFavorite,
  onToggleRehearsalStatus,
  onUpdateSongRehearsalNotes,
  onEditSong,
}) {
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const isDark = colors.isDark;

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState('show'); // 'show' | 'ensaio' | 'repertório'
  const [bandId, setBandId] = useState(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [local, setLocal] = useState('');
  const [cachê, setCachê] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedSongs, setSelectedSongs] = useState([]);
  const [isFavorite, setIsFavorite] = useState(false);

  // UI Layers
  const [showDetailsLayer, setShowDetailsLayer] = useState(false); // Collapsed by default
  const [showSongSelectorModal, setShowSongSelectorModal] = useState(false);
  const [selectedPickerSongIds, setSelectedPickerSongIds] = useState(new Set());
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerSelectedStyle, setPickerSelectedStyle] = useState('');

  // Pause / Note Custom Editor
  const [editingCustomIndex, setEditingCustomIndex] = useState(null);
  const [tempCustomNotes, setTempCustomNotes] = useState('');
  const [tempCustomDuration, setTempCustomDuration] = useState('');
  const [isDraggingActive, setIsDraggingActive] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const initialDataRef = useRef(null);

  // Initialize or reset form data when setlist changes or modal opens
  useEffect(() => {
    if (visible) {
      if (setlist && setlist.id) {
        const sName = setlist.name || '';
        const sType = setlist.type || 'show';
        const sBandId = setlist.myBandId || (bands.length > 0 ? bands[0].id : null);
        const sDate = setlist.date || '';
        const sTime = setlist.time || '';
        const sLocal = setlist.local || '';
        const sCachê = setlist.cachê || '';
        const sNotes = setlist.notes || '';
        const sFav = Boolean(setlist.isFavorite);
        const sSongs = Array.isArray(setlist.songs)
          ? setlist.songs.map((s) => ({
              id: s.id,
              customNotes: s.customNotes || '',
              customDuration: s.customDuration || '',
              rehearsalStatus: s.rehearsalStatus || 'none',
              rehearsalNotes: s.rehearsalNotes || '',
            }))
          : [];

        setName(sName);
        setType(sType);
        setBandId(sBandId);
        setDate(sDate);
        setTime(sTime);
        setLocal(sLocal);
        setCachê(sCachê);
        setNotes(sNotes);
        setIsFavorite(sFav);
        setSelectedSongs(sSongs);
        setShowDetailsLayer(false); // Closed by default

        initialDataRef.current = {
          name: sName,
          type: sType,
          bandId: sBandId,
          date: sDate,
          time: sTime,
          local: sLocal,
          cachê: sCachê,
          notes: sNotes,
          songs: JSON.stringify(sSongs),
        };
      } else {
        // New setlist
        const defaultBandId = bands.length > 0 ? bands[0].id : null;
        setName('');
        setType('repertório');
        setBandId(defaultBandId);
        setDate('');
        setTime('');
        setLocal('');
        setCachê('');
        setNotes('');
        setIsFavorite(false);
        setSelectedSongs([]);
        setShowDetailsLayer(false); // Closed by default for all setlists

        initialDataRef.current = {
          name: '',
          type: 'repertório',
          bandId: defaultBandId,
          date: '',
          time: '',
          local: '',
          cachê: '',
          notes: '',
          songs: JSON.stringify([]),
        };
      }
      setShowSongSelectorModal(false);
      setSelectedPickerSongIds(new Set());
      setPickerSearch('');
      setPickerSelectedStyle('');
      setEditingCustomIndex(null);
    }
  }, [visible, setlist, bands]);

  const hasUnsavedChanges = () => {
    const init = initialDataRef.current;
    if (!init) return false;

    return (
      name !== init.name ||
      type !== init.type ||
      bandId !== init.bandId ||
      date !== init.date ||
      local !== init.local ||
      cachê !== init.cachê ||
      notes !== init.notes ||
      JSON.stringify(selectedSongs) !== init.songs
    );
  };

  const handleBackWithCheck = () => {
    if (hasUnsavedChanges()) {
      Alert.alert(
        t('attention'),
        t('unsavedChangesMsg'),
        [
          { text: t('cancel'), style: 'cancel' },
          {
            text: t('leaveWithoutSaving'),
            style: 'destructive',
            onPress: () => {
              onBack();
            },
          },
          {
            text: t('saveAndLeave'),
            onPress: () => {
              handleSaveInternal();
            },
          },
        ]
      );
    } else {
      onBack();
    }
  };

  const handleSaveInternal = () => {
    if (!name.trim()) {
      Alert.alert(t('attention'), t('alertSetlistName'));
      setShowDetailsLayer(true);
      return;
    }
    if (!bandId && bands.length > 0) {
      Alert.alert(t('attention'), t('alertSelectBand'));
      setShowDetailsLayer(true);
      return;
    }
    if (selectedSongs.length === 0) {
      Alert.alert(t('attention'), t('alertSelectSong'));
      return;
    }

    const payload = {
      ...(setlist || {}),
      name: name.trim(),
      type,
      myBandId: bandId,
      date: date.trim(),
      time: time.trim(),
      local: local.trim(),
      cachê: type === 'show' ? cachê.trim() : null,
      notes: notes.trim(),
      songIds: selectedSongs,
    };

    onSave(payload);
  };

  const handleDeleteWithConfirm = () => {
    if (!setlist || !setlist.id) return;
    Alert.alert(
      t('deleteSetlistConfirmTitle'),
      t('deleteSetlistConfirmMsg'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: () => {
            onDelete(setlist.id);
          },
        },
      ]
    );
  };

  // Song list actions
  const removeSongByIndex = (index) => {
    if (typeof Vibration !== 'undefined') Vibration.vibrate(10);
    const updated = selectedSongs.filter((_, idx) => idx !== index);
    setSelectedSongs(updated);
  };

  const handleReorderSongs = useCallback((newOrderIndices) => {
    setSelectedSongs((prev) => newOrderIndices.map((originalIdx) => prev[originalIdx]));
  }, []);

  const updateSongItem = (index, updatedProps) => {
    const updated = [...selectedSongs];
    updated[index] = { ...updated[index], ...updatedProps };
    setSelectedSongs(updated);
  };

  const handleAddPause = () => {
    if (typeof Vibration !== 'undefined') Vibration.vibrate(10);
    const newIdx = selectedSongs.length;
    setSelectedSongs(prev => [...prev, { id: -1, customNotes: '', customDuration: '10 min' }]);
    setEditingCustomIndex(newIdx);
    setTempCustomNotes('');
    setTempCustomDuration('10 min');
  };

  const handleAddNote = () => {
    if (typeof Vibration !== 'undefined') Vibration.vibrate(10);
    const newIdx = selectedSongs.length;
    setSelectedSongs(prev => [...prev, { id: -2, customNotes: '', customDuration: '' }]);
    setEditingCustomIndex(newIdx);
    setTempCustomNotes('');
    setTempCustomDuration('');
  };

  const handleOpenCustomItemEditor = (index, song) => {
    setEditingCustomIndex(index);
    setTempCustomNotes(song.customNotes || '');
    setTempCustomDuration(song.customDuration || '');
  };

  const handleCloseCustomItemEditor = () => {
    if (editingCustomIndex !== null) {
      const item = selectedSongs[editingCustomIndex];
      // If closing an empty note that was just added, remove it
      if (item && item.id === -2 && !item.customNotes && !tempCustomNotes.trim()) {
        setSelectedSongs(prev => prev.filter((_, idx) => idx !== editingCustomIndex));
      }
      setEditingCustomIndex(null);
    }
  };

  const handleSaveCustomItem = () => {
    if (editingCustomIndex !== null) {
      updateSongItem(editingCustomIndex, {
        customNotes: tempCustomNotes.trim(),
        customDuration: tempCustomDuration.trim()
      });
      setEditingCustomIndex(null);
    }
  };

  // Song Picker
  const handleOpenPicker = () => {
    setSelectedPickerSongIds(new Set());
    setPickerSearch('');
    setPickerSelectedStyle('');
    setShowSongSelectorModal(true);
  };

  const handleTogglePickerSong = (songId) => {
    if (typeof Vibration !== 'undefined') Vibration.vibrate(6);
    const updated = new Set(selectedPickerSongIds);
    if (updated.has(songId)) {
      updated.delete(songId);
    } else {
      updated.add(songId);
    }
    setSelectedPickerSongIds(updated);
  };

  // Filter songs for picker
  const filteredPickerSongs = songs.filter(s => {
    if (s.id < 0) return false;
    const matchesSearch = !pickerSearch.trim() || (
      (s.name && s.name.toLowerCase().includes(pickerSearch.toLowerCase())) ||
      (s.originalBand && s.originalBand.toLowerCase().includes(pickerSearch.toLowerCase())) ||
      (s.style && s.style.toLowerCase().includes(pickerSearch.toLowerCase()))
    );
    const matchesStyle = !pickerSelectedStyle || (
      s.style && s.style.toLowerCase().includes(pickerSelectedStyle.toLowerCase())
    );
    return matchesSearch && matchesStyle;
  });

  const isAllFilteredSelected = filteredPickerSongs.length > 0 && filteredPickerSongs.every(s => selectedPickerSongIds.has(s.id));

  const handleToggleSelectAllFiltered = () => {
    const updated = new Set(selectedPickerSongIds);
    if (isAllFilteredSelected) {
      filteredPickerSongs.forEach(s => updated.delete(s.id));
    } else {
      filteredPickerSongs.forEach(s => updated.add(s.id));
    }
    setSelectedPickerSongIds(updated);
  };

  const handleAddSelectedPickerSongs = () => {
    if (selectedPickerSongIds.size === 0) return;
    if (typeof Vibration !== 'undefined') Vibration.vibrate(15);
    const newItems = Array.from(selectedPickerSongIds).map(id => ({
      id,
      customNotes: '',
      customDuration: ''
    }));
    setSelectedSongs([...selectedSongs, ...newItems]);
    setShowSongSelectorModal(false);
  };

  // Map selected songs with full song details from repository
  const orderedSongs = selectedSongs
    .map((item) => {
      const songInfo = item.id === -1 
        ? { id: -1, name: t('pauseItem'), originalBand: '', style: t('pauseItem') } 
        : item.id === -2
        ? { id: -2, name: t('noteItem'), originalBand: '', style: t('noteItem') }
        : songs.find((s) => s.id === item.id);
      
      if (!songInfo) return null;
      return {
        ...songInfo,
        customNotes: item.customNotes,
        customDuration: item.customDuration,
        rehearsalStatus: item.rehearsalStatus,
        rehearsalNotes: item.rehearsalNotes,
      };
    })
    .filter(Boolean);

  // Total Estimated Duration calculation
  const calculateTotalDuration = (songItems) => {
    if (!songItems || songItems.length === 0) return '';
    let totalSeconds = 0;
    let hasDuration = false;

    const parseDuration = (durStr) => {
      if (!durStr) return 0;
      const clean = String(durStr).toLowerCase().replace(/min/g, '').trim();
      if (clean.includes(':')) {
        const parts = clean.split(':').map(p => parseInt(p, 10) || 0);
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        return 0;
      }
      const num = parseInt(clean, 10);
      return isNaN(num) ? 0 : num * 60;
    };

    for (const song of songItems) {
      if (song.id === -1) {
        if (song.customDuration && String(song.customDuration).trim()) {
          totalSeconds += parseDuration(song.customDuration);
          hasDuration = true;
        }
      } else if (song.duration && String(song.duration).trim()) {
        totalSeconds += parseDuration(song.duration);
        hasDuration = true;
      }
    }

    if (!hasDuration || totalSeconds === 0) return '';

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const totalDurationStr = calculateTotalDuration(orderedSongs);
  const totalRealSongsCount = selectedSongs.filter(s => s.id !== -1 && s.id !== -2).length;

  const currentBand = bands.find(b => String(b.id) === String(bandId));
  const bandDisplayName = currentBand ? currentBand.name : (bands.length === 0 ? '' : t('noBand'));

  const getBandInitials = (bName) => {
    if (!bName) return 'B';
    const words = bName.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return bName.slice(0, 2).toUpperCase();
  };

  const getCompactDate = (dStr) => {
    if (!dStr) return '';
    const clean = dStr.trim();
    if (clean.includes('-')) {
      const parts = clean.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    }
    if (clean.includes('/')) {
      const parts = clean.split('/');
      if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
    }
    return clean;
  };

  // 3 Layers Color Scheme:
  // Layer 1 (Header): Darkest
  const headerBg = isDark ? '#060911' : '#e2e8f0';
  // Layer 2 (Details): Medium Dark
  const detailsBg = isDark ? '#0f172a' : '#f1f5f9';
  // Layer 3 (Roteiro): Lighter
  const editorBg = isDark ? '#172033' : '#ffffff';

  const getTypeColor = (tVal) => {
    switch (tVal) {
      case 'show':
        return colors.primary;
      case 'ensaio':
      case 'rehearsal':
        return colors.secondary;
      case 'repertório':
      case 'repertoire':
        return colors.warning;
      default:
        return colors.success;
    }
  };

  const typeColor = getTypeColor(type);

  // Setlist payload helper for Stage / Share / Export
  const getFullSetlistPayload = () => ({
    ...(setlist || {}),
    id: setlist?.id || 'temp_' + Date.now(),
    name: name.trim() || t('setlistDefaultName'),
    type,
    myBandId: bandId,
    bandName: bandDisplayName,
    date: date.trim(),
    local: local.trim(),
    cachê: type === 'show' ? cachê.trim() : null,
    notes: notes.trim(),
    songs: orderedSongs,
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleBackWithCheck}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        {/* ========================================================
            CAMADA 1: HEADER (COR MAIS ESCURA)
            Ações Rápidas circulares, Título, Banda e Badges de Metadados
           ======================================================== */}
        <View style={[styles.headerLayer, { backgroundColor: headerBg }]}>
          {/* Top Controls Row */}
          <View style={styles.headerControlsRow}>
            {/* Back Button */}
            <Pressable
              style={({ pressed }) => [
                styles.circleActionBtn,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
                pressed && { opacity: 0.7, transform: [{ scale: 0.92 }] },
              ]}
              onPress={handleBackWithCheck}
              hitSlop={8}
            >
              <Ionicons name="arrow-back" size={20} color={colors.text} />
            </Pressable>

            {/* Right Action Buttons: Save, Share, Word, Delete, Mic (Stage) */}
            <View style={styles.headerActionsRight}>
              {/* Save */}
              <Pressable
                style={({ pressed }) => [
                  styles.circleActionBtn,
                  { backgroundColor: colors.success + '25' },
                  pressed && { opacity: 0.7, transform: [{ scale: 0.92 }] },
                ]}
                onPress={handleSaveInternal}
                hitSlop={6}
              >
                <Ionicons name="save-outline" size={18} color={colors.success} />
              </Pressable>

              {/* Duplicate / Copy Setlist */}
              {onCopy ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.circleActionBtn,
                    { backgroundColor: colors.primary + '25' },
                    pressed && { opacity: 0.7, transform: [{ scale: 0.92 }] },
                  ]}
                  onPress={() => {
                    if (setlist && setlist.id) {
                      onCopy(setlist.id);
                    } else {
                      Alert.alert(t('info'), t('alertSaveBeforeDuplicate'));
                    }
                  }}
                  hitSlop={6}
                >
                  <Ionicons name="copy-outline" size={18} color={colors.primary} />
                </Pressable>
              ) : null}

              {/* Share */}
              <Pressable
                style={({ pressed }) => [
                  styles.circleActionBtn,
                  { backgroundColor: colors.secondary + '20' },
                  pressed && { opacity: 0.7, transform: [{ scale: 0.92 }] },
                ]}
                onPress={() => onShare && onShare(getFullSetlistPayload())}
                hitSlop={6}
              >
                <Ionicons name="share-social-outline" size={18} color={colors.secondary} />
              </Pressable>

              {/* Export Word / Doc */}
              <Pressable
                style={({ pressed }) => [
                  styles.circleActionBtn,
                  { backgroundColor: '#2563eb20' },
                  pressed && { opacity: 0.7, transform: [{ scale: 0.92 }] },
                ]}
                onPress={() => onExportDoc && onExportDoc(getFullSetlistPayload(), 'word')}
                hitSlop={6}
              >
                <Ionicons name="document-text-outline" size={18} color="#3b82f6" />
              </Pressable>

              {/* Delete (if existing setlist) */}
              {setlist && setlist.id ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.circleActionBtn,
                    { backgroundColor: colors.danger + '20' },
                    pressed && { opacity: 0.7, transform: [{ scale: 0.92 }] },
                  ]}
                  onPress={handleDeleteWithConfirm}
                  hitSlop={6}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </Pressable>
              ) : null}

              {/* MODO PALCO COM EFEITO PULSANTE */}
              <PulsingStageButton
                variant="icon"
                onPress={() => onStartPerformance && onStartPerformance(getFullSetlistPayload())}
                color={colors.primary}
                iconName="mic"
              />
            </View>
          </View>

          {/* Header Event Container: Logo da banda à esquerda em CÍRCULO ocupando 2 linhas + Coluna (Linha 1: Tag de Tipo + Nome do Evento, Linha 2: Tags com primária/secundária) */}
          <View style={styles.headerEventContainer}>
            {/* Logo da Banda à esquerda (Círculo) */}
            <Pressable
              onPress={() => setShowDetailsLayer(prev => !prev)}
              style={({ pressed }) => [
                styles.headerBandLogoBox,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)',
                  opacity: pressed ? 0.8 : 1,
                }
              ]}
              hitSlop={6}
              accessibilityLabel={`Banda: ${bandDisplayName || 'Selecionar banda'}`}
            >
              {currentBand?.imageUri ? (
                <Image source={{ uri: currentBand.imageUri }} style={styles.headerBandLogoImg} />
              ) : (
                <View style={[styles.headerBandLogoPlaceholder, { backgroundColor: colors.primary + '18' }]}>
                  <Text style={[styles.headerBandLogoInitial, { color: colors.primary }]}>
                    {getBandInitials(currentBand?.name)}
                  </Text>
                </View>
              )}
            </Pressable>

            {/* Coluna com as 2 linhas */}
            <View style={styles.headerEventInfoCol}>
              {/* Linha 1: Tag de Tipo (SHOW/ENSAIO/REPERTÓRIO) NA FRENTE + Nome do Evento */}
              <View style={styles.headerEventNameRow}>
                <Pressable
                  onPress={() => setShowDetailsLayer(prev => !prev)}
                  style={[
                    styles.headerTypePill,
                    {
                      backgroundColor: typeColor + '20',
                      borderColor: typeColor + '40',
                    }
                  ]}
                  hitSlop={4}
                >
                  <Ionicons 
                    name={type === 'show' ? 'mic' : type === 'ensaio' ? 'musical-notes' : 'clipboard'} 
                    size={10.5} 
                    color={typeColor} 
                  />
                  <Text style={[styles.headerTypePillText, { color: typeColor }]}>
                    {type.toUpperCase()}
                  </Text>
                </Pressable>

                <TextInput
                  style={[
                    styles.headerTitleInlineInput,
                    { color: colors.text, fontSize: 16 }
                  ]}
                  value={name}
                  onChangeText={setName}
                  placeholder={t('setlistNamePlaceholder') || 'Nome do Evento'}
                  placeholderTextColor={colors.textMuted}
                  maxLength={200}
                  autoComplete="off"
                  importantForAutofill="no"
                  textAlign="left"
                />
              </View>

              {/* Linha 2: Tags Abaixo (Cores Primária e Secundária) */}
              <View style={styles.headerBadgesRow}>
                {/* Tag de Músicas: SÓ O ÍCONE E O NÚMERO (Cor Primária) */}
                <View style={[styles.headerMetaBadge, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '35' }]}>
                  <Ionicons name="musical-notes" size={11} color={colors.primary} />
                  <Text style={[styles.headerMetaBadgeText, { color: colors.primary }]}>
                    {totalRealSongsCount}
                  </Text>
                </View>

                {/* Tag de Duração (Cor Secundária) */}
                {totalDurationStr ? (
                  <View style={[styles.headerMetaBadge, { backgroundColor: colors.secondary + '18', borderColor: colors.secondary + '35' }]}>
                    <Ionicons name="time-outline" size={11} color={colors.secondary} />
                    <Text style={[styles.headerMetaBadgeText, { color: colors.secondary }]}>
                      {totalDurationStr}
                    </Text>
                  </View>
                ) : null}

                {/* Tag de Data Simplificada (Cor Primária) */}
                {date ? (
                  <View style={[styles.headerMetaBadge, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '35' }]}>
                    <Ionicons name="calendar-outline" size={11} color={colors.primary} />
                    <Text style={[styles.headerMetaBadgeText, { color: colors.primary }]}>
                      {getCompactDate(date)}
                    </Text>
                  </View>
                ) : null}

                {/* Tag de Horário (Cor Secundária) */}
                {time ? (
                  <View style={[styles.headerMetaBadge, { backgroundColor: colors.secondary + '18', borderColor: colors.secondary + '35' }]}>
                    <Ionicons name="alarm-outline" size={11} color={colors.secondary} />
                    <Text style={[styles.headerMetaBadgeText, { color: colors.secondary, fontWeight: '800' }]}>
                      {time}
                    </Text>
                  </View>
                ) : null}

                {/* Tag de Local (Cor Primária) */}
                {local ? (
                  <View style={[styles.headerMetaBadge, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '35', maxWidth: 110 }]}>
                    <Ionicons name="location-outline" size={11} color={colors.primary} />
                    <Text style={[styles.headerMetaBadgeText, { color: colors.primary }]} numberOfLines={1}>
                      {local}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        {/* ========================================================
            CAMADA 2: DETALHES (ESCURECIDO, EXPANSÍVEL COM SETINHA v)
            Tipo de evento, Banda, Data, Local, Cachê, Observações
           ======================================================== */}
        <View style={[styles.detailsLayer, { backgroundColor: detailsBg }]}>
          {/* Toggle Button */}
          <Pressable
            style={({ pressed }) => [
              styles.detailsToggleBar,
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => setShowDetailsLayer(!showDetailsLayer)}
          >
            <View style={styles.detailsToggleLeft}>
              <Ionicons
                name={showDetailsLayer ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.primary}
              />
              <Text style={[styles.detailsToggleTitle, { color: colors.text }]}>
                {t('setlistTabDetails')}
              </Text>
            </View>
          </Pressable>

          {/* Collapsible Details Content (Expandido completo sem rolagem interna) */}
          {showDetailsLayer && (
            <View style={styles.detailsForm}>
                {/* Row 1: Tipo do Setlist */}
                <View style={{ marginBottom: 10 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
                    {t('typeText')}
                  </Text>
                  <View style={styles.pillSelectorRow}>
                    {[
                      { key: 'show', label: t('show'), icon: 'mic-outline' },
                      { key: 'ensaio', label: t('rehearsal'), icon: 'musical-notes-outline' }
                    ].map((item) => {
                      const isSelected = type === item.key;
                      const itemColor = getTypeColor(item.key);
                      return (
                        <Pressable
                          key={item.key}
                          style={({ pressed }) => [
                            styles.pillOptionBtn,
                            {
                              backgroundColor: isSelected
                                ? itemColor
                                : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                            },
                            pressed && { opacity: 0.8 },
                          ]}
                          onPress={() => setType(item.key)}
                        >
                          <Ionicons
                            name={item.icon}
                            size={13}
                            color={isSelected ? '#ffffff' : colors.textMuted}
                          />
                          <Text
                            style={[
                              styles.pillOptionText,
                              { color: isSelected ? '#ffffff' : colors.textMuted, fontWeight: isSelected ? '800' : '600' }
                            ]}
                          >
                            {item.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Row 2: Banda Vinculada */}
                {bands.length > 0 && (
                  <View style={{ marginBottom: 10 }}>
                    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
                      {t('band')}
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 6, paddingVertical: 2 }}
                    >
                      {bands.map((b) => {
                        const isSelected = String(bandId) === String(b.id);
                        return (
                          <Pressable
                            key={b.id}
                            style={({ pressed }) => [
                              styles.pillOptionBtn,
                              {
                                backgroundColor: isSelected
                                  ? colors.secondary
                                  : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                              },
                              pressed && { opacity: 0.8 },
                            ]}
                            onPress={() => setBandId(b.id)}
                          >
                            <Ionicons
                              name="people-outline"
                              size={13}
                              color={isSelected ? '#ffffff' : colors.textMuted}
                            />
                            <Text
                              style={[
                                styles.pillOptionText,
                                { color: isSelected ? '#ffffff' : colors.textMuted, fontWeight: isSelected ? '800' : '600' }
                              ]}
                            >
                              {b.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* Row 3: Data & Horário */}
                <View style={styles.formTwoColumns}>
                  <View style={{ flex: 1.1 }}>
                    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
                      {t('dateLabel')}
                    </Text>
                    <Pressable
                      onPress={() => setShowDatePicker(true)}
                      style={({ pressed }) => [
                        styles.cleanInput,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          opacity: pressed ? 0.7 : 1
                        }
                      ]}
                    >
                      <Text style={{ color: date ? colors.inputText : colors.textMuted, fontSize: 13, fontWeight: date ? '600' : '400' }}>
                        {date || ''}
                      </Text>
                      <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                    </Pressable>

                    {showDatePicker && (
                      <DateTimePicker
                        value={(() => {
                          if (date && date.includes('-')) {
                            const [y, m, d] = date.split('-').map(n => parseInt(n, 10));
                            if (y && m && d) return new Date(y, m - 1, d);
                          } else if (date && date.includes('/')) {
                            const parts = date.split('/').map(n => parseInt(n, 10));
                            if (parts.length === 3) {
                              const [d, m, y] = parts;
                              const fullY = y < 100 ? 2000 + y : y;
                              return new Date(fullY, m - 1, d);
                            }
                          }
                          return new Date();
                        })()}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event, selectedDate) => {
                          setShowDatePicker(Platform.OS === 'ios');
                          if (selectedDate && event.type !== 'dismissed') {
                            const yyyy = selectedDate.getFullYear();
                            const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
                            const dd = String(selectedDate.getDate()).padStart(2, '0');
                            setDate(`${yyyy}-${mm}-${dd}`);
                          }
                        }}
                      />
                    )}
                  </View>

                  <View style={{ flex: 0.9 }}>
                    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
                      {t('timeLabel') || 'HORÁRIO'}
                    </Text>
                    <Pressable
                      onPress={() => setShowTimePicker(true)}
                      style={({ pressed }) => [
                        styles.cleanInput,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          opacity: pressed ? 0.7 : 1
                        }
                      ]}
                    >
                      <Text style={{ color: time ? colors.inputText : colors.textMuted, fontSize: 13, fontWeight: time ? '600' : '400' }}>
                        {time || (t('timePlaceholder') || '--:--')}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        {time ? (
                          <Pressable hitSlop={6} onPress={(e) => { e.stopPropagation(); setTime(''); }}>
                            <Ionicons name="close-circle" size={14} color={colors.textMuted} />
                          </Pressable>
                        ) : null}
                        <Ionicons name="time-outline" size={16} color={colors.primary} />
                      </View>
                    </Pressable>

                    {showTimePicker && (
                      <DateTimePicker
                        value={(() => {
                          if (time && time.includes(':')) {
                            const [h, m] = time.split(':').map(n => parseInt(n, 10));
                            const d = new Date();
                            d.setHours(h || 0, m || 0, 0, 0);
                            return d;
                          }
                          const d = new Date();
                          d.setHours(20, 0, 0, 0);
                          return d;
                        })()}
                        mode="time"
                        is24Hour={true}
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event, selectedDate) => {
                          setShowTimePicker(Platform.OS === 'ios');
                          if (selectedDate && event.type !== 'dismissed') {
                            const hh = String(selectedDate.getHours()).padStart(2, '0');
                            const mm = String(selectedDate.getMinutes()).padStart(2, '0');
                            setTime(`${hh}:${mm}`);
                          }
                        }}
                      />
                    )}
                  </View>
                </View>

                {/* Local */}
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
                    {t('localLabel')}
                  </Text>
                  <TextInput
                    style={[
                      styles.cleanInput,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', color: colors.inputText }
                    ]}
                    value={local}
                    onChangeText={setLocal}
                    placeholder=""
                    placeholderTextColor={colors.textMuted}
                    maxLength={200}
                    autoComplete="off"
                    importantForAutofill="no"
                  />
                </View>

                {/* Row 4: Cachê & Observações */}
                <View style={styles.formTwoColumns}>
                  {type === 'show' && (
                    <View style={{ flex: 0.9 }}>
                      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
                        {t('cacheLabel')}
                      </Text>
                      <TextInput
                        style={[
                          styles.cleanInput,
                          { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', color: colors.inputText }
                        ]}
                        value={cachê}
                        onChangeText={setCachê}
                        placeholder=""
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        maxLength={20}
                        autoComplete="off"
                        importantForAutofill="no"
                      />
                    </View>
                  )}

                  <View style={{ flex: 1.5 }}>
                    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
                      {t('notesLabel')}
                    </Text>
                    <TextInput
                      style={[
                        styles.cleanInput,
                        { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', color: colors.inputText }
                      ]}
                      value={notes}
                      onChangeText={setNotes}
                      placeholder=""
                      placeholderTextColor={colors.textMuted}
                      maxLength={1000}
                      autoComplete="off"
                      importantForAutofill="no"
                    />
                  </View>
                </View>
              </View>
          )}
        </View>

        {/* ========================================================
            CAMADA 3: ROTEIRO & MÚSICAS (DRAG AND DROP, PAUSAS, NOTAS)
           ======================================================== */}
        <View style={[styles.editorLayer, { backgroundColor: editorBg }]}>
          {/* Roteiro Action Bar: + MÚSICAS, + PAUSA, + ANOTAÇÃO */}
          <View style={styles.roteiroActionBar}>
            <Pressable
              style={({ pressed }) => [
                styles.roteiroBtn,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }
              ]}
              onPress={handleOpenPicker}
            >
              <Ionicons name="add-circle-outline" size={15} color="#fff" />
              <Text style={styles.roteiroBtnText}>
                {t('song')}
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.roteiroBtn,
                { backgroundColor: colors.primary + '18', borderColor: colors.primary + '35', borderWidth: 1 },
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }
              ]}
              onPress={handleAddPause}
            >
              <Ionicons name="pause-outline" size={15} color={colors.primary} />
              <Text style={[styles.roteiroBtnText, { color: colors.primary }]}>
                {t('pause')}
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.roteiroBtn,
                { backgroundColor: colors.secondary + '18', borderColor: colors.secondary + '35', borderWidth: 1 },
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }
              ]}
              onPress={handleAddNote}
            >
              <Ionicons name="document-text-outline" size={15} color={colors.secondary} />
              <Text style={[styles.roteiroBtnText, { color: colors.secondary }]}>
                {t('note')}
              </Text>
            </Pressable>
          </View>

          {/* List of Sortable Songs / Pauses / Notes */}
          <ScrollView
            style={styles.roteiroScrollView}
            contentContainerStyle={styles.roteiroContentContainer}
            scrollEnabled={!isDraggingActive}
            showsVerticalScrollIndicator={!isDraggingActive}
            keyboardShouldPersistTaps="handled"
          >
            {orderedSongs.length === 0 ? (
              <View style={styles.emptyRoteiroContainer}>
                <Ionicons name="musical-notes-outline" size={38} color={colors.textMuted} style={{ opacity: 0.5, marginBottom: 8 }} />
                <Text style={[styles.emptyRoteiroText, { color: colors.textMuted }]}>
                  {t('noSongsInSetlistYet')}
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.emptyAddBtn,
                    { backgroundColor: colors.primary + '18' },
                    pressed && { opacity: 0.7 }
                  ]}
                  onPress={handleOpenPicker}
                >
                  <Ionicons name="add" size={16} color={colors.primary} />
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: colors.primary }}>
                    {t('addFirstSong')}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <DraggableSortableList
                songs={orderedSongs}
                onReorder={handleReorderSongs}
                onRemove={removeSongByIndex}
                onEditCustomItem={handleOpenCustomItemEditor}
                onEditSong={onEditSong}
                colors={colors}
                t={t}
                onDragStateChange={setIsDraggingActive}
              />
            )}
          </ScrollView>
        </View>

        {/* Modal: Song Picker (Multi-seleção com Busca e Filtros) */}
        <Modal
          visible={showSongSelectorModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowSongSelectorModal(false)}
        >
          <View style={[styles.pickerOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
            <View style={[styles.pickerModalBox, { backgroundColor: colors.cardBackground }]}>
              {/* Header do Picker */}
              <View style={styles.pickerHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pickerTitle, { color: colors.text }]}>
                    {t('selectSongsForSetlist')}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                    {selectedPickerSongIds.size} {t('selectedCount')}
                  </Text>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.pickerCloseBtn, pressed && { opacity: 0.7 }]}
                  onPress={() => setShowSongSelectorModal(false)}
                >
                  <Ionicons name="close" size={20} color={colors.danger} />
                </Pressable>
              </View>

              {/* Search Bar */}
              <View style={styles.pickerSearchRow}>
                <Ionicons name="search" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
                <TextInput
                  style={[styles.pickerSearchInput, { color: colors.inputText }]}
                  value={pickerSearch}
                  onChangeText={setPickerSearch}
                  placeholder=""
                  placeholderTextColor={colors.textMuted}
                  maxLength={100}
                  autoComplete="off"
                  importantForAutofill="no"
                />
                {pickerSearch ? (
                  <Pressable onPress={() => setPickerSearch('')}>
                    <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                  </Pressable>
                ) : null}
              </View>

              {/* Select All Toggle Bar */}
              <View style={styles.pickerActionBar}>
                <Pressable
                  style={({ pressed }) => [
                    styles.pickerSelectAllBtn,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                    pressed && { opacity: 0.7 }
                  ]}
                  onPress={handleToggleSelectAllFiltered}
                >
                  <Ionicons 
                    name={isAllFilteredSelected ? "checkbox" : "square-outline"} 
                    size={16} 
                    color={isAllFilteredSelected ? colors.primary : colors.textMuted} 
                  />
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.text }}>
                    {isAllFilteredSelected ? t('deselectAll') : t('selectAllFiltered')}
                  </Text>
                </Pressable>
              </View>

              {/* Song List */}
              <ScrollView style={styles.pickerSongList} keyboardShouldPersistTaps="handled">
                {filteredPickerSongs.length === 0 ? (
                  <Text style={{ textAlign: 'center', color: colors.textMuted, paddingVertical: 24, fontStyle: 'italic' }}>
                    {t('noSongsFoundInPicker')}
                  </Text>
                ) : (
                  filteredPickerSongs.map((song) => {
                    const isSelected = selectedPickerSongIds.has(song.id);
                    return (
                      <Pressable
                        key={song.id}
                        style={({ pressed }) => [
                          styles.pickerSongRow,
                          {
                            backgroundColor: isSelected
                              ? colors.primary + '18'
                              : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'),
                          },
                          pressed && { opacity: 0.8 }
                        ]}
                        onPress={() => handleTogglePickerSong(song.id)}
                      >
                        <Ionicons
                          name={isSelected ? "checkbox" : "square-outline"}
                          size={20}
                          color={isSelected ? colors.primary : colors.textMuted}
                          style={{ marginRight: 10 }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.pickerSongName, { color: colors.text }]} numberOfLines={1}>
                            {song.name}
                            {song.originalBand ? (
                              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted }}>
                                {` (${song.originalBand})`}
                              </Text>
                            ) : null}
                          </Text>
                          <Text style={{ fontSize: 10.5, color: colors.textMuted, marginTop: 1 }} numberOfLines={1}>
                            {song.style || ''} {song.duration ? `• ${song.duration}` : ''}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>

              {/* Confirm Add Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.pickerConfirmBtn,
                  { backgroundColor: colors.primary, opacity: selectedPickerSongIds.size === 0 ? 0.4 : (pressed ? 0.85 : 1) }
                ]}
                disabled={selectedPickerSongIds.size === 0}
                onPress={handleAddSelectedPickerSongs}
              >
                <Ionicons name="checkmark-circle" size={17} color="#fff" />
                <Text style={styles.pickerConfirmBtnText}>
                  {`${t('addSelectedCount')} (${selectedPickerSongIds.size})`}
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Modal: Custom Item Editor (Pausas e Anotações) como BOTTOM SHEET */}
        {editingCustomIndex !== null && (
          <Modal
            visible={true}
            transparent={true}
            animationType="slide"
            onRequestClose={handleCloseCustomItemEditor}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.customBottomSheetOverlay}
            >
              <Pressable style={styles.customBottomSheetBackdrop} onPress={handleCloseCustomItemEditor} />
              <View style={[styles.customBottomSheetContent, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
                {/* Drag handle */}
                <View style={[styles.bottomSheetDragHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />

                <View style={styles.bottomSheetHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons
                      name={selectedSongs[editingCustomIndex]?.id === -1 ? "pause-circle" : "document-text"}
                      size={20}
                      color={selectedSongs[editingCustomIndex]?.id === -1 ? colors.primary : colors.secondary}
                    />
                    <Text style={[styles.bottomSheetTitle, { color: colors.text }]}>
                      {selectedSongs[editingCustomIndex]?.id === -1 ? (t('editPauseTitle') || 'Configurar Pausa') : (t('editNoteTitle') || 'Configurar Anotação')}
                    </Text>
                  </View>
                  <Pressable onPress={handleCloseCustomItemEditor} hitSlop={8}>
                    <Ionicons name="close" size={20} color={colors.textMuted} />
                  </Pressable>
                </View>

                {selectedSongs[editingCustomIndex]?.id === -1 ? (
                  <View style={{ marginBottom: 18, marginTop: 4 }}>
                    <Text style={[styles.fieldLabel, { color: colors.primary }]}>
                      {t('pauseDurationLabel') || 'DURAÇÃO DA PAUSA (Ex: 10 min, 05:00)'}
                    </Text>
                    <TextInput
                      style={[
                        styles.cleanInput,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                          color: colors.inputText,
                          borderColor: colors.primary + '40',
                          borderWidth: 1,
                        }
                      ]}
                      value={tempCustomDuration}
                      onChangeText={setTempCustomDuration}
                      placeholder="10 min"
                      placeholderTextColor={colors.textMuted}
                      maxLength={10}
                      autoFocus
                    />
                  </View>
                ) : (
                  <View style={{ marginBottom: 18, marginTop: 4 }}>
                    <Text style={[styles.fieldLabel, { color: colors.secondary }]}>
                      {t('noteTextLabel') || 'TEXTO DA ANOTAÇÃO / RECADOS DE PALCO'}
                    </Text>
                    <TextInput
                      style={[
                        styles.cleanInput,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                          color: colors.inputText,
                          borderColor: colors.secondary + '40',
                          borderWidth: 1,
                          minHeight: 80,
                          textAlignVertical: 'top',
                          paddingTop: 10,
                        }
                      ]}
                      value={tempCustomNotes}
                      onChangeText={setTempCustomNotes}
                      placeholder={t('notePlaceholder') || 'Digite sua anotação ou aviso...'}
                      placeholderTextColor={colors.textMuted}
                      multiline
                      maxLength={1000}
                      autoFocus
                    />
                  </View>
                )}

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable
                    style={[styles.bottomSheetCancelBtn, { borderColor: colors.border }]}
                    onPress={handleCloseCustomItemEditor}
                  >
                    <Text style={{ color: colors.text, fontWeight: '700' }}>{t('cancel') || 'Cancelar'}</Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.bottomSheetSaveBtn,
                      {
                        backgroundColor: selectedSongs[editingCustomIndex]?.id === -1 ? colors.primary : colors.secondary
                      }
                    ]}
                    onPress={handleSaveCustomItem}
                  >
                    <Ionicons name="checkmark" size={17} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                      {t('confirm') || 'Salvar'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ===== LAYER 1: HEADER =====
  headerLayer: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : (Platform.OS === 'ios' ? 56 : 12),
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    zIndex: 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  headerControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  circleActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerEventContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    gap: 12,
  },
  headerBandLogoBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBandLogoImg: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  headerBandLogoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
  },
  headerBandLogoInitial: {
    fontSize: 18,
    fontWeight: '900',
  },
  headerEventInfoCol: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  headerEventNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    borderWidth: 1,
  },
  headerTypePillText: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerTitleInlineInput: {
    flex: 1,
    fontWeight: '900',
    letterSpacing: -0.2,
    paddingVertical: 0,
    paddingHorizontal: 0,
    margin: 0,
    textAlign: 'left',
  },
  headerBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    gap: 5,
  },
  headerMetaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  headerMetaBadgeText: {
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.2,
  },

  // ===== LAYER 2: DETAILS =====
  detailsLayer: {
    marginHorizontal: 10,
    marginTop: 8,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  detailsToggleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  detailsToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailsToggleTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  detailsContentScroll: {
    maxHeight: 220,
  },
  detailsForm: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  pillSelectorRow: {
    flexDirection: 'row',
    gap: 6,
  },
  pillOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 2,
    borderRadius: 10,
  },
  pillOptionText: {
    fontSize: 11.5,
  },
  formTwoColumns: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  cleanInput: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    fontSize: 13,
    fontWeight: '600',
  },

  // ===== LAYER 3: ROTEIRO & EDITOR =====
  editorLayer: {
    flex: 1,
    marginHorizontal: 10,
    marginTop: 8,
    marginBottom: Platform.OS === 'ios' ? 36 : 48,
    borderRadius: 18,
    overflow: 'hidden',
  },
  roteiroActionBar: {
    flexDirection: 'row',
    padding: 8,
    gap: 6,
  },
  roteiroBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 12,
  },
  roteiroBtnText: {
    color: '#fff',
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  roteiroScrollView: {
    flex: 1,
    paddingHorizontal: 6,
  },
  roteiroContentContainer: {
    paddingVertical: 6,
    paddingBottom: 30,
  },
  emptyRoteiroContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyRoteiroText: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },

  // ===== SONG PICKER MODAL =====
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  pickerModalBox: {
    height: '82%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  pickerCloseBtn: {
    padding: 4,
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
    fontSize: 13,
    padding: 0,
  },
  pickerActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pickerSelectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pickerSongList: {
    flex: 1,
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
    fontSize: 13.5,
    fontWeight: '800',
  },
  pickerConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 10,
  },
  pickerConfirmBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // Custom Item Bottom Sheet (Pausa & Anotação)
  customBottomSheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  customBottomSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  customBottomSheetContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 12,
  },
  bottomSheetDragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  bottomSheetTitle: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  bottomSheetCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  bottomSheetSaveBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
});
