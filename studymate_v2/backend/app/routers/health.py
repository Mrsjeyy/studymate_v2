from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/")
def root():
    return {"message": "StudyMate API is running"}


@router.get("/health")
def health():
    return {"status": "ok"}
