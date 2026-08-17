#!/usr/bin/env python3
"""Extract real user turns + assistant activity from Claude Code session transcripts.

Reads the .jsonl transcripts that Claude Code writes per session and emits a
chronological JSON list of user prompts with timestamps, so the prompt-log
appendix can be built from real evidence instead of recollection.
"""
import json
import sys
import glob
import os
import re
from datetime import datetime, timedelta, timezone

SAIGON = timezone(timedelta(hours=7))


def text_of(content):
    """Flatten a message 'content' field (str or list of blocks) to plain text."""
    if isinstance(content, str):
        return content
    if not isinstance(content, list):
        return ""
    parts = []
    for block in content:
        if not isinstance(block, dict):
            continue
        btype = block.get("type")
        if btype == "text":
            parts.append(block.get("text", ""))
        elif btype == "tool_use":
            name = block.get("name", "?")
            inp = block.get("input", {})
            detail = ""
            if isinstance(inp, dict):
                for key in ("file_path", "command", "pattern", "notebook_path", "url"):
                    if key in inp:
                        detail = str(inp[key])[:200]
                        break
            parts.append(f"[TOOL:{name} {detail}]")
        elif btype == "tool_result":
            parts.append("[TOOL_RESULT]")
        elif btype == "thinking":
            parts.append("[THINKING]")
    return "\n".join(p for p in parts if p)


def is_synthetic(txt):
    """True for turns the harness injected rather than the human typing."""
    if not txt.strip():
        return True
    markers = (
        "<system-reminder>",
        "[TOOL_RESULT]",
        "<command-name>",
        "<local-command-stdout>",
        "Caveat: The messages below",
        "This session is being continued from a previous conversation",
        "<user-prompt-submit-hook>",
        "[Request interrupted",
        "API Error",
    )
    stripped = txt.strip()
    return any(m in stripped[:400] for m in markers)


def main(paths):
    rows = []
    for path in paths:
        session = os.path.basename(path).replace(".jsonl", "")
        with open(path, "r", encoding="utf-8", errors="replace") as fh:
            for lineno, line in enumerate(fh, 1):
                line = line.strip()
                if not line:
                    continue
                try:
                    d = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if d.get("type") not in ("user", "assistant"):
                    continue
                msg = d.get("message") or {}
                txt = text_of(msg.get("content"))
                ts = d.get("timestamp")
                when = ""
                if ts:
                    try:
                        when = (
                            datetime.fromisoformat(ts.replace("Z", "+00:00"))
                            .astimezone(SAIGON)
                            .strftime("%Y-%m-%d %H:%M:%S")
                        )
                    except ValueError:
                        when = ts
                rows.append(
                    {
                        "session": session[:8],
                        "line": lineno,
                        "role": d.get("type"),
                        "time": when,
                        "raw_ts": ts or "",
                        "synthetic": is_synthetic(txt) if d.get("type") == "user" else False,
                        "text": txt,
                    }
                )
    rows.sort(key=lambda r: (r["raw_ts"] or "", r["session"], r["line"]))
    out = os.environ.get("OUT", "turns.json")
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(rows, fh, ensure_ascii=False, indent=1)
    real = [r for r in rows if r["role"] == "user" and not r["synthetic"]]
    print(f"rows={len(rows)} real_user_turns={len(real)} -> {out}")


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        base = os.path.expanduser("~/.claude/projects/D--2025-2026-HK9-Test-HW06")
        args = sorted(glob.glob(os.path.join(base, "*.jsonl")))
    main(args)
