from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from datetime import datetime
from typing import Optional, List
import os

from models.models import Base, NoteBase

os.makedirs("db", exist_ok=True)
engine = create_engine("sqlite:///db/data.db", echo=False)
Base.metadata.create_all(engine)

Session = sessionmaker(bind=engine)


def create_note(note: NoteBase, session) -> NoteBase:
    session.add(note)
    session.commit()
    session.refresh(note)
    return note


def change_note(id: int, session, new_data: dict) -> Optional[NoteBase]:
    note = session.get(NoteBase, id)
    if note is None:
        return None

    if "new_headline" in new_data:
        note.headline = new_data["new_headline"]
    if "text" in new_data:
        note.text = new_data["text"]
    if "improtance" in new_data:
        note.improtance = new_data["improtance"]

    note.change_date = datetime.now()
    return note


def delete_note(id: int, session) -> bool:
    note = session.get(NoteBase, id)
    if note is None:
        return False

    session.delete(note)
    return True


def get_all_notes(session) -> List[NoteBase]:
    return session.query(NoteBase).order_by(NoteBase.created_date.desc()).all()


def get_note_by_id(id: int, session) -> Optional[NoteBase]:
    return session.get(NoteBase, id)
