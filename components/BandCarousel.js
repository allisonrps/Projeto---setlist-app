import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
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

export default function BandCarousel({ 
  bands, 
  selectedBandId,
  onSelectBand, 
  onAddBand,
  onEditBand, 
  onDeleteBand 
}) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const isDark = colors.isDark;
  
  // Controla qual banda está com os botões de ação ativos
  const [activeActionsBandId, setActiveActionsBandId] = useState(null);

  const handleBandPress = (band) => {
    if (activeActionsBandId) {
      // Se houver algum modo de edição ativo, fecha ao tocar
      setActiveActionsBandId(null);
    } else {
      onSelectBand(band.id);
    }
  };

  const handleBandLongPress = (band) => {
    setActiveActionsBandId(band.id);
  };

  return (
    <View style={styles.carouselContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {bands.map((band) => {
          const isSelected = selectedBandId === band.id;
          const showActions = activeActionsBandId === band.id;

          return (
            <View key={band.id} style={styles.bandItemWrapper}>
              <Pressable
                onPress={() => handleBandPress(band)}
                onLongPress={() => handleBandLongPress(band)}
                delayLongPress={500}
                style={({ pressed }) => [
                  styles.bandCircle,
                  {
                    borderColor: isSelected ? colors.primary : colors.border,
                    borderWidth: isSelected ? 2.5 : 1.5,
                    transform: [{ scale: pressed ? 0.95 : 1 }]
                  }
                ]}
              >
                {band.imageUri ? (
                  <Image 
                    source={{ uri: band.imageUri }} 
                    style={styles.bandCircleImage} 
                  />
                ) : (
                  <View style={[styles.bandCirclePlaceholder, { backgroundColor: colors.cardBackground }]}>
                    <Text style={{ fontSize: 24, fontWeight: '900', color: colors.primary }}>
                      {getBandInitials(band.name)}
                    </Text>
                  </View>
                )}

                {/* Botões Flutuantes e Redondos (Editar e Excluir) */}
                {showActions && (
                  <View style={styles.actionsOverlay}>
                    {/* Botão Editar (Esquerda) */}
                    <Pressable
                      style={({ pressed }) => [
                        styles.floatingActionButton,
                        { 
                          backgroundColor: colors.primary, 
                          left: -4, 
                          top: -4,
                          opacity: pressed ? 0.8 : 1
                        }
                      ]}
                      onPress={() => {
                        setActiveActionsBandId(null);
                        onEditBand(band);
                      }}
                    >
                      <Ionicons name="pencil" size={13} color="#FFFFFF" />
                    </Pressable>

                    {/* Botão Excluir (Direita) */}
                    <Pressable
                      style={({ pressed }) => [
                        styles.floatingActionButton,
                        { 
                          backgroundColor: colors.danger, 
                          right: -4, 
                          top: -4,
                          opacity: pressed ? 0.8 : 1
                        }
                      ]}
                      onPress={() => {
                        setActiveActionsBandId(null);
                        onDeleteBand(band);
                      }}
                    >
                      <Ionicons name="trash" size={13} color="#FFFFFF" />
                    </Pressable>
                  </View>
                )}
              </Pressable>

              <Text 
                style={[styles.bandCircleName, { color: colors.text }]}
                numberOfLines={1}
              >
                {band.name}
              </Text>
            </View>
          );
        })}

        {/* Botão de Criar Banda no Final da Fila */}
        <View style={styles.bandItemWrapper}>
          <Pressable
            onPress={() => {
              setActiveActionsBandId(null);
              onAddBand();
            }}
            style={({ pressed }) => [
              styles.addBandCircle,
              {
                borderColor: colors.primary,
                backgroundColor: colors.primary + '10',
                transform: [{ scale: pressed ? 0.95 : 1 }]
              }
            ]}
          >
            <Ionicons name="add" size={28} color={colors.primary} />
          </Pressable>
          <Text style={[styles.bandCircleName, { color: colors.primary, fontWeight: '900' }]} numberOfLines={1}>
            {t('addBand') || '+ Banda'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  carouselContainer: {
    marginBottom: 20,
  },
  carouselTitle: {
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 12,
    paddingHorizontal: 4,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  scrollContent: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 16,
    flexDirection: 'row',
  },
  bandItemWrapper: {
    alignItems: 'center',
    width: 80,
  },
  bandCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  bandCircleImage: {
    width: '100%',
    height: '100%',
    borderRadius: 38,
    resizeMode: 'cover',
  },
  bandCirclePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bandCircleIcon: {
    fontSize: 26,
  },
  bandCircleName: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    width: '100%',
    marginTop: 6,
  },
  addBandCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    borderRadius: 38,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  floatingActionButton: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
});
