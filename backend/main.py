from fastapi import FastAPI, Request, Depends, HTTPException, status
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.orm import Session

from sql import Session as SessionLocal, create_note, change_note, delete_note
from models.models import NoteBase

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


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

app = FastAPI(title="Notes API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Dependency для получения сессии
def get_db():
    with SessionLocal() as db:
        yield db

@app.exception_handler(404)
async def custom_404_handler(request: Request, exc: StarletteHTTPException):
    return FileResponse("../frontend/404.html")

@app.get("/")
@app.get("/index")
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


# CREATE
@app.post("/notes/", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def create(note: NoteCreate, db: Session = Depends(get_db)):
    db_note = NoteBase(
        headline=note.headline,
        text=note.text,
        improtance=note.improtance,
        created_date=datetime.now()
    )
    
    created_note = create_note(db_note, session=db)
    return created_note

# UPDATE
@app.put("/notes/{note_id}", response_model=NoteResponse)
async def update(note_id: int, note_update: NoteUpdate, db: Session = Depends(get_db)):
    existing_note = db.query(NoteBase).filter(NoteBase.id == note_id).first()
    if not existing_note:
        raise HTTPException(status_code=404, detail="Заметка не найдена")
    
    new_data = {"change_date": datetime.now()}
    
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

# DELETE
@app.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(note_id: int, db: Session = Depends(get_db)):
    existing_note = db.query(NoteBase).filter(NoteBase.id == note_id).first()
    if not existing_note:
        raise HTTPException(status_code=404, detail="Заметка не найдена")
    
    delete_note(note_id, db)
    db.commit()
    
    return None

# GET ALL
@app.get("/notes/", response_model=list[NoteResponse])
async def get_all(db: Session = Depends(get_db)):
    notes = db.query(NoteBase).all()
    return notes

# GET ONE
@app.get("/notes/{note_id}", response_model=NoteResponse)
async def get_one(note_id: int, db: Session = Depends(get_db)):
    note = db.query(NoteBase).filter(NoteBase.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Заметка не найдена")
    return note