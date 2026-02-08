from fastapi import FastAPI, Request, Depends, HTTPException, status
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.orm import Session

from sql import (
    Session as SessionLocal, create_note, change_note, delete_note,
    move_to_trash, get_all_trashed, restore_from_trash, delete_from_trash
)
from models.models import NoteBase, TrashedNote

from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Optional


class NoteCreate(BaseModel):
    headline: str = Field(..., min_length=1, max_length=45)
    text: Optional[str] = Field(None, max_length=10000)
    improtance: int = Field(default=1, ge=1, le=3)


class NoteUpdate(BaseModel):
    headline: Optional[str] = Field(None, max_length=45)
    text: Optional[str] = Field(None, max_length=10000)
    improtance: Optional[int] = Field(None, ge=1, le=3)


class NoteResponse(BaseModel):
    id: int
    headline: Optional[str]
    text: Optional[str]
    improtance: int
    created_date: datetime
    change_date: Optional[datetime]

    class Config:
        from_attributes = True


class TrashedNoteResponse(BaseModel):
    id: int
    original_id: int
    headline: Optional[str]
    text: Optional[str]
    improtance: int
    created_date: datetime
    change_date: Optional[datetime]
    deleted_date: datetime

    class Config:
        from_attributes = True


app = FastAPI(title="Notes API", version="1.0.0")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["sysinfo.ro", "46.173.28.153"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    with SessionLocal() as db:
        yield db


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    if exc.status_code == 404:
        accept = request.headers.get("accept", "")
        if "text/html" in accept:
            return FileResponse("../frontend/404.html", status_code=404)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )


@app.get("/")
@app.get("/index")
@app.get("/index.html")
async def index():
    return FileResponse("../frontend/index.html")


@app.get("/style.css")
async def styles():
    return FileResponse("../frontend/style.css")


@app.get("/script.js")
async def js():
    return FileResponse("../frontend/script.js", media_type="application/javascript")


@app.get("/trash.html")
async def trash():
    return FileResponse("../frontend/trash.html")


@app.get("/image.png")
async def image():
    return FileResponse("../frontend/image.png", media_type="image/png")


@app.post("/notes/", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def create(note: NoteCreate, db: Session = Depends(get_db)):
    db_note = NoteBase(
        headline=note.headline,
        text=note.text,
        improtance=note.improtance,
        created_date=datetime.now(timezone.utc)
    )
    created_note = create_note(db_note, session=db)
    return created_note


@app.get("/notes/", response_model=list[NoteResponse])
async def get_all(db: Session = Depends(get_db)):
    notes = db.query(NoteBase).all()
    return notes


@app.get("/notes/{note_id}", response_model=NoteResponse)
async def get_one(note_id: int, db: Session = Depends(get_db)):
    note = db.query(NoteBase).filter(NoteBase.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Заметка не найдена")
    return note


@app.put("/notes/{note_id}", response_model=NoteResponse)
async def update(note_id: int, note_update: NoteUpdate, db: Session = Depends(get_db)):
    existing_note = db.query(NoteBase).filter(NoteBase.id == note_id).first()
    if not existing_note:
        raise HTTPException(status_code=404, detail="Заметка не найдена")

    new_data = {"change_date": datetime.now(timezone.utc)}

    if note_update.headline is not None:
        new_data["new_headline"] = note_update.headline
    if note_update.text is not None:
        new_data["text"] = note_update.text
    if note_update.improtance is not None:
        new_data["improtance"] = note_update.improtance

    change_note(note_id, db, new_data)
    db.commit()
    db.refresh(existing_note)

    return existing_note


@app.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(note_id: int, db: Session = Depends(get_db)):
    existing_note = db.query(NoteBase).filter(NoteBase.id == note_id).first()
    if not existing_note:
        raise HTTPException(status_code=404, detail="Заметка не найдена")

    delete_note(note_id, db)
    db.commit()

    return None


@app.post("/notes/{note_id}/trash", response_model=TrashedNoteResponse)
async def trash_note(note_id: int, db: Session = Depends(get_db)):
    existing_note = db.query(NoteBase).filter(NoteBase.id == note_id).first()
    if not existing_note:
        raise HTTPException(status_code=404, detail="Заметка не найдена")

    trashed = move_to_trash(note_id, db)
    db.commit()
    db.refresh(trashed)
    return trashed


@app.get("/trash/", response_model=list[TrashedNoteResponse])
async def get_all_trash(db: Session = Depends(get_db)):
    return get_all_trashed(db)


@app.post("/trash/{trash_id}/restore", response_model=NoteResponse)
async def restore_note(trash_id: int, db: Session = Depends(get_db)):
    trashed = db.query(TrashedNote).filter(TrashedNote.id == trash_id).first()
    if not trashed:
        raise HTTPException(status_code=404, detail="Заметка не найдена в корзине")

    restored = restore_from_trash(trash_id, db)
    db.commit()
    db.refresh(restored)
    return restored


@app.delete("/trash/{trash_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trash(trash_id: int, db: Session = Depends(get_db)):
    trashed = db.query(TrashedNote).filter(TrashedNote.id == trash_id).first()
    if not trashed:
        raise HTTPException(status_code=404, detail="Заметка не найдена в корзине")

    delete_from_trash(trash_id, db)
    db.commit()
    return None
