"""
Security utilities for authentication and authorization.
"""
import secrets
from typing import Optional
from datetime import datetime, timedelta

from fastapi import HTTPException, Security, Depends, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials, HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext

from .config import settings

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security schemes
security_basic = HTTPBasic()
security_bearer = HTTPBearer(auto_error=False)

# JWT Settings
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Generate password hash."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> dict:
    """Verify and decode a JWT token."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def verify_basic_auth(credentials: HTTPBasicCredentials = Depends(security_basic)) -> str:
    """
    Verify basic authentication credentials.
    Returns username if valid, raises HTTPException otherwise.
    """
    # Only enable if password is set in environment
    if not settings.basic_auth_password:
        return "anonymous"

    correct_username = secrets.compare_digest(
        credentials.username.encode("utf8"),
        settings.basic_auth_username.encode("utf8")
    )
    correct_password = secrets.compare_digest(
        credentials.password.encode("utf8"),
        settings.basic_auth_password.encode("utf8")
    )

    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Basic"},
        )

    return credentials.username


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer)
) -> dict:
    """
    Get current user from JWT token.
    Returns user info if valid, raises HTTPException otherwise.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = verify_token(credentials.credentials)
    email: str = payload.get("email")

    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

    # Check if email domain is allowed (if configured)
    if settings.allowed_email_domains_list:
        email_domain = email.split("@")[-1]
        if email_domain not in settings.allowed_email_domains_list:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email domain not allowed",
            )

    return {
        "email": email,
        "name": payload.get("name"),
        "picture": payload.get("picture"),
    }


def verify_email_domain(email: str) -> bool:
    """Check if email domain is in allowed list."""
    if not settings.allowed_email_domains_list:
        return True  # Allow all if not configured

    email_domain = email.split("@")[-1]
    return email_domain in settings.allowed_email_domains_list
