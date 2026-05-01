"""
FileVault worker — consumes JSON jobs from Redis lists.

Queues:
  fv:queue:thumbnails  — generate thumbnail, upload to MinIO
  fv:queue:indexer     — extract text, push to Meilisearch
"""
import json
import logging
import signal
import sys
import time
from redis import Redis
from app.config import settings
from app.tasks.thumbnail import generate_thumbnail
from app.tasks.indexer import index_file

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("worker")

THUMB_QUEUE = "fv:queue:thumbnails"
INDEX_QUEUE = "fv:queue:indexer"
QUEUES = [THUMB_QUEUE, INDEX_QUEUE]

_running = True

def _handle_sigterm(*_):
    global _running
    log.info("Shutdown signal received, finishing current job…")
    _running = False

signal.signal(signal.SIGTERM, _handle_sigterm)
signal.signal(signal.SIGINT, _handle_sigterm)


def _process_thumbnail(payload: dict) -> None:
    key = generate_thumbnail(
        file_id=payload["fileId"],
        storage_key=payload["storageKey"],
        mime_type=payload["mimeType"],
    )
    if key:
        log.info("thumbnail.done", extra={"file_id": payload["fileId"], "key": key})
    else:
        log.debug("thumbnail.skipped", extra={"mime": payload["mimeType"]})


def _process_indexer(payload: dict) -> None:
    index_file(
        file_id=payload["fileId"],
        storage_key=payload["storageKey"],
        mime_type=payload["mimeType"],
        name=payload["name"],
        owner_id=payload["ownerId"],
        folder_id=payload.get("folderId"),
        size_bytes=payload["sizeBytes"],
        created_at=payload.get("createdAt", int(time.time() * 1000)),
    )
    log.info("indexer.done", extra={"file_id": payload["fileId"]})


def main() -> None:
    redis_conn = Redis.from_url(settings.redis_url, decode_responses=True)

    # Verify connection
    redis_conn.ping()
    log.info(f"Worker ready — listening on {QUEUES}")

    while _running:
        try:
            result = redis_conn.brpop(QUEUES, timeout=5)
            if result is None:
                continue

            queue_name, raw = result
            payload = json.loads(raw)
            log.info(f"job.received queue={queue_name} file={payload.get('fileId')}")

            if queue_name == THUMB_QUEUE:
                _process_thumbnail(payload)
            elif queue_name == INDEX_QUEUE:
                _process_indexer(payload)

        except json.JSONDecodeError as e:
            log.error(f"job.invalid_json: {e}")
        except Exception as e:
            log.exception(f"job.failed: {e}")

    log.info("Worker stopped.")
    sys.exit(0)


if __name__ == "__main__":
    main()
