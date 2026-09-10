import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Alert,
  TextInput,
  Share,
  StatusBar as RNStatusBar,
  Image,
  Linking,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { createTables } from './database/database';
import { ThemeProvider, useTheme } from './hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { bandService } from './services/bandService';
import { songService } from './services/songService';
import { setlistService } from './services/setlistService';

// Componentes
import BandCarousel from './components/BandCarousel';
import SongListItem from './components/SongListItem';
import SetlistCard from './components/SetlistCard';
import SettingsModal from './components/SettingsModal';
import SyncModal from './components/SyncModal';
import BandModal from './components/BandModal';
import SongModal from './components/SongModal';
import SetlistModal from './components/SetlistModal';
import SetlistDetailModal from './components/SetlistDetailModal';
import PerformanceMode from './components/PerformanceMode';
import ImportModal from './components/ImportModal';
import FeatureTutorialModal from './components/FeatureTutorialModal';
import { LanguageProvider, useLanguage } from './hooks/useLanguage';

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <MainApp />
      </ThemeProvider>
    </LanguageProvider>
  );
}

const isFutureDate = (dateStr) => {
  if (!dateStr) return false;
  const clean = dateStr.trim();
  
  // Format: DD/MM/YYYY or DD/MM/YY
  const dmyRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/;
  const match = clean.match(dmyRegex);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    let year = parseInt(match[3], 10);
    if (year < 100) {
      year += 2000;
    }
    const parsedDate = new Date(year, month, day, 23, 59, 59);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return parsedDate >= today;
  }

  // Format: YYYY-MM-DD
  const ymdRegex = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/;
  const matchYmd = clean.match(ymdRegex);
  if (matchYmd) {
    const year = parseInt(matchYmd[1], 10);
    const month = parseInt(matchYmd[2], 10) - 1;
    const day = parseInt(matchYmd[3], 10);
    const parsedDate = new Date(year, month, day, 23, 59, 59);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return parsedDate >= today;
  }

  try {
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      d.setHours(23, 59, 59);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return d >= today;
    }
  } catch (e) {}

  return false;
};

const getFormattedDateBadge = (dateStr, lang) => {
  if (!dateStr || !dateStr.trim()) return { day: '--', month: '---' };
  const clean = dateStr.trim();
  let day = '';
  let monthNum = 0;
  
  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length === 3) {
      day = parseInt(parts[2], 10);
      monthNum = parseInt(parts[1], 10) - 1;
    }
  }
  
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 3) {
      day = parseInt(parts[0], 10);
      monthNum = parseInt(parts[1], 10) - 1;
    }
  }
  
  if (!day) return { day: '--', month: '---' };
  
  const monthsPT = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const monthsEN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const monthsES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  
  let months = monthsPT;
  if (lang === 'en') months = monthsEN;
  if (lang === 'es') months = monthsES;
  
  return { day: String(day).padStart(2, '0'), month: months[monthNum] || '---' };
};

const getBandInitials = (name) => {
  if (!name || !name.trim()) return '?';
  const words = name.trim().split(/\s+/);
  const initials = words.map(w => w[0]).join('').toUpperCase();
  return initials.slice(0, 3);
};

const getFeaturesList = (lang) => {
  if (lang === 'en') {
    return [
      {
        id: 'multiband',
        icon: 'people-outline',
        title: 'Multi-Band Management',
        subtitle: 'Register your bands with photo/logo and manage setlists and repertoires for each project.',
        steps: [
          'On the Home screen, tap "NEW BAND" to register a new band or music project.',
          'Enter the band name and choose a custom photo/logo from your device gallery.',
          'Tap on any band card in the top carousel to select it as the active band.',
          'Selecting a band automatically filters only the setlists and songs linked to it.'
        ],
        proTip: 'You can quickly switch between active bands anytime by tapping their logo in the top carousel.'
      },
      {
        id: 'repertoire',
        icon: 'musical-notes-outline',
        title: 'Structured Song Repertoire',
        subtitle: 'Store lyrics, chords, tabs, duration, and reference links neatly organized.',
        steps: [
          'In the "Songs" tab, tap the "+" button to add a new song to your collection.',
          'Fill in Song Title, Original Artist, Duration, and comma-separated tags/styles.',
          'Paste or write Lyrics, Chords, and Guitar Tabs in their dedicated tabs.',
          'Add quick reference links (YouTube, Spotify, etc.) for fast lookup while practicing.'
        ],
        proTip: 'Use smart search by title, artist, or combined tags to find any song in milliseconds.'
      },
      {
        id: 'performance',
        icon: 'desktop-outline',
        title: 'Live Performance Stage Mode',
        subtitle: 'Full-screen stage prompter with autoscroll, chords/lyrics viewer, and marquee header.',
        steps: [
          'On any Setlist card, tap the "STAGE MODE" button.',
          'The screen will stay awake and enter a distraction-free high-contrast view.',
          'Switch between Lyrics, Chords, and Tabs with the top square toggle buttons.',
          'Activate Autoscroll (speed button) for automatic chord scrolling while you play.',
          'Use the large bottom arrows (◀ ▶) to move to the next or previous song with a quick tap.'
        ],
        proTip: 'Tap the center counter (e.g. 01 / 15) to open the entire song list and jump directly to any song.'
      },
      {
        id: 'rehearsal',
        icon: 'clipboard-outline',
        title: 'Smart Rehearsal Evaluation',
        subtitle: 'Evaluate rehearsal song performance with colors (green/yellow/red) and custom notes.',
        steps: [
          'Create a setlist with type "REHEARSAL".',
          'On the expanded card or in the rehearsal screen, tap the song number (01, 02...) to set its status:',
          '🟢 Green: Ready / Approved for live shows.',
          '🟡 Yellow: Review specific passages or transitions.',
          '🔴 Red: Needs more practice and adjustments.',
          'For Yellow and Red, enter inline rehearsal notes to remember what to fix.'
        ],
        proTip: 'Evaluation statuses update in real time with haptic feedback and persist in your setlist history.'
      },
      {
        id: 'export_share',
        icon: 'share-social-outline',
        title: 'Sharing, Exporting & Backup',
        subtitle: 'Generate formatted Word (.doc) files, share setlist codes, and backup all your data safely.',
        steps: [
          'On any Setlist card, tap "Export .DOC" to generate a clean 2-column Word document with band header.',
          'Tap "Share" to send the setlist JSON code so another band member can import it into their app.',
          'In the About tab, tap "BACKUP ALL" to save your entire database (bands, songs, and setlists) into a secure file.',
          'Use "RESTORE BACKUP" to recover all your data instantly when changing devices or reinstalling the app.'
        ],
        proTip: 'The generated .doc file opens cleanly on MS Word, Google Docs, and mobile office apps.'
      },
      {
        id: 'customization',
        icon: 'globe-outline',
        title: 'Themes, Colors & Languages',
        subtitle: 'Customize light/dark modes, premium primary/secondary color palettes, and languages.',
        steps: [
          'Tap the gear / palette icon on the top header.',
          'Switch between Dark Mode and Light Mode.',
          'Pick your favorite primary color (Blue, Purple, Red, Green, Orange, etc.) and secondary accent.',
          'Change language between Portuguese, English, and Spanish instantly.'
        ],
        proTip: 'Dark mode saves battery during live performances and reduces stage glare.'
      },
      {
        id: 'favorites',
        icon: 'star-outline',
        title: 'Pinned Favorites',
        subtitle: 'Star your most important setlists and songs to pin them automatically to the top.',
        steps: [
          'Tap the star icon (★) on any Setlist card or Song row.',
          'Favorited items jump straight to the "Favorites" section at the top of the list.',
          'Easily unstar items anytime by tapping the star again.'
        ],
        proTip: 'Pin your upcoming gig setlist so you never have to scroll to find it on show night.'
      },
      {
        id: 'tags_filters',
        icon: 'pricetag-outline',
        title: 'Multi-Tag Smart Filters',
        subtitle: 'Tag songs by genre, mood, or decade and filter by combining up to 3 tags simultaneously.',
        steps: [
          'When editing a song, type multiple tags separated by commas (e.g. "rock, 80s, acoustic").',
          'In the Songs tab or Setlist screen, tap tag chips in the carousel to filter.',
          'Combine up to 3 tags at once (e.g. "rock" + "80s") to narrow down your search.'
        ],
        proTip: 'Tap an active tag chip again to deselect it.'
      },
      {
        id: 'drag_reorder',
        icon: 'move-outline',
        title: 'Drag & Drop Reordering',
        subtitle: 'Reorder songs smoothly with spring physics, haptics, and 1-tap nudge arrows.',
        steps: [
          'Open Setlist editor (REPERTOIRE tab).',
          'Press and hold the drag handle (☰) to drag any song to a new position.',
          'Or tap the compact arrow buttons (▲ ▼) for precise 1-tap moving.',
          'Song numbers (01, 02, 03...) update in real time dynamically.'
        ],
        proTip: 'The reordered order is saved automatically when you save the setlist.'
      },
      {
        id: 'pauses_notes',
        icon: 'create-outline',
        title: 'Pauses & Stage Note Slides',
        subtitle: 'Insert countdown intermission pauses and full-screen stage notes into your setlist.',
        steps: [
          'In Setlist editor, tap "+ PAUSE" or "+ NOTE".',
          'Pause: Set an intermission break with countdown timer (e.g. 15 min break).',
          'Note: Add transition reminders, spoken cues, or instrument change notes.',
          'In Stage Mode, pauses and notes appear as dedicated highlight screens.'
        ],
        proTip: 'Pauses do not disrupt the contiguous numbering of your actual songs (e.g. 01, 02, [PAUSE], 03).'
      },
    ];
  }

  if (lang === 'es') {
    return [
      {
        id: 'multiband',
        icon: 'people-outline',
        title: 'Gestión Multibandas',
        subtitle: 'Registre sus bandas con foto/logo y gestione los setlists y repertorios de cada proyecto.',
        steps: [
          'En la pantalla de Inicio, toca en "NUEVA BANDA" para registrar tu grupo o proyecto musical.',
          'Agrega el nombre de la banda y elige una foto/logo personalizado de tu galería.',
          'Toca la tarjeta de la banda en el carrusel superior para seleccionarla como activa.',
          'Al seleccionar una banda, la app filtra automáticamente solo los setlists y canciones vinculados a ella.'
        ],
        proTip: 'Puedes cambiar de banda activa en cualquier momento tocando su logo en el carrusel superior.'
      },
      {
        id: 'repertoire',
        icon: 'musical-notes-outline',
        title: 'Repertorio y Canciones Estructuradas',
        subtitle: 'Guarde letras, acordes, tablaturas, duración y enlaces de apoyo organizadamente.',
        steps: [
          'En la pestaña "Canciones", toca el botón "+" para registrar una nueva canción.',
          'Completa Nombre de la canción, Banda Original, Duración y etiquetas/estilos separados por comas.',
          'Agrega Letras, Acordes y Tablaturas en sus pestañas dedicadas.',
          'Inserta enlaces útiles (YouTube, Spotify, etc.) para consulta y estudio rápido.'
        ],
        proTip: 'Usa la búsqueda inteligente por título, artista o etiquetas combinadas para encontrar cualquier canción en milisegundos.'
      },
      {
        id: 'performance',
        icon: 'desktop-outline',
        title: 'Modo Escenario (En Vivo)',
        subtitle: 'Visualizador de escenario en pantalla completa con desplazamiento automático y acordes/letras.',
        steps: [
          'En la tarjeta del setlist, toca el botón "MODO ESCENARIO".',
          'La pantalla se mantendrá encendida sin apagarse durante la presentación.',
          'Alterna entre Letra, Acordes o Tablatura con los botones superiores.',
          'Activa el Autoscroll (botón de velocidad) para desplazamiento automático de acordes mientras tocas.',
          'Usa las flechas inferiores grandes (◀ ▶) para avanzar o retroceder canciones con un toque rápido.'
        ],
        proTip: 'Toca el contador central (ej: 01 / 15) para abrir la lista del repertorio y saltar a cualquier canción.'
      },
      {
        id: 'rehearsal',
        icon: 'clipboard-outline',
        title: 'Ensayos Inteligentes con Colores',
        subtitle: 'Evalúa el desempeño de las canciones en el ensayo con colores (verde/amarillo/rojo) y notas.',
        steps: [
          'Crea un setlist con tipo "ENSAYO".',
          'En la tarjeta expandida o en la pantalla de ensayo, toca el número de la canción (01, 02...) para evaluar el status:',
          '🟢 Verde: Canción lista/aprobada para el show.',
          '🟡 Amarillo: Revisar pasajes o partes específicas.',
          '🔴 Rojo: Necesita más ensayo y ajustes.',
          'Para amarillo y rojo, ingresa notas de ensayo para registrar lo que debe corregirse.'
        ],
        proTip: 'Las evaluaciones se guardan en el historial del setlist para el próximo ensayo.'
      },
      {
        id: 'export_share',
        icon: 'share-social-outline',
        title: 'Compartir, Exportar y Respaldo',
        subtitle: 'Genere archivos Word (.doc) formateados, comparta setlists y haga copia de seguridad completa.',
        steps: [
          'En la tarjeta del setlist, toca "Exportar .DOC" para generar un archivo Word en 2 columnas con encabezado.',
          'Toca el botón "Compartir" para enviar el código JSON del setlist y permitir que otro músico lo importe en su app.',
          'En la pestaña Acerca de, toca "RESPALDO TOTAL" para guardar toda la base de datos (bandas, canciones y setlists) en un archivo seguro.',
          'Usa el botón "RESTAURAR RESPALDO" para recuperar todos tus datos al cambiar de teléfono o reinstalar la app.'
        ],
        proTip: 'El archivo .doc se abre limpiamente en MS Word, Google Docs y apps de móvil.'
      },
      {
        id: 'customization',
        icon: 'globe-outline',
        title: 'Temas, Colores e Idiomas',
        subtitle: 'Personaliza modo claro/oscuro, paletas de colores premium e idiomas.',
        steps: [
          'Toca el ícono de engranaje / paleta en el encabezado superior.',
          'Elige entre Modo Oscuro y Modo Claro.',
          'Selecciona tu color primario favorito y color secundario.',
          'Alterna el idioma entre Portugués, Inglés y Español al instante.'
        ],
        proTip: 'El modo oscuro ahorra batería en el escenario y mejora el contraste con poca luz.'
      },
      {
        id: 'favorites',
        icon: 'star-outline',
        title: 'Fijados y Favoritos',
        subtitle: 'Marca tus setlists y canciones con estrella para fijarlos en la parte superior.',
        steps: [
          'Toca el ícono de estrella (★) en cualquier tarjeta de setlist o fila de canción.',
          'Los elementos favoritos suben automáticamente a la sección superior.',
          'Desmarca tocando la estrella nuevamente cuando desees.'
        ],
        proTip: 'Fija el setlist del próximo show para tenerlo siempre a mano.'
      },
      {
        id: 'tags_filters',
        icon: 'pricetag-outline',
        title: 'Filtros por Múltiples Etiquetas',
        subtitle: 'Categoriza canciones por etiquetas y filtra combinando hasta 3 simultáneamente.',
        steps: [
          'Al registrar canciones, escribe etiquetas/estilos separados por comas (ej: "rock, 80s, acustico").',
          'En la pestaña de Canciones o en la pantalla de Setlist, toca las etiquetas para filtrar.',
          'Combina hasta 3 etiquetas a la vez para afinar tu búsqueda.'
        ],
        proTip: 'Toca una etiqueta seleccionada nuevamente para desmarcarla.'
      },
      {
        id: 'drag_reorder',
        icon: 'move-outline',
        title: 'Reordenación por Arrastre',
        subtitle: 'Reorganiza canciones arrastrando suavemente o con botones de flecha de 1 toque.',
        steps: [
          'Abre la edición del setlist (pestaña REPERTORIO).',
          'Mantén presionado y arrastra el ícono (☰) a la nueva posición.',
          'O toca las flechas (▲ ▼) para mover la canción 1 posición arriba o abajo.',
          'La numeración (01, 02, 03...) se actualiza en tiempo real.'
        ],
        proTip: 'El nuevo orden se guarda automáticamente al guardar el setlist.'
      },
      {
        id: 'pauses_notes',
        icon: 'create-outline',
        title: 'Pausas y Notas en el Roteiro',
        subtitle: 'Inserta descansos con temporizador y avisos de escenario en tu setlist.',
        steps: [
          'En el editor del setlist, toca "+ PAUSA" o "+ NOTA".',
          'Pausa: Define un intervalo con cuenta regresiva (ej: 15 min de descanso).',
          'Nota: Inserta avisos de voz, cambios de afinación o transiciones en el show.',
          'En el Modo Escenario, las pausas y notas aparecen como pantallas destacadas.'
        ],
        proTip: 'Las pausas no alteran la numeración consecutiva de tus canciones (ej: 01, 02, [PAUSA], 03).'
      },
    ];
  }

  // Padrão: Português (PT)
  return [
    {
      id: 'multiband',
      icon: 'people-outline',
      title: 'Gestão Multibandas',
      subtitle: 'Cadastre suas bandas com foto/logo e gerencie os roteiros e repertórios de cada projeto.',
      steps: [
        'Na tela inicial (Início), toque em "NOVA BANDA" para cadastrar seu grupo ou projeto musical.',
        'Adicione o nome da banda e escolha uma foto/logo personalizada da sua galeria.',
        'Toque no card da banda no carrossel do topo para selecioná-la como ativa.',
        'Ao selecionar uma banda, o app filtra automaticamente apenas os setlists e músicas vinculados a ela.'
      ],
      proTip: 'Você pode alternar entre seus diferentes projetos musicais a qualquer momento tocando na foto da banda no topo.'
    },
    {
      id: 'repertoire',
      icon: 'musical-notes-outline',
      title: 'Repertório e Músicas Estruturadas',
      subtitle: 'Guarde letras, cifras, tablaturas, duração e links de apoio de forma organizada.',
      steps: [
        'Na aba "Músicas", toque no botão "+" para cadastrar uma nova música no acervo.',
        'Preencha Nome da música, Banda Original, Duração e tags/estilos separados por vírgula.',
        'Cole ou digite Letra, Cifra e Tablatura nas abas correspondentes.',
        'Insira links úteis (YouTube, Spotify, etc.) para consulta e estudo rápido da banda.'
      ],
      proTip: 'Use o campo de busca inteligente por título, artista ou tags combinadas para encontrar qualquer música em milissegundos.'
    },
    {
      id: 'performance',
      icon: 'desktop-outline',
      title: 'Modo Palco (Live Performance)',
      subtitle: 'Visualizador de palco em tela cheia com rolagem automática, cifras/letras e letreiro dinâmico.',
      steps: [
        'No card da setlist, toque no botão "MODO PALCO".',
        'A tela entrará em visualização cheia e não apagará durante o show.',
        'Alterne entre Letra, Cifra ou Tablatura nos botões superiores.',
        'Ative o Autoscroll (botão de velocidade) para rolagem automática das cifras enquanto você toca.',
        'Use as setas inferiores grandes (◀ ▶) para avançar ou retroceder as músicas com um toque rápido.'
      ],
      proTip: 'Toque no contador central inferior (ex: 01 / 15) para abrir a lista completa do roteiro e pular diretamente para qualquer música.'
    },
    {
      id: 'rehearsal',
      icon: 'clipboard-outline',
      title: 'Ensaios Inteligentes com Cores',
      subtitle: 'Avalie o desempenho das músicas no ensaio com cores (verde/amarelo/vermelho) e observações.',
      steps: [
        'Crie uma setlist escolhendo o tipo "ENSAIO".',
        'No card expandido ou na tela de ensaio, toque no número da música (01, 02...) para avaliar o status:',
        '🟢 Verde: Música pronta/aprovada para o show.',
        '🟡 Amarelo: Revisar passagens ou partes específicas.',
        '🔴 Vermelho: Precisa de mais ensaio e ajustes.',
        'Ao selecionar amarelo ou vermelho, um campo de anotação de ensaio aparecerá para registrar o que precisa ser corrigido.'
      ],
      proTip: 'Essas avaliações ficam salvas no histórico do setlist para acompanhamento no próximo ensaio da banda.'
    },
    {
      id: 'export_share',
      icon: 'share-social-outline',
      title: 'Compartilhamento, Exportação e Backup',
      subtitle: 'Gere arquivos Word (.doc) formatados, compartilhe setlists e faça backup total dos seus dados.',
      steps: [
        'No card da setlist, toque no botão "Exportar .DOC" para gerar um arquivo Word pronto em 2 colunas com o cabeçalho da banda.',
        'Toque no botão de "Compartilhar" para enviar o código JSON da setlist e permitir que outro músico importe no app dele.',
        'Na aba Sobre, toque em "BACKUP TOTAL" para salvar todo o banco de dados (bandas, músicas e setlists) em um arquivo seguro.',
        'Use o botão "RESTAURAR BACKUP" para recuperar seus dados instantaneamente ao trocar de aparelho ou reinstalar o app.'
      ],
      proTip: 'O arquivo .doc gerado abre perfeitamente no Word, Google Docs e aplicativos de celular sem corrupção.'
    },
    {
      id: 'customization',
      icon: 'globe-outline',
      title: 'Temas, Cores e Idiomas',
      subtitle: 'Alterne entre Modo Escuro/Claro, escolha paletas de cores primárias e secundárias e idiomas.',
      steps: [
        'Toque no ícone de engrenagem / paleta no cabeçalho superior.',
        'Escolha entre Modo Escuro (Dark) e Modo Claro (Light).',
        'Selecione sua cor primária favorita (Azul, Roxo, Vermelho, Verde, Laranja, etc.) e cor secundária.',
        'Alterne o idioma do aplicativo entre Português, Inglês ou Espanhol.'
      ],
      proTip: 'O tema escuro economiza bateria no palco e melhora o contraste sob iluminação de show.'
    },
    {
      id: 'favorites',
      icon: 'star-outline',
      title: 'Fixados e Favoritos',
      subtitle: 'Marque setlists e músicas com estrela para mantê-los sempre fixados no topo.',
      steps: [
        'Toque no ícone de estrela (★) no card de qualquer setlist ou linha de música.',
        'Os itens favoritados sobem automaticamente para a seção do topo "Favoritas".',
        'Músicas e setlists com estrela têm prioridade na visualização.'
      ],
      proTip: 'Use favoritos para manter a setlist do próximo show sempre à mão no topo da tela.'
    },
    {
      id: 'tags_filters',
      icon: 'pricetag-outline',
      title: 'Filtros Avançados por Múltiplas Tags',
      subtitle: 'Cadastre músicas com múltiplas tags por vírgula e filtre combinando até 3 tags simultâneas.',
      steps: [
        'Ao cadastrar músicas, digite tags/estilos separados por vírgula (ex: "rock, nacional, 80s").',
        'Na aba de Músicas ou na tela de Setlist, toque nas tags do carrossel para filtrar.',
        'Você pode combinar até 3 tags simultâneas para encontrar exatamente o que precisa (ex: "rock" + "nacional").'
      ],
      proTip: 'Toque novamente em uma tag selecionada para desmarcá-la.'
    },
    {
      id: 'drag_reorder',
      icon: 'move-outline',
      title: 'Reordenação por Arraste (Drag & Drop)',
      subtitle: 'Organize a ordem das músicas no setlist arrastando suavemente ou com botões de 1 toque.',
      steps: [
        'Abra a edição de uma setlist (aba ROTEIRO).',
        'Segure e arraste qualquer música pelo ícone de três barras (☰) para a nova posição.',
        'Ou toque nas setas compactas (▲ ▼) para mover a música 1 posição acima ou abaixo com precisão de 1 toque.',
        'A numeração (01, 02, 03...) se reorganiza automaticamente em tempo real.'
      ],
      proTip: 'Arraste suavemente para cima ou para baixo; a reordenação é salva automaticamente ao salvar a setlist.'
    },
    {
      id: 'pauses_notes',
      icon: 'create-outline',
      title: 'Pausas e Linhas de Anotação no Roteiro',
      subtitle: 'Adicione intervalos com contagem regressiva e avisos especiais de palco diretamente no setlist.',
      steps: [
        'No editor da setlist, toque em "+ PAUSA" ou "+ ANOTAÇÃO".',
        'Pausa: Define um intervalo com cronômetro regressivo (ex: 15 min de intervalo no show).',
        'Anotação: Insere um recado, aviso de fala ou lembrete de transição (ex: "Fala do Vocalista", "Trocar Guitarra").',
        'No Modo Palco, pausas e anotações aparecem como telas especiais de destaque.'
      ],
      proTip: 'Pausas não alteram a contagem contígua das músicas (ex: 01, 02, [PAUSA], 03).'
    },
  ];
};

function MainApp() {
  const { colors, themeMode } = useTheme();
  const { t, language } = useLanguage();
  const isDark = colors.isDark;

  // Estados de navegação e abas
  const [currentTab, setCurrentTab] = useState('home'); // 'home' | 'songs' | 'setlists'
  const [selectedBandId, setSelectedBandId] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [statsBandId, setStatsBandId] = useState(null);

  // Estados dos dados
  const [bands, setBands] = useState([]);
  const [songs, setSongs] = useState([]);
  const [allSongsUnfiltered, setAllSongsUnfiltered] = useState([]);
  const [showPastSetlists, setShowPastSetlists] = useState(false);
  const [setlists, setSetlists] = useState([]);
  const [songStyles, setSongStyles] = useState([]); // Lista de gêneros/estilos existentes para filtros
  const [dbReady, setDbReady] = useState(false);

  // Estados de busca e filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStyles, setSelectedStyles] = useState([]); // Array de tags selecionadas (máx 3)
  const [showStyleFilters, setShowStyleFilters] = useState(false); // Olho de exibição dos filtros de tags
  const [selectedSetlistType, setSelectedSetlistType] = useState(''); // '' | 'show' | 'ensaio' | 'repertório'
  const [songSortBy, setSongSortBy] = useState('band'); // 'name' | 'band'
  const [songSortOrder, setSongSortOrder] = useState('asc'); // 'asc' | 'desc'

  // Modais de visibilidade
  const [showBandModal, setShowBandModal] = useState(false);
  const [showSongModal, setShowSongModal] = useState(false);
  const [showSetlistModal, setShowSetlistModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPerformanceMode, setShowPerformanceMode] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showImportSongModal, setShowImportSongModal] = useState(false);
  const [showImportBackupModal, setShowImportBackupModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [selectedTutorialFeature, setSelectedTutorialFeature] = useState(null);

  // Estados de edição / item ativo
  const [editingBand, setEditingBand] = useState(null);
  const [editingSong, setEditingSong] = useState(null);
  const [editingSetlist, setEditingSetlist] = useState(null);
  const [activeSetlist, setActiveSetlist] = useState(null);

  // Controle de cards abertos por vez (máx 2)
  const [expandedSongIds, setExpandedSongIds] = useState([]);
  const [expandedSetlistIds, setExpandedSetlistIds] = useState([]);

  const handleToggleExpandSong = (songId) => {
    if (expandedSongIds.includes(songId)) {
      setExpandedSongIds(expandedSongIds.filter(id => id !== songId));
    } else {
      if (expandedSongIds.length >= 2) {
        setExpandedSongIds([...expandedSongIds.slice(1), songId]);
      } else {
        setExpandedSongIds([...expandedSongIds, songId]);
      }
    }
  };

  const handleToggleExpandSetlist = (setlistId) => {
    if (expandedSetlistIds.includes(setlistId)) {
      setExpandedSetlistIds(expandedSetlistIds.filter(id => id !== setlistId));
    } else {
      if (expandedSetlistIds.length >= 2) {
        setExpandedSetlistIds([...expandedSetlistIds.slice(1), setlistId]);
      } else {
        setExpandedSetlistIds([...expandedSetlistIds, setlistId]);
      }
    }
  };

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('Inicializando banco de dados...');
      await createTables();
      console.log('Banco de dados inicializado com sucesso.');
      await reloadAllData();
      setDbReady(true);
    } catch (error) {
      console.error('Erro na inicialização do aplicativo:', error);
    }
  };

  const reloadAllData = async () => {
    try {
      const allBands = await bandService.getAll();
      const allSongs = await songService.getAll(searchQuery, selectedStyles, songSortBy, songSortOrder);
      const allSongsUnfilteredData = await songService.getAll();
      const rawSetlists = await setlistService.getAll();

      // Mapear cada setlist para carregar suas músicas associadas na ordem correta
      const fullSetlists = await Promise.all(
        rawSetlists.map(async (sl) => {
          const slSongs = await setlistService.getSongsForSetlist(sl.id);
          return { ...sl, songs: slSongs };
        })
      );

      // Função auxiliar para analisar datas de forma tolerante (DD/MM/YYYY, YYYY-MM-DD, DD/MM/YY)
      const parseToTimestamp = (dateStr) => {
        const clean = String(dateStr || '').trim();
        if (!clean) return 0;
        
        if (clean.includes('-')) {
          const parts = clean.split('-');
          if (parts.length === 3) {
            const yr = parseInt(parts[0], 10);
            const mo = parseInt(parts[1], 10) - 1;
            const dy = parseInt(parts[2], 10);
            const t = new Date(yr, mo, dy).getTime();
            return isNaN(t) ? 0 : t;
          }
        }
        
        if (clean.includes('/')) {
          const parts = clean.split('/');
          if (parts.length === 3) {
            const dy = parseInt(parts[0], 10);
            const mo = parseInt(parts[1], 10) - 1;
            let yr = parseInt(parts[2], 10);
            if (yr < 100) {
              yr += yr < 50 ? 2000 : 1900;
            }
            const t = new Date(yr, mo, dy).getTime();
            return isNaN(t) ? 0 : t;
          }
        }
        return 0;
      };

      // Ordenar setlists: Favoritos no topo, depois data decrescente (mais recente para mais antigo)
      fullSetlists.sort((a, b) => {
        const favA = a.isFavorite ? 1 : 0;
        const favB = b.isFavorite ? 1 : 0;
        if (favA !== favB) return favB - favA;

        const timeA = parseToTimestamp(a.date);
        const timeB = parseToTimestamp(b.date);
        if (timeA !== timeB) return timeB - timeA;

        return (b.id || 0) - (a.id || 0);
      });

      const allStyles = await songService.getStyles();

      setBands(allBands);
      setSongs(allSongs);
      setAllSongsUnfiltered(allSongsUnfilteredData);
      setSetlists(fullSetlists);
      setSongStyles(allStyles);

      // Sincronizar activeSetlist para que mudanças feitas no Modo Palco reflitam na tela sem reiniciá-lo
      if (activeSetlist) {
        const updated = fullSetlists.find(s => s.id === activeSetlist.id);
        if (updated) {
          setActiveSetlist(updated);
        } else if (activeSetlist.id === undefined && activeSetlist.songs && activeSetlist.songs.length > 0) {
          // Caso seja uma música individual aberta em modo palco
          const updatedSong = allSongs.find(s => s.id === activeSetlist.songs[0].id);
          if (updatedSong) {
            setActiveSetlist({
              name: updatedSong.name,
              songs: [updatedSong]
            });
          }
        }
      }
    } catch (error) {
      console.error('Erro ao recarregar dados:', error);
    }
  };

  // Recarregar músicas sempre que a busca, tags ou ordenação mudarem
  useEffect(() => {
    if (dbReady) {
      songService.getAll(searchQuery, selectedStyles, songSortBy, songSortOrder)
        .then(setSongs)
        .catch(console.error);
    }
  }, [searchQuery, selectedStyles, songSortBy, songSortOrder, dbReady]);

  // ===== AÇÕES BANDAS =====
  const handleSaveBand = async (bandData) => {
    try {
      if (editingBand) {
        await bandService.update(editingBand.id, bandData.name, bandData.imageUri);
      } else {
        await bandService.insert(bandData.name, bandData.imageUri);
      }
      await reloadAllData();
      setShowBandModal(false);
      setEditingBand(null);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar a banda.');
    }
  };

  const handleEditBand = (band) => {
    setEditingBand(band);
    setShowBandModal(true);
  };

  // ===== AÇÕES MÚSICAS =====
  const handleSaveSong = async (songData) => {
    try {
      let songId;
      if (editingSong) {
        songId = editingSong.id;
        await songService.update(
          songId,
          songData.name,
          songData.originalBand,
          songData.style,
          songData.lyrics,
          songData.chords,
          songData.tabs,
          songData.defaultView,
          songData.duration,
          songData.scrollSpeed
        );
      } else {
        songId = await songService.insert(
          songData.name,
          songData.originalBand,
          songData.style,
          songData.lyrics,
          songData.chords,
          songData.tabs,
          songData.defaultView,
          songData.duration,
          songData.scrollSpeed
        );
      }

      // Sincronizar links
      await songService.syncLinks(songId, songData.links);

      await reloadAllData();
      setShowSongModal(false);
      setEditingSong(null);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar a música.');
    }
  };

  const handleEditSong = (song) => {
    setEditingSong(song);
    setShowSongModal(true);
  };

  const handleDeleteSong = (id) => {
    Alert.alert(
      t('deleteSongConfirmTitle'),
      t('deleteSongConfirmMsg'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await songService.delete(id);
              await reloadAllData();
            } catch (error) {
              Alert.alert(t('importErrorTitle'), t('deleteSongError'));
            }
          },
        },
      ]
    );
  };

  // ===== AÇÕES SETLISTS =====
  const handleSaveSetlist = async (setlistData) => {
    try {
      if (editingSetlist) {
        await setlistService.update(
          editingSetlist.id,
          setlistData.name,
          setlistData.type,
          setlistData.myBandId,
          setlistData.date,
          setlistData.local,
          setlistData.cachê,
          setlistData.notes,
          setlistData.songIds
        );
      } else {
        await setlistService.insert(
          setlistData.name,
          setlistData.type,
          setlistData.myBandId,
          setlistData.date,
          setlistData.local,
          setlistData.cachê,
          setlistData.notes,
          setlistData.songIds
        );
      }
      await reloadAllData();
      setShowSetlistModal(false);
      setEditingSetlist(null);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar o setlist.');
    }
  };

  const handleEditSetlist = (setlist) => {
    setEditingSetlist(setlist);
    setShowSetlistModal(true);
  };

  const handleDeleteSetlist = (id) => {
    Alert.alert(
      t('deleteSetlistConfirmTitle'),
      t('deleteSetlistConfirmMsg'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await setlistService.delete(id);
              await reloadAllData();
            } catch (error) {
              Alert.alert(t('importErrorTitle'), t('deleteSetlistError'));
            }
          },
        },
      ]
    );
  };

  const handleDuplicateSetlist = async (id) => {
    try {
      await setlistService.duplicate(id);
      await reloadAllData();
      Alert.alert('Sucesso', 'Setlist copiado/duplicado com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível duplicar o setlist.');
    }
  };

  const handleShareSetlist = async (setlist) => {
    try {
      const exportData = {
        app: 'SetlistsApp',
        version: 1,
        name: setlist.name,
        type: setlist.type,
        bandName: setlist.bandName,
        date: setlist.date,
        local: setlist.local,
        cachê: setlist.cachê,
        notes: setlist.notes,
        songs: (setlist.songs || []).map(song => ({
          name: song.name,
          originalBand: song.originalBand,
          style: song.style,
          lyrics: song.lyrics,
          chords: song.chords,
          tabs: song.tabs,
          defaultView: song.defaultView,
          duration: song.duration,
          customNotes: song.customNotes || '',
          customDuration: song.customDuration || '',
          scrollSpeed: song.scrollSpeed || 'none',
          links: (song.links || []).map(link => ({
            type: link.type,
            url: link.url
          }))
        }))
      };

      const jsonStr = JSON.stringify(exportData, null, 2);

      // Função para remover acentos, caracteres especiais e forçar minúsculo
      const formatString = (str) => {
        if (!str) return '';
        return str
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9]/g, '')
          .toLowerCase()
          .trim();
      };

      const fileDate = (setlist.date || new Date().toISOString().split('T')[0]).replace(/[\/\s]/g, '-').toLowerCase();
      const fileBand = formatString(setlist.bandName) || 'sembanda';
      const fileEvent = formatString(setlist.name) || 'semnome';
      const fileName = `${fileDate}-${fileBand}-${fileEvent}.json`;

      if (Platform.OS === 'web') {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);

        if (navigator.clipboard) {
          await navigator.clipboard.writeText(JSON.stringify(exportData));
          Alert.alert('Sucesso', `Arquivo "${fileName}" baixado e código copiado para a área de transferência!`);
        } else {
          Alert.alert('Sucesso', `Arquivo "${fileName}" baixado com sucesso!`);
        }
      } else {
        try {
          const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
          await FileSystem.writeAsStringAsync(fileUri, jsonStr, { encoding: FileSystem.EncodingType.UTF8 });

          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType: 'application/json',
              dialogTitle: `Compartilhar Setlist: ${setlist.name}`,
              UTI: 'public.json',
            });
          } else {
            throw new Error('Serviço de compartilhamento de arquivos não disponível');
          }
        } catch (shareErr) {
          console.warn('Falha ao compartilhar arquivo físico, usando texto:', shareErr);
          
          // Fallback para compartilhamento de texto apenas com cabeçalho
          let readableText = `📋 SETLIST: ${setlist.name || 'Sem Nome'}\n`;
          readableText += `🎸 Banda: ${setlist.bandName || 'Sem Banda'}\n`;
          if (setlist.date) readableText += `📅 Data: ${setlist.date}\n`;
          if (setlist.local) readableText += `📍 Local: ${setlist.local}\n`;
          if (setlist.notes) readableText += `📝 Obs: ${setlist.notes}\n`;

          readableText += `\n--------------------------------------------\n`;
          readableText += `CÓDIGO DE IMPORTAÇÃO:\n`;
          readableText += JSON.stringify(exportData);

          await Share.share({
            title: `Compartilhar Setlist: ${setlist.name}`,
            message: readableText,
          });
        }
      }
    } catch (error) {
      console.error('Erro ao compartilhar setlist:', error);
      Alert.alert('Erro', 'Não foi possível compartilhar o setlist.');
    }
  };

  const handleShareSong = async (song) => {
    try {
      const exportData = {
        app: 'SetlistsAppSong',
        version: 1,
        name: song.name,
        originalBand: song.originalBand,
        style: song.style,
        lyrics: song.lyrics,
        chords: song.chords,
        tabs: song.tabs,
        defaultView: song.defaultView,
        duration: song.duration,
        scrollSpeed: song.scrollSpeed || 'none',
        links: (song.links || []).map(link => ({
          type: link.type,
          url: link.url
        }))
      };

      const jsonStr = JSON.stringify(exportData, null, 2);

      const formatString = (str) => {
        if (!str) return '';
        return str
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9]/g, '')
          .toLowerCase()
          .trim();
      };

      const fileBand = formatString(song.originalBand) || 'sembanda';
      const fileSong = formatString(song.name) || 'semnome';
      const fileName = `musica-${fileBand}-${fileSong}.json`;

      if (Platform.OS === 'web') {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);

        if (navigator.clipboard) {
          await navigator.clipboard.writeText(JSON.stringify(exportData));
          Alert.alert('Sucesso', `Arquivo "${fileName}" baixado e código copiado para a área de transferência!`);
        } else {
          Alert.alert('Sucesso', `Arquivo "${fileName}" baixado com sucesso!`);
        }
      } else {
        try {
          const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
          await FileSystem.writeAsStringAsync(fileUri, jsonStr, { encoding: FileSystem.EncodingType.UTF8 });

          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType: 'application/json',
              dialogTitle: `Compartilhar Música: ${song.name}`,
              UTI: 'public.json',
            });
          } else {
            throw new Error('Serviço de compartilhamento de arquivos não disponível');
          }
        } catch (shareErr) {
          console.warn('Falha ao compartilhar arquivo físico, usando texto:', shareErr);
          
          let readableText = `🎵 MÚSICA: ${song.name || 'Sem Nome'}\n`;
          readableText += `🎸 Banda: ${song.originalBand || 'Sem Banda'}\n`;
          if (song.style) readableText += `🏷️ Tags: ${song.style}\n`;
          if (song.duration) readableText += `⏱ Duração: ${song.duration}\n`;

          readableText += `\n--------------------------------------------\n`;
          readableText += `CÓDIGO DE IMPORTAÇÃO:\n`;
          readableText += JSON.stringify(exportData);

          await Share.share({
            title: `Compartilhar Música: ${song.name}`,
            message: readableText,
          });
        }
      }
    } catch (error) {
      console.error('Erro ao compartilhar música:', error);
      Alert.alert('Erro', 'Não foi possível compartilhar a música.');
    }
  };

  const handleImportSong = async (importCode) => {
    try {
      if (!importCode || !importCode.trim()) {
        Alert.alert('Erro', 'Código de importação inválido ou vazio.');
        return false;
      }

      let jsonData = null;
      const jsonStartIndex = importCode.indexOf('{');
      const jsonEndIndex = importCode.lastIndexOf('}');

      if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
        const cleanJson = importCode.substring(jsonStartIndex, jsonEndIndex + 1);
        jsonData = JSON.parse(cleanJson);
      } else {
        jsonData = JSON.parse(importCode.trim());
      }

      if (!jsonData || jsonData.app !== 'SetlistsAppSong') {
        Alert.alert('Erro', 'Código ou arquivo não corresponde a uma música válida do Setlist Band Manager.');
        return false;
      }

      const newSong = {
        name: jsonData.name,
        originalBand: jsonData.originalBand,
        style: jsonData.style || '',
        duration: jsonData.duration || '',
        lyrics: jsonData.lyrics || '',
        chords: jsonData.chords || '',
        tabs: jsonData.tabs || '',
        defaultView: jsonData.defaultView || 'lyrics',
        scrollSpeed: jsonData.scrollSpeed || 'none',
        links: jsonData.links || []
      };

      // Verificar se a música já existe
      const cleanName = newSong.name?.trim().toLowerCase();
      const cleanBand = newSong.originalBand?.trim().toLowerCase();
      const allExistingSongs = await songService.getAll();
      const foundDuplicate = allExistingSongs.find(s => 
        s.name?.trim().toLowerCase() === cleanName && 
        s.originalBand?.trim().toLowerCase() === cleanBand
      );

      if (foundDuplicate) {
        // Se a música já existe, não insere nem sobrescreve, apenas notifica
        Alert.alert(
          t('info') || 'Informação', 
          t('songAlreadyExists', { name: newSong.name }).replace('{name}', newSong.name) || `A música "${newSong.name}" já existe no banco de dados e não foi duplicada.`
        );
        return true;
      }

      // Inserir música
      const songId = await songService.insert(
        newSong.name,
        newSong.originalBand,
        newSong.style,
        newSong.lyrics,
        newSong.chords,
        newSong.tabs,
        newSong.defaultView,
        newSong.duration,
        newSong.scrollSpeed
      );

      // Sincronizar links
      if (newSong.links && Array.isArray(newSong.links)) {
        await songService.syncLinks(songId, newSong.links);
      }

      Alert.alert('Sucesso', `Música "${newSong.name}" importada com sucesso!`);
      await reloadAllData();
      return true;
    } catch (error) {
      console.error('Erro ao importar música:', error);
      Alert.alert('Erro', 'Não foi possível decodificar o arquivo de música. Verifique a integridade dos dados.');
      return false;
    }
  };

  
  const getAllDataForBackup = async () => {
    const allBands = await bandService.getAll();
    const allSongs = await songService.getAll();
    const allSetlists = await Promise.all(
      (await setlistService.getAll()).map(async (st) => {
        const songs = await setlistService.getSongsBySetlistId(st.id);
        return { ...st, songs };
      })
    );
    return {
      app: 'SetlistsAppBackup',
      version: 1,
      exportedAt: new Date().toISOString(),
      summary: {
        totalBands: allBands.length,
        totalSongs: allSongs.length,
        totalSetlists: allSetlists.length
      },
      bands: allBands,
      songs: allSongs,
      setlists: allSetlists
    };
  };

  const handleBackupAll = async () => {
    try {
      const allBands = await bandService.getAll();
      const allSongs = await songService.getAll();
      const rawSetlists = await setlistService.getAll();

      const allSetlists = await Promise.all(
        rawSetlists.map(async (sl) => {
          const slSongs = await setlistService.getSongsForSetlist(sl.id);
          return { ...sl, songs: slSongs };
        })
      );

      const performBackup = async () => {
        try {
          const backupData = {
            app: 'SetlistsAppBackup',
            version: 1,
            exportedAt: new Date().toISOString(),
            summary: {
              totalBands: allBands.length,
              totalSongs: allSongs.length,
              totalSetlists: allSetlists.length
            },
            bands: allBands,
            songs: allSongs,
            setlists: allSetlists
          };

          const jsonStr = JSON.stringify(backupData, null, 2);
          const fileName = `backup-setlists-manager-${new Date().toISOString().split('T')[0]}.json`;

          if (Platform.OS === 'web') {
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            link.click();
            URL.revokeObjectURL(url);

            if (navigator.clipboard) {
              await navigator.clipboard.writeText(jsonStr);
              Alert.alert('Sucesso', `Backup criado com sucesso! (${fileName}) e copiado para a área de transferência!`);
            } else {
              Alert.alert('Sucesso', `Backup criado com sucesso! (${fileName})`);
            }
          } else {
            const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
            await FileSystem.writeAsStringAsync(fileUri, jsonStr, { encoding: FileSystem.EncodingType.UTF8 });

            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(fileUri, {
                mimeType: 'application/json',
                dialogTitle: `Backup Total de Dados`,
                UTI: 'public.json',
              });
            } else {
              throw new Error('Serviço de compartilhamento de arquivos não disponível');
            }
          }
        } catch (backupErr) {
          console.error('Erro ao salvar arquivo de backup:', backupErr);
          Alert.alert('Erro', 'Não foi possível salvar o arquivo de backup.');
        }
      };

      // Mostrar resumo antes de gerar/exportar
      Alert.alert(
        'Confirmar Backup',
        `Deseja gerar o backup de seus dados?\n\nItens a serem salvos:\n• ${allBands.length} Bandas\n• ${allSongs.length} Músicas\n• ${allSetlists.length} Setlists/Playlists`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Gerar Backup', style: 'default', onPress: performBackup }
        ]
      );
    } catch (error) {
      console.error('Erro ao preparar backup total:', error);
      Alert.alert('Erro', 'Não foi possível preparar o backup dos dados.');
    }
  };

  const handleRestoreBackup = async (backupJsonString) => {
    try {
      if (!backupJsonString || !backupJsonString.trim()) {
        Alert.alert('Erro', 'Código de backup inválido ou vazio.');
        return false;
      }

      let backupData = null;
      try {
        backupData = JSON.parse(backupJsonString.trim());
      } catch (e) {
        const startIdx = backupJsonString.indexOf('{"app":"SetlistsAppBackup"');
        if (startIdx !== -1) {
          const endIdx = backupJsonString.lastIndexOf('}');
          if (endIdx > startIdx) {
            try {
              backupData = JSON.parse(backupJsonString.substring(startIdx, endIdx + 1));
            } catch (err) {}
          }
        }
      }

      if (!backupData || backupData.app !== 'SetlistsAppBackup') {
        Alert.alert('Erro', 'Os dados fornecidos não correspondem a um backup válido do Setlist Band Manager.');
        return false;
      }

      // Contabilizar itens do cabeçalho de metadados do backup
      const numBands = backupData.bands ? backupData.bands.length : 0;
      const numSongs = backupData.songs ? backupData.songs.length : 0;
      const numSetlists = backupData.setlists ? backupData.setlists.length : 0;

      const performRestore = async () => {
        try {
          // 1. Restaurar Bandas
          const existingBands = await bandService.getAll();
          const bandIdMap = {};

          if (backupData.bands && Array.isArray(backupData.bands)) {
            for (const band of backupData.bands) {
              const foundBand = existingBands.find(b => b.name.toLowerCase() === band.name.toLowerCase());
              if (foundBand) {
                bandIdMap[band.id] = foundBand.id;
              } else {
                const newBandId = await bandService.insert(band.name, band.imageUri || null);
                bandIdMap[band.id] = newBandId;
              }
            }
          }

          // 2. Restaurar Músicas
          const existingSongs = await songService.getAll();
          const songIdMap = {};

          if (backupData.songs && Array.isArray(backupData.songs)) {
            for (const song of backupData.songs) {
              const foundSong = existingSongs.find(s => 
                s.name.toLowerCase() === song.name.toLowerCase() && 
                s.originalBand.toLowerCase() === song.originalBand.toLowerCase()
              );

              if (foundSong) {
                songIdMap[song.id] = foundSong.id;
              } else {
                const newSongId = await songService.insert(
                  song.name,
                  song.originalBand,
                  song.style || '',
                  song.lyrics || '',
                  song.chords || '',
                  song.tabs || '',
                  song.defaultView || 'lyrics',
                  song.duration || null,
                  song.scrollSpeed || 'none'
                );
                songIdMap[song.id] = newSongId;

                if (song.links && Array.isArray(song.links)) {
                  await songService.syncLinks(newSongId, song.links);
                }
              }
            }
          }

          // 3. Restaurar Setlists
          const existingSetlists = await setlistService.getAll();

          if (backupData.setlists && Array.isArray(backupData.setlists)) {
            for (const sl of backupData.setlists) {
              let finalName = sl.name;
              const nameExists = existingSetlists.some(eSl => eSl.name.toLowerCase() === finalName.toLowerCase());
              if (nameExists) {
                finalName = `${finalName} - Restaurado`;
              }

              const newBandId = bandIdMap[sl.myBandId] || null;

              const newSongIds = (sl.songs || []).map(song => {
                const mappedId = song.id === -1 ? -1 : songIdMap[song.id];
                return {
                  id: mappedId,
                  customNotes: song.customNotes || '',
                  customDuration: song.customDuration || '',
                  rehearsalStatus: song.rehearsalStatus || 'none',
                  rehearsalNotes: song.rehearsalNotes || ''
                };
              }).filter(s => s.id !== undefined);

              await setlistService.insert(
                finalName,
                sl.type || 'repertório',
                newBandId,
                sl.date || '',
                sl.local || '',
                sl.cachê || null,
                sl.notes || '',
                newSongIds
              );
            }
          }

          Alert.alert('Sucesso', 'Backup restaurado com sucesso!');
          await reloadAllData();
        } catch (restoreErr) {
          console.error('Erro na gravação do backup:', restoreErr);
          Alert.alert('Erro', 'Falha ao gravar os dados no banco.');
        }
      };

      // Exibir alerta de confirmação detalhado com os contadores de metadados
      Alert.alert(
        'Confirmar Restauração',
        `Deseja restaurar este backup?\n\nEste arquivo contém:\n• ${numBands} Bandas\n• ${numSongs} Músicas\n• ${numSetlists} Setlists/Playlists\n\n(Músicas e bandas já cadastradas não serão duplicadas)`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Restaurar', style: 'default', onPress: performRestore }
        ]
      );
      return true;
    } catch (error) {
      console.error('Erro ao restaurar backup:', error);
      Alert.alert('Erro', 'Não foi possível restaurar o backup de dados. Verifique a integridade do arquivo.');
      return false;
    }
  };

  const handleExportDoc = async (setlist) => {
    try {
      if (!setlist) return;

      const parseDuration = (durStr) => {
        if (!durStr) return 0;
        const clean = String(durStr).toLowerCase().replace(/min/g, '').trim();
        if (clean.includes(':')) {
          const parts = clean.split(':').map(p => parseInt(p, 10) || 0);
          if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
          if (parts.length === 2) return parts[0] * 60 + parts[1];
          return 0;
        }
        const num = parseInt(clean, 10);
        return isNaN(num) ? 0 : num * 60;
      };

      let totalSeconds = 0;
      let hasDuration = false;
      const songsList = Array.isArray(setlist.songs) ? setlist.songs : [];

      songsList.forEach(song => {
        if (!song) return;
        if (String(song.id) === '-1') {
          if (song.customDuration && String(song.customDuration).trim()) {
            totalSeconds += parseDuration(song.customDuration);
            hasDuration = true;
          }
        } else if (song.duration && String(song.duration).trim()) {
          totalSeconds += parseDuration(song.duration);
          hasDuration = true;
        }
      });

      let totalDur = '';
      if (hasDuration) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        if (hours > 0) {
          totalDur = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        } else {
          totalDur = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
      }

      // Pré-calcular numeração contígua pulando pausas e anotações
      let songCounter = 0;
      const processedSongs = songsList.map((song) => {
        if (!song) return { song: {}, numStr: '' };
        const isPause = String(song.id) === '-1';
        const isNote = String(song.id) === '-2';
        let numStr = '';
        if (!isPause && !isNote) {
          songCounter++;
          numStr = String(songCounter).padStart(2, '0');
        }
        return { song, numStr };
      });

      // Dividir músicas em duas colunas
      const half = Math.ceil(processedSongs.length / 2);
      const col1Songs = processedSongs.slice(0, half);
      const col2Songs = processedSongs.slice(half);

      const renderSongHtml = (song, numStr) => {
        if (!song) return '';
        const isPause = String(song.id) === '-1';
        const isNote = String(song.id) === '-2';
        const sName = String(song.name || '').trim();
        const sBand = String(song.originalBand || '').trim();
        const sDur = String(song.duration || '').trim();
        const sCustDur = String(song.customDuration || '').trim();
        const sNotes = String(song.customNotes || '').trim();

        if (isPause) {
          let html = `<div class="pause-item"><div class="pause-name">----- PAUSA -----`;
          if (sCustDur) {
            html += ` <span style="font-size: 8pt; font-weight: normal;">(${sCustDur})</span>`;
          }
          html += `</div>`;
          if (sNotes) {
            html += `<div class="pause-obs">${sNotes}</div>`;
          }
          html += `</div>`;
          return html;
        } else if (isNote) {
          return `<div class="note-item"><div class="note-name">${sNotes || 'ANOTAÇÃO'}</div></div>`;
        } else {
          let html = `<div class="song-item"><div class="song-name">${numStr}. ${sName.toUpperCase()}`;
          if (sDur) {
            html += ` <span style="font-size: 8pt; font-weight: normal; color: #6b7280;">(${sDur})</span>`;
          }
          html += `</div>`;
          if (sBand) {
            html += `<div class="song-band">(${sBand})</div>`;
          }
          if (sNotes) {
            html += `<div class="song-obs">Obs: ${sNotes}</div>`;
          }
          html += `</div>`;
          return html;
        }
      };

      const col1Html = col1Songs.map((item) => renderSongHtml(item.song, item.numStr)).join('\n');
      const col2Html = col2Songs.map((item) => renderSongHtml(item.song, item.numStr)).join('\n');

      const totalSongsCount = songsList.filter(s => s && String(s.id) !== '-1' && String(s.id) !== '-2').length;

      // Gerar documento HTML compatível 100% com MS Word (.doc)
      let docContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<meta name="ProgId" content="Word.Document">
<meta name="Generator" content="Microsoft Word 15">
<meta name="Originator" content="Microsoft Word 15">
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
  <w:View>Print</w:View>
  <w:Zoom>100</w:Zoom>
  <w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
  @page {
    size: 21.0cm 29.7cm;
    margin: 1.2cm 1.2cm 1.2cm 1.2cm;
    mso-page-orientation: portrait;
  }
  body {
    font-family: Calibri, Arial, Helvetica, sans-serif;
    font-size: 11pt;
    color: #1f2937;
    background-color: #ffffff;
    margin: 0;
    padding: 0;
  }
  table {
    border-collapse: collapse;
    mso-table-lspace: 0pt;
    mso-table-rspace: 0pt;
  }
  .header-box {
    width: 100%;
    border: 1.5pt solid #374151;
    background-color: #f3f4f6;
    margin-bottom: 12pt;
  }
  .header-td {
    padding: 8pt 12pt;
    vertical-align: middle;
  }
  .show-title {
    font-size: 15pt;
    font-weight: bold;
    color: #111827;
    margin: 0 0 2pt 0;
    text-transform: uppercase;
  }
  .band-title {
    font-size: 10.5pt;
    font-weight: bold;
    color: #4b5563;
    margin: 0 0 4pt 0;
    text-transform: uppercase;
  }
  .meta-text {
    font-size: 8.5pt;
    color: #6b7280;
    margin: 0;
  }
  .setlist-grid {
    width: 100%;
  }
  .column-td {
    width: 48%;
    vertical-align: top;
    padding: 0;
  }
  .gap-td {
    width: 4%;
    vertical-align: top;
    padding: 0;
  }
  .song-item {
    margin-bottom: 5pt;
    padding-bottom: 3pt;
    border-bottom: 0.5pt solid #e5e7eb;
  }
  .song-name {
    font-size: 10pt;
    font-weight: bold;
    color: #111827;
    margin: 0;
    line-height: 1.15;
  }
  .song-band {
    font-size: 8pt;
    color: #4b5563;
    margin: 1pt 0 0 0;
    line-height: 1.0;
  }
  .song-obs {
    font-size: 8pt;
    color: #6b7280;
    font-style: italic;
    margin: 1pt 0 0 0;
    line-height: 1.0;
  }
  .pause-item {
    margin-bottom: 5pt;
    padding: 3pt 6pt;
    background-color: #fef2f2;
    border-left: 2.5pt solid #ef4444;
  }
  .pause-name {
    font-size: 9.5pt;
    font-weight: bold;
    color: #b91c1c;
    margin: 0;
  }
  .pause-obs {
    font-size: 8pt;
    color: #dc2626;
    font-style: italic;
    margin: 1pt 0 0 0;
  }
  .note-item {
    margin-bottom: 5pt;
    padding: 3pt 6pt;
    background-color: #fffbeb;
    border-left: 2.5pt solid #f59e0b;
  }
  .note-name {
    font-size: 9pt;
    font-weight: bold;
    color: #b45309;
    margin: 0;
    font-style: italic;
  }
</style>
</head>
<body>
  <table class="header-box">
    <tr>
      <td class="header-td">
        <div class="show-title">${String(setlist.name || 'SEM NOME').toUpperCase()}</div>
        <div class="band-title">BANDA: ${String(setlist.bandName || 'SEM BANDA').toUpperCase()}</div>
        <div class="meta-text">
          ${setlist.date ? `Data: ${setlist.date} &nbsp;|&nbsp; ` : ''}
          ${setlist.local ? `Local: ${setlist.local} &nbsp;|&nbsp; ` : ''}
          Total: ${totalSongsCount} Músicas &nbsp;|&nbsp;
          Duração: ${totalDur || 'Não informado'}
          ${setlist.notes ? `<br>Obs: ${setlist.notes}` : ''}
        </div>
      </td>
    </tr>
  </table>

  <table class="setlist-grid">
    <tr>
      <td class="column-td">
        ${col1Html}
      </td>
      <td class="gap-td"></td>
      <td class="column-td">
        ${col2Html}
      </td>
    </tr>
  </table>
</body>
</html>`;

      // Formatar nome do arquivo ASCII seguro
      const sanitizeFileName = (str) => {
        if (!str) return '';
        return String(str)
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9_-]/g, '_')
          .replace(/_+/g, '_')
          .trim();
      };

      const safeBand = sanitizeFileName(setlist.bandName) || 'banda';
      const safeEvent = sanitizeFileName(setlist.name) || 'setlist';
      const safeDate = sanitizeFileName(setlist.date) || 'data';
      const safeFileName = `${safeBand}_${safeEvent}_${safeDate}.doc`;

      const fileContentWithBom = '\ufeff' + docContent;

      if (Platform.OS === 'web') {
        const blob = new Blob([fileContentWithBom], { type: 'application/msword;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = safeFileName;
        link.click();
        URL.revokeObjectURL(url);
        Alert.alert(t('success') || 'Sucesso', `Arquivo "${safeFileName}" baixado com sucesso!`);
      } else {
        const fileUri = `${FileSystem.cacheDirectory}${safeFileName}`;
        
        await FileSystem.writeAsStringAsync(fileUri, fileContentWithBom, { encoding: FileSystem.EncodingType.UTF8 });

        if (await Sharing.isAvailableAsync()) {
          try {
            await Sharing.shareAsync(fileUri, {
              mimeType: 'application/msword',
              dialogTitle: `Exportar Roteiro: ${setlist.name || 'Setlist'}`,
              UTI: 'com.microsoft.word.doc',
            });
          } catch (shareErr) {
            console.warn('Tentativa com mimeType falhou, tentando sem parâmetros:', shareErr);
            await Sharing.shareAsync(fileUri);
          }
        } else {
          Alert.alert(t('error') || 'Erro', 'Serviço de compartilhamento de arquivos não disponível.');
        }
      }
    } catch (error) {
      console.error('Erro ao exportar arquivo .doc:', error);
      Alert.alert(t('error') || 'Erro', 'Não foi possível gerar ou exportar o arquivo .doc.');
    }
  };

  const handleToggleFavoriteSong = async (id, currentStatus) => {
    try {
      await songService.toggleFavorite(id, currentStatus);
      await reloadAllData();
    } catch (error) {
      console.error('Erro ao favoritar música:', error);
    }
  };

  const handleToggleFavoriteSetlist = async (id, currentStatus) => {
    try {
      await setlistService.toggleFavorite(id, currentStatus);
      await reloadAllData();
    } catch (error) {
      console.error('Erro ao favoritar setlist:', error);
    }
  };

  const handleToggleRehearsalStatus = async (setlistId, songId, index, currentOrTargetStatus) => {
    try {
      const nextStatusMap = {
        'none': 'green',
        'green': 'yellow',
        'yellow': 'red',
        'red': 'none'
      };
      const nextStatus = nextStatusMap[currentOrTargetStatus || 'none'] || 'green';

      setSetlists(prevSetlists => 
        prevSetlists.map(s => {
          if (s.id === setlistId) {
            const updatedSongs = [...(s.songs || [])];
            if (updatedSongs[index]) {
              updatedSongs[index] = { ...updatedSongs[index], rehearsalStatus: nextStatus };
            }
            return { ...s, songs: updatedSongs };
          }
          return s;
        })
      );

      setActiveSetlist(prev => {
        if (!prev || prev.id !== setlistId) return prev;
        const updatedSongs = [...(prev.songs || [])];
        if (updatedSongs[index]) {
          updatedSongs[index] = { ...updatedSongs[index], rehearsalStatus: nextStatus };
        }
        return { ...prev, songs: updatedSongs };
      });

      if (typeof Vibration !== 'undefined') Vibration.vibrate(10);
      const setlist = setlists.find(s => s.id === setlistId);
      const currentNotes = (setlist && setlist.songs && setlist.songs[index] && setlist.songs[index].rehearsalNotes) || '';

      await setlistService.updateSongRehearsal(setlistId, songId, index, nextStatus, currentNotes);
    } catch (error) {
      console.error('Erro ao atualizar status de ensaio:', error);
    }
  };

  const handleUpdateSongRehearsalNotes = async (setlistId, songId, index, text) => {
    try {
      const setlist = setlists.find(s => s.id === setlistId);
      if (!setlist) return;
      const song = setlist.songs[index];
      if (!song) return;

      const currentStatus = song.rehearsalStatus || 'none';

      setSetlists(prevSetlists => 
        prevSetlists.map(s => {
          if (s.id === setlistId) {
            const updatedSongs = [...s.songs];
            updatedSongs[index] = { ...updatedSongs[index], rehearsalNotes: text };
            return { ...s, songs: updatedSongs };
          }
          return s;
        })
      );

      setActiveSetlist(prev => {
        if (!prev || prev.id !== setlistId) return prev;
        const updatedSongs = [...(prev.songs || [])];
        if (updatedSongs[index]) {
          updatedSongs[index] = { ...updatedSongs[index], rehearsalNotes: text };
        }
        return { ...prev, songs: updatedSongs };
      });

      await setlistService.updateSongRehearsal(setlistId, songId, index, currentStatus, text);
    } catch (error) {
      console.error('Erro ao atualizar notas de ensaio:', error);
    }
  };

  const handleImportSetlist = async (jsonString) => {
    try {
      if (!jsonString || !jsonString.trim()) {
        Alert.alert('Erro', 'Por favor, insira o código do setlist.');
        return false;
      }

      const cleanInput = jsonString.trim();
      let importData;
      
      try {
        importData = JSON.parse(cleanInput);
      } catch (e) {
        // Se falhar o parse direto (por causa de texto ao redor), tenta encontrar e extrair o bloco JSON
        const startIdx = cleanInput.indexOf('{"app":"SetlistsApp"');
        if (startIdx !== -1) {
          const endIdx = cleanInput.lastIndexOf('}');
          if (endIdx > startIdx) {
            const extracted = cleanInput.substring(startIdx, endIdx + 1);
            try {
              importData = JSON.parse(extracted);
            } catch (innerError) {
              Alert.alert('Erro', 'Não foi possível ler um código de setlist válido na mensagem colada.');
              return false;
            }
          }
        }
        
        if (!importData) {
          Alert.alert('Erro', 'O código fornecido não contém dados válidos. Verifique se copiou a mensagem inteira.');
          return false;
        }
      }

      if (importData.app !== 'SetlistsApp') {
        Alert.alert('Erro', 'Este código não pertence a um setlist deste aplicativo.');
        return false;
      }

      if (!importData.name || !importData.songs || !Array.isArray(importData.songs)) {
        Alert.alert('Erro', 'O setlist importado possui dados incompletos ou inválidos.');
        return false;
      }

      // 1. Resolver Banda
      let bandId = null;
      if (importData.bandName) {
        const existingBands = await bandService.getAll();
        const foundBand = existingBands.find(b => b.name.toLowerCase() === importData.bandName.toLowerCase());
        if (foundBand) {
          bandId = foundBand.id;
        } else {
          bandId = await bandService.insert(importData.bandName, null);
        }
      }

      // 2. Resolver Músicas
      const songIds = [];
      const allExistingSongs = await songService.getAll();

      for (const songData of importData.songs) {
        // Se for PAUSA, o ID fictício especial é -1
        if (songData.name === 'PAUSA' && (songData.originalBand === 'INTERVALO' || !songData.originalBand)) {
          songIds.push({
            id: -1,
            customNotes: songData.customNotes || '',
            customDuration: songData.customDuration || ''
          });
          continue;
        }

        // Buscar se a música já existe
        const foundSong = allExistingSongs.find(
          s => s.name.toLowerCase() === songData.name.toLowerCase() && 
               s.originalBand.toLowerCase() === songData.originalBand.toLowerCase()
        );

        let songId;
        if (foundSong) {
          songId = foundSong.id;
        } else {
          // Inserir música
          songId = await songService.insert(
            songData.name,
            songData.originalBand,
            songData.style,
            songData.lyrics,
            songData.chords || '',
            songData.tabs || '',
            songData.defaultView || 'lyrics',
            songData.duration,
            songData.scrollSpeed || 'none'
          );

          // Sincronizar links da música
          if (songData.links && Array.isArray(songData.links)) {
            await songService.syncLinks(songId, songData.links);
          }
        }
        songIds.push({
          id: songId,
          customNotes: songData.customNotes || '',
          customDuration: songData.customDuration || ''
        });
      }

      // 3. Inserir Setlist
      let finalName = importData.name;
      const existingSetlists = await setlistService.getAll();
      const nameExists = existingSetlists.some(sl => sl.name.toLowerCase() === finalName.toLowerCase());
      if (nameExists) {
        finalName = `${finalName} - Importado`;
      }

      await setlistService.insert(
        finalName,
        importData.type || 'repertório',
        bandId,
        importData.date || '',
        importData.local || '',
        importData.cachê || null,
        importData.notes || '',
        songIds
      );

      await reloadAllData();
      Alert.alert('Sucesso', `Setlist "${finalName}" importado com sucesso com ${songIds.length} músicas!`);
      return true;
    } catch (error) {
      console.error('Erro ao importar setlist:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao importar o setlist.');
      return false;
    }
  };

  const handleViewSetlistDetails = (setlist) => {
    setActiveSetlist(setlist);
    setShowDetailModal(true);
  };

  const handleStartPerformance = (setlist) => {
    setActiveSetlist(setlist);
    setShowPerformanceMode(true);
  };

  const handleStartSongPerformance = (song) => {
    const mockSetlist = {
      name: song.name,
      songs: [song],
    };
    setActiveSetlist(mockSetlist);
    setShowPerformanceMode(true);
  };

  const calculateStats = (targetBandId) => {
    const targetSetlists = targetBandId 
      ? setlists.filter((sl) => sl.myBandId === targetBandId)
      : setlists;

    const uniqueSongIds = new Set();
    targetSetlists.forEach((sl) => {
      if (sl.songs) {
        sl.songs.forEach((s) => {
          if (s.id >= 0) {
            uniqueSongIds.add(s.id);
          }
        });
      }
    });

    let totalCachê = 0;
    let totalShows = 0;
    let totalEnsaios = 0;

    targetSetlists.forEach((sl) => {
      if (sl.type === 'show') {
        totalShows++;
        if (sl.cachê) {
          const cleanVal = String(sl.cachê)
            .replace(/[^\d.,]/g, '')
            .replace(/\./g, '')
            .replace(',', '.');
          const val = parseFloat(cleanVal) || 0;
          totalCachê += val;
        }
      } else if (sl.type === 'ensaio') {
        totalEnsaios++;
      }
    });

    const formattedCachê = totalCachê.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    return {
      songsCount: uniqueSongIds.size,
      formattedCachê,
      totalShows,
      totalEnsaios,
    };
  };

  // ===== RENDERS DAS ABAS =====
  const renderHomeTab = () => {
    const upcomingSetlists = setlists
      .filter(s => isFutureDate(s.date))
      .sort((a, b) => {
        const parseDate = (dStr) => {
          if (!dStr) return new Date(8640000000000000);
          const clean = dStr.trim();
          const dmy = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
          if (dmy) return new Date(parseInt(dmy[3], 10), parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10));
          const ymd = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
          if (ymd) return new Date(parseInt(ymd[1], 10), parseInt(ymd[2], 10) - 1, parseInt(ymd[3], 10));
          const d = new Date(clean);
          return isNaN(d.getTime()) ? new Date(8640000000000000) : d;
        };
        return parseDate(a.date) - parseDate(b.date);
      });

    return (
      <View style={{ flex: 1 }}>
        <View style={styles.tabHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.headerCountBadge, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '35' }]}>
              <Text style={[styles.headerCountText, { color: colors.primary }]}>{bands.length}</Text>
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('myBands')}</Text>
          </View>
        </View>

        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <BandCarousel
            bands={bands}
            selectedBandId={selectedBandId}
            onSelectBand={(bandId) => {
              setSelectedBandId(bandId);
              setCurrentTab('setlists');
            }}
            onAddBand={() => {
              setEditingBand(null);
              setShowBandModal(true);
            }}
            onEditBand={handleEditBand}
            onDeleteBand={(band) => {
              Alert.alert(
                t('deleteBandConfirmTitle'),
                t('deleteBandConfirmMsg').replace('{name}', band.name),
                [
                  { text: t('cancel'), style: 'cancel' },
                  {
                    text: t('delete'),
                    style: 'destructive',
                    onPress: async () => {
                      await bandService.delete(band.id);
                      if (selectedBandId === band.id) {
                        setSelectedBandId(null);
                      }
                      await reloadAllData();
                    },
                  },
                ]
              );
            }}
          />

          {upcomingSetlists.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 28, marginBottom: 12, marginLeft: 4 }]}>
                {t('upcomingEvents')}
              </Text>
              {upcomingSetlists.map((setlist) => {
                const badge = getFormattedDateBadge(setlist.date, language);
                
                return (
                  <Pressable
                    key={setlist.id}
                    style={({ pressed }) => [
                      styles.bandCard,
                      {
                        backgroundColor: colors.cardBackground,
                        borderColor: colors.border,
                        borderWidth: 1.5,
                        marginBottom: 10,
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 12
                      }
                    ]}
                    onPress={() => {
                      setSelectedBandId(setlist.myBandId);
                      setExpandedSetlistIds([setlist.id]);
                      setCurrentTab('setlists');
                    }}
                  >
                    {/* 1. Date Square (Left) */}
                    <View style={{
                      width: 50,
                      height: 50,
                      borderRadius: 6,
                      borderWidth: 1.5,
                      borderColor: colors.border,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text, lineHeight: 18 }}>{badge.day}</Text>
                      <Text style={{ fontSize: 9, fontWeight: '800', color: colors.primary, marginTop: 2, letterSpacing: 0.5 }}>{badge.month}</Text>
                    </View>

                    {/* 2. Band Logo (Middle) */}
                    <View style={{ marginLeft: 10 }}>
                      {setlist.bandImageUri ? (
                        <Image source={{ uri: setlist.bandImageUri }} style={{ width: 42, height: 42, borderRadius: 21 }} />
                      ) : (
                        <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' }}>
                          <Text style={{ fontSize: 14, fontWeight: '900', color: colors.primary }}>
                            {getBandInitials(setlist.bandName || '')}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* 3. Text Info (Right) */}
                    <View style={{ flex: 1, marginLeft: 10, justifyContent: 'center' }}>
                      <Text style={{ fontSize: 14, fontWeight: '900', color: colors.text }} numberOfLines={1}>
                        {setlist.name || 'Sem Nome'}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                        <View style={{
                          backgroundColor: (setlist.type === 'show' ? colors.danger : setlist.type === 'ensaio' ? colors.primary : colors.success) + '15',
                          borderColor: (setlist.type === 'show' ? colors.danger : setlist.type === 'ensaio' ? colors.primary : colors.success) + '30',
                          borderWidth: 1,
                          borderRadius: 4,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          <Ionicons 
                            name={setlist.type === 'show' ? 'mic-outline' : setlist.type === 'ensaio' ? 'musical-notes-outline' : 'clipboard-outline'} 
                            size={10} 
                            color={setlist.type === 'show' ? colors.danger : setlist.type === 'ensaio' ? colors.primary : colors.success} 
                          />
                          <Text style={{ 
                            fontSize: 10, 
                            fontWeight: '900', 
                            color: setlist.type === 'show' ? colors.danger : setlist.type === 'ensaio' ? colors.primary : colors.success 
                          }}>
                            {t(setlist.type).toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </>
          )}

        </ScrollView>
      </View>
    );
  };

  const renderSongsTab = () => {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.tabHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.headerCountBadge, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '35' }]}>
              <Text style={[styles.headerCountText, { color: colors.primary }]}>{songs.length}</Text>
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('songs')}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable 
              style={({ pressed }) => [
                styles.quickAddButton,
                { backgroundColor: colors.secondary + '20', borderColor: colors.secondary + '60', borderWidth: 1, transform: [{ scale: pressed ? 0.95 : 1 }] }
              ]}
              onPress={() => setShowImportSongModal(true)}
            >
              <Text style={[styles.quickAddText, { color: colors.secondary }]}>{t('importBtnText')}</Text>
            </Pressable>
            <Pressable 
              style={({ pressed }) => [
                styles.quickAddButton,
                { backgroundColor: colors.primary, transform: [{ scale: pressed ? 0.95 : 1 }] }
              ]}
              onPress={() => { setEditingSong(null); setShowSongModal(true); }}
            >
              <Text style={styles.quickAddText}>{t('addSong')}</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 }}>
          <TextInput
            style={[styles.searchInput, { 
              flex: 1,
              backgroundColor: colors.cardBackground, 
              color: colors.inputText,
              borderColor: colors.border,
              marginBottom: 0
            }]}
            placeholder={t('searchPlaceholderDesc')}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Pressable 
            style={({ pressed }) => [
              styles.eyeButtonNextToSearch,
              { 
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
                borderWidth: 1.5,
                opacity: pressed ? 0.7 : 1
              }
            ]}
            onPress={() => setShowStyleFilters(!showStyleFilters)}
          >
            <Ionicons 
              name={showStyleFilters ? "pricetags" : "pricetags-outline"} 
              size={18} 
              color={showStyleFilters ? colors.primary : colors.textMuted} 
            />
          </Pressable>
        </View>

        {showStyleFilters && songStyles.length > 0 && (
          <View style={styles.tagFilterContainer}>
            {/* Chip "Todos" */}
            <Pressable
              style={({ pressed }) => [
                styles.smallFilterChip,
                { 
                  backgroundColor: colors.cardBackground, 
                  borderColor: colors.border,
                  transform: [{ scale: pressed ? 0.95 : 1 }]
                },
                selectedStyles.length === 0 && { borderColor: colors.primary, borderWidth: 1.5 }
              ]}
              onPress={() => setSelectedStyles([])}
            >
              <Text style={[
                styles.smallFilterChipText, 
                { color: selectedStyles.length === 0 ? colors.primary : colors.text }
              ]}>
                todos
              </Text>
            </Pressable>

            {/* Outras Tags */}
            {songStyles.map((style) => {
              const isSelected = selectedStyles.includes(style);
              return (
                <Pressable
                  key={style}
                  style={({ pressed }) => [
                    styles.smallFilterChip,
                    { 
                      backgroundColor: colors.cardBackground, 
                      borderColor: colors.border,
                      transform: [{ scale: pressed ? 0.95 : 1 }]
                    },
                    isSelected && { borderColor: colors.primary, borderWidth: 1.5 }
                  ]}
                  onPress={() => {
                    if (isSelected) {
                      setSelectedStyles(selectedStyles.filter(s => s !== style));
                    } else {
                      if (selectedStyles.length < 3) {
                        setSelectedStyles([...selectedStyles, style]);
                      } else {
                        Alert.alert('Limite atingido', 'Você pode selecionar no máximo 3 tags ao mesmo tempo.');
                      }
                    }
                  }}
                >
                  <Text style={[
                    styles.smallFilterChipText, 
                    { color: isSelected ? colors.primary : colors.text }
                  ]}>
                    {style}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Linha de Ordenação */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 4, paddingHorizontal: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="funnel-outline" size={14} color={colors.textMuted} />
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5 }}>
              {language === 'en' ? 'SORT BY:' : language === 'es' ? 'ORDENAR POR:' : 'ORDENAR POR:'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              style={({ pressed }) => [
                styles.sortChipButton,
                { 
                  backgroundColor: colors.cardBackground, 
                  borderColor: songSortBy === 'band' ? colors.primary : colors.border,
                  borderWidth: songSortBy === 'band' ? 1.5 : 1,
                  opacity: pressed ? 0.8 : 1
                }
              ]}
              onPress={() => {
                if (songSortBy === 'band') {
                  setSongSortOrder(songSortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSongSortBy('band');
                  setSongSortOrder('asc');
                }
              }}
            >
              <Text style={{ 
                fontSize: 11, 
                fontWeight: '800', 
                color: songSortBy === 'band' ? colors.primary : colors.textMuted 
              }}>
                {language === 'en' ? 'Band' : language === 'es' ? 'Banda' : 'Banda'} {songSortBy === 'band' ? (songSortOrder === 'asc' ? '▲ A-Z' : '▼ Z-A') : ''}
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.sortChipButton,
                { 
                  backgroundColor: colors.cardBackground, 
                  borderColor: songSortBy === 'name' ? colors.primary : colors.border,
                  borderWidth: songSortBy === 'name' ? 1.5 : 1,
                  opacity: pressed ? 0.8 : 1
                }
              ]}
              onPress={() => {
                if (songSortBy === 'name') {
                  setSongSortOrder(songSortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSongSortBy('name');
                  setSongSortOrder('asc');
                }
              }}
            >
              <Text style={{ 
                fontSize: 11, 
                fontWeight: '800', 
                color: songSortBy === 'name' ? colors.primary : colors.textMuted 
              }}>
                {language === 'en' ? 'Song' : language === 'es' ? 'Canción' : 'Música'} {songSortBy === 'name' ? (songSortOrder === 'asc' ? '▲ A-Z' : '▼ Z-A') : ''}
              </Text>
            </Pressable>
          </View>
        </View>

        <ScrollView 
          style={{ flex: 1, marginTop: 0 }} 
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {songs.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {t('noSongs')}
            </Text>
          ) : (
            songs.map((song) => (
              <SongListItem
                key={song.id}
                song={song}
                onEdit={handleEditSong}
                onDelete={handleDeleteSong}
                onToggleFavorite={handleToggleFavoriteSong}
                onStartPerformance={handleStartSongPerformance}
                expanded={expandedSongIds.includes(song.id)}
                onToggleExpand={() => handleToggleExpandSong(song.id)}
                onShare={handleShareSong}
                sortBy={songSortBy}
              />
            ))
          )}
        </ScrollView>
      </View>
    );
  };

  const renderSetlistsTab = () => {
    // 1. Filtrar setlists pela banda selecionada
    let filteredSetlists = selectedBandId 
      ? setlists.filter(s => String(s.myBandId) === String(selectedBandId))
      : setlists;

    // 2. Filtrar setlists pelo tipo selecionado
    if (selectedSetlistType !== '') {
      filteredSetlists = filteredSetlists.filter(s => s.type === selectedSetlistType);
    }

    const activeBand = bands.find(b => String(b.id) === String(selectedBandId));

    const favoriteSetlists = filteredSetlists.filter(s => s.isFavorite);
    const nonFavoriteSetlists = filteredSetlists.filter(s => !s.isFavorite);
    const upcomingSetlists = nonFavoriteSetlists.filter(s => isFutureDate(s.date));
    const pastSetlists = nonFavoriteSetlists.filter(s => !isFutureDate(s.date));

    const setlistTypes = [
      { key: '', label: language === 'en' ? 'All' : language === 'es' ? 'Todos' : 'Todos' },
      { key: 'show', label: `🎤 ${t('show').toUpperCase()}S` },
      { key: 'ensaio', label: `🎸 ${t('rehearsal').toUpperCase()}S` },
      { key: 'repertório', label: `📋 ${t('repertoire').toUpperCase()}` },
    ];

    return (
      <View style={{ flex: 1 }}>
        <View style={styles.tabHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.headerCountBadge, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '35' }]}>
              <Text style={[styles.headerCountText, { color: colors.primary }]}>{filteredSetlists.length}</Text>
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('setlists')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable 
              style={({ pressed }) => [
                styles.quickAddButton,
                { backgroundColor: colors.secondary + '20', borderColor: colors.secondary + '60', borderWidth: 1, transform: [{ scale: pressed ? 0.95 : 1 }] }
              ]}
              onPress={() => setShowImportModal(true)}
            >
              <Text style={[styles.quickAddText, { color: colors.secondary }]}>{t('importBtnText')}</Text>
            </Pressable>
            <Pressable 
              style={({ pressed }) => [
                styles.quickAddButton,
                { backgroundColor: colors.primary, transform: [{ scale: pressed ? 0.95 : 1 }] }
              ]}
              onPress={() => { setEditingSetlist(null); setShowSetlistModal(true); }}
            >
              <Text style={styles.quickAddText}>{t('addSetlist')}</Text>
            </Pressable>
          </View>
        </View>

        {/* Barra de Filtros Consolidada (Tipo e Banda) */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          gap: 10, 
          paddingHorizontal: 4, 
          marginBottom: 12 
        }}>
          {/* Botão Único de Ciclo de Tipo */}
          <Pressable
            style={({ pressed }) => [
              {
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: colors.cardBackground,
                borderColor: selectedSetlistType !== '' ? colors.primary : colors.border,
                borderWidth: 1.5,
                borderRadius: 8,
                paddingVertical: 10,
                height: 48,
                transform: [{ scale: pressed ? 0.98 : 1 }]
              }
            ]}
            onPress={() => {
              if (typeof Vibration !== 'undefined') Vibration.vibrate(10);
              if (selectedSetlistType === '') {
                setSelectedSetlistType('show');
              } else if (selectedSetlistType === 'show') {
                setSelectedSetlistType('ensaio');
              } else if (selectedSetlistType === 'ensaio') {
                setSelectedSetlistType('repertório');
              } else {
                setSelectedSetlistType('');
              }
            }}
          >
            <Ionicons 
              name={
                selectedSetlistType === 'show' ? 'mic' : 
                selectedSetlistType === 'ensaio' ? 'musical-notes' : 
                selectedSetlistType === 'repertório' ? 'clipboard' : 
                'funnel-outline'
              } 
              size={15} 
              color={selectedSetlistType !== '' ? colors.primary : colors.text} 
            />
            <Text style={{ 
              fontSize: 12, 
              fontWeight: '900', 
              color: selectedSetlistType !== '' ? colors.primary : colors.text 
            }}>
              {selectedSetlistType === 'show' ? `${t('show').toUpperCase()}S` :
               selectedSetlistType === 'ensaio' ? `${t('rehearsal').toUpperCase()}S` :
               selectedSetlistType === 'repertório' ? t('repertoire').toUpperCase() :
               `FILTRO: TODOS`}
            </Text>
          </Pressable>

          {/* Botão de Ciclo de Filtro de Banda */}
          <Pressable
            style={({ pressed }) => [
              {
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: colors.cardBackground,
                borderColor: selectedBandId ? colors.primary : colors.border,
                borderWidth: 1.5,
                borderRadius: 8,
                paddingVertical: 10,
                height: 48,
                transform: [{ scale: pressed ? 0.98 : 1 }]
              }
            ]}
            onPress={() => {
              if (typeof Vibration !== 'undefined') Vibration.vibrate(10);
              if (bands.length === 0) {
                setSelectedBandId(null);
                return;
              }
              if (!selectedBandId) {
                setSelectedBandId(bands[0].id);
              } else {
                const idx = bands.findIndex(b => String(b.id) === String(selectedBandId));
                if (idx === -1 || idx === bands.length - 1) {
                  setSelectedBandId(null);
                } else {
                  setSelectedBandId(bands[idx + 1].id);
                }
              }
            }}
          >
            {/* Círculo da Banda / Icone de Todas */}
            <View style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: selectedBandId ? colors.primary + '15' : colors.border,
              borderWidth: 1.5,
              borderColor: selectedBandId ? colors.primary : 'rgba(0,0,0,0.1)',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'hidden'
            }}>
              {selectedBandId && activeBand ? (
                activeBand.imageUri ? (
                  <Image source={{ uri: activeBand.imageUri }} style={{ width: 24, height: 24, borderRadius: 12 }} />
                ) : (
                  <Text style={{ fontSize: 9, fontWeight: '950', color: colors.primary }}>
                    {getBandInitials(activeBand.name || '')}
                  </Text>
                )
              ) : (
                <Ionicons name="briefcase-outline" size={12} color={colors.textMuted} />
              )}
            </View>

            <Text 
              style={{ 
                fontSize: 12, 
                fontWeight: '900', 
                color: selectedBandId ? colors.primary : colors.text,
                flexShrink: 1 
              }}
              numberOfLines={1}
            >
              {selectedBandId && activeBand ? activeBand.name.toUpperCase() : (language === 'en' ? 'ALL BANDS' : language === 'es' ? 'TODAS' : 'TODAS')}
            </Text>
          </Pressable>
        </View>



        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {filteredSetlists.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {t('noSongsInCard')}
            </Text>
          ) : (
            <>
              {/* 1. Favoritas (Sempre no topo) */}
              {favoriteSetlists.map((setlist) => (
                <SetlistCard
                  key={setlist.id}
                  setlist={setlist}
                  onEdit={handleEditSetlist}
                  onDelete={handleDeleteSetlist}
                  onCopy={handleDuplicateSetlist}
                  onShare={handleShareSetlist}
                  onStartPerformance={handleStartPerformance}
                  onExportDoc={handleExportDoc}
                  onToggleFavorite={handleToggleFavoriteSetlist}
                  expanded={expandedSetlistIds.includes(setlist.id)}
                  onToggleExpand={() => handleToggleExpandSetlist(setlist.id)}
                  onToggleRehearsalStatus={handleToggleRehearsalStatus}
                  onUpdateSongRehearsalNotes={handleUpdateSongRehearsalNotes}
                  onEditSong={handleEditSong}
                />
              ))}

              {/* 2. Próximas */}
              {upcomingSetlists.map((setlist) => (
                <SetlistCard
                  key={setlist.id}
                  setlist={setlist}
                  onEdit={handleEditSetlist}
                  onDelete={handleDeleteSetlist}
                  onCopy={handleDuplicateSetlist}
                  onShare={handleShareSetlist}
                  onStartPerformance={handleStartPerformance}
                  onExportDoc={handleExportDoc}
                  onToggleFavorite={handleToggleFavoriteSetlist}
                  expanded={expandedSetlistIds.includes(setlist.id)}
                  onToggleExpand={() => handleToggleExpandSetlist(setlist.id)}
                  onToggleRehearsalStatus={handleToggleRehearsalStatus}
                  onUpdateSongRehearsalNotes={handleUpdateSongRehearsalNotes}
                  onEditSong={handleEditSong}
                />
              ))}

              {/* 3. Antigas (com botão olho de toggle) */}
              {pastSetlists.length > 0 && (
                <View style={{ marginTop: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={[styles.headerCountBadge, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '35' }]}>
                        <Text style={[styles.headerCountText, { color: colors.primary }]}>{pastSetlists.length}</Text>
                      </View>
                      <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 15, marginBottom: 0 }]}>
                        {language === 'en' ? 'PAST' : language === 'es' ? 'ANTIGUAS' : 'ANTIGAS'}
                      </Text>
                    </View>
                    <Pressable 
                      style={({ pressed }) => [
                        {
                          width: 32,
                          height: 32,
                          borderRadius: 6,
                          backgroundColor: colors.border,
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: pressed ? 0.7 : 1
                        }
                      ]}
                      onPress={() => setShowPastSetlists(!showPastSetlists)}
                    >
                      <Ionicons 
                        name={showPastSetlists ? "eye-outline" : "eye-off-outline"} 
                        size={16} 
                        color={colors.text} 
                      />
                    </Pressable>
                  </View>

                  {showPastSetlists && pastSetlists.map((setlist) => (
                    <SetlistCard
                      key={setlist.id}
                      setlist={setlist}
                      onEdit={handleEditSetlist}
                      onDelete={handleDeleteSetlist}
                      onCopy={handleDuplicateSetlist}
                      onShare={handleShareSetlist}
                      onStartPerformance={handleStartPerformance}
                      onExportDoc={handleExportDoc}
                      onToggleFavorite={handleToggleFavoriteSetlist}
                      expanded={expandedSetlistIds.includes(setlist.id)}
                      onToggleExpand={() => handleToggleExpandSetlist(setlist.id)}
                      onToggleRehearsalStatus={handleToggleRehearsalStatus}
                      onUpdateSongRehearsalNotes={handleUpdateSongRehearsalNotes}
                      onEditSong={handleEditSong}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderAboutTab = () => {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.tabHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('aboutHeader')}</Text>
        </View>

        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Card Principal de Versão */}
          <View style={[styles.aboutCard, { backgroundColor: colors.cardBackground, borderColor: colors.border, alignItems: 'center' }]}>
            <Image source={require('./assets/logo.png')} style={styles.aboutLogo} />
            <Text style={[styles.aboutAppTitle, { color: colors.primary }]}>SETLIST BAND MANAGER</Text>
            <Text style={[styles.aboutAppVersion, { color: colors.textMuted }]}>{t('versionText')} 1.1.4</Text>
            
            <View style={[styles.divider, { backgroundColor: colors.border, width: '100%' }]} />
            
            <Text style={[styles.aboutDeveloperLabel, { color: colors.textMuted }]}>{t('aboutDev')}</Text>
            <Pressable 
              onPress={() => Linking.openURL('https://instagram.com/allison_rps').catch(err => console.error("Couldn't open URL", err))}
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              <Text style={[styles.aboutDeveloperName, { color: colors.primary, textDecorationLine: 'underline' }]}>
                Allison Rodrigues
              </Text>
            </Pressable>
          </View>

          {/* Card de Descrição */}
          <View style={[styles.aboutCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.aboutSectionTitle, { color: colors.text }]}>{t('aboutTheApp')}</Text>
            <Text style={[styles.aboutDescriptionText, { color: colors.textMuted }]}>
              {t('aboutAppDesc')}
            </Text>
          </View>
          {/* Card de Funcionalidades com Tutoriais Interativos */}
          <View style={[styles.aboutCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.aboutSectionTitle, { color: colors.text, marginBottom: 0 }]}>{t('aboutFeatures')}</Text>
              <View style={{ backgroundColor: colors.primary + '15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                <Text style={{ fontSize: 9.5, fontWeight: '900', color: colors.primary }}>
                  {t('tapForTutorial') || 'TOQUE PARA O GUIA'}
                </Text>
              </View>
            </View>
            
            {getFeaturesList(language).map((feature) => (
              <Pressable
                key={feature.id}
                onPress={() => setSelectedTutorialFeature(feature)}
                style={({ pressed }) => [
                  styles.aboutFeatureRow,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                    padding: 10,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.border,
                    marginBottom: 8,
                    alignItems: 'center',
                  },
                  pressed && { opacity: 0.7, transform: [{ scale: 0.99 }] }
                ]}
              >
                <View style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: colors.primary + '15', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name={feature.icon} size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 10 }}>
                  <Text style={[styles.aboutFeatureTitle, { color: colors.text, fontSize: 12.5 }]}>{feature.title}</Text>
                  <Text style={[styles.aboutFeatureDesc, { color: colors.textMuted, fontSize: 10.5, marginTop: 1 }]} numberOfLines={2}>
                    {feature.subtitle}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.primary + '12', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6 }}>
                  <Text style={{ fontSize: 9, fontWeight: '900', color: colors.primary }}>
                    TUTORIAL
                  </Text>
                  <Ionicons name="chevron-forward" size={11} color={colors.primary} />
                </View>
              </Pressable>
            ))}
          </View>

          
          {/* Card de Sincronização Web (QR Code) */}
          <View style={[styles.aboutCard, { backgroundColor: colors.cardBackground, borderColor: '#6366f166', borderWidth: 1.5 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <View style={{ backgroundColor: '#6366f122', padding: 8, borderRadius: 10 }}>
                <Ionicons name="qr-code-outline" size={24} color="#6366f1" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.aboutSectionTitle, { color: colors.text, marginBottom: 2 }]}>Sincronizar com Web Editor (PC)</Text>
                <Text style={{ fontSize: 11.5, color: colors.textMuted }}>Conecte ao seu computador via QR Code ou PIN</Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 17, marginBottom: 14 }}>
              Transfira todo o seu repertório, letras, cifras e setlists entre o aplicativo do celular e o Web Editor no computador com apenas 1 leitura de câmera ou código PIN de 6 dígitos.
            </Text>
            <Pressable
              style={({ pressed }) => [
                {
                  backgroundColor: '#6366f1',
                  paddingVertical: 12,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: pressed ? 0.85 : 1,
                  shadowColor: '#6366f1',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.35,
                  shadowRadius: 8,
                  elevation: 4,
                }
              ]}
              onPress={() => setShowSyncModal(true)}
            >
              <Ionicons name="scan-outline" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>
                ABRIR SINCRONIZADOR QR CODE
              </Text>
            </Pressable>
          </View>

          {/* Card de Dicas de Backup */}
          <View style={[styles.aboutCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.aboutSectionTitle, { color: colors.warning }]}>{t('backupTipsTitle')}</Text>
            
            <View style={{ gap: 10, marginTop: 8 }}>
              <Text style={{ fontSize: 13, color: colors.text, fontWeight: '700' }}>
                {t('protectDataLabel')}
              </Text>
              
              <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 17 }}>
                {t('tip1')}
              </Text>
              
              <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 17 }}>
                {t('tip2')}
              </Text>

              <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 17 }}>
                {t('tip3')}
              </Text>
            </View>

            {/* Ações de Backup e Restauração Consolidada */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Pressable
                style={({ pressed }) => [
                  {
                    flex: 1,
                    backgroundColor: colors.primary,
                    paddingVertical: 10,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    opacity: pressed ? 0.8 : 1,
                  }
                ]}
                onPress={handleBackupAll}
              >
                <Ionicons name="save-outline" size={14} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 10.5, fontWeight: '900' }}>
                  {t('backupAllBtn')}
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  {
                    flex: 1,
                    backgroundColor: 'transparent',
                    borderWidth: 1.5,
                    borderColor: colors.primary,
                    paddingVertical: 10,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    opacity: pressed ? 0.8 : 1,
                  }
                ]}
                onPress={() => setShowImportBackupModal(true)}
              >
                <Ionicons name="download-outline" size={14} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 10.5, fontWeight: '900' }}>
                  {t('restoreBackupBtn')}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />

      {!dbReady ? (
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>{t('loadingDatabase')}</Text>
        </View>
      ) : (
        <View style={styles.container}>
          {/* Cabeçalho principal */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Image source={require('./assets/logo.png')} style={styles.headerLogo} />
              <Text style={[styles.appTitle, { color: colors.text }]}>SETLIST BAND MANAGER</Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.settingsButton,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                  transform: [{ scale: pressed ? 0.9 : 1 }]
                }
              ]}
              onPress={() => setShowSettingsModal(true)}
            >
              <Ionicons name="settings-outline" size={18} color={colors.text} />
            </Pressable>
          </View>

          {/* Área de conteúdo da aba ativa */}
          <View style={{ flex: 1 }}>
            {currentTab === 'home' && renderHomeTab()}
            {currentTab === 'songs' && renderSongsTab()}
            {currentTab === 'setlists' && renderSetlistsTab()}
            {currentTab === 'about' && renderAboutTab()}
          </View>

          {/* Barra de Navegação Inferior */}
          <View style={[styles.bottomNav, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
            <Pressable
              style={styles.tabItem}
              onPress={() => setCurrentTab('home')}
            >
              <Ionicons 
                name={currentTab === 'home' ? 'home' : 'home-outline'} 
                size={20} 
                color={currentTab === 'home' ? colors.primary : colors.textMuted} 
              />
              <Text style={[styles.tabText, { color: currentTab === 'home' ? colors.primary : colors.textMuted }]}>
                {t('home')}
              </Text>
            </Pressable>

            <Pressable
              style={styles.tabItem}
              onPress={() => setCurrentTab('songs')}
            >
              <Ionicons 
                name={currentTab === 'songs' ? 'musical-notes' : 'musical-notes-outline'} 
                size={20} 
                color={currentTab === 'songs' ? colors.primary : colors.textMuted} 
              />
              <Text style={[styles.tabText, { color: currentTab === 'songs' ? colors.primary : colors.textMuted }]}>
                {t('songs')}
              </Text>
            </Pressable>

            <Pressable
              style={styles.tabItem}
              onPress={() => setCurrentTab('setlists')}
            >
              <Ionicons 
                name={currentTab === 'setlists' ? 'clipboard' : 'clipboard-outline'} 
                size={20} 
                color={currentTab === 'setlists' ? colors.primary : colors.textMuted} 
              />
              <Text style={[styles.tabText, { color: currentTab === 'setlists' ? colors.primary : colors.textMuted }]}>
                {t('setlists')}
              </Text>
            </Pressable>

            <Pressable
              style={styles.tabItem}
              onPress={() => setCurrentTab('about')}
            >
              <Ionicons 
                name={currentTab === 'about' ? 'information-circle' : 'information-circle-outline'} 
                size={20} 
                color={currentTab === 'about' ? colors.primary : colors.textMuted} 
              />
              <Text style={[styles.tabText, { color: currentTab === 'about' ? colors.primary : colors.textMuted }]}>
                {t('about')}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Modais do Aplicativo */}
      
      <SyncModal
        visible={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        getAllDataForBackup={getAllDataForBackup}
        onRestoreBackupData={handleRestoreBackup}
        onSyncSuccess={async () => {
          await reloadAllData();
        }}
      />

      <SettingsModal 
        visible={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)} 
      />

      <BandModal
        visible={showBandModal}
        onClose={() => { setShowBandModal(false); setEditingBand(null); }}
        onSave={handleSaveBand}
        band={editingBand}
      />

      <SongModal
        visible={showSongModal}
        onClose={() => { setShowSongModal(false); setEditingSong(null); }}
        onSave={handleSaveSong}
        song={editingSong}
      />

      <SetlistModal
        visible={showSetlistModal}
        onClose={() => { setShowSetlistModal(false); setEditingSetlist(null); }}
        onSave={handleSaveSetlist}
        setlist={editingSetlist}
        bands={bands}
        songs={allSongsUnfiltered}
        onEditSong={handleEditSong}
      />

      <SetlistDetailModal
        visible={showDetailModal}
        onClose={() => { setShowDetailModal(false); setActiveSetlist(null); }}
        setlist={activeSetlist ? (setlists.find(s => s.id === activeSetlist.id) || activeSetlist) : null}
        onStartPerformance={handleStartPerformance}
        onToggleRehearsalStatus={handleToggleRehearsalStatus}
        onUpdateSongRehearsalNotes={handleUpdateSongRehearsalNotes}
        onEditSong={handleEditSong}
      />

      {/* Modo Performance em Tela Cheia */}
      <PerformanceMode
        visible={showPerformanceMode}
        onClose={() => { setShowPerformanceMode(false); setActiveSetlist(null); }}
        setlist={activeSetlist ? (setlists.find(s => s.id === activeSetlist.id) || activeSetlist) : null}
        onEditSong={(song) => {
          setEditingSong(song);
          setShowSongModal(true);
        }}
        onToggleRehearsalStatus={handleToggleRehearsalStatus}
        onUpdateSongRehearsalNotes={handleUpdateSongRehearsalNotes}
      />

      <ImportModal
        visible={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportSetlist}
        title={t('importTitleSetlist')}
        description={t('importDescSetlist')}
        fileTypeLabel={t('fileTypeLabelSetlist')}
      />

      <ImportModal
        visible={showImportSongModal}
        onClose={() => setShowImportSongModal(false)}
        onImport={handleImportSong}
        title={t('importTitleSong')}
        description={t('importDescSong')}
        fileTypeLabel={t('fileTypeLabelSong')}
      />

      <ImportModal
        visible={showImportBackupModal}
        onClose={() => setShowImportBackupModal(false)}
        onImport={handleRestoreBackup}
        title={t('restoreBackupTitle') || 'RESTAURAR BACKUP'}
        description={t('restoreBackupDesc') || 'Selecione o arquivo de backup (.json) ou cole o código no editor abaixo para restaurar todos os dados.'}
        fileTypeLabel={t('fileTypeLabelBackup') || 'de backup'}
      />

      <FeatureTutorialModal
        visible={!!selectedTutorialFeature}
        onClose={() => setSelectedTutorialFeature(null)}
        feature={selectedTutorialFeature}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '700',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) + 16 : 50,
    paddingBottom: Platform.OS === 'ios' ? 112 : 106,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogo: {
    width: 28,
    height: 28,
    borderRadius: 4,
    resizeMode: 'contain',
  },
  appTitle: {
    fontSize: 16,
    fontWeight: '950',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 32,
    lineHeight: 20,
  },
  searchInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    fontSize: 15,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  tagFilterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  smallFilterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortChipButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallFilterChipText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'lowercase',
  },
  eyeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeButtonNextToSearch: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCountText: {
    fontSize: 12,
    fontWeight: '900',
  },
  tabHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  quickAddButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bandCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1.5,
  },
  bandCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  bandCardImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    resizeMode: 'cover',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  bandCardPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  bandCardPlaceholderIcon: {
    fontSize: 26,
  },
  bandCardName: {
    fontSize: 18,
    fontWeight: '950',
    flex: 1,
  },
  bandCardActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  actionButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  statsToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  statsToggleText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statsCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statsValue: {
    fontSize: 22,
    fontWeight: '950',
    marginBottom: 4,
    textAlign: 'center',
  },
  statsLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  statsTabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1.0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsTabText: {
    fontSize: 11,
    fontWeight: '800',
  },
  filterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  filterBannerLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  filterBannerText: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  clearFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 48 : 46,
    borderTopWidth: 1.5,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  tabIcon: {
    fontSize: 18,
  },
  tabText: {
    fontSize: 10,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  aboutCard: {
    padding: 20,
    borderRadius: 8,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  aboutAppTitle: {
    fontSize: 20,
    fontWeight: '950',
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 4,
  },
  aboutAppVersion: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  divider: {
    height: 1.5,
    marginVertical: 16,
    opacity: 0.5,
  },
  aboutDeveloperLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },
  aboutDeveloperName: {
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  aboutSectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  aboutDescriptionText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  aboutFeatureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  aboutFeatureIcon: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
    marginTop: 2,
  },
  aboutFeatureTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  aboutFeatureDesc: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  aboutLogo: {
    width: 64,
    height: 64,
    borderRadius: 8,
    marginBottom: 12,
    resizeMode: 'contain',
  },
  filterGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  filterGridChip: {
    width: '48.8%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  filterGridChipText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
