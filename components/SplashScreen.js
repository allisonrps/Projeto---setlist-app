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
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ isReady, onFinish }) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(15)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Equalizer bar height animations
  const bar1Height = useRef(new Animated.Value(8)).current;
  const bar2Height = useRef(new Animated.Value(16)).current;
  const bar3Height = useRef(new Animated.Value(24)).current;
  const bar4Height = useRef(new Animated.Value(12)).current;
  const bar5Height = useRef(new Animated.Value(20)).current;

  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Initial entrance animation
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 700,
        delay: 250,
        useNativeDriver: true,
      }),
      Animated.timing(textTranslateY, {
        toValue: 0,
        duration: 600,
        delay: 250,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous pulse for outer ring
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    // Equalizer bars bouncing loop
    const animateBar = (animVal, minH, maxH, dur) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(animVal, {
            toValue: maxH,
            duration: dur,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(animVal, {
            toValue: minH,
            duration: dur,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
        ])
      );
    };

    const b1 = animateBar(bar1Height, 6, 26, 450);
    const b2 = animateBar(bar2Height, 10, 32, 380);
    const b3 = animateBar(bar3Height, 8, 36, 520);
    const b4 = animateBar(bar4Height, 6, 28, 410);
    const b5 = animateBar(bar5Height, 12, 30, 480);

    b1.start();
    b2.start();
    b3.start();
    b4.start();
    b5.start();

    return () => {
      pulseLoop.stop();
      b1.stop();
      b2.stop();
      b3.stop();
      b4.stop();
      b5.stop();
    };
  }, []);

  // Handle smooth exit when database is ready
  useEffect(() => {
    if (isReady && !isFadingOut) {
      setIsFadingOut(true);
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        if (onFinish) onFinish();
      });
    }
  }, [isReady, isFadingOut, fadeAnim, onFinish]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />
      
      {/* Background Decorative Rings */}
      <View style={styles.bgGlowRingLarge} />
      <View style={styles.bgGlowRingMedium} />

      {/* Main Logo Box with Pulse Ring */}
      <View style={styles.logoCenterWrapper}>
        <Animated.View
          style={[
            styles.pulseRing,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
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

      {/* App Name and Tagline */}
      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
          },
        ]}
      >
        <Text style={styles.brandTitleText}>
          SETLIST <Text style={styles.brandTitleHighlight}>BAND MANAGER</Text>
        </Text>
        <Text style={styles.taglineText}>Gestão inteligente para bandas e shows</Text>

        {/* Dynamic Animated Equalizer Indicator */}
        <View style={styles.equalizerRow}>
          <Animated.View style={[styles.eqBar, { height: bar1Height }]} />
          <Animated.View style={[styles.eqBar, { height: bar2Height, backgroundColor: '#38bdf8' }]} />
          <Animated.View style={[styles.eqBar, { height: bar3Height, backgroundColor: '#818cf8' }]} />
          <Animated.View style={[styles.eqBar, { height: bar4Height, backgroundColor: '#38bdf8' }]} />
          <Animated.View style={[styles.eqBar, { height: bar5Height }]} />
        </View>
      </Animated.View>

      {/* Footer Version Info */}
      <View style={styles.footerContainer}>
        <View style={styles.proBadge}>
          <Text style={styles.proBadgeText}>PRO EDITION</Text>
        </View>
        <Text style={styles.versionText}>v1.2.0 • Setlist App</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    backgroundColor: '#09090b',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  bgGlowRingLarge: {
    position: 'absolute',
    width: width * 1.3,
    height: width * 1.3,
    borderRadius: (width * 1.3) / 2,
    backgroundColor: '#38bdf806',
    borderWidth: 1,
    borderColor: '#38bdf812',
  },
  bgGlowRingMedium: {
    position: 'absolute',
    width: width * 0.95,
    height: width * 0.95,
    borderRadius: (width * 0.95) / 2,
    backgroundColor: '#818cf808',
    borderWidth: 1,
    borderColor: '#818cf818',
  },
  logoCenterWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  pulseRing: {
    position: 'absolute',
    width: 146,
    height: 146,
    borderRadius: 73,
    borderWidth: 2,
    borderColor: '#38bdf840',
    backgroundColor: '#38bdf80d',
  },
  logoContainer: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#18181b',
    borderWidth: 2,
    borderColor: '#38bdf8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  logoImage: {
    width: 84,
    height: 84,
  },
  textContainer: {
    alignItems: 'center',
  },
  brandTitleText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 2,
    textAlign: 'center',
  },
  brandTitleHighlight: {
    color: '#38bdf8',
  },
  taglineText: {
    fontSize: 13,
    color: '#a1a1aa',
    marginTop: 6,
    marginBottom: 20,
    letterSpacing: 0.5,
    textAlign: 'center',
    fontWeight: '400',
  },
  equalizerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 40,
    gap: 6,
    marginTop: 6,
  },
  eqBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: '#60a5fa',
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
