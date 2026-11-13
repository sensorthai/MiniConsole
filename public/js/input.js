/**
 * Unified Input Manager
 * - P1, P2, P3, P4 (`this.pads[0..3]`) are strictly Joystick/Controller slots (identical behavior):
 *     (a) ESP32 WebSocket DualShock 3 stream (ws://192.168.4.1:81 at 60 Hz)
 *     (b) Browser HTML5 Gamepad API (USB / Bluetooth gamepads)
 *     (c) Simulated Bot Controller (when SimBots test mode is enabled)
 * - Keyboard (`this.sys`) is dedicated to controlling the Console Program / UI / Session
 *     (Select player count, browse games, launch/pause game, return to home menu, toggle SimBots).
 */
import { Config, PS3Buttons } from './config.js';

export class InputManager {
    constructor() {
        this.pads = Array.from({ length: 4 }, (_, idx) => this.createEmptyPad(idx));
        this.wsPads = Array.from({ length: 4 }, () => ({
            connected: false,
            lastPacketTime: 0,
            lx: 0, ly: 0, rx: 0, ry: 0,
            l2: 0, r2: 0,
            b: 0,
            bat: 0
        }));

        // Keyboard state dedicated to Program / Console Control
        this.keys = new Set();
        this.prevKeys = new Set();
        this.sys = {
            justPressed: {}
        };

        this.ws = null;
        this.wsConnected = false;
        this.wsHadConnection = false;
        this.wsReconnecting = false;
        this.onConnectionChange = null;

        this.bindKeyboard();
        this.connectWebSocket();
    }

    createEmptyPad(index) {
        return {
            index,
            connected: false, // P1-P4 all start disconnected until a real Joystick (or SimBot) connects
            source: 'รอเชื่อมต่อจอย',
            battery: 0,
            color: Config.players.colors[index],
            lx: 0, ly: 0, rx: 0, ry: 0,
            l2: 0, r2: 0,
            buttons: 0,
            prevButtons: 0,
            cross: false, circle: false, square: false, triangle: false,
            l1: false, r1: false, l2Btn: false, r2Btn: false,
            select: false, start: false, l3: false, r3: false,
            up: false, down: false, left: false, right: false, ps: false,
            justPressed: {}
        };
    }

    bindKeyboard() {
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Tab') e.preventDefault();
            this.keys.add(e.code);
        });
        window.addEventListener('keyup', (e) => {
            this.keys.delete(e.code);
        });
        window.addEventListener('blur', () => {
            this.keys.clear();
            this.prevKeys.clear();
        });
    }

    getDefaultWebSocketUrl() {
        try {
            const saved = localStorage.getItem('mc_ws_url');
            if (saved && saved.startsWith('ws')) return saved;
        } catch (_) {}
        if (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http') && window.location.host) {
            return `ws://${window.location.host}/ws`;
        }
        return Config.wifi.wsUrl;
    }

    setWebSocketUrl(newUrl) {
        if (!newUrl) return;
        let formatted = newUrl.trim();
        if (!formatted.startsWith('ws://') && !formatted.startsWith('wss://')) {
            formatted = `ws://${formatted}`;
        }
        Config.wifi.wsUrl = formatted;
        try { localStorage.setItem('mc_ws_url', formatted); } catch (_) {}
        this.connectWebSocket(formatted);
    }

    connectWebSocket(customUrl = null) {
        const url = customUrl || this.getDefaultWebSocketUrl();
        this.activeWsUrl = url;
        if (this.ws) {
            try { this.ws.close(); } catch (_) {}
        }

        try {
            this.ws = new WebSocket(url);
        } catch (err) {
            this.scheduleReconnect();
            return;
        }

        this.ws.onopen = () => {
            this.wsConnected = true;
            this.wsHadConnection = true;
            this.wsReconnecting = false;
            if (this.onConnectionChange) this.onConnectionChange('connected');
        };

        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.t === 'pad' && msg.p >= 0 && msg.p < 4) {
                    const slot = this.wsPads[msg.p];
                    if (msg.bat === -1) {
                        slot.connected = false;
                    } else {
                        slot.connected = true;
                        slot.lastPacketTime = performance.now();
                        slot.lx = msg.lx / 127;
                        slot.ly = msg.ly / 127;
                        slot.rx = msg.rx / 127;
                        slot.ry = msg.ry / 127;
                        slot.l2 = msg.l2 / 255;
                        slot.r2 = msg.r2 / 255;
                        slot.b = msg.b >>> 0;
                        slot.bat = msg.bat ?? 4;
                    }
                }
            } catch (_) {
                // Ignore malformed packet
            }
        };

        this.ws.onclose = () => {
            const wasConnected = this.wsConnected;
            this.wsConnected = false;
            if (wasConnected || this.wsHadConnection) {
                this.wsReconnecting = true;
                if (this.onConnectionChange) this.onConnectionChange('reconnecting');
            }
            this.scheduleReconnect();
        };

        this.ws.onerror = () => {};
    }

    scheduleReconnect() {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
            this.connectWebSocket();
        }, Config.wifi.reconnectIntervalMs);
    }

    /**
     * Send rumble feedback to ESP32 over WebSocket + Browser Gamepad vibrationActuator
     */
    rumble(playerIndex, left = 128, right = 128, ms = 200) {
        if (this.wsConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
            const payload = JSON.stringify({
                t: 'rumble',
                p: playerIndex + 1,
                l: Math.round(Math.min(255, Math.max(0, left))),
                r: Math.round(Math.min(255, Math.max(0, right))),
                ms: Math.round(ms)
            });
            this.ws.send(payload);
        }

        const gpList = navigator.getGamepads ? navigator.getGamepads() : [];
        const gp = gpList[playerIndex];
        if (gp && gp.vibrationActuator) {
            gp.vibrationActuator.playEffect('dual-rumble', {
                startDelay: 0,
                duration: ms,
                weakMagnitude: Math.min(1, right / 255),
                strongMagnitude: Math.min(1, left / 255)
            }).catch(() => {});
        }
    }

    /**
     * Apply radial dead zone (0.12) and non-linear response curve
     */
    applyStickCurve(x, y) {
        const dz = Config.input.deadZone;
        const exp = Config.input.analogExponent;
        const mag = Math.hypot(x, y);
        if (mag < dz) return { x: 0, y: 0 };
        const normalized = Math.min(1, (mag - dz) / (1 - dz));
        const curved = Math.pow(normalized, exp);
        const scale = curved / mag;
        return { x: x * scale, y: y * scale };
    }

    readBrowserGamepad(index) {
        if (!navigator.getGamepads) return null;
        const gps = navigator.getGamepads();
        const gp = gps[index];
        if (!gp || !gp.connected) return null;

        const lx = gp.axes[0] || 0;
        const ly = gp.axes[1] || 0;
        const rx = gp.axes[2] || 0;
        const ry = gp.axes[3] || 0;
        const l2 = gp.buttons[6] ? gp.buttons[6].value : 0;
        const r2 = gp.buttons[7] ? gp.buttons[7].value : 0;

        let b = 0;
        const btn = (i) => gp.buttons[i] && gp.buttons[i].pressed;
        if (btn(0))  b |= PS3Buttons.CROSS;
        if (btn(1))  b |= PS3Buttons.CIRCLE;
        if (btn(2))  b |= PS3Buttons.SQUARE;
        if (btn(3))  b |= PS3Buttons.TRIANGLE;
        if (btn(4))  b |= PS3Buttons.L1;
        if (btn(5))  b |= PS3Buttons.R1;
        if (btn(6))  b |= PS3Buttons.L2;
        if (btn(7))  b |= PS3Buttons.R2;
        if (btn(8))  b |= PS3Buttons.SELECT;
        if (btn(9))  b |= PS3Buttons.START;
        if (btn(10)) b |= PS3Buttons.L3;
        if (btn(11)) b |= PS3Buttons.R3;
        if (btn(12)) b |= PS3Buttons.UP;
        if (btn(13)) b |= PS3Buttons.DOWN;
        if (btn(14)) b |= PS3Buttons.LEFT;
        if (btn(15)) b |= PS3Buttons.RIGHT;
        if (btn(16)) b |= PS3Buttons.PS;

        return { lx, ly, rx, ry, l2, r2, b };
    }

    readSimulatedPad(index, timeSec) {
        const phase = timeSec * 1.4 + index * 1.7;
        const lx = Math.sin(phase) * 0.85;
        const ly = Math.cos(phase * 0.7) * 0.85;
        const rx = Math.cos(phase * 1.3) * 0.6;
        const ry = Math.sin(phase * 1.1) * 0.6;
        let b = PS3Buttons.CROSS;
        if (Math.sin(timeSec * 3 + index) > 0.65) b |= PS3Buttons.SQUARE;
        if (Math.cos(timeSec * 2 + index) > 0.75) b |= PS3Buttons.R1;
        return { lx, ly, rx, ry, l2: 0, r2: 0.9, b };
    }

    updateSystemKeyboard() {
        const isJustDown = (code) => this.keys.has(code) && !this.prevKeys.has(code);

        this.sys.justPressed = {
            left:    isJustDown('ArrowLeft') || isJustDown('KeyA'),
            right:   isJustDown('ArrowRight') || isJustDown('KeyD'),
            up:      isJustDown('ArrowUp') || isJustDown('KeyW'),
            down:    isJustDown('ArrowDown') || isJustDown('KeyS'),
            confirm: isJustDown('Enter') || isJustDown('Space'),
            back:    isJustDown('Backspace'),
            pause:   isJustDown('KeyP'),
            home:    isJustDown('Escape') || isJustDown('Home'),
            num1:    isJustDown('Digit1') || isJustDown('Numpad1'),
            num2:    isJustDown('Digit2') || isJustDown('Numpad2'),
            num3:    isJustDown('Digit3') || isJustDown('Numpad3'),
            num4:       isJustDown('Digit4') || isJustDown('Numpad4'),
            simBots:    isJustDown('KeyB'),
            scoreboard: isJustDown('Tab') || isJustDown('KeyT')
        };

        this.prevKeys = new Set(this.keys);
    }

    update() {
        const now = performance.now();
        const timeSec = now * 0.001;
        const smooth = Config.input.triggerSmoothing;

        // 1. Update System Keyboard (Program Control)
        this.updateSystemKeyboard();

        // 2. Update All 4 Joystick Slots (P1, P2, P3, P4 identically)
        for (let i = 0; i < 4; i++) {
            const pad = this.pads[i];
            pad.prevButtons = pad.buttons;

            let rawLx = 0, rawLy = 0, rawRx = 0, rawRy = 0, rawL2 = 0, rawR2 = 0, rawB = 0;
            let connected = false;
            let source = 'รอเชื่อมต่อจอย';
            let battery = 0;

            // (a) Check ESP32 WebSocket DualShock 3 Pad
            const wsPad = this.wsPads[i];
            if (wsPad.connected && (now - wsPad.lastPacketTime < 3000)) {
                rawLx = wsPad.lx;
                rawLy = wsPad.ly;
                rawRx = wsPad.rx;
                rawRy = wsPad.ry;
                rawL2 = wsPad.l2;
                rawR2 = wsPad.r2;
                rawB  = wsPad.b;
                connected = true;
                source = 'จอย PS3 (ESP32)';
                battery = wsPad.bat;
            }

            // (b) Check Browser Gamepad API (USB / Bluetooth Joystick)
            const gp = this.readBrowserGamepad(i);
            if (gp) {
                if (Math.hypot(gp.lx, gp.ly) > Math.hypot(rawLx, rawLy)) {
                    rawLx = gp.lx; rawLy = gp.ly;
                }
                if (Math.hypot(gp.rx, gp.ry) > Math.hypot(rawRx, rawRy)) {
                    rawRx = gp.rx; rawRy = gp.ry;
                }
                rawL2 = Math.max(rawL2, gp.l2);
                rawR2 = Math.max(rawR2, gp.r2);
                rawB |= gp.b;
                connected = true;
                if (source === 'รอเชื่อมต่อจอย') {
                    source = 'จอยสติ๊ก (USB/BT)';
                    battery = 5;
                }
            }

            // (c) Simulated Joystick in Test Mode (fills unconnected slots up to activeCount)
            if (!connected && Config.players.testMode && i < Config.players.activeCount) {
                const sim = this.readSimulatedPad(i, timeSec);
                rawLx = sim.lx; rawLy = sim.ly;
                rawRx = sim.rx; rawRy = sim.ry;
                rawL2 = sim.l2; rawR2 = sim.r2;
                rawB  = sim.b;
                connected = true;
                source = 'จอยจำลอง (AI)';
                battery = 4;
            }

            // Apply Deadzone & Analog Curve
            const leftStick = this.applyStickCurve(rawLx, rawLy);
            const rightStick = this.applyStickCurve(rawRx, rawRy);

            pad.lx = leftStick.x;
            pad.ly = leftStick.y;
            pad.rx = rightStick.x;
            pad.ry = rightStick.y;

            // Trigger smoothing (EMA)
            pad.l2 = pad.l2 * (1 - smooth) + rawL2 * smooth;
            pad.r2 = pad.r2 * (1 - smooth) + rawR2 * smooth;

            pad.buttons = rawB;
            pad.connected = connected;
            pad.source = source;
            pad.battery = battery;

            // Decode booleans
            pad.cross    = !!(rawB & PS3Buttons.CROSS);
            pad.circle   = !!(rawB & PS3Buttons.CIRCLE);
            pad.square   = !!(rawB & PS3Buttons.SQUARE);
            pad.triangle = !!(rawB & PS3Buttons.TRIANGLE);
            pad.l1       = !!(rawB & PS3Buttons.L1);
            pad.r1       = !!(rawB & PS3Buttons.R1);
            pad.l2Btn    = !!(rawB & PS3Buttons.L2) || pad.l2 > 0.35;
            pad.r2Btn    = !!(rawB & PS3Buttons.R2) || pad.r2 > 0.35;
            pad.select   = !!(rawB & PS3Buttons.SELECT);
            pad.start    = !!(rawB & PS3Buttons.START);
            pad.l3       = !!(rawB & PS3Buttons.L3);
            pad.r3       = !!(rawB & PS3Buttons.R3);
            pad.up       = !!(rawB & PS3Buttons.UP);
            pad.down     = !!(rawB & PS3Buttons.DOWN);
            pad.left     = !!(rawB & PS3Buttons.LEFT);
            pad.right    = !!(rawB & PS3Buttons.RIGHT);
            pad.ps       = !!(rawB & PS3Buttons.PS);

            // Edge-triggered justPressed
            const newlyPressed = rawB & (~pad.prevButtons);
            pad.justPressed = {
                cross:    !!(newlyPressed & PS3Buttons.CROSS),
                circle:   !!(newlyPressed & PS3Buttons.CIRCLE),
                square:   !!(newlyPressed & PS3Buttons.SQUARE),
                triangle: !!(newlyPressed & PS3Buttons.TRIANGLE),
                l1:       !!(newlyPressed & PS3Buttons.L1),
                r1:       !!(newlyPressed & PS3Buttons.R1),
                select:   !!(newlyPressed & PS3Buttons.SELECT),
                start:    !!(newlyPressed & PS3Buttons.START),
                up:       !!(newlyPressed & PS3Buttons.UP),
                down:     !!(newlyPressed & PS3Buttons.DOWN),
                left:     !!(newlyPressed & PS3Buttons.LEFT),
                right:    !!(newlyPressed & PS3Buttons.RIGHT),
                ps:       !!(newlyPressed & PS3Buttons.PS)
            };
        }
    }
}
