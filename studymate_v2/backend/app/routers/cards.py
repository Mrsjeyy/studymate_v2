from fastapi import APIRouter, Depends

from app.schemas.cards import FlashcardCreate
from app.db.supabase_client import get_supabase_admin
from app.core.security import (
    get_current_user_id,
    require_set_owner,
    require_set_access,
    require_card_owner,
)

router = APIRouter()


@router.get("/sets/{set_id}/cards")
def get_cards(set_id: str, user_id: str = Depends(get_current_user_id)):
    require_set_access(set_id, user_id)

    supabase = get_supabase_admin()
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
    user_id: str = Depends(get_current_user_id),
):
    require_set_owner(set_id, user_id)

    supabase = get_supabase_admin()
    result = (
        supabase.table("flashcards")
        .insert(
            {
                "setid": set_id,
                "question": payload.question,
                "answer": payload.answer,
                "position": payload.position if hasattr(payload, "position") else 0,
            }
        )
        .execute()
    )
    return result.data


@router.delete("/cards/{card_id}")
def delete_card(
    card_id: str,
    user_id: str = Depends(get_current_user_id),
):
    require_card_owner(card_id, user_id)

    supabase = get_supabase_admin()
    result = supabase.table("flashcards").delete().eq("id", card_id).execute()
    return {"deleted": True, "data": result.data}