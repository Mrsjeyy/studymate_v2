from fastapi import APIRouter, Depends, Header, HTTPException

from app.schemas.cards import FlashcardCreate
from app.db.supabase_client import get_supabase_admin, get_supabase_public
from app.core.security import (
    get_current_user_id,
    require_set_owner,
    require_card_owner,
)

router = APIRouter()


def get_user_id_from_optional_authorization(authorization: str | None) -> str | None:
    if not authorization:
        return None

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Ungültiger Authorization Header")

    token = authorization.replace("Bearer ", "", 1).strip()

    supabase = get_supabase_public()
    user_response = supabase.auth.get_user(token)

    if not user_response or not user_response.user:
        raise HTTPException(status_code=401, detail="Ungültiger Token")

    return user_response.user.id


@router.get("/sets/{set_id}/cards")
def get_cards(set_id: str, authorization: str | None = Header(default=None)):
    supabase = get_supabase_admin()

    set_result = (
        supabase.table("flashcard_sets")
        .select("id, owneruserid, ispublic")
        .eq("id", set_id)
        .single()
        .execute()
    )

    if not set_result.data:
        raise HTTPException(status_code=404, detail="Lernset nicht gefunden")

    study_set = set_result.data

    # Öffentliche Lernsets darf jeder ansehen, auch ohne Login.
    # Private Lernsets darf nur der Besitzer ansehen.
    if not study_set["ispublic"]:
        user_id = get_user_id_from_optional_authorization(authorization)

        if not user_id:
            raise HTTPException(status_code=401, detail="Bitte einloggen")

        if study_set["owneruserid"] != user_id:
            raise HTTPException(status_code=403, detail="Keine Berechtigung")

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
                "position": payload.position,
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