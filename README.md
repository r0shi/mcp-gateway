# Local Knowledge Appliance

A single-tenant document dropbox with OCR, hybrid full-text + vector search, and an MCP endpoint for LLM tool use. Designed for small offices running on a Mac mini or similar hardware.

Drop in PDFs, DOCX, RTF, or plain text files. The system extracts text (with OCR for scanned documents), chunks it, generates embeddings, and makes everything searchable. Cloud LLMs can query the knowledge base via MCP over HTTPS using read-only API keys — they receive only cited snippets, never the full corpus.

## Prerequisites

- **Docker Desktop** (macOS/Windows) or **Docker Engine + Compose** (Linux)
  - At least 4 GB RAM allocated to Docker (8 GB recommended)
- **Git**

## Quick Start

1. **Clone the repo**

   ```bash
   git clone https://github.com/r0shi/mcp-gateway.git
   cd mcp-gateway
   ```

2. **Create your environment file**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and change `SECRET_KEY` to a random string:

   ```bash
   # Generate a random key:
   python3 -c "import secrets; print(secrets.token_urlsafe(48))"
   ```

3. **Start the stack**

   ```bash
   docker compose up --build
   ```

   First build takes a few minutes (downloading base images, model weights, etc.). Subsequent starts are much faster.

4. **Open the app**

   Browse to **https://localhost/** and accept the self-signed certificate warning.

   On first launch you'll see a setup page — create your admin account with a strong password (min 12 characters, mixed case, at least one digit).

5. **Verify health**

   ```bash
   curl -k https://localhost/api/system/health
   ```

   All checks should return `"ok"`.

## Architecture

Nine Docker services:

| Service | Role |
|---|---|
| **gateway** | Caddy reverse proxy with automatic HTTPS (self-signed) |
| **app** | FastAPI REST API + MCP endpoint + serves React SPA |
| **worker-io** | Background worker for text extraction and chunking |
| **worker-cpu** | Background worker for OCR and embedding |
| **embedder** | Sentence-transformers model server (all-MiniLM-L6-v2, 384-dim) |
| **postgres** | PostgreSQL with pgvector and pg_trgm extensions |
| **redis** | Job queue backend |
| **minio** | Object storage for original files |
| **tika** | Apache Tika for RTF and fallback text extraction |

## Ingestion Pipeline

Upload a file and it goes through five stages:

1. **Extract** — pull text from PDF (PyMuPDF), DOCX (python-docx), or RTF/fallback (Tika)
2. **OCR** — conditional: always for images, for PDFs with little extractable text. Uses Tesseract (English + French)
3. **Chunk** — split into ~1000 character segments with 150 char overlap, preserving page references
4. **Embed** — generate 384-dim vectors via the embedder service
5. **Finalize** — mark ingestion complete

Progress is streamed to the UI via server-sent events.

## Search

Hybrid retrieval combining:
- PostgreSQL full-text search (bilingual English/French)
- pgvector cosine similarity

Results are merged, deduplicated, and ranked with boosts for latest document versions and higher OCR confidence. All results include source citations with page numbers.

## API

### REST

| Endpoint | Description |
|---|---|
| `POST /api/auth/login` | Login (email + password) |
| `GET /api/system/setup-status` | Check if first-time setup is needed |
| `POST /api/setup` | Create initial admin account |
| `POST /api/uploads` | Upload documents |
| `GET /api/docs` | List documents |
| `GET /api/search?q=...` | Hybrid search |
| `GET /api/system/health` | Health check |

### MCP

`POST /mcp` — Streamable HTTP transport. Tools:

- `kb_search` — hybrid search with citations
- `kb_read_passages` — read specific passages by chunk ID
- `kb_get_document` — document metadata and versions
- `kb_list_recent` — recently added documents
- `kb_ingest_status` — check ingestion progress
- `kb_reprocess` — re-run ingestion on a document
- `kb_system_health` — system health check

MCP clients authenticate with API keys created by an admin: `Authorization: Bearer <api_key>`

## Auth

- **Human users**: email + password, JWT access tokens + refresh cookies. Roles: `admin` / `user`.
- **API keys**: admin-created, read-only, for MCP clients. Stored as SHA-256 hashes.

## Configuration

All configuration is via environment variables in `.env`:

| Variable | Default | Description |
|---|---|---|
| `SECRET_KEY` | `change-me-in-production` | JWT signing key — **change this** |
| `DATABASE_URL` | `postgresql+asyncpg://lka:...` | PostgreSQL connection string |
| `REDIS_URL` | `redis://redis:6379/0` | Redis connection string |
| `MINIO_ENDPOINT` | `minio:9000` | MinIO endpoint |
| `MINIO_ACCESS_KEY` | `minioadmin` | MinIO access key |
| `MINIO_SECRET_KEY` | `minioadmin123` | MinIO secret key |
| `LOG_LEVEL` | `INFO` | Logging level |

For production, you should also change the PostgreSQL and MinIO credentials.

## Development

The project uses [uv](https://docs.astral.sh/uv/) for Python package management. To work on the backend locally:

```bash
uv sync
uv run mcp-gateway-api   # run API server
```

The frontend is a Vite + React + TypeScript SPA in `frontend/`:

```bash
cd frontend
npm install
npm run dev
```

## Managing the Stack

**Start** (after a previous `docker compose down`, or first time):

```bash
docker compose up --build      # build images and start (foreground)
docker compose up --build -d   # same, but detached (background)
```

**Restart a single service** (e.g., after code changes to the app):

```bash
docker compose up --build -d app   # rebuild and restart just the app container
```

**Stop** (keeps data volumes intact — documents, database, etc.):

```bash
docker compose down
```

**Start again** after stopping (no rebuild needed if nothing changed):

```bash
docker compose up -d
```

**Full reset** (destroys all data — database, uploaded files, everything):

```bash
docker compose down -v
```

**View logs:**

```bash
docker compose logs -f          # tail all services
docker compose logs -f app      # tail just the app
docker compose logs -f worker-io worker-cpu   # tail both workers
```

## License

Private — not yet licensed for distribution.
