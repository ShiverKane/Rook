from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import os
from starlette.middleware.gzip import GZipMiddleware
from .db import Base, engine, ensure_schema_migrations
from .routers import auth, books, listings, users, categories, messages

Base.metadata.create_all(bind=engine)
ensure_schema_migrations()

description = """
Used Books Marketplace API helps you do awesome stuff. 🚀

## Users

You can:
* **Register** new users.
* **Login** to get an access token.
* **View profile** and **update profile**.

## Listings

You can:
* **Create listings** for books.
* **View listings**.
* **Buy** and **Sell** books.

## Admin

Admins can:
* **Manage users** (lock/unlock).
* **Manage posts**.
"""

tags_metadata = [
    {
        "name": "auth",
        "description": "Operations with authentication. The **login** logic is also here.",
    },
    {
        "name": "users",
        "description": "Manage users.",
    },
    {
        "name": "listings",
        "description": "Manage listings.",
    },
    {
        "name": "categories",
        "description": "Manage book categories.",
    },
    {
        "name": "messages",
        "description": "Send and read messages.",
    },
    {
        "name": "books",
        "description": "Manage books.",
    },
]

app = FastAPI(
    title="Used Books Marketplace",
    description=description,
    version="0.0.1",
    openapi_tags=tags_metadata,
    contact={
        "name": "Rook Team",
        "email": "contact@rook.com",
    },
)

app.add_middleware(GZipMiddleware, minimum_size=500)

candidate_frontend_dirs = [
    Path(__file__).resolve().parents[2] / "frontend",
    Path(__file__).resolve().parents[1] / "frontend",
]
frontend_dir = next((p for p in candidate_frontend_dirs if p.exists()), None)
if frontend_dir:
    app.mount("/ui", StaticFiles(directory=str(frontend_dir), html=True), name="ui")

@app.middleware("http")
async def add_static_cache_headers(request, call_next):
    resp = await call_next(request)
    path = request.url.path or ""
    if resp.status_code != 200:
        return resp

    if path.startswith("/ui/assets/"):
        if "cache-control" not in resp.headers:
            resp.headers["Cache-Control"] = "public, max-age=3600"
        return resp

    if path == "/ui/" or path.startswith("/ui/pages/"):
        if "cache-control" not in resp.headers:
            resp.headers["Cache-Control"] = "no-cache"
        return resp

    return resp

@app.get("/", include_in_schema=False)
def root():
    if frontend_dir:
        return RedirectResponse(url="/ui/")
    return {"status": "ok"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/config", include_in_schema=False)
def config():
    return {
        "supabase_rest_url": os.getenv("ROOK_SUPABASE_REST_URL") or None,
        "supabase_anon_key": os.getenv("ROOK_SUPABASE_ANON_KEY") or None,
    }

app.include_router(auth.router)
app.include_router(books.router)
app.include_router(listings.router)
app.include_router(users.router)
app.include_router(categories.router)
app.include_router(messages.router)
