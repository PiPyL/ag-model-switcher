// AG Model Switcher v7.0.0 — CROSS-PLATFORM (macOS + Windows + Linux)
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
// │ STRATEGY v7.0: CROSS-PLATFORM INSTANT CYCLE                      │
// │   • Ctrl+Shift+. → cycle NEXT model automatically               │
// │   • Ctrl+Shift+, → cycle PREVIOUS model                         │
// │   • Ctrl+Shift+N → direct slot selection                         │
// │   • NO QuickPick popup — all cycles go through keyboard driver   │
// │   • Platform drivers:                                            │
// │     - macOS:   AppleScript via osascript                         │
// │     - Windows: PowerShell [SendKeys]                             │
// │     - Linux:   xdotool (X11) / ydotool (Wayland) / xte          │
// │   • Reduced delays: 500ms → 200ms for picker render              │
// │   • Reduced overshoot: 20 → 12 UPs                              │
// │   • In-memory tracking of current model for cycling              │
// │                                                                  │
// │ NAVIGATION:                                                      │
// │   1. Open picker (toggleModelSelector)                           │
// │   2. Press UP 12 times → focus goes to header (top)              │
// │   3. Press DOWN (pickerPosition + 1) times → target item         │
// │      (+1 because first DOWN goes from header to item 0)          │
// │   4. Press ENTER                                                 │
// └──────────────────────────────────────────────────────────────────┘

const vscode = require('vscode');
const { exec, execSync } = require('child_process');
const os = require('os');

let statusBarItem;
let outputChannel;

// ─── Current model tracking ──────────────────────────────────────
// Tracks which model was last selected via this extension.
// Used by cycleNext/cyclePrev to determine the next/previous model.
let currentModelIndex = -1; // -1 = unknown (first use)

// ─── Platform detection cache ────────────────────────────────────
let _platformInfo = null;

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
// PLATFORM DETECTION
// ═══════════════════════════════════════════════════════════════

function getPlatformInfo() {
    if (_platformInfo) return _platformInfo;

    const platform = os.platform();
    const info = {
        platform,
        isMac: platform === 'darwin',
        isWindows: platform === 'win32',
        isLinux: platform === 'linux',
        displayName: 'Unknown',
        driverName: 'none',
        autoSelectSupported: false,
        toolAvailable: false,
        toolName: 'none',
        toolCheckError: null,
    };

    if (info.isMac) {
        info.displayName = 'macOS';
        info.driverName = 'AppleScript';
        info.toolName = 'osascript';
        info.autoSelectSupported = true;
        info.toolAvailable = isCommandAvailable('osascript');
    } else if (info.isWindows) {
        info.displayName = 'Windows';
        info.driverName = 'PowerShell SendKeys';
        info.toolName = 'powershell';
        info.autoSelectSupported = true;
        info.toolAvailable = isCommandAvailable('powershell');
    } else if (info.isLinux) {
        info.displayName = 'Linux';
        const linuxTool = getLinuxTool();
        info.toolName = linuxTool;
        info.autoSelectSupported = true;

        if (linuxTool === 'xdotool') {
            info.driverName = 'xdotool (X11)';
            info.toolAvailable = isCommandAvailable('xdotool');
        } else if (linuxTool === 'ydotool') {
            info.driverName = 'ydotool (Wayland)';
            info.toolAvailable = isCommandAvailable('ydotool');
        } else if (linuxTool === 'xte') {
            info.driverName = 'xte (xautomation)';
            info.toolAvailable = isCommandAvailable('xte');
        } else {
            info.driverName = 'unknown';
            info.autoSelectSupported = false;
        }

        if (!info.toolAvailable) {
            info.toolCheckError = getLinuxInstallHint(linuxTool);
        }
    }

    _platformInfo = info;
    return info;
}

function isCommandAvailable(command) {
    try {
        if (os.platform() === 'win32') {
            execSync(`where ${command}`, { stdio: 'ignore', timeout: 5000 });
        } else {
            execSync(`which ${command}`, { stdio: 'ignore', timeout: 5000 });
        }
        return true;
    } catch {
        return false;
    }
}

function getLinuxTool() {
    const cfg = getConfig();
    return cfg.get('linuxTool', 'xdotool');
}

function getLinuxInstallHint(tool) {
    const hints = {
        xdotool: 'Install with: sudo apt install xdotool  (Ubuntu/Debian)\n                   sudo dnf install xdotool  (Fedora)\n                   sudo pacman -S xdotool    (Arch)',
        ydotool: 'Install with: sudo apt install ydotool  (Ubuntu/Debian)\n                   sudo dnf install ydotool  (Fedora)\n                   sudo pacman -S ydotool    (Arch)\n                   Note: ydotool requires uinput access.',
        xte: 'Install with: sudo apt install xautomation  (Ubuntu/Debian)\n                   sudo dnf install xautomation  (Fedora)',
    };
    return hints[tool] || `Install ${tool} for your distribution.`;
}

// ═══════════════════════════════════════════════════════════════
// ACTIVATION
// ═══════════════════════════════════════════════════════════════

function activate(context) {
    outputChannel = vscode.window.createOutputChannel('AG Model Switcher');
    log('v7.0.0 CROSS-PLATFORM activating...');

    // Detect platform
    const pInfo = getPlatformInfo();
    log(`Platform: ${pInfo.displayName} | Driver: ${pInfo.driverName} | Tool: ${pInfo.toolName} (${pInfo.toolAvailable ? '✅ available' : '❌ not found'})`);

    if (pInfo.isLinux && !pInfo.toolAvailable) {
        log(`⚠️ ${pInfo.toolName} not found. ${pInfo.toolCheckError}`);
    }

    // ─── Status Bar ─────────────────────────────────────────
    const cfg = getConfig();
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right, 200
    );
    statusBarItem.name = 'AG Model Switcher';
    statusBarItem.text = '$(sparkle) Model';
    statusBarItem.tooltip = buildStatusBarTooltip(pInfo);
    statusBarItem.command = 'agModelSwitcher.openPicker';
    // Respect showStatusBar setting
    if (cfg.get('showStatusBar', true)) {
        statusBarItem.show();
    }
    context.subscriptions.push(statusBarItem);

    // ─── Config Change Listener ─────────────────────────────
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('agModelSwitcher.linuxTool')) {
                _platformInfo = null; // Invalidate cache
                const newPInfo = getPlatformInfo();
                log(`🔄 Linux tool changed → ${newPInfo.toolName} (${newPInfo.toolAvailable ? '✅' : '❌'})`);
                if (statusBarItem) {
                    statusBarItem.tooltip = buildStatusBarTooltip(newPInfo);
                }
            }
            if (e.affectsConfiguration('agModelSwitcher.showStatusBar')) {
                const show = getConfig().get('showStatusBar', true);
                if (statusBarItem) {
                    show ? statusBarItem.show() : statusBarItem.hide();
                }
            }
        })
    );

    // ─── Commands ───────────────────────────────────────────

    // Ctrl+Shift+M → open native picker (no auto-select)
    reg(context, 'agModelSwitcher.openPicker', cmdOpenPicker);

    // Ctrl+Shift+. → cycle NEXT model (NO POPUP — instant)
    reg(context, 'agModelSwitcher.cycleNext', () => cmdCycle('next'));

    // Ctrl+Shift+, → cycle PREVIOUS model (NO POPUP — instant)
    reg(context, 'agModelSwitcher.cyclePrev', () => cmdCycle('prev'));

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

function buildStatusBarTooltip(pInfo) {
    const lines = [
        `⌨️ AG Model Switcher v7.0 (${pInfo.displayName})`,
        '───────────────────────────────',
        'Ctrl+Shift+M   → Open Model Picker',
        'Ctrl+Shift+.   → Cycle Next Model ⚡',
        'Ctrl+Shift+,   → Cycle Previous Model ⚡',
        'Ctrl+Shift+1~8 → Select model from slots',
        '───────────────────────────────',
        `Driver: ${pInfo.driverName}`,
    ];

    if (!pInfo.toolAvailable && pInfo.autoSelectSupported) {
        lines.push(`⚠️ ${pInfo.toolName} not found — auto-select unavailable`);
    } else if (pInfo.toolAvailable) {
        lines.push(`✅ Auto-select ready`);
    }

    return lines.join('\n');
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
        vscode.window.showErrorMessage('Cannot open Model Picker. Try Ctrl+Shift+/');
    }
}

// ═══════════════════════════════════════════════════════════════
// CMD: Cycle Next/Previous (Ctrl+Shift+. / Ctrl+Shift+,)
//
// ⚡ NO POPUP — directly auto-selects the next/previous model
// in the slots list via platform keyboard driver.
// ═══════════════════════════════════════════════════════════════

async function cmdCycle(direction) {
    const slots = getSlots();
    const pickerOrder = getModelOrder();

    if (slots.length === 0) {
        vscode.window.showWarningMessage(
            'No slots or modelOrder configured. Open Settings?',
            'Open Settings'
        ).then(a => {
            if (a) vscode.commands.executeCommand('workbench.action.openSettings', 'agModelSwitcher');
        });
        return;
    }

    // Calculate next/previous index
    let targetIndex;
    if (currentModelIndex === -1) {
        // First use — start from beginning (next) or end (prev)
        targetIndex = direction === 'next' ? 0 : slots.length - 1;
    } else if (direction === 'next') {
        targetIndex = (currentModelIndex + 1) % slots.length;
    } else {
        targetIndex = (currentModelIndex - 1 + slots.length) % slots.length;
    }

    const modelName = slots[targetIndex];
    const pickerPosition = pickerOrder.indexOf(modelName);

    if (pickerPosition === -1) {
        log(`CMD: cycle ${direction} → "${modelName}" NOT FOUND in pickerOrder!`);
        vscode.window.showErrorMessage(
            `Model "${modelName}" not found in modelOrder. Check the name.`,
            'Open Settings'
        ).then(a => {
            if (a) vscode.commands.executeCommand('workbench.action.openSettings', 'agModelSwitcher.modelOrder');
        });
        return;
    }

    log(`CMD: cycle ${direction} → slot[${targetIndex}] → "${modelName}" → picker pos ${pickerPosition}`);

    // Update tracking BEFORE auto-select so even if it fails, we cycle correctly next time
    currentModelIndex = targetIndex;

    await autoSelectByPosition(pickerPosition, modelName);
}

// ═══════════════════════════════════════════════════════════════
// CMD: Slot Auto-Select (Ctrl+Shift+1~8)
//
// slots[slotIndex] gives the MODEL NAME
// modelOrder.indexOf(modelName) gives the PICKER POSITION
// navigate to picker position
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

    // Update current model tracking
    currentModelIndex = slotIndex;

    await autoSelectByPosition(pickerPosition, modelName);
}

// ═══════════════════════════════════════════════════════════════
// CORE: Auto-Select via Platform Keyboard Driver
//
// Picker layout (from screenshot):
//   [Header: "Model"]     ← focus lands here after UP overshoot
//   [Item 0: first model] ← 1 DOWN from header
//   [Item 1: next model]  ← 2 DOWNs from header
//   ...
//   [Item N: last model]  ← N+1 DOWNs from header
//
// Algorithm (same on all platforms):
//   1. Open picker (toggleModelSelector)
//   2. Wait for render (200ms)
//   3. Press UP 12 times → overshoot to header (safe ceiling)
//   4. Press DOWN (pickerPosition + 1) times → navigate to target
//      +1 because first DOWN goes from header → item 0
//   5. Press ENTER → select
// ═══════════════════════════════════════════════════════════════

async function autoSelectByPosition(position, modelName) {
    const cfg = getConfig();
    const autoSelect = cfg.get('autoSelect', true);
    const pInfo = getPlatformInfo();

    if (!autoSelect) {
        log('  ℹ️ Auto-select disabled → fallback to manual');
        await cmdOpenPicker();
        vscode.window.showInformationMessage(`Select "${modelName}" from the list`);
        return;
    }

    if (!pInfo.autoSelectSupported) {
        log(`  ℹ️ Platform "${pInfo.platform}" not supported → fallback to manual`);
        await cmdOpenPicker();
        vscode.window.showInformationMessage(`Select "${modelName}" from the list`);
        return;
    }

    if (!pInfo.toolAvailable) {
        log(`  ❌ ${pInfo.toolName} not available → fallback to manual`);
        await cmdOpenPicker();
        showPlatformToolMissingMessage(pInfo);
        return;
    }

    log(`  🎯 Auto-selecting picker position ${position}: "${modelName}" via ${pInfo.driverName}`);

    // Show status bar feedback
    if (statusBarItem) {
        statusBarItem.text = `$(sync~spin) ${modelName}`;
    }
    vscode.window.setStatusBarMessage(`$(sync~spin) Switching to: ${modelName}...`, 3000);

    try {
        // Step 1: Open the model picker
        await vscode.commands.executeCommand('antigravity.toggleModelSelector');
        log('  ✅ Picker opened');

        // Step 2: Wait for picker UI to render (platform-specific timing)
        await delay(getPickerDelay(pInfo));

        // Step 3: Execute platform-specific keyboard navigation
        await executeKeyboardNavigation(position, pInfo);
        log(`  ✅ Selected picker position ${position}: "${modelName}"`);

        // Step 4: Success feedback
        if (statusBarItem) {
            statusBarItem.text = `$(check) ${modelName}`;
            setTimeout(() => {
                if (statusBarItem) statusBarItem.text = `$(sparkle) ${modelName}`;
            }, 2000);
        }
        vscode.window.setStatusBarMessage(`✅ ${modelName}`, 2000);

    } catch (err) {
        log(`  ❌ Keyboard driver failed: ${err.message}`);

        // Reset status bar
        if (statusBarItem) statusBarItem.text = '$(sparkle) Model';

        showPlatformErrorMessage(pInfo, modelName);
    }
}

function showPlatformToolMissingMessage(pInfo) {
    if (pInfo.isLinux) {
        vscode.window.showWarningMessage(
            `Auto-select requires "${pInfo.toolName}". Install it to enable keyboard automation.`,
            'Show Install Instructions'
        ).then(a => {
            if (a) {
                outputChannel.clear();
                outputChannel.appendLine(`═══ Install ${pInfo.toolName} ═══`);
                outputChannel.appendLine('');
                outputChannel.appendLine(pInfo.toolCheckError || getLinuxInstallHint(pInfo.toolName));
                outputChannel.appendLine('');
                outputChannel.appendLine('After installing, restart Antigravity IDE.');
                outputChannel.show();
            }
        });
    } else {
        vscode.window.showWarningMessage(
            `Auto-select tool "${pInfo.toolName}" not found on this system.`
        );
    }
}

function showPlatformErrorMessage(pInfo, modelName) {
    if (pInfo.isMac) {
        vscode.window.showWarningMessage(
            `Auto-select failed. Please select "${modelName}" manually.`,
            'Enable Accessibility'
        ).then(a => {
            if (a) {
                exec('open "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"');
            }
        });
    } else if (pInfo.isWindows) {
        vscode.window.showWarningMessage(
            `Auto-select failed. Please select "${modelName}" manually.`,
            'Retry'
        ).then(a => {
            if (a) cmdOpenPicker();
        });
    } else if (pInfo.isLinux) {
        vscode.window.showWarningMessage(
            `Auto-select failed (${pInfo.toolName}). Please select "${modelName}" manually.`,
            'Check Setup'
        ).then(a => {
            if (a) cmdDiagnose();
        });
    }
}

// ═══════════════════════════════════════════════════════════════
// PLATFORM KEYBOARD DRIVERS
// ═══════════════════════════════════════════════════════════════

async function executeKeyboardNavigation(position, pInfo) {
    if (pInfo.isMac) {
        return execMacOSDriver(position);
    } else if (pInfo.isWindows) {
        return execWindowsDriver(position);
    } else if (pInfo.isLinux) {
        return execLinuxDriver(position, pInfo.toolName);
    }
    throw new Error(`Unsupported platform: ${pInfo.platform}`);
}

// ─── macOS Driver (AppleScript) ──────────────────────────────

function execMacOSDriver(position) {
    const script = buildAppleScript(position);
    return execShellCommand(`osascript <<'APPLESCRIPT_END'\n${script}\nAPPLESCRIPT_END`);
}

function buildAppleScript(position) {
    // Key codes: UP=126, DOWN=125, ENTER=36
    const OVERSHOOT = 12;
    const downsNeeded = position + 1;

    const lines = [
        'tell application "System Events"',
        '  tell process "Electron"',
        '',
        `    -- Step 1: Overshoot UP ${OVERSHOOT} times to reach header`,
    ];

    for (let i = 0; i < OVERSHOOT; i++) {
        lines.push('    key code 126'); // UP
    }

    lines.push('');
    lines.push('    delay 0.05');
    lines.push('');
    lines.push(`    -- Step 2: Navigate DOWN ${downsNeeded} times (header → item ${position})`);

    for (let i = 0; i < downsNeeded; i++) {
        lines.push('    key code 125'); // DOWN
        if (i < downsNeeded - 1) {
            lines.push('    delay 0.02');
        }
    }

    lines.push('');
    lines.push('    delay 0.03');
    lines.push('');
    lines.push('    -- Step 3: Select');
    lines.push('    key code 36'); // ENTER
    lines.push('');
    lines.push('  end tell');
    lines.push('end tell');

    return lines.join('\n');
}

// ─── Windows Driver (PowerShell SendKeys) ────────────────────
//
// Strategy: Build a PowerShell script and invoke it via
// "powershell -NoProfile -NonInteractive -Command <script>"
// using cmd.exe as the shell (Node.js default on Windows).
// We do NOT set options.shell='powershell.exe' in execShellCommand
// to avoid double-invocation issues.
//
// The script first activates the IDE window to ensure SendKeys
// targets the correct window, then sends the navigation sequence.

function execWindowsDriver(position) {
    const script = buildPowerShellScript(position);
    return execShellCommand(script);
}

function buildPowerShellScript(position) {
    const OVERSHOOT = 12;
    const downsNeeded = position + 1;

    const ups = Array(OVERSHOOT).fill('{UP}').join('');
    const downs = Array(downsNeeded).fill('{DOWN}').join('');

    // PowerShell script statements joined by semicolons.
    // Escaped for embedding in cmd.exe double-quoted -Command arg.
    const psStatements = [
        'Add-Type -AssemblyName System.Windows.Forms',
        'Add-Type -AssemblyName Microsoft.VisualBasic',
        // Re-focus the IDE window — try known process names
        '$p = Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -and ($_.ProcessName -match "Antigravity|Electron|Code") } | Select-Object -First 1',
        'if ($p) { [Microsoft.VisualBasic.Interaction]::AppActivate($p.Id) }',
        // Wait for focus to settle
        'Start-Sleep -Milliseconds 100',
        // Overshoot UP to header
        `[System.Windows.Forms.SendKeys]::SendWait('${ups}')`,
        'Start-Sleep -Milliseconds 50',
        // Navigate DOWN to target
        `[System.Windows.Forms.SendKeys]::SendWait('${downs}')`,
        'Start-Sleep -Milliseconds 30',
        // Select
        `[System.Windows.Forms.SendKeys]::SendWait('{ENTER}')`,
    ].join('; ');

    // Wrap in powershell invocation for cmd.exe shell
    // Use -EncodedCommand to avoid escaping issues with special chars
    const encoded = Buffer.from(psStatements, 'utf16le').toString('base64');
    return `powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`;
}

// ─── Linux Driver (xdotool / ydotool / xte) ─────────────────

function execLinuxDriver(position, tool) {
    let script;
    switch (tool) {
        case 'xdotool':
            script = buildXdotoolScript(position);
            break;
        case 'ydotool':
            script = buildYdotoolScript(position);
            break;
        case 'xte':
            script = buildXteScript(position);
            break;
        default:
            throw new Error(`Unknown Linux tool: ${tool}`);
    }
    return execShellCommand(script);
}

function buildXdotoolScript(position) {
    const OVERSHOOT = 12;
    const downsNeeded = position + 1;

    // xdotool supports sending multiple keys in one command
    const ups = Array(OVERSHOOT).fill('Up').join(' ');
    const downs = Array(downsNeeded).fill('Down').join(' ');

    return [
        `xdotool key --delay 20 ${ups}`,
        'sleep 0.05',
        `xdotool key --delay 20 ${downs}`,
        'sleep 0.03',
        'xdotool key Return',
    ].join(' && ');
}

function buildYdotoolScript(position) {
    const OVERSHOOT = 12;
    const downsNeeded = position + 1;

    // ydotool uses key codes: UP=103, DOWN=108, ENTER=28
    const commands = [];

    for (let i = 0; i < OVERSHOOT; i++) {
        commands.push('ydotool key 103:1 103:0');
    }
    commands.push('sleep 0.05');
    for (let i = 0; i < downsNeeded; i++) {
        commands.push('ydotool key 108:1 108:0');
    }
    commands.push('sleep 0.03');
    commands.push('ydotool key 28:1 28:0');

    return commands.join(' && ');
}

function buildXteScript(position) {
    const OVERSHOOT = 12;
    const downsNeeded = position + 1;

    const commands = [];

    for (let i = 0; i < OVERSHOOT; i++) {
        commands.push('xte "key Up"');
    }
    commands.push('xte "usleep 50000"');
    for (let i = 0; i < downsNeeded; i++) {
        commands.push('xte "key Down"');
        if (i < downsNeeded - 1) {
            commands.push('xte "usleep 20000"');
        }
    }
    commands.push('xte "usleep 30000"');
    commands.push('xte "key Return"');

    return commands.join(' && ');
}

// ═══════════════════════════════════════════════════════════════
// SHELL COMMAND EXECUTOR (Cross-Platform)
//
// Uses the OS default shell (cmd.exe on Windows, /bin/sh on
// macOS/Linux). Platform-specific commands must include their
// own interpreter invocation (e.g., "powershell -Command ...").
// This avoids double-shell-invocation bugs.
// ═══════════════════════════════════════════════════════════════

function execShellCommand(command) {
    return new Promise((resolve, reject) => {
        const options = { timeout: 15000 };
        // Intentionally NOT setting options.shell — use OS default
        // PowerShell commands wrap themselves in "powershell -Command"

        exec(command, options, (err, stdout, stderr) => {
            if (err) {
                reject(new Error(`Command error: ${err.message}${stderr ? ' | ' + stderr : ''}`));
            } else {
                resolve(stdout.trim());
            }
        });
    });
}

// ═══════════════════════════════════════════════════════════════
// DIAGNOSE (Cross-Platform)
// ═══════════════════════════════════════════════════════════════

async function cmdDiagnose() {
    const allCmds = await vscode.commands.getCommands(true);
    const has = (c) => allCmds.includes(c) ? '✅' : '❌';
    const cfg = getConfig();
    const pInfo = getPlatformInfo();

    outputChannel.clear();
    outputChannel.appendLine('╔═══════════════════════════════════════════╗');
    outputChannel.appendLine('║   AG Model Switcher v7.0 — DIAGNOSTIC     ║');
    outputChannel.appendLine('╚═══════════════════════════════════════════╝');
    outputChannel.appendLine('');

    // Platform
    outputChannel.appendLine('─── Platform ───');
    outputChannel.appendLine(`  OS: ${pInfo.displayName} (${os.platform()} ${os.release()})`);
    outputChannel.appendLine(`  Architecture: ${os.arch()}`);
    outputChannel.appendLine(`  Auto-select setting: ${cfg.get('autoSelect', true) ? '✅ enabled' : '❌ disabled'}`);
    outputChannel.appendLine(`  Keyboard driver: ${pInfo.driverName}`);
    outputChannel.appendLine(`  Tool: ${pInfo.toolName} (${pInfo.toolAvailable ? '✅ available' : '❌ not found'})`);
    if (pInfo.isLinux) {
        outputChannel.appendLine(`  Linux tool setting: ${getLinuxTool()}`);
    }
    outputChannel.appendLine('');

    if (!pInfo.toolAvailable && pInfo.autoSelectSupported) {
        outputChannel.appendLine('─── ⚠️ Missing Tool ───');
        outputChannel.appendLine(`  ${pInfo.toolCheckError || 'Tool not found.'}`);
        outputChannel.appendLine('');
    }

    // Commands
    outputChannel.appendLine('─── Core Commands ───');
    outputChannel.appendLine(`  ${has('antigravity.toggleModelSelector')} antigravity.toggleModelSelector`);
    outputChannel.appendLine('');

    // Current model tracking
    outputChannel.appendLine('─── Current Model Tracking ───');
    const slots = getSlots();
    if (currentModelIndex >= 0 && currentModelIndex < slots.length) {
        outputChannel.appendLine(`  Current: slot[${currentModelIndex}] → "${slots[currentModelIndex]}"`);
    } else {
        outputChannel.appendLine(`  Current: (unknown — no model selected via extension yet)`);
    }
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

    // Cycle Info
    outputChannel.appendLine('─── Cycle Commands ───');
    outputChannel.appendLine('  Ctrl+Shift+. → Cycle Next (no popup!)');
    outputChannel.appendLine('  Ctrl+Shift+, → Cycle Previous (no popup!)');
    outputChannel.appendLine(`  Cycle order: ${slots.map((n, i) => `[${i}]${n}`).join(' → ')}`);
    outputChannel.appendLine('');

    // Navigation Method
    outputChannel.appendLine('─── Navigation Method (v7.0 Cross-Platform) ───');
    outputChannel.appendLine(`  Driver: ${pInfo.driverName}`);
    outputChannel.appendLine('  1. Open picker (toggleModelSelector)');
    outputChannel.appendLine('  2. Wait 200ms for render');
    outputChannel.appendLine('  3. UP ×12 → overshoot to header "Model"');
    outputChannel.appendLine('  4. DOWN ×(pickerPosition+1) → navigate to target item');
    outputChannel.appendLine('  5. ENTER → select');
    outputChannel.appendLine('');

    // Platform-specific live test
    outputChannel.appendLine('─── Live Tool Test ───');
    if (pInfo.isMac) {
        try {
            const result = await execShellCommand(
                `osascript -e 'tell application "System Events" to tell process "Electron" to get frontmost'`
            );
            outputChannel.appendLine(`  Electron frontmost: ${result}`);
            outputChannel.appendLine('  ✅ AppleScript OK!');
        } catch (err) {
            outputChannel.appendLine(`  ❌ Error: ${err.message}`);
            outputChannel.appendLine('  ⚠️ Accessibility permissions required!');
            outputChannel.appendLine('  → System Settings → Privacy & Security → Accessibility → Enable Antigravity IDE');
        }
    } else if (pInfo.isWindows) {
        if (pInfo.toolAvailable) {
            try {
                const result = await execShellCommand(
                    'powershell -NoProfile -Command "$PSVersionTable.PSVersion.ToString()"'
                );
                outputChannel.appendLine(`  PowerShell version: ${result}`);
                outputChannel.appendLine('  ✅ PowerShell OK!');
            } catch (err) {
                outputChannel.appendLine(`  ❌ Error: ${err.message}`);
            }
        } else {
            outputChannel.appendLine('  ❌ PowerShell not found');
        }
    } else if (pInfo.isLinux) {
        if (pInfo.toolAvailable) {
            try {
                let testCmd;
                if (pInfo.toolName === 'xdotool') {
                    testCmd = 'xdotool version';
                } else if (pInfo.toolName === 'ydotool') {
                    testCmd = 'ydotool --version 2>&1 || echo "ydotool available"';
                } else if (pInfo.toolName === 'xte') {
                    testCmd = 'which xte && echo "xte available"';
                }
                const result = await execShellCommand(testCmd);
                outputChannel.appendLine(`  ${pInfo.toolName}: ${result}`);
                outputChannel.appendLine(`  ✅ ${pInfo.toolName} OK!`);
            } catch (err) {
                outputChannel.appendLine(`  ❌ Error: ${err.message}`);
            }
        } else {
            outputChannel.appendLine(`  ❌ ${pInfo.toolName} not found`);
            outputChannel.appendLine(`  ${pInfo.toolCheckError || ''}`);
        }
    } else {
        outputChannel.appendLine(`  ⚠️ Platform "${pInfo.platform}" — no auto-select support`);
    }

    // Display server detection (Linux only)
    if (pInfo.isLinux) {
        outputChannel.appendLine('');
        outputChannel.appendLine('─── Linux Display Server ───');
        try {
            const xdgSession = process.env.XDG_SESSION_TYPE || 'unknown';
            const waylandDisplay = process.env.WAYLAND_DISPLAY || 'not set';
            const display = process.env.DISPLAY || 'not set';
            outputChannel.appendLine(`  XDG_SESSION_TYPE: ${xdgSession}`);
            outputChannel.appendLine(`  WAYLAND_DISPLAY: ${waylandDisplay}`);
            outputChannel.appendLine(`  DISPLAY: ${display}`);

            if (xdgSession === 'wayland' && pInfo.toolName === 'xdotool') {
                outputChannel.appendLine('  ⚠️ Wayland detected but using xdotool (X11 only)!');
                outputChannel.appendLine('  → Consider switching to ydotool: set agModelSwitcher.linuxTool to "ydotool"');
            } else if (xdgSession === 'x11') {
                outputChannel.appendLine('  ✅ X11 session — xdotool compatible');
            }
        } catch (err) {
            outputChannel.appendLine(`  Could not detect display server: ${err.message}`);
        }
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

// Returns platform-appropriate delay for picker UI to render.
// macOS is fastest; Windows typically needs more time.
function getPickerDelay(pInfo) {
    const cfg = getConfig();
    const userDelay = cfg.get('pickerDelay', 0);
    if (userDelay > 0) return userDelay;
    // Platform defaults (ms)
    if (pInfo.isMac) return 200;
    if (pInfo.isWindows) return 350;
    if (pInfo.isLinux) return 250;
    return 300;
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
    _platformInfo = null;
}

module.exports = { activate, deactivate };
