import React, { useState, useEffect } from 'react';
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

const ROW_HEIGHT = 70;

function DraggableSortableList({ songs, onReorder, colors, t }) {
  const [activeIdx, setActiveIdx] = useState(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  
  const animatedY = React.useRef(songs.map((_, i) => new Animated.Value(i * ROW_HEIGHT))).current;
  
  React.useEffect(() => {
    if (animatedY.length !== songs.length) {
      while (animatedY.length < songs.length) {
        animatedY.push(new Animated.Value(animatedY.length * ROW_HEIGHT));
      }
      while (animatedY.length > songs.length) {
        animatedY.pop();
      }
    }
    songs.forEach((_, i) => {
      Animated.spring(animatedY[i], {
        toValue: i * ROW_HEIGHT,
        tension: 100,
        friction: 12,
        useNativeDriver: true,
      }).start();
    });
  }, [songs.length]);

  const currentOrder = React.useRef(songs.map((_, i) => i));

  React.useEffect(() => {
    currentOrder.current = songs.map((_, i) => i);
    songs.forEach((_, i) => {
      animatedY[i].setValue(i * ROW_HEIGHT);
    });
  }, [songs]);

  const createPanResponder = (itemIndex) => {
    let initialY = itemIndex * ROW_HEIGHT;
    let currentY = initialY;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setActiveIdx(itemIndex);
        setScrollEnabled(false);
        initialY = currentOrder.current.indexOf(itemIndex) * ROW_HEIGHT;
        currentY = initialY;
        if (typeof Vibration !== 'undefined') Vibration.vibrate(15);
      },
      onPanResponderMove: (evt, gestureState) => {
        const dragY = initialY + gestureState.dy;
        currentY = dragY;
        animatedY[itemIndex].setValue(dragY);

        const hoverIndex = Math.max(0, Math.min(songs.length - 1, Math.round(dragY / ROW_HEIGHT)));
        const oldHoverIndex = currentOrder.current.indexOf(itemIndex);

        if (hoverIndex !== oldHoverIndex) {
          const newOrder = [...currentOrder.current];
          newOrder.splice(oldHoverIndex, 1);
          newOrder.splice(hoverIndex, 0, itemIndex);
          currentOrder.current = newOrder;

          if (typeof Vibration !== 'undefined') Vibration.vibrate(8);

          newOrder.forEach((originalIndex, orderIndex) => {
            if (originalIndex !== itemIndex) {
              Animated.spring(animatedY[originalIndex], {
                toValue: orderIndex * ROW_HEIGHT,
                tension: 120,
                friction: 14,
                useNativeDriver: true,
              }).start();
            }
          });
        }
      },
      onPanResponderRelease: () => {
        const finalOrderIndex = currentOrder.current.indexOf(itemIndex);
        Animated.spring(animatedY[itemIndex], {
          toValue: finalOrderIndex * ROW_HEIGHT,
          tension: 100,
          friction: 12,
          useNativeDriver: true,
        }).start(() => {
          setActiveIdx(null);
          setScrollEnabled(true);
          onReorder(currentOrder.current);
        });
      },
      onPanResponderTerminate: () => {
        const finalOrderIndex = currentOrder.current.indexOf(itemIndex);
        Animated.spring(animatedY[itemIndex], {
          toValue: finalOrderIndex * ROW_HEIGHT,
          tension: 100,
          friction: 12,
          useNativeDriver: true,
        }).start(() => {
          setActiveIdx(null);
          setScrollEnabled(true);
        });
      },
    });
  };

  return (
    <ScrollView 
      scrollEnabled={scrollEnabled} 
      style={{ flex: 1 }}
      contentContainerStyle={{ height: songs.length * ROW_HEIGHT + 20 }}
    >
      <View style={{ height: songs.length * ROW_HEIGHT, position: 'relative' }}>
        {songs.map((song, index) => {
          const isPause = song.id === -1;
          const isNote = song.id === -2;
          const isDragging = activeIdx === index;

          const responder = createPanResponder(index);

          return (
            <Animated.View
              key={`${song.id}-${index}`}
              style={[
                styles.reorderRowAbsolute,
                {
                  transform: [{ translateY: animatedY[index] }],
                  backgroundColor: isDragging 
                    ? colors.primary + '25' 
                    : colors.cardBackground,
                  borderColor: isDragging ? colors.primary : colors.border,
                  zIndex: isDragging ? 100 : 1,
                  shadowOpacity: isDragging ? 0.3 : 0,
                  elevation: isDragging ? 8 : 0,
                }
              ]}
            >
              {/* Indicador de Número */}
              <View style={[
                styles.reorderBadge, 
                { 
                  backgroundColor: isPause 
                    ? colors.secondary + '20' 
                    : (isNote ? colors.warning + '20' : colors.primary + '15')
                }
              ]}>
                <Text style={{ 
                  fontSize: 12, 
                  fontWeight: '900', 
                  color: isPause ? colors.secondary : (isNote ? colors.warning : colors.primary) 
                }}>
                  {String(currentOrder.current.indexOf(index) + 1).padStart(2, '0')}
                </Text>
              </View>

              {/* Nome do Item */}
              <View style={{ flex: 1 }}>
                {isPause ? (
                  <Text style={{ color: colors.secondary, fontWeight: '950', fontSize: 13 }}>
                    ⏸ PAUSA
                  </Text>
                ) : isNote ? (
                  <Text style={{ color: colors.warning, fontWeight: '950', fontSize: 13, fontStyle: 'italic' }}>
                    📝 ANOTAÇÃO: {song.customNotes || 'Vazia'}
                  </Text>
                ) : (
                  <>
                    <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13 }} numberOfLines={1}>
                      {song.name}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 1 }} numberOfLines={1}>
                      {song.originalBand}
                    </Text>
                  </>
                )}
              </View>

              {/* Drag Handle Area */}
              <View 
                {...responder.panHandlers} 
                style={{ 
                  paddingHorizontal: 12, 
                  paddingVertical: 18,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Ionicons 
                  name="reorder-three" 
                  size={26} 
                  color={isDragging ? colors.primary : colors.textMuted} 
                />
              </View>
            </Animated.View>
          );
        })}
      </View>
    </ScrollView>
  );
}

export default function SetlistModal({ visible, onClose, onSave, setlist, bands, songs }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const isDark = colors.isDark;

  const [name, setName] = useState('');
  const [type, setType] = useState('repertório');
  const [bandId, setBandId] = useState(null);
  const [date, setDate] = useState('');
  const [local, setLocal] = useState('');
  const [cachê, setCachê] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedSongs, setSelectedSongs] = useState([]);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [selectedIdxForMove, setSelectedIdxForMove] = useState(null);

  // Estados do dropdown de músicas
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const [selectedSongToSelect, setSelectedSongToSelect] = useState(null);

  useEffect(() => {
    if (visible) {
      if (setlist) {
        setName(setlist.name || '');
        setType(setlist.type);
        setBandId(setlist.myBandId);
        setDate(setlist.date || '');
        setLocal(setlist.local || '');
        setCachê(setlist.cachê || '');
        setNotes(setlist.notes || '');
        const items = setlist.songs ? setlist.songs.map((s) => ({
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
      setShowDropdown(false);
      setDropdownSearch('');
      setSelectedSongToSelect(null);
      setShowReorderModal(false);
      setSelectedIdxForMove(null);
    }
  }, [visible, setlist, bands]);

  const removeSongByIndex = (index) => {
    const updated = selectedSongs.filter((_, idx) => idx !== index);
    setSelectedSongs(updated);
  };

  const moveUp = (index) => {
    if (index === 0) return;
    const updated = [...selectedSongs];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setSelectedSongs(updated);
  };

  const moveDown = (index) => {
    if (index === selectedSongs.length - 1) return;
    const updated = [...selectedSongs];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setSelectedSongs(updated);
  };

  const moveItemTo = (from, to) => {
    if (from === to) return;
    const newSongs = [...selectedSongs];
    const [removed] = newSongs.splice(from, 1);
    newSongs.splice(to, 0, removed);
    setSelectedSongs(newSongs);
    if (typeof Vibration !== 'undefined') {
      Vibration.vibrate(12);
    }
    setSelectedIdxForMove(null);
  };

  const updateSongItem = (index, updatedProps) => {
    const updated = [...selectedSongs];
    updated[index] = { ...updated[index], ...updatedProps };
    setSelectedSongs(updated);
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
        animationType="fade"
        transparent={true}
        onRequestClose={onClose}
      >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.75)' }]}
      >
        <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.primary }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {setlist ? t('editSetlist') : t('newSetlist')}
            </Text>
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
            showsVerticalScrollIndicator={false}
          >
            {/* Tipo de Setlist */}
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

            {/* Banda */}
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
                contentContainerStyle={{ paddingVertical: 4 }}
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

            {/* Nome do Roteiro */}
            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('setlistNameLabel').toUpperCase()}</Text>
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

            {/* Data & Local */}
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

            {/* Cachê (somente para shows) */}
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

            {/* Observações */}
            <>
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
            </>

            {/* Seleção de Músicas */}
            <Text style={[styles.sectionLabel, { color: colors.text, borderBottomColor: colors.border }]}>
              {t('songsLabel').toUpperCase()} ({selectedSongs.length})
            </Text>

            {/* Custom Dropdown Selector */}
            <View style={{ position: 'relative', zIndex: 10 }}>
              <Pressable 
                style={[styles.dropdownSelector, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                onPress={() => setShowDropdown(!showDropdown)}
              >
                <Text style={{ color: selectedSongToSelect ? colors.text : colors.textMuted, fontWeight: '700', fontSize: 14 }}>
                  {selectedSongToSelect ? (selectedSongToSelect.id === -1 ? `⏸ ${t('pause').toUpperCase()}` : `${selectedSongToSelect.originalBand} - ${selectedSongToSelect.name}`) : `${t('searchPlaceholder')}...`}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>{showDropdown ? '▲' : '▼'}</Text>
              </Pressable>

              {showDropdown && (
                <View style={[styles.dropdownContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.dropdownSearch, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border }]}
                    value={dropdownSearch}
                    onChangeText={setDropdownSearch}
                    autoComplete="off"
                    importantForAutofill="no"
                  />
                  <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled showsVerticalScrollIndicator={true}>
                    {/* Opção fixa PAUSA */}
                    <Pressable
                      style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                      onPress={() => {
                        setSelectedSongToSelect({ id: -1, name: 'PAUSA', originalBand: '' });
                        setShowDropdown(false);
                        setDropdownSearch('');
                      }}
                    >
                      <Text style={{ fontWeight: '950', color: colors.secondary }}>⏸ {t('pause').toUpperCase()}</Text>
                    </Pressable>

                    {/* Opção fixa ANOTAÇÃO */}
                    <Pressable
                      style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                      onPress={() => {
                        setSelectedSongToSelect({ id: -2, name: 'ANOTAÇÃO', originalBand: '' });
                        setShowDropdown(false);
                        setDropdownSearch('');
                      }}
                    >
                      <Text style={{ fontWeight: '950', color: colors.warning }}>📝 {t('noteItem') || 'ANOTAÇÃO / TEXTO'}</Text>
                    </Pressable>

                    {songs
                      .filter(s => s.id >= 0 && (
                        s.name.toLowerCase().includes(dropdownSearch.toLowerCase()) || 
                        s.originalBand.toLowerCase().includes(dropdownSearch.toLowerCase())
                      ))
                      .map((song) => (
                        <Pressable
                          key={song.id}
                          style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                          onPress={() => {
                            setSelectedSongToSelect(song);
                            setShowDropdown(false);
                            setDropdownSearch('');
                          }}
                        >
                          <Text style={{ color: colors.text, fontWeight: '700' }}>
                            <Text style={{ fontWeight: '900', color: colors.primary }}>{song.originalBand}</Text> - {song.name}
                          </Text>
                        </Pressable>
                      ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Botão de Adicionar */}
            <Pressable
              style={({ pressed }) => [
                styles.addButton, 
                { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }
              ]}
              onPress={() => {
                if (!selectedSongToSelect) {
                  Alert.alert(t('attention'), t('alertSelectSongOrPauseFirst'));
                  return;
                }
                setSelectedSongs([...selectedSongs, { id: selectedSongToSelect.id, customNotes: '', customDuration: '' }]);
                setSelectedSongToSelect(null);
              }}
            >
              <Text style={styles.addButtonText}>{t('addToSetlist')}</Text>
            </Pressable>

            {/* Músicas Selecionadas / Ordem do Show */}
            {orderedSongs.length > 0 && (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 8 }}>
                  <Text style={[styles.sectionLabel, { color: colors.text, marginBottom: 0, marginTop: 0 }]}>
                    {t('songsTitle')}
                  </Text>
                  <Pressable
                    style={({ pressed }) => [
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: colors.primary + '15',
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: colors.primary + '30',
                        opacity: pressed ? 0.8 : 1,
                      }
                    ]}
                    onPress={() => setShowReorderModal(true)}
                  >
                    <Ionicons name="swap-vertical-outline" size={13} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '800' }}>
                      {t('reorderBtn') || 'REORDENAR'}
                    </Text>
                  </Pressable>
                </View>
                <View style={[styles.orderListContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                  <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled showsVerticalScrollIndicator={true}>
                    {orderedSongs.map((song, index) => {
                      const isPause = song.id === -1;
                      const isNote = song.id === -2;
                      return (
                        <View 
                          key={`${song.id}-${index}`} 
                          style={[styles.orderItemContainer, { borderBottomColor: colors.border, borderBottomWidth: 1.5 }]}
                        >
                          <View style={styles.orderItem}>
                            {/* Badge de número circular */}
                            <View style={[styles.orderIndexBadge, { backgroundColor: isPause ? colors.secondary + '20' : (isNote ? colors.warning + '20' : colors.primary + '15'), borderColor: isPause ? colors.secondary + '35' : (isNote ? colors.warning + '35' : colors.primary + '35') }]}>
                              <Text style={[styles.orderIndexText, { color: isPause ? colors.secondary : (isNote ? colors.warning : colors.primary) }]}>
                                {String(index + 1).padStart(2, '0')}
                              </Text>
                            </View>

                            <View style={{ flex: 1 }}>
                              {isPause ? (
                                <Text style={[styles.orderSongName, { color: colors.secondary, fontWeight: '950' }]} numberOfLines={1}>
                                  ⏸ PAUSA
                                </Text>
                              ) : isNote ? (
                                <Text style={[styles.orderSongName, { color: colors.warning, fontWeight: '950' }]} numberOfLines={1}>
                                  📝 {t('noteItem') || 'ANOTAÇÃO / TEXTO'}
                                </Text>
                              ) : (
                                <>
                                  <Text style={[styles.orderSongName, { color: colors.text }]} numberOfLines={1}>
                                    {song.name}
                                  </Text>
                                  <Text style={[styles.orderBandName, { color: colors.textMuted }]} numberOfLines={1}>
                                    {song.originalBand}
                                  </Text>
                                </>
                              )}
                            </View>

                            {/* Botões de Ação: Subir, Descer e Remover */}
                            <View style={styles.orderActions}>
                              <Pressable
                                disabled={index === 0}
                                style={[
                                  styles.orderActionButton,
                                  { backgroundColor: colors.border },
                                  index === 0 && { opacity: 0.25 }
                                ]}
                                onPress={() => moveUp(index)}
                              >
                                <Text style={[styles.orderActionText, { color: colors.text }]}>▲</Text>
                              </Pressable>
                              <Pressable
                                disabled={index === orderedSongs.length - 1}
                                style={[
                                  styles.orderActionButton,
                                  { backgroundColor: colors.border },
                                  index === orderedSongs.length - 1 && { opacity: 0.25 }
                                ]}
                                onPress={() => moveDown(index)}
                              >
                                <Text style={[styles.orderActionText, { color: colors.text }]}>▼</Text>
                              </Pressable>
                              <Pressable
                                style={[
                                  styles.orderActionButton,
                                  { backgroundColor: colors.danger + '20', borderColor: colors.danger + '40', borderWidth: 1 }
                                ]}
                                onPress={() => removeSongByIndex(index)}
                              >
                                <Text style={[styles.orderActionText, { color: colors.danger, fontWeight: 'bold' }]}>✕</Text>
                              </Pressable>
                            </View>
                          </View>

                          {/* Se for Pausa, exibe inputs adicionais para Observações e Temporizador */}
                          {isPause && (
                            <View style={styles.pauseDetailsRow}>
                              <TextInput
                                style={[styles.pauseInputNotes, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border }]}
                                placeholder={t('notesLabel')}
                                placeholderTextColor={colors.textMuted}
                                value={song.customNotes || ''}
                                onChangeText={(val) => updateSongItem(index, { customNotes: val })}
                              />
                              <TextInput
                                style={[styles.pauseInputTime, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border }]}
                                placeholder={t('durationLabel')}
                                placeholderTextColor={colors.textMuted}
                                value={song.customDuration || ''}
                                onChangeText={(val) => updateSongItem(index, { customDuration: val })}
                                keyboardType="default"
                              />
                            </View>
                          )}

                          {/* Se for Anotação, exibe input apenas para a observação */}
                          {isNote && (
                            <View style={styles.pauseDetailsRow}>
                              <TextInput
                                style={[styles.pauseInputNotes, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border, flex: 1 }]}
                                placeholder={t('notePlaceholder') || 'Digite sua anotação ou observação...'}
                                placeholderTextColor={colors.textMuted}
                                value={song.customNotes || ''}
                                onChangeText={(val) => updateSongItem(index, { customNotes: val })}
                              />
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              </>
            )}

            <Pressable 
              style={({ pressed }) => [
                styles.saveButton, 
                { backgroundColor: colors.success },
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }
              ]} 
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>
                {setlist ? t('saveChanges') : t('createSetlist')}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>

    {/* Modal de Reordenação Rápida */}
    <Modal
      visible={showReorderModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        setSelectedIdxForMove(null);
        setShowReorderModal(false);
      }}
    >
      <View style={[styles.reorderOverlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
        <View style={[styles.reorderContainer, { backgroundColor: colors.background, borderColor: colors.primary }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text, fontSize: 16 }]}>
              ⇅ {t('reorderTitle') || 'REORDENAR REPERTÓRIO'}
            </Text>
            <Pressable 
              style={[styles.closePressable, { backgroundColor: colors.border }]} 
              onPress={() => {
                setSelectedIdxForMove(null);
                setShowReorderModal(false);
              }}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>

          <Text style={{ 
            fontSize: 12, 
            color: colors.textMuted, 
            paddingHorizontal: 20, 
            paddingTop: 16, 
            paddingBottom: 16, 
            lineHeight: 16 
          }}>
            💡 {t('reorderTipDrag') || 'Arraste as músicas segurando no ícone (☰) à direita para ordenar o repertório suavemente.'}
          </Text>

          <View style={{ flex: 1, paddingHorizontal: 16 }}>
            <DraggableSortableList
              songs={orderedSongs}
              onReorder={(newOrderIndices) => {
                const reordered = newOrderIndices.map(originalIdx => selectedSongs[originalIdx]);
                setSelectedSongs(reordered);
              }}
              colors={colors}
              t={t}
            />
          </View>

          {/* Botão de Fechar no rodapé */}
          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                { backgroundColor: colors.primary, marginTop: 0, marginBottom: 0 },
                pressed && { opacity: 0.8 }
              ]}
              onPress={() => {
                setSelectedIdxForMove(null);
                setShowReorderModal(false);
              }}
            >
              <Text style={styles.saveButtonText}>{t('done') || 'CONCLUÍDO'}</Text>
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
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 8,
    borderWidth: 1.5,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '700',
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
    padding: 20,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '950',
    letterSpacing: 1.2,
    marginTop: 12,
    marginBottom: 16,
    paddingBottom: 6,
    borderBottomWidth: 1,
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
    paddingVertical: 10,
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
    paddingVertical: 10,
    borderRadius: 6,
    marginBottom: 12,
    borderWidth: 1.0,
    fontSize: 14,
  },
  warningText: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 16,
  },
  dropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1.0,
    marginBottom: 12,
  },
  dropdownContainer: {
    borderWidth: 1.0,
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
    maxHeight: 250,
  },
  dropdownSearch: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1.0,
    marginBottom: 10,
    fontSize: 14,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  addButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  orderListContainer: {
    borderWidth: 1.5,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 20,
  },
  orderItemContainer: {
    // Cada item do roteiro fica agrupado aqui
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  pauseDetailsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  pauseInputNotes: {
    flex: 1,
    height: 36,
    borderRadius: 6,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    fontSize: 12,
  },
  pauseInputTime: {
    width: 90,
    height: 36,
    borderRadius: 6,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    fontSize: 12,
    textAlign: 'center',
  },
  orderIndexBadge: {
    width: 28,
    height: 28,
    borderRadius: 4, // Quadradinho
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  orderIndexText: {
    fontSize: 12,
    fontWeight: '900',
  },
  orderSongName: {
    fontSize: 14,
    fontWeight: '800',
  },
  orderBandName: {
    fontSize: 12,
    marginTop: 2,
  },
  orderActions: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 8,
  },
  orderActionButton: {
    width: 32,
    height: 32,
    borderRadius: 4, // Quadradinho
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderActionText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.0,
  },
  reorderOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  reorderContainer: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 8,
    borderWidth: 1.5,
    height: '85%',
    maxHeight: 700,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  reorderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  reorderBadge: {
    width: 26,
    height: 26,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderArrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reorderRowAbsolute: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
});
