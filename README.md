# AG Model Switcher

Chuyển đổi nhanh AI model trong Antigravity IDE bằng phím tắt.

## ⌨️ Phím tắt

| Phím tắt | Chức năng |
|----------|-----------|
| `Ctrl+Shift+M` | Mở Model Picker (dropdown chọn model) |
| `Ctrl+Shift+.` | Cycle sang model tiếp theo |
| `Ctrl+Shift+1` | Chuyển trực tiếp sang Slot 1 |
| `Ctrl+Shift+2` | Chuyển trực tiếp sang Slot 2 |
| `Ctrl+Shift+3` | Chuyển trực tiếp sang Slot 3 |
| `Ctrl+Shift+4` | Chuyển trực tiếp sang Slot 4 |
| `Ctrl+Shift+5` | Chuyển trực tiếp sang Slot 5 |

## ⚙️ Cấu hình

Mở Settings (`Cmd+,`) và tìm `agModelSwitcher`:

```json
{
  "agModelSwitcher.slots": {
    "1": "Claude Opus 4.6 (Thinking)",
    "2": "Gemini 2.5 Flash",
    "3": "Gemini 2.5 Pro",
    "4": "Claude Sonnet 4.6",
    "5": "GPT-4.1"
  },
  "agModelSwitcher.showStatusBar": true,
  "agModelSwitcher.showNotification": true
}
```

### Cấu hình slots

Thay đổi model cho từng slot theo nhu cầu. Ví dụ:
- Slot 1: Model mạnh nhất cho task phức tạp
- Slot 2: Model nhanh cho task đơn giản
- Slot 3-5: Các model khác

## 🔧 Status Bar

Extension hiển thị nút **$(hubot) Model** trên status bar. Click vào để mở Model Picker.
Khi chuyển model qua slot, tên model sẽ được hiển thị trên status bar.

## 📋 Commands

Tìm trong Command Palette (`Cmd+Shift+P`):
- `AG Model Switcher: Open Model Picker`
- `AG Model Switcher: Switch to Next Model`
- `AG Model Switcher: Switch to Model Slot 1~5`
