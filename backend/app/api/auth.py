"""
Authentication API endpoints.
"""
from fastapi import APIRouter, HTTPException, status, Depends
from google.oauth2 import id_token
from google.auth.transport import requests
from typing import Dict

from app.models.schemas import GoogleAuthRequest, TokenResponse, UserInfo
from app.core.config import settings
from app.core.security import create_access_token, verify_email_domain

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/google", response_model=TokenResponse)
async def google_auth(request: GoogleAuthRequest):
    """
    Authenticate with Google OAuth.

    Verifies the Google OAuth token and returns a JWT access token
    for use with other API endpoints.
    """
    try:
        # Verify Google token
        idinfo = id_token.verify_oauth2_token(
            request.token,
            requests.Request(),
            settings.google_client_id
        )

        # Extract user info
        email = idinfo.get('email')
        name = idinfo.get('name')
        picture = idinfo.get('picture')

        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email not found in Google token"
            )

        # Check if email domain is allowed
        if not verify_email_domain(email):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email domain not allowed. Please contact administrator."
            )

        # Create user data for JWT
        user_data = {
            "email": email,
            "name": name,
            "picture": picture,
        }

        # Create access token
        access_token = create_access_token(data=user_data)

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=user_data
        )

    except ValueError as e:
        # Token verification failed
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication failed: {str(e)}"
        )


@router.get("/me", response_model=UserInfo)
async def get_current_user_info(
    current_user: Dict = Depends(__import__('app.core.security', fromlist=['get_current_user']).get_current_user)
):
    """
    Get current user information.

    Returns the authenticated user's profile information.
    """
    return UserInfo(**current_user)


@router.post("/refresh")
async def refresh_token(
    current_user: Dict = Depends(__import__('app.core.security', fromlist=['get_current_user']).get_current_user)
):
    """
    Refresh access token.

    Returns a new JWT access token for the current user.
    """
    try:
        # Create new access token
        access_token = create_access_token(data=current_user)

        return {
            "access_token": access_token,
            "token_type": "bearer"
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Token refresh failed: {str(e)}"
        )
