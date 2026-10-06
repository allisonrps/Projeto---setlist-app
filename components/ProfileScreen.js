import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  Pressable, 
  StyleSheet, 
  ScrollView, 
  Modal, 
  Alert, 
  TextInput, 
  Image, 
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
  Animated,
  ActivityIndicator,
  StatusBar as RNStatusBar
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { api } from '../services/api';
import { bandService } from '../services/bandService';
import { setlistService } from '../services/setlistService';
import { musiciansService } from '../services/musiciansService';
import MusicianProfileModal from './MusicianProfileModal';
import ShareAgendaModal from './ShareAgendaModal';
import { useLanguage } from '../hooks/useLanguage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import QRCode from 'react-native-qrcode-svg';

const bgRock = require('../assets/bg_rock.jpg');
const bgPop = require('../assets/bg_pop.jpg');
const bgAcoustic = require('../assets/bg_acoustic.jpg');
const bgJazz = require('../assets/bg_jazz.jpg');
const bgElectronic = require('../assets/bg_electronic.jpg');
const bgReggae = require('../assets/bg_reggae.jpg');
const bgGospel = require('../assets/bg_gospel.jpg');
const bgNotes = require('../assets/bg_notes.jpg');
const bgClassic = require('../assets/bg_classic.jpg');

const getBandInitials = (name) => {
  if (!name) return 'BD';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const STANDARD_CATEGORIES = [
  'Guitarra',
  'Baixo',
  'Violão',
  'Bateria',
  'Teclado',
  'Amplificador',
  'Pedal/Efeito',
  'Microfone',
  'Outros'
];

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

export default function ProfileScreen({ onLogout, onBack, onOpenBandProfile }) {
  const { colors } = useTheme();
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

  const getGearCategoryLabel = (cat) => {
    switch (cat) {
      case 'Guitarra': return t('catGuitar') || 'Guitarra / Violão';
      case 'Baixo': return t('catBass') || 'Baixo';
      case 'Bateria': return t('catDrums') || 'Bateria';
      case 'Teclado': return t('catKeyboard') || 'Teclado';
      case 'Voz / Microfone': return t('catVocals') || 'Voz / Microfone';
      case 'Amplificador': return t('catAmp') || 'Amplificador';
      case 'Pedal / Pedaleira': return t('catPedal') || 'Pedal / Pedaleira';
      case 'Acessório': return t('catAccessory') || 'Acessório';
      case 'Outro': return t('catOther') || 'Outro';
      default: return cat;
    }
  };

  const isDark = colors.isDark;
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('bio');
  const [profileImage, setProfileImage] = useState(null);

  // Modals (all bottom sheets)
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState(1);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editField, setEditField] = useState({ key: '', title: '', value: '' });

  // Unified Edit Profile Modal (Header button)
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfileBirthDate, setEditProfileBirthDate] = useState('');
  const [editProfileCity, setEditProfileCity] = useState('');
  const [editProfileState, setEditProfileState] = useState('');
  const [editProfileCountry, setEditProfileCountry] = useState('Brasil');

  // Location Modal
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locCity, setLocCity] = useState('');
  const [locState, setLocState] = useState('');
  const [locCountry, setLocCountry] = useState('');
  const [customLocCountryInput, setCustomLocCountryInput] = useState('');
  
  // Skills
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);
  const [skillName, setSkillName] = useState('');
  const [skillStars, setSkillStars] = useState(3);

  // Influences bottom sheet modal
  const [showInfluenceModal, setShowInfluenceModal] = useState(false);
  const [newInfluenceName, setNewInfluenceName] = useState('');
  const [newInfluenceStars, setNewInfluenceStars] = useState(5);

  // Gear / Equipment tab state
  const [gear, setGear] = useState([]);
  const [showGearModal, setShowGearModal] = useState(false);
  const [editingGear, setEditingGear] = useState(null);
  const [gearCategory, setGearCategory] = useState('Guitarra');
  const [customCategory, setCustomCategory] = useState('');
  const [gearName, setGearName] = useState('');
  const [gearDetails, setGearDetails] = useState('');

  // Drag-and-drop state for equipment
  const [draggingIdx, setDraggingIdx] = useState(null);
  const dragY = useRef(new Animated.Value(0)).current;
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const gearRef = useRef(gear);
  gearRef.current = gear;

  const viewShotRef = useRef();

  // Agenda Sharing State (com seleção de eventos e arte personalizada)
  const [selectedAgendaEventIds, setSelectedAgendaEventIds] = useState([]);
  const [customBgUri, setCustomBgUri] = useState(null);

  // Modal de visualização da Página Pública do próprio usuário
  const [showPublicPage, setShowPublicPage] = useState(false);
  const [myPublicProfile, setMyPublicProfile] = useState(null);

  const handleOpenMyPublicPage = async () => {
    try {
      const prof = await musiciansService.getMusicianByUsername('me');
      if (prof) {
        const userAgenda = (user?.agenda && user.agenda.length > 0) ? user.agenda : (prof.agenda || []);
        setMyPublicProfile({
          ...prof,
          agenda: userAgenda
        });
        setShowPublicPage(true);
      }
    } catch (e) {
      console.log('Erro ao carregar página pública:', e);
    }
  };

  const getBgImage = (id) => {
    if (id === 'custom') {
      if (customBgUri) return { uri: customBgUri };
      return bgRock;
    }
    switch(id) {
      case 1: return bgRock;
      case 2: return bgAcoustic;
      case 3: return bgPop;
      case 4: return bgJazz;
      case 5: return bgElectronic;
      case 6: return bgReggae;
      case 7: return bgGospel;
      case 8: return bgNotes;
      case 9: return bgClassic;
      default: return bgRock;
    }
  };

  const openShareAgendaModal = () => {
    const allIds = (user?.agenda || []).map(e => e.id);
    setSelectedAgendaEventIds(allIds);
    setShowShareModal(true);
  };

  const toggleSelectAgendaEvent = (id) => {
    if (selectedAgendaEventIds.includes(id)) {
      if (selectedAgendaEventIds.length === 1) {
        Alert.alert(t('notice') || 'Aviso', t('selectAtLeastOneShowMsg') || 'Selecione ao menos um show para a arte.');
        return;
      }
      setSelectedAgendaEventIds(selectedAgendaEventIds.filter(i => i !== id));
    } else {
      setSelectedAgendaEventIds([...selectedAgendaEventIds, id]);
    }
  };

  const toggleSelectAllAgendaEvents = () => {
    const allIds = (user?.agenda || []).map(e => e.id);
    if (selectedAgendaEventIds.length === allIds.length) {
      setSelectedAgendaEventIds(allIds.slice(0, 1));
    } else {
      setSelectedAgendaEventIds(allIds);
    }
  };

  const pickCustomBgImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.85,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const uri = result.assets[0].uri;
        setCustomBgUri(uri);
        setSelectedLayout('custom');
        await AsyncStorage.setItem('agenda_custom_bg', uri);
      }
    } catch (err) {
      console.log('Error picking custom bg image:', err);
    }
  };

  const removeCustomBgImage = async () => {
    setCustomBgUri(null);
    if (selectedLayout === 'custom') setSelectedLayout(1);
    await AsyncStorage.removeItem('agenda_custom_bg');
  };

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const applyProfileData = async (data) => {
    if (!data) return;
    try {
      const savedImage = await AsyncStorage.getItem('profileImage');
      if (savedImage) setProfileImage(savedImage);
      const savedDisplayName = await AsyncStorage.getItem('user_display_name');
      const savedCustomBg = await AsyncStorage.getItem('agenda_custom_bg');
      if (savedCustomBg) setCustomBgUri(savedCustomBg);

      // Load Gear from AsyncStorage
      const savedGear = await AsyncStorage.getItem('user_gear');
      let parsedGear = [];
      if (savedGear) {
        try { parsedGear = JSON.parse(savedGear); } catch (e) {}
      }
      if (!parsedGear || parsedGear.length === 0) {
        parsedGear = [
          { id: '1', name: 'Fender Stratocaster Player', category: 'Guitarra', details: 'Sunburst, Braço Maple' },
          { id: '2', name: 'Marshall DSL40CR', category: 'Amplificador', details: 'Combo Valvulado 40W' }
        ];
      }
      setGear(parsedGear);

      let parsedSkills = null;
      const rawInst = data.instruments || data.skillsJson || data.skills;
      if (rawInst) {
        try {
          const parsed = typeof rawInst === 'string' ? JSON.parse(rawInst) : rawInst;
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsedSkills = parsed;
          }
        } catch (e) {}
      }

      if (!parsedSkills) {
        parsedSkills = [
          { id: 1, instrument: 'Guitarra', stars: 5, isPrimary: true },
          { id: 2, instrument: 'Violão', stars: 3, isPrimary: true }
        ];
      }

      // Garante que até 2 habilidades venham marcadas como principais por padrão se nenhuma estiver
      const hasAnyPrimary = parsedSkills.some(s => s.isPrimary);
      if (!hasAnyPrimary && parsedSkills.length > 0) {
        parsedSkills = parsedSkills.map((s, idx) => ({
          ...s,
          isPrimary: idx < 2
        }));
      }

      let projectsData = [
        { 
          id: 1, 
          name: 'The Rockers', 
          role: 'Guitarrista', 
          memberType: 'Membro / Proprietário',
          since: '2023', 
          needsSync: false, 
          logo: 'https://ui-avatars.com/api/?name=The+Rockers&background=random' 
        },
        { 
          id: 2, 
          name: 'Acoustic Duo', 
          role: 'Violonista / Vocal', 
          memberType: 'Membro',
          since: '2022', 
          needsSync: true, 
          logo: 'https://ui-avatars.com/api/?name=Acoustic+Duo&background=random' 
        }
      ];

      try {
        const localBands = await bandService.getAll();
        if (localBands && localBands.length > 0) {
          const loadedProjects = await Promise.all(localBands.map(async b => {
            let role = 'Músico';
            let isMember = false;
            let isOwner = true;

            try {
              const members = await bandService.getBandMembers(b.id);
              if (b.myMemberId && members && members.length > 0) {
                const found = members.find(m => m.id === b.myMemberId);
                if (found) {
                  role = found.role || 'Músico';
                  isMember = true;
                }
              }
              if (!isMember && members && members.length > 0) {
                const myName = (savedDisplayName || data.displayName || data.username || '').toLowerCase();
                const matched = members.find(m => m.name && m.name.toLowerCase() === myName);
                if (matched) {
                  role = matched.role || 'Músico';
                  isMember = true;
                }
              }
            } catch (e) {
              console.log('Error fetching members for band', b.id, e);
            }

            if (role === 'Músico' && parsedSkills.length > 0) {
              role = parsedSkills[0].instrument;
            }

            let memberType = 'Proprietário';
            if (isOwner && isMember) {
              memberType = 'Membro / Proprietário';
            } else if (isOwner) {
              memberType = 'Proprietário';
            } else {
              memberType = 'Membro';
            }

            return {
              id: b.id,
              name: b.name,
              imageUri: b.imageUri,
              role: role,
              memberType: memberType,
              since: b.startDate ? String(b.startDate).substring(0, 4) : '2023',
              needsSync: false,
              city: b.city || '',
              state: b.state || '',
              country: b.country || '',
              genres: b.genres || '[]'
            };
          }));
          projectsData = loadedProjects;
        }
      } catch (err) {
        console.log('Error loading local bands for projects:', err);
      }

      // Parse structured influences with stars (without #)
      let parsedInfluences = [];
      if (data.influences) {
        try {
          const raw = typeof data.influences === 'string' ? JSON.parse(data.influences) : data.influences;
          if (Array.isArray(raw)) {
            parsedInfluences = raw.map((item, idx) => {
              if (typeof item === 'string') {
                return { id: String(idx + 1), name: item.replace(/^#/, ''), stars: 5 };
              }
              return {
                id: item.id || String(idx + 1),
                name: (item.name || '').replace(/^#/, ''),
                stars: typeof item.stars === 'number' ? Math.max(0, Math.min(5, item.stars)) : 5
              };
            });
          }
        } catch (e) {
          console.log('Error parsing influences:', e);
        }
      }
      if (parsedInfluences.length === 0) {
        parsedInfluences = [
          { id: '1', name: 'Rock Clássico', stars: 5 },
          { id: '2', name: 'Blues', stars: 4 }
        ];
      }

      setUser({
        ...data,
        imageUri: savedImage || data.imageUri || null,
        displayName: savedDisplayName || data.displayName || data.username || 'Músico',
        bio: data.bio || 'Escreva algo sobre você...',
        city: data.city || '',
        state: data.state || '',
        country: data.country || '',
        birthDate: data.birthDate || '',
        age: data.age != null ? data.age : null,
        isEmailConfirmed: !!data.isEmailConfirmed,
        instagram: data.instagram || '',
        youtube: data.youtube || '',
        twitter: data.twitter || '',
        facebook: data.facebook || '',
        spotify: data.spotify || '',
        tiktok: data.tiktok || '',
        availability: data.availability || 'Indisponível',
        interestLevel: data.interestLevel ? (typeof data.interestLevel === 'string' && data.interestLevel.startsWith('[') ? JSON.parse(data.interestLevel) : (Array.isArray(data.interestLevel) ? data.interestLevel : [data.interestLevel])) : ['Hobbie'],
        influences: parsedInfluences,
        skills: parsedSkills,
        projects: projectsData,
        agenda: await (async () => {
          try {
            const allSetlists = await setlistService.getAll();
            return (allSetlists || [])
              .filter(s => (s.date && s.date.trim()) || (s.local && s.local.trim()))
              .map(s => {
                let formattedDate = s.date || 'A definir';
                if (s.time) formattedDate += ` • ${s.time}`;
                return {
                  id: s.id,
                  band: s.bandName || s.name || 'Banda',
                  date: formattedDate,
                  local: s.local || s.name || 'Local a definir',
                  logo: s.bandImageUri || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.bandName || s.name || 'Show')}&background=random`
                };
              });
          } catch (err) {
            console.log('Error loading band events for agenda:', err);
            return [];
          }
        })()
      });
    } catch (err) {
      console.log('Error in applyProfileData:', err);
    }
  };

  const loadUser = async () => {
    setLoading(true);
    setLoadError(null);

    // 1. Tentar primeiro o cache local para exibição imediata (sem tela preta)
    let hasLocalData = false;
    try {
      const cached = await AsyncStorage.getItem('user_profile_cache');
      if (cached) {
        await applyProfileData(JSON.parse(cached));
        hasLocalData = true;
        setLoading(false);
      } else {
        const userInfo = await AsyncStorage.getItem('user_info');
        if (userInfo) {
          const parsed = JSON.parse(userInfo);
          await applyProfileData({
            id: parsed.id || 1,
            username: parsed.username || 'Musico',
            email: parsed.email || '',
            displayName: parsed.displayName || parsed.username || 'Músico',
            city: parsed.city || '',
            state: parsed.state || '',
            country: parsed.country || ''
          });
          hasLocalData = true;
          setLoading(false);
        }
      }
    } catch (cacheErr) {
      console.log('Error loading cached profile:', cacheErr);
    }

    // 2. Sincronizar com a API
    try {
      const data = await api.getProfile();
      await applyProfileData(data);
      await AsyncStorage.setItem('user_profile_cache', JSON.stringify(data));
      if ((data.city && data.city.trim()) || (data.skills && data.skills.length > 0) || data.instruments) {
        await AsyncStorage.setItem('user_profile_completed', 'true');
      }
      setLoadError(null);
    } catch (e) {
      console.log('Error fetching profile from API:', e);
      if (e.isAuthError || e.message?.includes('401') || e.message?.includes('Sessão expirada')) {
        Alert.alert(t('sessionExpiredTitle') || 'Sessão Expirada', t('sessionExpiredMsg') || 'Por favor, faça login novamente.');
        await handleLogout();
        return;
      }
      if (!hasLocalData && !user) {
        setLoadError(e.message || 'Não foi possível conectar ao servidor.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUser(); }, []);

  const handleLogout = async () => { await api.logout(); onLogout(); };

  const isProfileComplete = Boolean(
    (user?.skills && user.skills.length > 0) ||
    (user?.city && user.city.trim().length > 0)
  );

  const handleBackToFeed = async () => {
    if (!isProfileComplete) {
      Alert.alert(
        t('incompleteProfileTitle') || 'Complete seu Perfil',
        t('incompleteProfileMsg') || 'Adicione ao menos seus instrumentos ou localização para liberar seu acesso ao feed da Rede BandLink.',
        [{ text: t('ok') || 'Entendi' }]
      );
      return;
    }
    await AsyncStorage.setItem('user_profile_completed', 'true');
    if (onBack) onBack();
  };

  const pickProfileImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];

        // Limite de tamanho de arquivo: máximo 5MB
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert(
            t('fileTooLargeTitle') || 'Arquivo Muito Grande',
            t('avatarSizeLimitMsg') || 'A foto de perfil deve ter no máximo 5MB.'
          );
          return;
        }

        const tempUri = asset.uri;
        let finalUri = tempUri;

        if (Platform.OS !== 'web' && FileSystem && FileSystem.documentDirectory) {
          try {
            const targetDir = FileSystem.documentDirectory;
            const permanentFile = `${targetDir}user_profile_avatar.jpg`;

            // Sempre remove a imagem anterior para substituir e não acumular arquivos
            const fileInfo = await FileSystem.getInfoAsync(permanentFile);
            if (fileInfo.exists) {
              await FileSystem.deleteAsync(permanentFile, { idempotent: true });
            }

            // Copia a nova imagem para o local permanente
            await FileSystem.copyAsync({
              from: tempUri,
              to: permanentFile,
            });

            // Parâmetro timestamp para invalidar cache de imagem em memória do React Native
            finalUri = `${permanentFile}?t=${Date.now()}`;
          } catch (fsErr) {
            console.log('Erro ao salvar foto de perfil permanente:', fsErr);
            finalUri = tempUri;
          }
        }

        setProfileImage(finalUri);
        await AsyncStorage.setItem('profileImage', finalUri);

        // Atualiza o estado do usuário e o cache persistente do perfil
        const updatedUser = { ...user, imageUri: finalUri };
        setUser(updatedUser);
        await AsyncStorage.setItem('user_profile_cache', JSON.stringify(updatedUser));
      }
    } catch (err) {
      console.log('Erro ao selecionar foto de perfil:', err);
      Alert.alert(t('errorTitle') || 'Erro', 'Não foi possível carregar a imagem selecionada.');
    }
  };

  // ── Availability & Interest (inline toggle) ──
  const toggleAvailability = async (val) => {
    const updated = { ...user, availability: val };
    setUser(updated);
    try { await api.updateProfile({ availability: val }); } catch {}
  };

  const toggleInterest = async (val) => {
    const current = user.interestLevel || [];
    const isMatching = (item) => {
      const v = String(item || '').toLowerCase();
      const k = String(val).toLowerCase();
      if ((k.includes('casual') || k.includes('ver')) && (v.includes('casual') || v.includes('ver') || v.includes('see'))) return true;
      return v === k;
    };
    const exists = current.some(isMatching);
    const next = exists ? current.filter(v => !isMatching(v)) : [...current.filter(v => !isMatching(v)), val];
    const updated = { ...user, interestLevel: next };
    setUser(updated);
    try { await api.updateProfile({ interestLevel: JSON.stringify(next) }); } catch {}
  };

  // ── Skills ──
  const openAddSkill = () => {
    setEditingSkill(null);
    setSkillName('');
    setSkillStars(3);
    setShowSkillModal(true);
  };

  const openEditSkill = (skill) => {
    setEditingSkill(skill);
    setSkillName(skill.instrument);
    setSkillStars(skill.stars);
    setShowSkillModal(true);
  };

  const handleSaveSkill = async () => {
    if (!skillName.trim()) return;
    let updatedSkills;
    if (editingSkill) {
      updatedSkills = user.skills.map(s => s.id === editingSkill.id ? { ...s, instrument: skillName, stars: skillStars } : s);
    } else {
      updatedSkills = [...user.skills, { id: Date.now(), instrument: skillName, stars: skillStars }];
    }
    const updatedUser = { 
      ...user, 
      skills: updatedSkills, 
      instruments: JSON.stringify(updatedSkills) 
    };
    setUser(updatedUser);
    setShowSkillModal(false);
    try {
      await AsyncStorage.setItem('user_profile_cache', JSON.stringify(updatedUser));
      await AsyncStorage.setItem('user_profile_completed', 'true');
      await api.updateProfile({ 
        instruments: JSON.stringify(updatedSkills),
        skillsJson: JSON.stringify(updatedSkills)
      });
    } catch (e) {
      console.log('Error saving skill:', e);
    }
  };

  const handleRemoveSkill = async (id) => {
    const updatedSkills = user.skills.filter(s => s.id !== id);
    const updatedUser = { 
      ...user, 
      skills: updatedSkills, 
      instruments: JSON.stringify(updatedSkills) 
    };
    setUser(updatedUser);
    try { 
      await AsyncStorage.setItem('user_profile_cache', JSON.stringify(updatedUser));
      await api.updateProfile({ 
        instruments: JSON.stringify(updatedSkills),
        skillsJson: JSON.stringify(updatedSkills)
      }); 
    } catch (e) {
      console.log('Error removing skill:', e);
    }
  };

  // ── Marcar Instrumento Principal (Até 2, circulado selecionado) ──
  const togglePrimarySkill = async (id) => {
    const currentSkills = user?.skills || [];
    const target = currentSkills.find(s => s.id === id);
    if (!target) return;

    const isCurrentlyPrimary = !!target.isPrimary;
    const selectedCount = currentSkills.filter(s => s.isPrimary).length;

    if (!isCurrentlyPrimary && selectedCount >= 2) {
      Alert.alert(
        t('limit2InstrumentsTitle') || 'Limite de 2 Instrumentos',
        t('limit2InstrumentsMsg') || 'Você já selecionou 2 instrumentos principais para seu perfil. Desmarque um antes de marcar outro.'
      );
      return;
    }

    const updatedSkills = currentSkills.map(s => {
      if (s.id === id) {
        return { ...s, isPrimary: !isCurrentlyPrimary };
      }
      return s;
    });

    const primaryList = updatedSkills.filter(s => s.isPrimary).map(s => s.instrument);
    const updatedUser = {
      ...user,
      skills: updatedSkills,
      instruments: JSON.stringify(updatedSkills),
      primaryInstruments: primaryList
    };

    setUser(updatedUser);

    try {
      await AsyncStorage.setItem('user_profile_cache', JSON.stringify(updatedUser));
      await AsyncStorage.setItem('user_primary_instruments', JSON.stringify(primaryList));
      await api.updateProfile({ 
        instruments: JSON.stringify(updatedSkills),
        skillsJson: JSON.stringify(updatedSkills)
      });
    } catch (e) {
      console.log('Error saving primary skills:', e);
    }
  };

  // ── Gear / Equipamentos ──
  const saveGearList = async (updatedGear) => {
    setGear(updatedGear);
    await AsyncStorage.setItem('user_gear', JSON.stringify(updatedGear));
  };

  const togglePrimaryGear = (gearId) => {
    const currentGear = gearRef.current || [];
    const target = currentGear.find(g => g.id === gearId);
    if (!target) return;

    const isCurrentlyPrimary = !!target.isPrimary;
    const selectedCount = currentGear.filter(g => g.isPrimary).length;

    if (!isCurrentlyPrimary && selectedCount >= 2) {
      Alert.alert(
        t('limit2GearTitle') || 'Limite de 2 Instrumentos',
        t('limit2GearMsg') || 'Você já selecionou 2 equipamentos/instrumentos principais. Desmarque um antes de marcar outro.'
      );
      return;
    }

    const updated = currentGear.map(g => g.id === gearId ? { ...g, isPrimary: !isCurrentlyPrimary } : g);
    saveGearList(updated);
  };

  const openAddGear = () => {
    setEditingGear(null);
    setGearCategory('Guitarra');
    setCustomCategory('');
    setGearName('');
    setGearDetails('');
    setShowGearModal(true);
  };

  const openEditGear = (item) => {
    setEditingGear(item);
    
    const isStandard = STANDARD_CATEGORIES.some(c => c !== 'Outros' && c.toLowerCase() === (item.category || '').toLowerCase());
    if (isStandard) {
      setGearCategory(item.category);
      setCustomCategory('');
    } else {
      setGearCategory('Outros');
      setCustomCategory(item.category || '');
    }
    
    setGearName(item.name || '');
    setGearDetails(item.details || '');
    setShowGearModal(true);
  };

  const handleSaveGear = () => {
    if (!gearName.trim()) {
      Alert.alert(t('fieldRequired') || 'Campo Obrigatório', t('fillBrandModelError') || 'Preencha a Marca / Modelo do equipamento.');
      return;
    }

    const finalCategory = (gearCategory === 'Outros' && customCategory.trim()) 
      ? customCategory.trim() 
      : gearCategory;

    let updated;
    if (editingGear) {
      updated = gear.map(g => g.id === editingGear.id ? {
        ...g,
        category: finalCategory,
        name: gearName.trim(),
        details: gearDetails.trim()
      } : g);
    } else {
      updated = [
        ...gear,
        {
          id: String(Date.now()),
          category: finalCategory,
          name: gearName.trim(),
          details: gearDetails.trim()
        }
      ];
    }
    saveGearList(updated);
    setShowGearModal(false);
  };

  const handleRemoveGear = (id) => {
    const updated = gear.filter(g => g.id !== id);
    saveGearList(updated);
  };

  const confirmDeleteGear = () => {
    if (!editingGear) return;
    Alert.alert(
      t('deleteGearTitle') || 'Excluir Equipamento',
      (t('deleteGearConfirm') || 'Deseja realmente remover "{name}"?').replace('{name}', editingGear.name),
      [
        { text: t('cancelBtn') || 'Cancelar', style: 'cancel' },
        { 
          text: t('deleteBtn') || 'Excluir', 
          style: 'destructive', 
          onPress: () => {
            handleRemoveGear(editingGear.id);
            setShowGearModal(false);
          } 
        }
      ]
    );
  };

  // ── PanResponder para Arrastar e Organizar Equipamentos ──
  const createGearPanResponder = (index) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => {
        setDraggingIdx(index);
        dragY.setValue(0);
        setScrollEnabled(false);
      },
      onPanResponderMove: Animated.event([null, { dy: dragY }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gestureState) => {
        setScrollEnabled(true);
        const approxHeight = 74;
        const slots = Math.round(gestureState.dy / approxHeight);
        const currentList = gearRef.current;
        const targetIndex = Math.max(0, Math.min(currentList.length - 1, index + slots));
        if (targetIndex !== index) {
          const reordered = [...currentList];
          const [moved] = reordered.splice(index, 1);
          reordered.splice(targetIndex, 0, moved);
          saveGearList(reordered);
        }
        setDraggingIdx(null);
        dragY.setValue(0);
      },
      onPanResponderTerminate: () => {
        setScrollEnabled(true);
        setDraggingIdx(null);
        dragY.setValue(0);
      }
    });
  };

  // ── Influences (0-5 stars, up to 5, without #) ──
  const handleSaveInfluencesList = async (updatedList) => {
    setUser({ ...user, influences: updatedList });
    try {
      await api.updateProfile({ influences: JSON.stringify(updatedList) });
    } catch (e) {
      console.log('Error saving influences:', e);
    }
  };

  const handleAddInfluence = () => {
    const cleanName = newInfluenceName.replace(/^#/, '').trim();
    if (!cleanName) return;
    const currentList = user.influences || [];
    if (currentList.length >= 5) {
      Alert.alert(t('limitTitle') || 'Limite', t('limit5InfluencesMsg') || 'Você pode adicionar no máximo 5 influências.');
      return;
    }
    const updated = [
      ...currentList,
      { id: String(Date.now()), name: cleanName, stars: newInfluenceStars }
    ];
    handleSaveInfluencesList(updated);
    setNewInfluenceName('');
    setNewInfluenceStars(5);
  };

  const handleUpdateInfluenceStars = (id, stars) => {
    const updated = (user.influences || []).map(inf =>
      inf.id === id ? { ...inf, stars } : inf
    );
    handleSaveInfluencesList(updated);
  };

  const handleRemoveInfluence = (id) => {
    const updated = (user.influences || []).filter(inf => inf.id !== id);
    handleSaveInfluencesList(updated);
  };

  const formatBirthDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const parts = dateStr.slice(0, 10).split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const formatBirthDateInput = (text) => {
    const cleaned = (text || '').replace(/\D/g, '').slice(0, 8);
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4)}`;
  };

  const openEditProfileModal = () => {
    setEditProfileName(user?.displayName || currentDisplayName || '');
    setEditProfileBirthDate(user?.birthDate ? formatBirthDateDisplay(user.birthDate) : '');
    setEditProfileCity(user?.city || '');
    setEditProfileState(user?.state || '');
    setEditProfileCountry(user?.country || 'Brasil');
    setShowEditProfileModal(true);
  };

  const handleSaveUserProfile = async () => {
    try {
      const cleanName = editProfileName.trim() || user?.username || 'Músico';
      const cleanCity = editProfileCity.trim();
      const cleanState = editProfileState.trim();
      const cleanCountry = editProfileCountry.trim();

      let isoBirthDate = null;
      if (editProfileBirthDate.trim()) {
        const cleaned = editProfileBirthDate.replace(/\D/g, '');
        if (cleaned.length === 8) {
          const d = parseInt(cleaned.slice(0, 2), 10);
          const m = parseInt(cleaned.slice(2, 4), 10);
          const y = parseInt(cleaned.slice(4), 10);
          const currY = new Date().getFullYear();
          if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1920 || y > currY) {
            Alert.alert(t('attention') || 'Atenção', 'Data de nascimento inválida.');
            return;
          }
          isoBirthDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        } else if (/^\d{4}-\d{2}-\d{2}/.test(editProfileBirthDate.trim())) {
          isoBirthDate = editProfileBirthDate.trim().slice(0, 10);
        } else {
          Alert.alert(t('attention') || 'Atenção', 'Data de nascimento incompleta. Use o formato DD/MM/AAAA.');
          return;
        }
      }

      let newAge = user?.age;
      if (isoBirthDate) {
        const b = new Date(isoBirthDate);
        const today = new Date();
        let calcAge = today.getFullYear() - b.getFullYear();
        const m = today.getMonth() - b.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < b.getDate())) {
          calcAge--;
        }
        newAge = calcAge >= 0 ? calcAge : null;
      }

      const updatedUser = {
        ...user,
        displayName: cleanName,
        birthDate: isoBirthDate || '',
        age: newAge,
        city: cleanCity,
        state: cleanState,
        country: cleanCountry
      };

      setUser(updatedUser);
      await AsyncStorage.setItem('user_display_name', cleanName);
      await AsyncStorage.setItem('user_profile_cache', JSON.stringify(updatedUser));
      if (cleanCity) {
        await AsyncStorage.setItem('user_profile_completed', 'true');
      }

      await api.updateProfile({
        displayName: cleanName,
        birthDate: isoBirthDate || '',
        city: cleanCity,
        state: cleanState,
        country: cleanCountry
      });

      setShowEditProfileModal(false);
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
    } catch (e) {
      console.log('Erro ao atualizar perfil:', e);
      Alert.alert(t('errorTitle') || 'Erro', 'Falha ao salvar dados do perfil.');
    }
  };

  // ── Generic edit (bio, links, etc.) ──
  const openEdit = (key, title, currentValue) => {
    setEditField({ key, title, value: currentValue || '' });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      const cleanVal = (editField.value || '').trim();
      if (editField.key === 'displayName') {
        const val = cleanVal || user.username;
        await AsyncStorage.setItem('user_display_name', val);
        const updated = { ...user, displayName: val };
        setUser(updated);
        await AsyncStorage.setItem('user_profile_cache', JSON.stringify(updated));
        try { await api.updateProfile({ displayName: val }); } catch (e) {}
        setShowEditModal(false);
        return;
      }

      let updateData = { [editField.key]: cleanVal };
      await api.updateProfile(updateData);
      const updatedUser = { ...user, [editField.key]: cleanVal };
      setUser(updatedUser);
      await AsyncStorage.setItem('user_profile_cache', JSON.stringify(updatedUser));
      setShowEditModal(false);
    } catch (e) {
      Alert.alert(t('errorTitle') || 'Erro', t('failedToSaveMsg') || 'Falha ao salvar.');
    }
  };

  const openLocationModal = () => {
    setLocCity(user?.city || '');
    setLocState(user?.state || '');
    setLocCountry(user?.country || '');
    setShowLocationModal(true);
  };

  const handleSaveLocation = async () => {
    try {
      const trimmedCity = locCity.trim();
      const updatedUser = {
        ...user,
        city: trimmedCity,
        state: locState,
        country: locCountry
      };
      setUser(updatedUser);
      await AsyncStorage.setItem('user_profile_cache', JSON.stringify(updatedUser));
      if (trimmedCity) {
        await AsyncStorage.setItem('user_profile_completed', 'true');
      }
      try {
        await api.updateProfile({
          city: trimmedCity,
          state: locState,
          country: locCountry
        });
      } catch (err) {
        console.log('Error updating profile location in API:', err);
      }
      setShowLocationModal(false);
    } catch (e) {
      Alert.alert(t('errorTitle') || 'Erro', t('failedToSaveLocationMsg') || 'Falha ao salvar localização.');
    }
  };

  const captureAndShare = async () => {
    try {
      setTimeout(async () => {
        const uri = await viewShotRef.current.capture();
        await Sharing.shareAsync(uri, { dialogTitle: 'Compartilhar Agenda' });
        setShowShareModal(false);
      }, 500);
    } catch (error) {
      Alert.alert(t('errorTitle') || 'Erro', t('failedToGenerateImageMsg') || 'Falha ao gerar imagem.');
    }
  };

  // ── Helper de estrelas (suporta de 0 a 5 estrelas) ──
  const renderStars = (count, size = 16, interactive = false, onSelect = null) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(s => {
        const isFilled = s <= count;
        const starElement = (
          <Ionicons
            key={s}
            name={isFilled ? 'star' : 'star-outline'}
            size={size}
            color={isFilled ? colors.primary : (isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)')}
          />
        );
        if (interactive && onSelect) {
          return (
            <Pressable
              key={s}
              onPress={() => {
                if (count === s) {
                  onSelect(s - 1);
                } else {
                  onSelect(s);
                }
              }}
              hitSlop={6}
            >
              {starElement}
            </Pressable>
          );
        }
        return starElement;
      })}
    </View>
  );

  // ── Pill helper: compacto, translúcido com contorno acentuado ──
  const Pill = ({ label, selected, onPress, flex }) => (
    <Pressable
      onPress={onPress}
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
    </Pressable>
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

  // ── 1. BIO TAB (COM FAIXAS SIMÉTRICAS AO CABEÇALHO E SEM TABELAS) ──
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
          const isSelected = (user.interestLevel || []).some(val => {
            const v = String(val || '').toLowerCase();
            const k = item.key.toLowerCase();
            if (k.includes('hobb') && v.includes('hobb')) return true;
            if (k.includes('prof') && v.includes('prof')) return true;
            if ((k.includes('ver') || k.includes('casual')) && (v.includes('ver') || v.includes('see') || v.includes('casual'))) return true;
            return v === k;
          });

          return (
            <Pressable 
              key={item.key} 
              onPress={() => toggleInterest(item.key)} 
              style={({ pressed }) => [{
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
                opacity: pressed ? 0.75 : 1
              }]}
              hitSlop={6}
            >
              <Text style={{ 
                color: isSelected ? colors.primary : colors.textMuted, 
                fontSize: 12, 
                fontWeight: isSelected ? '800' : '600', 
                textAlign: 'center' 
              }}>
                {getInterestLevelLabel(item.key)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Disponibilidade – 2 pílulas modernas */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4, paddingHorizontal: 2 }}>
        <Pressable 
          onPress={() => toggleAvailability('Disponível')} 
          style={({ pressed }) => {
            const isAvail = user.availability === 'Disponível' || String(user.availability).toLowerCase() === 'available';
            return [{
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
              opacity: pressed ? 0.75 : 1
            }];
          }}
          hitSlop={6}
        >
          <Ionicons 
            name={(user.availability === 'Disponível' || String(user.availability).toLowerCase() === 'available') ? "checkmark-circle" : "checkmark-circle-outline"} 
            size={14} 
            color={(user.availability === 'Disponível' || String(user.availability).toLowerCase() === 'available') ? '#10B981' : colors.textMuted} 
          />
          <Text style={{ 
            color: (user.availability === 'Disponível' || String(user.availability).toLowerCase() === 'available') ? '#10B981' : colors.textMuted, 
            fontSize: 12, 
            fontWeight: (user.availability === 'Disponível' || String(user.availability).toLowerCase() === 'available') ? '800' : '600', 
            textAlign: 'center' 
          }}>
            {t('availableStatus') || "Disponível"}
          </Text>
        </Pressable>

        <Pressable 
          onPress={() => toggleAvailability('Indisponível')} 
          style={({ pressed }) => {
            const isUnavail = user.availability === 'Indisponível' || String(user.availability).toLowerCase() === 'unavailable';
            return [{
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
              opacity: pressed ? 0.75 : 1
            }];
          }}
          hitSlop={6}
        >
          <Ionicons 
            name="close-circle-outline" 
            size={14} 
            color={(user.availability === 'Indisponível' || String(user.availability).toLowerCase() === 'unavailable') ? colors.text : colors.textMuted} 
          />
          <Text style={{ 
            color: (user.availability === 'Indisponível' || String(user.availability).toLowerCase() === 'unavailable') ? colors.text : colors.textMuted, 
            fontSize: 12, 
            fontWeight: (user.availability === 'Indisponível' || String(user.availability).toLowerCase() === 'unavailable') ? '800' : '600', 
            textAlign: 'center' 
          }}>
            {t('unavailableStatus') || "Indisponível"}
          </Text>
        </Pressable>
      </View>

      {/* Faixa: SOBRE MIM */}
      <SectionBanner 
        title={t('aboutMeSection') || "Sobre mim"} 
        rightElement={
          <Pressable 
            onPress={() => openEdit('bio', t('aboutMeSection') || 'Sobre mim', user.bio)}
            style={styles.cleanActionBtn}
            hitSlop={8}
          >
            <Ionicons name='pencil' size={14} color={colors.primary} />
            <Text style={[styles.cleanActionText, { color: colors.primary }]}>{t('editBtn') || 'Editar'}</Text>
          </Pressable>
        }
      />
      <View style={{ paddingHorizontal: 4 }}>
        <Text style={[styles.cleanBodyText, { color: colors.text }]}>{user.bio}</Text>
      </View>

      {/* Faixa: INFLUÊNCIAS MUSICAIS (sem #) */}
      <SectionBanner 
        title={(t('musicalInfluencesCount') || "Influências Musicais ({count}/5)").replace('{count}', (user.influences || []).length)}
        rightElement={
          <Pressable 
            onPress={() => setShowInfluenceModal(true)}
            style={styles.cleanActionBtn}
            hitSlop={8}
          >
            <Ionicons name='pencil' size={14} color={colors.primary} />
            <Text style={[styles.cleanActionText, { color: colors.primary }]}>{t('manageBtn') || 'Gerenciar'}</Text>
          </Pressable>
        }
      />
      <View style={{ paddingHorizontal: 4 }}>
        {(!user.influences || user.influences.length === 0) ? (
          <Text style={{ color: colors.textMuted, fontStyle: 'italic', fontSize: 13, marginTop: 4 }}>
            {t('noInfluencesManagePrompt') || 'Nenhuma influência adicionada. Toque em Gerenciar para listar até 5 estilos.'}
          </Text>
        ) : (
          <View style={{ gap: 6 }}>
            {user.influences.map((inf) => (
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

      {/* Faixa: LINKS EXTERNOS */}
      <SectionBanner title={t('externalLinksSection') || "Links Externos"} />
      <View style={{ paddingHorizontal: 4, gap: 4 }}>
        {/* Instagram */}
        <Pressable 
          style={styles.cleanLinkRow} 
          onPress={() => openEdit('instagram', t('editInstagramTitle') || 'Editar Instagram', user.instagram)}
        >
          <Ionicons name='logo-instagram' size={20} color={colors.primary} style={{ width: 26 }} />
          <Text style={[styles.cleanLinkText, { color: user.instagram ? colors.text : colors.textMuted, flex: 1 }]}>
            {user.instagram ? `@${user.instagram.replace(/^@+/, '')}` : (t('instagramPlaceholder') || 'Adicionar Instagram (@usuario)')}
          </Text>
          <Ionicons name='pencil' size={14} color={colors.textMuted} />
        </Pressable>

        {/* YouTube */}
        <Pressable 
          style={styles.cleanLinkRow} 
          onPress={() => openEdit('youtube', t('editYouTubeTitle') || 'Editar YouTube', user.youtube)}
        >
          <Ionicons name='logo-youtube' size={20} color={colors.primary} style={{ width: 26 }} />
          <Text style={[styles.cleanLinkText, { color: user.youtube ? colors.text : colors.textMuted, flex: 1 }]}>
            {user.youtube || (t('youtubePlaceholder') || 'Adicionar canal do YouTube')}
          </Text>
          <Ionicons name='pencil' size={14} color={colors.textMuted} />
        </Pressable>

        {/* X / Twitter */}
        <Pressable 
          style={styles.cleanLinkRow} 
          onPress={() => openEdit('twitter', t('editTwitterTitle') || 'Editar X (Twitter)', user.twitter)}
        >
          <Ionicons name='logo-twitter' size={20} color={colors.primary} style={{ width: 26 }} />
          <Text style={[styles.cleanLinkText, { color: user.twitter ? colors.text : colors.textMuted, flex: 1 }]}>
            {user.twitter ? `@${user.twitter.replace(/^@+/, '')}` : (t('socialTwitterPlaceholder') || 'Adicionar perfil do X (@usuario)')}
          </Text>
          <Ionicons name='pencil' size={14} color={colors.textMuted} />
        </Pressable>

        {/* Facebook */}
        <Pressable 
          style={styles.cleanLinkRow} 
          onPress={() => openEdit('facebook', t('editFacebookTitle') || 'Editar Facebook', user.facebook)}
        >
          <Ionicons name='logo-facebook' size={20} color={colors.primary} style={{ width: 26 }} />
          <Text style={[styles.cleanLinkText, { color: user.facebook ? colors.text : colors.textMuted, flex: 1 }]}>
            {user.facebook || (t('socialFacebookPlaceholder') || 'Adicionar perfil do Facebook')}
          </Text>
          <Ionicons name='pencil' size={14} color={colors.textMuted} />
        </Pressable>

        {/* Spotify */}
        <Pressable 
          style={styles.cleanLinkRow} 
          onPress={() => openEdit('spotify', t('editSpotifyTitle') || 'Editar Spotify', user.spotify)}
        >
          <MaterialCommunityIcons name='spotify' size={22} color={colors.primary} style={{ width: 26 }} />
          <Text style={[styles.cleanLinkText, { color: user.spotify ? colors.text : colors.textMuted, flex: 1 }]}>
            {user.spotify || (t('socialSpotifyPlaceholder') || 'Adicionar link do Spotify')}
          </Text>
          <Ionicons name='pencil' size={14} color={colors.textMuted} />
        </Pressable>

        {/* TikTok */}
        <Pressable 
          style={styles.cleanLinkRow} 
          onPress={() => openEdit('tiktok', t('editTikTokTitle') || 'Editar TikTok', user.tiktok)}
        >
          <Ionicons name='logo-tiktok' size={20} color={colors.primary} style={{ width: 26 }} />
          <Text style={[styles.cleanLinkText, { color: user.tiktok ? colors.text : colors.textMuted, flex: 1 }]}>
            {user.tiktok ? `@${user.tiktok.replace(/^@+/, '')}` : (t('socialTikTokPlaceholder') || 'Adicionar perfil do TikTok (@usuario)')}
          </Text>
          <Ionicons name='pencil' size={14} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );

  // ── 2. HABILIDADES TAB (CARDS EXPANDIDOS LATERALMENTE E BOTÃO CIRCULAR NO TOPO) ──
  const renderSkillsTab = () => (
    <View style={styles.tabContent}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>{t('skillsTab') || 'Habilidades'}</Text>
        <Pressable
          onPress={openAddSkill}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.primary,
            justifyContent: 'center',
            alignItems: 'center',
          }}
          hitSlop={8}
          accessibilityLabel="Nova Habilidade"
        >
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 12, paddingHorizontal: 2 }}>
        {t('skillsSectionSubtitle') || 'Instrumentos e habilidades técnicas do músico.'}
      </Text>

      {(user.skills || []).length === 0 ? (
        <View style={[styles.fullWidthCard, { backgroundColor: colors.cardBackground, borderTopColor: colors.border, borderBottomColor: colors.border, alignItems: 'center', paddingVertical: 24 }]}>
          <Text style={{ color: colors.textMuted, fontSize: 13, fontStyle: 'italic' }}>
            {t('noSkillsAddHint') || 'Nenhuma habilidade cadastrada. Toque no botão + para adicionar.'}
          </Text>
        </View>
      ) : (
        (user.skills || []).map((skill) => {
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

              <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                <Pressable onPress={() => openEditSkill(skill)} hitSlop={10} style={{ padding: 4 }}>
                  <Ionicons name="pencil" size={18} color={colors.textMuted} />
                </Pressable>
                <Pressable onPress={() => handleRemoveSkill(skill.id)} hitSlop={10} style={{ padding: 4 }}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger || '#ef4444'} />
                </Pressable>
              </View>
            </View>
          );
        })
      )}
    </View>
  );

  // ── 3. INSTRUMENTOS & EQUIPAMENTOS TAB (EXPANDIDO LATERALMENTE, REORDENÁVEL POR ARRASTE) ──
  const renderInstrumentsTab = () => (
    <View style={styles.tabContent}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ backgroundColor: colors.primary + '18', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800' }}>{gear.length}</Text>
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>{t('myGearTitle') || 'Meus Equipamentos'}</Text>
        </View>

        <Pressable
          onPress={openAddGear}
          style={{ backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{t('addBtn') || 'Adicionar'}</Text>
        </Pressable>
      </View>

      {gear.length === 0 ? (
        <View style={[styles.fullWidthCard, { backgroundColor: colors.cardBackground, borderTopColor: colors.border, borderBottomColor: colors.border, alignItems: 'center', paddingVertical: 28 }]}>
          <MaterialCommunityIcons name="guitar-acoustic" size={48} color={colors.textMuted} />
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: 'bold', marginTop: 10 }}>{t('noGearRegistered') || 'Nenhum equipamento cadastrado'}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 4, paddingHorizontal: 20 }}>
            {t('gearRegisterSubtitle') || 'Cadastre suas guitarras, violões, amplificadores, pedais, microfones e outros instrumentos.'}
          </Text>
        </View>
      ) : (
        gear.map((item, index) => {
          const isDragging = draggingIdx === index;
          const isPrimary = !!item.isPrimary;
          return (
            <Animated.View 
              key={item.id} 
              style={[
                styles.gearCardFullWidth, 
                { 
                  backgroundColor: isDragging 
                    ? (isDark ? '#1e293b' : '#f8fafc') 
                    : colors.cardBackground, 
                  borderTopColor: isDragging ? colors.primary : colors.border,
                  borderBottomColor: isDragging ? colors.primary : colors.border,
                  borderLeftWidth: 0,
                  borderRightWidth: 0,
                  zIndex: isDragging ? 999 : 1,
                  elevation: isDragging ? 12 : 0,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isDragging ? 0.3 : 0,
                  shadowRadius: 8,
                  transform: isDragging ? [{ translateY: dragY }, { scale: 1.02 }] : []
                }
              ]}
            >
              {/* LINHA 1 (ACIMA): Badge Categoria + Marca/Modelo + Ações (Editar e Arrastar) */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8, flexWrap: 'wrap', gap: 8 }}>
                  <View style={{ backgroundColor: colors.primary + '18', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: colors.primary + '30' }}>
                    <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>{getGearCategoryLabel(item.category)}</Text>
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.text }} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>

                {/* Apenas Ícone de Editar e Alça de Arraste (Sem lixeira no card!) */}
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <Pressable onPress={() => openEditGear(item)} hitSlop={8} style={{ padding: 4 }}>
                    <Ionicons name="pencil" size={17} color={colors.textMuted} />
                  </Pressable>

                  <View 
                    {...createGearPanResponder(index).panHandlers}
                    style={{ padding: 4, paddingRight: 0, justifyContent: 'center', alignItems: 'center' }}
                    hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
                  >
                    <Ionicons name="reorder-three" size={24} color={isDragging ? colors.primary : colors.textMuted} />
                  </View>
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
            </Animated.View>
          );
        })
      )}
    </View>
  );

  // ── 4. PROJETOS TAB (CARDS EXPANDIDOS LATERALMENTE) ──
  const renderProjectsTab = () => (
    <View style={styles.tabContent}>
      <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 14 }]}>{t('bandsAndProjectsTitle') || 'Bandas e Projetos'}</Text>
      {(user.projects || []).length === 0 ? (
        <View style={[styles.fullWidthCard, { backgroundColor: colors.cardBackground, borderTopColor: colors.border, borderBottomColor: colors.border, alignItems: 'center', paddingVertical: 24 }]}>
          <Text style={{ color: colors.textMuted, fontSize: 13, fontStyle: 'italic' }}>
            {t('noProjectsRegistered') || 'Nenhum projeto cadastrado.'}
          </Text>
        </View>
      ) : (
        (user.projects || []).map(proj => {
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
                  {/* Linha 1: Nome da banda (fonte ampliada) + Ícone de Sync */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={[styles.projectName, { color: colors.text, fontSize: 18.5, fontWeight: '800', flex: 1 }]} numberOfLines={1}>
                      {proj.name}
                    </Text>
                    {proj.needsSync ? (
                      <Pressable
                        onPress={() => {
                          Alert.alert(
                            t('pendingSyncTitle') || 'Sincronização Pendente',
                            (t('pendingSyncConfirm') || 'Deseja sincronizar os dados e repertório de "{name}" com a nuvem?').replace('{name}', proj.name),
                            [
                              { text: t('cancelBtn') || 'Cancelar', style: 'cancel' },
                              { 
                                text: t('syncBtn') || 'Sincronizar', 
                                onPress: () => {
                                  Alert.alert(t('success') || 'Sucesso', (t('bandSyncedSuccess') || '"{name}" sincronizado com sucesso!').replace('{name}', proj.name));
                                  setUser(prev => ({
                                    ...prev,
                                    projects: (prev.projects || []).map(p => p.id === proj.id ? { ...p, needsSync: false } : p)
                                  }));
                                } 
                              }
                            ]
                          );
                        }}
                        style={({ pressed }) => [
                          styles.syncRoundIcon,
                          { 
                            backgroundColor: 'rgba(234, 179, 8, 0.16)', 
                            borderColor: 'rgba(234, 179, 8, 0.45)',
                            opacity: pressed ? 0.7 : 1,
                            marginLeft: 6
                          }
                        ]}
                        hitSlop={8}
                      >
                        <Ionicons name="alert-circle" size={18} color="#eab308" />
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() => {
                          Alert.alert(t('syncedTitle') || 'Sincronizado', (t('bandAlreadySyncedMsg') || '"{name}" está totalmente sincronizado com a nuvem.').replace('{name}', proj.name));
                        }}
                        style={({ pressed }) => [
                          styles.syncRoundIcon,
                          { 
                            backgroundColor: 'rgba(34, 197, 94, 0.16)', 
                            borderColor: 'rgba(34, 197, 94, 0.45)',
                            opacity: pressed ? 0.7 : 1,
                            marginLeft: 6
                          }
                        ]}
                        hitSlop={8}
                      >
                        <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                      </Pressable>
                    )}
                    <Ionicons name="chevron-forward" size={17} color={colors.textMuted} style={{ marginLeft: 6 }} />
                  </View>

                  {/* Linha 2: Função/Instrumentos e Localização */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                    <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }} numberOfLines={1}>
                      {getProjectInstrument(proj.role, user?.skills)}
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

              {/* Onde estava o botão atualizado, agora fica: Desde... Membro/Proprietário */}
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

  // ── 5. AGENDA TAB (CARDS EXPANDIDOS LATERALMENTE E MAIS COMPACTOS) ──
  const renderAgendaTab = () => (
    <View style={styles.tabContent}>
      {/* Botão compartilhar agenda no estilo translúcido das pílulas, responsivo e compacto */}
      <Pressable
        style={({ pressed }) => [
          styles.shareAgendaPillBtn,
          {
            backgroundColor: colors.primary + '18',
            borderColor: colors.primary,
            opacity: pressed ? 0.75 : 1
          }
        ]}
        onPress={openShareAgendaModal}
      >
        <Ionicons name='share-social' size={16} color={colors.primary} />
        <Text style={[styles.shareAgendaPillText, { color: colors.primary }]}>{t('shareAgenda') || 'Compartilhar Agenda'}</Text>
      </Pressable>
      {(user.agenda || []).length === 0 ? (
        <View style={[styles.fullWidthCard, { backgroundColor: colors.cardBackground, borderTopColor: colors.border, borderBottomColor: colors.border, alignItems: 'center', paddingVertical: 20 }]}>
          <Text style={{ color: colors.textMuted, fontSize: 13, fontStyle: 'italic' }}>
            {t('noEventsScheduledShort') || 'Nenhum evento agendado.'}
          </Text>
        </View>
      ) : (
        (user.agenda || []).map(event => {
          const parts = event.date.split(' ');
          const day = parts[1] || '15';
          const month = parts[2] || 'Out';
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
                <Text style={{ color: colors.primary, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' }}>{month}</Text>
                <Text style={{ color: colors.primary, fontSize: 18, fontWeight: '900', lineHeight: 20 }}>{day}</Text>
              </View>
              <View style={{ flex: 1, paddingVertical: 7, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 14, fontWeight: 'bold' }} numberOfLines={1}>{event.local}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <Ionicons name="mic" size={12} color={colors.textMuted} />
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginLeft: 4 }}>{event.band}</Text>
                  </View>
                </View>
                <Image source={{ uri: event.logo }} style={{ width: 34, height: 34, borderRadius: 17, marginLeft: 10 }} />
              </View>
            </View>
          );
        })
      )}
    </View>
  );

  if (loading && !user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textMuted, marginTop: 14, fontSize: 14, fontWeight: '600' }}>
          {t('loadingProfile') || 'Carregando perfil...'}
        </Text>
      </View>
    );
  }

  if (loadError && !user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: (colors.danger || '#ef4444') + '18', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
          <Ionicons name="cloud-offline-outline" size={44} color={colors.danger || '#ef4444'} />
        </View>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 8 }}>
          {t('noServerConnectionTitle') || 'Sem Conexão com o Servidor'}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 28, paddingHorizontal: 16 }}>
          {loadError || 'Não foi possível conectar ao servidor de dados. Verifique se o servidor está ativo ou tente reconectar.'}
        </Text>

        <Pressable
          style={{ backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, width: '100%', justifyContent: 'center' }}
          onPress={loadUser}
        >
          <Ionicons name="reload" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: 'bold' }}>{t('tryAgain') || 'Tentar Novamente'}</Text>
        </Pressable>

        <Pressable
          style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', justifyContent: 'center' }}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.text} />
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{t('switchAccountOrLogout') || 'Trocar de Conta / Sair'}</Text>
        </Pressable>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const currentDisplayName = user.displayName || user.username;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        {/* Barra superior de ações: Back to Network à esquerda e botões padronizados circulares à direita */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingTop: 4,
          paddingBottom: 10,
        }}>
          {onBack ? (
            <Pressable 
              onPress={handleBackToFeed}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              hitSlop={8}
            >
              <Ionicons name="arrow-back" size={20} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '700' }}>{t('backToNetwork') || 'Voltar para Rede'}</Text>
            </Pressable>
          ) : (
            <View />
          )}

          {/* Botões padronizados circulares: Editar Perfil, Ver Página Pública, Exit */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* Editar Perfil */}
            <Pressable
              onPress={openEditProfileModal}
              style={({ pressed }) => [{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
                justifyContent: 'center',
                alignItems: 'center',
                opacity: pressed ? 0.7 : 1
              }]}
              hitSlop={8}
              accessibilityLabel={t('editProfile') || 'Editar Perfil'}
            >
              <Ionicons name="pencil" size={16} color={colors.primary} />
            </Pressable>

            {/* Ver Página Pública */}
            <Pressable 
              onPress={handleOpenMyPublicPage}
              style={({ pressed }) => [{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
                justifyContent: 'center',
                alignItems: 'center',
                opacity: pressed ? 0.7 : 1
              }]}
              hitSlop={8}
              accessibilityLabel={t('viewPublicPage') || 'Ver Página Pública'}
            >
              <Ionicons name="globe-outline" size={17} color={colors.primary} />
            </Pressable>

            {/* Exit / Sair */}
            <Pressable 
              onPress={handleLogout}
              style={({ pressed }) => [{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: (colors.danger || '#ef4444') + '15',
                borderWidth: 1,
                borderColor: (colors.danger || '#ef4444') + '35',
                justifyContent: 'center',
                alignItems: 'center',
                opacity: pressed ? 0.7 : 1
              }]}
              hitSlop={8}
              accessibilityLabel={t('logout') || 'Sair'}
            >
              <Ionicons name='log-out-outline' size={18} color={colors.danger || '#ef4444'} />
            </Pressable>
          </View>
        </View>
        <View style={styles.headerTop}>
          <Pressable onPress={pickProfileImage}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>{currentDisplayName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={[styles.cameraIcon, { backgroundColor: colors.primary, borderColor: colors.cardBackground }]}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </Pressable>
          <View style={[styles.userInfo, { flex: 1, justifyContent: 'center' }]}>
            {/* Linha 1: Nome */}
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {currentDisplayName}
            </Text>

            {/* Linha 2: username + verificado */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <Text style={[styles.uniqueId, { color: colors.textMuted }]}>
                @{user.username.toLowerCase().replace(/\s+/g, '')}
              </Text>

              {user.isEmailConfirmed ? (
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
            {(user.age != null || (user.city || user.state || user.country)) ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                {user.age != null && (
                  <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '600' }}>
                    {`${user.age} ${t('yearsOld') || 'anos'}`}
                  </Text>
                )}
                {user.age != null && (user.city || user.state || user.country) && (
                  <Text style={{ color: colors.textMuted, opacity: 0.4, fontSize: 12 }}>•</Text>
                )}
                {(user.city || user.state || user.country) ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Ionicons name="location-outline" size={13} color={colors.primary} />
                    <Text style={{ fontSize: 13, color: colors.textMuted }} numberOfLines={1}>
                      {[user.city, user.state].filter(Boolean).join(', ') || user.country}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>

        {/* ── ABAS DE OPÇÕES: COM GUITARRA/VIOLÃO EM INSTRUMENTOS ── */}
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

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={scrollEnabled}
      >
        {!isProfileComplete && (
          <View style={[styles.incompleteProfileBanner, { backgroundColor: colors.isDark ? 'rgba(234, 179, 8, 0.15)' : '#fef9c3', borderColor: colors.isDark ? 'rgba(234, 179, 8, 0.35)' : '#fde047' }]}>
            <Ionicons name="information-circle-outline" size={22} color={colors.isDark ? '#facc15' : '#ca8a04'} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.incompleteProfileBannerTitle, { color: colors.isDark ? '#facc15' : '#854d0e' }]}>
                {t('incompleteProfileTitle') || 'Complete seu Perfil'}
              </Text>
              <Text style={[styles.incompleteProfileBannerText, { color: colors.isDark ? '#e2e8f0' : '#713f12' }]}>
                {t('incompleteProfileMsg') || 'Adicione ao menos seus instrumentos ou localização para liberar seu acesso ao feed da Rede BandLink.'}
              </Text>
            </View>
          </View>
        )}
        {activeTab === 'bio' && renderBioTab()}
        {activeTab === 'skills' && renderSkillsTab()}
        {activeTab === 'instruments' && renderInstrumentsTab()}
        {activeTab === 'projects' && renderProjectsTab()}
        {activeTab === 'agenda' && renderAgendaTab()}
      </ScrollView>

      {/* ── MODAL DE COMPARTILHAMENTO DE AGENDA DO MÚSICO ── */}
      <ShareAgendaModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        events={(user?.agenda || []).map(event => ({
          id: event.id,
          name: event.band || event.local || 'Show',
          local: event.local || '',
          date: event.date || '',
          band: event.band || '',
          logo: event.logo || null,
        }))}
        displayName={currentDisplayName}
        headerLogo={profileImage || (currentDisplayName ? `https://ui-avatars.com/api/?name=${encodeURIComponent(currentDisplayName)}&background=random` : null)}
        qrValue={'https://setlistbandmanager.com/u/' + String(user?.username || 'user').toLowerCase().replace(/\s+/g, '')}
      />

      {/* ── 2. SKILL MODAL (BOTTOM SHEET) ── */}
      <Modal visible={showSkillModal} transparent animationType='slide' onRequestClose={() => setShowSkillModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowSkillModal(false)} />
          <View style={[styles.bottomSheetContent, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
            <View style={[styles.dragHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
            <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 16 }]}>
              {editingSkill ? 'Editar Habilidade' : 'Nova Habilidade'}
            </Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9' }]}
              value={skillName}
              onChangeText={setSkillName}
              maxLength={100}
            />
            <Text style={{ color: colors.text, marginBottom: 8, marginTop: 16, fontWeight: 'bold' }}>{t('masteryLevel') || 'Nível de Domínio'}</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24, justifyContent: 'center' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <Pressable key={star} onPress={() => setSkillStars(star)} hitSlop={4}>
                  <Ionicons name={star <= skillStars ? 'star' : 'star-outline'} size={34} color={star <= skillStars ? colors.primary : colors.border} />
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable style={[styles.syncButton, { flex: 1, backgroundColor: isDark ? '#1e293b' : '#e5e7eb' }]} onPress={() => setShowSkillModal(false)}>
                <Text style={{ color: colors.text, fontWeight: 'bold' }}>{t('cancelBtn') || 'Cancelar'}</Text>
              </Pressable>
              <Pressable style={[styles.syncButton, { flex: 1, backgroundColor: colors.primary }]} onPress={handleSaveSkill}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{editingSkill ? (t('saveBtn') || 'Salvar') : (t('addBtn') || 'Adicionar')}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── 3. INFLUENCES MODAL (BOTTOM SHEET - SEM #, 0 A 5 ESTRELAS, ATÉ 5 ESTILOS) ── */}
      <Modal visible={showInfluenceModal} transparent animationType='slide' onRequestClose={() => setShowInfluenceModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowInfluenceModal(false)} />
          <View style={[styles.bottomSheetContent, { backgroundColor: colors.cardBackground, borderTopColor: colors.border, maxHeight: '90%' }]}>
            <View style={[styles.dragHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
            
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{t('influencesAndStylesTitle') || 'Influências e Estilos'}</Text>
                <View style={{ backgroundColor: colors.primary + '18', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '800' }}>
                    {(user.influences || []).length}/5
                  </Text>
                </View>
              </View>
              <Pressable onPress={() => setShowInfluenceModal(false)} hitSlop={10}>
                <Ionicons name='close' size={24} color={colors.text} />
              </Pressable>
            </View>

            {/* Campo para Adicionar Nova Influência (se menor que 5) */}
            {(user.influences || []).length < 5 ? (
              <View style={{ marginBottom: 14, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 8 }}>{t('addInfluenceLabel') || 'ADICIONAR INFLUÊNCIA'}</Text>
                <TextInput
                  style={[styles.input, { minHeight: 44, paddingVertical: 8, marginBottom: 8, color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9' }]}
                  value={newInfluenceName}
                  onChangeText={setNewInfluenceName}
                  maxLength={300}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>{t('weightLabel') || 'Peso:'}</Text>
                    {renderStars(newInfluenceStars, 22, true, setNewInfluenceStars)}
                    <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary }}>{newInfluenceStars}★</Text>
                  </View>
                  <Pressable 
                    onPress={handleAddInfluence}
                    style={{ backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{t('includeBtn') || 'Incluir'}</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={{ backgroundColor: colors.primary + '15', padding: 8, borderRadius: 8, marginBottom: 12, alignItems: 'center' }}>
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>{t('maxInfluencesReached') || 'Limite de 5 influências atingido.'}</Text>
              </View>
            )}

            {/* Lista de Influências cadastradas (limpa, sem subtexto de estrelas) */}
            <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
              {(!user.influences || user.influences.length === 0) ? (
                <Text style={{ color: colors.textMuted, fontStyle: 'italic', paddingVertical: 12, textAlign: 'center' }}>{t('noInfluencesRegistered') || 'Nenhuma influência cadastrada.'}</Text>
              ) : (
                user.influences.map((inf) => (
                  <View 
                    key={inf.id} 
                    style={{ 
                      flexDirection: 'row', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      paddingVertical: 10, 
                      paddingHorizontal: 12,
                      marginBottom: 6,
                      borderRadius: 10,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
                      borderWidth: 1,
                      borderColor: colors.border
                    }}
                  >
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>{inf.name}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      {renderStars(inf.stars, 20, true, (newStars) => handleUpdateInfluenceStars(inf.id, newStars))}
                      <Pressable onPress={() => handleRemoveInfluence(inf.id)} hitSlop={8} style={{ padding: 4 }}>
                        <Ionicons name="trash-outline" size={18} color={colors.danger || '#ef4444'} />
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <Pressable 
              style={[styles.syncButton, { backgroundColor: colors.primary, marginTop: 14 }]} 
              onPress={() => setShowInfluenceModal(false)}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('doneBtn') || 'Concluir'}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── 4. GEAR / EQUIPAMENTOS MODAL (CATEGORIA + MARCA/MODELO COM EXCLUSÃO SEGURA) ── */}
      <Modal visible={showGearModal} transparent animationType='slide' onRequestClose={() => setShowGearModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowGearModal(false)} />
          <View style={[styles.bottomSheetContent, { backgroundColor: colors.cardBackground, borderTopColor: colors.border, maxHeight: '90%' }]}>
            <View style={[styles.dragHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
            
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingGear ? (t('editGearTitle') || 'Editar Equipamento') : (t('addGearTitle') || 'Novo Equipamento')}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                {editingGear && (
                  <Pressable 
                    onPress={confirmDeleteGear} 
                    hitSlop={8}
                    accessibilityLabel="Excluir equipamento"
                  >
                    <Ionicons name="trash-outline" size={22} color={colors.danger || '#ef4444'} />
                  </Pressable>
                )}
                <Pressable onPress={() => setShowGearModal(false)} hitSlop={10}>
                  <Ionicons name='close' size={24} color={colors.text} />
                </Pressable>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* 1. CATEGORIA */}
              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 8 }}>{t('categoryLabel') || 'CATEGORIA'}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {STANDARD_CATEGORIES.map(cat => (
                  <Pressable
                    key={cat}
                    onPress={() => setGearCategory(cat)}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      borderWidth: 1.5,
                      borderColor: gearCategory === cat ? colors.primary : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'),
                      backgroundColor: gearCategory === cat ? colors.primary + '22' : 'transparent',
                    }}
                  >
                    <Text style={{
                      fontSize: 12,
                      fontWeight: gearCategory === cat ? '800' : '600',
                      color: gearCategory === cat ? colors.primary : colors.textMuted
                    }}>
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* SE CATEGORIA 'OUTROS' FOR MARCADA, DIGITAR A CATEGORIA PERSONALIZADA */}
              {gearCategory === 'Outros' && (
                <View style={{ marginBottom: 14, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '800', marginBottom: 6 }}>{t('whichCategoryLabel') || 'QUAL A CATEGORIA?'}</Text>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9', minHeight: 44, paddingVertical: 8 }]}
                    value={customCategory}
                    onChangeText={setCustomCategory}
                    maxLength={100}
                  />
                </View>
              )}

              {/* 2. MARCA / MODELO */}
              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>{t('brandModelLabel') || 'MARCA / MODELO *'}</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9', marginBottom: 14 }]}
                value={gearName}
                onChangeText={setGearName}
                maxLength={200}
              />

              {/* 3. OBSERVAÇÕES ADICIONAIS */}
              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>{t('additionalNotesLabel') || 'OBSERVAÇÕES ADICIONAIS (OPCIONAL)'}</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9', minHeight: 64, marginBottom: 16 }]}
                value={gearDetails}
                onChangeText={setGearDetails}
                multiline
                maxLength={1000}
              />
            </ScrollView>

            {/* Botão de Excluir dentro do Modal de Edição */}
            {editingGear && (
              <Pressable 
                style={[
                  styles.syncButton, 
                  { 
                    backgroundColor: (colors.danger || '#ef4444') + '15', 
                    borderWidth: 1, 
                    borderColor: (colors.danger || '#ef4444') + '40',
                    marginBottom: 12,
                    marginTop: 4
                  }
                ]} 
                onPress={confirmDeleteGear}
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger || '#ef4444'} />
                <Text style={{ color: colors.danger || '#ef4444', fontWeight: 'bold' }}>{t('deleteGearBtn') || 'Excluir Equipamento'}</Text>
              </Pressable>
            )}

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
              <Pressable style={[styles.syncButton, { flex: 1, backgroundColor: isDark ? '#1e293b' : '#e5e7eb' }]} onPress={() => setShowGearModal(false)}>
                <Text style={{ color: colors.text, fontWeight: 'bold' }}>{t('cancelBtn') || 'Cancelar'}</Text>
              </Pressable>
              <Pressable style={[styles.syncButton, { flex: 1, backgroundColor: colors.primary }]} onPress={handleSaveGear}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{editingGear ? (t('saveBtn') || 'Salvar') : (t('addBtn') || 'Adicionar')}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── UNIFIED EDIT PROFILE MODAL (NOME, ANIVERSÁRIO, LOCALIZAÇÃO) ── */}
      <Modal visible={showEditProfileModal} transparent animationType='slide' onRequestClose={() => setShowEditProfileModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowEditProfileModal(false)} />
          <View style={[styles.bottomSheetContent, { backgroundColor: colors.cardBackground, borderTopColor: colors.border, maxHeight: '85%' }]}>
            <View style={[styles.dragHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
            <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 16 }]}>{t('editProfile') || 'Editar Perfil'}</Text>
            
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Nome de Exibição */}
              <View style={{ marginBottom: 14 }}>
                <Text style={[styles.inputSubLabel, { color: colors.textMuted }]}>{t('displayName') || 'NOME DE EXIBIÇÃO'}</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9' }]}
                  value={editProfileName}
                  onChangeText={setEditProfileName}
                  placeholder={t('displayNamePlaceholder') || 'Seu nome no palco'}
                  placeholderTextColor={colors.textMuted}
                  maxLength={50}
                />
              </View>

              {/* Data de Nascimento */}
              <View style={{ marginBottom: 14 }}>
                <Text style={[styles.inputSubLabel, { color: colors.textMuted }]}>{t('birthDate') || 'DATA DE NASCIMENTO'}</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9' }]}
                  value={editProfileBirthDate}
                  onChangeText={(val) => setEditProfileBirthDate(formatBirthDateInput(val))}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </View>

              {/* País e Estado em Linha */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                <View style={{ flex: 1.2 }}>
                  <Text style={[styles.inputSubLabel, { color: colors.textMuted }]}>{t('countryLabel') || 'PAÍS'}</Text>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9' }]}
                    value={editProfileCountry}
                    onChangeText={setEditProfileCountry}
                    placeholder={t('countryPlaceholder') || 'Brasil'}
                    placeholderTextColor={colors.textMuted}
                    maxLength={50}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputSubLabel, { color: colors.textMuted }]}>{t('stateUfLabel') || 'ESTADO (UF)'}</Text>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9' }]}
                    value={editProfileState}
                    onChangeText={setEditProfileState}
                    placeholder={t('statePlaceholder') || 'UF / Estado'}
                    placeholderTextColor={colors.textMuted}
                    maxLength={50}
                  />
                </View>
              </View>

              {/* Cidade */}
              <View style={{ marginBottom: 14 }}>
                <Text style={[styles.inputSubLabel, { color: colors.textMuted }]}>{t('cityLabel') || 'CIDADE'}</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9' }]}
                  value={editProfileCity}
                  onChangeText={setEditProfileCity}
                  placeholder={t('cityPlaceholder') || 'Cidade'}
                  placeholderTextColor={colors.textMuted}
                  maxLength={100}
                />
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <Pressable style={[styles.syncButton, { flex: 1, backgroundColor: isDark ? '#1e293b' : '#e5e7eb' }]} onPress={() => setShowEditProfileModal(false)}>
                <Text style={{ color: colors.text, fontWeight: 'bold' }}>{t('cancelBtn') || 'Cancelar'}</Text>
              </Pressable>
              <Pressable style={[styles.syncButton, { flex: 1, backgroundColor: colors.primary }]} onPress={handleSaveUserProfile}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('saveBtn') || 'Salvar'}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL DE VISUALIZAÇÃO DA PÁGINA PÚBLICA ── */}
      <MusicianProfileModal
        visible={showPublicPage}
        musician={myPublicProfile}
        onClose={() => {
          setShowPublicPage(false);
          setMyPublicProfile(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    borderBottomWidth: 1, 
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) + 10 : 44 
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16 },
  
  // Avatar aumentado e marcante
  avatar: { width: 86, height: 86, borderRadius: 43, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 38, fontWeight: 'bold', color: '#fff' },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2.5 },
  
  userInfo: { flex: 1, marginLeft: 16 },
  name: { fontSize: 21, fontWeight: 'bold' },
  uniqueId: { fontSize: 14, marginTop: 3 },
  logoutIcon: { padding: 8 },
  
  // Abas de opções com ícones
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
  cleanActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 6 },
  cleanActionText: { fontSize: 12, fontWeight: '700' },
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
  syncButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 8 },
  syncButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  shareButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8, marginBottom: 16 },
  shareButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  syncRoundIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  shareAgendaPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 8,
    marginBottom: 10,
    alignSelf: 'stretch',
  },
  shareAgendaPillText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

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

  // Bottom Sheet Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  bottomSheetContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 36, borderWidth: 1, borderBottomWidth: 0, maxHeight: '88%' },
  dragHandle: { width: 44, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  layoutOption: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8, gap: 12 },
  layoutName: { fontSize: 15, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, minHeight: 48, textAlignVertical: 'top' },
  inputSubLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
  pickerButton: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerButtonText: { fontSize: 14 },
  pickerOptionRow: { paddingVertical: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth },
  incompleteProfileBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  incompleteProfileBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  incompleteProfileBannerText: {
    fontSize: 12,
    lineHeight: 17,
  },
});
