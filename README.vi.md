# AG Model Switcher — Tiếng Việt

> ⚡ Chuyển đổi AI model trong **Antigravity IDE** tức thì bằng phím tắt — không cần chuột.

![Phiên bản](https://img.shields.io/badge/version-4.2.0-blue)
![Nền tảng](https://img.shields.io/badge/platform-macOS-lightgrey)
![Giấy phép](https://img.shields.io/badge/license-MIT-green)

---

## 🧠 Cách Hoạt Động

Extension điều khiển **model picker gốc của Antigravity IDE** bằng cách điều hướng bàn phím tự động qua **AppleScript** (chỉ dành cho macOS).

**Thuật toán (v5.1 — Keyboard Navigation):**

```
1. Mở picker  →  gọi lệnh antigravity.toggleModelSelector
2. Nhấn UP ×20  →  "overshoot" lên header "Model" (vị trí an toàn cố định)
3. Nhấn DOWN ×(vị trí + 1)  →  điều hướng đến model cần chọn
   (+1 vì DOWN đầu tiên đi: header → item 0)
4. Nhấn ENTER  →  xác nhận chọn
```

Phương pháp này đáng tin cậy vì luôn bắt đầu từ một vị trí xác định (header), bất kể model nào đang được chọn trước đó.

---

## ✨ Tính Năng

- **8 slot truy cập trực tiếp** — chuyển ngay đến bất kỳ model nào bằng `Ctrl+Shift+1` đến `Ctrl+Shift+8`
- **Mở Model Picker gốc** — bằng `Ctrl+Shift+M` (không auto-select)
- **QuickPick nội bộ** — duyệt danh sách và auto-select bằng `Ctrl+Shift+.`
- **Status bar** — hiển thị trạng thái chuyển model với animation feedback
- **Công cụ Diagnostic** — kiểm tra cấu hình, quyền Accessibility, và mapping model
- **Thứ tự model tùy chỉnh** — chỉnh `modelOrder` trong Settings để khớp với UI thực tế

---

## ⌨️ Phím Tắt

| Phím tắt | Chức năng |
|----------|-----------|
| `Ctrl+Shift+M` | Mở Model Picker gốc (chỉ mở, không tự chọn) |
| `Ctrl+Shift+.` | Mở QuickPick → chọn model → tự động áp dụng |
| `Ctrl+Shift+1` | Tự động chọn Model Slot #1 |
| `Ctrl+Shift+2` | Tự động chọn Model Slot #2 |
| `Ctrl+Shift+3` | Tự động chọn Model Slot #3 |
| `Ctrl+Shift+4` | Tự động chọn Model Slot #4 |
| `Ctrl+Shift+5` | Tự động chọn Model Slot #5 |
| `Ctrl+Shift+6` | Tự động chọn Model Slot #6 |
| `Ctrl+Shift+7` | Tự động chọn Model Slot #7 |
| `Ctrl+Shift+8` | Tự động chọn Model Slot #8 |
| `Ctrl+Shift+D`, `Ctrl+Shift+M` | Chạy Diagnostic |

---

## ⚙️ Cấu Hình

Mở **Settings** (`Cmd+,`) và tìm `agModelSwitcher`:

```json
{
  "agModelSwitcher.modelOrder": [
    "Claude Sonnet 4.6 (Thinking)",
    "Claude Opus 4.6 (Thinking)",
    "GPT-OSS 120B (Medium)",
    "Gemini 3.5 Flash (Medium)",
    "Gemini 3.5 Flash (High)",
    "Gemini 3.5 Flash (Low)",
    "Gemini 3.1 Pro (Low)",
    "Gemini 3.1 Pro (High)"
  ],
  "agModelSwitcher.autoSelect": true,
  "agModelSwitcher.showStatusBar": true
}
```

### Giải Thích Từng Setting

| Key | Kiểu | Mặc định | Mô tả |
|-----|------|---------|-------|
| `agModelSwitcher.modelOrder` | `string[]` | 8 model có sẵn | **Phải khớp chính xác** thứ tự hiển thị trong picker của Antigravity IDE. Slot 1 = vị trí 0, Slot 2 = vị trí 1, ... |
| `agModelSwitcher.autoSelect` | `boolean` | `true` | Bật auto-select qua AppleScript. Yêu cầu macOS + quyền Accessibility. |
| `agModelSwitcher.showStatusBar` | `boolean` | `true` | Hiển thị nút model trên thanh trạng thái. |

### Thứ Tự Model Mặc Định (đã xác nhận 05/06/2026)

| Slot | Phím tắt | Model |
|------|----------|-------|
| 1 | `Ctrl+Shift+1` | Claude Sonnet 4.6 (Thinking) |
| 2 | `Ctrl+Shift+2` | Claude Opus 4.6 (Thinking) |
| 3 | `Ctrl+Shift+3` | GPT-OSS 120B (Medium) |
| 4 | `Ctrl+Shift+4` | Gemini 3.5 Flash (Medium) |
| 5 | `Ctrl+Shift+5` | Gemini 3.5 Flash (High) |
| 6 | `Ctrl+Shift+6` | Gemini 3.5 Flash (Low) |
| 7 | `Ctrl+Shift+7` | Gemini 3.1 Pro (Low) |
| 8 | `Ctrl+Shift+8` | Gemini 3.1 Pro (High) |

> ⚠️ Nếu Antigravity IDE cập nhật danh sách model, bạn cần cập nhật `agModelSwitcher.modelOrder` để phản ánh thứ tự hiển thị mới.

---

## 📋 Danh Sách Lệnh

Tìm trong **Command Palette** (`Cmd+Shift+P`):

| Lệnh | Mô tả |
|------|-------|
| `AG Model Switcher: Open Model Picker` | Mở picker gốc (không auto-select) |
| `AG Model Switcher: Pick Model and Auto-Select` | QuickPick nội bộ → tự động chọn |
| `AG Model Switcher: Select Model #1` đến `#8` | Chọn thẳng theo số slot |
| `AG Model Switcher: Diagnose - Test Auto-Select` | Báo cáo diagnostic đầy đủ |

---

## 🔧 Yêu Cầu Hệ Thống

| Yêu cầu | Chi tiết |
|---------|---------|
| **Hệ điều hành** | macOS (AppleScript chỉ chạy trên macOS) |
| **IDE** | Antigravity IDE (fork của VS Code) |
| **Accessibility** | Phải cấp quyền cho Antigravity IDE |
| **Engine** | Tương thích VS Code ^1.90.0 |

### Cấp Quyền Accessibility

**System Settings → Privacy & Security → Accessibility → Bật "Antigravity IDE"**

Hoặc extension sẽ tự động mở cửa sổ này khi auto-select thất bại.

> ℹ️ Trên hệ điều hành không phải macOS, extension sẽ fallback về mở picker thủ công và hiển thị thông báo yêu cầu chọn tay.

---

## 🩺 Công Cụ Diagnostic

Chạy `Ctrl+Shift+D, Ctrl+Shift+M` hoặc lệnh Diagnose để xem:

- Thông tin OS và nền tảng
- Trạng thái `autoSelect` (bật/tắt)
- AppleScript có khả dụng không
- Lệnh `antigravity.toggleModelSelector` có tồn tại không
- Bảng mapping đầy đủ: phím tắt → vị trí → tên model
- Test AppleScript trực tiếp (kiểm tra quyền Accessibility)

Kết quả hiển thị trong **Output panel → "AG Model Switcher"**.

---

## 🐛 Xử Lý Sự Cố

**Model không chuyển được?**
1. Chạy lệnh **Diagnostic** để kiểm tra toàn bộ cấu hình.
2. Đảm bảo đã cấp quyền **Accessibility** (System Settings → Privacy & Security → Accessibility).
3. Kiểm tra `agModelSwitcher.modelOrder` phải khớp **chính xác** tên model hiển thị trong IDE (phân biệt hoa thường).

**Lỗi AppleScript?**
- Thử trong Terminal: `osascript -e 'tell application "System Events" to tell process "Electron" to get frontmost'`
- Nếu lỗi → chưa cấp quyền Accessibility.

**Chọn nhầm model?**
- Mở picker thủ công (`Ctrl+Shift+M`) và đếm vị trí của từng model từ trên xuống (tính từ 0, sau header "Model").
- Cập nhật `agModelSwitcher.modelOrder` cho đúng thứ tự.

**Auto-select không hoạt động sau khi IDE cập nhật?**
- Danh sách model hoặc cấu trúc picker có thể đã thay đổi.
- Kiểm tra lại vị trí các model và cập nhật `modelOrder` trong Settings.

---

## 📝 Lịch Sử Phiên Bản

Xem [CHANGELOG.md](CHANGELOG.md) để biết chi tiết từng phiên bản.

---

## 📄 Giấy Phép

[MIT](LICENSE) © 2026 pipyl
