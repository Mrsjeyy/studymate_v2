from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.schemas.sets import StudySetCreate, StudySetUpdate
from app.db.supabase_client import get_supabase_admin, get_supabase_public

router = APIRouter()
security = HTTPBearer()


def _get_user_id_from_token(access_token: str) -> str:
    supabase = get_supabase_public()
    user_response = supabase.auth.get_user(access_token)
    if not user_response or not user_response.user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user_response.user.id


@router.get("/public")
def get_public_sets():
    supabase = get_supabase_admin()
    result = (
        supabase.table("flashcard_sets")
        .select("*")
        .eq("ispublic", True)
        .order("createdat", desc=True)
        .execute()
    )
    return result.data


@router.get("/my")
def get_my_sets(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    user_id = _get_user_id_from_token(token)
    supabase = get_supabase_admin()
    result = (
        supabase.table("flashcard_sets")
        .select("*")
        .eq("owneruserid", user_id)
        .order("createdat", desc=True)
        .execute()
    )
    return result.data


@router.post("")
def create_set(
    payload: StudySetCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    token = credentials.credentials
    user_id = _get_user_id_from_token(token)
    supabase = get_supabase_admin()
    result = (
        supabase.table("flashcard_sets")
        .insert({
            "owneruserid": user_id,
            "title": payload.title,
            "description": payload.description,
            "ispublic": payload.is_public,
        })
        .execute()
    )
    return result.data


@router.put("/{set_id}")
def update_set(
    set_id: str,
    payload: StudySetUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    token = credentials.credentials
    user_id = _get_user_id_from_token(token)
    supabase = get_supabase_admin()

    existing = (
        supabase.table("flashcard_sets")
        .select("owneruserid")
        .eq("id", set_id)
        .single()
        .execute()
    )

    if not existing.data:
        raise HTTPException(status_code=404, detail="Set not found")

    if existing.data["owneruserid"] != user_id:
        raise HTTPException(status_code=403, detail="Not allowed")

    update_data = payload.model_dump(exclude_none=True)

    if "is_public" in update_data:
        update_data["ispublic"] = update_data.pop("is_public")

    result = (
        supabase.table("flashcard_sets")
        .update(update_data)
        .eq("id", set_id)
        .execute()
    )
    return result.data


@router.delete("/{set_id}")
def delete_set(
    set_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    token = credentials.credentials
    user_id = _get_user_id_from_token(token)
    supabase = get_supabase_admin()

    existing = (
        supabase.table("flashcard_sets")
        .select("owneruserid")
        .eq("id", set_id)
        .single()
        .execute()
    )

    if not existing.data:
        raise HTTPException(status_code=404, detail="Set not found")

    if existing.data["owneruserid"] != user_id:
        raise HTTPException(status_code=403, detail="Not allowed")

    result = supabase.table("flashcard_sets").delete().eq("id", set_id).execute()
    return {"deleted": True, "data": result.data}

