from fastapi import APIRouter, HTTPException
from app.schemas.auth import RegisterRequest, LoginRequest
from app.db.supabase_client import get_supabase_public, get_supabase_admin

router = APIRouter()


@router.post("/register")
def register(payload: RegisterRequest):
    supabase = get_supabase_public()
    result = supabase.auth.sign_up({
        "email": payload.email,
        "password": payload.password,
    })
    return {"message": "User registered", "user": result.user}


@router.post("/login")
def login(payload: LoginRequest):
    supabase = get_supabase_public()
    result = supabase.auth.sign_in_with_password({
        "email": payload.email,
        "password": payload.password,
    })
    if not result.user or not result.session:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {
        "message": "Login successful",
        "access_token": result.session.access_token,
        "refresh_token": result.session.refresh_token,
        "user": result.user,
    }

    
