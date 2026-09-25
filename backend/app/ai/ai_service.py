import os
import json
from typing import Dict, Any, List

class PythonAiService:
    def __init__(self):
        self.api_key = os.getenv("AI_API_KEY") or os.getenv("GEMINI_API_KEY")
        self.has_key = bool(self.api_key and self.api_key != "MY_GEMINI_API_KEY")

    def fallback_analyze(self, text: str, rating: int = 3) -> Dict[str, Any]:
        lower = text.lower()
        neg_words = ['slow', 'freeze', 'crash', 'broken', 'error', 'bug', 'lag', 'unacceptable', 'fails', 'timeout', 'stuck', 'frustrating', 'corrupted', 'garbled', 'lacks']
        pos_words = ['love', 'great', 'awesome', 'amazing', 'gorgeous', 'excellent', 'fast', 'saves', 'perfect', 'lightning', 'intuitive', 'delightful', 'smooth', 'gamechanger']

        neg_count = sum(1 for w in neg_words if w in lower)
        pos_count = sum(1 for w in pos_words if w in lower)
        if rating <= 2: neg_count += 2
        if rating >= 4: pos_count += 2

        if neg_count > pos_count:
            sentiment = "negative"
            score = max(-0.95, -0.4 - neg_count * 0.15)
            confidence = min(0.96, 0.78 + neg_count * 0.05)
        elif pos_count > neg_count:
            sentiment = "positive"
            score = min(0.95, 0.4 + pos_count * 0.15)
            confidence = min(0.96, 0.78 + pos_count * 0.05)
        else:
            sentiment = "neutral"
            score = 0.05
            confidence = 0.75

        topic = "General"
        issue_group = "General Feedback"
        priority = "medium"

        if any(k in lower for k in ["csv", "upload", "import"]):
            topic = "CSV Upload"
            issue_group = "CSV Upload Problems"
            priority = "high" if sentiment == "negative" else "medium"
        elif any(k in lower for k in ["search", "query", "index"]):
            topic = "Search"
            issue_group = "Search Performance"
            priority = "high" if sentiment == "negative" else "medium"
        elif any(k in lower for k in ["mobile", "touch", "ios", "ipad", "drawer"]):
            topic = "Mobile"
            issue_group = "Mobile Navigation"
            priority = "medium" if sentiment == "negative" else "low"
        elif any(k in lower for k in ["dashboard", "chart", "kpi"]):
            topic = "Dashboard"
            issue_group = "Dashboard Performance"
            priority = "medium"
        elif any(k in lower for k in ["auth", "login", "password", "sso", "2fa"]):
            topic = "Authentication"
            issue_group = "Authentication & Access"
            priority = "high" if sentiment == "negative" else "medium"

        return {
            "sentiment": sentiment,
            "sentiment_score": round(score, 2),
            "sentiment_confidence": round(confidence, 2),
            "topic": topic,
            "priority": priority,
            "issue_group": issue_group,
            "ai_summary": text[:90] + ("..." if len(text) > 90 else ""),
            "detected_problem": f"Performance or usability issue in {topic}" if sentiment == "negative" else "Feature working properly",
            "possible_cause": "Processing pipeline latency" if sentiment == "negative" else "Design meets expectations",
            "user_impact": "Impacts operational speed" if sentiment == "negative" else "Increases user satisfaction",
            "suggested_action": f"Optimize {topic} performance" if sentiment == "negative" else "Reinforce successful UX pattern",
            "is_ai_fallback": True,
        }

    def analyze_feedback(self, text: str, rating: int = 3) -> Dict[str, Any]:
        # If google-genai is installed and key is set, call Gemini
        if self.has_key:
            try:
                from google import genai
                client = genai.Client(api_key=self.api_key)
                prompt = f"""Analyze software user feedback:
Feedback: "{text}"
Rating: {rating}/5
Return JSON with keys: sentiment, sentiment_score, sentiment_confidence, topic, priority, issue_group, ai_summary, detected_problem, possible_cause, user_impact, suggested_action"""
                res = client.models.generate_content(
                    model="gemini-3.8-flash",
                    contents=prompt,
                    config={"response_mime_type": "application/json"}
                )
                if res.text:
                    data = json.loads(res.text)
                    data["is_ai_fallback"] = False
                    return data
            except Exception:
                pass
        return self.fallback_analyze(text, rating)

python_ai_service = PythonAiService()
