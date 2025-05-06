import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Icon, useTheme } from '@rneui/themed';
import { API_URL, authHeader, refreshToken } from '../services/auth';
import { Task, NavigationProps } from '../types';
import { TaskCard } from '../components/TaskCard';

export function TodoListScreen({ navigation }: NavigationProps) {
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
        <ScrollView showsVerticalScrollIndicator={false}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onPress={() => navigation.navigate('TaskDetail', { task })}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
});
