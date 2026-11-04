# Companion jobs: festival/birthday/holiday + multi-topic dispatch

These run alongside the price reports but are a distinct class. Built and verified 2026-08.

## Lunar calendar: `lunar_python` in a separate venv
The Hermes venv has no `pip` and system python is PEP-668 locked, so:

```bash
python3 -m venv ~/.hermes/scripts/venv_news
~/.hermes/scripts/venv_news/bin/python -m pip install lunar_python
```

Usage:
```python
from lunar_python import Lunar, Solar
l = Lunar.fromSolar(Solar.fromYmd(y, m, d))
lm, ld = l.getMonth(), l.getDay()   # lunar month/day
# Fixed lunar events
LUNAR_EVENTS = {
  (1,1):"Tết Nguyên Đán", (1,2):"Mùng 2 Tết", (1,3):"Mùng 3 Tết",
  (3,10):"Giỗ Tổ Hùng Vương", (4,15):"Phật Đản", (7,15):"Vu Lan",
  (8,15):"Tết Trung Thu", (12,23):"Ông Công Ông Táo", (12,30):"Giao thừa",
}
```
Note: `Lunar` has NO `getLeapMonth()` — drop leap-month handling. mùng 1 → "Mùng 1 (Sóc)", ngày 15 → "Rằm".

## Solar holidays
`https://date.nager.at/api/v3/PublicHolidays/{year}/VN` → list of `{date:"YYYY-MM-DD", localName:"..."}`. Compare `date` to today. (vnapp.net = DNS fail, dayspedia = 403, the other nager path works.)

## Birthdays JSON (`~/.hermes/scripts/birthdays.json`)
```json
[
  {"name":"Mèo",   "mm":11,"dd":11},
  {"name":"Bean",  "mm":5, "dd":8},
  {"name":"Test Âm","al_mm":7,"al_dd":14}
]
```
VN order is DAY-first: user says "11/11" → dd=11, mm=11; "8/5" → dd=8, mm=5. Store exactly that. Echo the parsed list back to the user and simulate a known date before trusting.

## Wrapper script (so cron runs the venv python)
`festival_daily.sh`:
```bash
#!/bin/bash
DIR="$(dirname "$0")"
exec "$DIR/venv_news/bin/python" "$DIR/festival_daily.py"
```
Cron prompt: `Thực thi bash /Users/huynguyen/.hermes/scripts/festival_daily.sh ...` (same verbatim-copy wording as price reports).

## Multi-topic dispatch (forum group)
One group `-1003952190147`, several topics. Deliver targets used:
- Holidays/birthdays → `telegram:-1003952190147:44`
- News → `telegram:-1003952190147:22`
- Gold+stocks / hourly stocks / evening → `telegram:-1003952190147:3`

Stagger times so same-thread jobs don't stack: 8h45 (holidays), 8h55 (news), 9h (morning gom), 10–15h (hourly stocks), 17h30 (evening).

## News report (sapo instead of bare headlines)
VnExpress RSS has no `<description>`. Fetch each article page and extract the lead:
`<p class="description[^"]*">(.*?)</p>` or `og:description` meta. 2 items/section, 6 sections (Thời sự/Kinh doanh/Thế giới/Thể thao/Giải trí/Pháp luật) with icons 🏛️💼🌍⚽🎬⚖️. Fallback: Tuoitre RSS if VnExpress fails. Keep timeout ~12s/article; on failure just omit the 📝 line (don't crash).
