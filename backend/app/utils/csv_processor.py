import io
import pandas as pd
from typing import Dict, Any, List

def process_csv_content(csv_bytes: bytes) -> Dict[str, Any]:
    """
    Parses and validates CSV content using pandas, detecting columns and normalizing records.
    """
    try:
        df = pd.read_csv(io.BytesIO(csv_bytes), encoding='utf-8')
    except Exception:
        df = pd.read_csv(io.BytesIO(csv_bytes), encoding='latin-1')

    if df.empty:
        return {"error": "CSV is empty"}

    columns = [str(c).strip() for c in df.columns]
    df.columns = columns

    # Detect target columns
    feedback_col = next((c for c in columns if any(k in c.lower() for k in ["feedback", "content", "review", "text", "comment"])), columns[0])
    rating_col = next((c for c in columns if any(k in c.lower() for k in ["rating", "score", "stars"])), None)
    date_col = next((c for c in columns if any(k in c.lower() for k in ["date", "created", "time"])), None)
    source_col = next((c for c in columns if any(k in c.lower() for k in ["source", "channel", "platform"])), None)

    records: List[Dict[str, Any]] = []
    for _, row in df.iterrows():
        raw_text = str(row[feedback_col]).strip() if pd.notna(row[feedback_col]) else ""
        if not raw_text or raw_text.lower() == "nan":
            continue

        rating = 3
        if rating_col and pd.notna(row[rating_col]):
            try:
                r = int(float(row[rating_col]))
                if 1 <= r <= 5:
                    rating = r
            except Exception:
                pass

        date_val = str(row[date_col]).strip() if date_col and pd.notna(row[date_col]) else ""
        source_val = str(row[source_col]).strip() if source_col and pd.notna(row[source_col]) else "CSV Upload"

        records.append({
            "content": raw_text,
            "rating": rating,
            "date": date_val,
            "source": source_val
        })

    return {
        "total_rows": len(df),
        "valid_records": records,
        "detected_columns": {
            "feedback": feedback_col,
            "rating": rating_col,
            "date": date_col,
            "source": source_col
        }
    }
