import React, { memo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text, Icon, useTheme } from '@rneui/themed';
import { Task } from '../types';

interface TaskCardProps {
  task: Task;
  onPress: () => void;
}

// Funkcja zwracająca kolor priorytetu
const getPriorityColor = (priority?: string, theme?: any) => {
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

export const TaskCard = memo(({ task, onPress }: TaskCardProps) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View
        style={[
          styles.card,
          {
            backgroundColor:
              theme.mode === 'dark' ? theme.colors.grey0 : theme.colors.white,
            borderColor:
              theme.mode === 'dark'
                ? 'rgba(255,255,255,0.1)'
                : 'rgba(0,0,0,0.05)',
          },
        ]}
      >
        {/* Pasek priorytetu */}
        <View
          style={[
            styles.priorityBar,
            { backgroundColor: getPriorityColor(task.priority, theme) },
          ]}
        />

        <View style={styles.cardContent}>
          {/* Tytuł i status */}
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.title,
                {
                  color:
                    theme.mode === 'dark'
                      ? theme.colors.white
                      : theme.colors.black,
                },
              ]}
            >
              {task.title}
            </Text>
            {task.status && (
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
            )}
          </View>

          {/* Opis */}
          {task.description && (
            <Text
              style={[
                styles.description,
                {
                  color:
                    theme.mode === 'dark'
                      ? theme.colors.grey3
                      : theme.colors.grey2,
                },
              ]}
              numberOfLines={2}
            >
              {task.description}
            </Text>
          )}

          {/* Stopka - data, priorytet */}
          <View style={styles.footer}>
            {/* Data */}
            {formatDate(task.due_date) && (
              <View style={styles.dateContainer}>
                <Icon
                  name="event"
                  type="material"
                  size={14}
                  color={
                    theme.mode === 'dark'
                      ? theme.colors.grey3
                      : theme.colors.grey2
                  }
                />
                <Text
                  style={[
                    styles.dateText,
                    {
                      color:
                        theme.mode === 'dark'
                          ? theme.colors.grey3
                          : theme.colors.grey2,
                    },
                  ]}
                >
                  {formatDate(task.due_date)}
                </Text>
              </View>
            )}

            {/* Priorytet */}
            <Text
              style={[
                styles.priority,
                { color: getPriorityColor(task.priority, theme) },
              ]}
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
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 5,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  priorityBar: {
    width: 6,
    height: '100%',
  },
  cardContent: {
    flex: 1,
    padding: 15,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    marginLeft: 4,
  },
  priority: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});
