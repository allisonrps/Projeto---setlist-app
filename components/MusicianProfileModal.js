import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  Image,
  StyleSheet,
  StatusBar,
  Platform,
  Linking,
  Share,
  Alert,
  TextInput,
  KeyboardAvoidingView
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';
import { bandService } from '../services/bandService';
import { musiciansService } from '../services/musiciansService';

const getBandInitials = (name) => {
  if (!name) return 'BD';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

export default function MusicianProfileModal({ visible, musician, onClose, onInvite, onOpenBandProfile }) {
  const { colors } = useTheme();
  const isDark = colors.isDark;
  const { t } = useLanguage();
  const getInterestLevelLabel = (opt) => {
    switch (opt) {
      case 'Hobbie': return t('proposalHobby') || 'Hobbie';
      case 'Profissional': return t('proposalProfessional') || 'Profissional';
      case 'Casual':
      case 'Ver no que dá': return t('proposalCasual') || t('proposalSeeWhatHappens') || 'Casual';
      case 'Cover': return t('proposalCover') || 'Cover';
      case 'Autoral': return t('proposalOriginal') || 'Autoral';
      default: return opt;
    }
  };

  const getMemberPositionLabel = (type, role) => {
    const tLower = String(type || '').toLowerCase();
    const rLower = String(role || '').toLowerCase();
    if (tLower.includes('líder') || tLower.includes('lider') || rLower.includes('líder') || rLower.includes('lider') || rLower.includes('leader')) {
      return t('leaderBadge') || 'Líder';
    }
    if (tLower.includes('proprietário') || tLower.includes('proprietario') || tLower.includes('owner') || rLower.includes('proprietário') || rLower.includes('owner')) {
      if (tLower.includes('membro') || tLower.includes('integrante')) {
        return t('memberOwnerBadge') || 'Integrante / Proprietário';
      }
      return t('ownerBadge') || 'Proprietário';
    }
    if (tLower.includes('fundador') || tLower.includes('fundadora') || rLower.includes('fundador') || rLower.includes('founder')) {
      return t('founderBadge') || 'Fundador';
    }
    return t('memberBadge') || 'Integrante';
  };

  const getProjectInstrument = (role, skillsList) => {
    if (!role) {
      return skillsList?.[0]?.instrument || (t('musicianFallback') || 'Músico');
    }
    const clean = String(role)
      .replace(/&?\s*(líder|lider|fundador|fundadora|proprietário|proprietária|proprietario|integrante|membro|leader|owner|member|founder)/gi, '')
      .replace(/^[&,\s-]+|[&,\s-]+$/g, '')
      .trim();
    if (!clean || clean.toLowerCase() === 'músico' || clean.toLowerCase() === 'musician' || clean.toLowerCase() === 'integrante') {
      return skillsList?.[0]?.instrument || (t('musicianFallback') || 'Músico');
    }
    return clean;
  };


  const [activeTab, setActiveTab] = useState('bio');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [myBands, setMyBands] = useState([]);
  const [selectedBandId, setSelectedBandId] = useState(null);
  const [inviteMessage, setInviteMessage] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  useEffect(() => {
    if (visible) {
      setActiveTab('bio');
      loadMyBands();
    }
  }, [visible, musician]);

  const loadMyBands = async () => {
    try {
      const bands = await bandService.getAll();
      setMyBands(bands || []);
      if (bands && bands.length > 0) {
        setSelectedBandId(bands[0].id);
      }
    } catch (e) {
      console.log('Erro ao carregar bandas para convite:', e);
    }
  };

  if (!musician) return null;

  // ── Normalização idêntica ao ProfileScreen ──
  const currentDisplayName = musician.displayName || musician.name || musician.username || 'Músico';
  const cleanUsername = (musician.username || 'musico').toLowerCase().replace(/^@+/, '');
  const profileImage = musician.imageUri || musician.profileImage || null;

  // Nível de interesse
  const interestLevel = Array.isArray(musician.interestLevel)
    ? musician.interestLevel
    : (typeof musician.interestLevel === 'string' && musician.interestLevel.startsWith('[')
        ? JSON.parse(musician.interestLevel)
        : (musician.interestLevel ? [musician.interestLevel] : ['Profissional']));

  // Disponibilidade
  const availability = musician.availability || 'Disponível';

  // Bio
  const bio = musician.bio || 'Músico ativo na cena musical e na comunidade Setlist.';

  // Influências (com estrelas)
  const rawInfluences = Array.isArray(musician.influences)
    ? musician.influences
    : (typeof musician.influences === 'string' ? musician.influences.split(',').map(s => s.trim()).filter(Boolean) : []);

  const influences = rawInfluences.map((inf, idx) => {
    if (typeof inf === 'string') {
      return { id: String(idx + 1), name: inf.replace(/^#/, ''), stars: idx === 0 ? 5 : (5 - Math.min(2, idx)) };
    }
    return {
      id: String(inf.id || idx + 1),
      name: String(inf.name || '').replace(/^#/, ''),
      stars: typeof inf.stars === 'number' ? inf.stars : 5
    };
  });

  // Habilidades (com indicação de principal e estrelas)
  const rawSkills = Array.isArray(musician.skills) && musician.skills.length > 0
    ? musician.skills
    : (Array.isArray(musician.primaryInstruments) && musician.primaryInstruments.length > 0
        ? musician.primaryInstruments.map((pi, idx) => ({
            id: String(idx + 1),
            instrument: typeof pi === 'string' ? pi : (pi.instrument || pi.name || 'Instrumento'),
            stars: typeof pi === 'object' && pi.stars ? pi.stars : (musician.stars || 5),
            isPrimary: typeof pi === 'object' && pi.isPrimary !== undefined ? pi.isPrimary : (idx < 2)
          }))
        : [{ id: '1', instrument: musician.primaryInstrument || 'Instrumento', stars: musician.stars || 5, isPrimary: true }]
      );

  const skills = rawSkills.map((s, idx) => ({
    id: String(s.id || idx + 1),
    instrument: s.instrument || s.name || 'Instrumento',
    stars: typeof s.stars === 'number' ? s.stars : 5,
    isPrimary: s.isPrimary !== undefined ? s.isPrimary : (idx < 2)
  }));

  // Equipamentos (Gear)
  const gear = Array.isArray(musician.gear) && musician.gear.length > 0
    ? musician.gear.map((g, idx) => ({
        id: String(g.id || idx + 1),
        category: g.category || 'Equipamento',
        name: g.name || 'Setup Principal',
        details: g.details || '',
        isPrimary: g.isPrimary !== undefined ? g.isPrimary : (idx === 0)
      }))
    : [
        {
          id: '1',
          category: skills[0]?.instrument || 'Instrumento',
          name: 'Setup Profissional de Palco',
          details: 'Equipamento regulado para gravações em estúdio e apresentações ao vivo.',
          isPrimary: true
        }
      ];

  // Bandas e Projetos
  const rawProjects = Array.isArray(musician.projects) && musician.projects.length > 0
    ? musician.projects
    : (Array.isArray(musician.bands) && musician.bands.length > 0
        ? musician.bands.map((b, idx) => ({
            id: String(b.id || idx + 1),
            name: b.name || 'Projeto Musical',
            role: b.role || skills[0]?.instrument || 'Músico',
            since: b.since || b.period || '2022',
            memberType: b.memberType || 'Membro / Integrante',
            city: b.city || musician.city || '',
            state: b.state || musician.state || '',
            country: b.country || musician.country || '',
            genres: b.genres || (influences.length > 0 ? influences.slice(0, 3).map(i => i.name) : ['Rock', 'Pop'])
          }))
        : [
            {
              id: '1',
              name: 'Projetos e Apresentações',
              role: skills[0]?.instrument || 'Músico',
              since: '2022',
              memberType: 'Membro',
              city: musician.city || '',
              state: musician.state || '',
              country: musician.country || '',
              genres: ['Rock', 'Pop', 'Indie']
            }
          ]
      );

  // Agenda (mostra os próximos shows do músico / bandas do músico)
  const agenda = (Array.isArray(musician.agenda) && musician.agenda.length > 0)
    ? musician.agenda
    : (Array.isArray(musician.schedule) && musician.schedule.length > 0)
      ? musician.schedule
      : (Array.isArray(musician.shows) && musician.shows.length > 0)
        ? musician.shows
        : [];

  const handleOpenLink = async (url) => {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert(t('notice') || 'Aviso', (t('couldNotOpenLinkMsg') || 'Não foi possível abrir o link: ') + url);
    }
  };

  const handleOpenInstagram = () => {
    if (!musician.instagram) return;
    const user = musician.instagram.replace(/^@+/, '').trim();
    if (user.startsWith('http://') || user.startsWith('https://')) {
      handleOpenLink(user);
    } else {
      handleOpenLink(`https://instagram.com/${user}`);
    }
  };

  const handleOpenYouTube = () => {
    if (!musician.youtube) return;
    const yt = musician.youtube.trim();
    if (yt.startsWith('http://') || yt.startsWith('https://')) {
      handleOpenLink(yt);
    } else {
      handleOpenLink(`https://youtube.com/@${yt.replace(/^@+/, '')}`);
    }
  };

  const handleOpenTwitter = () => {
    if (!musician.twitter) return;
    const tw = musician.twitter.replace(/^@+/, '').trim();
    if (tw.startsWith('http://') || tw.startsWith('https://')) {
      handleOpenLink(tw);
    } else {
      handleOpenLink(`https://x.com/${tw}`);
    }
  };

  const handleOpenFacebook = () => {
    if (!musician.facebook) return;
    const fb = musician.facebook.trim();
    if (fb.startsWith('http://') || fb.startsWith('https://')) {
      handleOpenLink(fb);
    } else {
      handleOpenLink(fb.startsWith('facebook.com') ? `https://${fb}` : `https://facebook.com/${fb.replace(/^@+/, '')}`);
    }
  };

  const handleOpenSpotify = () => {
    if (!musician.spotify) return;
    const sp = musician.spotify.trim();
    if (sp.startsWith('http://') || sp.startsWith('https://')) {
      handleOpenLink(sp);
    } else {
      handleOpenLink(`https://open.spotify.com/artist/${sp}`);
    }
  };

  const handleOpenTikTok = () => {
    if (!musician.tiktok) return;
    const tt = musician.tiktok.replace(/^@+/, '').trim();
    if (tt.startsWith('http://') || tt.startsWith('https://')) {
      handleOpenLink(tt);
    } else {
      handleOpenLink(`https://tiktok.com/@${tt}`);
    }
  };

  const handleShareProfile = async () => {
    try {
      const mainInst = skills[0]?.instrument || 'Músico';
      const stylesStr = influences.slice(0, 3).map(s => `#${s.name}`).join(' ');
      await Share.share({
        title: `Página Pública de ${currentDisplayName} - Setlist`,
        message: `🎵 Conheça o perfil de ${currentDisplayName} (@${cleanUsername}) no Setlist App!\n🎸 Instrumento: ${mainInst}\n📍 ${[musician.city, musician.state].filter(Boolean).join(', ') || musician.country || ''}\n✨ Estilos: ${stylesStr || '#Música'}\n🌐 Confira a página pública no aplicativo Setlist!`
      });
    } catch (err) {
      console.log('Erro ao compartilhar perfil:', err);
    }
  };

  const handleTriggerInvite = () => {
    if (onInvite) {
      onInvite(musician);
      return;
    }
    if (myBands.length === 0) {
      Alert.alert(
        t('noBandsFoundTitle') || 'Nenhuma Banda Encontrada',
        t('noBandsFoundMsg') || 'Você ainda não possui bandas cadastradas. Crie uma banda na aba Bandas primeiro.'
      );
      return;
    }
    setInviteMessage('');
    setShowInviteModal(true);
  };

  const sanitizeInviteText = (str) => {
    if (!str) return '';
    return str
      .replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, '')
      .trim()
      .slice(0, 500);
  };

  const handleConfirmInvite = async () => {
    if (!selectedBandId) {
      Alert.alert(t('selectBandTitle') || 'Selecione uma Banda', t('selectBandPrompt') || 'Por favor, selecione a banda para a qual deseja convidar o músico.');
      return;
    }
    const targetBand = myBands.find(b => b.id === selectedBandId);
    if (!targetBand) return;

    try {
      setIsSendingInvite(true);
      const role = skills[0]?.instrument || 'Músico';
      const currentYear = new Date().getFullYear().toString();
      const defaultMessage = `Olá ${currentDisplayName}! Convidamos você para ser ${role} na banda ${targetBand.name}.`;
      const cleanedMessage = sanitizeInviteText(inviteMessage);
      const finalMessage = cleanedMessage || defaultMessage;

      const memberId = await bandService.addBandMember(
        targetBand.id,
        currentDisplayName,
        role,
        musician.phone || '',
        currentYear,
        '',
        'pending',
        '[]',
        cleanUsername,
        finalMessage
      );

      let myUser = '';
      let myName = '';
      try {
        const cachedUserStr = (await AsyncStorage.getItem('user_profile_cache')) || (await AsyncStorage.getItem('user_info'));
        if (cachedUserStr) {
          const parsedU = JSON.parse(cachedUserStr);
          myUser = parsedU.username || '';
          myName = parsedU.displayName || parsedU.name || '';
        }
      } catch (e) {}

      await musiciansService.sendInvitation({
        bandMemberId: memberId,
        bandId: targetBand.id,
        bandName: targetBand.name,
        role,
        invitedUsername: cleanUsername,
        invitedName: currentDisplayName,
        senderUsername: myUser,
        senderName: myName,
        message: finalMessage,
        city: targetBand.city || musician.city || '',
        state: targetBand.state || musician.state || ''
      });

      setShowInviteModal(false);
      setInviteMessage('');
      Alert.alert(
        t('candidateInviteSentTitle') || 'Convite Enviado! ✉️',
        (t('candidateInviteSentMsg') || 'Você convidou {name} para integrar a banda "{band}".')
          .replace('{name}', `${currentDisplayName} (@${cleanUsername})`)
          .replace('{band}', targetBand.name) + '\n\n' + (t('candidateInviteSuccessDetail') || 'O integrante foi adicionado como "Pendente" na aba de integrantes da banda.')
      );
    } catch (e) {
      console.log('Erro ao enviar convite:', e);
      Alert.alert(t('errorTitle') || 'Erro', t('inviteErrorMsg') || 'Não foi possível enviar o convite. Tente novamente.');
    } finally {
      setIsSendingInvite(false);
    }
  };

  // ── Helper de estrelas (suporta de 0 a 5 estrelas) – igual ao ProfileScreen ──
  const renderStars = (count, size = 16) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(s => {
        const isFilled = s <= count;
        return (
          <Ionicons
            key={s}
            name={isFilled ? 'star' : 'star-outline'}
            size={size}
            color={isFilled ? colors.primary : (isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)')}
          />
        );
      })}
    </View>
  );

  // ── Pill helper: idêntico ao ProfileScreen (apenas exibição) ──
  const Pill = ({ label, selected, flex }) => (
    <View
      style={{
        flex: flex || undefined,
        paddingVertical: 5,
        paddingHorizontal: 6,
        borderRadius: 8,
        backgroundColor: selected ? colors.primary + '22' : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
        borderWidth: 1.5,
        borderColor: selected ? colors.primary : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ 
        color: selected ? colors.primary : colors.textMuted, 
        fontSize: 11, 
        fontWeight: selected ? '800' : '600', 
        textAlign: 'center' 
      }}>
        {label}
      </Text>
    </View>
  );

  // ── Faixa/Fundo simétrico com o cabeçalho lateralmente (full width) ──
  const SectionBanner = ({ title, rightElement, isFirst = false }) => (
    <View style={[
      styles.sectionBannerContainer, 
      { 
        backgroundColor: isDark ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.035)',
        borderTopColor: colors.border,
        borderBottomColor: colors.border,
        marginTop: isFirst ? 2 : 18
      }
    ]}>
      <Text style={[styles.sectionBannerTitle, { color: colors.text }]}>{title}</Text>
      {rightElement}
    </View>
  );

  // ══════════════ TABS ══════════════

  // ── 1. BIO TAB (IDÊNTICO AO PROFILE SCREEN, SEM BOTÕES DE EDITAR) ──
  const renderBioTab = () => (
    <View style={styles.tabContentClean}>
      {/* Faixa: NÍVEL DE INTERESSE */}
      <SectionBanner title={t('interestLevelSection') || "Nível de Interesse"} isFirst={true} />
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, paddingHorizontal: 2 }}>
        {[
          { key: 'Hobbie' },
          { key: 'Profissional' },
          { key: 'Casual' }
        ].map(item => {
          const isSelected = interestLevel.some(val => {
            const v = String(val || '').toLowerCase();
            const k = item.key.toLowerCase();
            if (k.includes('hobb') && v.includes('hobb')) return true;
            if (k.includes('prof') && v.includes('prof')) return true;
            if ((k.includes('ver') || k.includes('casual')) && (v.includes('ver') || v.includes('see') || v.includes('casual'))) return true;
            return v === k;
          });

          return (
            <View 
              key={item.key} 
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 9,
                paddingHorizontal: 4,
                borderRadius: 12,
                backgroundColor: isSelected 
                  ? (colors.primary + '18') 
                  : (isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.03)'),
                borderWidth: 1.5,
                borderColor: isSelected 
                  ? colors.primary 
                  : (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'),
              }}
            >
              <Text style={{ 
                color: isSelected ? colors.primary : colors.textMuted, 
                fontSize: 12, 
                fontWeight: isSelected ? '800' : '600', 
                textAlign: 'center' 
              }}>
                {getInterestLevelLabel(item.key)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Disponibilidade – 2 pílulas */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4, paddingHorizontal: 2 }}>
        {(() => {
          const isAvail = availability === 'Disponível' || String(availability).toLowerCase() === 'available';
          const isUnavail = availability === 'Indisponível' || String(availability).toLowerCase() === 'unavailable';
          return (
            <>
              <View 
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingVertical: 9,
                  paddingHorizontal: 8,
                  borderRadius: 12,
                  backgroundColor: isAvail 
                    ? '#10B98118' 
                    : (isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.03)'),
                  borderWidth: 1.5,
                  borderColor: isAvail 
                    ? '#10B981' 
                    : (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'),
                }}
              >
                <Ionicons 
                  name={isAvail ? "checkmark-circle" : "checkmark-circle-outline"} 
                  size={14} 
                  color={isAvail ? '#10B981' : colors.textMuted} 
                />
                <Text style={{ 
                  color: isAvail ? '#10B981' : colors.textMuted, 
                  fontSize: 12, 
                  fontWeight: isAvail ? '800' : '600', 
                  textAlign: 'center' 
                }}>
                  {t('availableStatus') || "Disponível"}
                </Text>
              </View>

              <View 
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingVertical: 9,
                  paddingHorizontal: 8,
                  borderRadius: 12,
                  backgroundColor: isUnavail 
                    ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)') 
                    : (isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.03)'),
                  borderWidth: 1.5,
                  borderColor: isUnavail 
                    ? (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.22)') 
                    : (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'),
                }}
              >
                <Ionicons 
                  name="close-circle-outline" 
                  size={14} 
                  color={isUnavail ? colors.text : colors.textMuted} 
                />
                <Text style={{ 
                  color: isUnavail ? colors.text : colors.textMuted, 
                  fontSize: 12, 
                  fontWeight: isUnavail ? '800' : '600', 
                  textAlign: 'center' 
                }}>
                  {t('unavailableStatus') || "Indisponível"}
                </Text>
              </View>
            </>
          );
        })()}
      </View>

      {/* Faixa: SOBRE MIM (Sem botão de editar) */}
      <SectionBanner title={t('aboutMeSection') || "Sobre mim"} />
      <View style={{ paddingHorizontal: 4 }}>
        <Text style={[styles.cleanBodyText, { color: colors.text }]}>{bio}</Text>
      </View>

      {/* Faixa: INFLUÊNCIAS MUSICAIS (Sem botão gerenciar) */}
      <SectionBanner title={(t('musicalInfluencesCount') || "Influências Musicais ({count}/5)").replace('{count}', influences.length)} />
      <View style={{ paddingHorizontal: 4 }}>
        {influences.length === 0 ? (
          <Text style={{ color: colors.textMuted, fontStyle: 'italic', fontSize: 13, marginTop: 4 }}>
            {t('noInfluencesAdded') || 'Nenhuma influência adicionada.'}
          </Text>
        ) : (
          <View style={{ gap: 6 }}>
            {influences.map((inf) => (
              <View key={inf.id} style={styles.influenceRowClean}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary }} />
                  <Text style={[styles.influenceNameClean, { color: colors.text }]}>{inf.name}</Text>
                </View>
                {renderStars(inf.stars, 14)}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Faixa: LOCALIZAÇÃO (Sem botão de editar) */}
      <SectionBanner title={t('locationLabel') || "Localização"} />
      <View style={{ paddingHorizontal: 4 }}>
        <View style={styles.cleanLinkRow}>
          <Ionicons name='location-sharp' size={20} color={colors.primary} style={{ width: 26 }} />
          <Text style={[styles.cleanLinkText, { color: (musician.city || musician.state || musician.country) ? colors.text : colors.textMuted, flex: 1 }]}>
            {[musician.city, musician.state].filter(Boolean).join(', ') 
              ? `${[musician.city, musician.state].filter(Boolean).join(', ')}${musician.country ? ` • ${musician.country}` : ''}`
              : (musician.country || '')}
          </Text>
        </View>
      </View>

      {/* Faixa: REDES SOCIAIS (Alinhadas na mesma linha, apenas as cadastradas) */}
      <SectionBanner title={t('externalLinksSection') || "Redes Sociais"} />
      <View style={{ paddingHorizontal: 4, paddingVertical: 6 }}>
        {(() => {
          const links = [];
          if (musician.instagram) {
            links.push({ id: 'instagram', name: 'Instagram', iconType: 'ion', icon: 'logo-instagram', onPress: handleOpenInstagram });
          }
          if (musician.youtube) {
            links.push({ id: 'youtube', name: 'YouTube', iconType: 'ion', icon: 'logo-youtube', onPress: handleOpenYouTube });
          }
          if (musician.twitter) {
            links.push({ id: 'twitter', name: 'X (Twitter)', iconType: 'ion', icon: 'logo-twitter', onPress: handleOpenTwitter });
          }
          if (musician.facebook) {
            links.push({ id: 'facebook', name: 'Facebook', iconType: 'ion', icon: 'logo-facebook', onPress: handleOpenFacebook });
          }
          if (musician.spotify) {
            links.push({ id: 'spotify', name: 'Spotify', iconType: 'mci', icon: 'spotify', onPress: handleOpenSpotify });
          }
          if (musician.tiktok) {
            links.push({ id: 'tiktok', name: 'TikTok', iconType: 'ion', icon: 'logo-tiktok', onPress: handleOpenTikTok });
          }

          if (links.length === 0) {
            return (
              <Text style={{ color: colors.textMuted, fontSize: 13, fontStyle: 'italic', paddingHorizontal: 6, paddingVertical: 4 }}>
                {t('noSocialLinksProvided') || 'Nenhuma rede social informada.'}
              </Text>
            );
          }

          return (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {links.map(item => (
                <Pressable
                  key={item.id}
                  onPress={item.onPress}
                  style={({ pressed }) => [{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    opacity: pressed ? 0.7 : 1
                  }]}
                  hitSlop={8}
                  accessibilityLabel={item.name}
                >
                  {item.iconType === 'mci' ? (
                    <MaterialCommunityIcons name={item.icon} size={22} color={colors.primary} />
                  ) : (
                    <Ionicons name={item.icon} size={22} color={colors.primary} />
                  )}
                </Pressable>
              ))}
            </View>
          );
        })()}
      </View>
    </View>
  );

  // ── 2. HABILIDADES TAB (IDÊNTICO AO PROFILE SCREEN, SEM BOTÕES DE EDITAR/EXCLUIR) ──
  const renderSkillsTab = () => (
    <View style={styles.tabContent}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>{t('skillsTab') || 'Habilidades'}</Text>
      </View>

      <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 12, paddingHorizontal: 2 }}>
        {t('skillsSectionSubtitle') || 'Instrumentos e habilidades técnicas do músico.'}
      </Text>

      {skills.length === 0 ? (
        <View style={[styles.fullWidthCard, { backgroundColor: colors.cardBackground, borderTopColor: colors.border, borderBottomColor: colors.border, alignItems: 'center', paddingVertical: 24 }]}>
          <Text style={{ color: colors.textMuted, fontSize: 13, fontStyle: 'italic' }}>
            {t('noSkillsRegistered') || 'Nenhuma habilidade cadastrada.'}
          </Text>
        </View>
      ) : (
        skills.map((skill) => {
          return (
            <View 
              key={skill.id} 
              style={[
                styles.fullWidthCard, 
                styles.skillRow, 
                { 
                  backgroundColor: colors.cardBackground, 
                  borderTopColor: colors.border,
                  borderBottomColor: colors.border,
                  borderLeftWidth: 0,
                  borderRightWidth: 0,
                }
              ]}
            >
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <Text style={[styles.skillName, { color: colors.text, marginBottom: 0 }]}>{skill.instrument}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>{renderStars(skill.stars, 14)}</View>
              </View>
            </View>
          );
        })
      )}
    </View>
  );

  // ── 3. INSTRUMENTOS / EQUIPAMENTOS TAB (IDÊNTICO AO PROFILE SCREEN, SEM BOTÕES DE EDITAR/ARRASTAR) ──
  const renderInstrumentsTab = () => (
    <View style={styles.tabContent}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ backgroundColor: colors.primary + '18', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800' }}>{gear.length}</Text>
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>{t('myGearTitle') || 'Meus Equipamentos'}</Text>
        </View>
      </View>

      {gear.length === 0 ? (
        <View style={[styles.fullWidthCard, { backgroundColor: colors.cardBackground, borderTopColor: colors.border, borderBottomColor: colors.border, alignItems: 'center', paddingVertical: 28 }]}>
          <MaterialCommunityIcons name="guitar-acoustic" size={48} color={colors.textMuted} />
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: 'bold', marginTop: 10 }}>{t('noGearRegistered') || 'Nenhum equipamento cadastrado'}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 4, paddingHorizontal: 20 }}>
            {t('gearSubtitle') || 'Equipamentos regulados para apresentações ao vivo e ensaios.'}
          </Text>
        </View>
      ) : (
        gear.map((item) => {
          return (
            <View 
              key={item.id} 
              style={[
                styles.gearCardFullWidth, 
                { 
                  backgroundColor: colors.cardBackground, 
                  borderTopColor: colors.border,
                  borderBottomColor: colors.border,
                  borderLeftWidth: 0,
                  borderRightWidth: 0,
                }
              ]}
            >
              {/* LINHA 1 (ACIMA): Badge Categoria + Marca/Modelo */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8, flexWrap: 'wrap', gap: 8 }}>
                  <View style={{ backgroundColor: colors.primary + '18', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: colors.primary + '30' }}>
                    <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>{item.category}</Text>
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.text }} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>
              </View>

              {/* LINHA 2 (ABAIXO): Observações adicionais */}
              {item.details ? (
                <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                  <Text style={{ color: colors.textMuted, fontSize: 12.5, lineHeight: 18 }}>
                    {item.details}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })
      )}
    </View>
  );

  // ── 4. PROJETOS TAB (IDÊNTICO AO PROFILE SCREEN) ──
  const renderProjectsTab = () => (
    <View style={styles.tabContent}>
      <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 14 }]}>{t('bandsAndProjectsTitle') || 'Bandas e Projetos'}</Text>
      {rawProjects.length === 0 ? (
        <View style={[styles.fullWidthCard, { backgroundColor: colors.cardBackground, borderTopColor: colors.border, borderBottomColor: colors.border, alignItems: 'center', paddingVertical: 24 }]}>
          <Text style={{ color: colors.textMuted, fontSize: 13, fontStyle: 'italic' }}>
            {t('noProjectsRegistered') || 'Nenhum projeto cadastrado.'}
          </Text>
        </View>
      ) : (
        rawProjects.map(proj => {
          const projTags = (() => {
            if (!proj.genres) return [];
            try {
              const parsed = typeof proj.genres === 'string' && proj.genres.startsWith('[')
                ? JSON.parse(proj.genres)
                : String(proj.genres).split(',').map(s => s.trim()).filter(Boolean);
              return parsed.slice(0, 4);
            } catch (e) {
              return String(proj.genres).split(',').map(s => s.trim()).filter(Boolean).slice(0, 4);
            }
          })();

          return (
            <Pressable 
              key={proj.id} 
              onPress={() => onOpenBandProfile && onOpenBandProfile(proj)}
              style={({ pressed }) => [
                styles.fullWidthCard, 
                { 
                  backgroundColor: colors.cardBackground, 
                  borderTopColor: colors.border,
                  borderBottomColor: colors.border,
                  paddingVertical: 12,
                  opacity: pressed ? 0.85 : 1,
                }
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {/* Logo da banda (somente a logo do lado esquerdo) */}
                <View style={{
                  width: 82,
                  height: 82,
                  borderRadius: 41,
                  borderWidth: 2,
                  borderColor: colors.primary,
                  backgroundColor: colors.primary + '18',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 14,
                  overflow: 'hidden',
                }}>
                  {proj.imageUri || proj.logo ? (
                    <Image source={{ uri: proj.imageUri || proj.logo }} style={{ width: 82, height: 82, borderRadius: 41 }} />
                  ) : (
                    <Text style={{ fontSize: 28, fontWeight: '900', color: colors.primary }}>
                      {getBandInitials(proj.name)}
                    </Text>
                  )}
                </View>

                {/* Informações da banda do lado direito da logo (3 linhas) */}
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  {/* Linha 1: Nome da banda (fonte ampliada) + Chevron indicativo */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={[styles.projectName, { color: colors.text, fontSize: 18.5, fontWeight: '800', flex: 1 }]} numberOfLines={1}>
                      {proj.name}
                    </Text>
                    <Ionicons name="chevron-forward" size={17} color={colors.textMuted} style={{ marginLeft: 6 }} />
                  </View>

                  {/* Linha 2: Função/Instrumentos e Localização */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                    <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }} numberOfLines={1}>
                      {getProjectInstrument(proj.role, skills)}
                    </Text>
                    {(proj.city || proj.state || proj.country) && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                        <Text style={{ color: colors.textMuted, fontSize: 11, opacity: 0.5 }}>•</Text>
                        <Ionicons name="location-outline" size={11} color={colors.textMuted} />
                        <Text style={{ fontSize: 11, fontWeight: '500', color: colors.textMuted }} numberOfLines={1}>
                          {[proj.city, proj.state].filter(Boolean).join(', ')
                            ? `${[proj.city, proj.state].filter(Boolean).join(', ')}${proj.country ? ` • ${proj.country}` : ''}`
                            : proj.country}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Linha 3: Tags de Estilo da Banda (até 4) do lado direito da logo */}
                  {projTags.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                      {projTags.map((tag, idx) => (
                        <View key={idx} style={{ backgroundColor: colors.primary + '18', borderColor: colors.primary + '30', borderWidth: 1, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5 }}>
                          <Text style={{ fontSize: 9, fontWeight: '800', color: colors.primary }}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* Rodapé: Desde... Membro/Proprietário */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: 10,
                paddingTop: 8,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                gap: 6
              }}>
                <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600' }}>
                  {t('since') || 'Desde'} {proj.since}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, opacity: 0.4 }}>•</Text>
                <Ionicons name="shield-checkmark-outline" size={13} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600' }}>
                  {getMemberPositionLabel(proj.memberType, proj.role)}
                </Text>
              </View>
            </Pressable>
          );
        })
      )}
    </View>
  );

  // ── 5. AGENDA TAB (IDÊNTICO AO PROFILE SCREEN) ──
  const renderAgendaTab = () => (
    <View style={styles.tabContent}>
      <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 14 }]}>{t('upcomingShowsTitle') || 'Próximos Shows'}</Text>
      {agenda.length === 0 ? (
        <View style={[styles.fullWidthCard, { backgroundColor: colors.cardBackground, borderTopColor: colors.border, borderBottomColor: colors.border, alignItems: 'center', paddingVertical: 20 }]}>
          <Text style={{ color: colors.textMuted, fontSize: 13, fontStyle: 'italic' }}>
            {t('noEventsScheduledShort') || 'Nenhum evento agendado.'}
          </Text>
        </View>
      ) : (
        agenda.map(event => {
          const badge = (() => {
            const raw = String(event.date || '').trim();
            if (!raw) return { day: '15', month: 'OUT' };
            if (raw.includes('-')) {
              const p = raw.split('-');
              if (p.length >= 3) {
                const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
                const mIdx = parseInt(p[1], 10) - 1;
                return { day: String(parseInt(p[2], 10)).padStart(2, '0'), month: months[mIdx] || 'SHOW' };
              }
            }
            if (raw.includes('/')) {
              const p = raw.split('/');
              if (p.length === 3) {
                const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
                const mIdx = parseInt(p[1], 10) - 1;
                return { day: String(parseInt(p[0], 10)).padStart(2, '0'), month: months[mIdx] || 'SHOW' };
              }
            }
            const parts = raw.split(' ');
            return { day: parts[1] || '15', month: (parts[2] || 'OUT').toUpperCase() };
          })();

          return (
            <View 
              key={event.id} 
              style={[
                styles.fullWidthCard, 
                { 
                  backgroundColor: colors.cardBackground, 
                  borderTopColor: colors.border, 
                  borderBottomColor: colors.border,
                  padding: 0, 
                  overflow: 'hidden', 
                  flexDirection: 'row',
                  marginBottom: 6,
                }
              ]}
            >
              <View style={{ width: 52, backgroundColor: colors.primary + '15', justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: colors.border, paddingVertical: 8 }}>
                <Text style={{ color: colors.primary, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' }}>{badge.month}</Text>
                <Text style={{ color: colors.primary, fontSize: 18, fontWeight: '900', lineHeight: 20 }}>{badge.day}</Text>
              </View>
              <View style={{ flex: 1, paddingVertical: 7, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 14, fontWeight: 'bold' }} numberOfLines={1}>{event.local || event.venue || event.title || 'Local a definir'}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <Ionicons name="mic" size={12} color={colors.textMuted} />
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginLeft: 4 }}>{event.band || 'Banda'}</Text>
                  </View>
                </View>
                {event.logo ? (
                  <Image source={{ uri: event.logo }} style={{ width: 34, height: 34, borderRadius: 17, marginLeft: 10 }} />
                ) : null}
              </View>
            </View>
          );
        })
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={colors.cardBackground}
        />

        {/* ── HEADER (ESTILO IDÊNTICO AO PROFILE SCREEN, COM VOLTAR, CONVIDAR E COMPARTILHAR) ── */}
        <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
          {/* Barra Superior: Voltar + Convidar + Compartilhar */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable 
              onPress={onClose}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              hitSlop={8}
            >
              <Ionicons name="arrow-back" size={20} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '700' }}>{t('backBtn') || 'Voltar'}</Text>
            </Pressable>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {/* Botão Convidar para Banda */}
              <Pressable
                onPress={handleTriggerInvite}
                style={({ pressed }) => [
                  styles.inviteHeaderBtn,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }
                ]}
                hitSlop={8}
              >
                <Ionicons name="person-add" size={13} color="#ffffff" />
                <Text style={styles.inviteHeaderBtnText}>{t('inviteToBandHeader') || 'Convidar para Banda'}</Text>
              </Pressable>

              {/* Botão Compartilhar */}
              <Pressable
                onPress={handleShareProfile}
                style={styles.shareHeaderBtn}
                hitSlop={8}
              >
                <Ionicons name="share-social-outline" size={20} color={colors.text} />
              </Pressable>
            </View>
          </View>

          {/* Topo do Perfil: Avatar (86x86), Nome, @username e Localização */}
          <View style={styles.headerTop}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>{currentDisplayName.charAt(0).toUpperCase()}</Text>
              </View>
            )}

            <View style={[styles.userInfo, { flex: 1, justifyContent: 'center' }]}>
              {/* Linha 1: Nome */}
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {currentDisplayName}
              </Text>

              {/* Linha 2: username + verificado */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <Text style={[styles.uniqueId, { color: colors.textMuted }]}>
                  @{cleanUsername}
                </Text>

                {musician.isEmailConfirmed ? (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#10B98120',
                    borderColor: '#10B98160',
                    borderWidth: 1,
                    paddingHorizontal: 6,
                    paddingVertical: 1.5,
                    borderRadius: 10,
                    gap: 3
                  }}>
                    <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#10B981' }}>
                      {t('emailVerifiedBadge') || 'Verificado'}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Linha 3: Idade + Cidade */}
              {(musician.age != null || (musician.city || musician.state || musician.country)) ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  {musician.age != null && (
                    <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '600' }}>
                      {`${musician.age} ${t('yearsOld') || 'anos'}`}
                    </Text>
                  )}
                  {musician.age != null && (musician.city || musician.state || musician.country) && (
                    <Text style={{ color: colors.textMuted, opacity: 0.4, fontSize: 12 }}>•</Text>
                  )}
                  {(musician.city || musician.state || musician.country) ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Ionicons name="location-outline" size={13} color={colors.primary} />
                      <Text style={{ fontSize: 13, color: colors.textMuted }} numberOfLines={1}>
                        {[musician.city, musician.state].filter(Boolean).join(', ') || musician.country || ''}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          </View>

        {/* ── ABAS DE OPÇÕES IDÊNTICAS AO PROFILE SCREEN COM OS MESMOS ÍCONES ── */}
          <View style={styles.tabBar}>
            {[
              { id: 'bio', type: 'ion', icon: 'person', iconOutline: 'person-outline', label: t('bioTab') || 'Bio' },
              { id: 'skills', type: 'ion', icon: 'star', iconOutline: 'star-outline', label: t('skillsTab') || 'Habilidades' },
              { id: 'instruments', type: 'mci', icon: 'guitar-acoustic', label: t('instrumentsTab') || 'Instrumentos' },
              { id: 'projects', type: 'ion', icon: 'people', iconOutline: 'people-outline', label: t('projectsTab') || 'Projetos' },
              { id: 'agenda', type: 'ion', icon: 'calendar', iconOutline: 'calendar-outline', label: t('agendaTab') || 'Agenda' }
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <Pressable 
                  key={tab.id} 
                  style={[styles.tabItem, isActive && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 }]} 
                  onPress={() => setActiveTab(tab.id)}
                  accessibilityLabel={tab.label}
                >
                  {tab.type === 'mci' ? (
                    <MaterialCommunityIcons 
                      name={tab.icon} 
                      size={26} 
                      color={isActive ? colors.primary : colors.textMuted} 
                    />
                  ) : (
                    <Ionicons 
                      name={isActive ? tab.icon : tab.iconOutline} 
                      size={24} 
                      color={isActive ? colors.primary : colors.textMuted} 
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── CONTEÚDO DAS ABAS (COM AS MESMAS CLASSES DE ESTILO) ── */}
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'bio' && renderBioTab()}
          {activeTab === 'skills' && renderSkillsTab()}
          {activeTab === 'instruments' && renderInstrumentsTab()}
          {activeTab === 'projects' && renderProjectsTab()}
          {activeTab === 'agenda' && renderAgendaTab()}
        </ScrollView>

        {/* ── MODAL SELETOR DE BANDA PARA CONVIDAR O MÚSICO ── */}
        <Modal
          visible={showInviteModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowInviteModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.inviteModalBackdrop}
          >
            <View style={[styles.inviteModalCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <View style={styles.inviteModalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="mail-outline" size={20} color={colors.primary} />
                  <Text style={[styles.inviteModalTitle, { color: colors.text }]}>{t('inviteMusicianTitle') || 'Convidar Músico'}</Text>
                </View>
                <Pressable onPress={() => setShowInviteModal(false)} hitSlop={8}>
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </Pressable>
              </View>

              <Text style={[styles.inviteModalSubtitle, { color: colors.textMuted }]}>
                Selecione a banda para a qual deseja convidar <Text style={{ fontWeight: '800', color: colors.text }}>{currentDisplayName}</Text> (@{cleanUsername}):
              </Text>

              <ScrollView style={{ maxHeight: 140, marginVertical: 8 }}>
                {myBands.map(b => {
                  const isSelected = selectedBandId === b.id;
                  return (
                    <Pressable
                      key={b.id}
                      style={[
                        styles.bandSelectRow,
                        {
                          backgroundColor: isSelected ? colors.primary + '18' : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'),
                          borderColor: isSelected ? colors.primary : colors.border
                        }
                      ]}
                      onPress={() => setSelectedBandId(b.id)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <Ionicons
                          name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                          size={18}
                          color={isSelected ? colors.primary : colors.textMuted}
                        />
                        <Text style={[styles.bandSelectName, { color: colors.text, fontWeight: isSelected ? '800' : '600' }]}>
                          {b.name}
                        </Text>
                      </View>
                      {b.genre ? (
                        <Text style={[styles.bandSelectGenre, { color: colors.textMuted }]}>{b.genre}</Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* CAMPO DE MENSAGEM SANITIZADO COM MAXLENGTH */}
              <View style={{ marginTop: 2, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted }}>
                    {t('inviteMessageOptionalLower') || 'Mensagem do convite (opcional)'}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: inviteMessage.length >= 480 ? '#ef4444' : colors.textMuted }}>
                    {inviteMessage.length}/500
                  </Text>
                </View>
                <TextInput
                  maxLength={500}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  value={inviteMessage}
                  onChangeText={(text) => {
                    const sanitized = text.slice(0, 500).replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, '');
                    setInviteMessage(sanitized);
                  }}
                  placeholder={`Olá ${currentDisplayName}! Convidamos você para integrar nossa banda.`}
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.inviteMessageInput,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                      borderColor: colors.border,
                      color: colors.text,
                    }
                  ]}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <Pressable
                  style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                  onPress={() => setShowInviteModal(false)}
                >
                  <Text style={[styles.modalCancelBtnText, { color: colors.text }]}>{t('cancelBtn') || 'Cancelar'}</Text>
                </Pressable>

                <Pressable
                  style={[styles.modalConfirmBtn, { backgroundColor: colors.primary, opacity: isSendingInvite ? 0.6 : 1 }]}
                  onPress={handleConfirmInvite}
                  disabled={isSendingInvite}
                >
                  <Ionicons name="paper-plane" size={16} color="#ffffff" />
                  <Text style={styles.modalConfirmBtnText}>
                    {isSendingInvite ? (t('sendingInviteStatus') || 'Enviando...') : (t('sendInviteBtn') || 'Enviar Convite')}
                  </Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </Modal>
  );
}

// ── ESTILOS IDÊNTICOS AO PROFILESCREEN.JS ──
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 20) + 10 : 44 },
  headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16 },
  
  // Avatar aumentado e marcante – 86x86
  avatar: { width: 86, height: 86, borderRadius: 43, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 38, fontWeight: 'bold', color: '#fff' },
  
  userInfo: { flex: 1, marginLeft: 16 },
  name: { fontSize: 21, fontWeight: 'bold' },
  uniqueId: { fontSize: 14, marginTop: 3 },

  inviteHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 5
  },
  inviteHeaderBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800'
  },
  shareHeaderBtn: {
    padding: 6,
  },
  
  // Abas de opções com ícones – idêntico ao ProfileScreen
  tabBar: { flexDirection: 'row', paddingHorizontal: 8 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  
  scrollContent: { padding: 16, paddingBottom: 40 },
  tabContent: { flex: 1 },
  
  // Clean Bio Tab Styles (com faixas simétricas com o cabeçalho)
  tabContentClean: { flex: 1 },
  sectionBannerContainer: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6
  },
  cleanBodyText: { fontSize: 14, lineHeight: 22 },
  cleanLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  cleanLinkText: { fontSize: 14, flex: 1 },
  influenceRowClean: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  influenceNameClean: { fontSize: 14, fontWeight: '600' },

  // General Card Styles (for Skills, Projects, Agenda)
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, marginLeft: 2 },
  card: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 12 },
  skillRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skillName: { fontSize: 16, fontWeight: '600' },
  skillSelectCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primarySkillTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  primarySkillTagText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  projectName: { fontSize: 18, fontWeight: 'bold' },

  // Full-width Card (Symmetric with header - used for Skills, Gear, Projects, Agenda)
  fullWidthCard: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderRadius: 0,
    marginBottom: 8,
  },
  gearCardFullWidth: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderRadius: 0,
    marginBottom: 8,
  },

  // Modal Seletor de Banda para Convite
  inviteModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  inviteModalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  inviteModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  inviteModalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  inviteModalSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  bandSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  bandSelectName: {
    fontSize: 14,
  },
  bandSelectGenre: {
    fontSize: 11.5,
  },
  inviteMessageInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    minHeight: 70,
    maxHeight: 110,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalConfirmBtn: {
    flex: 1.5,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
