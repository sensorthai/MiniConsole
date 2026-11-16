/**
 * Console OS Bootloader, Player Count Selector & 3D Home Carousel Menu (Thai Edition)
 * - ขั้นตอนที่ 1 (PLAYER_SELECT): หน้าแรกให้เลือกจำนวนผู้เล่น (1-4 คน) ก่อน
 * - ขั้นตอนที่ 2 (MENU): วงล้อ 3D Carousel เลือกเกมทั้ง 5 เกม พร้อมโมเดล 3D หมุนโชว์บนการ์ด
 * - ขั้นตอนที่ 3 (LOBBY -> PLAYING): ตรวจสอบจอยสติ๊ก P1-P4 และเข้าเล่นเกม
 * - P1, P2, P3, P4 เป็นช่องจอยสติ๊กเหมือนกันทั้งหมด ส่วนคีย์บอร์ดใช้ควบคุมโปรแกรมการเล่น
 */
import * as THREE from 'three';
import { Config } from './config.js';
import { AudioFX } from './audio.js';
import { InputManager } from './input.js';
import { GraphicsManager } from './graphics.js';
import {
    createDetailedKart,
    createCyberFighter,
    createSumoMech,
    createDetailedSoccerBall,
    createDetailedZombie
} from './models.js';
import { Game1Kart } from '../games/game1.js';
import { Game2Blaster } from '../games/game2.js';
import { Game3Sumo } from '../games/game3.js';
import { Game4Soccer } from '../games/game4.js';
import { Game5Zombies } from '../games/game5.js';
import { Game6Tennis } from '../games/game6.js';

const GAME_CLASSES = [Game1Kart, Game2Blaster, Game3Sumo, Game4Soccer, Game5Zombies, Game6Tennis];

class MiniGameConsoleApp {
    constructor() {
        this.canvas = document.getElementById('webgl-canvas');
        this.graphics = new GraphicsManager(this.canvas);
        this.input = new InputManager();
        this.audio = AudioFX;

        // เริ่มต้นโปรแกรมที่หน้าเลือกจำนวนผู้เล่นก่อน ('PLAYER_SELECT' -> 'MENU' -> 'LOBBY' -> 'PLAYING')
        this.state = 'PLAYER_SELECT';
        this.selectedGameIdx = 0;
        this.carouselAngle = 0;
        this.activeGame = null;
        this.stickNavCooldown = 0;

        this.initMenuScene();
        this.bindUIEvents();
        this.updatePlayerCountUI();

        this.input.onConnectionChange = (status) => {
            const modal = document.getElementById('reconnect-overlay');
            if (status === 'reconnecting') {
                modal.classList.remove('hidden');
                if (this.activeGame && !this.activeGame.paused) {
                    this.activeGame.pause(true);
                    document.getElementById('pause-overlay').classList.remove('hidden');
                }
            } else if (status === 'connected') {
                modal.classList.add('hidden');
            }
        };

        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    initMenuScene() {
        this.menuScene = new THREE.Scene();
        this.menuScene.background = new THREE.Color(0x050711);
        this.menuScene.fog = new THREE.FogExp2(0x050711, 0.018);

        this.menuCamera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
        this.menuCamera.position.set(0, 2.8, 15.4);
        this.menuCamera.lookAt(0, 0.15, 0);

        const hemi = new THREE.HemisphereLight(0xaaccff, 0x080b16, 1.2);
        this.menuScene.add(hemi);

        const dir = new THREE.DirectionalLight(0xffffff, 2.0);
        dir.position.set(10, 18, 12);
        this.menuScene.add(dir);

        // พื้นตารางไซเบอร์สะท้อนแสง
        const grid = new THREE.GridHelper(120, 48, 0x00f0ff, 0x121b30);
        grid.position.y = -3.0;
        this.menuScene.add(grid);

        // คริสตัลลอยในฉากหลัง
        this.bgShards = new THREE.Group();
        const shardGeo = new THREE.OctahedronGeometry(0.6, 0);
        for (let i = 0; i < 55; i++) {
            const mat = new THREE.MeshStandardMaterial({
                color: i % 2 === 0 ? 0x00f0ff : 0xff2a6d,
                emissive: i % 2 === 0 ? 0x005577 : 0x660022,
                emissiveIntensity: 0.7,
                roughness: 0.2,
                metalness: 0.8
            });
            const m = new THREE.Mesh(shardGeo, mat);
            m.position.set((Math.random() - 0.5) * 55, (Math.random() - 0.2) * 22, -8 - Math.random() * 28);
            m.scale.setScalar(0.4 + Math.random() * 1.3);
            this.bgShards.add(m);
        }
        this.menuScene.add(this.bgShards);

        // สร้างวงล้อ 3D Carousel พร้อมการ์ดภาษาไทยและโมเดล 3D ประจำเกม
        this.carouselGroup = new THREE.Group();
        this.carouselGroup.position.y = 0.5;
        this.cardMeshes = [];
        const radius = 6.2;

        Config.games.forEach((g, idx) => {
            const angle = (idx / Config.games.length) * Math.PI * 2;
            const cardGroup = new THREE.Group();

            const tex = this.createCardTexture(g, idx);
            const cardGeo = new THREE.BoxGeometry(3.4, 4.4, 0.22);
            const faceMat = new THREE.MeshStandardMaterial({
                map: tex,
                roughness: 0.22,
                metalness: 0.35
            });
            const rimMat = new THREE.MeshStandardMaterial({
                color: g.accentHex,
                emissive: g.accentHex,
                emissiveIntensity: 0.9,
                roughness: 0.2,
                metalness: 0.8
            });
            const cardMesh = new THREE.Mesh(cardGeo, [rimMat, rimMat, rimMat, rimMat, faceMat, rimMat]);
            cardGroup.add(cardMesh);

            // โมเดล 3D หมุนโชว์ด้านบนการ์ดแต่ละเกม
            const iconMesh = new THREE.Group();
            let model;
            if (idx === 0) {
                model = createDetailedKart(g.accentHex, 0);
                model.scale.setScalar(0.48);
            } else if (idx === 1) {
                model = createCyberFighter(g.accentHex);
                model.scale.setScalar(0.55);
                model.position.y = -0.45;
            } else if (idx === 2) {
                model = createSumoMech(g.accentHex, 0.72);
            } else if (idx === 3) {
                model = createDetailedSoccerBall(0.68);
            } else if (idx === 4) {
                model = createDetailedZombie(false);
                model.scale.setScalar(0.55);
                model.position.y = -0.45;
            } else {
                // โมเดลแร็กเกตและลูกเทนนิสเรืองแสงสำหรับ Cyber Tennis
                model = new THREE.Group();
                const rim = new THREE.Mesh(
                    new THREE.TorusGeometry(0.55, 0.08, 12, 24),
                    new THREE.MeshStandardMaterial({ color: g.accentHex, emissive: g.accentHex, emissiveIntensity: 1.2 })
                );
                const handle = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.06, 0.06, 0.65, 10),
                    new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.7, roughness: 0.25 })
                );
                handle.position.y = -0.85;
                const tBall = new THREE.Mesh(
                    new THREE.SphereGeometry(0.24, 16, 16),
                    new THREE.MeshStandardMaterial({ color: 0xeaff00, emissive: 0xbfff00, emissiveIntensity: 1.0 })
                );
                tBall.position.set(0.42, 0.32, 0.25);
                model.add(rim, handle, tBall);
            }
            iconMesh.add(model);
            iconMesh.position.set(0, 2.95, 0.25);
            cardGroup.add(iconMesh);

            cardGroup.position.set(Math.sin(angle) * radius, 0.2, Math.cos(angle) * radius);
            cardGroup.rotation.y = angle;

            this.carouselGroup.add(cardGroup);
            this.cardMeshes.push({ group: cardGroup, icon: iconMesh, angle });
        });

        this.menuScene.add(this.carouselGroup);
        this.graphics.setupComposer(this.menuScene, this.menuCamera);
        this.updateMenuDetails();
    }

    createCardTexture(game, idx) {
        const c = document.createElement('canvas');
        c.width = 512;
        c.height = 660;
        const ctx = c.getContext('2d');

        const grad = ctx.createLinearGradient(0, 0, 0, 660);
        grad.addColorStop(0, '#101935');
        grad.addColorStop(1, '#060913');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 660);

        ctx.strokeStyle = game.accent;
        ctx.lineWidth = 10;
        ctx.strokeRect(16, 16, 480, 628);

        ctx.fillStyle = game.accent;
        ctx.font = 'bold 25px sans-serif';
        ctx.fillText(`เกมที่ 0${idx + 1} // ${game.genre}`, 38, 72);

        ctx.save();
        ctx.translate(256, 255);
        ctx.strokeStyle = game.accent;
        ctx.lineWidth = 6;
        for (let r = 35; r <= 115; r += 26) {
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();

        // ชื่อเกมภาษาไทย + ภาษาอังกฤษ
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 34px sans-serif';
        ctx.fillText(game.titleTh, 38, 465);

        ctx.fillStyle = game.accent;
        ctx.font = '800 24px sans-serif';
        ctx.fillText(game.title, 38, 510);

        ctx.fillStyle = '#9eb4d4';
        ctx.font = '600 20px sans-serif';
        ctx.fillText(game.players, 38, 580);

        const texture = new THREE.CanvasTexture(c);
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    }

    bindUIEvents() {
        // การ์ดเลือกจำนวนผู้เล่น (1-4 คน) ในหน้าแรก
        document.querySelectorAll('.pcount-card').forEach((card) => {
            card.addEventListener('click', () => {
                const count = parseInt(card.getAttribute('data-count'), 10) || 2;
                this.setPlayerCount(count);
            });
            card.addEventListener('dblclick', () => {
                this.confirmPlayerCountAndGoToMenu();
            });
        });

        document.getElementById('btn-confirm-players').addEventListener('click', () => {
            this.confirmPlayerCountAndGoToMenu();
        });

        document.getElementById('btn-change-players').addEventListener('click', () => {
            this.openPlayerSelectScreen();
        });

        // ปุ่มควบคุมหน้าเลือกเกมและห้องเตรียมพร้อม
        document.getElementById('btn-prev').addEventListener('click', () => this.moveCarousel(-1));
        document.getElementById('btn-next').addEventListener('click', () => this.moveCarousel(1));
        document.getElementById('btn-open-lobby').addEventListener('click', () => this.openLobby());
        document.getElementById('btn-launch-game').addEventListener('click', () => this.launchSelectedGame());
        document.getElementById('btn-back-menu').addEventListener('click', () => this.closeLobby());

        // ตัวเลือกคุณภาพกราฟิก (หากมีอยู่ใน DOM)
        const qSelect = document.getElementById('quality-select');
        if (qSelect) {
            qSelect.value = Config.graphics.preset;
            qSelect.addEventListener('change', (e) => {
                this.graphics.applyQualityPreset(e.target.value);
            });
        }

        // ปุ่มเปิด/ปิดโหมดจำลองจอย (SimBots)
        const testToggle = document.getElementById('test-mode-toggle');
        if (testToggle) {
            testToggle.checked = Config.players.testMode;
            testToggle.addEventListener('change', (e) => {
                Config.players.testMode = e.target.checked;
            });
        }

        // ปุ่มในหน้าหยุดเกมชั่วคราว
        document.getElementById('btn-resume').addEventListener('click', () => this.togglePause(false));
        document.getElementById('btn-quit-menu').addEventListener('click', () => this.returnToHomeMenu());

        // ตั้งค่า URL เซิร์ฟเวอร์ WebSocket / ESP32 PS3 Hub ในห้องเตรียมความพร้อม
        const wsUrlInput = document.getElementById('ws-url-input');
        const wsConnectBtn = document.getElementById('btn-ws-connect');
        if (wsUrlInput) {
            wsUrlInput.value = this.input.activeWsUrl || this.input.getDefaultWebSocketUrl();
        }
        if (wsConnectBtn && wsUrlInput) {
            wsConnectBtn.addEventListener('click', () => {
                this.input.setWebSocketUrl(wsUrlInput.value);
                wsUrlInput.value = this.input.activeWsUrl || wsUrlInput.value;
                this.audio.uiConfirm();
            });
        }
        this.refreshMdnsPresets();
    }

    async refreshMdnsPresets() {
        const bar = document.getElementById('mdns-presets-bar');
        const wsUrlInput = document.getElementById('ws-url-input');
        if (!bar) return;

        const presets = [
            { label: 'miniconsole.local (Hub)', url: 'ws://miniconsole.local:8080/ws' },
            { label: 'MiniConsole-P1.local', url: 'ws://MiniConsole-P1.local:81' },
            { label: 'MiniConsole-P2.local', url: 'ws://MiniConsole-P2.local:81' },
            { label: 'AP 192.168.4.1', url: 'ws://192.168.4.1:81' }
        ];

        let mdnsWebUrl = '';
        if (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http')) {
            try {
                const res = await fetch('/api/server-info', { cache: 'no-store' });
                if (res.ok) {
                    const info = await res.json();
                    if (info.mdnsWsUrl) {
                        presets[0] = { label: `${info.mdnsHostname || 'miniconsole.local'} (Hub)`, url: info.mdnsWsUrl };
                    }
                    if (info.mdnsUrl) mdnsWebUrl = info.mdnsUrl;
                    if (Array.isArray(info.discoveredDevices)) {
                        for (const dev of info.discoveredDevices) {
                            if (dev.wsUrl && !presets.some((p) => p.url.toLowerCase() === dev.wsUrl.toLowerCase())) {
                                presets.push({ label: `${dev.host} (พบอัตโนมัติ)`, url: dev.wsUrl });
                            }
                        }
                    }
                }
            } catch (_) {}
        }

        bar.innerHTML = '';
        const title = document.createElement('span');
        title.textContent = mdnsWebUrl ? `🌐 mDNS (${mdnsWebUrl.replace(/^https?:\/\//, '')}):` : '🌐 mDNS:';
        title.style.fontWeight = '700';
        title.style.color = 'var(--cyan)';
        bar.appendChild(title);

        for (const preset of presets) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = preset.label;
            btn.style.cssText = 'padding:3px 8px;font-size:0.72rem;border-radius:6px;background:rgba(0,240,255,0.1);border:1px solid rgba(0,240,255,0.3);color:#dffaff;cursor:pointer;';
            btn.addEventListener('click', () => {
                if (wsUrlInput) wsUrlInput.value = preset.url;
                this.input.setWebSocketUrl(preset.url);
                this.audio.uiConfirm();
            });
            bar.appendChild(btn);
        }
    }

    setPlayerCount(count) {
        Config.players.activeCount = Math.min(4, Math.max(1, count));
        this.audio.uiMove();
        this.updatePlayerCountUI();
    }

    updatePlayerCountUI() {
        const count = Config.players.activeCount;
        document.querySelectorAll('.pcount-card').forEach((card) => {
            const c = parseInt(card.getAttribute('data-count'), 10);
            card.classList.toggle('active', c === count);
        });
        const pill = document.getElementById('current-mode-pill');
        if (pill) {
            pill.textContent = `โหมดผู้เล่น: ${count} คน (จอย P1${count > 1 ? ` - P${count}` : ''})`;
        }
    }

    openPlayerSelectScreen() {
        this.state = 'PLAYER_SELECT';
        this.audio.uiBack();
        document.getElementById('player-select-screen').classList.remove('hidden');
        document.getElementById('menu-ui').classList.add('hidden');
        document.getElementById('lobby-modal').classList.add('hidden');
    }

    confirmPlayerCountAndGoToMenu() {
        this.state = 'MENU';
        this.audio.uiConfirm();
        this.updatePlayerCountUI();
        document.getElementById('player-select-screen').classList.add('hidden');
        document.getElementById('menu-ui').classList.remove('hidden');
    }

    moveCarousel(dir) {
        this.selectedGameIdx = (this.selectedGameIdx + dir + Config.games.length) % Config.games.length;
        this.audio.uiMove();
        this.updateMenuDetails();
    }

    updateMenuDetails() {
        const g = Config.games[this.selectedGameIdx];
        document.getElementById('game-genre').textContent = g.genre;
        document.getElementById('game-genre').style.color = g.accent;
        document.getElementById('game-title').textContent = `${g.titleTh} (${g.title})`;
        document.getElementById('game-subtitle').textContent = g.subtitle;
        document.getElementById('game-desc').textContent = g.description;
        document.getElementById('game-players-badge').textContent =
            `โหมดที่เลือก: ผู้เล่น ${Config.players.activeCount} คน — ${g.players}`;

        const ctrlGrid = document.getElementById('lobby-controls-grid');
        if (ctrlGrid && Array.isArray(g.controls)) {
            ctrlGrid.innerHTML = g.controls.map((c) => `
                <div class="ctrl-item">
                    <span class="ctrl-key" style="border-color:${g.accent};color:${g.accent}">${c.btn}</span>
                    <span class="ctrl-desc">${c.desc}</span>
                </div>
            `).join('');
        }
    }

    openLobby() {
        if (this.state !== 'MENU') return;
        this.state = 'LOBBY';
        this.audio.uiConfirm();
        const g = Config.games[this.selectedGameIdx];
        document.getElementById('lobby-modal').classList.remove('hidden');
        document.getElementById('lobby-game-name').textContent = `${g.titleTh} (${g.title})`;
        this.updateMenuDetails();
    }

    closeLobby() {
        if (this.state !== 'LOBBY') return;
        this.state = 'MENU';
        this.audio.uiBack();
        document.getElementById('lobby-modal').classList.add('hidden');
    }

    launchSelectedGame() {
        this.audio.uiConfirm();
        document.getElementById('player-select-screen').classList.add('hidden');
        document.getElementById('lobby-modal').classList.add('hidden');
        document.getElementById('menu-ui').classList.add('hidden');
        document.getElementById('game-hud').classList.remove('hidden');
        document.getElementById('pause-overlay').classList.add('hidden');

        if (this.activeGame) {
            this.activeGame.dispose();
            this.activeGame = null;
        }

        const GameClass = GAME_CLASSES[this.selectedGameIdx];
        const meta = Config.games[this.selectedGameIdx];
        this.activeGame = new GameClass(this, meta);
        this.activeGame.init();
        this.state = 'PLAYING';
    }

    returnToHomeMenu() {
        this.audio.uiBack();
        if (this.activeGame) {
            this.activeGame.dispose();
            this.activeGame = null;
        }
        this.state = 'MENU';
        this.graphics.setBoostBlur(0);
        this.graphics.setupComposer(this.menuScene, this.menuCamera);
        document.getElementById('pause-overlay').classList.add('hidden');
        document.getElementById('lobby-modal').classList.add('hidden');
        document.getElementById('game-hud').classList.add('hidden');
        document.getElementById('player-select-screen').classList.add('hidden');
        document.getElementById('menu-ui').classList.remove('hidden');
    }

    togglePause(forceState) {
        if (this.state !== 'PLAYING' || !this.activeGame) return;
        this.activeGame.pause(forceState);
        const overlay = document.getElementById('pause-overlay');
        if (this.activeGame.paused) {
            overlay.classList.remove('hidden');
            this.audio.uiBack();
        } else {
            overlay.classList.add('hidden');
            this.audio.uiConfirm();
        }
    }

    setGameHUD(html) {
        const el = document.getElementById('game-hud');
        if (el) el.innerHTML = html;
    }

    /**
     * ตรวจสอบคำสั่งควบคุมระบบ/เมนูจาก "คีย์บอร์ดเท่านั้น" (`this.input.sys.justPressed`)
     * จอยสติ๊ก P1-P4 ใช้บังคับตัวละคร/รถภายในเกมเท่านั้น เพื่อป้องกันการกดเมนูหรือออกจากเกมโดยไม่ตั้งใจ
     */
    handleGlobalNavigation(dt) {
        if (this.stickNavCooldown > 0) this.stickNavCooldown -= dt;
        const sys = this.input.sys.justPressed;

        // ปุ่มลัดคีย์บอร์ด B เปิด/ปิดโหมดจำลองจอยสติ๊กได้ทุกหน้า
        if (sys.simBots) {
            Config.players.testMode = !Config.players.testMode;
            const testToggle = document.getElementById('test-mode-toggle');
            if (testToggle) testToggle.checked = Config.players.testMode;
            this.audio.uiMove();
        }

        // คีย์บอร์ดปุ่มตัวเลข 1-4 เลือกจำนวนผู้เล่นได้ทันทีในหน้าตั้งค่าหรือหน้าเมนู
        if (this.state === 'PLAYER_SELECT' || this.state === 'MENU' || this.state === 'LOBBY') {
            if (sys.num1) this.setPlayerCount(1);
            if (sys.num2) this.setPlayerCount(2);
            if (sys.num3) this.setPlayerCount(3);
            if (sys.num4) this.setPlayerCount(4);
        }

        if (this.state === 'PLAYER_SELECT') {
            if (sys.left) {
                const next = ((Config.players.activeCount - 2 + 4) % 4) + 1;
                this.setPlayerCount(next);
            } else if (sys.right) {
                const next = (Config.players.activeCount % 4) + 1;
                this.setPlayerCount(next);
            } else if (sys.confirm) {
                this.confirmPlayerCountAndGoToMenu();
            }
        } else if (this.state === 'MENU') {
            if (sys.left) {
                this.moveCarousel(-1);
            } else if (sys.right) {
                this.moveCarousel(1);
            } else if (sys.confirm) {
                this.openLobby();
            } else if (sys.back) {
                this.openPlayerSelectScreen();
            }
        } else if (this.state === 'LOBBY') {
            if (sys.confirm) {
                this.launchSelectedGame();
            } else if (sys.back || sys.home) {
                this.closeLobby();
            }
        } else if (this.state === 'PLAYING') {
            if (sys.home) {
                this.returnToHomeMenu();
                return;
            }
            if (sys.scoreboard) {
                if (this.activeGame) {
                    this.activeGame.showSummary = !this.activeGame.showSummary;
                    if (typeof this.activeGame.updateHUD === 'function') {
                        this.activeGame.updateHUD();
                    }
                    this.audio.uiMove();
                }
                return;
            }
            const isMatchEnded = this.activeGame && (
                this.activeGame.winner ||
                this.activeGame.winnerText ||
                this.activeGame.gameOver
            );
            if (isMatchEnded && sys.confirm) {
                this.launchSelectedGame();
                return;
            }
            if (sys.pause) {
                this.togglePause();
                return;
            }
            if (this.activeGame && this.activeGame.paused && sys.back) {
                this.returnToHomeMenu();
            }
        }
    }

    updateControllerStatusUI() {
        const wsBadge = document.getElementById('ws-status-badge');
        if (wsBadge) {
            if (this.input.wsConnected) {
                wsBadge.textContent = 'ESP32: เชื่อมต่อแล้ว (60Hz)';
                wsBadge.className = 'status-badge connected';
            } else {
                wsBadge.textContent = 'ESP32: ออฟไลน์ (ใช้จอย USB/BT หรือจอยจำลอง)';
                wsBadge.className = 'status-badge fallback';
            }
        }

        // แสดงเฉพาะช่องจอยสติ๊กตามจำนวนผู้เล่นที่เลือก (เช่น เลือก 2 คน แสดงเฉพาะ P1 และ P2)
        for (let i = 0; i < 4; i++) {
            const pad = this.input.pads[i];
            const isSlotActive = i < Config.players.activeCount;
            const slotEl = document.getElementById(`pad-slot-${i}`);
            const lobbyEl = document.getElementById(`lobby-pad-${i}`);
            const batBars = '▰'.repeat(pad.battery) + '▱'.repeat(Math.max(0, 5 - pad.battery));

            if (slotEl) {
                slotEl.classList.toggle('hidden', !isSlotActive);
                slotEl.style.borderColor = pad.connected ? pad.color.css : 'rgba(255,255,255,0.16)';
                slotEl.innerHTML = `
                    <span class="p-dot" style="background:${pad.connected ? pad.color.css : '#444'}"></span>
                    <strong>จอย P${i + 1}</strong>
                    <small>${pad.connected ? pad.source : 'ไม่พบจอย (บอทแทน)'}</small>
                    <span class="bat">${pad.connected ? batBars : ''}</span>
                `;
            }

            if (lobbyEl) {
                lobbyEl.classList.toggle('hidden', !isSlotActive);
                lobbyEl.style.borderColor = pad.connected ? pad.color.css : 'rgba(255,255,255,0.15)';
                const stickPreview = pad.connected 
                    ? `<div class="lobby-card-meta" style="color:var(--cyan);font-weight:700;">แกนอนาล็อก (L): X: ${(pad.lx || 0).toFixed(2)} | Y: ${(pad.ly || 0).toFixed(2)}</div>` 
                    : '';
                lobbyEl.innerHTML = `
                    <div class="lobby-card-title" style="color:${pad.color.css}">ผู้เล่น P${i + 1} (จอยสติ๊ก #${i + 1})</div>
                    <div class="lobby-card-status">${
                        pad.connected ? '✅ เชื่อมต่อจอยพร้อมเล่น' : '🤖 รอจอยสติ๊ก (บอท AI เล่นแทน)'
                    }</div>
                    <div class="lobby-card-meta">อุปกรณ์: ${pad.source}</div>
                    <div class="lobby-card-meta">แบตเตอรี่: ${pad.connected ? batBars : '-'}</div>
                    ${stickPreview}
                `;
            }
        }
    }

    loop(now) {
        const dt = Math.min(0.1, (now - this.lastTime) * 0.001);
        this.lastTime = now;

        this.input.update();
        this.graphics.updateDynamicResolution(dt);
        this.handleGlobalNavigation(dt);
        this.updateControllerStatusUI();

        const fpsEl = document.getElementById('fps-counter');
        if (fpsEl) {
            fpsEl.textContent = `${this.graphics.currentFps} FPS | ${Config.graphics.preset} (${this.graphics.pixelRatio.toFixed(2)}x)`;
        }

        if (this.state === 'PLAYING' && this.activeGame) {
            this.activeGame.update(dt);
            this.activeGame.render();
        } else {
            const targetAngle = -(this.selectedGameIdx / Config.games.length) * Math.PI * 2;
            let diff = targetAngle - this.carouselAngle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            this.carouselAngle += diff * Math.min(1, dt * 8.0);
            this.carouselGroup.rotation.y = this.carouselAngle;

            this.cardMeshes.forEach((cm, idx) => {
                cm.icon.rotation.y += dt * 1.4;
                const isSelected = idx === this.selectedGameIdx;
                const targetScale = isSelected ? 1.12 : 0.88;
                cm.group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), dt * 8);
            });

            this.bgShards.rotation.y += dt * 0.06;
            this.graphics.render(this.menuScene, this.menuCamera, true);
        }

        requestAnimationFrame((t) => this.loop(t));
    }
}

window.MiniGameConsoleApp = MiniGameConsoleApp;

// Auto-run if DOMContentLoaded already fired or on event
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    if (!window.miniConsole) {
        window.miniConsole = new MiniGameConsoleApp();
    }
} else {
    window.addEventListener('DOMContentLoaded', () => {
        if (!window.miniConsole) {
            window.miniConsole = new MiniGameConsoleApp();
        }
    });
}

export { MiniGameConsoleApp };
export default MiniGameConsoleApp;

