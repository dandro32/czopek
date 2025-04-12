import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface TodoProps {
  title: string;
  completed: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

export const Todo = ({ title, completed, onToggle, onDelete }: TodoProps) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onToggle} style={styles.todoContent}>
        <View style={[styles.checkbox, completed && styles.checked]} />
        <Text style={[styles.title, completed && styles.completedTitle]}>
          {title}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
        <Text style={styles.deleteText}>Usuń</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginVertical: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  todoContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6200ee',
    marginRight: 10,
  },
  checked: {
    backgroundColor: '#6200ee',
  },
  title: {
    fontSize: 16,
    color: '#000',
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: '#666',
  },
  deleteButton: {
    padding: 8,
    backgroundColor: '#ff5252',
    borderRadius: 5,
  },
  deleteText: {
    color: '#fff',
    fontSize: 14,
  },
});
