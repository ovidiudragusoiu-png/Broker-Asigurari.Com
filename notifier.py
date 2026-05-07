"""Email and Telegram delivery with duplicate-send protection."""

from __future__ import annotations

import json
import logging
import os
import smtplib
from dataclasses import dataclass
from datetime import datetime
from email.message import EmailMessage
from pathlib import Path
from typing import Any

import requests

LOGGER = logging.getLogger(__name__)


@dataclass
class DeliveryResult:
    channel: str
    sent: bool
    detail: str


class DeliveryState:
    """Tracks sent report IDs to avoid duplicate emails/Telegram messages."""

    def __init__(self, path: str | Path) -> None:
        self.path = Path(path)
        self.data = self._load()

    def was_sent(self, report_id: str) -> bool:
        return report_id in self.data.get("sent_reports", {})

    def mark_sent(self, report_id: str, channels: list[str]) -> None:
        self.data.setdefault("sent_reports", {})[report_id] = {
            "sent_at": datetime.utcnow().isoformat() + "Z",
            "channels": channels,
        }
        self.path.write_text(json.dumps(self.data, indent=2), encoding="utf-8")

    def _load(self) -> dict[str, Any]:
        if not self.path.exists():
            return {"sent_reports": {}}
        try:
            return json.loads(self.path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            LOGGER.warning("State file is invalid JSON; starting a fresh state.")
            return {"sent_reports": {}}


class Notifier:
    """Sends reports by SMTP email and optional Telegram bot."""

    def __init__(self, config: dict[str, Any]) -> None:
        self.config = config
        reporting = config.get("reporting", {})
        self.state = DeliveryState(reporting.get("state_file", ".portfolio_news_advisor_state.json"))
        self.avoid_duplicates = bool(config.get("schedule", {}).get("avoid_duplicate_reports", True))

    def send(
        self,
        report_id: str,
        subject: str,
        body: str,
        report_path: Path | None = None,
        dry_run: bool = False,
        force: bool = False,
    ) -> list[DeliveryResult]:
        if self.avoid_duplicates and not force and self.state.was_sent(report_id):
            return [DeliveryResult("state", False, f"Skipped duplicate report {report_id}.")]

        if dry_run:
            return [DeliveryResult("dry-run", False, "Dry run enabled; no notifications sent.")]

        results: list[DeliveryResult] = []
        email_config = self.config.get("notifications", {}).get("email", {})
        telegram_config = self.config.get("notifications", {}).get("telegram", {})

        if _env_bool(email_config.get("enabled", False)):
            results.append(self._send_email(subject, body, report_path, email_config))
        if _env_bool(telegram_config.get("enabled", False)):
            results.append(self._send_telegram(subject, body, telegram_config))

        sent_channels = [result.channel for result in results if result.sent]
        if sent_channels:
            self.state.mark_sent(report_id, sent_channels)
        elif not results:
            results.append(DeliveryResult("none", False, "No notification channels enabled."))
        return results

    def _send_email(
        self,
        subject: str,
        body: str,
        report_path: Path | None,
        email_config: dict[str, Any],
    ) -> DeliveryResult:
        host = _resolve(email_config.get("smtp_host"))
        port = int(_resolve(email_config.get("smtp_port")) or 587)
        username = _resolve(email_config.get("smtp_username"))
        password = _resolve(email_config.get("smtp_password"))
        sender = _resolve(email_config.get("sender")) or username
        recipients = [
            recipient
            for recipient in (_resolve(value) for value in email_config.get("recipients", []))
            if recipient
        ]
        if not host or not sender or not recipients:
            return DeliveryResult("email", False, "Email configuration incomplete.")

        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = sender
        message["To"] = ", ".join(recipients)
        message.set_content(body)
        if report_path and report_path.exists():
            message.add_attachment(
                report_path.read_bytes(),
                maintype="text",
                subtype="markdown",
                filename=report_path.name,
            )

        try:
            with smtplib.SMTP(host, port, timeout=30) as smtp:
                if _env_bool(email_config.get("use_tls", True)):
                    smtp.starttls()
                if username and password:
                    smtp.login(username, password)
                smtp.send_message(message)
            return DeliveryResult("email", True, f"Sent email to {', '.join(recipients)}.")
        except Exception as exc:  # pragma: no cover - provider dependent
            LOGGER.exception("Email delivery failed")
            return DeliveryResult("email", False, f"Email delivery failed: {exc}")

    def _send_telegram(
        self, subject: str, body: str, telegram_config: dict[str, Any]
    ) -> DeliveryResult:
        token = _resolve(telegram_config.get("bot_token"))
        chat_id = _resolve(telegram_config.get("chat_id"))
        if not token or not chat_id:
            return DeliveryResult("telegram", False, "Telegram configuration incomplete.")

        text = f"*{_telegram_escape(subject)}*\n\n{_telegram_escape(_truncate(body, 3500))}"
        try:
            response = requests.post(
                f"https://api.telegram.org/bot{token}/sendMessage",
                json={
                    "chat_id": chat_id,
                    "text": text,
                    "parse_mode": "MarkdownV2",
                    "disable_web_page_preview": True,
                },
                timeout=20,
            )
            response.raise_for_status()
            return DeliveryResult("telegram", True, "Sent Telegram notification.")
        except Exception as exc:  # pragma: no cover - provider dependent
            LOGGER.exception("Telegram delivery failed")
            return DeliveryResult("telegram", False, f"Telegram delivery failed: {exc}")


def _resolve(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value)
    if text.startswith("${") and text.endswith("}"):
        return os.getenv(text[2:-1])
    return text


def _env_bool(value: Any) -> bool:
    resolved = _resolve(value)
    if isinstance(resolved, bool):
        return resolved
    if resolved is None:
        return False
    return str(resolved).strip().lower() in {"1", "true", "yes", "on"}


def _truncate(value: str, limit: int) -> str:
    if len(value) <= limit:
        return value
    return value[: limit - 20].rstrip() + "\n\n[truncated]"


def _telegram_escape(value: str) -> str:
    escape_chars = r"_*[]()~`>#+-=|{}.!"
    return "".join(f"\\{char}" if char in escape_chars else char for char in value)
