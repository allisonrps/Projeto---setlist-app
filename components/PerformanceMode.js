import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Linking,
  Alert,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../hooks/useLanguage';

// Componente customizado para letreiro correndo (Marquee) compatível com React Native
function MarqueeText({ text, style }) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);

  useEffect(() => {
    animatedValue.setValue(0);
    if (textWidth > containerWidth && containerWidth > 0) {
      const duration = (textWidth - containerWidth) * 35 + 2500;
      const animation = Animated.loop(
        Animated.sequence([
          Animated.delay(2000), // Pausa inicial no início do nome
          Animated.timing(animatedValue, {
            toValue: -(textWidth - containerWidth + 24),
            duration: duration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.delay(1500), // Pausa final após completar a rolagem
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: true,
          })
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [text, containerWidth, textWidth]);

  const isScrolling = textWidth > containerWidth && containerWidth > 0;

  return (
    <View 
      style={{ overflow: 'hidden', flex: 1, justifyContent: 'center', alignItems: isScrolling ? 'flex-start' : 'center' }} 
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {/* Texto invisível fora da tela para medir o tamanho real sem truncamento do flex */}
      <Text
        style={[
          style,
          {
            position: 'absolute',
            opacity: 0,
            left: -9999,
            width: 'auto',
          }
        ]}
        numberOfLines={1}
        onLayout={(e) => {
          setTextWidth(e.nativeEvent.layout.width);
        }}
      >
        {text}
      </Text>

      <Animated.Text
        numberOfLines={1}
        style={[
          style, 
          { 
            transform: [{ translateX: animatedValue }], 
            width: textWidth ? textWidth : 'auto',
            textAlign: isScrolling ? 'left' : 'center',
          }
        ]}
      >
        {text}
      </Animated.Text>
    </View>
  );
}

export default function PerformanceMode({ visible, onClose, setlist, onEditSong }) {
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const isDark = colors.isDark;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fontSize, setFontSize] = useState(20); // Letras levemente maiores por padrão
  const [activeView, setActiveView] = useState('lyrics');
  const [showLinks, setShowLinks] = useState(false);
  const [showSongList, setShowSongList] = useState(false);

  const songs = setlist?.songs || [];
  
  // Safe index to prevent out-of-bounds array access when switching setlists
  const activeIndex = currentIndex >= songs.length ? 0 : currentIndex;
  const currentSong = songs[activeIndex];

  // Sync state index if it gets out of bounds
  useEffect(() => {
    if (currentIndex >= songs.length) {
      setCurrentIndex(0);
    }
  }, [setlist, songs.length]);

  const parseDurationToSeconds = (durStr) => {
    if (!durStr) return 0;
    const clean = durStr.toLowerCase().replace(/min/g, '').trim();
    if (clean.includes(':')) {
      const parts = clean.split(':').map(p => parseInt(p, 10) || 0);
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      return 0;
    }
    const num = parseInt(clean, 10);
    return isNaN(num) ? 0 : num * 60; // Trata número puro como minutos por padrão
  };

  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  // Efeito para carregar a duração da pausa ao entrar nela
  useEffect(() => {
    if (currentSong && currentSong.id === -1) {
      const seconds = parseDurationToSeconds(currentSong.customDuration);
      setTimeLeft(seconds);
      setTimerActive(seconds > 0);
    } else {
      setTimerActive(false);
    }
  }, [activeIndex, currentSong]);

  // Efeito para decrementar o timer
  useEffect(() => {
    let interval;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const scrollY = useRef(0);
  const contentHeight = useRef(0);
  const scrollViewHeight = useRef(0);
  const scrollViewRef = useRef(null);

  const [currentScrollSpeed, setCurrentScrollSpeed] = useState('none');

  // Efeito para o autoscroll da letra/cifra/tablatura
  useEffect(() => {
    let intervalId;
    if (visible && !showSongList && currentScrollSpeed !== 'none' && currentSong && currentSong.id !== -1) {
      const speedFactor = parseFloat(currentScrollSpeed) || 1.0;
      // Ajustamos a frequência para 50ms e a velocidade base para 0.9 pixels por tick
      // Assim, a 1.0x movemos 0.9px por tick, e a 2.0x movemos 1.8px por tick (exatamente o dobro!).
      // Arredondamos o valor final no scrollTo para evitar perdas de dízimas no motor de renderização.
      const pixelsPerTick = 0.9 * speedFactor;

      intervalId = setInterval(() => {
        const maxScroll = contentHeight.current - scrollViewHeight.current;
        if (maxScroll > 0) {
          scrollY.current += pixelsPerTick;
          if (scrollY.current >= maxScroll) {
            scrollY.current = maxScroll;
            setCurrentScrollSpeed('none'); // Para no final
          }
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollTo({
              y: Math.round(scrollY.current),
              animated: false,
            });
          }
        }
      }, 50);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [visible, showSongList, currentScrollSpeed, currentSong]);

  // Efeito para resetar a posição de rolagem e carregar a velocidade padrão
  useEffect(() => {
    if (visible && currentSong) {
      scrollY.current = 0;
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: false });
      }
      if (currentSong.id === -1) {
        setCurrentScrollSpeed('none');
      } else {
        setCurrentScrollSpeed(currentSong.scrollSpeed || 'none');
      }
      setShowLinks(false);
      setActiveView(currentSong.defaultView || 'lyrics');
    }
  }, [visible, activeIndex, currentSong]);

  useEffect(() => {
    if (!visible) {
      setShowSongList(false);
    }
  }, [visible]);

  const handleScroll = (event) => {
    scrollY.current = event.nativeEvent.contentOffset.y;
  };

  const handleCycleSpeed = () => {
    const speeds = ['none', '0.5', '1.0', '1.25', '1.5', '1.75', '2.0'];
    const nextIdx = (speeds.indexOf(currentScrollSpeed) + 1) % speeds.length;
    setCurrentScrollSpeed(speeds[nextIdx]);
  };

  if (!visible || !setlist || songs.length === 0) return null;

  const handleNext = () => {
    if (activeIndex < songs.length - 1) {
      setCurrentIndex(activeIndex + 1);
    }
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
      setCurrentIndex(activeIndex - 1);
    }
  };

  const openLink = (url) => {
    if (url?.trim()) {
      Linking.openURL(url).catch(() =>
        Alert.alert('Erro', 'Não foi possível abrir o link')
      );
    }
  };

  const adjustFontSize = (amount) => {
    setFontSize(Math.max(14, Math.min(38, fontSize + amount)));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        
        {/* 1. Controles Superiores Ultra Compactos (Única Linha) */}
        <View style={[styles.stageTopControls, { borderBottomColor: colors.border, backgroundColor: colors.cardBackground }]}>
          
          {/* Botão de Fechar com X */}
          <Pressable 
            style={({ pressed }) => [
              styles.stageExitBtn, 
              { backgroundColor: colors.danger + '22', borderColor: colors.danger, borderWidth: 1.5, opacity: pressed ? 0.7 : 1 }
            ]} 
            onPress={onClose}
          >
            <Ionicons name="close" size={16} color={colors.danger} />
          </Pressable>

          {/* Botões Quadrados de Seleção de Aba (Letra, Cifra, Tablatura) */}
          {currentSong.id !== -1 && (
            <View style={styles.stageTabButtonsRow}>
              {[
                { key: 'lyrics', icon: 'document-text-outline', iconActive: 'document-text', hasContent: !!currentSong.lyrics?.trim() },
                { key: 'chords', icon: 'musical-notes-outline', iconActive: 'musical-notes', hasContent: !!currentSong.chords?.trim() },
                { key: 'tabs', icon: 'list-outline', iconActive: 'list', hasContent: !!currentSong.tabs?.trim() },
              ].map((tab) => (
                <Pressable
                  key={tab.key}
                  disabled={showSongList || !tab.hasContent}
                  style={({ pressed }) => [
                    styles.squareTabBtn,
                    { borderColor: colors.border, backgroundColor: colors.background },
                    activeView === tab.key && { backgroundColor: colors.primary, borderColor: colors.primary },
                    (showSongList || !tab.hasContent) && { opacity: 0.15 },
                    pressed && !showSongList && tab.hasContent && { opacity: 0.8 }
                  ]}
                  onPress={() => setActiveView(tab.key)}
                >
                  <Ionicons 
                    name={activeView === tab.key ? tab.iconActive : tab.icon} 
                    size={16} 
                    color={activeView === tab.key ? '#fff' : (tab.hasContent ? colors.text : colors.textMuted)} 
                  />
                </Pressable>
              ))}
            </View>
          )}

          {/* Ajustes de Tamanho da Fonte (A- A+), Velocidade de Rolagem (📜) e Links (🔗) */}
          <View style={styles.fontSizeControlsRow}>
            {currentSong.id !== -1 && (
              <Pressable 
                disabled={showSongList}
                style={({ pressed }) => [
                  styles.squareLinkToggleBtn, 
                  { 
                    backgroundColor: colors.border, 
                    borderColor: currentScrollSpeed !== 'none' ? '#10b981' : '#ef4444',
                    borderWidth: 2,
                    opacity: showSongList ? 0.15 : (pressed ? 0.75 : 1) 
                  }
                ]} 
                onPress={handleCycleSpeed}
              >
                {currentScrollSpeed === 'none' ? (
                  <Ionicons name="play-outline" size={16} color={colors.text} />
                ) : (
                  <Text style={{ fontSize: 10, fontWeight: '900', color: '#10b981' }}>{`${currentScrollSpeed}x`}</Text>
                )}
              </Pressable>
            )}

            {currentSong.id !== -1 && currentSong.links && currentSong.links.length > 0 && (
              <Pressable 
                disabled={showSongList}
                style={({ pressed }) => [
                  styles.squareLinkToggleBtn, 
                  { 
                    backgroundColor: showLinks ? colors.primary : colors.border, 
                    borderColor: showLinks ? colors.primary : colors.border,
                    opacity: showSongList ? 0.15 : (pressed ? 0.75 : 1) 
                  }
                ]} 
                onPress={() => setShowLinks(!showLinks)}
              >
                <Ionicons name="link-outline" size={16} color={showLinks ? '#fff' : colors.text} />
              </Pressable>
            )}

            <Pressable 
              style={({ pressed }) => [
                styles.squareFontBtn, 
                { backgroundColor: colors.border, opacity: pressed ? 0.75 : 1 }
              ]} 
              onPress={() => adjustFontSize(-2)}
            >
              <Text style={[styles.squareFontBtnText, { color: colors.text }]}>A-</Text>
            </Pressable>
            <Pressable 
              style={({ pressed }) => [
                styles.squareFontBtn, 
                { backgroundColor: colors.border, opacity: pressed ? 0.75 : 1 }
              ]} 
              onPress={() => adjustFontSize(2)}
            >
              <Text style={[styles.squareFontBtnText, { color: colors.text }]}>A+</Text>
            </Pressable>
          </View>
        </View>

        {/* Links Rápidos de Apoio (Alternável - Exibido entre os controles e o nome da música) */}
        {showLinks && !showSongList && currentSong.id !== -1 && currentSong.links && currentSong.links.length > 0 && (
          <View style={[styles.stageLinksBar, { borderBottomColor: colors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.03)' }]}>
            {currentSong.links.map((link, idx) => {
              const getLinkColor = () => {
                if (link.type === 'youtube') return '#ef4444';
                if (link.type === 'spotify') return '#1db954';
                return colors.primary;
              };
              const activeLinkColor = getLinkColor();

              return (
                <Pressable
                  key={idx}
                  style={({ pressed }) => [
                    styles.linkButton,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
                      borderColor: activeLinkColor + '66',
                      opacity: pressed ? 0.7 : 1
                    },
                  ]}
                  onPress={() => openLink(link.url)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons 
                      name={link.type === 'youtube' ? 'logo-youtube' : link.type === 'spotify' ? 'logo-spotify' : 'document-text-outline'} 
                      size={14} 
                      color={activeLinkColor} 
                    />
                    <Text style={[styles.linkButtonText, { color: activeLinkColor }]}>
                      {link.type === 'youtube'
                        ? 'YouTube'
                        : link.type === 'spotify'
                        ? 'Spotify'
                        : t('chordsFormLabel')}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* 2. Barra de Informações da Música em Única Linha (com Letreiro Correndo / Marquee ampliado) */}
        <View style={[styles.marqueeHeaderRow, { borderBottomColor: colors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.01)' }]}>
          {currentSong && currentSong.id !== -1 && !showSongList && (
            <Pressable 
              style={({ pressed }) => [
                {
                  marginRight: 10,
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                }
              ]}
              onPress={() => onEditSong && onEditSong(currentSong)}
            >
              <Ionicons name="pencil-outline" size={16} color={colors.text} />
            </Pressable>
          )}
          <MarqueeText 
            text={showSongList 
              ? `${t('rehearsalReport')}` 
              : (currentSong.id === -1 
                ? `⏸ ${t('pauseTitle').toUpperCase()}` 
                : (currentSong.id === -2 
                  ? `📝 ${currentSong.customNotes || 'ANOTAÇÃO'}` 
                  : `${currentSong.name} - ${currentSong.originalBand}`))} 
            style={[styles.marqueeHeaderText, { 
              color: showSongList 
                ? colors.primary 
                : (currentSong.id === -1 
                  ? colors.secondary 
                  : (currentSong.id === -2 ? colors.warning : colors.text)) 
            }]}
          />
        </View>

        {/* 3. Visualização Principal de Letra / Cifra / Tablatura (Maximizada) ou Lista de Músicas */}
        {showSongList ? (
          <ScrollView 
            style={styles.lyricsContainer} 
            contentContainerStyle={{ padding: 20 }}
            showsVerticalScrollIndicator={true}
          >
            {songs.map((song, idx) => {
              const isPause = song.id === -1;
              const isNote = song.id === -2;
              const isActive = idx === activeIndex;
              return (
                <Pressable
                  key={`${song.id}-${idx}`}
                  onPress={() => {
                    setCurrentIndex(idx);
                    setShowSongList(false);
                  }}
                  style={({ pressed }) => [
                    {
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      marginBottom: 10,
                      borderWidth: 1.5,
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: isActive 
                        ? (colors.primary + '18') 
                        : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'),
                      borderColor: isActive 
                        ? colors.primary 
                        : colors.border,
                      opacity: pressed ? 0.8 : 1
                    }
                  ]}
                >
                  <View style={{
                    width: Math.max(22, fontSize * 1.3),
                    height: Math.max(22, fontSize * 1.3),
                    borderRadius: 4,
                    backgroundColor: isPause ? colors.secondary + '20' : (isNote ? colors.warning + '20' : colors.primary + '20'),
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12
                  }}>
                    <Text style={{
                      fontSize: Math.max(10, fontSize * 0.55),
                      fontWeight: '900',
                      color: isPause ? colors.secondary : (isNote ? colors.warning : colors.primary)
                    }}>
                      {String(idx + 1).padStart(2, '0')}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    {isPause ? (
                      <Text style={{
                        fontSize: Math.max(12, fontSize * 0.7),
                        fontWeight: '900',
                        color: colors.secondary
                      }}>
                        PAUSA
                      </Text>
                    ) : isNote ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="document-text-outline" size={Math.max(12, fontSize * 0.7)} color={colors.warning} />
                        <Text style={{
                          fontSize: Math.max(12, fontSize * 0.7),
                          fontWeight: '900',
                          color: colors.warning,
                          fontStyle: 'italic',
                          flex: 1
                        }} numberOfLines={1}>
                          {song.customNotes || 'ANOTAÇÃO / OBSERVAÇÃO'}
                        </Text>
                      </View>
                    ) : (
                      <>
                        <Text style={{
                          fontSize: Math.max(12, fontSize * 0.7),
                          fontWeight: '800',
                          color: colors.text
                        }}>
                          {song.name}
                        </Text>
                        {song.originalBand ? (
                          <Text style={{
                            fontSize: Math.max(10, fontSize * 0.5),
                            color: colors.textMuted,
                            marginTop: 2
                          }}>
                            {song.originalBand}
                          </Text>
                        ) : null}
                      </>
                    )}
                  </View>
                  {isActive && (
                    <Ionicons name="play" size={Math.max(14, fontSize * 0.65)} color={colors.primary} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        ) : (
          <ScrollView 
            ref={scrollViewRef}
            style={styles.lyricsContainer} 
            contentContainerStyle={styles.lyricsContent} 
            showsVerticalScrollIndicator={true}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onContentSizeChange={(w, h) => { contentHeight.current = h; }}
            onLayout={(e) => { scrollViewHeight.current = e.nativeEvent.layout.height; }}
          >
            {currentSong.id === -1 ? (
              <View style={styles.pauseTimerContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <Ionicons name="pause-circle-outline" size={fontSize + 8} color={colors.secondary} />
                  <Text style={[styles.pauseTitle, { color: colors.secondary, fontSize: fontSize + 10 }]}>{t('pauseTitle').toUpperCase()}</Text>
                </View>
                
                {currentSong.customNotes ? (
                  <View style={[styles.pauseNotesCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                    <Text style={[styles.pauseNotes, { color: colors.text, fontSize: fontSize }]}>
                      {currentSong.customNotes}
                    </Text>
                  </View>
                ) : null}

                {timeLeft > 0 ? (
                  <View style={[styles.timerCircle, { borderColor: timerActive ? colors.primary : colors.border, backgroundColor: colors.cardBackground }]}>
                    <Text style={[styles.timerText, { color: timeLeft < 15 ? colors.danger : colors.text }]}>
                      {formatTime(timeLeft)}
                    </Text>
                    <Text style={[styles.timerSubText, { color: colors.textMuted }]}>
                      {timerActive ? t('timerCountdown') : t('timerPaused')}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.timerCircle, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                    <Text style={[styles.timerFinishedText, { color: colors.danger, fontSize: fontSize + 6 }]}>
                      {currentSong.customDuration ? t('timerFinished') : t('timerNoLimit')}
                    </Text>
                  </View>
                )}

                {/* Botões do Timer */}
                {parseDurationToSeconds(currentSong.customDuration) > 0 && (
                  <View style={styles.timerControls}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.timerBtn,
                        { backgroundColor: timerActive ? colors.warning + '18' : colors.success + '18', borderColor: timerActive ? colors.warning : colors.success },
                        pressed && { opacity: 0.8 }
                      ]}
                      onPress={() => setTimerActive(!timerActive)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                        <Ionicons name={timerActive ? "pause" : "play"} size={14} color={timerActive ? colors.warning : colors.success} />
                        <Text style={[styles.timerBtnText, { color: timerActive ? colors.warning : colors.success }]}>
                          {timerActive ? t('pauseTimer') : t('startTimer')}
                        </Text>
                      </View>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.timerBtn,
                        { backgroundColor: colors.border, borderColor: colors.border },
                        pressed && { opacity: 0.8 }
                      ]}
                      onPress={() => {
                        setTimeLeft(parseDurationToSeconds(currentSong.customDuration));
                        setTimerActive(false);
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                        <Ionicons name="refresh" size={14} color={colors.text} />
                        <Text style={[styles.timerBtnText, { color: colors.text }]}>
                          {t('resetTimer')}
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                )}
              </View>
            ) : currentSong.id === -2 ? (
              <View style={styles.pauseTimerContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <Ionicons name="document-text-outline" size={fontSize + 8} color={colors.warning} />
                  <Text style={[styles.pauseTitle, { color: colors.warning, fontSize: fontSize + 10 }]}>{t('noteItem') || 'ANOTAÇÃO / OBSERVAÇÃO'}</Text>
                </View>
                
                {currentSong.customNotes ? (
                  <View style={[styles.pauseNotesCard, { backgroundColor: colors.cardBackground, borderColor: colors.border, marginTop: 24 }]}>
                    <Text style={[styles.pauseNotes, { color: colors.text, fontSize: fontSize + 6, fontWeight: '700', textAlign: 'center', lineHeight: (fontSize + 6) * 1.5 }]}>
                      {currentSong.customNotes}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.noLyricsText, { color: colors.textMuted, marginTop: 24, fontStyle: 'italic' }]}>
                    {t('notePlaceholder') || 'Sem anotações cadastradas.'}
                  </Text>
                )}
              </View>
            ) : (
              <>
                {activeView === 'lyrics' && (
                  currentSong.lyrics?.trim() ? (
                    <Text style={[styles.lyricsText, { color: colors.text, fontSize, lineHeight: fontSize * 1.5 }]}>
                      {currentSong.lyrics}
                    </Text>
                  ) : (
                    <View style={styles.noLyricsContainer}>
                      <Text style={[styles.noLyricsText, { color: colors.textMuted }]}>
                        {t('noLyrics')}
                      </Text>
                    </View>
                  )
                )}

                {activeView === 'chords' && (
                  currentSong.chords?.trim() ? (
                    <Text style={[styles.lyricsText, styles.monoStageText, { color: colors.text, fontSize, lineHeight: fontSize * 1.5 }]}>
                      {currentSong.chords}
                    </Text>
                  ) : (
                    <View style={styles.noLyricsContainer}>
                      <Text style={[styles.noLyricsText, { color: colors.textMuted }]}>
                        {t('noChords')}
                      </Text>
                    </View>
                  )
                )}

                {activeView === 'tabs' && (
                  currentSong.tabs?.trim() ? (
                    <Text style={[styles.lyricsText, styles.monoStageText, { color: colors.text, fontSize, lineHeight: fontSize * 1.5 }]}>
                      {currentSong.tabs}
                    </Text>
                  ) : (
                    <View style={styles.noLyricsContainer}>
                      <Text style={[styles.noLyricsText, { color: colors.textMuted }]}>
                        {t('noTabs')}
                      </Text>
                    </View>
                  )
                )}
              </>
            )}
          </ScrollView>
        )}

        {/* 4. Navegação Inferior (Setas Gigantes e Progresso Centralizado) */}
        <View style={[styles.navigationBar, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <Pressable
            disabled={showSongList || activeIndex === 0}
            style={({ pressed }) => [
              styles.navButton,
              { backgroundColor: colors.cardBackground, borderColor: colors.border },
              (showSongList || activeIndex === 0) && { opacity: 0.15 },
              pressed && !showSongList && activeIndex > 0 && { transform: [{ scale: 0.96 }], backgroundColor: colors.border }
            ]}
            onPress={handlePrev}
          >
            <Text style={[styles.navButtonText, { color: colors.text }]}>◀</Text>
          </Pressable>

          <Pressable
            onPress={() => setShowSongList(!showSongList)}
            style={({ pressed }) => [
              styles.bottomProgressBox, 
              { backgroundColor: colors.primary + '12', borderColor: colors.primary + '25' },
              pressed && { opacity: 0.7 }
            ]}
          >
            <Text style={[styles.bottomProgressText, { color: colors.primary, fontWeight: '900' }]}>
              {showSongList ? t('closeList') : `${String(activeIndex + 1).padStart(2, '0')} / ${String(songs.length).padStart(2, '0')}`}
            </Text>
          </Pressable>

          <Pressable
            disabled={showSongList || activeIndex === songs.length - 1}
            style={({ pressed }) => [
              styles.navButton,
              { backgroundColor: colors.cardBackground, borderColor: colors.border },
              (showSongList || activeIndex === songs.length - 1) && { opacity: 0.15 },
              pressed && !showSongList && activeIndex < songs.length - 1 && { transform: [{ scale: 0.96 }], backgroundColor: colors.border }
            ]}
            onPress={handleNext}
          >
            <Text style={[styles.navButtonText, { color: colors.text }]}>▶</Text>
          </Pressable>
        </View>

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stageTopControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1.5,
  },
  stageExitBtn: {
    width: 38,
    height: 38,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageExitBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  stageTabButtonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  squareTabBtn: {
    width: 38,
    height: 38,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squareTabBtnText: {
    fontSize: 16,
  },
  fontSizeControlsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  squareFontBtn: {
    width: 38,
    height: 38,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squareFontBtnText: {
    fontSize: 12,
    fontWeight: '900',
  },
  squareLinkToggleBtn: {
    width: 38,
    height: 38,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squareLinkToggleBtnText: {
    fontSize: 16,
  },
  marqueeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1.5,
    height: 56,
  },
  marqueeHeaderText: {
    fontSize: 22,
    fontWeight: '950',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  stageLinksBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1.5,
  },
  linkButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  linkButtonText: {
    fontSize: 11,
    fontWeight: '800',
  },
  lyricsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  lyricsContent: {
    paddingVertical: 16,
    flexGrow: 1,
  },
  lyricsText: {
    fontWeight: '700',
  },
  monoStageText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  noLyricsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  noLyricsText: {
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  navigationBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 48 : 38,
    borderTopWidth: 1.5,
    gap: 12,
    alignItems: 'center',
  },
  navButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  navButtonText: {
    fontWeight: '900',
    fontSize: 20,
    letterSpacing: 0.8,
  },
  bottomProgressBox: {
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
    height: 48,
  },
  bottomProgressText: {
    fontSize: 16,
    fontWeight: '950',
    letterSpacing: 0.5,
  },
  // Estilos do Temporizador de Pausa
  pauseTimerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 16,
  },
  pauseTitle: {
    fontWeight: '950',
    letterSpacing: 1.0,
  },
  pauseNotesCard: {
    width: '100%',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  pauseNotes: {
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
  timerCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  timerText: {
    fontSize: 48,
    fontWeight: '950',
  },
  timerSubText: {
    fontSize: 10,
    fontWeight: '900',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  timerFinishedText: {
    fontWeight: '950',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  timerControls: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    width: '100%',
  },
  timerBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerBtnText: {
    fontSize: 11,
    fontWeight: '900',
  },
});
