from pymongo import MongoClient
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def init_mongodb():
    try:
        # Połączenie z MongoDB
        logger.info("Łączenie z MongoDB...")
        client = MongoClient("mongodb://localhost:27017")
        db = client["czopek_db"]
        
        # Sprawdzenie połączenia
        server_info = client.server_info()
        logger.info(f"Połączono z MongoDB, wersja: {server_info.get('version')}")
        
        # Tworzenie kolekcji i indeksów
        logger.info("Tworzenie kolekcji i indeksów...")
        
        # Kolekcja users
        if "users" not in db.list_collection_names():
            db.create_collection("users")
        db.users.create_index("email", unique=True)
        db.users.create_index("username", unique=True)
        logger.info("Utworzono kolekcję users z indeksami")
        
        # Kolekcja tasks
        if "tasks" not in db.list_collection_names():
            db.create_collection("tasks")
        db.tasks.create_index("user_id")
        db.tasks.create_index([("title", "text"), ("description", "text")])
        logger.info("Utworzono kolekcję tasks z indeksami")
        
        # Kolekcja calendar_credentials
        if "calendar_credentials" not in db.list_collection_names():
            db.create_collection("calendar_credentials")
        db.calendar_credentials.create_index("user_id", unique=True)
        logger.info("Utworzono kolekcję calendar_credentials z indeksami")
        
        logger.info("Inicjalizacja MongoDB zakończona pomyślnie")
        return True
    except Exception as e:
        logger.error(f"Błąd podczas inicjalizacji MongoDB: {e}")
        return False

if __name__ == "__main__":
    init_mongodb() 