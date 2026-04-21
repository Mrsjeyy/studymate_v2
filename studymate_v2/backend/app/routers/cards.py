from fastapi import APIRouter, Header, HTTPException
from app.schemas.sets import FlashcardCreate
from app.db.supabase_client import get_supabase_admin
from app.routers.sets import _get_user_id_from_token

router = APIRouter()


@router.get("/sets/{set_id}/cards")
def get_cards(set_id: str):
    supabase = get_supabase_admin()
    result = supabase.table("flashcards").select("*").eq("set_id", set_id).execute()
    return result.data


@router.post("/sets/{set_id}/cards")
def create_card(set_id: str, payload: FlashcardCreate, authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    user_id = _get_user_id_from_token(token)
    supabase = get_supabase_admin()

    set_result = supabase.table("study_sets").select("owner_id").eq("id", set_id).single().execute()
    if set_result.data["owner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not allowed")

    result = (
        supabase.table("flashcards")
        .insert({
            "set_id": set_id,
            "question": payload.question,
            "answer": payload.answer,
        })
        .execute()
    )
    return result.data


@router.delete("/cards/{card_id}")
def delete_card(card_id: str, authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    user_id = _get_user_id_from_token(token)
    supabase = get_supabase_admin()

    card_result = supabase.table("flashcards").select("id,set_id").eq("id", card_id).single().execute()
    set_result = supabase.table("study_sets").select("owner_id").eq("id", card_result.data["set_id"]).single().execute()
    if set_result.data["owner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not allowed")

    result = supabase.table("flashcards").delete().eq("id", card_id).execute()
    return {"deleted": True, "data": result.data}
