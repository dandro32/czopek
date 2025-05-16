import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
} from '@react-native-voice/voice';

interface SimpleRecordingModalProps {
  isVisible: boolean;
  onClose: (transcription?: string) => void;
}

const SimpleRecordingModal: React.FC<SimpleRecordingModalProps> = ({
  isVisible,
  onClose,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState<string>('');
  const [silenceTimer, setSilenceTimer] = useState<number>(0);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const MAX_SILENCE_DURATION = 5; // w sekundach

  // Funkcja do resetowania timera ciszy
  const resetSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
    }
    setSilenceTimer(0);

    silenceTimerRef.current = setInterval(() => {
      setSilenceTimer((prev) => {
        const newValue = prev + 1;
        console.log(`Cisza: ${newValue}s`);

        // Automatyczne zamknięcie po 5 sekundach ciszy
        if (newValue >= MAX_SILENCE_DURATION) {
          stopRecordingAndClose();
        }
        return newValue;
      });
    }, 1000);
  };

  const onSpeechStart = () => {
    console.log('SimpleRecordingModal: Rozpoczęto nagrywanie mowy.');
    setIsRecording(true);
    resetSilenceTimer(); // Reset timer ciszy gdy użytkownik zaczyna mówić
  };

  const onSpeechEnd = () => {
    console.log('SimpleRecordingModal: Zakończono nagrywanie mowy.');
    setIsRecording(false);
    // Nie zatrzymuj nagrywania tutaj, tylko resetuj timer ciszy
    resetSilenceTimer();
  };

  const onSpeechResults = (e: SpeechResultsEvent) => {
    console.log('SimpleRecordingModal: Otrzymano wyniki mowy:', e.value);
    if (e.value && e.value.length > 0) {
      const latestTranscription = e.value[0];
      setTranscription(latestTranscription);

      // Reset timer ciszy gdy nowa treść jest wykryta
      resetSilenceTimer();
    }
  };

  const onSpeechError = (e: SpeechErrorEvent) => {
    console.error('SimpleRecordingModal: Błąd mowy:', e.error);
    stopRecordingAndClose();
  };

  const startRecording = async () => {
    try {
      await Voice.start('pl-PL'); // Użyj polskiego języka
      resetSilenceTimer(); // Rozpocznij timer ciszy
    } catch (e) {
      console.error('SimpleRecordingModal: Błąd podczas startu Voice:', e);
      onClose();
    }
  };

  const stopRecordingAndClose = async () => {
    // Zatrzymaj timer ciszy
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    try {
      if (isRecording) {
        await Voice.stop();
        setIsRecording(false);
      }
      // Zwróć transkrypcję przy zamykaniu
      onClose(transcription);
    } catch (e) {
      console.error(
        'SimpleRecordingModal: Błąd podczas zatrzymywania Voice:',
        e
      );
      onClose(transcription); // Mimo błędu zwróć transkrypcję
    }
  };

  useEffect(() => {
    if (isVisible) {
      // Przypisz callbacki Voice
      Voice.onSpeechStart = onSpeechStart;
      Voice.onSpeechEnd = onSpeechEnd;
      Voice.onSpeechResults = onSpeechResults;
      Voice.onSpeechError = onSpeechError;

      // Rozpocznij nagrywanie gdy modal jest widoczny
      startRecording();
    } else {
      // Zatrzymaj nagrywanie gdy modal jest ukryty
      if (isRecording) {
        stopRecordingAndClose();
      }
    }

    // Cleanup
    return () => {
      if (silenceTimerRef.current) {
        clearInterval(silenceTimerRef.current);
      }

      if (isRecording) {
        Voice.stop().catch((e) =>
          console.error('Błąd podczas zatrzymywania Voice:', e)
        );
      }

      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, [isVisible]);

  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={isVisible}
      onRequestClose={stopRecordingAndClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>
            {isRecording ? 'Nagrywam polecenie...' : 'Przetwarzam...'}
          </Text>

          <ActivityIndicator
            size="large"
            color="#007AFF"
            style={styles.activityIndicator}
          />

          {transcription ? (
            <Text style={styles.transcriptionText}>"{transcription}"</Text>
          ) : (
            <Text style={styles.infoText}>
              Powiedz swoje polecenie. Zamknę się po 5 sekundach ciszy.
            </Text>
          )}

          <Text style={styles.timerText}>
            {silenceTimer > 0
              ? `Automatyczne zamknięcie za ${
                  MAX_SILENCE_DURATION - silenceTimer
                }s`
              : ''}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
    elevation: 5, // Cień dla Androida
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  activityIndicator: {
    marginVertical: 20,
  },
  infoText: {
    textAlign: 'center',
    marginVertical: 10,
    color: '#666',
  },
  transcriptionText: {
    textAlign: 'center',
    marginVertical: 10,
    fontStyle: 'italic',
    color: '#333',
  },
  timerText: {
    marginTop: 15,
    color: '#FF3B30',
    fontSize: 12,
  },
});

export default SimpleRecordingModal;
