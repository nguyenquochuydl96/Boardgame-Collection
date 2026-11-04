# Tested news/content sources — reference

Probe every candidate with `urllib` before relying on it. Below: what worked vs rejected
in the build of the user's Telegram report system (Aug 2026). Status can change; re-probe
if a feed goes silent.

## ✅ Works (use these)
| Topic | Source | RSS / API | Notes |
|---|---|---|---|
| VN holidays (solar) | date.nager.at | `https://date.nager.at/api/v3/PublicHolidays/<YEAR>/VN` | name + date, reliable |
| Lunar calendar | lunar_python (PyPI) | lib, not API | install into a venv; system pip is PEP-668 blocked |
| VN news (general) | VnExpress | `https://vnexpress.net/rss/<mục>.rss` | 6 categories; has sapo in `<description>` |
| VN news fallback | Tuổi Trẻ | `https://tuoitre.vn/rss/tin-moi-nhat.rss` | use when VnExpress fails |
| News general | VnExpress RSS | thoi-su/kinh-doanh/the-gioi/the-thao/giai-tri/phap-luat | per-section feeds |
| NBA news | ESPN news API | `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news` (general + `?team=9` for team feed) | RSS variant is DEAD (HTTP 202 empty); skip `Game Highlights` video items; `description` is teaser-only — expand via LLM (see SKILL.md) |
| NBA scores | ESPN web API | `https://site.web.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard` | teams+scores+`notes` (recap) |
| Football (soccer) | ESPN | `https://www.espn.com/espn/rss/soccer/news` | filter by league keywords |
| Tennis | ESPN | `https://www.espn.com/espn/rss/tennis/news` | |
| Badminton | BWF / badmintonplanet | `https://www.badmintonplanet.com/rss` | reliable; World Tour / Super Series / Olympic news |
| Boardgame (x5) | Opinionated Gamers, Meeple Mountain, Tabletop Gaming News, Board Game Quest, BoardGameWire | their `/feed/` URLs | all EN; translate VI; Opinionated Gamers posts review roundups almost daily |
| Video game PC | PC Gamer, GamesRadar | `/rss/` | |
| Video game PS | Push Square | `/feeds/latest` | |
| Video game Nintendo | Nintendo Life | `/feeds/latest` | |
| Video game Xbox | Pure Xbox | `/feeds/latest` | |
| Video game Mobile | TouchArcade | `/feed/` | |
| Video game general | IGN | `https://feeds.feedburner.com/ign/all` | |
| Video game VN | Vietgame.asia | `https://vietgame.asia/feed.xml` | site rebuilt on Astro — old `/feed/` 404s; re-probe feed path when the "Lỗi một số nguồn" line persists across runs |
| VN jobs | VietnamWorks search API | `POST https://ms.vietnamworks.com/job-search/v1.0/search` JSON `{"userId":0,"query":"<kw>","filter":[],"ranges":[],"order":[],"hitsPerPage":50,"page":0,"retrieveFields":["jobId","jobTitle","companyName","salaryMin","salaryMax","isSalaryVisible","workingLocations","createdOn","expiredOn"],"summaryVersion":""}` | public, no auth; `meta.nbHits` = total; default order already newest-first; salary when `isSalaryVisible` else undisclosed; city in `workingLocations[].cityNameVI`; detail link = any slug + `-<jobId>-jv` (returns 200) |

## ❌ Rejected (do not use)
| Source | Reason |
|---|---|
| `site.api.espn.com/.../scoreboard` | HTTP 403 Forbidden |
| VnExpress sports RSS for badminton | sparse / off-topic, use BWF instead |
| PocketGamer RSS | HTTP 404 |
| The Verge gaming RSS | 0 items |
| BoardGameGeek RSS/API | 401 / 403 |
| Dice Tower blog RSS | 404 |
| Geekly Inc RSS | timeout |
| Aladhan API | returns Hijri (Islamic), NOT VN lunar calendar |
| Reddit `.rss` | connection refused on this host |
| NBA.com / Bleacher Report | blocked / unreliable |
| TopCV pages + RSS (`/viec-lam.rss`, `/blog/feed`) | HTTP 403 Forbidden (Cloudflare) to plain-urllib probes — needs browser emulation, unsuitable for lightweight daily cron |
| CareerBuilder VN RSS | SSL certificate verify failure on this host |
| LinkedIn job pages | login wall + anti-scrape — no stable unauthenticated endpoint for cron |
| VietnamWorks `/viec-lam?q=` HTML | Next.js shell — `__NEXT_DATA__` carries only `nbHits` count, job rows load client-side; use the `ms.vietnamworks.com` search API instead |
| ITviec `/it-jobs/search?query=` URL shape | 404 — site search paths differ; probe exact paths before building |
| Shut Up & Sit Down `/feed/` (+ `/feed.xml`, `/rss/`) | HTTP 403 site-wide (bot-walled) — replaced by Opinionated Gamers for the boardgame digest |
| Dicebreaker `/feed` | HTTP 200 but stale: `lastBuildDate` years old with only a few items — check feed freshness (`lastBuildDate`/`pubDate`), not just status code, before adopting |

## Filtering patterns
- Football: keep only titles matching `premier league|champions league|ucl|europa|uel|fa cup|
  world cup|euro |nations league|copa|vietnam|việt nam|tuyển việt|afc|asian cup`.
- Video game console: split into PS / Nintendo / Xbox with separate source feeds rather than
  keyword-filtering one mixed feed (cleaner sections).
- Shorten English titles to ~80 chars before translation to keep VI lines readable.
