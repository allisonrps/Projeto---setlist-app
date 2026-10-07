import AsyncStorage from '@react-native-async-storage/async-storage';
import { bandService } from './bandService';
import { setlistService } from './setlistService';

export const MOCK_MUSICIANS = [
  {
    id: 'mus-1',
    name: 'Lucas Silveira',
    username: 'lucas_bass',
    imageUri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    primaryInstruments: [
      { name: 'Bass', stars: 5, isPrimary: true },
      { name: 'Acoustic Guitar', stars: 4 }
    ],
    primaryInstrument: 'Bass',
    stars: 5,
    city: 'São Paulo',
    state: 'SP',
    country: 'Brazil',
    availability: 'Available',
    interestLevel: ['Professional', 'Live Touring', 'Studio Sessions'],
    influences: ['Classic Rock', 'Post-Punk', 'Indie Rock', 'Funk', 'Blues'],
    bio: 'Bassist with 8 years of studio and stage experience. Specialized in analog tones, melodic basslines, and solid groove.',
    instagram: 'lucas_bass',
    youtube: 'https://youtube.com/@lucassilveirabass',
    twitter: 'lucas_bass',
    spotify: 'lucassilveirabass',
    gear: [
      { id: 'g1', category: 'Bass', name: 'Fender Jazz Bass 1975 Reissue', details: 'D\'Addario flatwound strings, maple neck' },
      { id: 'g2', category: 'Amplifier', name: 'Ampeg SVT-CL 300W', details: 'Classic 4x10 cabinet' },
      { id: 'g3', category: 'Pedal/Effect', name: 'Darkglass Vintage Microtubes', details: 'Analog preamp & overdrive' }
    ],
    bands: [
      { 
        id: 'b1', 
        name: 'The Velvet Stones', 
        role: 'Bassist', 
        since: '2021',
        period: '2021 - Present',
        memberType: 'Integrante',
        city: 'São Paulo',
        state: 'SP',
        country: 'Brasil',
        genres: ['Classic Rock', 'Indie Rock', 'Blues'],
        imageUri: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=200&auto=format&fit=crop&q=80',
        logo: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=200&auto=format&fit=crop&q=80'
      },
      { 
        id: 'b2', 
        name: 'Night Echoes', 
        role: 'Bassist & Backing Vocals', 
        since: '2019',
        period: '2019 - 2021',
        memberType: 'Fundador',
        city: 'São Paulo',
        state: 'SP',
        country: 'Brasil',
        genres: ['Post-Punk', 'Darkwave', 'Indie Rock'],
        imageUri: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=80',
        logo: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=80'
      }
    ],
    agenda: [
      { id: 'mus-1-ag1', title: 'Summer Rock Festival', date: '2026-10-24', local: 'Audio Club', city: 'São Paulo', status: 'Confirmed' },
      { id: 'mus-1-ag2', title: 'Indie Revival Tour', date: '2026-11-18', local: 'Cine Joia', city: 'São Paulo', status: 'Confirmed' }
    ]
  },
  {
    id: 'mus-2',
    name: 'Mariana Costa',
    username: 'mari_drummer',
    imageUri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    primaryInstruments: [
      { name: 'Drums', stars: 5, isPrimary: true },
      { name: 'Percussion', stars: 4 }
    ],
    primaryInstrument: 'Drums',
    stars: 5,
    city: 'São Paulo',
    state: 'SP',
    country: 'Brazil',
    availability: 'Available',
    interestLevel: ['Professional', 'Studio & Live'],
    influences: ['Pop Rock', 'Indie', 'Alternative', 'Hard Rock', 'Groove'],
    bio: 'Drummer with precise timing and refined dynamics. Available for committed projects, live tours, and studio recordings.',
    instagram: 'mari_drummer',
    youtube: 'https://youtube.com/@maricostadrums',
    spotify: 'maricostadrums',
    gear: [
      { id: 'g4', category: 'Drums', name: 'DW Collector Series Drum Kit', details: '22 kick, 10 & 12 toms, 16 floor tom' },
      { id: 'g5', category: 'Cymbals', name: 'Zildjian K Custom Dark Set', details: '14 Hi-hat, 16/18 Crash, 21 Ride' },
      { id: 'g6', category: 'Microphone', name: 'Shure Drum Mic Kit PGA98', details: 'Complete drum microphone set' }
    ],
    bands: [
      { 
        id: 'b3', 
        name: 'ElectroShock Band', 
        role: 'Drummer', 
        since: '2022',
        period: '2022 - Present',
        memberType: 'Líder / Proprietário',
        city: 'São Paulo',
        state: 'SP',
        country: 'Brasil',
        genres: ['Pop Rock', 'Hard Rock', 'Alternative'],
        imageUri: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&auto=format&fit=crop&q=80',
        logo: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&auto=format&fit=crop&q=80'
      }
    ],
    agenda: [
      { id: 'mus-2-ag1', title: 'ElectroShock Arena Tour', date: '2026-10-30', local: 'Espaço Unimed', city: 'São Paulo', status: 'Confirmed' },
      { id: 'mus-2-ag2', title: 'Groove & Beats Fest', date: '2026-12-05', local: 'Memorial AL', city: 'São Paulo', status: 'Scheduled' }
    ]
  },
  {
    id: 'mus-3',
    name: 'Rodrigo Mendes',
    username: 'rodrigo_keys',
    imageUri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    primaryInstruments: [
      { name: 'Keyboards', stars: 5, isPrimary: true },
      { name: 'Synthesizer', stars: 4 }
    ],
    primaryInstrument: 'Keyboards',
    stars: 4,
    city: 'Belo Horizonte',
    state: 'MG',
    country: 'Brazil',
    availability: 'Available',
    interestLevel: ['Professional', 'Hobby'],
    influences: ['MPB', 'Jazz', 'Soul', 'Funk', 'Bossa Nova'],
    bio: 'Keyboardist passionate about Fender Rhodes, vintage synth tones, and sophisticated chord harmonies.',
    instagram: 'rodrigo_keys',
    youtube: 'https://youtube.com/@rodrigomendeskeys',
    spotify: 'rodrigomendeskeys',
    gear: [
      { id: 'g7', category: 'Keyboards', name: 'Nord Stage 3 88', details: 'Professional stage piano & synth workstation' },
      { id: 'g8', category: 'Pedal/Effect', name: 'Strymon BlueSky Reverb', details: 'Stereo ambient reverb pedal' }
    ],
    bands: [
      { 
        id: 'b4', 
        name: 'Jazz & Soul Collective', 
        role: 'Keyboardist', 
        since: '2020',
        period: '2020 - Present',
        memberType: 'Fundador',
        city: 'Belo Horizonte',
        state: 'MG',
        country: 'Brasil',
        genres: ['Jazz', 'Soul', 'Bossa Nova', 'MPB'],
        imageUri: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=200&auto=format&fit=crop&q=80',
        logo: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=200&auto=format&fit=crop&q=80'
      }
    ],
    agenda: [
      { id: 'mus-3-ag1', title: 'Jazz & Wine Night', date: '2026-10-28', local: 'Clube Chalezinho', city: 'Belo Horizonte', status: 'Confirmed' },
      { id: 'mus-3-ag2', title: 'Soul Sessions Live', date: '2026-11-22', local: 'A Autêntica', city: 'Belo Horizonte', status: 'Confirmed' }
    ]
  },
  {
    id: 'mus-4',
    name: 'Camila Duarte',
    username: 'camila_vox',
    imageUri: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
    primaryInstruments: [
      { name: 'Vocals', stars: 5, isPrimary: true },
      { name: 'Acoustic Guitar', stars: 4 }
    ],
    primaryInstrument: 'Vocals',
    stars: 5,
    city: 'Curitiba',
    state: 'PR',
    country: 'Brazil',
    availability: 'Available',
    interestLevel: ['Professional', 'Live Touring'],
    influences: ['Hard Rock', 'Classic Rock', 'Blues', 'Heavy Metal'],
    bio: 'Lead vocalist with wide vocal range, energetic stage presence, and rock festival experience.',
    instagram: 'camila_vox',
    youtube: 'https://youtube.com/@camiladuartevox',
    spotify: 'camiladuartevox',
    gear: [
      { id: 'g9', category: 'Microphone', name: 'Shure Beta 58A', details: 'Supercardioid dynamic vocal microphone' },
      { id: 'g10', category: 'Acoustic Guitar', name: 'Takamine GD30CE', details: 'Steel-string acoustic-electric' }
    ],
    bands: [
      { 
        id: 'b5', 
        name: 'Iron Roses', 
        role: 'Lead Vocalist', 
        since: '2019',
        period: '2019 - Present',
        memberType: 'Fundadora',
        city: 'Curitiba',
        state: 'PR',
        country: 'Brasil',
        genres: ['Hard Rock', 'Classic Rock', 'Heavy Metal'],
        imageUri: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=200&auto=format&fit=crop&q=80',
        logo: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=200&auto=format&fit=crop&q=80'
      }
    ],
    agenda: [
      { id: 'mus-4-ag1', title: 'Iron Roses Rock Night', date: '2026-10-25', local: 'Tork n Roll', city: 'Curitiba', status: 'Confirmed' },
      { id: 'mus-4-ag2', title: 'Hard Rock Live Series', date: '2026-11-15', local: 'Opera de Arame', city: 'Curitiba', status: 'Confirmed' }
    ]
  },
  {
    id: 'mus-5',
    name: 'Felipe Almeida',
    username: 'felipe_guitar',
    imageUri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    primaryInstruments: [
      { name: 'Electric Guitar', stars: 5, isPrimary: true },
      { name: 'Acoustic Guitar', stars: 4 }
    ],
    primaryInstrument: 'Electric Guitar',
    stars: 4,
    city: 'Rio de Janeiro',
    state: 'RJ',
    country: 'Brazil',
    availability: 'Available',
    interestLevel: ['Professional', 'Songwriting'],
    influences: ['Stoner Rock', 'Heavy Metal', 'Blues Rock', 'Grunge'],
    bio: 'Lead and rhythm guitarist, analog pedalboard enthusiast, high-energy groove, and original songwriting.',
    instagram: 'felipe_guitar',
    youtube: 'https://youtube.com/@felipealmeidaguitar',
    spotify: 'felipealmeidaguitar',
    gear: [
      { id: 'g11', category: 'Guitar', name: 'Gibson Les Paul Traditional', details: '57 Classic pickups' },
      { id: 'g12', category: 'Amplifier', name: 'Orange Rockerverb 50W', details: 'British all-tube head' },
      { id: 'g13', category: 'Pedal/Effect', name: 'Ibanez Tube Screamer TS9', details: 'Classic overdrive pedal' }
    ],
    bands: [
      { 
        id: 'b6', 
        name: 'Black Velvet', 
        role: 'Lead Guitarist', 
        since: '2022',
        period: '2022 - Present',
        memberType: 'Líder / Proprietário',
        city: 'Rio de Janeiro',
        state: 'RJ',
        country: 'Brasil',
        genres: ['Stoner Rock', 'Heavy Metal', 'Grunge'],
        imageUri: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=200&auto=format&fit=crop&q=80',
        logo: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=200&auto=format&fit=crop&q=80'
      }
    ],
    agenda: [
      { id: 'mus-5-ag1', title: 'Black Velvet Album Release', date: '2026-10-27', local: 'Circo Voador', city: 'Rio de Janeiro', status: 'Confirmed' },
      { id: 'mus-5-ag2', title: 'Lapa Rock Showcase', date: '2026-11-20', local: 'Fundição Progresso', city: 'Rio de Janeiro', status: 'Scheduled' }
    ]
  }
];

const INVITES_STORAGE_KEY = 'user_band_invites';

const INITIAL_SAMPLE_INVITES = [
  {
    id: 'inv-sample-1',
    bandName: 'Velvet & Fuzz',
    bandImage: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600&auto=format&fit=crop&q=80',
    role: 'Rhythm Guitarist',
    status: 'pending', // 'pending' | 'accepted' | 'rejected'
    invitedUsername: 'me',
    invitedName: 'You',
    senderName: 'Felipe Almeida',
    senderUsername: 'felipe_guitar',
    city: 'Rio de Janeiro',
    state: 'RJ',
    country: 'Brazil',
    bandType: 'both',
    description: 'Stoner Rock & Indie band with vintage vibes, tight repertoire, and new original songs in pre-production.',
    genres: ['Stoner Rock', 'Indie Rock', 'Grunge', 'Blues Rock'],
    songsCount: 14,
    membersCount: 4,
    showsCount: 3,
    rehearsalsCount: 8,
    date: 'Today',
    message: 'Hey! We checked out your profile and loved your style. We would love to invite you to join our project!',
    replyMessage: '',
    members: [
      { id: 'm1', name: 'Felipe Almeida', username: 'felipe_guitar', role: 'Lead Guitarist & Founder', since: '2022' },
      { id: 'm2', name: 'Mariana Costa', username: 'mari_drummer', role: 'Drummer', since: '2022' },
      { id: 'm3', name: 'Lucas Silveira', username: 'lucas_bass', role: 'Bassist', since: '2023' },
      { id: 'm4', name: 'You', username: 'me', role: 'Rhythm Guitarist', since: 'Pending', status: 'pending' }
    ],
    songs: [
      { id: 's1', name: 'No One Knows', originalBand: 'Queens of the Stone Age', duration: '04:38' },
      { id: 's2', name: 'Black Math', originalBand: 'The White Stripes', duration: '03:03' },
      { id: 's3', name: 'Cherub Rock', originalBand: 'The Smashing Pumpkins', duration: '04:58' },
      { id: 's4', name: 'Cochise', originalBand: 'Audioslave', duration: '03:42' },
      { id: 's5', name: 'Everlong', originalBand: 'Foo Fighters', duration: '04:10' },
      { id: 's6', name: 'Song 2', originalBand: 'Blur', duration: '02:02' },
      { id: 's7', name: 'Reptilia', originalBand: 'The Strokes', duration: '03:39' },
      { id: 's8', name: 'Kashmir', originalBand: 'Led Zeppelin', duration: '08:32' }
    ],
    agenda: [
      { id: 'a1', title: 'Lapa Rock Festival', date: '2026-10-24', local: 'Circo Voador', city: 'Rio de Janeiro', status: 'Confirmed' },
      { id: 'a2', title: 'Indie Fuzz Night', date: '2026-11-14', local: 'Audio Rebel', city: 'Rio de Janeiro', status: 'Confirmed' },
      { id: 'a3', title: 'Year-End Special Live', date: '2026-12-19', local: 'Garage Grindhouse', city: 'Rio de Janeiro', status: 'Scheduled' }
    ]
  }
];

export const musiciansService = {
  getMusicians() {
    return MOCK_MUSICIANS;
  },

  async getMusicianByUsername(rawUsername, fallbackName = '') {
    if (!rawUsername && !fallbackName) return null;
    const cleanUser = String(rawUsername || '').replace(/^@+/, '').trim().toLowerCase();
    const cleanName = String(fallbackName || '').trim().toLowerCase();

    // 1. Check in MOCK_MUSICIANS
    const match = MOCK_MUSICIANS.find(m => 
      (cleanUser && m.username.toLowerCase() === cleanUser) ||
      (cleanName && m.name.toLowerCase() === cleanName)
    );
    if (match) return match;

    // 2. Check current user cache
    try {
      const cached = await AsyncStorage.getItem('user_profile_cache');
      const savedUserStr = await AsyncStorage.getItem('user_info');
      const parsedUserObj = savedUserStr ? JSON.parse(savedUserStr) : {};
      const profileImg = await AsyncStorage.getItem('profileImage');
      const savedGearStr = await AsyncStorage.getItem('user_gear');
      const parsedGear = savedGearStr ? JSON.parse(savedGearStr) : [];

      const localBands = await bandService.getAll();
      const myBandsFormatted = await Promise.all((localBands || []).map(async (b) => {
        let role = 'Músico';
        let memberType = 'Proprietário';
        try {
          const members = await bandService.getBandMembers(b.id);
          if (b.myMemberId && members && members.length > 0) {
            const found = members.find(m => m.id === b.myMemberId);
            if (found) {
              role = found.role || 'Músico';
              memberType = found.isLeader ? 'Líder / Proprietário' : 'Integrante';
            }
          }
        } catch (e) {}

        let parsedGenres = [];
        if (b.genres) {
          try {
            parsedGenres = typeof b.genres === 'string' && b.genres.startsWith('[')
              ? JSON.parse(b.genres)
              : String(b.genres).split(',').map(s => s.trim()).filter(Boolean);
          } catch (e) {
            parsedGenres = String(b.genres).split(',').map(s => s.trim()).filter(Boolean);
          }
        }

        let sinceYear = '2023';
        if (b.startDate) {
          if (String(b.startDate).includes('/')) {
            sinceYear = String(b.startDate).split('/').pop().trim();
          } else if (String(b.startDate).includes('-')) {
            sinceYear = String(b.startDate).split('-')[0].trim();
          } else {
            const match = String(b.startDate).match(/\b(19\d{2}|20\d{2})\b/);
            sinceYear = match ? match[0] : String(b.startDate).substring(0, 4);
          }
        }

        return {
          id: String(b.id),
          bandId: b.id,
          name: b.name,
          bandName: b.name,
          imageUri: b.imageUri || null,
          logo: b.imageUri || null,
          role,
          memberType,
          since: sinceYear,
          period: `${sinceYear} - Presente`,
          city: b.city || '',
          state: b.state || '',
          country: b.country || '',
          genres: parsedGenres.length > 0 ? parsedGenres : ['Rock', 'Pop'],
          bandType: b.bandType,
          isCover: b.isCover,
          isAutoral: b.isAutoral
        };
      }));

      let myBandAgenda = [];
      try {
        const allSetlists = await setlistService.getAll();
        const myBandIds = new Set((localBands || []).map(b => b.id));
        myBandAgenda = (allSetlists || [])
          .filter(s => s && (myBandIds.has(s.myBandId) || !s.myBandId) && ((s.date && s.date.trim()) || (s.local && s.local.trim())))
          .map(s => {
            const bandObj = (localBands || []).find(b => b.id === s.myBandId);
            let formattedDate = s.date || 'A definir';
            if (s.time) formattedDate += ` • ${s.time}`;
            return {
              id: String(s.id),
              band: bandObj ? bandObj.name : (s.bandName || s.name || 'Banda'),
              name: s.name,
              title: s.name,
              date: formattedDate,
              time: s.time || '',
              local: s.local || s.name || 'Local a definir',
              city: s.city || bandObj?.city || '',
              logo: bandObj?.imageUri || s.bandImageUri || null,
              status: (s.cacheStatus || 'paid') === 'paid' ? 'Confirmed' : 'Pending'
            };
          });
      } catch (e) {
        console.log('Error loading band shows for musician agenda:', e);
      }

      if (cached || savedUserStr) {
        const parsed = cached ? JSON.parse(cached) : parsedUserObj;
        const parsedUser = String(parsed.username || parsedUserObj.username || '').replace(/^@+/, '').toLowerCase();
        if ((cleanUser && parsedUser === cleanUser) || cleanUser === 'me' || cleanUser === 'voce' || cleanUser === 'você') {
          let userSkills = parsed.skills || parsed.instruments || [];
          if (typeof userSkills === 'string') {
            try { userSkills = JSON.parse(userSkills); } catch (e) { userSkills = []; }
          }
          if (!Array.isArray(userSkills) || userSkills.length === 0) {
            userSkills = [{ instrument: parsed.primaryInstrument || 'Guitarra', stars: 5, isPrimary: true }];
          }

          let userInfluences = parsed.influences || [];
          if (typeof userInfluences === 'string') {
            try { userInfluences = JSON.parse(userInfluences); } catch (e) { userInfluences = []; }
          }
          if (!Array.isArray(userInfluences) || userInfluences.length === 0) {
            userInfluences = [
              { id: '1', name: 'Rock Clássico', stars: 5 },
              { id: '2', name: 'Blues', stars: 4 }
            ];
          }

          let userInterest = parsed.interestLevel || ['Profissional'];
          if (typeof userInterest === 'string') {
            try { userInterest = JSON.parse(userInterest); } catch (e) { userInterest = [userInterest]; }
          }

          return {
            id: parsed.id || 'me',
            name: parsed.displayName || parsed.name || parsedUserObj.displayName || 'Você',
            username: parsed.username || parsedUserObj.username || 'usuario',
            imageUri: profileImg || null,
            skills: userSkills,
            primaryInstruments: userSkills,
            primaryInstrument: parsed.primaryInstrument || (userSkills[0]?.instrument || userSkills[0]?.name || 'Guitarra'),
            stars: 5,
            city: parsed.city || '',
            state: parsed.state || '',
            country: parsed.country || '',
            birthDate: parsed.birthDate || parsedUserObj.birthDate || null,
            age: parsed.age != null ? parsed.age : (parsedUserObj.age != null ? parsedUserObj.age : null),
            isEmailConfirmed: !!(parsed.isEmailConfirmed ?? parsedUserObj.isEmailConfirmed),
            availability: parsed.availability || 'Disponível',
            interestLevel: userInterest,
            influences: userInfluences,
            bio: parsed.bio || 'Músico ativo na plataforma Setlist.',
            instagram: parsed.instagram || '',
            youtube: parsed.youtube || '',
            twitter: parsed.twitter || '',
            facebook: parsed.facebook || '',
            spotify: parsed.spotify || '',
            tiktok: parsed.tiktok || '',
            agenda: myBandAgenda.length > 0 ? myBandAgenda : (parsed.agenda || []),
            gear: parsedGear.length > 0 ? parsedGear : [
              { id: '1', category: 'Guitarra', name: 'Fender Stratocaster Player', details: 'Sunburst, Maple Neck', isPrimary: true },
              { id: '2', category: 'Amplificador', name: 'Marshall DSL40CR', details: 'Combo Valvulado 40W' }
            ],
            bands: myBandsFormatted,
            projects: myBandsFormatted
          };
        }
      }
    } catch (e) {}

    // 3. Fallback dynamic musician profile
    const displayName = fallbackName || (cleanUser ? (cleanUser.charAt(0).toUpperCase() + cleanUser.slice(1).replace(/_/g, ' ')) : 'Guest Musician');
    return {
      id: 'mus-dyn-' + (cleanUser || 'user'),
      name: displayName,
      username: cleanUser || 'musician',
      primaryInstruments: [{ name: 'Instrument', stars: 5, isPrimary: true }],
      primaryInstrument: 'Instrument',
      stars: 5,
      city: '',
      state: '',
      country: '',
      availability: 'Available',
      interestLevel: ['Professional', 'Hobby'],
      influences: ['Rock', 'Pop', 'Indie'],
      bio: `Musician @${cleanUser || 'musician'} on the Setlist network.`,
      instagram: cleanUser ? `${cleanUser}` : '',
      youtube: '',
      gear: [
        { id: 'dyn-g1', category: 'Instrument', name: 'Main Rig', details: 'Professional instruments and stage equipment' }
      ],
      bands: [
        { id: 'dyn-b1', name: 'Musical Project', role: 'Musician', period: '2023 - Present' }
      ],
      agenda: []
    };
  },

  // ===== INVITATIONS =====
  async getInvitations() {
    try {
      const stored = await AsyncStorage.getItem(INVITES_STORAGE_KEY);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
      // If first time ever (stored is null), initialize with default sample invite
      await AsyncStorage.setItem(INVITES_STORAGE_KEY, JSON.stringify(INITIAL_SAMPLE_INVITES));
      return INITIAL_SAMPLE_INVITES;
    } catch (e) {
      console.error('Error in musiciansService.getInvitations:', e);
      return INITIAL_SAMPLE_INVITES;
    }
  },

  async sendInvitation(invitation) {
    try {
      const current = await this.getInvitations();
      const newInv = {
        id: 'inv-' + Date.now(),
        date: 'Hoje',
        status: 'pending',
        replyMessage: '',
        ...invitation
      };
      const updated = [newInv, ...current.filter(i => i.id !== newInv.id)];
      await AsyncStorage.setItem(INVITES_STORAGE_KEY, JSON.stringify(updated));
      return newInv;
    } catch (e) {
      console.error('Error in musiciansService.sendInvitation:', e);
    }
  },

  async respondToInvitation(inviteId, status, replyMessage = '') {
    try {
      const current = await this.getInvitations();
      let updatedInv = null;
      const updated = current.map(inv => {
        if (inv.id === inviteId) {
          updatedInv = { ...inv, status, replyMessage };
          return updatedInv;
        }
        return inv;
      });
      await AsyncStorage.setItem(INVITES_STORAGE_KEY, JSON.stringify(updated));

      // Sync with band_members: if rejected, member card disappears ("some"); if accepted, member stays active
      if (updatedInv && updatedInv.bandMemberId) {
        if (status === 'rejected') {
          try {
            await bandService.deleteBandMember(updatedInv.bandMemberId);
          } catch (delErr) {
            console.error('Error removing rejected band member:', delErr);
          }
        } else if (status === 'accepted') {
          const now = new Date();
          const todayFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
          await bandService.updateMemberStatusAndReply(updatedInv.bandMemberId, 'active', replyMessage, todayFormatted);
        } else {
          await bandService.updateMemberStatusAndReply(updatedInv.bandMemberId, status, replyMessage);
        }
      }
      return updated;
    } catch (e) {
      console.error('Error in musiciansService.respondToInvitation:', e);
    }
  },

  async deleteInvitation(inviteId) {
    try {
      const current = await this.getInvitations();
      const target = current.find(i => i.id === inviteId);
      if (target && target.bandMemberId) {
        try {
          await bandService.deleteBandMember(target.bandMemberId);
        } catch (e) {}
      }
      const updated = current.filter(i => i.id !== inviteId);
      await AsyncStorage.setItem(INVITES_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error('Error in musiciansService.deleteInvitation:', e);
    }
  }
};
