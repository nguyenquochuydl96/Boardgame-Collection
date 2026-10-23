# HANDOFF — BoardGame Vault

> File bàn giao phiên làm việc. Cập nhật file này mỗi khi kết thúc một block việc lớn,
> để session sau (hoặc phiên khác) đọc là hiểu ngay, không cần hỏi lại.

**Cập nhật lần cuối:** 23/10/2026 (block 2 — fix layout)
**Repo:** https://github.com/nguyenquochuydl96/Boardgame-Collection
**Local:** `/home/ubuntu/projects/Boardgame-Collection`

---

## 1. App này là gì

**BoardGame Vault — Tủ Game Real & Fake.** Web app quản lý bộ sưu tập boardgame,
trong đó điểm độc đáo là chia 2 tủ song song: **Real** (hàng chính hãng) và **Fake**
(hàng reprint/in lậu) để đối chiếu, thẩm định.

Hiện có 8 game mỗi bên (16 game), dữ liệu mẫu trong `src/data/defaultGames.ts`,
và có thể sync thêm từ Google Sheet.

## 2. Stack

| Thành phần | Version |
|---|---|
| React | 19.0.1 |
| Vite | 8.3.x |
| TypeScript | 7.0.2 |
| Tailwind CSS | 4.3.3 (qua `@tailwindcss/vite`) |
| Firebase | 13.1.0 (chỉ dùng Auth) |
| motion (framer-motion) | 12.x |
| lucide-react | 0.546 |

## 3. Trạng thái hiện tại — ĐÃ VERIFY (đo bằng CDP, không đoán bằng mắt)

- [x] `npx tsc --noEmit` → **0 lỗi**
- [x] `npm run build` → **pass**, 1684 modules, ~450 kB (gzip ~131 kB)
- [x] Không tràn ngang ở 1440 / 1280 / 1024 / 900 / 768 (đo `document.scrollWidth == innerWidth`,
      0 element có `right > innerWidth`)
- [x] Không còn text bị `...` trong card (quét `scrollWidth > clientWidth` → 0 kết quả)
- [x] 16 card đều **253×497 px**, các hàng thẳng nhau giữa 2 tủ (y = 424 / 987 / 1551 / 2114)
- [x] Chế độ Gáy Kệ: gáy 48×256, đứng gọn trong tấm kệ (kệ 137–683, gáy 149–575), tên không bị cắt
- [x] View So Sánh / Thống Kê / Sheet không tràn layout

## 4. Việc đang mở

**Không còn lỗi layout nào đang mở.** 3 lỗi của block 1 đã fix xong:

| # | Lỗi | Cách fix |
|---|---|---|
| 1 | Navbar tràn, nút `Đồng Bộ Sheet` bị cắt | Nhãn menu rút gọn ở < 2xl (`2 Tủ / So Sánh / Thống Kê / Sheet`), full nhãn từ 2xl, giảm padding/gap, nút Google thành icon-only < 2xl. Nút sync giờ kết thúc ở x=1360 trên viewport 1440 |
| 2 | Truncate quá tay (tên game, thể loại, tình trạng) | `max-w-[110px]`/`max-w-[120px]` cứng → `flex-1 min-w-0 truncate` + `shrink-0` cho năm/giá; tên game cho 2 dòng; lưới 3 cột → **2 cột** khi 2 tủ song song (3 cột chỉ ở 2xl), 4 cột khi mở 1 tủ |
| 3 | Dòng tình trạng card Catan bị mờ | Không phải mask/fade — do chữ 11px màu `text-slate-400` + bị truncate. Đổi sang `text-slate-300`, có `title` tooltip, giá `shrink-0 whitespace-nowrap` nên không bị đè |

Lỗi phụ tìm thấy thêm trong block 2 (đã fix luôn):
- Gáy Kệ bị xoay 2 lần (`writing-mode: vertical-rl` **+** `rotate-90`) và `truncate` cắt giữa từ → bỏ rotate, bỏ truncate, thêm tooltip.
- 8 gáy/hàng rộng 64px tràn khỏi tấm kệ (554px > 522px khả dụng) → gáy cố định 48px.
- Container kệ khai báo cùng lúc `flex` và `grid` → bỏ, chia 2 nhánh class rõ ràng.
- Thanh lọc tràn ở 1024px → row layout đổi từ `lg` sang `xl` + `flex-wrap`.
- Card lệch chiều cao làm giá không thẳng hàng / ván kệ lệch giữa 2 tủ → `h-full` cho card, info panel `flex-1`.
- Gáy Kệ thừa `min-h-[500px]` của tủ → còn 380px khi ở chế độ gáy.

### Hướng phát triển tiếp (chưa chốt với user)

1. **Backup / Export-Import JSON** — hiện dữ liệu chỉ nằm trong localStorage, xoá cache là mất.
2. **Ảnh bìa thật** — nhiều game đang dùng fallback CSS; thêm ô upload ảnh (base64) hoặc dán URL.
3. **Lịch sử giá** — lưu giá theo lần sync để vẽ biểu đồ tăng/giảm (user là dân theo dõi giá).
4. **So Sánh nâng cao** — chọn đúng 1 cặp Real↔Fake theo tên game thay vì so sánh cả 2 tủ.

## 5. Bản đồ file

```
src/
├── App.tsx                      (383)  root, state trung tâm, routing view
├── main.tsx                     (5)    entry
├── index.css                           Tailwind + theme tokens
├── types/boardgame.ts           (46)   BoardGame, SheetConfig, ComparisonPair
├── data/defaultGames.ts         (385)  16 game mẫu (8 real / 8 fake)
├── services/
│   ├── auth.ts                  (78)   Firebase Auth (Google sign-in)
│   ├── googleSheets.ts          (781)  parse + sync Google Sheet → BoardGame[]
│   └── googleWorkspace.ts       (346)  Google API helpers
└── components/
    ├── Navbar.tsx               (201)  header + 4 tab + nút sync
    ├── CabinetsView.tsx         (496)  2 tủ song song, lưới card, filter bar
    ├── GameBoxCard.tsx          (246)  card game (front + spine)
    ├── GameDetailModal.tsx      (293)
    ├── AddEditGameModal.tsx     (404)
    ├── ComparisonMode.tsx       (317)  so sánh Real vs Fake
    ├── StatsView.tsx            (192)  thống kê bộ sưu tập
    └── GoogleSheetModal.tsx     (588)  cấu hình URL/sheet + sync
```

Tổng ~4.760 dòng TS/TSX.

## 6. Quyết định đã chốt

- **Hermes là nhà chính của code.** AI Studio chỉ để xem, không sửa song song (tránh
  conflict khi sync 2 chiều qua GitHub).
- **Dùng npm, không bun** — máy này không có bun.
- **`--legacy-peer-deps` bắt buộc** (Vite 8 cần esbuild ^0.27+, AI Studio pin ^0.25).
  Không sửa `package.json` để né, vì AI Studio có thể ghi đè khi sync.
- **Không cần `GEMINI_API_KEY`** — app không gọi Gemini API dù `.env.example` có nhắc tới.
- **Verify layout bằng số đo CDP, không chỉ nhìn ảnh chụp** — script
  `/home/ubuntu/.hermes/cache/scratch/cdp.py` (xem `.hermes.md`).

## 7. Cách chạy lại từ đầu

```bash
cd /home/ubuntu/projects/Boardgame-Collection
git pull                                  # nếu có thay đổi từ AI Studio
npm install --legacy-peer-deps
npm run dev                               # → http://127.0.0.1:3000
```

Kiểm tra nhanh: `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/` → phải là 200.
