#!/usr/bin/env python3
"""
Kids Card — Telegram Remote Control
Allows managing development from Telegram when away from the computer.

Usage: python3 scripts/telegram-remote.py
"""

import os
import subprocess
import sys
import time
import json
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime
from pathlib import Path

# ─── Config ───────────────────────────────────────────────────────────────────

BOT_TOKEN   = "8703200698:AAG57FHVWK3lacnr5fxh_NmgxICOK8QeQTk"
CHAT_ID     = 9820894
PROJECT_DIR = Path(__file__).parent.parent.resolve()
LOG_FILE    = PROJECT_DIR / "scripts" / "remote.log"

POLL_INTERVAL = 2       # seconds between polls
CMD_TIMEOUT   = 120     # max seconds for any shell command
MAX_MSG_LEN   = 4000    # Telegram message limit

# ─── Telegram API ─────────────────────────────────────────────────────────────

API = f"https://api.telegram.org/bot{BOT_TOKEN}"

def tg(method: str, **params) -> dict:
    url = f"{API}/{method}"
    data = urllib.parse.urlencode(params).encode()
    try:
        with urllib.request.urlopen(url, data=data, timeout=10) as r:
            return json.loads(r.read())
    except Exception as e:
        log(f"Telegram API error ({method}): {e}")
        return {"ok": False}

def send(text: str, parse_mode: str = "Markdown") -> None:
    chunks = [text[i:i+MAX_MSG_LEN] for i in range(0, len(text), MAX_MSG_LEN)]
    for chunk in chunks:
        tg("sendMessage", chat_id=CHAT_ID, text=chunk, parse_mode=parse_mode)

def send_code(output: str, title: str = "") -> None:
    if title:
        send(f"*{title}*")
    if not output.strip():
        send("_(empty output)_")
        return
    lines = output.strip().split("\n")
    # truncate very long outputs
    if len(lines) > 80:
        output = "\n".join(lines[:40]) + f"\n\n... [{len(lines)-40} lines truncated] ...\n\n" + "\n".join(lines[-10:])
    send(f"```\n{output}\n```")

# ─── Logging ──────────────────────────────────────────────────────────────────

def log(msg: str) -> None:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    with open(LOG_FILE, "a") as f:
        f.write(line + "\n")

# ─── Shell execution ──────────────────────────────────────────────────────────

def run(cmd: str, timeout: int = CMD_TIMEOUT) -> tuple[int, str]:
    try:
        result = subprocess.run(
            cmd, shell=True, capture_output=True, text=True,
            timeout=timeout, cwd=PROJECT_DIR,
            env={**os.environ, "TERM": "dumb", "FORCE_COLOR": "0"},
        )
        output = (result.stdout + result.stderr).strip()
        return result.returncode, output
    except subprocess.TimeoutExpired:
        return 1, f"⏱ Command timed out after {timeout}s"
    except Exception as e:
        return 1, str(e)

# ─── Commands ─────────────────────────────────────────────────────────────────

COMMANDS = {}

def cmd(name: str, description: str):
    def decorator(fn):
        COMMANDS[name] = {"fn": fn, "desc": description}
        return fn
    return decorator

@cmd("/help", "Show available commands")
def cmd_help(args: str):
    lines = ["*Kids Card Remote Control*", ""]
    for name, meta in sorted(COMMANDS.items()):
        lines.append(f"`{name}` — {meta['desc']}")
    send("\n".join(lines))

@cmd("/status", "Git status + Docker services status")
def cmd_status(args: str):
    _, git = run("git status --short 2>/dev/null || echo 'Not a git repo'")
    _, docker = run("docker compose ps --format 'table {{.Name}}\t{{.Status}}'")
    msg = f"*Git status:*\n```\n{git or '(clean)'}\n```\n\n*Docker services:*\n```\n{docker}\n```"
    send(msg)

@cmd("/up", "Start Docker infrastructure (PostgreSQL, Redis, Kafka)")
def cmd_up(args: str):
    send("⏳ Starting infrastructure...")
    code, out = run("docker compose up -d", timeout=60)
    icon = "✅" if code == 0 else "❌"
    send_code(out, f"{icon} docker compose up")

@cmd("/down", "Stop Docker infrastructure")
def cmd_down(args: str):
    code, out = run("docker compose down")
    icon = "✅" if code == 0 else "❌"
    send_code(out, f"{icon} docker compose down")

@cmd("/build", "Build all services (no tests)")
def cmd_build(args: str):
    send("⏳ Building... (may take a minute)")
    code, out = run("./gradlew build -x test --parallel 2>&1 | tail -30", timeout=300)
    icon = "✅" if code == 0 else "❌"
    send_code(out, f"{icon} Build")

@cmd("/test", "Run all tests")
def cmd_test(args: str):
    service = args.strip()
    if service:
        send(f"⏳ Testing `{service}`...")
        code, out = run(f"./gradlew :services:{service}:test 2>&1 | tail -40", timeout=300)
    else:
        send("⏳ Running all tests...")
        code, out = run("./gradlew test 2>&1 | tail -40", timeout=600)
    icon = "✅" if code == 0 else "❌"
    send_code(out, f"{icon} Tests")

@cmd("/logs", "Show Docker logs for a service (e.g. /logs postgres)")
def cmd_logs(args: str):
    service = args.strip() or ""
    cmd_str = f"docker compose logs --tail=50 {service}" if service else "docker compose logs --tail=30"
    _, out = run(cmd_str)
    send_code(out, f"Logs: {service or 'all'}")

@cmd("/ps", "Show running Docker containers")
def cmd_ps(args: str):
    _, out = run("docker compose ps")
    send_code(out, "Docker containers")

@cmd("/migrate", "Run DB migrations")
def cmd_migrate(args: str):
    send("⏳ Running Flyway migrations...")
    code, out = run("./gradlew flywayMigrate 2>&1 | tail -20", timeout=120)
    icon = "✅" if code == 0 else "❌"
    send_code(out, f"{icon} Migrations")

@cmd("/git", "Git command (e.g. /git log --oneline -10)")
def cmd_git(args: str):
    if not args.strip():
        args = "log --oneline -10"
    _, out = run(f"git {args}")
    send_code(out, f"git {args}")

@cmd("/sh", "Run arbitrary shell command in project dir")
def cmd_sh(args: str):
    if not args.strip():
        send("Usage: `/sh <command>`")
        return
    send(f"⏳ Running: `{args}`")
    code, out = run(args)
    icon = "✅" if code == 0 else "❌"
    send_code(out, f"{icon} Exit code: {code}")

@cmd("/files", "Show project file tree (2 levels)")
def cmd_files(args: str):
    _, out = run("find . -not -path '*/.*' -not -path '*/build/*' -not -path '*/node_modules/*' | head -60 | sort")
    send_code(out, "Project files")

# ─── Message handler ──────────────────────────────────────────────────────────

def handle(message: dict) -> None:
    chat_id = message.get("chat", {}).get("id")
    if chat_id != CHAT_ID:
        log(f"Ignored message from unauthorized chat_id={chat_id}")
        return

    text = message.get("text", "").strip()
    if not text:
        return

    log(f"Received: {text!r}")

    # parse command and args
    parts = text.split(None, 1)
    command = parts[0].lower()
    args = parts[1] if len(parts) > 1 else ""

    if command in COMMANDS:
        try:
            COMMANDS[command]["fn"](args)
        except Exception as e:
            send(f"❌ Error: `{e}`")
            log(f"Handler error: {e}")
    else:
        send(f"Unknown command: `{command}`\nType /help for available commands.")

# ─── Main poll loop ───────────────────────────────────────────────────────────

def main() -> None:
    log(f"Kids Card Remote Control started. Project: {PROJECT_DIR}")
    send(
        "🚀 *Remote Control Online*\n\n"
        f"Project: `{PROJECT_DIR.name}`\n"
        "Type /help to see available commands."
    )

    offset = 0
    while True:
        try:
            resp = tg("getUpdates", offset=offset, timeout=30, allowed_updates="message")
            if resp.get("ok"):
                for update in resp.get("result", []):
                    offset = update["update_id"] + 1
                    if "message" in update:
                        handle(update["message"])
        except KeyboardInterrupt:
            send("👋 Remote Control stopped.")
            log("Stopped by user.")
            break
        except Exception as e:
            log(f"Poll error: {e}")
            time.sleep(5)

        time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    main()
