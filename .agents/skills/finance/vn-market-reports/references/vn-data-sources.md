# VN Market Data Sources (verified working)

## Gold — giavang.org (PRIMARY)
- PNJ: https://giavang.org/trong-nuoc/pnj/
  - Row: `Nhẫn Trơn PNJ 999.9</td><td...>143.400</td><td...>146.900</td>` (values = triệu đồng/lượng, ×1000 = đồng/lượng)
- SJC: https://giavang.org/trong-nuoc/sjc/
  - Box: `Giá vàng Nhẫn` then `gold-price">143.500` (Mua) and next `gold-price">146.500` (Bán)
- Per chỉ: value × 1,000,000 / 10 = value × 100,000 (value is in millions đồng/lượng).

## Gold — FALLBACK (when giavang.org fails)
- https://www.vietnam.vn/gia-vang-hom-nay-chieu-ngay-20-8-2026-gia-vang-9999-vang-sjc-vang-nhan-9999-va-vang-the-gioi
  - Strip tags, then:
    - PNJ: `PNJ đang thu mua[^\d]*?([\d.,]+) triệu đồng/lượng và bán ra[^\d]*?([\d.,]+) triệu`
    - SJC: `nhẫn 9999 được niêm yết[^\d]*?([\d.,]+) triệu đồng/lượng mua vào[^\d]*?([\d.,]+) triệu`
  - Convert "X,Y triệu" → float(X.Y) × 1,000,000 / 10 = per chỉ.
- https://baolamdong.vn/gia-vang (same extraction pattern)

## Stocks — VNDirect API (PRIMARY, works)
- `https://api-finfo.vndirect.com.vn/v4/stock_prices?sort=date&q=code:SSI`
- Returns `data[0]` with: `basicPrice` (TC), `ceilingPrice` (Trần), `floorPrice` (Sàn), `close` (Đóng), `change`, `pctChange`, `nmVolume`, `nmValue`, `date` (phiên).
- Watchlist tickers: read `SYMBOLS` in the script as source of truth (currently 3: SHS HVN HNG — user trimmed from 15 on request; keep the script's order).
- ⚠️ Returns the LAST trading session with data (weekends show Friday's close).

## Blocked sources (do NOT use / do not assume from these)
- VN-Index / VN30 / HNXINDEX: VNDirect `index_prices` → 404; CafeF PriceBoard → 404; TradingView scan → 404; Investing/Vietstock → 403. All blocked. Do not fabricate a "market summary" from individual stocks.
- TCBS, FWT APIs: Cloudflare / empty.

## Known-good script skeleton (gold + stock report)
```python
import json, re, sys, urllib.request
from datetime import datetime
UA="Mozilla/5.0"
def fetch(u):
    r=urllib.request.Request(u,headers={"User-Agent":UA})
    with urllib.request.urlopen(r,timeout=30) as x: return x.read().decode("utf-8","ignore")
# gold primary PNJ
def gold_pnj(h):
    m=re.search(r"Nhẫn Trơn PNJ 999\.9</td>\s*<td[^>]*>([\d.]+)</td>\s*<td[^>]*>([\d.]+)</td>",h)
    if not m: return None
    return {"mua":int(round(float(m.group(1))*100_000)),"ban":int(round(float(m.group(2))*100_000))}
# stock
def stock(s):
    u=f"https://api-finfo.vndirect.com.vn/v4/stock_prices?sort=date&q=code:{s}"
    d=json.load(urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":UA}),timeout=20))
    return d["data"][0]
```
