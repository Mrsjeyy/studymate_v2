from pydantic import BaseModel
from typing import Optional


class StudySetCreate(BaseModel):
    title: str
    description: Optional[str] = None
    is_public: bool = False


class StudySetUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None


class FlashcardCreate(BaseModel):
    question: str
    answer: str
