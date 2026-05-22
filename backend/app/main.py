from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from .db import Base, engine
from .routers import auth, books, listings, users, categories, messages

Base.metadata.create_all(bind=engine)

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

candidate_frontend_dirs = [
    Path(__file__).resolve().parents[2] / "frontend",
    Path(__file__).resolve().parents[1] / "frontend",
]
frontend_dir = next((p for p in candidate_frontend_dirs if p.exists()), None)
if frontend_dir:
    app.mount("/ui", StaticFiles(directory=str(frontend_dir), html=True), name="ui")

@app.get("/", include_in_schema=False)
def root():
    if frontend_dir:
        return RedirectResponse(url="/ui/")
    return {"status": "ok"}

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(auth.router)
app.include_router(books.router)
app.include_router(listings.router)
app.include_router(users.router)
app.include_router(categories.router)
app.include_router(messages.router)
