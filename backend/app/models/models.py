from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.database.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(String(50), default="admin")
    created_at = Column(DateTime, default=datetime.utcnow)

class Product(Base):
    __tablename__ = "products"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    feedbacks = relationship("Feedback", back_populates="product_rel")
    decisions = relationship("Decision", back_populates="product_rel")

class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(String(100), primary_key=True, index=True)
    product_id = Column(String(50), ForeignKey("products.id"), index=True)
    content = Column(Text, nullable=False)
    rating = Column(Integer, default=3)
    source = Column(String(100), default="Website")
    user_name = Column(String(255), default="Anonymous")
    date = Column(String(50), default=lambda: datetime.utcnow().strftime("%Y-%m-%d"))
    sentiment = Column(String(50), default="neutral") # positive, neutral, negative
    sentiment_score = Column(Float, default=0.0) # -1.0 to 1.0
    sentiment_confidence = Column(Float, default=0.85) # 0 to 1.0
    topic = Column(String(100), default="General")
    priority = Column(String(50), default="medium") # low, medium, high
    issue_group = Column(String(255), default="General Feedback")
    ai_summary = Column(Text, nullable=True)
    detected_problem = Column(Text, nullable=True)
    possible_cause = Column(Text, nullable=True)
    user_impact = Column(Text, nullable=True)
    suggested_action = Column(Text, nullable=True)
    is_ai_fallback = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    product_rel = relationship("Product", back_populates="feedbacks")

class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True)
    feedback_count = Column(Integer, default=0)
    sentiment_positive = Column(Integer, default=0)
    sentiment_neutral = Column(Integer, default=0)
    sentiment_negative = Column(Integer, default=0)

class Decision(Base):
    __tablename__ = "decisions"

    id = Column(String(100), primary_key=True, index=True)
    product_id = Column(String(50), ForeignKey("products.id"), index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    supporting_count = Column(Integer, default=1)
    affected_feature = Column(String(100), default="General")
    priority = Column(String(50), default="medium") # low, medium, high
    trend = Column(String(50), default="Stable") # Increasing, Stable, Decreasing
    suggested_action = Column(Text, nullable=True)
    status = Column(String(50), default="New") # New, Reviewing, Planned, In Progress, Completed, Rejected
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    product_rel = relationship("Product", back_populates="decisions")

class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(String(50), ForeignKey("products.id"), index=True)
    summary_text = Column(Text, nullable=False)
    what_users_like = Column(Text, nullable=True) # JSON string
    what_users_dislike = Column(Text, nullable=True) # JSON string
    what_changed = Column(Text, nullable=True) # JSON string
    recommended_actions = Column(Text, nullable=True) # JSON string
    created_at = Column(DateTime, default=datetime.utcnow)

class Report(Base):
    __tablename__ = "reports"

    id = Column(String(100), primary_key=True, index=True)
    product_id = Column(String(50), ForeignKey("products.id"), index=True)
    period = Column(String(50), default="30D")
    title = Column(String(255), nullable=False)
    executive_summary = Column(Text, nullable=False)
    feedback_volume = Column(Integer, default=0)
    sentiment_data = Column(Text, nullable=False) # JSON
    top_topics_data = Column(Text, nullable=False) # JSON
    top_problems_data = Column(Text, nullable=False) # JSON
    recommended_actions_data = Column(Text, nullable=False) # JSON
    created_at = Column(DateTime, default=datetime.utcnow)
