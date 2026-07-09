"""Serviço de QR Code — gera imagem PNG e armazena no MinIO."""
import io
import uuid

import qrcode
from qrcode.image.pil import PilImage

from app.core.config import get_settings
from app.services import storage_service

settings = get_settings()


def generate_qr_code(device_id: uuid.UUID, evidence_number: str) -> tuple[str, str]:
    """
    Gera QR Code PNG para o dispositivo.

    Retorna:
        (object_name, presigned_url)
    """
    content = f"CADEIA-CUSTODIA|DEVICE:{device_id}|EVIDENCIA:{evidence_number}"

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(content)
    qr.make(fit=True)

    img: PilImage = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    png_bytes = buffer.getvalue()

    filename = f"qrcode_{evidence_number}.png"
    object_name = storage_service.upload_file(
        bucket=settings.MINIO_BUCKET_PHOTOS,
        data=png_bytes,
        filename=filename,
        content_type="image/png",
    )

    url = storage_service.get_presigned_url(
        bucket=settings.MINIO_BUCKET_PHOTOS,
        object_name=object_name,
        expires_seconds=86400 * 365,  # 1 ano
    )

    return object_name, url
