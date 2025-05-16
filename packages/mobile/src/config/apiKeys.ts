// apiKeys.ts - Plik przechowujący klucze API
// W rzeczywistej aplikacji te klucze powinny być przechowywane w bezpieczniejszy sposób,
// np. za pomocą zmiennych środowiskowych, react-native-dotenv lub react-native-config

export const PICOVOICE_API_KEY = 'WSTAW_SWÓJ_KLUCZ_TUTAJ';

// Ostrzeżenie jeśli klucz nie został zaktualizowany
if (PICOVOICE_API_KEY === 'WSTAW_SWÓJ_KLUCZ_TUTAJ') {
  console.warn(
    'UWAGA: Zmienna PICOVOICE_API_KEY nie została ustawiona w pliku apiKeys.ts. ' +
      'Wykrywanie słów kluczowych nie będzie działać poprawnie. ' +
      'Otwórz plik src/config/apiKeys.ts i wprowadź swój klucz API.'
  );
}
