from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.schemas.sets import FlashcardCreate
from app.db.supabase_client import get_supabase_admin, get_supabase_public
from app.routers.sets import _get_user_id_from_token

router = APIRouter()
security = HTTPBearer()

def _get_user_id_from_token(access_token: str) -> str:
    supabase = get_supabase_public()
    user_response = supabase.auth.get_user(access_token)
    if not user_response or not user_response.user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user_response.user.id


@router.get("/sets/{set_id}/cards")
def get_cards(set_id: str):
    supabase = get_supabase_admin()

    # Prüfen, ob das Set existiert
    set_result = (
        supabase.table("flashcard_sets")
        .select("id,ispublic")
        .eq("id", set_id)
        .single()
        .execute()
    )

    if not set_result.data:
        raise HTTPException(status_code=404, detail="Set not found")

    result = (
        supabase.table("flashcards")
        .select("*")
        .eq("setid", set_id)
        .order("position")
        .execute()
    )
    return result.data


@router.post("/sets/{set_id}/cards")
def create_card(
    set_id: str,
    payload: FlashcardCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    token = credentials.credentials
    user_id = _get_user_id_from_token(token)
    supabase = get_supabase_admin()

    set_result = (
        supabase.table("flashcard_sets")
        .select("owneruserid")
        .eq("id", set_id)
        .single()
        .execute()
    )

    if not set_result.data:
        raise HTTPException(status_code=404, detail="Set not found")

    if set_result.data["owneruserid"] != user_id:
        raise HTTPException(status_code=403, detail="Not allowed")

    result = (
        supabase.table("flashcards")
        .insert({
            "setid": set_id,
            "question": payload.question,
            "answer": payload.answer,
            "position": payload.position if hasattr(payload, "position") else 0,
        })
        .execute()
    )
    return result.data


@router.delete("/cards/{card_id}")
def delete_card(
    card_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    token = credentials.credentials
    user_id = _get_user_id_from_token(token)
    supabase = get_supabase_admin()

    card_result = (
        supabase.table("flashcards")
        .select("id,setid")
        .eq("id", card_id)
        .single()
        .execute()
    )

    if not card_result.data:
        raise HTTPException(status_code=404, detail="Card not found")

    set_result = (
        supabase.table("flashcard_sets")
        .select("owneruserid")
        .eq("id", card_result.data["setid"])
        .single()
        .execute()
    )

    if not set_result.data:
        raise HTTPException(status_code=404, detail="Set not found")

    if set_result.data["owneruserid"] != user_id:
        raise HTTPException(status_code=403, detail="Not allowed")

    result = supabase.table("flashcards").delete().eq("id", card_id).execute()
    return {"deleted": True, "data": result.data}