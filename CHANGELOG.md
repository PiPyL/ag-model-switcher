# Change Log

All notable changes to **AG Model Switcher** are documented here.

---

## [4.2.0] - 2026-06-05

### Added
- `.vscodeignore` for clean VSIX packaging
- `LICENSE` (MIT), `CHANGELOG.md`, `README.md` (EN), `README.vi.md` (VI)
- Gallery banner and keywords for VS Code Marketplace
- `repository`, `bugs`, `homepage` fields in `package.json`

---

## [5.1.0] - 2026-06-05 *(internal — bundled in v4.2.0)*

### Changed (extension.js internal version)
- **Algorithm rewrite**: v5.1 "Keyboard Navigation" — overshoot UP ×20 to header, then DOWN ×(position+1), then ENTER
- Replaced brittle position-based clicking with reliable keyboard-navigation approach
- AppleScript now uses key codes: UP=126, DOWN=125, ENTER=36
- Added 0.03s delay between DOWN presses for reliability
- Status bar now shows `$(sync~spin)` animation while switching
- Diagnostic output shows full hotkey → position → model mapping with DOWN count

### Fixed
- Wrong model selected when a different model was previously active
- Auto-select failure on certain Antigravity IDE builds

---

## [1.0.0] - 2026-06-04

### Added
- Initial release
- Quick model switching via keyboard shortcuts (`Ctrl+Shift+M`, `Ctrl+Shift+1~5`)
- Status bar integration
- Model picker dropdown
- Cycle through models with `Ctrl+Shift+.`
