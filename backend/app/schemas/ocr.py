from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class OCRPageResult(BaseModel):
    page_number: int
    text: str
    line_count: int
    confidence: Optional[float] = None


class OCRExtractionResponse(BaseModel):
    upload_id: UUID
    engine: str
    source_type: str
    page_count: int
    extracted_text: str
    overall_confidence: Optional[float] = None
    pages: list[OCRPageResult]
    processed_at: datetime

    class Config:
        from_attributes = True