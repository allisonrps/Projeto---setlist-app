import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  RefreshControl,
  StatusBar as RNStatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';
import { bandService } from '../services/bandService';
import { musiciansService } from '../services/musiciansService';
import MusicianProfileModal from './MusicianProfileModal';
import BandProfileModal from './BandProfileModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

const BRAZIL_STATES = [
  { uf: 'AC', name: 'Acre' },
  { uf: 'AL', name: 'Alagoas' },
  { uf: 'AP', name: 'Amapá' },
  { uf: 'AM', name: 'Amazonas' },
  { uf: 'BA', name: 'Bahia' },
  { uf: 'CE', name: 'Ceará' },
  { uf: 'DF', name: 'Distrito Federal' },
  { uf: 'ES', name: 'Espírito Santo' },
  { uf: 'GO', name: 'Goiás' },
  { uf: 'MA', name: 'Maranhão' },
  { uf: 'MT', name: 'Mato Grosso' },
  { uf: 'MS', name: 'Mato Grosso do Sul' },
  { uf: 'MG', name: 'Minas Gerais' },
  { uf: 'PA', name: 'Pará' },
  { uf: 'PB', name: 'Paraíba' },
  { uf: 'PR', name: 'Paraná' },
  { uf: 'PE', name: 'Pernambuco' },
  { uf: 'PI', name: 'Piauí' },
  { uf: 'RJ', name: 'Rio de Janeiro' },
  { uf: 'RN', name: 'Rio Grande do Norte' },
  { uf: 'RS', name: 'Rio Grande do Sul' },
  { uf: 'RO', name: 'Rondônia' },
  { uf: 'RR', name: 'Roraima' },
  { uf: 'SC', name: 'Santa Catarina' },
  { uf: 'SP', name: 'São Paulo' },
  { uf: 'SE', name: 'Sergipe' },
  { uf: 'TO', name: 'Tocantins' }
];

const COUNTRIES = [
  'Brasil', 'Portugal', 'Estados Unidos', 'Argentina', 'Reino Unido',
  'Espanha', 'Alemanha', 'Itália', 'França', 'Canadá',
  'Uruguai', 'Chile', 'México', 'Colômbia', 'Outro'
];

const PROPOSAL_OPTIONS = [
  'Cover', 'Autoral', 'Hobbie', 'Profissional', 'Casual'
];

const getBandInitials = (name) => {
  if (!name) return 'BD';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const DEFAULT_PROJECTS = [];
const NETWORK_MOCK_BANDS = [];

const calculateAge = (birthDateOrAge) => {
  if (!birthDateOrAge) return null;
  if (typeof birthDateOrAge === 'number') return birthDateOrAge;
  const num = parseInt(birthDateOrAge, 10);
  if (!isNaN(num) && String(num) === String(birthDateOrAge).trim() && num > 0 && num < 120) {
    return num;
  }
  const date = new Date(birthDateOrAge);
  if (isNaN(date.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const m = today.getMonth() - date.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
    age--;
  }
  return age > 0 && age < 120 ? age : null;
};

export default function NetworkScreen({ onOpenProfile, onLogout }) {
  const { colors } = useTheme();
  const isDark = colors.isDark;
  const { t } = useLanguage();
  const formatRelativeTime = (timeStr) => {
    if (!timeStr) return '';
    const s = String(timeStr).trim();

    if (/^(agora|just now|ahora)$/i.test(s)) {
      return t('timeJustNow') || 'Agora';
    }
    if (/^(ontem|yesterday|ayer)$/i.test(s)) {
      return t('timeYesterday') || 'Ontem';
    }

    // Days regex (supports: "Há 4 dias", "Há 1 dia", "4 dias", "4 days ago", "4 days", "hace 4 días", etc.)
    const daysMatch = s.match(/(?:h[áa]|hace)?\s*(\d+)\s*(?:dias?|days?|d[íi]as?)(?:\s*atr[áa]s|\s*ago)?/i);
    if (daysMatch) {
      const count = daysMatch[1];
      if (count === '1') {
        return (t('timeDayAgo') || 'Há {count} dia').replace('{count}', '1');
      }
      return (t('timeDaysAgo') || 'Há {count} dias').replace('{count}', count);
    }

    // Weeks regex (supports: "Há 1 semana", "Há 2 semanas", "1 week ago", "2 weeks ago", etc.)
    const weekMatch = s.match(/(?:h[áa]|hace)?\s*(\d+)\s*(?:semanas?|weeks?)(?:\s*atr[áa]s|\s*ago)?/i);
    if (weekMatch) {
      const count = weekMatch[1];
      if (count === '1') {
        return t('timeOneWeekAgo') || 'Há 1 semana';
      }
      return (t('timeWeeksAgo') || 'Há {count} semanas').replace('{count}', count);
    }

    // Hours regex
    const hoursMatch = s.match(/(?:h[áa]|hace)?\s*(\d+)\s*(?:horas?|hours?)(?:\s*atr[áa]s|\s*ago)?/i);
    if (hoursMatch) {
      const count = hoursMatch[1];
      return (t('timeHoursAgo') || 'Há {count} horas').replace('{count}', count);
    }

    // Minutes regex
    const minsMatch = s.match(/(?:h[áa]|hace)?\s*(\d+)\s*(?:minutos?|minutes?|mins?)(?:\s*atr[áa]s|\s*ago)?/i);
    if (minsMatch) {
      const count = minsMatch[1];
      return (t('timeMinutesAgo') || 'Há {count} minutos').replace('{count}', count);
    }

    // Date timestamp or ISO string
    const parsedDate = new Date(s);
    if (!isNaN(parsedDate.getTime())) {
      const diffMs = Date.now() - parsedDate.getTime();
      if (diffMs < 0 || diffMs < 60000) return t('timeJustNow') || 'Agora';
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 60) return (t('timeMinutesAgo') || 'Há {count} minutos').replace('{count}', diffMins);
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return (t('timeHoursAgo') || 'Há {count} horas').replace('{count}', diffHours);
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return (t('timeDayAgo') || 'Há {count} dia').replace('{count}', '1');
      if (diffDays < 7) return (t('timeDaysAgo') || 'Há {count} dias').replace('{count}', diffDays);
      const diffWeeks = Math.floor(diffDays / 7);
      if (diffWeeks === 1) return t('timeOneWeekAgo') || 'Há 1 semana';
      return (t('timeWeeksAgo') || 'Há {count} semanas').replace('{count}', diffWeeks);
    }

    return s;
  };

  const getProposalLabel = (opt) => {
    if (!opt) return '';
    const norm = String(opt).toLowerCase().trim();
    if (norm === 'cover') return t('proposalCover') || 'Cover';
    if (norm === 'autoral' || norm === 'original') return t('proposalOriginal') || 'Autoral';
    if (norm === 'hobbie' || norm === 'hobby') return t('proposalHobby') || 'Hobbie';
    if (norm === 'profissional' || norm === 'professional') return t('proposalProfessional') || 'Profissional';
    if (norm === 'casual' || norm === 'ver no que dá' || norm === 'ver no que da' || norm === 'see what happens' || norm === 'ver qué pasa') return t('proposalCasual') || t('proposalSeeWhatHappens') || 'Casual';
    return opt;
  };

  // Current logged in user info
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfileImage, setUserProfileImage] = useState(null);

  // Sub-tabs: 'musicians' | 'projects' | 'bands' | 'classifieds'
  const [subTab, setSubTab] = useState('musicians');
  const [searchQuery, setSearchQuery] = useState('');

  // Location filter state (Cidade, UF, País)
  const [filterCity, setFilterCity] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const hasInitializedLocation = useRef(false);

  // Pagination state
  const [projectsPage, setProjectsPage] = useState(1);
  const [musiciansPage, setMusiciansPage] = useState(1);
  const [bandsPage, setBandsPage] = useState(1);
  const [classifiedsPage, setClassifiedsPage] = useState(1);
  const mainScrollRef = useRef(null);
  const ITEMS_PER_PAGE = 8;

  // Cloud Network Data
  const [projects, setProjects] = useState([]);
  const [userBands, setUserBands] = useState([]);
  const [cloudMusicians, setCloudMusicians] = useState([]);
  const [publicBands, setPublicBands] = useState([]);
  const [classifieds, setClassifieds] = useState([]);
  const [isLoadingClassifieds, setIsLoadingClassifieds] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadUserData(),
        loadProjects(),
        loadMusicians(),
        loadPublicBands(),
        loadUserBands(),
        loadClassifieds()
      ]);
    } catch (e) {}
    setRefreshing(false);
  };

  // Modals & Scanner state
  const [selectedMusicianProfile, setSelectedMusicianProfile] = useState(null);
  const [showMusicianProfileModal, setShowMusicianProfileModal] = useState(false);
  const [selectedBandProfile, setSelectedBandProfile] = useState(null);
  const [showBandProfileModal, setShowBandProfileModal] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [selectedScanProject, setSelectedScanProject] = useState(null);
  const [isScanningCandidates, setIsScanningCandidates] = useState(false);
  const [showApplicantsModal, setShowApplicantsModal] = useState(false);
  const [selectedApplicantsProject, setSelectedApplicantsProject] = useState(null);
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [selectedInterestProject, setSelectedInterestProject] = useState(null);
  const [interestInstrument, setInterestInstrument] = useState('');
  const [interestMessage, setInterestMessage] = useState('');

  // Candidate invite modal
  const [candidateInviteTarget, setCandidateInviteTarget] = useState(null);
  const [candidateInviteMessage, setCandidateInviteMessage] = useState('');
  const [isSendingCandidateInvite, setIsSendingCandidateInvite] = useState(false);

  // Scanner animation values
  const scanAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // New Project Form State
  const [linkOption, setLinkOption] = useState('new'); // 'new' | 'existing'
  const [selectedExistingBandId, setSelectedExistingBandId] = useState(null);
  const [formBandName, setFormBandName] = useState('');
  const [formBandImage, setFormBandImage] = useState('');
  const [formSoughtRole, setFormSoughtRole] = useState('');
  const [formOptions, setFormOptions] = useState(['Cover', 'Profissional']);
  const [formGenres, setFormGenres] = useState([]);
  const [formGenreInput, setFormGenreInput] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formState, setFormState] = useState('');
  const [formCountry, setFormCountry] = useState('');
  const [customFormCountryInput, setCustomFormCountryInput] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAddToBands, setFormAddToBands] = useState(true);

  // Location selector modals in form
  const [showFormCountryModal, setShowFormCountryModal] = useState(false);
  const [showFormStateModal, setShowFormStateModal] = useState(false);

  // Load cloud data on mount
  useEffect(() => {
    loadUserData();
    loadProjects();
    loadMusicians();
    loadPublicBands();
    loadUserBands();
    loadClassifieds();
  }, []);

  // Reset pagination when search, location filters, or tab changes
  useEffect(() => {
    setProjectsPage(1);
    setMusiciansPage(1);
    setBandsPage(1);
    setClassifiedsPage(1);
  }, [searchQuery, filterCity, filterState, filterCountry, subTab]);

  // Candidate Scanner: looping magnifying glass animation
  useEffect(() => {
    if (isScanningCandidates) {
      scanAnim.setValue(0);
      pulseAnim.setValue(1);

      const moveLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: 1,
            duration: 500,
            easing: Easing?.inOut ? Easing.inOut(Easing.ease) : undefined,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnim, {
            toValue: -1,
            duration: 600,
            easing: Easing?.inOut ? Easing.inOut(Easing.ease) : undefined,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 350,
            easing: Easing?.inOut ? Easing.inOut(Easing.ease) : undefined,
            useNativeDriver: true,
          }),
        ])
      );

      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.18,
            duration: 450,
            easing: Easing?.ease || undefined,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.95,
            duration: 450,
            easing: Easing?.ease || undefined,
            useNativeDriver: true,
          }),
        ])
      );

      moveLoop.start();
      pulseLoop.start();

      const timer = setTimeout(() => {
        moveLoop.stop();
        pulseLoop.stop();
        setIsScanningCandidates(false);
      }, 1600);

      return () => {
        moveLoop.stop();
        pulseLoop.stop();
        clearTimeout(timer);
      };
    }
  }, [isScanningCandidates]);

  const scanTranslateX = scanAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-24, 0, 24],
  });
  const scanTranslateY = scanAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [6, -6, 6],
  });
  const scanRotate = scanAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-20deg', '0deg', '20deg'],
  });

  const loadUserData = async () => {
    try {
      const savedImage = await AsyncStorage.getItem('profileImage');
      if (savedImage) setUserProfileImage(savedImage);

      const savedDisplayName = await AsyncStorage.getItem('user_display_name');

      let parsedUser = null;
      const cachedProfile = await AsyncStorage.getItem('user_profile_cache');
      if (cachedProfile) {
        try {
          parsedUser = JSON.parse(cachedProfile);
        } catch (e) {}
      }

      if (!parsedUser) {
        const userInfo = await AsyncStorage.getItem('user_info');
        if (userInfo) {
          try {
            parsedUser = JSON.parse(userInfo);
          } catch (e) {}
        }
      }

      if (parsedUser) {
        // Normalização garantida de habilidades / instrumentos
        let resolvedSkills = parsedUser.skills;
        if (!Array.isArray(resolvedSkills)) {
          const rawInst = parsedUser.instruments || parsedUser.skillsJson;
          if (rawInst) {
            try {
              resolvedSkills = typeof rawInst === 'string' ? JSON.parse(rawInst) : rawInst;
            } catch (e) {}
          }
        }

        // Normalização garantida de influências
        let resolvedInfluences = parsedUser.influences;
        if (!Array.isArray(resolvedInfluences) && typeof resolvedInfluences === 'string' && resolvedInfluences.trim()) {
          try {
            const p = JSON.parse(resolvedInfluences);
            if (Array.isArray(p)) resolvedInfluences = p;
          } catch (e) {
            resolvedInfluences = resolvedInfluences.split(',').map(s => s.trim()).filter(Boolean);
          }
        }

        const normalizedUser = {
          ...parsedUser,
          displayName: savedDisplayName || parsedUser.displayName || parsedUser.name || parsedUser.username || 'Músico',
          imageUri: savedImage || parsedUser.imageUri || null,
          skills: Array.isArray(resolvedSkills) ? resolvedSkills : (parsedUser.skills || []),
          influences: Array.isArray(resolvedInfluences) ? resolvedInfluences : (parsedUser.influences || [])
        };

        setCurrentUser(normalizedUser);
        setFormCity(normalizedUser.city || '');
        setFormState(normalizedUser.state || '');
        setFormCountry(normalizedUser.country || '');
        if (!hasInitializedLocation.current && (normalizedUser.city || normalizedUser.state || normalizedUser.country)) {
          hasInitializedLocation.current = true;
          setFilterCity(normalizedUser.city || '');
          setFilterState(normalizedUser.state || '');
          setFilterCountry(normalizedUser.country || 'Brasil');
        }

        const isCompleted = await AsyncStorage.getItem('user_profile_completed');
        if (isCompleted !== 'true') {
          const hasInfo = (normalizedUser.city && normalizedUser.city.trim()) || (normalizedUser.skills && normalizedUser.skills.length > 0) || normalizedUser.instruments;
          if (!hasInfo) {
            if (onOpenProfile) onOpenProfile();
            return;
          } else {
            await AsyncStorage.setItem('user_profile_completed', 'true');
          }
        }
      }
    } catch (e) {
      console.log('Error loading user data in NetworkScreen:', e);
    }
  };

  const loadUserBands = async () => {
    try {
      const bands = await bandService.getAll();
      setUserBands(bands || []);
    } catch (e) {
      console.log('Error loading user bands:', e);
    }
  };

  const loadProjects = async () => {
    try {
      const cloudList = await api.getAnnouncements();
      if (Array.isArray(cloudList)) {
        const cloudFormatted = cloudList.map(ca => {
          const projectType = ca.projectType || 'Cover';
          const interestLevel = ca.interestLevel || 'Casual';
          const stylesList = ca.styles ? ca.styles.split(',').map(s => s.trim()).filter(Boolean) : ['Geral'];
          const applicantsList = Array.isArray(ca.applicants) ? ca.applicants.map(ap => ({
            id: ap.id,
            name: ap.applicantName || 'Músico Interessado',
            role: ap.instrument || 'Músico',
            notes: ap.message || '',
            phone: ap.contactInfo || '',
            avatar: ap.pictureUrl || '',
            status: ap.status || 'pending',
            createdAt: ap.createdAt ? new Date(ap.createdAt).toLocaleDateString() : 'Recente'
          })) : [];

          return {
            id: 'cloud-' + ca.id,
            cloudId: ca.id,
            creatorId: ca.creatorId || ca.creator?.id || null,
            creatorName: ca.creator?.displayName || ca.creator?.username || 'Músico',
            creatorUsername: ca.creator?.username || '',
            bandName: ca.title,
            imageUri: ca.imageUrl || '',
            soughtRole: ca.instrument || 'Músico',
            options: [projectType, interestLevel].filter(Boolean),
            projectType: projectType,
            interestLevel: interestLevel,
            isCover: projectType.toLowerCase().includes('cover') ? 1 : 0,
            isAutoral: projectType.toLowerCase().includes('autoral') ? 1 : 0,
            genres: stylesList,
            city: ca.city || '',
            state: ca.state || '',
            country: 'Brasil',
            description: ca.description || '',
            createdAt: ca.createdAt ? new Date(ca.createdAt).toLocaleDateString() : 'Recente',
            applicants: applicantsList
          };
        });
        setProjects(cloudFormatted);
        AsyncStorage.setItem('network_projects', JSON.stringify(cloudFormatted)).catch(() => {});
      } else {
        setProjects([]);
      }
    } catch (e) {
      console.log('Error loading cloud announcements:', e);
      try {
        const stored = await AsyncStorage.getItem('network_projects');
        if (stored) setProjects(JSON.parse(stored));
        else setProjects([]);
      } catch {
        setProjects([]);
      }
    }
  };

  const loadMusicians = async () => {
    try {
      const users = await api.getUsers();
      if (Array.isArray(users)) {
        setCloudMusicians(users);
      } else {
        setCloudMusicians([]);
      }
    } catch (e) {
      console.log('Error loading cloud musicians:', e);
      setCloudMusicians([]);
    }
  };

  const loadPublicBands = async () => {
    try {
      const bList = await api.getPublicBands();
      const list = Array.isArray(bList) ? bList : (Array.isArray(bList?.data) ? bList.data : []);
      setPublicBands(list);
    } catch (e) {
      console.log('Error loading public bands:', e);
      setPublicBands([]);
    }
  };

  const loadClassifieds = async () => {
    setIsLoadingClassifieds(true);
    try {
      const list = await api.getClassifieds();
      let combined = Array.isArray(list) ? [...list] : [];

      // Also ensure current user's locally configured negotiable gear is included
      try {
        let userGear = currentUser?.gear;
        if (!Array.isArray(userGear)) {
          const cachedProfile = await AsyncStorage.getItem('user_profile_cache');
          if (cachedProfile) {
            const parsed = JSON.parse(cachedProfile);
            userGear = parsed.gear || (parsed.gearJson ? JSON.parse(parsed.gearJson) : []);
          }
        }
        if (Array.isArray(userGear)) {
          const myUser = (currentUser?.username || '').replace(/^@+/, '');
          userGear.forEach(g => {
            if (g.isNegotiable === true || g.isNegotiable === 1 || String(g.isNegotiable).toLowerCase() === 'true') {
              const alreadyInList = combined.some(item =>
                (g.id && String(item.id) === String(g.id)) ||
                (item.name?.toLowerCase() === g.name?.toLowerCase() && item.username === myUser)
              );
              if (!alreadyInList) {
                combined.unshift({
                  id: g.id || `my-gear-${Date.now()}`,
                  userId: currentUser?.id || null,
                  username: myUser || 'você',
                  name: g.name,
                  category: g.category || 'Equipamento',
                  description: g.details || g.description || '',
                  price: g.price || '',
                  isNegotiable: true
                });
              }
            }
          });
        }
      } catch (locErr) {
        console.log('Error merging local gear in classifieds:', locErr);
      }

      setClassifieds(combined);
    } catch (e) {
      console.log('Error loading classifieds:', e);
      setClassifieds([]);
    } finally {
      setIsLoadingClassifieds(false);
    }
  };

  const saveProjects = async (updatedProjects) => {
    setProjects(updatedProjects);
    try {
      await AsyncStorage.setItem('network_projects', JSON.stringify(updatedProjects));
    } catch (e) {
      console.log('Error saving network projects:', e);
    }
  };

  // Helper Pill component
  const Pill = ({ label, selected, onPress, flex }) => (
    <Pressable
      onPress={onPress}
      style={{
        flex: flex || undefined,
        paddingVertical: 6,
        paddingHorizontal: 12,
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
        fontSize: 12,
        fontWeight: selected ? '800' : '600',
        textAlign: 'center'
      }}>
        {label}
      </Text>
    </Pressable>
  );

  // Toggle multi-select options (Cover, Autoral, Hobbie, Profissional, Ver no que dá)
  const toggleFormOption = (opt) => {
    if (formOptions.includes(opt)) {
      if (formOptions.length === 1) return;
      setFormOptions(formOptions.filter(o => o !== opt));
    } else {
      setFormOptions([...formOptions, opt]);
    }
  };

  // Add style tag in form (sem hashtag)
  const handleAddGenre = () => {
    const trimmed = formGenreInput.trim().replace(/^#+/, '');
    if (!trimmed) return;
    if (formGenres.length >= 4) {
      Alert.alert(t('tagLimitReached') || 'Limite Atingido', t('styleTagLimitMsg') || 'Você pode adicionar até 4 tags de estilo.');
      return;
    }
    if (!formGenres.includes(trimmed)) {
      setFormGenres([...formGenres, trimmed]);
    }
    setFormGenreInput('');
  };

  const handleRemoveGenre = (index) => {
    setFormGenres(formGenres.filter((_, i) => i !== index));
  };

  // Handle choosing existing band in form
  const handleSelectExistingBand = (band) => {
    setSelectedExistingBandId(band.id);
    setFormBandName(band.name);
    setFormBandImage(band.imageUri || '');

    const opts = [];
    if (band.isCover === 1) opts.push('Cover');
    if (band.isAutoral === 1) opts.push('Autoral');
    if (opts.length === 0) opts.push('Cover');
    opts.push('Profissional');
    setFormOptions(opts);

    setFormCity(band.city || currentUser?.city || '');
    setFormState(band.state || currentUser?.state || '');
    setFormCountry(band.country || currentUser?.country || '');
    if (band.genres) {
      try {
        const parsed = typeof band.genres === 'string' ? JSON.parse(band.genres) : band.genres;
        if (Array.isArray(parsed)) setFormGenres(parsed.map(g => String(g).replace(/^#+/, '')));
      } catch (e) {}
    }
  };

  // Open New Project Modal
  const openNewProjectModal = () => {
    setEditingProjectId(null);
    setLinkOption(userBands.length > 0 ? 'existing' : 'new');
    if (userBands.length > 0) {
      handleSelectExistingBand(userBands[0]);
    } else {
      setFormBandName('');
      setFormBandImage('');
      setFormGenres(['Rock']);
      setFormCity(currentUser?.city || '');
      setFormState(currentUser?.state || '');
      setFormCountry(currentUser?.country || '');
      setFormOptions(['Cover', 'Profissional']);
    }
    setFormSoughtRole('');
    setFormDescription('');
    setFormAddToBands(true);
    setShowNewProjectModal(true);
  };

  // Open Edit Project Modal
  const openEditProjectModal = (proj) => {
    setEditingProjectId(proj.id);
    setLinkOption('new');
    setFormBandName(proj.bandName || '');
    setFormBandImage(proj.imageUri || proj.logo || '');
    setFormSoughtRole(proj.soughtRole || '');
    const opts = proj.options && proj.options.length > 0 ? proj.options : [
      proj.isCover === 1 ? 'Cover' : null,
      proj.isAutoral === 1 ? 'Autoral' : null,
      proj.objective || null
    ].filter(Boolean);
    setFormOptions(opts.length > 0 ? opts : ['Cover', 'Profissional']);
    setFormGenres(proj.genres ? proj.genres.map(g => String(g).replace(/^#+/, '')) : []);
    setFormCity(proj.city || '');
    setFormState(proj.state || '');
    setFormCountry(proj.country || '');
    setFormDescription(proj.description || '');
    setFormAddToBands(false);
    setShowNewProjectModal(true);
  };

  // Publish New Project Announcement
  const handlePublishProject = async () => {
    if (!formBandName.trim()) {
      Alert.alert(t('fieldRequired') || 'Campo Obrigatório', t('fillBandNameError') || 'Informe o nome da banda ou projeto.');
      return;
    }
    if (!formSoughtRole.trim()) {
      Alert.alert(t('fieldRequired') || 'Campo Obrigatório', t('fillSoughtRoleError') || 'Informe o instrumento ou função que você procura.');
      return;
    }
    if (formOptions.length === 0) {
      Alert.alert(t('attentionTitle') || 'Atenção', t('selectProposalError') || 'Selecione pelo menos uma opção de proposta ou objetivo.');
      return;
    }

    const currentUserId = currentUser?.id || currentUser?.username || 'me';
    const currentUserName = currentUser?.displayName || currentUser?.username || 'Eu';

    const isCoverVal = formOptions.includes('Cover') ? 1 : 0;
    const isAutoralVal = formOptions.includes('Autoral') ? 1 : 0;

    // Se estiver editando um anúncio existente
    if (editingProjectId) {
      const existingProj = projects.find(p => p.id === editingProjectId);
      const cloudId = existingProj?.cloudId || (editingProjectId.startsWith('cloud-') ? editingProjectId.replace('cloud-', '') : null);

      if (cloudId) {
        try {
          await api.updateAnnouncement(cloudId, {
            title: formBandName.trim(),
            description: formDescription.trim(),
            instrument: formSoughtRole.trim(),
            city: formCity.trim(),
            state: formState || '',
            imageUrl: formBandImage || null,
            styles: formGenres.map(g => String(g).replace(/^#+/, '')).join(', '),
            projectType: (isCoverVal && isAutoralVal) ? 'Cover, Autoral' : (isCoverVal ? 'Cover' : (isAutoralVal ? 'Autoral' : 'Cover')),
            interestLevel: formOptions.join(', ') || 'Casual'
          });
        } catch (apiErr) {
          console.log('Error updating announcement on cloud API:', apiErr);
        }
      }

      const updated = projects.map(p => {
        if (p.id === editingProjectId) {
          return {
            ...p,
            bandName: formBandName.trim(),
            imageUri: formBandImage || p.imageUri || '',
            soughtRole: formSoughtRole.trim(),
            options: formOptions,
            isCover: isCoverVal,
            isAutoral: isAutoralVal,
            genres: formGenres.map(g => String(g).replace(/^#+/, '')),
            city: formCity.trim(),
            state: formState,
            country: formCountry,
            description: formDescription.trim(),
          };
        }
        return p;
      });
      await saveProjects(updated);
      setShowNewProjectModal(false);
      setEditingProjectId(null);
      Alert.alert(t('success') || 'Sucesso!', t('adUpdatedSuccess') || 'Anúncio atualizado com sucesso!');
      return;
    }

    // Automatically create project in creator's Bands/Projects tab
    try {
      const existingBands = await bandService.getAll();
      const alreadyInBands = existingBands && existingBands.some(b => (b.name || '').trim().toLowerCase() === formBandName.trim().toLowerCase());
      if (!alreadyInBands) {
        await bandService.insert(
          formBandName.trim(),
          formBandImage || '',
          '',
          formDescription.trim(),
          isCoverVal && isAutoralVal ? 'ambos' : (isCoverVal ? 'cover' : 'autoral'),
          isCoverVal,
          isAutoralVal,
          formCity.trim(),
          formState,
          formCountry,
          JSON.stringify(formGenres.map(g => String(g).replace(/^#+/, '')))
        );
      }
      loadUserBands();
    } catch (err) {
      console.log('Error adding new project to Bands tab:', err);
    }

    let cloudId = null;
    try {
      const logged = await api.isLoggedIn();
      if (logged) {
        const cloudRes = await api.createAnnouncement({
          title: formBandName.trim(),
          description: formDescription.trim(),
          instrument: formSoughtRole.trim(),
          city: formCity.trim(),
          state: formState || '',
          imageUrl: formBandImage || null,
          styles: formGenres.map(g => String(g).replace(/^#+/, '')).join(', '),
          projectType: (isCoverVal && isAutoralVal) ? 'Cover, Autoral' : (isCoverVal ? 'Cover' : (isAutoralVal ? 'Autoral' : 'Cover')),
          interestLevel: formOptions.join(', ') || 'Casual'
        });
        if (cloudRes?.data?.id) {
          cloudId = cloudRes.data.id;
        }
      }
    } catch (apiErr) {
      console.log('Error publishing announcement to cloud API:', apiErr);
    }

    const newProject = {
      id: cloudId ? ('cloud-' + cloudId) : ('proj-' + Date.now()),
      cloudId: cloudId,
      creatorId: currentUserId,
      creatorName: currentUserName,
      creatorUsername: currentUser?.username || 'me',
      bandName: formBandName.trim(),
      imageUri: formBandImage || '',
      soughtRole: formSoughtRole.trim(),
      options: formOptions,
      isCover: isCoverVal,
      isAutoral: isAutoralVal,
      genres: formGenres.map(g => String(g).replace(/^#+/, '')),
      city: formCity.trim(),
      state: formState,
      country: formCountry,
      description: formDescription.trim(),
      createdAt: 'Agora',
      applicants: []
    };

    const updated = [newProject, ...projects];
    await saveProjects(updated);
    setShowNewProjectModal(false);
    Alert.alert(t('success') || 'Sucesso!', t('adPublishedSuccess') || 'Anúncio publicado com sucesso!');
  };

  // Delete project
  const handleDeleteProject = (projId) => {
    Alert.alert(
      t('removeAnnouncementTitle') || 'Remover Anúncio',
      t('removeAnnouncementConfirm') || 'Deseja realmente remover este anúncio de projeto?',
      [
        { text: t('cancelBtn') || 'Cancelar', style: 'cancel' },
        {
          text: t('remove') || 'Remover',
          style: 'destructive',
          onPress: async () => {
            const toDel = projects.find(p => p.id === projId);
            const cloudId = toDel?.cloudId || (toDel?.id && String(toDel.id).startsWith('cloud-') ? String(toDel.id).replace('cloud-', '') : null);
            if (cloudId) {
              try {
                await api.deleteAnnouncement(cloudId);
              } catch (e) {
                console.log('Error deleting cloud announcement:', e);
              }
            }
            const updated = projects.filter(p => p.id !== projId);
            await saveProjects(updated);
          }
        }
      ]
    );
  };

  const handleOpenMusicianProfile = async (musician) => {
    const prof = await musiciansService.getMusicianByUsername(musician?.username, musician?.name);
    if (prof) {
      setSelectedMusicianProfile(prof);
      setShowMusicianProfileModal(true);
    }
  };

  const handleOpenBandProfile = async (project) => {
    if (!project) return;
    if (showMusicianProfileModal) {
      setShowMusicianProfileModal(false);
    }
    const bName = project.bandName || project.name || '';
    
    // 1. Procurar nas bandas do usuário / locais
    const match = (userBands || []).find(b =>
      (project.bandId && b.id === project.bandId) ||
      (project.id && b.id === project.id) ||
      (b.name && bName && b.name.toLowerCase() === bName.toLowerCase())
    );

    let bandData;
    if (match) {
      bandData = { ...match, ...project, id: match.id, name: match.name, bandName: match.name };
    } else {
      bandData = {
        id: project.bandId || project.id,
        name: bName,
        bandName: bName,
        imageUri: project.imageUri || project.logo || project.bandImage || '',
        bandImage: project.imageUri || project.logo || project.bandImage || '',
        city: project.city,
        state: project.state,
        country: project.country,
        genres: project.genres || project.styles || [],
        isCover: (project.options || []).includes('Cover') ? 1 : 0,
        isAutoral: (project.options || []).includes('Autoral') ? 1 : 0,
        bandType: (project.options || []).includes('Cover') && (project.options || []).includes('Autoral') ? 'ambos' : (project.options || []).includes('Cover') ? 'cover' : 'autoral',
        description: project.description || '',
        members: project.members || [
          {
            id: 'm-creator',
            name: project.creatorName || 'Líder da Banda',
            username: project.creatorUsername || '',
            role: 'Líder / Fundador',
            startDate: '2023',
            status: 'active'
          }
        ],
        songs: project.songs || [],
        schedule: project.schedule || project.agenda || []
      };
    }

    setSelectedBandProfile(bandData);
    setShowBandProfileModal(true);
  };

  const sanitizeInviteText = (str) => {
    if (!str) return '';
    return str
      .replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, '')
      .trim()
      .slice(0, 500);
  };

  const handleOpenCandidateInviteModal = (candidate, project) => {
    if (!candidate || !project) return;
    const defaultMsg = `Olá ${candidate.name}! Convidamos você para ser ${project.soughtRole || candidate.primaryInstrument || 'músico(a)'} no projeto ${project.bandName}.`;
    setCandidateInviteMessage(defaultMsg);
    setCandidateInviteTarget({ candidate, project });
  };

  const handleConfirmCandidateInvite = async () => {
    if (!candidateInviteTarget) return;
    const { candidate, project } = candidateInviteTarget;
    try {
      setIsSendingCandidateInvite(true);
      const allBands = await bandService.getAll();
      let targetBand = allBands.find(b => 
        (project.bandId && b.id === project.bandId) ||
        (b.name && b.name.toLowerCase() === (project.bandName || '').toLowerCase())
      );

      if (!targetBand) {
        const newBandId = await bandService.insert(
          project.bandName || 'Minha Banda',
          project.imageUri || '',
          '',
          '',
          'cover',
          project.isCover !== undefined ? project.isCover : 1,
          project.isAutoral !== undefined ? project.isAutoral : 0,
          project.city || '',
          project.state || '',
          project.country || '',
          JSON.stringify(project.genres || [])
        );
        targetBand = { id: newBandId, name: project.bandName };
        loadUserBands();
      }

      const role = project.soughtRole || candidate.primaryInstrument || 'Integrante';
      const cleanedMessage = sanitizeInviteText(candidateInviteMessage);
      const finalMessage = cleanedMessage || `Olá ${candidate.name}! Convidamos você para ser ${role} no projeto ${project.bandName}.`;

      const memberId = await bandService.addBandMember(
        targetBand.id,
        candidate.name,
        role,
        '',
        '',
        '',
        'pending',
        '[]',
        candidate.username,
        finalMessage,
        ''
      );

      await musiciansService.sendInvitation({
        bandMemberId: memberId,
        bandId: targetBand.id,
        bandName: project.bandName,
        bandImage: project.imageUri || '',
        role,
        invitedUsername: candidate.username,
        invitedName: candidate.name,
        senderName: currentUser?.displayName || currentUser?.name || 'Líder da Banda',
        city: project.city || '',
        state: project.state || '',
        message: finalMessage,
        replyMessage: ''
      });

      setCandidateInviteTarget(null);
      setCandidateInviteMessage('');
      Alert.alert(
        t('candidateInviteSentTitle') || 'Convite Enviado! ✉️',
        (t('candidateInviteSentMsg') || 'Você convidou {name} para integrar a banda "{band}".')
          .replace('{name}', `${candidate.name} (@${candidate.username})`)
          .replace('{band}', project.bandName) + '\n\n' + (t('candidateInviteSuccessDetail') || 'O integrante foi adicionado como "Pendente" na aba de integrantes da banda.')
      );
    } catch (err) {
      console.error('Error sending invite:', err);
      Alert.alert(t('errorTitle') || 'Erro', t('inviteErrorMsg') || 'Não foi possível enviar o convite. Tente novamente.');
    } finally {
      setIsSendingCandidateInvite(false);
    }
  };

  // Open Candidate Scanner: switches to musicians tab with animated search
  const handleOpenScanner = (project) => {
    setSelectedScanProject(project);
    setSubTab('musicians');
    setIsScanningCandidates(true);
  };

  // Open Applicants
  const handleOpenApplicants = (project) => {
    setSelectedApplicantsProject(project);
    setShowApplicantsModal(true);
  };

  // Open Interest Modal
  const handleOpenInterest = (project) => {
    setSelectedInterestProject(project);
    setInterestInstrument(project.soughtRole);
    setInterestMessage('');
    setShowInterestModal(true);
  };

  // Submit Interest
  const handleSubmitInterest = async () => {
    if (!selectedInterestProject) return;
    const applicantName = currentUser?.displayName || currentUser?.username || 'Músico';
    const instrumentChosen = interestInstrument.trim() || selectedInterestProject.soughtRole;
    const messageContent = interestMessage.trim() || t('defaultInterestMsg') || 'Tenho muito interesse em participar deste projeto!';

    const newApplicant = {
      id: 'app-' + Date.now(),
      name: applicantName,
      instrument: instrumentChosen,
      message: messageContent,
      date: 'Agora'
    };

    // Save to Cloud API
    const annCloudId = selectedInterestProject.cloudId || (selectedInterestProject.id && String(selectedInterestProject.id).startsWith('cloud-') ? String(selectedInterestProject.id).replace('cloud-', '') : null);
    if (annCloudId) {
      try {
        await api.applyToAnnouncement(annCloudId, {
          applicantName: applicantName,
          instrument: instrumentChosen,
          message: messageContent,
          contactInfo: currentUser?.email || '',
          pictureUrl: userProfileImage || currentUser?.pictureUrl || null
        });
      } catch (err) {
        console.log('Error submitting interest to cloud API:', err);
      }
    }

    const updated = projects.map(p => {
      if (p.id === selectedInterestProject.id) {
        return {
          ...p,
          applicants: [...(p.applicants || []), newApplicant]
        };
      }
      return p;
    });

    await saveProjects(updated);
    setShowInterestModal(false);
    Alert.alert(t('applicationSentTitle') || 'Candidatura Enviada!', t('applicationSentMsg') || 'A banda foi notificada sobre seu interesse. Boa sorte!');
  };

  // Assemble full musicians list including the logged-in user and cloud users
  const allMusicians = useMemo(() => {
    const list = [];

    if (currentUser) {
      let userPrimaryInsts = [];
      if (currentUser.skills && Array.isArray(currentUser.skills) && currentUser.skills.length > 0) {
        const primaries = currentUser.skills.filter(s => s.isPrimary);
        const targetList = primaries.length > 0 ? primaries : currentUser.skills;
        userPrimaryInsts = targetList.slice(0, 2).map(s => ({
          name: s.instrument || s.name || 'Instrumento',
          stars: s.stars || 5
        }));
      } else if (currentUser.primaryInstruments && Array.isArray(currentUser.primaryInstruments) && currentUser.primaryInstruments.length > 0) {
        userPrimaryInsts = currentUser.primaryInstruments.slice(0, 2).map(i =>
          typeof i === 'object' ? { name: i.name || i.instrument || 'Instrumento', stars: i.stars || 5 } : { name: String(i), stars: 5 }
        );
      }
      if (userPrimaryInsts.length === 0) {
        userPrimaryInsts = [
          { name: 'Guitarra', stars: 5 },
          { name: 'Violão', stars: 3 }
        ];
      }

      let userInfluences = [];
      if (Array.isArray(currentUser.influences) && currentUser.influences.length > 0) {
        userInfluences = currentUser.influences.map(inf => typeof inf === 'string' ? inf : (inf.name || inf.influence)).filter(Boolean).slice(0, 5);
      } else if (typeof currentUser.influences === 'string' && currentUser.influences.trim()) {
        try {
          const parsed = JSON.parse(currentUser.influences);
          if (Array.isArray(parsed)) {
            userInfluences = parsed.map(inf => typeof inf === 'string' ? inf : (inf.name || inf.influence)).filter(Boolean).slice(0, 5);
          }
        } catch (e) {
          userInfluences = currentUser.influences.split(',').map(s => s.trim()).filter(Boolean).slice(0, 5);
        }
      }
      if (userInfluences.length === 0) {
        userInfluences = ['Rock Clássico', 'Blues'];
      }

      const myProfileMusician = {
        id: 'mus-me',
        isMe: true,
        name: currentUser.displayName || currentUser.name || currentUser.username || 'Músico',
        username: (currentUser.username || 'voce').replace(/^@+/, ''),
        primaryInstruments: userPrimaryInsts,
        primaryInstrument: userPrimaryInsts[0]?.name || 'Guitarra',
        stars: 5,
        city: currentUser.city || '',
        state: currentUser.state || '',
        country: currentUser.country || '',
        availability: currentUser.availability || 'Disponível',
        influences: userInfluences,
        bio: currentUser.bio || 'Músico cadastrado na plataforma.',
        imageUri: userProfileImage || currentUser.imageUri || null,
        age: currentUser.age || calculateAge(currentUser.birthDate)
      };

      list.push(myProfileMusician);
    }

    if (cloudMusicians && cloudMusicians.length > 0) {
      cloudMusicians.forEach(u => {
        if (currentUser && (u.id === currentUser.id || u.username?.toLowerCase() === currentUser.username?.toLowerCase())) {
          return;
        }
        let instruments = [];
        if (typeof u.instruments === 'string' && u.instruments.trim()) {
          try {
            const parsed = JSON.parse(u.instruments);
            if (Array.isArray(parsed)) {
              instruments = parsed.map(item => {
                if (typeof item === 'object' && item !== null) {
                  return { name: item.name || item.instrument || 'Instrumento', stars: item.stars || 5 };
                }
                return { name: String(item), stars: 5 };
              });
            } else {
              instruments = [{ name: String(parsed), stars: 5 }];
            }
          } catch {
            instruments = [{ name: u.instruments, stars: 5 }];
          }
        } else if (Array.isArray(u.instruments)) {
          instruments = u.instruments.map(item => {
            if (typeof item === 'object' && item !== null) {
              return { name: item.name || item.instrument || 'Instrumento', stars: item.stars || 5 };
            }
            return { name: String(item), stars: 5 };
          });
        } else {
          instruments = [{ name: 'Músico', stars: 5 }];
        }

        let parsedInfluences = [];
        if (typeof u.influences === 'string' && u.influences.trim()) {
          try {
            const jsonInf = JSON.parse(u.influences);
            if (Array.isArray(jsonInf)) {
              parsedInfluences = jsonInf.map(item => typeof item === 'object' && item !== null ? (item.name || item.tag || '') : String(item)).filter(Boolean);
            } else {
              parsedInfluences = [String(jsonInf)];
            }
          } catch {
            parsedInfluences = u.influences.split(',').map(s => s.trim()).filter(Boolean);
          }
        } else if (Array.isArray(u.influences)) {
          parsedInfluences = u.influences.map(item => typeof item === 'object' && item !== null ? (item.name || item.tag || '') : String(item)).filter(Boolean);
        }

        const isMe = Boolean(currentUser && (u.id === currentUser.id || u.username?.toLowerCase() === currentUser.username?.toLowerCase()));
        let resolvedName = isMe ? (currentUser.displayName || currentUser.name || u.displayName || u.username) : (u.displayName || u.name || u.fullName);
        if (!resolvedName || resolvedName.trim() === u.username) {
          const raw = String(u.username || 'Músico').replace(/^@+/, '');
          resolvedName = (raw.includes('.') || raw.includes('_') || raw.includes('-'))
            ? raw.split(/[._-]+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
            : (raw.charAt(0).toUpperCase() + raw.slice(1));
        }

        list.push({
          id: 'mus-' + u.id,
          cloudId: u.id,
          isMe: isMe,
          name: resolvedName,
          username: (u.username || '').replace(/^@+/, ''),
          primaryInstruments: instruments,
          primaryInstrument: instruments[0]?.name || 'Músico',
          stars: 5,
          city: u.city || '',
          state: u.state || '',
          country: u.country || 'Brasil',
          availability: u.availability || 'Disponível',
          influences: parsedInfluences,
          bio: u.bio || 'Músico na rede BandLink.',
          imageUri: u.pictureUrl || u.imageUri || null,
          instagram: u.instagram,
          youtube: u.youtube,
          spotify: u.spotify,
          tiktok: u.tiktok,
          age: u.age || calculateAge(u.birthDate)
        });
      });
    } else {
      // Fallback para músicos de exemplo quando a nuvem ainda não tiver usuários carregados
      const sampleMusicians = musiciansService.getMusicians() || [];
      sampleMusicians.forEach((s, idx) => {
        list.push({
          ...s,
          age: s.age || calculateAge(s.birthDate) || (23 + ((idx * 4) % 13))
        });
      });
    }

    return list;
  }, [currentUser, userProfileImage, cloudMusicians]);

  // Calculate Match Score for Candidate Scanner
  const scannedCandidates = useMemo(() => {
    if (!selectedScanProject) return [];

    const sought = String(selectedScanProject.soughtRole || '').toLowerCase();
    const projCity = String(selectedScanProject.city || '').toLowerCase();
    const projState = String(selectedScanProject.state || '').toUpperCase();
    const projGenres = (selectedScanProject.genres || []).map(g => String(g).toLowerCase().replace(/^#+/, ''));
    const projOpts = selectedScanProject.options || [];

    // Filter out the logged-in user themselves
    const pool = (allMusicians || []).filter(m => !m.isMe);
    // If pool is empty (e.g. testing or only current user), fallback to sample musicians
    const candidatePool = pool.length > 0 ? pool : (musiciansService.getMusicians() || []);

    return candidatePool.map(musician => {
      let score = 30; // Base score
      const rawInsts = musician.primaryInstruments || (musician.primaryInstrument ? [musician.primaryInstrument] : []);
      const musInsts = (Array.isArray(rawInsts) ? rawInsts : [rawInsts]).map(i => {
        if (typeof i === 'object' && i !== null) return String(i.name || i.instrument || '').toLowerCase();
        return String(i || '').toLowerCase();
      });

      // Instrument match across primary instruments
      const hasInstMatch = musInsts.some(musInst => {
        if (!musInst) return false;
        return (
          (sought && (sought.includes(musInst) || musInst.includes(sought))) ||
          (sought.includes('guitar') && musInst.includes('guitar')) ||
          (sought.includes('baix') && (musInst.includes('baix') || musInst.includes('bass'))) ||
          (sought.includes('bass') && (musInst.includes('baix') || musInst.includes('bass'))) ||
          (sought.includes('bater') && (musInst.includes('bater') || musInst.includes('drum'))) ||
          (sought.includes('drum') && (musInst.includes('bater') || musInst.includes('drum'))) ||
          (sought.includes('vocal') && (musInst.includes('voz') || musInst.includes('vocal') || musInst.includes('cant'))) ||
          (sought.includes('voz') && (musInst.includes('voz') || musInst.includes('vocal') || musInst.includes('cant'))) ||
          (sought.includes('cant') && (musInst.includes('voz') || musInst.includes('vocal') || musInst.includes('cant'))) ||
          (sought.includes('tecl') && (musInst.includes('tecl') || musInst.includes('keyb') || musInst.includes('pian'))) ||
          (sought.includes('pian') && (musInst.includes('tecl') || musInst.includes('keyb') || musInst.includes('pian'))) ||
          (sought.includes('keyb') && (musInst.includes('tecl') || musInst.includes('keyb') || musInst.includes('pian'))) ||
          (sought.includes('viol') && (musInst.includes('viol') || musInst.includes('acoust'))) ||
          (sought.includes('sax') && musInst.includes('sax')) ||
          (sought.includes('perc') && musInst.includes('perc'))
        );
      });

      if (hasInstMatch) {
        score += 35;
        score += Math.min(15, (musician.stars || 5) * 3);
      }

      // Proximity match
      if (projCity && musician.city && String(musician.city).toLowerCase() === projCity) {
        score += 15;
      } else if (projState && musician.state && String(musician.state).toUpperCase() === projState) {
        score += 8;
      }

      // Objective & proposal match
      if (musician.interestLevel) {
        if (Array.isArray(musician.interestLevel)) {
          if (musician.interestLevel.some(lvl => projOpts.includes(lvl))) score += 5;
        } else if (typeof musician.interestLevel === 'string') {
          if (projOpts.some(lvl => musician.interestLevel.toLowerCase().includes(String(lvl).toLowerCase()))) score += 5;
        }
      }

      // Genre overlap
      const hasGenreOverlap = (musician.influences || []).some(inf => {
        const infStr = String(typeof inf === 'string' ? inf : (inf?.name || '')).toLowerCase();
        return projGenres.some(pg => infStr.includes(pg) || pg.includes(infStr));
      });
      if (hasGenreOverlap) score += 5;

      const finalMatch = Math.min(99, Math.max(45, score));
      return {
        ...musician,
        matchScore: finalMatch
      };
    }).sort((a, b) => b.matchScore - a.matchScore);
  }, [selectedScanProject, allMusicians]);

  // Filtered projects by search text
  const currentUserId = currentUser?.id || currentUser?.username || 'me';
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (filterCity.trim()) {
        const c = filterCity.trim().toLowerCase();
        if (!(p.city || '').toLowerCase().includes(c)) return false;
      }
      if (filterState.trim()) {
        const st = filterState.trim().toLowerCase();
        if (!(p.state || '').toLowerCase().includes(st)) return false;
      }
      if (filterCountry.trim()) {
        const co = filterCountry.trim().toLowerCase();
        if (!(p.country || '').toLowerCase().includes(co)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inBand = (p.bandName || '').toLowerCase().includes(q);
        const inRole = (p.soughtRole || '').toLowerCase().includes(q);
        const inCity = (p.city || '').toLowerCase().includes(q);
        const inGenres = (p.genres || []).some(g => String(g).toLowerCase().includes(q));
        const inOpts = (p.options || []).some(o => String(o).toLowerCase().includes(q));
        if (!inBand && !inRole && !inCity && !inGenres && !inOpts) return false;
      }
      return true;
    });
  }, [projects, searchQuery, filterCity, filterState, filterCountry]);

  // Helper to extract instrument name and individual star rating
  const getInstInfo = (inst, defaultStars = 5) => {
    if (typeof inst === 'object' && inst !== null) {
      return {
        name: inst.name || inst.instrument || '',
        stars: inst.stars || defaultStars
      };
    }
    return {
      name: String(inst || ''),
      stars: defaultStars
    };
  };

  // Filtered musicians by search text and city
  const filteredMusicians = useMemo(() => {
    return allMusicians.filter(m => {
      if (filterCity.trim()) {
        const c = filterCity.trim().toLowerCase();
        if (!(m.city || '').toLowerCase().includes(c)) return false;
      }
      if (filterState.trim()) {
        const st = filterState.trim().toLowerCase();
        if (!(m.state || '').toLowerCase().includes(st)) return false;
      }
      if (filterCountry.trim()) {
        const co = filterCountry.trim().toLowerCase();
        if (!(m.country || '').toLowerCase().includes(co)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inName = (m.name || '').toLowerCase().includes(q);
        const inUsername = (m.username || '').toLowerCase().includes(q);
        const inInst = (m.primaryInstruments || [m.primaryInstrument]).some(i => {
          const name = typeof i === 'object' ? (i.name || i.instrument || '') : String(i || '');
          return name.toLowerCase().includes(q);
        });
        const inCity = (m.city || '').toLowerCase().includes(q);
        const inInfluences = (m.influences || []).some(inf => String(typeof inf === 'string' ? inf : inf.name).toLowerCase().includes(q));
        if (!inName && !inUsername && !inInst && !inCity && !inInfluences) return false;
      }
      return true;
    });
  }, [allMusicians, searchQuery, filterCity, filterState, filterCountry]);

  // Displayed musicians: if scanning a project, show matching candidates; otherwise all filtered musicians
  const displayedMusicians = useMemo(() => {
    if (selectedScanProject) {
      let list = scannedCandidates;
      if (filterCity.trim()) {
        const c = filterCity.trim().toLowerCase();
        list = list.filter(m => (m.city || '').toLowerCase().includes(c));
      }
      if (filterState.trim()) {
        const st = filterState.trim().toLowerCase();
        list = list.filter(m => (m.state || '').toLowerCase().includes(st));
      }
      if (filterCountry.trim()) {
        const co = filterCountry.trim().toLowerCase();
        list = list.filter(m => (m.country || '').toLowerCase().includes(co));
      }
      if (!searchQuery.trim()) return list;
      const q = searchQuery.toLowerCase();
      return list.filter(m => {
        const inName = (m.name || '').toLowerCase().includes(q);
        const inUsername = (m.username || '').toLowerCase().includes(q);
        const inInst = (m.primaryInstruments || [m.primaryInstrument]).some(i => {
          const name = typeof i === 'object' ? (i.name || i.instrument || '') : String(i || '');
          return name.toLowerCase().includes(q);
        });
        const inCity = (m.city || '').toLowerCase().includes(q);
        const inInfluences = (m.influences || []).some(inf => String(typeof inf === 'string' ? inf : inf.name).toLowerCase().includes(q));
        return inName || inUsername || inInst || inCity || inInfluences;
      });
    }
    return filteredMusicians;
  }, [selectedScanProject, scannedCandidates, filteredMusicians, searchQuery, filterCity, filterState, filterCountry]);

  // Pagination calculations
  const totalProjectsPages = Math.max(1, Math.ceil(filteredProjects.length / ITEMS_PER_PAGE));
  const paginatedProjects = useMemo(() => {
    const start = (projectsPage - 1) * ITEMS_PER_PAGE;
    return filteredProjects.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProjects, projectsPage]);

  const totalMusiciansPages = Math.max(1, Math.ceil(displayedMusicians.length / ITEMS_PER_PAGE));
  const paginatedMusicians = useMemo(() => {
    const start = (musiciansPage - 1) * ITEMS_PER_PAGE;
    return displayedMusicians.slice(start, start + ITEMS_PER_PAGE);
  }, [displayedMusicians, musiciansPage]);

  // Classifieds calculations
  const filteredClassifieds = useMemo(() => {
    return (classifieds || []).filter(c => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inName = (c.name || '').toLowerCase().includes(q);
        const inCat = (c.category || '').toLowerCase().includes(q);
        const inDesc = (c.description || '').toLowerCase().includes(q);
        const inUser = (c.username || '').toLowerCase().includes(q);
        if (!inName && !inCat && !inDesc && !inUser) return false;
      }
      return true;
    });
  }, [classifieds, searchQuery]);

  const totalClassifiedsPages = Math.max(1, Math.ceil(filteredClassifieds.length / ITEMS_PER_PAGE));
  const paginatedClassifieds = useMemo(() => {
    const start = (classifiedsPage - 1) * ITEMS_PER_PAGE;
    return filteredClassifieds.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredClassifieds, classifiedsPage]);

  // Assemble all visible bands (User's visible bands + Announcements projects bands + Network ecosystem bands)
  const allBands = useMemo(() => {
    const list = [];
    const seenNames = new Set();

    // 1. User's own bands that are set to visible (isNetworkVisible !== 0)
    (userBands || []).forEach(b => {
      if (b.isNetworkVisible === 0) return; // Ocultada da rede pelo usuário
      
      let parsedGenres = [];
      try {
        parsedGenres = typeof b.genres === 'string' ? JSON.parse(b.genres) : (b.genres || []);
      } catch (e) {
        parsedGenres = [];
      }

      const bandKey = (b.name || '').trim().toLowerCase();
      if (bandKey) seenNames.add(bandKey);

      const userBandObjectives = [];
      if (b.options && Array.isArray(b.options) && b.options.length > 0) {
        userBandObjectives.push(...b.options);
      } else {
        if (b.isCover || (b.bandType && b.bandType.includes('cover'))) userBandObjectives.push('Cover');
        if (b.isAutoral || (b.bandType && b.bandType.includes('autoral'))) userBandObjectives.push('Autoral');
      }
      if (userBandObjectives.length === 0) {
        userBandObjectives.push('Cover');
      }

      list.push({
        id: b.id,
        bandId: b.id,
        name: b.name,
        bandName: b.name,
        imageUri: b.imageUri,
        city: b.city || currentUser?.city || '',
        state: b.state || currentUser?.state || '',
        country: b.country || currentUser?.country || 'Brazil',
        genres: parsedGenres,
        options: userBandObjectives,
        bandType: b.bandType || 'cover',
        isCover: b.isCover,
        isAutoral: b.isAutoral,
        description: b.description || 'Banda registrada na plataforma Setlist.',
        isMyBand: true,
        membersCount: b.membersCount || 4,
        songsCount: b.songsCount || 12,
        status: 'Ativa',
        isSeeking: false,
        soughtRole: null,
      });
    });

    // 2. Bands from announcements / projects
    (projects || []).forEach(p => {
      const bName = (p.bandName || '').trim();
      const bandKey = bName.toLowerCase();
      if (!bandKey || seenNames.has(bandKey)) return;
      seenNames.add(bandKey);

      list.push({
        id: p.bandId || p.id,
        bandId: p.bandId || p.id,
        projectId: p.id,
        name: bName,
        bandName: bName,
        imageUri: p.imageUri || p.bandImage || '',
        city: p.city || '',
        state: p.state || '',
        country: p.country || 'Brazil',
        genres: p.genres || [],
        options: p.options || [],
        description: p.description || '',
        isMyBand: false,
        members: p.members || [],
        membersCount: (p.members || []).length || 3,
        songs: p.songs || [],
        songsCount: (p.songs || []).length || 8,
        schedule: p.schedule || [],
        status: p.soughtRole ? `Buscando ${p.soughtRole}` : 'Ativa',
        isSeeking: !!p.soughtRole,
        soughtRole: p.soughtRole,
        projectRef: p,
      });
    });

    // 3. Real Public Bands from Cloud API
    (publicBands || []).forEach(pb => {
      const bName = (pb.name || '').trim();
      const bandKey = bName.toLowerCase();
      if (!bandKey || seenNames.has(bandKey)) return;
      seenNames.add(bandKey);

      let parsedGenres = [];
      try {
        parsedGenres = typeof pb.genresJson === 'string' ? JSON.parse(pb.genresJson) : (pb.genre ? [pb.genre] : ['Rock']);
      } catch {
        parsedGenres = pb.genre ? [pb.genre] : ['Rock'];
      }

      list.push({
        id: 'cloud-band-' + pb.id,
        cloudId: pb.id,
        name: bName,
        bandName: bName,
        imageUri: pb.imageUri || '',
        city: pb.city || '',
        state: pb.state || '',
        country: pb.country || 'Brasil',
        genres: parsedGenres,
        bandType: pb.bandType || 'cover',
        description: pb.description || 'Banda conectada na Rede BandLink.',
        isMyBand: false,
        membersCount: pb.membersCount || 1,
        songsCount: 0,
        status: 'Na Rede Musical',
        isSeeking: false,
        instagram: pb.instagram,
        youtube: pb.youtube,
        spotify: pb.spotify,
        publicSlug: pb.publicSlug,
        updatedAt: pb.updatedAt
      });
    });

    return list;
  }, [userBands, projects, publicBands, currentUser]);

  // Filtered bands by city and search query
  const filteredBands = useMemo(() => {
    return allBands.filter(b => {
      if (filterCity.trim()) {
        const c = filterCity.trim().toLowerCase();
        if (!(b.city || '').toLowerCase().includes(c)) return false;
      }
      if (filterState.trim()) {
        const st = filterState.trim().toLowerCase();
        if (!(b.state || '').toLowerCase().includes(st)) return false;
      }
      if (filterCountry.trim()) {
        const co = filterCountry.trim().toLowerCase();
        if (!(b.country || '').toLowerCase().includes(co)) return false;
      }

      // 2. Filtro por busca de texto (nome da banda, gênero, cidade, etc.)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inName = (b.name || b.bandName || '').toLowerCase().includes(q);
        const inCity = (b.city || '').toLowerCase().includes(q);
        const inState = (b.state || '').toLowerCase().includes(q);
        const inGenres = (b.genres || []).some(g => String(g).toLowerCase().includes(q));
        const inDesc = (b.description || '').toLowerCase().includes(q);
        const inSought = (b.soughtRole || '').toLowerCase().includes(q);
        if (!inName && !inCity && !inState && !inGenres && !inDesc && !inSought) return false;
      }

      return true;
    });
  }, [allBands, searchQuery, filterCity, filterState, filterCountry]);

  const totalBandsPages = Math.max(1, Math.ceil(filteredBands.length / ITEMS_PER_PAGE));
  const paginatedBands = useMemo(() => {
    const start = (bandsPage - 1) * ITEMS_PER_PAGE;
    return filteredBands.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBands, bandsPage]);

  // Pagination UI Component
  const renderPagination = (currentPage, totalPages, totalItems, onPageChange) => {
    if (totalItems <= ITEMS_PER_PAGE) return null;
    const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

    return (
      <View style={[styles.paginationContainer, { borderTopColor: colors.border }]}>
        <Text style={[styles.paginationCounterText, { color: colors.textMuted }]}>
          {(t('showingCount') || 'Exibindo {start}–{end} de {total}')
            .replace('{start}', startItem)
            .replace('{end}', endItem)
            .replace('{total}', totalItems)}
        </Text>
        <View style={styles.paginationRow}>
          <Pressable
            style={[
              styles.pageNavBtn,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                borderColor: colors.border,
                opacity: currentPage === 1 ? 0.35 : 1
              }
            ]}
            disabled={currentPage === 1}
            onPress={() => {
              if (currentPage > 1) {
                onPageChange(currentPage - 1);
                mainScrollRef.current?.scrollTo({ y: 0, animated: true });
              }
            }}
          >
            <Ionicons name="chevron-back" size={16} color={colors.text} />
            <Text style={[styles.pageNavBtnText, { color: colors.text }]}>
              {t('previousPage') || 'Anterior'}
            </Text>
          </Pressable>

          <View style={styles.pageNumbersRow}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
              if (totalPages > 5 && Math.abs(pageNum - currentPage) > 2 && pageNum !== 1 && pageNum !== totalPages) {
                if (Math.abs(pageNum - currentPage) === 3) {
                  return <Text key={pageNum} style={{ color: colors.textMuted, fontSize: 12 }}>...</Text>;
                }
                return null;
              }
              const isActive = pageNum === currentPage;
              return (
                <Pressable
                  key={pageNum}
                  style={[
                    styles.pageNumberPill,
                    {
                      backgroundColor: isActive ? colors.primary : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                      borderColor: isActive ? colors.primary : colors.border
                    }
                  ]}
                  onPress={() => {
                    onPageChange(pageNum);
                    mainScrollRef.current?.scrollTo({ y: 0, animated: true });
                  }}
                >
                  <Text style={[styles.pageNumberText, { color: isActive ? '#fff' : colors.text, fontWeight: isActive ? '800' : '500' }]}>
                    {pageNum}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={[
              styles.pageNavBtn,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                borderColor: colors.border,
                opacity: currentPage === totalPages ? 0.35 : 1
              }
            ]}
            disabled={currentPage === totalPages}
            onPress={() => {
              if (currentPage < totalPages) {
                onPageChange(currentPage + 1);
                mainScrollRef.current?.scrollTo({ y: 0, animated: true });
              }
            }}
          >
            <Text style={[styles.pageNavBtnText, { color: colors.text }]}>
              {t('nextPage') || 'Próxima'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.text} />
          </Pressable>
        </View>
      </View>
    );
  };

  // Render Stars
  const renderStars = (count, size = 14) => (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <Ionicons
          key={s}
          name={s <= count ? 'star' : 'star-outline'}
          size={size}
          color={s <= count ? '#f59e0b' : colors.textMuted}
        />
      ))}
    </View>
  );

  const userDisplayName = currentUser?.displayName || currentUser?.username || 'Músico';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── CABEÇALHO COM TÍTULO "EXPLORAR" (SEM SUBTEXTO) E AVATAR ── */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <View style={styles.webContainer}>
          <View style={styles.headerTopRow}>
            {/* Logo e Título "Social" */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.networkIconCircle, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name="globe-outline" size={22} color={colors.primary} />
              </View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>{t('socialTab') || 'Social'}</Text>
            </View>

            {/* Ação da Direita: Botão Unificado com Avatar + "Perfil" */}
            <Pressable
              onPress={onOpenProfile}
              style={({ pressed }) => [
                styles.unifiedProfileBtn,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                  borderColor: isDark ? 'rgba(255,255,255,0.12)' : colors.border,
                  opacity: pressed ? 0.8 : 1
                }
              ]}
              accessibilityLabel={t('accessMyProfileAccessibility') || "Acessar meu perfil pessoal"}
            >
              <View style={styles.unifiedAvatarBox}>
                {userProfileImage ? (
                  <Image source={{ uri: userProfileImage }} style={styles.unifiedAvatarImg} />
                ) : (
                  <View style={[styles.unifiedAvatarPlaceholder, { backgroundColor: colors.primary }]}>
                    <Text style={styles.unifiedAvatarInitial}>
                      {userDisplayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={[styles.statusDotSmall, { backgroundColor: '#10b981', borderColor: colors.cardBackground }]} />
              </View>
              <Text style={[styles.unifiedProfileText, { color: colors.text }]}>Perfil</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={{ marginLeft: 2 }} />
            </Pressable>
          </View>

          {/* BARRA DE PESQUISA (SEM PLACEHOLDERS) */}
          <View style={[styles.searchContainer, { backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : '#f1f5f9', borderColor: colors.border }]}>
            <Ionicons name="search" size={17} color={colors.textMuted} style={{ marginLeft: 4 }} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoComplete="off"
              maxLength={100}
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>

          {/* FILTRO DE LOCALIDADE EM 3 CAMPOS: CIDADE, UF (2 LETRAS), PAÍS */}
          <View style={styles.locationFilterRow}>
            {/* 1. Cidade */}
            <View
              style={[
                styles.locationInputBox,
                {
                  flex: 1.8,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  borderColor: filterCity ? colors.primary : colors.border
                }
              ]}
            >
              <Ionicons
                name="location-outline"
                size={14}
                color={filterCity ? colors.primary : colors.textMuted}
                style={{ marginRight: 4 }}
              />
              <TextInput
                style={[styles.locationTextInput, { color: colors.text }]}
                value={filterCity}
                onChangeText={setFilterCity}
                placeholder={t('cityPlaceholder') || 'Cidade'}
                placeholderTextColor={colors.textMuted}
                autoComplete="off"
                maxLength={60}
              />
              {filterCity ? (
                <Pressable onPress={() => setFilterCity('')} hitSlop={6}>
                  <Ionicons name="close-circle" size={14} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>

            {/* 2. UF (2 letras) */}
            <View
              style={[
                styles.locationInputBox,
                {
                  width: 58,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  borderColor: filterState ? colors.primary : colors.border,
                  justifyContent: 'center',
                  paddingHorizontal: 6
                }
              ]}
            >
              <TextInput
                style={[styles.locationTextInput, { color: colors.text, textAlign: 'center', fontWeight: '700' }]}
                value={filterState}
                onChangeText={(val) => setFilterState(val.toUpperCase())}
                placeholder="UF"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                autoComplete="off"
                maxLength={2}
              />
              {filterState ? (
                <Pressable onPress={() => setFilterState('')} hitSlop={4}>
                  <Ionicons name="close-circle" size={12} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>

            {/* 3. País */}
            <View
              style={[
                styles.locationInputBox,
                {
                  flex: 1.3,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  borderColor: filterCountry ? colors.primary : colors.border
                }
              ]}
            >
              <TextInput
                style={[styles.locationTextInput, { color: colors.text }]}
                value={filterCountry}
                onChangeText={setFilterCountry}
                placeholder={t('countryPlaceholder') || 'País'}
                placeholderTextColor={colors.textMuted}
                autoComplete="off"
                maxLength={40}
              />
              {filterCountry ? (
                <Pressable onPress={() => setFilterCountry('')} hitSlop={6}>
                  <Ionicons name="close-circle" size={14} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>

            {/* Botão limpar todos os 3 campos */}
            {(filterCity || filterState || filterCountry) ? (
              <Pressable
                onPress={() => {
                  setFilterCity('');
                  setFilterState('');
                  setFilterCountry('');
                }}
                style={({ pressed }) => [
                  styles.clearLocationBtn,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', opacity: pressed ? 0.7 : 1 }
                ]}
                hitSlop={6}
                title="Limpar filtros de localidade"
              >
                <Ionicons name="trash-outline" size={15} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>

          {/* BOTÕES COM ÍCONES: USUÁRIOS | ANÚNCIOS | BANDAS */}
          <View style={styles.tabButtonsContainer}>
            {/* Botão Usuários */}
            <Pressable
              style={({ pressed }) => [
                styles.tabButton,
                subTab === 'musicians'
                  ? [styles.tabButtonActive, { backgroundColor: colors.primary, borderColor: colors.primary }]
                  : [styles.tabButtonInactive, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: colors.border }],
                pressed && { opacity: 0.85 }
              ]}
              onPress={() => setSubTab('musicians')}
            >
              <Ionicons
                name={subTab === 'musicians' ? 'people' : 'people-outline'}
                size={17}
                color={subTab === 'musicians' ? '#ffffff' : colors.textMuted}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  {
                    color: subTab === 'musicians' ? '#ffffff' : colors.text,
                    fontWeight: subTab === 'musicians' ? '700' : '600'
                  }
                ]}
                numberOfLines={1}
              >
                {t('usersTab') || t('musicians') || 'Usuários'}
              </Text>
              <View
                style={[
                  styles.tabButtonBadge,
                  {
                    backgroundColor: subTab === 'musicians'
                      ? 'rgba(255,255,255,0.25)'
                      : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)')
                  }
                ]}
              >
                <Text
                  style={[
                    styles.tabButtonBadgeText,
                    { color: subTab === 'musicians' ? '#ffffff' : colors.textMuted }
                  ]}
                >
                  {displayedMusicians.length}
                </Text>
              </View>
            </Pressable>

            {/* Botão Anúncios */}
            <Pressable
              style={({ pressed }) => [
                styles.tabButton,
                subTab === 'projects'
                  ? [styles.tabButtonActive, { backgroundColor: colors.primary, borderColor: colors.primary }]
                  : [styles.tabButtonInactive, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: colors.border }],
                pressed && { opacity: 0.85 }
              ]}
              onPress={() => setSubTab('projects')}
            >
              <Ionicons
                name={subTab === 'projects' ? 'megaphone' : 'megaphone-outline'}
                size={17}
                color={subTab === 'projects' ? '#ffffff' : colors.textMuted}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  {
                    color: subTab === 'projects' ? '#ffffff' : colors.text,
                    fontWeight: subTab === 'projects' ? '700' : '600'
                  }
                ]}
                numberOfLines={1}
              >
                {t('announcements') || 'Anúncios'}
              </Text>
              <View
                style={[
                  styles.tabButtonBadge,
                  {
                    backgroundColor: subTab === 'projects'
                      ? 'rgba(255,255,255,0.25)'
                      : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)')
                  }
                ]}
              >
                <Text
                  style={[
                    styles.tabButtonBadgeText,
                    { color: subTab === 'projects' ? '#ffffff' : colors.textMuted }
                  ]}
                >
                  {filteredProjects.length}
                </Text>
              </View>
            </Pressable>

            {/* Botão Bandas */}
            <Pressable
              style={({ pressed }) => [
                styles.tabButton,
                subTab === 'bands'
                  ? [styles.tabButtonActive, { backgroundColor: colors.primary, borderColor: colors.primary }]
                  : [styles.tabButtonInactive, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: colors.border }],
                pressed && { opacity: 0.85 }
              ]}
              onPress={() => setSubTab('bands')}
            >
              <Ionicons
                name={subTab === 'bands' ? 'musical-notes' : 'musical-notes-outline'}
                size={17}
                color={subTab === 'bands' ? '#ffffff' : colors.textMuted}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  {
                    color: subTab === 'bands' ? '#ffffff' : colors.text,
                    fontWeight: subTab === 'bands' ? '700' : '600'
                  }
                ]}
                numberOfLines={1}
              >
                {t('bandsTab') || 'Bandas'}
              </Text>
              <View
                style={[
                  styles.tabButtonBadge,
                  {
                    backgroundColor: subTab === 'bands'
                      ? 'rgba(255,255,255,0.25)'
                      : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)')
                  }
                ]}
              >
                <Text
                  style={[
                    styles.tabButtonBadgeText,
                    { color: subTab === 'bands' ? '#ffffff' : colors.textMuted }
                  ]}
                >
                  {filteredBands.length}
                </Text>
              </View>
            </Pressable>

            {/* Botão Classificados */}
            <Pressable
              style={({ pressed }) => [
                styles.tabButton,
                subTab === 'classifieds'
                  ? [styles.tabButtonActive, { backgroundColor: colors.primary, borderColor: colors.primary }]
                  : [styles.tabButtonInactive, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: colors.border }],
                pressed && { opacity: 0.85 }
              ]}
              onPress={() => setSubTab('classifieds')}
            >
              <Ionicons
                name={subTab === 'classifieds' ? 'pricetag' : 'pricetag-outline'}
                size={16}
                color={subTab === 'classifieds' ? '#ffffff' : colors.textMuted}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  {
                    color: subTab === 'classifieds' ? '#ffffff' : colors.text,
                    fontWeight: subTab === 'classifieds' ? '700' : '600'
                  }
                ]}
                numberOfLines={1}
              >
                {t('classifieds') || 'Classificados'}
              </Text>
              <View
                style={[
                  styles.tabButtonBadge,
                  {
                    backgroundColor: subTab === 'classifieds'
                      ? 'rgba(255,255,255,0.25)'
                      : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)')
                  }
                ]}
              >
                <Text
                  style={[
                    styles.tabButtonBadgeText,
                    { color: subTab === 'classifieds' ? '#ffffff' : colors.textMuted }
                  ]}
                >
                  {filteredClassifieds.length}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      </View>

      {/* ── CONTEÚDO PRINCIPAL (SCROLLVIEW) ── */}
      <ScrollView 
        ref={mainScrollRef} 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[colors.primary]} 
            tintColor={colors.primary} 
          />
        }
      >
        <View style={styles.webContainer}>
          {subTab === 'projects' ? (
          /* ── FEED DE ANÚNCIOS ── */
          <View>
            {/* BOTÃO PUBLICAR ANÚNCIO (NA PRIMEIRA LINHA DA ABA DE ANÚNCIOS) */}
            <Pressable
              style={({ pressed }) => [
                styles.postAdTopBanner,
                { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }
              ]}
              onPress={openNewProjectModal}
            >
              <View style={styles.postAdTopBannerIcon}>
                <Ionicons name="add" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.postAdTopBannerTitle}>
                  {t('createAnnouncement') || 'Publicar Anúncio'}
                </Text>
                <Text style={styles.postAdTopBannerSubtitle}>
                  Procurando músicos ou divulgando sua banda? Anuncie aqui
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
            </Pressable>

            {filteredProjects.length === 0 ? (
              <View style={[styles.emptyContainer, { backgroundColor: colors.cardBackground, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]}>
                <Ionicons name="search-outline" size={40} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {t('noAnnouncementsFound') || 'Nenhum anúncio encontrado.'}
                </Text>
                <Pressable
                  style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                  onPress={openNewProjectModal}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('createAnnouncement') || 'Criar Anúncio'}</Text>
                </Pressable>
              </View>
            ) : (
              paginatedProjects.map(proj => {
                const isMyProject = Boolean(
                  (currentUser?.id && proj.creatorId && String(proj.creatorId) === String(currentUser.id)) ||
                  (currentUser?.username && proj.creatorUsername && proj.creatorUsername.toLowerCase() === currentUser.username.toLowerCase()) ||
                  (!proj.cloudId && (proj.creatorId === 'me' || proj.creatorId === currentUserId))
                );
                const hasApplicants = (proj.applicants || []).length > 0;
                const projOptions = proj.options || [
                  proj.isCover === 1 ? 'Cover' : null,
                  proj.isAutoral === 1 ? 'Autoral' : null,
                  proj.objective || null
                ].filter(Boolean);
                const secColor = (colors.secondary && colors.secondary !== colors.primary) ? colors.secondary : '#8b5cf6';

                return (
                  <View
                    key={proj.id}
                    style={[
                      styles.projectCard,
                      {
                        backgroundColor: colors.cardBackground,
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
                      }
                    ]}
                  >
                    {/* Topo do Card: Logo (3 linhas) + [Nome, Local - Data, Procura:] */}
                    <View style={styles.projectCardTop}>
                      {/* Círculo do Logo da Banda - Clicável para abrir página pública da banda */}
                      <Pressable
                        style={({ pressed }) => [
                          styles.bandLogoCircle,
                          {
                            backgroundColor: colors.primary + '18',
                            borderColor: colors.primary + '35',
                            transform: [{ scale: pressed ? 0.95 : 1 }]
                          }
                        ]}
                        onPress={() => handleOpenBandProfile(proj)}
                        hitSlop={6}
                        accessibilityLabel={`Ver página pública da banda ${proj.bandName}`}
                      >
                        {proj.imageUri || proj.logo ? (
                          <Image source={{ uri: proj.imageUri || proj.logo }} style={styles.bandLogoImg} />
                        ) : (
                          <Text style={[styles.bandLogoInitial, { color: colors.primary }]}>
                            {getBandInitials(proj.bandName)}
                          </Text>
                        )}
                      </Pressable>

                      {/* 3 Linhas de Informações */}
                      <View style={{ flex: 1, justifyContent: 'space-between', minHeight: 58 }}>
                        {/* Linha 1: Nome da Banda (também clicável) */}
                        <Pressable onPress={() => handleOpenBandProfile(proj)}>
                          <Text style={[styles.projectBandName, { color: colors.text }]} numberOfLines={1}>
                            {proj.bandName}
                          </Text>
                        </Pressable>

                        {/* Linha 2: Local • Data */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3.5 }}>
                          {(proj.city || proj.state) ? (
                            <>
                              <Ionicons name="location-outline" size={11.5} color={colors.textMuted} />
                              <Text style={[styles.projectMetaText, { color: colors.textMuted }]} numberOfLines={1}>
                                {[proj.city, proj.state].filter(Boolean).join(', ')}
                              </Text>
                              <Text style={{ color: colors.textMuted, fontSize: 10, opacity: 0.5, marginHorizontal: 2 }}>•</Text>
                            </>
                          ) : null}
                          <Text style={[styles.projectMetaText, { color: colors.textMuted }]} numberOfLines={1}>
                            {formatRelativeTime(proj.createdAt)}
                          </Text>
                        </View>

                        {/* Linha 3: Procura: [Instrumento] em Pílula de Alto Destaque */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                          <View style={[styles.soughtRolePill, { backgroundColor: colors.primary + '16', borderColor: colors.primary + '35' }]}>
                            <Ionicons name="search" size={11} color={colors.primary} />
                            <Text style={[styles.soughtRoleText, { color: colors.primary }]} numberOfLines={1}>
                              {t('soughtRolePrefix') || 'Procura:'} <Text style={{ fontWeight: '900' }}>{proj.soughtRole}</Text>
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Tags agrupadas na mesma linha: Interesses (cor primária) e Estilos (cor secundária sem hashtag) */}
                    <View style={styles.tagsContainer}>
                      {projOptions.map((opt, oIdx) => (
                        <View
                          key={'opt-' + oIdx}
                          style={[
                            styles.tagPill,
                            {
                              backgroundColor: colors.primary + '15',
                              borderColor: colors.primary + '30',
                            }
                          ]}
                        >
                          <Text style={[styles.tagPillText, { color: colors.primary }]}>
                            {getProposalLabel(opt)}
                          </Text>
                        </View>
                      ))}

                      {(proj.genres || []).map((g, idx) => {
                        const cleanGenre = String(g).replace(/^#+/, '');
                        return (
                          <View
                            key={'genre-' + idx}
                            style={[
                              styles.genrePill,
                              {
                                backgroundColor: secColor + '15',
                                borderColor: secColor + '30',
                              }
                            ]}
                          >
                            <Text style={[styles.genrePillText, { color: secColor }]}>
                              {cleanGenre}
                            </Text>
                          </View>
                        );
                      })}
                    </View>

                    {/* Descrição */}
                    {proj.description ? (
                      <Text style={[styles.projectDesc, { color: isDark ? 'rgba(255,255,255,0.85)' : '#334155' }]}>
                        {proj.description}
                      </Text>
                    ) : null}

                    {/* Rodapé do Card: Criador - Botão de Interesse */}
                    <View style={[styles.cardFooter, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                      {/* Criador clicável (abre perfil público do usuário) */}
                      <Pressable
                        style={({ pressed }) => [
                          styles.cardCreatorRow,
                          { opacity: pressed ? 0.7 : 1 }
                        ]}
                        onPress={() => {
                          const usernameToOpen = isMyProject ? (currentUser?.username || 'me') : (proj.creatorUsername || proj.creatorName);
                          const nameToOpen = isMyProject ? (currentUser?.displayName || currentUser?.username || 'Você') : (proj.creatorName || 'Músico');
                          handleOpenMusicianProfile({ username: usernameToOpen, name: nameToOpen });
                        }}
                        hitSlop={8}
                        accessibilityLabel={t('viewCreatorProfileAccessibility') || "Ver perfil do criador"}
                      >
                        <View style={[styles.creatorAvatarMini, { backgroundColor: colors.primary + '18' }]}>
                          <Ionicons
                            name={isMyProject ? "person" : "person-outline"}
                            size={12}
                            color={colors.primary}
                          />
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 1 }}>
                          <Text
                            style={[styles.creatorText, { color: colors.text, fontWeight: '700' }]}
                            numberOfLines={1}
                          >
                            {isMyProject ? (t('youBadge') || 'Você') : (proj.creatorName || (proj.creatorUsername ? `@${proj.creatorUsername}` : (t('musicianFallback') || 'Músico')))}
                          </Text>
                          {!isMyProject && proj.creatorUsername && proj.creatorUsername !== proj.creatorName ? (
                            <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '500' }}>
                              @{proj.creatorUsername.replace(/^@+/, '')}
                            </Text>
                          ) : null}
                        </View>
                      </Pressable>

                      {/* Botão de Interesse / Ações do Criador (à direita) */}
                      {isMyProject ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          {/* Botão de Escanear Candidatos: Somente uma Lupa */}
                          <Pressable
                            style={({ pressed }) => [
                              styles.creatorActionBtn,
                              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }
                            ]}
                            onPress={() => handleOpenScanner(proj)}
                            accessibilityLabel={t('searchCandidatesAccessibility') || "Escanear candidatos"}
                          >
                            <Ionicons name="search" size={16} color="#fff" />
                          </Pressable>

                          {/* Botão de Editar o Anúncio Criado */}
                          <Pressable
                            style={({ pressed }) => [
                              styles.creatorActionBtn,
                              {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                borderColor: colors.border,
                                borderWidth: 1,
                                opacity: pressed ? 0.8 : 1
                              }
                            ]}
                            onPress={() => openEditProjectModal(proj)}
                            accessibilityLabel={t('editAnnouncementAccessibility') || "Editar anúncio"}
                          >
                            <Ionicons name="create-outline" size={16} color={colors.text} />
                          </Pressable>

                          {/* Candidatos Inscritos */}
                          <Pressable
                            style={({ pressed }) => [
                              styles.applicantsBtn,
                              {
                                backgroundColor: hasApplicants ? colors.primary + '18' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                                borderColor: hasApplicants ? colors.primary : colors.border,
                                opacity: pressed ? 0.8 : 1
                              }
                            ]}
                            onPress={() => handleOpenApplicants(proj)}
                            accessibilityLabel={t('viewApplicantsAccessibility') || "Ver candidatos inscritos"}
                          >
                            <Ionicons name="people" size={14} color={hasApplicants ? colors.primary : colors.textMuted} />
                            <Text style={{ fontSize: 12, fontWeight: '700', color: hasApplicants ? colors.primary : colors.textMuted }}>
                              {(proj.applicants || []).length}
                            </Text>
                          </Pressable>

                          {/* Excluir Anúncio */}
                          <Pressable
                            style={({ pressed }) => [
                              styles.creatorActionBtn,
                              {
                                backgroundColor: (colors.danger || '#ef4444') + '15',
                                borderColor: (colors.danger || '#ef4444') + '30',
                                borderWidth: 1,
                                opacity: pressed ? 0.8 : 1
                              }
                            ]}
                            onPress={() => handleDeleteProject(proj.id)}
                            accessibilityLabel={t('deleteAnnouncementAccessibility') || "Excluir anúncio"}
                          >
                            <Ionicons name="trash-outline" size={16} color={colors.danger || '#ef4444'} />
                          </Pressable>
                        </View>
                      ) : (
                        <Pressable
                          style={({ pressed }) => [
                            styles.interestActionBtn,
                            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }
                          ]}
                          onPress={() => handleOpenInterest(proj)}
                        >
                          <Ionicons name="hand-right-outline" size={15} color="#fff" />
                          <Text style={styles.interestActionText}>{t('haveInterest') || 'Tenho Interesse'}</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })
            )}
            {renderPagination(projectsPage, totalProjectsPages, filteredProjects.length, setProjectsPage)}
          </View>
        ) : subTab === 'bands' ? (
          /* ── FEED DE BANDAS VISÍVEIS ── */
          <View>
            {filteredBands.length === 0 ? (
              <View style={[styles.emptyContainer, { backgroundColor: colors.cardBackground, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]}>
                <Ionicons name="musical-notes-outline" size={40} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {(filterCity || filterState || filterCountry)
                    ? (t('noBandsInCity') || 'Nenhuma banda encontrada em {city}.').replace('{city}', [filterCity, filterState, filterCountry].filter(Boolean).join(', '))
                    : (t('noBandsFound') || 'Nenhuma banda encontrada.')}
                </Text>
                {(filterCity || filterState || filterCountry) ? (
                  <Pressable
                    style={[styles.emptyBtn, { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: 6 }]}
                    onPress={() => { setFilterCity(''); setFilterState(''); setFilterCountry(''); }}
                  >
                    <Ionicons name="globe-outline" size={15} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                      {t('allCities') || 'Ver todas as cidades'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
            paginatedBands.map(band => {
                const isMyBand = !!band.isMyBand;
                const genres = Array.isArray(band.genres) ? band.genres : [];
                const rawObjectives = Array.isArray(band.options) && band.options.length > 0
                  ? band.options
                  : (band.isCover || band.isAutoral
                      ? [band.isCover && 'Cover', band.isAutoral && 'Autoral'].filter(Boolean)
                      : ['Cover']);
                const objectives = rawObjectives.map(o => getProposalLabel(o)).filter(Boolean);
                const secColor = (colors.secondary && colors.secondary !== colors.primary) ? colors.secondary : '#8b5cf6';

                return (
                  <Pressable
                    key={band.id || band.name}
                    onPress={() => handleOpenBandProfile(band)}
                    style={({ pressed }) => [
                      styles.projectCard,
                      {
                        backgroundColor: colors.cardBackground,
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
                        opacity: pressed ? 0.92 : 1,
                      }
                    ]}
                  >
                    {/* Topo do Card: Logo + Informações (Nome & Cidade) */}
                    <View style={[styles.projectCardTop, { marginBottom: (objectives.length > 0 || genres.length > 0) ? 10 : 0 }]}>
                      {/* Círculo do Logo da Banda */}
                      <View
                        style={[
                          styles.bandLogoCircle,
                          {
                            backgroundColor: colors.primary + '18',
                            borderColor: colors.primary + '35',
                          }
                        ]}
                      >
                        {band.imageUri ? (
                          <Image source={{ uri: band.imageUri }} style={styles.bandLogoImg} />
                        ) : (
                          <Text style={[styles.bandLogoInitial, { color: colors.primary }]}>
                            {getBandInitials(band.name || band.bandName)}
                          </Text>
                        )}
                      </View>

                      {/* Informações da Banda */}
                      <View style={{ flex: 1, justifyContent: 'center' }}>
                        {/* Linha 1: Nome da Banda + Badge Sua Banda */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={[styles.projectBandName, { color: colors.text }]} numberOfLines={1}>
                            {band.name || band.bandName}
                          </Text>
                          {isMyBand && (
                            <View style={[styles.meBadge, { backgroundColor: colors.primary + '18' }]}>
                              <Text style={[styles.meBadgeText, { color: colors.primary }]}>{t('myBandBadge') || 'Sua Banda'}</Text>
                            </View>
                          )}
                        </View>

                        {/* Linha 2: Cidade */}
                        {(band.city || band.state) ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                            <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                            <Text style={[styles.projectMetaText, { color: colors.textMuted }]} numberOfLines={1}>
                              {[band.city, band.state].filter(Boolean).join(', ')}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    {/* Tags de Objetivo e Estilo */}
                    {(objectives.length > 0 || genres.length > 0) && (
                      <View style={[styles.tagsContainer, { marginBottom: 0 }]}>
                        {/* Tags de Objetivo (Cover, Autoral, Profissional, etc.) */}
                        {objectives.map((obj, idx) => (
                          <View
                            key={'obj-' + idx}
                            style={[
                              styles.objectivePill,
                              {
                                backgroundColor: colors.primary + '16',
                                borderColor: colors.primary + '35',
                              }
                            ]}
                          >
                            <Text style={[styles.objectivePillText, { color: colors.primary }]}>
                              {obj}
                            </Text>
                          </View>
                        ))}

                        {/* Tags de Estilo/Gêneros */}
                        {genres.map((g, idx) => {
                          const cleanGenre = String(g).replace(/^#+/, '');
                          return (
                            <View
                              key={'genre-' + idx}
                              style={[
                                styles.genrePill,
                                {
                                  backgroundColor: secColor + '15',
                                  borderColor: secColor + '30',
                                }
                              ]}
                            >
                              <Text style={[styles.genrePillText, { color: secColor }]}>
                                {cleanGenre}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </Pressable>
                );
              })
            )}
            {renderPagination(bandsPage, totalBandsPages, filteredBands.length, setBandsPage)}
          </View>
        ) : subTab === 'classifieds' ? (
          /* ── FEED DE CLASSIFICADOS (EQUIPAMENTOS NEGOCIÁVEIS) ── */
          <View>
            {filteredClassifieds.length === 0 ? (
              <View style={[styles.emptyContainer, { backgroundColor: colors.cardBackground, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]}>
                <Ionicons name="pricetag-outline" size={40} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {t('noClassifiedsFound') || 'Nenhum equipamento classificado encontrado.'}
                </Text>
                <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 4, maxWidth: 320 }}>
                  {t('noClassifiedsSub') || 'Os equipamentos marcados como negociáveis pelos músicos aparecerão aqui.'}
                </Text>
              </View>
            ) : (
              paginatedClassifieds.map(item => {
                const formattedPrice = item.price && String(item.price).trim()
                  ? (String(item.price).trim().startsWith('$') || String(item.price).trim().startsWith('R$') ? String(item.price).trim() : `$ ${String(item.price).trim()}`)
                  : (t('negotiable') || 'Negociável');
                const cleanUsername = (item.username || '').replace(/^@+/, '');

                return (
                  <View
                    key={'gear-' + item.id}
                    style={[
                      styles.classifiedCard,
                      {
                        backgroundColor: colors.cardBackground,
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
                      }
                    ]}
                  >
                    {/* 1. Pílula do tipo + 2. Preço */}
                    <View style={styles.classifiedTopRow}>
                      {/* 1. Pílula do tipo */}
                      <View style={[styles.classifiedCategoryPill, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '35' }]}>
                        <Text style={[styles.classifiedCategoryText, { color: colors.primary }]} numberOfLines={1}>
                          {item.category || 'Equipamento'}
                        </Text>
                      </View>

                      {/* 2. Preço */}
                      <Text style={styles.classifiedPriceText}>
                        {formattedPrice}
                      </Text>
                    </View>

                    {/* 3. Nome do equipamento */}
                    <Text style={[styles.classifiedNameText, { color: colors.text }]} numberOfLines={2}>
                      {item.name}
                    </Text>

                    {/* 4. Descrição se houver */}
                    {item.description ? (
                      <Text style={[styles.classifiedDescText, { color: colors.textMuted }]}>
                        {item.description}
                      </Text>
                    ) : null}

                    {/* 5. Username clicável (sem avatar e sem localização) */}
                    <Pressable
                      onPress={() => handleOpenMusicianProfile({ username: cleanUsername, name: cleanUsername })}
                      style={({ pressed }) => [
                        styles.classifiedUserRow,
                        { opacity: pressed ? 0.7 : 1 }
                      ]}
                      hitSlop={8}
                    >
                      <Text style={[styles.classifiedUsernameText, { color: colors.primary }]}>
                        @{cleanUsername}
                      </Text>
                    </Pressable>
                  </View>
                );
              })
            )}
            {renderPagination(classifiedsPage, totalClassifiedsPages, filteredClassifieds.length, setClassifiedsPage)}
          </View>
        ) : isScanningCandidates ? (
          /* ── TELA DE LOADING COM LUPA ANIMADA PROCURANDO CANDIDATOS ── */
          <View style={styles.scanningContainer}>
            <View style={styles.radarWrapper}>
              <Animated.View
                style={[
                  styles.radarPulseRing,
                  {
                    borderColor: colors.primary,
                    transform: [{ scale: pulseAnim }],
                    opacity: pulseAnim.interpolate({
                      inputRange: [0.95, 1.18],
                      outputRange: [0.65, 0.15],
                    }),
                  }
                ]}
              />
              <Animated.View
                style={[
                  styles.radarPulseRingOuter,
                  {
                    borderColor: colors.primary,
                    transform: [{ scale: pulseAnim }],
                    opacity: pulseAnim.interpolate({
                      inputRange: [0.95, 1.18],
                      outputRange: [0.4, 0.05],
                    }),
                  }
                ]}
              />

              <Animated.View
                style={[
                  styles.animatedLupaCircle,
                  {
                    backgroundColor: colors.primary + '18',
                    borderColor: colors.primary,
                    transform: [
                      { translateX: scanTranslateX },
                      { translateY: scanTranslateY },
                      { rotate: scanRotate },
                      { scale: pulseAnim },
                    ],
                  }
                ]}
              >
                <Ionicons name="search" size={38} color={colors.primary} />
              </Animated.View>
            </View>

            <Text style={[styles.scanningTitle, { color: colors.text }]}>
              {t('scanningIdealCandidates') || 'Buscando candidatos ideais...'}
            </Text>
            <Text style={[styles.scanningSubtitle, { color: colors.textMuted }]}>
              {selectedScanProject
                ? (t('scanningSubForBand') || 'Analisando músicos para {band} ({role})')
                    .replace('{band}', selectedScanProject.bandName || selectedScanProject.name || 'Banda')
                    .replace('{role}', selectedScanProject.soughtRole || 'Vaga')
                : (t('scanningCompat') || 'Escaneando compatibilidade por instrumentos e estilos...')}
            </Text>

            <View style={[styles.scanProgressBarTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
              <Animated.View
                style={[
                  styles.scanProgressBarFill,
                  {
                    backgroundColor: colors.primary,
                    width: pulseAnim.interpolate({
                      inputRange: [0.95, 1.18],
                      outputRange: ['35%', '88%'],
                    }),
                  }
                ]}
              />
            </View>
          </View>
        ) : (
          /* ── FEED DE MÚSICOS (OU RESULTADOS ESCANEADOS) ── */
          <View>
            {/* Banner de candidatos do anúncio escaneado */}
            {selectedScanProject && (
              <View style={[styles.filterBanner, { backgroundColor: colors.cardBackground, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={[styles.filterBannerTitle, { color: colors.text }]} numberOfLines={1}>
                    {(t('candidatesOf') || 'Candidatos {band}').replace('{band}', selectedScanProject.bandName || selectedScanProject.name || 'Banda')}
                  </Text>
                  <Text style={[styles.filterBannerSubtitle, { color: colors.primary }]} numberOfLines={1}>
                    {selectedScanProject.soughtRole || ''}
                  </Text>
                </View>

                {/* Botão circular com X de fechar para voltar para todos */}
                <Pressable
                  style={({ pressed }) => [
                    styles.circularCloseBtn,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                      opacity: pressed ? 0.7 : 1
                    }
                  ]}
                  onPress={() => setSelectedScanProject(null)}
                  hitSlop={8}
                  accessibilityLabel="Voltar para todos os músicos"
                >
                  <Ionicons name="close" size={18} color={colors.text} />
                </Pressable>
              </View>
            )}

            {displayedMusicians.length === 0 ? (
              <View style={[styles.emptyContainer, { backgroundColor: colors.cardBackground, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]}>
                <Ionicons name="people-outline" size={40} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {selectedScanProject
                    ? 'Nenhum candidato compatível encontrado para este anúncio.'
                    : 'Nenhum músico encontrado.'}
                </Text>
                {selectedScanProject && (
                  <Pressable
                    style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                    onPress={() => setSelectedScanProject(null)}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('viewAllMusicians') || 'Ver Todos os Músicos'}</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              paginatedMusicians.map(m => {
                const locationParts = [m.city, m.state, m.country].filter(Boolean);
                const locationStr = locationParts.length > 0 ? locationParts.join(', ') : '';

                const skillList = [];
                const rawInsts = m.primaryInstruments || (m.primaryInstrument ? [m.primaryInstrument] : []);
                (Array.isArray(rawInsts) ? rawInsts : [rawInsts]).forEach(i => {
                  const name = typeof i === 'object' && i !== null ? (i.name || i.instrument) : String(i || '');
                  const stars = typeof i === 'object' && i !== null ? Number(i.stars || i.level || 5) : 5;
                  if (name && !skillList.some(s => s.name === name)) {
                    skillList.push({ name, stars });
                  }
                });
                if (Array.isArray(m.influences)) {
                  m.influences.forEach(inf => {
                    const infName = typeof inf === 'string' ? inf.replace(/^#+/, '').trim() : (inf?.name || inf?.tag || '');
                    if (infName && !skillList.some(s => s.name === infName)) {
                      skillList.push({ name: infName, stars: 5 });
                    }
                  });
                }

                const isAvail = m.availability !== 'Indisponível' && String(m.availability).toLowerCase() !== 'unavailable';

                return (
                  <Pressable
                    key={m.id}
                    onPress={() => handleOpenMusicianProfile(m)}
                    style={({ pressed }) => [
                      styles.userCardWrapper,
                      { opacity: pressed ? 0.94 : 1 }
                    ]}
                  >
                    <View
                      style={[
                        styles.userCardBody,
                        {
                          backgroundColor: colors.cardBackground,
                          borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
                        }
                      ]}
                    >
                      {/* Floating Header: Nome de exibição (Sem badge redundante) */}
                      <View style={styles.userCardFloatingHeader}>
                        <Text style={[styles.userDisplayNameText, { color: colors.text }]} numberOfLines={1}>
                          {m.name || m.displayName || m.username || 'Músico'}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          {m.isMe ? (
                            <View style={[styles.meBadge, { backgroundColor: colors.primary + '20' }]}>
                              <Text style={[styles.meBadgeText, { color: colors.primary }]}>{t('youBadge') || 'Você'}</Text>
                            </View>
                          ) : null}
                          {m.matchScore ? (
                            <View
                              style={[
                                styles.matchScoreBadge,
                                {
                                  backgroundColor: m.matchScore >= 80 ? '#10b981' : colors.primary,
                                  borderColor: colors.cardBackground,
                                }
                              ]}
                            >
                              <Ionicons name="sparkles" size={9} color="#fff" />
                              <Text style={styles.matchScoreBadgeText}>{m.matchScore}%</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>

                      {/* Floating Avatar (Protruding above and to the left of the card) */}
                      <View style={styles.userAvatarFloatingCol}>
                        <View
                          style={[
                            styles.userAvatarCircle,
                            {
                              backgroundColor: colors.primary,
                              borderColor: colors.cardBackground,
                            }
                          ]}
                        >
                          {m.imageUri ? (
                            <Image source={{ uri: m.imageUri }} style={styles.userAvatarImg} />
                          ) : (
                            <Text style={styles.userAvatarLetter}>
                              {(m.name || m.username || 'M').charAt(0).toUpperCase()}
                            </Text>
                          )}
                        </View>
                        {/* Status circle badge at bottom-left: Verde (Disponível) ou Vermelho (Indisponível) */}
                        <View
                          style={[
                            styles.userStatusGreenDot,
                            {
                              backgroundColor: isAvail ? '#10b981' : '#ef4444',
                              borderColor: colors.cardBackground
                            }
                          ]}
                        />
                      </View>

                      {/* Card Details on the Right */}
                      <View style={styles.userCardContent}>
                        {/* Line 1: username • idade • status icon */}
                        <View style={styles.userMetaRow}>
                          <Text style={[styles.userUsernameText, { color: colors.primary }]}>
                            @{m.username}
                          </Text>
                          {m.age ? (
                            <Text style={[styles.userAgeText, { color: colors.textMuted }]}>
                              {m.age} {t('yearsOld') || 'anos'}
                            </Text>
                          ) : null}
                          <Ionicons
                            name={isAvail ? "checkmark-circle" : "close-circle"}
                            size={14}
                            color={isAvail ? "#10b981" : "#ef4444"}
                          />
                        </View>

                        {/* Line 2: Cidade UF Pais */}
                        {locationStr ? (
                          <View style={styles.userLocationRow}>
                            <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                            <Text style={[styles.userLocationText, { color: colors.textMuted }]} numberOfLines={1}>
                              {locationStr}
                            </Text>
                          </View>
                        ) : null}

                        {/* Line 3: Pílulas de Habilidades com estrelas */}
                        {skillList.length > 0 && (
                          <View style={styles.userSkillsRow}>
                            {skillList.slice(0, 4).map((skill, sIdx) => (
                              <View
                                key={sIdx}
                                style={[
                                  styles.userSkillPill,
                                  {
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
                                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
                                  }
                                ]}
                              >
                                <Text style={[styles.userSkillPillText, { color: isDark ? 'rgba(255,255,255,0.9)' : colors.text }]} numberOfLines={1}>
                                  {skill.name}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 3 }}>
                                  {[...Array(Math.min(5, Math.max(1, skill.stars || 5)))].map((_, starI) => (
                                    <Ionicons key={starI} name="star" size={9} color="#fbbf24" style={{ marginLeft: 0.5 }} />
                                  ))}
                                </View>
                              </View>
                            ))}
                          </View>
                        )}

                        {/* Botão de Convidar ao escanear candidatos */}
                        {selectedScanProject && !m.isMe && (
                          <Pressable
                            style={({ pressed }) => [
                              styles.inviteCandidateCardBtn,
                              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }
                            ]}
                            onPress={() => handleOpenCandidateInviteModal(m, selectedScanProject)}
                          >
                            <Ionicons name="paper-plane" size={13} color="#fff" />
                            <Text style={styles.inviteCandidateCardText}>{t('inviteMusician') || 'Convidar Músico'}</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  </Pressable>
                );
              })
            )}
            {renderPagination(musiciansPage, totalMusiciansPages, displayedMusicians.length, setMusiciansPage)}
          </View>
        )}
        </View>
      </ScrollView>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL: NOVO ANÚNCIO DE PROJETO (BOTTOM SHEET) ── */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <Modal visible={showNewProjectModal} transparent animationType="slide" onRequestClose={() => setShowNewProjectModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowNewProjectModal(false)} />
          <View style={[styles.bottomSheetContent, { backgroundColor: colors.cardBackground, borderTopColor: colors.border, maxHeight: '92%' }]}>
            <View style={[styles.dragHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
            <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 14 }]}>
              {editingProjectId ? (t('editProjectTitle') || 'Editar Anúncio') : (t('newProjectTitle') || 'Anunciar Novo Projeto')}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {/* OPÇÃO DE VINCULAÇÃO A BANDA EXISTENTE */}
              {!editingProjectId && userBands.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={[styles.inputSubLabel, { color: colors.textMuted }]}>{t('linkToBand') || 'VINCULAR A UMA BANDA'}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                    <Pill
                      label={t('myBandOption') || "Banda Minha"}
                      selected={linkOption === 'existing'}
                      onPress={() => setLinkOption('existing')}
                      flex={1}
                    />
                    <Pill
                      label={t('newProjectOption') || "Novo Projeto"}
                      selected={linkOption === 'new'}
                      onPress={() => {
                        setLinkOption('new');
                        setFormBandName('');
                      }}
                      flex={1}
                    />
                  </View>

                  {linkOption === 'existing' && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      {userBands.map(b => (
                        <Pressable
                          key={b.id}
                          style={({ pressed }) => [
                            styles.bandSelectItem,
                            {
                              backgroundColor: selectedExistingBandId === b.id ? colors.primary + '18' : (isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9'),
                              borderColor: selectedExistingBandId === b.id ? colors.primary : colors.border,
                              opacity: pressed ? 0.8 : 1
                            }
                          ]}
                          onPress={() => handleSelectExistingBand(b)}
                        >
                          <Ionicons name="musical-notes" size={14} color={selectedExistingBandId === b.id ? colors.primary : colors.textMuted} />
                          <Text style={{ fontSize: 13, fontWeight: '700', color: selectedExistingBandId === b.id ? colors.primary : colors.text }}>
                            {b.name}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}

              {/* NOME DO PROJETO */}
              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.inputSubLabel, { color: colors.textMuted }]}>{t('projectNameLabel') || 'NOME DO PROJETO / BANDA'}</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9' }]}
                  value={formBandName}
                  onChangeText={setFormBandName}
                  editable={linkOption === 'new'}
                  autoComplete="off"
                  maxLength={100}
                />
              </View>

              {/* PROCURA-SE: CAMPO EM ABERTO SEM PÍLULAS */}
              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.inputSubLabel, { color: colors.textMuted }]}>{t('soughtRoleLabel') || 'PROCURA-SE'}</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9' }]}
                  value={formSoughtRole}
                  onChangeText={setFormSoughtRole}
                  autoComplete="off"
                  maxLength={200}
                />
              </View>

              {/* PROPOSTA & OBJETIVO: MÚLTIPLA SELEÇÃO ENTRE COVER, AUTORAL, HOBBIE, PROFISSIONAL, VER NO QUE DÁ */}
              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.inputSubLabel, { color: colors.textMuted }]}>{t('proposalObjectiveLabel') || 'PROPOSTA & OBJETIVO'}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                  {PROPOSAL_OPTIONS.map(opt => (
                    <Pill
                      key={opt}
                      label={getProposalLabel(opt)}
                      selected={formOptions.includes(opt)}
                      onPress={() => toggleFormOption(opt)}
                    />
                  ))}
                </View>
              </View>

              {/* LOCALIZAÇÃO (PAÍS, ESTADO, CIDADE) ABERTO */}
              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.inputSubLabel, { color: colors.textMuted }]}>{t('locationLabel') || 'LOCALIZAÇÃO'}</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                  <TextInput
                    style={[styles.input, { flex: 1.2, color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9', height: 44, minHeight: 44, paddingHorizontal: 10, fontSize: 13, marginBottom: 0 }]}
                    value={formCountry}
                    onChangeText={setFormCountry}
                    placeholder={t('countryPlaceholder') || 'País'}
                    placeholderTextColor={colors.textMuted}
                    maxLength={100}
                  />
                  <TextInput
                    style={[styles.input, { flex: 0.8, color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9', height: 44, minHeight: 44, paddingHorizontal: 10, fontSize: 13, marginBottom: 0 }]}
                    value={formState}
                    onChangeText={setFormState}
                    placeholder={t('statePlaceholder') || 'Estado (UF)'}
                    placeholderTextColor={colors.textMuted}
                    maxLength={100}
                    autoCapitalize="characters"
                  />
                </View>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9', height: 44, minHeight: 44, paddingHorizontal: 10, fontSize: 13, marginBottom: 0 }]}
                  value={formCity}
                  onChangeText={setFormCity}
                  placeholder={t('cityPlaceholder') || 'Cidade'}
                  placeholderTextColor={colors.textMuted}
                  autoComplete="off"
                  maxLength={100}
                />
              </View>

              {/* TAGS DE ESTILO (SEM HASHTAGS) */}
              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.inputSubLabel, { color: colors.textMuted }]}>{t('styleTagsLabel') || 'TAGS DE ESTILO (ATÉ 4)'}</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                  <TextInput
                    style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9', marginBottom: 0 }]}
                    value={formGenreInput}
                    onChangeText={setFormGenreInput}
                    autoComplete="off"
                    maxLength={200}
                  />
                  <Pressable
                    style={[styles.syncButton, { backgroundColor: colors.primary, paddingHorizontal: 16 }]}
                    onPress={handleAddGenre}
                  >
                    <Ionicons name="add" size={20} color="#fff" />
                  </Pressable>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {formGenres.map((g, idx) => (
                    <View key={idx} style={[styles.genrePillWithDelete, { backgroundColor: colors.primary + '18', borderColor: colors.primary }]}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>{String(g).replace(/^#+/, '')}</Text>
                      <Pressable onPress={() => handleRemoveGenre(idx)} hitSlop={6}>
                        <Ionicons name="close-circle" size={16} color={colors.primary} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>

              {/* DESCRIÇÃO / REQUISITOS */}
              <View style={{ marginBottom: 18 }}>
                <Text style={[styles.inputSubLabel, { color: colors.textMuted }]}>{t('projectDescLabel') || 'DESCRIÇÃO DA VAGA & PROJETO'}</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9', minHeight: 70 }]}
                  value={formDescription}
                  onChangeText={setFormDescription}
                  multiline
                  autoComplete="off"
                  maxLength={1000}
                />
              </View>

              {/* OPÇÃO DE ADICIONAR AUTOMATICAMENTE NA ABA BANDAS */}
              {!editingProjectId && linkOption === 'new' && (
                <Pressable
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}
                  onPress={() => setFormAddToBands(!formAddToBands)}
                >
                  <Ionicons
                    name={formAddToBands ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={formAddToBands ? colors.primary : colors.textMuted}
                  />
                  <Text style={{ fontSize: 13, color: colors.text, fontWeight: '600' }}>
                    {t('autoAddToBands') || 'Adicionar automaticamente na minha lista na aba Bandas'}
                  </Text>
                </Pressable>
              )}

              {/* BOTÕES */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Pressable
                  style={[styles.syncButton, { flex: 1, backgroundColor: isDark ? '#1e293b' : '#e5e7eb' }]}
                  onPress={() => setShowNewProjectModal(false)}
                >
                  <Text style={{ color: colors.text, fontWeight: 'bold' }}>{t('cancelBtn') || 'Cancelar'}</Text>
                </Pressable>
                <Pressable
                  style={[styles.syncButton, { flex: 1, backgroundColor: colors.primary }]}
                  onPress={handlePublishProject}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                    {editingProjectId ? (t('saveChangesBtn') || 'Salvar Alterações') : (t('publishAnnouncement') || 'Publicar Anúncio')}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL: ESCANEAR CANDIDATOS (PRIVADO DO CRIADOR) ── */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <Modal visible={showScanModal} transparent animationType="slide" onRequestClose={() => setShowScanModal(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowScanModal(false)} />
          <View style={[styles.bottomSheetContent, { backgroundColor: colors.cardBackground, borderTopColor: colors.border, maxHeight: '88%' }]}>
            <View style={[styles.dragHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <View style={[styles.networkIconCircle, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name="scan" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 0 }]}>
                  {t('compatibleCandidatesTitle') || 'Candidatos Compatíveis'}
                </Text>
                <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '700' }}>
                  {(selectedScanProject?.bandName || selectedScanProject?.name || 'Banda')} • {t('roleLabelColon') || 'Vaga:'} {selectedScanProject?.soughtRole || ''}
                </Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {scannedCandidates.map(cand => (
                <View
                  key={cand.id}
                  style={[
                    styles.scannedCandidateCard,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      borderColor: cand.matchScore >= 80 ? colors.primary + '66' : colors.border
                    }
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Pressable
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}
                      onPress={() => handleOpenMusicianProfile(cand)}
                    >
                      <View style={[styles.musicianAvatarSmall, { backgroundColor: colors.primary }]}>
                        <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>
                          {(cand.name || cand.username || 'M').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{cand.name}</Text>
                          <Ionicons name="globe-outline" size={12} color={colors.primary} />
                        </View>
                        <Text style={{ fontSize: 12, color: colors.textMuted }}>@{cand.username} • 📍 {cand.city}, {cand.state}</Text>
                      </View>
                    </Pressable>

                    {/* MATCH BADGE */}
                    <View style={[styles.matchBadge, { backgroundColor: cand.matchScore >= 80 ? '#10b98122' : colors.primary + '22' }]}>
                      <Ionicons name="flash" size={12} color={cand.matchScore >= 80 ? '#10b981' : colors.primary} />
                      <Text style={[styles.matchBadgeText, { color: cand.matchScore >= 80 ? '#10b981' : colors.primary }]}>
                        {cand.matchScore}% {t('matchScore') || 'Match'}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>
                      {cand.primaryInstrument}
                    </Text>
                    {renderStars(cand.stars, 12)}
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginLeft: 4 }}>
                      • {cand.availability}
                    </Text>
                  </View>

                  <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 18, marginBottom: 10 }}>
                    {cand.bio}
                  </Text>

                  {/* Ação: Convidar */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.inviteCandidateBtn,
                      { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }
                    ]}
                    onPress={() => handleOpenCandidateInviteModal(cand, selectedScanProject)}
                  >
                    <Ionicons name="paper-plane-outline" size={14} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{t('inviteToBand') || 'Convidar para a Banda'}</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL: VER INTERESSADOS (PARA O CRIADOR DO PROJETO) ── */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <Modal visible={showApplicantsModal} transparent animationType="slide" onRequestClose={() => setShowApplicantsModal(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowApplicantsModal(false)} />
          <View style={[styles.bottomSheetContent, { backgroundColor: colors.cardBackground, borderTopColor: colors.border, maxHeight: '80%' }]}>
            <View style={[styles.dragHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
            <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 14 }]}>
              {t('interestedMusiciansTitle') || 'Músicos Interessados'} ({selectedApplicantsProject?.applicants?.length || 0})
            </Text>

            {(selectedApplicantsProject?.applicants || []).length === 0 ? (
              <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                <Ionicons name="people-outline" size={44} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 8, fontStyle: 'italic' }}>
                  {t('noApplicantsYet') || 'Ainda não há candidaturas neste projeto.'}
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {selectedApplicantsProject.applicants.map(app => (
                  <View
                    key={app.id}
                    style={[
                      styles.applicantCard,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }
                    ]}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{app.name}</Text>
                      <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>{app.instrument}</Text>
                    </View>
                    <Text style={{ fontSize: 13, color: colors.textMuted, lineHeight: 18, marginBottom: 10 }}>
                      "{app.message}"
                    </Text>

                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable
                        style={[styles.syncButton, { flex: 1, backgroundColor: colors.primary, paddingVertical: 8 }]}
                        onPress={() => Alert.alert(t('acceptedNoticeTitle') || 'Aceito!', (t('acceptedNoticeMsg') || '{name} foi aceito no projeto!').replace('{name}', app.name))}
                      >
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>{t('acceptAndInvite') || 'Aceitar & Convidar'}</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.syncButton, { flex: 1, backgroundColor: isDark ? '#1e293b' : '#e5e7eb', paddingVertical: 8 }]}
                        onPress={() => Alert.alert(t('chatStartingTitle') || 'Chat', (t('chatStartingMsg') || 'Iniciando conversa direta com {name}...').replace('{name}', app.name))}
                      >
                        <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 12 }}>{t('chatDirect') || 'Conversar'}</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL: TENHO INTERESSE (CANDIDATURA DO MÚSICO) ── */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <Modal visible={showInterestModal} transparent animationType="slide" onRequestClose={() => setShowInterestModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowInterestModal(false)} />
          <View style={[styles.bottomSheetContent, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
            <View style={[styles.dragHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
            <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 6 }]}>{t('applyToProject') || 'Candidatar-se à Vaga'}</Text>
            <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600', marginBottom: 16 }}>
              {selectedInterestProject?.bandName} • {t('roleLabelColon') || 'Vaga:'} {selectedInterestProject?.soughtRole}
            </Text>

            <View style={{ marginBottom: 14 }}>
              <Text style={[styles.inputSubLabel, { color: colors.textMuted }]}>{t('yourInstrumentLabel') || 'SEU INSTRUMENTO'}</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9' }]}
                value={interestInstrument}
                onChangeText={setInterestInstrument}
                autoComplete="off"
                maxLength={100}
              />
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text style={[styles.inputSubLabel, { color: colors.textMuted }]}>{t('introMessageOptional') || 'MENSAGEM DE APRESENTAÇÃO (OPCIONAL)'}</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9', minHeight: 70 }]}
                value={interestMessage}
                onChangeText={setInterestMessage}
                multiline
                autoComplete="off"
                maxLength={1000}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                style={[styles.syncButton, { flex: 1, backgroundColor: isDark ? '#1e293b' : '#e5e7eb' }]}
                onPress={() => setShowInterestModal(false)}
              >
                <Text style={{ color: colors.text, fontWeight: 'bold' }}>{t('cancelBtn') || 'Cancelar'}</Text>
              </Pressable>
              <Pressable
                style={[styles.syncButton, { flex: 1, backgroundColor: colors.primary }]}
                onPress={handleSubmitInterest}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('sendApplication') || 'Enviar Candidatura'}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      

      {/* MODAL DE PERFIL DO MÚSICO */}
      <MusicianProfileModal
        visible={showMusicianProfileModal}
        musician={selectedMusicianProfile}
        onClose={() => {
          setShowMusicianProfileModal(false);
          setSelectedMusicianProfile(null);
        }}
        onOpenBandProfile={handleOpenBandProfile}
      />

      {/* MODAL DE PÁGINA PÚBLICA DA BANDA */}
      <BandProfileModal
        visible={showBandProfileModal}
        band={selectedBandProfile}
        onClose={() => {
          setShowBandProfileModal(false);
          setSelectedBandProfile(null);
        }}
      />

      {/* ── MODAL DE CONVITE COM MENSAGEM PERSONALIZADA PARA CANDIDATO ── */}
      <Modal
        visible={!!candidateInviteTarget}
        transparent
        animationType="slide"
        onRequestClose={() => setCandidateInviteTarget(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setCandidateInviteTarget(null)} />
          <View style={[styles.bottomSheetContent, { backgroundColor: colors.cardBackground, borderTopColor: colors.border, paddingBottom: 24 }]}>
            <View style={[styles.dragHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
            
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="paper-plane" size={20} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {t('inviteModalTitle') || 'Enviar Convite'}
                </Text>
              </View>
              <Pressable onPress={() => setCandidateInviteTarget(null)}>
                <Ionicons name="close-circle" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            {candidateInviteTarget && (
              <View style={{ marginBottom: 14, padding: 12, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 }}>
                  {candidateInviteTarget.candidate.name} {candidateInviteTarget.candidate.username ? `(@${candidateInviteTarget.candidate.username})` : ''}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted }}>
                  {t('bandLabel') || 'Banda'}: <Text style={{ fontWeight: '700', color: colors.primary }}>{candidateInviteTarget.project.bandName}</Text> • {t('roleLabel') || 'Função'}: <Text style={{ fontWeight: '700', color: colors.text }}>{candidateInviteTarget.project.soughtRole || candidateInviteTarget.candidate.primaryInstrument || (t('memberFallback') || 'Integrante')}</Text>
                </Text>
              </View>
            )}

            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={[styles.inputSubLabel, { color: colors.textMuted, marginBottom: 0 }]}>
                  {t('inviteMessageOptional') || 'MENSAGEM DO CONVITE (OPCIONAL)'}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: candidateInviteMessage.length >= 480 ? '#ef4444' : colors.textMuted }}>
                  {candidateInviteMessage.length}/500
                </Text>
              </View>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9',
                    minHeight: 80,
                    maxHeight: 130,
                    textAlignVertical: 'top',
                    paddingTop: 10
                  }
                ]}
                value={candidateInviteMessage}
                onChangeText={(text) => {
                  const sanitized = text.slice(0, 500).replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, '');
                  setCandidateInviteMessage(sanitized);
                }}
                placeholder={t('writeCustomMessage') || "Escreva uma mensagem personalizada para o músico..."}
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={500}
                autoComplete="off"
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                style={[styles.syncButton, { flex: 1, backgroundColor: isDark ? '#1e293b' : '#e5e7eb' }]}
                onPress={() => setCandidateInviteTarget(null)}
                disabled={isSendingCandidateInvite}
              >
                <Text style={{ color: colors.text, fontWeight: 'bold' }}>{t('cancelBtn') || 'Cancelar'}</Text>
              </Pressable>
              <Pressable
                style={[styles.syncButton, { flex: 1.4, backgroundColor: colors.primary, opacity: isSendingCandidateInvite ? 0.6 : 1, flexDirection: 'row', gap: 6 }]}
                onPress={handleConfirmCandidateInvite}
                disabled={isSendingCandidateInvite}
              >
                <Ionicons name="paper-plane" size={16} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                  {isSendingCandidateInvite ? (t('sendingInviteStatus') || 'Enviando...') : (t('sendInviteBtn') || 'Enviar Convite')}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webContainer: {
    width: '100%',
    maxWidth: 820,
    alignSelf: 'center',
  },
  header: { 
    borderBottomWidth: 1, 
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) + 10 : 44, 
    paddingHorizontal: 16, 
    paddingBottom: 6 
  },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  networkIconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800' },

  newProjectHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  newProjectBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // User avatar in header
  userAvatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  userAvatarImg: { width: 34, height: 34, borderRadius: 17 },
  userAvatarPlaceholder: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  userAvatarInitial: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  statusDot: { position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 13, paddingVertical: 0 },

  // Tab Buttons com ícones (Usuários, Anúncios, Bandas, Classificados)
  tabButtonsContainer: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 6,
    width: '100%',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  tabButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  tabButtonInactive: {},
  tabButtonText: {
    fontSize: 11.5,
    letterSpacing: -0.2,
  },
  tabButtonBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },

  // Classifieds Card Styles
  classifiedCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    width: '100%',
  },
  classifiedTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  classifiedCategoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  classifiedCategoryText: {
    fontSize: 11.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  classifiedPriceText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#22c55e',
    letterSpacing: -0.2,
  },
  classifiedNameText: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
    marginBottom: 6,
  },
  classifiedDescText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  classifiedUserRow: {
    alignSelf: 'flex-start',
    marginTop: 2,
    paddingVertical: 2,
  },
  classifiedUsernameText: {
    fontSize: 13.5,
    fontWeight: '700',
  },

  scrollContent: { paddingBottom: 60, paddingTop: 14, paddingHorizontal: 0 },

  // Project card
  projectCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  projectCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  bandLogoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
    overflow: 'hidden',
  },
  bandLogoImg: { width: 70, height: 70, borderRadius: 35 },
  bandLogoInitial: { fontSize: 26, fontWeight: '900' },
  projectBandName: { fontSize: 16.5, fontWeight: '800', letterSpacing: -0.3 },
  projectMetaText: { fontSize: 11.5, fontWeight: '500' },
  soughtRolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4.5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  soughtRoleText: { fontSize: 12, fontWeight: '700' },

  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 12 },
  tagPill: { paddingVertical: 3.5, paddingHorizontal: 9, borderRadius: 14, borderWidth: 1 },
  tagPillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.1 },
  objectivePill: { paddingVertical: 3.5, paddingHorizontal: 9, borderRadius: 14, borderWidth: 1 },
  objectivePillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.1 },
  genrePill: { paddingVertical: 3.5, paddingHorizontal: 9, borderRadius: 14, borderWidth: 1 },
  genrePillText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.1 },
  genrePillWithDelete: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1 },

  projectDesc: { fontSize: 13.5, lineHeight: 20, marginBottom: 14, letterSpacing: -0.1 },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cardCreatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    marginRight: 8,
  },
  creatorAvatarMini: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatorText: {
    fontSize: 12.5,
    fontWeight: '700',
  },

  creatorActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applicantsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 34,
    minWidth: 34,
    paddingHorizontal: 8,
    borderRadius: 17,
    borderWidth: 1,
  },

  interestActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  interestActionText: { color: '#fff', fontSize: 12.5, fontWeight: '800' },



  // Scanner loading animation styles
  scanningContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  radarWrapper: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  radarPulseRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
  },
  radarPulseRingOuter: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  animatedLupaCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  scanningTitle: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  scanningSubtitle: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
    marginBottom: 20,
  },
  scanProgressBarTrack: {
    width: 200,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  scanProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Scanner filter banner in musicians list
  filterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  filterBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  filterBannerSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  circularCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Match score badge sobreposto na parte de baixo do círculo do avatar
  matchScoreBadge: {
    position: 'absolute',
    bottom: -6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1.5,
    zIndex: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
  },
  matchScoreBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#fff',
  },

  // Invite candidate card button
  inviteCandidateCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  inviteCandidateCardText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // User Card (Mockup Layout: horizontal retangular com avatar sobreposto)
  userCardWrapper: {
    marginTop: 40,
    marginBottom: 10,
    marginHorizontal: 16,
    position: 'relative',
  },
  userCardBody: {
    position: 'relative',
    borderRadius: 20,
    borderWidth: 1,
    paddingTop: 16,
    paddingBottom: 16,
    paddingRight: 16,
    paddingLeft: 130,
    minHeight: 108,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  userCardFloatingHeader: {
    position: 'absolute',
    top: -30,
    left: 130,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userDisplayNameText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    flex: 1,
    marginRight: 8,
  },
  userAvatarFloatingCol: {
    position: 'absolute',
    top: -28,
    left: 14,
    width: 98,
    height: 98,
    zIndex: 10,
  },
  userAvatarCircle: {
    width: 98,
    height: 98,
    borderRadius: 49,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  userAvatarImg: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  userAvatarLetter: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
  },
  userStatusGreenDot: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    width: 25,
    height: 25,
    borderRadius: 12.5,
    borderWidth: 3.5,
    zIndex: 15,
  },
  userCardContent: {
    justifyContent: 'center',
    gap: 4,
  },
  userMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  userUsernameText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  userAgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  userLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  userLocationText: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  userSkillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  userSkillPill: {
    paddingVertical: 3.5,
    paddingHorizontal: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  userSkillPillText: {
    fontSize: 11,
    fontWeight: '600',
  },

  meBadge: { paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 5, borderWidth: 0 },
  meBadgeText: { fontSize: 10, fontWeight: '800' },
  availableBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4 },

  // Scanner modal card (sem contorno)
  scannedCandidateCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 0,
    marginBottom: 10,
  },
  matchBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
  matchBadgeText: { fontSize: 12, fontWeight: '800' },
  inviteCandidateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },

  // Applicant Card (sem contorno)
  applicantCard: { padding: 14, borderRadius: 14, borderWidth: 0, marginBottom: 8 },

  // Empty state
  emptyContainer: { 
    alignItems: 'center', 
    paddingVertical: 40, 
    paddingHorizontal: 20, 
    marginHorizontal: 16,
    borderRadius: 16, 
    borderWidth: 1,
    marginVertical: 12,
  },
  emptyText: { textAlign: 'center', fontSize: 14, marginTop: 12, marginBottom: 16 },
  emptyBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },

  // Modals & Bottom sheets
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  bottomSheetContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 32, borderWidth: 1, borderBottomWidth: 0 },
  dragHandle: { width: 44, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '800' },

  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, minHeight: 46 },
  inputSubLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
  syncButton: { paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  bandSelectItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },

  pickerButton: { height: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerButtonText: { fontSize: 13 },
  pickerOptionRow: { paddingVertical: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth },

  // City Filter
  citySearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  citySearchInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    gap: 6,
  },
  citySearchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  cityFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 38,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  cityFilterPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cityFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  cityFilterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    flexShrink: 1,
  },
  cityFilterBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    maxWidth: 160,
  },
  cityFilterActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  cityFilterActionText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  quickCityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },

  // Pagination
  paginationContainer: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  paginationCounterText: {
    fontSize: 12,
    fontWeight: '500',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  pageNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  pageNavBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pageNumbersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pageNumberPill: {
    minWidth: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  pageNumberText: {
    fontSize: 12,
  },
  /* ── UNIFIED PROFILE BUTTON ── */
  unifiedProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  unifiedAvatarBox: {
    position: 'relative',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unifiedAvatarImg: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  unifiedAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unifiedAvatarInitial: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  statusDotSmall: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  unifiedProfileText: {
    fontSize: 13,
    fontWeight: '600',
  },
  /* ── 3-FIELD LOCATION FILTER ── */
  locationFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  locationInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 38,
  },
  locationTextInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  clearLocationBtn: {
    padding: 6,
    borderRadius: 6,
  },
  /* ── POST AD TOP BANNER ── */
  postAdTopBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  postAdTopBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postAdTopBannerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  postAdTopBannerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
});
