from pydantic import BaseModel


class CardInput(BaseModel):
    q: str
    a: str


class QuizGenerateRequest(BaseModel):
    cards: list[CardInput]
    count: int = 5


class QuizQuestion(BaseModel):
    question: str
    options: list[str]
    correct: int
    explanation: str


class QuizGenerateResponse(BaseModel):
    questions: list[QuizQuestion]
