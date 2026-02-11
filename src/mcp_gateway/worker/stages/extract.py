"""Extract stage — pull text from PDF/DOCX/RTF/TXT/JPEG."""

import io
import logging
import re
import tempfile
import uuid

import httpx
from sqlalchemy import select

from mcp_gateway.config import get_settings
from mcp_gateway.db_sync import get_sync_session
from mcp_gateway.events import publish_job_event
from mcp_gateway.minio_client import get_minio_client
from mcp_gateway.models import DocumentPage, DocumentVersion
from mcp_gateway.models.enums import JobStage
from mcp_gateway.worker.pipeline import mark_stage_done, mark_stage_running

logger = logging.getLogger(__name__)


def _extract_pdf(data: bytes) -> list[tuple[int, str]]:
    """Extract text from PDF using PyMuPDF. Returns [(page_num, text)]."""
    import fitz  # PyMuPDF

    pages = []
    with fitz.open(stream=data, filetype="pdf") as doc:
        for i, page in enumerate(doc):
            text = page.get_text("text") or ""
            pages.append((i + 1, text))
    return pages


def _extract_docx(data: bytes) -> list[tuple[int, str]]:
    """Extract text from DOCX. Treats entire document as page 1."""
    from docx import Document as DocxDocument

    doc = DocxDocument(io.BytesIO(data))
    full_text = "\n".join(p.text for p in doc.paragraphs)
    return [(1, full_text)]


def _extract_txt(data: bytes) -> list[tuple[int, str]]:
    """Plain text — single page."""
    text = data.decode("utf-8", errors="replace")
    return [(1, text)]


def _extract_via_tika(data: bytes, mime_type: str) -> list[tuple[int, str]]:
    """Fallback extraction via Apache Tika."""
    settings = get_settings()
    resp = httpx.put(
        f"{settings.tika_url}/tika",
        content=data,
        headers={"Content-Type": mime_type, "Accept": "text/plain"},
        timeout=120,
    )
    resp.raise_for_status()
    text = resp.text.strip()
    return [(1, text)]


def _alpha_ratio(text: str) -> float:
    """Fraction of alphabetic characters in text."""
    if not text:
        return 0.0
    alpha = sum(1 for c in text if c.isalpha())
    return alpha / len(text)


def run_extract(version_id: uuid.UUID) -> None:
    """Download file from MinIO, extract text, store pages."""
    mark_stage_running(version_id, JobStage.extract)

    session = get_sync_session()
    try:
        version = session.execute(
            select(DocumentVersion).where(DocumentVersion.version_id == version_id)
        ).scalar_one()

        # Download from MinIO
        client = get_minio_client()
        response = client.get_object(version.original_bucket, version.original_object_key)
        data = response.read()
        response.close()
        response.release_conn()

        mime = (version.mime_type or "").lower()

        # Dispatch by mime type
        if mime == "application/pdf" or version.original_object_key.endswith(".pdf"):
            pages = _extract_pdf(data)
        elif mime in (
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword",
        ) or version.original_object_key.endswith(".docx"):
            pages = _extract_docx(data)
        elif mime == "text/plain" or version.original_object_key.endswith(".txt"):
            pages = _extract_txt(data)
        elif mime in ("image/jpeg", "image/png", "image/tiff"):
            # Image — create empty page, OCR will fill it
            pages = [(1, "")]
        elif mime == "text/rtf" or version.original_object_key.endswith(".rtf"):
            pages = _extract_via_tika(data, mime or "text/rtf")
        else:
            # Fallback to Tika
            pages = _extract_via_tika(data, mime or "application/octet-stream")

        # Delete existing pages for this version (idempotency)
        existing_pages = session.execute(
            select(DocumentPage).where(DocumentPage.version_id == version_id)
        ).scalars().all()
        for p in existing_pages:
            session.delete(p)
        session.flush()

        # Store pages
        total_chars = 0
        for page_num, text in pages:
            page = DocumentPage(
                version_id=version_id,
                page_num=page_num,
                page_text=text,
                ocr_used=False,
            )
            session.add(page)
            total_chars += len(text)

        # Determine if OCR is needed
        is_image = mime in ("image/jpeg", "image/png", "image/tiff")
        is_pdf = mime == "application/pdf" or version.original_object_key.endswith(".pdf")
        is_never_ocr = mime in (
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain", "text/rtf",
        ) or version.original_object_key.endswith((".docx", ".txt", ".rtf"))

        if is_image:
            version.needs_ocr = True
            version.has_text_layer = False
        elif is_pdf:
            all_text = " ".join(text for _, text in pages)
            ratio = _alpha_ratio(all_text)
            version.has_text_layer = total_chars > 0
            version.needs_ocr = total_chars < 500 or ratio < 0.2
        elif is_never_ocr:
            version.needs_ocr = False
            version.has_text_layer = True
        else:
            # Unknown type — don't OCR
            version.needs_ocr = False
            version.has_text_layer = total_chars > 0

        version.extracted_chars = total_chars

        session.commit()
        logger.info(
            "Extracted %d pages, %d chars for version %s (needs_ocr=%s)",
            len(pages), total_chars, version_id, version.needs_ocr,
        )
    finally:
        session.close()

    mark_stage_done(version_id, JobStage.extract)
