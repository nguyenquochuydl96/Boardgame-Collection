---
name: boardgame-research
description: "Use when the user asks about board games."
version: 1.0.0
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [Boardgames, BGG, Rules, Shopping]
    related_skills: [blocked-page-recovery, ocr-and-documents]
---

# Boardgame Research

The user plays board games regularly and asks in Vietnamese. Match reply
length to the ask: a one-line rules question gets a one-line answer, a
review or comparison earns depth. Recommend decisively — pick one option,
don't hedge between several.

## Ratings and trending

- Get BGG rating / weight / rank with a web search for
  `<game> BGG rating weight review`.
- BGG blocks bots (`xmlapi2/hot` returns `Unauthorized`, HTML/API surfaces
hit Cloudflare). For live Hotness, curl the BoardGameOracle mirror
`https://www.boardgameoracle.com/list/bgg-hotness` (strip `script`/`style`,
parse the text). Always state the fetch date — hotness goes stale within
weeks.

## Box art images

- BGG CDN URLs follow the pattern `https://cf.geekdo-images.com/{hash}__itemlg/pic{number}.jpg` where both hash and pic number are unique per image. These URLs consistently return 400 Bad Request when fetched programmatically (bot protection). NEVER fabricate these URLs with placeholder hashes — every hash must be real.
- To fetch real box art URLs: (1) Scrape the official publisher's product page and extract Shopify/retail CDN image URLs (e.g. `https://cdn.shopify.com/s/files/.../BrassB-RetailBoxImage.png` from Roxley, Stonemaier, Asmodee stores) — use `urllib.request` with `User-Agent: Mozilla/5.0` and parse HTML with regex for cdn.shopify.com or similar retail CDN patterns; (2) If publisher site unavailable, try BGG XML API `https://boardgamegeek.com/xmlapi2/thing?id={id}` (often blocked but worth one attempt); (3) Report the fetch failure honestly — NEVER substitute thematic stock photos (Unsplash industrial machinery, dice, board imagery) as box art when the user requests actual game box covers. The user explicitly prohibits this: using a thematic stock photo instead of the real box art is treated as fabricating data.
- Local asset precedence: In collection catalog apps, always prioritize local curated image assets (`userMeta?.imageUrl` or `/images/...`) over remote spreadsheet URLs, API image fields, or generative fallbacks to prevent random placeholder images or broken links when external CDNs block requests.
- Pitfall: Wikimedia Commons and Wikipedia image URLs return 404 or 429 rate-limit errors frequently — do not rely on them for programmatic access.
- Pitfall: creating made-up BGG CDN URLs (e.g. `Sl1b2c3d4e5f6g7h8i9j0K__itemlg`) or substituting thematic Unsplash stock images when actual box art is unavailable both violate the user's standing rule against fabricating data when sources fail — always fetch real URLs or report the failure, never substitute plausible-looking alternatives.

## Rules answers

- ALWAYS quote rulebook text when answering rule questions. The user explicitly requested this as a standing rule: "Mình hỏi thì cứ trích rule luôn nhé." Even for simple yes/no rules questions, include the relevant English rulebook passage in a `>` blockquote.
- For fast rulebook quotes without downloading PDFs: search `"exact phrase" <game> rulebook` via web_search. Search engines index rulebook text heavily; this returns quotable passages in seconds. Use multiple angle queries if the first misses (e.g. consuming coal order, tie breaker, overbuilding).
- If web_search doesn't surface the rule — or one question needs several rules at once — pull the whole rulebook instead of guessing: `curl -sL -o /tmp/rb.pdf <url>`, then `uv run --python /usr/bin/python3.12 --with pymupdf python ~/.hermes/skills/research/boardgame-research/scripts/pdf_text.py /tmp/rb.pdf /tmp/rb.txt`, then `read_file` on the .txt (page markers included, so cite by page). Rulebook PDFs are mirrored on third-party sites (`nastol.io`, rulespal.com, orderofgamers.com, playeraid.net) and turn up with the query `<game> rulebook pdf`, so a bot-blocked publisher page is no obstacle.
- Pitfalls when extracting a rulebook: `read_file` directly on a graphics-heavy rulebook PDF can fail with `NeedsOcrError` (extract to text first, never OCR-page-inspecting a 32-page manual); and pin `--python /usr/bin/python3.12` in the `uv run` line — the default interpreter resolution can land on a binary this host cannot exec, and the fixed line above is the one that works.
- Own errors plainly — name the wrong point and give the correct rule. Fix the sentence that misled; never append `UPDATE: actually...` under it.
- Pitfall: printed starting components are not spendable pieces (a worker printed on a player board is not a tile and can't be paid) — confirm component status in the rulebook before asserting it.
- Pitfall: rules exceptions often apply by STATE, not by TURN NUMBER. E.g. Brass "build anywhere" exception checks "no tiles on board", not "first turn" — always verify the trigger condition, not the assumed timing.
- Series rulebooks share wording but differ — name the edition before answering. Birmingham: loans allowed until your last turn (only limit is income can't drop below -10), and end scoring is links + flipped tiles only (money and income are tie-breaks). Lancashire: no loans once the deck is exhausted in the Rail Era, and cash scores 1 VP per £10 at the end of the Rail Era.
- A rulebook block the user pastes or photographs may belong to a variant or short-game section — check its heading before adopting it as the standard rule. The "£4 = 1 VP (max 15)" + "score VPs equal to your income level" block is the single-era INTRODUCTORY game, not full-game scoring.
- Verified Brass Birmingham rules, resource order, tile/beer facts and the turn-order simulation math: `references/brass-birmingham.md`.

## Evaluating a released game (đánh giá game)

The user is deciding what to put on his own table (3-4 players, solo dropped,
euro mid-weight ~2.9-3.3 but 4.x accepted, likes conflict and coop, dislikes
Arnak). He wants a verdict, not a neutral summary — "up to you" fails.

1. Identify the title exactly before writing anything (proper name, year,
designer, publisher). A mangled title can point at a different game; if two
candidates fit the spelling, say which one you evaluated.
2. Stats first: rating, weight, player count, **Best at N**, playtime, price.
   BGG pages are bot-blocked, but the query `<game> BGG rating weight
   complexity best players community` returns those numbers inside BGG's own
   result snippet; LayerUp and boardgamediscovery mirror them when the snippet
   is thin. Always give "Best at N" — that is the number he filters on.
3. Mine the reviews for consensus AND for the criticism: `<game> review
   criticism OR "too tight" OR replayability OR luck reddit`, plus Dice Tower /
   SUSD / Meeple Mountain / BGG review blogs. Quote a line or two verbatim;
   a named reviewer's sentence outweighs your paraphrase. Report the game's
   known ceiling, not only its praise.
4. For "đánh giá kỹ hơn": read the actual rulebook (see Rules answers) and do
   the math yourself — round count, action economy, scoring formula, resource
   caps, what locks what. This is what makes a deep evaluation worth reading:
   reviews routinely miss the exploitable line (an off-trend multiplier beating
   the max on-trend score, a salary treadmill that makes debt mandatory, a
   score cap that hands the game to the money tie-break).
5. Answer skeleton: stats → how it really plays (structure, not marketing) →
   where the decisions bite → strengths and weaknesses with source quotes →
   verdict for his table (fit / risk / what would make it a skip) → which
   edition to buy. One decisive recommendation at the end.

## Collection sales and trade offers

- When he hands back his own edited draft, that draft is the source of truth: keep his lines verbatim, add only the part he asked for, no re-ordering or "improving".
- Write ONE listing per audience. A group that bans fakes gets authentic items only plus a "hàng chính hãng 100%" line; general groups get the same list plus the knockoffs, each labelled "hàng fake (replica)" — never silently omit the label.
- Every sale listing carries: numbered items with condition bullets, a trade line (he wants trade/offers open), and a location line (Phú Nhuận, HCM). Remind him of the real-item groups' photo/timestamp requirement.
- Name products exactly (search if unsure — e.g. Galactic Cruise has Advancements / Accommodations expansions, Sail's expansion is Sail: Seafarers); a wrong name kills searchability.
- Trade offers: evaluate every offered title against his fixed table (3-4 players, solo dropped, euro mid-weight ~2.9-3.3 but can take 4.x, likes conflict and coop, dislikes Arnak), state the review-backed best player count and playtime, then end with a ranked take/skip verdict and a concrete swap shape (which titles + cash). "Up to you" is a failed answer.
- Listing skeleton and the trade-eval checklist: `references/selling-and-trading.md`.

## Components, sleeves, and missing pieces

- List base-box contents from the publisher/retailer spec or rulebook colophon (e.g. Roxley/Asmodee listing), not from memory. Industry tiles break down per color when asked.
- Mat slots are levels, not copies: one level slot can hold a stack of 2+ tiles (e.g. Brass manufacturer has 8 level slots I-VIII but 11 tiles). Never infer per-level counts from slot count — get the per-level copy table (NamuWiki game page `Number of buildings` row lists copies per level) and cross-check against a player-mat render when web text only gives totals.
- For chip/bank sizing questions, estimate peak money held (starting cash + loans + unspent income, minus build costs and turn-order pressure to spend) rather than quoting the bank total — state the peak range and a light opening chip split.
- Get card size + count from sleeveyourgames.com (`/sleeves/<id>/<slug>`) backed by the Mayday sleeve blog; state both (e.g. `56x87mm, 330 cards`). One size line per card type.
- Missing-piece triage: ask WHICH piece before answering. Supply-limited pieces (industry tiles, map tiles) break the game — proxy temporarily and request a replacement from the publisher/shop. Generic markers (money, VP, income) are freely substitutable — say so in one line.

## Editions and VN prices

- Compare editions by contents and deluxe extras across several sources
  (publisher, retail, secondhand).
- "Có mấy ver?" → build a version timeline before answering: original
  crowdfunding campaign (Kickstarter/Gamefound backer count and goal %), any
  reprint/1.5/Standard edition campaign, retail + localized editions, and the
  BGG `boardgameversion` entries. Give each version a name, year, what changed,
  and where it is sold — then say which one to buy. Flag upgrade packs or free
  print-and-play files for owners of the older print, and note when a publisher
  says the reprint becomes the only version they print (that kills the resale
  premium on the first edition).
- VN shops rarely stock deluxe/Special Editions: check BoardgameVN,
  dBoardgame, Play Boardgame, The Boardgame Station, plus Shopee and the
  `Chợ Boardgame` Facebook group. Special Editions are usually order-only
  (deposit, weeks of waiting, heavy-box shipping inflates landed price).

## Strategy advice

- When asked for strategy tips, cite both rulebook constraints AND community-sourced play patterns (BGG strategy threads, Reddit, Steam guides). Search `<game> strategy first turns opening tips` for community consensus.
- For early-game/opening strategy: describe the common opening sequences that experienced players use, with reasoning (why loan first, why not build in round 1, etc.). Cite BGG strategy primer threads when available.
- Structure strategy tips as numbered rules with a WHY clause, not as a narrative walkthrough.
- For edition comparisons (e.g. Lancashire vs Birmingham vs Pittsburgh): organize by mechanical difference (resources, actions, scoring, setup variability), then end with a "which should you play" recommendation based on player count and preferences.

## Playtest/preview reviews (upcoming games)
- For unreleased games: search BGG forums for playtest reviews (`<game> playtest review BGG`), Gamefound/Kickstarter updates, and YouTube previews (Before You Play, Dice Tower, BoardGameRamblings).
- Distinguish clearly between playtester impressions and final retail reviews. Note the campaign status and expected delivery when relevant.
