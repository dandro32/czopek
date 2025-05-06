import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Platform,
  ScrollView,
  TouchableOpacity,
  Modal,
  Keyboard,
  Alert,
} from 'react-native';
import { useTheme, Text, Button, Icon } from '@rneui/themed';
import DateTimePickerModal, { DateType } from 'react-native-ui-datepicker';
import { format, setHours, setMinutes, setSeconds, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, refreshToken, authHeader } from '../services/auth';
import { Task, NavigationProps } from '../types';

type Props = NavigationProps & {
  route?: { params?: { task?: Task } };
};

export function AddTaskScreen({ navigation, route }: Props) {
  const { task } = (route?.params || {}) as { task?: Task };
  const isEditMode = !!task;

  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [dueDate, setDueDate] = useState<Date | null>(
    task?.due_date ? parseISO(task.due_date) : null
  );
  const [reminderDate, setReminderDate] = useState<Date | null>(null);
  const [priority, setPriority] = useState(task?.priority || 'medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isPickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'due' | 'reminder' | null>(
    null
  );
  const [pickerStep, setPickerStep] = useState<'date' | 'time'>('date');
  const [tempDate, setTempDate] = useState<Date | null>(null);
  const [tempHour, setTempHour] = useState<string>('00');
  const [tempMinute, setTempMinute] = useState<string>('00');

  const { theme } = useTheme();

  const getInputStyle = () => [
    styles.input,
    {
      color: theme.mode === 'dark' ? theme.colors.white : theme.colors.black,
      borderColor: theme.colors.grey3,
      backgroundColor:
        theme.mode === 'dark' ? theme.colors.grey0 : theme.colors.white,
    },
  ];

  const showPicker = (target: 'due' | 'reminder') => {
    setPickerTarget(target);
    const initialDate = target === 'due' ? dueDate : reminderDate;
    setTempDate(initialDate);
    setTempHour(initialDate ? format(initialDate, 'HH') : '00');
    setTempMinute(initialDate ? format(initialDate, 'mm') : '00');
    setPickerStep('date');
    setPickerVisible(true);
  };

  const hidePicker = () => {
    setPickerVisible(false);
    setPickerTarget(null);
    setTempDate(null);
    setPickerStep('date');
    setTempHour('00');
    setTempMinute('00');
    Keyboard.dismiss();
  };

  const handleConfirmDate = useCallback((params: { date: DateType }) => {
    let selectedDate: Date | null = null;
    if (params.date) {
      if (typeof params.date === 'string') {
        try {
          selectedDate = new Date(params.date);
        } catch (e) {
          console.error('Error parsing date string:', e);
        }
      } else if (typeof params.date === 'object' && params.date !== null) {
        if (typeof (params.date as any).toDate === 'function') {
          selectedDate = (params.date as any).toDate();
        } else {
          try {
            selectedDate = new Date(params.date as any);
          } catch (e) {
            console.error('Error parsing date object:', e);
          }
        }
      }
    }

    if (selectedDate && !isNaN(selectedDate.getTime())) {
      setTempDate(selectedDate);
      setTempHour(format(selectedDate, 'HH'));
      setTempMinute(format(selectedDate, 'mm'));
      setPickerStep('time');
    } else {
      console.error(
        'Could not determine a valid date from picker.',
        params.date
      );
    }
  }, []);

  const handleConfirmTime = useCallback(() => {
    if (tempDate && pickerTarget) {
      const hour = parseInt(tempHour, 10);
      const minute = parseInt(tempMinute, 10);

      if (
        isNaN(hour) ||
        hour < 0 ||
        hour > 23 ||
        isNaN(minute) ||
        minute < 0 ||
        minute > 59
      ) {
        console.error('Invalid time entered');
        return;
      }

      let finalDate = setSeconds(tempDate, 0);
      finalDate = setHours(finalDate, hour);
      finalDate = setMinutes(finalDate, minute);

      if (pickerTarget === 'due') {
        setDueDate(finalDate);
      } else {
        setReminderDate(finalDate);
      }
      hidePicker();
    }
  }, [tempDate, pickerTarget, tempHour, tempMinute]);

  const handleHourChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    setTempHour(numericText);
  };

  const handleMinuteChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    setTempMinute(numericText);
  };

  const formatTimeInput = (value: string, type: 'hour' | 'minute') => {
    const max = type === 'hour' ? 23 : 59;
    let num = parseInt(value, 10);
    if (isNaN(num) || num < 0) num = 0;
    else if (num > max) num = max;
    const formatted = num.toString().padStart(2, '0');
    if (type === 'hour') setTempHour(formatted);
    else setTempMinute(formatted);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Przygotowanie danych zadania
      const taskData = {
        title,
        description,
        due_date: dueDate ? format(dueDate, 'yyyy-MM-dd HH:mm:ss') : null,
        reminder_date: reminderDate
          ? format(reminderDate, 'yyyy-MM-dd HH:mm:ss')
          : null,
        priority,
      };

      // Pobieramy token
      let token = await AsyncStorage.getItem('@auth_token');
      let headers = await authHeader();

      // Przygotowanie URL i metody w zależności od trybu (dodawanie/edycja)
      const url = isEditMode
        ? `${API_URL}/tasks/${task.id}`
        : `${API_URL}/tasks/`;
      const method = isEditMode ? 'PUT' : 'POST';

      console.log(
        `${isEditMode ? 'Aktualizacja' : 'Dodawanie'} zadania:`,
        JSON.stringify(taskData)
      );
      console.log('URL: ', url);

      const response = await fetch(url, {
        method,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });

      // Obsługa błędu 401 (Unauthorized) - próba odświeżenia tokena
      if (response.status === 401) {
        console.log('Token wygasł, próba odświeżenia...');
        const newTokens = await refreshToken();

        if (newTokens) {
          // Próba ponownego wysłania z nowym tokenem
          headers = {
            Authorization: `Bearer ${newTokens.access_token}`,
            'Content-Type': 'application/json',
          };

          const retryResponse = await fetch(url, {
            method,
            headers,
            body: JSON.stringify(taskData),
          });

          if (!retryResponse.ok) {
            throw new Error(
              `Błąd ${isEditMode ? 'aktualizacji' : 'dodawania'} zadania: ${
                retryResponse.status
              }`
            );
          }

          handleSuccess(await retryResponse.json());
          return;
        } else {
          // Jeśli nie udało się odświeżyć, przekieruj do ekranu logowania
          Alert.alert(
            'Sesja wygasła',
            'Zaloguj się ponownie, aby kontynuować.',
            [
              {
                text: 'OK',
                onPress: () => {
                  if (navigation && navigation.reset) {
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'Login' }],
                    });
                  }
                },
              },
            ]
          );
          return;
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Błąd ${isEditMode ? 'aktualizacji' : 'dodawania'} zadania: ${
            response.status
          } - ${errorText}`
        );
      }

      handleSuccess(await response.json());
    } catch (error: any) {
      console.error(
        `Błąd ${isEditMode ? 'aktualizacji' : 'dodawania'} zadania:`,
        error
      );
      Alert.alert(
        'Błąd',
        `Nie udało się ${isEditMode ? 'zaktualizować' : 'dodać'} zadania: ${
          error.message
        }`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccess = (data: any) => {
    const successMessage = isEditMode
      ? 'Zadanie zostało zaktualizowane'
      : 'Zadanie zostało dodane';

    Alert.alert('Sukces', successMessage, [
      {
        text: 'OK',
        onPress: () => {
          if (isEditMode) {
            // Wróć do szczegółów zadania z zaktualizowanymi danymi
            navigation.navigate('TaskDetail', { task: data.task });
          } else {
            // Wróć do listy zadań po dodaniu
            navigation.navigate('TodoList');
          }
        },
      },
    ]);
  };

  const priorityButtons = [
    { title: 'Niski', value: 'low', color: theme.colors.success },
    { title: 'Średni', value: 'medium', color: theme.colors.warning },
    { title: 'Wysoki', value: 'high', color: theme.colors.error },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
    },
    title: {
      marginBottom: 30,
      textAlign: 'center',
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
      minHeight: 100,
    },
    inputWithIcon: {
      position: 'relative',
      flexDirection: 'row',
      alignItems: 'center',
    },
    inputIcon: {
      position: 'absolute',
      right: 10,
    },
    priorityButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
    },
    priorityButton: {
      flex: 1,
      paddingHorizontal: 15,
      paddingVertical: 12,
      borderRadius: 10,
    },
    submitButton: {
      marginTop: 30,
      borderRadius: 10,
      paddingVertical: 15,
      paddingHorizontal: 20,
      marginBottom: 15,
    },
    cancelButton: {
      borderRadius: 10,
      paddingVertical: 15,
      paddingHorizontal: 20,
      marginBottom: 30,
      borderWidth: 1,
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    pickerContentContainer: {
      backgroundColor: theme.colors.background,
      borderRadius: 10,
      padding: 15,
      width: '90%',
      alignItems: 'center',
    },
    timeInputContainer: {
      width: '100%',
      alignItems: 'center',
      marginTop: 15,
      marginBottom: 15,
    },
    selectedDateText: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 15,
      color: theme.mode === 'dark' ? theme.colors.white : theme.colors.black,
    },
    timeInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    timeInput: {
      borderWidth: 1,
      borderColor: theme.colors.grey3,
      borderRadius: 8,
      paddingHorizontal: 15,
      paddingVertical: 10,
      fontSize: 20,
      textAlign: 'center',
      width: 60,
      marginHorizontal: 5,
      color: theme.mode === 'dark' ? theme.colors.white : theme.colors.black,
      backgroundColor:
        theme.mode === 'dark' ? theme.colors.grey2 : theme.colors.white,
    },
    timeSeparator: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.mode === 'dark' ? theme.colors.white : theme.colors.black,
    },
    modalButtonsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      width: '100%',
      marginTop: 10,
    },
  });

  const getInitialPickerDate = () => {
    const targetDate = pickerTarget === 'due' ? dueDate : reminderDate;
    return targetDate || undefined;
  };

  return (
    <ScrollView
      style={[
        styles.container,
        {
          backgroundColor:
            theme.mode === 'dark' ? theme.colors.black : theme.colors.white,
        },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Text h2 style={[styles.title, { color: theme.colors.primary }]}>
        {isEditMode ? 'Edytuj zadanie' : 'Dodaj nowe zadanie'}
      </Text>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.colors.grey1 }]}>Tytuł</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          style={getInputStyle()}
          placeholder="Wpisz tytuł zadania"
          placeholderTextColor={theme.colors.grey3}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.colors.grey1 }]}>Opis</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          style={[getInputStyle(), styles.textArea]}
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
        <TouchableOpacity onPress={() => showPicker('due')}>
          <View style={styles.inputWithIcon}>
            <TextInput
              value={dueDate ? format(dueDate, 'yyyy-MM-dd HH:mm') : ''}
              editable={false}
              style={getInputStyle()}
              placeholder="Wybierz datę i czas"
              placeholderTextColor={theme.colors.grey3}
            />
            <Icon
              name="calendar-today"
              type="material"
              color={theme.colors.grey1}
              size={20}
              containerStyle={styles.inputIcon}
            />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.colors.grey1 }]}>
          Przypomnienie
        </Text>
        <TouchableOpacity onPress={() => showPicker('reminder')}>
          <View style={styles.inputWithIcon}>
            <TextInput
              value={
                reminderDate ? format(reminderDate, 'yyyy-MM-dd HH:mm') : ''
              }
              editable={false}
              style={getInputStyle()}
              placeholder="Wybierz datę i czas przypomnienia"
              placeholderTextColor={theme.colors.grey3}
            />
            <Icon
              name="notifications"
              type="material"
              color={theme.colors.grey1}
              size={20}
              containerStyle={styles.inputIcon}
            />
          </View>
        </TouchableOpacity>
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
                    priority === btn.value ? btn.color : theme.colors.grey4,
                },
              ]}
              titleStyle={{
                color: theme.colors.white,
              }}
              onPress={() => setPriority(btn.value)}
            />
          ))}
        </View>
      </View>

      <Button
        title={isEditMode ? 'Zapisz zmiany' : 'Dodaj zadanie'}
        icon={{
          name: isEditMode ? 'save' : 'check',
          type: 'material',
          color: theme.colors.white,
          size: 20,
        }}
        iconRight
        buttonStyle={[
          styles.submitButton,
          {
            backgroundColor: title.trim()
              ? theme.colors.primary
              : theme.colors.grey3,
          },
        ]}
        titleStyle={{ color: theme.colors.white }}
        onPress={handleSubmit}
        disabled={!title.trim() || isSubmitting}
        loading={isSubmitting}
      />

      {isEditMode && (
        <Button
          title="Anuluj"
          type="outline"
          buttonStyle={[
            styles.cancelButton,
            {
              borderColor: theme.colors.grey3,
            },
          ]}
          titleStyle={{ color: theme.colors.grey1 }}
          onPress={() => navigation.goBack()}
        />
      )}

      <Modal
        transparent={true}
        animationType="fade"
        visible={isPickerVisible}
        onRequestClose={hidePicker}
      >
        <TouchableOpacity
          style={styles.modalContainer}
          activeOpacity={1}
          onPressOut={hidePicker}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.pickerContentContainer}
          >
            {pickerStep === 'date' && pickerTarget && (
              // @ts-expect-error - Re-adding due to persistent type issues
              <DateTimePickerModal
                mode="single"
                locale="pl"
                date={getInitialPickerDate()}
                styles={{
                  day_label: {
                    color: theme.mode === 'dark' ? '#ffffff' : '#000000',
                  },
                  selected_label: {
                    color: theme.mode === 'dark' ? '#ffffff' : '#000000',
                    fontWeight: 'bold',
                  },
                  month_selector_label: {
                    color: theme.mode === 'dark' ? '#ffffff' : '#000000',
                  },
                  year_selector_label: {
                    color: theme.mode === 'dark' ? '#ffffff' : '#000000',
                  },
                  weekday_label: {
                    color: theme.mode === 'dark' ? '#cccccc' : '#333333',
                  },
                  header: {
                    backgroundColor:
                      theme.mode === 'dark' ? '#1e1e1e' : '#ffffff',
                  },
                }}
                // @ts-expect-error - Re-adding due to persistent type issues
                onChange={handleConfirmDate}
                // Restore styling props with conditional colors and ignore errors
                // @ts-expect-error - Re-adding due to persistent type issues
                calendarTextStyle={{
                  color:
                    theme.mode === 'dark'
                      ? theme.colors.white
                      : theme.colors.black,
                }}
                // @ts-expect-error - Re-adding due to persistent type issues
                todayTextStyle={{
                  color: theme.colors.primary,
                  fontWeight: 'bold',
                }}
                // @ts-expect-error - Re-adding due to persistent type issues
                selectedTextStyle={{
                  color: theme.colors.white,
                  fontWeight: 'bold',
                }}
                // @ts-expect-error - Re-adding due to persistent type issues
                headerTextStyle={{
                  color: theme.colors.primary,
                  fontWeight: 'bold',
                }}
                // @ts-expect-error - Re-adding due to persistent type issues
                selectedItemColor={theme.colors.primary}
                // @ts-expect-error - Re-adding due to persistent type issues
                headerButtonColor={theme.colors.primary}
                contentContainerStyle={{
                  backgroundColor:
                    theme.mode === 'dark' ? '#1e1e1e' : '#ffffff',
                  borderRadius: 10,
                }}
                buttonTextStyle={{
                  color: theme.mode === 'dark' ? '#ffffff' : '#000000',
                }}
                labelStyle={{
                  color: theme.mode === 'dark' ? '#ffffff' : '#000000',
                  fontSize: 16,
                  fontWeight: 'bold',
                }}
              />
            )}

            {pickerStep === 'time' && tempDate && (
              <View style={styles.timeInputContainer}>
                <Text style={styles.selectedDateText}>
                  Wybrana data: {format(tempDate, 'yyyy-MM-dd')}
                </Text>
                <Text
                  style={[
                    styles.label,
                    { color: theme.colors.grey1, marginBottom: 10 },
                  ]}
                >
                  Wprowadź czas (GG:MM)
                </Text>
                <View style={styles.timeInputRow}>
                  <TextInput
                    style={styles.timeInput}
                    value={tempHour}
                    onChangeText={handleHourChange}
                    onBlur={() => formatTimeInput(tempHour, 'hour')}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                  />
                  <Text style={styles.timeSeparator}>:</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={tempMinute}
                    onChangeText={handleMinuteChange}
                    onBlur={() => formatTimeInput(tempMinute, 'minute')}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                  />
                </View>
                <View style={styles.modalButtonsRow}>
                  <Button
                    title="Anuluj"
                    onPress={hidePicker}
                    type="outline"
                    buttonStyle={{ borderColor: theme.colors.grey3 }}
                    titleStyle={{ color: theme.colors.primary }}
                  />
                  <Button title="Ustaw Czas" onPress={handleConfirmTime} />
                </View>
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}
