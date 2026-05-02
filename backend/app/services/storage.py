import io
import uuid
from pathlib import Path
from typing import Optional
import httpx
from PIL import Image
from minio import Minio
from minio.error import S3Error
from app.config import get_settings

class StorageService:
    def __init__(self):
        settings = get_settings()
        self._client = Minio(
            settings.minio_endpoint,
            access_key=settings.minio_root_user,
            secret_key=settings.minio_root_password,
            secure=settings.minio_secure,
        )
        self._bucket = settings.minio_bucket_labels

    async def ensure_bucket(self) -> None:
        """Create bucket if it doesn't exist. Called at startup."""
        if not self._client.bucket_exists(self._bucket):
            self._client.make_bucket(self._bucket)

    async def upload_label(
        self,
        user_id: str,
        file_data: bytes,
        content_type: str,
        extension: str = "jpg",
    ) -> tuple[str, str]:
        """
        Upload a wine label photo.
        Returns (storage_key, thumbnail_key).
        IMPORTANT: Always delete DB record AND MinIO object together — never orphan either.
        """
        object_id = str(uuid.uuid4())
        storage_key = f"labels/{user_id}/{object_id}.{extension}"
        thumb_key = f"labels/{user_id}/{object_id}_thumb.{extension}"

        # Upload original
        self._client.put_object(
            self._bucket,
            storage_key,
            io.BytesIO(file_data),
            length=len(file_data),
            content_type=content_type,
        )

        # Generate and upload thumbnail
        thumb_data = await self.generate_thumbnail(file_data)
        self._client.put_object(
            self._bucket,
            thumb_key,
            io.BytesIO(thumb_data),
            length=len(thumb_data),
            content_type=content_type,
        )

        return storage_key, thumb_key

    async def get_presigned_url(self, storage_key: str, expires_seconds: int = 3600) -> str:
        """Returns a presigned URL for temporary client access."""
        from datetime import timedelta
        url = self._client.presigned_get_object(
            self._bucket,
            storage_key,
            expires=timedelta(seconds=expires_seconds),
        )
        return url

    async def delete_object(self, storage_key: str) -> None:
        """
        Delete from MinIO. Call this ONLY as part of a transaction that also
        deletes the DB record. Never delete one without the other.
        """
        try:
            self._client.remove_object(self._bucket, storage_key)
        except S3Error as e:
            if e.code != "NoSuchKey":
                raise

    async def generate_thumbnail(self, file_data: bytes, max_px: int = 400) -> bytes:
        """Resize to max_px on longest side, preserve aspect ratio, return JPEG bytes."""
        img = Image.open(io.BytesIO(file_data))
        img.thumbnail((max_px, max_px), Image.LANCZOS)
        output = io.BytesIO()
        img.convert("RGB").save(output, format="JPEG", quality=85, optimize=True)
        return output.getvalue()


# Module-level singleton
_storage: Optional[StorageService] = None

def get_storage() -> StorageService:
    global _storage
    if _storage is None:
        _storage = StorageService()
    return _storage
