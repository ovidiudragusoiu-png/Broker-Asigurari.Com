from __future__ import annotations

import json
from pathlib import Path

from .models import PortfolioPosition


def load_portfolio(path: str | Path) -> list[PortfolioPosition]:
    portfolio_path = Path(path)
    raw = json.loads(portfolio_path.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        raise ValueError(f"{portfolio_path} must contain a list of positions.")
    return [PortfolioPosition.from_dict(item) for item in raw]
