from fastapi import APIRouter, HTTPException, Depends, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pymongo.database import Database
from database import async_get_db, get_sync_db # Import nowej funkcji async_get_db
from .models import User, UserCreate, UserLogin, RefreshToken, UserInDB # Import UserInDB
from security import (
    Token, verify_password, get_password_hash, create_access_token,
    create_refresh_token, verify_token, TokenData # Assume TokenData is defined here
)
from bson import ObjectId # Import ObjectId
from typing import Annotated # For Depends

router = APIRouter()
security = HTTPBearer()

async def get_user_from_db(db: Database, username: str) -> UserInDB | None:
    user_data = await db.users.find_one({"username": username})
    if user_data:
        # Dodaj ID jako string z _id
        user_data_copy = dict(user_data)
        user_data_copy["id"] = str(user_data["_id"])
        return UserInDB(**user_data_copy)
    return None

async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Security(security)], 
    db: Annotated[Database, Depends(async_get_db)]
) -> UserInDB:
    token_data = verify_token(credentials.credentials)
    if token_data is None or token_data.username is None: # Check for username
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy token dostępu",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = await get_user_from_db(db, token_data.username)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Użytkownik nie znaleziony")
    if not user.is_active:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nieaktywny użytkownik")
    return user

@router.post("/register", response_model=User)
async def register(user: UserCreate, db: Annotated[Database, Depends(async_get_db)]):
    existing_user = await db.users.find_one({"username": user.username})
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nazwa użytkownika jest już zajęta")
    
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email jest już zajęty")
    
    user_dict = user.dict()
    hashed_password = get_password_hash(user_dict.pop("password"))
    
    user_db_data = UserInDB(**user_dict, hashed_password=hashed_password, is_active=True)
    
    # Upewnij się, że usuwamy id jeśli jest None przed wstawieniem do MongoDB
    user_data_to_insert = user_db_data.dict(exclude_none=True)
    if "id" in user_data_to_insert:
        user_data_to_insert.pop("id")
    
    insert_result = await db.users.insert_one(user_data_to_insert)
    
    created_user = await db.users.find_one({"_id": insert_result.inserted_id})
    if created_user:
        created_user["id"] = str(created_user["_id"])
        return User(**created_user)
    else:
        # This case should ideally not happen if insert was successful
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Nie udało się utworzyć użytkownika")


@router.post("/login", response_model=Token)
async def login(user_data: UserLogin, db: Annotated[Database, Depends(async_get_db)]):
    user = await get_user_from_db(db, user_data.username)
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowa nazwa użytkownika lub hasło",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nieaktywny użytkownik")

    access_token = create_access_token(data={"sub": user.username})
    refresh_token = create_refresh_token(data={"sub": user.username})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/refresh", response_model=Token)
async def refresh_token_endpoint(token: RefreshToken, db: Annotated[Database, Depends(async_get_db)]):
    token_data = verify_token(token.refresh_token)
    if token_data is None or token_data.username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy token odświeżania",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = await get_user_from_db(db, token_data.username)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Użytkownik nie znaleziony lub nieaktywny"
        )
    
    access_token = create_access_token(data={"sub": user.username})
    # Optionally, generate a new refresh token as well for better security
    new_refresh_token = create_refresh_token(data={"sub": user.username})
    
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token, # Return the new one
        "token_type": "bearer"
    }

@router.post("/logout")
async def logout(current_user: Annotated[UserInDB, Depends(get_current_user)]):
    # In a stateless JWT setup, logout is typically handled client-side by deleting the token.
    # Server-side logout might involve blacklisting the token if needed.
    return {"message": "Wylogowano pomyślnie (token usunięty po stronie klienta)"}

@router.get("/me", response_model=User)
async def get_current_user_info(current_user: Annotated[UserInDB, Depends(get_current_user)]):
    # Używamy pydantic, aby przekonwertować UserInDB na User, pomijając hashed_password
    return User(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        is_active=current_user.is_active
    ) 