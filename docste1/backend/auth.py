from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import jwt
from jwt import ExpiredSignatureError, InvalidTokenError
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from database import database
from typing import Optional

router = APIRouter(prefix="/api", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "your_secret_key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


async def authenticate_user(username: str, password: str):
    """
    Аутентифицирует пользователя по имени и паролю.

    Args:
        username (str): Имя пользователя.
        password (str): Пароль.

    Returns:
        dict: Данные пользователя, если аутентификация успешна, иначе False.
    """
    query = '''
        SELECT id, username, password, role_id
        FROM users 
        WHERE username = :username AND active = 1
    '''
    user = await database.fetch_one(query, {"username": username})
    if not user:
        return False
    if not pwd_context.verify(password, user["password"]):
        return False
    return user


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """
    Создаёт JWT-токен.

    Args:
        data (dict): Данные для кодирования в токен.
        expires_delta (timedelta, optional): Время жизни токена.

    Returns:
        str: Закодированный JWT-токен.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


@router.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Эндпоинт для получения JWT-токена по логину и паролю.

    Args:
        form_data (OAuth2PasswordRequestForm): Данные формы логина.

    Returns:
        dict: Токен, тип токена, ID пользователя, роль и время жизни.
    """
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"], "id": user["id"], "role_id": user["role_id"]},
        expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "id": user["id"],
        "role_id": user["role_id"],
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }


@router.get("/verify-token")
async def verify_user_token(token: str = Depends(oauth2_scheme)):
    """
    Проверяет валидность JWT-токена.

    Args:
        token (str): JWT-токен.

    Returns:
        dict: Данные из токена (username).

    Raises:
        HTTPException: Если токен недействителен или истёк.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return {"username": username}
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
