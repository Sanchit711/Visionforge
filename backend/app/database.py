from typing import Generator
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.config import settings

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)

# Enable foreign key support for SQLite
if settings.DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db() -> None:
    import app.models  # noqa
    Base.metadata.create_all(bind=engine)

    # Migrate columns if tables already existed
    try:
        with engine.connect() as conn:
            # Check projects table
            res = conn.execute(text("PRAGMA table_info(projects)"))
            existing_proj_cols = [row[1] for row in res.fetchall()]
            if "tenant_id" not in existing_proj_cols:
                conn.execute(text("ALTER TABLE projects ADD COLUMN tenant_id VARCHAR(36)"))
            if "workspace_id" not in existing_proj_cols:
                conn.execute(text("ALTER TABLE projects ADD COLUMN workspace_id VARCHAR(36)"))
            if "created_by_user_id" not in existing_proj_cols:
                conn.execute(text("ALTER TABLE projects ADD COLUMN created_by_user_id VARCHAR(36)"))

            # Check users table
            res_u = conn.execute(text("PRAGMA table_info(users)"))
            existing_user_cols = [row[1] for row in res_u.fetchall()]
            if "password_hash" not in existing_user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) DEFAULT ''"))

            conn.commit()
    except Exception as e:
        print(f"Warning: database migration check: {e}")
