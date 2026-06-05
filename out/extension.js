// AG Model Switcher v5.1.0 — KEYBOARD NAVIGATION (FIXED)
//
// ┌──────────────────────────────────────────────────────────────────┐
// │ ARCHITECTURE (from reverse-engineering Antigravity IDE source):  │
// │                                                                  │
// │ • Model picker = React popover (NO search box)                   │
// │ • 1 header "Model" + N model items                               │
// │ • Keyboard focus after open: on the CURRENT SELECTED model       │
// │ • UP/DOWN navigates between items                                │
// │ • ENTER/click selects the focused item                           │
// │                                                                  │
// │ STRATEGY v5.1: OVERSHOOT to top → navigate DOWN to target        │
// │   1. Open picker                                                 │
// │   2. Press UP many times → focus goes to header (top)            │
// │   3. Press DOWN (position + 1) times → lands on target item      │
// │      (+1 because first DOWN goes from header to item 0)          │
// │   4. Press ENTER                                                 │
// └──────────────────────────────────────────────────────────────────┘

const vscode = require('vscode');
const { exec } = require('child_process');
const os = require('os');

let statusBarItem;
let outputChannel;

// ─── Default model order (MUST match picker display order exactly) ──
// CONFIRMED by user testing (2026-06-05):
//   Position 0: Claude Sonnet 4.6 (Thinking)
//   Position 1: Claude Opus 4.6 (Thinking)
//   Position 2: GPT-OSS 120B (Medium)
//   Position 3: Gemini 3.5 Flash (Medium)
//   Position 4: Gemini 3.5 Flash (High)
//   Position 5: Gemini 3.5 Flash (Low)
//   Position 6: Gemini 3.1 Pro (Low)
//   Position 7: Gemini 3.1 Pro (High)
//
// ⚠️  If models change, update this OR set agModelSwitcher.modelOrder
//     in settings.json with the new order.
const DEFAULT_MODEL_ORDER = [
    'Claude Sonnet 4.6 (Thinking)',    // Ctrl+Shift+1
    'Claude Opus 4.6 (Thinking)',      // Ctrl+Shift+2
    'GPT-OSS 120B (Medium)',           // Ctrl+Shift+3
    'Gemini 3.5 Flash (Medium)',       // Ctrl+Shift+4
    'Gemini 3.5 Flash (High)',         // Ctrl+Shift+5
    'Gemini 3.5 Flash (Low)',          // Ctrl+Shift+6
    'Gemini 3.1 Pro (Low)',            // Ctrl+Shift+7
    'Gemini 3.1 Pro (High)',           // Ctrl+Shift+8
];

// ═══════════════════════════════════════════════════════════════
// ACTIVATION
// ═══════════════════════════════════════════════════════════════

function activate(context) {
    outputChannel = vscode.window.createOutputChannel('AG Model Switcher');
    log('v5.1.0 KEYBOARD-NAV activating...');

    // ─── Status Bar ─────────────────────────────────────────
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right, 200
    );
    statusBarItem.name = 'AG Model Switcher';
    statusBarItem.text = '$(sparkle) Model';
    statusBarItem.tooltip = [
        '⌨️ AG Model Switcher v5.1 (Keyboard Nav)',
        '───────────────────────────────',
        'Ctrl+Shift+M   → Mở Model Picker',
        'Ctrl+Shift+1~8 → Chọn model theo vị trí',
        'Ctrl+Shift+.   → Chọn từ QuickPick',
    ].join('\n');
    statusBarItem.command = 'agModelSwitcher.openPicker';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // ─── Commands ───────────────────────────────────────────

    // Ctrl+Shift+M → open native picker (no auto-select)
    reg(context, 'agModelSwitcher.openPicker', cmdOpenPicker);

    // Ctrl+Shift+. → show QuickPick then auto-select
    reg(context, 'agModelSwitcher.cycleNext', cmdQuickPickAndSelect);

    // Ctrl+Shift+1~8 → auto-select by position
    for (let i = 1; i <= 8; i++) {
        reg(context, `agModelSwitcher.slot${i}`, () => cmdSlotAutoSelect(i));
    }

    // Diagnose
    reg(context, 'agModelSwitcher.diagnose', cmdDiagnose);

    log('✅ Activated. Model mapping:');
    getModelOrder().forEach((name, i) => {
        log(`  [Ctrl+Shift+${i + 1}] → pos ${i} → "${name}"`);
    });
}

// ═══════════════════════════════════════════════════════════════
// CMD: Open Picker (Ctrl+Shift+M)
// ═══════════════════════════════════════════════════════════════

async function cmdOpenPicker() {
    log('CMD: openPicker');
    try {
        await vscode.commands.executeCommand('antigravity.toggleModelSelector');
        log('  ✅ Picker opened');
    } catch (err) {
        log(`  ❌ Error: ${err.message}`);
        vscode.window.showErrorMessage('Không thể mở Model Picker. Thử Cmd+/');
    }
}

// ═══════════════════════════════════════════════════════════════
// CMD: QuickPick → Auto-Select (Ctrl+Shift+.)
// ═══════════════════════════════════════════════════════════════

async function cmdQuickPickAndSelect() {
    log('CMD: quickPickAndSelect');
    const modelOrder = getModelOrder();

    if (modelOrder.length === 0) {
        vscode.window.showWarningMessage(
            'Chưa cấu hình modelOrder. Mở Settings?',
            'Mở Settings'
        ).then(a => {
            if (a) vscode.commands.executeCommand('workbench.action.openSettings', 'agModelSwitcher.modelOrder');
        });
        return;
    }

    const items = modelOrder.map((name, i) => ({
        label: `$(sparkle) ${name}`,
        description: `Ctrl+Shift+${i + 1}`,
        modelIndex: i,
        modelName: name,
    }));

    const picked = await vscode.window.showQuickPick(items, {
        placeHolder: '🔍 Chọn model để auto-select...',
        matchOnDescription: true,
    });

    if (picked) {
        await autoSelectByPosition(picked.modelIndex, picked.modelName);
    }
}

// ═══════════════════════════════════════════════════════════════
// CMD: Slot Auto-Select (Ctrl+Shift+1~8)
// ═══════════════════════════════════════════════════════════════

async function cmdSlotAutoSelect(slot) {
    const modelOrder = getModelOrder();
    const position = slot - 1; // Slot 1 → position 0

    if (position >= modelOrder.length) {
        log(`CMD: slot${slot} → vượt quá danh sách (chỉ có ${modelOrder.length} models)`);
        vscode.window.showWarningMessage(
            `Chỉ có ${modelOrder.length} models. Phím ${slot} không có model.`,
            'Mở Picker'
        ).then(a => {
            if (a) cmdOpenPicker();
        });
        return;
    }

    const modelName = modelOrder[position];
    log(`CMD: slot${slot} → position ${position} → "${modelName}"`);

    await autoSelectByPosition(position, modelName);
}

// ═══════════════════════════════════════════════════════════════
// CORE: Auto-Select via Keyboard Navigation
//
// Picker layout (from screenshot):
//   [Header: "Model"]     ← focus lands here after UP overshoot
//   [Item 0: first model] ← 1 DOWN from header
//   [Item 1: next model]  ← 2 DOWNs from header
//   ...
//   [Item N: last model]  ← N+1 DOWNs from header
//
// Algorithm:
//   1. Open picker (toggleModelSelector)
//   2. Wait for render
//   3. Press UP 20 times → overshoot to header (safe ceiling)
//   4. Press DOWN (position + 1) times → navigate to target
//      +1 because first DOWN goes from header → item 0
//   5. Press ENTER → select
// ═══════════════════════════════════════════════════════════════

async function autoSelectByPosition(position, modelName) {
    const cfg = getConfig();
    const autoSelect = cfg.get('autoSelect', true);

    if (!autoSelect || os.platform() !== 'darwin') {
        log('  ℹ️ Auto-select disabled or not macOS → fallback');
        await cmdOpenPicker();
        vscode.window.showInformationMessage(`Chọn "${modelName}" trong danh sách`);
        return;
    }

    log(`  🎯 Auto-selecting position ${position}: "${modelName}"`);

    // Show status bar feedback
    if (statusBarItem) {
        statusBarItem.text = `$(sync~spin) ${modelName}`;
    }
    vscode.window.setStatusBarMessage(`$(sync~spin) Đang chuyển: ${modelName}...`, 3000);

    try {
        // Step 1: Open the model picker
        await vscode.commands.executeCommand('antigravity.toggleModelSelector');
        log('  ✅ Picker opened');

        // Step 2: Wait for picker UI to render
        await delay(500);

        // Step 3: Build & execute AppleScript
        const script = buildNavigationAppleScript(position);
        await execAppleScript(script);
        log(`  ✅ Selected position ${position}: "${modelName}"`);

        // Step 4: Success feedback
        if (statusBarItem) {
            statusBarItem.text = `$(check) ${modelName}`;
            setTimeout(() => {
                if (statusBarItem) statusBarItem.text = '$(sparkle) Model';
            }, 3000);
        }
        vscode.window.setStatusBarMessage(`✅ Đã chọn: ${modelName}`, 3000);

    } catch (err) {
        log(`  ❌ AppleScript failed: ${err.message}`);

        // Reset status bar
        if (statusBarItem) statusBarItem.text = '$(sparkle) Model';

        vscode.window.showWarningMessage(
            `Auto-select thất bại. Chọn "${modelName}" thủ công.`,
            'Bật Accessibility'
        ).then(a => {
            if (a) {
                exec('open "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"');
            }
        });
    }
}

// ═══════════════════════════════════════════════════════════════
// APPLESCRIPT BUILDER (Keyboard Navigation)
// ═══════════════════════════════════════════════════════════════

function buildNavigationAppleScript(position) {
    // Key codes: UP=126, DOWN=125, ENTER=36
    const OVERSHOOT = 20; // Press UP this many times to guarantee reaching header
    const downsNeeded = position + 1; // +1 because first DOWN goes header→item0

    const lines = [
        'tell application "System Events"',
        '  tell process "Electron"',
        '',
        `    -- Step 1: Overshoot UP ${OVERSHOOT} times to reach header`,
    ];

    // Press UP rapidly with no delay between them (overshoot)
    for (let i = 0; i < OVERSHOOT; i++) {
        lines.push('    key code 126'); // UP
    }

    lines.push('');
    lines.push('    delay 0.1');
    lines.push('');
    lines.push(`    -- Step 2: Navigate DOWN ${downsNeeded} times (header → item ${position})`);

    // Press DOWN to reach target position
    for (let i = 0; i < downsNeeded; i++) {
        lines.push('    key code 125'); // DOWN
        if (i < downsNeeded - 1) {
            lines.push('    delay 0.03'); // Tiny delay between DOWNs for reliability
        }
    }

    lines.push('');
    lines.push('    delay 0.05');
    lines.push('');
    lines.push('    -- Step 3: Select');
    lines.push('    key code 36'); // ENTER
    lines.push('');
    lines.push('  end tell');
    lines.push('end tell');

    return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════
// APPLESCRIPT EXECUTOR
// ═══════════════════════════════════════════════════════════════

function execAppleScript(script) {
    return new Promise((resolve, reject) => {
        const cmd = `osascript <<'APPLESCRIPT_END'\n${script}\nAPPLESCRIPT_END`;

        exec(cmd, { timeout: 15000 }, (err, stdout, stderr) => {
            if (err) {
                reject(new Error(`osascript error: ${err.message}${stderr ? ' | ' + stderr : ''}`));
            } else {
                resolve(stdout.trim());
            }
        });
    });
}

// ═══════════════════════════════════════════════════════════════
// DIAGNOSE
// ═══════════════════════════════════════════════════════════════

async function cmdDiagnose() {
    const allCmds = await vscode.commands.getCommands(true);
    const has = (c) => allCmds.includes(c) ? '✅' : '❌';
    const cfg = getConfig();

    outputChannel.clear();
    outputChannel.appendLine('╔═══════════════════════════════════════════╗');
    outputChannel.appendLine('║   AG Model Switcher v5.1 — DIAGNOSTIC     ║');
    outputChannel.appendLine('╚═══════════════════════════════════════════╝');
    outputChannel.appendLine('');

    // Platform
    outputChannel.appendLine('─── Platform ───');
    outputChannel.appendLine(`  OS: ${os.platform()} ${os.release()}`);
    outputChannel.appendLine(`  Auto-select: ${cfg.get('autoSelect', true) ? '✅ enabled' : '❌ disabled'}`);
    outputChannel.appendLine(`  AppleScript: ${os.platform() === 'darwin' ? '✅ available' : '❌ not macOS'}`);
    outputChannel.appendLine('');

    // Commands
    outputChannel.appendLine('─── Core Commands ───');
    outputChannel.appendLine(`  ${has('antigravity.toggleModelSelector')} antigravity.toggleModelSelector`);
    outputChannel.appendLine('');

    // Model Order
    const modelOrder = getModelOrder();
    const rawFromConfig = cfg.get('modelOrder', []);
    outputChannel.appendLine('─── Model Order ───');
    outputChannel.appendLine(`  Source: ${rawFromConfig.length > 0 ? 'User Settings' : 'DEFAULT (built-in)'}`);
    outputChannel.appendLine(`  Total: ${modelOrder.length} models`);
    outputChannel.appendLine('');

    // Hotkey Mapping
    outputChannel.appendLine('─── Hotkey → Position → Model ───');
    for (let i = 0; i < Math.min(8, modelOrder.length); i++) {
        const name = modelOrder[i];
        const downsFromHeader = i + 1;
        outputChannel.appendLine(`  Ctrl+Shift+${i + 1} → pos ${i} (${downsFromHeader} DOWNs) → "${name}"`);
    }
    outputChannel.appendLine('');

    // Navigation Method
    outputChannel.appendLine('─── Navigation Method ───');
    outputChannel.appendLine('  1. Open picker (toggleModelSelector)');
    outputChannel.appendLine('  2. UP x20 → overshoot to header "Model"');
    outputChannel.appendLine('  3. DOWN x(pos+1) → navigate to target item');
    outputChannel.appendLine('  4. ENTER → select');
    outputChannel.appendLine('');
    outputChannel.appendLine('  Note: +1 because first DOWN goes from header → item 0');
    outputChannel.appendLine('');

    // AppleScript test
    outputChannel.appendLine('─── AppleScript Test ───');
    if (os.platform() === 'darwin') {
        try {
            const result = await execAppleScript(
                'tell application "System Events" to tell process "Electron" to get frontmost'
            );
            outputChannel.appendLine(`  Electron frontmost: ${result}`);
            outputChannel.appendLine('  ✅ AppleScript OK!');
        } catch (err) {
            outputChannel.appendLine(`  ❌ Error: ${err.message}`);
            outputChannel.appendLine('  ⚠️ Cần bật Accessibility permissions!');
        }
    } else {
        outputChannel.appendLine('  ⚠️ Not macOS');
    }

    outputChannel.show();
    vscode.window.showInformationMessage('Diagnostic complete. Xem Output → "AG Model Switcher".');
}

// ═══════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════

function getConfig() {
    return vscode.workspace.getConfiguration('agModelSwitcher');
}

function getModelOrder() {
    const cfg = getConfig();
    const fromConfig = cfg.get('modelOrder', []);
    if (fromConfig && fromConfig.length > 0) {
        return fromConfig;
    }
    return DEFAULT_MODEL_ORDER;
}

function reg(ctx, id, handler) {
    ctx.subscriptions.push(vscode.commands.registerCommand(id, handler));
}

function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function log(msg) {
    const ts = new Date().toISOString().slice(11, 19);
    console.log(`[AG-MS] ${msg}`);
    if (outputChannel) outputChannel.appendLine(`[${ts}] ${msg}`);
}

function deactivate() {
    log('Deactivated.');
}

module.exports = { activate, deactivate };
