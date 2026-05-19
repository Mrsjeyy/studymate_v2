from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import health, auth, sets, cards, quiz
from app.core.config import settings

app = FastAPI(
    title="StudyMate API",
    version="0.1.0",
    description="Backend API for StudyMate"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(sets.router, prefix="/sets", tags=["sets"])
app.include_router(cards.router, tags=["cards"])
app.include_router(quiz.router, tags=["quiz"])
