import os
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid

from backend.app.database.database import engine, Base, get_db
from backend.app.models.models import User, Product, Feedback, Topic, Decision, Analysis, Report
from backend.app.schemas.schemas import (
    FeedbackBase, FeedbackResponse, DecisionCreate, DecisionUpdate,
    DecisionResponse, AiSummaryResponse, CsvImportStats
)
from backend.app.services.csv_service import CsvService
from backend.app.ai.ai_service import python_ai_service

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ProductPulse API",
    description="Feedback intelligence platform for websites and software applications.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "ProductPulse FastAPI Backend is running", "docs": "/docs"}

@app.get("/api/products")
def get_products(db: Session = Depends(get_db)):
    products = db.query(Product).all()
    if not products:
        default_prod = Product(id="prod_1", name="CloudPulse SaaS", description="Main SaaS platform")
        db.add(default_prod)
        db.commit()
        products = [default_prod]
    return [{"id": p.id, "name": p.name, "description": p.description} for p in products]

@app.get("/api/feedback")
def get_feedback(
    search: Optional[str] = None,
    sentiment: Optional[str] = None,
    topic: Optional[str] = None,
    priority: Optional[str] = None,
    page: int = 1,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    query = db.query(Feedback)
    if search:
        query = query.filter(Feedback.content.ilike(f"%{search}%"))
    if sentiment and sentiment != "all":
        query = query.filter(Feedback.sentiment == sentiment)
    if topic and topic != "all":
        query = query.filter(Feedback.topic == topic)
    if priority and priority != "all":
        query = query.filter(Feedback.priority == priority)

    total = query.count()
    items = query.order_by(Feedback.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return {
        "data": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@app.get("/api/feedback/{feedback_id}")
def get_single_feedback(feedback_id: str, db: Session = Depends(get_db)):
    fb = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return fb

@app.post("/api/feedback")
def create_feedback(feedback_in: FeedbackBase, db: Session = Depends(get_db)):
    analysis = python_ai_service.analyze_feedback(feedback_in.content, feedback_in.rating or 3)
    fb = Feedback(
        id=f"fb_{uuid.uuid4().hex[:8]}",
        product_id=feedback_in.product_id or "prod_1",
        content=feedback_in.content,
        rating=feedback_in.rating or 3,
        source=feedback_in.source or "Website",
        user_name=feedback_in.user_name or "Anonymous",
        **analysis
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return fb

@app.post("/api/upload/csv")
async def upload_csv(
    file: UploadFile = File(...),
    product_id: str = Form("prod_1"),
    db: Session = Depends(get_db)
):
    content_bytes = await file.read()
    result = CsvService.process_csv(content_bytes, product_id)

    for item in result["records"]:
        fb = Feedback(
            id=f"fb_{uuid.uuid4().hex[:8]}",
            **item
        )
        db.add(fb)
    db.commit()

    return {
        "total_rows": result["total_rows"],
        "imported": result["imported"],
        "duplicates": result["duplicates"],
        "invalid": result["invalid"]
    }

@app.get("/api/decisions")
def get_decisions(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Decision)
    if status and status != "all":
        query = query.filter(Decision.status == status)
    return query.order_by(Decision.created_at.desc()).all()

@app.post("/api/decisions")
def create_decision(decision_in: DecisionCreate, db: Session = Depends(get_db)):
    dec = Decision(
        id=f"dec_{uuid.uuid4().hex[:8]}",
        **decision_in.model_dump()
    )
    db.add(dec)
    db.commit()
    db.refresh(dec)
    return dec

@app.patch("/api/decisions/{decision_id}")
def update_decision(decision_id: str, updates: DecisionUpdate, db: Session = Depends(get_db)):
    dec = db.query(Decision).filter(Decision.id == decision_id).first()
    if not dec:
        raise HTTPException(status_code=404, detail="Decision not found")
    for key, val in updates.model_dump(exclude_unset=True).items():
        setattr(dec, key, val)
    db.commit()
    db.refresh(dec)
    return dec
