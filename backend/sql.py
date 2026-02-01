from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from datetime import datetime
from typing import Optional, List
import os

from models.models import Base, NoteBase, TrashedNote

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
    if "is_pinned" in new_data:
        note.is_pinned = new_data["is_pinned"]

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


def move_to_trash(id: int, session) -> Optional[TrashedNote]:
    note = session.get(NoteBase, id)
    if note is None:
        return None

    trashed = TrashedNote(
        original_id=note.id,
        improtance=note.improtance,
        headline=note.headline,
        text=note.text,
        created_date=note.created_date,
        change_date=note.change_date,
        deleted_date=datetime.now()
    )
    session.add(trashed)
    session.delete(note)
    return trashed


def get_all_trashed(session) -> List[TrashedNote]:
    return session.query(TrashedNote).order_by(TrashedNote.deleted_date.desc()).all()


def restore_from_trash(id: int, session) -> Optional[NoteBase]:
    trashed = session.get(TrashedNote, id)
    if trashed is None:
        return None

    note = NoteBase(
        improtance=trashed.improtance,
        headline=trashed.headline,
        text=trashed.text,
        created_date=trashed.created_date,
        change_date=datetime.now()
    )
    session.add(note)
    session.delete(trashed)
    return note


def delete_from_trash(id: int, session) -> bool:
    trashed = session.get(TrashedNote, id)
    if trashed is None:
        return False
    session.delete(trashed)
    return True
