"""Generate thumbnails for images and video files and store them in MinIO."""
import io
import logging
import subprocess
import tempfile
import os
from PIL import Image, UnidentifiedImageError
from app.storage import download_object, upload_object

log = logging.getLogger(__name__)

THUMB_SIZE = (320, 320)

# Formats PIL cannot handle — skip thumbnail generation
UNSUPPORTED_IMAGE_TYPES = {
    "image/svg+xml",
    "image/x-icon",
    "image/vnd.microsoft.icon",
    "image/webp",  # already compressed, no need to re-thumb
}


def _image_thumb(data: bytes) -> bytes | None:
    try:
        img = Image.open(io.BytesIO(data))
        img.thumbnail(THUMB_SIZE, Image.LANCZOS)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGBA")
        elif img.mode != "RGB":
            img = img.convert("RGB")
        out = io.BytesIO()
        img.save(out, format="WEBP", quality=80)
        return out.getvalue()
    except UnidentifiedImageError:
        log.debug("Skipping unidentified image format")
        return None
    except Exception as e:
        log.warning(f"Image thumbnail failed: {e}")
        return None


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

    # Skip unsupported formats
    if mime_type in UNSUPPORTED_IMAGE_TYPES:
        log.debug(f"Skipping thumbnail for unsupported type: {mime_type}")
        return None

    if not (mime_type.startswith("image/") or mime_type.startswith("video/")):
        return None

    data = download_object(storage_key)
    if not data:
        log.warning(f"Empty file data for {file_id}")
        return None

    if mime_type.startswith("image/"):
        thumb_data = _image_thumb(data)
        thumb_key  = f"thumbs/{file_id}.webp"
    else:
        thumb_data = _video_thumb(data)
        thumb_key  = f"thumbs/{file_id}.jpg"

    if not thumb_data:
        return None

    upload_object(thumb_key, thumb_data, "image/webp")
    log.info(f"Thumbnail saved: {thumb_key}")
    return thumb_key
