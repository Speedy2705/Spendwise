from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from .database import get_db
from .models import User
from .security import JWT_SECRET, ALGORITHM

bearer_scheme = HTTPBearer(auto_error=True)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
    )

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        subject = payload.get("sub")
        if subject is None:
            raise unauthorized
        user_id = int(subject)
    except JWTError as exc:
        raise unauthorized from exc
    except ValueError as exc:
        raise unauthorized from exc

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise unauthorized
    return user
