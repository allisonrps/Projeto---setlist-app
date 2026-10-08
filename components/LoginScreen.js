import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Pressable, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';
import { api } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ onLogin }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const isDark = colors.isDark;
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Estado de Confirmação de E-mail
  const [waitingConfirmation, setWaitingConfirmation] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');

  // Estado de Recuperação de Senha
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState('request'); // 'request' | 'reset'
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  // Estado do Google Sign-In
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useIdTokenAuthRequest({
    clientId: '471445409156-7t1ps3fiq4cfvnk34jvaa9ll0o4suhrm.apps.googleusercontent.com',
    webClientId: '471445409156-7t1ps3fiq4cfvnk34jvaa9ll0o4suhrm.apps.googleusercontent.com',
    androidClientId: '471445409156-7t1ps3fiq4cfvnk34jvaa9ll0o4suhrm.apps.googleusercontent.com',
  });

  // Efeito ao receber resposta do Google
  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const idToken = googleResponse.params?.id_token || googleResponse.authentication?.idToken;
      if (idToken) {
        handleGoogleTokenReceived(idToken);
      }
    }
  }, [googleResponse]);

  const handleGoogleTokenReceived = async (idToken) => {
    setGoogleLoading(true);
    try {
      await api.googleLogin(idToken);
      Alert.alert('Bem-vindo!', 'Login com Google realizado com sucesso.');
      onLogin && onLogin();
    } catch (err) {
      Alert.alert('Erro no Login Google', err.message || 'Falha ao autenticar com o Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      if (!promptGoogleAsync) {
        Alert.alert(
          'Login com Google',
          'O serviço Google Sign-In está inicializando. Se persistir, verifique a conexão com a internet.'
        );
        return;
      }
      const result = await promptGoogleAsync();
      if (result?.type === 'success') {
        const idToken = result.params?.id_token || result.authentication?.idToken;
        if (idToken) {
          await handleGoogleTokenReceived(idToken);
        }
      }
    } catch (err) {
      console.log('Google Sign-In Error:', err);
      Alert.alert(
        'Login com Google',
        'Não foi possível concluir o login com o Google no momento. Tente entrar com seu e-mail e senha.'
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  // Máscara de Data de Nascimento (DD/MM/AAAA)
  const formatBirthDate = (text) => {
    const cleaned = (text || '').replace(/\D/g, '').slice(0, 8);
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4)}`;
  };

  // Carregar dados salvos ao iniciar
  useEffect(() => {
    const loadSavedEmail = async () => {
      try {
        const savedEmail = await AsyncStorage.getItem('saved_login_email');
        if (savedEmail) {
          setEmail(savedEmail);
          setRememberMe(true);
        }
        await AsyncStorage.removeItem('saved_login_credentials');
      } catch (e) {
        console.log('Erro ao carregar email salvo:', e);
      }
    };
    loadSavedEmail();
  }, []);

  // Critérios de senha para Cadastro
  const hasMinLen = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9\s]/.test(password);
  const isPasswordValid = hasMinLen && hasUpper && hasDigit && hasSpecial;

  // Critérios de senha para Redefinição
  const hasResetMinLen = newPassword.length >= 8;
  const hasResetUpper = /[A-Z]/.test(newPassword);
  const hasResetDigit = /[0-9]/.test(newPassword);
  const hasResetSpecial = /[^a-zA-Z0-9\s]/.test(newPassword);
  const isResetPasswordValid = hasResetMinLen && hasResetUpper && hasResetDigit && hasResetSpecial;

  const handleSubmit = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      Alert.alert(t('attention') || 'Atenção', t('fillEmailPassword') || 'Preencha o e-mail e a senha.');
      return;
    }

    let formattedBirthIso = null;
    if (isRegistering) {
      if (!username.trim()) {
        Alert.alert(t('attention') || 'Atenção', t('fillUsername') || 'Informe seu nome de usuário.');
        return;
      }
      if (birthDate.trim()) {
        const parts = birthDate.trim().split('/');
        if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
          const d = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          const y = parseInt(parts[2], 10);
          const currentYear = new Date().getFullYear();
          if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1920 || y > currentYear) {
            Alert.alert(t('attention') || 'Atenção', 'Data de nascimento inválida.');
            return;
          }
          formattedBirthIso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        } else {
          Alert.alert(t('attention') || 'Atenção', 'Data de nascimento incompleta. Preencha no formato DD/MM/AAAA.');
          return;
        }
      }
      if (!isPasswordValid) {
        Alert.alert(
          t('attention') || 'Atenção',
          'A senha precisa conter no mínimo 8 caracteres, 1 letra maiúscula, 1 número e 1 caractere especial.'
        );
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert(t('attention') || 'Atenção', 'A confirmação de senha não coincide com a senha informada.');
        return;
      }
    }
    
    setLoading(true);
    try {
      if (isRegistering) {
        const res = await api.register(username.trim(), cleanEmail, password, formattedBirthIso);
        if (res?.requiresConfirmation) {
          setPendingEmail(cleanEmail);
          setWaitingConfirmation(true);
          Alert.alert(
            'Confirmação Enviada',
            `Enviamos um código de confirmação de 6 dígitos para o seu e-mail: ${cleanEmail}. Digite-o para ativar sua conta.`
          );
          setLoading(false);
          return;
        }
      }

      await api.login(cleanEmail, password);
      
      if (rememberMe) {
        await AsyncStorage.setItem('saved_login_email', cleanEmail);
      } else {
        await AsyncStorage.removeItem('saved_login_email');
      }
      
      onLogin();
    } catch (error) {
      if (error.message?.includes('confirme seu e-mail') || error.message?.includes('403')) {
        setPendingEmail(cleanEmail);
        setWaitingConfirmation(true);
        Alert.alert('Conta Pendente', 'Sua conta ainda não foi ativada. Digite o código de confirmação enviado para seu e-mail.');
      } else {
        Alert.alert(
          isRegistering ? (t('registerError') || 'Erro no Cadastro') : (t('loginError') || 'Erro no Login'),
          error.message || (t('authFailed') || 'Falha ao autenticar.')
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCode = async () => {
    const cleanMail = (pendingEmail || email).trim().toLowerCase();
    const cleanCode = confirmationCode.trim();
    if (!cleanMail) {
      Alert.alert(t('attention') || 'Atenção', 'Informe o seu e-mail cadastrado.');
      return;
    }
    if (cleanCode.length !== 6) {
      Alert.alert(t('attention') || 'Atenção', 'Digite o código de 6 dígitos recebido.');
      return;
    }

    setLoading(true);
    try {
      await api.confirmEmail(cleanMail, cleanCode);
      if (rememberMe) {
        await AsyncStorage.setItem('saved_login_email', cleanMail);
      }
      Alert.alert('Sucesso!', 'E-mail confirmado com sucesso. Bem-vindo à Rede BandLink!');
      onLogin();
    } catch (err) {
      Alert.alert('Falha na Confirmação', err.message || 'Código incorreto ou expirado.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    const cleanMail = (pendingEmail || email).trim().toLowerCase();
    if (!cleanMail) {
      Alert.alert(t('attention') || 'Atenção', 'Informe o seu e-mail para reenviar o código.');
      return;
    }
    setLoading(true);
    try {
      await api.resendCode(cleanMail);
      Alert.alert('Código Reenviado', `Um novo código foi enviado para ${cleanMail}.`);
    } catch (err) {
      Alert.alert('Erro', err.message || 'Falha ao reenviar código.');
    } finally {
      setLoading(false);
    }
  };

  // ── MÉTODOS DE RECUPERAÇÃO DE SENHA ──
  const handleRequestResetCode = async () => {
    const clean = forgotEmail.trim().toLowerCase();
    if (!clean) {
      Alert.alert(t('attention') || 'Atenção', 'Informe o seu e-mail cadastrado.');
      return;
    }
    setForgotLoading(true);
    try {
      await api.forgotPassword(clean);
      Alert.alert(
        'Código Enviado',
        `Se o e-mail ${clean} estiver cadastrado no BandLink, enviamos um código de segurança de 6 dígitos para ele. Verifique sua caixa de entrada e spam.`
      );
      setForgotStep('reset');
    } catch (err) {
      Alert.alert('Erro', err.message || 'Falha ao solicitar código de recuperação.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleConfirmResetPassword = async () => {
    const cleanMail = forgotEmail.trim().toLowerCase();
    const cleanCode = resetCode.trim();

    if (!cleanMail) {
      Alert.alert(t('attention') || 'Atenção', 'Informe o seu e-mail cadastrado.');
      return;
    }
    if (cleanCode.length !== 6) {
      Alert.alert(t('attention') || 'Atenção', 'O código de segurança deve conter 6 dígitos.');
      return;
    }
    if (!isResetPasswordValid) {
      Alert.alert(
        t('attention') || 'Atenção',
        'A nova senha precisa conter no mínimo 8 caracteres, 1 letra maiúscula, 1 número e 1 caractere especial.'
      );
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert(t('attention') || 'Atenção', 'A confirmação de senha não coincide com a nova senha digitada.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await api.resetPassword(cleanMail, cleanCode, newPassword);
      Alert.alert(
        'Senha Alterada! 🎉',
        res.message || 'Sua senha foi redefinida com sucesso. Você já pode entrar com sua nova senha.'
      );
      setEmail(cleanMail);
      setPassword(newPassword);
      setShowForgotModal(false);
      setForgotStep('request');
      setResetCode('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      Alert.alert('Erro na Redefinição', err.message || 'Código incorreto ou expirado.');
    } finally {
      setForgotLoading(false);
    }
  };

  // ── TELA DE CONFIRMAÇÃO DE E-MAIL ──
  if (waitingConfirmation) {
    return (
      <ScrollView 
        style={[styles.container, { backgroundColor: colors.background }]} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={[styles.iconBadge, { backgroundColor: colors.primary + '18' }]}>
            <Ionicons name="mail-unread-outline" size={42} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Confirme seu E-mail</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Digite o código de verificação de 6 dígitos enviado por e-mail para ativar sua conta na rede.
          </Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Seu E-mail Cadastrado
            </Text>
            <View style={[styles.inputWrapper, { 
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
              borderColor: colors.border
            }]}>
              <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                maxLength={255}
                style={[styles.input, { color: colors.text }]}
                placeholder="seu@email.com"
                placeholderTextColor={colors.textMuted}
                value={pendingEmail}
                onChangeText={setPendingEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text, textAlign: 'center' }]}>
              Código de Confirmação (6 dígitos)
            </Text>
            <View style={[styles.inputWrapper, { 
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
              borderColor: colors.primary,
              justifyContent: 'center',
              height: 56
            }]}>
              <TextInput
                maxLength={6}
                style={[styles.input, { 
                  color: colors.text, 
                  textAlign: 'center', 
                  fontSize: 24, 
                  fontWeight: '800', 
                  letterSpacing: 8 
                }]}
                placeholder="000000"
                placeholderTextColor={colors.textMuted}
                value={confirmationCode}
                onChangeText={setConfirmationCode}
                keyboardType="number-pad"
                autoFocus
              />
            </View>
          </View>

          <Pressable 
            style={({ pressed }) => [
              styles.loginButton, 
              { backgroundColor: colors.primary, opacity: pressed || loading ? 0.85 : 1, marginTop: 8 }
            ]}
            onPress={handleConfirmCode}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Confirmar e Ativar Conta</Text>
            )}
          </Pressable>

          <Pressable 
            style={styles.toggleRow}
            onPress={handleResendCode}
            disabled={loading}
          >
            <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '700' }}>
              Reenviar código
            </Text>
          </Pressable>

          <Pressable 
            style={[styles.toggleRow, { marginTop: 4 }]}
            onPress={() => setWaitingConfirmation(false)}
          >
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>
              Voltar para o Login
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // ── TELA PRINCIPAL (LOGIN OU CADASTRO) ──
  return (
    <>
      <ScrollView 
        style={[styles.container, { backgroundColor: colors.background }]} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={[styles.iconBadge, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="globe-outline" size={42} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            {isRegistering ? (t('createAccount') || 'Criar Conta') : (t('network') || 'Rede')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {isRegistering 
              ? (t('createAccountSubtitle') || 'Crie seu perfil e conecte-se com músicos e bandas da sua região.')
              : (t('loginSubtitle') || 'Conecte-se com músicos, encontre bandas e divulgue seu trabalho.')}
          </Text>
        </View>

        <View style={styles.formContainer}>
          {isRegistering && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>{t('usernameLabel') || 'Nome de Usuário'}</Text>
              <View style={[styles.inputWrapper, { 
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
                borderColor: colors.border
              }]}>
                <Ionicons name="person-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  maxLength={30}
                  style={[styles.input, { color: colors.text }]}
                  placeholder={t('usernamePlaceholder') || 'Ex: seunome'}
                  placeholderTextColor={colors.textMuted}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>{t('emailLabel') || 'E-mail'}</Text>
            <View style={[styles.inputWrapper, { 
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
              borderColor: colors.border
            }]}>
              <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                maxLength={255}
                style={[styles.input, { color: colors.text }]}
                placeholder={t('emailPlaceholder') || 'seu@email.com'}
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Data de Nascimento no Cadastro */}
          {isRegistering && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Data de Nascimento (opcional)</Text>
              <View style={[styles.inputWrapper, { 
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
                borderColor: colors.border
              }]}>
                <Ionicons name="calendar-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  maxLength={10}
                  style={[styles.input, { color: colors.text }]}
                  placeholder="DD/MM/AAAA (ex: 15/05/1995)"
                  placeholderTextColor={colors.textMuted}
                  value={birthDate}
                  onChangeText={(val) => setBirthDate(formatBirthDate(val))}
                  keyboardType="number-pad"
                />
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>{t('passwordLabel') || 'Senha'}</Text>
            <View style={[styles.inputWrapper, { 
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
              borderColor: colors.border
            }]}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                maxLength={128}
                style={[styles.input, { color: colors.text }]}
                placeholder={t('passwordPlaceholder') || 'Sua senha'}
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={10} style={{ padding: 4 }}>
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={18} 
                  color={colors.textMuted} 
                />
              </Pressable>
            </View>
          </View>

          {/* Requisitos de senha visíveis no cadastro */}
          {isRegistering && (
            <View style={[styles.passwordRulesBox, { 
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f1f5f9',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'
            }]}>
              <Text style={[styles.passwordRulesTitle, { color: colors.textMuted }]}>
                Requisitos da Senha:
              </Text>
              <View style={styles.rulesGrid}>
                <View style={styles.ruleItem}>
                  <Ionicons 
                    name={hasMinLen ? "checkmark-circle" : "ellipse-outline"} 
                    size={14} 
                    color={hasMinLen ? "#10b981" : colors.textMuted} 
                  />
                  <Text style={[styles.ruleText, { color: hasMinLen ? "#10b981" : colors.textMuted }]}>
                    Mínimo 8 caracteres
                  </Text>
                </View>
                <View style={styles.ruleItem}>
                  <Ionicons 
                    name={hasUpper ? "checkmark-circle" : "ellipse-outline"} 
                    size={14} 
                    color={hasUpper ? "#10b981" : colors.textMuted} 
                  />
                  <Text style={[styles.ruleText, { color: hasUpper ? "#10b981" : colors.textMuted }]}>
                    1 letra maiúscula
                  </Text>
                </View>
                <View style={styles.ruleItem}>
                  <Ionicons 
                    name={hasDigit ? "checkmark-circle" : "ellipse-outline"} 
                    size={14} 
                    color={hasDigit ? "#10b981" : colors.textMuted} 
                  />
                  <Text style={[styles.ruleText, { color: hasDigit ? "#10b981" : colors.textMuted }]}>
                    1 número
                  </Text>
                </View>
                <View style={styles.ruleItem}>
                  <Ionicons 
                    name={hasSpecial ? "checkmark-circle" : "ellipse-outline"} 
                    size={14} 
                    color={hasSpecial ? "#10b981" : colors.textMuted} 
                  />
                  <Text style={[styles.ruleText, { color: hasSpecial ? "#10b981" : colors.textMuted }]}>
                    1 caractere especial (!@#$...)
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Campo de Confirmar Senha no Cadastro */}
          {isRegistering && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Confirmar Senha</Text>
              <View style={[styles.inputWrapper, { 
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
                borderColor: confirmPassword && confirmPassword !== password ? '#ef4444' : colors.border
              }]}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  maxLength={128}
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Repita sua senha"
                  placeholderTextColor={colors.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                />
                <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} hitSlop={10} style={{ padding: 4 }}>
                  <Ionicons 
                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                    size={18} 
                    color={colors.textMuted} 
                  />
                </Pressable>
              </View>
              {confirmPassword.length > 0 && confirmPassword !== password && (
                <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4, marginLeft: 2 }}>
                  As senhas não coincidem.
                </Text>
              )}
            </View>
          )}

          {/* Linha de Lembrar Dados & Esqueci Minha Senha */}
          {!isRegistering && (
            <View style={styles.passwordRowExtras}>
              <Pressable 
                style={styles.rememberRow} 
                onPress={() => setRememberMe(!rememberMe)}
                hitSlop={8}
              >
                <View style={[
                  styles.checkbox, 
                  { 
                    borderColor: rememberMe ? colors.primary : (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)'),
                    backgroundColor: rememberMe ? colors.primary : 'transparent' 
                  }
                ]}>
                  {rememberMe && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
                <Text style={[styles.rememberText, { color: colors.text }]}>
                  {t('rememberCredentials') || 'Lembrar dados'}
                </Text>
              </Pressable>

              <Pressable 
                onPress={() => {
                  const clean = email.trim().toLowerCase();
                  if (clean) setForgotEmail(clean);
                  setForgotStep('request');
                  setShowForgotModal(true);
                }}
                hitSlop={8}
              >
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>
                  Esqueci minha senha
                </Text>
              </Pressable>
            </View>
          )}

          {/* Botão Principal de Login / Cadastro */}
          <Pressable 
            style={({ pressed }) => [
              styles.loginButton, 
              { 
                backgroundColor: colors.primary, 
                opacity: pressed || loading ? 0.85 : 1,
                marginTop: isRegistering ? 12 : 6
              }
            ]}
            onPress={handleSubmit}
            disabled={loading || googleLoading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>
                {isRegistering ? (t('createAccount') || 'Criar Conta') : (t('enterNetwork') || 'Entrar na Rede')}
              </Text>
            )}
          </Pressable>

          {/* Divisor "OU" */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0' }]} />
            <Text style={[styles.dividerText, { color: colors.textMuted }]}>OU</Text>
            <View style={[styles.dividerLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0' }]} />
          </View>

          {/* Botão de Login com Google */}
          <Pressable 
            style={({ pressed }) => [
              styles.googleButton, 
              { 
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1',
                opacity: pressed || googleLoading ? 0.8 : 1
              }
            ]}
            onPress={handleGoogleLogin}
            disabled={loading || googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Ionicons name="logo-google" size={19} color="#ea4335" style={{ marginRight: 10 }} />
                <Text style={[styles.googleButtonText, { color: colors.text }]}>
                  Continuar com o Google
                </Text>
              </>
            )}
          </Pressable>

          {/* Link para Ativar Conta para quem já recebeu o código */}
          {!isRegistering && (
            <Pressable 
              style={{ alignSelf: 'center', marginTop: 16, paddingVertical: 4 }}
              onPress={() => {
                const clean = email.trim().toLowerCase();
                if (clean) setPendingEmail(clean);
                setWaitingConfirmation(true);
              }}
              hitSlop={8}
            >
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>
                Já recebeu um código de confirmação? Ativar conta
              </Text>
            </Pressable>
          )}

          {/* Alternar entre Login e Cadastro */}
          <Pressable
            style={styles.toggleRow}
            onPress={() => {
              setIsRegistering(!isRegistering);
              setPassword('');
              setConfirmPassword('');
            }}
          >
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>
              {isRegistering ? (t('alreadyHaveAccount') || 'Já possui uma conta? ') : (t('dontHaveAccount') || 'Não possui uma conta? ')}
              <Text style={{ color: colors.primary, fontWeight: '700' }}>
                {isRegistering ? (t('signIn') || 'Entrar') : (t('signUp') || 'Cadastre-se')}
              </Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* ── MODAL DE RECUPERAÇÃO DE SENHA ── */}
      <Modal
        visible={showForgotModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowForgotModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setShowForgotModal(false)} />
          <View style={[styles.bottomSheetContent, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={[styles.dragHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
            
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {forgotStep === 'request' ? 'Recuperar Senha' : 'Criar Nova Senha'}
              </Text>
              <Pressable onPress={() => setShowForgotModal(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {forgotStep === 'request' ? (
                <>
                  <View style={{ alignItems: 'center', marginVertical: 12 }}>
                    <View style={[styles.iconBadge, { backgroundColor: colors.primary + '18' }]}>
                      <Ionicons name="key-outline" size={38} color={colors.primary} />
                    </View>
                    <Text style={[styles.subtitle, { color: colors.textMuted, marginTop: 8 }]}>
                      Informe o e-mail cadastrado na sua conta. Enviaremos um código de segurança de 6 dígitos para redefinir sua senha.
                    </Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>E-mail Cadastrado</Text>
                    <View style={[styles.inputWrapper, { 
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
                      borderColor: colors.border
                    }]}>
                      <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                      <TextInput
                        maxLength={255}
                        style={[styles.input, { color: colors.text }]}
                        placeholder="seu@email.com"
                        placeholderTextColor={colors.textMuted}
                        value={forgotEmail}
                        onChangeText={setForgotEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoFocus
                      />
                    </View>
                  </View>

                  <Pressable 
                    style={({ pressed }) => [
                      styles.loginButton, 
                      { backgroundColor: colors.primary, opacity: pressed || forgotLoading ? 0.85 : 1, marginTop: 8 }
                    ]}
                    onPress={handleRequestResetCode}
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.loginButtonText}>Enviar Código de Segurança</Text>
                    )}
                  </Pressable>

                  <Pressable 
                    style={styles.toggleRow}
                    onPress={() => setForgotStep('reset')}
                  >
                    <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>
                      Já possui um código de 6 dígitos? Clique aqui
                    </Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <View style={{ alignItems: 'center', marginVertical: 10 }}>
                    <View style={[styles.iconBadge, { backgroundColor: '#10b98118' }]}>
                      <Ionicons name="shield-checkmark-outline" size={38} color="#10b981" />
                    </View>
                    <Text style={[styles.subtitle, { color: colors.textMuted, marginTop: 6 }]}>
                      Digite o código de 6 dígitos enviado para {forgotEmail || 'seu e-mail'} e defina sua nova senha.
                    </Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>E-mail</Text>
                    <View style={[styles.inputWrapper, { 
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
                      borderColor: colors.border
                    }]}>
                      <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                      <TextInput
                        maxLength={255}
                        style={[styles.input, { color: colors.text }]}
                        placeholder="seu@email.com"
                        placeholderTextColor={colors.textMuted}
                        value={forgotEmail}
                        onChangeText={setForgotEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text, textAlign: 'center' }]}>
                      Código de 6 Dígitos
                    </Text>
                    <View style={[styles.inputWrapper, { 
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
                      borderColor: colors.primary,
                      justifyContent: 'center',
                      height: 54
                    }]}>
                      <TextInput
                        maxLength={6}
                        style={[styles.input, { 
                          color: colors.text, 
                          textAlign: 'center', 
                          fontSize: 24, 
                          fontWeight: '800', 
                          letterSpacing: 8 
                        }]}
                        placeholder="000000"
                        placeholderTextColor={colors.textMuted}
                        value={resetCode}
                        onChangeText={setResetCode}
                        keyboardType="number-pad"
                        autoFocus
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Nova Senha</Text>
                    <View style={[styles.inputWrapper, { 
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
                      borderColor: colors.border
                    }]}>
                      <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                      <TextInput
                        maxLength={128}
                        style={[styles.input, { color: colors.text }]}
                        placeholder="Nova senha segura"
                        placeholderTextColor={colors.textMuted}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!showNewPassword}
                      />
                      <Pressable onPress={() => setShowNewPassword(!showNewPassword)} hitSlop={10} style={{ padding: 4 }}>
                        <Ionicons 
                          name={showNewPassword ? "eye-off-outline" : "eye-outline"} 
                          size={18} 
                          color={colors.textMuted} 
                        />
                      </Pressable>
                    </View>
                  </View>

                  {/* Regras da nova senha */}
                  <View style={[styles.passwordRulesBox, { 
                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f1f5f9',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'
                  }]}>
                    <Text style={[styles.passwordRulesTitle, { color: colors.textMuted }]}>
                      Requisitos da Nova Senha:
                    </Text>
                    <View style={styles.rulesGrid}>
                      <View style={styles.ruleItem}>
                        <Ionicons 
                          name={hasResetMinLen ? "checkmark-circle" : "ellipse-outline"} 
                          size={14} 
                          color={hasResetMinLen ? "#10b981" : colors.textMuted} 
                        />
                        <Text style={[styles.ruleText, { color: hasResetMinLen ? "#10b981" : colors.textMuted }]}>
                          Mínimo 8 caracteres
                        </Text>
                      </View>
                      <View style={styles.ruleItem}>
                        <Ionicons 
                          name={hasResetUpper ? "checkmark-circle" : "ellipse-outline"} 
                          size={14} 
                          color={hasResetUpper ? "#10b981" : colors.textMuted} 
                        />
                        <Text style={[styles.ruleText, { color: hasResetUpper ? "#10b981" : colors.textMuted }]}>
                          1 letra maiúscula
                        </Text>
                      </View>
                      <View style={styles.ruleItem}>
                        <Ionicons 
                          name={hasResetDigit ? "checkmark-circle" : "ellipse-outline"} 
                          size={14} 
                          color={hasResetDigit ? "#10b981" : colors.textMuted} 
                        />
                        <Text style={[styles.ruleText, { color: hasResetDigit ? "#10b981" : colors.textMuted }]}>
                          1 número
                        </Text>
                      </View>
                      <View style={styles.ruleItem}>
                        <Ionicons 
                          name={hasResetSpecial ? "checkmark-circle" : "ellipse-outline"} 
                          size={14} 
                          color={hasResetSpecial ? "#10b981" : colors.textMuted} 
                        />
                        <Text style={[styles.ruleText, { color: hasResetSpecial ? "#10b981" : colors.textMuted }]}>
                          1 caractere especial (!@#$...)
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Confirmar Nova Senha</Text>
                    <View style={[styles.inputWrapper, { 
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
                      borderColor: confirmNewPassword && confirmNewPassword !== newPassword ? '#ef4444' : colors.border
                    }]}>
                      <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                      <TextInput
                        maxLength={128}
                        style={[styles.input, { color: colors.text }]}
                        placeholder="Repita a nova senha"
                        placeholderTextColor={colors.textMuted}
                        value={confirmNewPassword}
                        onChangeText={setConfirmNewPassword}
                        secureTextEntry={!showConfirmNewPassword}
                      />
                      <Pressable onPress={() => setShowConfirmNewPassword(!showConfirmNewPassword)} hitSlop={10} style={{ padding: 4 }}>
                        <Ionicons 
                          name={showConfirmNewPassword ? "eye-off-outline" : "eye-outline"} 
                          size={18} 
                          color={colors.textMuted} 
                        />
                      </Pressable>
                    </View>
                  </View>

                  <Pressable 
                    style={({ pressed }) => [
                      styles.loginButton, 
                      { backgroundColor: colors.primary, opacity: pressed || forgotLoading ? 0.85 : 1, marginTop: 8 }
                    ]}
                    onPress={handleConfirmResetPassword}
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.loginButtonText}>Salvar Nova Senha</Text>
                    )}
                  </Pressable>

                  <Pressable 
                    style={styles.toggleRow}
                    onPress={handleRequestResetCode}
                    disabled={forgotLoading}
                  >
                    <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>
                      Reenviar código de segurança
                    </Text>
                  </Pressable>

                  <Pressable 
                    style={[styles.toggleRow, { marginTop: 0 }]}
                    onPress={() => setForgotStep('request')}
                  >
                    <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                      Alterar e-mail informado
                    </Text>
                  </Pressable>
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
  header: { alignItems: 'center', marginTop: 16, marginBottom: 24 },
  iconBadge: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 6, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 16 },
  formContainer: { width: '100%', marginTop: 4 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, height: 48 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, height: '100%' },
  passwordRowExtras: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2, marginBottom: 18 },
  rememberRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  rememberText: { fontSize: 13, fontWeight: '500' },
  loginButton: { height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  loginButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  
  // Divisor OU
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 14, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

  // Botão Google
  googleButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  googleButtonText: { fontSize: 15, fontWeight: '700' },

  toggleRow: { marginTop: 18, alignItems: 'center', paddingVertical: 6 },
  
  // Regras de Senha
  passwordRulesBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
    marginTop: -4,
  },
  passwordRulesTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rulesGrid: {
    gap: 6,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruleText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Modal / Bottom Sheet de Recuperação
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  bottomSheetContent: { 
    borderTopLeftRadius: 28, 
    borderTopRightRadius: 28, 
    padding: 24, 
    paddingBottom: 36, 
    borderWidth: 1, 
    borderBottomWidth: 0, 
    maxHeight: '92%' 
  },
  dragHandle: { width: 44, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
});
