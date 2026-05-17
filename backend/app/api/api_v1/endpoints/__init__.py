"""
API v1 endpoints module.
"""
from . import auth
from . import uploads
from . import file_metadata
from . import health

__all__ = ["auth", "uploads", "file_metadata", "health"]
