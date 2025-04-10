# Czopek API

Backend API do komunikacji z ChatGPT, zabezpieczony tokenem Bearer.

## Wymagania

- Python 3.8+
- OpenAI API key
- Klucz sekretny do generowania tokenów JWT

## Instalacja

1. Sklonuj repozytorium:

```bash
git clone https://github.com/dandro32/czopek.git
cd czopek
```

2. Utwórz i aktywuj wirtualne środowisko:

```bash
python -m venv venv
source venv/bin/activate  # dla Linux/Mac
# lub
venv\Scripts\activate  # dla Windows
```

3. Zainstaluj zależności:

```bash
pip install -r requirements.txt
```

4. Skopiuj `.env.example` do `.env`:

```bash
cp .env.example .env
```

5. Skonfiguruj zmienne środowiskowe w pliku `.env`:
   - `OPENAI_API_KEY` - twój klucz API do OpenAI
   - `SECRET_KEY` - wygeneruj bezpieczny klucz sekretny używając komendy:
     ```bash
     openssl rand -hex 32
     ```

## Uruchomienie

```bash
uvicorn main:app --reload
```

Serwer będzie dostępny pod adresem `http://localhost:8000`

## Endpointy

### POST /register

Rejestracja nowego użytkownika.

```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123"
}
```

### POST /login

Logowanie użytkownika. Zwraca access token i refresh token.

```json
{
  "username": "username",
  "password": "password123"
}
```

### POST /refresh

Odświeżanie tokenu dostępu.

```json
{
  "refresh_token": "your_refresh_token"
}
```

### POST /chat

Endpoint do komunikacji z ChatGPT. Wymaga tokenu dostępu w nagłówku Authorization.

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Cześć, jak się masz?"
    }
  ]
}
```

### GET /health

Endpoint do sprawdzenia statusu API.
