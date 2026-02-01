from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy import String, DateTime, Integer
from datetime import datetime
from typing import Optional


class Base(DeclarativeBase):
    pass


class NoteBase(Base):
    __tablename__ = "notes"

    id: Mapped[int] = mapped_column(primary_key=True)
    improtance: Mapped[int] = mapped_column(Integer)
    headline: Mapped[Optional[str]] = mapped_column(String(45))
    text: Mapped[Optional[str]] = mapped_column(String(10000))
    created_date: Mapped[datetime] = mapped_column(DateTime)
    change_date: Mapped[Optional[datetime]] = mapped_column(DateTime)
