from overlay.beard import list_public_styles, load_beard_styles


def test_load_beard_styles_has_expected_defaults() -> None:
    styles = load_beard_styles()
    assert "classic_full" in styles
    classic = styles["classic_full"]
    assert classic.color == "#5e4530"
    assert 0 < classic.opacity <= 1
    assert classic.texture == "textures/full_lumberjack_rgba.png"


def test_beard_overlay_service_lists_public_styles() -> None:
    published = list_public_styles()
    assert any(style["id"] == "defined_goatee" for style in published)
    classic_entry = next(style for style in published if style["id"] == "classic_full")
    assert classic_entry["texture"] == "/static/textures/full_lumberjack_rgba.png"
