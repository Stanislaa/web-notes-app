from fastapi import FastAPI, Request, Depends
from fastapi.responses import FileResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.orm import Session

from sql import *

app = FastAPI()

# Dependency для получения сессии
def get_db():
    db = Session()
    try:
        yield db
    finally:
        db.close()

@app.exception_handler(404)
async def custom_404_handler(request: Request, exc: StarletteHTTPException):
    return FileResponse("../frontend/404.html")


note2 = NoteBase(
        created_date=datetime.now(),
        # change_date=datetime(2026, 1, 30, 15, 51, 55),
        headline="Заметка1",
        text="Текст заметки номер 1. Бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла бла",
        improtance=1
)

# подключение к базе данных
# async def index(db: Session = Depends(get_db)): # type: ignore
#     return FileResponse("../frontend/index.html")

@app.get("/")
@app.get("/index")
async def index():
    return FileResponse("../frontend/index.html")

@app.get("/style.css")
def styles():
    return FileResponse("../frontend/style.css")

@app.get("/script.js")
def js():
    return FileResponse("../frontend/script.js")