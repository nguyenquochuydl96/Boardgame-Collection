---
name: telegram-news-cron
description: Build Telegram news/content report crons with translation.
version: 2
author: hermes-agent
license: MIT
metadata:
  hermes:
    tags: [telegram, cron, rss, news, automation, translation, vietnamese]
    related_skills: [vn-market-reports, scheduled-market-report, blogwatcher]
---

# Telegram News / Content Cron Builder

## When to Use
Use when a user wants **recurring automated reports delivered to Telegram** — news digests,
sports split by sport, board games, video games, festival/birthday reminders, or any
multi-source digest pushed on a schedule. Trigger phrases: "tạo cron báo...", "job tin tức",
"báo mỗi ngày/sáng/tuần về...", "gửi vào topic...". For VN gold/stock *price* reports use
`vn-market-reports` instead.

## Hard rules from this user (embedded — do not skip)
1. **RESEARCH SOURCES BEFORE RUNNING.** Never assume a source exists or is reliable. Test each RSS/API endpoint with a quick `urllib`/`curl` probe first, report what works + what was rejected, then build. If a source is blocked/empty, say so and ASK — never fabricate data or derive "summary" from unrelated data (user explicitly punished this: "không tự ý assume rồi lên job").
2. **NEVER AUTO-TEST A JOB AFTER CREATING/EDITING IT.** Create or edit the cron, report what you did, then STOP. Only fire a manual `cronjob run` when the user explicitly says "gửi test" / "test thử" / "chạy thử". Auto-firing test spam is a confirmed user frustration ("đừng lên job rồi gửi test ngay bị spam").
3. **Format discipline:** one item per line, no markdown tables (Telegram renders them as one line), use emoji markers (🟢/🔴/⚪ for up/down/flat, 🏀⚽🎾🏸🎲💻🎮 for sections). Bold via `*...*`. Keep it scannable.
4. **No job IDs in delivered messages.** Cron prompts must forbid printing the job ID / mã job in the outgoing Telegram message — keep reports short and clean. Only mention the ID when the user explicitly asks for it. AND: Hermes wraps every cron delivery with a `Cronjob Response: <name> (job_id: ...)` header/footer by default — no prompt wording removes it. If the user complains about IDs showing in chat, the fix is `hermes config set cron.wrap_response false` plus a gateway restart (restart cannot run from inside the gateway process; run it from a separate shell). Verify against the chunked payload file (`~/.hermes/cron/output/<jobid>_<timestamp>.txt`, what was actually sent), not the run `.md` (whose `# Cron Job:` / `**Job ID:**` header is local-only log, never delivered).
5. **NEVER PIN A CRON JOB'S MODEL unless the user explicitly asks.** Unpinned jobs follow the main agent model and its fallback chain. A pinned job fails hard instead of degrading: INVALID_MODEL_ID when the provider retires the model name, and no fallback when the pinned provider is overloaded — both surface as failed deliveries with a 'pick another model / --unpin' notice. If a failure notice suggests `--unpin`, unpin (don't just re-pin a new model) so the job regains the fallback chain.

## Architecture
- Scripts live in `~/.hermes/scripts/`, one per job (e.g. `news_daily.py`, `sports_daily.py`, `nba_daily.py`, `boardgame_daily.py`, `videogame_daily.py`, `festival_daily.py`, `jobs_daily.py`).
- A shared `translate_vi.py` module does EN→VI translation (see references/translation.md). Import it; do NOT inline translation logic per script.
- Cron created via `cronjob create` with `deliver: telegram:<chat_id>:<thread_id>`. Forum topic thread_id is the number after the `_` in a `t.me/c/<chatid>/<threadid>` link.
- Wrap scripts that need a non-system Python (e.g. lunar calendar) in a bash wrapper that calls a dedicated venv (PEP 668 blocks `pip install` system-wide).

## Build sequence
1. **Probe sources** (see references/sources.md for tested ones). For each candidate, fetch and check item count + whether it has description/sapo.
2. **Write the script** with a `main()` that prints the final report to stdout. Use `translate_batch()` for all text (1 API call, avoids 429).
3. **Test locally** (`python3 script.py`) — verify format + translation. Do NOT deliver.
4. **Create/update cron** with correct schedule + `deliver`. Report to user. STOP.
5. Only run on explicit user request.

## Translation module (translate_vi.py)
- Endpoints (tried in order): `http://localhost:20128/v1/chat/completions` first, `http://localhost:20127/v1/chat/completions` as fallback — the active port has moved before (20127 went dead while the gateway served 20128), so never hardcode a single port. When all translations silently return English verbatim, probe the ports first (`curl -m 5 localhost:<port>/v1/models` with the matching key) before touching prompts or models.
- Key: read from `~/.hermes/.env`, trying `HERMES_CUSTOM_LOCALHOST_20128_API_KEY` first, then `HERMES_CUSTOM_LOCALHOST_20127_API_KEY` (or same-named env vars). A key named after a dead port returns no key — match the key name to the live port.
- **Model: `gemini/gemini-3.5-flash-lite`** — translates EN→VI cleanly. AVOID `gemini/gemini-3-flash-preview` and `main` (they are reasoning models; they dump reasoning and return empty/unedited content).
- Response is **SSE streaming** (`data: {…}` lines), not a single JSON. Parse line-by-line, concatenate `message.content` / `delta.content`.
- **Retry + per-item fallback pattern:** `translate_batch()` should use a retry loop (2 attempts with delay) and fallback to per-item `translate()` for any missing indices when batch translation partially fails under heavy load (e.g., when multiple cron jobs fire simultaneously around 9:30).
- `translate_batch(texts)` → one call, numbered prompt, returns list in order.
- For Vietnamese-source content (VnExpress), translation is usually unnecessary; only translate EN sources.

## Sports Reports Pattern (Scores first, then news)
For sports reports (NBA or general sports), users expect **recent match scores** at the top before side news/recaps.
- **NBA news:** ESPN RSS (`espn.com/espn/rss/nba/news`) is DEAD (HTTP 202 empty body since ~Oct 2026) — never use it. Use ESPN news API `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news` (general feed + `?team=9` for Warriors/Curry-specific feed); skip `Game Highlights` video items.
- **Thin API teasers need LLM expansion:** ESPN news API `description` is usually a one-sentence teaser, not a summary — raising the char limit changes nothing because the source text itself is short. For sections where title + teaser is unreadable, generate 2 concise Vietnamese bullet points per article via the LLM gateway from title + description (same endpoint/key/model as `translate_vi.py`, ~150 max_tokens, low temperature). Keep the translated title line; put the generated bullets under `📝`.
- **NBA scores:** `https://site.web.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard` (works, returns competitors, scores; `notes` recap is now usually empty). For deep per-game analysis (e.g. Curry statline), fetch `https://site.web.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=<id>` boxscore.
- **Football scores:** `https://site.web.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard` (Premier League), `uefa.champions/scoreboard` (UCL).
- Fetch scores first, format as `• League: Team A X - Y Team B (Status)`, then follow with RSS news items.

## Job recruitment pattern (VietnamWorks + CareerViet)
- VietnamWorks source: `POST https://ms.vietnamworks.com/job-search/v1.0/search` (public, no auth). Body: `{"userId":0,"query":"<kw>","filter":[],"ranges":[],"order":[],"hitsPerPage":50,"page":0,"retrieveFields":["jobId","jobTitle","companyName","salaryMin","salaryMax","isSalaryVisible","workingLocations","createdOn","expiredOn"],"summaryVersion":""}`. `meta.nbHits` is the total; default order is already newest-first, so no sort param is needed.
- CareerViet source: plain-HTML search pages, no auth — `https://www.careerviet.vn/viec-lam/<Keyword>-k-vi.html` (e.g. `Key-Account-k-vi.html`, `KAM-k-vi.html`, `Sale-k-vi.html`). Each page lists 50 `class="job-item..."...</li>` blocks; detail links match `href="(/vi/tim-viec-lam/<slug>.<HEXID>.html)"`. Job id = `cv` + HEXID (prefix avoids collision with VietnamWorks numeric ids). Block text after tag-stripping is `title | company | salary | location` — strip the leading `class="job-item..."` artifact before splitting, or company/salary/location shift by one.
- CareerViet location filter does NOT work server-side (the `-tai-Ho-Chi-Minh-` URL variant returns 0 items) — fetch the unfiltered keyword page and filter client-side by location substring (`ho chi minh` / `hồ chí minh` / `hcm`). Same rule as VietnamWorks: its server-side city-filter syntax 400s or returns empty, so fetch wide (`hitsPerPage: 50`) then keep HCM matches client-side (HCM = `cityId` 29 plus `cityNameVI`/`cityName` substring backup).
- Detail link: `https://www.vietnamworks.com/<any-slug>-<jobId>-jv` (any slug returns 200; `/jobdetail/<id>` 404s).
- Salary: show a range only when `isSalaryVisible`; values under 100,000 are USD quotes (prefix `$`), otherwise format VND in millions (`tr`); undisclosed → `Thương lượng`.
- Quality filters (senior-targeted digest): exclude entry-level titles with a regex (`\bintern\b|\bfresher\b|\bfresh\b|\bjunior\b|entry[\s-]?level` plus VI equivalents `thực tập|mới tốt nghiệp|sinh viên|chưa có kinh nghiệm|không yêu cầu kinh nghiệm`); salary floor applies to the DISCLOSED max (`salaryMax`, converted to VND — values under 100,000 are USD, multiply by the USD→VND rate), drop when max < floor (or min < floor if max is 0); undisclosed/negotiable salaries always pass (`Thương lượng`/`Cạnh tranh`/empty). Same logic on CareerViet salary strings (`N Triệu VND`, `$…`, `Cạnh tranh`) by parsing the max number. Keep one query group per user keyword (e.g. Key Account, KAM, Business Development, Sale) and add a matching `CV_URLS` entry (`<Keyword>-k-vi.html`, hyphenated) for each — probe the URL first, the `-tai-Ho-Chi-Minh-` variant pattern returns 0 items.
- Dedup across runs with a `jobs_daily_state.json` seen-id list; mark unseen ids 🆕; one section per keyword with `(total tin) — N tin mới`.

## Lunar calendar / holidays
- VN solar holidays: `https://date.nager.at/api/v3/PublicHolidays/<year>/VN` (works; returns name + date) — but it returns only ~4 public holidays (1/1, 30/4, 1/5, 2/9), so a festival job built on it alone reports empty most days. Always layer fixed + movable observances on top.
- Fixed solar observances: hardcode a `SOLAR_EVENTS` dict of `(month, day)` → label covering VN commemorative days (Sinh viên 9/1, Thầy thuốc 27/2, Đoàn 26/3, sinh nhật Bác 19/5, Báo chí 21/6, Gia đình 28/6, Thương binh 27/7, Doanh nhân 13/10, Phụ nữ VN 20/10, Nam giới 19/11, Nhà giáo 20/11, Quân đội 22/12) plus international fun days (Valentine 14/2, 8/3, Cá tháng Tư, Thiếu nhi 1/6, Halloween 31/10, Noel 24-25/12). Check `(today.month, today.day)` against it in `main()`.
- Lunar dates: `lunar_python` lib (`Lunar.fromSolar(Solar.fromYmd(y,m,d)).getMonth()/getDay()`). Must install into a venv (`python3 -m venv venv_news && venv/bin/pip install lunar_python`) because system pip is PEP-668 blocked.
- Precompute lunar events as a dict of `(month, day)` → label — include the lesser-known ones beyond Tết/Giỗ Tổ/Phật Đản/Vu Lan/Trung Thu: Nguyên Tiêu 15/1, Hàn Thực 3/3, Đoan Ngọ 5/5, Thất Tịch 7/7, Trùng Cửu 9/9.
- Movable Western observances: compute per-year in code, never hardcode — Easter via Gregorian computus (Anonymous algorithm), Thanksgiving = 4th Thursday of November via nth-weekday helper, Black Friday = Thanksgiving+1 day, Cyber Monday = Thanksgiving+4, Good Friday = Easter−2 days, Mother's Day = 2nd Sunday of May, Father's Day = 3rd Sunday of June. Verify against known dates (Easter 2025→20/4, 2026→5/4, 2027→28/3; Black Friday 2026→27/11) before shipping.
- Festival event explainers: keep an `EVENT_DESC` dict (key = event short name, value = one-line 📝 explainer) plus `HOLIDAY_DESC` keyed by (month, day) for API holidays; lookup is substring-based so composite labels collect every matching desc. Render one `📝 <desc>` line under each event. Also give Mùng 1 / Rằm generic explainers when no named event matches.

## Anti-repeat: dedupe + freshness (mandatory for news-type jobs)
Without this, every news/sports/NBA/game job re-sends the SAME articles for days whenever the feed has no new post — the user's most frequent complaint. Two layers, both required:
1. **Freshness filter** (`fresh.py`, `is_fresh(pubDate)`): RSS/API always return the newest *available* items even if they're days old. Drop items older than `MAX_AGE_H` (default 30h for daily jobs; use `max_age_h=24*8` for weekly jobs). Date comes from RSS `<pubDate>` or ESPN `published`; unparseable dates pass through (better to send than to drop).
2. **Persistent seen-store** (`seen_store.py`, JSON per job in `scripts/.seen/<job>.json`, TTL 14d): hash the ORIGINAL (pre-translation) title — `key_of(title)` — because the translated Vietnamese title varies slightly between runs while the English original is stable. `filter_new(...)` before rendering, `mark_sent(...)` only on items actually rendered.
3. **Never backfill:** cap the candidate pool to EXACTLY the number of items you will print (`[:PER]` before dedupe, not after). Fetching extra then slicing after dedupe silently walks backwards in time — each run sends older articles than the last, which looks identical to the repeat bug.
4. **Silence when nothing is new:** print the literal `[SILENT]` and return. Score/schedule blocks must be deduped too (`is_new(store, key_of(block), ttl_days=2)`), otherwise a static preseason schedule repeats daily. Skip empty sections entirely instead of printing "(không có tin hôm nay)".
5. **Cron prompt must map it through:** the agent runs the script and copies stdout verbatim, so the prompt needs `nếu stdout chỉ là chuỗi [SILENT] thì trả lời đúng [SILENT] và không thêm gì khác` — without it the agent happily delivers the word "[SILENT]" as a message.
6. Test with `HERMES_SEEN_DIR=/tmp/x python3 script.py` twice: run 1 must print items, run 2 must print `[SILENT]`. Then run once WITHOUT the override to create the real baseline.

## Pitfalls
- **Cron prompts may carry stale absolute script paths** (`/Users/huynguyen/.hermes/scripts/...` after a machine/profile move). The agent still resolves them by hunting for the file, so jobs appear healthy while silently wasting a step — audit all prompt paths whenever paths change (`json.load(cron/jobs.json)` → scan for `/Users/`).
- ESPN scoreboard API: `site.api.espn.com` → 403; use `site.web.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard` (works, returns teams+scores+`notes` for recap).
- Badminton news: `badmintonplanet.com/feed` returns 410 (disabled) and `bwfbadminton.com/feed` is long dead — do NOT use either. Use Google News RSS badminton/BWF queries instead, title-only (its descriptions are bare links, so drop them).
- Boardgame/video-game VN sources are rare; use EN sources + translate.
- Don't over-fetch: per-article sapo fetching (like news_daily.py does) adds 12+ requests — acceptable but keep timeouts tight.
- Server runs on UTC — every report script MUST use `from vn_time import now_vn, today_vn` (`~/.hermes/scripts/vn_time.py`, Asia/Ho_Chi_Minh) instead of `datetime.now()`/`date.today()`, otherwise timestamps show UTC (7h behind VN). `market_calendar.is_market_closed()` defaults to `today_vn()` too.
- Cron external-worker `ModuleNotFoundError` (e.g. `No module named 'ruamel'`): the worker runs under the gateway runtime python (`/home/ubuntu/.hermes/tools/python-*/bin/python3`), NOT the project `.venv`. Fix with `python3 -m pip install <pkg>` from a normal shell, then verify with `python3 -I -c "import <pkg>"`. Known cases: `ruamel.yaml` and `python-dotenv` were both missing from the worker python at different times (Sep 2026) — if one ModuleNotFoundError is fixed and another appears, keep installing into the same interpreter. Never auto-run a job to test — wait for the next scheduled fire or an explicit user request.
