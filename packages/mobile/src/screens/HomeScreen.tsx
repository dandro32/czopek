import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, Alert } from 'react-native';
import { Text, Button, Icon, useTheme } from '@rneui/themed';
import { RecordingModal } from '../components/RecordingModal';
import Voice from '@react-native-voice/voice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser, logout, User, API_URL } from '../services/auth';

type Props = {
  navigation: any;
};

export function HomeScreen({ navigation }: Props) {
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
    </View>
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
});
