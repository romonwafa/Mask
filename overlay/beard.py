from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


ASSETS_ROOT = Path(__file__).resolve().parent / "assets"
DEFAULT_STYLE_MANIFEST = ASSETS_ROOT / "beard_styles.json"


@dataclass(frozen=True)
class BeardStyle:
    """Configuration metadata for a beard template."""

    id: str
    name: str
    description: str
    color: str
    opacity: float
    chin_extension_ratio: float
    mouth_clearance_ratio: float
    jaw_width_scale: float
    upper_trim_ratio: float

    def to_public_dict(self) -> dict[str, str | float]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "color": self.color,
            "opacity": self.opacity,
            "chin_extension_ratio": self.chin_extension_ratio,
            "mouth_clearance_ratio": self.mouth_clearance_ratio,
            "jaw_width_scale": self.jaw_width_scale,
            "upper_trim_ratio": self.upper_trim_ratio,
        }


def _coerce_color(value: str | Iterable[int]) -> str:
    if isinstance(value, str):
        hex_value = value.lstrip("#")
        if len(hex_value) != 6:
            raise ValueError(f"Color '{value}' is not a 6-digit hex string.")
        return f"#{hex_value.lower()}"
    r, g, b = value  # type: ignore[misc]
    return f"#{r:02x}{g:02x}{b:02x}"


def load_beard_styles(manifest_path: Path | None = None) -> dict[str, BeardStyle]:
    target = manifest_path or DEFAULT_STYLE_MANIFEST
    raw_styles = json.loads(target.read_text("utf-8"))
    styles: dict[str, BeardStyle] = {}
    for entry in raw_styles:
        style = BeardStyle(
            id=entry["id"],
            name=entry["name"],
            description=entry.get("description", ""),
            color=_coerce_color(entry["color"]),
            opacity=float(entry["opacity"]),
            chin_extension_ratio=float(entry["chin_extension_ratio"]),
            mouth_clearance_ratio=float(entry["mouth_clearance_ratio"]),
            jaw_width_scale=float(entry["jaw_width_scale"]),
            upper_trim_ratio=float(entry["upper_trim_ratio"]),
        )
        styles[style.id] = style
    return styles


def list_public_styles(manifest_path: Path | None = None) -> list[dict[str, float | str]]:
    styles = load_beard_styles(manifest_path)
    return [style.to_public_dict() for style in styles.values()]


__all__ = ["BeardStyle", "load_beard_styles", "list_public_styles"]
