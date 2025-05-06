import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button, Icon, useTheme } from '@rneui/themed';
import { Task, NavigationProps } from '../types';
import { API_URL, authHeader, refreshToken } from '../services/auth';

type TaskDetailProps = NavigationProps & {
  route: { params: { task: Task } };
};

export function TaskDetailScreen({ route, navigation }: TaskDetailProps) {
  const { task: initialTask } = route.params;
  const [task, setTask] = useState<Task>(initialTask);
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);

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

  const toggleTaskStatus = async () => {
    try {
      setIsLoading(true);

      // Pobierz token autoryzacyjny
      const headers = await authHeader();

      const response = await fetch(`${API_URL}/tasks/${task.id}/toggle`, {
        method: 'PUT',
        headers: headers,
      });

      if (!response.ok) {
        const errorStatus = response.status;

        // Próba odświeżenia tokena jeśli status to 401 (Unauthorized)
        if (errorStatus === 401) {
          const newTokens = await refreshToken();

          if (newTokens) {
            // Próba ponownego wywołania z nowym tokenem
            const newHeaders = {
              Authorization: `Bearer ${newTokens.access_token}`,
            };

            const retryResponse = await fetch(
              `${API_URL}/tasks/${task.id}/toggle`,
              {
                method: 'PUT',
                headers: newHeaders,
              }
            );

            if (retryResponse.ok) {
              const updatedTask = await retryResponse.json();
              setTask(updatedTask);
              // Powrót do ekranu listy z flagą odświeżenia
              navigation.navigate('TodoList', { refresh: true });
              return;
            }
          }
        }

        throw new Error(`Błąd aktualizacji zadania: ${errorStatus}`);
      }

      const updatedTask = await response.json();
      setTask(updatedTask);

      // Powrót do ekranu listy z flagą odświeżenia
      navigation.navigate('TodoList', { refresh: true });
    } catch (error) {
      console.error('Błąd podczas aktualizacji statusu zadania:', error);
      Alert.alert(
        'Błąd',
        'Nie udało się zaktualizować statusu zadania. Sprawdź połączenie z internetem.'
      );
    } finally {
      setIsLoading(false);
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
      <View style={styles.taskDetailHeader}>
        <View
          style={[
            styles.priorityBar,
            { backgroundColor: getPriorityColor(task.priority) },
          ]}
        />
        <Text
          h4
          style={{
            color:
              theme.mode === 'dark' ? theme.colors.white : theme.colors.black,
            marginTop: 20,
            marginBottom: 10,
            textAlign: 'center',
          }}
        >
          {task.title}
        </Text>

        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  task.status === 'completed'
                    ? theme.colors.success
                    : theme.colors.primary,
              },
            ]}
          >
            <Text style={styles.statusText}>
              {task.status === 'completed' ? 'Ukończone' : 'W trakcie'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.taskDetailContent}>
        <View style={styles.detailSection}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: 'bold',
              color:
                theme.mode === 'dark' ? theme.colors.grey5 : theme.colors.grey1,
              marginBottom: 8,
            }}
          >
            Priorytet
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: getPriorityColor(task.priority),
                marginRight: 8,
              }}
            />
            <Text
              style={{
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

        {task.due_date && (
          <View style={styles.detailSection}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: 'bold',
                color:
                  theme.mode === 'dark'
                    ? theme.colors.grey5
                    : theme.colors.grey1,
                marginBottom: 8,
              }}
            >
              Termin
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon
                name="event"
                type="material"
                size={18}
                color={
                  theme.mode === 'dark'
                    ? theme.colors.grey3
                    : theme.colors.grey2
                }
              />
              <Text
                style={{
                  marginLeft: 8,
                  color:
                    theme.mode === 'dark'
                      ? theme.colors.grey3
                      : theme.colors.grey2,
                }}
              >
                {formatDate(task.due_date)}
              </Text>
            </View>
          </View>
        )}

        <View style={[styles.detailSection, { marginTop: 16 }]}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: 'bold',
              color:
                theme.mode === 'dark' ? theme.colors.grey5 : theme.colors.grey1,
              marginBottom: 8,
            }}
          >
            Opis
          </Text>
          <Text
            style={{
              color:
                theme.mode === 'dark' ? theme.colors.grey3 : theme.colors.grey2,
              lineHeight: 20,
            }}
          >
            {task.description || 'Brak opisu'}
          </Text>
        </View>
      </View>

      <View style={styles.taskDetailActions}>
        <Button
          title="Edytuj zadanie"
          icon={{
            name: 'edit',
            type: 'material',
            color: theme.colors.white,
            size: 20,
          }}
          buttonStyle={[
            styles.actionButton,
            { backgroundColor: theme.colors.primary },
          ]}
          onPress={() => {
            // Przejdź do ekranu edycji zadania
            navigation.navigate('EditTask', { task });
          }}
        />

        <Button
          title={
            task.status === 'completed'
              ? 'Oznacz jako nieukończone'
              : 'Oznacz jako ukończone'
          }
          icon={{
            name: task.status === 'completed' ? 'refresh' : 'check',
            type: 'material',
            color: theme.colors.white,
            size: 20,
          }}
          buttonStyle={[
            styles.actionButton,
            {
              backgroundColor:
                task.status === 'completed'
                  ? theme.colors.warning
                  : theme.colors.success,
            },
          ]}
          loading={isLoading}
          disabled={isLoading}
          onPress={toggleTaskStatus}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  taskDetailHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  priorityBar: {
    height: 8,
    width: '100%',
    borderRadius: 4,
  },
  statusContainer: {
    marginVertical: 10,
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  taskDetailContent: {
    backgroundColor: 'transparent',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    flex: 1,
  },
  detailSection: {
    marginBottom: 20,
  },
  taskDetailActions: {
    marginTop: 'auto',
    gap: 10,
  },
  actionButton: {
    borderRadius: 10,
    paddingVertical: 12,
  },
});
