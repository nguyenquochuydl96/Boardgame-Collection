# HANDOFF — BoardGame Vault

> File bàn giao phiên làm việc. Cập nhật file này mỗi khi kết thúc một block việc lớn,
> để session sau (hoặc phiên khác) đọc là hiểu ngay, không cần hỏi lại.

**Cập nhật lần cuối:** 23/10/2026
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

## 3. Trạng thái hiện tại — ĐÃ VERIFY

- [x] `npm install --legacy-peer-deps` → OK
- [x] `npx tsc --noEmit` → **0 lỗi**
- [x] `npm run build` → **pass**, 1684 modules, bundle 450 kB (gzip 131 kB)
- [x] Dev server chạy được, render đầy đủ 2 tủ, search/filter/toggle hoạt động

## 4. Việc đang mở (chưa làm)

3 lỗi CSS/giao diện phát hiện từ ảnh chụp 1440×1000:

1. **Navbar tràn ngang** — nút `Đồng Bộ Sheet` bị cắt cụt ở mép phải viewport.
   Nghi vấn: `src/components/Navbar.tsx` thiếu max-width / flex-wrap, hoặc `whitespace-nowrap`
   trên cụm nút phải. Cần kiểm tra padding/margin tổng.
2. **Truncate quá tay** — tên game, thể loại (`Chiến thuật / Gia…`), tình trạng đều bị `...`
   dù panel còn chỗ. Xem `src/components/GameBoxCard.tsx` (line-clamp, `truncate`).
   Cân nhắc: 3 cột/hộp ở 1440px là quá chật → thử 2 cột hoặc giảm metadata hiển thị.
3. **Dòng giá card Catan (tủ Real) bị mờ** — chữ `Mới nguyên …` gần như trùng màu nền,
   có mask/fade đè lên. Xem đoạn render condition + price trong `GameBoxCard.tsx`.

Chưa fix vì user chưa chốt ưu tiên. Hỏi user muốn fix 3 lỗi này hay thêm tính năng mới trước.

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
    ├── Navbar.tsx               (201)  header + 4 tab + nút sync  ← lỗi #1
    ├── CabinetsView.tsx         (496)  2 tủ song song, grid card
    ├── GameBoxCard.tsx          (246)  card game                 ← lỗi #2, #3
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

## 7. Cách chạy lại từ đầu

```bash
cd /home/ubuntu/projects/Boardgame-Collection
git pull                                  # nếu có thay đổi từ AI Studio
npm install --legacy-peer-deps
npm run dev                               # → http://127.0.0.1:3000
```

Kiểm tra nhanh: `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/` → phải là 200.
