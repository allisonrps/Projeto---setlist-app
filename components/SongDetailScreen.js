import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  LayoutAnimation,
  UIManager,
  Linking,
  Modal,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../hooks/useLanguage';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function SongDetailScreen({
  visible = true,
  song,
  onBack,
  onSave,
  onDelete,
  onShare,
  onStartPerformance,
  onToggleFavorite,
}) {
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const isDark = colors.isDark;

  // Form states
  const [name, setName] = useState('');
  const [originalBand, setOriginalBand] = useState('');
  const [style, setStyle] = useState('');
  const [duration, setDuration] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [chords, setChords] = useState('');
  const [tabs, setTabs] = useState('');
  const [defaultView, setDefaultView] = useState('lyrics');
  const [scrollSpeed, setScrollSpeed] = useState('none');
  const [activeEditorTab, setActiveEditorTab] = useState('chords');
  const [links, setLinks] = useState([{ type: 'youtube', url: '' }]);
  const [showLinksSection, setShowLinksSection] = useState(false);
  const [showDetailsLayer, setShowDetailsLayer] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // Initial values snapshot to check dirty state
  const initialDataRef = useRef({});

  useEffect(() => {
    if (song && song.id) {
      const sName = song.name || '';
      const sBand = song.originalBand || '';
      const sStyle = song.style || '';
      const sDur = song.duration || '';
      const sLyrics = song.lyrics || '';
      const sChords = song.chords || '';
      const sTabs = song.tabs || '';
      const sDefView = song.defaultView || 'chords';
      const sSpeed = song.scrollSpeed || 'none';
      const sLinks = song.links && song.links.length > 0
        ? song.links.map(l => ({ type: l.type, url: l.url }))
        : [{ type: 'youtube', url: '' }];

      setName(sName);
      setOriginalBand(sBand);
      setStyle(sStyle);
      setDuration(sDur);
      setLyrics(sLyrics);
      setChords(sChords);
      setTabs(sTabs);
      setDefaultView(sDefView);
      setActiveEditorTab(sDefView || 'chords');
      setScrollSpeed(sSpeed);
      setLinks(sLinks);
      setIsFavorite(Boolean(song.isFavorite));

      initialDataRef.current = {
        name: sName,
        originalBand: sBand,
        style: sStyle,
        duration: sDur,
        lyrics: sLyrics,
        chords: sChords,
        tabs: sTabs,
        defaultView: sDefView,
        scrollSpeed: sSpeed,
        links: JSON.stringify(sLinks),
      };
    } else {
      // New song
      setName('');
      setOriginalBand('');
      setStyle('');
      setDuration('');
      setLyrics('');
      setChords('');
      setTabs('');
      setDefaultView('chords');
      setActiveEditorTab('chords');
      setScrollSpeed('none');
      setLinks([{ type: 'youtube', url: '' }]);
      setIsFavorite(false);
      setShowDetailsLayer(false); // Closed by default

      initialDataRef.current = {
        name: '',
        originalBand: '',
        style: '',
        duration: '',
        lyrics: '',
        chords: '',
        tabs: '',
        defaultView: 'chords',
        scrollSpeed: 'none',
        links: JSON.stringify([{ type: 'youtube', url: '' }]),
      };
    }
  }, [song]);

  const hasUnsavedChanges = () => {
    const init = initialDataRef.current;
    if (!init) return false;

    return (
      name !== init.name ||
      originalBand !== init.originalBand ||
      style !== init.style ||
      duration !== init.duration ||
      lyrics !== init.lyrics ||
      chords !== init.chords ||
      tabs !== init.tabs ||
      defaultView !== init.defaultView ||
      scrollSpeed !== init.scrollSpeed ||
      JSON.stringify(links) !== init.links
    );
  };

  const handleBackWithCheck = () => {
    if (hasUnsavedChanges()) {
      Alert.alert(
        t('attention') || 'Atenção',
        language === 'en'
          ? 'You have unsaved changes. Do you want to save before leaving?'
          : language === 'es'
          ? 'Tienes cambios sin guardar. ¿Deseas guardar antes de salir?'
          : 'Você tem alterações não salvas. Deseja salvar antes de sair?',
        [
          {
            text: language === 'en' ? 'Discard' : language === 'es' ? 'Descartar' : 'Descartar',
            style: 'destructive',
            onPress: onBack,
          },
          {
            text: language === 'en' ? 'Cancel' : language === 'es' ? 'Cancelar' : 'Cancelar',
            style: 'cancel',
          },
          {
            text: language === 'en' ? 'Save' : language === 'es' ? 'Guardar' : 'Salvar',
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

  const toggleDetailsLayer = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowDetailsLayer(prev => !prev);
  };

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
    if (!dur.trim()) return true;
    const regex = /^(\d{1,2}:)?\d{1,2}:\d{2}$|^\d+$/;
    return regex.test(dur.trim());
  };

  const handleSaveInternal = () => {
    if (!name.trim()) {
      Alert.alert(t('attention') || 'Atenção', t('alertSongName') || 'Informe o nome da música.');
      return;
    }
    if (!originalBand.trim()) {
      Alert.alert(t('attention') || 'Atenção', t('alertOriginalBand') || 'Informe o artista ou banda original.');
      return;
    }
    if (!validateDuration(duration)) {
      Alert.alert(
        t('invalidDurationTitle') || 'Duração Inválida',
        t('invalidDurationMsg') || 'Use o formato MM:SS (ex: 04:30).'
      );
      return;
    }

    const filledLinks = links.filter((l) => l.url.trim().length > 0);

    const songData = {
      ...(song || {}),
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
      isFavorite: isFavorite ? 1 : 0,
    };

    onSave(songData);
  };

  const handleDeleteWithConfirm = () => {
    if (!song || !song.id) {
      onBack();
      return;
    }

    Alert.alert(
      t('deleteSongConfirmTitle') || 'Excluir Música',
      (t('deleteSongConfirmMsg') || 'Deseja realmente excluir esta música?').replace('{name}', song.name || ''),
      [
        { text: t('cancel') || 'Cancelar', style: 'cancel' },
        {
          text: t('delete') || 'Excluir',
          style: 'destructive',
          onPress: () => {
            onDelete(song.id);
          },
        },
      ]
    );
  };

  const handlePlayStage = () => {
    const songPayload = {
      ...(song || {}),
      name: name.trim() || (song && song.name) || 'Música',
      originalBand: originalBand.trim() || (song && song.originalBand) || '',
      lyrics,
      chords,
      tabs,
      defaultView,
      scrollSpeed,
      style,
      duration,
      links,
    };
    onStartPerformance(songPayload);
  };

  const handleShareClick = () => {
    const songPayload = {
      ...(song || {}),
      name: name.trim() || (song && song.name) || 'Música',
      originalBand: originalBand.trim() || (song && song.originalBand) || '',
      lyrics,
      chords,
      tabs,
      defaultView,
      scrollSpeed,
      style,
      duration,
      links,
    };
    onShare && onShare(songPayload);
  };

  // 3 Distinct Background Layers:
  // Layer 1 (Header): Darkest
  const headerBg = isDark ? '#060911' : '#e2e8f0';
  // Layer 2 (Details): Medium Dark (lighter than header)
  const detailsBg = isDark ? '#0f172a' : '#f1f5f9';
  // Layer 3 (Editor): Lighter than details
  const editorBg = isDark ? '#172033' : '#ffffff';

  const tagsList = style
    ? style.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const totalTitleLen = (name?.length || 0) + (originalBand?.length || 0);
  const titleFontSize = totalTitleLen > 36 ? 14 : totalTitleLen > 26 ? 16 : totalTitleLen > 18 ? 18 : 20;
  const bandFontSize = totalTitleLen > 36 ? 13 : totalTitleLen > 26 ? 14 : totalTitleLen > 18 ? 16 : 18;

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
          Nome da música, Banda, Tags menores, e Botões circulares sem contorno
         ======================================================== */}
      <View style={[styles.headerLayer, { backgroundColor: headerBg }]}>
        {/* Top Controls Bar: Back & Action Buttons */}
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

          {/* Right Action Buttons: Save, Share, Delete, PLAY (Play after Delete) */}
          <View style={styles.headerActionsRight}>
            {/* Save (Disquete) */}
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

            {/* Share */}
            <Pressable
              style={({ pressed }) => [
                styles.circleActionBtn,
                { backgroundColor: colors.secondary + '20' },
                pressed && { opacity: 0.7, transform: [{ scale: 0.92 }] },
              ]}
              onPress={handleShareClick}
              hitSlop={6}
            >
              <Ionicons name="share-social-outline" size={18} color={colors.secondary} />
            </Pressable>

            {/* Delete (Lixeira) */}
            {song && song.id ? (
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

            {/* PLAY (Modo Palco) - Posicionado após a lixeira */}
            <Pressable
              style={({ pressed }) => [
                styles.circleActionBtn,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.7, transform: [{ scale: 0.92 }] },
              ]}
              onPress={handlePlayStage}
              hitSlop={6}
            >
              <Ionicons name="play" size={17} color="#ffffff" style={{ marginLeft: 2 }} />
            </Pressable>
          </View>
        </View>

        {/* Title and Artist Centered on Same Line with Parentheses */}
        <View style={styles.headerTitleCenterContainer}>
          <View style={styles.headerInlineRow}>
            <TextInput
              style={[
                styles.headerTitleInlineInput,
                { color: colors.text, fontSize: titleFontSize }
              ]}
              value={name}
              onChangeText={setName}
              placeholder={t('songNamePlaceholder') || 'Música'}
              placeholderTextColor={colors.textMuted}
              autoComplete="off"
              importantForAutofill="no"
              textAlign="center"
            />
            <Text style={[styles.headerParenthesesText, { color: colors.secondary, fontSize: bandFontSize }]}> (</Text>
            <TextInput
              style={[
                styles.headerBandInlineInput,
                { color: colors.secondary, fontSize: bandFontSize }
              ]}
              value={originalBand}
              onChangeText={setOriginalBand}
              placeholder={t('originalBandPlaceholder') || 'Banda'}
              placeholderTextColor={colors.textMuted}
              autoComplete="off"
              importantForAutofill="no"
              textAlign="center"
            />
            <Text style={[styles.headerParenthesesText, { color: colors.secondary, fontSize: bandFontSize }]}>)</Text>
          </View>

          {/* Tags preview row: background color from details layer, centered */}
          {tagsList.length > 0 && (
            <View style={styles.headerTagsRowCentered}>
              {tagsList.map((tag, idx) => (
                <View key={idx} style={[styles.headerTagChip, { backgroundColor: detailsBg }]}>
                  <Text style={[styles.headerTagText, { color: colors.primary }]}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* ========================================================
          CAMADA 2: DETALHES (ESCURO, PORÉM MAIS CLARO QUE O HEADER)
          Setinha para baixo (v) para expandir com transição suave
         ======================================================== */}
      <View style={[styles.detailsLayer, { backgroundColor: detailsBg }]}>
        {/* Toggle Bar */}
        <Pressable
          style={({ pressed }) => [
            styles.detailsToggleBar,
            pressed && { opacity: 0.8 },
          ]}
          onPress={toggleDetailsLayer}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="options-outline" size={16} color={colors.primary} />
            <Text style={[styles.detailsToggleText, { color: colors.text }]}>
              {t('songDetails') || 'Detalhes da Música'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons
              name={showDetailsLayer ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.primary}
            />
          </View>
        </Pressable>

        {/* Collapsible Content */}
        {showDetailsLayer && (
          <ScrollView
            style={styles.detailsScrollable}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            <View style={styles.detailsBody}>
              {/* Row 1: Tags & Duration */}
              <View style={styles.formRow}>
                <View style={{ flex: 1.2 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
                    {t('tagsLabel') || 'ESTILO / TAGS'}
                  </Text>
                  <TextInput
                    style={[
                      styles.cleanInput,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', color: colors.inputText }
                    ]}
                    value={style}
                    onChangeText={setStyle}
                    placeholder="rock, 80s, acustico"
                    placeholderTextColor={colors.textMuted}
                    autoComplete="off"
                    importantForAutofill="no"
                  />
                </View>

                <View style={{ flex: 0.8 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
                    {t('durationLabel') || 'DURAÇÃO'}
                  </Text>
                  <TextInput
                    style={[
                      styles.cleanInput,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', color: colors.inputText, textAlign: 'center' }
                    ]}
                    value={duration}
                    onChangeText={setDuration}
                    placeholder="04:30"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numbers-and-punctuation"
                    autoComplete="off"
                    importantForAutofill="no"
                  />
                </View>
              </View>

              {/* Row 2: Default Stage View */}
              <View style={{ marginTop: 10 }}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
                  {t('defaultViewLabel') || 'VISUALIZAÇÃO PADRÃO NO PALCO'}
                </Text>
                <View style={styles.pillSelectorRow}>
                  {[
                    { key: 'chords', label: t('chordsFormLabel') || 'Cifra', icon: 'musical-notes-outline' },
                    { key: 'lyrics', label: t('lyricsFormLabel') || 'Letra', icon: 'document-text-outline' },
                    { key: 'tabs', label: t('tabsFormLabel') || 'Tablatura', icon: 'list-outline' }
                  ].map((item) => {
                    const isSelected = defaultView === item.key;
                    return (
                      <Pressable
                        key={item.key}
                        style={({ pressed }) => [
                          styles.pillOptionBtn,
                          {
                            backgroundColor: isSelected
                              ? colors.primary
                              : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                          },
                          pressed && { opacity: 0.8 },
                        ]}
                        onPress={() => setDefaultView(item.key)}
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

              {/* Row 3: Autoscroll Speed */}
              <View style={{ marginTop: 10 }}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
                  {t('defaultScrollSpeed') || 'ROLAGEM AUTOMÁTICA (AUTOSCROLL)'}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6, paddingVertical: 2 }}
                >
                  {[
                    { key: 'none', label: 'OFF' },
                    { key: '0.5', label: '0.5x' },
                    { key: '1.0', label: '1.0x' },
                    { key: '1.25', label: '1.25x' },
                    { key: '1.5', label: '1.5x' },
                    { key: '1.75', label: '1.75x' },
                    { key: '2.0', label: '2.0x' }
                  ].map((item) => {
                    const isSelected = scrollSpeed === item.key;
                    return (
                      <Pressable
                        key={item.key}
                        style={({ pressed }) => [
                          styles.speedOptionBtn,
                          {
                            backgroundColor: isSelected
                              ? colors.primary
                              : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                          },
                          pressed && { opacity: 0.8 },
                        ]}
                        onPress={() => setScrollSpeed(item.key)}
                      >
                        <Text
                          style={[
                            styles.speedOptionText,
                            { color: isSelected ? '#ffffff' : colors.textMuted, fontWeight: isSelected ? '900' : '700' }
                          ]}
                        >
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Row 4: Support Links Section */}
              <View style={{ marginTop: 12 }}>
                <View style={styles.linksHeaderRow}>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted, marginBottom: 0 }]}>
                    {t('supportLinks') || 'LINKS DE APOIO'}
                  </Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.smallLinkAddBtn,
                      { backgroundColor: colors.primary + '18' },
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={addLinkField}
                  >
                    <Ionicons name="add" size={13} color={colors.primary} />
                    <Text style={[styles.smallLinkAddText, { color: colors.primary }]}>
                      {t('addLink') || 'Adicionar'}
                    </Text>
                  </Pressable>
                </View>

                {links.map((link, index) => (
                  <View key={index} style={[styles.linkRowItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
                    <View style={styles.linkTypePills}>
                      {['youtube', 'spotify', 'cifras'].map((type) => {
                        const isTypeActive = link.type === type;
                        return (
                          <Pressable
                            key={type}
                            style={[
                              styles.linkTypePill,
                              {
                                backgroundColor: isTypeActive
                                  ? (type === 'youtube' ? '#ef4444' : type === 'spotify' ? '#1db954' : colors.primary)
                                  : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                              }
                            ]}
                            onPress={() => updateLink(index, 'type', type)}
                          >
                            <Ionicons
                              name={type === 'youtube' ? 'logo-youtube' : type === 'spotify' ? 'logo-spotify' : 'document-text-outline'}
                              size={11}
                              color={isTypeActive ? '#ffffff' : colors.textMuted}
                            />
                          </Pressable>
                        );
                      })}
                    </View>

                    <TextInput
                      style={[
                        styles.linkUrlInput,
                        { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', color: colors.inputText }
                      ]}
                      value={link.url}
                      onChangeText={(val) => updateLink(index, 'url', val)}
                      placeholder="https://..."
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      autoComplete="off"
                      importantForAutofill="no"
                    />

                    {links.length > 1 && (
                      <Pressable
                        style={({ pressed }) => [styles.linkDeleteBtn, pressed && { opacity: 0.6 }]}
                        onPress={() => removeLink(index)}
                      >
                        <Ionicons name="trash-outline" size={15} color={colors.danger} />
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        )}
      </View>

      {/* ========================================================
          CAMADA 3: EDIÇÃO (MAIS CLARO QUE A CAMADA DE DETALHES)
          Abas Letra, Cifra, Tablatura e Campos de Edição em tela cheia
         ======================================================== */}
      <View style={[styles.editorLayer, { backgroundColor: editorBg }]}>
        {/* Editor Tab Switcher (Letra, Cifra, Tablatura) */}
        <View style={styles.editorTabBar}>
          {[
            { key: 'chords', label: t('chordsFormLabel') || 'Cifra', icon: 'musical-notes-outline' },
            { key: 'lyrics', label: t('lyricsFormLabel') || 'Letra', icon: 'document-text-outline' },
            { key: 'tabs', label: t('tabsFormLabel') || 'Tablatura', icon: 'list-outline' }
          ].map((tab) => {
            const isActive = activeEditorTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={({ pressed }) => [
                  styles.editorTabButton,
                  {
                    backgroundColor: isActive
                      ? colors.primary
                      : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                  },
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => setActiveEditorTab(tab.key)}
              >
                <Ionicons
                  name={tab.icon}
                  size={14}
                  color={isActive ? '#ffffff' : colors.textMuted}
                />
                <Text
                  style={[
                    styles.editorTabButtonText,
                    { color: isActive ? '#ffffff' : colors.textMuted, fontWeight: isActive ? '900' : '700' }
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Text Area for Active Tab */}
        <ScrollView
          style={styles.editorTextAreaContainer}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {activeEditorTab === 'chords' && (
            <TextInput
              style={[
                styles.fullTextArea,
                styles.monoFont,
                { color: colors.inputText }
              ]}
              value={chords}
              onChangeText={setChords}
              multiline
              placeholder={t('chordsFormLabel') ? `Cole ou digite os acordes e cifras aqui...` : 'Chords...'}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              importantForAutofill="no"
              textAlignVertical="top"
            />
          )}

          {activeEditorTab === 'lyrics' && (
            <TextInput
              style={[
                styles.fullTextArea,
                { color: colors.inputText }
              ]}
              value={lyrics}
              onChangeText={setLyrics}
              multiline
              placeholder={t('lyricsFormLabel') ? `Cole ou digite a letra da música aqui...` : 'Lyrics...'}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              importantForAutofill="no"
              textAlignVertical="top"
            />
          )}

          {activeEditorTab === 'tabs' && (
            <TextInput
              style={[
                styles.fullTextArea,
                styles.monoFont,
                { color: colors.inputText }
              ]}
              value={tabs}
              onChangeText={setTabs}
              multiline
              placeholder={t('tabsFormLabel') ? `Cole ou digite as tablaturas aqui...` : 'Tabs...'}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              importantForAutofill="no"
              textAlignVertical="top"
            />
          )}
        </ScrollView>
      </View>
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
    paddingTop: Platform.OS === 'ios' ? 56 : 42,
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
  headerTitleCenterContainer: {
    marginTop: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'nowrap',
    maxWidth: '100%',
  },
  headerTitleInlineInput: {
    fontWeight: '900',
    letterSpacing: -0.2,
    paddingVertical: 0,
    paddingHorizontal: 0,
    margin: 0,
    textAlign: 'center',
    flexShrink: 1,
  },
  headerBandInlineInput: {
    fontWeight: '750',
    paddingVertical: 0,
    paddingHorizontal: 0,
    margin: 0,
    textAlign: 'center',
    flexShrink: 1,
  },
  headerParenthesesText: {
    fontWeight: '800',
  },
  headerTagsRowCentered: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  headerTagChip: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  headerTagText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // ===== LAYER 2: DETAILS =====
  detailsLayer: {
    marginHorizontal: 10,
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    zIndex: 5,
    elevation: 3,
  },
  detailsToggleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  detailsToggleText: {
    fontSize: 13,
    fontWeight: '850',
    letterSpacing: 0.2,
  },
  miniDurationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  miniDurationText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailsScrollable: {
    maxHeight: 280,
  },
  detailsBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  cleanInput: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    fontSize: 13,
    fontWeight: '600',
  },
  pillSelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pillOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  pillOptionText: {
    fontSize: 12,
  },
  speedOptionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedOptionText: {
    fontSize: 11.5,
  },
  linksHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  smallLinkAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  smallLinkAddText: {
    fontSize: 11,
    fontWeight: '800',
  },
  linkRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 6,
    borderRadius: 10,
    marginBottom: 6,
  },
  linkTypePills: {
    flexDirection: 'row',
    gap: 4,
  },
  linkTypePill: {
    width: 26,
    height: 26,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkUrlInput: {
    flex: 1,
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  linkDeleteBtn: {
    padding: 4,
  },

  // ===== LAYER 3: EDITOR =====
  editorLayer: {
    flex: 1,
    marginHorizontal: 10,
    marginTop: 8,
    marginBottom: Platform.OS === 'ios' ? 26 : 22,
    borderRadius: 18,
    overflow: 'hidden',
  },
  editorTabBar: {
    flexDirection: 'row',
    padding: 8,
    gap: 8,
  },
  editorTabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 12,
  },
  editorTabButtonText: {
    fontSize: 12.5,
  },
  editorTextAreaContainer: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  fullTextArea: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
    flex: 1,
    minHeight: 240,
    padding: 0,
  },
  monoFont: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    lineHeight: 20,
  },
});
