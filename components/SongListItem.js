import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Linking,
  Platform,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../hooks/useLanguage';

export default function SongListItem({ song, onEdit, onDelete, onToggleFavorite, onStartPerformance, expanded, onToggleExpand, onShare, sortBy }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const isDark = colors.isDark;
  const [revealedTab, setRevealedTab] = useState(null);

  useEffect(() => {
    if (!expanded) {
      setRevealedTab(null);
    }
  }, [expanded]);

  const handleOpenLink = (url) => {
    if (url) {
      Linking.openURL(url).catch((err) => console.error("Couldn't open URL", err));
    }
  };

  const hasLyrics = Boolean(song.lyrics && song.lyrics.trim().length > 0);
  const hasChords = Boolean(song.chords && song.chords.trim().length > 0);
  const hasTabs = Boolean(song.tabs && song.tabs.trim().length > 0);
  const hasAnyContent = hasLyrics || hasChords || hasTabs;

  const contentTabs = [
    { key: 'lyrics', label: t('lyricsFormLabel'), hasContent: hasLyrics, content: song.lyrics, isMono: false },
    { key: 'chords', label: t('chordsFormLabel'), hasContent: hasChords, content: song.chords, isMono: true },
    { key: 'tabs', label: t('tabsFormLabel'), hasContent: hasTabs, content: song.tabs, isMono: true },
  ];

  return (
    <View
      style={[
        styles.listItem,
        {
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.45)' : 'rgba(255, 255, 255, 0.7)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.18)',
          shadowColor: colors.shadowColor,
        }
      ]}
    >
      {/* Cabeçalho que responde ao clique para expandir */}
      <Pressable
        style={({ pressed }) => [
          styles.listItemHeader,
          pressed && { opacity: 0.8 }
        ]}
        onPress={onToggleExpand}
      >
        <View style={styles.headerInfo}>
          <Text style={[styles.songTitleText, { color: colors.text }]} numberOfLines={1}>
            {sortBy === 'name' ? (
              <>
                <Text style={styles.songNamePart}>{song.name}</Text>
                <Text style={{ fontWeight: '600', color: colors.textMuted }}> - </Text>
                <Text style={[styles.bandNamePart, { color: colors.secondary }]}>{song.originalBand}</Text>
              </>
            ) : (
              <>
                <Text style={[styles.bandNamePart, { color: colors.secondary }]}>{song.originalBand}</Text>
                <Text style={{ fontWeight: '600', color: colors.textMuted }}> - </Text>
                <Text style={styles.songNamePart}>{song.name}</Text>
              </>
            )}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onToggleFavorite && onToggleFavorite(song.id, song.isFavorite);
            }}
            style={({ pressed }) => [
              styles.favoriteHeaderBtn,
              pressed && { opacity: 0.6 }
            ]}
          >
            <Ionicons 
              name={song.isFavorite ? "star" : "star-outline"} 
              size={18} 
              color={song.isFavorite ? '#eab308' : colors.textMuted} 
            />
          </Pressable>
          <Ionicons 
            name={expanded ? "chevron-up-outline" : "chevron-down-outline"} 
            size={16} 
            color={colors.textMuted} 
            style={{ marginLeft: 4 }}
          />
        </View>
      </Pressable>

      {/* Conteúdo Expandido */}
      {expanded && (
        <View style={[styles.expandedContent, { borderTopColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)' }]}>
          {/* Info Básica: Duração e Estilo em formato de Tags */}
          <View style={[styles.infoRow, { flexWrap: 'wrap', gap: 6 }]}>
            {song.duration ? (
              <View style={[styles.songMetaTag, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}>
                <Ionicons name="time-outline" size={10} color={colors.textMuted} style={{ marginRight: 4 }} />
                <Text style={[styles.songMetaTagText, { color: colors.textMuted }]}>{song.duration}</Text>
              </View>
            ) : null}

            {song.style ? (
              song.style.split(',').map((tagStr, idx) => {
                const cleanTag = tagStr.trim();
                if (!cleanTag) return null;
                return (
                  <View key={idx} style={[styles.songMetaTag, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '35' }]}>
                    <Ionicons name="musical-note-outline" size={10} color={colors.primary} style={{ marginRight: 4 }} />
                    <Text style={[styles.songMetaTagText, { color: colors.primary }]}>{cleanTag}</Text>
                  </View>
                );
              })
            ) : null}
          </View>

          {/* Links de Apoio */}
          {song.links && song.links.length > 0 ? (
            <View style={styles.linksContainer}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted, textAlign: 'center' }]}>{t('supportLinks').toUpperCase()}</Text>
              <View style={styles.linksRow}>
                {song.links.map((link, idx) => (
                  <Pressable
                    key={idx}
                    style={({ pressed }) => [
                      styles.linkChip,
                      { 
                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                        borderColor: colors.border,
                        opacity: pressed ? 0.7 : 1,
                        flex: 1,
                      }
                    ]}
                    onPress={() => handleOpenLink(link.url)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <Ionicons 
                        name={link.type === 'youtube' ? 'logo-youtube' : link.type === 'spotify' ? 'logo-spotify' : 'document-text-outline'} 
                        size={12} 
                        color={link.type === 'youtube' ? '#ef4444' : link.type === 'spotify' ? '#1db954' : colors.primary} 
                      />
                      <Text style={[styles.linkChipText, { color: colors.text }]}>
                        {link.type === 'youtube' ? 'YouTube' : link.type === 'spotify' ? 'Spotify' : t('cifras')}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {/* Tags com Olho Fechado: Letra, Cifra ou Tablatura */}
          <View style={styles.lyricsContainer}>
            <View style={styles.tabHeaderRow}>
              {contentTabs.map((tab) => {
                const isRevealed = revealedTab === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    disabled={!tab.hasContent}
                    style={({ pressed }) => [
                      styles.tabButton,
                      {
                        borderColor: !tab.hasContent
                          ? (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)')
                          : isRevealed
                          ? colors.primary
                          : (isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)'),
                        backgroundColor: !tab.hasContent
                          ? (isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)')
                          : isRevealed
                          ? (isDark ? colors.primary + '25' : colors.primary + '18')
                          : (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.035)'),
                        opacity: !tab.hasContent ? 0.35 : (pressed ? 0.75 : 1),
                      }
                    ]}
                    onPress={() => setRevealedTab(prev => prev === tab.key ? null : tab.key)}
                  >
                    <View style={styles.tabButtonInner}>
                      <Ionicons
                        name={tab.hasContent ? (isRevealed ? "eye-outline" : "eye-off-outline") : "eye-off-outline"}
                        size={13}
                        color={!tab.hasContent ? colors.textMuted : isRevealed ? colors.primary : colors.text}
                      />
                      <Text
                        style={[
                          styles.tabButtonText,
                          {
                            color: !tab.hasContent ? colors.textMuted : isRevealed ? colors.primary : colors.text,
                            fontWeight: isRevealed ? '900' : '700',
                          }
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.75}
                      >
                        {tab.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Conteúdo Revelado ao Clicar na Tag com Olho */}
            {revealedTab && (
              <View style={[
                styles.lyricsBox, 
                { 
                  backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.025)', 
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)' 
                }
              ]}>
                <Text
                  style={[
                    styles.lyricsText,
                    revealedTab !== 'lyrics' && styles.monoText,
                    { color: colors.text }
                  ]}
                  selectable
                >
                  {revealedTab === 'lyrics' ? song.lyrics : revealedTab === 'chords' ? song.chords : song.tabs}
                </Text>
              </View>
            )}

            {!hasAnyContent && (
              <Text style={{ color: colors.textMuted, fontStyle: 'italic', fontSize: 12, textAlign: 'center', marginVertical: 4 }}>
                {t('noContentRegistered')}
              </Text>
            )}
          </View>

          {/* Ações de Edição, Exclusão, Compartilhar e Modo Palco */}
          <View style={styles.actionsRow}>
            <Pressable 
              onPress={() => onStartPerformance && onStartPerformance(song)} 
              style={({ pressed }) => [
                styles.actionButton, 
                { 
                  backgroundColor: colors.success + '15',
                  borderColor: colors.success + '40',
                  opacity: pressed ? 0.7 : 1
                }
              ]}
            >
              <Ionicons name="mic-outline" size={11} color={colors.success} style={{ marginRight: 2 }} />
              <Text 
                style={[styles.actionButtonText, { color: colors.success }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.65}
              >
                {t('startStage')}
              </Text>
            </Pressable>

            <Pressable 
              onPress={() => onEdit(song)} 
              style={({ pressed }) => [
                styles.actionButton, 
                { 
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
                  borderColor: colors.border,
                  opacity: pressed ? 0.7 : 1
                }
              ]}
            >
              <Ionicons name="pencil-outline" size={11} color={colors.text} style={{ marginRight: 2 }} />
              <Text 
                style={[styles.actionButtonText, { color: colors.text }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.65}
              >
                {t('edit')}
              </Text>
            </Pressable>
            
            <Pressable 
              onPress={() => onShare && onShare(song)} 
              style={({ pressed }) => [
                styles.actionButton, 
                { 
                  backgroundColor: colors.secondary + '12',
                  borderColor: colors.secondary + '40',
                  opacity: pressed ? 0.7 : 1
                }
              ]}
            >
              <Ionicons name="share-social-outline" size={11} color={colors.secondary} style={{ marginRight: 2 }} />
              <Text 
                style={[styles.actionButtonText, { color: colors.secondary }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.65}
              >
                {t('share')}
              </Text>
            </Pressable>

            <Pressable 
              onPress={() => onDelete(song.id)} 
              style={({ pressed }) => [
                styles.actionButton, 
                { 
                  backgroundColor: colors.danger + '22',
                  borderColor: colors.danger + '44',
                  opacity: pressed ? 0.7 : 1
                }
              ]}
            >
              <Ionicons name="trash-outline" size={11} color={colors.danger} style={{ marginRight: 2 }} />
              <Text 
                style={[styles.actionButtonText, { color: colors.danger }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.65}
              >
                {t('delete')}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  listItem: {
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  listItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  headerInfo: {
    flex: 1,
    marginRight: 10,
  },
  songTitleText: {
    fontSize: 15,
  },
  bandNamePart: {
    fontWeight: '950',
  },
  songNamePart: {
    fontWeight: '800',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '850',
    textTransform: 'uppercase',
  },
  arrowIcon: {
    fontSize: 12,
    width: 16,
    textAlign: 'center',
  },
  expandedContent: {
    padding: 16,
    borderTopWidth: 1.5,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 14,
  },
  infoBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: '950',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  linksContainer: {
    marginBottom: 14,
  },
  linksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  linkChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  linkChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  lyricsContainer: {
    marginBottom: 14,
  },
  lyricsBox: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    marginTop: 6,
  },
  lyricsText: {
    fontSize: 13,
    lineHeight: 18,
  },
  monoText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
  },
  tabHeaderRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 2,
    width: '100%',
  },
  tabButton: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderWidth: 1.2,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tabButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 0,
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: '800',
    flexShrink: 1,
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 5,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 2,
    borderRadius: 7,
    borderWidth: 1.2,
    overflow: 'hidden',
  },
  actionButtonText: {
    fontSize: 9.5,
    fontWeight: '850',
    flexShrink: 1,
    textAlign: 'center',
  },
  favoriteHeaderBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  songMetaTag: {
    flexDirection: 'row',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  songMetaTagText: {
    fontSize: 9,
    fontWeight: '900',
    includeFontPadding: false,
    lineHeight: 11,
    textTransform: 'uppercase',
  },
});
