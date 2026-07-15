import { useState } from 'react';
import { Alert } from 'react-native';
import { songService } from '../services/songService';

export function useSongs(onSuccess) {
  const [songs, setSongs] = useState([]);
  const [songName, setSongName] = useState('');
  const [originalBand, setOriginalBand] = useState('');
  const [songStyle, setSongStyle] = useState('');
  const [songLyrics, setSongLyrics] = useState('');
  const [songLinks, setSongLinks] = useState([{ type: 'youtube', url: '' }]);
  const [editingSongId, setEditingSongId] = useState(null);

  const loadSongs = async () => {
    try {
      const data = await songService.getAll();
      setSongs(data);
    } catch (error) {
      console.error(error);
    }
  };

  const saveSong = async () => {
    if (!songName.trim() || !originalBand.trim()) {
      Alert.alert('Atenção', 'Informe o nome da música e a banda original.');
      return false;
    }
    try {
      let songId = editingSongId;
      if (!editingSongId) {
        songId = await songService.insert(songName, originalBand, songStyle, songLyrics);
      } else {
        await songService.update(editingSongId, songName, originalBand, songStyle, songLyrics);
      }
      
      await songService.syncLinks(songId, songLinks);
      await loadSongs();
      clearForm();
      if (onSuccess) onSuccess();
      return true;
    } catch (error) {
      Alert.alert('Erro', error.message || 'Erro ao salvar música');
      return false;
    }
  };

  const startEdit = (song) => {
    setSongName(song.name);
    setOriginalBand(song.originalBand);
    setSongStyle(song.style || '');
    setSongLyrics(song.lyrics || '');
    setSongLinks(song.links.length > 0 ? song.links : [{ type: 'youtube', url: '' }]);
    setEditingSongId(song.id);
  };

  const clearForm = () => {
    setSongName('');
    setOriginalBand('');
    setSongStyle('');
    setSongLyrics('');
    setSongLinks([{ type: 'youtube', url: '' }]);
    setEditingSongId(null);
  };

  return {
    songs, songName, setSongName, originalBand, setOriginalBand,
    songStyle, setSongStyle, songLyrics, setSongLyrics, songLinks, setSongLinks,
    editingSongId, loadSongs, saveSong, startEdit, clearForm
  };
}