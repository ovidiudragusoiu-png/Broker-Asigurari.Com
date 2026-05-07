from __future__ import annotations

import json
import os
from copy import deepcopy
from pathlib import Path
from typing import Any


DEFAULT_CONFIG: dict[str, Any] = {
    "base_currency": "USD",
    "portfolio_path": "portfolio.json",
    "reports_dir": "reports",
    "logs_dir": "logs",
    "timezone": "America/New_York",
    "report_times_et": ["10:00", "14:30"],
    "market_data": {
        "provider": "yahoo",
        "timeout_seconds": 12,
        "use_snapshot_prices_when_live_unavailable": False,
        "symbols": {},
        "market_context_symbols": {
            "S&P 500": "^GSPC",
            "Nasdaq 100": "^NDX",
            "Russell 2000": "^RUT",
            "VIX": "^VIX",
            "10Y Treasury yield": "^TNX",
            "USD Index": "DX-Y.NYB",
        },
    },
    "news": {
        "max_company_headlines": 5,
        "max_macro_headlines": 8,
        "company_lookback_days": 7,
        "macro_queries": [],
        "sector_queries": {},
    },
    "risk_rules": {
        "high_concentration_weight": 0.35,
        "extreme_concentration_weight": 0.50,
        "normal_max_position": 0.25,
        "exceptional_max_position": 0.35,
        "speculative_max_position": 0.03,
        "distressed_max_position": 0.02,
        "gradual_trim_fraction": 0.05,
    },
    "position_targets": {},
    "buy_candidates": [],
    "notifications": {
        "email_enabled": True,
        "telegram_enabled": False,
        "slack_enabled": False,
    },
}


class ConfigError(RuntimeError):
    pass


def load_config(path: str | Path = "config.yaml") -> dict[str, Any]:
    config_path = Path(path)
    raw = _read_config_file(config_path)
    config = _deep_merge(deepcopy(DEFAULT_CONFIG), raw)
    config["_path"] = str(config_path)
    return config


def validate_environment(config: dict[str, Any]) -> list[str]:
    missing: list[str] = []
    required = ["MARKET_DATA_API_KEY", "NEWS_API_KEY"]
    if config["notifications"].get("email_enabled", True):
        required.extend(
            [
                "EMAIL_FROM",
                "EMAIL_TO",
                "SMTP_HOST",
                "SMTP_PORT",
                "SMTP_USER",
                "SMTP_PASSWORD",
            ]
        )
    if config["notifications"].get("telegram_enabled"):
        required.extend(["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"])

    for name in required:
        if not os.getenv(name):
            missing.append(name)
    return missing


def _read_config_file(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}

    text = path.read_text(encoding="utf-8")
    if not text.strip():
        return {}

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        try:
            import yaml  # type: ignore[import-not-found]
        except ImportError as exc:
            raise ConfigError(
                f"{path} must be JSON-compatible YAML unless PyYAML is installed."
            ) from exc
        parsed = yaml.safe_load(text)

    if parsed is None:
        return {}
    if not isinstance(parsed, dict):
        raise ConfigError(f"{path} must contain a mapping at the top level.")
    return parsed


def _deep_merge(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(base.get(key), dict):
            base[key] = _deep_merge(base[key], value)
        else:
            base[key] = value
    return base
