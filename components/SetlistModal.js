import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';
import { Ionicons } from '@expo/vector-icons';

function SwipeableSongRow({ 
  song, 
  index, 
  totalCount,
  onMoveUp, 
  onMoveDown, 
  onRemove, 
  onEditCustomItem, 
  colors, 
  t 
}) {
  const isPause = song.id === -1;
  const isNote = song.id === -2;

  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 12 && gestureState.dx < 0 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          translateX.setValue(Math.max(gestureState.dx, -130));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -75) {
          Animated.timing(translateX, {
            toValue: -400,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            if (typeof Vibration !== 'undefined') Vibration.vibrate(12);
            onRemove(index);
          });
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            friction: 7,
            tension: 40,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  return (
    <View style={styles.swipeableContainer}>
      <View style={[styles.swipeDeleteBackground, { backgroundColor: colors.danger }]}>
        <View style={styles.swipeDeleteAction}>
          <Ionicons name="trash-outline" size={18} color="#fff" />
          <Text style={styles.swipeDeleteText}>{t('delete') || 'Excluir'}</Text>
        </View>
      </View>

      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.songRowCard,
          {
            backgroundColor: colors.cardBackground,
            borderColor: isPause ? colors.secondary + '45' : isNote ? colors.warning + '45' : colors.border,
            transform: [{ translateX }],
          },
        ]}
      >
        <View style={[
          styles.orderIndexBadge,
          {
            backgroundColor: isPause ? colors.secondary + '18' : isNote ? colors.warning + '18' : colors.primary + '12',
            borderColor: isPause ? colors.secondary + '35' : isNote ? colors.warning + '35' : colors.primary + '35',
          }
        ]}>
          <Text style={[
            styles.orderIndexText,
            { color: isPause ? colors.secondary : isNote ? colors.warning : colors.primary }
          ]}>
            {String(index + 1).padStart(2, '0')}
          </Text>
        </View>

        <Pressable
          style={{ flex: 1, paddingVertical: 4 }}
          onPress={() => {
            if (isPause || isNote) {
              onEditCustomItem(index, song);
            }
          }}
        >
          {isPause ? (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: colors.secondary, fontWeight: '950', fontSize: 13 }}>
                  ⏸ PAUSA
                </Text>
                <Ionicons name="create-outline" size={12} color={colors.secondary} style={{ opacity: 0.8 }} />
              </View>
              <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 1 }} numberOfLines={1}>
                {song.customDuration ? `⏱ ${song.customDuration}` : '5 min'} {song.customNotes ? `• ${song.customNotes}` : ''}
              </Text>
            </View>
          ) : isNote ? (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: colors.warning, fontWeight: '950', fontSize: 13, fontStyle: 'italic' }} numberOfLines={1}>
                  📝 {song.customNotes || 'Anotação / Aviso'}
                </Text>
                <Ionicons name="create-outline" size={12} color={colors.warning} style={{ opacity: 0.8 }} />
              </View>
              <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 1 }}>
                {t('tapToEditSongTip') || 'Toque para editar o texto'}
              </Text>
            </View>
          ) : (
            <View>
              <Text style={[styles.orderSongName, { color: colors.text }]} numberOfLines={1}>
                {song.name}
              </Text>
              <Text style={[styles.orderBandName, { color: colors.textMuted }]} numberOfLines={1}>
                {song.originalBand || ''} {song.key ? `• ${song.key}` : ''} {song.duration ? `• ⏱ ${song.duration}` : ''}
              </Text>
            </View>
          )}
        </Pressable>

        <View style={styles.orderActions}>
          <Pressable
            disabled={index === 0}
            style={({ pressed }) => [
              styles.orderActionButton,
              { backgroundColor: colors.border },
              index === 0 && { opacity: 0.2 },
              pressed && { opacity: 0.6 }
            ]}
            onPress={() => onMoveUp(index)}
          >
            <Ionicons name="chevron-up" size={14} color={colors.text} />
          </Pressable>
          <Pressable
            disabled={index === totalCount - 1}
            style={({ pressed }) => [
              styles.orderActionButton,
              { backgroundColor: colors.border },
              index === totalCount - 1 && { opacity: 0.2 },
              pressed && { opacity: 0.6 }
            ]}
            onPress={() => onMoveDown(index)}
          >
            <Ionicons name="chevron-down" size={14} color={colors.text} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.orderActionButton,
              { backgroundColor: colors.danger + '18', borderColor: colors.danger + '40', borderWidth: 1 },
              pressed && { opacity: 0.6 }
            ]}
            onPress={() => onRemove(index)}
          >
            <Ionicons name="trash-outline" size={13} color={colors.danger} />
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

export default function SetlistModal({ visible, onClose, onSave, setlist, bands = [], songs = [] }) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [name, setName] = useState('');
  const [type, setType] = useState('repertório');
  const [bandId, setBandId] = useState(null);
  const [date, setDate] = useState('');
  const [local, setLocal] = useState('');
  const [cachê, setCachê] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedSongs, setSelectedSongs] = useState([]);

  const [showSongSelectorModal, setShowSongSelectorModal] = useState(false);
  const [selectedPickerSongIds, setSelectedPickerSongIds] = useState(new Set());
  const [pickerSearch, setPickerSearch] = useState('');

  const [editingCustomIndex, setEditingCustomIndex] = useState(null);
  const [tempCustomNotes, setTempCustomNotes] = useState('');
  const [tempCustomDuration, setTempCustomDuration] = useState('');

  useEffect(() => {
    if (visible) {
      if (setlist) {
        setName(setlist.name || '');
        setType(setlist.type || 'repertório');
        setBandId(setlist.myBandId || (bands.length > 0 ? bands[0].id : null));
        setDate(setlist.date || '');
        setLocal(setlist.local || '');
        setCachê(setlist.cachê || '');
        setNotes(setlist.notes || '');
        const items = Array.isArray(setlist.songs) ? setlist.songs.map((s) => ({
          id: s.id,
          customNotes: s.customNotes || '',
          customDuration: s.customDuration || ''
        })) : [];
        setSelectedSongs(items);
      } else {
        setName('');
        setType('repertório');
        setBandId(bands.length > 0 ? bands[0].id : null);
        setDate('');
        setLocal('');
        setCachê('');
        setNotes('');
        setSelectedSongs([]);
      }
      setShowSongSelectorModal(false);
      setSelectedPickerSongIds(new Set());
      setPickerSearch('');
      setEditingCustomIndex(null);
    }
  }, [visible, setlist, bands]);

  const removeSongByIndex = (index) => {
    if (typeof Vibration !== 'undefined') Vibration.vibrate(10);
    const updated = selectedSongs.filter((_, idx) => idx !== index);
    setSelectedSongs(updated);
  };

  const moveUp = (index) => {
    if (index === 0) return;
    if (typeof Vibration !== 'undefined') Vibration.vibrate(8);
    const updated = [...selectedSongs];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setSelectedSongs(updated);
  };

  const moveDown = (index) => {
    if (index === selectedSongs.length - 1) return;
    if (typeof Vibration !== 'undefined') Vibration.vibrate(8);
    const updated = [...selectedSongs];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setSelectedSongs(updated);
  };

  const updateSongItem = (index, updatedProps) => {
    const updated = [...selectedSongs];
    updated[index] = { ...updated[index], ...updatedProps };
    setSelectedSongs(updated);
  };

  const handleAddPause = () => {
    if (typeof Vibration !== 'undefined') Vibration.vibrate(10);
    setSelectedSongs([...selectedSongs, { id: -1, customNotes: '', customDuration: '5 min' }]);
  };

  const handleAddNote = () => {
    if (typeof Vibration !== 'undefined') Vibration.vibrate(10);
    setSelectedSongs([...selectedSongs, { id: -2, customNotes: '', customDuration: '' }]);
  };

  const handleOpenCustomItemEditor = (index, song) => {
    setEditingCustomIndex(index);
    setTempCustomNotes(song.customNotes || '');
    setTempCustomDuration(song.customDuration || '');
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

  const handleOpenPicker = () => {
    setSelectedPickerSongIds(new Set());
    setPickerSearch('');
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

  const filteredPickerSongs = songs.filter(s => 
    s.id >= 0 && (
      (s.name && s.name.toLowerCase().includes(pickerSearch.toLowerCase())) ||
      (s.originalBand && s.originalBand.toLowerCase().includes(pickerSearch.toLowerCase()))
    )
  );

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

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert(t('attention'), t('alertSetlistName'));
      return;
    }
    if (!bandId) {
      Alert.alert(t('attention'), t('alertSelectBand'));
      return;
    }
    if (!date.trim()) {
      Alert.alert(t('attention'), t('alertSetlistDate'));
      return;
    }
    if (selectedSongs.length === 0) {
      Alert.alert(t('attention'), t('alertSelectSong'));
      return;
    }

    onSave({
      name: name.trim(),
      type,
      myBandId: bandId,
      date: date.trim(),
      local: local.trim(),
      cachê: type === 'show' ? cachê.trim() : null,
      notes: notes.trim(),
      songIds: selectedSongs,
    });
  };

  const orderedSongs = selectedSongs
    .map((item) => {
      const songInfo = item.id === -1 
        ? { id: -1, name: 'PAUSA', originalBand: '', style: 'PAUSA' } 
        : item.id === -2
        ? { id: -2, name: 'ANOTAÇÃO', originalBand: '', style: 'ANOTAÇÃO' }
        : songs.find((s) => s.id === item.id);
      
      if (!songInfo) return null;
      return {
        ...songInfo,
        customNotes: item.customNotes,
        customDuration: item.customDuration
      };
    })
    .filter(Boolean);

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.75)' }]}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.primary }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
                  {setlist ? (setlist.name || t('editSetlist')) : t('newSetlist')}
                </Text>
              </View>
              <Pressable 
                style={({ pressed }) => [styles.closePressable, pressed && { opacity: 0.7 }]}
                onPress={onClose}
              >
                <Text style={[styles.closeButton, { color: colors.danger }]}>✕</Text>
              </Pressable>
            </View>

            <ScrollView 
              style={styles.modalBody} 
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>
                {t('setlistTabDetails') || 'DADOS DO EVENTO'}
              </Text>

              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('presentationType')}</Text>
              <View style={styles.segmentedContainer}>
                {['show', 'ensaio', 'repertório'].map((item) => (
                  <Pressable
                    key={item}
                    style={[
                      styles.segmentButton,
                      { borderColor: colors.border },
                      type === item && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}
                    onPress={() => setType(item)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                      <Ionicons 
                        name={item === 'show' ? 'mic-outline' : item === 'ensaio' ? 'musical-notes-outline' : 'clipboard-outline'} 
                        size={13} 
                        color={type === item ? '#fff' : colors.textMuted} 
                      />
                      <Text style={[
                        styles.segmentText,
                        { color: type === item ? '#fff' : colors.textMuted }
                      ]}>
                        {t(item).toUpperCase()}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('responsibleBand')}</Text>
              {bands.length === 0 ? (
                <Text style={[styles.warningText, { color: colors.danger }]}>
                  {t('registerBandFirst')}
                </Text>
              ) : (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  style={styles.bandSelector}
                  contentContainerStyle={{ paddingVertical: 2 }}
                >
                  {bands.map((band) => (
                    <Pressable
                      key={band.id}
                      style={[
                        styles.bandSelectButton,
                        { backgroundColor: colors.cardBackground, borderColor: colors.border },
                        bandId === band.id && { borderColor: colors.primary, borderWidth: 2 }
                      ]}
                      onPress={() => setBandId(band.id)}
                    >
                      <Text style={[
                        styles.bandSelectText,
                        { color: bandId === band.id ? colors.primary : colors.text, fontWeight: bandId === band.id ? '900' : '700' }
                      ]}>
                        {band.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}

              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('setlistNameLabel').toUpperCase()} *</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.inputBackground, 
                  color: colors.inputText,
                  borderColor: colors.border
                }]}
                value={name}
                onChangeText={setName}
                autoComplete="off"
                importantForAutofill="no"
              />

              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('dateLabel').toUpperCase()} *</Text>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: colors.inputBackground, 
                      color: colors.inputText,
                      borderColor: colors.border
                    }]}
                    value={date}
                    onChangeText={setDate}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor={colors.textMuted}
                    autoComplete="off"
                    importantForAutofill="no"
                  />
                </View>
                <View style={{ flex: 1.2 }}>
                  <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('localLabel').toUpperCase()}</Text>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: colors.inputBackground, 
                      color: colors.inputText,
                      borderColor: colors.border
                    }]}
                    value={local}
                    onChangeText={setLocal}
                    autoComplete="off"
                    importantForAutofill="no"
                  />
                </View>
              </View>

              {type === 'show' && (
                <>
                  <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('cachêLabel').toUpperCase()}</Text>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: colors.inputBackground, 
                      color: colors.inputText,
                      borderColor: colors.border
                    }]}
                    value={cachê}
                    onChangeText={setCachê}
                    keyboardType="numeric"
                    autoComplete="off"
                    importantForAutofill="no"
                  />
                </>
              )}

              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('notesLabel').toUpperCase()}</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.inputBackground, 
                  color: colors.inputText,
                  borderColor: colors.border
                }]}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={2}
                autoComplete="off"
                importantForAutofill="no"
              />

              <View style={[styles.sectionDivider, { borderTopColor: colors.border }]} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={[styles.sectionHeaderTitle, { color: colors.text, marginBottom: 0 }]}>
                  {t('setlistTabRepertoire') || 'ROTEIRO'} ({selectedSongs.length})
                </Text>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.primaryAddSongsBtn,
                  { backgroundColor: colors.primary },
                  pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }
                ]}
                onPress={handleOpenPicker}
              >
                <Ionicons name="search" size={17} color="#fff" />
                <Text style={styles.primaryAddSongsBtnText}>
                  {t('addSongsBtn') || 'ADICIONAR MÚSICAS AO ROTEIRO'}
                </Text>
              </Pressable>

              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryAddPill,
                    { backgroundColor: colors.secondary + '15', borderColor: colors.secondary + '40' },
                    pressed && { opacity: 0.7 }
                  ]}
                  onPress={handleAddPause}
                >
                  <Ionicons name="pause" size={13} color={colors.secondary} />
                  <Text style={{ color: colors.secondary, fontSize: 11, fontWeight: '800' }}>
                    + {t('pause') || 'PAUSA'}
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryAddPill,
                    { backgroundColor: colors.warning + '15', borderColor: colors.warning + '40' },
                    pressed && { opacity: 0.7 }
                  ]}
                  onPress={handleAddNote}
                >
                  <Ionicons name="document-text-outline" size={13} color={colors.warning} />
                  <Text style={{ color: colors.warning, fontSize: 11, fontWeight: '800' }}>
                    + {t('noteItem') || 'ANOTAÇÃO'}
                  </Text>
                </Pressable>
              </View>

              {selectedSongs.length > 0 && (
                <View style={styles.swipeTipBanner}>
                  <Ionicons name="arrow-back" size={12} color={colors.textMuted} />
                  <Text style={[styles.swipeTipText, { color: colors.textMuted }]}>
                    {t('swipeToDeleteTip') || 'Deslize para a esquerda para excluir'}
                  </Text>
                </View>
              )}

              {orderedSongs.length === 0 ? (
                <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 24, paddingHorizontal: 20 }}>
                  <Ionicons name="musical-notes-outline" size={38} color={colors.textMuted} style={{ opacity: 0.4, marginBottom: 8 }} />
                  <Text style={{ color: colors.textMuted, textAlign: 'center', fontSize: 12, lineHeight: 18 }}>
                    {t('noSongsInDetail') || 'Nenhuma música no roteiro ainda.\nClique no botão acima para adicionar!'}
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 8, marginBottom: 20 }}>
                  {orderedSongs.map((song, index) => (
                    <SwipeableSongRow
                      key={`${song.id}-${index}`}
                      song={song}
                      index={index}
                      totalCount={orderedSongs.length}
                      onMoveUp={moveUp}
                      onMoveDown={moveDown}
                      onRemove={removeSongByIndex}
                      onEditCustomItem={handleOpenCustomItemEditor}
                      colors={colors}
                      t={t}
                    />
                  ))}
                </View>
              )}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <Pressable 
                style={({ pressed }) => [
                  styles.saveButton, 
                  { backgroundColor: colors.success },
                  pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }
                ]} 
                onPress={handleSave}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={styles.saveButtonText}>
                  {setlist ? t('saveChanges') : t('createSetlist')}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showSongSelectorModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSongSelectorModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
          <View style={[styles.pickerContainer, { backgroundColor: colors.background, borderColor: colors.primary }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={[styles.modalTitle, { color: colors.text, fontSize: 15 }]}>
                  {t('selectSongsModalTitle') || 'SELECIONAR MÚSICAS'}
                </Text>
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800', marginTop: 2 }}>
                  {selectedPickerSongIds.size} {t('selectedCount') || 'selecionada(s)'}
                </Text>
              </View>
              <Pressable
                style={[styles.closePressable, { backgroundColor: colors.border }]}
                onPress={() => setShowSongSelectorModal(false)}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
              <View style={[styles.searchBarContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                <Ionicons name="search" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.searchBarInput, { color: colors.inputText }]}
                  placeholder={t('searchPlaceholder') || 'Buscar por música ou artista...'}
                  placeholderTextColor={colors.textMuted}
                  value={pickerSearch}
                  onChangeText={setPickerSearch}
                  autoComplete="off"
                  importantForAutofill="no"
                />
                {pickerSearch.length > 0 && (
                  <Pressable onPress={() => setPickerSearch('')}>
                    <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                  </Pressable>
                )}
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <Pressable
                  style={({ pressed }) => [
                    styles.quickSelectBtn,
                    { backgroundColor: colors.primary + '15', borderColor: colors.primary + '35' },
                    pressed && { opacity: 0.7 }
                  ]}
                  onPress={handleToggleSelectAllFiltered}
                >
                  <Ionicons name={isAllFilteredSelected ? "close-circle-outline" : "checkbox-outline"} size={13} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '800' }}>
                    {isAllFilteredSelected ? (t('deselectAll') || 'Desmarcar Todas') : (t('selectAll') || 'Marcar Todas')}
                  </Text>
                </Pressable>

                <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700' }}>
                  {filteredPickerSongs.length} encontradas
                </Text>
              </View>
            </View>

            <ScrollView style={{ flex: 1, paddingHorizontal: 16 }} showsVerticalScrollIndicator={true}>
              {filteredPickerSongs.length === 0 ? (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <Ionicons name="search-outline" size={36} color={colors.textMuted} style={{ opacity: 0.4, marginBottom: 8 }} />
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                    {t('noSongsFoundInPicker') || 'Nenhuma música encontrada.'}
                  </Text>
                </View>
              ) : (
                filteredPickerSongs.map((song) => {
                  const isSelected = selectedPickerSongIds.has(song.id);
                  return (
                    <Pressable
                      key={song.id}
                      style={({ pressed }) => [
                        styles.pickerSongItem,
                        {
                          backgroundColor: isSelected ? colors.primary + '18' : colors.cardBackground,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                        pressed && { opacity: 0.8 }
                      ]}
                      onPress={() => handleTogglePickerSong(song.id)}
                    >
                      <View style={[
                        styles.checkboxCircle,
                        {
                          backgroundColor: isSelected ? colors.primary : 'transparent',
                          borderColor: isSelected ? colors.primary : colors.textMuted,
                        }
                      ]}>
                        {isSelected && <Ionicons name="checkmark" size={13} color="#fff" />}
                      </View>

                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.pickerSongName, { color: colors.text }]} numberOfLines={1}>
                          {song.name}
                        </Text>
                        <Text style={[styles.pickerSongBand, { color: colors.textMuted }]} numberOfLines={1}>
                          {song.originalBand} {song.key ? `• ${song.key}` : ''} {song.duration ? `• ⏱ ${song.duration}` : ''}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>

            <View style={[styles.pickerFooter, { borderTopColor: colors.border }]}>
              <Pressable
                style={({ pressed }) => [
                  styles.saveButton,
                  {
                    backgroundColor: selectedPickerSongIds.size > 0 ? colors.primary : colors.border,
                    marginTop: 0,
                    marginBottom: 0
                  },
                  pressed && { opacity: 0.85 }
                ]}
                disabled={selectedPickerSongIds.size === 0}
                onPress={handleAddSelectedPickerSongs}
              >
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                <Text style={[styles.saveButtonText, { color: selectedPickerSongIds.size > 0 ? '#fff' : colors.textMuted }]}>
                  {`${t('addSelectedCount') || 'ADICIONAR SELECIONADAS'} (${selectedPickerSongIds.size})`}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={editingCustomIndex !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setEditingCustomIndex(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.75)' }]}>
          <View style={[styles.customEditCard, { backgroundColor: colors.background, borderColor: colors.primary }]}>
            <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 14 }]}>
              {editingCustomIndex !== null && selectedSongs[editingCustomIndex]?.id === -1 
                ? (t('editPauseTitle') || 'EDITAR PAUSA')
                : (t('editNoteTitle') || 'EDITAR ANOTAÇÃO')}
            </Text>

            {editingCustomIndex !== null && selectedSongs[editingCustomIndex]?.id === -1 && (
              <>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('durationLabel').toUpperCase()}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border }]}
                  placeholder="Ex: 5 min, 10 min"
                  placeholderTextColor={colors.textMuted}
                  value={tempCustomDuration}
                  onChangeText={setTempCustomDuration}
                  autoComplete="off"
                  importantForAutofill="no"
                />
              </>
            )}

            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('notesLabel').toUpperCase()}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border, minHeight: 60 }]}
              placeholder="Digite sua anotação ou aviso..."
              placeholderTextColor={colors.textMuted}
              value={tempCustomNotes}
              onChangeText={setTempCustomNotes}
              multiline
              autoComplete="off"
              importantForAutofill="no"
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <Pressable
                style={({ pressed }) => [
                  styles.cancelBtn,
                  { backgroundColor: colors.border },
                  pressed && { opacity: 0.7 }
                ]}
                onPress={() => setEditingCustomIndex(null)}
              >
                <Text style={{ color: colors.text, fontWeight: '800', fontSize: 12 }}>{t('cancel') || 'CANCELAR'}</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.confirmBtn,
                  { backgroundColor: colors.primary },
                  pressed && { opacity: 0.85 }
                ]}
                onPress={handleSaveCustomItem}
              >
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 12 }}>{t('done') || 'CONCLUÍDO'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 460,
    borderRadius: 12,
    borderWidth: 1.5,
    height: '92%',
    maxHeight: 760,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  closePressable: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 16,
    flex: 1,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '950',
    letterSpacing: 1.0,
    marginBottom: 12,
  },
  sectionDivider: {
    borderTopWidth: 1,
    marginTop: 10,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  segmentedContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.0,
  },
  segmentText: {
    fontWeight: '800',
    fontSize: 11,
  },
  bandSelector: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  bandSelectButton: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 6,
    marginRight: 10,
    borderWidth: 1.0,
  },
  bandSelectText: {
    fontSize: 13,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 6,
    marginBottom: 12,
    borderWidth: 1.0,
    fontSize: 13,
  },
  warningText: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 16,
  },
  primaryAddSongsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  primaryAddSongsBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  secondaryAddPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  swipeTipBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
    marginBottom: 8,
  },
  swipeTipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  swipeableContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  swipeDeleteBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    left: 0,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingRight: 16,
  },
  swipeDeleteAction: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  swipeDeleteText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  songRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    gap: 10,
  },
  orderIndexBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderIndexText: {
    fontSize: 11,
    fontWeight: '900',
  },
  orderSongName: {
    fontSize: 13,
    fontWeight: '800',
  },
  orderBandName: {
    fontSize: 11,
    marginTop: 1,
  },
  orderActions: {
    flexDirection: 'row',
    gap: 5,
  },
  orderActionButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalFooter: {
    padding: 12,
    borderTopWidth: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  pickerContainer: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 12,
    borderWidth: 1.5,
    height: '86%',
    maxHeight: 700,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  quickSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  pickerSongItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerSongName: {
    fontSize: 13,
    fontWeight: '800',
  },
  pickerSongBand: {
    fontSize: 11,
    marginTop: 1,
  },
  pickerFooter: {
    padding: 14,
    borderTopWidth: 1,
  },
  customEditCard: {
    width: '100%',
    maxWidth: 380,
    padding: 18,
    borderRadius: 12,
    borderWidth: 1.5,
    elevation: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
