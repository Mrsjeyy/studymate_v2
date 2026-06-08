from fastapi import APIRouter, Depends, HTTPException

from app.schemas.sets import StudySetCreate, StudySetUpdate
from app.db.supabase_client import get_supabase_admin
from app.core.security import get_current_user_id, require_set_owner, require_set_access

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


@router.post("/{set_id}/fork")
def fork_set(
    set_id: str,
    body: StudySetUpdate = StudySetUpdate(),
    user_id: str = Depends(get_current_user_id),
):
    supabase = get_supabase_admin()

    source_set = require_set_access(set_id)
    if not source_set.get("ispublic") and source_set.get("owneruserid") != user_id:
        raise HTTPException(status_code=403, detail="Can only fork public sets or your own sets")

    new_set_result = supabase.table("flashcard_sets").insert(
        {
            "owneruserid": user_id,
            "title": body.title if body.title is not None else source_set["title"],
            "description": body.description if body.description is not None else source_set["description"],
            "ispublic": False,
            "forked_from": set_id,
        }
    ).execute()

    new_set_id = new_set_result.data[0]["id"]

    source_cards = (
        supabase.table("flashcards")
        .select("*")
        .eq("setid", set_id)
        .order("position")
        .execute()
    )

    for card in source_cards.data:
        supabase.table("flashcards").insert(
            {
                "setid": new_set_id,
                "question": card["question"],
                "answer": card["answer"],
                "position": card.get("position", 0),
            }
        ).execute()

    new_set_with_cards = (
        supabase.table("flashcard_sets")
        .select("*, flashcards(*)")
        .eq("id", new_set_id)
        .single()
        .execute()
    )

    return new_set_with_cards.data