import { useState, useEffect } from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import { Button, Text, useTheme } from '@rneui/themed';
import { Audio } from 'expo-av';

type Props = {
  isVisible: boolean;
  onClose: () => void;
  onSend: (audioUri: string) => void;
};

export const RecordingModal = ({ isVisible, onClose, onSend }: Props) => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [silenceTimeout, setSilenceTimeout] = useState<NodeJS.Timeout | null>(
    null
  );
  const { theme } = useTheme();

  useEffect(() => {
    return () => {
      if (silenceTimeout) {
        clearTimeout(silenceTimeout);
      }
      stopRecording();
    };
  }, []);

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);

      const timeout = setTimeout(() => {
        if (isRecording) {
          stopRecording();
        }
      }, 5000);
      setSilenceTimeout(timeout);
    } catch (error) {
      console.error('Błąd podczas rozpoczynania nagrywania:', error);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setIsRecording(false);
      if (silenceTimeout) {
        clearTimeout(silenceTimeout);
      }
      if (uri) {
        onSend(uri);
      }
    } catch (error) {
      console.error('Błąd podczas zatrzymywania nagrywania:', error);
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.modalContainer,
          {
            backgroundColor:
              theme.mode === 'dark'
                ? 'rgba(0,0,0,0.9)'
                : 'rgba(255,255,255,0.9)',
          },
        ]}
      >
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor:
                theme.mode === 'dark' ? theme.colors.black : theme.colors.white,
            },
          ]}
        >
          <Text h4 style={{ color: theme.colors.primary, marginBottom: 20 }}>
            {isRecording ? 'Nagrywanie...' : 'Rozpocznij nagrywanie'}
          </Text>

          <Button
            title={isRecording ? 'Zatrzymaj' : 'Rozpocznij'}
            onPress={isRecording ? stopRecording : startRecording}
            buttonStyle={[
              styles.button,
              {
                backgroundColor: isRecording
                  ? theme.colors.error
                  : theme.colors.primary,
              },
            ]}
          />

          <Button
            title="Anuluj"
            type="clear"
            onPress={onClose}
            titleStyle={{ color: theme.colors.grey0 }}
          />
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
  },
  modalContent: {
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  button: {
    paddingHorizontal: 40,
    paddingVertical: 10,
    borderRadius: 25,
    marginBottom: 10,
  },
});
