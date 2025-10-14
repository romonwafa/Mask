from fastapi.testclient import TestClient

from api.app import app


client = TestClient(app)


def test_list_beard_styles_returns_catalog() -> None:
    response = client.get("/beard/styles")
    assert response.status_code == 200
    payload = response.json()
    assert "styles" in payload
    assert isinstance(payload["styles"], list)
    assert any(style["id"] == "classic_full" for style in payload["styles"])
    classic = next(style for style in payload["styles"] if style["id"] == "classic_full")
    assert classic["texture"] == "/static/textures/full_lumberjack.png"
