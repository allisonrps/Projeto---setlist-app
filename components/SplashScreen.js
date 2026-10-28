import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
  StatusBar,
  Modal,
} from 'react-native';
import { useLanguage } from '../hooks/useLanguage';

const { width } = Dimensions.get('window');

export default function SplashScreen({ isReady, onFinish }) {
  const { t } = useLanguage();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  const [progressPercent, setProgressPercent] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const percentRef = useRef(0);
  percentRef.current = progressPercent;

  useEffect(() => {
    // 1. Entrada suave do Logo
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 45,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Pulso suave da aura
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    // 3. Efeito moderno: Glow contínuo orbitando / andando em volta do logo (360°)
    const spinLoop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spinLoop.start();

    // 4. Progresso percentual suave inicial (de 0% até ~88% enquanto o banco inicializa)
    const progressTimer = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev < 30) return prev + Math.floor(Math.random() * 8 + 4);
        if (prev < 65) return prev + Math.floor(Math.random() * 5 + 3);
        if (prev < 88) return prev + Math.floor(Math.random() * 3 + 1);
        return prev;
      });
    }, 120);

    return () => {
      pulseLoop.stop();
      spinLoop.stop();
      clearInterval(progressTimer);
    };
  }, []);

  // 5. Quando o banco de dados e serviços estiverem prontos (isReady = true)
  useEffect(() => {
    if (isReady && !isFadingOut) {
      // Acelera suavemente de onde estiver até 100%
      const finishTimer = setInterval(() => {
        setProgressPercent((prev) => {
          if (prev >= 100) {
            clearInterval(finishTimer);
            return 100;
          }
          return Math.min(100, prev + 8);
        });
      }, 40);

      const checkFinishTimer = setInterval(() => {
        if (percentRef.current >= 100 && !isFadingOut) {
          clearInterval(checkFinishTimer);
          setIsFadingOut(true);
          setTimeout(() => {
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 450,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }).start(() => {
              if (onFinish) onFinish();
            });
          }, 200);
        }
      }, 50);

      return () => {
        clearInterval(finishTimer);
        clearInterval(checkFinishTimer);
      };
    }
  }, [isReady, isFadingOut, fadeAnim, onFinish]);

  const spinInterpolate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal visible={true} transparent={true} animationType="none">
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <StatusBar barStyle="light-content" backgroundColor="#09090b" />

        {/* Círculos decorativos de profundidade no fundo */}
        <View style={styles.bgGlowRingLarge} />
        <View style={styles.bgGlowRingMedium} />

        {/* ── LOGO 100% MAIOR COM GLOW ANDANDO EM VOLTA ── */}
        <View style={styles.logoCenterWrapper}>
          {/* Anel de Pulso de Fundo */}
          <Animated.View
            style={[
              styles.pulseRing,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />

          {/* GLOW ANDANDO EM VOLTA DO LOGO (ORBIT LIGHT BEAM) */}
          <Animated.View
            style={[
              styles.orbitRingWrapper,
              {
                transform: [{ rotate: spinInterpolate }],
              },
            ]}
          >
            {/* Feixe de Luz Principal (Cometa Neon) */}
            <View style={styles.glowCometHead} />
            <View style={styles.glowCometTrail1} />
            <View style={styles.glowCometTrail2} />
          </Animated.View>

          {/* Container do Logo (100% maior: 240x240) */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <Image
              source={require('../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        {/* ── MOSTRADOR DE PORCENTAGEM E BARRA DE CARREGAMENTO ABAIXO ── */}
        <Animated.View style={[styles.progressSection, { opacity: contentOpacity }]}>
          {/* Número Percentual Grande e Limpo */}
          <Text style={styles.percentText}>
            {Math.min(100, Math.round(progressPercent))}%
          </Text>

          {/* Barra de Progresso Elegante com Glow */}
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(100, Math.max(0, progressPercent))}%` },
              ]}
            />
          </View>

          {/* Status Subtitle */}
          <Text style={styles.statusSubtitle}>
            {progressPercent < 45
              ? (t('loadingDb') || 'Iniciando banco de dados...')
              : progressPercent < 85
              ? (t('loadingServices') || 'Carregando ambiente e repertório...')
              : progressPercent < 100
              ? (t('loadingFinishing') || 'Quase pronto...')
              : (t('loadingReady') || 'Tudo pronto!')}
          </Text>
        </Animated.View>

        {/* Rodapé Elegante com Versão */}
        <View style={styles.footerContainer}>
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>{t('proEdition') || 'PRO'}</Text>
          </View>
          <Text style={styles.versionText}>v1.4.0 • BandLink</Text>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    zIndex: 99999,
    backgroundColor: '#09090b',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  bgGlowRingLarge: {
    position: 'absolute',
    width: width * 1.35,
    height: width * 1.35,
    borderRadius: (width * 1.35) / 2,
    backgroundColor: '#38bdf805',
    borderWidth: 1,
    borderColor: '#38bdf810',
  },
  bgGlowRingMedium: {
    position: 'absolute',
    width: width * 0.95,
    height: width * 0.95,
    borderRadius: (width * 0.95) / 2,
    backgroundColor: '#818cf808',
    borderWidth: 1,
    borderColor: '#818cf815',
  },
  logoCenterWrapper: {
    width: 280,
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 36,
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 2,
    borderColor: '#38bdf830',
    backgroundColor: '#38bdf808',
  },
  orbitRingWrapper: {
    position: 'absolute',
    width: 264,
    height: 264,
    borderRadius: 132,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  glowCometHead: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#38bdf8',
    marginTop: -12,
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 16,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  glowCometTrail1: {
    position: 'absolute',
    top: -8,
    width: 44,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#38bdf840',
    shadowColor: '#38bdf8',
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  glowCometTrail2: {
    position: 'absolute',
    top: -5,
    width: 70,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#818cf825',
  },
  logoContainer: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#18181b',
    borderWidth: 2.5,
    borderColor: '#38bdf850',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
  logoImage: {
    width: 170,
    height: 170,
  },
  progressSection: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  percentText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#38bdf8',
    letterSpacing: 1,
    marginBottom: 12,
    textShadowColor: 'rgba(56, 189, 248, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  progressBarTrack: {
    width: 230,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#38bdf8',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  statusSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  footerContainer: {
    position: 'absolute',
    bottom: 36,
    alignItems: 'center',
  },
  proBadge: {
    backgroundColor: '#38bdf81a',
    borderColor: '#38bdf840',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 6,
  },
  proBadgeText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  versionText: {
    color: '#71717a',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});
