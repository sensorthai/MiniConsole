/**
 * Game 1: NEON KART RACING (ศึกซิ่งคาร์ทสายฟ้า)
 * - ความยาวสนามแข่งเพิ่มขึ้น 4 เท่า (480 เซกเมนต์, รัศมีสนาม 272 x 176 เมตร)
 * - มุมมองกล้อง (Player View) ล็อกตรงหลังรถของแต่ละคนอย่างแม่นยำ พร้อมป้าย P1-P4 เหนือรถและกรอบประจำจอ
 * - แถบ Bar ด้านบนไม่แสดงป้ายไอเทม
 * - การวางกล่องไอเทมและแผ่นบูสต์ในถนนวางสลับเลน (ซ้าย / กลาง / ขวา / สลับฟันปลา)
 * - ซุ้มป้าย FINISH และเส้นชัยตารางหมากรุกขนาดใหญ่ชัดเจนสวยงาม
 */
import * as THREE from 'three';
import { GameBase } from '../js/gameBase.js';
import { Config } from '../js/config.js';
import { createDetailedKart, createDetailedItemBox, createBlenderTrackArch } from '../js/models.js';

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
    }

    init() {
        super.init();
        this.scene.fog = new THREE.FogExp2(0x070913, 0.0025);
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
        this.audio.stopEngine();
        this.audio.stopVictoryMusic();
        super.dispose();
    }

    buildEnvironment() {
        const grid = new THREE.GridHelper(1200, 120, 0x00f0ff, 0x101830);
        grid.position.y = -0.5;
        this.scene.add(grid);

        const towerGeo = new THREE.BoxGeometry(1, 1, 1);
        for (let i = 0; i < 64; i++) {
            const angle = (i / 64) * Math.PI * 2;
            const distX = 335 + (i % 4) * 28;
            const distZ = 240 + (i % 4) * 24;
            const h = 24 + (i * 9 % 55);
            const bldgGroup = new THREE.Group();

            const mat = new THREE.MeshStandardMaterial({
                color: 0x0a1022,
                roughness: 0.25,
                metalness: 0.85,
                emissive: i % 2 === 0 ? 0x003355 : 0x330033,
                emissiveIntensity: 0.55
            });
            const tower = new THREE.Mesh(towerGeo, mat);
            tower.scale.set(10, h, 10);
            tower.position.y = h / 2 - 0.5;
            bldgGroup.add(tower);

            const crownMat = new THREE.MeshBasicMaterial({
                color: i % 2 === 0 ? 0x00f0ff : 0xff2a6d
            });
            const crown = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.65, 10.5), crownMat);
            crown.position.y = h - 0.8;
            bldgGroup.add(crown);

            bldgGroup.position.set(Math.cos(angle) * distX, 0, Math.sin(angle) * distZ);
            this.scene.add(bldgGroup);
        }
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
        const segments = 480;
        for (let i = 0; i < segments; i++) {
            this.trackPoints.push(this.getTrackPoint(i / segments));
        }

        const roadGeo = new THREE.BufferGeometry();
        const positions = [];
        const uvs = [];
        const indices = [];

        for (let i = 0; i <= segments; i++) {
            const p0 = this.trackPoints[i % segments];
            const p1 = this.trackPoints[(i + 1) % segments];
            const tangent = new THREE.Vector3().subVectors(p1, p0).normalize();
            const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);
            if (i < segments) {
                this.trackNormals.push(normal.clone());
            }

            const left = p0.clone().addScaledVector(normal, this.trackWidth * 0.5);
            const right = p0.clone().addScaledVector(normal, -this.trackWidth * 0.5);

            positions.push(left.x, 0.02, left.z, right.x, 0.02, right.z);
            uvs.push(0, i * 0.25, 1, i * 0.25);

            if (i < segments) {
                const base = i * 2;
                indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
            }

            if (i % 4 === 0 && i < segments) {
                const curbColor = i % 8 === 0 ? 0x00f0ff : 0xff2a6d;
                const curbMat = new THREE.MeshStandardMaterial({
                    color: curbColor,
                    emissive: curbColor,
                    emissiveIntensity: 1.25
                });
                const postL = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.55, 1.0), curbMat);
                postL.position.copy(left).setY(0.28);
                postL.lookAt(p1.clone().addScaledVector(normal, this.trackWidth * 0.5).setY(0.28));
                const postR = postL.clone();
                postR.position.copy(right).setY(0.28);
                this.scene.add(postL, postR);
            }
        }

        roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        roadGeo.setIndex(indices);
        roadGeo.computeVertexNormals();

        const roadMat = new THREE.MeshStandardMaterial({
            color: 0x161c2e,
            roughness: 0.38,
            metalness: 0.65,
            side: THREE.DoubleSide
        });
        const roadMesh = new THREE.Mesh(roadGeo, roadMat);
        roadMesh.receiveShadow = true;
        this.scene.add(roadMesh);

        // ==================== ซุ้มป้าย FINISH และเส้นชัยตารางหมากรุกขนาดใหญ่สวยงาม (อยู่ด้านหน้าจุดออกตัวให้เห็นเต็มป้ายชัดเจน) ====================
        const finishSegIdx = 5;
        const startPt = this.trackPoints[finishSegIdx];
        const nextPt = this.trackPoints[finishSegIdx + 1];
        const startHeading = Math.atan2(nextPt.x - startPt.x, nextPt.z - startPt.z);

        const archGroup = new THREE.Group();
        archGroup.position.copy(startPt);
        archGroup.rotation.y = startHeading;

        // 1. เส้นชัยตารางหมากรุกบนพื้นถนน
        const checkerTex = this.createCheckeredRoadTexture();
        const checkerLine = new THREE.Mesh(
            new THREE.PlaneGeometry(this.trackWidth + 0.4, 3.8),
            new THREE.MeshBasicMaterial({ map: checkerTex, side: THREE.DoubleSide })
        );
        checkerLine.rotation.x = -Math.PI / 2;
        checkerLine.position.y = 0.05;
        archGroup.add(checkerLine);

        // 2. เสาโครงถักนีออนขนาดใหญ่ซ้าย-ขวา
        const pillarDarkMat = new THREE.MeshStandardMaterial({
            color: 0x121b33,
            roughness: 0.25,
            metalness: 0.88
        });
        const neonCyanMat = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            emissive: 0x00f0ff,
            emissiveIntensity: 1.8
        });
        const neonGoldMat = new THREE.MeshStandardMaterial({
            color: 0xffb800,
            emissive: 0xffb800,
            emissiveIntensity: 1.8
        });

        const gantrySpan = this.trackWidth * 0.56;
        const gantryHeight = 6.6;

        [-1, 1].forEach((side) => {
            const pCol = new THREE.Group();
            pCol.position.set(side * gantrySpan, 0, 0);

            const mainTower = new THREE.Mesh(new THREE.BoxGeometry(1.3, gantryHeight, 1.3), pillarDarkMat);
            mainTower.position.y = gantryHeight / 2;
            pCol.add(mainTower);

            const basePlinth = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.8, 2.1), neonCyanMat);
            basePlinth.position.y = 0.4;
            pCol.add(basePlinth);

            // วงแหวนไฟนีออนคาดเสา
            for (let r = 1; r <= 3; r++) {
                const ring = new THREE.Mesh(
                    new THREE.BoxGeometry(1.55, 0.26, 1.55),
                    r % 2 === 0 ? neonGoldMat : neonCyanMat
                );
                ring.position.y = r * 1.4;
                pCol.add(ring);
            }

            // คริสตัลไฟหมุนบนยอดเสาซุ้มเส้นชัย
            const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.9, 0), neonGoldMat);
            beacon.position.y = gantryHeight + 1.0;
            pCol.add(beacon);
            this.finishArchElements.push(beacon);

            archGroup.add(pCol);
        });

        // 3. ป้ายบิลบอร์ด FINISH ขนาดใหญ่พิเศษเหนือถนน (เห็นชัดทั้งด้านหน้าและด้านหลัง)
        const bannerTex = this.createFinishBannerTexture();
        const bannerWidth = this.trackWidth + 3.4;
        const bannerHeight = 3.4;
        const bannerFaceMat = new THREE.MeshBasicMaterial({ map: bannerTex });
        const bannerRimMat = new THREE.MeshStandardMaterial({
            color: 0xffb800,
            emissive: 0xff8800,
            emissiveIntensity: 1.4,
            metalness: 0.8,
            roughness: 0.2
        });
        const bannerBox = new THREE.Mesh(
            new THREE.BoxGeometry(bannerWidth, bannerHeight, 1.0),
            [bannerRimMat, bannerRimMat, bannerRimMat, bannerRimMat, bannerFaceMat, bannerFaceMat]
        );
        bannerBox.position.y = gantryHeight - 1.2;
        archGroup.add(bannerBox);

        // คานนีออนคู่บนและล่างป้าย FINISH
        const topBeam = new THREE.Mesh(new THREE.BoxGeometry(bannerWidth + 0.8, 0.32, 1.25), neonCyanMat);
        topBeam.position.y = gantryHeight + 0.65;
        const botBeam = new THREE.Mesh(new THREE.BoxGeometry(bannerWidth + 0.8, 0.32, 1.25), neonGoldMat);
        botBeam.position.y = gantryHeight - 3.05;
        archGroup.add(topBeam, botBeam);

        this.scene.add(archGroup);

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

        // ==================== ซุ้มสนามแข่ง 3D และสภาพแวดล้อมจาก Blender (.glb) ====================
        for (let i = 60; i < segments - 40; i += 80) {
            const pt = this.trackPoints[i];
            const nextPt = this.trackPoints[(i + 1) % segments];
            const arch = createBlenderTrackArch();
            arch.position.set(pt.x, 0, pt.z);
            arch.rotation.y = Math.atan2(nextPt.x - pt.x, nextPt.z - pt.z);
            arch.scale.setScalar(0.82);
            this.scene.add(arch);
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

        if (this.winner !== null) return;

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

        // อัปเดตเสียงเครื่องยนต์ตามความเร็วรถผู้เล่นหลัก (หรือรถ P1)
        const leadHuman = this.karts.find((k) => this.input.pads[k.index]?.connected) || this.karts[0];
        if (leadHuman) {
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
        // แถบ Bar ด้านบน: แสดงอันดับ รอบที่แข่ง และความเร็วชัดเจน
        const cards = this.karts.map((k) => {
            const pad = this.input.pads[k.index];
            const roleTag = pad && pad.connected ? 'จอย' : 'บอท';
            const spd = Math.round(Math.abs(k.speed) * 4.2);
            const rank = rankMap.get(k.index) || 1;
            const curLap = Math.min(this.totalLaps, k.lap);
            const lapStr = curLap === this.totalLaps
                ? `<span style="color:#ff2a6d;font-weight:900;">🔥 รอบสุดท้าย ${curLap}/${this.totalLaps}</span>`
                : `รอบที่ ${curLap}/${this.totalLaps}`;
            return `
                <div class="hud-pill" style="border-color:${k.colorCss}">
                    <span class="hud-rank-badge">#${rank}</span>
                    <strong style="color:${k.colorCss}">P${k.index + 1} (${roleTag})</strong>
                    <span>${lapStr}</span>
                    <span>${spd} กม./ชม.</span>
                </div>
            `;
        }).join('');

        // ป้ายกำกับหน้าจอแยกของแต่ละคน (Split-Screen Viewport Indicator) เพื่อให้รู้ว่าจอไหนคือรถของใคร
        const splitCount = this.karts.length;
        let viewportOverlays = '';
        if (splitCount > 1 && !this.winner && !this.showSummary) {
            const layouts = splitCount === 2
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
                const rank = rankMap.get(k.index) || 1;
                return `
                    <div style="position:fixed;top:${box.top};left:${box.left};width:${box.width};height:${box.height};border:2px solid ${k.colorCss};border-radius:12px;pointer-events:none;box-shadow:inset 0 0 18px ${k.colorCss}33;">
                        <div style="position:absolute;bottom:10px;left:12px;background:rgba(5,10,24,0.86);border:1px solid ${k.colorCss};color:${k.colorCss};padding:4px 12px;border-radius:8px;font-weight:900;font-size:0.84rem;">
                            🎥 มุมมองรถ P${k.index + 1} (อันดับ #${rank})
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
                <div style="position:fixed;top:86px;left:50%;transform:translateX(-50%);z-index:25;background:rgba(5,10,24,0.92);border:2px solid ${this.bannerColor};color:${this.bannerColor};padding:10px 26px;border-radius:999px;font-weight:900;font-size:1.05rem;box-shadow:0 0 24px ${this.bannerColor}66;pointer-events:none;white-space:nowrap;">
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
                ${cards}
            </div>
            ${countdownHtml}
            ${bannerHtml}
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
