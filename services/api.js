import AsyncStorage from "@react-native-async-storage/async-storage";

// Live Azure Cloud API for BandLink
const API_URL = "https://bandlink-api.azurewebsites.net/api";

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
  const token = await AsyncStorage.getItem("jwt_token");
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
    await AsyncStorage.setItem("jwt_token", data.token);
    await AsyncStorage.setItem("user_info", JSON.stringify(data));
    return data;
  },

  register: async (username, email, password, birthDate = null) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const payload = {
      username: (username || '').trim(),
      email: cleanEmail,
      password
    };
    if (birthDate && birthDate.trim()) {
      payload.birthDate = birthDate.trim();
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
    await AsyncStorage.setItem("jwt_token", data.token);
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
    await AsyncStorage.setItem("jwt_token", data.token);
    await AsyncStorage.setItem("user_info", JSON.stringify(data));
    return data;
  },

  logout: async () => {
    // Remove all auth-related data
    await AsyncStorage.removeItem("jwt_token");
    await AsyncStorage.removeItem("user_info");
    await AsyncStorage.removeItem("user_profile_cache");
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
      await AsyncStorage.removeItem("jwt_token");
      await AsyncStorage.removeItem("user_info");
      const err = new Error("Sessão expirada. Faça login novamente.");
      err.isAuthError = true;
      throw err;
    }

    if (!response.ok) throw new Error("Erro ao buscar perfil");
    return response.json();
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
      await AsyncStorage.removeItem("jwt_token");
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
      const token = await AsyncStorage.getItem("jwt_token");
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
        state: announcementData.state || ''
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

  deleteAnnouncement: async (id) => {
    try {
      const headers = await getHeaders();
      const response = await fetchWithTimeout(`${API_URL}/Announcements/${id}`, {
        method: "DELETE",
        headers
      });
      return response.ok;
    } catch (err) {
      console.log('Error deleting cloud announcement:', err);
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

      const qs = params.toString() ? `?${params.toString()}` : '';
      const response = await fetchWithTimeout(`${API_URL}/Users${qs}`, { headers }, 8000);
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
        return await response.json();
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

  getMyCloudBands: async () => {
    try {
      const headers = await getHeaders();
      const response = await fetchWithTimeout(`${API_URL}/Bands/my-bands`, { headers }, 8000);
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
  }
};
