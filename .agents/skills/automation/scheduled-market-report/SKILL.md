---
name: scheduled-market-report
description: Recurring Telegram market reports via cron (gold/stocks).
version: 2
author: hermes-curator
license: MIT
metadata:
  hermes:
    tags: [cron, telegram, vietnam, gold, stocks, automation, reports]
    related_skills: [hermes-agent]
---

# Scheduled Market / Financial Reports

## When to Use
- User asks for recurring / daily / hourly price or market reports delivered to Telegram.
- Vietnam context: giá vàng (PNJ/SJC nhẫn trơn), chứng khoán (cổ phiếu), gom báo cáo sáng/tối.
- Building a `cronjob` whose output is a formatted digest rather than a one-off answer.

Build a standalone fetch+format script, then wrap it in a `cronjob` that pastes the script's raw stdout to Telegram. Keep ALL parsing/formatting in the script — the cron prompt only says "run script X, paste its stdout".

## Workflow
1. **Verify the data source FIRST** — curl/python the API or page and confirm you can parse the exact fields. Never build the report on an assumed layout.
2. **Write a standalone script** in `~/.hermes/scripts/` that fetches + formats. Return plain-text, one item per line.
3. **Create the cron job** (`cronjob create`), `deliver` = target chat. Prompt = "run `python3 <script>` and paste its raw stdout verbatim; do NOT restructure/reformat/sort/table-ize."
4. **Test before relying** — `cronjob run <id>` and confirm the Telegram message is correct (format, not truncated, numbers right).

## VN Market Calendar (CRITICAL for stock reports)
VN stock market closes on weekends, public holidays, and Lunar New Year. Stock price APIs return stale data on closed days — do NOT report stale prices as current.

**Module:** `~/.hermes/scripts/market_calendar.py` provides `is_market_closed(date=None) → (bool, str)`.
- Returns `(True, reason)` on closed days: "Thứ 7/Chủ Nhật", "Ngày lễ: {name}", "Tết Âm lịch".
- Returns `(False, "")` on open days.
- Logic: hardcode solar holidays (1/1, 30/4, 1/5, 2/9, 3/9) + `lunar_python` for Tết (Lunar Dec 30–Jan 5).
- `date.nager.at` API endpoint `/PublicHolidays/VN/{year}` intermittently returns 400 — use as secondary fallback, not primary.

**Usage in scripts:**
```python
from market_calendar import is_market_closed
closed, reason = is_market_closed()
if closed:
    # Skip stock section; report gold only (gold is always tradeable)
```

**Wrapper shell pattern (for cron silent-skip):**
For scripts that should produce ZERO output on closed days (so Hermes cron sends nothing), wrap in a shell script:
```bash
#!/bin/bash
DIR="$(dirname "$0")"
CLOSED=$(/path/to/venv_news/bin/python -c "from market_calendar import is_market_closed; c,r=is_market_closed(); print('CLOSED:'+r) if c else print('OPEN')")
if [[ "$CLOSED" == CLOSED:* ]]; then exit 0; fi
python3 "$DIR/actual_script.py" "$@"
```
Then point cron at the wrapper (`bash wrapper.sh`) instead of the Python script.

**Conditional reporting pattern (gold-only on closed days):**
For combined gold+stock reports (morning/evening), always fetch gold, then only fetch/report stock if `is_market_closed()` returns False:
```python
closed, reason = is_market_closed(now)
if closed:
    lines.append(f"📈 CHỨNG KHOÁN: ⏸️ Thị trường nghỉ ({reason})")
else:
    # normal stock fetch + format
```

## Cron delivery targeting
- `deliver: "origin"` → chat job was created from.
- `deliver: "telegram:<chat_id>"` → specific chat (supergroup id negative, e.g. `-1003952190147`).
- `deliver: "telegram:<chat_id>:<thread_id>"` → specific TOPIC in a forum group. Omitting thread_id drops into default topic (loses targeting).
- Bot must be a member of the target with send permission, or delivery errors.

## Pitfalls
- **NEVER synthesize "market-wide" context when the real source is blocked.** If index/aggregate APIs are 403/404/cloudflare, do NOT compute a pseudo "thị trường chung" from a few tickers and label it market sentiment. Report only what you fetched, or ASK the user. (User rejected an assumed summary built this way.)
- **Cron sessions auto-restructure output** into markdown tables, breaking Telegram display. Instruct the prompt to copy stdout verbatim, no restructuring.
- **Vietnam gold per-chỉ unit bug.** giavang.org quotes in *millions* VND/luong. Per-chỉ = value × 100,000 (×1e6 ÷10). The common mistake ×100 under-reports by 1000×. Verify vs ~14.4M đ/chỉ for nhẫn trơn.
- Verify `nmVolume`/`nmValue` semantics before using in a "liquidity" summary.
- **`datetime.date.today()` is immutable.** Cannot monkeypatch it for testing. Instead patch the module-level function reference (e.g. `market_calendar.is_market_closed = lambda d=None: (True, "test")`) or run the script directly on a weekend/weekday and observe output.

## References
- `references/vietnam-data-sources.md` — working VNDirect & giavang.org endpoints, regexes, fallbacks, and how to retrieve chat_id / thread_id.