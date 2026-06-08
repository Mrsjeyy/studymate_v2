from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.routers import health, auth, sets, cards, quiz
from app.core.config import settings

app = FastAPI(
    title="StudyMate API",
    version="0.1.0",
    description="Backend API for StudyMate"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={"Access-Control-Allow-Origin": "*"},
    )

app.include_router(health.router)
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(sets.router, prefix="/sets", tags=["sets"])
app.include_router(cards.router, tags=["cards"])
app.include_router(quiz.router, tags=["quiz"])
