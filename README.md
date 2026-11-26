# ResearchBridge

A database-backed tool for exploring how scientific papers connect through their
citations. It imports real scholarly metadata from the [OpenAlex](https://openalex.org)
API into a MySQL relational database and exposes it through a FastAPI backend and a
React frontend, including an interactive citation-network view and a "bridge finder"
that looks for citation paths and shared references between two papers.

## Project layout

| Path        | Purpose                                                          |
|-------------|------------------------------------------------------------------|
| `db/`       | MySQL schema, bootstrap script, and seed data                    |
| `backend/`  | FastAPI application and the OpenAlex ingestion pipeline (Python)  |
| `frontend/` | React + Vite single-page app, with a Cytoscape.js graph view     |
| `docs/`     | Architecture notes, setup guide, and API reference               |

## Stack

- MySQL 8
- Python 3.12, FastAPI, mysql-connector-python, httpx
- React, Vite, Cytoscape.js
- OpenAlex API (no key required) as the data source

## Quick start

Full instructions are in [docs/SETUP.md](docs/SETUP.md). The short version:

```bash
# 1. Create the database and application user (once, as MySQL root)
mysql -u root -p < db/bootstrap.sql

# 2. Backend
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows (PowerShell: .venv\Scripts\Activate.ps1)
pip install -r requirements.txt
copy .env.example .env            # fill in the DB password

# 3. Frontend
cd ../frontend
npm install
npm run dev
```

## Status

Foundation stage. The schema, configuration, and project structure are in place;
the ingestion pipeline, API endpoints, and frontend pages are being built on top.
