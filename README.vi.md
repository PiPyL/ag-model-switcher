# AG Model Switcher — Tiếng Việt

> ⚡ Chuyển đổi AI model trong **Antigravity IDE** tức thì bằng phím tắt — không cần chuột.

![Phiên bản](https://img.shields.io/badge/version-4.3.0-blue)
![Nền tảng](https://img.shields.io/badge/platform-macOS-lightgrey)
![Giấy phép](https://img.shields.io/badge/license-MIT-green)

---

## 🧠 Cách Hoạt Động

Extension điều khiển **model picker gốc của Antigravity IDE** bằng điều hướng bàn phím tự động qua **AppleScript** (chỉ macOS).

**Thuật toán (v5.2 — Slots + Picker Order):**

```
1. Người dùng nhấn Ctrl+Shift+N
2. Tra tên model từ slots[N-1]
3. Tìm vị trí của model đó trong modelOrder (thứ tự picker)
4. Mở picker → UP ×20 (overshoot lên header) → DOWN ×(vị trí+1) → ENTER
```

Phương pháp này tin cậy vì luôn bắt đầu từ vị trí cố định (header), bất kể model nào đang được chọn.

---

## ✨ Tính Năng

- **8 slot truy cập trực tiếp** — chuyển model tức thì bằng `Ctrl+Shift+1` đến `Ctrl+Shift+8`
- **Slot favorites** — chỉ gán những model hay dùng nhất vào phím tắt qua setting `slots`
- **Mở Model Picker gốc** — bằng `Ctrl+Shift+M` (không auto-select)
- **QuickPick nội bộ** — duyệt danh sách và auto-select bằng `Ctrl+Shift+.`
- **Status bar** — hiển thị trạng thái chuyển model với animation
- **Công cụ Diagnostic** — kiểm tra cấu hình, quyền, và mapping model

---

## ⌨️ Phím Tắt

| Phím tắt | Chức năng |
|----------|-----------|
| `Ctrl+Shift+M` | Mở Model Picker gốc (chỉ mở, không tự chọn) |
| `Ctrl+Shift+.` | Mở QuickPick → chọn model → tự động áp dụng |
| `Ctrl+Shift+1` | Tự động chọn Slot #1 |
| `Ctrl+Shift+2` | Tự động chọn Slot #2 |
| `Ctrl+Shift+3` | Tự động chọn Slot #3 |
| `Ctrl+Shift+4` | Tự động chọn Slot #4 |
| `Ctrl+Shift+5` | Tự động chọn Slot #5 |
| `Ctrl+Shift+6` | Tự động chọn Slot #6 |
| `Ctrl+Shift+7` | Tự động chọn Slot #7 |
| `Ctrl+Shift+8` | Tự động chọn Slot #8 |
| `Ctrl+Shift+D`, `Ctrl+Shift+M` | Chạy Diagnostic |

---

## ⚙️ Cấu Hình

Mở **Settings** (`Cmd+,`) và tìm `agModelSwitcher`.

Có **2 setting chính** phối hợp với nhau:

### `modelOrder` — Thứ Tự Picker (sự thật về UI)

Đây là **danh sách đầy đủ tất cả model**, theo **đúng thứ tự** hiển thị trong picker gốc của IDE (từ trên xuống). Extension dùng thứ tự này để biết *vị trí* của từng model.

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
  ]
}
```

> ⚠️ Phải khớp chính xác với picker gốc. Nếu IDE cập nhật danh sách model → cập nhật lại setting này.

### `slots` — Model Yêu Thích (những gì bạn muốn dùng)

Gán chỉ những model hay dùng nhất cho `Ctrl+Shift+1~8`. Bạn có thể dùng **bất kỳ subset nào** theo **bất kỳ thứ tự nào**. Nếu để trống → fallback về `modelOrder`.

```json
{
  "agModelSwitcher.slots": [
    "Gemini 3.5 Flash (High)",
    "Gemini 3.1 Pro (High)",
    "Claude Sonnet 4.6 (Thinking)",
    "Claude Opus 4.6 (Thinking)"
  ]
}
```

Kết quả:
- `Ctrl+Shift+1` → Gemini 3.5 Flash (High) *(vị trí picker 4)*
- `Ctrl+Shift+2` → Gemini 3.1 Pro (High) *(vị trí picker 7)*
- `Ctrl+Shift+3` → Claude Sonnet 4.6 (Thinking) *(vị trí picker 0)*
- `Ctrl+Shift+4` → Claude Opus 4.6 (Thinking) *(vị trí picker 1)*
- `Ctrl+Shift+5~8` → cảnh báo: *"Chỉ có 4 models trong slots"*

### Cách 2 Setting Phối Hợp

```
slots["Gemini 3.5 Flash (High)"]
  → modelOrder.indexOf("Gemini 3.5 Flash (High)") = 4
  → điều hướng đến vị trí picker 4
  → đúng model được chọn ✅
```

### Bảng Tham Chiếu Settings

| Key | Kiểu | Mặc định | Mô tả |
|-----|------|---------|-------|
| `modelOrder` | `string[]` | 8 model có sẵn | Thứ tự picker đầy đủ. **Phải khớp** UI gốc của IDE. |
| `slots` | `string[]` | `[]` (trống) | Model yêu thích cho `Ctrl+Shift+1~8`. Tên phải có trong `modelOrder`. |
| `autoSelect` | `boolean` | `true` | Bật auto-select qua AppleScript. Yêu cầu macOS + Accessibility. |
| `showStatusBar` | `boolean` | `true` | Hiển thị nút model trên status bar. |

> **Lưu ý:** Tên model trong `slots` phải khớp **chính xác** (phân biệt hoa thường) với tên trong `modelOrder`. Nếu không tìm thấy → extension hiện lỗi thay vì chọn nhầm model.

---

## 📋 Danh Sách Lệnh

Tìm trong **Command Palette** (`Cmd+Shift+P`):

| Lệnh | Mô tả |
|------|-------|
| `AG Model Switcher: Open Model Picker` | Mở picker gốc (không auto-select) |
| `AG Model Switcher: Pick Model and Auto-Select` | QuickPick → tự động chọn |
| `AG Model Switcher: Select Model #1` đến `#8` | Chọn thẳng theo slot |
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

> ℹ️ Trên hệ điều hành không phải macOS → extension fallback về mở picker thủ công.

---

## 🩺 Công Cụ Diagnostic

Chạy `Ctrl+Shift+D, Ctrl+Shift+M` để xem:

- Thông tin OS và nền tảng
- Trạng thái `autoSelect`
- Picker order (từ `modelOrder`)
- Slot assignments (từ `slots`)
- Bảng mapping đầy đủ: **phím tắt → slot → tên model → vị trí picker → số DOWN**
- Test AppleScript trực tiếp

Kết quả hiển thị trong **Output panel → "AG Model Switcher"**.

---

## 🐛 Xử Lý Sự Cố

**Chọn nhầm model?**
- `modelOrder` chưa khớp thứ tự thực trong picker. Mở picker bằng `Ctrl+Shift+M`, đếm vị trí từ trên xuống, cập nhật `modelOrder`.

**Lỗi "Model không tìm thấy trong modelOrder"?**
- Tên model trong `slots` không khớp chính xác với tên trong `modelOrder`. Kiểm tra lỗi chính tả và phân biệt hoa thường.

**Auto-select không hoạt động?**
1. Chạy **Diagnostic** để kiểm tra.
2. Đảm bảo đã cấp quyền **Accessibility**.
3. Test trong Terminal: `osascript -e 'tell application "System Events" to tell process "Electron" to get frontmost'`

---

## 📝 Lịch Sử Phiên Bản

Xem [CHANGELOG.md](CHANGELOG.md) để biết chi tiết.

---

## 📄 Giấy Phép

[MIT](LICENSE) © 2026 pipyl
