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
  const [activeTab, setActiveTab] = useState(song.defaultView || 'lyrics');

  useEffect(() => {
    setActiveTab(song.defaultView || 'lyrics');
  }, [song.defaultView]);

  const handleOpenLink = (url) => {
    if (url) {
      Linking.openURL(url).catch((err) => console.error("Couldn't open URL", err));
    }
  };

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
                        {link.type === 'youtube' ? 'YouTube' : link.type === 'spotify' ? 'Spotify' : t('chordsFormLabel')}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {/* Letra, Cifra ou Tablatura */}
          {(!song.lyrics?.trim() && !song.chords?.trim() && !song.tabs?.trim()) ? (
            <View style={styles.lyricsContainer}>
              <Text style={{ color: colors.textMuted, fontStyle: 'italic', fontSize: 13, paddingVertical: 10 }}>
                {t('noContentRegistered')}
              </Text>
            </View>
          ) : (
            <View style={styles.lyricsContainer}>
               <View style={styles.tabHeaderRow}>
                {[
                  { key: 'lyrics', label: t('lyricsFormLabel'), icon: 'document-text-outline', hasContent: !!song.lyrics?.trim() },
                  { key: 'chords', label: t('chordsFormLabel'), icon: 'musical-notes-outline', hasContent: !!song.chords?.trim() },
                  { key: 'tabs', label: t('tabsFormLabel'), icon: 'list-outline', hasContent: !!song.tabs?.trim() },
                ].map((tab) => (
                  <Pressable
                    key={tab.key}
                    disabled={!tab.hasContent}
                    style={[
                      styles.tabButton,
                      { borderColor: colors.border },
                      activeTab === tab.key && { backgroundColor: colors.primary, borderColor: colors.primary },
                      !tab.hasContent && { opacity: 0.25 }
                    ]}
                    onPress={() => setActiveTab(tab.key)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <Ionicons 
                        name={tab.icon} 
                        size={13} 
                        color={activeTab === tab.key ? '#fff' : (tab.hasContent ? colors.text : colors.textMuted)} 
                      />
                      <Text style={[
                        styles.tabButtonText,
                        { color: activeTab === tab.key ? '#fff' : (tab.hasContent ? colors.text : colors.textMuted) }
                      ]}>
                        {tab.label}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>

              {activeTab === 'lyrics' && song.lyrics ? (
                <View style={[styles.lyricsBox, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }]}>
                  <Text style={[styles.lyricsText, { color: colors.text }]}>{song.lyrics}</Text>
                </View>
              ) : null}

              {activeTab === 'chords' && song.chords ? (
                <View style={[styles.lyricsBox, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }]}>
                  <Text style={[styles.lyricsText, styles.monoText, { color: colors.text }]}>{song.chords}</Text>
                </View>
              ) : null}

              {activeTab === 'tabs' && song.tabs ? (
                <View style={[styles.lyricsBox, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }]}>
                  <Text style={[styles.lyricsText, styles.monoText, { color: colors.text }]}>{song.tabs}</Text>
                </View>
              ) : null}
            </View>
          )}

          {/* Ações de Edição, Exclusão e Modo Palco */}
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
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="mic-outline" size={12} color={colors.success} style={{ marginRight: 2.5 }} />
                <Text 
                  style={[styles.actionButtonText, { color: colors.success }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {t('startStage')}
                </Text>
              </View>
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
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="pencil-outline" size={12} color={colors.text} style={{ marginRight: 2.5 }} />
                <Text 
                  style={[styles.actionButtonText, { color: colors.text }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {t('edit')}
                </Text>
              </View>
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
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="share-social-outline" size={12} color={colors.secondary} style={{ marginRight: 2.5 }} />
                <Text 
                  style={[styles.actionButtonText, { color: colors.secondary }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {t('share')}
                </Text>
              </View>
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
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="trash-outline" size={12} color={colors.danger} style={{ marginRight: 2.5 }} />
                <Text 
                  style={[styles.actionButtonText, { color: colors.danger }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {t('delete')}
                </Text>
              </View>
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
    gap: 8,
    marginBottom: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: '800',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 10.5,
    fontWeight: '900',
  },
  favoriteHeaderBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  songMetaTag: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  songMetaTagText: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
});
