r"""One-off migration helper for local dev.
Adds `sentiment` column to `messages` table if missing, and runs create_all for new tables.

Usage (PowerShell):
  # stop uvicorn server first (Ctrl+C in that terminal)
  .\.venv\Scripts\Activate.ps1
  python .\scripts\migrate_db.py
"""
import os
import sys
from sqlalchemy import text

# Ensure project root is on sys.path so imports like `import db, models` work
ROOT = os.path.dirname(os.path.dirname(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

try:
    import db, models
except Exception as e:
    print("Failed to import project modules (are you running this from the repo root?). Error:", e)
    raise

engine = db.engine

with engine.connect() as conn:
    # Create any new tables (e.g. memories)
    print("Running create_all for model tables (will create missing tables)...")
    models.Base.metadata.create_all(bind=engine)

    # Check if 'sentiment' column exists and add if necessary (SQLite)
    try:
        # Try selecting the sentiment column (will fail if not present)
        conn.execute(text("SELECT sentiment FROM messages LIMIT 1"))
        print("Column 'sentiment' already exists on messages table.")
    except Exception:
        print("Adding 'sentiment' column to messages table...")
        # SQLite supports ADD COLUMN for new nullable columns
        try:
            conn.execute(text("ALTER TABLE messages ADD COLUMN sentiment TEXT"))
            print("Added 'sentiment' column.")
        except Exception as e:
            print("Failed to add sentiment column:", e)

print("Migration finished.")
