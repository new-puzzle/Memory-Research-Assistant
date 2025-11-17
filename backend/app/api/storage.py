"""
File storage API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, List

from app.models.schemas import (
    SaveFileRequest,
    SaveFileResponse,
    LoadFileRequest,
    LoadFileResponse,
)
from app.services import storage_service
from app.core.security import get_current_user

router = APIRouter(prefix="/storage", tags=["storage"])


@router.post("/save-file", response_model=SaveFileResponse)
async def save_file(
    request: SaveFileRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Save a file to Google Drive.

    Requires user to be authenticated with Google OAuth.
    Files are saved to the specified folder path in the user's Drive.
    """
    try:
        # Get user credentials from current_user
        # In a real implementation, you'd store and retrieve OAuth tokens
        user_credentials = current_user.get('credentials', {})

        if not user_credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Google Drive authentication required. Please connect your Google account."
            )

        result = await storage_service.save_to_drive(
            filename=request.filename,
            content=request.content,
            content_type=request.content_type,
            folder_path=request.folder_path,
            user_credentials=user_credentials
        )

        if not result.get('success'):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get('error', 'Failed to save file')
            )

        return SaveFileResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )


@router.post("/load-file", response_model=LoadFileResponse)
async def load_file(
    request: LoadFileRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Load a file from Google Drive.

    Can load by file ID or filename. If loading by filename,
    searches in the specified folder path.
    """
    try:
        # Get user credentials from current_user
        user_credentials = current_user.get('credentials', {})

        if not user_credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Google Drive authentication required. Please connect your Google account."
            )

        if not request.file_id and not request.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either file_id or filename must be provided"
            )

        result = await storage_service.load_from_drive(
            file_id=request.file_id,
            filename=request.filename,
            folder_path=request.folder_path or "/Memory-Palace",
            user_credentials=user_credentials
        )

        if not result.get('success'):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result.get('error', 'File not found')
            )

        return LoadFileResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load file: {str(e)}"
        )


@router.get("/list-files")
async def list_files(
    folder_path: str = "/Memory-Palace",
    current_user: Dict = Depends(get_current_user)
):
    """
    List all files in a Google Drive folder.

    Returns file metadata including names, IDs, and modification times.
    """
    try:
        user_credentials = current_user.get('credentials', {})

        if not user_credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Google Drive authentication required. Please connect your Google account."
            )

        result = await storage_service.list_files(
            folder_path=folder_path,
            user_credentials=user_credentials
        )

        if not result.get('success'):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get('error', 'Failed to list files')
            )

        return {
            "files": result['files'],
            "folder_path": folder_path
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list files: {str(e)}"
        )
