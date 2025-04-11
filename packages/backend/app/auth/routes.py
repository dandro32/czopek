from fastapi import APIRouter, HTTPException, Depends, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from database import get_db
from .models import User, UserCreate, UserLogin, RefreshToken, DBUser
from security import (
    Token, verify_password, get_password_hash, create_access_token,
    create_refresh_token, verify_token
)

router = APIRouter()
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security), db: Session = Depends(get_db)):
    token_data = verify_token(credentials.credentials)
    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy token dostępu",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(DBUser).filter(DBUser.username == token_data.username).first()
    if user is None:
        raise HTTPException(status_code=404, detail="Użytkownik nie znaleziony")
    return user

@router.post("/register", response_model=User)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(DBUser).filter(DBUser.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Nazwa użytkownika jest już zajęta")
    
    db_user = db.query(DBUser).filter(DBUser.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email jest już zajęty")
    
    user_dict = user.dict()
    hashed_password = get_password_hash(user_dict["password"])
    del user_dict["password"]
    
    db_user = DBUser(**user_dict, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/login", response_model=Token)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.username == user_data.username).first()
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowa nazwa użytkownika lub hasło",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.username})
    refresh_token = create_refresh_token(data={"sub": user.username})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/refresh", response_model=Token)
async def refresh_token(token: RefreshToken, db: Session = Depends(get_db)):
    token_data = verify_token(token.refresh_token)
    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy token odświeżania",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(DBUser).filter(DBUser.username == token_data.username).first()
    if user is None:
        raise HTTPException(status_code=404, detail="Użytkownik nie znaleziony")
    
    access_token = create_access_token(data={"sub": user.username})
    refresh_token = create_refresh_token(data={"sub": user.username})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/logout")
async def logout(current_user: DBUser = Depends(get_current_user)):
    return {"message": "Wylogowano pomyślnie"} 