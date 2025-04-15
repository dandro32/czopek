import { useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Platform,
  ScrollView,
} from 'react-native';
import { useTheme, Text, Button, Icon } from '@rneui/themed';

type Props = {
  navigation: any;
};

export function AddTaskScreen({ navigation }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const { theme } = useTheme();

  const handleAddTask = async () => {
    if (!title.trim()) {
      return;
    }

    try {
      const API_URL =
        Platform.select({
          ios: 'http://localhost:8000',
          android: 'http://10.0.2.2:8000',
        }) || 'http://localhost:8000';

      const response = await fetch(`${API_URL}/tasks/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          due_date: dueDate || null,
          priority,
        }),
      });

      if (!response.ok) {
        throw new Error('Wystąpił błąd podczas dodawania zadania');
      }

      navigation.navigate('TodoList');
    } catch (error) {
      console.error('Błąd dodawania zadania:', error);
    }
  };

  const priorityButtons = [
    { title: 'Niski', value: 'low', color: theme.colors.success },
    { title: 'Średni', value: 'medium', color: theme.colors.warning },
    { title: 'Wysoki', value: 'high', color: theme.colors.error },
  ];

  return (
    <ScrollView
      style={[
        styles.container,
        {
          backgroundColor:
            theme.mode === 'dark' ? theme.colors.black : theme.colors.white,
        },
      ]}
    >
      <Text h2 style={[styles.title, { color: theme.colors.primary }]}>
        Dodaj nowe zadanie
      </Text>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.colors.grey1 }]}>Tytuł</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          style={[
            styles.input,
            {
              color:
                theme.mode === 'dark' ? theme.colors.white : theme.colors.black,
              borderColor: theme.colors.grey3,
            },
          ]}
          placeholder="Wpisz tytuł zadania"
          placeholderTextColor={theme.colors.grey3}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.colors.grey1 }]}>Opis</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          style={[
            styles.textArea,
            {
              color:
                theme.mode === 'dark' ? theme.colors.white : theme.colors.black,
              borderColor: theme.colors.grey3,
            },
          ]}
          placeholder="Wpisz opis zadania"
          placeholderTextColor={theme.colors.grey3}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.colors.grey1 }]}>
          Data wykonania
        </Text>
        <TextInput
          value={dueDate}
          onChangeText={setDueDate}
          style={[
            styles.input,
            {
              color:
                theme.mode === 'dark' ? theme.colors.white : theme.colors.black,
              borderColor: theme.colors.grey3,
            },
          ]}
          placeholder="RRRR-MM-DD"
          placeholderTextColor={theme.colors.grey3}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.colors.grey1 }]}>
          Priorytet
        </Text>
        <View style={styles.priorityButtons}>
          {priorityButtons.map((btn) => (
            <Button
              key={btn.value}
              title={btn.title}
              buttonStyle={[
                styles.priorityButton,
                {
                  backgroundColor:
                    priority === btn.value ? btn.color : theme.colors.grey5,
                },
              ]}
              titleStyle={{
                color:
                  priority === btn.value
                    ? theme.colors.white
                    : theme.colors.grey1,
              }}
              onPress={() => setPriority(btn.value)}
            />
          ))}
        </View>
      </View>

      <Button
        title="Dodaj zadanie"
        icon={{
          name: 'check',
          type: 'material',
          color: theme.colors.white,
          size: 20,
        }}
        iconRight
        buttonStyle={[
          styles.addButton,
          {
            backgroundColor: title.trim()
              ? theme.colors.primary
              : theme.colors.grey3,
          },
        ]}
        onPress={handleAddTask}
        disabled={!title.trim()}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
  },
  priorityButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priorityButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    marginRight: 10,
  },
  addButton: {
    marginTop: 20,
    borderRadius: 10,
    paddingVertical: 15,
  },
});
