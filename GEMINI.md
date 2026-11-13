# Boardgame Collection — Project Rules & Agent Protocol

## ⚡ 1. Auto-HUD Visualizer Directive (Tự động kích hoạt HUD)
Mỗi khi bắt đầu nhận task mới (tính năng, sửa bug, tối ưu, refactor, kiểm thử hoặc audit):
- **Tự động kích hoạt không cần nhắc**: Không chờ người dùng phải hỏi xin link hoặc gõ "trình dashboard agent".
- **Tạo & Nhúng HUD**: Tự động sinh file `<conversation_artifact_dir>/teamwork_live_visualizer.html` theo chuẩn skill `agent-team-visualizer` và nhúng trực tiếp bằng `<agent-embed>` vào phản hồi.
- **Cập nhật động theo Session**: Thể hiện đúng các milestone, mô hình AI tham gia (Gemini 2.5 Pro Lead, Claude 3.7 Sonnet workers, Forensic Auditor), skills đang dùng và session log thực tế.
- **Đồng bộ tiến độ**: Cập nhật trạng thái HUD khi hoàn thành các checkpoint/gates quan trọng.

## 🛠️ 2. Project Engineering Standards
- **Stack**: React 18, TypeScript, Tailwind CSS v4, Vite, Supabase Cloud Vault (`huy-vault-2026`).
- **Tests**: Sử dụng Node.js native test runner (`npm test`), luôn bảo đảm 100% tests pass (hiện tại 73/73 tests).
- **Git Protocol**: Mọi commit khi push bắt buộc đồng bộ đến cả 2 remotes: `origin` và `studio` trên nhánh `main`.
- **Data Integrity**: Tuyệt đối không tự ý ghi đè hay xóa dữ liệu cloud vault trừ khi có yêu cầu rõ ràng từ người dùng. Bảo tồn các điểm số hợp lệ bằng 0đ (Zoo Vadis) và điểm âm (Ark Nova, Flip 7).
