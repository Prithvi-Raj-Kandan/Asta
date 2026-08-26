from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import fitz
import pdfplumber
import pytesseract
from PIL import Image


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


def _configure_tesseract() -> None:
    if getattr(pytesseract.pytesseract, "tesseract_cmd", None) and Path(
        str(pytesseract.pytesseract.tesseract_cmd)
    ).exists():
        return
    candidates = [
        Path(r"C:\Program Files\Tesseract-OCR\tesseract.exe"),
        Path(r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe"),
        Path("/usr/bin/tesseract"),
        Path("/usr/local/bin/tesseract"),
    ]
    for candidate in candidates:
        if candidate.exists():
            pytesseract.pytesseract.tesseract_cmd = str(candidate)
            return


class LocalOCRService:
    """Local-only OCR: PDF text extraction first, then Tesseract for images/scans."""

    def __init__(self) -> None:
        _configure_tesseract()
        self.engine_name = "tesseract"
        self.text_threshold = 80

    def extract(self, file_path: Path) -> OCRExtractionResult:
        if not file_path.exists():
            raise OCRServiceError(f"File does not exist: {file_path}")

        suffix = file_path.suffix.lower()
        if suffix == ".pdf":
            return self._extract_pdf(file_path)

        if suffix in {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"}:
            page = self._ocr_image_path(file_path, 1)
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

                pixmap = page.get_pixmap(matrix=fitz.Matrix(3, 3), alpha=False)
                ocr_page = self._ocr_image_bytes(pixmap.tobytes("png"), index)
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

    def _ocr_image_path(self, file_path: Path, page_number: int) -> OCRPageText:
        image = self._preprocess_pil(Image.open(file_path))
        return self._run_tesseract(image, page_number)

    def _ocr_image_bytes(self, image_content: bytes, page_number: int) -> OCRPageText:
        from io import BytesIO

        image = self._preprocess_pil(Image.open(BytesIO(image_content)))
        return self._run_tesseract(image, page_number)

    def _run_tesseract(self, image: Image.Image, page_number: int) -> OCRPageText:
        try:
            data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
            lines: list[str] = []
            confidences: list[float] = []
            current_line_num = None
            current_words: list[str] = []

            n = len(data.get("text", []))
            for i in range(n):
                word = (data["text"][i] or "").strip()
                conf_raw = data["conf"][i]
                try:
                    conf = float(conf_raw)
                except (TypeError, ValueError):
                    conf = -1.0
                line_num = data["line_num"][i]
                if not word:
                    continue
                if current_line_num is None:
                    current_line_num = line_num
                if line_num != current_line_num:
                    if current_words:
                        lines.append(" ".join(current_words))
                    current_words = [word]
                    current_line_num = line_num
                else:
                    current_words.append(word)
                if conf >= 0:
                    confidences.append(conf / 100.0)

            if current_words:
                lines.append(" ".join(current_words))

            if not lines:
                text = self._clean_text(pytesseract.image_to_string(image))
            else:
                text = self._clean_text("\n".join(lines))

            confidence = round(sum(confidences) / len(confidences), 4) if confidences else None
            return OCRPageText(
                page_number=page_number,
                text=text,
                line_count=self._count_lines(text),
                confidence=confidence,
            )
        except Exception as exc:
            raise OCRServiceError(
                "Tesseract OCR failed. Install Tesseract OCR locally and ensure it is on PATH."
            ) from exc

    @staticmethod
    def _preprocess_pil(image: Image.Image) -> Image.Image:
        gray = image.convert("L")
        width, height = gray.size
        longest = max(width, height)
        if longest < 1400:
            scale = 1400 / longest
            gray = gray.resize((int(width * scale), int(height * scale)), Image.Resampling.LANCZOS)
        # Simple contrast stretch via point transform
        return gray.point(lambda x: 0 if x < 40 else (255 if x > 210 else x))

    @staticmethod
    def _clean_text(text: str) -> str:
        lines = [line.strip() for line in text.splitlines()]
        return "\n".join(line for line in lines if line)

    @staticmethod
    def _count_lines(text: str) -> int:
        return len([line for line in text.splitlines() if line.strip()])
