import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Icon, useTheme } from '@rneui/themed';
import { Task, NavigationProps } from '../types';

type TaskDetailProps = NavigationProps & {
  route: { params: { task: Task } };
};

export function TaskDetailScreen({ route, navigation }: TaskDetailProps) {
  const { task } = route.params;
  const { theme } = useTheme();

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
            // Tutaj można dodać obsługę edycji zadania
            alert('Funkcja edycji zadania nie jest jeszcze zaimplementowana');
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
          onPress={() => {
            // Tutaj można dodać obsługę zmiany statusu zadania
            alert(
              'Funkcja zmiany statusu zadania nie jest jeszcze zaimplementowana'
            );
          }}
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
