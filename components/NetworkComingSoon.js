import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';

const { width } = Dimensions.get('window');

export default function NetworkComingSoon() {
  const { colors, themeMode, isDark: ctxIsDark } = useTheme();
  const isDark = themeMode === 'dark' || Boolean(ctxIsDark) || Boolean(colors?.isDark);
  const { t } = useLanguage();

  const previewFeatures = [
    {
      icon: 'people',
      color: colors.primary,
      title: t('featureMusiciansTitle') || 'Conexão entre Músicos',
      desc: t('featureMusiciansDesc') || 'Encontre instrumentistas e vocalistas da sua região e faça novas parcerias musicais.',
    },
    {
      icon: 'megaphone',
      color: colors.secondary,
      title: t('featureAnnouncementsTitle') || 'Anúncios de Novos Projetos',
      desc: t('featureAnnouncementsDesc') || 'Publique anúncios e vagas para seu projeto musical ou candidate-se a bandas abertas.',
    },
    {
      icon: 'mail-unread',
      color: colors.primary,
      title: t('featureInvitesTitle') || 'Convidar Membros para o Projeto',
      desc: t('featureInvitesDesc') || 'Convide músicos diretamente para integrar seu projeto com acesso compartilhado ao repertório e agenda.',
    },
    {
      icon: 'location',
      color: colors.secondary,
      title: t('featureLocationTitle') || 'Filtro por Cidade',
      desc: t('featureLocationDesc') || 'Descubra a cena musical na sua cidade ou encontre músicos e projetos em qualquer lugar.',
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        {
          paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) + 16 : 40,
        }
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Badge */}
      <View style={[styles.badgePill, { backgroundColor: colors.secondary + '18', borderColor: colors.secondary + '40' }]}>
        <Ionicons name="sparkles" size={13} color={colors.secondary} />
        <Text style={[styles.badgeText, { color: colors.secondary }]}>
          {t('comingSoonBadge') || 'EM BREVE'}
        </Text>
      </View>

      {/* Hero Logo Card */}
      <View style={styles.heroSection}>
        <View style={[styles.logoOuterGlow, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <Text style={[styles.mainTitle, { color: colors.text }]}>
          BAND<Text style={{ color: colors.primary }}>LINK</Text> <Text style={{ color: colors.secondary }}>REDE</Text>
        </Text>

        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {t('networkTeaserDesc') || 'Estamos preparando a maior rede de conexões musicais para conectar músicos e bandas de forma profissional.'}
        </Text>
      </View>

      {/* Highlights List */}
      <View style={styles.featuresList}>
        <Text style={[styles.featuresSectionTitle, { color: colors.textMuted }]}>
          {t('whatsComingSection') || 'O QUE VOCÊ PODERÁ FAZER'}
        </Text>

        {previewFeatures.map((feat, idx) => (
          <View
            key={idx}
            style={[
              styles.featureCard,
              {
                backgroundColor: isDark ? colors.card : '#ffffff',
                borderColor: isDark ? colors.border : '#e2e8f0',
                shadowColor: colors.shadowColor,
              }
            ]}
          >
            <View style={[styles.featureIconBox, { backgroundColor: feat.color + '18' }]}>
              <Ionicons name={feat.icon} size={22} color={feat.color} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.featureTitle, { color: colors.text }]}>
                {feat.title}
              </Text>
              <Text style={[styles.featureDesc, { color: colors.textMuted }]}>
                {feat.desc}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Notice Box */}
      <View style={[styles.noticeBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}>
        <Ionicons name="construct-outline" size={18} color={colors.primary} />
        <Text style={[styles.noticeText, { color: colors.textMuted }]}>
          {t('networkInFinalPrep') || 'Os servidores da Rede estão em fase final de testes. Enquanto isso, aproveite todas as funções de repertório, bandas, cifras e setlists!'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoOuterGlow: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoImage: {
    width: 68,
    height: 68,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
    maxWidth: 340,
  },
  featuresList: {
    width: '100%',
    marginBottom: 20,
  },
  featuresSectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 12,
    textAlign: 'center',
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  featureIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    width: '100%',
  },
  noticeText: {
    fontSize: 11.5,
    lineHeight: 17,
    flex: 1,
  },
});
