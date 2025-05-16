import React, { useState, useEffect } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import {
  PorcupineManager,
  PorcupineErrors,
} from '@picovoice/porcupine-react-native';
import SimpleRecordingModal from './SimpleRecordingModal';

/**
 * INSTRUKCJE:
 *
 * 1. Zarejestruj się na stronie https://console.picovoice.ai/
 * 2. Uzyskaj swój AccessKey i dodaj go do pliku src/config/apiKeys.ts
 * 3. Wejdź w "Speech-to-Intent Models" w konsoli Picovoice
 * 4. Utwórz nowy model dla frazy "elo, czopek"
 * 5. Pobierz wygenerowany plik .ppn
 * 6. Umieść go w katalogu: packages/mobile/android/app/src/main/assets/
 * 7. Nazwij plik "elo-czopek.ppn" lub zaktualizuj zmienną keywordAssetPath poniżej
 */

// Używamy klucza z konfiguracji
const ACCESS_KEY = 'LHAK4HBC7E2NuG3DC7KaCTOjJJZyZSqu4OjONvMFvX6fOOoVNAa4MA==';

console.log(
  'WakeWordDetector: Używam klucza Picovoice API z config/apiKeys.ts'
);

// Ścieżka do pliku modelu słowa kluczowego
// Ta ścieżka jest relatywna do folderu assets w Androidzie
// Plik powinien być umieszczony w android/app/src/main/assets/
const keywordAssetPath = 'elo-czopek.ppn';

interface WakeWordDetectorProps {
  onTranscriptionReceived?: (text: string) => void;
}

const WakeWordDetector: React.FC<WakeWordDetectorProps> = ({
  onTranscriptionReceived,
}) => {
  const [isPorcupineListening, setIsPorcupineListening] = useState(false);
  const [porcupineManager, setPorcupineManager] = useState<any>(null);
  const [isRecordingModalVisible, setIsRecordingModalVisible] = useState(false);
  const [lastTranscription, setLastTranscription] = useState('');

  const keywordCallback = async (keywordIndex: number) => {
    console.log(
      `WakeWordDetector: Wykryto słowo kluczowe o indeksie: ${keywordIndex}`
    );
    if (keywordIndex === 0) {
      console.log(
        'WakeWordDetector: Wykryto "elo, czopek". Zatrzymuję Porcupine i otwieram modal nagrywania.'
      );
      if (porcupineManager) {
        try {
          await porcupineManager.stop();
          setIsPorcupineListening(false);
          console.log('WakeWordDetector: Porcupine zatrzymany.');
        } catch (e) {
          console.error(
            'WakeWordDetector: Błąd podczas zatrzymywania Porcupine:',
            e
          );
        }
      }
      setIsRecordingModalVisible(true);
    }
  };

  const processErrorCallback = (error: PorcupineErrors.PorcupineError) => {
    console.error('WakeWordDetector: Błąd Porcupine:', error);
    // Szczegółowa diagnostyka błędów
    if (error instanceof PorcupineErrors.PorcupineActivationLimitError) {
      console.error(
        'WakeWordDetector: AccessKey osiągnął limit aktywacji. Sprawdź swój plan na console.picovoice.ai'
      );
    } else if (
      error instanceof PorcupineErrors.PorcupineActivationRefusedError
    ) {
      console.error(
        'WakeWordDetector: Aktywacja odrzucona. Sprawdź swój AccessKey.'
      );
    } else if (
      error instanceof PorcupineErrors.PorcupineActivationThrottledError
    ) {
      console.error(
        'WakeWordDetector: Aktywacja ograniczona. Spróbuj ponownie później.'
      );
    } else if (error instanceof PorcupineErrors.PorcupineInvalidArgumentError) {
      console.error(
        'WakeWordDetector: Nieprawidłowy argument. Sprawdź ścieżkę do pliku modelu.'
      );
    } else if (error instanceof PorcupineErrors.PorcupineInvalidStateError) {
      console.error(
        'WakeWordDetector: Nieprawidłowy stan. Zresetuj PorcupineManager.'
      );
    } else if (error instanceof PorcupineErrors.PorcupineRuntimeError) {
      console.error('WakeWordDetector: Błąd runtime.');
    } else if (error instanceof PorcupineErrors.PorcupineStopIterationError) {
      console.error('WakeWordDetector: Zatrzymanie iteracji.');
    }
  };

  const requestRecordAudioPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Pozwolenie na użycie mikrofonu',
            message:
              'Aplikacja potrzebuje dostępu do mikrofonu, aby wykrywać słowa kluczowe i nagrywać dźwięk.',
            buttonNeutral: 'Zapytaj później',
            buttonNegative: 'Anuluj',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(
          'WakeWordDetector: Błąd przy proszeniu o pozwolenie:',
          err
        );
        return false;
      }
    } else {
      return true;
    }
  };

  const initPorcupine = async () => {
    try {
      console.log(
        'WakeWordDetector: Inicjalizacja z AccessKey:',
        ACCESS_KEY ? 'Klucz ustawiony' : 'BRAK KLUCZA'
      );
      console.log('WakeWordDetector: Ścieżka do modelu:', keywordAssetPath);

      const manager = await PorcupineManager.fromKeywordPaths(
        ACCESS_KEY,
        [keywordAssetPath],
        keywordCallback,
        processErrorCallback
      );
      setPorcupineManager(manager);
      console.log('WakeWordDetector: PorcupineManager zainicjalizowany.');
      return manager;
    } catch (err) {
      console.error(
        'WakeWordDetector: Błąd inicjalizacji PorcupineManagera:',
        err
      );
      if (err instanceof PorcupineErrors.PorcupineActivationLimitError) {
        console.error('WakeWordDetector: AccessKey osiągnął limit aktywacji.');
      } else if (err instanceof PorcupineErrors.PorcupineInvalidArgumentError) {
        console.error(
          `WakeWordDetector: Nieprawidłowy argument dla Porcupine: ${err.message}`
        );
      }
      return null;
    }
  };

  const startPorcupineListening = async () => {
    const hasPermission = await requestRecordAudioPermission();
    if (!hasPermission) {
      console.log('WakeWordDetector: Brak pozwolenia na nagrywanie dźwięku.');
      return;
    }

    let currentManager = porcupineManager;
    if (!currentManager) {
      currentManager = await initPorcupine();
    }

    if (currentManager && !isPorcupineListening) {
      try {
        await currentManager.start();
        setIsPorcupineListening(true);
        console.log('WakeWordDetector: Rozpoczęto nasłuchiwanie Porcupine...');
      } catch (e) {
        console.error('WakeWordDetector: Błąd podczas startu Porcupine:', e);
        setIsPorcupineListening(false);
      }
    }
  };

  const handleModalClose = (transcription?: string) => {
    setIsRecordingModalVisible(false);

    if (transcription) {
      setLastTranscription(transcription);
      console.log('WakeWordDetector: Otrzymano transkrypcję:', transcription);

      // Przekazanie transkrypcji przez callback
      if (onTranscriptionReceived) {
        onTranscriptionReceived(transcription);
      }
    }

    console.log(
      'WakeWordDetector: Modal zamknięty, wznawiam nasłuchiwanie Porcupine.'
    );
    startPorcupineListening();
  };

  useEffect(() => {
    console.log(
      'WakeWordDetector: Inicjalizacja i start nasłuchiwania Porcupine...'
    );
    startPorcupineListening();

    return () => {
      console.log(
        'WakeWordDetector: Odmontowywanie komponentu, usuwanie PorcupineManagera...'
      );
      if (porcupineManager) {
        porcupineManager.delete();
      }
    };
  }, []);

  return (
    <SimpleRecordingModal
      isVisible={isRecordingModalVisible}
      onClose={handleModalClose}
    />
  );
};

export default WakeWordDetector;
