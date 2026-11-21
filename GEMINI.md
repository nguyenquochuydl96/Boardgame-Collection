# Global Agent Rules & Protocol

## ⚡ Auto-HUD Visualizer Directive (Quy chuẩn Dashboard Realtime Không Spam Chat)

Hệ thống đã có **Windows Persistent Background Daemon** phục vụ 24/7 trên các cổng `52525..52528` và tự động đồng bộ qua tab Webview realtime:

1. **Zero-Noise Chat Protocol (Tuyệt đối không gửi Artifact / Link vào Chat)**:
   - **ĐÃ CÓ DASHBOARD REALTIME ĐỘC LẬP**: Người dùng đã theo dõi tiến trình sống qua tab webview (`http://localhost:52525/teamwork_live_visualizer.html`).
   - **CẤM TUYỆT ĐỐI**:
     - ❌ **KHÔNG** gọi `write_file` hay `edit_file` để tạo hoặc sửa file dashboard (`.html` hay `.md`) dưới mọi hình thức! Toàn bộ dashboard nằm tách biệt tại `antigravity\hud_live\` và được tự động cập nhật ngầm 100% bằng Python lifecycle hook.
     - ❌ **KHÔNG** gửi thẻ `<agent-embed>` vào bong bóng chat ở bất kỳ lượt nào.
     - ❌ **KHÔNG** gửi link `[teamwork_live_visualizer.html]` vào bong bóng chat khi bắt đầu hay kết thúc session mới.
     - ❌ **KHÔNG** tạo bất kỳ file dashboard nào trong thư mục `brain/` làm IDE tự động bật popup/pane Artifact tĩnh che khuất không gian làm việc của người dùng.
   - Giữ giao diện trò chuyện trong chat **100% sạch sẽ, tinh gọn**, chỉ tập trung trao đổi công việc và trả lời kết quả cho người dùng.

2. **Cơ chế Đồng bộ Nền Tự động (Silent Background Telemetry)**:
   - `hud_lifecycle_hook.py` sẽ tự động nhận diện session mới qua sự kiện `PreInvocation`, tự động đăng ký cổng trong `registry.json` và khởi tạo/cập nhật file `teamwork_live_visualizer.html` hoàn toàn trong nền.
   - Vòng lặp `setInterval(..., 4000)` trên tab webview sẽ tự động nạp dữ liệu mới của session đó trong vòng 4 giây mà không cần bất kỳ thao tác thủ công nào.

3. **Chỉ bật Tab Webview khi thực sự chưa mở (True Cold-Start Only)**:
   - Chỉ khi nào người dùng chưa mở tab webview hoặc yêu cầu mở dashboard, Agent mới gọi `browser` subagent để mở URL `http://localhost:<PORT>/teamwork_live_visualizer.html`.
   - Nếu tab webview (`agent-tab-1` hoặc trên trình duyệt) đã mở sẵn từ các phiên trước, Agent **KHÔNG** gọi lại subagent browser và **KHÔNG** gửi link làm phiền.

4. **Strict 100% Completion on Reply (All Green Guarantee)**:
   - Khi hoàn thành công việc và trả lời người dùng, hook vòng đời `Stop` tự động chuyển toàn bộ Dashboard sang **100% COMPLETED / ALL GREEN** (`🏆 100% CERTIFIED & COMPLETED`).
   - Tuyệt đối không để dở dang ở trạng thái `RUNNING` hay đường line vàng chạy qua lại sau khi đã trả lời xong.

5. **100% Monolingual Clean English on Dashboard UI**:
   - Giao diện Dashboard duy trì 100% tiếng Anh kỹ thuật chuẩn mực (Skerry Slate & Sea-Teal Theme), không lai tạp tiếng Việt để tránh vỡ layout và lỗi font.
   - Trong khi đó, phần trò chuyện trực tiếp với người dùng trong chat vẫn dùng tiếng Việt tự nhiên, chuẩn mực.
