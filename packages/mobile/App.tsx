import React from 'react';
import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, TextInput, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Voice from '@react-native-voice/voice';
import {
  ThemeProvider,
  Text,
  Button,
  Icon,
  Switch,
  useTheme,
} from '@rneui/themed';
import { useState, useCallback, useEffect } from 'react';
import { lightTheme, darkTheme } from './src/theme';
import { RecordingModal } from './src/components/RecordingModal';
import { AddTaskScreen } from './src/components/AddTaskScreen';
import { LoginScreen } from './src/components/LoginScreen';
import { RegisterScreen } from './src/components/RegisterScreen';
import {
  isAuthenticated as checkAuth,
  authHeader,
  API_URL,
  getCurrentUser,
  logout,
  User,
  refreshToken,
} from './src/services/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Definicja typów zadań
interface Task {
  id: number;
  title: string;
  description?: string;
  due_date?: string;
  priority?: string;
  status?: string;
}

// Definicja parametrów dla nawigacji
type RootStackParamList = {
  Home: undefined;
  TodoList: undefined;
  AddTask: undefined;
  Login: undefined;
  Register: undefined;
};

type Props = {
  navigation: any;
};

function HomeScreen({ navigation }: Props) {
  const [prompt, setPrompt] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isWhisperModalVisible, setIsWhisperModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const voiceStartHandler = () => {
      console.log('Rozpoczęto nagrywanie');
      setIsRecording(true);
    };
    const voiceEndHandler = () => {
      console.log('Zakończono nagrywanie');
      setIsRecording(false);
    };
    const voiceResultsHandler = (e: any) => {
      console.log('Otrzymano wyniki:', e.value);
      if (e.value && e.value[0]) {
        console.log('Ustawiam tekst:', e.value[0]);
        setPrompt(e.value[0]);
      }
    };
    const voiceErrorHandler = (e: any) => {
      console.error('Błąd rozpoznawania mowy:', e);
      setIsRecording(false);
    };

    Voice.onSpeechStart = voiceStartHandler;
    Voice.onSpeechEnd = voiceEndHandler;
    Voice.onSpeechResults = voiceResultsHandler;
    Voice.onSpeechError = voiceErrorHandler;

    return () => {
      Voice.destroy().then(() => {
        Voice.removeAllListeners();
      });
    };
  }, []);

  useEffect(() => {
    // Pobierz dane użytkownika przy montowaniu komponentu
    const fetchUserData = async () => {
      try {
        const userData = await getCurrentUser();
        console.log('Pobrano dane użytkownika:', userData);
        setCurrentUser(userData);

        // Jeśli nie ma danych użytkownika, spróbuj pobrać token i wyświetlić go do debugowania
        if (!userData) {
          const token = await AsyncStorage.getItem('@auth_token');
          console.log(
            'Token autoryzacji:',
            token ? token.substring(0, 20) + '...' : 'brak'
          );
        }
      } catch (error) {
        console.error('Błąd podczas pobierania danych użytkownika:', error);
      }
    };

    fetchUserData();
  }, []);

  const handleVoiceRecord = async () => {
    try {
      if (isRecording) {
        console.log('Zatrzymuję nagrywanie');
        await Voice.stop();
      } else {
        console.log('Rozpoczynam nagrywanie');
        await Voice.start('pl-PL');
      }
    } catch (error) {
      console.error('Błąd podczas obsługi nagrywania:', error);
      setIsRecording(false);
    }
  };

  const handleWhisperRecord = async (audioUri: string) => {
    try {
      console.log(`Rozpoczynam przetwarzanie nagrania z URI: ${audioUri}`);

      const formData = new FormData();
      formData.append('file', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      } as any);

      const apiUrl = `${API_URL}/whisper/transcribe`;
      console.log(`Wysyłanie nagrania do: ${apiUrl}`);
      console.log('FormData:', JSON.stringify(formData));

      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }).catch((error) => {
        console.error('Błąd fetch:', error);
        throw error;
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Błąd serwera: ${response.status} - ${errorText}`);
        throw new Error(`Błąd serwera: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      if (data.text) {
        setPrompt(data.text);
      } else if (data.error) {
        console.error('Błąd odpowiedzi API:', data.error);
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Błąd podczas wysyłania nagrania:', error);

      // Sprawdź, czy backend działa - prosta pingowa metoda
      try {
        const healthCheck = await fetch(`${API_URL}/health`).catch((e) => {
          console.error('Błąd health check:', e);
          return null;
        });
        console.log(
          'Health check status:',
          healthCheck ? healthCheck.status : 'failed'
        );
      } catch (healthError) {
        console.error('Błąd podczas sprawdzania health:', healthError);
      }

      alert(
        'Nie udało się przetworzyć nagrania. Sprawdź połączenie sieciowe i upewnij się, że serwer backend jest uruchomiony.'
      );
    } finally {
      setIsWhisperModalVisible(false);
    }
  };

  const handleSendMessage = () => {
    if (prompt.trim()) {
      console.log('Wysyłanie wiadomości:', prompt);
      setPrompt('');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      // Wywołanie funkcji aktualizującej stan w głównym komponencie
      if (navigation.getParent()) {
        navigation.getParent().setParams({
          logoutSuccess: true,
          logoutTimestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error('Błąd podczas wylogowywania:', error);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor:
            theme.mode === 'dark' ? theme.colors.black : theme.colors.white,
        },
      ]}
    >
      <View
        style={[
          styles.userInfoContainer,
          {
            backgroundColor:
              theme.mode === 'dark' ? theme.colors.grey0 : theme.colors.grey5,
            borderBottomColor:
              theme.mode === 'dark' ? theme.colors.grey3 : theme.colors.grey4,
          },
        ]}
      >
        <View style={styles.userDetailContainer}>
          <Text
            style={[
              styles.welcomeText,
              {
                color:
                  theme.mode === 'dark'
                    ? theme.colors.white
                    : theme.colors.black,
              },
            ]}
          >
            Witaj,
          </Text>
          <Text
            style={[
              styles.usernameText,
              {
                color:
                  theme.mode === 'dark'
                    ? theme.colors.primary
                    : theme.colors.primary,
              },
            ]}
          >
            {currentUser ? currentUser.username : 'Użytkownik'}
          </Text>
        </View>
        <Button
          title="Wyloguj"
          type="solid"
          buttonStyle={{
            backgroundColor:
              theme.mode === 'dark' ? theme.colors.error : theme.colors.error,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 5,
          }}
          titleStyle={{ color: 'white', fontSize: 14 }}
          onPress={handleLogout}
        />
      </View>

      <Text h1 style={[styles.title, { color: theme.colors.primary }]}>
        Czopek - mój cudowny asystent
      </Text>

      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            placeholder="Wpisz wiadomość do asystenta..."
            value={prompt}
            onChangeText={setPrompt}
            multiline
            numberOfLines={3}
            style={[
              styles.input,
              {
                color:
                  theme.mode === 'dark'
                    ? theme.colors.white
                    : theme.colors.black,
                borderColor: theme.colors.grey3,
              },
            ]}
            placeholderTextColor={theme.colors.grey3}
          />
          <View style={styles.inputIcons}>
            <Icon
              name={isRecording ? 'mic-off' : 'mic'}
              type="material"
              color={isRecording ? theme.colors.error : theme.colors.primary}
              onPress={handleVoiceRecord}
              containerStyle={styles.icon}
            />
            <Icon
              name="record-voice-over"
              type="material"
              color={theme.colors.secondary}
              onPress={() => setIsWhisperModalVisible(true)}
              containerStyle={styles.icon}
            />
          </View>
        </View>
        <Button
          title="Wyślij"
          icon={{
            name: 'send',
            type: 'material',
            color: theme.colors.white,
            size: 20,
          }}
          iconRight
          buttonStyle={[
            styles.sendButton,
            {
              backgroundColor: prompt.trim()
                ? theme.colors.primary
                : theme.colors.grey3,
            },
          ]}
          onPress={handleSendMessage}
          disabled={!prompt.trim()}
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Nagraj polecenie"
          icon={{
            name: 'record-voice-over',
            type: 'material',
            color: theme.colors.white,
          }}
          buttonStyle={[
            styles.button,
            { backgroundColor: theme.colors.success },
          ]}
          onPress={() => setIsWhisperModalVisible(true)}
        />

        <Button
          title="Dodaj zadanie"
          icon={{
            name: 'add-task',
            type: 'material',
            color: theme.colors.white,
          }}
          buttonStyle={[
            styles.button,
            { backgroundColor: theme.colors.primary },
          ]}
          onPress={() => navigation.navigate('AddTask')}
        />

        <Button
          title="Lista zadań"
          icon={{
            name: 'list',
            type: 'material',
            color: theme.colors.white,
          }}
          buttonStyle={[
            styles.button,
            { backgroundColor: theme.colors.secondary },
          ]}
          onPress={() => navigation.navigate('TodoList')}
        />
      </View>

      <RecordingModal
        isVisible={isWhisperModalVisible}
        onClose={() => setIsWhisperModalVisible(false)}
        onSend={handleWhisperRecord}
      />

      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
    </View>
  );
}

function TodoListScreen() {
  const { theme } = useTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError('');

      // Pobierz token autoryzacyjny
      const headers = await authHeader();
      console.log('Próba pobrania zadań. Nagłówki:', headers);

      const response = await fetch(`${API_URL}/tasks`, {
        method: 'GET',
        headers: headers,
      });

      if (!response.ok) {
        const errorStatus = response.status;
        const errorText = await response.text();
        console.error('Błąd odpowiedzi:', errorStatus, errorText);

        // Próba odświeżenia tokena jeśli status to 401 (Unauthorized)
        if (errorStatus === 401) {
          console.log('Token wygasł, próba odświeżenia...');
          const newTokens = await refreshToken();

          if (newTokens) {
            console.log('Token odświeżony, ponowna próba pobrania zadań');
            // Próba ponownego pobrania z nowym tokenem
            const newHeaders = {
              Authorization: `Bearer ${newTokens.access_token}`,
            };

            const retryResponse = await fetch(`${API_URL}/tasks`, {
              method: 'GET',
              headers: newHeaders,
            });

            if (retryResponse.ok) {
              const data = await retryResponse.json();
              console.log('Pobrano zadania po odświeżeniu tokena:', data);
              setTasks(data.tasks || []);
              setLoading(false);
              return;
            } else {
              console.error(
                'Błąd po odświeżeniu tokena:',
                await retryResponse.text()
              );
            }
          }
        }

        throw new Error(`Błąd pobierania zadań: ${errorStatus}`);
      }

      const data = await response.json();
      console.log('Pobrano zadania:', data);
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Błąd podczas pobierania zadań:', error);
      setError(
        'Nie udało się pobrać listy zadań. Sprawdź połączenie z internetem.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Funkcja zwracająca kolor priorytetu
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return theme.colors.error;
      case 'medium':
        return theme.colors.warning;
      case 'low':
        return theme.colors.success;
      default:
        return theme.colors.grey2;
    }
  };

  // Funkcja formatująca datę
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch (error) {
      return null;
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor:
            theme.mode === 'dark' ? theme.colors.black : theme.colors.white,
        },
      ]}
    >
      <Text
        h3
        style={{
          color: theme.colors.primary,
          marginBottom: 20,
          textAlign: 'center',
          fontWeight: 'bold',
        }}
      >
        Moje zadania
      </Text>

      {loading ? (
        <View style={styles.centerContent}>
          <Text style={{ color: theme.colors.grey0, textAlign: 'center' }}>
            Ładowanie zadań...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Text style={{ color: theme.colors.error, textAlign: 'center' }}>
            {error}
          </Text>
          <Button
            title="Spróbuj ponownie"
            type="outline"
            buttonStyle={{ marginTop: 15, borderColor: theme.colors.primary }}
            titleStyle={{ color: theme.colors.primary }}
            onPress={fetchTasks}
            icon={{
              name: 'refresh',
              type: 'material',
              color: theme.colors.primary,
              size: 15,
            }}
          />
        </View>
      ) : tasks.length === 0 ? (
        <View style={styles.centerContent}>
          <Icon
            name="assignment-late"
            type="material"
            color={theme.colors.grey3}
            size={60}
          />
          <Text
            style={{
              color: theme.colors.grey1,
              textAlign: 'center',
              marginTop: 10,
              fontSize: 16,
            }}
          >
            Brak zadań do wyświetlenia
          </Text>
          <Text
            style={{
              color: theme.colors.grey2,
              textAlign: 'center',
              marginTop: 5,
              fontSize: 14,
            }}
          >
            Dodaj nowe zadanie aby zacząć
          </Text>
        </View>
      ) : (
        tasks.map((task) => (
          <View
            key={task.id}
            style={{
              marginVertical: 8,
              borderRadius: 12,
              overflow: 'hidden',
              backgroundColor:
                theme.mode === 'dark' ? theme.colors.grey0 : theme.colors.white,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
              borderWidth: 1,
              borderColor:
                theme.mode === 'dark'
                  ? 'rgba(255,255,255,0.05)'
                  : 'rgba(0,0,0,0.05)',
            }}
          >
            {/* Pasek priorytetu */}
            <View
              style={{
                height: 8,
                backgroundColor: getPriorityColor(task.priority),
              }}
            />

            <View style={{ padding: 16 }}>
              {/* Tytuł i status */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: 'bold',
                    color:
                      theme.mode === 'dark'
                        ? theme.colors.white
                        : theme.colors.black,
                    flex: 1,
                  }}
                >
                  {task.title}
                </Text>
                {task.status && (
                  <View
                    style={{
                      backgroundColor:
                        task.status === 'completed'
                          ? theme.colors.success
                          : theme.colors.primary,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 12,
                    }}
                  >
                    <Text
                      style={{
                        color: 'white',
                        fontSize: 12,
                        fontWeight: 'bold',
                      }}
                    >
                      {task.status === 'completed' ? 'Ukończone' : 'W trakcie'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Opis */}
              {task.description && (
                <Text
                  style={{
                    fontSize: 14,
                    color:
                      theme.mode === 'dark'
                        ? theme.colors.grey3
                        : theme.colors.grey2,
                    marginBottom: 10,
                  }}
                >
                  {task.description}
                </Text>
              )}

              {/* Stopka - data, priorytet */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginTop: 5,
                  alignItems: 'center',
                }}
              >
                {/* Data */}
                {formatDate(task.due_date) && (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon
                      name="event"
                      type="material"
                      size={14}
                      color={
                        theme.mode === 'dark'
                          ? theme.colors.grey3
                          : theme.colors.grey2
                      }
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        color:
                          theme.mode === 'dark'
                            ? theme.colors.grey3
                            : theme.colors.grey2,
                        marginLeft: 4,
                      }}
                    >
                      {formatDate(task.due_date)}
                    </Text>
                  </View>
                )}

                {/* Priorytet */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text
                    style={{
                      fontSize: 12,
                      color: getPriorityColor(task.priority),
                      fontWeight: 'bold',
                    }}
                  >
                    {task.priority === 'high'
                      ? 'Wysoki'
                      : task.priority === 'medium'
                      ? 'Średni'
                      : task.priority === 'low'
                      ? 'Niski'
                      : 'Brak'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isUserAuthenticated, setIsUserAuthenticated] = useState<
    boolean | null
  >(null);
  const [logoutTrigger, setLogoutTrigger] = useState(0);

  // Sprawdzenie, czy użytkownik jest zalogowany przy starcie aplikacji
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const isAuth = await checkAuth();
        setIsUserAuthenticated(isAuth);
      } catch (error) {
        console.error('Błąd podczas sprawdzania statusu logowania:', error);
        setIsUserAuthenticated(false);
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

  const navigateToHome = useCallback((navigation: any) => {
    navigation.navigate('Home');
    setIsMenuVisible(false);
  }, []);

  const handleAuthSuccess = useCallback(() => {
    setIsUserAuthenticated(true);
  }, []);

  const handleLogoutSuccess = useCallback(() => {
    setLogoutTrigger((prev) => prev + 1);
    setIsUserAuthenticated(false);
  }, []);

  // Pokaż loader podczas sprawdzania stanu autoryzacji
  if (isUserAuthenticated === null) {
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
        <Stack.Navigator
          screenListeners={{
            state: (e: any) => {
              const routes = e.data.state.routes;
              if (routes && routes.length > 0 && routes[0].params) {
                const params = routes[0].params;
                if (params.logoutSuccess) {
                  handleLogoutSuccess();
                }
              }
            },
          }}
        >
          {isUserAuthenticated ? (
            // Zalogowany użytkownik widzi aplikację
            <>
              <Stack.Screen
                name="Home"
                component={HomeScreen}
                options={({ navigation }) => ({
                  title: 'Czopek',
                  headerStyle: getHeaderStyle(),
                  headerTintColor: '#fff',
                  headerTitleStyle: {
                    fontWeight: 'bold',
                  },
                  headerRight,
                  headerLeft: () => (
                    <Icon
                      name="home"
                      type="material"
                      color="#fff"
                      size={28}
                      containerStyle={{ marginLeft: 10 }}
                      onPress={() => navigateToHome(navigation)}
                    />
                  ),
                })}
              />
              <Stack.Screen
                name="TodoList"
                component={TodoListScreen}
                options={({ navigation }) => ({
                  title: 'Lista zadań',
                  headerStyle: getHeaderStyle(),
                  headerTintColor: '#fff',
                  headerTitleStyle: {
                    fontWeight: 'bold',
                  },
                  headerRight,
                  headerLeft: () => (
                    <Icon
                      name="home"
                      type="material"
                      color="#fff"
                      size={28}
                      containerStyle={{ marginLeft: 10 }}
                      onPress={() => navigateToHome(navigation)}
                    />
                  ),
                })}
              />
              <Stack.Screen
                name="AddTask"
                component={AddTaskScreen}
                options={({ navigation }) => ({
                  title: 'Dodaj zadanie',
                  headerStyle: getHeaderStyle(),
                  headerTintColor: '#fff',
                  headerTitleStyle: {
                    fontWeight: 'bold',
                  },
                  headerRight,
                  headerLeft: () => (
                    <Icon
                      name="home"
                      type="material"
                      color="#fff"
                      size={28}
                      containerStyle={{ marginLeft: 10 }}
                      onPress={() => navigateToHome(navigation)}
                    />
                  ),
                })}
              />
            </>
          ) : (
            // Niezalogowany użytkownik widzi ekrany logowania i rejestracji
            <>
              <Stack.Screen
                name="Login"
                options={{
                  title: 'Logowanie',
                  headerStyle: getHeaderStyle(),
                  headerTintColor: '#fff',
                  headerTitleStyle: {
                    fontWeight: 'bold',
                  },
                }}
              >
                {(props) => (
                  <LoginScreen {...props} onLoginSuccess={handleAuthSuccess} />
                )}
              </Stack.Screen>
              <Stack.Screen
                name="Register"
                options={{
                  title: 'Rejestracja',
                  headerStyle: getHeaderStyle(),
                  headerTintColor: '#fff',
                  headerTitleStyle: {
                    fontWeight: 'bold',
                  },
                }}
              >
                {(props) => (
                  <RegisterScreen
                    {...props}
                    onRegisterSuccess={handleAuthSuccess}
                  />
                )}
              </Stack.Screen>
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 40,
    fontSize: 28,
  },
  inputContainer: {
    marginBottom: 30,
  },
  inputWrapper: {
    position: 'relative',
    width: '100%',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    paddingRight: 90,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputIcons: {
    position: 'absolute',
    right: 10,
    top: 10,
    flexDirection: 'row',
  },
  icon: {
    marginLeft: 10,
  },
  sendButton: {
    borderRadius: 10,
    paddingVertical: 12,
  },
  buttonContainer: {
    gap: 15,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 15,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  userDetailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 16,
    marginRight: 5,
  },
  usernameText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
});
