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
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../hooks/useLanguage';

export default function SongModal({ visible, onClose, onSave, song }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const isDark = colors.isDark;

  const [name, setName] = useState('');
  const [originalBand, setOriginalBand] = useState('');
  const [style, setStyle] = useState('');
  const [duration, setDuration] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [chords, setChords] = useState('');
  const [tabs, setTabs] = useState('');
  const [defaultView, setDefaultView] = useState('lyrics');
  const [scrollSpeed, setScrollSpeed] = useState('none');
  const [activeEditorTab, setActiveEditorTab] = useState('lyrics');
  const [links, setLinks] = useState([{ type: 'youtube', url: '' }]);
  const [showLinksSection, setShowLinksSection] = useState(false);
  const [showSongDetails, setShowSongDetails] = useState(false);

  useEffect(() => {
    if (visible) {
      if (song) {
        setName(song.name);
        setOriginalBand(song.originalBand);
        setStyle(song.style || '');
        setDuration(song.duration || '');
        setLyrics(song.lyrics || '');
        setChords(song.chords || '');
        setTabs(song.tabs || '');
        setDefaultView(song.defaultView || 'lyrics');
        setScrollSpeed(song.scrollSpeed || 'none');
        setActiveEditorTab('lyrics');
        const hasLinks = song.links && song.links.length > 0;
        setLinks(
          hasLinks
            ? song.links.map(l => ({ type: l.type, url: l.url }))
            : [{ type: 'youtube', url: '' }]
        );
        setShowLinksSection(false);
        setShowSongDetails(false);
      } else {
        setName('');
        setOriginalBand('');
        setStyle('');
        setDuration('');
        setLyrics('');
        setChords('');
        setTabs('');
        setDefaultView('lyrics');
        setScrollSpeed('none');
        setActiveEditorTab('lyrics');
        setLinks([{ type: 'youtube', url: '' }]);
        setShowLinksSection(false);
        setShowSongDetails(false);
      }
    }
  }, [visible, song]);

  const addLinkField = () => {
    setLinks([...links, { type: 'youtube', url: '' }]);
  };

  const updateLink = (index, field, value) => {
    const updated = [...links];
    updated[index][field] = value;
    setLinks(updated);
  };

  const removeLink = (index) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const validateDuration = (dur) => {
    if (!dur.trim()) return true; // Opcional
    
    // Expressão regular simples para aceitar MM:SS, HH:MM:SS ou apenas minutos
    const regex = /^(\d{1,2}:)?\d{1,2}:\d{2}$|^\d+$/;
    return regex.test(dur.trim());
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert(t('attention'), t('alertSongName'));
      return;
    }
    if (!originalBand.trim()) {
      Alert.alert(t('attention'), t('alertOriginalBand'));
      return;
    }

    if (!validateDuration(duration)) {
      Alert.alert(
        t('invalidDurationTitle'),
        t('invalidDurationMsg')
      );
      return;
    }

    const filledLinks = links.filter((l) => l.url.trim().length > 0);

    onSave({
      name: name.trim(),
      originalBand: originalBand.trim(),
      style: style.trim(),
      duration: duration.trim() || null,
      lyrics: lyrics.trim(),
      chords: chords.trim(),
      tabs: tabs.trim(),
      defaultView: defaultView,
      scrollSpeed: scrollSpeed,
      links: filledLinks,
    });
  };

  return (
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
              {song ? t('editSong') : t('newSong')}
            </Text>
            <Pressable 
              style={({ pressed }) => [styles.closePressable, pressed && { opacity: 0.7 }]}
              onPress={onClose}
            >
              <Ionicons name="close" size={20} color={colors.danger} />
            </Pressable>
          </View>

          <ScrollView 
            style={styles.modalBody} 
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('songNameLabel')}</Text>
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

            {/* Banda Original */}
            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('originalBandLabel')}</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.inputBackground, 
                color: colors.inputText,
                borderColor: colors.border
              }]}
              value={originalBand}
              onChangeText={setOriginalBand}
              autoComplete="off"
              importantForAutofill="no"
            />

            {/* Seção Ocultável de Detalhes da Música (com Olho Fechado por padrão) */}
            <View style={[styles.sectionHeaderRow, { marginTop: 6, marginBottom: showSongDetails ? 12 : 8 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="options-outline" size={15} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 12, fontWeight: '850' }]}>
                  {t('songDetails')}
                </Text>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.eyeToggleBtn,
                  { backgroundColor: colors.border },
                  pressed && { opacity: 0.7 }
                ]}
                onPress={() => setShowSongDetails(!showSongDetails)}
              >
                <Ionicons 
                  name={showSongDetails ? "eye-outline" : "eye-off-outline"} 
                  size={16} 
                  color={colors.text} 
                />
              </Pressable>
            </View>

            {showSongDetails && (
              <View style={[styles.songDetailsContainer, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)' }]}>
                {/* Linha: Tags e Duração */}
                <View style={styles.rowInputs}>
                  {/* Estilo */}
                  <View style={{ flex: 1.1 }}>
                    <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('tagsLabel')}</Text>
                    <TextInput
                      style={[styles.input, { 
                        backgroundColor: colors.inputBackground, 
                        color: colors.inputText,
                        borderColor: colors.border
                      }]}
                      value={style}
                      onChangeText={setStyle}
                      autoComplete="off"
                      importantForAutofill="no"
                    />
                  </View>
                  {/* Duração */}
                  <View style={{ flex: 0.9 }}>
                    <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('durationLabel')}</Text>
                    <TextInput
                      style={[styles.input, { 
                        backgroundColor: colors.inputBackground, 
                        color: colors.inputText,
                        borderColor: colors.border
                      }]}
                      value={duration}
                      onChangeText={setDuration}
                      keyboardType="numbers-and-punctuation"
                      autoComplete="off"
                      importantForAutofill="no"
                    />
                  </View>
                </View>

                {/* Links de Apoio */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginTop: 4 }}>
                  <Text style={[styles.sectionLabel, { color: colors.text, marginBottom: 0, borderBottomWidth: 0, fontSize: 10.5 }]}>
                    {t('supportLinks').toUpperCase()}
                  </Text>
                  <Pressable
                    style={({ pressed }) => [{ padding: 4, opacity: pressed ? 0.7 : 1 }]}
                    onPress={() => setShowLinksSection(!showLinksSection)}
                  >
                    <Ionicons 
                      name={showLinksSection ? "eye-outline" : "eye-off-outline"} 
                      size={16} 
                      color={showLinksSection ? colors.primary : colors.textMuted} 
                    />
                  </Pressable>
                </View>

                {showLinksSection && (
                  <>
                    {links.map((link, index) => (
                      <View key={index} style={[styles.linkContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }]}>
                        <View style={styles.linkTypeSelector}>
                          {['youtube', 'spotify', 'cifras'].map((type) => (
                            <Pressable
                              key={type}
                              style={[
                                styles.linkTypeButton,
                                { borderColor: colors.border },
                                link.type === type && { backgroundColor: colors.primary, borderColor: colors.primary },
                              ]}
                              onPress={() => updateLink(index, 'type', type)}
                            >
                              <Text style={[
                                styles.linkTypeButtonText,
                                { color: link.type === type ? '#fff' : colors.textMuted }
                              ]}>
                                {type === 'youtube' ? 'YouTube' : type === 'spotify' ? 'Spotify' : t('cifras')}
                              </Text>
                            </Pressable>
                          ))}
                        </View>

                        <TextInput
                          style={[styles.input, { 
                            backgroundColor: colors.inputBackground, 
                            color: colors.inputText,
                            borderColor: colors.border,
                            marginBottom: 8,
                            borderRadius: 6,
                            paddingVertical: 10
                          }]}
                          value={link.url}
                          onChangeText={(val) => updateLink(index, 'url', val)}
                          autoCapitalize="none"
                          autoComplete="off"
                          importantForAutofill="no"
                        />

                        {links.length > 1 && (
                          <Pressable 
                            style={({ pressed }) => [styles.removeLinkButton, pressed && { opacity: 0.7 }]} 
                            onPress={() => removeLink(index)}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                              <Ionicons name="trash-outline" size={13} color={colors.danger} />
                              <Text style={[styles.removeLinkText, { color: colors.danger }]}>{t('removeLink')}</Text>
                            </View>
                          </Pressable>
                        )}
                      </View>
                    ))}

                    <Pressable 
                      style={({ pressed }) => [
                        styles.addLinkButton, 
                        { borderColor: colors.primary, opacity: pressed ? 0.7 : 1, marginBottom: 8 }
                      ]} 
                      onPress={addLinkField}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="add-circle-outline" size={14} color={colors.primary} />
                        <Text style={[styles.addLinkButtonText, { color: colors.primary }]}>{t('addLink')}</Text>
                      </View>
                    </Pressable>
                  </>
                )}

                {/* Visualização Padrão no Palco */}
                <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 8 }]}>{t('defaultViewLabel').toUpperCase()} *</Text>
                <View style={styles.tabSelectorRow}>
                  {[
                    { key: 'lyrics', label: t('lyricsFormLabel'), icon: 'document-text-outline' },
                    { key: 'chords', label: t('chordsFormLabel'), icon: 'musical-notes-outline' },
                    { key: 'tabs', label: t('tabsFormLabel'), icon: 'list-outline' }
                  ].map(item => (
                    <Pressable
                      key={item.key}
                      style={[
                        styles.tabSelectButton,
                        { borderColor: colors.border },
                        defaultView === item.key && { backgroundColor: colors.primary, borderColor: colors.primary }
                      ]}
                      onPress={() => setDefaultView(item.key)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                        <Ionicons 
                          name={item.icon} 
                          size={13} 
                          color={defaultView === item.key ? '#fff' : colors.textMuted} 
                        />
                        <Text style={[
                          styles.tabSelectText,
                          { color: defaultView === item.key ? '#fff' : colors.textMuted }
                        ]}>
                          {item.label}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>

                {/* Velocidade de Rolagem Padrão (Autoscroll) */}
                <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 12 }]}>{t('defaultScrollSpeed').toUpperCase()}</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 4 }}
                  contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                >
                  {[
                    { key: 'none', label: 'OFF', isOff: true },
                    { key: '0.5', label: '0.5x' },
                    { key: '1.0', label: '1.0x' },
                    { key: '1.25', label: '1.25x' },
                    { key: '1.5', label: '1.5x' },
                    { key: '1.75', label: '1.75x' },
                    { key: '2.0', label: '2.0x' }
                  ].map(item => (
                    <Pressable
                      key={item.key}
                      style={({ pressed }) => [
                        styles.tabSelectButton,
                        { 
                          borderColor: colors.border,
                          backgroundColor: scrollSpeed === item.key ? colors.primary : colors.cardBackground,
                          minWidth: 54,
                          paddingHorizontal: 8,
                        },
                        pressed && { opacity: 0.8 }
                      ]}
                      onPress={() => setScrollSpeed(item.key)}
                    >
                      {item.isOff ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="close-circle-outline" size={13} color={scrollSpeed === item.key ? '#fff' : colors.textMuted} />
                          <Text style={[
                            styles.tabSelectText,
                            { color: scrollSpeed === item.key ? '#fff' : colors.textMuted, fontWeight: scrollSpeed === item.key ? '900' : '650' }
                          ]}>
                            OFF
                          </Text>
                        </View>
                      ) : (
                        <Text style={[
                          styles.tabSelectText,
                          { color: scrollSpeed === item.key ? '#fff' : colors.textMuted, fontWeight: scrollSpeed === item.key ? '900' : '650' }
                        ]}>
                          {item.label}
                        </Text>
                      )}
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Abas de Edição de Conteúdo */}
            <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 8 }]}>{t('editSongContent').toUpperCase()}</Text>
            <View style={styles.tabSelectorRow}>
              {[
                { key: 'lyrics', label: t('lyricsFormLabel'), icon: 'document-text-outline' },
                { key: 'chords', label: t('chordsFormLabel'), icon: 'musical-notes-outline' },
                { key: 'tabs', label: t('tabsFormLabel'), icon: 'list-outline' }
              ].map(item => (
                <Pressable
                  key={item.key}
                  style={[
                    styles.tabSelectButton,
                    { borderColor: colors.border },
                    activeEditorTab === item.key && { backgroundColor: colors.secondary, borderColor: colors.secondary }
                  ]}
                  onPress={() => setActiveEditorTab(item.key)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                    <Ionicons 
                      name={item.icon} 
                      size={13} 
                      color={activeEditorTab === item.key ? '#fff' : colors.textMuted} 
                    />
                    <Text style={[
                      styles.tabSelectText,
                      { color: activeEditorTab === item.key ? '#fff' : colors.textMuted }
                    ]}>
                      {item.label}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>

            {activeEditorTab === 'lyrics' && (
              <TextInput
                style={[styles.input, styles.textArea, { 
                  backgroundColor: colors.inputBackground, 
                  color: colors.inputText,
                  borderColor: colors.border
                }]}
                value={lyrics}
                onChangeText={setLyrics}
                multiline
                numberOfLines={12}
                autoCapitalize="none"
                autoComplete="off"
                spellCheck={false}
                importantForAutofill="no"
              />
            )}

            {activeEditorTab === 'chords' && (
              <TextInput
                style={[styles.input, styles.textArea, styles.monoTextArea, { 
                  backgroundColor: colors.inputBackground, 
                  color: colors.inputText,
                  borderColor: colors.border
                }]}
                value={chords}
                onChangeText={setChords}
                multiline
                numberOfLines={12}
                autoCapitalize="none"
                autoComplete="off"
                spellCheck={false}
                importantForAutofill="no"
              />
            )}

            {activeEditorTab === 'tabs' && (
              <TextInput
                style={[styles.input, styles.textArea, styles.monoTextArea, { 
                  backgroundColor: colors.inputBackground, 
                  color: colors.inputText,
                  borderColor: colors.border
                }]}
                value={tabs}
                onChangeText={setTabs}
                multiline
                numberOfLines={12}
                autoCapitalize="none"
                autoComplete="off"
                spellCheck={false}
                importantForAutofill="no"
              />
            )}

            <Pressable 
              style={({ pressed }) => [
                styles.saveButton, 
                { backgroundColor: colors.success },
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }
              ]} 
              onPress={handleSave}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={styles.saveButtonText}>
                  {song ? t('saveChanges') : t('saveSong')}
                </Text>
              </View>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
    marginTop: 8,
    marginBottom: 16,
    paddingBottom: 6,
    borderBottomWidth: 1,
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    marginBottom: 12,
    borderWidth: 1.0,
    fontSize: 14,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  linkContainer: {
    borderWidth: 1.0,
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  linkTypeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  linkTypeButton: {
    flex: 1,
    paddingVertical: 6,
    borderWidth: 1.0,
    borderRadius: 6,
    alignItems: 'center',
  },
  linkTypeButtonText: {
    fontSize: 11,
    fontWeight: '800',
  },
  removeLinkButton: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
  },
  removeLinkText: {
    fontSize: 12,
    fontWeight: '850',
  },
  addLinkButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  addLinkButtonText: {
    fontWeight: '800',
    fontSize: 13,
  },
  textArea: {
    minHeight: 280,
    textAlignVertical: 'top',
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
  tabSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tabSelectButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.0,
  },
  tabSelectText: {
    fontSize: 11,
    fontWeight: '800',
  },
  monoTextArea: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 13,
    lineHeight: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '850',
    letterSpacing: 0.5,
  },
  eyeToggleBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  songDetailsContainer: {
    borderWidth: 1.0,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
});
