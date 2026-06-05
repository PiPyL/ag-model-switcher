// AG Model Switcher v5.2.0 — SLOTS + PICKER ORDER (SEPARATED)
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
// │ STRATEGY v5.2: SEPARATE picker order from slot assignment        │
// │   • modelOrder = full picker layout (must match IDE UI)          │
// │   • slots = user's favorite models (any order, any subset)       │
// │   • Ctrl+Shift+N → find model from slots[N-1]                   │
// │     → look up its position in modelOrder (picker order)          │
// │     → navigate to that position via UP overshoot + DOWN          │
// │                                                                  │
// │ NAVIGATION:                                                      │
// │   1. Open picker                                                 │
// │   2. Press UP many times → focus goes to header (top)            │
// │   3. Press DOWN (pickerPosition + 1) times → target item         │
// │      (+1 because first DOWN goes from header to item 0)          │
// │   4. Press ENTER                                                 │
// └──────────────────────────────────────────────────────────────────┘

const vscode = require('vscode');
const { exec } = require('child_process');
const os = require('os');

let statusBarItem;
let outputChannel;

// ─── Default picker order (MUST match native picker display order) ──
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
// ⚠️  If models change in IDE, update agModelSwitcher.modelOrder
//     in settings.json with the new picker order.
const DEFAULT_MODEL_ORDER = [
    'Claude Sonnet 4.6 (Thinking)',    // picker position 0
    'Claude Opus 4.6 (Thinking)',      // picker position 1
    'GPT-OSS 120B (Medium)',           // picker position 2
    'Gemini 3.5 Flash (Medium)',       // picker position 3
    'Gemini 3.5 Flash (High)',         // picker position 4
    'Gemini 3.5 Flash (Low)',          // picker position 5
    'Gemini 3.1 Pro (Low)',            // picker position 6
    'Gemini 3.1 Pro (High)',           // picker position 7
];

// ═══════════════════════════════════════════════════════════════
// ACTIVATION
// ═══════════════════════════════════════════════════════════════

function activate(context) {
    outputChannel = vscode.window.createOutputChannel('AG Model Switcher');
    log('v5.2.0 SLOTS+PICKER activating...');

    // ─── Status Bar ─────────────────────────────────────────
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right, 200
    );
    statusBarItem.name = 'AG Model Switcher';
    statusBarItem.text = '$(sparkle) Model';
    statusBarItem.tooltip = [
        '⌨️ AG Model Switcher v5.2 (Slots + Picker)',
        '───────────────────────────────',
        'Ctrl+Shift+M   → Open Model Picker',
        'Ctrl+Shift+1~8 → Select model from slots',
        'Ctrl+Shift+.   → Choose from QuickPick',
    ].join('\n');
    statusBarItem.command = 'agModelSwitcher.openPicker';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // ─── Commands ───────────────────────────────────────────

    // Ctrl+Shift+M → open native picker (no auto-select)
    reg(context, 'agModelSwitcher.openPicker', cmdOpenPicker);

    // Ctrl+Shift+. → show QuickPick then auto-select
    reg(context, 'agModelSwitcher.cycleNext', cmdQuickPickAndSelect);

    // Ctrl+Shift+1~8 → auto-select by slot
    for (let i = 1; i <= 8; i++) {
        reg(context, `agModelSwitcher.slot${i}`, () => cmdSlotAutoSelect(i));
    }

    // Diagnose
    reg(context, 'agModelSwitcher.diagnose', cmdDiagnose);

    log('✅ Activated.');
    const pickerOrder = getModelOrder();
    const slots = getSlots();
    const usingSlots = slots !== pickerOrder;

    if (usingSlots) {
        log('📌 Slots configured (favorites):');
        slots.forEach((name, i) => {
            const pos = pickerOrder.indexOf(name);
            log(`  [Ctrl+Shift+${i + 1}] → "${name}" → picker pos ${pos >= 0 ? pos : '❌ NOT FOUND'}`);
        });
    } else {
        log('📌 No slots configured, using modelOrder directly:');
        pickerOrder.forEach((name, i) => {
            log(`  [Ctrl+Shift+${i + 1}] → pos ${i} → "${name}"`);
        });
    }
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
        vscode.window.showErrorMessage('Cannot open Model Picker. Try Cmd+/');
    }
}

// ═══════════════════════════════════════════════════════════════
// CMD: QuickPick → Auto-Select (Ctrl+Shift+.)
// ═══════════════════════════════════════════════════════════════

async function cmdQuickPickAndSelect() {
    log('CMD: quickPickAndSelect');
    const pickerOrder = getModelOrder();
    const slots = getSlots();

    if (slots.length === 0) {
        vscode.window.showWarningMessage(
            'No slots or modelOrder configured. Open Settings?',
            'Open Settings'
        ).then(a => {
            if (a) vscode.commands.executeCommand('workbench.action.openSettings', 'agModelSwitcher');
        });
        return;
    }

    const items = slots.map((name, i) => {
        const pickerPos = pickerOrder.indexOf(name);
        return {
            label: `$(sparkle) ${name}`,
            description: `Ctrl+Shift+${i + 1}${pickerPos === -1 ? '  ⚠️ not in picker' : ''}`,
            pickerPosition: pickerPos,
            modelName: name,
        };
    });

    const picked = await vscode.window.showQuickPick(items, {
        placeHolder: '🔍 Choose a model to auto-select...',
        matchOnDescription: true,
    });

    if (picked) {
        if (picked.pickerPosition === -1) {
            vscode.window.showErrorMessage(
                `Model "${picked.modelName}" not found in modelOrder (picker order). Please check the name.`
            );
            return;
        }
        await autoSelectByPosition(picked.pickerPosition, picked.modelName);
    }
}

// ═══════════════════════════════════════════════════════════════
// CMD: Slot Auto-Select (Ctrl+Shift+1~8)
//
// NEW in v5.2: slots[] is separate from modelOrder[]
//   - slots[slotIndex] gives the MODEL NAME
//   - modelOrder.indexOf(modelName) gives the PICKER POSITION
//   - navigate to picker position
// ═══════════════════════════════════════════════════════════════

async function cmdSlotAutoSelect(slot) {
    const slots = getSlots();
    const pickerOrder = getModelOrder();
    const slotIndex = slot - 1; // Slot 1 → index 0

    if (slotIndex >= slots.length) {
        log(`CMD: slot${slot} → exceeds slot list (only ${slots.length} slots)`);
        vscode.window.showWarningMessage(
            `Only ${slots.length} models configured in slots. Key ${slot} has no model.`,
            'Open Picker'
        ).then(a => {
            if (a) cmdOpenPicker();
        });
        return;
    }

    const modelName = slots[slotIndex];
    const pickerPosition = pickerOrder.indexOf(modelName);

    if (pickerPosition === -1) {
        log(`CMD: slot${slot} → "${modelName}" NOT FOUND in pickerOrder!`);
        vscode.window.showErrorMessage(
            `Model "${modelName}" not found in modelOrder.\n` +
            `Check that the name matches exactly (case-sensitive) with the native picker.`,
            'Open Settings'
        ).then(a => {
            if (a) vscode.commands.executeCommand('workbench.action.openSettings', 'agModelSwitcher.modelOrder');
        });
        return;
    }

    log(`CMD: slot${slot} → "${modelName}" → picker position ${pickerPosition}`);
    await autoSelectByPosition(pickerPosition, modelName);
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
//   4. Press DOWN (pickerPosition + 1) times → navigate to target
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

    log(`  🎯 Auto-selecting picker position ${position}: "${modelName}"`);

    // Show status bar feedback
    if (statusBarItem) {
        statusBarItem.text = `$(sync~spin) ${modelName}`;
    }
    vscode.window.setStatusBarMessage(`$(sync~spin) Switching to: ${modelName}...`, 3000);

    try {
        // Step 1: Open the model picker
        await vscode.commands.executeCommand('antigravity.toggleModelSelector');
        log('  ✅ Picker opened');

        // Step 2: Wait for picker UI to render
        await delay(500);

        // Step 3: Build & execute AppleScript
        const script = buildNavigationAppleScript(position);
        await execAppleScript(script);
        log(`  ✅ Selected picker position ${position}: "${modelName}"`);

        // Step 4: Success feedback
        if (statusBarItem) {
            statusBarItem.text = `$(check) ${modelName}`;
            setTimeout(() => {
                if (statusBarItem) statusBarItem.text = '$(sparkle) Model';
            }, 3000);
        }
        vscode.window.setStatusBarMessage(`✅ Selected: ${modelName}`, 3000);

    } catch (err) {
        log(`  ❌ AppleScript failed: ${err.message}`);

        // Reset status bar
        if (statusBarItem) statusBarItem.text = '$(sparkle) Model';

        vscode.window.showWarningMessage(
            `Auto-select failed. Please select "${modelName}" manually.`,
            'Enable Accessibility'
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
    outputChannel.appendLine('║   AG Model Switcher v5.2 — DIAGNOSTIC     ║');
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

    // Picker Order (modelOrder)
    const pickerOrder = getModelOrder();
    const rawModelOrder = cfg.get('modelOrder', []);
    outputChannel.appendLine('─── Picker Order (modelOrder) ───');
    outputChannel.appendLine(`  Source: ${rawModelOrder.length > 0 ? 'User Settings' : 'DEFAULT (built-in)'}`);
    outputChannel.appendLine(`  Total: ${pickerOrder.length} models`);
    outputChannel.appendLine('');
    for (let i = 0; i < pickerOrder.length; i++) {
        outputChannel.appendLine(`  [pos ${i}] "${pickerOrder[i]}"`);
    }
    outputChannel.appendLine('');

    // Slots
    const slots = getSlots();
    const rawSlots = cfg.get('slots', []);
    const usingSlots = rawSlots.length > 0;
    outputChannel.appendLine('─── Slots (favorites) ───');
    outputChannel.appendLine(`  Source: ${usingSlots ? 'User Settings (agModelSwitcher.slots)' : 'Fallback to modelOrder'}`);
    outputChannel.appendLine(`  Total: ${slots.length} slots`);
    outputChannel.appendLine('');

    // Hotkey Mapping
    outputChannel.appendLine('─── Hotkey → Slot → Picker Position → Model ───');
    for (let i = 0; i < Math.min(8, slots.length); i++) {
        const name = slots[i];
        const pickerPos = pickerOrder.indexOf(name);
        const downsFromHeader = pickerPos + 1;
        if (pickerPos >= 0) {
            outputChannel.appendLine(`  Ctrl+Shift+${i + 1} → "${name}" → picker pos ${pickerPos} (${downsFromHeader} DOWNs) ✅`);
        } else {
            outputChannel.appendLine(`  Ctrl+Shift+${i + 1} → "${name}" → ❌ NOT FOUND in picker order!`);
        }
    }
    if (slots.length < 8) {
        for (let i = slots.length; i < 8; i++) {
            outputChannel.appendLine(`  Ctrl+Shift+${i + 1} → (empty slot)`);
        }
    }
    outputChannel.appendLine('');

    // Navigation Method
    outputChannel.appendLine('─── Navigation Method ───');
    outputChannel.appendLine('  1. Open picker (toggleModelSelector)');
    outputChannel.appendLine('  2. UP x20 → overshoot to header "Model"');
    outputChannel.appendLine('  3. DOWN x(pickerPosition+1) → navigate to target item');
    outputChannel.appendLine('  4. ENTER → select');
    outputChannel.appendLine('');
    outputChannel.appendLine('  Note: slots[] maps favorite names → pickerOrder[] finds position');
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
            outputChannel.appendLine('  ⚠️ Accessibility permissions required!');
        }
    } else {
        outputChannel.appendLine('  ⚠️ Not macOS');
    }

    outputChannel.show();
    vscode.window.showInformationMessage('Diagnostic complete. Check Output → "AG Model Switcher".');
}

// ═══════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════

function getConfig() {
    return vscode.workspace.getConfiguration('agModelSwitcher');
}

// Returns the PICKER ORDER — the full list of models in the
// order they appear in the native Antigravity IDE model picker.
function getModelOrder() {
    const cfg = getConfig();
    const fromConfig = cfg.get('modelOrder', []);
    if (fromConfig && fromConfig.length > 0) {
        return fromConfig;
    }
    return DEFAULT_MODEL_ORDER;
}

// Returns the SLOT LIST — the user's favorite models assigned
// to Ctrl+Shift+1~8. Falls back to modelOrder if not configured.
function getSlots() {
    const cfg = getConfig();
    const fromConfig = cfg.get('slots', []);
    if (fromConfig && fromConfig.length > 0) {
        return fromConfig;
    }
    // Fallback: use modelOrder directly (backward compatible)
    return getModelOrder();
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
