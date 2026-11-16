/**
 * Game 1: NEON KART RACING (ศึกซิ่งคาร์ทสายฟ้า)
 * - ความยาวสนามแข่งเพิ่มขึ้น 4 เท่า (480 เซกเมนต์, รัศมีสนาม 272 x 176 เมตร)
 * - มุมมองกล้อง (Player View) ล็อกตรงหลังรถของแต่ละคนอย่างแม่นยำ พร้อมป้าย P1-P4 เหนือรถและกรอบประจำจอ
 * - แถบ Bar ด้านบนไม่แสดงป้ายไอเทม
 * - การวางกล่องไอเทมและแผ่นบูสต์ในถนนวางสลับเลน (ซ้าย / กลาง / ขวา / สลับฟันปลา)
 * - ซุ้มป้าย FINISH และเส้นชัยตารางหมากรุกขนาดใหญ่ชัดเจนสวยงาม
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GameBase } from '../js/gameBase.js';
import { Config } from '../js/config.js';
import { createDetailedKart, createDetailedItemBox } from '../js/models.js';

const GRAND_PRIX_PTS_PX = [
    [533.0, 72.0], [510.0, 72.0], [494.6, 71.8], [466.1, 72.8], [450.4, 71.8],
    [432.0, 72.0], [410.0, 72.0], [388.0, 72.0], [366.0, 72.0], [344.0, 72.0],
    [322.0, 72.0], [301.6, 72.6], [275.7, 77.8], [259.2, 86.4], [244.0, 102.1],
    [233.5, 124.4], [230.4, 137.5], [229.3, 178.7], [230.2, 192.1], [233.2, 216.3],
    [236.2, 234.9], [240.5, 258.1], [243.4, 284.2], [237.8, 302.9], [220.2, 317.9],
    [199.7, 327.7], [175.5, 337.7], [154.2, 347.4], [134.5, 357.5], [113.8, 370.9],
    [95.4, 387.1], [84.3, 400.2], [72.0, 421.5], [64.8, 442.9], [61.4, 465.9],
    [61.1, 483.9], [64.0, 509.4], [71.4, 532.9], [82.7, 554.0], [95.7, 569.3],
    [113.3, 584.1], [133.2, 596.6], [151.9, 606.1], [175.0, 616.4], [195.4, 625.0],
    [219.4, 635.7], [238.1, 645.0], [261.6, 658.8], [278.5, 671.1], [296.6, 685.5],
    [314.8, 697.0], [335.8, 704.5], [361.6, 708.4], [381.5, 709.0], [408.8, 707.1],
    [435.9, 702.6], [453.8, 698.8], [475.2, 693.4], [500.4, 686.2], [521.8, 679.5],
    [543.3, 672.1], [566.4, 664.0], [588.3, 656.5], [610.1, 649.1], [631.0, 642.8],
    [667.8, 640.6], [683.3, 643.8], [707.3, 652.2], [730.6, 661.2], [747.9, 667.7],
    [773.1, 677.0], [791.0, 682.8], [812.8, 688.7], [834.6, 693.2], [862.3, 696.3],
    [884.7, 693.0], [907.1, 684.1], [922.6, 671.7], [934.8, 652.7], [941.7, 633.7],
    [946.7, 609.3], [948.9, 583.8], [948.7, 569.1], [945.4, 542.3], [940.2, 523.9],
    [929.6, 501.9], [915.0, 482.0], [901.0, 468.4], [882.6, 455.5], [860.6, 444.2],
    [841.6, 436.6], [816.2, 431.0], [794.9, 430.2], [746.3, 433.2], [734.2, 434.5],
    [712.2, 436.5], [689.9, 438.7], [663.6, 441.5], [630.5, 445.0], [592.8, 448.7],
    [584.1, 449.5], [528.6, 448.9], [518.9, 446.1], [492.2, 436.4], [473.8, 425.6],
    [457.2, 410.7], [446.8, 394.1], [442.4, 363.0], [449.6, 338.5], [461.1, 321.3],
    [478.0, 308.5], [497.5, 300.8], [523.4, 297.1], [542.5, 298.3], [567.4, 303.8],
    [584.2, 309.3], [608.1, 316.5], [629.7, 322.2], [655.5, 328.1], [679.2, 332.7],
    [702.7, 336.5], [718.5, 338.4], [791.5, 338.5], [803.7, 336.3], [832.9, 328.7],
    [853.8, 319.3], [872.3, 306.5], [886.2, 292.8], [901.0, 273.6], [912.7, 253.4],
    [920.6, 232.5], [923.2, 193.7], [921.1, 180.9], [910.2, 154.6], [898.3, 136.2],
    [884.0, 119.0], [869.8, 105.0], [850.2, 92.2], [830.6, 84.9], [810.2, 80.0],
    [788.2, 76.6], [749.4, 72.7], [731.0, 72.0], [709.0, 72.0], [687.0, 72.0],
    [665.0, 72.0], [643.0, 72.0], [621.0, 72.0], [599.0, 72.0], [577.0, 72.0],
    [555.0, 72.0]
];

export class Game1Kart extends GameBase {
    constructor(app, meta) {
        super(app, meta);
        this.karts = [];
        this.itemBoxes = [];
        this.boostPads = [];
        this.trackPoints = [];
        this.trackNormals = [];
        this.trackRadiusX = 272;
        this.trackRadiusZ = 176;
        this.trackWidth = 14.0;
        this.totalLaps = 3;
        this.winner = null;
        this.showSummary = false;
        this.finishArchElements = [];
        this.bannerMsg = '';
        this.bannerColor = '#00f0ff';
        this.bannerTimer = 0;
        this.countdownTimer = 5.0;
        this.lastCountdownStep = 5;
        this.raceStarted = false;
        this.raceTime = 0;
        this._disposed = false;
    }

    init() {
        super.init();
        this._disposed = false;
        this.scene.background = new THREE.Color(0x6eb5e5);
        this.scene.fog = new THREE.FogExp2(0x6eb5e5, 0.0012);
        this.buildEnvironment();
        this.buildTrack();
        this.spawnKarts();
        this.countdownTimer = 5.0;
        this.lastCountdownStep = 5;
        this.raceStarted = false;
        this.raceTime = 0;
        this.showBanner(`🏁 แข่งทั้งหมด ${this.totalLaps} รอบสนาม — เตรียมพร้อมออกตัว!`, '#ffb800', 4.5);
        this.audio.countdownBeep(false);
    }

    showBanner(msg, color = '#00f0ff', duration = 2.0) {
        this.bannerMsg = msg;
        this.bannerColor = color;
        this.bannerTimer = duration;
    }

    dispose() {
        this._disposed = true;
        this.audio.stopEngine();
        this.audio.stopVictoryMusic();
        super.dispose();
    }

    buildEnvironment() {
        const hemi = new THREE.HemisphereLight(0xdbeafe, 0x2a4d22, 1.15);
        this.scene.add(hemi);

        const sun = new THREE.DirectionalLight(0xffffff, 2.1);
        sun.position.set(45, 95, 65);
        sun.castShadow = true;
        this.scene.add(sun);
    }

    getTrackPoint(t) {
        const angle = t * Math.PI * 2;
        const x = Math.cos(angle) * this.trackRadiusX + Math.cos(angle * 3) * 26;
        const z = Math.sin(angle) * this.trackRadiusZ + Math.sin(angle * 2) * 56;
        return new THREE.Vector3(x, 0, z);
    }

    /**
     * สร้างเท็กซ์เจอร์ป้าย FINISH ขนาดใหญ่คมชัด พร้อมธงหมากรุกและกรอบนีออนเรืองแสง
     */
    createFinishBannerTexture() {
        const c = document.createElement('canvas');
        c.width = 1024;
        c.height = 256;
        const ctx = c.getContext('2d');

        // พื้นหลังไล่เฉดสีเข้มตัดแสงนีออน
        const grad = ctx.createLinearGradient(0, 0, 1024, 0);
        grad.addColorStop(0, '#070d1f');
        grad.addColorStop(0.5, '#12224d');
        grad.addColorStop(1, '#070d1f');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1024, 256);

        // แถบตารางหมากรุกซ้ายและขวา
        const sq = 32;
        for (let r = 0; r < 8; r++) {
            for (let col = 0; col < 5; col++) {
                ctx.fillStyle = (r + col) % 2 === 0 ? '#ffffff' : '#0a0f1d';
                ctx.fillRect(16 + col * sq, r * sq, sq, sq);
                ctx.fillRect(1024 - 16 - (col + 1) * sq, r * sq, sq, sq);
            }
        }

        // กรอบนีออนทองและฟ้า
        ctx.strokeStyle = '#ffb800';
        ctx.lineWidth = 10;
        ctx.strokeRect(8, 8, 1008, 240);
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 4;
        ctx.strokeRect(20, 20, 984, 216);

        // ข้อความ FINISH ขนาดใหญ่ชัดเจน
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 24;
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 92px sans-serif';
        ctx.fillText('🏁 FINISH 🏁', 512, 102);

        ctx.shadowColor = '#ffb800';
        ctx.shadowBlur = 16;
        ctx.fillStyle = '#ffb800';
        ctx.font = '900 46px sans-serif';
        ctx.fillText('เส้นชัย // START & FINISH LINE', 512, 194);

        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }

    /**
     * สร้างเท็กซ์เจอร์พื้นถนนลายตารางหมากรุกที่จุดเส้นชัย
     */
    createCheckeredRoadTexture() {
        const c = document.createElement('canvas');
        c.width = 512;
        c.height = 128;
        const ctx = c.getContext('2d');
        const cols = 16;
        const rows = 4;
        const cw = c.width / cols;
        const ch = c.height / rows;
        for (let r = 0; r < rows; r++) {
            for (let col = 0; col < cols; col++) {
                ctx.fillStyle = (r + col) % 2 === 0 ? '#ffffff' : '#111726';
                ctx.fillRect(col * cw, r * ch, cw, ch);
            }
        }
        ctx.strokeStyle = '#ffb800';
        ctx.lineWidth = 6;
        ctx.strokeRect(0, 0, c.width, c.height);
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }

    /**
     * สร้างเท็กซ์เจอร์ป้ายเบอร์ผู้เล่น (P1-P4) สำหรับติดข้างรถและท้ายรถ
     */
    createPlayerDecalTexture(playerIdx, colorCss) {
        const c = document.createElement('canvas');
        c.width = 256;
        c.height = 96;
        const ctx = c.getContext('2d');

        ctx.fillStyle = '#070c1b';
        ctx.beginPath();
        ctx.roundRect(6, 6, 244, 84, 14);
        ctx.fill();

        ctx.strokeStyle = colorCss;
        ctx.lineWidth = 7;
        ctx.stroke();

        // แถบสายฟ้าตกแต่งซ้าย-ขวา
        ctx.fillStyle = colorCss;
        ctx.fillRect(18, 22, 14, 52);
        ctx.fillRect(224, 22, 14, 52);

        ctx.shadowColor = colorCss;
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 54px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`P${playerIdx + 1}`, 128, 50);

        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }

    /**
     * ติดป้าย P1-P4 บนข้างรถ (ซ้าย/ขวา) และท้ายรถแทนป้ายลอยเหนือหัว
     */
    attachKartPlayerDecals(kartGroup, playerIdx, colorCss) {
        const tex = this.createPlayerDecalTexture(playerIdx, colorCss);
        const decalMat = new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true
        });

        // ป้ายข้างรถฝั่งซ้าย (+X)
        const leftDecal = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.28), decalMat);
        leftDecal.position.set(0.84, 0.44, -0.05);
        leftDecal.rotation.y = Math.PI / 2;
        kartGroup.add(leftDecal);

        // ป้ายข้างรถฝั่งขวา (-X)
        const rightDecal = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.28), decalMat);
        rightDecal.position.set(-0.84, 0.44, -0.05);
        rightDecal.rotation.y = -Math.PI / 2;
        kartGroup.add(rightDecal);

        // ป้ายท้ายรถ (-Z) เหนือท่อไอเสีย ใต้สปอยเลอร์หลัง มองเห็นชัดเจนจากกล้องหลังรถ
        const rearDecal = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 0.26), decalMat);
        rearDecal.position.set(0, 0.72, -1.30);
        rearDecal.rotation.y = Math.PI;
        kartGroup.add(rearDecal);
    }

    buildTrack() {
        const TRACK_SCALE = 1.6;
        const PX_TO_M = 0.12 * TRACK_SCALE;
        const roadY = 0.08;

        // 1. สร้างเส้นทางหลัก (Centerline) จากพิกัดสนาม Grand Prix Circuit (1:1 กับโมเดล Blender)
        const rawPts = GRAND_PRIX_PTS_PX.map(([px, py]) => new THREE.Vector3(
            (px - 512.0) * PX_TO_M,
            roadY,
            -(py - 405.5) * PX_TO_M
        ));
        const curve = new THREE.CatmullRomCurve3(rawPts, true, "catmullrom", 0.35);
        const segments = 360;
        this.trackPoints = curve.getSpacedPoints(segments);
        this.trackPoints.pop();

        for (let i = 0; i < segments; i++) {
            const p0 = this.trackPoints[i];
            const p1 = this.trackPoints[(i + 1) % segments];
            const tangent = new THREE.Vector3().subVectors(p1, p0).normalize();
            const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);
            this.trackNormals.push(normal);
        }

        // 2. โหลดโมเดล 3D สนามแข่ง Grand Prix Circuit ที่สร้างจาก Blender (.glb)
        const gltfLoader = new GLTFLoader();
        gltfLoader.load(
            "/models/grand_prix_circuit.glb",
            (gltf) => {
                if (!this.scene || this._disposed) return;
                const circuit = gltf.scene;
                circuit.scale.setScalar(TRACK_SCALE);
                circuit.traverse((child) => {
                    if (!child.isMesh) return;
                    const n = child.name || "";
                    if (n === "Collision_Mesh" || n === "Racing_Line" || n.startsWith("Checkpoint_")) {
                        child.visible = false;
                    } else {
                        child.receiveShadow = true;
                        child.castShadow = n.startsWith("Tree_") || n.startsWith("Finish_") || n.startsWith("Control_") || n.startsWith("Pit_") || n.startsWith("Grandstand_") || n.startsWith("Billboard_") || n.startsWith("Sponsor_");
                    }
                });
                this.scene.add(circuit);
            },
            undefined,
            (err) => {
                console.warn("Could not load grand_prix_circuit.glb (fallback path active):", err);
            }
        );

        // ==================== แผ่นบูสต์ความเร็ว วางสลับซ้าย - กลาง - ขวา ====================
        const boostOffsets = [-3.6, 3.6, 0.0, -3.2, 3.2];
        let boostIdx = 0;
        for (let i = 16; i < segments; i += 22) {
            const pt = this.trackPoints[i];
            const ptNext = this.trackPoints[(i + 1) % segments];
            const normal = this.trackNormals[i];
            const lat = boostOffsets[boostIdx % boostOffsets.length];
            boostIdx++;

            const padPos = pt.clone().addScaledVector(normal, lat);
            const nextPos = ptNext.clone().addScaledVector(normal, lat);

            const padGroup = new THREE.Group();
            padGroup.position.set(padPos.x, 0.06, padPos.z);
            padGroup.lookAt(nextPos.x, 0.06, nextPos.z);

            const base = new THREE.Mesh(
                new THREE.BoxGeometry(3.4, 0.08, 4.8),
                new THREE.MeshStandardMaterial({ color: 0x0b2922, roughness: 0.3 })
            );
            padGroup.add(base);

            for (let c = -1; c <= 1; c++) {
                const strip = new THREE.Mesh(
                    new THREE.BoxGeometry(2.8, 0.1, 0.55),
                    new THREE.MeshBasicMaterial({ color: 0x05ffa1 })
                );
                strip.position.set(0, 0.03, c * 1.3);
                padGroup.add(strip);
            }
            this.scene.add(padGroup);
            this.boostPads.push({ pos: padPos.clone(), mesh: padGroup });
        }

        // ==================== กล่องไอเทม วางสลับเลน (ซ้าย / ขวา / กลาง / คู่สลับฟันปลา) ====================
        const itemPatterns = [
            [-3.8],          // เลนซ้าย
            [3.8],           // เลนขวา
            [0.0],           // เลนกลาง
            [-4.2, 2.2],     // สลับซ้ายสุด + ขวากลาง
            [-2.2, 4.2],     // สลับซ้ายกลาง + ขวาสุด
            [-3.6, 3.6]      // คู่ซ้าย-ขวา
        ];
        let patternStep = 0;
        for (let i = 24; i < segments - 12; i += 24) {
            const pt = this.trackPoints[i];
            const normal = this.trackNormals[i];
            const offsets = itemPatterns[patternStep % itemPatterns.length];
            patternStep++;

            offsets.forEach((latOffset) => {
                const boxPos = pt.clone().addScaledVector(normal, latOffset);
                const boxMesh = createDetailedItemBox('kart');
                boxMesh.position.set(boxPos.x, 1.4, boxPos.z);
                this.scene.add(boxMesh);
                this.itemBoxes.push({ pos: boxPos.clone(), mesh: boxMesh, cooldown: 0 });
            });
        }
    }

    spawnKarts() {
        const count = Math.min(4, Math.max(1, Config.players.activeCount));
        const p0 = this.trackPoints[0];
        const p1 = this.trackPoints[1];
        const startYaw = Math.atan2(p1.x - p0.x, p1.z - p0.z);
        const forward = new THREE.Vector3(Math.sin(startYaw), 0, Math.cos(startYaw));
        const rightVec = new THREE.Vector3(Math.cos(startYaw), 0, -Math.sin(startYaw));

        for (let i = 0; i < count; i++) {
            const colorInfo = Config.players.colors[i];
            const kartGroup = createDetailedKart(colorInfo.hex, i);

            // ติดป้าย P1-P4 ที่ข้างรถ (ซ้าย/ขวา) และท้ายรถแทนป้ายลอยเหนือรถ
            this.attachKartPlayerDecals(kartGroup, i, colorInfo.css);

            // วางตำแหน่งรถแยกเลนซ้าย-ขวาชัดเจนตามแนว Normal ของถนน เพื่อให้วิ่งตรงเลนตัวเองไม่ตัดหน้ากัน
            const laneOffset = count === 1 ? 0 : ((i / (count - 1)) - 0.5) * 7.2;
            const startNormal = this.trackNormals[0] || rightVec;
            kartGroup.position.copy(p0).addScaledVector(startNormal, laneOffset);
            kartGroup.rotation.y = startYaw;
            this.scene.add(kartGroup);

            // ตั้งกล้องประจำรถแต่ละคันให้เกาะติดด้านหลังรถของตัวเองตั้งแต่เฟรมแรก
            const cam = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 850);
            const initCamPos = kartGroup.position.clone()
                .addScaledVector(forward, -4.8)
                .add(new THREE.Vector3(0, 2.25, 0));
            cam.position.copy(initCamPos);
            const initLook = kartGroup.position.clone()
                .addScaledVector(forward, 3.0)
                .add(new THREE.Vector3(0, 0.85, 0));
            cam.lookAt(initLook);

            this.karts.push({
                index: i,
                mesh: kartGroup,
                camera: cam,
                laneOffset,
                speed: 0,
                maxSpeed: 36,
                topSpeedRecorded: 0,
                yaw: startYaw,
                driftDir: 0,
                driftCharge: 0,
                boostTimer: 0,
                boostCount: 0,
                itemsUsed: 0,
                item: null,
                waypointIdx: 0,
                lap: 1,
                lapStartTime: 0,
                bestLapTime: null,
                finishTime: null,
                finished: false,
                prevRank: i + 1,
                colorHex: colorInfo.hex,
                colorCss: colorInfo.css
            });
        }
    }

    getRankedKarts() {
        const segCount = this.trackPoints.length;
        return [...this.karts].sort((a, b) => {
            if (a.finished && b.finished) {
                return (a.finishTime || 0) - (b.finishTime || 0);
            }
            if (a.finished !== b.finished) {
                return a.finished ? -1 : 1;
            }
            const progA = (a.lap - 1) * segCount + a.waypointIdx;
            const progB = (b.lap - 1) * segCount + b.waypointIdx;
            if (progB !== progA) return progB - progA;
            const nextIdx = (a.waypointIdx + 1) % segCount;
            const distA = a.mesh.position.distanceTo(this.trackPoints[nextIdx]);
            const distB = b.mesh.position.distanceTo(this.trackPoints[nextIdx]);
            return distA - distB;
        });
    }

    fixedUpdate(dt) {
        // หมุนคริสตัลไฟบนยอดเสาซุ้มเส้นชัย FINISH
        this.finishArchElements.forEach((el) => {
            el.rotation.y += dt * 2.5;
            el.rotation.x += dt * 1.2;
        });

        if (this.bannerTimer > 0) {
            this.bannerTimer -= dt;
        }

        if (this.winner !== null) {
            this.audio.stopEngine();
            return;
        }

        for (const box of this.itemBoxes) {
            box.mesh.rotation.y += dt * 1.8;
            if (box.mesh.userData.innerCrystal) {
                box.mesh.userData.innerCrystal.rotation.x += dt * 3.2;
                box.mesh.userData.innerCrystal.rotation.y -= dt * 2.5;
            }
            if (box.cooldown > 0) {
                box.cooldown -= dt;
                box.mesh.visible = box.cooldown <= 0;
            }
        }

        // นับถอยหลัง 5 วินาทีก่อนเริ่มเกม
        if (!this.raceStarted) {
            this.countdownTimer -= dt;
            const step = Math.ceil(this.countdownTimer);
            if (step < this.lastCountdownStep && step >= 1) {
                this.lastCountdownStep = step;
                this.audio.countdownBeep(false);
                this.karts.forEach((k) => {
                    if (this.input.pads[k.index]?.connected) {
                        this.input.rumble(k.index, 40, 40, 60);
                    }
                });
            }
            if (this.countdownTimer <= 0) {
                this.raceStarted = true;
                this.countdownTimer = 0;
                this.audio.countdownBeep(true);
                this.showBanner(`🚀 GO! ออกตัวซิ่งเลย — แข่ง ${this.totalLaps} รอบ เข้าเส้นชัยคนแรกชนะ!`, '#05ffa1', 2.4);
                this.karts.forEach((k) => {
                    if (this.input.pads[k.index]?.connected) {
                        this.input.rumble(k.index, 140, 140, 160);
                    }
                });
            } else {
                this.audio.updateEngine(0.08, false, false);
                this.updateHUD();
                return;
            }
        }

        this.raceTime += dt;

        const segCount = this.trackPoints.length;

        this.karts.forEach((k) => {
            const pad = this.input.pads[k.index];
            const isHuman = pad && pad.connected;
            let throttle = 0;
            let steer = 0;
            let drifting = false;
            let useItem = false;

            if (isHuman) {
                throttle = (pad.cross || pad.r2Btn) ? Math.max(0.8, pad.r2 || 1) : (pad.circle || pad.l2Btn ? -0.6 : 0);
                steer = -pad.lx;
                drifting = pad.r1 || pad.l1;
                useItem = pad.justPressed.square || pad.justPressed.triangle;
            } else {
                const targetIdx = (k.waypointIdx + 5) % segCount;
                const basePt = this.trackPoints[targetIdx];
                const normal = this.trackNormals[targetIdx] || new THREE.Vector3(1, 0, 0);
                // ให้บอทแต่ละคันวิ่งในเลนของตัวเอง ไม่ซ้อนทับกัน
                const targetPt = basePt.clone().addScaledVector(normal, k.laneOffset * 0.75);
                const toTarget = new THREE.Vector3().subVectors(targetPt, k.mesh.position);
                const desiredYaw = Math.atan2(toTarget.x, toTarget.z);
                let diff = desiredYaw - k.yaw;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                steer = THREE.MathUtils.clamp(diff * 2.2, -1, 1);
                throttle = 0.92;
                drifting = Math.abs(diff) > 0.45 && k.speed > 18;
                useItem = k.item !== null && Math.random() < 0.03;
            }

            if (k.boostTimer > 0) {
                k.boostTimer -= dt;
                if (k.index === 0) this.graphics.setBoostBlur(0.85);
            } else if (k.index === 0) {
                this.graphics.setBoostBlur(0.0);
            }

            const topSpeed = k.boostTimer > 0 ? k.maxSpeed * 1.42 : k.maxSpeed;
            if (throttle > 0) {
                k.speed = THREE.MathUtils.lerp(k.speed, topSpeed * throttle, dt * 2.6);
            } else if (throttle < 0) {
                k.speed = THREE.MathUtils.lerp(k.speed, -10, dt * 3.5);
            } else {
                k.speed *= (1 - dt * 1.5);
            }

            const kmh = Math.round(Math.abs(k.speed) * 4.2);
            if (kmh > k.topSpeedRecorded) k.topSpeedRecorded = kmh;

            if (drifting && Math.abs(steer) > 0.15 && k.speed > 12) {
                if (k.driftDir === 0) k.driftDir = Math.sign(steer);
                k.driftCharge += dt;
                k.yaw += (steer * 2.4 + k.driftDir * 0.55) * dt;
                const sparkColor = k.driftCharge > 1.2 ? 0x00f0ff : 0xffb800;
                this.particles.emit(k.mesh.position, { x: 0, y: 1.5, z: 0 }, sparkColor, 0.35, 0.25, 2, 3.0);
            } else {
                if (k.driftCharge > 0.85) {
                    k.boostTimer = 1.15;
                    k.boostCount++;
                    this.audio.boost();
                    this.input.rumble(k.index, 140, 180, 180);
                }
                k.driftDir = 0;
                k.driftCharge = 0;
                k.yaw += steer * 1.95 * dt * (Math.min(1, Math.abs(k.speed) / 8));
            }

            const ud = k.mesh.userData;
            if (ud && ud.wheels) {
                ud.wheels.forEach((w) => {
                    w.spinMesh.rotation.x += k.speed * dt * 2.4;
                    if (w.isFront) {
                        w.pivot.rotation.y = steer * 0.42;
                    }
                });
                if (ud.steeringWheelGroup) {
                    ud.steeringWheelGroup.rotation.z = -steer * 0.65;
                }
                if (ud.helmetGroup) {
                    ud.helmetGroup.rotation.z = -steer * 0.18;
                    ud.helmetGroup.rotation.y = steer * 0.25;
                }
            }

            const forward = new THREE.Vector3(Math.sin(k.yaw), 0, Math.cos(k.yaw));
            k.mesh.position.addScaledVector(forward, k.speed * dt);
            k.mesh.rotation.y = k.yaw + k.driftDir * 0.18;

            // ตรวจสอบระยะออกนอกขอบถนนตามแนวตั้งฉาก (Normal) ของถนน ไม่ดึงรถเข้าหากันตรงกลาง
            const nearestPt = this.trackPoints[k.waypointIdx];
            const roadNormal = this.trackNormals[k.waypointIdx] || new THREE.Vector3(1, 0, 0);
            const relVec = new THREE.Vector3().subVectors(k.mesh.position, nearestPt);
            const lateralDist = relVec.dot(roadNormal);
            const maxHalfRoad = this.trackWidth * 0.45;
            if (Math.abs(lateralDist) > maxHalfRoad) {
                const excess = Math.abs(lateralDist) - maxHalfRoad;
                k.mesh.position.addScaledVector(roadNormal, -Math.sign(lateralDist) * excess * 0.65);
                k.speed *= 0.97;
            }

            if (k.speed > 8) {
                const rear = k.mesh.position.clone().addScaledVector(forward, -1.55);
                const trailCol = k.boostTimer > 0 ? 0x05ffa1 : k.colorHex;
                this.particles.emit(rear, { x: 0, y: 0.4, z: 0 }, trailCol, 0.32, 0.22, 1, 0.8);
            }

            const nextWp = (k.waypointIdx + 1) % segCount;
            const dNext = k.mesh.position.distanceTo(this.trackPoints[nextWp]);
            if (dNext < 16.5) {
                if (nextWp === 0 && k.waypointIdx === segCount - 1) {
                    const lapDuration = this.raceTime - k.lapStartTime;
                    if (k.bestLapTime === null || lapDuration < k.bestLapTime) {
                        k.bestLapTime = lapDuration;
                    }
                    k.lapStartTime = this.raceTime;
                    k.lap++;
                    if (k.lap > this.totalLaps && !this.winner) {
                        k.finished = true;
                        k.finishTime = this.raceTime;
                        this.winner = k;
                        this.showSummary = true;
                        this.audio.stopEngine();
                        this.audio.victoryFanfare();
                        this.input.rumble(k.index, 255, 255, 500);
                    } else if (k.lap <= this.totalLaps) {
                        const isFinal = k.lap === this.totalLaps;
                        this.audio.lapComplete(isFinal);
                        if (isFinal) {
                            this.showBanner(`🔥 FINAL LAP! P${k.index + 1} เข้าสู่รอบสุดท้าย (3/3)!`, '#ff2a6d', 2.8);
                        } else {
                            this.showBanner(`🏁 P${k.index + 1} ขึ้นรอบที่ ${k.lap} / ${this.totalLaps}`, k.colorCss, 2.0);
                        }
                    }
                }
                k.waypointIdx = nextWp;
            }

            for (const padObj of this.boostPads) {
                if (k.mesh.position.distanceTo(padObj.pos) < 3.4 && k.boostTimer <= 0.2) {
                    k.boostTimer = 1.25;
                    k.boostCount++;
                    this.audio.boost();
                    this.input.rumble(k.index, 160, 160, 150);
                }
            }

            for (const box of this.itemBoxes) {
                if (box.cooldown <= 0 && k.mesh.position.distanceTo(box.pos) < 2.4) {
                    box.cooldown = 5.0;
                    if (!k.item) {
                        const items = ['เทอร์โบบูสต์', 'คลื่นช็อต EMP', 'กระสุนพลาสม่า'];
                        k.item = items[Math.floor(Math.random() * items.length)];
                        this.audio.powerup();
                    }
                }
            }

            if (useItem && k.item) {
                k.itemsUsed++;
                if (k.item === 'เทอร์โบบูสต์') {
                    k.boostTimer = 2.0;
                    k.boostCount++;
                    this.audio.boost();
                } else if (k.item === 'คลื่นช็อต EMP') {
                    this.audio.explosion();
                    this.graphics.triggerShake(0.45);
                    this.karts.forEach((other) => {
                        if (other !== k && other.mesh.position.distanceTo(k.mesh.position) < 28) {
                            other.speed *= 0.25;
                            this.particles.explode(other.mesh.position, 0x00f0ff, 30, 7);
                            this.input.rumble(other.index, 220, 220, 300);
                        }
                    });
                } else if (k.item === 'กระสุนพลาสม่า') {
                    this.audio.laser(740);
                    const target = this.karts.find((o) => o !== k);
                    if (target) {
                        target.speed *= 0.35;
                        this.particles.explode(target.mesh.position, 0xff2a6d, 35, 8);
                    }
                }
                k.item = null;
            }

            // ล็อกกล้องประจำตัวผู้เล่นให้อยู่ด้านหลังรถของตัวเองโดยตรง (Player View ตรงกับรถแต่ละคัน 100%)
            const camTargetPos = k.mesh.position.clone()
                .addScaledVector(forward, -4.8)
                .add(new THREE.Vector3(0, 2.25, 0));
            k.camera.position.copy(camTargetPos);
            const lookTarget = k.mesh.position.clone()
                .addScaledVector(forward, 3.0)
                .add(new THREE.Vector3(0, 0.85, 0));
            k.camera.lookAt(lookTarget);
        });

        for (let i = 0; i < this.karts.length; i++) {
            for (let j = i + 1; j < this.karts.length; j++) {
                const a = this.karts[i];
                const b = this.karts[j];
                const diff = new THREE.Vector3().subVectors(b.mesh.position, a.mesh.position);
                const dist = diff.length();
                if (dist > 0 && dist < 2.2) {
                    diff.normalize();
                    const push = (2.2 - dist) * 0.5;
                    a.mesh.position.addScaledVector(diff, -push);
                    b.mesh.position.addScaledVector(diff, push);
                    this.audio.hit();
                }
            }
        }

        // อัปเดตเสียงเครื่องยนต์ตามความเร็วรถผู้เล่นหลัก (หยุดเมื่อจบการแข่งขัน)
        const leadHuman = this.karts.find((k) => this.input.pads[k.index]?.connected) || this.karts[0];
        if (this.winner) {
            this.audio.stopEngine();
        } else if (leadHuman) {
            const speedRatio = Math.abs(leadHuman.speed) / leadHuman.maxSpeed;
            this.audio.updateEngine(speedRatio, leadHuman.boostTimer > 0, leadHuman.driftDir !== 0);
        }

        // ตรวจจับการเร่งแซง (Overtake Detection) เมื่อผู้เล่นแซงคู่แข่งสำเร็จ
        const rankedNow = this.getRankedKarts();
        rankedNow.forEach((k, idx) => {
            const newRank = idx + 1;
            if (this.raceTime > 1.5 && newRank < k.prevRank) {
                const isHuman = this.input.pads[k.index]?.connected;
                if (isHuman || k.index === 0) {
                    this.audio.overtake();
                    this.input.rumble(k.index, 95, 95, 90);
                    this.showBanner(`⚡ แซงสำเร็จ! ผู้เล่น P${k.index + 1} พุ่งขึ้นอันดับ #${newRank}!`, '#05ffa1', 1.8);
                }
            }
            k.prevRank = newRank;
        });

        this.updateHUD();
    }

    updateHUD() {
        const ranked = this.getRankedKarts();
        const rankMap = new Map();
        ranked.forEach((k, idx) => rankMap.set(k.index, idx + 1));

        const segCount = this.trackPoints.length;
        const getProgressUnits = (k) => {
            if (k.finished) return this.totalLaps * segCount + 1;
            const curPt = this.trackPoints[k.waypointIdx];
            const nextPt = this.trackPoints[(k.waypointIdx + 1) % segCount];
            const segDist = curPt.distanceTo(nextPt) || 1;
            const rem = k.mesh.position.distanceTo(nextPt);
            const frac = 1 - THREE.MathUtils.clamp(rem / segDist, 0, 1);
            return (k.lap - 1) * segCount + k.waypointIdx + frac;
        };

        const leader = ranked[0];
        const leaderProg = leader ? getProgressUnits(leader) : 0;
        const avgSegLen = segCount > 1
            ? this.trackPoints[0].distanceTo(this.trackPoints[1]) || 4.0
            : 4.0;
        const refSpeed = Math.max(22, Math.abs(leader?.speed || 26));

        const standingRows = ranked.map((k, idx) => {
            const pad = this.input.pads[k.index];
            const roleTag = pad && pad.connected ? 'จอย' : 'บอท';
            const rank = idx + 1;
            let gapText = 'LEADER';
            let gapColor = '#05ffa1';
            if (idx > 0) {
                if (!this.raceStarted) {
                    gapText = '+0.00s';
                    gapColor = '#94a3b8';
                } else {
                    const gapUnits = Math.max(0, leaderProg - getProgressUnits(k));
                    const gapSec = (gapUnits * avgSegLen) / refSpeed;
                    gapText = `+${gapSec.toFixed(2)}s`;
                    gapColor = gapSec < 1.5 ? '#ffb800' : '#e2e8f0';
                }
            }
            return `
                <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;padding:3px 0;font-size:0.82rem;font-weight:800;">
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span style="min-width:22px;color:${rank === 1 ? '#ffd700' : '#94a3b8'};">#${rank}</span>
                        <span style="width:8px;height:8px;border-radius:50%;background:${k.colorCss};display:inline-block;"></span>
                        <span style="color:${k.colorCss};">P${k.index + 1} <span style="font-weight:600;color:#94a3b8;font-size:0.74rem;">(${roleTag})</span></span>
                    </div>
                    <span style="color:${gapColor};font-variant-numeric:tabular-nums;">${gapText}</span>
                </div>
            `;
        }).join('');

        const liveStandingHtml = !this.winner && !this.showSummary ? `
            <div style="position:fixed;top:12px;right:16px;z-index:26;background:rgba(5,10,24,0.88);border:1.5px solid rgba(0,240,255,0.45);border-radius:12px;padding:8px 14px;min-width:210px;box-shadow:0 6px 24px rgba(0,0,0,0.55);pointer-events:none;backdrop-filter:blur(6px);">
                <div style="font-size:0.72rem;font-weight:900;letter-spacing:1px;color:#00f0ff;margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.12);padding-bottom:3px;">
                    🏁 LIVE STANDING
                </div>
                ${standingRows}
            </div>
        ` : '';
        // ป้ายกำกับหน้าจอของแต่ละคัน (แสดงชื่อผู้เล่น รอบ อันดับ และความเร็วที่มุมล่างซ้ายของแต่ละจอ)
        const splitCount = this.karts.length;
        let viewportOverlays = '';
        if (!this.winner && !this.showSummary) {
            const layouts = splitCount === 1
                ? [
                    { top: '72px', left: '20px', height: 'calc(100vh - 92px)', width: 'calc(100vw - 40px)', noBorder: true }
                ]
                : splitCount === 2
                ? [
                    { top: '72px', left: '24px', height: 'calc(50vh - 80px)', width: 'calc(100vw - 48px)' },
                    { top: 'calc(50vh + 12px)', left: '24px', height: 'calc(50vh - 24px)', width: 'calc(100vw - 48px)' }
                ]
                : splitCount === 3
                ? [
                    { top: '72px', left: '20px', height: 'calc(50vh - 80px)', width: 'calc(50vw - 28px)' },
                    { top: '72px', left: 'calc(50vw + 8px)', height: 'calc(50vh - 80px)', width: 'calc(50vw - 28px)' },
                    { top: 'calc(50vh + 12px)', left: '20px', height: 'calc(50vh - 24px)', width: 'calc(100vw - 40px)' }
                ]
                : [
                    { top: '72px', left: '20px', height: 'calc(50vh - 80px)', width: 'calc(50vw - 28px)' },
                    { top: '72px', left: 'calc(50vw + 8px)', height: 'calc(50vh - 80px)', width: 'calc(50vw - 28px)' },
                    { top: 'calc(50vh + 12px)', left: '20px', height: 'calc(50vh - 24px)', width: 'calc(50vw - 28px)' },
                    { top: 'calc(50vh + 12px)', left: 'calc(50vw + 8px)', height: 'calc(50vh - 24px)', width: 'calc(50vw - 28px)' }
                ];

            viewportOverlays = this.karts.map((k, idx) => {
                const box = layouts[idx];
                const pad = this.input.pads[k.index];
                const roleTag = pad && pad.connected ? 'จอย' : 'บอท';
                const curLap = Math.min(this.totalLaps, k.lap);
                const lapStr = curLap === this.totalLaps
                    ? `<span style="color:#ff2a6d;font-weight:900;">🔥 รอบสุดท้าย ${curLap}/${this.totalLaps}</span>`
                    : `รอบที่ ${curLap}/${this.totalLaps}`;
                const rank = rankMap.get(k.index) || 1;
                const spd = Math.round(Math.abs(k.speed) * 4.2);
                const borderStyle = box.noBorder
                    ? ''
                    : `border:2px solid ${k.colorCss};border-radius:12px;box-shadow:inset 0 0 18px ${k.colorCss}33;`;
                return `
                    <div style="position:fixed;top:${box.top};left:${box.left};width:${box.width};height:${box.height};${borderStyle}pointer-events:none;">
                        <div style="position:absolute;bottom:10px;left:12px;background:rgba(5,10,24,0.88);border:1px solid ${k.colorCss};color:${k.colorCss};padding:6px 14px;border-radius:10px;font-weight:900;font-size:0.88rem;display:flex;align-items:center;gap:10px;">
                            <span>🎥 P${k.index + 1} (${roleTag})</span>
                            <span style="color:#e2e8f0;">${lapStr}</span>
                            <span style="color:#fff;">อันดับ #${rank}</span>
                            <span style="color:#05ffa1;">⚡ ${spd} กม./ชม.</span>
                        </div>
                    </div>
                `;
            }).join('');
        }

        let summaryHtml = '';
        if (this.winner || this.showSummary) {
            const rows = ranked.map((k, idx) => {
                const pad = this.input.pads[k.index];
                const roleTag = pad && pad.connected ? 'จอยสติ๊ก' : 'บอท AI';
                const totalSteps = this.totalLaps * segCount;
                const doneSteps = Math.min(totalSteps, (k.lap - 1) * segCount + k.waypointIdx);
                const pct = k.finished ? 100 : Math.min(99, Math.round((doneSteps / totalSteps) * 100));
                const bestLapStr = k.bestLapTime ? `${k.bestLapTime.toFixed(1)} วินาที` : '-';
                return {
                    rank: idx + 1,
                    playerLabel: `ผู้เล่น P${k.index + 1}`,
                    roleTag,
                    colorCss: k.colorCss,
                    stats: [
                        `${Math.min(this.totalLaps, k.lap)}/${this.totalLaps} รอบ (${pct}%)`,
                        `${k.topSpeedRecorded} กม./ชม.`,
                        bestLapStr,
                        `${k.boostCount} ครั้ง / ${k.itemsUsed} ชิ้น`
                    ]
                };
            });

            const winTitle = this.winner
                ? `🏁 FINISH! ผู้เล่น P${this.winner.index + 1} เข้าเส้นชัยคว้าอันดับ 1!`
                : `ตารางอันดับและสถิติการแข่งขันปัจจุบัน`;

            summaryHtml = this.buildSummaryTableHTML({
                title: winTitle,
                subtitle: `สนามความยาวพิเศษ 4 เท่า (${this.totalLaps} รอบสนาม) — เวลาแข่งขันรวม ${this.raceTime.toFixed(1)} วินาที`,
                columns: ['ความคืบหน้า', 'ความเร็วสูงสุด', 'เวลาต่อรอบดีที่สุด', 'บูสต์ / ใช้ไอเทม'],
                rows
            });
        }

        let countdownHtml = '';
        if (!this.raceStarted && !this.winner) {
            const sec = Math.max(1, Math.ceil(this.countdownTimer));
            const cdColor = sec <= 1 ? '#05ffa1' : (sec <= 3 ? '#ffb800' : '#ff2a6d');
            countdownHtml = `
                <div style="position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;z-index:30;">
                    <div style="width:150px;height:150px;border-radius:50%;background:rgba(5,10,24,0.88);border:4px solid ${cdColor};box-shadow:0 0 40px ${cdColor}99, inset 0 0 24px ${cdColor}44;display:flex;align-items:center;justify-content:center;font-size:5.2rem;font-weight:900;color:${cdColor};text-shadow:0 0 24px ${cdColor};">
                        ${sec}
                    </div>
                    <div style="margin-top:16px;background:rgba(5,10,24,0.9);border:2px solid ${cdColor};color:#fff;padding:8px 24px;border-radius:999px;font-weight:900;font-size:1.1rem;letter-spacing:0.5px;">
                        🚦 เตรียมตัวออกตัวใน ${sec} วินาที — แข่ง ${this.totalLaps} รอบ!
                    </div>
                </div>
            `;
        }

        let bannerHtml = '';
        if (this.bannerTimer > 0 && this.bannerMsg && !this.winner) {
            bannerHtml = `
                <div class="hud-pill" style="background:rgba(5,10,24,0.92);border:2px solid ${this.bannerColor};color:${this.bannerColor};padding:6px 18px;border-radius:999px;font-weight:900;font-size:0.95rem;box-shadow:0 0 18px ${this.bannerColor}55;white-space:nowrap;">
                    ${this.bannerMsg}
                </div>
            `;
        }

        const timeLabel = !this.raceStarted
            ? `นับถอยหลัง ${Math.max(1, Math.ceil(this.countdownTimer))}s`
            : `เวลา ${this.raceTime.toFixed(1)}s`;

        this.setHUD(`
            <div class="hud-top-row">
                <div class="hud-timer">🏁 แข่ง ${this.totalLaps} รอบ (เข้าเส้นชัยจบเกม) | ${timeLabel}</div>
                ${bannerHtml}
            </div>
            ${liveStandingHtml}
            ${countdownHtml}
            ${viewportOverlays}
            ${summaryHtml}
        `);
    }

    render() {
        const renderer = this.graphics.renderer;
        const w = window.innerWidth;
        const h = window.innerHeight;
        const splitCount = this.karts.length;

        if (splitCount === 1) {
            this.karts[0].camera.aspect = w / h;
            this.karts[0].camera.updateProjectionMatrix();
            this.graphics.render(this.scene, this.karts[0].camera, true);
            return;
        }

        renderer.setScissorTest(true);
        const views = splitCount === 2
            ? [
                { x: 0, y: Math.floor(h / 2), w, h: Math.floor(h / 2) },
                { x: 0, y: 0, w, h: Math.floor(h / 2) }
            ]
            : splitCount === 3
            ? [
                { x: 0, y: Math.floor(h / 2), w: Math.floor(w / 2), h: Math.floor(h / 2) },
                { x: Math.floor(w / 2), y: Math.floor(h / 2), w: Math.floor(w / 2), h: Math.floor(h / 2) },
                { x: 0, y: 0, w, h: Math.floor(h / 2) }
            ]
            : [
                { x: 0, y: Math.floor(h / 2), w: Math.floor(w / 2), h: Math.floor(h / 2) },
                { x: Math.floor(w / 2), y: Math.floor(h / 2), w: Math.floor(w / 2), h: Math.floor(h / 2) },
                { x: 0, y: 0, w: Math.floor(w / 2), h: Math.floor(h / 2) },
                { x: Math.floor(w / 2), y: 0, w: Math.floor(w / 2), h: Math.floor(h / 2) }
            ];

        for (let i = 0; i < views.length; i++) {
            const v = views[i];
            const cam = this.karts[i].camera;
            cam.aspect = v.w / v.h;
            cam.updateProjectionMatrix();
            renderer.setViewport(v.x, v.y, v.w, v.h);
            renderer.setScissor(v.x, v.y, v.w, v.h);
            renderer.render(this.scene, cam);
        }

        renderer.setScissorTest(false);
        renderer.setViewport(0, 0, w, h);
    }
}
