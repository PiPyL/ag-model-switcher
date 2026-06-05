# AG Model Switcher

> ⚡ Instantly switch AI models in **Antigravity IDE** using keyboard shortcuts — no mouse required.

![Version](https://img.shields.io/badge/version-6.0.0-blue)
![Platform](https://img.shields.io/badge/platform-macOS-lightgrey)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 🧠 How It Works

This extension controls the **native Antigravity IDE model picker** through programmatic keyboard navigation using **AppleScript** (macOS only).

**Algorithm (v5.2 — Slots + Picker Order):**

```
1. User presses Ctrl+Shift+N
2. Look up model name from slots[N-1]
3. Find that model's position in modelOrder (picker layout)
4. Open picker → UP ×20 (overshoot to header) → DOWN ×(position+1) → ENTER
```

This approach is reliable because it always starts from a known position (the header) regardless of which model was previously selected.

---

## ✨ Features

- **8 direct-access slots** — jump to any model instantly with `Ctrl+Shift+1` through `Ctrl+Shift+8`
- **Slot favorites** — assign only your most-used models to hotkeys via `slots` config
- **Model Picker** — open the native picker with `Ctrl+Shift+M`
- **QuickPick chooser** — browse & auto-select with `Ctrl+Shift+.`
- **Status bar** — displays current switching status with animated feedback
- **Diagnostic tool** — verify setup, permissions, and model mapping

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+M` | Open native Model Picker (no auto-select) |
| `Ctrl+Shift+.` | Open QuickPick list → auto-select chosen model |
| `Ctrl+Shift+1` | Auto-select Slot #1 |
| `Ctrl+Shift+2` | Auto-select Slot #2 |
| `Ctrl+Shift+3` | Auto-select Slot #3 |
| `Ctrl+Shift+4` | Auto-select Slot #4 |
| `Ctrl+Shift+5` | Auto-select Slot #5 |
| `Ctrl+Shift+6` | Auto-select Slot #6 |
| `Ctrl+Shift+7` | Auto-select Slot #7 |
| `Ctrl+Shift+8` | Auto-select Slot #8 |
| `Ctrl+Shift+D`, `Ctrl+Shift+M` | Run Diagnostic |

---

## ⚙️ Configuration

Open **Settings** (`Cmd+,`) and search for `agModelSwitcher`.

There are **two key settings** that work together:

### `modelOrder` — Picker Layout (truth about the IDE)

This is the **full list of all models**, in the **exact order** they appear in the native Antigravity IDE picker (top to bottom). The extension uses this to know *where* each model is located.

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

> ⚠️ This must match the native picker exactly. If the IDE updates its model list, update this setting.

### `slots` — Your Favorite Models (what you want to use)

Assign only your most-used models to `Ctrl+Shift+1~8`. You can use **any subset** in **any order**. If left empty, falls back to `modelOrder`.

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

Result:
- `Ctrl+Shift+1` → Gemini 3.5 Flash (High) *(picker position 4)*
- `Ctrl+Shift+2` → Gemini 3.1 Pro (High) *(picker position 7)*
- `Ctrl+Shift+3` → Claude Sonnet 4.6 (Thinking) *(picker position 0)*
- `Ctrl+Shift+4` → Claude Opus 4.6 (Thinking) *(picker position 1)*
- `Ctrl+Shift+5~8` → friendly warning: *"Only 4 models in slots"*

### How It Works Together

```
slots["Gemini 3.5 Flash (High)"]
  → modelOrder.indexOf("Gemini 3.5 Flash (High)") = 4
  → navigate to picker position 4
  → correct model selected ✅
```

### Settings Reference

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `modelOrder` | `string[]` | 8 built-in | Full picker layout. **Must match native IDE order.** |
| `slots` | `string[]` | `[]` (empty) | Your favorites for `Ctrl+Shift+1~8`. Names must exist in `modelOrder`. |
| `autoSelect` | `boolean` | `true` | Enable AppleScript auto-selection. Requires macOS + Accessibility. |
| `showStatusBar` | `boolean` | `true` | Show model button in status bar. |

> **Important:** Model names in `slots` must match a name in `modelOrder` **exactly** (case-sensitive). If a name isn't found, the extension shows an error instead of selecting the wrong model.

---

## 📋 Commands

Find these in the **Command Palette** (`Cmd+Shift+P`):

| Command | Description |
|---------|-------------|
| `AG Model Switcher: Open Model Picker` | Opens native picker (no auto-select) |
| `AG Model Switcher: Pick Model and Auto-Select` | QuickPick list with auto-select |
| `AG Model Switcher: Select Model #1` through `#8` | Direct auto-select by slot |
| `AG Model Switcher: Diagnose - Test Auto-Select` | Full diagnostic report |

---

## 🔧 System Requirements

| Requirement | Detail |
|-------------|--------|
| **OS** | macOS (AppleScript is macOS-only) |
| **IDE** | Antigravity IDE (fork of VS Code) |
| **Accessibility** | Must be granted to Antigravity IDE |
| **Engine** | VS Code ^1.90.0 compatible |

### Granting Accessibility Permission

**System Settings → Privacy & Security → Accessibility → Enable "Antigravity IDE"**

> ℹ️ On non-macOS systems, the extension falls back to opening the picker with a manual selection prompt.

---

## 🩺 Diagnostic

Run `Ctrl+Shift+D, Ctrl+Shift+M` to see:

- OS & platform info
- Whether `autoSelect` is enabled
- Picker order (from `modelOrder`)
- Slot assignments (from `slots`)
- Full mapping: **hotkey → slot → model name → picker position → DOWN count**
- Live AppleScript test

Output appears in **Output panel → "AG Model Switcher"**.

---

## 🐛 Troubleshooting

**Wrong model selected?**
- This usually means `modelOrder` doesn't match the native picker's actual order. Open picker with `Ctrl+Shift+M`, count positions from top, and update `modelOrder`.

**"Model not found in modelOrder" error?**
- A model name in `slots` doesn't exactly match any name in `modelOrder`. Check for typos and case sensitivity.

**Auto-select not working?**
1. Run **Diagnostic** to check your setup.
2. Ensure **Accessibility permission** is granted.
3. Test AppleScript in Terminal: `osascript -e 'tell application "System Events" to tell process "Electron" to get frontmost'`

---

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

## 📄 License

[MIT](LICENSE) © 2026 pipyl
