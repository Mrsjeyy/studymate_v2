from typing import Optional
from pydantic import BaseModel, Field


class FlashcardCreate(BaseModel):
    question: str = Field(min_length=1, max_length=1000)
    answer: str = Field(min_length=1, max_length=2000)
    position: int = Field(default=0, ge=0)


class FlashcardUpdate(BaseModel):
    question: Optional[str] = Field(default=None, min_length=1, max_length=1000)
    answer: Optional[str] = Field(default=None, min_length=1, max_length=2000)
    position: Optional[int] = Field(default=None, ge=0)