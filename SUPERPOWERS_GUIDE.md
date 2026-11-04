# Superpowers Workflow for Antigravity & AI Agents

> **Mô tả:** Quy trình phát triển phần mềm chuẩn hóa (Spec-driven, TDD, Subagent-driven) được chuyển đổi sang định dạng file markdown để đưa vào thư mục dự án cho Antigravity hoặc các AI Agent đọc hiểu và tuân thủ.

---

## 1. Quy trình tổng thể (The Pipeline)
Mọi tác vụ lập trình và xây dựng tính năng phải tuân thủ nghiêm ngặt các bước sau:
```
Ý tưởng (Idea) → Brainstorm → Lập kế hoạch (Plan) → Thực thi theo TDD → Review Code → Hoàn tất (Finish)
```
*Không bao giờ được bỏ qua bước lập thiết kế với lý do "nó quá đơn giản".*

---

## 2. Giai đoạn 1: Brainstorming & Thiết kế
* **Kích hoạt khi:** Xây dựng tính năng mới hoặc bắt đầu app mới.
* **Quy trình:**
  1. Khảo sát ngữ cảnh dự án (cấu trúc file, tài liệu, code hiện tại).
  2. Đặt câu hỏi làm rõ (từng câu một, ưu tiên trắc nghiệm).
  3. Đề xuất 2–3 phương án kèm ưu/nhược điểm và phương án khuyến nghị.
  4. Chia thiết kế thành các phần nhỏ, lấy ý kiến xác nhận từng phần.
  5. Viết tài liệu thiết kế vào `docs/plans/YYYY-MM-DD-<topic>-design.md` rồi commit.

---

## 3. Giai đoạn 2: Viết kế hoạch thực thi (Writing Plans)
* **Kích hoạt khi:** Bản thiết kế đã được duyệt.
* **Yêu cầu:**
  * Lập kế hoạch chi tiết theo từng task nhỏ (mỗi task hoàn thành trong 2-5 phút).
  * Vòng lặp chuẩn cho mỗi task: Viết test lỗi → Chạy thấy fail → Viết code cài đặt → Chạy thấy pass → Commit.
  * Lưu kế hoạch vào `docs/plans/YYYY-MM-DD-<feature>.md`.

---

## 4. Giai đoạn 3: Phát triển hướng kiểm thử (TDD & Execution)
* **Quy tắc cứng (Hard Gate):** TDD là bắt buộc trong mọi task. Không bao giờ viết code triển khai trước khi viết test.
* Xóa ngay lập tức bất kỳ đoạn code nào được viết trước khi có test case kiểm thử tương ứng.

---

## 5. Giai đoạn 4: Gỡ lỗi hệ thống (Systematic Debugging)
* **Kích hoạt khi:** Gặp lỗi, test fail hoặc hành vi bất thường.
* **Quy tắc cứng:** Không sửa mò, không sửa code khi chưa tìm ra nguyên nhân gốc rễ (Root Cause).
* **4 bước xử lý:**
  1. Điều tra nguyên nhân gốc rễ (đọc lỗi, tái hiện, kiểm tra luồng dữ liệu).
  2. Phân tích mẫu (tìm ví dụ code đang chạy đúng để so sánh).
  3. Đưa giả thuyết và kiểm thử (thử từng giả thuyết một).
  4. Sửa lỗi triệt để và xác minh lại toàn bộ hệ thống.

---

## 6. Nguyên tắc cốt lõi (Key Principles)
* **YAGNI (You Aren't Gonna Need It):** Loại bỏ mọi tính năng thừa thãi không cần thiết khỏi thiết kế.
* **DRY (Don't Repeat Yourself):** Không lặp code.
* **Evidence over claims:** Phải chạy lệnh kiểm tra thực tế (test pass, build success) trước khi tuyên bố hoàn thành.
* **Commit thường xuyên:** Commit code ngay sau mỗi khi test chuyển sang trạng thái xanh (Green).
