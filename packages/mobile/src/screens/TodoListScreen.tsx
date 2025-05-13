import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Alert,
  TouchableHighlight,
} from 'react-native';
import { Text, Button, Icon, useTheme } from '@rneui/themed';
import { NavigationProps } from '../types';
import { TaskCard } from '../components/TaskCard';
import { SwipeListView } from 'react-native-swipe-list-view';
import {
  fetchTasks,
  toggleTaskStatus as toggleTaskStatusService,
  Task,
} from '../services/tasks';

export function TodoListScreen({ navigation, route }: NavigationProps) {
  const { theme } = useTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchTasksData();
  }, []);

  // Dodatkowy efekt dla odświeżania po zmianie statusu zadania
  useEffect(() => {
    if (route?.params?.refresh) {
      fetchTasksData();
      // Resetujemy parametr refresh, aby uniknąć wielokrotnego odświeżania
      navigation.setParams({ refresh: undefined });
    }
  }, [route?.params?.refresh]);

  const fetchTasksData = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('Pobieranie listy zadań...');
      const data = await fetchTasks();

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

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    try {
      // Używamy serwisu toggleTaskStatusService, który aktualizuje status zadania
      // poprzez standardowe API PUT /tasks/{id} z nowym statusem
      const updatedTask = await toggleTaskStatusService(taskId, currentStatus);
      // Aktualizacja stanu zadań
      updateTaskInList(updatedTask);
    } catch (error) {
      console.error('Błąd podczas aktualizacji statusu zadania:', error);
      Alert.alert(
        'Błąd',
        'Nie udało się zaktualizować statusu zadania. Sprawdź połączenie z internetem.'
      );
    }
  };

  // Funkcja do aktualizacji zadania w liście
  const updateTaskInList = (updatedTask: Task) => {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === updatedTask.id ? updatedTask : task
      )
    );
  };

  // Renderowanie ukrytych akcji dla każdego elementu listy
  const renderHiddenItem = (data: { item: Task }) => (
    <View style={styles.rowBack}>
      <TouchableHighlight
        style={[
          styles.backRightBtn,
          styles.backRightBtnRight,
          {
            backgroundColor:
              data.item.status === 'completed'
                ? theme.colors.warning
                : theme.colors.success,
          },
        ]}
        onPress={() => toggleTaskStatus(data.item.id, data.item.status)}
      >
        <Icon
          name={data.item.status === 'completed' ? 'refresh' : 'check'}
          type="material"
          color={theme.colors.white}
          size={25}
        />
      </TouchableHighlight>
    </View>
  );

  // Renderowanie każdego elementu listy
  const renderItem = (data: { item: Task }) => (
    <TaskCard
      task={data.item}
      onPress={() => navigation.navigate('TaskDetail', { task: data.item })}
    />
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchTasksData().then(() => setIsRefreshing(false));
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

      {loading && !isRefreshing ? (
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
            onPress={fetchTasksData}
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
        <SwipeListView
          data={tasks}
          renderItem={renderItem}
          renderHiddenItem={renderHiddenItem}
          rightOpenValue={-75}
          previewRowKey={tasks.length > 0 ? tasks[0].id.toString() : '0'}
          previewOpenValue={-40}
          previewOpenDelay={1000}
          showsVerticalScrollIndicator={false}
          keyExtractor={(item) => item.id.toString()}
          onRefresh={onRefresh}
          refreshing={isRefreshing}
          closeOnRowOpen={true}
          disableRightSwipe={true}
          friction={8}
          tension={80}
          swipeToOpenPercent={30}
        />
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
  rowBack: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 15,
  },
  backRightBtn: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    width: 75,
    borderRadius: 10,
    marginVertical: 5,
  },
  backRightBtnRight: {
    right: 0,
  },
});
