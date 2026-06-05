# Change Log

All notable changes to **AG Model Switcher** are documented here.

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
