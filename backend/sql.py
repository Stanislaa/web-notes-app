from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy import String, create_engine, DateTime
from datetime import datetime
from typing import Optional
import os

from models.models import *


# class Base(DeclarativeBase):
#     pass


# class NoteBase(Base):
#     __tablename__ = "notes"
    
#     id: Mapped[int] = mapped_column(primary_key=True)
#     headline: Mapped[Optional[str]] = mapped_column(String(45))
#     text: Mapped[Optional[str]] = mapped_column(String(10000))
#     created_date: Mapped[datetime] = mapped_column(DateTime)
#     change_date: Mapped[Optional[datetime]] = mapped_column(DateTime)


os.makedirs("db", exist_ok=True)
engine = create_engine("sqlite:///db/data.db", echo=False)
Base.metadata.create_all(engine)

Session = sessionmaker(engine)


def create_note(note: NoteBase, session):
    session.add(note)
    session.commit()
    session.refresh(note)
    return note


def change_note(id: int, session, new_data):
    note = session.get(NoteBase, id)
    if note is None:
        return None
    else:
        note.headline = new_data.get("new_headline", note.headline)
        note.text = new_data.get("text", note.text)
        note.improtance = new_data.get("improtance", note.improtance)  # Добавьте эту строку
        note.change_date = datetime.now()
        return note


def delete_note(id: int, session):
    note = session.get(NoteBase, id)
    if note is None:
        print(f"Заметка с id {id} не найдена")
    else:
        session.delete(note)
        print(f"Заметка с id {id} удалена")




# note1 = NoteBase(
#     created_date=datetime(2026, 1, 28, 17, 15, 0),
#     headline="Заметка1",
#     text="Текст заметки номер 1. Бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла"
# )

# note2 = NoteBase(
#     created_date=datetime(2026, 1, 29, 17, 22, 0),
#     change_date=datetime(2026, 1, 30, 15, 50, 55),
#     headline="Заметка2",
#     text="Текст заметки номер 2. Бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла"
# )

# new_data = {
#     "new_headline": "Новый заголовок для заметки",
#     "new_text": "Новый текст заметки",
#     "change_date": datetime(2026, 1, 31, 15, 51, 55)
# }


with Session() as session:
    try:
        # create_note(note1, session)
        # create_note(note2, session)
        # delete_note(2, session)
        session.commit()
    except Exception as e:
        session.rollback()
        print(f"Ошибка: {e}")
        raise
