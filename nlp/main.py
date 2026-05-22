"""
PulseBoard NLP Service — Phase 1 Stub
Returns a random sentiment score so the end-to-end pipeline runs before
the real model (cardiffnlp/twitter-roberta-base-sentiment-latest) is wired
in Phase 3.
"""

import random
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="PulseBoard NLP", version="0.1.0-stub")


class AnalyzeRequest(BaseModel):
    mention_id: str
    text: str


class AnalyzeResponse(BaseModel):
    mention_id: str
    score: float          # -1.0 (negative) → +1.0 (positive)
    label: str            # "positive" | "neutral" | "negative"
    model_version: str


def _random_sentiment() -> tuple[float, str]:
    """Stub: uniform random across three classes."""
    roll = random.random()
    if roll < 0.33:
        return round(random.uniform(-1.0, -0.1), 3), "negative"
    elif roll < 0.66:
        return round(random.uniform(-0.1, 0.1), 3), "neutral"
    else:
        return round(random.uniform(0.1, 1.0), 3), "positive"


@app.get("/health")
def health():
    return {"status": "ok", "stub": True}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    if not req.text.strip():
        raise HTTPException(status_code=422, detail="text must not be empty")
    score, label = _random_sentiment()
    return AnalyzeResponse(
        mention_id=req.mention_id,
        score=score,
        label=label,
        model_version="stub-0.1",
    )
