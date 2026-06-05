# AG Model Switcher

> ⚡ Instantly switch AI models in **Antigravity IDE** using keyboard shortcuts — no mouse required.

![Version](https://img.shields.io/badge/version-4.2.0-blue)
![Platform](https://img.shields.io/badge/platform-macOS-lightgrey)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 🧠 How It Works

This extension controls the **native Antigravity IDE model picker** through programmatic keyboard navigation using **AppleScript** (macOS only).

**Algorithm (v5.1 — Keyboard Navigation):**

```
1. Open picker  →  antigravity.toggleModelSelector
2. Press UP ×20 →  overshoot to header "Model" (safe ceiling)
3. Press DOWN ×(position + 1)  →  navigate to target item
   (+1 because first DOWN moves: header → item 0)
4. Press ENTER  →  select the focused item
```

This approach is reliable because it always starts from a known position (the header) regardless of which model was previously selected.

---

## ✨ Features

- **8 direct-access slots** — jump to any model instantly with `Ctrl+Shift+1` through `Ctrl+Shift+8`
- **Model Picker** — open the native picker with `Ctrl+Shift+M`
- **QuickPick chooser** — browse & auto-select with `Ctrl+Shift+.`
- **Status bar** — displays current switching status with animated feedback
- **Diagnostic tool** — verify setup, permissions, and model mapping
- **Configurable model order** — edit `modelOrder` in settings to match your IDE's picker

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+M` | Open native Model Picker (no auto-select) |
| `Ctrl+Shift+.` | Open QuickPick list → auto-select chosen model |
| `Ctrl+Shift+1` | Auto-select Model Slot #1 |
| `Ctrl+Shift+2` | Auto-select Model Slot #2 |
| `Ctrl+Shift+3` | Auto-select Model Slot #3 |
| `Ctrl+Shift+4` | Auto-select Model Slot #4 |
| `Ctrl+Shift+5` | Auto-select Model Slot #5 |
| `Ctrl+Shift+6` | Auto-select Model Slot #6 |
| `Ctrl+Shift+7` | Auto-select Model Slot #7 |
| `Ctrl+Shift+8` | Auto-select Model Slot #8 |
| `Ctrl+Shift+D`, `Ctrl+Shift+M` | Run Diagnostic |

---

## ⚙️ Configuration

Open **Settings** (`Cmd+,`) and search for `agModelSwitcher`:

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

### Settings Reference

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `agModelSwitcher.modelOrder` | `string[]` | 8 built-in models | **Must match exactly** the display order in the Antigravity IDE model picker UI. Slot 1 = index 0, Slot 2 = index 1, etc. |
| `agModelSwitcher.autoSelect` | `boolean` | `true` | Enable AppleScript-based auto-selection. Requires macOS + Accessibility permission. |
| `agModelSwitcher.showStatusBar` | `boolean` | `true` | Show the model button in the status bar. |

### Default Model Order (confirmed 2026-06-05)

| Slot | Shortcut | Model |
|------|----------|-------|
| 1 | `Ctrl+Shift+1` | Claude Sonnet 4.6 (Thinking) |
| 2 | `Ctrl+Shift+2` | Claude Opus 4.6 (Thinking) |
| 3 | `Ctrl+Shift+3` | GPT-OSS 120B (Medium) |
| 4 | `Ctrl+Shift+4` | Gemini 3.5 Flash (Medium) |
| 5 | `Ctrl+Shift+5` | Gemini 3.5 Flash (High) |
| 6 | `Ctrl+Shift+6` | Gemini 3.5 Flash (Low) |
| 7 | `Ctrl+Shift+7` | Gemini 3.1 Pro (Low) |
| 8 | `Ctrl+Shift+8` | Gemini 3.1 Pro (High) |

> ⚠️ If Antigravity IDE updates its model list, you must update `agModelSwitcher.modelOrder` to reflect the new display order.

---

## 📋 Commands

Find these in the **Command Palette** (`Cmd+Shift+P`):

| Command | Description |
|---------|-------------|
| `AG Model Switcher: Open Model Picker` | Opens native picker (no auto-select) |
| `AG Model Switcher: Pick Model and Auto-Select` | QuickPick list with auto-select |
| `AG Model Switcher: Select Model #1` through `#8` | Direct auto-select by slot number |
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

Or open directly from the extension when auto-select fails.

> ℹ️ On non-macOS systems, the extension falls back to opening the native picker and showing a manual selection prompt.

---

## 🩺 Diagnostic

Run `Ctrl+Shift+D, Ctrl+Shift+M` or the Diagnose command to see:

- OS & platform info
- Whether `autoSelect` is enabled
- Whether AppleScript is available
- Whether `antigravity.toggleModelSelector` command exists
- Full hotkey → position → model name mapping
- Live AppleScript test (checks Accessibility permission)

Output appears in the **Output panel → "AG Model Switcher"** channel.

---

## 🐛 Troubleshooting

**Model doesn't switch?**
1. Run the **Diagnostic** command to check your setup.
2. Ensure **Accessibility permission** is granted (System Settings → Privacy & Security → Accessibility).
3. Verify `agModelSwitcher.modelOrder` matches **exactly** the model names shown in the IDE picker (case-sensitive).

**AppleScript error?**
- Test in Terminal: `osascript -e 'tell application "System Events" to tell process "Electron" to get frontmost'`
- If it fails, Accessibility permission is not granted.

**Wrong model selected?**
- Open the picker manually (`Ctrl+Shift+M`) and count the position of each model (0-indexed from top, after the "Model" header).
- Update `agModelSwitcher.modelOrder` accordingly.

**Auto-select not working after IDE update?**
- The model list or picker structure may have changed.
- Re-check positions and update `modelOrder` in settings.

---

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

## 📄 License

[MIT](LICENSE) © 2026 pipyl
