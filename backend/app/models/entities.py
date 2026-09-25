from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database.session import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, nullable=False, unique=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    feedbacks = relationship("Feedback", back_populates="product", cascade="all, delete-orphan")
    decisions = relationship("Decision", back_populates="product", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="product", cascade="all, delete-orphan")

class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(String, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    rating = Column(Integer, default=3)
    source = Column(String, default="Website")
    date = Column(String, nullable=False, index=True)
    sentiment = Column(String, nullable=False, index=True)  # positive, neutral, negative
    sentiment_score = Column(Float, default=0.0)
    sentiment_confidence = Column(Float, default=0.85)
    topic = Column(String, nullable=False, index=True)
    priority = Column(String, nullable=False, index=True)    # high, medium, low
    issue_group = Column(String, nullable=True)
    ai_summary = Column(Text, nullable=True)
    detected_problem = Column(Text, nullable=True)
    possible_cause = Column(Text, nullable=True)
    user_impact = Column(Text, nullable=True)
    suggested_action = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="feedbacks")

class Decision(Base):
    __tablename__ = "decisions"

    id = Column(String, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    affected_feature = Column(String, nullable=False)
    priority = Column(String, nullable=False)  # high, medium, low
    trend = Column(String, default="increasing")
    supporting_feedback_count = Column(Integer, default=1)
    suggested_action = Column(Text, nullable=False)
    status = Column(String, default="Planned")  # New, Reviewing, Planned, In Progress, Completed, Rejected
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    product = relationship("Product", back_populates="decisions")

class Report(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    period = Column(String, default="30d")
    content_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="reports")
