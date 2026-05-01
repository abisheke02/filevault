from io import BytesIO
from minio import Minio
from minio.error import S3Error
from app.config import settings

_client: Minio | None = None

def get_client() -> Minio:
    global _client
    if _client is None:
        _client = Minio(
            f"{settings.minio_endpoint}:{settings.minio_port}",
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_use_ssl,
        )
    return _client

def download_object(key: str) -> bytes:
    client = get_client()
    response = client.get_object(settings.minio_bucket, key)
    try:
        return response.read()
    finally:
        response.close()

def upload_object(key: str, data: bytes, content_type: str = "application/octet-stream") -> None:
    client = get_client()
    client.put_object(
        settings.minio_bucket,
        key,
        BytesIO(data),
        length=len(data),
        content_type=content_type,
    )
