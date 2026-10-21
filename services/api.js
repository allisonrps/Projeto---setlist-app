import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Live Azure Cloud API for BandLink
export const API_URL = "https://bandlink-api.azurewebsites.net/api";

// Lazy load SecureStore safely for native platforms (Android Keystore / iOS Keychain)
let SecureStore = null;
try {
  if (Platform?.OS !== 'web') {
    SecureStore = require('expo-secure-store');
  }
} catch (e) {
  SecureStore = null;
}

const isSecureStoreAvailable = async () => {
  try {
    if (SecureStore && typeof SecureStore.isAvailableAsync === 'function') {
      return await SecureStore.isAvailableAsync();
    }
    return false;
  } catch {
    return false;
  }
};

export const secureToken = {
  get: async (key) => {
    try {
      if (await isSecureStoreAvailable()) {
        const val = await SecureStore.getItemAsync(key);
        if (val) return val;
      }
    } catch (e) {
      console.log('SecureStore get error:', e);
    }
    // Fallback & migration from AsyncStorage
    return await AsyncStorage.getItem(key);
  },
  set: async (key, value) => {
    try {
      if (await isSecureStoreAvailable()) {
        await SecureStore.setItemAsync(key, value);
        // Clear plaintext copy from AsyncStorage for enhanced security
        await AsyncStorage.removeItem(key).catch(() => {});
        return;
      }
    } catch (e) {
      console.log('SecureStore set error:', e);
    }
    await AsyncStorage.setItem(key, value);
  },
  remove: async (key) => {
    try {
      if (await isSecureStoreAvailable()) {
        await SecureStore.deleteItemAsync(key);
      }
    } catch {}
    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  }
};

const fetchWithTimeout = async (url, options = {}, timeout = 15000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    if (err.name === 'AbortError') {
      throw new Error('Tempo limite de conexão esgotado. Verifique sua conexão com a internet.');
    }
    throw new Error('Não foi possível conectar ao servidor BandLink online. Verifique sua internet.');
  }
};

const getHeaders = async () => {
  const token = await secureToken.get("jwt_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const api = {
  checkHealth: async () => {
    try {
      const response = await fetchWithTimeout(`${API_URL}/health`, {}, 8000);
      return response.ok;
    } catch {
      return false;
    }
  },

  login: async (email, password) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const response = await fetchWithTimeout(`${API_URL}/Auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: cleanEmail, password })
    });
    
    if (!response.ok) {
      if (response.status === 403) {
        const error = new Error("Por favor, confirme seu e-mail para ativar a conta.");
        error.requiresConfirmation = true;
        error.email = cleanEmail;
        throw error;
      }
      let errorMsg = "E-mail ou senha incorretos.";
      try {
        const text = await response.text();
        if (text && text.trim() && !text.includes("<") && text.length < 200) {
          errorMsg = text.trim();
        }
      } catch {}
      throw new Error(errorMsg);
    }
    
    const data = await response.json();
    await secureToken.set("jwt_token", data.token);
    await AsyncStorage.setItem("user_info", JSON.stringify(data));
    return data;
  },

  checkUsername: async (username) => {
    const clean = (username || '').trim().replace(/^@/, '');
    if (!clean) return { available: false, message: 'Nome de usuário vazio.' };
    try {
      const response = await fetchWithTimeout(`${API_URL}/Auth/check-username?username=${encodeURIComponent(clean)}`, {}, 5000);
      if (response.ok) {
        return await response.json();
      }
      return { available: false, message: 'Erro ao verificar nome de usuário.' };
    } catch {
      return { available: true }; // Se offline, não bloquear
    }
  },

  register: async (username, email, password, birthDate = null, location = {}) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const payload = {
      username: (username || '').trim(),
      email: cleanEmail,
      password
    };
    if (birthDate && birthDate.trim()) {
      payload.birthDate = birthDate.trim();
    }
    if (location && typeof location === 'object') {
      if (location.city && location.city.trim()) payload.city = location.city.trim();
      if (location.state && location.state.trim()) payload.state = location.state.trim();
      if (location.country && location.country.trim()) payload.country = location.country.trim();
    }
    const response = await fetchWithTimeout(`${API_URL}/Auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      let errorMsg = "Não foi possível criar a conta. Verifique os dados.";
      try {
        const text = await response.text();
        try {
          const json = JSON.parse(text);
          if (json?.errors) {
            const firstKey = Object.keys(json.errors)[0];
            if (firstKey && json.errors[firstKey]?.length) {
              errorMsg = json.errors[firstKey][0];
            }
          } else if (json?.message) {
            errorMsg = json.message;
          }
        } catch {
          if (text && text.trim() && !text.includes("<") && text.length < 200) {
            errorMsg = text.trim();
          }
        }
      } catch {}
      throw new Error(errorMsg);
    }
    return response.json();
  },

  confirmEmail: async (email, code) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const response = await fetchWithTimeout(`${API_URL}/Auth/confirm-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: cleanEmail, code: (code || '').trim() })
    });

    if (!response.ok) {
      let errorMsg = "Código de confirmação incorreto ou expirado.";
      try {
        const text = await response.text();
        if (text && text.trim() && !text.includes("<") && text.length < 200) {
          errorMsg = text.trim();
        }
      } catch {}
      throw new Error(errorMsg);
    }

    const data = await response.json();
    await secureToken.set("jwt_token", data.token);
    await AsyncStorage.setItem("user_info", JSON.stringify(data));
    return data;
  },

  resendCode: async (email) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const response = await fetchWithTimeout(`${API_URL}/Auth/resend-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: cleanEmail })
    });

    if (!response.ok) {
      let errorMsg = "Falha ao reenviar código.";
      try {
        const text = await response.text();
        if (text && text.trim() && !text.includes("<") && text.length < 200) {
          errorMsg = text.trim();
        }
      } catch {}
      throw new Error(errorMsg);
    }
    return response.json();
  },

  forgotPassword: async (email) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const response = await fetchWithTimeout(`${API_URL}/Auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: cleanEmail })
    });

    if (!response.ok) {
      let errorMsg = "Não foi possível solicitar a recuperação de senha.";
      try {
        const text = await response.text();
        if (text && text.trim() && !text.includes("<") && text.length < 200) {
          errorMsg = text.trim();
        }
      } catch {}
      throw new Error(errorMsg);
    }
    return response.json();
  },

  resetPassword: async (email, code, newPassword) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const response = await fetchWithTimeout(`${API_URL}/Auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: cleanEmail,
        code: (code || '').trim(),
        newPassword
      })
    });

    if (!response.ok) {
      let errorMsg = "Código de recuperação incorreto ou expirado.";
      try {
        const text = await response.text();
        if (text && text.trim() && !text.includes("<") && text.length < 200) {
          errorMsg = text.trim();
        }
      } catch {}
      throw new Error(errorMsg);
    }
    return response.json();
  },

  googleLogin: async (idToken) => {
    const response = await fetchWithTimeout(`${API_URL}/Auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken })
    });

    if (!response.ok) {
      let errorMsg = "Falha ao autenticar com Google.";
      try {
        const text = await response.text();
        if (text && text.trim() && !text.includes("<") && text.length < 200) {
          errorMsg = text.trim();
        }
      } catch {}
      throw new Error(errorMsg);
    }

    const data = await response.json();
    await secureToken.set("jwt_token", data.token);
    await AsyncStorage.setItem("user_info", JSON.stringify(data));
    return data;
  },

  logout: async () => {
    // Remove all auth-related data with hardware secure wipe
    await secureToken.remove("jwt_token");
    await AsyncStorage.removeItem("user_info");
    await AsyncStorage.removeItem("user_profile_cache");
    await AsyncStorage.removeItem("user_display_name");
    await AsyncStorage.removeItem("user_gear");
    await AsyncStorage.removeItem("user_profile_completed");
    await AsyncStorage.removeItem("profileImage");
    // Clean up legacy plaintext credentials if they exist
    await AsyncStorage.removeItem("saved_login_credentials");
  },

  getProfile: async () => {
    const headers = await getHeaders();
    let response;
    try {
      response = await fetchWithTimeout(`${API_URL}/Users/me`, { headers });
    } catch (netErr) {
      throw new Error("Não foi possível conectar ao servidor.");
    }

    if (response.status === 401) {
      await secureToken.remove("jwt_token");
      await AsyncStorage.removeItem("user_info");
      const err = new Error("Sessão expirada. Faça login novamente.");
      err.isAuthError = true;
      throw err;
    }

    if (!response.ok) throw new Error("Erro ao buscar perfil");
    return response.json();
  },

  getUserProfile: async (username) => {
    try {
      const headers = await getHeaders();
      const clean = encodeURIComponent(String(username || '').replace(/^@+/, '').trim());
      const response = await fetchWithTimeout(`${API_URL}/Users/${clean}?_t=${Date.now()}`, {
        headers: {
          ...headers,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      }, 8000);
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.log('Error fetching user profile:', err);
    }
    return null;
  },

  updateProfile: async (data) => {
    const headers = await getHeaders();
    let response;
    try {
      response = await fetchWithTimeout(`${API_URL}/Users/profile`, {
        method: "PUT",
        headers,
        body: JSON.stringify(data)
      });
    } catch (netErr) {
      throw new Error("Não foi possível conectar ao servidor.");
    }

    if (response.status === 401) {
      await secureToken.remove("jwt_token");
      await AsyncStorage.removeItem("user_info");
      const err = new Error("Sessão expirada. Faça login novamente.");
      err.isAuthError = true;
      throw err;
    }

    if (!response.ok) throw new Error("Erro ao atualizar perfil");
    return response.json();
  },

  isLoggedIn: async () => {
    try {
      const token = await secureToken.get("jwt_token");
      return !!token;
    } catch {
      return false;
    }
  },

  syncBandToCloud: async (band) => {
    try {
      const headers = await getHeaders();
      const response = await fetchWithTimeout(`${API_URL}/Bands`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: band.name,
          genre: typeof band.genres === 'string' ? band.genres : JSON.stringify(band.genres || []),
          description: band.city ? `${band.city}${band.state ? ', ' + band.state : ''}` : '',
        })
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.log('Background cloud sync error:', err);
    }
    return null;
  },

  getAnnouncements: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.instrument) params.append('instrument', filters.instrument);
      if (filters.city) params.append('city', filters.city);

      const qs = params.toString() ? `?${params.toString()}` : '';
      const response = await fetchWithTimeout(`${API_URL}/Announcements${qs}`, {}, 8000);
      if (response.ok) {
        const res = await response.json();
        return res.data || [];
      }
    } catch (err) {
      console.log('Error fetching cloud announcements:', err);
    }
    return [];
  },

  createAnnouncement: async (announcementData) => {
    const headers = await getHeaders();
    const response = await fetchWithTimeout(`${API_URL}/Announcements`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: announcementData.title || announcementData.bandName,
        description: announcementData.description || '',
        instrument: announcementData.instrument || announcementData.soughtRole || '',
        city: announcementData.city || '',
        state: announcementData.state || '',
        imageUrl: announcementData.imageUrl || announcementData.imageUri || null,
        styles: announcementData.styles || (announcementData.genres ? announcementData.genres.join(', ') : ''),
        interestLevel: announcementData.interestLevel || (announcementData.options ? announcementData.options.join(', ') : 'Casual'),
        projectType: announcementData.projectType || (announcementData.isCover ? 'Cover' : 'Autoral') || 'Cover'
      })
    });
    if (!response.ok) {
      let errMsg = 'Erro ao publicar anúncio no servidor.';
      try {
        const text = await response.text();
        errMsg = text || errMsg;
      } catch {}
      throw new Error(errMsg);
    }
    return response.json();
  },

  updateAnnouncement: async (id, announcementData) => {
    const headers = await getHeaders();
    const payload = {
      title: announcementData.title || announcementData.bandName,
      description: announcementData.description || '',
      instrument: announcementData.instrument || announcementData.soughtRole || '',
      city: announcementData.city || '',
      state: announcementData.state || '',
      imageUrl: announcementData.imageUrl || announcementData.imageUri || null,
      styles: announcementData.styles || (announcementData.genres ? announcementData.genres.join(', ') : ''),
      interestLevel: announcementData.interestLevel || (announcementData.options ? announcementData.options.join(', ') : 'Casual'),
      projectType: announcementData.projectType || 'Cover',
      status: announcementData.status || 'Open'
    };

    let response = await fetchWithTimeout(`${API_URL}/Announcements/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(payload)
    });

    // 405 Method Not Allowed fallback for proxies/IIS WebDAV
    if (response.status === 405) {
      response = await fetchWithTimeout(`${API_URL}/Announcements/${id}`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });
    }

    if (!response.ok) {
      let errMsg = 'Erro ao atualizar anúncio.';
      try {
        const text = await response.text();
        errMsg = text || errMsg;
      } catch {}
      throw new Error(errMsg);
    }
    return response.json();
  },

  deleteAnnouncement: async (id) => {
    try {
      const headers = await getHeaders();
      let response = await fetchWithTimeout(`${API_URL}/Announcements/${id}`, {
        method: "DELETE",
        headers
      });

      // 405 Method Not Allowed fallback
      if (response.status === 405) {
        response = await fetchWithTimeout(`${API_URL}/Announcements/${id}/delete`, {
          method: "POST",
          headers
        });
      }

      return response.ok;
    } catch (err) {
      console.log('Error deleting cloud announcement:', err);
      return false;
    }
  },

  applyToAnnouncement: async (announcementId, candidateData) => {
    const headers = await getHeaders();
    const response = await fetchWithTimeout(`${API_URL}/Announcements/${announcementId}/apply`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        applicantName: candidateData.applicantName || candidateData.name || '',
        instrument: candidateData.instrument || candidateData.role || '',
        message: candidateData.message || candidateData.notes || '',
        contactInfo: candidateData.contactInfo || candidateData.phone || '',
        pictureUrl: candidateData.pictureUrl || candidateData.avatar || null
      })
    });
    if (!response.ok) {
      let errMsg = 'Erro ao registrar candidatura no servidor.';
      try {
        const text = await response.text();
        errMsg = text || errMsg;
      } catch {}
      throw new Error(errMsg);
    }
    return response.json();
  },

  getAnnouncementApplicants: async (announcementId) => {
    try {
      const headers = await getHeaders();
      const response = await fetchWithTimeout(`${API_URL}/Announcements/${announcementId}/applicants`, {
        headers
      });
      if (response.ok) {
        const res = await response.json();
        return res.data || [];
      }
    } catch (err) {
      console.log('Error fetching applicants:', err);
    }
    return [];
  },

  deleteAnnouncementApplicant: async (announcementId, applicantId) => {
    try {
      const headers = await getHeaders();
      let response = await fetchWithTimeout(`${API_URL}/Announcements/${announcementId}/applicants/${applicantId}`, {
        method: "DELETE",
        headers
      });
      if (response.status === 405) {
        response = await fetchWithTimeout(`${API_URL}/Announcements/${announcementId}/applicants/${applicantId}/delete`, {
          method: "POST",
          headers
        });
      }
      return response.ok;
    } catch (err) {
      console.log('Error deleting applicant:', err);
      return false;
    }
  },

  // ==========================================
  // CLOUD USERS / MUSICIANS (NETWORK)
  // ==========================================
  getUsers: async (filters = {}) => {
    try {
      const headers = await getHeaders();
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.city) params.append('city', filters.city);
      if (filters.state) params.append('state', filters.state);
      if (filters.instrument) params.append('instrument', filters.instrument);
      params.append('_t', String(Date.now()));

      const qs = params.toString() ? `?${params.toString()}` : '';
      const response = await fetchWithTimeout(`${API_URL}/Users${qs}`, {
        headers: {
          ...headers,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      }, 8000);
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.log('Error fetching cloud musicians:', err);
    }
    return [];
  },

  // ==========================================
  // CLOUD BANDS & NETWORK SYNC
  // ==========================================
  getPublicBands: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.city) params.append('city', filters.city);
      if (filters.state) params.append('state', filters.state);
      if (filters.genre) params.append('genre', filters.genre);

      const qs = params.toString() ? `?${params.toString()}` : '';
      const response = await fetchWithTimeout(`${API_URL}/Bands/public${qs}`, {}, 8000);
      if (response.ok) {
        const res = await response.json();
        return Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      }
    } catch (err) {
      console.log('Error fetching public bands:', err);
    }
    return [];
  },

  getPublicBandProfile: async (id) => {
    try {
      const response = await fetchWithTimeout(`${API_URL}/Bands/public/${id}`, {}, 8000);
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.log('Error fetching public band profile:', err);
    }
    return null;
  },

  getClassifieds: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.category) params.append('category', filters.category);
      if (filters.city) params.append('city', filters.city);
      if (filters.state) params.append('state', filters.state);
      if (filters.page) params.append('page', filters.page);

      const qs = params.toString() ? `?${params.toString()}` : '';
      const response = await fetchWithTimeout(`${API_URL}/gear/classifieds${qs}`, {}, 8000);
      if (response.ok) {
        const res = await response.json();
        const items = res?.items || (Array.isArray(res) ? res : []);
        if (items.length > 0) return items;
      }
    } catch (err) {
      console.log('Classifieds API route unavailable, falling back to users pool:', err);
    }

    // Fallback: extract negotiable gear from users list
    try {
      const users = await api.getUsers();
      if (Array.isArray(users)) {
        const fallbackItems = [];
        users.forEach(u => {
          let gear = [];
          try {
            gear = typeof u.gearJson === 'string' ? JSON.parse(u.gearJson) : (u.gear || []);
          } catch (e) {}
          if (Array.isArray(gear)) {
            gear.forEach(g => {
              if (g.isNegotiable === true || g.isNegotiable === 1 || String(g.isNegotiable).toLowerCase() === 'true') {
                fallbackItems.push({
                  id: g.id || `gear-${u.id}-${Math.random()}`,
                  userId: u.id,
                  username: (u.username || '').replace(/^@+/, ''),
                  name: g.name || '',
                  category: g.category || 'Equipamento',
                  description: g.details || g.description || '',
                  price: g.price || '',
                  isNegotiable: true,
                  city: u.city || '',
                  state: u.state || ''
                });
              }
            });
          }
        });
        return fallbackItems;
      }
    } catch (fallbackErr) {
      console.log('Error in classifieds fallback:', fallbackErr);
    }

    return [];
  },

  checkBandUsername: async (username, excludeBandId = null) => {
    try {
      const clean = (username || '').trim().toLowerCase().replace('@', '');
      if (clean.length < 3) {
        return { available: false, message: 'O username da banda deve ter no mínimo 3 caracteres.' };
      }
      if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
        return { available: false, message: 'Apenas letras, números e sublinhados (_).' };
      }

      const headers = await getHeaders();
      const qs = `username=${encodeURIComponent(clean)}${excludeBandId ? `&excludeBandId=${excludeBandId}` : ''}`;

      // 1. Dedicated endpoint check
      try {
        const response = await fetchWithTimeout(`${API_URL}/Bands/check-username?${qs}`, { headers }, 5000);
        if (response.ok) {
          return await response.json();
        }
      } catch (err) {
        console.log('check-username endpoint error, fallback to search:', err);
      }

      // 2. Fallback: check public band profile
      try {
        const pubRes = await fetchWithTimeout(`${API_URL}/Bands/public/${encodeURIComponent(clean)}`, {}, 5000);
        if (pubRes.ok) {
          const found = await pubRes.json();
          if (found && (!excludeBandId || found.id !== excludeBandId)) {
            return { available: false, message: `@${clean} já está sendo usado por "${found.name || clean}".`, username: clean };
          }
        }
      } catch (e) {}

      // 3. Fallback: check public bands search for slug or name match (searching with spaces if underscore)
      try {
        const queryTerm = clean.includes('_') ? clean.replace(/_/g, ' ') : clean;
        const listRes = await fetchWithTimeout(`${API_URL}/Bands/public?search=${encodeURIComponent(queryTerm)}`, {}, 5000);
        if (listRes.ok) {
          const res = await listRes.json();
          const items = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
          const match = items.find(b => {
            if (excludeBandId && b.id === excludeBandId) return false;
            const bSlug = (b.publicSlug || '').trim().toLowerCase().replace('@', '');
            const bNameSlug = (b.name || '').trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
            const bName = (b.name || '').trim().toLowerCase();
            return bSlug === clean || bNameSlug === clean || bName === clean || bName === queryTerm;
          });
          if (match) {
            return { available: false, message: `@${clean} já está sendo usado por "${match.name}".`, username: clean };
          }
        }
      } catch (e) {}

      return { available: true, username: clean };
    } catch (err) {
      console.log('Error checking band username:', err);
      return { available: true, username: (username || '').trim().toLowerCase().replace('@', '') };
    }
  },

  getMyCloudBands: async () => {
    try {
      const headers = await getHeaders();
      const response = await fetchWithTimeout(`${API_URL}/Bands/my-bands?_t=${Date.now()}`, {
        headers: {
          ...headers,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      }, 8000);
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.log('Error fetching my cloud bands:', err);
    }
    return [];
  },

  createBand: async (bandData) => {
    const headers = await getHeaders();
    const response = await fetchWithTimeout(`${API_URL}/Bands`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: bandData.name,
        publicSlug: bandData.publicSlug || '',
        genre: bandData.genre || '',
        description: bandData.description || ''
      })
    });
    if (!response.ok) {
      let errMsg = 'Erro ao criar banda no servidor.';
      try {
        const text = await response.text();
        errMsg = text || errMsg;
      } catch {}
      throw new Error(errMsg);
    }
    return response.json();
  },

  syncBand: async (id, syncPayload) => {
    const headers = await getHeaders();
    const response = await fetchWithTimeout(`${API_URL}/Bands/${id}/sync`, {
      method: "POST",
      headers,
      body: JSON.stringify(syncPayload)
    });
    if (!response.ok) {
      let errMsg = 'Erro ao sincronizar banda com a nuvem.';
      try {
        const text = await response.text();
        errMsg = text || errMsg;
      } catch {}
      throw new Error(errMsg);
    }
    return response.json();
  },

  pullBand: async (id) => {
    const headers = await getHeaders();
    const response = await fetchWithTimeout(`${API_URL}/Bands/${id}/pull`, {
      method: "GET",
      headers
    });
    if (!response.ok) {
      let errMsg = 'Erro ao carregar dados da banda da nuvem.';
      try {
        const text = await response.text();
        errMsg = text || errMsg;
      } catch {}
      throw new Error(errMsg);
    }
    return response.json();
  },

  toggleBandNetworkVisibility: async (id, isVisible) => {
    const headers = await getHeaders();
    const response = await fetchWithTimeout(`${API_URL}/Bands/${id}/network-visibility`, {
      method: "POST",
      headers,
      body: JSON.stringify({ isVisible: !!isVisible })
    });
    if (!response.ok) {
      let errMsg = 'Erro ao atualizar visibilidade da banda.';
      try {
        const text = await response.text();
        errMsg = text || errMsg;
      } catch {}
      throw new Error(errMsg);
    }
    return response.json();
  },

  addBandMember: async (bandId, memberData) => {
    const headers = await getHeaders();
    const response = await fetchWithTimeout(`${API_URL}/Bands/${bandId}/members`, {
      method: "POST",
      headers,
      body: JSON.stringify(memberData)
    });
    if (!response.ok) {
      let errMsg = 'Erro ao adicionar membro à banda.';
      try {
        const text = await response.text();
        errMsg = text || errMsg;
      } catch {}
      throw new Error(errMsg);
    }
    return response.json();
  },

  getBandMembers: async (bandId) => {
    try {
      const headers = await getHeaders();
      const response = await fetchWithTimeout(`${API_URL}/Bands/${bandId}/members`, {
        method: "GET",
        headers
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.log('Error fetching band members from API:', e);
    }
    return [];
  },

  removeBandMember: async (bandId, targetUserId) => {
    const headers = await getHeaders();
    const response = await fetchWithTimeout(`${API_URL}/Bands/${bandId}/members/${targetUserId}`, {
      method: "DELETE",
      headers
    });
    if (!response.ok) {
      let errMsg = 'Erro ao remover membro da banda.';
      try {
        const text = await response.text();
        errMsg = text || errMsg;
      } catch {}
      throw new Error(errMsg);
    }
    return response.json();
  },

  deleteBand: async (id) => {
    const headers = await getHeaders();
    const response = await fetchWithTimeout(`${API_URL}/Bands/${id}`, {
      method: "DELETE",
      headers
    });
    if (!response.ok) {
      let errMsg = 'Erro ao excluir banda do servidor.';
      try {
        const text = await response.text();
        errMsg = text || errMsg;
      } catch {}
      throw new Error(errMsg);
    }
    return response.json();
  },

  // ── Online Songbook (Supabase PostgreSQL) ──
  getSongs: async (search = '', style = '') => {
    const headers = await getHeaders();
    let url = `${API_URL}/Songs`;
    const params = [];
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (style) params.push(`style=${encodeURIComponent(style)}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    const response = await fetchWithTimeout(url, { headers });
    if (!response.ok) return [];
    return response.json();
  },

  getSongById: async (id) => {
    const headers = await getHeaders();
    const response = await fetchWithTimeout(`${API_URL}/Songs/${id}`, { headers });
    if (!response.ok) throw new Error('Música não encontrada.');
    return response.json();
  },

  createSong: async (songData) => {
    const headers = await getHeaders();
    const response = await fetchWithTimeout(`${API_URL}/Songs`, {
      method: "POST",
      headers,
      body: JSON.stringify(songData)
    });
    if (!response.ok) throw new Error('Erro ao salvar música na nuvem.');
    return response.json();
  },

  updateSong: async (id, songData) => {
    const headers = await getHeaders();
    const response = await fetchWithTimeout(`${API_URL}/Songs/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(songData)
    });
    if (!response.ok) throw new Error('Erro ao atualizar música na nuvem.');
    return response.json();
  },

  deleteSong: async (id) => {
    const headers = await getHeaders();
    const response = await fetchWithTimeout(`${API_URL}/Songs/${id}`, {
      method: "DELETE",
      headers
    });
    if (!response.ok) throw new Error('Erro ao excluir música da nuvem.');
    return response.json();
  },

  // ── Online Events / Agenda (Supabase PostgreSQL) ──
  getEvents: async (filter = '') => {
    const headers = await getHeaders();
    let url = `${API_URL}/Events`;
    if (filter) url += `?filter=${encodeURIComponent(filter)}`;

    const response = await fetchWithTimeout(url, { headers });
    if (!response.ok) return [];
    return response.json();
  },

  createEvent: async (eventData) => {
    const headers = await getHeaders();
    const response = await fetchWithTimeout(`${API_URL}/Events`, {
      method: "POST",
      headers,
      body: JSON.stringify(eventData)
    });
    if (!response.ok) throw new Error('Erro ao salvar evento na agenda.');
    return response.json();
  },

  updateEvent: async (id, eventData) => {
    const headers = await getHeaders();
    const response = await fetchWithTimeout(`${API_URL}/Events/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(eventData)
    });
    if (!response.ok) throw new Error('Erro ao atualizar evento na agenda.');
    return response.json();
  },

  deleteEvent: async (id) => {
    const headers = await getHeaders();
    const response = await fetchWithTimeout(`${API_URL}/Events/${id}`, {
      method: "DELETE",
      headers
    });
    if (!response.ok) throw new Error('Erro ao excluir evento da agenda.');
    return response.json();
  }
};
