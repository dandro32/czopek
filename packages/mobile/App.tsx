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

// Konfiguracja API URL w zależności od platformy
const API_URL =
  Platform.select({
    ios: 'http://localhost:8000',
    android: 'http://10.0.2.2:8000', // Standardowy adres hosta dla emulatora Android
  }) || 'http://localhost:8000';

type RootStackParamList = {
  Home: undefined;
  TodoList: undefined;
  AddTask: undefined;
};

type Props = {
  navigation: any;
};

function HomeScreen({ navigation }: Props) {
  const [prompt, setPrompt] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isWhisperModalVisible, setIsWhisperModalVisible] = useState(false);
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
      <Text h2 style={{ color: theme.colors.primary }}>
        Lista zadań
      </Text>
    </View>
  );
}

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);

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

  return (
    <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
      <NavigationContainer>
        <Stack.Navigator>
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
});
