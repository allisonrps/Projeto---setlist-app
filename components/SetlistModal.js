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

const ROW_HEIGHT = 68;

function DraggableSortableList({ songs, onReorder, onRemove, onEditSong, onEditCustomItem, colors, t }) {
  const [activeIdx, setActiveIdx] = useState(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  
  const animatedY = useRef(songs.map((_, i) => new Animated.Value(i * ROW_HEIGHT))).current;
  
  useEffect(() => {
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
        tension: 110,
        friction: 12,
        useNativeDriver: true,
      }).start();
    });
  }, [songs.length]);

  const currentOrder = useRef(songs.map((_, i) => i));

  useEffect(() => {
    currentOrder.current = songs.map((_, i) => i);
    songs.forEach((_, i) => {
      animatedY[i].setValue(i * ROW_HEIGHT);
    });
  }, [songs]);

  const createPanResponder = (itemIndex) => {
    let initialY = itemIndex * ROW_HEIGHT;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setActiveIdx(itemIndex);
        setScrollEnabled(false);
        initialY = currentOrder.current.indexOf(itemIndex) * ROW_HEIGHT;
        if (typeof Vibration !== 'undefined') Vibration.vibrate(15);
      },
      onPanResponderMove: (evt, gestureState) => {
        const dragY = initialY + gestureState.dy;
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
                tension: 130,
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

  if (songs.length === 0) {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 20 }}>
        <Ionicons name="musical-notes-outline" size={42} color={colors.textMuted} style={{ opacity: 0.4, marginBottom: 12 }} />
        <Text style={{ color: colors.textMuted, textAlign: 'center', fontSize: 13, lineHeight: 18 }}>
          {t('noSongsInDetail') || 'Nenhuma música no roteiro ainda.\nAdicione acima para começar!'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView 
      scrollEnabled={scrollEnabled} 
      style={{ flex: 1 }}
      contentContainerStyle={{ height: songs.length * ROW_HEIGHT + 20 }}
      nestedScrollEnabled={true}
      showsVerticalScrollIndicator={true}
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
              <View style={[
                styles.reorderBadge, 
                { 
                  backgroundColor: isPause 
                    ? colors.secondary + '20' 
                    : (isNote ? colors.warning + '20' : colors.primary + '15')
                }
              ]}>
                <Text style={{ 
                  fontSize: 11, 
                  fontWeight: '900', 
                  color: isPause ? colors.secondary : (isNote ? colors.warning : colors.primary) 
                }}>
                  {String(currentOrder.current.indexOf(index) + 1).padStart(2, '0')}
                </Text>
              </View>

              <Pressable 
                style={{ flex: 1, paddingVertical: 4 }}
                onPress={() => {
                  if (isPause || isNote) {
                    onEditCustomItem && onEditCustomItem(index, song);
                  } else {
                    onEditSong && onEditSong(song);
                  }
                }}
              >
                {isPause ? (
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ color: colors.secondary, fontWeight: '950', fontSize: 13 }}>
                        ⏸ PAUSA
                      </Text>
                      <Ionicons name="create-outline" size={12} color={colors.secondary} style={{ opacity: 0.7 }} />
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
                      <Ionicons name="create-outline" size={12} color={colors.warning} style={{ opacity: 0.7 }} />
                    </View>
                    <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 1 }}>
                      {t('tapToEditSongTip') || 'Toque para editar o texto'}
                    </Text>
                  </View>
                ) : (
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13, flexShrink: 1 }} numberOfLines={1}>
                        {song.name}
                      </Text>
                      <Ionicons name="create-outline" size={12} color={colors.primary} style={{ opacity: 0.6 }} />
                    </View>
                    <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 1 }} numberOfLines={1}>
                      {song.originalBand || ''} {song.key ? `• ${song.key}` : ''} {song.duration ? `• ⏱ ${song.duration}` : ''}
                    </Text>
                  </View>
                )}
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.removeBtn,
                  { backgroundColor: colors.danger + '18' },
                  pressed && { opacity: 0.7 }
                ]}
                onPress={() => onRemove(index)}
              >
                <Ionicons name="close" size={15} color={colors.danger} />
              </Pressable>

              <View 
                {...responder.panHandlers} 
                style={styles.dragHandle}
              >
                <Ionicons 
                  name="reorder-three" 
                  size={24} 
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

export default function SetlistModal({ visible, onClose, onSave, setlist, bands, songs, onEditSong }) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState('roteiro');
  const [name, setName] = useState('');
  const [type, setType] = useState('repertório');
  const [bandId, setBandId] = useState(null);
  const [date, setDate] = useState('');
  const [local, setLocal] = useState('');
  const [cachê, setCachê] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedSongs, setSelectedSongs] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const [selectedSongToSelect, setSelectedSongToSelect] = useState(null);
  const [editingCustomIndex, setEditingCustomIndex] = useState(null);
  const [tempCustomNotes, setTempCustomNotes] = useState('');
  const [tempCustomDuration, setTempCustomDuration] = useState('');

  useEffect(() => {
    if (visible) {
      if (setlist) {
        setName(setlist.name || '');
        setType(setlist.type || 'repertório');
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
        setActiveTab('roteiro');
      } else {
        setName('');
        setType('repertório');
        setBandId(bands.length > 0 ? bands[0].id : null);
        setDate('');
        setLocal('');
        setCachê('');
        setNotes('');
        setSelectedSongs([]);
        setActiveTab('roteiro');
      }
      setShowDropdown(false);
      setDropdownSearch('');
      setSelectedSongToSelect(null);
      setEditingCustomIndex(null);
    }
  }, [visible, setlist, bands]);

  const removeSongByIndex = (index) => {
    if (typeof Vibration !== 'undefined') Vibration.vibrate(10);
    const updated = selectedSongs.filter((_, idx) => idx !== index);
    setSelectedSongs(updated);
  };

  const updateSongItem = (index, updatedProps) => {
    const updated = [...selectedSongs];
    updated[index] = { ...updated[index], ...updatedProps };
    setSelectedSongs(updated);
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

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert(t('attention'), t('alertSetlistName'));
      setActiveTab('dados');
      return;
    }
    if (!bandId) {
      Alert.alert(t('attention'), t('alertSelectBand'));
      setActiveTab('dados');
      return;
    }
    if (!date.trim()) {
      Alert.alert(t('attention'), t('alertSetlistDate'));
      setActiveTab('dados');
      return;
    }
    if (selectedSongs.length === 0) {
      Alert.alert(t('attention'), t('alertSelectSong'));
      setActiveTab('roteiro');
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
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
                  {setlist ? (setlist.name || t('editSetlist')) : t('newSetlist')}
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.primary }]} numberOfLines={1}>
                  {t(type).toUpperCase()} • {bands.find(b => b.id === bandId)?.name || ''}
                </Text>
              </View>
              <Pressable 
                style={({ pressed }) => [styles.closePressable, pressed && { opacity: 0.7 }]}
                onPress={onClose}
              >
                <Text style={[styles.closeButton, { color: colors.danger }]}>✕</Text>
              </Pressable>
            </View>

            <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
              <Pressable
                style={[
                  styles.tabButton,
                  activeTab === 'roteiro' && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 }
                ]}
                onPress={() => setActiveTab('roteiro')}
              >
                <Ionicons 
                  name="musical-notes" 
                  size={15} 
                  color={activeTab === 'roteiro' ? colors.primary : colors.textMuted} 
                />
                <Text style={[
                  styles.tabButtonText,
                  { color: activeTab === 'roteiro' ? colors.primary : colors.textMuted }
                ]}>
                  {t('setlistTabRepertoire') || 'ROTEIRO'} ({selectedSongs.length})
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.tabButton,
                  activeTab === 'dados' && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 }
                ]}
                onPress={() => setActiveTab('dados')}
              >
                <Ionicons 
                  name="calendar-outline" 
                  size={15} 
                  color={activeTab === 'dados' ? colors.primary : colors.textMuted} 
                />
                <Text style={[
                  styles.tabButtonText,
                  { color: activeTab === 'dados' ? colors.primary : colors.textMuted }
                ]}>
                  {t('setlistTabDetails') || 'DADOS DO EVENTO'}
                </Text>
              </Pressable>
            </View>

            {activeTab === 'roteiro' && (
              <View style={{ flex: 1, padding: 16 }}>
                <View style={{ position: 'relative', zIndex: 10, marginBottom: 10 }}>
                  <Pressable 
                    style={[styles.dropdownSelector, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                    onPress={() => setShowDropdown(!showDropdown)}
                  >
                    <Text style={{ color: selectedSongToSelect ? colors.text : colors.textMuted, fontWeight: '700', fontSize: 13, flex: 1 }} numberOfLines={1}>
                      {selectedSongToSelect ? (selectedSongToSelect.id === -1 ? `⏸ ${t('pause').toUpperCase()}` : selectedSongToSelect.id === -2 ? `📝 ${t('noteItem') || 'ANOTAÇÃO / TEXTO'}` : `${selectedSongToSelect.originalBand} - ${selectedSongToSelect.name}`) : `${t('searchPlaceholder')}...`}
                    </Text>
                    <Ionicons name={showDropdown ? "chevron-up" : "chevron-down"} size={14} color={colors.textMuted} />
                  </Pressable>

                  {showDropdown && (
                    <View style={[styles.dropdownContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                      <TextInput
                        style={[styles.dropdownSearch, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border }]}
                        value={dropdownSearch}
                        onChangeText={setDropdownSearch}
                        placeholder={t('searchPlaceholderDesc')}
                        placeholderTextColor={colors.textMuted}
                        autoComplete="off"
                        importantForAutofill="no"
                      />
                      <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled showsVerticalScrollIndicator={true}>
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
                              <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>
                                <Text style={{ fontWeight: '900', color: colors.primary }}>{song.originalBand}</Text> - {song.name}
                              </Text>
                            </Pressable>
                          ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

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
                    if (typeof Vibration !== 'undefined') Vibration.vibrate(10);
                    setSelectedSongs([...selectedSongs, { id: selectedSongToSelect.id, customNotes: '', customDuration: '' }]);
                    setSelectedSongToSelect(null);
                  }}
                >
                  <Ionicons name="add-circle-outline" size={16} color="#fff" />
                  <Text style={styles.addButtonText}>{t('addToSetlist')}</Text>
                </Pressable>

                {selectedSongs.length > 0 && (
                  <View style={styles.tipBanner}>
                    <Text style={[styles.tipText, { color: colors.textMuted }]}>
                      💡 {t('dragToReorderTip') || 'Arraste por ☰ para ordenar'} • {t('tapToEditSongTip') || 'Toque para abrir editor'}
                    </Text>
                  </View>
                )}

                <View style={{ flex: 1 }}>
                  <DraggableSortableList
                    songs={orderedSongs}
                    onReorder={(newOrderIndices) => {
                      const reordered = newOrderIndices.map(originalIdx => selectedSongs[originalIdx]);
                      setSelectedSongs(reordered);
                    }}
                    onRemove={removeSongByIndex}
                    onEditSong={onEditSong}
                    onEditCustomItem={handleOpenCustomItemEditor}
                    colors={colors}
                    t={t}
                  />
                </View>
              </View>
            )}

            {activeTab === 'dados' && (
              <ScrollView 
                style={styles.modalBody} 
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
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
              </ScrollView>
            )}

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
    maxHeight: 750,
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
  modalSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
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
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  modalBody: {
    padding: 16,
    flex: 1,
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
    fontSize: 13,
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
    borderRadius: 8,
    borderWidth: 1.5,
  },
  dropdownContainer: {
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    maxHeight: 230,
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    zIndex: 999,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  dropdownSearch: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1.0,
    marginBottom: 8,
    fontSize: 13,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 8,
    marginBottom: 10,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tipBanner: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  tipText: {
    fontSize: 10.5,
    fontWeight: '700',
    textAlign: 'center',
  },
  reorderRowAbsolute: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    gap: 8,
  },
  reorderBadge: {
    width: 26,
    height: 26,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandle: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
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
