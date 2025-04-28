import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Konfiguracja API URL w zależności od platformy
export const API_URL =
  Platform.select({
    ios: 'http://localhost:8000',
    android: 'http://192.168.0.112:8000',
  }) || 'http://localhost:8000';

// Klucze dla AsyncStorage
const AUTH_TOKEN_KEY = '@auth_token';
const REFRESH_TOKEN_KEY = '@refresh_token';
const USER_DATA_KEY = '@user_data';

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

  // Po pomyślnym logowaniu pobierz dane użytkownika
  try {
    await fetchAndStoreUserData(tokens.access_token);
  } catch (error) {
    console.error('Błąd podczas pobierania danych użytkownika:', error);
  }

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
  try {
    console.log('Próba odświeżenia tokenu');
    const refreshTokenValue = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);

    if (!refreshTokenValue) {
      console.log('Brak tokenu odświeżania w pamięci');
      return null;
    }

    console.log('Wysyłanie żądania odświeżenia tokenu');
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshTokenValue }),
    });

    if (!response.ok) {
      console.error('Błąd odświeżania tokenu, status:', response.status);
      try {
        const errorText = await response.text();
        console.error('Treść błędu:', errorText);
      } catch (e) {
        console.error('Nie można odczytać treści błędu');
      }

      await clearTokens();
      return null;
    }

    const tokens = await response.json();
    console.log('Otrzymano nowe tokeny, zapisuję');
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
  await AsyncStorage.removeItem(USER_DATA_KEY);
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

// Funkcja pobierająca i zapisująca dane użytkownika
export const fetchAndStoreUserData = async (
  token: string
): Promise<User | null> => {
  try {
    console.log('Próba pobrania danych użytkownika');

    // Najpierw spróbujemy pobrać dane z endpointu /auth/me
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        console.log('Dane użytkownika z API:', userData);
        await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
        return userData;
      } else {
        console.error('Endpoint /auth/me zwrócił błąd:', response.status);
      }
    } catch (apiError) {
      console.error('Błąd pobierania danych z API:', apiError);
    }

    // Jeśli endpoint /auth/me nie zadziałał, użyjemy mocka użytkownika
    console.log('Używam rozwiązania awaryjnego - hardcoded dane użytkownika');
    const mockUser: User = {
      id: 1,
      username: 'Zalogowany użytkownik',
      email: 'user@example.com',
      is_active: true,
    };

    await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(mockUser));
    return mockUser;
  } catch (error) {
    console.error('Błąd podczas pobierania danych użytkownika:', error);
    return null;
  }
};

// Funkcja zwracająca dane zalogowanego użytkownika
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const userData = await AsyncStorage.getItem(USER_DATA_KEY);
    if (userData) {
      return JSON.parse(userData);
    }

    // Jeśli nie ma danych w storage, ale jest token, spróbuj pobrać
    const token = await getToken();
    if (token) {
      return await fetchAndStoreUserData(token);
    }

    return null;
  } catch (error) {
    console.error(
      'Błąd podczas pobierania danych użytkownika z pamięci:',
      error
    );
    return null;
  }
};
