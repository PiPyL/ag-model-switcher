# AG Model Switcher

> ⚡ Instantly switch AI models in **Antigravity IDE** using keyboard shortcuts — no mouse required.

![Version](https://img.shields.io/badge/version-7.0.0-blue)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 🧠 How It Works

This extension controls the **native Antigravity IDE model picker** through programmatic keyboard navigation using **platform-specific automation tools**.

**Algorithm (v7.0 — Cross-Platform):**

```
1. User presses Ctrl+Shift+N (or cycle shortcut)
2. Look up model name from slots[N-1]
3. Find that model's position in modelOrder (picker layout)
4. Open picker → UP ×12 (overshoot to header) → DOWN ×(position+1) → ENTER
5. Keyboard simulation via platform driver (AppleScript / PowerShell / xdotool)
```

This approach is reliable because it always starts from a known position (the header) regardless of which model was previously selected.

---

## 🌐 Platform Support

| Platform | Auto-Select Method | Requirements |
|:---------|:-------------------|:-------------|
| **macOS** | AppleScript (`osascript`) | Accessibility permission for Antigravity IDE |
| **Windows** | PowerShell SendKeys | No extra installation needed |
| **Linux (X11)** | `xdotool` | `sudo apt install xdotool` |
| **Linux (Wayland)** | `ydotool` | `sudo apt install ydotool` (requires uinput) |
| **Linux (alt)** | `xte` (xautomation) | `sudo apt install xautomation` |

> ℹ️ On unsupported platforms or when the tool is missing, the extension falls back to opening the picker with a manual selection prompt.

### Linux: Choosing Your Tool

Set `agModelSwitcher.linuxTool` in Settings to pick the best tool for your setup:

| Setting Value | Best For |
|:---|:---|
| `xdotool` (default) | X11 / Xorg sessions (Ubuntu, most distros) |
| `ydotool` | Wayland sessions (GNOME 4x+, Fedora default) |
| `xte` | Lightweight alternative (xautomation package) |

---

## ✨ Features

- **8 direct-access slots** — jump to any model instantly with `Ctrl+Shift+1` through `Ctrl+Shift+8`
- **Slot favorites** — assign only your most-used models to hotkeys via `slots` config
- **Cycle models** — instantly cycle next/previous with `Ctrl+Shift+.` / `Ctrl+Shift+,`
- **Model Picker** — open the native picker with `Ctrl+Shift+M`
- **Status bar** — displays current switching status with animated feedback
- **Cross-platform** — works on macOS, Windows, and Linux
- **Diagnostic tool** — verify setup, permissions, tool availability, and model mapping

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+M` | Open native Model Picker (no auto-select) |
| `Ctrl+Shift+.` | Cycle Next Model ⚡ (instant, no popup) |
| `Ctrl+Shift+,` | Cycle Previous Model ⚡ (instant, no popup) |
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

Open **Settings** (`Ctrl+,` / `Cmd+,`) and search for `agModelSwitcher`.

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
| `autoSelect` | `boolean` | `true` | Enable keyboard auto-selection. |
| `showStatusBar` | `boolean` | `true` | Show model button in status bar. |
| `linuxTool` | `string` | `"xdotool"` | Linux only: `xdotool` (X11), `ydotool` (Wayland), or `xte`. |

> **Important:** Model names in `slots` must match a name in `modelOrder` **exactly** (case-sensitive). If a name isn't found, the extension shows an error instead of selecting the wrong model.

---

## 📋 Commands

Find these in the **Command Palette** (`Ctrl+Shift+P` / `Cmd+Shift+P`):

| Command | Description |
|---------|-------------|
| `AG Model Switcher: Open Model Picker` | Opens native picker (no auto-select) |
| `AG Model Switcher: Cycle Next Model (Instant)` | Cycle to next model ⚡ |
| `AG Model Switcher: Cycle Previous Model (Instant)` | Cycle to previous model ⚡ |
| `AG Model Switcher: Select Model #1` through `#8` | Direct auto-select by slot |
| `AG Model Switcher: Diagnose - Test Auto-Select` | Full diagnostic report |

---

## 🔧 System Requirements

| Requirement | Detail |
|-------------|--------|
| **IDE** | Antigravity IDE (fork of VS Code) |
| **Engine** | VS Code ^1.90.0 compatible |
| **macOS** | Accessibility permission required |
| **Windows** | PowerShell available (built-in) |
| **Linux** | `xdotool`, `ydotool`, or `xte` installed |

### macOS: Granting Accessibility Permission

**System Settings → Privacy & Security → Accessibility → Enable "Antigravity IDE"**

### Linux: Installing Keyboard Tool

```bash
# Ubuntu / Debian
sudo apt install xdotool      # X11
sudo apt install ydotool       # Wayland
sudo apt install xautomation   # xte alternative

# Fedora
sudo dnf install xdotool
sudo dnf install ydotool

# Arch
sudo pacman -S xdotool
sudo pacman -S ydotool
```

---

## 🩺 Diagnostic

Run `Ctrl+Shift+D, Ctrl+Shift+M` to see:

- OS & platform info (macOS / Windows / Linux)
- Keyboard driver and tool availability
- Whether `autoSelect` is enabled
- Linux display server detection (X11 vs Wayland)
- Picker order (from `modelOrder`)
- Slot assignments (from `slots`)
- Full mapping: **hotkey → slot → model name → picker position → DOWN count**
- Live automation tool test

Output appears in **Output panel → "AG Model Switcher"**.

---

## 🐛 Troubleshooting

### All Platforms

**Wrong model selected?**
- This usually means `modelOrder` doesn't match the native picker's actual order. Open picker with `Ctrl+Shift+M`, count positions from top, and update `modelOrder`.

**"Model not found in modelOrder" error?**
- A model name in `slots` doesn't exactly match any name in `modelOrder`. Check for typos and case sensitivity.

### macOS

**Auto-select not working?**
1. Run **Diagnostic** to check your setup.
2. Ensure **Accessibility permission** is granted.
3. Test AppleScript in Terminal: `osascript -e 'tell application "System Events" to tell process "Electron" to get frontmost'`

### Windows

**Auto-select not working?**
1. Run **Diagnostic** to verify PowerShell availability.
2. Try running the IDE as administrator if SendKeys is blocked.
3. Check if other automation software conflicts with keyboard input.

### Linux

**Auto-select not working?**
1. Run **Diagnostic** to check tool availability and display server.
2. Ensure the correct tool is installed (`xdotool` for X11, `ydotool` for Wayland).
3. If using Wayland with `xdotool`, switch to `ydotool`: set `agModelSwitcher.linuxTool` to `"ydotool"`.
4. Test in terminal: `xdotool key Return` (should press Enter in the focused window).

**Wayland + xdotool not working?**
- `xdotool` only works on X11. Set `agModelSwitcher.linuxTool` to `"ydotool"` and install ydotool.

---

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

## 📄 License

[MIT](LICENSE) © 2026 pipyl
