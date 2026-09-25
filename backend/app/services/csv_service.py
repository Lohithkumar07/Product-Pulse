import io
import pandas as pd
from typing import Dict, Any, List
from backend.app.ai.ai_service import python_ai_service

class CsvService:
    @staticmethod
    def process_csv(file_bytes: bytes, product_id: str = "prod_1") -> Dict[str, Any]:
        df = pd.read_csv(io.BytesIO(file_bytes))
        total_rows = len(df)

        # Standardize column names
        df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

        # Identify feedback column
        feedback_col = None
        for col in ["feedback", "content", "text", "comment", "review"]:
            if col in df.columns:
                feedback_col = col
                break
        if not feedback_col:
            feedback_col = df.columns[-1]

        # Drop empty content
        df = df.dropna(subset=[feedback_col])
        df = df[df[feedback_col].astype(str).str.strip().str.len() > 2]

        # Deduplicate
        initial_clean = len(df)
        df = df.drop_duplicates(subset=[feedback_col])
        duplicates = initial_clean - len(df)

        # Ratings
        rating_col = None
        for col in ["rating", "score", "stars"]:
            if col in df.columns:
                rating_col = col
                break

        records = []
        for _, row in df.iterrows():
            content = str(row[feedback_col]).strip()
            rating = 3
            if rating_col and pd.notna(row[rating_col]):
                try:
                    rating = int(float(row[rating_col]))
                    rating = max(1, min(5, rating))
                except Exception:
                    rating = 3

            analysis = python_ai_service.analyze_feedback(content, rating)
            records.append({
                "product_id": product_id,
                "content": content,
                "rating": rating,
                "source": str(row.get("source", "Website")),
                "user_name": str(row.get("user_name", row.get("user", "Anonymous"))),
                "date": str(row.get("date", "2026-09-25")),
                **analysis
            })

        return {
            "total_rows": total_rows,
            "imported": len(records),
            "duplicates": duplicates,
            "invalid": max(0, total_rows - (len(records) + duplicates)),
            "records": records
        }
