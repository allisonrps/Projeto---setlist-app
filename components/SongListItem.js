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
      <View style={styles.cardContent}>
        {/* Main Title Row with Favorite Star in Front */}
        <View style={styles.titleRow}>
          {/* Left: Star Favorite Button */}
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onToggleFavorite && onToggleFavorite(song.id, song.isFavorite);
            }}
            style={({ pressed }) => [
              styles.favoriteBtn,
              pressed && { opacity: 0.5, transform: [{ scale: 0.88 }] }
            ]}
            hitSlop={8}
          >
            <Ionicons
              name={song.isFavorite ? "star" : "star-outline"}
              size={15}
              color={song.isFavorite ? '#eab308' : (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)')}
            />
          </Pressable>

          {/* Song & Band Title Text */}
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

        {/* Sub Row: Style Tags Only (Full Width Available) */}
        {tagsList.length > 0 && (
          <View style={styles.subMetaRow}>
            {tagsList.map((tag, idx) => (
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
          </View>
        )}
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
  cardContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  favoriteBtn: {
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  songTitleText: {
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: -0.2,
    flex: 1,
  },
  songNamePart: {
    fontWeight: '800',
  },
  bandNamePart: {
    fontWeight: '800',
  },
  subMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingLeft: 2,
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
});
