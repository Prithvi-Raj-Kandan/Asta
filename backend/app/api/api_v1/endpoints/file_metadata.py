"""
CS205: File metadata and document generation endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from uuid import UUID

from ....db.session import get_db
from ....models.reflected import UserSimple, ExtractionJob, DocumentGenerated
from ....core.security import decode_access_token
from ....schemas.file_metadata import FileMetadataResponse, DocumentGeneratedResponse

router = APIRouter()


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


@router.get("/{file_id}/metadata", response_model=FileMetadataResponse)
def get_file_metadata(
    file_id: str,
    authorization: str = None,
    db: Session = Depends(get_db)
):
    """
    CS205: Get metadata for a file including extraction and generated documents.
    - file_id: the ID of the extraction job/file
    - Authorization: Bearer token (header)
    """
    user_id = get_current_user_id(authorization, db)
    
    # Get extraction job (file)
    extraction_job = db.query(ExtractionJob).filter(
        ExtractionJob.id == file_id,
        ExtractionJob.user_id == user_id
    ).first()
    
    if not extraction_job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Get generated documents for this extraction job
    generated_docs = db.query(DocumentGenerated).filter(
        DocumentGenerated.extraction_job_id == file_id
    ).all()
    
    generated_documents = [doc.document_type for doc in generated_docs]
    
    return FileMetadataResponse(
        file_id=extraction_job.id,
        filename=extraction_job.filename,
        filetype=extraction_job.filetype,
        filesize=extraction_job.filesize,
        upload_date=extraction_job.upload_date,
        extraction_metadata=None,  # Can be populated if extraction data is available
        generated_documents=generated_documents
    )


@router.get("/{file_id}/documents", response_model=list[DocumentGeneratedResponse])
def get_generated_documents(
    file_id: str,
    authorization: str = None,
    db: Session = Depends(get_db)
):
    """
    CS205: Get all generated documents for a file.
    - file_id: the ID of the extraction job
    - Authorization: Bearer token (header)
    """
    user_id = get_current_user_id(authorization, db)
    
    # Verify file belongs to user
    extraction_job = db.query(ExtractionJob).filter(
        ExtractionJob.id == file_id,
        ExtractionJob.user_id == user_id
    ).first()
    
    if not extraction_job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Get generated documents
    documents = db.query(DocumentGenerated).filter(
        DocumentGenerated.extraction_job_id == file_id
    ).all()
    
    return [
        DocumentGeneratedResponse(
            id=doc.id,
            extraction_job_id=doc.extraction_job_id,
            document_type=doc.document_type,
            document_path=doc.document_path,
            generated_date=doc.generated_date
        )
        for doc in documents
    ]


@router.get("/generated/documents", response_model=list[DocumentGeneratedResponse])
def get_all_generated_documents(
    authorization: str = None,
    db: Session = Depends(get_db)
):
    """
    CS205: Get all generated documents for the current user.
    - Authorization: Bearer token (header)
    """
    user_id = get_current_user_id(authorization, db)
    
    # Get all extraction jobs for this user
    extraction_jobs = db.query(ExtractionJob).filter(
        ExtractionJob.user_id == user_id
    ).all()
    
    job_ids = [job.id for job in extraction_jobs]
    
    # Get all generated documents for these jobs
    documents = db.query(DocumentGenerated).filter(
        DocumentGenerated.extraction_job_id.in_(job_ids)
    ).all() if job_ids else []
    
    return [
        DocumentGeneratedResponse(
            id=doc.id,
            extraction_job_id=doc.extraction_job_id,
            document_type=doc.document_type,
            document_path=doc.document_path,
            generated_date=doc.generated_date
        )
        for doc in documents
    ]
