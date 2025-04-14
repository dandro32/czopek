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

  const handleVoiceRecord = () => {
    setIsRecording(!isRecording);
  };

  return (
    <View style={styles.container}>
      <Text h1 style={styles.title}>
        Czopek - mój cudowny asystent
      </Text>

      <View style={styles.inputContainer}>
        <Input
          placeholder="Wpisz wiadomość do asystenta..."
          value={prompt}
          onChangeText={setPrompt}
          multiline
          numberOfLines={3}
          rightIcon={
            <Icon
              name={isRecording ? 'mic-off' : 'mic'}
              type="material"
              color={isRecording ? '#ff0000' : '#6200ee'}
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
            color: 'white',
          }}
          buttonStyle={styles.button}
          onPress={() => {}}
        />

        <Button
          title="Lista zadań"
          icon={{
            name: 'list',
            type: 'material',
            color: 'white',
          }}
          buttonStyle={[styles.button, styles.listButton]}
          onPress={() => navigation.navigate('TodoList')}
        />
      </View>
      <StatusBar style="auto" />
    </View>
  );
}

function TodoListScreen() {
  return (
    <View style={styles.container}>
      <Text h2>Lista zadań</Text>
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
        color={isDarkMode ? '#80cbc4' : '#2196f3'}
        style={{ marginRight: 10 }}
      />
    );
  }, [isDarkMode, toggleTheme]);

  return (
    <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{
              title: 'Czopek',
              headerStyle: {
                backgroundColor: isDarkMode ? '#80cbc4' : '#2196f3',
              },
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
              headerStyle: {
                backgroundColor: isDarkMode ? '#80cbc4' : '#2196f3',
              },
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
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    textAlign: 'center',
    color: '#6200ee',
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
    backgroundColor: '#6200ee',
    borderRadius: 10,
    paddingVertical: 15,
  },
  listButton: {
    backgroundColor: '#03dac6',
  },
});
