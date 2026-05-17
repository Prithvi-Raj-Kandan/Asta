from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID


class ExtractionMetadata(BaseModel):
    """Schema for extraction metadata (CS205)."""
    extraction_job_id: UUID
    extracted_fields: Dict[str, Any]
    extraction_status: str
    extraction_date: datetime
    confidence_score: Optional[float] = None


class FileMetadataResponse(BaseModel):
    """Schema for file metadata response (CS205)."""
    file_id: UUID
    filename: str
    filetype: str
    filesize: int
    upload_date: datetime
    extraction_metadata: Optional[ExtractionMetadata] = None
    generated_documents: Optional[List[str]] = None

    class Config:
        from_attributes = True


class DocumentGeneratedResponse(BaseModel):
    """Schema for generated documents (CS205)."""
    id: UUID
    extraction_job_id: UUID
    document_type: str
    document_path: str
    generated_date: datetime

    class Config:
        from_attributes = True
