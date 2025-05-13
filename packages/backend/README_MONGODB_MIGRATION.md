# Migracja z SQLite do MongoDB

Ten dokument zawiera instrukcje dotyczące migracji bazy danych z SQLite do MongoDB.

## Wymagania

1. MongoDB zainstalowane lokalnie lub dostęp do zdalnego serwera MongoDB
2. Python 3.8+
3. Zainstalowane zależności z `requirements.txt`

## Instrukcje instalacji MongoDB

### Linux (Ubuntu/Debian)

```bash
# Importuj klucz publiczny
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Dodaj repozytorium
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Zaktualizuj pakiety i zainstaluj MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Uruchom MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

### macOS (z Homebrew)

```bash
# Zainstaluj MongoDB
brew tap mongodb/brew
brew install mongodb-community

# Uruchom MongoDB
brew services start mongodb-community
```

### Windows

1. Pobierz instalator MongoDB Community Edition ze strony [MongoDB](https://www.mongodb.com/try/download/community)
2. Uruchom instalator i postępuj zgodnie z instrukcjami
3. Domyślnie MongoDB działa jako usługa Windows

## Kroki migracji

1. Zainstaluj wymagane zależności:

```bash
cd packages/backend
pip install -r requirements.txt
```

2. Upewnij się, że MongoDB jest uruchomione:

```bash
# Sprawdź status (Linux)
systemctl status mongod

# Sprawdź status (macOS)
brew services list
```

3. Uruchom skrypt migracji:

```bash
cd packages/backend
python migrate_to_mongodb.py
```

4. Sprawdź czy dane zostały poprawnie zmigrowane:

```bash
# Uruchom powłokę MongoDB
mongosh

# Przełącz na bazę danych
use czopek_db

# Sprawdź kolekcje
show collections

# Sprawdź dane
db.users.find()
db.tasks.find()
```

## Konfiguracja środowiska

Po migracji baza danych SQLite zostanie zastąpiona przez MongoDB. W przypadku potrzeby powrotu do SQLite, baza danych jest nadal dostępna w pliku `sql_app.db`.

### Zmienne środowiskowe

Aplikacja wykorzystuje zmienne środowiskowe do konfiguracji połączenia z MongoDB oraz innych ustawień. Utwórz plik `.env` w katalogu `packages/backend` i uzupełnij go odpowiednimi wartościami:

```env
# MongoDB Credentials
MONGO_USER=twoj_uzytkownik_mongo
MONGO_PASSWORD=twoje_haslo_mongo
MONGO_HOST=localhost  # lub adres serwera MongoDB
MONGO_PORT=27017      # lub inny port MongoDB
DATABASE_NAME=czopek_db

# Pozostałe zmienne (np. klucze API)
OPENAI_API_KEY=...
SECRET_KEY=...
```

**Pamiętaj, aby dodać plik `.env` do `.gitignore**, aby nie trafił do repozytorium kodu.

**Uwaga:** Jeśli `MONGO_USER` i `MONGO_PASSWORD` nie zostaną ustawione w `.env`, aplikacja spróbuje połączyć się z MongoDB bez uwierzytelniania (przydatne dla domyślnej konfiguracji lokalnej).

## Rozwiązywanie problemów

Jeśli napotkasz problemy podczas migracji, sprawdź:

1. Czy MongoDB jest uruchomione:

   ```bash
   # Linux
   systemctl status mongod

   # macOS
   brew services list
   ```

2. Czy możesz połączyć się z MongoDB:

   ```bash
   mongosh
   ```

3. Czy skrypt migracji ma dostęp do pliku SQLite:
   ```bash
   ls -la sql_app.db
   ```

W przypadku problemów z połączeniem do MongoDB, upewnij się, że:

- Serwer MongoDB działa na standardowym porcie 27017
- Nie ma innych usług blokujących ten port
- Firewall zezwala na połączenia z portem 27017
