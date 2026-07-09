"""Serviço de Storage (MinIO/S3)."""
import io
import uuid

from minio import Minio
from minio.error import S3Error

from app.core.config import get_settings

settings = get_settings()


def _get_client() -> Minio:
    """Cliente interno para operações backend→MinIO (upload, delete, presign)."""
    return Minio(
        endpoint=settings.MINIO_ENDPOINT,
        access_key=settings.MINIO_ACCESS_KEY,
        secret_key=settings.MINIO_SECRET_KEY,
        secure=settings.MINIO_USE_SSL,
    )


def upload_file(
    bucket: str,
    data: bytes,
    filename: str,
    content_type: str = "application/octet-stream",
) -> str:
    """Faz upload para o bucket e retorna o object name."""
    client = _get_client()
    object_name = f"{uuid.uuid4()}/{filename}"
    client.put_object(
        bucket_name=bucket,
        object_name=object_name,
        data=io.BytesIO(data),
        length=len(data),
        content_type=content_type,
    )
    return object_name


def get_presigned_url(bucket: str, object_name: str, expires_seconds: int = 3600) -> str:
    """Gera URL pré-assinada para download acessível pelo browser.

    Estratégia:
    1. Assina a URL usando o cliente interno (minio:9000) — única forma de
       o backend se conectar ao MinIO dentro do Docker.
    2. Substitui a base http://minio:9000 pelo endereço público configurado
       em MINIO_PUBLIC_ENDPOINT (ex: http://localhost:5173/storage).

    O Nginx tem um location /storage/ que faz proxy para http://minio:9000/
    setando o header Host: minio:9000. Isso faz com que o MinIO receba o
    mesmo valor de Host que foi embutido na assinatura AWS4-HMAC — resolvendo
    o SignatureDoesNotMatch sem precisar de um segundo cliente.
    """
    from datetime import timedelta

    client = _get_client()
    url = client.presigned_get_object(
        bucket_name=bucket,
        object_name=object_name,
        expires=timedelta(seconds=expires_seconds),
    )

    # Reescreve base interna → base pública acessível pelo browser.
    # O MINIO_PUBLIC_ENDPOINT deve ser o prefixo SEM trailing slash,
    # ex: "http://localhost:5173/storage"
    internal_base = f"{'https' if settings.MINIO_USE_SSL else 'http'}://{settings.MINIO_ENDPOINT}"
    public_base = settings.MINIO_PUBLIC_ENDPOINT.rstrip("/")

    if url.startswith(internal_base):
        url = public_base + url[len(internal_base):]

    return url


def delete_object(bucket: str, object_name: str) -> None:
    """Remove objeto do bucket."""
    client = _get_client()
    client.remove_object(bucket, object_name)
