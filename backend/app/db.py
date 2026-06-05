import os
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

def _load_dotenv_if_present():
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        return
    try:
        for raw in env_path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            if line.lower().startswith("export "):
                line = line[7:].strip()
            if "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip()
            if not key:
                continue
            current = os.environ.get(key, None)
            if current is not None and str(current) != "":
                continue
            if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
                value = value[1:-1]
            os.environ[key] = value
    except Exception:
        return

_load_dotenv_if_present()

_env_db = os.getenv("DATABASE_URL")
if not _env_db:
    default_db_path = (Path(__file__).resolve().parents[1] / "app.db").as_posix()
    DATABASE_URL = f"sqlite:///{default_db_path}"
else:
    if _env_db.startswith("sqlite:///./"):
        rel = _env_db.replace("sqlite:///./", "", 1)
        abs_path = (Path(__file__).resolve().parents[1] / rel).as_posix()
        DATABASE_URL = f"sqlite:///{abs_path}"
    else:
        DATABASE_URL = _env_db

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, echo=False, future=True, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)
Base = declarative_base()

def ensure_schema_migrations():
    if not DATABASE_URL.startswith("sqlite"):
        return
    with engine.connect() as conn:
        conn.execute(text("CREATE TABLE IF NOT EXISTS __rook_migrations (key TEXT PRIMARY KEY)"))
        applied = {
            r[0]
            for r in conn.execute(text("SELECT key FROM __rook_migrations")).fetchall()
        }
        key = "2026-06-02_books_is_approved"
        if key not in applied:
            cols = [r[1] for r in conn.execute(text("PRAGMA table_info(books)")).fetchall()]
            if "is_approved" not in cols:
                conn.execute(text("ALTER TABLE books ADD COLUMN is_approved BOOLEAN NOT NULL DEFAULT 1"))
            conn.execute(text("INSERT OR IGNORE INTO __rook_migrations(key) VALUES (:k)"), {"k": key})
            conn.commit()
        key = "2026-06-03_books_created_by"
        if key not in applied:
            cols = [r[1] for r in conn.execute(text("PRAGMA table_info(books)")).fetchall()]
            if "created_by" not in cols:
                conn.execute(text("ALTER TABLE books ADD COLUMN created_by INTEGER"))
            conn.execute(text("INSERT OR IGNORE INTO __rook_migrations(key) VALUES (:k)"), {"k": key})
            conn.commit()
        key = "2026-06-04_categories_approval"
        if key not in applied:
            cols = [r[1] for r in conn.execute(text("PRAGMA table_info(categories)")).fetchall()]
            if "is_approved" not in cols:
                conn.execute(text("ALTER TABLE categories ADD COLUMN is_approved BOOLEAN NOT NULL DEFAULT 1"))
            if "created_by" not in cols:
                conn.execute(text("ALTER TABLE categories ADD COLUMN created_by INTEGER"))
            conn.execute(text("INSERT OR IGNORE INTO __rook_migrations(key) VALUES (:k)"), {"k": key})
            conn.commit()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
