from fastapi.testclient import TestClient

from api.app import app


client = TestClient(app)


def test_list_mask_styles_returns_catalog() -> None:
    response = client.get("/mask/styles")
    assert response.status_code == 200
    payload = response.json()
    assert "styles" in payload
    assert isinstance(payload["styles"], list)
    assert any(style["id"] == "midnight_full" for style in payload["styles"])
    midnight = next(style for style in payload["styles"] if style["id"] == "midnight_full")
    assert midnight["texture"] == "/static/textures/midnight_mask_rgba.png"
