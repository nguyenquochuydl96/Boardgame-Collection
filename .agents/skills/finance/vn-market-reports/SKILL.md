---
name: vn-market-reports
description: Build VN gold/stock price reports to Telegram via cron.
---

# VN Market Reports (automated, Telegram-delivered)

Class of task: set up **scheduled** reports of Vietnamese gold/stock prices that post to Telegram on a cron, with comparisons vs previous day / morning, and a clean emoji-marked format.

## Workflow
1. Scrape the data (see references/vn-data-sources.md for working endpoints).
2. Write a **standalone script** under `~/.hermes/scripts/` that prints the report to stdout. Keep scraping + formatting in the script, not in the cron prompt.
3. Create the cron job with `cronjob(action='create')`, `deliver` set per below, and a prompt using this EXACT wording (verified to stop the cron agent from re-tabling output):
   *"Thực thi `<script>` rồi copy Y NGUYÊN XUẤT ra (stdout) làm nội dung tin nhắn cuối, KHÔNG tái cấu trúc/thay đổi thứ tự/sáng tạo bảng. Mỗi dòng bắt đầu bằng '●' giữ nguyên. Nếu script báo lỗi (exit khác 0), báo ngắn gọn lỗi. Tuyệt đối không gom thành bảng markdown."*
   The phrase "Tuyệt đối không gom thành bảng markdown" was the addition that finally fixed the one-row-collapse bug. Without it the agent still reorganized stdout into a markdown table and Telegram showed only the first row.
4. **Do NOT test-run unless the user explicitly asks** (`gửi test` / `test thử` / `chạy thử`). Verify locally with `python3 <script>.py` instead. Auto-firing `cronjob run` after create/edit spams the user's Telegram — a confirmed frustration. Report what you did, then STOP.

## Telegram delivery (`deliver` field)
- Whole chat: `telegram:<chat_id>` (e.g. `telegram:-5486887838`)
- Specific **forum topic**: `telegram:<chat_id>:<thread_id>` (e.g. `telegram:-1003952190147:14`)
- Group chat_id vs thread_id: a supergroup chat_id in API calls is `-100` + the short id shown in the `t.me/c/<shortid>/<thread_id>` link. So `https://t.me/c/3952190147/22` → chat_id `-1003952190147`, thread_id `22`, deliver `telegram:-1003952190147:22`.
- Getting a topic's `thread_id`:
  - Public group: open the topic → copy URL → `https://t.me/c/<shortid>/<thread_id>`; or Telegram Web URL `.../#-100..._<thread_id>`.
  - **Private group**: the Web URL shows ONLY `#-<shortid>` (no thread_id). WORKING method used in-session: **Copy Link** on the topic (right-click the topic name in the left sub-sidebar) → the resulting private link STILL embeds the thread_id, e.g. `https://t.me/c/3952190147/3`. Use that number. Bots like @userinfobot / @getidsbot often fail to report thread_id inside a forum topic (they only echo the group chat_id) — Copy Link is the reliable path.
  - Telegram Desktop debug console (`Ctrl+Shift+I` → enable peer-id debug) is a fallback.
  - ⚠️ `getUpdates` via the bot token returns **HTTP 409 Conflict** while Hermes long-polls — you CANNOT capture thread_id that way. Don't waste time on it.
- Verify a topic target with a test run (`cronjob(action='run')`) before trusting it. A wrong/absent thread_id either drops silently or lands in the wrong topic.

## Output format (verified on Telegram)
- One line per ticker: `● SHS: TC 14.7 | Trần 16.1 | Sàn 13.3 | Đóng 15.9 🟢 *+8.16%*`
- Use emoji + bold for change: `🟢` up / `🔴` down / `⚪` flat, with `*value*` bold (Telegram renders `*...*` as bold; no true color, emoji carries the signal).
- Do NOT put markdown tables in the script — the cron agent re-tables them and the user sees only the first row. The "copy stdout verbatim" prompt mitigates this.
- Keep it concise: user wants just the prices (mua/bán per chi) and the day-over-day delta, no extra prose.

## CRITICAL PITFALL — never fabricate when a source is blocked
If a data source is unavailable (API 403/500/cloudflare), **do NOT silently derive a stand-in and present it as the real thing.** Concrete case: VN-Index / market indices from VNDirect, CafeF, TradingView, Investing, Vietstock were ALL blocked, so computing "thị trường chung" from the user's watchlist stocks and labeling it a market summary was rejected hard: *"thị trường chung đã bị chặn hết thì không cần tóm tắt, không tự ý assume rồi lên job như vậy nữa"*.
Correct behavior: report the gap plainly ("không lấy được VN-Index") and either ask the user or omit the section. Never build a feature on assumed/fake data.

## Gold parsing gotcha (real bug)
giavang.org quotes in **millions dong per lượng**. Per chỉ (1 lượng = 10 chỉ): `value × 1,000,000 / 10 = value × 100,000`. Using `× 1000 / 10` (i.e. ×100) yields a value 1000× too small (14,400 instead of 14,400,000). Always multiply by 100,000.

## Fallback strategy
Primary source first; only call fallback(s) when primary is missing/incomplete. Always surface a `⚠ Nguồn chính lỗi — dùng nguồn phụ` note so the user knows the data lineage changed.

## Market-closed behavior (standing user rule)
On VN market holidays (Sat/Sun, public holidays, Tết — see `market_calendar.py`): the hourly stock script must exit 0 with EMPTY stdout so nothing is delivered, and morning/evening reports print gold only with the stock section omitted entirely (not even a "thị trường nghỉ" line). Never print a placeholder like `[SILENT]` as message content — the cron agent may forward it verbatim as spam. Prompt wording alone does not enforce silence; the empty-stdout contract in the script does.

## Festival / birthday / holiday daily report (a class of companion job)
Set up like the price reports: standalone script → `cronjob` → topic delivery. Verified approach from this session:
- **Solar VN public holidays:** `https://date.nager.at/api/v3/PublicHolidays/{year}/VN` (returns `date` + `localName`; works, unlike vnapp.net / dayspedia / nager being 403).
- **Lunar calendar (mùng 1, rằm, Tết, Giỗ Tổ 10/3 AL, etc.):** use the `lunar_python` PyPI package (`Lunar.fromSolar(Solar.fromYmd(y,m,d)).getMonth()/getDay()`). The Hermes venv has **no pip**, and system python is PEP-668 locked, so install it into a **dedicated venv**: `python3 -m venv ~/.hermes/scripts/venv_news && venv_news/bin/python -m pip install lunar_python`. Then wrap the report script in a `.sh` that execs `venv_news/bin/python festival_daily.py`.
- **Birthdays:** keep a user-maintained JSON (`birthdays.json`) of `{name, mm, dd}` (solar) or `{name, al_mm, al_dd}` (lunar). DELIVER THE DATE ORDER THE USER STATED — see pitfall below.
- Dispatch multiple companion jobs to distinct forum topics (e.g. holidays→`:44`, news→`:22`, prices→`:3`) so reports don't collide on the same thread.

## CRITICAL PITFALL — VN date order is day-first, verify it
When the user dictates birthdays as `DD/MM`, store `"dd": <day>, "mm": <month>`. This session the assistant stored them inverted (`"mm":<day>, "dd":<month>`) by mistake; the user caught it ("Danh sách mình đưa là ngày trước tháng sau, coi chừng nhầm nhé"). Even though `dd/mm` vs `mm/dd` happened to produce the same calendar date for most entries, ALWAYS echo back the parsed list (name → `DD/MM`) and test by simulating `date(y, m, d)` for a known entry before trusting it.

## CRITICAL PITFALL — Hermes cron silently misses its slot
Hermes cron does NOT fire (and does NOT error) if the gateway/scheduler process is not alive at the scheduled minute, or after a restart it only catch-up-fires once. Observed: jobs with `last_run_at` only ever updated by manual `cronjob(action='run')`, never auto at 9h/10h. Mitigations worth telling the user: keep the Mac awake through the scheduled minutes, or accept that missed slots are silent. (launchd was offered as an alternative but the user chose to keep Hermes cron.)

See `references/vn-data-sources.md` for exact endpoints, regexes, and a known-good script skeleton, and `references/companion-jobs.md` for the festival/birthday + multi-topic setup detail.
