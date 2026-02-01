from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from datetime import datetime
from typing import Optional, List
import os
import logging

from models.models import Base, NoteBase

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database setup
os.makedirs("db", exist_ok=True)
engine = create_engine("sqlite:///db/data.db", echo=False)
Base.metadata.create_all(engine)

Session = sessionmaker(bind=engine)


def create_note(note: NoteBase, session) -> NoteBase:
    """Create a new note in the database."""
    try:
        session.add(note)
        session.commit()
        session.refresh(note)
        logger.info(f"Note created with id {note.id}")
        return note
    except Exception as e:
        session.rollback()
        logger.error(f"Error creating note: {e}")
        raise


def change_note(id: int, session, new_data: dict) -> Optional[NoteBase]:
    """Update an existing note."""
    note = session.get(NoteBase, id)
    if note is None:
        logger.warning(f"Note with id {id} not found")
        return None

    if "new_headline" in new_data:
        note.headline = new_data["new_headline"]
    if "text" in new_data:
        note.text = new_data["text"]
    if "improtance" in new_data:
        note.improtance = new_data["improtance"]

    note.change_date = datetime.now()
    logger.info(f"Note with id {id} updated")
    return note


def delete_note(id: int, session) -> bool:
    """Delete a note from the database."""
    note = session.get(NoteBase, id)
    if note is None:
        logger.warning(f"Note with id {id} not found")
        return False

    session.delete(note)
    logger.info(f"Note with id {id} deleted")
    return True


def get_all_notes(session) -> List[NoteBase]:
    """Get all notes from the database."""
    return session.query(NoteBase).order_by(NoteBase.created_date.desc()).all()


def get_note_by_id(id: int, session) -> Optional[NoteBase]:
    """Get a note by its ID."""
    return session.get(NoteBase, id)
