"""Тесты для Pydantic моделей валидации."""

import pytest
from datetime import datetime
from pydantic import ValidationError
import sys
sys.path.insert(0, '..')

from main import NoteCreate, NoteUpdate, NoteResponse


class TestNoteCreate:
    """Тесты для модели NoteCreate."""

    def test_valid_note_create(self):
        """Тест создания заметки с валидными данными."""
        note = NoteCreate(
            headline="Тестовый заголовок",
            text="Тестовый текст заметки",
            improtance=2
        )
        assert note.headline == "Тестовый заголовок"
        assert note.text == "Тестовый текст заметки"
        assert note.improtance == 2

    def test_note_create_default_importance(self):
        """Тест значения важности по умолчанию."""
        note = NoteCreate(headline="Заголовок")
        assert note.improtance == 1

    def test_note_create_optional_text(self):
        """Тест создания заметки без текста."""
        note = NoteCreate(headline="Только заголовок")
        assert note.headline == "Только заголовок"
        assert note.text is None

    def test_note_create_empty_headline_fails(self):
        """Тест: пустой заголовок должен вызвать ошибку."""
        with pytest.raises(ValidationError):
            NoteCreate(headline="")

    def test_note_create_missing_headline_fails(self):
        """Тест: отсутствие заголовка должно вызвать ошибку."""
        with pytest.raises(ValidationError):
            NoteCreate(text="Текст без заголовка")

    def test_note_create_headline_too_long(self):
        """Тест: заголовок длиннее 45 символов должен вызвать ошибку."""
        with pytest.raises(ValidationError):
            NoteCreate(headline="А" * 46)

    def test_note_create_headline_max_length(self):
        """Тест: заголовок ровно 45 символов должен быть валидным."""
        note = NoteCreate(headline="А" * 45)
        assert len(note.headline) == 45

    def test_note_create_text_too_long(self):
        """Тест: текст длиннее 10000 символов должен вызвать ошибку."""
        with pytest.raises(ValidationError):
            NoteCreate(headline="Заголовок", text="А" * 10001)

    def test_note_create_importance_too_low(self):
        """Тест: важность меньше 1 должна вызвать ошибку."""
        with pytest.raises(ValidationError):
            NoteCreate(headline="Заголовок", improtance=0)

    def test_note_create_importance_too_high(self):
        """Тест: важность больше 3 должна вызвать ошибку."""
        with pytest.raises(ValidationError):
            NoteCreate(headline="Заголовок", improtance=4)

    def test_note_create_importance_boundaries(self):
        """Тест граничных значений важности (1, 2, 3)."""
        for imp in [1, 2, 3]:
            note = NoteCreate(headline="Заголовок", improtance=imp)
            assert note.improtance == imp


class TestNoteUpdate:
    """Тесты для модели NoteUpdate."""

    def test_note_update_all_fields(self):
        """Тест обновления всех полей."""
        update = NoteUpdate(
            headline="Новый заголовок",
            text="Новый текст",
            improtance=3
        )
        assert update.headline == "Новый заголовок"
        assert update.text == "Новый текст"
        assert update.improtance == 3

    def test_note_update_empty(self):
        """Тест пустого обновления (все поля опциональны)."""
        update = NoteUpdate()
        assert update.headline is None
        assert update.text is None
        assert update.improtance is None

    def test_note_update_partial(self):
        """Тест частичного обновления."""
        update = NoteUpdate(headline="Только заголовок")
        assert update.headline == "Только заголовок"
        assert update.text is None

    def test_note_update_headline_too_long(self):
        """Тест: заголовок длиннее 45 символов при обновлении."""
        with pytest.raises(ValidationError):
            NoteUpdate(headline="А" * 46)

    def test_note_update_invalid_importance(self):
        """Тест: невалидная важность при обновлении."""
        with pytest.raises(ValidationError):
            NoteUpdate(improtance=5)


class TestNoteResponse:
    """Тесты для модели NoteResponse."""

    def test_note_response_valid(self):
        """Тест валидного ответа."""
        response = NoteResponse(
            id=1,
            headline="Заголовок",
            text="Текст",
            improtance=2,
            created_date=datetime.now(),
            change_date=None
        )
        assert response.id == 1
        assert response.headline == "Заголовок"
        assert response.improtance == 2

    def test_note_response_with_change_date(self):
        """Тест ответа с датой изменения."""
        created = datetime(2026, 1, 1, 10, 0, 0)
        changed = datetime(2026, 1, 2, 15, 30, 0)
        response = NoteResponse(
            id=1,
            headline="Заголовок",
            text="Текст",
            improtance=1,
            created_date=created,
            change_date=changed
        )
        assert response.created_date == created
        assert response.change_date == changed

    def test_note_response_missing_required_fields(self):
        """Тест: отсутствие обязательных полей должно вызвать ошибку."""
        with pytest.raises(ValidationError):
            NoteResponse(headline="Только заголовок")
