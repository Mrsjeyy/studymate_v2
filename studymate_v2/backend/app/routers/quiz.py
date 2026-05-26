import json
import random

from google import genai
from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.schemas.quiz import QuizGenerateRequest, QuizGenerateResponse, QuizQuestion

router = APIRouter()


@router.post("/quiz/generate", response_model=QuizGenerateResponse)
def generate_quiz(payload: QuizGenerateRequest):
    if not settings.gemini_api_key:
        raise HTTPException(status_code=503, detail="KI nicht konfiguriert.")

    count = min(payload.count, len(payload.cards), 8)
    selected_cards = payload.cards[:count]
    cards_text = "\n".join(
        [f"{i+1}. Frage: {c.q}\n   Richtige Antwort: {c.a}" for i, c in enumerate(selected_cards)]
    )

    prompt = f"""Du bist ein Quiz-Generator für eine Cybersecurity-Lernapp.
Für jede der folgenden Lernkarten erstelle genau 3 falsche, aber thematisch passende und plausibel klingende Antwortmöglichkeiten auf Deutsch.
Die falschen Antworten sollen zum Thema der Frage passen und wie mögliche richtige Antworten klingen, aber inhaltlich falsch sein.

Lernkarten:
{cards_text}

Gib NUR ein JSON-Array zurück, ohne Markdown, ohne weiteren Text.
Das Array enthält genau {count} Objekte (eines pro Karte, in gleicher Reihenfolge):

[
  {{
    "wrong_answers": ["...", "...", "..."],
    "explanation": "Kurze Erklärung warum die richtige Antwort korrekt ist (1-2 Sätze)."
  }}
]"""

    try:
        client = genai.Client(api_key=settings.gemini_api_key)
        response = client.models.generate_content(
            model="gemini-2.0-flash-lite",
            contents=prompt,
        )
        raw = response.text.strip()

        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        data = json.loads(raw)
        questions = []
        for i, item in enumerate(data[:count]):
            card = selected_cards[i]
            options = item["wrong_answers"][:3]
            correct_idx = random.randint(0, len(options))
            options.insert(correct_idx, card.a)
            questions.append(QuizQuestion(
                question=card.q,
                options=options,
                correct=correct_idx,
                explanation=item.get("explanation", ""),
            ))
        return QuizGenerateResponse(questions=questions)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"KI-Fehler: {str(e)}")
