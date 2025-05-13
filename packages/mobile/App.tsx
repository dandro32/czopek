import React, { useState, useCallback, useEffect } from 'react';
import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider, Text, Switch, Button } from '@rneui/themed';
import { lightTheme, darkTheme } from './src/theme';
import { isAuthenticated as checkAuth, clearTokens } from './src/services/auth';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isUserAuthenticated, setIsUserAuthenticated] = useState<
    boolean | null
  >(null);
  const [logoutTrigger, setLogoutTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Sprawdzenie, czy użytkownik jest zalogowany przy starcie aplikacji
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setIsLoading(true);
        console.log('Sprawdzanie statusu autoryzacji...');

        // Sprawdzamy, czy użytkownik jest zalogowany i czy token jest ważny
        const isAuth = await checkAuth();
        console.log('Wynik sprawdzania autoryzacji:', isAuth);

        setIsUserAuthenticated(isAuth);
      } catch (error) {
        console.error('Błąd podczas sprawdzania statusu logowania:', error);
        // W przypadku błędu traktujemy użytkownika jako niezalogowanego
        setIsUserAuthenticated(false);
        // Dodatkowo wyczyść tokeny, ponieważ mogą być nieprawidłowe
        await clearTokens();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, [logoutTrigger]);

  const toggleTheme = useCallback(() => {
    setIsDarkMode(!isDarkMode);
  }, [isDarkMode]);

  const headerRight = useCallback(() => {
    return (
      <Switch
        value={isDarkMode}
        onValueChange={toggleTheme}
        color={
          isDarkMode
            ? darkTheme.darkColors?.secondary
            : lightTheme.lightColors?.primary
        }
        style={{ marginRight: 10 }}
      />
    );
  }, [isDarkMode]);

  const getHeaderStyle = useCallback(
    () => ({
      backgroundColor: isDarkMode
        ? darkTheme.darkColors?.secondary
        : lightTheme.lightColors?.primary,
    }),
    [isDarkMode]
  );

  const handleAuthSuccess = useCallback(() => {
    console.log('Logowanie udane, ustawianie stanu autoryzacji na true');
    setIsUserAuthenticated(true);
  }, []);

  const handleLogoutSuccess = useCallback(async () => {
    console.log('Wylogowywanie, czyszczenie tokenów i resetowanie stanu');
    // Najpierw wyczyść tokeny, aby upewnić się, że użytkownik zostanie wylogowany
    try {
      await clearTokens();
    } catch (error) {
      console.error('Błąd podczas czyszczenia tokenów:', error);
    }

    // Następnie zaktualizuj stan aplikacji
    setLogoutTrigger((prev) => prev + 1);
    setIsUserAuthenticated(false);
  }, []);

  // Pokaż loader podczas sprawdzania stanu autoryzacji
  if (isLoading) {
    return (
      <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
        <View style={styles.loaderContainer}>
          <Text>Ładowanie...</Text>
        </View>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
      <NavigationContainer>
        <AppNavigator
          isUserAuthenticated={!!isUserAuthenticated} // Konwersja do boolean dla pewności
          isDarkMode={isDarkMode}
          getHeaderStyle={getHeaderStyle}
          headerRight={headerRight}
          handleAuthSuccess={handleAuthSuccess}
        />
      </NavigationContainer>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
