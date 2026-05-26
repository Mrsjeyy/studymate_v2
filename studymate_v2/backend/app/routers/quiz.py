import json

import google.generativeai as genai
from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.schemas.quiz import QuizGenerateRequest, QuizGenerateResponse, QuizQuestion

router = APIRouter()


@router.post("/quiz/generate", response_model=QuizGenerateResponse)
def generate_quiz(payload: QuizGenerateRequest):
    if not settings.gemini_api_key:
        raise HTTPException(status_code=503, detail="KI nicht konfiguriert.")

    count = min(payload.count, 8)
    cards_text = "\n".join(
        [f"- Frage: {c.q}\n  Antwort: {c.a}" for c in payload.cards]
    )

    prompt = f"""Du bist ein Quiz-Generator für eine Cybersecurity-Lernapp.
Erstelle basierend auf diesen Lernkarten genau {count} Multiple-Choice-Fragen auf Deutsch.

Lernkarten:
{cards_text}

Regeln:
- Teste Verständnis, nicht nur Auswendiglernen
- Genau 4 Antwortmöglichkeiten pro Frage
- Die 3 falschen Antworten müssen plausibel klingende, aber falsche Alternativen sein – erfinde sie aus deinem Fachwissen, auch wenn nur wenige Karten vorhanden sind
- Bei wenigen Karten: Stelle verschiedene Aspekte desselben Themas als separate Fragen
- Kurze präzise Erklärung warum die Antwort korrekt ist (1-2 Sätze)
- Gib NUR ein JSON-Array zurück, ohne Markdown, ohne weiteren Text

Format:
[
  {{
    "question": "...",
    "options": ["...", "...", "...", "..."],
    "correct": 0,
    "explanation": "..."
  }}
]"""

    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content(prompt)
    raw = response.text.strip()

    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    try:
        data = json.loads(raw)
        questions = [QuizQuestion(**q) for q in data[:count]]
        return QuizGenerateResponse(questions=questions)
    except Exception:
        raise HTTPException(status_code=500, detail="KI-Antwort konnte nicht verarbeitet werden.")
