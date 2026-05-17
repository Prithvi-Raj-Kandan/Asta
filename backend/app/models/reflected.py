from sqlalchemy.ext.declarative import DeferredReflection

from ..db.base import Base


class StateCode(DeferredReflection, Base):
    __tablename__ = "state_codes"


class User(DeferredReflection, Base):
    __tablename__ = "users"


class ExtractionJob(DeferredReflection, Base):
    __tablename__ = "extraction_jobs"


class Invoice(DeferredReflection, Base):
    __tablename__ = "invoices"


class InvoiceLineItem(DeferredReflection, Base):
    __tablename__ = "invoice_line_items"


class HSNMaster(DeferredReflection, Base):
    __tablename__ = "hsn_master"


class ComplianceObligation(DeferredReflection, Base):
    __tablename__ = "compliance_obligations"


class DocumentGenerated(DeferredReflection, Base):
    __tablename__ = "documents_generated"


class ChatHistory(DeferredReflection, Base):
    __tablename__ = "chat_history"
