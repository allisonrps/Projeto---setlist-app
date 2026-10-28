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

          {/* GLOW DESFOCADO COM RASTRO DEGRADÊ ESFUMAÇADO ORBITANDO O LOGO */}
          <Animated.View
            style={[
              styles.orbitRingWrapper,
              {
                transform: [{ rotate: spinInterpolate }],
              },
            ]}
          >
            {/* Rastro Degradê Esfumaçado (seguindo a curvatura do círculo) */}
            <View style={[styles.orbitSegment, { transform: [{ rotate: '-62deg' }] }]}>
              <View style={[styles.smokePuff, styles.smokeTail6]} />
            </View>
            <View style={[styles.orbitSegment, { transform: [{ rotate: '-49deg' }] }]}>
              <View style={[styles.smokePuff, styles.smokeTail5]} />
            </View>
            <View style={[styles.orbitSegment, { transform: [{ rotate: '-37deg' }] }]}>
              <View style={[styles.smokePuff, styles.smokeTail4]} />
            </View>
            <View style={[styles.orbitSegment, { transform: [{ rotate: '-26deg' }] }]}>
              <View style={[styles.smokePuff, styles.smokeTail3]} />
            </View>
            <View style={[styles.orbitSegment, { transform: [{ rotate: '-16deg' }] }]}>
              <View style={[styles.smokePuff, styles.smokeTail2]} />
            </View>
            <View style={[styles.orbitSegment, { transform: [{ rotate: '-8deg' }] }]}>
              <View style={[styles.smokePuff, styles.smokeTail1]} />
            </View>

            {/* Cabeça do Glow Desfocado (Aura difusa sem borda rígida) */}
            <View style={styles.orbitSegment}>
              <View style={styles.glowAuraOuter} />
              <View style={styles.glowAuraMid} />
              <View style={styles.glowAuraCore} />
            </View>
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

        {/* ── MOSTRADOR DE PORCENTAGEM ABAIXO ── */}
        <Animated.View style={[styles.progressSection, { opacity: contentOpacity }]}>
          {/* Número Percentual Grande e Limpo */}
          <Text style={styles.percentText}>
            {Math.min(100, Math.round(progressPercent))}%
          </Text>

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
          <Text style={styles.versionText}>v1.4.1 • BandLink</Text>
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
    width: 242,
    height: 242,
    borderRadius: 121,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbitSegment: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 242,
    height: 242,
    alignItems: 'center',
  },
  /* Cabeça do Glow Desfocado (Camadas de luz suave sem bordas duras) */
  glowAuraOuter: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    marginTop: -30,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 26,
    elevation: 10,
  },
  glowAuraMid: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    marginTop: -19,
    backgroundColor: 'rgba(56, 189, 248, 0.38)',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 18,
    elevation: 8,
  },
  glowAuraCore: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    marginTop: -10,
    backgroundColor: 'rgba(224, 242, 254, 0.65)',
    shadowColor: '#bae6fd',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  /* Rastro Degradê Esfumaçado */
  smokePuff: {
    position: 'absolute',
  },
  smokeTail1: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginTop: -17,
    backgroundColor: 'rgba(56, 189, 248, 0.28)',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
  },
  smokeTail2: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginTop: -15,
    backgroundColor: 'rgba(56, 189, 248, 0.20)',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  smokeTail3: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginTop: -13,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  smokeTail4: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginTop: -11,
    backgroundColor: 'rgba(99, 102, 241, 0.10)',
  },
  smokeTail5: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginTop: -9,
    backgroundColor: 'rgba(129, 140, 248, 0.06)',
  },
  smokeTail6: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: -7,
    backgroundColor: 'rgba(129, 140, 248, 0.03)',
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
    fontSize: 28,
    fontWeight: '900',
    color: '#38bdf8',
    letterSpacing: 1,
    marginBottom: 8,
    textShadowColor: 'rgba(56, 189, 248, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
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
