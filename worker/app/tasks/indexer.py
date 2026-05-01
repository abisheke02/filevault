"""Extract text from files and push to Meilisearch for full-text search."""
import io
import meilisearch
from pypdf import PdfReader
from docx import Document
from app.storage import download_object
from app.config import settings

_meili: meilisearch.Client | None = None

def get_meili() -> meilisearch.Client:
    global _meili
    if _meili is None:
        _meili = meilisearch.Client(settings.meili_host, settings.meili_master_key)
    return _meili

def _extract_pdf(data: bytes) -> str:
    reader = PdfReader(io.BytesIO(data))
    parts = []
    for page in reader.pages[:20]:  # cap at 20 pages to avoid huge docs
        text = page.extract_text()
        if text:
            parts.append(text)
    return " ".join(parts)[:50_000]  # cap total chars

def _extract_docx(data: bytes) -> str:
    doc = Document(io.BytesIO(data))
    return " ".join(p.text for p in doc.paragraphs if p.text)[:50_000]

def _extract_text(data: bytes) -> str:
    return data.decode("utf-8", errors="ignore")[:50_000]

def index_file(
    file_id: str,
    storage_key: str,
    mime_type: str,
    name: str,
    owner_id: str,
    folder_id: str | None,
    size_bytes: int,
    created_at: int,
) -> None:
    data = download_object(storage_key)

    content = ""
    if "pdf" in mime_type:
        content = _extract_pdf(data)
    elif "wordprocessingml" in mime_type or mime_type.endswith("docx"):
        content = _extract_docx(data)
    elif mime_type.startswith("text/"):
        content = _extract_text(data)

    doc = {
        "id": file_id,
        "name": name,
        "mimeType": mime_type,
        "ownerId": owner_id,
        "folderId": folder_id,
        "sizeBytes": size_bytes,
        "content": content,
        "createdAt": created_at,
    }
    get_meili().index("files").add_documents([doc])
