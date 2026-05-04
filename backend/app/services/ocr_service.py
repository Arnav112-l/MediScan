"""OpenCV preprocessing + Tesseract OCR; PDF text + first-page raster fallback via PyMuPDF."""
from __future__ import annotations

import io
import os
from typing import Tuple

import numpy as np
from PIL import Image

try:
    import cv2
except ImportError:
    cv2 = None

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None


def preprocess_numpy(arr: np.ndarray) -> np.ndarray:
    if cv2 is None:
        return arr
    gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
    blur = cv2.GaussianBlur(gray, (3, 3), 0)
    _, th = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return cv2.cvtColor(th, cv2.COLOR_GRAY2RGB)


def image_bytes_to_rgb(data: bytes) -> np.ndarray:
    im = Image.open(io.BytesIO(data)).convert("RGB")
    return np.array(im)


def _ocr_pil(pil: Image.Image) -> Tuple[str, str | None]:
    try:
        import pytesseract
    except ImportError:
        return "", "pytesseract not installed"

    tesseract_cmd = os.environ.get("TESSERACT_CMD")
    if tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = tesseract_cmd

    try:
        text = pytesseract.image_to_string(pil, lang=os.environ.get("TESSERACT_LANG", "eng"))
        return (text or "").strip(), None
    except Exception as exc:  # noqa: BLE001
        return "", str(exc)


def extract_text_from_image_bytes(image_bytes: bytes) -> tuple[str, str | None]:
    arr = image_bytes_to_rgb(image_bytes)
    processed = preprocess_numpy(arr)
    pil = Image.fromarray(processed)
    return _ocr_pil(pil)


def extract_text_from_pdf_bytes(data: bytes) -> tuple[str, str | None]:
    if fitz is None:
        return "", "PyMuPDF (pymupdf) not installed"
    try:
        doc = fitz.open(stream=data, filetype="pdf")
    except Exception as exc:  # noqa: BLE001
        return "", f"Cannot open PDF: {exc}"

    chunks: list[str] = []
    for i in range(min(len(doc), 5)):
        chunks.append(doc[i].get_text() or "")
    embedded = "\n".join(chunks).strip()
    if len(embedded) > 40:
        return embedded, None

    if len(doc) < 1:
        return "", "Empty PDF"
    try:
        pix = doc[0].get_pixmap(dpi=220, alpha=False)
        png_bytes = pix.tobytes("png")
    except Exception as exc:  # noqa: BLE001
        return "", f"PDF rasterize failed: {exc}"
    return extract_text_from_image_bytes(png_bytes)


def extract_document_text(data: bytes, filename: str = "") -> tuple[str, str | None]:
    """
    PDF (embedded text or OCR on rendered page) or image OCR. No synthetic prescription text.
    """
    if not data:
        return "", "empty file"
    fn = (filename or "").lower()
    is_pdf = data[:5] == b"%PDF-" or data[:4] == b"%PDF" or fn.endswith(".pdf")
    if is_pdf:
        return extract_text_from_pdf_bytes(data)
    return extract_text_from_image_bytes(data)
