from fastapi import APIRouter, Depends

from app.schemas.sets import StudySetCreate, StudySetUpdate
from app.db.supabase_client import get_supabase_admin
from app.core.security import get_current_user_id, require_set_owner

router = APIRouter()


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
def get_my_sets(user_id: str = Depends(get_current_user_id)):
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
    user_id: str = Depends(get_current_user_id),
):
    supabase = get_supabase_admin()
    result = (
        supabase.table("flashcard_sets")
        .insert(
            {
                "owneruserid": user_id,
                "title": payload.title,
                "description": payload.description,
                "ispublic": payload.is_public,
            }
        )
        .execute()
    )
    return result.data


@router.put("/{set_id}")
def update_set(
    set_id: str,
    payload: StudySetUpdate,
    user_id: str = Depends(get_current_user_id),
):
    require_set_owner(set_id, user_id)

    update_data = payload.model_dump(exclude_none=True)

    if "is_public" in update_data:
        update_data["ispublic"] = update_data.pop("is_public")

    supabase = get_supabase_admin()
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
    user_id: str = Depends(get_current_user_id),
):
    require_set_owner(set_id, user_id)

    supabase = get_supabase_admin()
    result = supabase.table("flashcard_sets").delete().eq("id", set_id).execute()
    return {"deleted": True, "data": result.data}