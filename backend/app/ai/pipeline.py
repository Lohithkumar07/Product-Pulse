import os
import re
from typing import Dict, Any

class AIPipeline:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "")

    def analyze_feedback(self, content: str, rating: int = 3) -> Dict[str, Any]:
        """
        Deterministic AI intelligence analyzer with fallback rules for sentiment, topic, and problem clustering.
        """
        lower = content.lower()

        # Topic detection
        topic = "General"
        if re.search(r"search|query|filter|find|lookup", lower):
            topic = "Search"
        elif re.search(r"csv|upload|import|export|file|parse|spreadsheet", lower):
            topic = "CSV Upload"
        elif re.search(r"slow|lag|freeze|timeout|speed|latency|performance|load", lower):
            topic = "Performance"
        elif re.search(r"login|signup|auth|oauth|password|token|2fa|session", lower):
            topic = "Authentication"
        elif re.search(r"mobile|phone|ios|android|responsive|drawer|touch", lower):
            topic = "Mobile"
        elif re.search(r"nav|menu|sidebar|breadcrumb|routing|click", lower):
            topic = "Navigation"
        elif re.search(r"ui|dark mode|theme|color|font|layout|design|button|look", lower):
            topic = "UI & Design"
        elif re.search(r"price|billing|subscription|plan|invoice|payment|credit", lower):
            topic = "Billing"
        elif re.search(r"notification|email|alert|webhook|slack", lower):
            topic = "Notifications"
        elif re.search(r"api|webhook|zapier|integration|sync|endpoint", lower):
            topic = "Integrations"
        elif re.search(r"crash|error|broken|bug|exception|500|404|fail", lower):
            topic = "Bug & Reliability"

        # Sentiment scoring
        positive_words = ["love", "great", "awesome", "fast", "smooth", "excellent", "helpful", "clean", "intuitive", "easy", "best", "useful"]
        negative_words = ["terrible", "awful", "slow", "freeze", "crash", "broken", "error", "hate", "bad", "useless", "confusing", "stuck", "fail", "cannot"]

        pos_score = sum(1 for w in positive_words if w in lower)
        neg_score = sum(1.2 for w in negative_words if w in lower)

        if rating >= 4:
            pos_score += 2
        elif rating <= 2:
            neg_score += 2

        sentiment = "neutral"
        sentiment_score = 0.0
        if pos_score > neg_score and pos_score >= 1:
            sentiment = "positive"
            sentiment_score = min(1.0, 0.4 + pos_score * 0.15)
        elif neg_score > pos_score and neg_score >= 1:
            sentiment = "negative"
            sentiment_score = max(-1.0, -0.4 - neg_score * 0.15)

        # Priority calculation
        critical_words = ["freeze", "crash", "data loss", "stuck", "cannot", "broken", "timeout"]
        is_critical = any(w in lower for w in critical_words)

        priority = "low"
        if sentiment == "negative" and (is_critical or rating == 1):
            priority = "high"
        elif sentiment == "negative" or rating <= 3:
            priority = "medium"

        issue_group = f"{topic} Stability & Experience"
        if topic == "Search":
            issue_group = "Search Latency & Filter Responsiveness"
        elif topic == "CSV Upload":
            issue_group = "Large CSV Processing & Parse Freezes"
        elif topic == "Performance":
            issue_group = "Application Performance & Page Load"
        elif topic == "Authentication":
            issue_group = "Session & OAuth Authentication Flow"
        elif topic == "Mobile":
            issue_group = "Mobile Viewport & Touch Navigation"

        return {
            "sentiment": sentiment,
            "sentiment_score": round(sentiment_score, 2),
            "sentiment_confidence": 0.88,
            "topic": topic,
            "priority": priority,
            "issue_group": issue_group,
            "ai_summary": f"User feedback regarding {topic.lower()} workflow and performance.",
            "detected_problem": f"Friction observed in {topic}: {content[:100]}",
            "possible_cause": "Synchronous processing or database query without proper indexing.",
            "user_impact": "Degraded user workflow and increased risk of churn.",
            "suggested_action": f"Optimize {topic} performance and introduce background workers.",
        }

ai_service = AIPipeline()
