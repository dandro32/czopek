import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text, Button, useTheme } from '@rneui/themed';
import { login, LoginData } from '../services/auth';

type Props = {
  navigation: any;
  onLoginSuccess: () => void;
};

export function LoginScreen({ navigation, onLoginSuccess }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { theme } = useTheme();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Błąd', 'Wprowadź nazwę użytkownika i hasło');
      return;
    }

    const loginData: LoginData = {
      username: username.trim(),
      password,
    };

    setIsLoading(true);
    try {
      await login(loginData);
      onLoginSuccess();
    } catch (error) {
      console.error('Błąd logowania:', error);
      Alert.alert(
        'Błąd logowania',
        'Nieprawidłowa nazwa użytkownika lub hasło. Spróbuj ponownie.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToRegister = () => {
    navigation.navigate('Register');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[
        styles.container,
        {
          backgroundColor:
            theme.mode === 'dark' ? theme.colors.black : theme.colors.white,
        },
      ]}
    >
      <View style={styles.formContainer}>
        <Text h2 style={[styles.title, { color: theme.colors.primary }]}>
          Logowanie
        </Text>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.grey1 }]}>
            Nazwa użytkownika
          </Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            style={[
              styles.input,
              {
                color:
                  theme.mode === 'dark'
                    ? theme.colors.white
                    : theme.colors.black,
                borderColor: theme.colors.grey3,
                backgroundColor:
                  theme.mode === 'dark'
                    ? theme.colors.grey0
                    : theme.colors.white,
              },
            ]}
            placeholder="Wpisz nazwę użytkownika"
            placeholderTextColor={theme.colors.grey3}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.grey1 }]}>
            Hasło
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            style={[
              styles.input,
              {
                color:
                  theme.mode === 'dark'
                    ? theme.colors.white
                    : theme.colors.black,
                borderColor: theme.colors.grey3,
                backgroundColor:
                  theme.mode === 'dark'
                    ? theme.colors.grey0
                    : theme.colors.white,
              },
            ]}
            placeholder="Wpisz hasło"
            placeholderTextColor={theme.colors.grey3}
            secureTextEntry={true}
          />
        </View>

        <Button
          title={isLoading ? '' : 'Zaloguj się'}
          icon={isLoading ? { name: '', type: 'material' } : undefined}
          buttonStyle={[
            styles.loginButton,
            { backgroundColor: theme.colors.primary },
          ]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading && (
            <ActivityIndicator
              size="small"
              color={theme.colors.white}
              style={styles.loader}
            />
          )}
        </Button>

        <View style={styles.registerContainer}>
          <Text style={{ color: theme.colors.grey1 }}>
            Nie masz jeszcze konta?
          </Text>
          <TouchableOpacity onPress={navigateToRegister}>
            <Text
              style={[styles.registerLink, { color: theme.colors.primary }]}
            >
              Zarejestruj się
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  formContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 40,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
  },
  loginButton: {
    borderRadius: 10,
    paddingVertical: 15,
    marginTop: 20,
    marginBottom: 20,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  registerLink: {
    marginLeft: 5,
    fontWeight: 'bold',
  },
  loader: {
    position: 'absolute',
  },
});
