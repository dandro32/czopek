# Podsumowanie migracji z SQLite na MongoDB

## Zmodyfikowane pliki

1. **database.py**

   - Usunięto zależności SQLAlchemy
   - Dodano wsparcie dla MongoDB z bibliotekami pymongo i motor
   - Zmodyfikowano funkcje dostępu do bazy danych
   - **Dodano obsługę uwierzytelniania za pomocą zmiennych środowiskowych (.env)**

2. **models.py**

   - Usunięto klasy modelowe SQLAlchemy
   - Zaktualizowano modele Pydantic do pracy z MongoDB
   - Dodano obsługę ObjectId dla identyfikatorów MongoDB

3. **app/tasks/service.py**

   - Zamieniono zapytania SQLAlchemy na operacje MongoDB
   - Zaktualizowano sygnaturę funkcji, aby przyjmowały ObjectId
   - Dostosowano funkcje do modelu asynchronicznego
   - Dodano wersje synchroniczne dla skryptów migracyjnych

4. **requirements.txt**
   - Usunięto zależność SQLAlchemy
   - Dodano zależności pymongo i motor

## Nowe pliki

1. **migrate_to_mongodb.py**

   - Skrypt do migracji danych z SQLite do MongoDB
   - Obsługuje migrację użytkowników i zadań
   - Tworzy mapowanie starych identyfikatorów na nowe ObjectId

2. **init_mongodb.py**

   - Skrypt inicjalizujący bazę danych MongoDB
   - Tworzy niezbędne kolekcje i indeksy
   - Sprawdza połączenie z MongoDB

3. **README_MONGODB_MIGRATION.md**
   - Instrukcje dotyczące migracji
   - Wskazówki dotyczące instalacji MongoDB na różnych systemach
   - Kroki migracji i obsługa potencjalnych problemów

## Architektura MongoDB

### Kolekcje

1. **users**

   - Indeksy: `email` (unikatowy), `username` (unikatowy)
   - Pola: `_id`, `email`, `username`, `hashed_password`, `is_active`

2. **tasks**

   - Indeksy: `user_id`, indeks pełnotekstowy na `title` i `description`
   - Pola: `_id`, `title`, `description`, `due_date`, `priority`, `user_id`, `source`, `calendar_event_id`, `status`

3. **calendar_credentials**
   - Indeksy: `user_id` (unikatowy)
   - Pola: `_id`, `user_id`, `token`, `refresh_token`, `token_expiry`

## Kroki do wykonania po migracji

1. **Utwórz plik `.env`** w `packages/backend` z danymi dostępowymi do MongoDB i innymi kluczami.
2. Skonfiguruj uwierzytelnianie w serwerze MongoDB (utwórz użytkownika).
3. Uruchom skrypt inicjalizujący MongoDB: `python init_mongodb.py`
4. Uruchom skrypt migracji danych: `python migrate_to_mongodb.py`
5. Sprawdź czy dane zostały poprawnie zmigrowane
6. Uruchom aplikację z nową konfiguracją bazy danych

## Zalety MongoDB

1. **Skalowalność** - łatwiejsze skalowanie horyzontalne
2. **Elastyczność schematu** - prostsze zmiany struktury danych
3. **Wydajność** - szybsze operacje na dużych zbiorach danych
4. **Wsparcie dla danych JSON** - naturalne dopasowanie do API REST
5. **Indeksy pełnotekstowe** - lepsze wyszukiwanie w treści zadań
