import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';
import { Ionicons } from '@expo/vector-icons';

export default function ImportModal({ 
  visible, 
  onClose, 
  onImport, 
  title = 'IMPORTAR SETLIST', 
  description = '',
  fileTypeLabel = ''
}) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const isDark = colors.isDark;
  const [code, setCode] = useState('');

  const handleImport = async () => {
    const success = await onImport(code);
    if (success) {
      setCode('');
      onClose();
    }
  };

  const handleSelectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const fileUri = result.assets[0].uri;
      let fileContent = '';

      if (Platform.OS === 'web') {
        const file = result.assets[0].file;
        if (file) {
          fileContent = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (err) => reject(err);
            reader.readAsText(file);
          });
        }
      } else {
        fileContent = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      }

      if (fileContent && fileContent.trim()) {
        setCode(fileContent);
        Alert.alert(t('success'), `${t('fileLoadedAlert')}`);
      }
    } catch (error) {
      console.error('Erro ao ler arquivo selecionado:', error);
      Alert.alert(t('importErrorTitle'), t('fileReadError'));
    }
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
            <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
            <Pressable 
              style={({ pressed }) => [styles.closePressable, pressed && { opacity: 0.7 }]}
              onPress={onClose}
            >
              <Ionicons name="close" size={20} color={colors.danger} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[styles.description, { color: colors.textMuted }]}>
              {description}
            </Text>

            {/* Selecionar Arquivo Físico */}
            <Pressable
              style={({ pressed }) => [
                styles.fileSelectButton, 
                { 
                  backgroundColor: colors.secondary + '18', 
                  borderColor: colors.secondary, 
                  borderWidth: 1.5, 
                  opacity: pressed ? 0.75 : 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }
              ]}
              onPress={handleSelectFile}
            >
              <Ionicons name="folder-open-outline" size={16} color={colors.secondary} />
              <Text style={[styles.fileSelectButtonText, { color: colors.secondary }]}>{t('selectFileLabel')}</Text>
            </Pressable>

            <Text style={[styles.orDivider, { color: colors.textMuted }]}>— {t('orPasteCode')} —</Text>

            <TextInput
              style={[styles.textArea, { 
                backgroundColor: colors.inputBackground, 
                color: colors.inputText,
                borderColor: colors.border
              }]}
              multiline
              numberOfLines={8}
              value={code}
              onChangeText={setCode}
              autoCapitalize="none"
              autoComplete="off"
              importantForAutofill="no"
            />

            <Pressable
              style={({ pressed }) => [
                styles.importButton, 
                { 
                  backgroundColor: colors.primary, 
                  opacity: pressed ? 0.85 : 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }
              ]}
              onPress={handleImport}
            >
              <Ionicons name="download-outline" size={16} color="#FFFFFF" />
              <Text style={styles.importButtonText}>{t('importNow')}</Text>
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
    maxWidth: 500,
    maxHeight: '90%',
    borderRadius: 8,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1.5,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  closePressable: {
    padding: 4,
  },
  closeButton: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 16,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  fileSelectButton: {
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  fileSelectButtonText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  orDivider: {
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '900',
    marginVertical: 12,
    letterSpacing: 1.2,
  },
  textArea: {
    width: '100%',
    borderRadius: 6,
    borderWidth: 1.5,
    padding: 12,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    height: 140,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  importButton: {
    paddingVertical: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  importButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
