from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class UploadCreate(BaseModel):
    """Schema for creating an upload (CS204)."""
    filename: str
    filetype: str
    filesize: int


class UploadResponse(BaseModel):
    """Schema for upload response (CS204)."""
    id: UUID
    user_id: UUID
    filename: str
    filetype: str
    filesize: int
    status: str
    upload_date: datetime
    file_path: Optional[str] = None

    class Config:
        from_attributes = True


class UploadListResponse(BaseModel):
    """Schema for list of uploads (CS204)."""
    id: UUID
    filename: str
    filetype: str
    filesize: int
    status: str
    upload_date: datetime

    class Config:
        from_attributes = True
