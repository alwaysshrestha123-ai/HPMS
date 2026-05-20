import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('hpms_token');
    const cached = localStorage.getItem('hpms_user');
    if (token && cached) {
      setUser(JSON.parse(cached));
    }
    setReady(true);
  }, []);

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('hpms_token', data.token);
    localStorage.setItem('hpms_user',  JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  async function register(payload) {
    return api.post('/auth/register', payload);
  }

  function logout() {
    localStorage.removeItem('hpms_token');
    localStorage.removeItem('hpms_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
