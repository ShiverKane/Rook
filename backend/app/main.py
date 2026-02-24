from fastapi import FastAPI
from .db import Base, engine
from .routers import auth, books, listings

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Used Books Marketplace")

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(auth.router)
app.include_router(books.router)
app.include_router(listings.router)
