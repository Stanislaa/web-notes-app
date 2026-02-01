"""Тесты для API эндпоинтов FastAPI."""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime
import sys
import os

sys.path.insert(0, '..')

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app


@pytest.fixture
def client():
    """Создает тестовый клиент FastAPI."""
    return TestClient(app)


class TestStaticRoutes:
    """Тесты для статических маршрутов."""

    def test_index_route(self, client):
        """Тест главной страницы."""
        response = client.get("/")
        assert response.status_code == 200

    def test_index_explicit_route(self, client):
        """Тест явного маршрута /index."""
        response = client.get("/index")
        assert response.status_code == 200

    def test_style_css_route(self, client):
        """Тест маршрута для CSS."""
        response = client.get("/style.css")
        assert response.status_code == 200

    def test_script_js_route(self, client):
        """Тест маршрута для JavaScript."""
        response = client.get("/script.js")
        assert response.status_code == 200


class TestNotesAPI:
    """Тесты для API заметок."""

    def test_get_all_notes(self, client):
        """Тест получения списка заметок."""
        response = client.get("/notes/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_create_note_valid_data(self, client):
        """Тест создания заметки с валидными данными."""
        note_data = {
            "headline": "Тестовая заметка",
            "text": "Текст тестовой заметки",
            "improtance": 2
        }
        response = client.post("/notes/", json=note_data)
        assert response.status_code == 201
        data = response.json()
        assert data["headline"] == "Тестовая заметка"
        assert data["text"] == "Текст тестовой заметки"
        assert data["improtance"] == 2
        assert "id" in data
        assert "created_date" in data

    def test_create_note_minimal_data(self, client):
        """Тест создания заметки с минимальными данными."""
        note_data = {
            "headline": "Минимальная заметка"
        }
        response = client.post("/notes/", json=note_data)
        assert response.status_code == 201
        data = response.json()
        assert data["headline"] == "Минимальная заметка"
        assert data["improtance"] == 1

    def test_create_note_missing_headline(self, client):
        """Тест: создание без заголовка должно вернуть ошибку валидации."""
        note_data = {
            "text": "Текст без заголовка",
            "improtance": 1
        }
        response = client.post("/notes/", json=note_data)
        assert response.status_code == 422

    def test_create_note_empty_headline(self, client):
        """Тест: пустой заголовок должен вернуть ошибку валидации."""
        note_data = {
            "headline": "",
            "text": "Текст",
            "improtance": 1
        }
        response = client.post("/notes/", json=note_data)
        assert response.status_code == 422

    def test_create_note_headline_too_long(self, client):
        """Тест: слишком длинный заголовок."""
        note_data = {
            "headline": "А" * 46,
            "text": "Текст",
            "improtance": 1
        }
        response = client.post("/notes/", json=note_data)
        assert response.status_code == 422

    def test_create_note_invalid_importance_low(self, client):
        """Тест: важность меньше 1."""
        note_data = {
            "headline": "Заголовок",
            "improtance": 0
        }
        response = client.post("/notes/", json=note_data)
        assert response.status_code == 422

    def test_create_note_invalid_importance_high(self, client):
        """Тест: важность больше 3."""
        note_data = {
            "headline": "Заголовок",
            "improtance": 4
        }
        response = client.post("/notes/", json=note_data)
        assert response.status_code == 422

    def test_create_note_text_too_long(self, client):
        """Тест: слишком длинный текст."""
        note_data = {
            "headline": "Заголовок",
            "text": "А" * 10001,
            "improtance": 1
        }
        response = client.post("/notes/", json=note_data)
        assert response.status_code == 422


class TestNoteCRUD:
    """Тесты полного цикла CRUD для заметок."""

    def test_full_crud_cycle(self, client):
        """Тест полного цикла: создание, чтение, обновление, удаление."""
        note_data = {
            "headline": "CRUD тест",
            "text": "Текст для CRUD теста",
            "improtance": 1
        }
        create_response = client.post("/notes/", json=note_data)
        assert create_response.status_code == 201
        note_id = create_response.json()["id"]

        get_response = client.get(f"/notes/{note_id}")
        assert get_response.status_code == 200
        assert get_response.json()["headline"] == "CRUD тест"

        update_data = {
            "headline": "Обновленный заголовок",
            "improtance": 3
        }
        update_response = client.put(f"/notes/{note_id}", json=update_data)
        assert update_response.status_code == 200
        assert update_response.json()["headline"] == "Обновленный заголовок"
        assert update_response.json()["improtance"] == 3

        delete_response = client.delete(f"/notes/{note_id}")
        assert delete_response.status_code == 204

        get_deleted_response = client.get(f"/notes/{note_id}")
        assert get_deleted_response.status_code == 404

    def test_get_nonexistent_note(self, client):
        """Тест получения несуществующей заметки."""
        response = client.get("/notes/999999")
        assert response.status_code == 404

    def test_update_nonexistent_note(self, client):
        """Тест обновления несуществующей заметки."""
        update_data = {"headline": "Новый заголовок"}
        response = client.put("/notes/999999", json=update_data)
        assert response.status_code == 404

    def test_delete_nonexistent_note(self, client):
        """Тест удаления несуществующей заметки."""
        response = client.delete("/notes/999999")
        assert response.status_code == 404


class TestTrashAPI:
    """Тесты для API корзины."""

    def test_get_trash(self, client):
        """Тест получения содержимого корзины."""
        response = client.get("/trash/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_move_to_trash_and_restore(self, client):
        """Тест перемещения в корзину и восстановления."""
        note_data = {
            "headline": "Заметка для корзины",
            "text": "Текст заметки",
            "improtance": 2
        }
        create_response = client.post("/notes/", json=note_data)
        assert create_response.status_code == 201
        note_id = create_response.json()["id"]

        trash_response = client.post(f"/notes/{note_id}/trash")
        assert trash_response.status_code == 200
        trash_id = trash_response.json()["id"]

        get_note_response = client.get(f"/notes/{note_id}")
        assert get_note_response.status_code == 404

        restore_response = client.post(f"/trash/{trash_id}/restore")
        assert restore_response.status_code == 200
        restored_id = restore_response.json()["id"]

        get_restored_response = client.get(f"/notes/{restored_id}")
        assert get_restored_response.status_code == 200

    def test_permanent_delete_from_trash(self, client):
        """Тест окончательного удаления из корзины."""
        note_data = {
            "headline": "Заметка для удаления",
            "text": "Текст",
            "improtance": 1
        }
        create_response = client.post("/notes/", json=note_data)
        note_id = create_response.json()["id"]

        trash_response = client.post(f"/notes/{note_id}/trash")
        trash_id = trash_response.json()["id"]

        delete_response = client.delete(f"/trash/{trash_id}")
        assert delete_response.status_code == 204

        get_trash_response = client.get(f"/trash/")
        trash_ids = [item["id"] for item in get_trash_response.json()]
        assert trash_id not in trash_ids


class TestErrorHandling:
    """Тесты обработки ошибок."""

    def test_404_page(self, client):
        """Тест страницы 404."""
        response = client.get("/nonexistent-page")
        assert response.status_code == 404

    def test_invalid_json(self, client):
        """Тест: невалидный JSON в запросе."""
        response = client.post(
            "/notes/",
            content="not valid json",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 422

    def test_wrong_content_type(self, client):
        """Тест: неправильный Content-Type."""
        response = client.post(
            "/notes/",
            content="headline=test",
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert response.status_code == 422


class TestValidationErrors:
    """Тесты сообщений об ошибках валидации."""

    def test_validation_error_structure(self, client):
        """Тест структуры ответа при ошибке валидации."""
        note_data = {
            "headline": "",
            "improtance": 10
        }
        response = client.post("/notes/", json=note_data)
        assert response.status_code == 422

        error_detail = response.json()
        assert "detail" in error_detail
        assert isinstance(error_detail["detail"], list)

    def test_multiple_validation_errors(self, client):
        """Тест: несколько ошибок валидации одновременно."""
        note_data = {
            "headline": "",
            "text": "А" * 10001,
            "improtance": 0
        }
        response = client.post("/notes/", json=note_data)
        assert response.status_code == 422

        error_detail = response.json()
        assert len(error_detail["detail"]) >= 2
