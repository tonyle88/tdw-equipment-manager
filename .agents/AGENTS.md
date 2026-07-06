# Quy trình làm việc — TDW Equipment Manager

## 1. Suy nghĩ trước khi code

- Nếu yêu cầu có ≥2 cách hiểu → liệt kê ra, hỏi trước, không tự chọn.
- Nếu chưa chắc lỗi ở đâu → đọc code trước, nói rõ giả định, rồi mới đề xuất fix.
- Nếu có cách đơn giản hơn → đề xuất. Phản biện khi thấy chính đáng.
- Nếu có điều chưa rõ → dừng lại, hỏi. Không đoán mò.

## 2. Ưu tiên sự đơn giản

- Viết lượng code tối thiểu để giải quyết đúng vấn đề.
- Không thêm tính năng, abstraction, hay "linh hoạt" ngoài yêu cầu.
- Không xử lý lỗi cho tình huống không thể xảy ra.
- Tự hỏi: "Senior có bảo cái này quá phức tạp không?" — nếu có, đơn giản hóa.

## 3. Chỉnh sửa đúng trọng tâm

- Chỉ thay đổi những dòng liên quan trực tiếp đến yêu cầu.
- Không "cải tiến" code lân cận, không refactor những thứ không bị lỗi.
- Giữ nguyên style code hiện tại.
- Nếu thấy code thừa không liên quan → nhắc, không tự xóa.
- Tiêu chí: Mọi dòng thay đổi phải truy xuất được lý do từ yêu cầu của người dùng.

## 4. Thực thi theo mục tiêu

Trước khi code, nói rõ plan:

```
1. [Bước thực hiện] → xác minh: [kiểm tra cụ thể]
2. [Bước thực hiện] → xác minh: [kiểm tra cụ thể]
```

Không bắt đầu code khi plan chưa được duyệt (với task phức tạp).

---

## Bối cảnh dự án

- **Stack**: Vanilla HTML/CSS/JS · Google Apps Script backend · Vercel deploy · Google Sheets database
- **Quy mô**: ~200-300 thiết bị · 1-4 người dùng · nội bộ nhà máy
- **Chi phí mục tiêu**: $0/tháng
- **Nguyên tắc kỹ thuật**: `escapeHtml()` mọi output · không dùng `alert/confirm/prompt` · toast thay cho thông báo · disabled button khi đang save
