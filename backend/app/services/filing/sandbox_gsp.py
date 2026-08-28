"""Sandbox.co.in filing provider."""
import os
from datetime import datetime, timedelta
from typing import Protocol, Any, Dict
from uuid import uuid4
import httpx
from sqlalchemy.orm import Session
from fastapi import HTTPException
from ...models.reflected import FilingAttempt
from ...core.config import settings

class FilingProvider(Protocol):
    def save_gstr1(self, db: Session, period: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        ...
    
    def submit_gstr1(self, db: Session, period: str, reference: str) -> Dict[str, Any]:
        ...


class SandboxGspClient:
    def __init__(self):
        self.base_url = settings.SANDBOX_BASE_URL.rstrip("/")
        self.api_key = settings.SANDBOX_API_KEY
        self.api_secret = settings.SANDBOX_API_SECRET
        self.api_version = "1.0.0"
        self._token: str | None = None
        self._token_expires: datetime | None = None

    def _log_attempt(self, db: Session, request_body: Dict[str, Any], response_body: Dict[str, Any], status: str) -> FilingAttempt:
        attempt = FilingAttempt()
        attempt.id = uuid4()
        attempt.created_at = datetime.utcnow()
        attempt.request_body = request_body
        attempt.response_body = response_body
        attempt.status = status
        db.add(attempt)
        db.flush()
        return attempt

    def _get_token(self) -> str:
        if self._token and self._token_expires and datetime.utcnow() < self._token_expires:
            return self._token
            
        if not self.api_key or not self.api_secret:
            raise HTTPException(status_code=500, detail="Sandbox.co.in credentials not configured")
            
        try:
            with httpx.Client() as client:
                res = client.post(
                    f"{self.base_url}/authenticate",
                    headers={
                        "x-api-key": self.api_key,
                        "x-api-secret": self.api_secret,
                        "x-api-version": self.api_version,
                        "Content-Type": "application/json"
                    },
                    json={},
                    timeout=10.0
                )
                data = res.json()
                if res.is_error or "access_token" not in data.get("data", {}):
                    raise HTTPException(status_code=502, detail=f"Failed to obtain token. API returned: {data}")
                    
                self._token = data["data"]["access_token"]
                self._token_expires = datetime.utcnow() + timedelta(hours=23)  # typically 24h
                return self._token
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"Failed to obtain Sandbox.co.in token: {str(e)}")

    def _get_headers(self) -> Dict[str, str]:
        token = self._get_token()
        return {
            "Content-Type": "application/json",
            "x-api-key": self.api_key,
            "x-api-version": "1.0",
            "authorization": token  # Note: Sandbox.co.in docs specifically say no "Bearer" prefix
        }

    def _parse_period(self, period: str) -> tuple[str, str]:
        """Convert '2026-08' to ('2026', '08')"""
        parts = period.split("-")
        if len(parts) == 2:
            return parts[0], parts[1]
        return "", ""

    def save_gstr1(self, db: Session, period: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        year, month = self._parse_period(period)
        request_body = payload
        
        try:
            with httpx.Client() as client:
                response = client.post(
                    f"{self.base_url}/gst/compliance/tax-payer/gstrs/gstr-1/{year}/{month}",
                    json=request_body,
                    headers=self._get_headers(),
                    timeout=30.0
                )
                response_body = response.json() if response.content else {}
                
                if not response.is_success:
                    self._log_attempt(db, request_body, response_body, "failed")
                    raise HTTPException(status_code=response.status_code, detail=response_body.get("message", "Failed to save GSTR-1 draft to Sandbox.co.in"))
                
                self._log_attempt(db, request_body, response_body, "success")
                return response_body
                
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"Sandbox.co.in API connection error: {str(e)}")

    def submit_gstr1(self, db: Session, period: str, reference: str) -> Dict[str, Any]:
        year, month = self._parse_period(period)
        request_body = {
            "reference_id": reference
        }
        
        try:
            with httpx.Client() as client:
                response = client.post(
                    f"{self.base_url}/gst/compliance/tax-payer/gstrs/gstr-1/{year}/{month}/file",
                    json=request_body,
                    headers=self._get_headers(),
                    timeout=30.0
                )
                response_body = response.json() if response.content else {}
                
                if not response.is_success:
                    self._log_attempt(db, request_body, response_body, "failed")
                    raise HTTPException(status_code=response.status_code, detail=response_body.get("message", "Failed to submit GSTR-1 to Sandbox.co.in"))
                
                attempt = self._log_attempt(db, request_body, response_body, "success")
                attempt.submitted_at = datetime.utcnow()
                db.flush()
                
                return response_body
                
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"Sandbox.co.in API connection error: {str(e)}")


def get_filing_provider() -> FilingProvider:
    return SandboxGspClient()
