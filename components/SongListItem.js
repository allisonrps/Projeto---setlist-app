import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../hooks/useLanguage';

export default function SongListItem({
  song,
  onSelect,
  onToggleFavorite,
  sortBy = 'band',
}) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const isDark = colors.isDark;

  const tagsList = song.style
    ? song.style.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.listItem,
        {
          backgroundColor: isDark ? 'rgba(23, 30, 46, 0.75)' : 'rgba(255, 255, 255, 0.9)',
          shadowColor: colors.shadowColor,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        }
      ]}
      onPress={() => onSelect && onSelect(song)}
    >
      <View style={styles.cardContentRow}>
        {/* Left: Song & Band info + metadata tags */}
        <View style={styles.infoCol}>
          {/* Main Title Row */}
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

          {/* Sub Row: Duration + Style Tags */}
          <View style={styles.subMetaRow}>
            {song.duration ? (
              <View style={[styles.metaChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
                <Ionicons name="time-outline" size={10} color={colors.textMuted} style={{ marginRight: 3 }} />
                <Text style={[styles.metaChipText, { color: colors.textMuted }]}>{song.duration}</Text>
              </View>
            ) : null}

            {tagsList.slice(0, 2).map((tag, idx) => (
              <View
                key={idx}
                style={[
                  styles.metaChip,
                  { backgroundColor: colors.primary + '16' }
                ]}
              >
                <Text style={[styles.metaChipText, { color: colors.primary }]}>{tag}</Text>
              </View>
            ))}

            {tagsList.length > 2 && (
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted }}>
                +{tagsList.length - 2}
              </Text>
            )}
          </View>
        </View>

        {/* Right: Star Favorite Button */}
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onToggleFavorite && onToggleFavorite(song.id, song.isFavorite);
          }}
          style={({ pressed }) => [
            styles.favoriteBtn,
            pressed && { opacity: 0.5, transform: [{ scale: 0.88 }] }
          ]}
          hitSlop={10}
        >
          <Ionicons
            name={song.isFavorite ? "star" : "star-outline"}
            size={20}
            color={song.isFavorite ? '#eab308' : (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)')}
          />
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  listItem: {
    borderRadius: 16,
    borderWidth: 0,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  cardContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoCol: {
    flex: 1,
    paddingRight: 10,
  },
  songTitleText: {
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  songNamePart: {
    fontWeight: '800',
  },
  bandNamePart: {
    fontWeight: '800',
  },
  subMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 5,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  metaChipText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  favoriteBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
