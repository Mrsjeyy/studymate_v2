# StudyMate v2 Start

## Stack
- Frontend: HTML, CSS, JavaScript, Figma
- Backend: Python, FastAPI, Uvicorn
- Database/Auth: Supabase
- Deployment: Vercel
- Versioning: Git/GitHub

## Start backend locally
```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

## First endpoints
- GET /health
- POST /auth/register
- POST /auth/login
- GET /sets/public
- GET /sets/my
- POST /sets
- POST /sets/{set_id}/cards

## Next steps
1. Supabase Tabellen anlegen
2. RLS Policies ergänzen
3. Auth sauber absichern
4. Frontend anbinden
5. Deployment auf Vercel
