# Change Log

All notable changes to **AG Model Switcher** are documented here.

---

## [7.0.0] - 2026-06-05

### Added
- **🌐 Windows support** — auto-select via PowerShell `[System.Windows.Forms.SendKeys]`. No extra installation required.
- **🐧 Linux support** — auto-select via `xdotool` (X11), `ydotool` (Wayland), or `xte` (xautomation).
- **`linuxTool` setting** — choose between `xdotool`, `ydotool`, or `xte` for Linux keyboard simulation.
- **Platform Abstraction Layer** — unified keyboard driver architecture supporting macOS, Windows, and Linux.
- **Enhanced diagnostics** — platform detection, tool availability checks, Linux display server detection (X11 vs Wayland), and platform-specific live tests.
- **Platform-specific error messages** — actionable guidance for each OS (Accessibility on macOS, tool installation on Linux).

### Changed
- Refactored `autoSelectByPosition()` to use platform-agnostic keyboard driver dispatch.
- Updated status bar tooltip to show platform info and driver status.
- `execAppleScript()` replaced by generic `execShellCommand()` supporting all platforms.
- Updated README with cross-platform documentation and troubleshooting.

---

## [6.0.0] - 2026-06-05

### Added
- **`cyclePrev` command (`Ctrl+Shift+,`)** — instantly cycle to the previous model in slots without opening popups.

### Changed
- **Performance optimizations** — optimized AppleScript delay parameters, reducing transition times significantly (wait delay reduced from 500ms to 200ms, overshoot UP key presses reduced from 20 to 12).
- Status bar display optimized to show current active model.
- Diagnostical logging now lists cycling info and current active model tracking.

---

## [4.3.0] - 2026-06-05

### Added
- **`slots` setting** — assign only your favorite models to `Ctrl+Shift+1~8`, independent of picker order
- Model name validation: shows error if a slot name doesn't exist in `modelOrder`

### Fixed
- **🐛 Wrong model selected when customizing favorites** — previously, reordering or reducing `modelOrder` caused the extension to navigate to incorrect picker positions. Now `modelOrder` stays as picker layout truth, and `slots` handles user favorites separately.
- Fixed `modelOrder` default in `package.json` to match confirmed picker order (Claude first, not Gemini)

### Changed
- Internal version bumped to v5.2.0 (extension.js)
- Diagnostic output now shows both picker order and slot assignments with position lookup
- QuickPick shows slot list with picker position validation

---

## [4.2.0] - 2026-06-05

### Added
- `.vscodeignore`, `LICENSE`, `CHANGELOG.md`, `README.md` (EN/VI)
- Marketplace metadata: gallery banner, keywords, repository

---

## [1.0.0] - 2026-06-04

### Added
- Initial release
- Quick model switching via keyboard shortcuts
- Status bar integration
- Model picker dropdown
- Cycle through models with `Ctrl+Shift+.`
