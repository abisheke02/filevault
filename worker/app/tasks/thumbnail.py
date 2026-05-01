"""Generate thumbnails for images and video files and store them in MinIO."""
import io
import subprocess
import tempfile
import os
from PIL import Image
from app.storage import download_object, upload_object

THUMB_SIZE = (320, 320)

def _image_thumb(data: bytes) -> bytes:
    img = Image.open(io.BytesIO(data))
    img.thumbnail(THUMB_SIZE, Image.LANCZOS)
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")
    out = io.BytesIO()
    img.save(out, format="WEBP", quality=80)
    return out.getvalue()

def _video_thumb(data: bytes) -> bytes:
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
    finally:
        os.unlink(src_path)
        if os.path.exists(out_path):
            os.unlink(out_path)

def generate_thumbnail(file_id: str, storage_key: str, mime_type: str) -> str | None:
    """Download the file, generate a thumbnail, upload it. Returns the thumbnail key."""
    data = download_object(storage_key)

    if mime_type.startswith("image/"):
        thumb_data = _image_thumb(data)
        thumb_mime = "image/webp"
    elif mime_type.startswith("video/"):
        thumb_data = _video_thumb(data)
        thumb_mime = "image/jpeg"
    else:
        return None

    thumb_key = f"thumbs/{file_id}.webp" if mime_type.startswith("image/") else f"thumbs/{file_id}.jpg"
    upload_object(thumb_key, thumb_data, thumb_mime)
    return thumb_key
