# Wykrywanie słowa kluczowego "elo, czopek"

Ten komponent pozwala na wykrycie frazy "elo, czopek" i automatyczne rozpoczęcie nagrywania polecenia głosowego. Po 5 sekundach ciszy nagrywanie zostanie automatycznie zatrzymane, a transkrypcja zostanie pokazana w polu tekstowym aplikacji.

## Konfiguracja

Aby poprawnie skonfigurować wykrywanie frazy "elo, czopek", wykonaj poniższe kroki:

### 1. Rejestracja w Picovoice

1. Zarejestruj się na stronie [Picovoice Console](https://console.picovoice.ai/)
2. Po zalogowaniu przejdź do zakładki "AccessKey" i skopiuj swój klucz dostępu

### 2. Wygenerowanie modelu słowa kluczowego

1. W konsoli Picovoice przejdź do zakładki "Porcupine Wake Word"
2. Kliknij "Create Custom Wake Word"
3. Wpisz frazę "elo, czopek" (możesz też wybrać inną frazę, jeśli wolisz)
4. Wybierz język "Polish" (polski)
5. Kliknij "Create" i poczekaj na wygenerowanie modelu
6. Pobierz wygenerowany plik z rozszerzeniem `.ppn`

### 3. Umieszczenie pliku modelu w projekcie

1. Zmień nazwę pobranego pliku na `elo-czopek.ppn`
2. Umieść plik w katalogu: `packages/mobile/android/app/src/main/assets/`
3. Jeśli nazwałeś plik inaczej, zaktualizuj zmienną `keywordAssetPath` w pliku `src/components/WakeWordDetector.tsx`

### 4. Aktualizacja klucza dostępu

1. Otwórz plik `src/components/WakeWordDetector.tsx`
2. Zastąp wartość zmiennej `ACCESS_KEY` swoim kluczem dostępu z Picovoice

```typescript
const ACCESS_KEY = 'TWÓJ_KLUCZ_DOSTĘPU';
```

## Kompilacja i uruchomienie

Po wykonaniu powyższych kroków skompiluj i uruchom aplikację:

```bash
# Kompilacja aplikacji
cd packages/mobile
npm run android

# Lub używając Yarn
cd packages/mobile
yarn android
```

## Użycie

1. Po uruchomieniu aplikacji komponent WakeWordDetector automatycznie nasłuchuje frazy "elo, czopek"
2. Wypowiedz frazę "elo, czopek" w pobliżu mikrofonu urządzenia
3. Po wykryciu frazy pojawi się okno modalne nagrywania
4. Wypowiedz swoje polecenie
5. Po 5 sekundach ciszy nagrywanie zakończy się automatycznie
6. Transkrypcja zostanie wyświetlona w polu tekstowym

## Rozwiązywanie problemów

### Brak wykrywania frazy

- Upewnij się, że mikrofon działa poprawnie
- Sprawdź, czy aplikacja ma uprawnienia do nagrywania dźwięku
- Sprawdź logi aplikacji, aby zobaczyć ewentualne błędy

### Błędy związane z AccessKey

- Upewnij się, że klucz dostępu jest poprawny
- Sprawdź, czy Twój plan Picovoice nie wygasł lub nie osiągnął limitu zapytań

### Brak pliku modelu

- Sprawdź, czy plik `.ppn` znajduje się w katalogu assets
- Upewnij się, że ścieżka w zmiennej `keywordAssetPath` jest poprawna
