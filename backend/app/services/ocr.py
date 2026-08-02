from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import fitz
import pdfplumber
from rapidocr_onnxruntime import RapidOCR


@dataclass(slots=True)
class OCRPageText:
    page_number: int
    text: str
    line_count: int
    confidence: Optional[float] = None


@dataclass(slots=True)
class OCRExtractionResult:
    engine: str
    source_type: str
    pages: list[OCRPageText]

    @property
    def extracted_text(self) -> str:
        return "\n\n".join(page.text for page in self.pages if page.text)

    @property
    def overall_confidence(self) -> Optional[float]:
        confidences = [page.confidence for page in self.pages if page.confidence is not None]
        if not confidences:
            return None
        return round(sum(confidences) / len(confidences), 4)


class OCRServiceError(RuntimeError):
    pass


class LocalOCRService:
    """Offline OCR service that prefers PDF text extraction and falls back to RapidOCR."""

    def __init__(self) -> None:
        self._engine = RapidOCR()
        self.engine_name = "rapidocr-onnxruntime"
        self.text_threshold = 80

    def extract(self, file_path: Path) -> OCRExtractionResult:
        if not file_path.exists():
            raise OCRServiceError(f"File does not exist: {file_path}")

        suffix = file_path.suffix.lower()
        if suffix == ".pdf":
            return self._extract_pdf(file_path)

        if suffix in {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"}:
            page = self._ocr_image(file_path.read_bytes(), 1)
            return OCRExtractionResult(
                engine=self.engine_name,
                source_type="image",
                pages=[page],
            )

        raise OCRServiceError(f"Unsupported file type for OCR: {suffix}")

    def _extract_pdf(self, file_path: Path) -> OCRExtractionResult:
        text_pages: list[OCRPageText] = []

        with fitz.open(file_path) as document:
            for index, page in enumerate(document, start=1):
                text = self._clean_text(page.get_text("text"))
                if len(text) >= self.text_threshold:
                    text_pages.append(
                        OCRPageText(
                            page_number=index,
                            text=text,
                            line_count=self._count_lines(text),
                            confidence=1.0,
                        )
                    )
                    continue

                pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
                ocr_page = self._ocr_image(pixmap.tobytes("png"), index)
                text_pages.append(ocr_page)

        if not text_pages:
            with pdfplumber.open(file_path) as pdf:
                for index, page in enumerate(pdf.pages, start=1):
                    text = self._clean_text(page.extract_text() or "")
                    if text:
                        text_pages.append(
                            OCRPageText(
                                page_number=index,
                                text=text,
                                line_count=self._count_lines(text),
                                confidence=1.0,
                            )
                        )

        return OCRExtractionResult(
            engine=self.engine_name,
            source_type="pdf",
            pages=text_pages,
        )

    def _ocr_image(self, image_content: bytes, page_number: int) -> OCRPageText:
        result, _elapsed = self._engine(image_content)
        if not result:
            return OCRPageText(page_number=page_number, text="", line_count=0, confidence=None)

        ordered_lines = [item[1].strip() for item in result if len(item) >= 3 and item[1]]
        confidences = [float(item[2]) for item in result if len(item) >= 3 and item[2] is not None]
        text = self._clean_text("\n".join(ordered_lines))
        confidence = round(sum(confidences) / len(confidences), 4) if confidences else None
        return OCRPageText(
            page_number=page_number,
            text=text,
            line_count=self._count_lines(text),
            confidence=confidence,
        )

    @staticmethod
    def _clean_text(text: str) -> str:
        lines = [line.strip() for line in text.splitlines()]
        return "\n".join(line for line in lines if line)

    @staticmethod
    def _count_lines(text: str) -> int:
        return len([line for line in text.splitlines() if line.strip()])