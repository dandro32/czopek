import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, TextInput } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  ThemeProvider,
  Text,
  Button,
  Icon,
  Switch,
  useTheme,
} from '@rneui/themed';
import { useState, useCallback } from 'react';
import { lightTheme, darkTheme } from './src/theme';

type RootStackParamList = {
  Home: undefined;
  TodoList: undefined;
};

type Props = {
  navigation: any;
};

function HomeScreen({ navigation }: Props) {
  const [prompt, setPrompt] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const { theme } = useTheme();

  const handleVoiceRecord = () => {
    setIsRecording(!isRecording);
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
          <Icon
            name={isRecording ? 'mic-off' : 'mic'}
            type="material"
            color={isRecording ? theme.colors.error : theme.colors.primary}
            onPress={handleVoiceRecord}
            containerStyle={styles.inputIcon}
          />
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
          onPress={() => {}}
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
    paddingRight: 50,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputIcon: {
    position: 'absolute',
    right: 10,
    top: 10,
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
