import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  ThemeProvider,
  Text,
  Input,
  Button,
  Icon,
  Switch,
  useTheme,
} from '@rneui/themed';
import { useState, useCallback } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { lightTheme, darkTheme } from './src/theme';

type RootStackParamList = {
  Home: undefined;
  TodoList: undefined;
};

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
type TodoListScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'TodoList'
>;

const Stack = createNativeStackNavigator<RootStackParamList>();

function HomeScreen({ navigation }: HomeScreenProps) {
  const [prompt, setPrompt] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const { theme } = useTheme();

  const handleVoiceRecord = () => {
    setIsRecording(!isRecording);
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
        <Input
          placeholder="Wpisz wiadomość do asystenta..."
          value={prompt}
          onChangeText={setPrompt}
          multiline
          numberOfLines={3}
          style={{
            color:
              theme.mode === 'dark' ? theme.colors.white : theme.colors.black,
          }}
          inputStyle={{
            color:
              theme.mode === 'dark' ? theme.colors.white : theme.colors.black,
          }}
          placeholderTextColor={theme.colors.grey3}
          rightIcon={
            <Icon
              name={isRecording ? 'mic-off' : 'mic'}
              type="material"
              color={isRecording ? theme.colors.error : theme.colors.primary}
              onPress={handleVoiceRecord}
            />
          }
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

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);

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

  return (
    <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{
              title: 'Czopek',
              headerStyle: getHeaderStyle(),
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
              headerRight,
            }}
          />
          <Stack.Screen
            name="TodoList"
            component={TodoListScreen}
            options={{
              title: 'Lista zadań',
              headerStyle: getHeaderStyle(),
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
              headerRight,
            }}
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
  buttonContainer: {
    gap: 15,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 15,
  },
});
