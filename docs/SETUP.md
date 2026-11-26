# Setup

## Prerequisites

- MySQL 8 (local install or the provided `docker-compose.yml`)
- Python 3.12+
- Node.js 20+

## 1. Database

Create the application database and user once, as a MySQL administrator:

```bash
mysql -u root -p < db/bootstrap.sql
```

This creates the `research_bridge` database and the `rb_app` user (password
`rb_app_pw`, intended for local development only). Then load the schema:

```bash
mysql -u rb_app -p research_bridge < db/schema.sql
```

If you prefer Docker, `docker compose up -d` starts MySQL and loads the schema
automatically. See the note in `docker-compose.yml` about the 3306 port.

## 2. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate              # PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env              # macOS/Linux: cp .env.example .env
```

Edit `.env` so `DB_PASSWORD` matches the `rb_app` user.

## 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

## Data

The citation data is imported from the OpenAlex API, which requires no key.
Ingestion is run from the backend (see `backend/ingestion/`). Setting
`OPENALEX_MAILTO` in `.env` is optional and only routes requests through
OpenAlex's faster "polite pool".
