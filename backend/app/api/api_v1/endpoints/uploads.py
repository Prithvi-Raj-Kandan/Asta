"""
CS204: File upload and management endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File
from sqlalchemy.orm import Session
from uuid import uuid4
import os
from pathlib import Path

from ....db.session import get_db
from ....models.reflected import UserSimple, ExtractionJob
from ....core.security import decode_access_token
from ....schemas.upload import UploadCreate, UploadResponse, UploadListResponse

router = APIRouter()

# Upload directory
UPLOAD_DIR = Path(__file__).resolve().parents[4] / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)


def get_current_user_id(authorization: str = None, db: Session = Depends(get_db)) -> str:
    """Extract and verify user from bearer token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )
    
    token = authorization.replace("Bearer ", "")
    payload = decode_access_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    user_id = payload.get("sub")
    user = db.query(UserSimple).filter(UserSimple.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user_id


@router.post("/", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(...),
    authorization: str = None,
    db: Session = Depends(get_db)
):
    """
    CS204: Upload a file.
    - file: the file to upload (multipart form data)
    - Authorization: Bearer token (header)
    """
    user_id = get_current_user_id(authorization, db)
    
    # Save file
    file_id = str(uuid4())
    file_extension = Path(file.filename).suffix
    saved_filename = f"{file_id}{file_extension}"
    file_path = UPLOAD_DIR / saved_filename
    
    # Read and save file content
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    filesize = len(content)
    filetype = file.content_type or "application/octet-stream"
    
    # Create extraction job record
    extraction_job = ExtractionJob(
        id=file_id,
        user_id=user_id,
        filename=file.filename,
        filetype=filetype,
        filesize=filesize,
        status="uploaded",
        file_path=str(file_path)
    )
    
    db.add(extraction_job)
    db.commit()
    db.refresh(extraction_job)
    
    return UploadResponse(
        id=extraction_job.id,
        user_id=extraction_job.user_id,
        filename=extraction_job.filename,
        filetype=extraction_job.filetype,
        filesize=extraction_job.filesize,
        status=extraction_job.status,
        upload_date=extraction_job.upload_date,
        file_path=extraction_job.file_path
    )


@router.get("/", response_model=list[UploadListResponse])
def list_uploads(
    authorization: str = None,
    db: Session = Depends(get_db)
):
    """
    CS204: List all uploads for the current user.
    - Authorization: Bearer token (header)
    """
    user_id = get_current_user_id(authorization, db)
    
    uploads = db.query(ExtractionJob).filter(
        ExtractionJob.user_id == user_id
    ).all()
    
    return [
        UploadListResponse(
            id=upload.id,
            filename=upload.filename,
            filetype=upload.filetype,
            filesize=upload.filesize,
            status=upload.status,
            upload_date=upload.upload_date
        )
        for upload in uploads
    ]


@router.get("/{upload_id}", response_model=UploadResponse)
def get_upload(
    upload_id: str,
    authorization: str = None,
    db: Session = Depends(get_db)
):
    """
    CS204: Get details of a specific upload.
    - upload_id: the ID of the upload
    - Authorization: Bearer token (header)
    """
    user_id = get_current_user_id(authorization, db)
    
    upload = db.query(ExtractionJob).filter(
        ExtractionJob.id == upload_id,
        ExtractionJob.user_id == user_id
    ).first()
    
    if not upload:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload not found"
        )
    
    return UploadResponse(
        id=upload.id,
        user_id=upload.user_id,
        filename=upload.filename,
        filetype=upload.filetype,
        filesize=upload.filesize,
        status=upload.status,
        upload_date=upload.upload_date,
        file_path=upload.file_path
    )


@router.get("/{upload_id}/file", status_code=status.HTTP_200_OK)
def download_file(
    upload_id: str,
    authorization: str = None,
    db: Session = Depends(get_db)
):
    """
    CS204: Download a file.
    - upload_id: the ID of the upload
    - Authorization: Bearer token (header)
    """
    from fastapi.responses import FileResponse
    
    user_id = get_current_user_id(authorization, db)
    
    upload = db.query(ExtractionJob).filter(
        ExtractionJob.id == upload_id,
        ExtractionJob.user_id == user_id
    ).first()
    
    if not upload or not upload.file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    if not os.path.exists(upload.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on disk"
        )
    
    return FileResponse(
        path=upload.file_path,
        filename=upload.filename,
        media_type=upload.filetype
    )
