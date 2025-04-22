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
  ScrollView,
} from 'react-native';
import { Text, Button, useTheme } from '@rneui/themed';
import { register, RegisterData, login } from '../services/auth';

type Props = {
  navigation: any;
  onRegisterSuccess: () => void;
};

export function RegisterScreen({ navigation, onRegisterSuccess }: Props) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { theme } = useTheme();

  const handleRegister = async () => {
    if (
      !username.trim() ||
      !email.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      Alert.alert('Błąd', 'Wypełnij wszystkie pola');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Błąd', 'Hasła nie są zgodne');
      return;
    }

    // Proste sprawdzanie formatu email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Błąd', 'Wprowadź prawidłowy adres email');
      return;
    }

    const registerData: RegisterData = {
      username: username.trim(),
      email: email.trim(),
      password,
    };

    setIsLoading(true);
    try {
      await register(registerData);

      // Po udanej rejestracji próbujemy od razu zalogować użytkownika
      await login({
        username: username.trim(),
        password,
      });

      Alert.alert('Sukces', 'Konto zostało pomyślnie utworzone', [
        { text: 'OK', onPress: onRegisterSuccess },
      ]);
    } catch (error: any) {
      console.error('Błąd rejestracji:', error);
      Alert.alert(
        'Błąd rejestracji',
        error.message || 'Wystąpił błąd podczas rejestracji. Spróbuj ponownie.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login');
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
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formContainer}>
          <Text h2 style={[styles.title, { color: theme.colors.primary }]}>
            Rejestracja
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
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
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
              placeholder="Wpisz adres email"
              placeholderTextColor={theme.colors.grey3}
              keyboardType="email-address"
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

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.grey1 }]}>
              Potwierdź hasło
            </Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
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
              placeholder="Potwierdź hasło"
              placeholderTextColor={theme.colors.grey3}
              secureTextEntry={true}
            />
          </View>

          <Button
            title={isLoading ? '' : 'Zarejestruj się'}
            icon={isLoading ? { name: '', type: 'material' } : undefined}
            buttonStyle={[
              styles.registerButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={handleRegister}
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

          <View style={styles.loginContainer}>
            <Text style={{ color: theme.colors.grey1 }}>Masz już konto?</Text>
            <TouchableOpacity onPress={navigateToLogin}>
              <Text style={[styles.loginLink, { color: theme.colors.primary }]}>
                Zaloguj się
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  formContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 15,
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
  registerButton: {
    borderRadius: 10,
    paddingVertical: 15,
    marginTop: 20,
    marginBottom: 20,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  loginLink: {
    marginLeft: 5,
    fontWeight: 'bold',
  },
  loader: {
    position: 'absolute',
  },
});
