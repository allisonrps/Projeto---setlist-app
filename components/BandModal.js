import React, { useState, useEffect } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';

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

const QUICK_GENRE_SUGGESTIONS = [
  'Rock', 'Pop', 'Metal', 'Blues', 'Jazz', 'Reggae', 'MPB', 'Indie', 'Punk', 'Country', 'Gospel', 'Sertanejo'
];

const parseDate = (dStr) => {
  if (!dStr) return new Date();
  if (dStr.includes('/')) {
    const parts = dStr.split('/').map(n => parseInt(n, 10));
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      return new Date(parts[2], parts[1] - 1, parts[0]);
    }
  }
  if (dStr.includes('-')) {
    const parts = dStr.split('-').map(n => parseInt(n, 10));
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
  }
  const yr = parseInt(dStr, 10);
  if (!isNaN(yr) && yr > 1900 && yr < 2100) return new Date(yr, 0, 1);
  return new Date();
};

export default function BandModal({ visible, onClose, onSave, band }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const isDark = colors.isDark;

  const [name, setName] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCover, setIsCover] = useState(true);
  const [isAutoral, setIsAutoral] = useState(false);

  // Localização
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  
  // Tags do estilo da banda (até 4)
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');

  // Modais de seleção
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  useEffect(() => {
    if (visible) {
      if (band) {
        setName(band.name || '');
        setImageUri(band.imageUri || null);
        setStartDate(band.startDate || '');
        setEndDate(band.endDate || '');
        setCity(band.city || '');
        setState(band.state || '');
        setCountry(band.country || '');

        // Parse genres/tags
        let parsedTags = [];
        if (band.genres) {
          try {
            parsedTags = typeof band.genres === 'string' && band.genres.startsWith('[')
              ? JSON.parse(band.genres)
              : String(band.genres).split(',').map(s => s.trim()).filter(Boolean);
          } catch (e) {
            parsedTags = String(band.genres).split(',').map(s => s.trim()).filter(Boolean);
          }
        }
        setTags(parsedTags.slice(0, 4));
        setTagInput('');

        const hasCover = band.isCover !== undefined ? Boolean(band.isCover) : (band.bandType ? band.bandType.includes('cover') : true);
        const hasAutoral = band.isAutoral !== undefined ? Boolean(band.isAutoral) : (band.bandType ? band.bandType.includes('autoral') : false);
        if (!hasCover && !hasAutoral) {
          setIsCover(true);
          setIsAutoral(false);
        } else {
          setIsCover(hasCover);
          setIsAutoral(hasAutoral);
        }
      } else {
        setName('');
        setImageUri(null);
        setStartDate('');
        setEndDate('');
        setCity('');
        setState('');
        setCountry('');
        setTags([]);
        setTagInput('');
        setIsCover(true);
        setIsAutoral(false);
      }
    }
  }, [visible, band]);

  const toggleCover = () => {
    if (isCover && !isAutoral) {
      return; // Pelo menos uma deve estar marcada
    }
    setIsCover(!isCover);
  };

  const toggleAutoral = () => {
    if (isAutoral && !isCover) {
      return; // Pelo menos uma deve estar marcada
    }
    setIsAutoral(!isAutoral);
  };

  const handleAddTag = (tagToAdd) => {
    const clean = (tagToAdd || tagInput).trim();
    if (!clean) return;
    if (tags.length >= 4) {
      Alert.alert(t('attention') || 'Atenção', 'Você pode adicionar até 4 tags de estilo.');
      return;
    }
    if (tags.some(t => t.toLowerCase() === clean.toLowerCase())) {
      setTagInput('');
      return;
    }
    setTags([...tags, clean]);
    setTagInput('');
  };

  const handleRemoveTag = (indexToRemove) => {
    setTags(tags.filter((_, idx) => idx !== indexToRemove));
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('permissionRequired'), t('cameraPermissionDesc'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets?.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert(t('error'), t('imageSelectError'));
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert(t('attention'), t('alertBandName'));
      return;
    }
    const bandType = (isCover && isAutoral) ? 'both' : (isCover ? 'cover' : 'autoral');
    onSave({ 
      name: name.trim(), 
      imageUri, 
      startDate: startDate.trim(), 
      endDate: endDate.trim(),
      isCover: isCover ? 1 : 0,
      isAutoral: isAutoral ? 1 : 0,
      bandType,
      city: city.trim(),
      state: state.trim(),
      country: country.trim() || '',
      genres: JSON.stringify(tags)
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.65)' }]}
      >
        <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {band ? t('editBand') : t('newBand')}
            </Text>
            <Pressable 
              style={({ pressed }) => [styles.closePressable, pressed && { opacity: 0.7 }]}
              onPress={onClose}
            >
              <Ionicons name="close" size={20} color={colors.danger} />
            </Pressable>
          </View>

          <ScrollView 
            style={styles.modalBody} 
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* NOME DA BANDA */}
            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('bandNameLabel')}</Text>
            <TextInput
              maxLength={100}
              style={[styles.input, { 
                backgroundColor: colors.inputBackground, 
                color: colors.inputText,
                borderColor: colors.border
              }]}
              value={name}
              onChangeText={setName}
              autoComplete="off"
              importantForAutofill="no"
            />

            {/* PÍLULAS DE SELEÇÃO: COVER / AUTORAL */}
            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('musicalProposalLabel') || 'PROPOSTA MUSICAL'}</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
              <Pressable
                onPress={toggleCover}
                style={({ pressed }) => [
                  styles.pillButton,
                  {
                    flex: 1,
                    backgroundColor: isCover ? colors.primary + '22' : colors.inputBackground,
                    borderColor: isCover ? colors.primary : colors.border,
                    opacity: pressed ? 0.8 : 1,
                  }
                ]}
              >
                <Ionicons 
                  name={isCover ? "checkmark-circle" : "disc-outline"} 
                  size={16} 
                  color={isCover ? colors.primary : colors.textMuted} 
                />
                <Text style={[
                  styles.pillButtonText,
                  { color: isCover ? colors.primary : colors.textMuted, fontWeight: isCover ? '800' : '600' }
                ]}>
                  {t('proposalCover') || 'Cover'}
                </Text>
              </Pressable>

              <Pressable
                onPress={toggleAutoral}
                style={({ pressed }) => [
                  styles.pillButton,
                  {
                    flex: 1,
                    backgroundColor: isAutoral ? colors.primary + '22' : colors.inputBackground,
                    borderColor: isAutoral ? colors.primary : colors.border,
                    opacity: pressed ? 0.8 : 1,
                  }
                ]}
              >
                <Ionicons 
                  name={isAutoral ? "checkmark-circle" : "sparkles-outline"} 
                  size={16} 
                  color={isAutoral ? colors.primary : colors.textMuted} 
                />
                <Text style={[
                  styles.pillButtonText,
                  { color: isAutoral ? colors.primary : colors.textMuted, fontWeight: isAutoral ? '800' : '600' }
                ]}>
                  {t('proposalOriginal') || 'Autoral'}
                </Text>
              </Pressable>
            </View>

            {/* ESTILOS DA BANDA (ATÉ 4 TAGS) */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={[styles.inputLabel, { color: colors.textMuted, marginBottom: 0 }]}>{t('bandStylesLabel') || 'ESTILOS DA BANDA'}</Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: tags.length >= 4 ? colors.primary : colors.textMuted }}>
                {(t('tagsCountLimit') || '{count}/4 tags').replace('{count}', tags.length)}
              </Text>
            </View>

            {/* Campo para escrever tag com botão de adicionar */}
            {tags.length < 4 && (
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                <TextInput
                  maxLength={200}
                  style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border }]}
                  value={tagInput}
                  onChangeText={setTagInput}
                  placeholder={t('tagPlaceholder') || 'Ex: Hard Rock, Pop...'}
                  placeholderTextColor={colors.textMuted}
                  onSubmitEditing={() => handleAddTag(tagInput)}
                  returnKeyType="done"
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.addTagButton,
                    { backgroundColor: colors.primary, opacity: (!tagInput.trim() || pressed) ? 0.75 : 1 }
                  ]}
                  onPress={() => handleAddTag(tagInput)}
                  disabled={!tagInput.trim()}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                </Pressable>
              </View>
            )}

            {/* Tags Selecionadas */}
            {tags.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {tags.map((tag, idx) => (
                  <View 
                    key={idx}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: colors.primary + '18',
                      borderColor: colors.primary,
                      borderWidth: 1.5,
                      paddingVertical: 5,
                      paddingHorizontal: 10,
                      borderRadius: 16,
                      gap: 6
                    }}
                  >
                    <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>{tag}</Text>
                    <Pressable onPress={() => handleRemoveTag(idx)} hitSlop={6}>
                      <Ionicons name="close-circle" size={16} color={colors.primary} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {/* Sugestões Rápidas de Estilos */}
            {tags.length < 4 && (
              <View style={{ marginBottom: 18 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
                  {QUICK_GENRE_SUGGESTIONS.filter(g => !tags.includes(g)).map(genre => (
                    <Pressable
                      key={genre}
                      onPress={() => handleAddTag(genre)}
                      style={({ pressed }) => [
                        styles.genreChip,
                        { 
                          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                          borderColor: colors.border,
                          opacity: pressed ? 0.7 : 1
                        }
                      ]}
                    >
                      <Ionicons name="add-outline" size={13} color={colors.textMuted} />
                      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted }}>{genre}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* LOCALIZAÇÃO (PAÍS, ESTADO, CIDADE) - ABERTO PARA PREENCHIMENTO DIRETO */}
            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('locationLabel') || 'LOCALIZAÇÃO'}</Text>
            
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
              {/* País */}
              <View style={{ flex: 1.2 }}>
                <Text style={[styles.inputSubLabel, { color: colors.textMuted }]}>{t('countryLabel') || 'PAÍS'}</Text>
                <TextInput
                  maxLength={100}
                  style={[
                    styles.input,
                    { color: colors.inputText, backgroundColor: colors.inputBackground, borderColor: colors.border, marginBottom: 0 }
                  ]}
                  value={country}
                  onChangeText={setCountry}
                  placeholder={t('countryPlaceholder') || 'Brasil'}
                  placeholderTextColor={colors.textMuted}
                  autoComplete="off"
                />
              </View>

              {/* Estado (UF) */}
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputSubLabel, { color: colors.textMuted }]}>{t('stateUfLabel') || 'ESTADO (UF)'}</Text>
                <TextInput
                  maxLength={100}
                  style={[
                    styles.input,
                    { color: colors.inputText, backgroundColor: colors.inputBackground, borderColor: colors.border, marginBottom: 0 }
                  ]}
                  value={state}
                  onChangeText={setState}
                  placeholder={t('statePlaceholder') || 'UF / Estado'}
                  placeholderTextColor={colors.textMuted}
                  autoComplete="off"
                />
              </View>
            </View>

            {/* Cidade */}
            <View style={{ marginBottom: 18 }}>
              <Text style={[styles.inputSubLabel, { color: colors.textMuted }]}>{t('cityLabel') || 'CIDADE'}</Text>
              <TextInput
                maxLength={200}
                style={[
                  styles.input,
                  { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border, marginBottom: 0 }
                ]}
                value={city}
                onChangeText={setCity}
                placeholder={t('cityPlaceholder') || 'Cidade'}
                placeholderTextColor={colors.textMuted}
                autoComplete="off"
              />
            </View>

            {/* DATAS DA BANDA: INÍCIO - FIM (OPCIONAL) COM CALENDÁRIO NATIVO */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
              {/* Início */}
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('startDateLabel') || 'INÍCIO'}</Text>
                <Pressable
                  onPress={() => setShowStartDatePicker(true)}
                  style={[
                    styles.datePickerPressable,
                    { backgroundColor: colors.inputBackground, borderColor: colors.border }
                  ]}
                >
                  <Text style={{ color: startDate ? colors.inputText : colors.textMuted, fontSize: 14, fontWeight: startDate ? '600' : '400' }}>
                    {startDate || 'Data'}
                  </Text>
                  <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                </Pressable>
              </View>

              {/* Fim (opcional) */}
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('endDateOptionalLabel') || 'FIM (OPCIONAL)'}</Text>
                <Pressable
                  onPress={() => setShowEndDatePicker(true)}
                  style={[
                    styles.datePickerPressable,
                    { backgroundColor: colors.inputBackground, borderColor: colors.border }
                  ]}
                >
                  <Text style={{ color: endDate ? colors.inputText : colors.textMuted, fontSize: 14, fontWeight: endDate ? '600' : '400' }} numberOfLines={1}>
                    {endDate || 'Data'}
                  </Text>
                  {endDate ? (
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        setEndDate('');
                      }}
                      hitSlop={8}
                    >
                      <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                    </Pressable>
                  ) : (
                    <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                  )}
                </Pressable>
              </View>
            </View>

            {/* NATIVE DATE TIME PICKERS */}
            {showStartDatePicker && (
              <DateTimePicker
                value={parseDate(startDate)}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowStartDatePicker(Platform.OS === 'ios');
                  if (selectedDate && event.type !== 'dismissed') {
                    const dd = String(selectedDate.getDate()).padStart(2, '0');
                    const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
                    const yyyy = selectedDate.getFullYear();
                    setStartDate(`${dd}/${mm}/${yyyy}`);
                  }
                }}
              />
            )}

            {showEndDatePicker && (
              <DateTimePicker
                value={parseDate(endDate)}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowEndDatePicker(Platform.OS === 'ios');
                  if (selectedDate && event.type !== 'dismissed') {
                    const dd = String(selectedDate.getDate()).padStart(2, '0');
                    const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
                    const yyyy = selectedDate.getFullYear();
                    setEndDate(`${dd}/${mm}/${yyyy}`);
                  }
                }}
              />
            )}

            {/* IMAGEM DE CAPA */}
            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('bandPhotoLabel') || t('coverImageLabel') || 'FOTO / LOGO DA BANDA'}</Text>
            <Pressable 
              style={({ pressed }) => [
                styles.imagePickButton, 
                { 
                  backgroundColor: colors.inputBackground, 
                  borderColor: colors.primary,
                  opacity: pressed ? 0.8 : 1
                }
              ]} 
              onPress={handlePickImage}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <Ionicons name="image-outline" size={18} color={colors.primary} />
                <Text style={[styles.imagePickButtonText, { color: colors.primary }]}>
                  {imageUri ? t('imageSelected') : t('chooseImage')}
                </Text>
              </View>
            </Pressable>

            {imageUri && (
              <View style={styles.previewContainer}>
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
                <Pressable 
                  onPress={() => setImageUri(null)} 
                  style={({ pressed }) => [
                    styles.removeImageButton, 
                    { backgroundColor: colors.danger + '22', borderColor: colors.danger },
                    pressed && { opacity: 0.8 }
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="trash-outline" size={14} color={colors.danger} />
                    <Text style={[styles.removeImageText, { color: colors.danger }]}>{t('removeImage')}</Text>
                  </View>
                </Pressable>
              </View>
            )}

            {/* BOTÃO SALVAR */}
            <Pressable 
              style={({ pressed }) => [
                styles.saveButton, 
                { backgroundColor: colors.success },
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }
              ]} 
              onPress={handleSave}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={styles.saveButtonText}>
                  {band ? t('saveChanges') : t('createBand')}
                </Text>
              </View>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxHeight: '88%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  closePressable: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  inputSubLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.0,
    marginBottom: 6,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1.5,
    fontSize: 14,
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    gap: 8,
  },
  pillButtonText: {
    fontSize: 13,
  },
  addTagButton: {
    width: 46,
    height: 46,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  pickerButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  datePickerPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  imagePickButton: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  imagePickButtonText: {
    fontWeight: '800',
    fontSize: 13,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    resizeMode: 'cover',
    marginBottom: 10,
  },
  removeImageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  removeImageText: {
    fontSize: 12,
    fontWeight: '800',
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 28,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.0,
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  pickerModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  pickerModalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '65%',
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  pickerSheetTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 14,
    textAlign: 'center',
  },
  pickerOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderRadius: 8,
  },
  pickerOptionText: {
    fontSize: 14,
  },
});
