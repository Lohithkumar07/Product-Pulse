from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class ProductBase(BaseModel):
    id: str
    name: str
    description: Optional[str] = None

class FeedbackBase(BaseModel):
    content: str
    rating: Optional[int] = 3
    source: Optional[str] = "Website"
    user_name: Optional[str] = "Anonymous"
    product_id: Optional[str] = "prod_1"
    date: Optional[str] = None

class FeedbackResponse(FeedbackBase):
    id: str
    sentiment: str
    sentiment_score: float
    sentiment_confidence: float
    topic: str
    priority: str
    issue_group: str
    ai_summary: Optional[str] = None
    detected_problem: Optional[str] = None
    possible_cause: Optional[str] = None
    user_impact: Optional[str] = None
    suggested_action: Optional[str] = None
    is_ai_fallback: Optional[bool] = False
    created_at: datetime

    class Config:
        from_attributes = True

class DecisionCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    product_id: Optional[str] = "prod_1"
    affected_feature: Optional[str] = "General"
    priority: Optional[str] = "medium"
    trend: Optional[str] = "Stable"
    suggested_action: Optional[str] = ""
    supporting_count: Optional[int] = 1
    status: Optional[str] = "New"

class DecisionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    affected_feature: Optional[str] = None
    priority: Optional[str] = None
    trend: Optional[str] = None
    suggested_action: Optional[str] = None
    status: Optional[str] = None

class DecisionResponse(DecisionCreate):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class AiSummaryResponse(BaseModel):
    overall_summary: str
    what_users_like: List[str]
    what_users_dislike: List[str]
    what_changed: List[str]
    recommended_actions: List[str]
    top_problems: List[str]
    emerging_trends: List[str]

class CsvImportStats(BaseModel):
    total_rows: int
    imported: int
    duplicates: int
    invalid: int
