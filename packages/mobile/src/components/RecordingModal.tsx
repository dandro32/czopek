import { useState, useEffect, useRef } from 'react';
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
  const silenceTimer = useRef<NodeJS.Timeout | null>(null);
  const lastSoundTime = useRef<number>(Date.now());
  const { theme } = useTheme();

  useEffect(() => {
    return () => {
      if (silenceTimer.current) {
        clearTimeout(silenceTimer.current);
      }
      stopRecording();
    };
  }, []);

  const startSilenceDetection = async () => {
    try {
      await Audio.requestPermissionsAsync();
      const { status } = await Audio.getPermissionsAsync();
      if (status !== 'granted') return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recordingOptions = {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        android: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
          isAudioInputDetected: true,
        },
        ios: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      };

      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      setRecording(recording);
      setIsRecording(true);

      recording.setOnRecordingStatusUpdate((status) => {
        if (status.isRecording && status.metering !== undefined) {
          const currentTime = Date.now();
          if (status.metering > -50) {
            // Próg dźwięku
            lastSoundTime.current = currentTime;
          } else {
            const silenceTime = currentTime - lastSoundTime.current;
            if (silenceTime >= 5000) {
              // 5 sekund ciszy
              stopRecording();
            }
          }
        }
      });

      await recording.setProgressUpdateInterval(100);
    } catch (error) {
      console.error('Błąd podczas rozpoczynania nagrywania:', error);
    }
  };

  const startRecording = async () => {
    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current);
    }
    lastSoundTime.current = Date.now();
    await startSilenceDetection();
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setIsRecording(false);
      if (silenceTimer.current) {
        clearTimeout(silenceTimer.current);
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
