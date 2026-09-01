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
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';

export default function BandModal({ visible, onClose, onSave, band }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [imageUri, setImageUri] = useState(null);

  useEffect(() => {
    if (visible) {
      if (band) {
        setName(band.name);
        setImageUri(band.imageUri);
      } else {
        setName('');
        setImageUri(null);
      }
    }
  }, [visible, band]);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de acesso às suas fotos para adicionar uma imagem.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets?.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Atenção', 'Informe o nome da banda.');
      return;
    }
    onSave({ name: name.trim(), imageUri });
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.75)' }]}
      >
        <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.primary }]}>
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
            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('bandNameLabel')}</Text>
            <TextInput
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

            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('coverImageLabel')}</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 8,
    borderWidth: 1.5,
    maxHeight: '85%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  closePressable: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    fontSize: 18,
    fontWeight: 'bold',
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
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1.5,
    fontSize: 15,
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
    marginBottom: 24,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.0,
  },
});
