import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Konfiguracja API URL w zależności od platformy
export const API_URL =
  Platform.select({
    ios: 'http://localhost:8000',
    android: 'http://10.0.2.2:8000', // Standardowy adres hosta dla emulatora Android
  }) || 'http://localhost:8000';

// Klucze dla AsyncStorage
const AUTH_TOKEN_KEY = '@auth_token';
const REFRESH_TOKEN_KEY = '@refresh_token';

// Interfejsy
export interface User {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// Funkcje uwierzytelniania
export const login = async (data: LoginData): Promise<AuthTokens> => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }

  const tokens = await response.json();
  await saveTokens(tokens);
  return tokens;
};

export const register = async (data: RegisterData): Promise<User> => {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }

  return await response.json();
};

export const logout = async (): Promise<void> => {
  const token = await getToken();

  if (token) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Błąd podczas wylogowywania:', error);
    }
  }

  await clearTokens();
};

export const refreshToken = async (): Promise<AuthTokens | null> => {
  const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);

  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      await clearTokens();
      return null;
    }

    const tokens = await response.json();
    await saveTokens(tokens);
    return tokens;
  } catch (error) {
    console.error('Błąd podczas odświeżania tokenu:', error);
    await clearTokens();
    return null;
  }
};

// Pomocnicze funkcje do zarządzania tokenami
export const saveTokens = async (tokens: AuthTokens): Promise<void> => {
  await AsyncStorage.setItem(AUTH_TOKEN_KEY, tokens.access_token);
  await AsyncStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
};

export const getToken = async (): Promise<string | null> => {
  return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
};

export const clearTokens = async (): Promise<void> => {
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const isAuthenticated = async (): Promise<boolean> => {
  const token = await getToken();
  return !!token;
};

// Funkcja do dodawania nagłówka autoryzacji do żądań
export const authHeader = async (): Promise<HeadersInit> => {
  const token = await getToken();

  if (token) {
    return { Authorization: `Bearer ${token}` };
  }

  return {};
};
