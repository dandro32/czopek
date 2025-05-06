import React, { useCallback } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Icon } from '@rneui/themed';
import { HomeScreen } from '../screens/HomeScreen';
import { TodoListScreen } from '../screens/TodoListScreen';
import { TaskDetailScreen } from '../screens/TaskDetailScreen';
import { AddTaskScreen } from '../components/AddTaskScreen';
import { LoginScreen } from '../components/LoginScreen';
import { RegisterScreen } from '../components/RegisterScreen';
import { RootStackParamList } from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();

interface AppNavigatorProps {
  isUserAuthenticated: boolean;
  isDarkMode: boolean;
  getHeaderStyle: () => object;
  headerRight: () => React.ReactNode;
  handleAuthSuccess: () => void;
}

export function AppNavigator({
  isUserAuthenticated,
  isDarkMode,
  getHeaderStyle,
  headerRight,
  handleAuthSuccess,
}: AppNavigatorProps) {
  const navigateToHome = useCallback((navigation: any) => {
    navigation.navigate('Home');
  }, []);

  return (
    <Stack.Navigator
      screenListeners={{
        state: (e: any) => {
          const routes = e.data.state.routes;
          if (routes && routes.length > 0 && routes[0].params) {
            const params = routes[0].params;
            if (params.logoutSuccess) {
              // handleLogoutSuccess z App.tsx będzie obsługiwane w komponencie App
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
          <Stack.Screen
            name="TaskDetail"
            component={TaskDetailScreen}
            options={({ navigation }) => ({
              title: 'Szczegóły zadania',
              headerStyle: getHeaderStyle(),
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
              headerRight,
              headerLeft: () => (
                <Icon
                  name="arrow-back"
                  type="material"
                  color="#fff"
                  size={28}
                  containerStyle={{ marginLeft: 10 }}
                  onPress={() => navigation.goBack()}
                />
              ),
            })}
          />
          <Stack.Screen
            name="EditTask"
            component={AddTaskScreen}
            options={({ navigation, route }) => ({
              title: 'Edytuj zadanie',
              headerStyle: getHeaderStyle(),
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
              headerRight,
              headerLeft: () => (
                <Icon
                  name="arrow-back"
                  type="material"
                  color="#fff"
                  size={28}
                  containerStyle={{ marginLeft: 10 }}
                  onPress={() => navigation.goBack()}
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
  );
}
