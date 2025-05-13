import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Text, Button, Icon, useTheme } from '@rneui/themed';
import { useFocusEffect } from '@react-navigation/native';
import { Task, NavigationProps } from '../types';
import { API_URL, authHeader, refreshToken } from '../services/auth';

type TaskDetailProps = NavigationProps & {
  route: { params: { task: Task; refresh?: boolean } };
};

export function TaskDetailScreen({ route, navigation }: TaskDetailProps) {
  const initialTaskId = route.params?.task?.id;
  const [task, setTask] = useState<Task | undefined>(route.params?.task);
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  const fetchTaskDetails = useCallback(async () => {
    if (!initialTaskId) {
      Alert.alert('Błąd', 'Nie można załadować szczegółów zadania - brak ID.');
      setTask(undefined);
      return;
    }

    console.log(
      `[TaskDetailScreen] Odświeżanie danych dla zadania ID: ${initialTaskId}`
    );
    setIsFetchingDetails(true);
    try {
      const headers = await authHeader();
      const response = await fetch(`${API_URL}/tasks/${initialTaskId}`, {
        method: 'GET',
        headers: headers,
      });

      if (response.status === 401) {
        const newTokens = await refreshToken();
        if (newTokens) {
          const newHeaders = {
            Authorization: `Bearer ${newTokens.access_token}`,
          };
          const retryResponse = await fetch(
            `${API_URL}/tasks/${initialTaskId}`,
            {
              method: 'GET',
              headers: newHeaders,
            }
          );
          if (retryResponse.ok) {
            const updatedTaskData = await retryResponse.json();
            setTask(updatedTaskData);
          } else {
            throw new Error(
              `Błąd pobierania zadania po odświeżeniu tokena: ${retryResponse.status}`
            );
          }
        } else {
          throw new Error('Nie udało się odświeżyć tokena.');
        }
      } else if (response.ok) {
        const updatedTaskData = await response.json();
        setTask(updatedTaskData);
      } else {
        throw new Error(`Błąd pobierania zadania: ${response.status}`);
      }
    } catch (error) {
      console.error(
        '[TaskDetailScreen] Błąd podczas pobierania szczegółów zadania:',
        error
      );
      Alert.alert('Błąd', 'Nie udało się załadować aktualnych danych zadania.');
    } finally {
      setIsFetchingDetails(false);
    }
  }, [initialTaskId]);

  useFocusEffect(
    useCallback(() => {
      fetchTaskDetails();
      return () => {};
    }, [fetchTaskDetails])
  );

  if (
    (isFetchingDetails && (!task || task.id !== initialTaskId)) ||
    (!task && initialTaskId)
  ) {
    return (
      <View style={styles.centeredLoading}>
        <ActivityIndicator size="large" />
        <Text>Ładowanie danych zadania...</Text>
      </View>
    );
  }

  if (!initialTaskId) {
    return (
      <View style={styles.centeredLoading}>
        <Text>Nie można wyświetlić zadania. Brak ID zadania.</Text>
        <Button title="Wróć" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.centeredLoading}>
        <Text>
          Wystąpił błąd podczas ładowania danych zadania. Spróbuj ponownie.
        </Text>
        <Button title="Odśwież" onPress={fetchTaskDetails} />
        <Button title="Wróć" onPress={() => navigation.goBack()} />
      </View>
    );
  }

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

      const newStatus = task.status === 'completed' ? 'pending' : 'completed';

      const headers = await authHeader();
      const response = await fetch(`${API_URL}/tasks/${task!.id}`, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorStatus = response.status;

        if (errorStatus === 401) {
          const newTokens = await refreshToken();

          if (newTokens) {
            const newHeaders = {
              Authorization: `Bearer ${newTokens.access_token}`,
              'Content-Type': 'application/json',
            };

            const retryResponse = await fetch(`${API_URL}/tasks/${task!.id}`, {
              method: 'PUT',
              headers: newHeaders,
              body: JSON.stringify({ status: newStatus }),
            });

            if (retryResponse.ok) {
              const updatedTask = await retryResponse.json();
              setTask(updatedTask);
              navigation.navigate('TodoList', { refresh: true });
              return;
            }
          }
        }

        throw new Error(`Błąd aktualizacji zadania: ${errorStatus}`);
      }

      const updatedTask = await response.json();
      setTask(updatedTask);

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
  centeredLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
