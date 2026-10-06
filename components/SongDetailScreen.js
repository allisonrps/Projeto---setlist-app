import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Alert,
  LayoutAnimation,
  UIManager,
  Linking,
  Modal,
  StatusBar,
  Animated,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../hooks/useLanguage';
import PulsingStageButton from './PulsingStageButton';

if (Platform.OS === 'android' && !global.nativeFabricUIManager && UIManager.setLayoutAnimationEnabledExperimental) {
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
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const [isBandFocused, setIsBandFocused] = useState(false);
  const [style, setStyle] = useState('');
  const [duration, setDuration] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [chords, setChords] = useState('');
  const [tabs, setTabs] = useState('');
  const [defaultView, setDefaultView] = useState('lyrics');
  const [scrollSpeed, setScrollSpeed] = useState('none');
  const [activeEditorTab, setActiveEditorTab] = useState('chords');
  const [links, setLinks] = useState([]);
  const [showLinksSection, setShowLinksSection] = useState(false);
  const [showDetailsLayer, setShowDetailsLayer] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // Keyboard and Auto-lift Scroll refs and states
  const scrollViewRef = useRef(null);
  const isEditingRef = useRef(false);
  const cursorSelectionRef = useRef({ start: 0, end: 0 });
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const h = e.endCoordinates ? e.endCoordinates.height : 0;
      setKeyboardHeight(h);
      if (isEditingRef.current) {
        const text = activeEditorTab === 'chords' ? chords : activeEditorTab === 'lyrics' ? lyrics : tabs;
        const curEnd = cursorSelectionRef.current?.end || 0;
        if (curEnd >= (text?.length || 0) - 25) {
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      }
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [activeEditorTab, chords, lyrics, tabs]);

  const handleEditorFocus = () => {
    isEditingRef.current = true;
  };

  const handleEditorBlur = () => {
    isEditingRef.current = false;
  };

  const handleSelectionChange = (e) => {
    cursorSelectionRef.current = e.nativeEvent.selection;
  };

  const handleTextChangeAutoLift = (newVal) => {
    const curEnd = cursorSelectionRef.current?.end || 0;
    if (curEnd >= (newVal?.length || 0) - 20) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 50);
    }
  };

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
        : [];

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
      setLinks([]);
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
        links: JSON.stringify([]),
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
        t('unsavedChangesMsg') || 'Você tem alterações não salvas. Deseja salvar antes de sair?',
        [
          {
            text: t('discard') || 'Descartar',
            style: 'destructive',
            onPress: onBack,
          },
          {
            text: t('cancel') || 'Cancelar',
            style: 'cancel',
          },
          {
            text: t('saveAction') || 'Salvar',
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
      name: name.trim() || (song && song.name) || t('song') || 'Música',
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
      name: name.trim() || (song && song.name) || t('song') || 'Música',
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
      {/* ========================================================
          BARRA DE CONTROLES FIXA NO TOPO: Voltar, Salvar, Compartilhar, Lixeira, Palco
         ======================================================== */}
      <View style={[styles.fixedHeaderBar, { backgroundColor: headerBg }]}>
        {/* Top Controls Bar: Back & Action Buttons */}
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

          {/* PLAY (Modo Palco com efeito pulsante) */}
          <PulsingStageButton variant="icon" onPress={handlePlayStage} color={colors.primary} iconName="mic" />
        </View>
      </View>

      {/* ========================================================
          SCROLLVIEW PRINCIPAL: Cabeçalho retrátil e Abas fixas (STICKY)
         ======================================================== */}
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingBottom: Platform.OS === 'ios' ? 80 : (keyboardHeight > 0 ? keyboardHeight + 140 : 60),
        }}
      >
        {/* INDEX 0: TÍTULO, BANDA, TAGS E DETALHES RETRÁTEIS */}
        <View>
          <View style={[styles.headerTitleLayer, { backgroundColor: headerBg }]}>
            <View style={styles.headerTitleCenterContainer}>
              {/* Campos Lado a Lado: Nome da Música & Artista/Banda (Sem Ícones) */}
              <View style={styles.headerInputsRow}>
                {/* Nome da Música */}
                <View style={[
                  styles.headerInputBox,
                  {
                    flex: 1.15,
                    backgroundColor: isTitleFocused ? (colors.primary + '18') : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.035)'),
                    borderColor: isTitleFocused ? colors.primary : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'),
                  }
                ]}>
                  <TextInput
                    maxLength={200}
                    style={[
                      styles.headerTitleInlineInput,
                      { color: colors.text }
                    ]}
                    value={name}
                    onChangeText={setName}
                    onFocus={() => setIsTitleFocused(true)}
                    onBlur={() => setIsTitleFocused(false)}
                    placeholder={t('songNamePlaceholder') || 'Nome da Música'}
                    placeholderTextColor={colors.textMuted}
                    autoComplete="off"
                    importantForAutofill="no"
                    textAlign="center"
                  />
                </View>

                {/* Artista / Banda */}
                <View style={[
                  styles.headerInputBox,
                  {
                    flex: 0.95,
                    backgroundColor: isBandFocused ? (colors.primary + '18') : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)'),
                    borderColor: isBandFocused ? colors.primary : (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)'),
                  }
                ]}>
                  <TextInput
                    maxLength={200}
                    style={[
                      styles.headerBandInlineInput,
                      { color: colors.primary }
                    ]}
                    value={originalBand}
                    onChangeText={setOriginalBand}
                    onFocus={() => setIsBandFocused(true)}
                    onBlur={() => setIsBandFocused(false)}
                    placeholder={t('originalBandPlaceholder') || 'Artista / Banda'}
                    placeholderTextColor={colors.textMuted}
                    autoComplete="off"
                    importantForAutofill="no"
                    textAlign="center"
                  />
                </View>
              </View>

              {/* Tags preview row: background color from details layer, centered */}
              {tagsList.length > 0 && (
                <View style={styles.headerTagsRowCentered}>
                  {tagsList.map((tag, idx) => (
                    <View key={idx} style={[styles.headerTagChip, { backgroundColor: detailsBg }]}>
                      <Text style={[styles.headerTagText, { color: colors.secondary }]}>{tag}</Text>
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
          <View style={styles.detailsBody}>
              {/* Row 1: Tags & Duration */}
              <View style={styles.formRow}>
                <View style={{ flex: 1.2 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
                    {t('tagsLabel') || 'ESTILO / TAGS'}
                  </Text>
                  <TextInput
                    maxLength={300}
                    style={[
                      styles.cleanInput,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', color: colors.inputText }
                    ]}
                    value={style}
                    onChangeText={setStyle}
                    placeholder={t('tagsPlaceholder') || "rock, 80s, acustico"}
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
                    maxLength={10}
                    style={[
                      styles.cleanInput,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', color: colors.inputText, textAlign: 'center' }
                    ]}
                    value={duration}
                    onChangeText={setDuration}
                    placeholder={t('durationPlaceholder') || "04:30"}
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

                {links.length === 0 ? (
                  <View style={{ paddingVertical: 8, paddingHorizontal: 4 }}>
                    <Text style={{ fontSize: 11, color: colors.textMuted, fontStyle: 'italic' }}>
                      {t('noSupportLinksMsg') || 'Nenhum link de apoio adicionado. Toque em + Adicionar acima.'}
                    </Text>
                  </View>
                ) : (
                  links.map((link, index) => (
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
                        maxLength={500}
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

                      <Pressable
                        style={({ pressed }) => [styles.linkDeleteBtn, pressed && { opacity: 0.6 }]}
                        onPress={() => removeLink(index)}
                      >
                        <Ionicons name="trash-outline" size={15} color={colors.danger} />
                      </Pressable>
                    </View>
                  ))
                )}
              </View>
            </View>
        )}
      </View>
    </View>

    {/* INDEX 1: STICKY HEADER - ABAS DE EDIÇÃO (CIFRA, LETRA, TABLATURA) */}
    <View style={[styles.editorTabBarSticky, { backgroundColor: editorBg }]}>
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
    </View>

    {/* INDEX 2: ÁREA DE TEXTO DO EDITOR ATIVO (EXPANDE NATURALMENTE) */}
    <View style={[styles.editorContentWrapper, { backgroundColor: editorBg }]}>
      {activeEditorTab === 'chords' && (
        <TextInput
          maxLength={50000}
          style={[
            styles.fullTextArea,
            styles.monoFont,
            { color: colors.inputText }
          ]}
          value={chords}
          onChangeText={(val) => {
            setChords(val);
            handleTextChangeAutoLift(val);
          }}
          onFocus={handleEditorFocus}
          onBlur={handleEditorBlur}
          onSelectionChange={handleSelectionChange}
          multiline
          scrollEnabled={false}
          placeholder={t('chordsPlaceholder')}
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
          maxLength={50000}
          style={[
            styles.fullTextArea,
            { color: colors.inputText }
          ]}
          value={lyrics}
          onChangeText={(val) => {
            setLyrics(val);
            handleTextChangeAutoLift(val);
          }}
          onFocus={handleEditorFocus}
          onBlur={handleEditorBlur}
          onSelectionChange={handleSelectionChange}
          multiline
          scrollEnabled={false}
          placeholder={t('lyricsPlaceholder')}
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
          maxLength={50000}
          style={[
            styles.fullTextArea,
            styles.monoFont,
            { color: colors.inputText }
          ]}
          value={tabs}
          onChangeText={(val) => {
            setTabs(val);
            handleTextChangeAutoLift(val);
          }}
          onFocus={handleEditorFocus}
          onBlur={handleEditorBlur}
          onSelectionChange={handleSelectionChange}
          multiline
          scrollEnabled={false}
          placeholder={t('tabsPlaceholder')}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          importantForAutofill="no"
          textAlignVertical="top"
        />
      )}

      {keyboardHeight > 0 && <View style={{ height: keyboardHeight + 40 }} />}
    </View>
  </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ===== LAYER 1: HEADER =====
  fixedHeaderBar: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : (Platform.OS === 'ios' ? 52 : 10),
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  headerTitleLayer: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
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
  headerInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingHorizontal: 8,
  },
  headerInputBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  headerTitleInlineInput: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
    paddingVertical: 0,
    paddingHorizontal: 0,
    margin: 0,
    textAlign: 'center',
    width: '100%',
  },
  headerBandInlineInput: {
    fontSize: 14,
    fontWeight: '700',
    paddingVertical: 0,
    paddingHorizontal: 0,
    margin: 0,
    textAlign: 'center',
    width: '100%',
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
  editorTabBarSticky: {
    zIndex: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.25)',
  },
  editorTabBar: {
    flexDirection: 'row',
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
  editorContentWrapper: {
    flex: 1,
    minHeight: 400,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  fullTextArea: {
    fontSize: 14.5,
    lineHeight: 23,
    fontWeight: '500',
    minHeight: 350,
    padding: 0,
  },
  monoFont: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13.5,
    lineHeight: 21,
  },
});
