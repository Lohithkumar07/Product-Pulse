from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class FeedbackBase(BaseModel):
    content: str
    rating: Optional[int] = 3
    source: Optional[str] = "Website"
    product_id: Optional[str] = "prod_saas_flow_1"
    date: Optional[str] = None

class FeedbackCreate(FeedbackBase):
    pass

class FeedbackResponse(BaseModel):
    id: str
    product_id: str
    content: str
    rating: int
    source: str
    date: str
    sentiment: str
    sentiment_score: float
    sentiment_confidence: float
    topic: str
    priority: str
    issue_group: Optional[str] = None
    ai_summary: Optional[str] = None
    detected_problem: Optional[str] = None
    possible_cause: Optional[str] = None
    user_impact: Optional[str] = None
    suggested_action: Optional[str] = None

    class Config:
        from_attributes = True

class DecisionBase(BaseModel):
    title: str
    affected_feature: str
    priority: str = "medium"
    trend: str = "increasing"
    supporting_feedback_count: int = 1
    suggested_action: str
    status: str = "Planned"
    product_id: Optional[str] = "prod_saas_flow_1"

class DecisionCreate(DecisionBase):
    pass

class DecisionUpdate(BaseModel):
    title: Optional[str] = None
    affected_feature: Optional[str] = None
    priority: Optional[str] = None
    trend: Optional[str] = None
    suggested_action: Optional[str] = None
    status: Optional[str] = None

class DecisionResponse(DecisionBase):
    id: str
    created_at: Any
    updated_at: Any

    class Config:
        from_attributes = True

class DashboardOverviewResponse(BaseModel):
    total_feedback: int
    positive_percentage: int
    neutral_percentage: int
    negative_percentage: int
    positive_count: int
    neutral_count: int
    negative_count: int
    high_priority_issues: int
    trends: Dict[str, str]
    ai_takeaway: str

class CSVUploadResponse(BaseModel):
    total_rows: int
    imported: int
    duplicates: int
    invalid: int
    detected_columns: Dict[str, Optional[str]]
