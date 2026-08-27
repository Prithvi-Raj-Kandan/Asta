from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from ....db.session import get_db
from ....models.reflected import GovtNews

router = APIRouter()

MOCK_NEWS = [
    {
        "source": "CBIC",
        "title": "Extension of due date for filing GSTR-1 for April 2026",
        "url": "https://cbic.gov.in/latest-news",
        "summary": "The due date for filing GSTR-1 for the month of April 2026 has been extended by 5 days for registered persons whose principal place of business is in specific states.",
        "raw_text": "Full text of the notification...",
        "content_hash": "hash_1"
    },
    {
        "source": "GSTN",
        "title": "Advisory on New facility for ITC reversal",
        "url": "https://gst.gov.in/newsandupdates",
        "summary": "GSTN has introduced a new Electronic Credit Reversal and Re-claimed statement. Taxpayers are advised to report their ITC reversal balance.",
        "raw_text": "Full text...",
        "content_hash": "hash_2"
    },
    {
        "source": "DGFT",
        "title": "Annual update of Importer-Exporter Code (IEC)",
        "url": "https://dgft.gov.in",
        "summary": "All IEC holders are legally required to update and validate their IEC Details, even if there are no changes, from April to June every year.",
        "raw_text": "Full text...",
        "content_hash": "hash_3"
    },
]

@router.get("/")
def get_news(limit: int = 10, db: Session = Depends(get_db)):
    """Fetch latest compliance news."""
    
    # Auto-seed mock news if empty for demo purposes
    count = db.query(GovtNews).count()
    if count == 0:
        for idx, item in enumerate(MOCK_NEWS):
            news_row = GovtNews()
            news_row.source = item["source"]
            news_row.title = item["title"]
            news_row.url = item["url"]
            news_row.summary = item["summary"]
            news_row.raw_text = item["raw_text"]
            news_row.content_hash = item["content_hash"]
            # staggered published times
            news_row.published_at = datetime.utcnow() - timedelta(days=idx*2)
            db.add(news_row)
        db.commit()
        
    news = db.query(GovtNews).order_by(GovtNews.published_at.desc()).limit(limit).all()
    
    return [
        {
            "id": str(n.id),
            "source": n.source,
            "title": n.title,
            "url": n.url,
            "summary": n.summary,
            "published_at": n.published_at.isoformat() if n.published_at else None
        }
        for n in news
    ]
