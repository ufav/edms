"""
MinIO service for file storage operations
"""

import os
import uuid
from contextlib import asynccontextmanager
from typing import Optional, BinaryIO
import aiobotocore.session
from fastapi import HTTPException
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


@asynccontextmanager
async def get_s3_client():
    """Context manager for S3 client"""
    session = aiobotocore.session.get_session()
    async with session.create_client(
        's3',
        endpoint_url=settings.MINIO_ENDPOINT,
        aws_access_key_id=settings.MINIO_ACCESS_KEY,
        aws_secret_access_key=settings.MINIO_SECRET_KEY
    ) as client:
        yield client


class MinIOService:
    """Service for MinIO operations"""
    
    @staticmethod
    def generate_file_key(
        project_number: str,
        document_number: str, 
        revision_code: str,
        revision_number: str,
        revision_description_id: int,
        revision_id: int,
        filename: str
    ) -> str:
        """
        Generate unique file key for MinIO storage
        Format: {project_number}/{document_number}/{revision_code}{revision_number}_{revision_description_id}_{revision_id}/{filename}
        """
        return f"{project_number}/{document_number}/{revision_code}{revision_number}_{revision_description_id}_{revision_id}/{filename}"
    
    @staticmethod
    async def upload_file(
        file_content: bytes,
        file_key: str,
        content_type: Optional[str] = None
    ) -> bool:
        """
        Upload file to MinIO
        
        Args:
            file_content: File content as bytes
            file_key: Unique key for the file in MinIO
            content_type: MIME type of the file
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            async with get_s3_client() as client:
                await client.put_object(
                    Bucket=settings.MINIO_BUCKET,
                    Key=file_key,
                    Body=file_content,
                    ContentType=content_type or 'application/octet-stream'
                )
                logger.info(f"File uploaded to MinIO: {file_key}")
                return True
        except Exception as e:
            logger.error(f"Failed to upload file {file_key}: {str(e)}")
            return False
    
    @staticmethod
    async def download_file(file_key: str) -> Optional[bytes]:
        """
        Download file from MinIO
        
        Args:
            file_key: Unique key for the file in MinIO
            
        Returns:
            bytes: File content or None if not found
        """
        try:
            async with get_s3_client() as client:
                response = await client.get_object(
                    Bucket=settings.MINIO_BUCKET,
                    Key=file_key
                )
                return await response['Body'].read()
        except Exception as e:
            logger.error(f"Failed to download file {file_key}: {str(e)}")
            return None
    
    @staticmethod
    async def delete_file(file_key: str) -> bool:
        """
        Delete file from MinIO
        
        Args:
            file_key: Unique key for the file in MinIO
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            async with get_s3_client() as client:
                await client.delete_object(
                    Bucket=settings.MINIO_BUCKET,
                    Key=file_key
                )
                logger.info(f"File deleted from MinIO: {file_key}")
                return True
        except Exception as e:
            logger.error(f"Failed to delete file {file_key}: {str(e)}")
            return False
    
    @staticmethod
    async def file_exists(file_key: str) -> bool:
        """
        Check if file exists in MinIO
        
        Args:
            file_key: Unique key for the file in MinIO
            
        Returns:
            bool: True if file exists, False otherwise
        """
        try:
            async with get_s3_client() as client:
                await client.head_object(
                    Bucket=settings.MINIO_BUCKET,
                    Key=file_key
                )
                return True
        except Exception:
            return False
    
    @staticmethod
    async def get_file_info(file_key: str) -> Optional[dict]:
        """
        Get file metadata from MinIO
        
        Args:
            file_key: Unique key for the file in MinIO
            
        Returns:
            dict: File metadata or None if not found
        """
        try:
            async with get_s3_client() as client:
                response = await client.head_object(
                    Bucket=settings.MINIO_BUCKET,
                    Key=file_key
                )
                return {
                    'size': response.get('ContentLength', 0),
                    'content_type': response.get('ContentType', 'application/octet-stream'),
                    'last_modified': response.get('LastModified'),
                    'etag': response.get('ETag', '').strip('"')
                }
        except Exception as e:
            logger.error(f"Failed to get file info for {file_key}: {str(e)}")
            return None
    
    @staticmethod
    async def generate_presigned_url(
        file_key: str,
        expiration: int = 3600
    ) -> Optional[str]:
        """
        Generate presigned URL for direct file access
        
        Args:
            file_key: Unique key for the file in MinIO
            expiration: URL expiration time in seconds (default: 1 hour)
            
        Returns:
            str: Presigned URL or None if failed
        """
        try:
            async with get_s3_client() as client:
                url = await client.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': settings.MINIO_BUCKET, 'Key': file_key},
                    ExpiresIn=expiration
                )
                return url
        except Exception as e:
            logger.error(f"Failed to generate presigned URL for {file_key}: {str(e)}")
            return None


# Global instance
minio_service = MinIOService()
