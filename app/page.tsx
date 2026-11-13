'use client';

import { useEffect } from 'react';

const BODY_HTML = `    <canvas id="webgl-canvas"></canvas>

    <!-- ขั้นตอนที่ 1: หน้าแรก เลือกจำนวนผู้เล่น (1-4 คน) ก่อนเข้าสู่หน้าเลือกเกม -->
    <section id="player-select-screen">
        <div class="player-select-box">
            <div class="step-tag">ขั้นตอนที่ 1 จาก 2 // ตั้งค่าผู้เล่น</div>
            <h1 style="font-size:2.1rem;font-weight:900;margin-bottom:6px;">เลือกจำนวนผู้เล่น</h1>
            <p style="color:var(--text-muted);font-size:0.95rem;">
                ผู้เล่น <strong>P1, P2, P3, P4</strong> บังคับด้วยจอยสติ๊กเหมือนกันทุกช่อง (จอย PS3 ผ่าน ESP32 หรือจอย USB/Bluetooth)<br/>
                ส่วน <strong>คีย์บอร์ด</strong> ใช้สำหรับควบคุมโปรแกรมคอนโซล (เลือกเมนู / หยุดเกม / กลับหน้าหลัก)
            </p>

            <div class="player-count-grid">
                <div class="pcount-card" data-count="1">
                    <div class="pcount-num">1P</div>
                    <div class="pcount-label">เล่น 1 คน</div>
                    <div class="pcount-sub">จอย P1 + บอท AI</div>
                </div>
                <div class="pcount-card active" data-count="2">
                    <div class="pcount-num">2P</div>
                    <div class="pcount-label">เล่น 2 คน</div>
                    <div class="pcount-sub">จอย P1 - P2</div>
                </div>
                <div class="pcount-card" data-count="3">
                    <div class="pcount-num">3P</div>
                    <div class="pcount-label">เล่น 3 คน</div>
                    <div class="pcount-sub">จอย P1 - P3</div>
                </div>
                <div class="pcount-card" data-count="4">
                    <div class="pcount-num">4P</div>
                    <div class="pcount-label">เล่น 4 คน</div>
                    <div class="pcount-sub">จอย P1 - P4 ครบทีม</div>
                </div>
            </div>

            <div class="menu-actions">
                <button id="btn-confirm-players" class="btn-primary">✕ ยืนยันจำนวนผู้เล่น และไปเลือกเกม ▶</button>
            </div>

            <div class="prompt-bar">
                <span><strong>คีย์บอร์ดควบคุมระบบ:</strong> กดปุ่ม <strong>1 - 4</strong> หรือ <strong>◀ / ▶</strong> เพื่อเลือกจำนวนคน</span>
                <span><strong>Enter / Space</strong> หรือ <strong>ปุ่ม ✕ บนจอย</strong> เพื่อไปหน้าเลือกเกม</span>
                <span><strong>ปุ่ม B</strong> เปิด/ปิดจอยจำลอง</span>
            </div>
        </div>
    </section>

    <!-- ขั้นตอนที่ 2: หน้าเลือกเกม 3D Carousel -->
    <section id="menu-ui" class="hidden">
        <div style="display:flex;justify-content:center;align-items:center;gap:10px;margin-bottom:4px;">
            <span class="step-tag" style="margin:0;">ขั้นตอนที่ 2 // เลือกเกม 3 มิติ</span>
            <span id="current-mode-pill" class="step-tag" style="margin:0;border-color:var(--emerald);color:var(--emerald);background:rgba(5,255,161,0.12);">โหมดผู้เล่น: 2 คน</span>
        </div>
        <div id="game-genre">เกมแข่งรถอาร์เคด</div>
        <h1 id="game-title">ศึกซิ่งคาร์ทสายฟ้า</h1>
        <div id="game-subtitle">แข่งรถดริฟต์ 3 มิติ แบ่งหน้าจอสูงสุด 4 ผู้เล่น</div>
        <p id="game-desc"></p>

        <div class="menu-actions">
            <button id="btn-change-players">◯ เปลี่ยนจำนวนผู้เล่น</button>
            <button id="btn-prev">◀ เกมก่อนหน้า</button>
            <button id="btn-open-lobby" class="btn-primary">✕ เลือกเกมนี้ (เตรียมเข้าเล่น)</button>
            <button id="btn-next">เกมถัดไป ▶</button>
        </div>

        <div class="prompt-bar">
            <span><strong>จอยสติ๊ก P1-P4 / คีย์บอร์ด ◀ ▶</strong> หมุนเลือกเกม</span>
            <span><strong>ปุ่ม ✕ / Enter</strong> ยืนยันเลือกเกม</span>
            <span><strong>ปุ่ม ◯ / Backspace</strong> กลับไปเลือกจำนวนคน</span>
            <span><strong>START / ปุ่ม P</strong> หยุดเกมชั่วคราว</span>
            <span><strong>ปุ่ม PS / ESC</strong> กลับเมนูหลัก</span>
        </div>
    </section>

    <!-- หน้าต่างตรวจสอบจอยสติ๊กก่อนเริ่มเกม (Lobby Modal) -->
    <div id="lobby-modal" class="modal-overlay hidden">
        <div class="modal-card">
            <div style="color:var(--cyan);font-weight:800;font-size:0.82rem;letter-spacing:1.5px;">ห้องเตรียมความพร้อมจอยสติ๊ก (P1 - P4)</div>
            <h2 id="lobby-game-name" style="font-size:1.8rem;margin:6px 0 4px;">ศึกซิ่งคาร์ทสายฟ้า</h2>
            <p id="game-players-badge" style="color:var(--text-muted);font-size:0.88rem;">เชื่อมต่อจอยสติ๊ก P1 - P4 (ช่องที่ไม่ได้ต่อจอย ระบบจะให้บอท AI เล่นแทนอัตโนมัติ)</p>

            <div class="lobby-grid">
                <div id="lobby-pad-0" class="lobby-pad-card"></div>
                <div id="lobby-pad-1" class="lobby-pad-card"></div>
                <div id="lobby-pad-2" class="lobby-pad-card"></div>
                <div id="lobby-pad-3" class="lobby-pad-card"></div>
            </div>

            <div class="lobby-controls-box">
                <div class="lobby-controls-title">🎮 วิธีบังคับจอยสติ๊กสำหรับเกมนี้ (PS3 DualShock 3 / จอยสติ๊กทั่วไป)</div>
                <div id="lobby-controls-grid" class="lobby-controls-grid"></div>
            </div>

            <div class="lobby-controls-box" style="margin-top:10px;padding:10px 14px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <span style="font-size:0.78rem;font-weight:800;color:var(--cyan);">🔌 ESP32 PS3 WebSocket:</span>
                    <span id="ws-status-badge" class="status-badge fallback">ESP32: ออฟไลน์</span>
                </div>
                <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:240px;max-width:420px;">
                    <input id="ws-url-input" type="text" value="ws://192.168.4.1:81" placeholder="ws://192.168.4.1:81 หรือ ws://localhost:8080/ws" style="flex:1;background:rgba(8,12,24,0.9);border:1px solid var(--border-glass);color:#fff;padding:6px 10px;border-radius:8px;font-size:0.78rem;" />
                    <button id="btn-ws-connect" style="padding:6px 12px;font-size:0.76rem;">เชื่อมต่อ</button>
                </div>
            </div>

            <div class="menu-actions">
                <button id="btn-back-menu">◯ กลับไปหน้าเลือกเกม</button>
                <button id="btn-launch-game" class="btn-primary">✕ เริ่มการแข่งขันทันที!</button>
            </div>
        </div>
    </div>

    <!-- HUD แสดงสถานะขณะเล่นเกม -->
    <div id="game-hud" class="hidden"></div>

    <!-- หน้าต่างหยุดเกมชั่วคราว (Pause Modal) -->
    <div id="pause-overlay" class="modal-overlay hidden">
        <div class="modal-card" style="max-width:460px;">
            <h2 style="font-size:1.8rem;margin-bottom:14px;">หยุดเกมชั่วคราว</h2>
            <p style="color:var(--text-muted);margin-bottom:22px;font-size:0.92rem;line-height:1.5;">
                กดปุ่ม <strong>START</strong> บนจอย (หรือปุ่ม <strong>P</strong> บนคีย์บอร์ด) เพื่อเล่นต่อ<br/>
                หรือกดปุ่ม <strong>PS / ◯</strong> (ปุ่ม <strong>ESC</strong> บนคีย์บอร์ด) เพื่อกลับสู่หน้าเมนูหลัก
            </p>
            <div class="menu-actions">
                <button id="btn-resume" class="btn-primary">START (P) // เล่นต่อ</button>
                <button id="btn-quit-menu">PS (ESC) // กลับหน้าเลือกเกม</button>
            </div>
        </div>
    </div>

    <!-- หน้าต่างแจ้งเตือนเมื่อการเชื่อมต่อ ESP32 ขาดหาย -->
    <div id="reconnect-overlay" class="modal-overlay hidden">
        <div class="modal-card" style="border-color:var(--crimson);max-width:480px;">
            <h2 style="color:var(--crimson);margin-bottom:10px;">⚠️ สัญญาณจอยสติ๊ก ESP32 ขาดหาย</h2>
            <p style="color:var(--text-muted);font-size:0.92rem;">ระบบได้หยุดเกมชั่วคราวและกำลังเชื่อมต่อ WebSocket ไปที่ <code>ws://192.168.4.1:81</code> อัตโนมัติ...</p>
        </div>
    </div>

`;

export default function GamePage() {
  useEffect(() => {
    // Dynamically insert module script for the game engine if not present
    const scriptId = 'mini-game-engine-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'module';
      script.src = '/js/main.js';
      document.body.appendChild(script);
    }

    return () => {
      const active = (window as any).miniConsole;
      if (active && typeof active.dispose === 'function') {
        active.dispose();
      }
    };
  }, []);

  return (
    <div
      id="console-root"
      dangerouslySetInnerHTML={{ __html: BODY_HTML }}
      style={{ width: '100vw', height: '100vh', position: 'relative' }}
    />
  );
}
