# Vietnam Market Data Sources (verified working)

All tested 2026-08. Confirmed reachable with a plain `urllib`/`curl` + desktop UA, no API key.

## VNDirect (stocks) ✅ primary
```
https://api-finfo.vndirect.com.vn/v4/stock_prices?sort=date&q=code:<SYMBOL>
```
Returns JSON `{ "data": [ { code, date, basicPrice, ceilingPrice, floorPrice,
open, high, low, close, change, pctChange, nmVolume, nmValue, ... } ] }`.
Latest element = most recent session. Fields:
- `basicPrice` = tham chiếu (TC), `ceilingPrice`/`floorPrice` = trần/sàn
- `close` = giá đóng, `pctChange` = % vs TC, `change` = absolute
- `nmVolume` = khối lượng khớp (cp), `nmValue` = giá trị khớp (VND) — verify semantics before quoting as "thanh khoản"

## giavang.org (gold) ✅ primary
- Nhẫn trơn PNJ 999.9: page `https://giavang.org/trong-nuoc/pnj/`
  row regex: `Nhẫn Trơn PNJ 999\.9</td>\s*<td[^>]*>([\d.]+)</td>\s*<td[^>]*>([\d.]+)</td>` → mua, bán (in x1000 đ/lượng)
- Vàng nhẫn SJC: page `https://giavang.org/trong-nuoc/sjc/`, find `Giá vàng Nhẫn`,
  then `gold-price">([\d.]+)` — first = mua, second = bán (x1000 đ/lượng)
- **Unit: values are in MILLIONS VND per lượng.** Per-chỉ = value × 100,000 (×1e6 ÷10).
  Sanity check: nhẫn tròn ~14.4M đ/chỉ. The naïve ×100 under-reports 1000×.
- History page exists at `/trong-nuoc/<brand>/lich-su/` but per-day tables are
  JS-rendered / not in static HTML — do not rely on it for "yesterday" prices;
  instead persist the previous run's snapshot to a JSON state file and diff against it.

## Fallback for gold (when giavang.org fails)
- `https://www.vietnam.vn/...` and `https://baolamdong.vn/gia-vang` — strip HTML tags,
  then regex `PNJ đang thu mua[^\d]*?([\d.,]+) triệu đồng/lượng và bán ra[^\d]*?([\d.,]+) triệu`
  and `nhẫn 9999 được niêm yết[^\d]*?([\d.,]+) triệu đồng/lượng mua vào[^\d]*?([\d.,]+) triệu`.
  Values are in triệu (×1e6).

## Blocked / unavailable (do NOT use; return "source unavailable")
- VN-Index / VN30 / HNXINDEX via VNDirect (`/v4/indexes`, `/v4/index_prices`) → 404/500
- CafeF (`GetIndexSnapshot`, `PriceBoard`) → 404
- TradingView scanner → 404; symbol-search → 403
- Vietstock index APIs → 404; Investing → 403
- **Conclusion:** no free public index API works. Do NOT fabricate a "thị trường chung"
  from a few tickers. Report only the tickers you actually fetched, or ask the user.

## Telegram chat_id / thread_id retrieval
- chat_id: DM `@userinfobot`, or `getUpdates` on the bot token (token NOT in plain config).
- Supergroup chat_id is negative, e.g. `-1003952190147`.
- Topic (forum) thread_id: inside the topic, `@userinfobot`/`@getidsbot` reports it, or
  copy the topic link (public groups: `t.me/c/<short_id>/<thread_id>`).
  `deliver: "telegram:<chat_id>:<thread_id>"` targets a topic; without it, default topic.
- `@userinfobot` may be blocked from being added to some groups — use `@getidsbot`
  or `@RawDataBot` as alternatives, or forward a topic message to a DM bot.
