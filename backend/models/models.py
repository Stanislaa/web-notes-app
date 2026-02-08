from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, DateTime, Integer
from datetime import datetime
from typing import Optional


class Base(DeclarativeBase):
    pass


class NoteBase(Base):
    __tablename__ = "notes"

    id: Mapped[int] = mapped_column(primary_key=True)
    headline: Mapped[Optional[str]] = mapped_column(String(45))
    text: Mapped[Optional[str]] = mapped_column(String(10000))
    improtance: Mapped[int] = mapped_column(Integer)
    created_date: Mapped[datetime] = mapped_column(DateTime)
    change_date: Mapped[Optional[datetime]] = mapped_column(DateTime)


class TrashedNote(Base):
    __tablename__ = "trashed_notes"

    id: Mapped[int] = mapped_column(primary_key=True)
    original_id: Mapped[int] = mapped_column(Integer)
    headline: Mapped[Optional[str]] = mapped_column(String(45))
    text: Mapped[Optional[str]] = mapped_column(String(10000))
    improtance: Mapped[int] = mapped_column(Integer)
    created_date: Mapped[datetime] = mapped_column(DateTime)
    change_date: Mapped[Optional[datetime]] = mapped_column(DateTime)
    deleted_date: Mapped[datetime] = mapped_column(DateTime)
