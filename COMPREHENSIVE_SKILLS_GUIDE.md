# Comprehensive Skill & Development Package for Boardgame-Collection

> **Mô tả:** Tổng hợp toàn bộ các kỹ năng và cẩm nang chuẩn hóa về UI/UX (Tailwind v4, Impeccable Design), hiệu ứng chuyển động mượt mà (Animate UI) và quy trình lập trình khắt khe (Superpowers Spec-first, TDD, Systematic Debugging) dành riêng cho dự án `Boardgame-Collection`.

---

## 1. Tiêu chuẩn Thiết kế UI/UX & Hiệu ứng (Impeccable, Tailwind & Animate UI)
* **Phong cách giao diện:**
  * Lấy cảm hứng từ các nền tảng boardgame lớn (như BGG, Tabletopia, Board Game Arena), tập trung vào sự trực quan, thẻ bài (cards) gọn gàng, màu sắc tương phản hợp lý trên nền tối/sáng.
  * Sử dụng hệ thống **Tailwind CSS v4** với các biến màu sắc, khoảng cách chuẩn (`space-y-4`, `rounded-2xl`, `shadow-lg`).
* **Hiệu ứng chuyển động (Animate UI):**
  * Tận dụng thư viện `@animate-ui/react` và `motion` để tạo hiệu ứng chuyển động mượt mà (smooth micro-interactions) khi mở modal chi tiết game, chuyển tab, hoặc lật thẻ bài boardgame.
* **Đảm bảo trải nghiệm (UX):**
  * Luôn có trạng thái trống (Empty state) khi bộ sưu tập chưa có game, trạng thái tải (Loading state) mượt mà.

---

## 2. Quy trình Phát triển phần mềm & Kỷ luật Code (Superpowers)
* **Quy trình chuẩn (The Pipeline):**
  `Idea (Ý tưởng) → Brainstorm (Phân tích) → Plan (Lên kế hoạch) → TDD (Viết test trước) → Implement (Thực thi) → Review (Kiểm tra chất lượng)`
* **Quy tắc cốt lõi (Hard Rules):**
  * **Spec-first:** Không code mò, mọi tính năng mới (quản lý kho boardgame, lọc theo thể loại, đếm số người chơi) đều phải có tài liệu thiết kế và kế hoạch chi tiết trước.
  * **TDD (Test-Driven Development):** Viết test kiểm tra logic nghiệp vụ trước khi dựng giao diện component.
  * **Systematic Debugging:** Khi phát sinh lỗi, điều tra nguyên nhân gốc rễ trước khi sửa chữa, không sửa ăn may.
