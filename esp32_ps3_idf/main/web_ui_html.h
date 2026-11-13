#ifndef WEB_UI_HTML_H
#define WEB_UI_HTML_H

static const char WEB_UI_INDEX_HTML[] = R"rawliteral(
<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Mini Console 3D - Flat Controller Bridge</title>
<style>
:root{
  --bg:#edf0f2;
  --card:#ffffff;
  --header:#2c3e50;
  --header-dark:#1e2b37;
  --teal:#16a085;
  --teal-light:#1abc9c;
  --teal-hover:#138d75;
  --teal-bg:#e8f8f5;
  --border:#d5dbdb;
  --border-light:#e5e9ec;
  --txt:#2c3e50;
  --txt-muted:#7f8c8d;
  --danger:#e74c3c;
  --danger-hover:#c0392b;
  --warn:#f39c12;
  --white:#ffffff;
  --radius:4px;
}
*{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;}
body{background:var(--bg);color:var(--txt);padding:16px;max-width:1320px;margin:0 auto;line-height:1.45;}

/* ==========================================================================
   TOP NAVIGATION BAR (Direct match to Flat Design Kit Navbar)
   ========================================================================== */
.navbar-flat{
  background:var(--card);
  border:1px solid var(--border);
  border-radius:var(--radius);
  padding:0;
  margin-bottom:16px;
  display:flex;
  flex-wrap:wrap;
  align-items:stretch;
  justify-content:space-between;
  box-shadow:0 1px 3px rgba(0,0,0,0.04);
}
.nav-left{
  display:flex;
  align-items:center;
  flex-wrap:wrap;
}
.brand-box{
  padding:14px 20px;
  background:var(--header);
  color:var(--white);
  display:flex;
  flex-direction:column;
  justify-content:center;
  border-top-left-radius:var(--radius);
  border-bottom-left-radius:var(--radius);
}
.brand-box h1{font-size:1.05rem;font-weight:700;letter-spacing:.5px;display:flex;align-items:center;gap:6px;}
.brand-box p{font-size:.72rem;color:#bdc3c7;margin-top:2px;}
.nav-tabs{
  display:flex;
  align-items:center;
  flex-wrap:wrap;
}
.nav-tab{
  padding:18px 20px;
  font-size:.82rem;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:.6px;
  color:var(--txt-muted);
  text-decoration:none;
  cursor:pointer;
  border-right:1px solid var(--border-light);
  transition:all .15s ease;
  display:flex;
  align-items:center;
  gap:6px;
}
.nav-tab:hover{background:#f8f9fa;color:var(--teal);}
.nav-tab.active{
  background:var(--teal);
  color:var(--white);
}

.nav-right{
  display:flex;
  align-items:center;
  gap:8px;
  padding:8px 14px;
  flex-wrap:wrap;
}
.flat-pill{
  padding:7px 12px;
  font-size:.78rem;
  font-weight:700;
  border-radius:var(--radius);
  display:flex;
  align-items:center;
  gap:6px;
  text-decoration:none;
}
.flat-pill.domain{
  background:var(--header);
  color:var(--white);
}
.flat-pill.bt{
  background:var(--teal-bg);
  color:var(--teal);
  border:1px solid var(--teal);
}
.flat-icon-btn{
  width:36px;
  height:36px;
  background:var(--teal);
  color:var(--white);
  border-radius:var(--radius);
  display:flex;
  align-items:center;
  justify-content:center;
  cursor:pointer;
  border:none;
  font-size:1.1rem;
  transition:.15s;
}
.flat-icon-btn:hover{background:var(--teal-hover);}

/* ==========================================================================
   FLAT CARDS & HEADERS (Like MENU / LOGIN / PROFILE cards in the kit)
   ========================================================================== */
.card{
  background:var(--card);
  border:1px solid var(--border);
  border-radius:var(--radius);
  margin-bottom:16px;
  overflow:hidden;
  box-shadow:0 1px 3px rgba(0,0,0,0.03);
}
.card-hdr{
  background:var(--header);
  color:var(--white);
  padding:12px 18px;
  font-size:.88rem;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:.6px;
  display:flex;
  align-items:center;
  justify-content:space-between;
}
.card-hdr-title{
  display:flex;
  align-items:center;
  gap:8px;
}
.card-body{
  padding:16px 18px;
}

.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:16px;margin-bottom:16px;}

/* ==========================================================================
   TARGET PLAYER ROLE BAR (Segmented Flat Switch like the kit)
   ========================================================================== */
.role-grid{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(210px,1fr));
  gap:10px;
}
.role-btn{
  background:var(--card);
  border:2px solid var(--border);
  border-radius:var(--radius);
  padding:14px 16px;
  font-size:.86rem;
  font-weight:700;
  color:var(--txt);
  cursor:pointer;
  transition:all .15s ease;
  display:flex;
  align-items:center;
  justify-content:space-between;
  text-align:left;
}
.role-btn:hover{
  border-color:var(--teal);
  background:var(--teal-bg);
  color:var(--teal);
}
.role-btn.active{
  background:var(--teal) !important;
  border-color:var(--teal) !important;
  color:#ffffff !important;
  box-shadow:0 2px 8px rgba(22,160,133,0.35);
}
.role-btn.active span{
  color:#ffffff !important;
}
.role-btn .role-check{
  display:inline-block;
  width:20px;
  height:20px;
  border-radius:50%;
  border:2px solid currentColor;
  text-align:center;
  line-height:16px;
  font-size:.75rem;
}
.role-btn.active .role-check{
  background:#ffffff !important;
  color:var(--teal) !important;
  border-color:#ffffff !important;
  font-weight:900;
}

/* ==========================================================================
   4 CONTROLLER CARDS (Recreating MENU Card with Teal Bottom Toolbar)
   ========================================================================== */
.pads-grid{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(300px,1fr));
  gap:16px;
}
.pad-card{
  background:var(--card);
  border:1px solid var(--border);
  border-radius:var(--radius);
  overflow:hidden;
  display:flex;
  flex-direction:column;
  transition:.2s;
  box-shadow:0 1px 3px rgba(0,0,0,0.03);
}
.pad-card.active{
  border-color:var(--teal);
}
.pad-card-hdr{
  background:var(--header);
  color:var(--white);
  padding:10px 14px;
  display:flex;
  justify-content:space-between;
  align-items:center;
}
.pad-card.active .pad-card-hdr{
  background:var(--header-dark);
  border-bottom:2px solid var(--teal);
}
.pad-title{
  font-size:.88rem;
  font-weight:700;
  display:flex;
  align-items:center;
  gap:8px;
}
.flat-tag{
  padding:2px 8px;
  border-radius:2px;
  font-size:.72rem;
  font-weight:700;
  text-transform:uppercase;
  background:#34495e;
  color:var(--white);
}
.pad-card.active .flat-tag{
  background:var(--teal);
  color:var(--white);
}
.pad-card-body{
  padding:12px 14px;
  display:flex;
  flex-direction:column;
  gap:10px;
  flex:1;
}

/* Flat List Rows inside Cards */
.flat-row{
  display:flex;
  justify-content:space-between;
  align-items:center;
  font-size:.78rem;
  padding:6px 8px;
  background:#f8f9fa;
  border:1px solid var(--border-light);
  border-radius:var(--radius);
}
.flat-row b{color:var(--txt);}

/* Sticks & Triggers */
.sticks-row{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:8px;
}
.stick-cell{
  background:#f8f9fa;
  border:1px solid var(--border-light);
  border-radius:var(--radius);
  padding:6px 8px;
  font-size:.74rem;
  font-family:monospace;
}
.stick-cell .stick-lbl{
  font-size:.7rem;
  font-weight:700;
  color:var(--txt-muted);
  text-transform:uppercase;
  margin-bottom:2px;
  font-family:sans-serif;
}

/* Meter / Progress Bar (direct match to kit progress meter) */
.meter-wrap{
  background:#f8f9fa;
  border:1px solid var(--border-light);
  border-radius:var(--radius);
  padding:6px 8px;
  display:flex;
  flex-direction:column;
  gap:4px;
}
.meter-label{
  display:flex;
  justify-content:space-between;
  font-size:.72rem;
  color:var(--txt-muted);
  font-weight:600;
}
.meter-track{
  height:8px;
  background:#e2e8f0;
  border-radius:2px;
  overflow:hidden;
}
.meter-fill{
  height:100%;
  background:var(--teal);
  width:0%;
  transition:width .1s linear;
}

/* Button pills */
.btn-display{
  min-height:26px;
  background:#f8f9fa;
  border:1px solid var(--border-light);
  border-radius:var(--radius);
  padding:5px 8px;
  font-size:.74rem;
  font-family:monospace;
  color:var(--teal);
  font-weight:700;
  word-break:break-all;
}

/* Slot selection segmented strip */
.slot-select-title{
  font-size:.72rem;
  font-weight:700;
  color:var(--txt-muted);
  text-transform:uppercase;
  margin-bottom:4px;
  display:flex;
  justify-content:space-between;
}
.slot-btn-group{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:4px;
}
.slot-pill-btn{
  background:#ffffff;
  border:1px solid var(--border);
  color:var(--txt);
  padding:6px 0;
  font-size:.74rem;
  font-weight:700;
  border-radius:var(--radius);
  cursor:pointer;
  transition:.15s;
}
.slot-pill-btn:hover{background:#f1f5f9;border-color:var(--teal);}
.slot-pill-btn.current{
  background:var(--teal);
  color:var(--white);
  border-color:var(--teal);
}

.led-btn-group{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:4px;
  margin-top:4px;
}
.led-pill-btn{
  background:#f8f9fa;
  border:1px solid var(--border-light);
  color:var(--txt-muted);
  padding:4px 0;
  font-size:.68rem;
  font-weight:600;
  border-radius:var(--radius);
  cursor:pointer;
}
.led-pill-btn:hover{border-color:var(--teal);color:var(--teal);}

/* CARD BOTTOM TOOLBAR (Match to 5-button solid teal toolbar in kit) */
.pad-toolbar{
  background:var(--teal);
  display:grid;
  grid-template-columns:repeat(3,1fr);
  border-top:1px solid rgba(0,0,0,0.06);
}
.pad-tool-btn{
  background:transparent;
  border:none;
  border-right:1px solid rgba(255,255,255,0.22);
  color:var(--white);
  padding:10px 4px;
  font-size:.75rem;
  font-weight:700;
  cursor:pointer;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:4px;
  transition:.15s;
}
.pad-tool-btn:last-child{border-right:none;}
.pad-tool-btn:hover{background:rgba(0,0,0,0.1);}
.pad-tool-btn.danger{background:var(--danger);}
.pad-tool-btn.danger:hover{background:var(--danger-hover);}

/* ==========================================================================
   FLAT FORM CONTROLS & TOGGLES (Matching sliders, switches & inputs)
   ========================================================================== */
.form-row{margin-bottom:12px;}
.form-row label{
  display:block;
  font-size:.78rem;
  font-weight:700;
  color:var(--txt);
  margin-bottom:5px;
  text-transform:uppercase;
  letter-spacing:.3px;
}
.form-row input[type="text"],
.form-row input[type="password"],
.form-row input[type="number"],
.form-row select{
  width:100%;
  padding:10px 12px;
  border-radius:var(--radius);
  border:1px solid var(--border);
  background:var(--white);
  color:var(--txt);
  font-size:.86rem;
  transition:border-color .15s ease;
  outline:none;
}
.form-row input:focus{
  border-color:var(--teal);
  box-shadow:0 0 0 2px rgba(22,160,133,0.15);
}
.form-row small{
  display:block;
  color:var(--txt-muted);
  font-size:.72rem;
  margin-top:4px;
}

/* Flat Segmented Switch [ ON ] [ OFF ] */
.flat-switch-wrap{
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:10px 12px;
  background:#f8f9fa;
  border:1px solid var(--border-light);
  border-radius:var(--radius);
  margin-bottom:12px;
}
.flat-switch-label{
  font-size:.82rem;
  font-weight:700;
  color:var(--txt);
}
.flat-switch{
  display:inline-flex;
  border-radius:var(--radius);
  overflow:hidden;
  border:1px solid var(--border);
  cursor:pointer;
  user-select:none;
}
.flat-switch input{display:none;}
.flat-switch .sw-opt{
  padding:6px 14px;
  font-size:.75rem;
  font-weight:800;
  background:var(--white);
  color:var(--txt-muted);
  transition:all .15s ease;
}
.flat-switch input:checked ~ .sw-on{
  background:var(--teal);
  color:var(--white);
}
.flat-switch input:not(:checked) ~ .sw-off{
  background:var(--header);
  color:var(--white);
}

/* Flat Slider */
.slider-container{
  margin-top:6px;
}
.slider-flat{
  -webkit-appearance:none;
  width:100%;
  height:8px;
  border-radius:2px;
  background:#dfe4ea;
  outline:none;
  transition:background .2s;
}
.slider-flat::-webkit-slider-thumb{
  -webkit-appearance:none;
  appearance:none;
  width:20px;
  height:20px;
  border-radius:2px;
  background:var(--teal);
  cursor:pointer;
  box-shadow:0 1px 3px rgba(0,0,0,0.2);
}
.slider-flat::-moz-range-thumb{
  width:20px;
  height:20px;
  border-radius:2px;
  background:var(--teal);
  cursor:pointer;
  border:none;
}

/* Flat Button Kit */
.btn-flat{
  background:var(--teal);
  color:var(--white);
  border:none;
  padding:10px 16px;
  border-radius:var(--radius);
  cursor:pointer;
  font-size:.8rem;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:.5px;
  display:inline-flex;
  align-items:center;
  gap:6px;
  transition:all .15s ease;
}
.btn-flat:hover{background:var(--teal-hover);}
.btn-flat.secondary{background:var(--header);}
.btn-flat.secondary:hover{background:var(--header-dark);}
.btn-flat.danger{background:var(--danger);}
.btn-flat.danger:hover{background:var(--danger-hover);}
.btn-flat.outline{
  background:transparent;
  color:var(--txt);
  border:1px solid var(--border);
}
.btn-flat.outline:hover{background:#f8f9fa;border-color:var(--teal);color:var(--teal);}
.btn-flat.sm{padding:5px 8px;font-size:.72rem;}

.btn-group-flat{
  display:flex;
  gap:6px;
  flex-wrap:wrap;
  margin-top:6px;
}

/* Stat Lines */
.stat-row{
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:8px 0;
  border-bottom:1px solid var(--border-light);
  font-size:.82rem;
}
.stat-row:last-child{border-bottom:none;}
.stat-row span{color:var(--txt-muted);}
.stat-row strong{color:var(--txt);}

/* Badges */
.badge-flat{
  padding:3px 10px;
  font-size:.72rem;
  font-weight:700;
  border-radius:var(--radius);
  text-transform:uppercase;
  letter-spacing:.3px;
}
.badge-flat.ok{background:var(--teal-bg);color:var(--teal);border:1px solid var(--teal);}
.badge-flat.err{background:#fde8e7;color:var(--danger);border:1px solid var(--danger);}

/* Toast */
.toast{
  position:fixed;
  bottom:20px;
  right:20px;
  background:var(--header);
  color:var(--white);
  padding:12px 20px;
  border-radius:var(--radius);
  border-left:4px solid var(--teal);
  font-size:.85rem;
  font-weight:600;
  display:none;
  z-index:9999;
  box-shadow:0 4px 12px rgba(0,0,0,0.15);
}

.scan-list{
  max-height:160px;
  overflow-y:auto;
  background:var(--white);
  border:1px solid var(--border);
  border-radius:var(--radius);
  margin-top:6px;
  display:none;
}
.scan-item{
  padding:8px 12px;
  font-size:.8rem;
  border-bottom:1px solid var(--border-light);
  cursor:pointer;
  display:flex;
  justify-content:space-between;
  color:var(--txt);
}
.scan-item:hover{background:var(--teal-bg);color:var(--teal);}
</style>
</head>
<body>

<!-- TOP NAVBAR (Flat Design Kit Style) -->
<nav class="navbar-flat">
  <div class="nav-left">
    <div class="brand-box">
      <h1>🎮 MINI CONSOLE 3D</h1>
      <p>PS3 DualShock 3 Wireless Bridge</p>
    </div>
    <div class="nav-tabs">
      <div class="nav-tab active"><span>🕹️</span> แดชบอร์ด (Dashboard)</div>
      <div class="nav-tab"><span>🎯</span> ผู้เล่น 1-4</div>
      <div class="nav-tab"><span>📡</span> เครือข่าย (Network)</div>
    </div>
  </div>
  <div class="nav-right">
    <a id="headerMdnsLink" href="http://MiniConsole-PS3.local" target="_blank" class="flat-pill domain">
      🌐 <span id="headerMdnsText">MiniConsole-PS3.local</span>
    </a>
    <div class="flat-pill bt">
      บลูทูธ: <b id="btMac">44:D8:32:C3:8B:C5</b>
    </div>
    <button type="button" class="flat-icon-btn" title="รีเฟรชข้อมูล" onclick="fetchStatus()">⚙️</button>
  </div>
</nav>

<!-- 1. TARGET PLAYER ROLE & BLUETOOTH MAC CARD -->
<section class="card">
  <div class="card-hdr">
    <div class="card-hdr-title">
      <span>🎯</span>
      <span>กำหนดตำแหน่งผู้เล่น & Bluetooth Host MAC (Target Player & Bluetooth Settings)</span>
    </div>
    <span id="targetPlayerBadge" class="badge-flat ok">ปัจจุบัน: ผู้เล่น 1 (P1)</span>
  </div>
  <div class="card-body">
    <p style="font-size:.82rem;color:var(--txt-muted);margin-bottom:12px;">
      เลือกตำแหน่งผู้เล่นที่ต้องการให้จอยเข้าประจำการ (P1–P4) และแก้ไขค่า Bluetooth MAC Address จากนั้นกด <b>💾 บันทึกค่า (Save)</b> เพื่อบันทึกลงบอร์ดถาวร
    </p>

    <!-- Role Selection Buttons (Segmented) -->
    <div class="role-grid">
      <button type="button" id="btnRole1" class="role-btn" onclick="selectRole(1)">
        <span>🎮 ผู้เล่น 1 (P1 - ไฟ LED 1)</span>
        <span class="role-check"></span>
      </button>
      <button type="button" id="btnRole2" class="role-btn" onclick="selectRole(2)">
        <span>🎮 ผู้เล่น 2 (P2 - ไฟ LED 2)</span>
        <span class="role-check"></span>
      </button>
      <button type="button" id="btnRole3" class="role-btn" onclick="selectRole(3)">
        <span>🎮 ผู้เล่น 3 (P3 - ไฟ LED 3)</span>
        <span class="role-check"></span>
      </button>
      <button type="button" id="btnRole4" class="role-btn" onclick="selectRole(4)">
        <span>🎮 ผู้เล่น 4 (P4 - ไฟ LED 4)</span>
        <span class="role-check"></span>
      </button>
    </div>

    <!-- Bluetooth MAC Edit & Save Row -->
    <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border-light);">
      <div class="form-row" style="margin-bottom:6px;">
        <label>Bluetooth Host MAC Address (ค่า MAC ของบอร์ด ESP32 ที่จอย PS3 จะเชื่อมต่อเข้า)</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <input type="text" id="customBtMac" placeholder="20:00:00:00:AA:01" maxlength="17"
            style="flex:1;min-width:240px;font-family:monospace;font-weight:700;font-size:.92rem;color:var(--teal);letter-spacing:1px;text-transform:uppercase;">
          <button type="button" class="btn-flat" id="btnSaveRoleAndMac" style="padding:10px 22px;font-size:.85rem;white-space:nowrap;" onclick="savePlayerAndBtMac()">
            💾 บันทึกค่า (Save)
          </button>
        </div>
      </div>
      <div class="btn-group-flat" style="margin-top:6px;">
        <button type="button" class="btn-flat outline sm" onclick="setBtMacPreset('20:00:00:00:AA:01')">🎯 จอย 1 แนะนำ (20:00:00:00:AA:01)</button>
        <button type="button" class="btn-flat outline sm" onclick="setBtMacPreset('20:00:00:00:AA:02')">🎯 จอย 2 แนะนำ (20:00:00:00:AA:02)</button>
        <button type="button" class="btn-flat outline sm" onclick="setBtMacPreset('20:00:00:00:AA:03')">🎯 จอย 3 แนะนำ (20:00:00:00:AA:03)</button>
        <button type="button" class="btn-flat outline sm" onclick="setBtMacPreset('20:00:00:00:AA:04')">🎯 จอย 4 แนะนำ (20:00:00:00:AA:04)</button>
        <button type="button" class="btn-flat outline sm" id="btnHwMacPreset" onclick="setBtMacPreset(window._hwBtMac || '78:E3:6D:11:C3:D2')">📟 ฮาร์ดแวร์บอร์ด (<span id="hwMacVal">78:E3:6D:11:C3:D2</span>)</button>
      </div>
      <small style="color:var(--txt-muted);display:block;margin-top:6px;">
        * หากแก้ไขค่า Bluetooth MAC ระบบจะบันทึกลง NVS และรีสตาร์ต ESP32 อัตโนมัติเพื่อให้บลูทูธทำงานด้วย MAC ใหม่ทันที ส่วนการเปลี่ยนตำแหน่งผู้เล่นจะส่งผลทันที
      </small>
    </div>
  </div>
</section>

<!-- 2. CONTROLLERS TELEMETRY & CONTROLS -->
<section class="card">
  <div class="card-hdr">
    <div class="card-hdr-title">
      <span>🕹️</span>
      <span>สถานะและค่าควบคุมจอยสติก (Controller Slots)</span>
    </div>
    <span id="conCountBadge" class="badge-flat err">0 / 1 Connected</span>
  </div>
  <div class="card-body">
    <div class="pads-grid" id="padGrid"></div>
  </div>
</section>

<!-- 3. DUAL COLUMN: SENSITIVITY & NETWORK CONFIG -->
<div class="grid">
  <!-- SENSITIVITY CARD -->
  <section class="card">
    <div class="card-hdr">
      <div class="card-hdr-title">
        <span>⚡</span>
        <span>ความไวและการตอบสนองจอย (Sensitivity)</span>
      </div>
      <span class="badge-flat ok">100Hz Low Latency</span>
    </div>
    <div class="card-body">
      <div class="stat-row">
        <span>ตำแหน่งผู้เล่นปัจจุบัน:</span>
        <strong id="activeRoleText" style="color:var(--teal);">Player 1 (ไฟดวงที่ 1)</strong>
      </div>
      <div class="stat-row">
        <span>การเข้าใช้งานผ่าน mDNS:</span>
        <strong id="mdnsSettingText" style="color:var(--teal);">http://MiniConsole-PS3.local</strong>
      </div>
      <div class="stat-row">
        <span>การเชื่อมต่อบลูทูธ:</span>
        <span>ต่อตรงอัตโนมัติ ไม่ต้องตั้งค่า Master</span>
      </div>

      <div style="margin-top:14px;">
        <div class="form-row">
          <label>ความถี่ส่งสัญญาณจอย: <b id="lblRate" style="color:var(--teal);">100 Hz</b></label>
          <div class="slider-container">
            <input type="range" class="slider-flat" id="sendRateSlider" min="20" max="100" value="100" oninput="onRateSlider(this.value)">
            <input type="hidden" id="sendRate" value="100">
          </div>
          <div class="btn-group-flat">
            <button type="button" class="btn-flat outline sm" onclick="setRatePreset(60)">60 Hz (มาตรฐาน)</button>
            <button type="button" class="btn-flat outline sm" onclick="setRatePreset(100)">⚡ 100 Hz (ไวสุด)</button>
          </div>
        </div>

        <div class="form-row" style="margin-top:12px;">
          <label>Deadzone อนาล็อก: <b id="lblDz" style="color:var(--teal);">4</b></label>
          <div class="slider-container">
            <input type="range" class="slider-flat" id="deadzoneSlider" min="0" max="30" value="4" oninput="onDzSlider(this.value)">
            <input type="hidden" id="deadzone" value="4">
          </div>
          <div class="btn-group-flat">
            <button type="button" class="btn-flat outline sm" onclick="setDeadzonePreset(4)">⚡ ไวสุด (4)</button>
            <button type="button" class="btn-flat outline sm" onclick="setDeadzonePreset(8)">⚖️ ปกติ (8)</button>
            <button type="button" class="btn-flat outline sm" onclick="setDeadzonePreset(16)">🛡️ กันแกนเอียง (16)</button>
          </div>
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-top:16px;">
        <button class="btn-flat" onclick="saveConfig(false)">💾 บันทึกความไวจอย</button>
        <button class="btn-flat secondary" onclick="saveConfig(true)">🔄 รีบูต ESP32</button>
      </div>
    </div>
  </section>

  <!-- WIFI & WS SETTINGS CARD -->
  <section class="card">
    <div class="card-hdr">
      <div class="card-hdr-title">
        <span>📡</span>
        <span>เครือข่าย WiFi & Game Server WebSocket</span>
      </div>
      <span id="wsBadge" class="badge-flat err">WS Disconnected</span>
    </div>
    <div class="card-body">
      <div class="stat-row">
        <span>โหมด AP (สัญญาณจาก ESP32):</span>
        <strong id="apInfo">192.168.4.1</strong>
      </div>
      <div class="stat-row">
        <span>โหมด STA (เกาะ WiFi บ้าน):</span>
        <strong id="staInfo">Disconnected</strong>
      </div>
      <div class="stat-row">
        <span>แพ็กเกจส่งเข้าเกม (TX / RX):</span>
        <strong id="pktInfo">0 / 0</strong>
      </div>

      <!-- Segmented Flat Switch: STA Mode -->
      <div class="flat-switch-wrap" style="margin-top:12px;">
        <span class="flat-switch-label">เชื่อมต่อ WiFi บ้าน (STA Mode)</span>
        <label class="flat-switch">
          <input type="checkbox" id="staEnabled">
          <span class="sw-opt sw-on">ON</span>
          <span class="sw-opt sw-off">OFF</span>
        </label>
        <button type="button" class="btn-flat outline sm" onclick="scanWifi()" style="margin-left:8px;">🔍 สแกน WiFi</button>
      </div>
      <div id="wifiScanList" class="scan-list"></div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div class="form-row">
          <label>ชื่อ WiFi ที่เกาะ (STA SSID)</label>
          <input type="text" id="staSsid" placeholder="เช่น HomeWiFi_2.4G">
        </div>
        <div class="form-row">
          <label>รหัสผ่าน WiFi (STA Password)</label>
          <input type="password" id="staPass" placeholder="รหัสผ่าน WiFi">
        </div>
      </div>

      <!-- Segmented Flat Switch: WebSocket -->
      <div class="flat-switch-wrap">
        <span class="flat-switch-label">ส่งสัญญาณเข้าเกม (WebSocket)</span>
        <label class="flat-switch">
          <input type="checkbox" id="wsEnabled" checked>
          <span class="sw-opt sw-on">ON</span>
          <span class="sw-opt sw-off">OFF</span>
        </label>
      </div>
      <div class="form-row">
        <label>Game Server WebSocket URL</label>
        <input type="text" id="wsUrl" placeholder="ws://192.168.1.144:8080/ws">
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div class="form-row">
          <label>ชื่อ WiFi บอร์ด (AP SSID) & mDNS</label>
          <input type="text" id="apSsid" placeholder="MiniConsole-PS3">
          <small>URL mDNS จะตรงกับชื่อนี้อัตโนมัติ</small>
        </div>
        <div class="form-row">
          <label>รหัสผ่าน AP (อย่างน้อย 8 ตัว)</label>
          <input type="text" id="apPass" placeholder="12345678">
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-top:10px;">
        <button class="btn-flat" onclick="saveConfig(false)">💾 บันทึก WiFi / WS</button>
        <button class="btn-flat secondary" onclick="padAction('test_ws',0,0)">🚀 ทดสอบส่งปุ่มเข้าเกม</button>
      </div>
    </div>
  </section>
</div>

<div id="toast" class="toast"></div>

<script>
let firstLoad = true;
const BTN_NAMES = [
  [0, 'CROSS(X)'], [1, 'CIRCLE(O)'], [2, 'SQUARE([])'], [3, 'TRIANGLE(^)'],
  [4, 'L1'], [5, 'R1'], [6, 'L2'], [7, 'R2'],
  [8, 'SELECT'], [9, 'START'], [10, 'L3'], [11, 'R3'],
  [12, 'UP'], [13, 'DOWN'], [14, 'LEFT'], [15, 'RIGHT'], [16, 'PS']
];

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.style.display = 'none', 2800);
}

function decodeButtons(mask) {
  if (!mask) return 'ไม่มีปุ่มที่กด';
  let out = [];
  for (const [bit, name] of BTN_NAMES) {
    if (mask & (1 << bit)) out.push(name);
  }
  return out.join(' + ');
}

function onRateSlider(v) {
  document.getElementById('sendRate').value = v;
  document.getElementById('lblRate').textContent = v + ' Hz';
}

function onDzSlider(v) {
  document.getElementById('deadzone').value = v;
  document.getElementById('lblDz').textContent = v;
}

function setRatePreset(val) {
  document.getElementById('sendRateSlider').value = val;
  onRateSlider(val);
  showToast(`ตั้งค่าความถี่เป็น ${val} Hz`);
}

function setDeadzonePreset(val) {
  document.getElementById('deadzoneSlider').value = val;
  onDzSlider(val);
  showToast(`ตั้งค่า Deadzone เป็น ${val}`);
}

function initPadCards() {
  const grid = document.getElementById('padGrid');
  let html = '';
  for (let i = 0; i < 4; i++) {
    html += `
      <div class="pad-card" id="padCard${i}">
        <div class="pad-card-hdr">
          <div class="pad-title">
            <span class="flat-tag">จอย P${i + 1}</span>
            <span id="padDot${i}">●</span>
          </div>
          <span id="padBat${i}" style="font-size:.72rem;color:#bdc3c7;">รอเชื่อมต่อ</span>
        </div>

        <div class="pad-card-body">
          <div class="flat-row">
            <span>MAC: <b id="padMac${i}">--:--:--:--:--:--</b></span>
            <span id="padPkts${i}">0 pkts</span>
          </div>

          <div class="sticks-row">
            <div class="stick-cell">
              <div class="stick-lbl">Left Stick (L3)</div>
              <div id="padStickL${i}"><b>X:</b> 0 | <b>Y:</b> 0</div>
            </div>
            <div class="stick-cell">
              <div class="stick-lbl">Right Stick (R3)</div>
              <div id="padStickR${i}"><b>X:</b> 0 | <b>Y:</b> 0</div>
            </div>
          </div>

          <!-- L2 / R2 Flat Meters -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div class="meter-wrap">
              <div class="meter-label"><span>หน้าไก L2</span><b id="padL2_${i}">0</b></div>
              <div class="meter-track"><div class="meter-fill" id="padL2Bar_${i}"></div></div>
            </div>
            <div class="meter-wrap">
              <div class="meter-label"><span>หน้าไก R2</span><b id="padR2_${i}">0</b></div>
              <div class="meter-track"><div class="meter-fill" id="padR2Bar_${i}"></div></div>
            </div>
          </div>

          <div class="btn-display" id="padBtns${i}">ไม่มีปุ่มที่กด</div>

          <!-- Slot Assignment -->
          <div>
            <div class="slot-select-title">
              <span>กำหนดช่องผู้เล่น (Slot P${i + 1})</span>
              <span>เลือกช่อง</span>
            </div>
            <div class="slot-btn-group">
              ${[0,1,2,3].map(t => `
                <button type="button" class="slot-pill-btn ${t === i ? 'current' : ''}"
                  onclick="${t === i ? `padAction('led',${i},${t+1})` : `padAction('swap',${i},${t})`}">
                  ${t === i ? `● P${t+1}` : `ย้าย P${t+1}`}
                </button>
              `).join('')}
            </div>
            <div class="led-btn-group">
              ${[1,2,3,4].map(led => `
                <button type="button" class="led-pill-btn" onclick="padAction('led',${i},${led})">ไฟ LED ${led}</button>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Solid Teal Bottom Toolbar (Match to kit card footer) -->
        <div class="pad-toolbar">
          <button type="button" class="pad-tool-btn" onclick="padAction('rumble',${i},0)">📳 สั่น/ไฟ</button>
          <button type="button" class="pad-tool-btn" onclick="padAction('test_ws',${i},0)">🚀 ส่งค่า</button>
          <button type="button" class="pad-tool-btn danger" onclick="padAction('disconnect',${i},0)">❌ ตัดจอย</button>
        </div>
      </div>
    `;
  }
  grid.innerHTML = html;
}

async function fetchStatus() {
  try {
    const r = await fetch('/api/status');
    const d = await r.json();
    document.getElementById('btMac').textContent = d.bt_mac || '-';

    document.getElementById('apInfo').textContent = `${d.wifi.ap_ip} (${d.wifi.ap_clients} เครื่องเกาะอยู่)`;
    if (d.wifi.sta_connected) {
      document.getElementById('staInfo').innerHTML = `<span style="color:var(--teal)">${d.wifi.sta_ssid} (${d.wifi.sta_ip}, ${d.wifi.sta_rssi}dBm)</span>`;
    } else if (d.wifi.sta_connecting) {
      document.getElementById('staInfo').innerHTML = `<span style="color:var(--warn)">กำลังเชื่อมต่อ ${d.wifi.sta_ssid}...</span>`;
    } else {
      document.getElementById('staInfo').textContent = 'ไม่ได้เชื่อมต่อ';
    }

    const wsBadge = document.getElementById('wsBadge');
    const wsActive = d.ws.client_connected || d.ws.direct_clients > 0;
    wsBadge.className = 'badge-flat ' + (wsActive ? 'ok' : 'err');
    wsBadge.textContent = d.ws.client_connected
      ? 'WS Connected'
      : (d.ws.direct_clients > 0 ? `Direct WS (${d.ws.direct_clients})` : 'WS Disconnected');
    document.getElementById('pktInfo').textContent = `${d.ws.tx} / ${d.ws.rx}`;

    let conCount = 0;
    (d.pads || []).forEach((p, idx) => {
      if (p.connected) conCount++;
      const card = document.getElementById('padCard' + idx);
      if (!card) return;
      card.className = 'pad-card ' + (p.connected ? 'active' : '');
      const dot = document.getElementById('padDot' + idx);
      if (dot) dot.style.color = p.connected ? 'var(--teal-light)' : 'var(--txt-muted)';
      document.getElementById('padBat' + idx).textContent = p.connected ? `🔋 ${p.bat_str}` : 'รอเชื่อมต่อ (กด PS)';
      document.getElementById('padMac' + idx).textContent = p.connected ? p.mac : '--:--:--:--:--:--';
      document.getElementById('padPkts' + idx).textContent = `${p.pkts || 0} pkts`;
      document.getElementById('padStickL' + idx).innerHTML = `<b>X:</b> ${p.lx} | <b>Y:</b> ${p.ly}`;
      document.getElementById('padStickR' + idx).innerHTML = `<b>X:</b> ${p.rx} | <b>Y:</b> ${p.ry}`;
      document.getElementById('padL2_' + idx).textContent = p.l2;
      document.getElementById('padR2_' + idx).textContent = p.r2;
      const l2Bar = document.getElementById('padL2Bar_' + idx);
      if (l2Bar) l2Bar.style.width = Math.round((p.l2 / 255) * 100) + '%';
      const r2Bar = document.getElementById('padR2Bar_' + idx);
      if (r2Bar) r2Bar.style.width = Math.round((p.r2 / 255) * 100) + '%';
      document.getElementById('padBtns' + idx).textContent = p.connected ? decodeButtons(p.b) : 'ไม่มีปุ่มที่กด';
    });

    const badge = document.getElementById('conCountBadge');
    badge.className = 'badge-flat ' + (conCount > 0 ? 'ok' : 'err');
    badge.textContent = `${conCount} / 1 Connected`;

    const tp = (d.config && d.config.target_player) || d.target_player || 1;
    if (Date.now() > userRoleLockUntil) {
      currentSelectedRole = tp;
      renderRoleButtons(tp);
      const tpBadge = document.getElementById('targetPlayerBadge');
      if (tpBadge) tpBadge.textContent = `ปัจจุบัน: ผู้เล่น ${tp} (P${tp})`;
      const roleText = document.getElementById('activeRoleText');
      if (roleText) roleText.textContent = `Player ${tp} (ไฟดวงที่ ${tp})`;
    }

    // Dynamic mDNS update
    if (d.mdns_hostname || d.mdns_url) {
      const host = d.mdns_hostname || 'MiniConsole-PS3';
      const url = d.mdns_url || `http://${host}.local`;
      const headerLink = document.getElementById('headerMdnsLink');
      if (headerLink) headerLink.href = url;
      const headerText = document.getElementById('headerMdnsText');
      if (headerText) headerText.textContent = `${host}.local`;
      const mdnsSetting = document.getElementById('mdnsSettingText');
      if (mdnsSetting) mdnsSetting.textContent = url;
    }

    if (d.esp32_hw_bt_mac) {
      window._hwBtMac = d.esp32_hw_bt_mac;
      const hwEl = document.getElementById('hwMacVal');
      if (hwEl) hwEl.textContent = d.esp32_hw_bt_mac;
    }

    if (firstLoad && d.config) {
      firstLoad = false;
      document.getElementById('staEnabled').checked = !!d.config.sta_enabled;
      document.getElementById('staSsid').value = d.config.sta_ssid || '';
      document.getElementById('staPass').value = d.config.sta_pass || '';
      document.getElementById('wsEnabled').checked = !!d.config.ws_client_enabled;
      document.getElementById('wsUrl').value = d.config.ws_server_url || '';
      document.getElementById('apSsid').value = d.config.ap_ssid || '';
      document.getElementById('apPass').value = d.config.ap_pass || '';

      const macVal = d.config.custom_bt_mac || d.bt_mac || '20:00:00:00:AA:01';
      const macInput = document.getElementById('customBtMac');
      if (macInput) macInput.value = macVal;

      currentSelectedRole = d.config.target_player || 1;
      renderRoleButtons(currentSelectedRole);

      const rVal = d.config.send_rate_hz || 100;
      document.getElementById('sendRateSlider').value = rVal;
      onRateSlider(rVal);

      const dzVal = d.config.deadzone ?? 4;
      document.getElementById('deadzoneSlider').value = dzVal;
      onDzSlider(dzVal);
    }
  } catch (e) {
    // transient
  }
}

let currentSelectedRole = 1;
let userRoleLockUntil = 0;

function renderRoleButtons(num) {
  for (let i = 1; i <= 4; i++) {
    const btn = document.getElementById('btnRole' + i);
    if (btn) {
      if (i === num) {
        btn.className = 'role-btn active';
        const chk = btn.querySelector('.role-check');
        if (chk) chk.textContent = '✓';
      } else {
        btn.className = 'role-btn';
        const chk = btn.querySelector('.role-check');
        if (chk) chk.textContent = '';
      }
    }
  }
}

async function selectRole(num) {
  currentSelectedRole = num;
  userRoleLockUntil = Date.now() + 4500;
  renderRoleButtons(num);

  const tpBadge = document.getElementById('targetPlayerBadge');
  if (tpBadge) tpBadge.textContent = `กำลังตั้งค่า: ผู้เล่น ${num} (P${num})...`;
  const roleText = document.getElementById('activeRoleText');
  if (roleText) roleText.textContent = `Player ${num} (ไฟดวงที่ ${num})`;

  showToast(`⚡ กำลังกำหนดเป็น ผู้เล่น ${num} (P${num})...`);

  try {
    const r = await fetch('/api/ps3/action', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ action: 'set_target_player', target: num })
    });
    const d = await r.json();
    if (d.ok) {
      showToast(d.msg || `✅ กำหนดเป็น ผู้เล่น ${num} (P${num} - ไฟ LED ${num}) สำเร็จ!`);
      if (tpBadge) tpBadge.textContent = `ปัจจุบัน: ผู้เล่น ${num} (P${num})`;
      userRoleLockUntil = 0;
      fetchStatus();
    } else {
      showToast(d.msg || 'ไม่สามารถเปลี่ยนตำแหน่งผู้เล่นได้');
    }
  } catch (e) {
    showToast(`เลือก ผู้เล่น ${num} แล้ว (กดปุ่ม "💾 บันทึกค่า (Save)" เพื่อยืนยัน)`);
  }
}

function setBtMacPreset(mac) {
  if (mac) {
    const inp = document.getElementById('customBtMac');
    if (inp) inp.value = mac.toUpperCase();
    showToast(`เลือก MAC: ${mac.toUpperCase()} - กด "💾 บันทึกค่า (Save)" เพื่อบันทึก`);
  }
}

async function savePlayerAndBtMac() {
  const saveBtn = document.getElementById('btnSaveRoleAndMac');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = '⏳ กำลังบันทึก...';
  }
  userRoleLockUntil = Date.now() + 5000;

  const macInp = document.getElementById('customBtMac');
  const macVal = (macInp ? macInp.value.trim().toUpperCase() : '') || '20:00:00:00:AA:01';
  const payload = {
    target_player: currentSelectedRole,
    custom_bt_mac: macVal,
    use_custom_bt_mac: true
  };

  try {
    const r = await fetch('/api/config', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    const d = await r.json();
    showToast(d.msg || 'บันทึกตำแหน่งผู้เล่นและ Bluetooth MAC เรียบร้อย!');
    if (d.reboot) {
      showToast('🔄 บลูทูธ MAC เปลี่ยนแปลง - กำลังรีสตาร์ต ESP32...');
      setTimeout(() => location.reload(), 4000);
    } else {
      userRoleLockUntil = 0;
      fetchStatus();
    }
  } catch (e) {
    showToast('⚠️ บันทึกไม่สำเร็จ');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 บันทึกค่า (Save)';
    }
  }
}

function setTargetPlayer(num) {
  selectRole(num);
}

async function saveConfig(reboot) {
  const payload = {
    sta_enabled: document.getElementById('staEnabled').checked,
    sta_ssid: document.getElementById('staSsid').value.trim(),
    sta_pass: document.getElementById('staPass').value,
    ws_client_enabled: document.getElementById('wsEnabled').checked,
    ws_server_url: document.getElementById('wsUrl').value.trim(),
    ap_ssid: document.getElementById('apSsid').value.trim(),
    ap_pass: document.getElementById('apPass').value,
    send_rate_hz: parseInt(document.getElementById('sendRate').value, 10) || 100,
    deadzone: parseInt(document.getElementById('deadzone').value, 10) || 4,
    use_custom_bt_mac: true,
    custom_bt_mac: (document.getElementById('customBtMac') ? document.getElementById('customBtMac').value.trim().toUpperCase() : '20:00:00:00:AA:01') || '20:00:00:00:AA:01',
    target_player: currentSelectedRole,
    reboot: !!reboot
  };
  const r = await fetch('/api/config', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  const d = await r.json();
  showToast(d.msg || (reboot ? 'กำลังรีบูตบอร์ด ESP32...' : 'บันทึกการตั้งค่าเรียบร้อย!'));
  if (!d.reboot) fetchStatus();
}

async function padAction(action, slot, targetSlot) {
  const r = await fetch('/api/ps3/action', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ action, slot, target: targetSlot })
  });
  const d = await r.json();
  showToast(d.msg || 'ส่งคำสั่งสำเร็จ');
  fetchStatus();
}

async function scanWifi() {
  const list = document.getElementById('wifiScanList');
  list.style.display = 'block';
  list.innerHTML = '<div style="padding:10px;text-align:center;font-size:.8rem;color:var(--txt-muted);">กำลังสแกนเครือข่าย WiFi...</div>';
  try {
    const r = await fetch('/api/wifi/scan');
    const d = await r.json();
    if (!d.networks || d.networks.length === 0) {
      list.innerHTML = '<div style="padding:10px;text-align:center;font-size:.8rem;color:var(--txt-muted);">ไม่พบ WiFi หรือสแกนล้มเหลว</div>';
      return;
    }
    list.innerHTML = d.networks.map(n => `
      <div class="scan-item" onclick="selectWifi('${n.ssid.replace(/'/g, "\\'")}')">
        <span><b>${n.ssid}</b> (CH ${n.ch})</span>
        <span>${n.rssi} dBm</span>
      </div>
    `).join('');
  } catch (e) {
    list.innerHTML = '<div style="padding:10px;text-align:center;font-size:.8rem;color:var(--danger);">สแกน WiFi ผิดพลาด</div>';
  }
}

function selectWifi(ssid) {
  document.getElementById('staSsid').value = ssid;
  document.getElementById('staEnabled').checked = true;
  document.getElementById('wifiScanList').style.display = 'none';
  showToast(`เลือก WiFi: ${ssid}`);
}

initPadCards();
fetchStatus();
setInterval(fetchStatus, 350);
</script>
</body>
</html>
)rawliteral";

#endif // WEB_UI_HTML_H
