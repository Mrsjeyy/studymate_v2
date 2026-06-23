import httpx
import resend
from fastapi import APIRouter

from app.core.config import settings
from app.db.supabase_client import get_supabase_admin
from app.schemas.auth import ForgotPasswordRequest

router = APIRouter()


def _send_email(to: str, subject: str, html: str) -> None:
    resend.api_key = settings.resend_api_key
    resend.Emails.send({
        "from": settings.resend_from,
        "to": [to],
        "subject": subject,
        "html": html,
    })


def _generate_recovery_otp(fake_email: str) -> str:
    response = httpx.post(
        f"{settings.supabase_url}/auth/v1/admin/generate_link",
        headers={
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
        },
        json={"type": "recovery", "email": fake_email},
        timeout=10,
    )
    return response.json().get("email_otp", "")


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest):
    admin = get_supabase_admin()

    result = (
        admin.table("profiles")
        .select("recovery_email")
        .eq("username", payload.username.lower())
        .maybe_single()
        .execute()
    )

    # Immer Success zurückgeben – kein Username-Enumeration
    if not result.data or not result.data.get("recovery_email"):
        return {"message": "ok"}

    recovery_email = result.data["recovery_email"]
    fake_email = f"{payload.username.lower()}@studymate.local"

    try:
        otp = _generate_recovery_otp(fake_email)
        if otp and settings.resend_api_key:
            _send_email(
                to=recovery_email,
                subject="Passwort zurücksetzen – StudyMate",
                html=f"""
                <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
                  <h2>Passwort zurücksetzen</h2>
                  <p>Hallo <strong>{payload.username}</strong>,</p>
                  <p>gib diesen Code in StudyMate ein, um dein Passwort zurückzusetzen.
                     Er ist <strong>1 Stunde</strong> gültig.</p>
                  <div style="font-family:monospace;font-size:32px;font-weight:700;
                              letter-spacing:6px;background:#f1f5f9;color:#080c18;
                              padding:16px 24px;border-radius:8px;text-align:center;margin:16px 0">
                    {otp}
                  </div>
                  <p style="color:#666;font-size:13px">
                    Falls du keinen Reset angefordert hast, ignoriere diese E-Mail.
                  </p>
                </div>
                """,
            )
    except Exception:
        pass  # Fehler nicht nach außen geben

    return {"message": "ok"}
