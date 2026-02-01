"""Тесты для функций работы с базой данных."""

import pytest
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
sys.path.insert(0, '..')

from models.models import Base, NoteBase
from sql import create_note, change_note, delete_note


@pytest.fixture
def test_engine():
    """Создает тестовый движок базы данных в памяти."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)
    return engine


@pytest.fixture
def test_session(test_engine):
    """Создает тестовую сессию."""
    Session = sessionmaker(bind=test_engine)
    session = Session()
    yield session
    session.close()


class TestCreateNote:
    """Тесты для функции create_note."""

    def test_create_note_success(self, test_session):
        """Тест успешного создания заметки."""
        note = NoteBase(
            headline="Тестовая заметка",
            text="Текст тестовой заметки",
            improtance=1,
            created_date=datetime.now()
        )
        result = create_note(note, test_session)

        assert result.id is not None
        assert result.headline == "Тестовая заметка"
        assert result.text == "Текст тестовой заметки"
        assert result.improtance == 1

    def test_create_note_without_text(self, test_session):
        """Тест создания заметки без текста."""
        note = NoteBase(
            headline="Без текста",
            improtance=2,
            created_date=datetime.now()
        )
        result = create_note(note, test_session)

        assert result.id is not None
        assert result.headline == "Без текста"
        assert result.text is None

    def test_create_multiple_notes(self, test_session):
        """Тест создания нескольких заметок."""
        notes = []
        for i in range(3):
            note = NoteBase(
                headline=f"Заметка {i+1}",
                text=f"Текст заметки {i+1}",
                improtance=(i % 3) + 1,
                created_date=datetime.now()
            )
            notes.append(create_note(note, test_session))

        assert len(notes) == 3
        assert all(n.id is not None for n in notes)
        assert notes[0].id != notes[1].id != notes[2].id

    def test_create_note_with_all_importance_levels(self, test_session):
        """Тест создания заметок с разными уровнями важности."""
        for imp in [1, 2, 3]:
            note = NoteBase(
                headline=f"Важность {imp}",
                improtance=imp,
                created_date=datetime.now()
            )
            result = create_note(note, test_session)
            assert result.improtance == imp


class TestChangeNote:
    """Тесты для функции change_note."""

    def test_change_note_headline(self, test_session):
        """Тест изменения заголовка заметки."""
        note = NoteBase(
            headline="Старый заголовок",
            text="Текст",
            improtance=1,
            created_date=datetime.now()
        )
        created = create_note(note, test_session)

        new_data = {"new_headline": "Новый заголовок"}
        change_note(created.id, test_session, new_data)
        test_session.commit()

        updated = test_session.get(NoteBase, created.id)
        assert updated.headline == "Новый заголовок"

    def test_change_note_text(self, test_session):
        """Тест изменения текста заметки."""
        note = NoteBase(
            headline="Заголовок",
            text="Старый текст",
            improtance=1,
            created_date=datetime.now()
        )
        created = create_note(note, test_session)

        new_data = {"text": "Новый текст заметки"}
        change_note(created.id, test_session, new_data)
        test_session.commit()

        updated = test_session.get(NoteBase, created.id)
        assert updated.text == "Новый текст заметки"

    def test_change_note_sets_change_date(self, test_session):
        """Тест: при изменении устанавливается дата изменения."""
        note = NoteBase(
            headline="Заголовок",
            improtance=1,
            created_date=datetime.now()
        )
        created = create_note(note, test_session)
        assert created.change_date is None

        change_note(created.id, test_session, {"new_headline": "Новый"})
        test_session.commit()

        updated = test_session.get(NoteBase, created.id)
        assert updated.change_date is not None

    def test_change_nonexistent_note(self, test_session, capsys):
        """Тест изменения несуществующей заметки."""
        change_note(999, test_session, {"new_headline": "Тест"})
        captured = capsys.readouterr()
        assert "не существует" in captured.out


class TestDeleteNote:
    """Тесты для функции delete_note."""

    def test_delete_note_success(self, test_session):
        """Тест успешного удаления заметки."""
        note = NoteBase(
            headline="Удаляемая заметка",
            improtance=1,
            created_date=datetime.now()
        )
        created = create_note(note, test_session)
        note_id = created.id

        delete_note(note_id, test_session)
        test_session.commit()

        deleted = test_session.get(NoteBase, note_id)
        assert deleted is None

    def test_delete_nonexistent_note(self, test_session, capsys):
        """Тест удаления несуществующей заметки."""
        delete_note(999, test_session)
        captured = capsys.readouterr()
        assert "не найдена" in captured.out

    def test_delete_does_not_affect_other_notes(self, test_session):
        """Тест: удаление одной заметки не влияет на другие."""
        note1 = NoteBase(
            headline="Заметка 1",
            improtance=1,
            created_date=datetime.now()
        )
        note2 = NoteBase(
            headline="Заметка 2",
            improtance=2,
            created_date=datetime.now()
        )
        created1 = create_note(note1, test_session)
        created2 = create_note(note2, test_session)

        delete_note(created1.id, test_session)
        test_session.commit()

        remaining = test_session.get(NoteBase, created2.id)
        assert remaining is not None
        assert remaining.headline == "Заметка 2"


class TestNoteModel:
    """Тесты для модели NoteBase."""

    def test_note_model_fields(self, test_session):
        """Тест всех полей модели."""
        created_date = datetime(2026, 1, 15, 10, 30, 0)
        change_date = datetime(2026, 1, 16, 14, 0, 0)

        note = NoteBase(
            headline="Полная заметка",
            text="Полный текст заметки",
            improtance=3,
            created_date=created_date,
            change_date=change_date
        )
        created = create_note(note, test_session)

        assert created.headline == "Полная заметка"
        assert created.text == "Полный текст заметки"
        assert created.improtance == 3
        assert created.created_date == created_date
        assert created.change_date == change_date

    def test_note_auto_increment_id(self, test_session):
        """Тест автоинкремента ID."""
        ids = []
        for i in range(5):
            note = NoteBase(
                headline=f"Заметка {i}",
                improtance=1,
                created_date=datetime.now()
            )
            created = create_note(note, test_session)
            ids.append(created.id)

        # ID должны быть последовательными
        for i in range(len(ids) - 1):
            assert ids[i+1] > ids[i]
