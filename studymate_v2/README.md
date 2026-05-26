# StudyMate v2

StudyMate ist eine Lernplattform für Karteikarten, Sets, Quiz und tägliche Lernstreaks. Das Projekt besteht aus einem React-Frontend, einer FastAPI-API und Supabase für Datenbank und Authentifizierung.

## Features
- Registrierung, Login, Gastmodus und Passwort-Reset
- Öffentliche und private Lernsets
- Karteikarten anlegen, bearbeiten, löschen und per JSON importieren
- Lernmodus mit Kartenumdrehen
- Quizmodus mit Standardfragen und KI-generierten Fragen
- Favoriten im Dashboard
- Tagesstreaks, die nach mehr als einem Kalendertag ohne Lernen zurückgesetzt werden
- Dashboard mit Statistiken und Set-Übersicht

## Tech Stack
- Frontend: React 18, Vite, JavaScript
- Backend: Python, FastAPI, Uvicorn
- Datenbank/Auth: Supabase
- Deployment: Vercel

## Schneller Start
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

Frontend:
```bash
cd frontend
npm install
npm run dev
```

## Wichtige Endpunkte
- `GET /health`
- `POST /auth/forgot-password`
- `GET /sets/public`
- `GET /sets/my`
- `POST /sets`
- `PUT /sets/{set_id}`
- `DELETE /sets/{set_id}`
- `GET /sets/{set_id}/cards`
- `POST /sets/{set_id}/cards`
- `DELETE /cards/{card_id}`
- `POST /quiz/generate`

## Detaillierte Dokumentation
Siehe [documentation/full_documentation_de.md](documentation/full_documentation_de.md).
