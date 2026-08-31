import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  Image,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';
import { Ionicons } from '@expo/vector-icons';

const getBandInitials = (name) => {
  if (!name || !name.trim()) return '?';
  const words = name.trim().split(/\s+/);
  const initials = words.map(w => w[0]).join('').toUpperCase();
  return initials.slice(0, 3);
};

export default function SetlistCard({ 
  setlist, 
  onEdit, 
  onDelete, 
  onCopy, 
  onShare, 
  onStartPerformance, 
  onExportDoc, 
  onToggleFavorite, 
  expanded, 
  onToggleExpand,
  onToggleRehearsalStatus,
  onUpdateSongRehearsalNotes
}) {
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const isDark = colors.isDark;
  const [showSongs, setShowSongs] = useState(false);

  const getFormattedDateBadge = (dateStr, lang) => {
    if (!dateStr || !dateStr.trim()) return { day: '--', month: '---' };
    const clean = dateStr.trim();
    let day = '';
    let monthNum = 0;
    
    if (clean.includes('-')) {
      const parts = clean.split('-');
      if (parts.length === 3) {
        day = parseInt(parts[2], 10);
        monthNum = parseInt(parts[1], 10) - 1;
      }
    }
    
    if (clean.includes('/')) {
      const parts = clean.split('/');
      if (parts.length === 3) {
        day = parseInt(parts[0], 10);
        monthNum = parseInt(parts[1], 10) - 1;
      }
    }
    
    if (!day) return { day: '--', month: '---' };
    
    const monthsPT = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const monthsEN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const monthsES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    
    let months = monthsPT;
    if (lang === 'en') months = monthsEN;
    if (lang === 'es') months = monthsES;
    
    return { day: String(day).padStart(2, '0'), month: months[monthNum] || '---' };
  };

  const badgeDate = getFormattedDateBadge(setlist.date, language);

  // Função para somar durações no formato MM:SS, HH:MM:SS ou minutos puros (das pausas)
  const calculateTotalDuration = (songs) => {
    if (!songs || songs.length === 0) return '';
    let totalSeconds = 0;
    let hasDuration = false;

    const parseDuration = (durStr) => {
      if (!durStr) return 0;
      const clean = durStr.toLowerCase().replace(/min/g, '').trim();
      if (clean.includes(':')) {
        const parts = clean.split(':').map(p => parseInt(p, 10) || 0);
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        return 0;
      }
      const num = parseInt(clean, 10);
      return isNaN(num) ? 0 : num * 60;
    };

    for (const song of songs) {
      if (song.id === -1) {
        if (song.customDuration && song.customDuration.trim()) {
          totalSeconds += parseDuration(song.customDuration);
          hasDuration = true;
        }
      } else if (song.duration && song.duration.trim()) {
        totalSeconds += parseDuration(song.duration);
        hasDuration = true;
      }
    }

    if (!hasDuration) return '';

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const totalDuration = calculateTotalDuration(setlist.songs);

  const getTypeColor = (type) => {
    switch (type) {
      case 'show':
        return colors.danger;
      case 'ensaio':
        return colors.primary;
      case 'repertório':
      default:
        return colors.success;
    }
  };

  const typeColor = getTypeColor(setlist.type);

  return (
    <View 
      style={[
        styles.card, 
        { 
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.45)' : 'rgba(255, 255, 255, 0.7)', 
          borderColor: isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.18)',
          shadowColor: colors.shadowColor,
          shadowOpacity: isDark ? 0.15 : 0.06,
          shadowRadius: 6,
        }
      ]}
    >
      {/* Cabeçalho do Card (Sempre visível, clicável para expandir) */}
      <Pressable 
        style={styles.cardHeaderCollapsed}
        onPress={onToggleExpand}
      >
        {/* 1. Date Square (Left) */}
        <View style={[styles.dateSquare, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}>
          <Text style={[styles.dateDay, { color: colors.text }]}>{badgeDate.day}</Text>
          <Text style={[styles.dateMonth, { color: colors.primary }]}>{badgeDate.month}</Text>
        </View>

        {/* 2. Band Logo (Middle-Left) */}
        <View style={styles.bandLogoContainer}>
          {setlist.bandImageUri ? (
            <Image source={{ uri: setlist.bandImageUri }} style={styles.bandLogo} />
          ) : (
            <View style={[styles.bandLogoPlaceholder, { backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ fontSize: 14, fontWeight: '900', color: colors.primary }}>
                {getBandInitials(setlist.bandName || t('noBand'))}
              </Text>
            </View>
          )}
        </View>

        {/* 3. Text Info (Right - 2 Lines) */}
        <View style={styles.textContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {setlist.isFavorite ? (
              <Ionicons name="star" size={13} color="#eab308" style={{ marginRight: 4 }} />
            ) : null}
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
              {setlist.name || 'Sem Nome'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
            <View style={{
              backgroundColor: typeColor + '15',
              borderColor: typeColor + '30',
              borderWidth: 1,
              borderRadius: 4,
              paddingHorizontal: 8,
              paddingVertical: 2,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4
            }}>
              <Ionicons 
                name={setlist.type === 'show' ? 'mic-outline' : setlist.type === 'ensaio' ? 'musical-notes-outline' : 'clipboard-outline'} 
                size={10} 
                color={typeColor} 
              />
              <Text style={{ 
                fontSize: 10, 
                fontWeight: '900', 
                color: typeColor 
              }}>
                {t(setlist.type).toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* 4. Chevron (Far Right) */}
        <View style={styles.chevronContainer}>
          <Ionicons 
            name={expanded ? "chevron-up-outline" : "chevron-down-outline"} 
            size={16} 
            color={colors.textMuted} 
          />
        </View>
      </Pressable>

      {/* Detalhes Expansíveis */}
      {expanded && (
        <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
          
          {/* Metadados no Expansivo (Músicas, Tempo Estimado, Local, Cachê como tags) */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {/* Total de Músicas */}
            <View style={[styles.miniInfoBadge, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '25', borderWidth: 1 }]}>
              <Ionicons name="musical-notes-outline" size={10} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.miniInfoText, { color: colors.primary }]}>
                {setlist.songs ? setlist.songs.filter(s => s.id !== -1 && s.id !== -2).length : 0} {t('songsBadge')}
              </Text>
            </View>

            {/* Tempo Estimado */}
            {totalDuration ? (
              <View style={[styles.miniInfoBadge, { backgroundColor: colors.secondary + '10', borderColor: colors.secondary + '25', borderWidth: 1 }]}>
                <Ionicons name="time-outline" size={10} color={colors.secondary} style={{ marginRight: 4 }} />
                <Text style={[styles.miniInfoText, { color: colors.secondary }]}>
                  {totalDuration}
                </Text>
              </View>
            ) : null}

            {/* Local */}
            {setlist.local ? (
              <View style={[styles.miniInfoBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: colors.border, borderWidth: 1 }]}>
                <Ionicons name="location-outline" size={10} color={colors.textMuted} style={{ marginRight: 4 }} />
                <Text style={[styles.miniInfoText, { color: colors.textMuted }]}>
                  {setlist.local}
                </Text>
              </View>
            ) : null}

            {/* Cachê */}
            {setlist.type === 'show' && setlist.cachê ? (
              <View style={[styles.miniInfoBadge, { backgroundColor: colors.success + '10', borderColor: colors.success + '25', borderWidth: 1 }]}>
                <Ionicons name="cash-outline" size={10} color={colors.success} style={{ marginRight: 4 }} />
                <Text style={[styles.miniInfoText, { color: colors.success }]}>
                  R$ {setlist.cachê}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Observações */}
          {setlist.notes ? (
            <View style={[styles.detailRow, { alignItems: 'flex-start', marginBottom: 12 }]}>
              <Ionicons name="document-text-outline" size={14} color={colors.warning} style={{ marginRight: 6, marginTop: 2 }} />
              <Text style={[styles.detailText, { color: colors.text, flex: 1 }]}>
                Obs: <Text style={{ fontWeight: '500', color: colors.textMuted }}>{setlist.notes}</Text>
              </Text>
            </View>
          ) : null}

          {/* Listagem de Músicas do Setlist */}
          {setlist.songs && setlist.songs.length > 0 && (
            <View style={[styles.songsSection, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.015)' }]}>
              <View style={styles.songsSectionHeader}>
                <Text style={[styles.songsSectionTitle, { color: colors.text }]}>
                  {t('songsTitle')} ({setlist.songs.length})
                </Text>
                <Pressable 
                  style={({ pressed }) => [styles.eyeBtn, pressed && { opacity: 0.7 }]}
                  onPress={() => setShowSongs(!showSongs)}
                >
                  <Text style={{ fontSize: 18 }}>{showSongs ? '👁️' : '👁️‍🗨️'}</Text>
                </Pressable>
              </View>

              {showSongs && setlist.songs.map((song, index) => {
                const isPause = song.id === -1;
                const isNote = song.id === -2;
                const isEnsaio = setlist.type === 'ensaio';
                const showRehearsalInput = isEnsaio && !isPause && !isNote && (song.rehearsalStatus === 'yellow' || song.rehearsalStatus === 'red');

                return (
                  <View 
                    key={`${song.id}-${index}`} 
                    style={[
                      styles.songRow, 
                      { borderBottomColor: colors.border },
                      showRehearsalInput && { alignItems: 'flex-start', paddingVertical: 12 }
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
                          song.rehearsalStatus !== 'green' && song.rehearsalStatus !== 'yellow' && song.rehearsalStatus !== 'red' && { backgroundColor: colors.primary + '10' }
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
                      <View style={[styles.songIndexBadge, { backgroundColor: isPause ? colors.secondary + '15' : (isNote ? colors.warning + '15' : colors.primary + '10') }]}>
                        <Text style={[styles.songIndexText, { color: isPause ? colors.secondary : (isNote ? colors.warning : colors.primary) }]}>
                          {String(index + 1).padStart(2, '0')}
                        </Text>
                      </View>
                    )}

                    <View style={{ flex: 1 }}>
                      {isPause ? (
                        <View>
                          <Text style={[styles.songName, { color: colors.secondary, fontWeight: '900', fontSize: 13 }]}>
                            PAUSA
                          </Text>
                          {song.customNotes ? (
                            <Text style={{ fontSize: 11, color: colors.textMuted, fontStyle: 'italic', marginTop: 2 }}>
                              Obs: {song.customNotes}
                            </Text>
                          ) : null}
                        </View>
                      ) : isNote ? (
                        <View>
                          <Text style={[styles.songName, { color: colors.warning, fontWeight: '900', fontSize: 13, fontStyle: 'italic' }]}>
                            📝 {song.customNotes || 'ANOTAÇÃO / OBSERVAÇÃO'}
                          </Text>
                        </View>
                      ) : (
                        <>
                          <Text style={[styles.songName, { color: colors.text, fontSize: 13 }]} numberOfLines={1}>
                            {song.name}
                          </Text>
                          <Text style={[styles.songBand, { color: colors.textMuted, fontSize: 11 }]} numberOfLines={1}>
                            {song.originalBand}
                          </Text>

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
                        </>
                      )}
                    </View>
                    {isPause && song.customDuration ? (
                      <Text style={[styles.songDurationText, { color: colors.secondary, fontWeight: '800' }]}>
                        ⏱ {song.customDuration}
                      </Text>
                    ) : (!isPause && song.duration ? (
                      <Text style={[styles.songDurationText, { color: colors.textMuted }]}>
                        ⏱ {song.duration}
                      </Text>
                    ) : null)}
                  </View>
                );
              })}
            </View>
          )}

          {/* Botão Principal: Modo Palco */}
          <Pressable
            style={({ pressed }) => [
              styles.performanceButton,
              { backgroundColor: colors.success, transform: [{ scale: pressed ? 0.98 : 1 }] }
            ]}
            onPress={() => onStartPerformance(setlist)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={styles.performanceButtonText}>{t('startStageBtn')}</Text>
            </View>
          </Pressable>

          {/* Barra de Ações Rápidas do Setlist */}
          <View style={[styles.actionsBar, { borderTopColor: colors.border }]}>
            {/* FAVORITAR */}
            <Pressable 
              onPress={() => onToggleFavorite && onToggleFavorite(setlist.id, setlist.isFavorite)} 
              style={({ pressed }) => [
                styles.actionBtn, 
                { backgroundColor: setlist.isFavorite ? '#eab3081a' : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'), borderColor: setlist.isFavorite ? '#eab308' : colors.border, borderWidth: 1, opacity: pressed ? 0.7 : 1 }
              ]}
            >
              <Ionicons 
                name={setlist.isFavorite ? "star" : "star-outline"} 
                size={18} 
                color={setlist.isFavorite ? '#eab308' : colors.textMuted} 
              />
            </Pressable>

            {/* ENVIAR */}
            <Pressable 
              onPress={() => onShare(setlist)} 
              style={({ pressed }) => [
                styles.actionBtn, 
                { backgroundColor: colors.secondary + '12', borderColor: colors.secondary + '40', borderWidth: 1, opacity: pressed ? 0.7 : 1 }
              ]}
            >
              <Ionicons name="share-social-outline" size={18} color={colors.secondary} />
            </Pressable>

            {/* CLONAR */}
            <Pressable 
              onPress={() => onCopy(setlist.id)} 
              style={({ pressed }) => [
                styles.actionBtn, 
                { backgroundColor: colors.primary + '12', borderColor: colors.primary + '40', borderWidth: 1, opacity: pressed ? 0.7 : 1 }
              ]}
            >
              <Ionicons name="copy-outline" size={18} color={colors.primary} />
            </Pressable>

            {/* EDITAR */}
            <Pressable 
              onPress={() => onEdit(setlist)} 
              style={({ pressed }) => [
                styles.actionBtn, 
                { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: colors.border, borderWidth: 1, opacity: pressed ? 0.7 : 1 }
              ]}
            >
              <Ionicons name="pencil-outline" size={18} color={colors.text} />
            </Pressable>

            {/* DOCUMENTO WORD */}
            <Pressable 
              onPress={() => onExportDoc(setlist)} 
              style={({ pressed }) => [
                styles.actionBtn, 
                { backgroundColor: colors.success + '12', borderColor: colors.success + '40', borderWidth: 1, opacity: pressed ? 0.7 : 1 }
              ]}
            >
              <Ionicons name="download-outline" size={18} color={colors.success} />
            </Pressable>

            {/* EXCLUIR */}
            <Pressable 
              onPress={() => onDelete(setlist.id)} 
              style={({ pressed }) => [
                styles.actionBtn, 
                { backgroundColor: colors.danger + '12', borderColor: colors.danger + '40', borderWidth: 1, opacity: pressed ? 0.7 : 1 }
              ]}
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </Pressable>
          </View>

        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  cardHeaderCollapsed: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dateSquare: {
    width: 50,
    height: 50,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateDay: {
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 18,
  },
  dateMonth: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  bandLogoContainer: {
    marginLeft: 10,
  },
  bandLogo: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  bandLogoPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bandLogoPlaceholderIcon: {
    fontSize: 16,
  },
  textContainer: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '900',
    flex: 1,
  },
  cardSubText: {
    fontSize: 11,
    marginTop: 3,
  },
  chevronContainer: {
    justifyContent: 'center',
    paddingLeft: 8,
  },
  miniInfoBadge: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniInfoText: {
    fontSize: 9,
    fontWeight: '950',
  },
  songsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  eyeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  arrowIcon: {
    fontSize: 12,
    fontWeight: '900',
    width: 14,
    textAlign: 'center',
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  detailsList: {
    gap: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailIcon: {
    fontSize: 13,
    width: 16,
    textAlign: 'center',
  },
  detailText: {
    fontSize: 13,
    fontWeight: '700',
  },
  songsSection: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
  },
  songsSectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  songIndexBadge: {
    width: 22,
    height: 22,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  songIndexText: {
    fontSize: 10,
    fontWeight: '900',
  },
  songName: {
    fontWeight: '800',
  },
  songBand: {
    marginTop: 1,
  },
  songDurationText: {
    fontSize: 11,
    fontWeight: '800',
  },
  performanceButton: {
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  performanceButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
