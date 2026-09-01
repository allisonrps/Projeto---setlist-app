import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TextInput,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';
import { Ionicons } from '@expo/vector-icons';

export default function SetlistDetailModal({ 
  visible, 
  onClose, 
  setlist, 
  onStartPerformance,
  onToggleRehearsalStatus,
  onUpdateSongRehearsalNotes,
  onEditSong
}) {
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const isDark = colors.isDark;

  if (!setlist) return null;

  const totalSongs = setlist.songs?.filter(s => s.id >= 0).length || 0;

  // Função para somar durações
  const calculateTotalDuration = (songs) => {
    if (!songs || songs.length === 0) return '';
    let totalSeconds = 0;
    let hasDuration = false;

    for (const song of songs) {
      if (song.duration && song.duration.trim()) {
        const parts = song.duration.split(':').map(p => parseInt(p, 10) || 0);
        if (parts.length === 3) {
          totalSeconds += parts[0] * 3600 + parts[1] * 60 + parts[2];
          hasDuration = true;
        } else if (parts.length === 2) {
          totalSeconds += parts[0] * 60 + parts[1];
          hasDuration = true;
        } else if (parts.length === 1) {
          totalSeconds += parts[0] * 60;
          hasDuration = true;
        }
      }
    }

    if (!hasDuration) return '';

    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    const pad = (n) => String(n).padStart(2, '0');

    if (h > 0) {
      return `${h}h ${pad(m)}m ${pad(s)}s`;
    }
    return `${pad(m)}:${pad(s)}`;
  };

  const totalDuration = calculateTotalDuration(setlist.songs);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.75)' }]}>
        <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.primary }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
                {setlist.name || t('detailTitle')}
              </Text>
              <Text style={[styles.bandSubtitle, { color: colors.primary }]} numberOfLines={1}>
                {setlist.bandName || (language === 'en' ? 'No band associated' : language === 'es' ? 'Banda no asociada' : 'Banda não associada')}
              </Text>
            </View>
            <Pressable 
              style={({ pressed }) => [styles.closePressable, pressed && { opacity: 0.7 }]}
              onPress={onClose}
            >
              <Ionicons name="close" size={20} color={colors.danger} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Metadados */}
            <View style={[styles.infoCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }]}>
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={15} color={colors.primary} style={{ width: 24, textAlign: 'center' }} />
                <Text style={[styles.infoText, { color: colors.text }]}>
                  {language === 'en' ? 'Date' : language === 'es' ? 'Fecha' : 'Data'}: <Text style={styles.infoBold}>{setlist.date}</Text>
                </Text>
              </View>
              {setlist.local ? (
                <View style={styles.infoRow}>
                  <Ionicons name="pin-outline" size={15} color={colors.primary} style={{ width: 24, textAlign: 'center' }} />
                  <Text style={[styles.infoText, { color: colors.text }]}>
                    {language === 'en' ? 'Venue' : language === 'es' ? 'Lugar' : 'Local'}: <Text style={styles.infoBold}>{setlist.local}</Text>
                  </Text>
                </View>
              ) : null}
              {setlist.type === 'show' && setlist.cachê ? (
                <View style={styles.infoRow}>
                  <Ionicons name="cash-outline" size={15} color={colors.success} style={{ width: 24, textAlign: 'center' }} />
                  <Text style={[styles.infoText, { color: colors.text }]}>
                    {t('cacheText')}: <Text style={[styles.infoBold, { color: colors.success }]}>$ {setlist.cachê}</Text>
                  </Text>
                </View>
              ) : null}
              <View style={styles.infoRow}>
                <Ionicons name="clipboard-outline" size={15} color={colors.secondary} style={{ width: 24, textAlign: 'center' }} />
                <Text style={[styles.infoText, { color: colors.text }]}>
                  {t('typeText')}: <Text style={[styles.infoBold, { color: colors.secondary, textTransform: 'uppercase' }]}>{t(setlist.type) || setlist.type}</Text>
                </Text>
              </View>
              {setlist.notes ? (
                <View style={[styles.infoRow, { alignItems: 'flex-start' }]}>
                  <Text style={[styles.infoText, { color: colors.text, flex: 1, paddingLeft: 4 }]}>
                    {language === 'en' ? 'Notes' : language === 'es' ? 'Notas' : 'Obs'}: <Text style={styles.infoBold}>{setlist.notes}</Text>
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Ação Modo Palco */}
            <Pressable
              style={({ pressed }) => [
                styles.performanceButton, 
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }
              ]}
              onPress={() => {
                onClose();
                onStartPerformance(setlist);
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Ionicons name="play" size={16} color="#fff" />
                <Text style={styles.performanceButtonText}>{t('startStageBtn')}</Text>
              </View>
            </Pressable>

            {/* Músicas */}
            <Text style={[styles.sectionLabel, { color: colors.text }]}>
              {t('songs')} ({totalSongs}) {totalDuration && `• ${language === 'en' ? 'Duration' : language === 'es' ? 'Duración' : 'Tempo'}: ${totalDuration}`}
            </Text>

            {totalSongs === 0 ? (
              <Text style={{ color: colors.textMuted, fontStyle: 'italic', paddingVertical: 12 }}>
                {t('noSongsInDetail')}
              </Text>
            ) : (
              <View style={[styles.songsContainer, { borderColor: colors.border }]}>
                {setlist.songs.map((song, index) => {
                  const isPause = song.id === -1;
                  const isNote = song.id === -2;
                  const isEnsaio = setlist.type === 'ensaio';
                  const showRehearsalInput = isEnsaio && !isPause && !isNote && (song.rehearsalStatus === 'yellow' || song.rehearsalStatus === 'red');

                  return (
                    <View 
                      key={`${song.id}-${index}`} 
                      style={[
                        styles.songItem, 
                        { borderBottomColor: colors.border },
                        showRehearsalInput && { alignItems: 'flex-start', paddingVertical: 14 }
                      ]}
                    >
                      {isEnsaio && !isPause && !isNote ? (
                        <Pressable 
                          onPress={() => onToggleRehearsalStatus && onToggleRehearsalStatus(setlist.id, song.id, index, song.rehearsalStatus)}
                          style={[
                            styles.songIndexBadge, 
                            song.rehearsalStatus === 'green' && { backgroundColor: colors.success, borderColor: colors.success },
                            song.rehearsalStatus === 'yellow' && { backgroundColor: '#eab308', borderColor: '#eab308' },
                            song.rehearsalStatus === 'red' && { backgroundColor: colors.danger, borderColor: colors.danger },
                            song.rehearsalStatus !== 'green' && song.rehearsalStatus !== 'yellow' && song.rehearsalStatus !== 'red' && { backgroundColor: colors.primary + '15', borderColor: colors.primary + '35' }
                          ]}
                        >
                          <Text 
                            style={[
                              styles.songIndexText, 
                              (song.rehearsalStatus === 'green' || song.rehearsalStatus === 'red') && { color: '#fff' },
                              song.rehearsalStatus === 'yellow' && { color: '#000' },
                              song.rehearsalStatus !== 'green' && song.rehearsalStatus !== 'yellow' && song.rehearsalStatus !== 'red' && { color: colors.primary }
                            ]}
                          >
                            {String(index + 1).padStart(2, '0')}
                          </Text>
                        </Pressable>
                      ) : (
                        <View style={[styles.songIndexBadge, { backgroundColor: isPause ? colors.secondary + '15' : (isNote ? colors.warning + '15' : colors.primary + '15'), borderColor: isPause ? colors.secondary + '35' : (isNote ? colors.warning + '35' : colors.primary + '35') }]}>
                          <Text style={[styles.songIndexText, { color: isPause ? colors.secondary : (isNote ? colors.warning : colors.primary) }]}>
                            {String(index + 1).padStart(2, '0')}
                          </Text>
                        </View>
                      )}

                      <View style={{ flex: 1 }}>
                        {isPause ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                            <Ionicons name="pause-circle-outline" size={13} color={colors.secondary} />
                            <Text style={[styles.songName, { color: colors.secondary, fontWeight: '950' }]}>
                              {t('pauseTitle').toUpperCase()}
                            </Text>
                          </View>
                        ) : isNote ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                            <Ionicons name="document-text-outline" size={13} color={colors.warning} />
                            <Text style={[styles.songName, { color: colors.warning, fontWeight: '900', fontStyle: 'italic', flex: 1 }]} numberOfLines={1}>
                              {song.customNotes || 'ANOTAÇÃO / OBSERVAÇÃO'}
                            </Text>
                          </View>
                        ) : (
                          <Pressable
                            style={{ flex: 1 }}
                            onPress={() => onEditSong && onEditSong(song)}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={[styles.songName, { color: colors.text, flex: 1 }]}>{song.name}</Text>
                              <Ionicons name="create-outline" size={13} color={colors.primary} style={{ opacity: 0.6 }} />
                            </View>
                            <Text style={[styles.songBand, { color: colors.textMuted }]}>{song.originalBand}</Text>

                            {showRehearsalInput && (
                              <TextInput
                                style={{ 
                                  backgroundColor: isDark ? 'rgba(0,0,0,0.15)' : '#fff', 
                                  color: colors.inputText, 
                                  borderColor: colors.border, 
                                  borderWidth: 1, 
                                  paddingVertical: 4, 
                                  paddingHorizontal: 8, 
                                  borderRadius: 6, 
                                  fontSize: 12, 
                                  marginTop: 6, 
                                  fontStyle: 'italic'
                                }}
                                placeholder={t('rehearsalNotesPlaceholder')}
                                placeholderTextColor={colors.textMuted}
                                value={song.rehearsalNotes || ''}
                                onChangeText={(text) => onUpdateSongRehearsalNotes && onUpdateSongRehearsalNotes(setlist.id, song.id, index, text)}
                                autoComplete="off"
                                importantForAutofill="no"
                              />
                            )}
                          </Pressable>
                        )}
                      </View>

                      {!isPause && song.duration ? (
                        <View style={[styles.durationBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', flexDirection: 'row', alignItems: 'center', gap: 3 }]}>
                          <Ionicons name="time-outline" size={11} color={colors.textMuted} />
                          <Text style={[styles.songDuration, { color: colors.textMuted }]}>
                            {song.duration}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
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
    maxHeight: '85%',
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
  bandSubtitle: {
    fontSize: 13,
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
  modalBody: {
    padding: 20,
  },
  infoCard: {
    borderRadius: 8,
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 20,
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 15,
    width: 24,
    marginRight: 6,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoBold: {
    fontWeight: '800',
  },
  performanceButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  performanceButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '850',
    marginBottom: 14,
  },
  songsContainer: {
    borderWidth: 1.5,
    borderRadius: 8,
    overflow: 'hidden',
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
  },
  songIndexBadge: {
    width: 28,
    height: 28,
    borderRadius: 4, // Quadradinho
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  songIndexText: {
    fontSize: 12,
    fontWeight: '900',
  },
  songName: {
    fontSize: 14,
    fontWeight: '800',
  },
  songBand: {
    fontSize: 12,
    marginTop: 2,
  },
  durationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  songDuration: {
    fontSize: 11,
    fontWeight: '700',
  },
});
