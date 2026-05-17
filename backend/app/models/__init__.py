from ..db.base import prepare_reflected_models
from ..db.session import engine
from .reflected import (
	ChatHistory,
	ComplianceObligation,
	DocumentGenerated,
	ExtractionJob,
	HSNMaster,
	Invoice,
	InvoiceLineItem,
	StateCode,
	User,
)


def prepare_models() -> None:
	prepare_reflected_models(engine)


__all__ = [
	"ChatHistory",
	"ComplianceObligation",
	"DocumentGenerated",
	"ExtractionJob",
	"HSNMaster",
	"Invoice",
	"InvoiceLineItem",
	"StateCode",
	"User",
	"prepare_models",
]
