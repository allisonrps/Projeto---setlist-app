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
  variant = 'button', // 'button' | 'icon'
  iconName = 'play',
  color,
  style,
  textStyle,
}) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const btnColor = color || colors.primary;

  // Animação 1: Anel Externo Principal (Expansão até 1.8x)
  const pulseScale1 = useRef(new Animated.Value(1)).current;
  const pulseOpacity1 = useRef(new Animated.Value(0.8)).current;

  // Animação 2: Anel Secundário Interno (Ripples de Radar)
  const pulseScale2 = useRef(new Animated.Value(1)).current;
  const pulseOpacity2 = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const loop1 = Animated.loop(
      Animated.parallel([
        Animated.timing(pulseScale1, {
          toValue: variant === 'icon' ? 1.8 : 1.55,
          duration: 1600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity1, {
          toValue: 0,
          duration: 1600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ])
    );

    const loop2 = Animated.loop(
      Animated.sequence([
        Animated.delay(400),
        Animated.parallel([
          Animated.timing(pulseScale2, {
            toValue: variant === 'icon' ? 1.45 : 1.3,
            duration: 1400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity2, {
            toValue: 0,
            duration: 1400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    loop1.start();
    loop2.start();

    return () => {
      loop1.stop();
      loop2.stop();
    };
  }, [variant]);

  if (variant === 'icon') {
    return (
      <View style={[{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }, style]}>
        {/* Anel 1 Pulsante Externo */}
        <Animated.View
          style={{
            position: 'absolute',
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: btnColor + '45',
            borderColor: btnColor + 'B0',
            borderWidth: 2,
            transform: [{ scale: pulseScale1 }],
            opacity: pulseOpacity1,
          }}
        />

        {/* Anel 2 Pulsante Interno */}
        <Animated.View
          style={{
            position: 'absolute',
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: btnColor + '30',
            borderColor: btnColor + '80',
            borderWidth: 1.5,
            transform: [{ scale: pulseScale2 }],
            opacity: pulseOpacity2,
          }}
        />

        {/* Botão Principal */}
        <Pressable
          style={({ pressed }) => [
            {
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: btnColor,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ scale: pressed ? 0.90 : 1 }],
              shadowColor: btnColor,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.6,
              shadowRadius: 6,
              elevation: 5,
            },
          ]}
          onPress={onPress}
          hitSlop={6}
        >
          <Ionicons name={iconName === 'mic' ? 'mic' : 'play'} size={20} color="#ffffff" />
        </Pressable>
      </View>
    );
  }

  const buttonLabel = label || t('startStageBtn') || 'MODO PALCO';
  const iconSize = size === 'small' ? 14 : size === 'large' ? 20 : 16;
  const paddingVertical = size === 'small' ? 6 : size === 'large' ? 14 : 10;
  const paddingHorizontal = size === 'small' ? 14 : size === 'large' ? 26 : 18;
  const fontSize = size === 'small' ? 11 : size === 'large' ? 15 : 13;

  return (
    <View style={[styles.outerWrapper, style]}>
      {/* Anel 1 Pulsante Externo */}
      <Animated.View
        style={[
          styles.pulseRing,
          {
            backgroundColor: btnColor + '40',
            borderColor: btnColor + '99',
            borderRadius: 30,
            borderWidth: 2,
            transform: [{ scale: pulseScale1 }],
            opacity: pulseOpacity1,
          },
        ]}
      />

      {/* Anel 2 Pulsante Interno */}
      <Animated.View
        style={[
          styles.pulseRing,
          {
            backgroundColor: btnColor + '25',
            borderColor: btnColor + '70',
            borderRadius: 30,
            borderWidth: 1.5,
            transform: [{ scale: pulseScale2 }],
            opacity: pulseOpacity2,
          },
        ]}
      />

      {/* Botão Principal */}
      <Pressable
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: btnColor,
            paddingVertical,
            paddingHorizontal,
            transform: [{ scale: pressed ? 0.95 : 1 }],
            shadowColor: btnColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.5,
            shadowRadius: 10,
            elevation: 6,
          },
        ]}
        onPress={onPress}
      >
        <Ionicons name={iconName === 'mic' ? 'mic' : 'play'} size={iconSize} color="#ffffff" style={{ marginRight: 6 }} />
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
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    zIndex: 2,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '900',
    letterSpacing: 0.8,
    includeFontPadding: false,
  },
});
