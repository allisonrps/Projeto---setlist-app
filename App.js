import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import * as SQLite from 'expo-sqlite';
import React, { useEffect, useState, useRef } from 'react';
import {
  Button,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
  Dimensions,
} from 'react-native';

let db = null;
const isWeb = Platform.OS === 'web';

// Mock de banco para web usando localStorage
const createMockDB = () => {
  const data = {
    my_bands: [],
    songs: [],
    song_links: [],
    setlists: [],
    setlist_songs: [],
  };
  
  // Carrega dados salvos no localStorage
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('setlist-app-db') : null;
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      Object.assign(data, parsed);
    } catch (e) {
      console.log('localStorage parse error:', e);
    }
  }
  
  const save = () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('setlist-app-db', JSON.stringify(data));
    }
  };
  
  return {
    allAsync: async (sql, params = []) => {
      console.log('Mock allAsync:', sql);
      // Parse simples do SQL para saber qual tabela
      if (sql.includes('SELECT * FROM my_bands')) return data.my_bands;
      if (sql.includes('SELECT * FROM songs')) return data.songs;
      if (sql.includes('SELECT * FROM setlists')) return data.setlists;
      if (sql.includes('SELECT * FROM song_links')) {
        const songIdMatch = params[0];
        return data.song_links.filter(l => l.songId === songIdMatch);
      }
      if (sql.includes('SELECT * FROM setlist_songs')) {
        const setlistIdMatch = params[0];
        return data.setlist_songs.filter(s => s.setlistId === setlistIdMatch);
      }
      return [];
    },
    
    runAsync: async (sql, params = []) => {
      console.log('Mock runAsync:', sql);
      
      if (sql.includes('INSERT INTO my_bands')) {
        const id = Math.max(...data.my_bands.map(b => b.id || 0), 0) + 1;
        data.my_bands.push({ id, name: params[0], imageUri: params[1] });
        save();
        return { lastInsertRowId: id };
      }
      
      if (sql.includes('UPDATE my_bands')) {
        const band = data.my_bands.find(b => b.id === params[2]);
        if (band) {
          band.name = params[0];
          band.imageUri = params[1];
          save();
        }
      }
      
      if (sql.includes('DELETE FROM my_bands')) {
        data.my_bands = data.my_bands.filter(b => b.id !== params[0]);
        save();
      }
      
      if (sql.includes('INSERT INTO songs')) {
        const id = Math.max(...data.songs.map(s => s.id || 0), 0) + 1;
        data.songs.push({
          id,
          name: params[0],
          originalBand: params[1],
          style: params[2],
          lyrics: params[3],
          createdAt: new Date().toISOString(),
        });
        save();
        return { lastInsertRowId: id };
      }
      
      if (sql.includes('UPDATE songs')) {
        const song = data.songs.find(s => s.id === params[4]);
        if (song) {
          song.name = params[0];
          song.originalBand = params[1];
          song.style = params[2];
          song.lyrics = params[3];
          save();
        }
      }
      
      if (sql.includes('DELETE FROM songs')) {
        data.songs = data.songs.filter(s => s.id !== params[0]);
        save();
      }
      
      if (sql.includes('INSERT INTO song_links')) {
        const id = Math.max(...data.song_links.map(l => l.id || 0), 0) + 1;
        data.song_links.push({
          id,
          songId: params[0],
          type: params[1],
          url: params[2],
        });
        save();
        return { lastInsertRowId: id };
      }
      
      if (sql.includes('DELETE FROM song_links')) {
        data.song_links = data.song_links.filter(l => l.songId !== params[0]);
        save();
      }
      
      if (sql.includes('INSERT INTO setlists')) {
        const id = Math.max(...data.setlists.map(s => s.id || 0), 0) + 1;
        data.setlists.push({
          id,
          type: params[0],
          myBandId: params[1],
          date: params[2],
          local: params[3],
          cachê: params[4],
          createdAt: new Date().toISOString(),
        });
        save();
        return { lastInsertRowId: id };
      }
      
      if (sql.includes('DELETE FROM setlists')) {
        data.setlists = data.setlists.filter(s => s.id !== params[0]);
        save();
      }
      
      if (sql.includes('INSERT INTO setlist_songs')) {
        const id = Math.max(...data.setlist_songs.map(s => s.id || 0), 0) + 1;
        data.setlist_songs.push({
          id,
          setlistId: params[0],
          songId: params[1],
          order_num: params[2],
        });
        save();
        return { lastInsertRowId: id };
      }
      
      if (sql.includes('DELETE FROM setlist_songs')) {
        data.setlist_songs = data.setlist_songs.filter(s => s.setlistId !== params[0]);
        save();
      }
      
      return {};
    },
    
    execAsync: async (statements) => {
      // Para CREATE TABLE, apenas ignoramos (tabelas já existem em memória)
      console.log('Mock execAsync: CREATE TABLE (ignored)');
      return;
    },
  };
};

export default function App() {
  // Estados da aplicação
  const [myBands, setMyBands] = useState([]);
  const [songs, setSongs] = useState([]);
  const [setlists, setSetlists] = useState([]);
  const [dbReady, setDbReady] = useState(false);

  // Modal states
  const [showBandModal, setShowBandModal] = useState(false);
  const [showSongModal, setShowSongModal] = useState(false);
  const [showSetlistModal, setShowSetlistModal] = useState(false);

  // Banda (minha banda cover)
  const [bandName, setBandName] = useState('');
  const [bandImage, setBandImage] = useState(null);
  const [editingBandId, setEditingBandId] = useState(null);

  // Música
  const [songName, setSongName] = useState('');
  const [originalBand, setOriginalBand] = useState('');
  const [songStyle, setSongStyle] = useState('');
  const [songLinks, setSongLinks] = useState([{ type: 'youtube', url: '' }]);
  const [songLyrics, setSongLyrics] = useState('');
  const [songImage, setSongImage] = useState(null);
  const [editingSongId, setEditingSongId] = useState(null);

  // Setlist
  const [setlistType, setSetlistType] = useState('repertório');
  const [setlistMyBand, setSetlistMyBand] = useState(null);
  const [setlistDate, setSetlistDate] = useState('');
  const [setlistLocal, setSetlistLocal] = useState('');
  const [setlistCachê, setSetlistCachê] = useState('');
  const [setlistSongs, setSetlistSongs] = useState([]);
  const [editingSetlistId, setEditingSetlistId] = useState(null);

  // Carrossel de bandas
  const [selectedBandIndex, setSelectedBandIndex] = useState(0);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('1. Abrindo banco de dados...');
      console.log('Platform:', Platform.OS, '| isWeb:', isWeb);
      
      if (isWeb) {
        console.log('Usando mock DB (localStorage)');
        db = createMockDB();
      } else {
        db = await SQLite.openDatabaseAsync('setlist.db');
      }
      
      console.log('✓ Banco aberto!');
      
      console.log('2. Criando tabelas...');
      await createTables();
      console.log('✓ Tabelas criadas!');
      
      console.log('3. Pedindo permissão de imagens...');
      await requestImagePermission();
      console.log('✓ Permissão resolvida!');
      
      console.log('4. Carregando bandas...');
      await loadMyBands();
      console.log('✓ Bandas carregadas!');
      
      console.log('5. Carregando músicas...');
      await loadSongs();
      console.log('✓ Músicas carregadas!');
      
      console.log('6. Carregando setlists...');
      await loadSetlists();
      console.log('✓ Setlists carregadas!');
      
      console.log('✓✓✓ APP PRONTO! ✓✓✓');
      setDbReady(true);
    } catch (error) {
      console.error('❌ Erro na inicialização:', error);
      console.error('Message:', error.message);
      Alert.alert('Erro ao Inicializar', error.message || 'Erro desconhecido');
    }
  };

  const createTables = async () => {
    try {
      const sqls = [
        `CREATE TABLE IF NOT EXISTS my_bands (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          imageUri TEXT
        );`,
        `CREATE TABLE IF NOT EXISTS songs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          originalBand TEXT NOT NULL,
          style TEXT,
          lyrics TEXT,
          imageUri TEXT,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE TABLE IF NOT EXISTS song_links (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          songId INTEGER NOT NULL,
          type TEXT,
          url TEXT,
          FOREIGN KEY (songId) REFERENCES songs(id) ON DELETE CASCADE
        );`,
        `CREATE TABLE IF NOT EXISTS setlists (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL,
          myBandId INTEGER,
          date TEXT,
          local TEXT,
          cachê TEXT,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (myBandId) REFERENCES my_bands(id)
        );`,
        `CREATE TABLE IF NOT EXISTS setlist_songs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          setlistId INTEGER NOT NULL,
          songId INTEGER NOT NULL,
          order_num INTEGER,
          FOREIGN KEY (setlistId) REFERENCES setlists(id) ON DELETE CASCADE,
          FOREIGN KEY (songId) REFERENCES songs(id) ON DELETE CASCADE
        );`,
      ];
      
      for (const sql of sqls) {
        await db.execAsync([{ sql, args: [] }], false);
      }
    } catch (error) {
      console.error('Create tables error:', error);
    }
  };

  const requestImagePermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Permissão de fotos é necessária para escolher imagens.');
    }
  };

  // ===== BANDAS (Minhas bandas cover) =====
  const loadMyBands = async () => {
    try {
      const result = await db.allAsync('SELECT * FROM my_bands ORDER BY name ASC;');
      setMyBands(result || []);
    } catch (error) {
      console.error('Load bands error:', error);
    }
  };

  const saveBand = async () => {
    if (!bandName.trim()) {
      Alert.alert('Atenção', 'Informe o nome da banda.');
      return;
    }
    try {
      if (editingBandId) {
        await db.runAsync('UPDATE my_bands SET name = ?, imageUri = ? WHERE id = ?;', [bandName, bandImage, editingBandId]);
      } else {
        await db.runAsync('INSERT INTO my_bands (name, imageUri) VALUES (?, ?);', [bandName, bandImage]);
      }
      await loadMyBands();
      clearBandForm();
      setShowBandModal(false);
    } catch (error) {
      Alert.alert('Erro', error.message || 'Erro ao salvar banda');
      console.error('Save band error:', error);
    }
  };

  const editBand = (band) => {
    setBandName(band.name);
    setBandImage(band.imageUri);
    setEditingBandId(band.id);
    setShowBandModal(true);
  };

  const deleteBand = async (id) => {
    Alert.alert('Excluir banda', 'Tem certeza? Todos os setlists associados também serão excluídos.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await db.runAsync('DELETE FROM my_bands WHERE id = ?;', [id]);
            await loadMyBands();
          } catch (error) {
            console.error('Delete band error:', error);
          }
        },
      },
    ]);
  };

  const clearBandForm = () => {
    setBandName('');
    setBandImage(null);
    setEditingBandId(null);
  };

  // ===== MÚSICAS =====
  const loadSongs = async () => {
    try {
      const result = await db.allAsync('SELECT * FROM songs ORDER BY name ASC;');
      const songsWithLinks = await Promise.all(
        (result || []).map(async (song) => {
          const links = await db.allAsync('SELECT * FROM song_links WHERE songId = ?;', [song.id]);
          return { ...song, links: links || [] };
        })
      );
      setSongs(songsWithLinks);
    } catch (error) {
      console.error('Load songs error:', error);
    }
  };

  const saveSong = async () => {
    if (!songName.trim() || !originalBand.trim()) {
      Alert.alert('Atenção', 'Informe o nome da música e a banda original.');
      return;
    }
    try {
      let songId = editingSongId;
      if (!editingSongId) {
        const result = await db.runAsync(
          'INSERT INTO songs (name, originalBand, style, lyrics) VALUES (?, ?, ?, ?);',
          [songName, originalBand, songStyle, songLyrics]
        );
        songId = result.lastInsertRowId;
      } else {
        await db.runAsync(
          'UPDATE songs SET name = ?, originalBand = ?, style = ?, lyrics = ? WHERE id = ?;',
          [songName, originalBand, songStyle, songLyrics, editingSongId]
        );
        await db.runAsync('DELETE FROM song_links WHERE songId = ?;', [editingSongId]);
      }

      for (const link of songLinks) {
        if (link.url.trim()) {
          await db.runAsync('INSERT INTO song_links (songId, type, url) VALUES (?, ?, ?);', [songId, link.type, link.url]);
        }
      }

      await loadSongs();
      clearSongForm();
      setShowSongModal(false);
    } catch (error) {
      Alert.alert('Erro', error.message || 'Erro ao salvar música');
      console.error('Save song error:', error);
    }
  };

  const editSong = (song) => {
    setSongName(song.name);
    setOriginalBand(song.originalBand);
    setSongStyle(song.style || '');
    setSongLyrics(song.lyrics || '');
    setSongImage(song.imageUri || null);
    setSongLinks(song.links.length > 0 ? song.links : [{ type: 'youtube', url: '' }]);
    setEditingSongId(song.id);
    setShowSongModal(true);
  };

  const deleteSong = async (id) => {
    Alert.alert('Excluir música', 'Tem certeza? Será removida de todos os setlists.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await db.runAsync('DELETE FROM songs WHERE id = ?;', [id]);
            await loadSongs();
          } catch (error) {
            console.error('Delete song error:', error);
          }
        },
      },
    ]);
  };

  const clearSongForm = () => {
    setSongName('');
    setOriginalBand('');
    setSongStyle('');
    setSongLyrics('');
    setSongImage(null);
    setSongLinks([{ type: 'youtube', url: '' }]);
    setEditingSongId(null);
  };

  const addLinkField = () => {
    setSongLinks([...songLinks, { type: 'youtube', url: '' }]);
  };

  const updateLink = (index, field, value) => {
    const newLinks = [...songLinks];
    newLinks[index][field] = value;
    setSongLinks(newLinks);
  };

  const removeLink = (index) => {
    setSongLinks(songLinks.filter((_, i) => i !== index));
  };

  // ===== SETLISTS =====
  const loadSetlists = async () => {
    try {
      const result = await db.allAsync('SELECT * FROM setlists ORDER BY date DESC;');
      setSetlists(result || []);
    } catch (error) {
      console.error('Load setlists error:', error);
    }
  };

  const saveSetlist = async () => {
    if (!setlistMyBand) {
      Alert.alert('Atenção', 'Selecione sua banda cover.');
      return;
    }
    if (!setlistDate.trim()) {
      Alert.alert('Atenção', 'Informe a data.');
      return;
    }

    try {
      let setlistId = editingSetlistId;
      if (!editingSetlistId) {
        const result = await db.runAsync(
          'INSERT INTO setlists (type, myBandId, date, local, cachê) VALUES (?, ?, ?, ?, ?);',
          [setlistType, setlistMyBand, setlistDate, setlistLocal, setlistCachê]
        );
        setlistId = result.lastInsertRowId;
      } else {
        await db.runAsync(
          'UPDATE setlists SET type = ?, myBandId = ?, date = ?, local = ?, cachê = ? WHERE id = ?;',
          [setlistType, setlistMyBand, setlistDate, setlistLocal, setlistCachê, editingSetlistId]
        );
        await db.runAsync('DELETE FROM setlist_songs WHERE setlistId = ?;', [editingSetlistId]);
      }

      // Salvar as músicas do setlist
      for (let order = 0; order < setlistSongs.length; order++) {
        const songId = setlistSongs[order];
        await db.runAsync(
          'INSERT INTO setlist_songs (setlistId, songId, order_num) VALUES (?, ?, ?);',
          [setlistId, songId, order]
        );
      }

      await loadSetlists();
      clearSetlistForm();
      setShowSetlistModal(false);
    } catch (error) {
      Alert.alert('Erro', error.message || 'Erro ao salvar setlist');
      console.error('Save setlist error:', error);
    }
  };

  const editSetlist = (setlist) => {
    setSetlistType(setlist.type);
    setSetlistMyBand(setlist.myBandId);
    setSetlistDate(setlist.date);
    setSetlistLocal(setlist.local || '');
    setSetlistCachê(setlist.cachê || '');
    setEditingSetlistId(setlist.id);
    
    // Carregar as músicas do setlist
    loadSetlistSongs(setlist.id);
    
    setShowSetlistModal(true);
  };

  const loadSetlistSongs = async (setlistId) => {
    try {
      const result = await db.allAsync('SELECT songId FROM setlist_songs WHERE setlistId = ? ORDER BY order_num;', [setlistId]);
      const songIds = (result || []).map((row) => row.songId);
      setSetlistSongs(songIds);
    } catch (error) {
      console.error('Load setlist songs error:', error);
    }
  };

  const deleteSetlist = async (id) => {
    Alert.alert('Excluir setlist', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await db.runAsync('DELETE FROM setlists WHERE id = ?;', [id]);
            await loadSetlists();
          } catch (error) {
            console.error('Delete setlist error:', error);
          }
        },
      },
    ]);
  };

  const clearSetlistForm = () => {
    setSetlistType('repertório');
    setSetlistMyBand(null);
    setSetlistDate('');
    setSetlistLocal('');
    setSetlistCachê('');
    setSetlistSongs([]);
    setEditingSetlistId(null);
  };

  const toggleSongInSetlist = (songId) => {
    if (setlistSongs.includes(songId)) {
      setSetlistSongs(setlistSongs.filter((id) => id !== songId));
    } else {
      setSetlistSongs([...setlistSongs, songId]);
    }
  };

  // ===== UTILITÁRIOS =====
  const pickImage = async (setter) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setter(result.assets[0].uri);
    }
  };

  const openLink = (url) => {
    if (url?.trim()) {
      Linking.openURL(url).catch((err) => Alert.alert('Erro', 'Não foi possível abrir o link'));
    }
  };

  // ===== COMPONENTES =====

  const BandCarousel = () => {
    if (myBands.length === 0) return null;

    return (
      <View style={styles.carouselContainer}>
        <Text style={styles.carouselTitle}>🎸 Minhas Bandas</Text>
        <View style={styles.bandCirclesContainer}>
          {myBands.map((item) => (
            <Pressable
              key={item.id}
              onLongPress={() => editBand(item)}
              onPress={() => {}}
              style={styles.bandCircle}
            >
              {item.imageUri ? (
                <Image source={{ uri: item.imageUri }} style={styles.bandCircleImage} />
              ) : (
                <View style={styles.bandCirclePlaceholder}>
                  <Text style={styles.bandCircleIcon}>🎸</Text>
                </View>
              )}
              <Text style={styles.bandCircleName}>{item.name}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  };

  const MainButtons = () => (
    <View style={styles.mainButtonsContainer}>
      <Pressable style={styles.addButton} onPress={() => setShowBandModal(true)}>
        <Text style={styles.addButtonPlus}>+</Text>
        <Text style={styles.addButtonIcon}>🎸</Text>
      </Pressable>
      <Pressable style={styles.addButton2} onPress={() => setShowSongModal(true)}>
        <Text style={styles.addButtonPlus}>+</Text>
        <Text style={styles.addButtonIcon}>🎵</Text>
      </Pressable>
      <Pressable style={styles.addButton3} onPress={() => setShowSetlistModal(true)}>
        <Text style={styles.addButtonPlus}>+</Text>
        <Text style={styles.addButtonIcon}>📋</Text>
      </Pressable>
    </View>
  );

  const SongCard = ({ song }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.cardTitle}>{song.name}</Text>
          <Text style={styles.cardSubtitle}>{song.originalBand}</Text>
        </View>
        <View style={styles.cardActions}>
          <Pressable onPress={() => editSong(song)} style={styles.iconButton}>
            <Text style={styles.iconButtonText}>✎</Text>
          </Pressable>
          <Pressable onPress={() => deleteSong(song.id)} style={[styles.iconButton, styles.deleteButton]}>
            <Text style={styles.iconButtonText}>✕</Text>
          </Pressable>
        </View>
      </View>

      {song.imageUri && <Image source={{ uri: song.imageUri }} style={styles.cardImage} />}

      <View style={styles.cardDetails}>
        {song.style && <Text style={styles.detailText}>Estilo: <Text style={styles.detailValue}>{song.style}</Text></Text>}
        {song.lyrics && <Text style={[styles.detailText, styles.lyrics]}>{song.lyrics}</Text>}
      </View>

      {song.links && song.links.length > 0 && (
        <View style={styles.linksContainer}>
          {song.links.map((link, index) => (
            <Pressable key={index} onPress={() => openLink(link.url)} style={styles.linkButton}>
              <Text style={styles.linkButtonText}>{link.type === 'youtube' ? '▶ YouTube' : link.type === 'spotify' ? '♪ Spotify' : '🎼 Cifras'}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );

  const SongListItem = ({ song }) => (
    <View style={styles.listItem}>
      <View style={styles.listItemContent}>
        <Text style={styles.listItemTitle}>{song.originalBand}</Text>
        <Text style={styles.listItemSubtitle}>{song.name}</Text>
      </View>
      <View style={styles.listItemActions}>
        <Pressable onPress={() => editSong(song)} style={styles.smallIconButton}>
          <Text style={styles.smallIconButtonText}>✎</Text>
        </Pressable>
        <Pressable onPress={() => deleteSong(song.id)} style={[styles.smallIconButton, styles.deleteButton]}>
          <Text style={styles.smallIconButtonText}>✕</Text>
        </Pressable>
      </View>
    </View>
  );

  const SetlistCard = ({ setlist }) => {
    const band = myBands.find((b) => b.id === setlist.myBandId);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>{setlist.type.toUpperCase()}</Text>
            <Text style={styles.cardSubtitle}>{band?.name || 'Banda não encontrada'}</Text>
            <Text style={styles.cardDate}>{setlist.date}</Text>
          </View>
          <View style={styles.cardActions}>
            <Pressable onPress={() => editSetlist(setlist)} style={styles.iconButton}>
              <Text style={styles.iconButtonText}>✎</Text>
            </Pressable>
            <Pressable onPress={() => deleteSetlist(setlist.id)} style={[styles.iconButton, styles.deleteButton]}>
              <Text style={styles.iconButtonText}>✕</Text>
            </Pressable>
          </View>
        </View>
        {setlist.local && <Text style={styles.detailText}>Local: <Text style={styles.detailValue}>{setlist.local}</Text></Text>}
        {setlist.cachê && <Text style={styles.detailText}>Cachê: <Text style={styles.detailValue}>{setlist.cachê}</Text></Text>}
      </View>
    );
  };

  // ===== MODAIS =====

  const BandModal = () => (
    <Modal
      visible={showBandModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        clearBandForm();
        setShowBandModal(false);
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingBandId ? 'EDITAR BANDA' : 'NOVA BANDA'}</Text>
            <Pressable onPress={() => {
              clearBandForm();
              setShowBandModal(false);
            }}>
              <Text style={styles.closeButton}>✕</Text>
            </Pressable>
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView style={styles.modalBody} scrollEnabled={true} keyboardShouldPersistTaps="handled">
            <TextInput
              style={styles.input}
              placeholder="Nome da banda"
              value={bandName}
              onChangeText={setBandName}
              placeholderTextColor="#999"
            />

            <Pressable style={styles.imagePickButton} onPress={() => pickImage(setBandImage)}>
              <Text style={styles.imagePickButtonText}>
                {bandImage ? '✓ Imagem adicionada' : '+ Adicionar imagem'}
              </Text>
            </Pressable>
            {bandImage && <Image source={{ uri: bandImage }} style={styles.previewImage} />}

            <Pressable style={styles.saveButton} onPress={saveBand}>
              <Text style={styles.saveButtonText}>{editingBandId ? 'SALVAR' : 'CRIAR BANDA'}</Text>
            </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );

  const SongModal = () => (
    <Modal
      visible={showSongModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        clearSongForm();
        setShowSongModal(false);
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingSongId ? 'EDITAR MÚSICA' : 'NOVA MÚSICA'}</Text>
            <Pressable onPress={() => {
              clearSongForm();
              setShowSongModal(false);
            }}>
              <Text style={styles.closeButton}>✕</Text>
            </Pressable>
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView style={styles.modalBody} scrollEnabled={true} keyboardShouldPersistTaps="handled">
            <TextInput
              style={styles.input}
              placeholder="Nome da música"
              value={songName}
              onChangeText={setSongName}
              placeholderTextColor="#999"
            />

            <TextInput
              style={styles.input}
              placeholder="Banda original (ex: Black Sabbath)"
              value={originalBand}
              onChangeText={setOriginalBand}
              placeholderTextColor="#999"
            />

            <TextInput
              style={styles.input}
              placeholder="Estilo (Rock, Metal, Blues, etc)"
              value={songStyle}
              onChangeText={setSongStyle}
              placeholderTextColor="#999"
            />

            <Text style={styles.sectionLabel}>Links</Text>
            {songLinks.map((link, index) => (
              <View key={index} style={styles.linkInput}>
                <View style={styles.linkTypeSelector}>
                  {['youtube', 'spotify', 'cifras'].map((type) => (
                    <Pressable
                      key={type}
                      style={[
                        styles.linkTypeButton,
                        link.type === type && styles.linkTypeButtonActive,
                      ]}
                      onPress={() => updateLink(index, 'type', type)}
                    >
                      <Text style={[styles.linkTypeButtonText, link.type === type && styles.linkTypeButtonTextActive]}>
                        {type}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  style={styles.input}
                  placeholder={`URL do ${link.type}`}
                  value={link.url}
                  onChangeText={(value) => updateLink(index, 'url', value)}
                  placeholderTextColor="#999"
                />
                {songLinks.length > 1 && (
                  <Pressable style={styles.removeButton} onPress={() => removeLink(index)}>
                    <Text style={styles.removeButtonText}>Remover</Text>
                  </Pressable>
                )}
              </View>
            ))}

            <Pressable style={styles.addLinkButton} onPress={addLinkField}>
              <Text style={styles.addLinkButtonText}>+ Adicionar link</Text>
            </Pressable>

            <Text style={styles.sectionLabel}>Letra / Notas</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Letra da música, arranjo, notas importantes..."
              value={songLyrics}
              onChangeText={setSongLyrics}
              multiline
              placeholderTextColor="#999"
            />

            <Pressable style={styles.saveButton} onPress={saveSong}>
              <Text style={styles.saveButtonText}>{editingSongId ? 'SALVAR MÚSICA' : 'CRIAR MÚSICA'}</Text>
            </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );

  const SetlistModal = () => (
    <Modal
      visible={showSetlistModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        clearSetlistForm();
        setShowSetlistModal(false);
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingSetlistId ? 'EDITAR SETLIST' : 'NOVO SETLIST'}</Text>
            <Pressable onPress={() => {
              clearSetlistForm();
              setShowSetlistModal(false);
            }}>
              <Text style={styles.closeButton}>✕</Text>
            </Pressable>
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView style={styles.modalBody} scrollEnabled={true} keyboardShouldPersistTaps="handled">
            <Text style={styles.sectionLabel}>Tipo</Text>
            <View style={styles.typeSelector}>
              {['show', 'ensaio', 'repertório'].map((type) => (
                <Pressable
                  key={type}
                  style={[
                    styles.typeButton,
                    setlistType === type && styles.typeButtonActive,
                  ]}
                  onPress={() => setSetlistType(type)}
                >
                  <Text style={[styles.typeButtonText, setlistType === type && styles.typeButtonTextActive]}>
                    {type.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Minha banda cover</Text>
            {myBands.length === 0 ? (
              <Text style={styles.warningText}>Crie uma banda primeiro!</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bandSelector} nestedScrollEnabled>
                {myBands.map((band) => (
                  <Pressable
                    key={band.id}
                    style={[
                      styles.bandSelectButton,
                      setlistMyBand === band.id && styles.bandSelectButtonActive,
                    ]}
                    onPress={() => setSetlistMyBand(band.id)}
                  >
                    <Text style={[styles.bandSelectButtonText, setlistMyBand === band.id && styles.bandSelectButtonTextActive]}>
                      {band.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            <Text style={styles.sectionLabel}>Data</Text>
            <TextInput
              style={styles.input}
              placeholder="DD/MM/YYYY ou 2024-07-10"
              value={setlistDate}
              onChangeText={setSetlistDate}
              placeholderTextColor="#999"
            />

            <Text style={styles.sectionLabel}>Local</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome do local / venue"
              value={setlistLocal}
              onChangeText={setSetlistLocal}
              placeholderTextColor="#999"
            />

            {setlistType === 'show' && (
              <>
                <Text style={styles.sectionLabel}>Cachê</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Valor do cachê"
                  value={setlistCachê}
                  onChangeText={setSetlistCachê}
                  placeholderTextColor="#999"
                />
              </>
            )}

            <Text style={styles.sectionLabel}>Músicas ({setlistSongs.length})</Text>
            {songs.length === 0 ? (
              <Text style={styles.warningText}>Nenhuma música cadastrada ainda.</Text>
            ) : (
              <ScrollView style={styles.songsListModal} nestedScrollEnabled>
                {songs.map((song) => (
                  <Pressable
                    key={song.id}
                    style={[
                      styles.songSelectItem,
                      setlistSongs.includes(song.id) && styles.songSelectItemSelected,
                    ]}
                    onPress={() => toggleSongInSetlist(song.id)}
                  >
                    <Text style={styles.songSelectCheckbox}>
                      {setlistSongs.includes(song.id) ? '☑' : '☐'}
                    </Text>
                    <View style={styles.songSelectInfo}>
                      <Text style={styles.songSelectName}>{song.name}</Text>
                      <Text style={styles.songSelectBand}>{song.originalBand}</Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            <Pressable style={styles.saveButton} onPress={saveSetlist}>
              <Text style={styles.saveButtonText}>{editingSetlistId ? 'SALVAR SETLIST' : 'CRIAR SETLIST'}</Text>
            </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.safeArea} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <StatusBar style="dark" />
      {!dbReady ? (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={styles.appTitle}>Carregando...</Text>
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.container} 
          keyboardShouldPersistTaps="handled"
          scrollEnabled={true}
        >
          <Text style={styles.appTitle}>🎸 SETLIST MANAGER</Text>

          <MainButtons />

          {myBands.length > 0 && <BandCarousel />}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎵 Músicas ({songs.length})</Text>
          {songs.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma música ainda. Clique em "NOVA MÚSICA" para adicionar!</Text>
          ) : (
            songs.map((song) => <SongListItem key={song.id} song={song} />)
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Setlists ({setlists.length})</Text>
          {setlists.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum setlist ainda. Clique em "NOVO SETLIST" para criar!</Text>
          ) : (
            setlists.map((setlist) => <SetlistCard key={setlist.id} setlist={setlist} />)
          )}
        </View>
        </ScrollView>
      )}

      <BandModal />
      <SongModal />
      <SetlistModal />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 1,
  },

  // Main Buttons (Circles)
  mainButtonsContainer: {
    marginBottom: 32,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    gap: 12,
  },
  addButton: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  addButton2: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#ec4899',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  addButton3: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  addButtonPlus: {
    fontSize: 40,
    fontWeight: '900',
    color: '#fff',
    position: 'absolute',
    top: 8,
    right: 10,
  },
  addButtonIcon: {
    fontSize: 38,
  },

  // Carousel (Bands as Circles)
  carouselContainer: {
    marginBottom: 32,
  },
  carouselTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e5e7eb',
    marginBottom: 16,
    textAlign: 'center',
  },
  bandCirclesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  bandCircle: {
    alignItems: 'center',
    width: '30%',
  },
  bandCircleImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    resizeMode: 'cover',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  bandCirclePlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#60a5fa',
  },
  bandCircleIcon: {
    fontSize: 40,
  },
  bandCircleName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#d1d5db',
    textAlign: 'center',
  },

  // Sections
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e5e7eb',
    marginBottom: 16,
  },
  emptyText: {
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 24,
  },

  // Cards
  card: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  cardDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: '#7f1d1d',
  },
  iconButtonText: {
    fontSize: 18,
    color: '#fff',
  },
  cardImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
    resizeMode: 'cover',
  },
  cardDetails: {
    marginBottom: 12,
  },
  detailText: {
    fontSize: 13,
    color: '#d1d5db',
    marginBottom: 8,
    lineHeight: 20,
  },
  detailValue: {
    fontWeight: '600',
    color: '#60a5fa',
  },
  lyrics: {
    fontStyle: 'italic',
    color: '#9ca3af',
    marginTop: 8,
  },
  linksContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  linkButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#60a5fa',
  },
  linkButtonText: {
    color: '#60a5fa',
    fontWeight: '600',
    fontSize: 12,
  },

  // List Items (Músicas)
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1f2937',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10b981',
    marginBottom: 2,
  },
  listItemSubtitle: {
    fontSize: 13,
    color: '#d1d5db',
  },
  listItemActions: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 12,
  },
  smallIconButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallIconButtonText: {
    fontSize: 16,
    color: '#fff',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0a0e27',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    borderTopWidth: 2,
    borderTopColor: '#3b82f6',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  closeButton: {
    fontSize: 24,
    color: '#ef4444',
    fontWeight: '700',
  },
  modalBody: {
    padding: 20,
  },

  // Inputs
  input: {
    backgroundColor: '#1f2937',
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
    fontSize: 16,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },

  // Sections in Modal
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e5e7eb',
    marginTop: 16,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  warningText: {
    color: '#fca5a5',
    marginBottom: 12,
    fontStyle: 'italic',
  },

  // Image Picker
  imagePickButton: {
    backgroundColor: '#374151',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#60a5fa',
    borderStyle: 'dashed',
  },
  imagePickButtonText: {
    color: '#60a5fa',
    fontWeight: '600',
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 16,
    resizeMode: 'cover',
  },

  // Links
  linkInput: {
    marginBottom: 16,
  },
  linkTypeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  linkTypeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  linkTypeButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#60a5fa',
  },
  linkTypeButtonText: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '600',
  },
  linkTypeButtonTextActive: {
    color: '#fff',
  },
  removeButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 13,
  },
  addLinkButton: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#10b981',
    borderStyle: 'dashed',
    alignItems: 'center',
    marginBottom: 16,
  },
  addLinkButtonText: {
    color: '#10b981',
    fontWeight: '600',
  },

  // Type Selector
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#60a5fa',
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ca3af',
  },
  typeButtonTextActive: {
    color: '#fff',
  },

  // Band Selector
  bandSelector: {
    marginBottom: 16,
  },
  bandSelectButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    marginRight: 8,
  },
  bandSelectButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#60a5fa',
  },
  bandSelectButtonText: {
    color: '#9ca3af',
    fontWeight: '600',
    fontSize: 13,
  },
  bandSelectButtonTextActive: {
    color: '#fff',
  },

  // Save Button
  saveButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Songs List Modal
  songsListModal: {
    maxHeight: 300,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  songSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  songSelectItemSelected: {
    backgroundColor: '#1e3a8a',
  },
  songSelectCheckbox: {
    fontSize: 18,
    marginRight: 12,
    color: '#60a5fa',
  },
  songSelectInfo: {
    flex: 1,
  },
  songSelectName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  songSelectBand: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
});
