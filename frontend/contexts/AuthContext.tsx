import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import backend from '~backend/client';
import type { UserProfile } from '~backend/auth/profile';

interface User {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  language: string;
  isAdmin: boolean;
  totalDonated: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string, language?: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: any) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    if (savedToken) {
      setToken(savedToken);
      loadUserProfile(savedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const loadUserProfile = async (authToken: string) => {
    try {
      const profile = await backend.auth.getProfile({ token: authToken });
      setUser(profile);
    } catch (error) {
      console.error('Failed to load user profile:', error);
      localStorage.removeItem('auth_token');
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await backend.auth.login({ email, password });
    setToken(response.token);
    setUser(response.user);
    localStorage.setItem('auth_token', response.token);
  };

  const register = async (
    email: string, 
    password: string, 
    firstName?: string, 
    lastName?: string, 
    language: string = 'en'
  ) => {
    const response = await backend.auth.register({
      email,
      password,
      firstName,
      lastName,
      language,
    });
    
    // Auto login after registration
    await login(email, password);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
  };

  const updateProfile = async (data: any) => {
    if (!token) throw new Error('No auth token');
    
    const profile = await backend.auth.updateProfile({
      token,
      ...data,
    });
    setUser(profile);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      register,
      logout,
      updateProfile,
      isLoading,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
