# Czopek API

Backend API do komunikacji z ChatGPT, zabezpieczony tokenem Bearer.

## Wymagania

- Python 3.8+
- OpenAI API key
- API Token (do autoryzacji żądań)

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

4. Skopiuj `.env.example` do `.env` i uzupełnij zmienne środowiskowe:

```bash
cp .env.example .env
```

## Konfiguracja

W pliku `.env` ustaw następujące zmienne:

- `OPENAI_API_KEY` - klucz API do OpenAI
- `API_TOKEN` - token do autoryzacji żądań

## Uruchomienie

```bash
uvicorn main:app --reload
```

Serwer będzie dostępny pod adresem `http://localhost:8000`

## Endpointy

### POST /chat

Endpoint do komunikacji z ChatGPT. Wymaga autoryzacji Bearer Token.

Przykładowe żądanie:

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
