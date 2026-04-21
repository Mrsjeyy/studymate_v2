from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.db.supabase_client import get_supabase_public, get_supabase_admin

security = HTTPBearer()


def get_access_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    return credentials.credentials


def get_current_user_id(token: str = Depends(get_access_token)) -> str:
    supabase = get_supabase_public()
    user_response = supabase.auth.get_user(token)

    if not user_response or not user_response.user:
        raise HTTPException(status_code=401, detail="Invalid token")

    return user_response.user.id


def get_current_user(token: str = Depends(get_access_token)):
    supabase = get_supabase_public()
    user_response = supabase.auth.get_user(token)

    if not user_response or not user_response.user:
        raise HTTPException(status_code=401, detail="Invalid token")

    return user_response.user


def require_set_owner(set_id: str, user_id: str) -> dict:
    supabase = get_supabase_admin()

    result = (
        supabase.table("flashcard_sets")
        .select("*")
        .eq("id", set_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Set not found")

    if result.data["owneruserid"] != user_id:
        raise HTTPException(status_code=403, detail="Not allowed")

    return result.data


def require_set_access(set_id: str, user_id: str | None = None) -> dict:
    supabase = get_supabase_admin()

    result = (
        supabase.table("flashcard_sets")
        .select("*")
        .eq("id", set_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Set not found")

    study_set = result.data

    if study_set["ispublic"] is True:
        return study_set

    if user_id and study_set["owneruserid"] == user_id:
        return study_set

    raise HTTPException(status_code=403, detail="Not allowed")


def require_card_owner(card_id: str, user_id: str) -> dict:
    supabase = get_supabase_admin()

    card_result = (
        supabase.table("flashcards")
        .select("*")
        .eq("id", card_id)
        .single()
        .execute()
    )

    if not card_result.data:
        raise HTTPException(status_code=404, detail="Card not found")

    set_result = (
        supabase.table("flashcard_sets")
        .select("*")
        .eq("id", card_result.data["setid"])
        .single()
        .execute()
    )

    if not set_result.data:
        raise HTTPException(status_code=404, detail="Set not found")

    if set_result.data["owneruserid"] != user_id:
        raise HTTPException(status_code=403, detail="Not allowed")

    return card_result.data