# StudyMate v2 — Ausführliche Projektdokumentation (Deutsch)

Version: 0.1.0
Datum: 2026-05-19
Autoren: StudyMate Entwicklerteam

Inhaltsverzeichnis
------------------
1. Ziel und Überblick
2. Architekturübersicht
3. Komponenten und Verantwortlichkeiten
4. Lokale Entwicklungsumgebung (Schritt‑für‑Schritt)
5. Konfiguration und Umgebungsvariablen
6. API‑Referenz (Detailliert)
7. Datenbank‑Schema & Migrationshinweise
8. Authentifizierung, Autorisierung & Security
9. Frontend‑Architektur & wichtige Komponenten
10. UI/UX, Animationen & Browser‑Kompatibilität (Flip‑Card Bugfix)
11. Logging, Monitoring und Fehlerbehandlung
12. Tests, QA und empfohlenes Testsetup
13. CI/CD und Deployment (Vercel & Alternativen)
14. Contributing, Branching & Release‑Prozess
15. Troubleshooting & FAQ
16. ChangeLog (Auswahl wichtiger Commits)
17. To‑Do / Offene Aufgaben
18. Anhänge: SQL Schema + nützliche Snippets

--------------------------------------------------------------------------------

1. Ziel und Überblick
---------------------

StudyMate v2 ist eine moderne Webanwendung für Karteikarten‑basiertes Lernen. Ziel ist es, eine leichtgewichtige, erweiterbare Plattform zu bieten, die:

- Verwaltung von Lernsets (CRUD)
- Management von Karteikarten pro Set (Frage/Antwort, Positionierung)
- Lern‑ und Quiz‑Modi (inkl. KI‑gestützte Quizgenerierung als Option)
- Sichere Benutzerverwaltung (Registrierung, Login, Passwort‑Reset)
- Flexible Berechtigungsmodelle (öffentliche vs. private Sets)

Diese Dokumentation richtet sich an Entwickler*innen, DevOps‑Verantwortliche und evaluierende Interessenten. Sie deckt Architektur, Setup, API‑Spezifikationen, Sicherheit, Tests, Deployment und Best Practices ab.

2. Architekturübersicht
-----------------------

Kurzfassung:

- Client (SPA): React 18 + Vite — rendert UI, kommuniziert via REST.
- Server (API): FastAPI — stellt REST‑Endpoints bereit und kapselt Business‑Logik.
- Persistence & Auth: Supabase (Postgres + Auth) — offizieller Datenlayer und Auth Provider.
- E‑Mail Versand: Resend API für Passwort‑Reset E‑Mails.
- Optional: Google Generative AI (Gemini) zur Quiz‑Erstellung.

Komponenten und Datenfluss:

Client (Browser) —HTTPS—> FastAPI —Supabase client—> Supabase (DB/Auth)

3. Komponenten und Verantwortlichkeiten
--------------------------------------

3.1 Backend (Ordner: `backend/`)

- `app/main.py` — Anwendungsinitialisierung, CORS Middleware, Routers einbinden.
- `app/core/config.py` — Pydantic Settings (`Settings`) mit `.env` Unterstützung.
- `app/db/supabase_client.py` — Wrapper zum Zugriff auf Supabase (Admin / Public Clients).
- `app/routers/` — Aufteilung in Router:
	- `auth.py` — Registrierung/Login/ForgotPassword
	- `sets.py` — CRUD für Lernsets
	- `cards.py` — CRUD für Karteikarten innerhalb von Sets
	- `quiz.py` — Endpunkte zur Quizgenerierung (KI / heuristisch)
	- `health.py` — Health Endpoint
- `app/schemas/` — Pydantic Modelle (Request/Response Validierung)

3.2 Frontend (Ordner: `frontend/`)

- `src/main.tsx` — Einstiegspunkt und Mounting
- `src/App.tsx` — Layout & Beispielzustand (Demo Data)
- `src/components/` — UI Komponenten
- `src/components/ui/` — primitives / design system
- `vite.config.ts` — Dev / Build Konfiguration

4. Lokale Entwicklungsumgebung (Schritt‑für‑Schritt)
-------------------------------------------------

4.1 Backend

Voraussetzungen: Python 3.11+, pip

```bash
# 1) in den backend Ordner
cd backend

# 2) virtuelle Umgebung
python -m venv .venv
source .venv/bin/activate   # macOS / Linux

# 3) Abhängigkeiten
pip install -r requirements.txt

# 4) Environment Datei erzeugen und konfigurieren
cp .env.example .env
# .env bearbeiten (SUPABASE_*, RESEND_*, FRONTEND_URL ...)

# 5) lokalen Server starten
uvicorn app.main:app --reload --port 8000
```

4.2 Frontend

Voraussetzungen: Node.js 18+, npm

```bash
cd frontend
npm install
npm run dev
# dev server startet (z. B. http://localhost:5173)
```

5. Konfiguration und Umgebungsvariablen
-------------------------------------

Die wichtigsten Variablen (Backend `.env`):
- `SUPABASE_URL` (erforderlich)
- `SUPABASE_ANON_KEY` (Frontend / Public usage)
- `SUPABASE_SERVICE_ROLE_KEY` (Admin Aktionen, nur Backend)
- `CORS_ORIGINS` (z. B. http://localhost:5173)
- `FRONTEND_URL` (z. B. http://localhost:5173 für Redirects)
- `RESEND_API_KEY`, `RESEND_FROM` (E‑Mail Versand)
- `GEMINI_API_KEY` (optional, KI‑Integration)

Hinweis: Bei Deployment Secrets im CI/CD oder Cloud Secret Manager ablegen.

6. API‑Referenz (Detailliert)
----------------------------

Im Backend werden Pydantic‑Schemas verwendet (siehe `app/schemas/`). Unten sind die wichtigsten Endpunkte mit Beispielanfragen dargestellt.

6.1 Auth

POST /auth/register
- Beschreibung: Registrierung über Supabase Auth (konzeptuell; Implementation kann Client‑seitig erfolgen)
- Request: (zumeist über Supabase Auth HTTP API oder JS SDK)

POST /auth/login
- Beschreibung: Login liefert JWT / Session Token (Supabase).

POST /auth/forgot-password
- Beschreibung: Password‑Reset Flow; Backend nutzt Supabase Admin API, um Recovery Link zu generieren und sendet E‑Mail via Resend.
- Request Body:

```json
{
	"username": "maxmustermann"
}
```

Response: `{ "message": "ok" }` (aus Sicherheitsgründen immer generisch)

6.2 Sets

GET /sets/public
- Response: JSON Array mit öffentlichen Sets

GET /sets/my
- Auth: erforderlich (Depends auf `get_current_user_id`)
- Response: JSON Array mit Sets des Users

POST /sets
- Auth: erforderlich
- Request Schema: `StudySetCreate` (siehe `app/schemas/sets.py`)

```json
{
	"title": "Spanisch Vokabeln",
	"description": "A1 Grundwortschatz",
	"is_public": false
}
```

PUT /sets/{set_id}
- Auth: erforderlich; besitzt `require_set_owner` Logik
- Request Schema: `StudySetUpdate` (optionale Felder)

DELETE /sets/{set_id}
- Auth: erforderlich; Only owner

6.3 Cards

GET /sets/{set_id}/cards
- Optional Authorization header erlaubt Zugriff auf private Sets, wenn Token gültig und User Owner.

POST /sets/{set_id}/cards
- Auth: erforderlich; `FlashcardCreate` Schema (siehe `app/schemas/cards.py`)

Request Beispiel:

```json
{
	"question": "Wie heißt ‚apple‘ auf Deutsch?",
	"answer": "Apfel",
	"position": 1
}
```

DELETE /cards/{card_id}
- Auth: erforderlich; `require_card_owner` prüft Eigentümerschaft

6.4 Quiz Endpunkte (KI‑Integration)

`POST /quiz/generate` (Beispiel)
- Request Schema: `QuizGenerateRequest` (siehe `app/schemas/quiz.py`)
- Response Schema: `QuizGenerateResponse`

Anmerkung: Die Implementierung nutzt optional `GEMINI_API_KEY` für KI‑gestützte Generierung; ohne Key kann eine heuristische Quizgenerierung genutzt werden.

7. Datenbank‑Schema & Migrationshinweise
---------------------------------------

Die Projektdatei `sql_schema.sql` enthält eine Referenzstruktur. Wichtige Tabellen:

- `study_sets` (id PK, owner_id FK, title, description, is_public, created_at, updated_at)
- `flashcards` (id PK, set_id FK, question, answer, created_at)

Empfehlungen für Migrationen:

- Verwende ein Migrationswerkzeug (z. B. `pg-migrate`, `alembic` oder Supabase Migrations)
- Backups vor Schemaänderungen durchführen

8. Authentifizierung, Autorisierung & Security
---------------------------------------------

Auth mechanik:
- Frontend: Auth via Supabase JS SDK (client erhält Access Token)
- Backend: Validiert Tokens bei geschützten Endpunkten durch Supabase Client oder direkte Token‑Verifizierung

Wichtige Sicherheitsregeln:

- Service Role Keys nie im Frontend veröffentlichen
- RLS Policies in Supabase: Für Produktionsbetrieb sollte RLS (Row Level Security) konfiguriert werden, sodass nur Owner auf eigene Daten schreiben können.
- CSP/CORS: Nur vertrauenswürdige Ursprünge in `CORS_ORIGINS` zulassen
- Secrets: Verwendung von Secret Manager in CI/Cloud

9. Frontend‑Architektur & wichtige Komponenten
---------------------------------------------

Designprinzipien:
- Komponentenorientiertes Design mit Reusable UI Primitives unter `src/components/ui/`
- Tailwind CSS + Utility Classes für schnelles Styling

Wichtige Komponenten (Kurzbeschreibung):
- `Header` — enthält Suche, Neu‑Kurs Button, Nutzer Menü
- `CourseGrid`, `CourseCard` — Darstellung von Kursen / Sets
- `RecentCourses` — kleine Ansicht zuletzt verwendeter Sets
- `ui/card.tsx` — Card primitives (Title, Content, Footer)

Data fetching pattern:
- Supabase JS Client sollte in Frontend integriert werden; aktuell enthält das Repo Platzhalter/Demo‑Daten.

10. UI/UX, Animationen & Browser‑Kompatibilität (Flip‑Card Bugfix)
-----------------------------------------------------------------

Problem: In Firefox kann bei Card‑Flip Animationen (Y‑Rotation) die Rückseite sichtbar bleiben oder Vorder‑ und Rückseite gleichzeitig dargestellt werden.

Ursachen:
- Fehlende CSS Eigenschaften (`transform-style: preserve-3d` oder `backface-visibility: hidden`)
- Fehlelemente, die eigenen 3D Kontext erzeugen

Best Practice CSS Implementation (empfohlen):

```css
.card-wrapper {
	perspective: 1200px;
}
.card-inner {
	width: 100%;
	height: 100%;
	transform-style: preserve-3d; /* zwingend für 3D children */
	transition: transform 0.6s cubic-bezier(.4,0,.2,1);
}
.card-face {
	position: absolute;
	inset: 0; /* top/right/bottom/left: 0 */
	backface-visibility: hidden; /* versteckt Rückseite wenn zurück gedreht */
	-webkit-backface-visibility: hidden; /* Safari */
}
.card-back { transform: rotateY(180deg); }
.is-flipped .card-inner { transform: rotateY(180deg); }
```

Weitere Hinweise:
- Setze `will-change: transform` sparsam ein; es kann GPU‑Beschleunigung erzwingen, führt aber evtl. zu hohem Speicherverbrauch.
- Vermeide zusätzliche `transform` auf Kinder der `.card-face` Elemente — das kann das Stacking/Backface‑Verhalten stören.
- Teste auf mehreren Browsern: Firefox, Chrome/Chromium, Safari (macOS & iOS)

11. Logging, Monitoring und Fehlerbehandlung
------------------------------------------

Backend Logging:
- Nutze strukturiertes Logging (JSON) in Produktionsumgebungen; z. B. `loguru` oder `structlog` für Python.

Monitoring:
- Health Endpoint (`/health`) regelmäßig abfragen
- Error tracking: Einrichtung von Sentry/Logflare zur Erfassung von Exceptions

12. Tests, QA und empfohlenes Testsetup
-------------------------------------

Empfohlene Tests:
- Unit Tests: pytest (Backend), vitest/jest (Frontend)
- Integration Tests: Test Supabase interactions using a staging DB
- E2E Tests: Playwright oder Cypress für kritische Flows

Beispiel pytest Kommando:

```bash
pip install pytest
pytest -q
```

13. CI/CD und Deployment (Vercel & Alternativen)
-----------------------------------------------

CI Workflow (empfohlen):

1. Linting (ESLint/Prettier, flake8/black)
2. Unit Tests
3. Build Frontend (`npm run build`)
4. Integration Tests / E2E (optional)
5. Deploy to staging

Vercel Deployment Hinweise:
- Frontend: Standard Vite build & static hosting
- Backend: Vercel Serverless Functions möglich — prüfe start‑time & cold start Anforderungen

Alternative Backends: Docker‑Container auf Fly.io, Railway, DigitalOcean App Platform

14. Contributing, Branching & Release‑Prozess
------------------------------------------

Branching Model (empfehlung):
- `main` — Produktionsbereit
- Feature Branches: `feature/<name>`
- Bugfix Branches: `fix/<issue>`
- Personal Branches: z. B. `devi` (lokale Arbeitskopie)

Commit Konvention (bevorzugt):
- `<type>(<scope>): <kurze beschreibung>`
- Types: feat, fix, docs, chore, style, refactor, test, ci

Pull Request Checklist:
- Tests grün
- Linting bestanden
- Beschreibung + Screenshots / Reproduktionssteps

15. Troubleshooting & FAQ
-------------------------

Issue: CORS Fehler
- Prüfen: `CORS_ORIGINS` korrekt gesetzt? Backend neu starten nach Änderung.

Issue: Supabase Token Fehler
- Prüfen: Keys und Redirect URLs in Supabase Control Panel.

Issue: Flip Card zeigt Vorder- und Rückseite in Firefox
- Lösung: CSS Snippet in Abschnitt 10 befolgen; sicherstellen, dass `backface-visibility: hidden` auf beiden Seiten gesetzt ist.

16. ChangeLog (Auswahl wichtiger Commits)
--------------------------------------

- `fa7c4df` — 2026-05-19 — Kartensets erstellen (Michelle Schneider)
- `81b7561` — 2026-05-19 — feat: enhance flip card styles with performance optimizations
- `db4dcbb` — 2026-05-19 — feat: integrate AI quiz generation using Google Gemini
- `048da9b` — 2026-05-19 — feat: implement password recovery flow with email sending
- `8cea6d6` — 2026-05-19 — feat: integrate Supabase for user authentication and data management

17. To‑Do / Offene Aufgaben
--------------------------

- Vollständige Implementation & Tests des Quiz‑Flows (KI + heuristisch)
- E2E Tests & CI Pipeline einrichten
- Browser‑Fallbacks für CSS Features ergänzen
- API Spec (OpenAPI export) ins `docs/` Verzeichnis aufnehmen

18. Anhänge
-----------

A) SQL Schema (Auszug)

```sql
create table if not exists public.study_sets (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users(id) on delete cascade,
	title text not null,
	description text,
	is_public boolean not null default false,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists public.flashcards (
	id uuid primary key default gen_random_uuid(),
	set_id uuid not null references public.study_sets(id) on delete cascade,
	question text not null,
	answer text not null,
	created_at timestamptz not null default now()
);
```

B) Pydantic Schemas (Auszug)

- `app/schemas/sets.py` — `StudySetCreate`, `StudySetUpdate` (Validierung: title length, description optional)
- `app/schemas/cards.py` — `FlashcardCreate`, `FlashcardUpdate` (Validierung: question/answer lengths, position >= 0)
- `app/schemas/quiz.py` — `QuizGenerateRequest`, `QuizGenerateResponse`, `QuizQuestion`

C) Nützliche Curl‑Snippets

```bash
# Health
curl http://localhost:8000/health

# Liste öffentliche sets
curl http://localhost:8000/sets/public

# Karten eines Sets (public)
curl http://localhost:8000/sets/<set_id>/cards
```

