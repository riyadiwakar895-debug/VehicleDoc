import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Default to SQLite file database in the project directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, "vehicles.db")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_FILE}")

# SQLite requires check_same_thread=False for multi-threaded FastAPI handlers
engine_args = {}
if DATABASE_URL.startswith("sqlite"):
    engine_args["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **engine_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency to yield a database session and close it afterwards."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
