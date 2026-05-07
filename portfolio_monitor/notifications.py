from __future__ import annotations

import os
import smtplib
import ssl
import urllib.parse
import urllib.request
from email.message import EmailMessage
from typing import Any


def send_notifications(subject: str, report_text: str, config: dict[str, Any]) -> list[str]:
    results: list[str] = []
    notification_config = config.get("notifications", {})
    if notification_config.get("email_enabled", True):
        results.append(send_email(subject, report_text))
    if notification_config.get("telegram_enabled"):
        results.append(send_telegram(report_text))
    if notification_config.get("slack_enabled"):
        results.append(send_slack(report_text))
    return results


def send_email(subject: str, body: str) -> str:
    required = ["EMAIL_FROM", "EMAIL_TO", "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD"]
    missing = [name for name in required if not os.getenv(name)]
    if missing:
        return "email skipped: missing " + ", ".join(missing)

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = os.environ["EMAIL_FROM"]
    message["To"] = os.environ["EMAIL_TO"]
    message.set_content(body)

    host = os.environ["SMTP_HOST"]
    port = int(os.environ["SMTP_PORT"])
    username = os.environ["SMTP_USER"]
    password = os.environ["SMTP_PASSWORD"]

    context = ssl.create_default_context()
    if port == 465:
        with smtplib.SMTP_SSL(host, port, context=context, timeout=20) as server:
            server.login(username, password)
            server.send_message(message)
    else:
        with smtplib.SMTP(host, port, timeout=20) as server:
            server.starttls(context=context)
            server.login(username, password)
            server.send_message(message)
    return "email sent"


def send_telegram(report_text: str) -> str:
    required = ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"]
    missing = [name for name in required if not os.getenv(name)]
    if missing:
        return "telegram skipped: missing " + ", ".join(missing)

    token = os.environ["TELEGRAM_BOT_TOKEN"]
    chat_id = os.environ["TELEGRAM_CHAT_ID"]
    chunks = _telegram_chunks(report_text)
    for chunk in chunks:
        payload = urllib.parse.urlencode({"chat_id": chat_id, "text": chunk})
        request = urllib.request.Request(
            f"https://api.telegram.org/bot{token}/sendMessage",
            data=payload.encode("utf-8"),
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        with urllib.request.urlopen(request, timeout=20) as response:
            response.read()
    return f"telegram sent ({len(chunks)} messages)"


def send_slack(report_text: str) -> str:
    webhook = os.getenv("SLACK_WEBHOOK_URL")
    if not webhook:
        return "slack skipped: missing SLACK_WEBHOOK_URL"
    payload = ("{\"text\": " + _json_string(report_text[:35000]) + "}").encode("utf-8")
    request = urllib.request.Request(
        webhook,
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        response.read()
    return "slack sent"


def _telegram_chunks(text: str) -> list[str]:
    max_len = 3900
    return [text[index : index + max_len] for index in range(0, len(text), max_len)]


def _json_string(value: str) -> str:
    escaped = (
        value.replace("\\", "\\\\")
        .replace('"', '\\"')
        .replace("\n", "\\n")
        .replace("\r", "\\r")
        .replace("\t", "\\t")
    )
    return f'"{escaped}"'
