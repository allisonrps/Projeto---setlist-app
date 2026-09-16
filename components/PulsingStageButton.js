import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';

export default function PulsingStageButton({
  onPress,
  label,
  size = 'medium',
  style,
  textStyle,
}) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.65)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.parallel([
        Animated.timing(pulseScale, {
          toValue: 1.38, // Aumentado o tamanho da pulsação como solicitado
          duration: 1500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity, {
          toValue: 0,
          duration: 1500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();
    return () => pulseLoop.stop();
  }, []);

  const buttonLabel = label || t('startStageBtn') || 'MODO PALCO';
  const iconSize = size === 'small' ? 14 : size === 'large' ? 20 : 16;
  const paddingVertical = size === 'small' ? 6 : size === 'large' ? 14 : 10;
  const paddingHorizontal = size === 'small' ? 12 : size === 'large' ? 24 : 16;
  const fontSize = size === 'small' ? 11 : size === 'large' ? 15 : 13;

  return (
    <View style={[styles.outerWrapper, style]}>
      {/* Camada Anéis Pulsantes Externos (Pulsação Expandida) */}
      <Animated.View
        style={[
          styles.pulseRing,
          {
            backgroundColor: colors.primary + '30',
            borderColor: colors.primary + '70',
            borderRadius: 30,
            transform: [{ scale: pulseScale }],
            opacity: pulseOpacity,
          },
        ]}
      />

      {/* Botão Principal */}
      <Pressable
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: colors.primary,
            paddingVertical,
            paddingHorizontal,
            transform: [{ scale: pressed ? 0.96 : 1 }],
          },
        ]}
        onPress={onPress}
      >
        <Ionicons name="play" size={iconSize} color="#ffffff" style={{ marginRight: 6 }} />
        <Text style={[styles.buttonText, { fontSize }, textStyle]}>
          {buttonLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  pulseRing: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.5,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 2,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '900',
    letterSpacing: 0.8,
    includeFontPadding: false,
  },
});
