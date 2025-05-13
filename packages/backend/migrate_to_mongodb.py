import sqlite3
from pymongo import MongoClient
from datetime import datetime
from bson import ObjectId
import os

def migrate_sqlite_to_mongodb():
    # Konfiguracja połączenia do MongoDB
    mongo_client = MongoClient("mongodb://localhost:27017")
    mongo_db = mongo_client["czopek_db"]

    # Wyczyść istniejące kolekcje przed migracją
    print("Czyszczenie istniejących kolekcji w MongoDB...")
    mongo_db.users.delete_many({}) 
    mongo_db.tasks.delete_many({})
    print("Kolekcje wyczyszczone.")

    # Konfiguracja połączenia do SQLite
    sqlite_conn = sqlite3.connect("sql_app.db")
    sqlite_conn.row_factory = sqlite3.Row

    # Migracja użytkowników
    print("Migracja użytkowników...")
    cursor = sqlite_conn.execute("SELECT id, email, username, hashed_password, is_active FROM users")
    users = cursor.fetchall()
    
    user_id_map = {}  # Mapowanie starych ID na nowe ObjectID
    
    if users:
        for user in users:
            user_dict = dict(user)
            user_id = user_dict.pop('id')
            user_dict['_id'] = ObjectId()
            user_id_map[user_id] = user_dict['_id']
            
            mongo_db.users.insert_one(user_dict)
            print(f"Zmigrowano użytkownika: {user_dict['username']}")
    else:
        print("Brak użytkowników do migracji.")

    # Migracja zadań
    print("\nMigracja zadań...")
    cursor = sqlite_conn.execute("""
        SELECT id, title, description, due_date, user_id, priority, source, calendar_event_id, status
        FROM tasks
    """)
    tasks = cursor.fetchall()
    
    if tasks:
        for task in tasks:
            task_dict = dict(task)
            task_id = task_dict.pop('id')
            user_id = task_dict.pop('user_id')
            
            # Mapowanie statusu na completed
            status = task_dict.pop('status', 'pending') # Pobierz status, domyślnie 'pending'
            task_dict['completed'] = True if status == 'completed' else False
            
            # Konwersja dat
            if 'due_date' in task_dict and task_dict['due_date']:
                task_dict['due_date'] = datetime.fromisoformat(str(task_dict['due_date']).replace('Z', '+00:00'))
            
            # Przypisanie nowego ObjectID
            task_dict['_id'] = ObjectId()
            
            # Przypisanie nowego ID użytkownika jeśli istnieje w mapowaniu
            if user_id in user_id_map:
                task_dict['user_id'] = user_id_map[user_id]
            else:
                print(f"Ostrzeżenie: Nie znaleziono użytkownika o ID: {user_id} dla zadania: {task_dict['title']}")
                continue
            
            mongo_db.tasks.insert_one(task_dict)
            print(f"Zmigrowano zadanie: {task_dict['title']}")
    else:
        print("Brak zadań do migracji.")
    
    # Zamknięcie połączeń
    sqlite_conn.close()
    mongo_client.close()
    
    print("\nMigracja zakończona pomyślnie.")
    print(f"Zmigrowano {len(users)} użytkowników i {len(tasks)} zadań.")

if __name__ == "__main__":
    # Sprawdź czy plik bazy danych SQLite istnieje
    if os.path.exists("sql_app.db"):
        try:
            migrate_sqlite_to_mongodb()
        except Exception as e:
            print(f"Błąd podczas migracji: {e}")
    else:
        print("Nie znaleziono pliku bazy danych SQLite (sql_app.db).") 