import { API_URL, clearTokens, getToken, refreshToken } from './auth';

/**
 * Uniwersalna funkcja do wykonywania zapytań HTTP z obsługą autoryzacji
 */
export const apiClient = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);

    // Obsługa błędu autoryzacji (401)
    if (response.status === 401) {
      console.log('Błąd autoryzacji, próba odświeżenia tokenu...');
      const newTokens = await refreshToken();

      if (newTokens) {
        // Powtórz zapytanie z nowym tokenem
        headers['Authorization'] = `Bearer ${newTokens.access_token}`;
        const retryConfig: RequestInit = {
          ...options,
          headers,
        };
        const retryResponse = await fetch(`${API_URL}${endpoint}`, retryConfig);

        if (retryResponse.ok) {
          return await retryResponse.json();
        } else {
          // Jeśli powtórne zapytanie również się nie powiodło, wyloguj użytkownika
          await clearTokens();
          throw new Error('Nieudane ponowne zapytanie po odświeżeniu tokenu');
        }
      } else {
        // Jeśli nie udało się odświeżyć tokenu, wyloguj użytkownika
        await clearTokens();
        throw new Error(
          'Nieprawidłowa autoryzacja i nie udało się odświeżyć tokenu'
        );
      }
    }

    // Obsługa innych błędów HTTP
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Status błędu: ${response.status}`);
    }

    // Normalna odpowiedź
    if (response.headers.get('content-type')?.includes('application/json')) {
      return await response.json();
    } else {
      return (await response.text()) as unknown as T;
    }
  } catch (error) {
    console.error('Błąd zapytania API:', error);
    throw error;
  }
};

// Dodatkowe metody dla wygody
export const get = <T>(endpoint: string, options?: RequestInit): Promise<T> => {
  return apiClient(endpoint, { ...options, method: 'GET' });
};

export const post = <T>(
  endpoint: string,
  data?: any,
  options?: RequestInit
): Promise<T> => {
  return apiClient(endpoint, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
};

export const put = <T>(
  endpoint: string,
  data?: any,
  options?: RequestInit
): Promise<T> => {
  return apiClient(endpoint, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
};

export const del = <T>(endpoint: string, options?: RequestInit): Promise<T> => {
  return apiClient(endpoint, { ...options, method: 'DELETE' });
};
