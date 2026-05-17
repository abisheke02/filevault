"""Generate thumbnails for images, video and PDF files and store them in MinIO."""
import io
import logging
import subprocess
import tempfile
import os
from PIL import Image, UnidentifiedImageError
from app.storage import download_object, upload_object

log = logging.getLogger(__name__)

THUMB_SIZE = (320, 320)

UNSUPPORTED_IMAGE_TYPES = {
    "image/svg+xml",
    "image/x-icon",
    "image/vnd.microsoft.icon",
    "image/webp",
}


def _to_webp(img: Image.Image) -> bytes:
    img.thumbnail(THUMB_SIZE, Image.LANCZOS)
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGB")
    out = io.BytesIO()
    img.save(out, format="WEBP", quality=80)
    return out.getvalue()


def _image_thumb(data: bytes) -> bytes | None:
    try:
        img = Image.open(io.BytesIO(data))
        return _to_webp(img)
    except UnidentifiedImageError:
        log.debug("Skipping unidentified image format")
        return None
    except Exception as e:
        log.warning(f"Image thumbnail failed: {e}")
        return None


def _pdf_thumb(data: bytes) -> bytes | None:
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as src_f:
        src_f.write(data)
        src_path = src_f.name

    prefix = src_path + "_pg"
    try:
        # Render first page to JPEG at 150 DPI, scaled to thumb width
        subprocess.run(
            [
                "pdftoppm", "-r", "150", "-singlefile", "-jpeg",
                "-scale-to-x", str(THUMB_SIZE[0]), "-scale-to-y", "-1",
                src_path, prefix,
            ],
            check=True,
            capture_output=True,
        )
        jpg_path = prefix + ".jpg"
        if not os.path.exists(jpg_path):
            log.warning("pdftoppm produced no output")
            return None
        img = Image.open(jpg_path)
        return _to_webp(img)
    except Exception as e:
        log.warning(f"PDF thumbnail failed: {e}")
        return None
    finally:
        os.unlink(src_path)
        for candidate in [prefix + ".jpg", prefix + "-1.jpg"]:
            if os.path.exists(candidate):
                os.unlink(candidate)


def _video_thumb(data: bytes) -> bytes | None:
    with tempfile.NamedTemporaryFile(suffix=".tmp", delete=False) as src_f:
        src_f.write(data)
        src_path = src_f.name

    out_path = src_path + ".jpg"
    try:
        subprocess.run(
            [
                "ffmpeg", "-y", "-i", src_path,
                "-vf", f"thumbnail,scale={THUMB_SIZE[0]}:-1",
                "-frames:v", "1", out_path,
            ],
            check=True,
            capture_output=True,
        )
        with open(out_path, "rb") as f:
            return f.read()
    except Exception as e:
        log.warning(f"Video thumbnail failed: {e}")
        return None
    finally:
        os.unlink(src_path)
        if os.path.exists(out_path):
            os.unlink(out_path)


def generate_thumbnail(file_id: str, storage_key: str, mime_type: str) -> str | None:
    """Download the file, generate a thumbnail, upload to MinIO. Returns thumb key or None."""

    if mime_type in UNSUPPORTED_IMAGE_TYPES:
        log.debug(f"Skipping unsupported type: {mime_type}")
        return None

    is_image = mime_type.startswith("image/")
    is_video = mime_type.startswith("video/")
    is_pdf   = mime_type == "application/pdf"

    if not (is_image or is_video or is_pdf):
        return None

    data = download_object(storage_key)
    if not data:
        log.warning(f"Empty file data for {file_id}")
        return None

    thumb_key = f"thumbs/{file_id}.webp"

    if is_image:
        thumb_data = _image_thumb(data)
    elif is_pdf:
        thumb_data = _pdf_thumb(data)
    else:
        thumb_data = _video_thumb(data)

    if not thumb_data:
        return None

    upload_object(thumb_key, thumb_data, "image/webp")
    log.info(f"Thumbnail saved: {thumb_key}")
    return thumb_key
