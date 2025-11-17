"""
Google Drive and Cloud Storage service for file operations.
"""
import json
import os
from typing import Optional, Dict, Any
from datetime import datetime
import io

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload, MediaIoBaseUpload, MediaIoBaseDownload
from google.cloud import storage as gcs_storage

from app.core.config import settings


class StorageService:
    """Service for Google Drive and Cloud Storage operations."""

    # Google Drive scopes
    SCOPES = [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive.metadata.readonly'
    ]

    def __init__(self):
        self.drive_service = None
        self.gcs_client = None

    def get_drive_service(self, user_credentials: dict):
        """
        Initialize Google Drive service with user credentials.
        """
        creds = Credentials(
            token=user_credentials.get('access_token'),
            refresh_token=user_credentials.get('refresh_token'),
            token_uri='https://oauth2.googleapis.com/token',
            client_id=settings.google_client_id,
            client_secret=settings.google_client_secret,
            scopes=self.SCOPES
        )

        # Refresh token if expired
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())

        return build('drive', 'v3', credentials=creds)

    def get_gcs_client(self):
        """Initialize Google Cloud Storage client with service account."""
        if not self.gcs_client:
            # Check if service account file exists
            if os.path.exists(settings.google_service_account_json):
                self.gcs_client = gcs_storage.Client.from_service_account_json(
                    settings.google_service_account_json
                )
            else:
                # Try using default credentials
                try:
                    self.gcs_client = gcs_storage.Client()
                except Exception:
                    pass

        return self.gcs_client

    async def save_to_drive(
        self,
        filename: str,
        content: str,
        content_type: str,
        folder_path: str,
        user_credentials: dict
    ) -> Dict[str, Any]:
        """
        Save file to Google Drive.
        """
        try:
            service = self.get_drive_service(user_credentials)

            # Create or find folder
            folder_id = self._get_or_create_folder(service, folder_path)

            # Prepare file metadata
            file_metadata = {
                'name': filename,
                'parents': [folder_id] if folder_id else []
            }

            # Create media upload from string content
            media = MediaIoBaseUpload(
                io.BytesIO(content.encode('utf-8')),
                mimetype=content_type,
                resumable=True
            )

            # Upload file
            file = service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id, name, webViewLink'
            ).execute()

            return {
                'file_id': file.get('id'),
                'filename': file.get('name'),
                'web_view_link': file.get('webViewLink'),
                'success': True
            }

        except Exception as e:
            return {
                'file_id': None,
                'filename': filename,
                'web_view_link': None,
                'success': False,
                'error': str(e)
            }

    async def load_from_drive(
        self,
        file_id: Optional[str],
        filename: Optional[str],
        folder_path: str,
        user_credentials: dict
    ) -> Dict[str, Any]:
        """
        Load file from Google Drive.
        """
        try:
            service = self.get_drive_service(user_credentials)

            # Find file by name if ID not provided
            if not file_id and filename:
                folder_id = self._get_or_create_folder(service, folder_path)
                query = f"name='{filename}'"
                if folder_id:
                    query += f" and '{folder_id}' in parents"

                results = service.files().list(
                    q=query,
                    fields='files(id, name, mimeType, modifiedTime)',
                    pageSize=1
                ).execute()

                files = results.get('files', [])
                if not files:
                    return {
                        'success': False,
                        'error': 'File not found'
                    }

                file_id = files[0]['id']
                file_metadata = files[0]
            else:
                # Get file metadata
                file_metadata = service.files().get(
                    fileId=file_id,
                    fields='id, name, mimeType, modifiedTime'
                ).execute()

            # Download file content
            request = service.files().get_media(fileId=file_id)
            file_content = io.BytesIO()
            downloader = MediaIoBaseDownload(file_content, request)

            done = False
            while not done:
                status, done = downloader.next_chunk()

            # Get content as string
            content = file_content.getvalue().decode('utf-8')

            return {
                'filename': file_metadata['name'],
                'content': content,
                'content_type': file_metadata['mimeType'],
                'last_modified': datetime.fromisoformat(
                    file_metadata['modifiedTime'].replace('Z', '+00:00')
                ),
                'success': True
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    async def save_to_gcs(
        self,
        bucket_name: str,
        filename: str,
        content: str,
        content_type: str
    ) -> Dict[str, Any]:
        """
        Save file to Google Cloud Storage.
        """
        try:
            client = self.get_gcs_client()
            if not client:
                return {
                    'success': False,
                    'error': 'GCS client not initialized'
                }

            bucket = client.bucket(bucket_name)
            blob = bucket.blob(filename)

            blob.upload_from_string(
                content,
                content_type=content_type
            )

            return {
                'file_id': filename,
                'filename': filename,
                'web_view_link': blob.public_url,
                'success': True
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    async def load_from_gcs(
        self,
        bucket_name: str,
        filename: str
    ) -> Dict[str, Any]:
        """
        Load file from Google Cloud Storage.
        """
        try:
            client = self.get_gcs_client()
            if not client:
                return {
                    'success': False,
                    'error': 'GCS client not initialized'
                }

            bucket = client.bucket(bucket_name)
            blob = bucket.blob(filename)

            content = blob.download_as_text()

            return {
                'filename': filename,
                'content': content,
                'content_type': blob.content_type,
                'last_modified': blob.updated,
                'success': True
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def _get_or_create_folder(self, service, folder_path: str) -> Optional[str]:
        """Get or create folder in Google Drive."""
        if not folder_path or folder_path == '/':
            return None

        # Remove leading/trailing slashes
        folder_path = folder_path.strip('/')

        # Split path into parts
        parts = folder_path.split('/')

        parent_id = None
        for folder_name in parts:
            # Search for folder
            query = f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder'"
            if parent_id:
                query += f" and '{parent_id}' in parents"

            results = service.files().list(
                q=query,
                fields='files(id, name)',
                pageSize=1
            ).execute()

            files = results.get('files', [])

            if files:
                parent_id = files[0]['id']
            else:
                # Create folder
                file_metadata = {
                    'name': folder_name,
                    'mimeType': 'application/vnd.google-apps.folder',
                    'parents': [parent_id] if parent_id else []
                }

                folder = service.files().create(
                    body=file_metadata,
                    fields='id'
                ).execute()

                parent_id = folder.get('id')

        return parent_id

    async def list_files(
        self,
        folder_path: str,
        user_credentials: dict
    ) -> Dict[str, Any]:
        """List files in a Google Drive folder."""
        try:
            service = self.get_drive_service(user_credentials)
            folder_id = self._get_or_create_folder(service, folder_path)

            query = "trashed=false"
            if folder_id:
                query += f" and '{folder_id}' in parents"

            results = service.files().list(
                q=query,
                fields='files(id, name, mimeType, modifiedTime, size)',
                pageSize=100,
                orderBy='modifiedTime desc'
            ).execute()

            files = results.get('files', [])

            return {
                'files': files,
                'success': True
            }

        except Exception as e:
            return {
                'files': [],
                'success': False,
                'error': str(e)
            }


# Global service instance
storage_service = StorageService()
