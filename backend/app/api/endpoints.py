from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Query, HTTPException
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.models.entities import Feedback, Decision, Product, Report
from backend.app.schemas.feedback import (
    FeedbackResponse, FeedbackCreate, DecisionResponse, DecisionCreate, DecisionUpdate,
    DashboardOverviewResponse, CSVUploadResponse
)
from backend.app.services.analytics import get_dashboard_overview
from backend.app.utils.csv_processor import process_csv_content
from backend.app.ai.pipeline import ai_service
import uuid
from datetime import datetime

router = APIRouter()

@router.get("/dashboard/overview", response_model=DashboardOverviewResponse)
def get_overview(productId: str = "prod_saas_flow_1", db: Session = Depends(get_db)):
    return get_dashboard_overview(db, productId)

@router.get("/dashboard/sentiment")
def get_sentiment(productId: str = "prod_saas_flow_1", db: Session = Depends(get_db)):
    pos = db.query(Feedback).filter(Feedback.product_id == productId, Feedback.sentiment == "positive").count()
    neu = db.query(Feedback).filter(Feedback.product_id == productId, Feedback.sentiment == "neutral").count()
    neg = db.query(Feedback).filter(Feedback.product_id == productId, Feedback.sentiment == "negative").count()
    total = pos + neu + neg or 1
    return {
        "breakdown": [
            {"label": "Positive", "count": pos, "percentage": round((pos / total) * 100), "color": "#10b981"},
            {"label": "Neutral", "count": neu, "percentage": round((neu / total) * 100), "color": "#94a3b8"},
            {"label": "Negative", "count": neg, "percentage": round((neg / total) * 100), "color": "#ef4444"},
        ],
        "total": total,
        "ai_interpretation": "Negative feedback increased mainly because of search performance issues."
    }

@router.get("/feedback")
def list_feedback(
    productId: str = "prod_saas_flow_1",
    search: Optional[str] = None,
    sentiment: Optional[str] = None,
    topic: Optional[str] = None,
    priority: Optional[str] = None,
    page: int = 1,
    limit: int = 15,
    db: Session = Depends(get_db)
):
    query = db.query(Feedback).filter(Feedback.product_id == productId)
    if search:
        s = f"%{search.lower()}%"
        query = query.filter(Feedback.content.ilike(s) | Feedback.topic.ilike(s))
    if sentiment:
        query = query.filter(Feedback.sentiment == sentiment.lower())
    if topic:
        query = query.filter(Feedback.topic == topic)
    if priority:
        query = query.filter(Feedback.priority == priority.lower())

    total = query.count()
    items = query.order_by(Feedback.date.desc()).offset((page - 1) * limit).limit(limit).all()
    return {
        "items": items,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": (total + limit - 1) // limit or 1
        }
    }

@router.get("/feedback/{id}")
def get_feedback_item(id: str, db: Session = Depends(get_db)):
    item = db.query(Feedback).filter(Feedback.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Feedback not found")
    related = db.query(Feedback).filter(
        Feedback.product_id == item.product_id,
        Feedback.topic == item.topic,
        Feedback.id != item.id
    ).limit(4).all()
    return {"feedback": item, "related_feedback": related}

@router.post("/feedback", response_model=FeedbackResponse)
def create_feedback(payload: FeedbackCreate, db: Session = Depends(get_db)):
    analysis = ai_service.analyze_feedback(payload.content, payload.rating or 3)
    fb_id = f"fb_{uuid.uuid4().hex[:8]}"
    item = Feedback(
        id=fb_id,
        product_id=payload.product_id or "prod_saas_flow_1",
        content=payload.content,
        rating=payload.rating or 3,
        source=payload.source or "Website",
        date=payload.date or datetime.utcnow().strftime("%Y-%m-%d"),
        sentiment=analysis["sentiment"],
        sentiment_score=analysis["sentiment_score"],
        sentiment_confidence=analysis["sentiment_confidence"],
        topic=analysis["topic"],
        priority=analysis["priority"],
        issue_group=analysis["issue_group"],
        ai_summary=analysis["ai_summary"],
        detected_problem=analysis["detected_problem"],
        possible_cause=analysis["possible_cause"],
        user_impact=analysis["user_impact"],
        suggested_action=analysis["suggested_action"],
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/feedback/{id}")
def delete_feedback(id: str, db: Session = Depends(get_db)):
    item = db.query(Feedback).filter(Feedback.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Feedback not found")
    db.delete(item)
    db.commit()
    return {"message": "Deleted successfully", "id": id}

@router.get("/decisions")
def list_decisions(productId: str = "prod_saas_flow_1", db: Session = Depends(get_db)):
    return db.query(Decision).filter(Decision.product_id == productId).order_by(Decision.created_at.desc()).all()

@router.post("/decisions", response_model=DecisionResponse)
def create_decision(payload: DecisionCreate, db: Session = Depends(get_db)):
    dec_id = f"dec_{uuid.uuid4().hex[:8]}"
    decision = Decision(
        id=dec_id,
        product_id=payload.product_id or "prod_saas_flow_1",
        title=payload.title,
        affected_feature=payload.affected_feature,
        priority=payload.priority,
        trend=payload.trend,
        supporting_feedback_count=payload.supporting_feedback_count,
        suggested_action=payload.suggested_action,
        status=payload.status,
    )
    db.add(decision)
    db.commit()
    db.refresh(decision)
    return decision

@router.patch("/decisions/{id}")
def update_decision(id: str, payload: DecisionUpdate, db: Session = Depends(get_db)):
    decision = db.query(Decision).filter(Decision.id == id).first()
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(decision, key, value)
    db.commit()
    db.refresh(decision)
    return decision

@router.delete("/decisions/{id}")
def delete_decision(id: str, db: Session = Depends(get_db)):
    decision = db.query(Decision).filter(Decision.id == id).first()
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    db.delete(decision)
    db.commit()
    return {"message": "Decision deleted", "id": id}

@router.post("/upload/csv")
async def upload_csv(file: UploadFile = File(...), productId: str = "prod_saas_flow_1", db: Session = Depends(get_db)):
    content = await file.read()
    res = process_csv_content(content)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])

    imported = 0
    duplicates = 0
    for rec in res["valid_records"]:
        existing = db.query(Feedback).filter(Feedback.product_id == productId, Feedback.content == rec["content"]).first()
        if existing:
            duplicates += 1
            continue

        analysis = ai_service.analyze_feedback(rec["content"], rec["rating"])
        fb_id = f"fb_{uuid.uuid4().hex[:8]}"
        fb = Feedback(
            id=fb_id,
            product_id=productId,
            content=rec["content"],
            rating=rec["rating"],
            source=rec["source"],
            date=rec["date"] or datetime.utcnow().strftime("%Y-%m-%d"),
            **analysis
        )
        db.add(fb)
        imported += 1

    db.commit()
    return {
        "total_rows": res["total_rows"],
        "imported": imported,
        "duplicates": duplicates,
        "invalid": res["total_rows"] - (imported + duplicates),
        "detected_columns": res["detected_columns"],
    }
