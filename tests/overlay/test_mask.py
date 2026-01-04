from overlay.mask import list_public_styles, load_mask_styles


def test_load_mask_styles_has_expected_defaults() -> None:
    styles = load_mask_styles()
    assert "midnight_full" in styles
    midnight = styles["midnight_full"]
    assert midnight.color == "#2b2f3a"
    assert 0 < midnight.opacity <= 1
    assert midnight.texture == "textures/midnight_mask_rgba.png"


def test_mask_overlay_service_lists_public_styles() -> None:
    published = list_public_styles()
    assert any(style["id"] == "festival_neon" for style in published)
    midnight_entry = next(style for style in published if style["id"] == "midnight_full")
    assert midnight_entry["texture"] == "/static/textures/midnight_mask_rgba.png"
