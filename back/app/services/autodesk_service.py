"""
Autodesk Platform Services (APS) integration service
"""

import base64
import requests
import time
from typing import Optional, Dict, Any
from app.core.config import settings


class AutodeskService:
    """Сервис для работы с Autodesk Platform Services API"""
    
    BASE_URL = "https://developer.api.autodesk.com"
    TOKEN_URL = f"{BASE_URL}/authentication/v2/token"
    DATA_MANAGEMENT_URL = f"{BASE_URL}/data/v1"
    MODEL_DERIVATIVE_URL = f"{BASE_URL}/modelderivative/v2"
    
    def __init__(self):
        self.client_id = settings.AUTODESK_CLIENT_ID
        self.client_secret = settings.AUTODESK_CLIENT_SECRET
        self.bucket_key = settings.AUTODESK_BUCKET_KEY
        self._access_token: Optional[str] = None
        self._token_expires_at: float = 0
    
    def _get_access_token(self) -> str:
        """Получить токен доступа Autodesk (с кэшированием)"""
        # Проверяем, не истек ли токен (оставляем запас 60 секунд)
        if self._access_token and time.time() < self._token_expires_at - 60:
            return self._access_token
        
        if not self.client_id or not self.client_secret:
            raise ValueError("Autodesk credentials not configured")
        
        # Получаем новый токен
        auth_string = f"{self.client_id}:{self.client_secret}"
        auth_bytes = auth_string.encode('utf-8')
        auth_b64 = base64.b64encode(auth_bytes).decode('utf-8')
        
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': f'Basic {auth_b64}'
        }
        
        data = {
            'grant_type': 'client_credentials',
            'scope': 'data:read data:write data:create bucket:read bucket:create code:all'
        }
        
        response = requests.post(self.TOKEN_URL, headers=headers, data=data)
        response.raise_for_status()
        
        token_data = response.json()
        self._access_token = token_data['access_token']
        # Токен обычно действителен 3600 секунд (1 час)
        self._token_expires_at = time.time() + token_data.get('expires_in', 3600)
        
        return self._access_token
    
    def _ensure_bucket(self) -> None:
        """Убедиться, что bucket существует, если нет - создать"""
        token = self._get_access_token()
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        
        # Проверяем существование bucket
        check_url = f"{self.DATA_MANAGEMENT_URL}/buckets/{self.bucket_key}/details"
        response = requests.get(check_url, headers=headers)
        
        if response.status_code == 404:
            # Создаем bucket
            create_url = f"{self.DATA_MANAGEMENT_URL}/buckets"
            bucket_data = {
                'bucketKey': self.bucket_key,
                'policyKey': 'temporary'  # или 'persistent' для постоянного хранения
            }
            create_response = requests.post(create_url, headers=headers, json=bucket_data)
            if create_response.status_code not in [200, 201, 409]:  # 409 = уже существует
                create_response.raise_for_status()
        elif response.status_code not in [200, 404]:
            response.raise_for_status()
    
    def upload_file(self, file_content: bytes, object_name: str) -> Dict[str, Any]:
        """
        Загрузить файл в Autodesk OSS
        
        Args:
            file_content: Содержимое файла в байтах
            object_name: Имя объекта в bucket (например, 'project/document/file.dwg')
        
        Returns:
            Dict с информацией о загруженном файле, включая object_id
        """
        token = self._get_access_token()
        self._ensure_bucket()
        
        # Загружаем файл в OSS
        upload_url = f"{self.DATA_MANAGEMENT_URL}/oss/v2/buckets/{self.bucket_key}/objects/{object_name}"
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/octet-stream'
        }
        
        response = requests.put(upload_url, headers=headers, data=file_content)
        response.raise_for_status()
        
        upload_data = response.json()
        object_id = upload_data.get('objectId')
        
        if not object_id:
            raise ValueError("Failed to get object ID from upload response")
        
        return {
            'object_id': object_id,
            'bucket_key': self.bucket_key,
            'object_name': object_name
        }
    
    def translate_file(self, object_id: str, root_filename: str) -> str:
        """
        Запустить перевод файла для просмотра
        
        Args:
            object_id: ID объекта в Autodesk OSS (base64 encoded URN)
            root_filename: Имя корневого файла (например, 'file.dwg')
        
        Returns:
            URN для просмотра (base64 encoded)
        """
        token = self._get_access_token()
        
        # Определяем формат вывода на основе расширения файла
        file_ext = root_filename.lower().split('.')[-1] if '.' in root_filename else ''
        
        # Для DWG/DXF файлов используем формат SVF с 2D представлением
        if file_ext in ['dwg', 'dxf']:
            output_formats = [{'type': 'svf', 'views': ['2d']}]
        else:
            output_formats = [{'type': 'svf', 'views': ['2d', '3d']}]
        
        translate_url = f"{self.MODEL_DERIVATIVE_URL}/designdata/job"
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        
        job_data = {
            'input': {
                'urn': object_id
            },
            'output': {
                'formats': output_formats
            }
        }
        
        response = requests.post(translate_url, headers=headers, json=job_data)
        response.raise_for_status()
        
        # Возвращаем URN для просмотра
        return object_id
    
    def get_translation_status(self, urn: str) -> Dict[str, Any]:
        """
        Проверить статус перевода файла
        
        Args:
            urn: URN файла (base64 encoded)
        
        Returns:
            Dict со статусом перевода
        """
        token = self._get_access_token()
        
        # URN должен быть base64 encoded для URL
        urn_encoded = urn.replace('=', '%3D').replace('+', '%2B').replace('/', '%2F')
        
        status_url = f"{self.MODEL_DERIVATIVE_URL}/designdata/{urn_encoded}/manifest"
        headers = {
            'Authorization': f'Bearer {token}'
        }
        
        response = requests.get(status_url, headers=headers)
        response.raise_for_status()
        
        return response.json()
    
    def get_viewer_token(self) -> str:
        """Получить токен для использования в Autodesk Viewer на фронтенде"""
        return self._get_access_token()


# Создаем глобальный экземпляр сервиса
autodesk_service = AutodeskService()
