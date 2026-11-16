/**
 * Game 6: Cyber Tennis (ศึกเทนนิสนีออน 3 มิติ — Babylon.js Engine)
 * รองรับผู้เล่น 1-4 คน (1v1 และ 2v2 คู่) + AI บอทอัตโนมัติสำหรับช่องที่ไม่ได้ต่อจอย
 * ใช้ Babylon.js (PBRMaterial + GlowLayer + ParticleSystem) ผ่าน GameBase Lifecycle
 */
import { Config } from '../js/config.js';
import { GameBase } from '../js/gameBase.js';

export class Game6Tennis extends GameBase {
    constructor(app, meta) {
        super(app, meta);
        this.courtHalfL = 18.0; // X: -18 ถึง +18
        this.courtHalfW = 9.0;  // Z: -9 ถึง +9
        this.netHeight = 2.15;
        this.targetScore = 5;
        this.matchTimer = 180;
        this.winner = null;
        this.winnerText = '';
        this.showSummary = false;

        this.players = [];
        this.scoreBlue = 0;
        this.scoreRed = 0;
        this.rallyCount = 0;
        this.bestRally = 0;
        this.serveDelay = 1.1;
        this.serveTeam = 0;
        this.pointFreezeTimer = 0;
        this.lastPointBanner = '';
        this.lastPointTimer = 0;

        this.ball = null;
        this.ballVel = null;
        this.ballShadow = null;
        this.ballShotType = 'normal';
        this.lastHitTeam = -1;
        this.bounceCountOnSide = 0;
        this.cameraShake = 0;

        this.trailMeshes = [];
        this.trailIndex = 0;
        this.hitFlashTimer = 0;
        this.netFlashTimer = 0;
        this.elapsedTime = 0;

        // Babylon.js Engine & Scene state
        this.bjsCanvas = null;
        this.engine = null;
        this.bScene = null;
        this.bCamera = null;
        this.glowLayer = null;
        this.sparkSystem = null;
        this.sparkEmitter = null;
        this.ballMat = null;
        this.netMat = null;
        this.netTopMat = null;
        this.trailMat = null;
        this._onResize = null;
        this._threeCanvas = null;
    }

    init() {
        const B = window.BABYLON;
        if (!B) {
            this.setHUD(`
                <div class="hud-top">
                    <div class="hud-card" style="border-color:#ff3366;">
                        <h3 style="color:#ff3366;">⚠️ ไม่สามารถโหลด Babylon.js CDN</h3>
                        <div>กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต (https://cdn.babylonjs.com/babylon.js)</div>
                    </div>
                </div>
            `);
            return;
        }

        // ซ่อน Three.js canvas ชั่วคราวแล้วสร้าง Babylon.js canvas ซ้อนทับ
        this._threeCanvas = document.getElementById('webgl-canvas');
        if (this._threeCanvas) this._threeCanvas.style.visibility = 'hidden';

        const existing = document.getElementById('babylon-canvas');
        if (existing) existing.remove();

        this.bjsCanvas = document.createElement('canvas');
        this.bjsCanvas.id = 'babylon-canvas';
        Object.assign(this.bjsCanvas.style, {
            position: 'fixed',
            inset: '0',
            width: '100vw',
            height: '100vh',
            display: 'block',
            zIndex: '1'
        });
        document.body.insertBefore(this.bjsCanvas, document.body.firstChild);

        this.engine = new B.Engine(this.bjsCanvas, true, {
            preserveDrawingBuffer: true,
            stencil: true,
            antialias: true
        });
        this.bScene = new B.Scene(this.engine);
        this.bScene.clearColor = new B.Color4(0.015, 0.025, 0.06, 1.0);
        this.bScene.fogMode = B.Scene.FOGMODE_EXP2;
        this.bScene.fogColor = new B.Color3(0.015, 0.025, 0.06);
        this.bScene.fogDensity = 0.0085;

        // Babylon GlowLayer สำหรับเอฟเฟกต์นีออนเรืองแสง
        this.glowLayer = new B.GlowLayer('neonGlow', this.bScene, {
            mainTextureFixedSize: 512,
            blurKernelSize: 48
        });
        this.glowLayer.intensity = 0.85;

        // กล้องหลัก (Left-handed: X ซ้าย-ขวา, Y บน-ล่าง, Z หน้า-หลัง)
        this.bCamera = new B.FreeCamera('tennisCam', new B.Vector3(0, 21.5, -24.5), this.bScene);
        this.bCamera.setTarget(new B.Vector3(0, 0.5, 1.5));
        this.bCamera.fov = 0.78;

        this._onResize = () => {
            if (this.engine) this.engine.resize();
        };
        window.addEventListener('resize', this._onResize);

        this._setupLighting();
        this.buildCourt();
        this.buildBall();
        this.buildParticleSystem();
        this.spawnPlayers();
        this.resetBall(0);

        this.audio.startTennisBGM();
        this.updateHUD();
    }

    _setupLighting() {
        const B = window.BABYLON;
        const hemi = new B.HemisphericLight('hemi', new B.Vector3(0, 1, 0), this.bScene);
        hemi.intensity = 0.55;
        hemi.diffuse = new B.Color3(0.7, 0.85, 1.0);
        hemi.groundColor = new B.Color3(0.08, 0.05, 0.16);

        const dir = new B.DirectionalLight('dir', new B.Vector3(-0.35, -1, 0.25), this.bScene);
        dir.intensity = 0.95;
        dir.diffuse = new B.Color3(0.95, 0.98, 1.0);

        const blueSpot = new B.PointLight('blueSpot', new B.Vector3(-12, 11, 0), this.bScene);
        blueSpot.diffuse = new B.Color3(0.0, 0.85, 1.0);
        blueSpot.intensity = 1.4;
        blueSpot.range = 40;

        const redSpot = new B.PointLight('redSpot', new B.Vector3(12, 11, 0), this.bScene);
        redSpot.diffuse = new B.Color3(1.0, 0.18, 0.45);
        redSpot.intensity = 1.4;
        redSpot.range = 40;
    }

    _stdMat(name, diffuseHex, emissiveHex = null, alpha = 1.0) {
        const B = window.BABYLON;
        const m = new B.StandardMaterial(name, this.bScene);
        m.diffuseColor = B.Color3.FromHexString(diffuseHex);
        if (emissiveHex) {
            m.emissiveColor = B.Color3.FromHexString(emissiveHex);
        }
        m.specularColor = new B.Color3(0.35, 0.35, 0.45);
        m.alpha = alpha;
        return m;
    }

    buildCourt() {
        const B = window.BABYLON;

        // พื้นสนามสะท้อนแสง PBR
        const floor = B.MeshBuilder.CreateBox('arenaFloor', { width: 72, height: 0.4, depth: 46 }, this.bScene);
        floor.position.y = -0.25;
        const floorPbr = new B.PBRMaterial('floorPbr', this.bScene);
        floorPbr.albedoColor = B.Color3.FromHexString('#070b18');
        floorPbr.metallic = 0.78;
        floorPbr.roughness = 0.24;
        floor.material = floorPbr;

        // พื้นคอร์ตด้านใน
        const courtSurface = B.MeshBuilder.CreateBox('courtSurface', {
            width: this.courtHalfL * 2,
            height: 0.08,
            depth: this.courtHalfW * 2
        }, this.bScene);
        courtSurface.position.y = -0.02;
        const courtPbr = new B.PBRMaterial('courtPbr', this.bScene);
        courtPbr.albedoColor = B.Color3.FromHexString('#0b1630');
        courtPbr.metallic = 0.65;
        courtPbr.roughness = 0.28;
        courtSurface.material = courtPbr;

        const addLine = (name, w, d, x, z, hex = '#00f0ff') => {
            const line = B.MeshBuilder.CreateBox(name, { width: w, height: 0.04, depth: d }, this.bScene);
            line.position.set(x, 0.03, z);
            line.material = this._stdMat(`${name}_m`, hex, hex);
        };

        // เส้นขอบสนามนีออน
        addLine('topLine', this.courtHalfL * 2, 0.2, 0, -this.courtHalfW, '#00f0ff');
        addLine('botLine', this.courtHalfL * 2, 0.2, 0, this.courtHalfW, '#00f0ff');
        addLine('leftLine', 0.22, this.courtHalfW * 2, -this.courtHalfL, 0, '#00d8ff');
        addLine('rightLine', 0.22, this.courtHalfW * 2, this.courtHalfL, 0, '#ff3366');

        // เส้นเสิร์ฟ + เส้นกลาง
        addLine('srvL', 0.14, this.courtHalfW * 2, -8.5, 0, '#7c4dff');
        addLine('srvR', 0.14, this.courtHalfW * 2, 8.5, 0, '#ff4081');
        addLine('centerLine', 17.0, 0.12, 0, 0, '#a855f7');

        // โซนสีทีมจางๆ
        const blueZone = B.MeshBuilder.CreateBox('blueZone', {
            width: this.courtHalfL - 0.5, height: 0.02, depth: this.courtHalfW * 2 - 0.5
        }, this.bScene);
        blueZone.position.set(-this.courtHalfL / 2, 0.015, 0);
        blueZone.material = this._stdMat('blueZoneM', '#00f0ff', '#005577', 0.09);

        const redZone = B.MeshBuilder.CreateBox('redZone', {
            width: this.courtHalfL - 0.5, height: 0.02, depth: this.courtHalfW * 2 - 0.5
        }, this.bScene);
        redZone.position.set(this.courtHalfL / 2, 0.015, 0);
        redZone.material = this._stdMat('redZoneM', '#ff3366', '#770022', 0.09);

        // ตาข่ายโฮโลแกรมกลางสนาม
        this.netMat = this._stdMat('netMat', '#a855f7', '#7c3aed', 0.42);
        const netMesh = B.MeshBuilder.CreateBox('netMesh', {
            width: 0.14, height: this.netHeight, depth: this.courtHalfW * 2 + 0.8
        }, this.bScene);
        netMesh.position.set(0, this.netHeight / 2, 0);
        netMesh.material = this.netMat;

        this.netTopMat = this._stdMat('netTopMat', '#00f0ff', '#00f0ff');
        const netTop = B.MeshBuilder.CreateBox('netTop', {
            width: 0.24, height: 0.18, depth: this.courtHalfW * 2 + 1.1
        }, this.bScene);
        netTop.position.set(0, this.netHeight, 0);
        netTop.material = this.netTopMat;

        // เสาเน็ตซ้าย-ขวา
        const postMat = this._stdMat('postMat', '#e2e8f0', '#38bdf8');
        for (const zSign of [-1, 1]) {
            const post = B.MeshBuilder.CreateCylinder(`netPost_${zSign}`, {
                diameter: 0.34, height: this.netHeight + 0.4, tessellation: 12
            }, this.bScene);
            post.position.set(0, (this.netHeight + 0.4) / 2, zSign * (this.courtHalfW + 0.55));
            post.material = postMat;
        }

        // เสาไฟนีออนรอบสนาม (Cyber Arena Pillars)
        const pillarPositions = [
            [-21, -12], [-21, 12], [21, -12], [21, 12],
            [-10, -13], [10, -13], [-10, 13], [10, 13]
        ];
        pillarPositions.forEach(([px, pz], idx) => {
            const isBlue = px < 0;
            const hex = isBlue ? '#00f0ff' : '#ff3366';
            const pillar = B.MeshBuilder.CreateBox(`pillar_${idx}`, { width: 0.55, height: 10, depth: 0.55 }, this.bScene);
            pillar.position.set(px, 5, pz);
            pillar.material = this._stdMat(`pillarMat_${idx}`, '#141c33', hex);
        });
    }

    buildBall() {
        const B = window.BABYLON;
        this.ballMat = this._stdMat('ballMat', '#ffe600', '#ffe600');
        this.ball = B.MeshBuilder.CreateSphere('tennisBall', { diameter: 0.84, segments: 18 }, this.bScene);
        this.ball.position.set(0, 3, 0);
        this.ball.material = this.ballMat;
        this.ballVel = new B.Vector3(0, 0, 0);

        // เงาบนพื้น
        this.ballShadow = B.MeshBuilder.CreateDisc('ballShadow', { radius: 0.48, tessellation: 16 }, this.bScene);
        this.ballShadow.rotation.x = Math.PI / 2;
        this.ballShadow.position.y = 0.05;
        this.ballShadow.material = this._stdMat('shadowMat', '#000000', null, 0.45);

        // Pool เงาหางลูกบอล (Ball Trail)
        this.trailMat = this._stdMat('trailMat', '#00f0ff', '#00f0ff', 0.45);
        for (let i = 0; i < 16; i++) {
            const tMesh = B.MeshBuilder.CreateSphere(`trail_${i}`, { diameter: 0.56, segments: 8 }, this.bScene);
            tMesh.isVisible = false;
            tMesh.material = this.trailMat;
            this.trailMeshes.push(tMesh);
        }
    }

    buildParticleSystem() {
        const B = window.BABYLON;
        const tex = new B.DynamicTexture('sparkTex', 32, this.bScene, false);
        const ctx = tex.getContext();
        const grad = ctx.createRadialGradient(16, 16, 1, 16, 16, 15);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.4, 'rgba(0,240,255,0.85)');
        grad.addColorStop(1, 'rgba(0,240,255,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 32, 32);
        tex.update();
        tex.hasAlpha = true;

        this.sparkEmitter = new B.TransformNode('sparkEmitter', this.bScene);
        this.sparkSystem = new B.ParticleSystem('sparks', 240, this.bScene);
        this.sparkSystem.particleTexture = tex;
        this.sparkSystem.emitter = this.sparkEmitter;
        this.sparkSystem.minSize = 0.16;
        this.sparkSystem.maxSize = 0.42;
        this.sparkSystem.minLifeTime = 0.18;
        this.sparkSystem.maxLifeTime = 0.42;
        this.sparkSystem.emitRate = 0;
        this.sparkSystem.minEmitPower = 4;
        this.sparkSystem.maxEmitPower = 11;
        this.sparkSystem.gravity = new B.Vector3(0, -14, 0);
        this.sparkSystem.blendMode = B.ParticleSystem.BLENDMODE_ADD;
        this.sparkSystem.start();
    }

    _emitSparks(pos, hex, count = 24) {
        if (!this.sparkSystem || !this.sparkEmitter) return;
        const B = window.BABYLON;
        this.sparkEmitter.position.copyFrom(pos);
        const c = B.Color3.FromHexString(hex);
        this.sparkSystem.color1 = new B.Color4(c.r, c.g, c.b, 1);
        this.sparkSystem.color2 = new B.Color4(1, 1, 1, 0.9);
        this.sparkSystem.manualEmitCount = count;
    }

    _createPlayerMesh(idx, colorHex, team) {
        const B = window.BABYLON;
        const root = new B.TransformNode(`player_${idx}`, this.bScene);

        const bodyMat = this._stdMat(`pBody_${idx}`, colorHex, colorHex);
        const darkMat = this._stdMat(`pDark_${idx}`, '#161f38');
        const visorMat = this._stdMat(`pVisor_${idx}`, '#ffffff', '#00f0ff');

        // วงแหวนพื้นเรืองแสง
        const ring = B.MeshBuilder.CreateTorus(`pRing_${idx}`, { diameter: 1.9, thickness: 0.12, tessellation: 24 }, this.bScene);
        ring.position.y = 0.08;
        ring.parent = root;
        ring.material = bodyMat;

        // ลำตัว
        const torso = B.MeshBuilder.CreateCylinder(`pTorso_${idx}`, {
            diameterTop: 0.9, diameterBottom: 0.65, height: 1.35, tessellation: 12
        }, this.bScene);
        torso.position.y = 1.0;
        torso.parent = root;
        torso.material = bodyMat;

        // ศีรษะ + Visor นีออน
        const head = B.MeshBuilder.CreateSphere(`pHead_${idx}`, { diameter: 0.72, segments: 12 }, this.bScene);
        head.position.y = 2.02;
        head.parent = root;
        head.material = darkMat;

        const visor = B.MeshBuilder.CreateBox(`pVisor_${idx}`, { width: 0.44, height: 0.18, depth: 0.56 }, this.bScene);
        visor.position.set(team === 0 ? 0.22 : -0.22, 2.05, 0);
        visor.parent = root;
        visor.material = visorMat;

        // ไม้แร็กเก็ตพลังงานนีออน
        const racketGroup = new B.TransformNode(`pRacket_${idx}`, this.bScene);
        racketGroup.position.set(team === 0 ? 0.35 : -0.35, 1.25, 0.55);
        racketGroup.parent = root;

        const handle = B.MeshBuilder.CreateCylinder(`pHandle_${idx}`, { diameter: 0.1, height: 0.85, tessellation: 8 }, this.bScene);
        handle.position.y = 0.35;
        handle.parent = racketGroup;
        handle.material = darkMat;

        const frame = B.MeshBuilder.CreateTorus(`pFrame_${idx}`, { diameter: 0.96, thickness: 0.1, tessellation: 18 }, this.bScene);
        frame.position.y = 1.1;
        frame.rotation.y = Math.PI / 2;
        frame.parent = racketGroup;
        frame.material = bodyMat;

        const netPad = B.MeshBuilder.CreateCylinder(`pNetPad_${idx}`, { diameter: 0.84, height: 0.04, tessellation: 14 }, this.bScene);
        netPad.position.y = 1.1;
        netPad.rotation.z = Math.PI / 2;
        netPad.parent = racketGroup;
        netPad.material = this._stdMat(`pPadM_${idx}`, colorHex, colorHex, 0.35);

        return { root, racketGroup };
    }

    spawnPlayers() {
        const activeCount = Config.players.activeCount;
        const isDoubles = activeCount >= 3;
        const totalSlots = isDoubles ? 4 : 2;
        const teamColors = ['#00f0ff', '#ff3366', '#05ffa1', '#ffbe0b'];

        for (let i = 0; i < totalSlots; i++) {
            const team = i % 2; // 0 = Blue (-X), 1 = Red (+X)
            const isHumanSlot = i < activeCount;
            const pad = isHumanSlot ? this.input.pads[i] : null;
            const hasController = !!(pad && pad.connected);

            let startZ = 0;
            if (isDoubles) {
                const pairIdx = Math.floor(i / 2);
                startZ = pairIdx === 0 ? -4.2 : 4.2;
            }
            const startX = team === 0 ? -13.0 : 13.0;
            const colorHex = teamColors[i];
            const { root, racketGroup } = this._createPlayerMesh(i, colorHex, team);
            root.position.set(startX, 0, startZ);

            this.players.push({
                idx: i,
                name: isHumanSlot ? `P${i + 1}` : `CPU ${i + 1}`,
                team,
                colorHex,
                isHumanSlot,
                isAI: !hasController,
                isExtraCpu: !isHumanSlot,
                mesh: root,
                racketGroup,
                velX: 0,
                velZ: 0,
                swingTimer: 0,
                swingDir: 1,
                hitCooldown: 0,
                specialCharge: 100,
                hits: 0,
                misses: 0,
                pointsWon: 0,
                prevL2: false,
                prevR2: false
            });
        }
    }

    resetBall(servingTeam = 0) {
        const B = window.BABYLON;
        this.serveTeam = servingTeam;
        this.serveDelay = 0.85;
        this.ballShotType = 'normal';
        this.lastHitTeam = servingTeam;
        this.bounceCountOnSide = 0;

        const dir = servingTeam === 0 ? 1 : -1;
        this.ball.position.set(servingTeam === 0 ? -10.5 : 10.5, 3.2, 0);
        this.ballVel = new B.Vector3(dir * 16.5, 5.2, (Math.random() - 0.5) * 4.5);

        if (this.ballMat) {
            const c = B.Color3.FromHexString('#ffe600');
            this.ballMat.diffuseColor = c;
            this.ballMat.emissiveColor = c;
        }
        for (const t of this.trailMeshes) t.isVisible = false;
    }

    _predictBallZAtX(targetX) {
        if (!this.ballVel || Math.abs(this.ballVel.x) < 0.2) return this.ball.position.z;
        const t = (targetX - this.ball.position.x) / this.ballVel.x;
        if (t <= 0 || t > 2.5) return this.ball.position.z;
        let pz = this.ball.position.z + this.ballVel.z * t;
        pz = Math.max(-this.courtHalfW + 0.8, Math.min(this.courtHalfW - 0.8, pz));
        return pz;
    }

    performShot(p, shotType, aimZ = 0) {
        if (p.hitCooldown > 0) return false;
        const dist = window.BABYLON.Vector3.Distance(
            new window.BABYLON.Vector3(this.ball.position.x, 0, this.ball.position.z),
            new window.BABYLON.Vector3(p.mesh.position.x, 0, p.mesh.position.z)
        );
        if (dist > 3.6 || this.ball.position.y > 4.8) return false;

        if (shotType === 'special' && p.specialCharge < 100) {
            shotType = 'power';
        }

        const dirX = p.team === 0 ? 1 : -1;
        let speedX = 21.0;
        let velY = 6.2;
        let spreadZ = aimZ * 10.5;

        if (shotType === 'power') {
            speedX = 28.5;
            velY = 4.2;
            this.cameraShake = 0.22;
            this.audio.tennisHit(true);
        } else if (shotType === 'lob') {
            speedX = 14.5;
            velY = 12.8;
            this.audio.tennisHit(false);
        } else if (shotType === 'special') {
            speedX = 34.0;
            velY = 3.2;
            spreadZ += (Math.random() - 0.5) * 4.0;
            p.specialCharge = 0;
            this.cameraShake = 0.45;
            this.audio.tennisHit(true);
        } else {
            this.audio.tennisHit(false);
        }

        this.ballVel.set(dirX * speedX, velY, spreadZ);
        this.ballShotType = shotType;
        this.lastHitTeam = p.team;
        this.bounceCountOnSide = 0;
        this.rallyCount++;
        if (this.rallyCount > this.bestRally) this.bestRally = this.rallyCount;

        p.hitCooldown = 0.28;
        p.swingTimer = 0.26;
        p.swingDir = p.team === 0 ? 1 : -1;
        p.hits++;
        if (shotType !== 'special') {
            p.specialCharge = Math.min(100, p.specialCharge + 28);
        }

        this.hitFlashTimer = 0.14;
        const B = window.BABYLON;
        const shotHex = shotType === 'special' ? '#ff00ff'
            : shotType === 'power' ? '#ff6b00'
            : shotType === 'lob' ? '#05ffa1' : '#ffe600';
        if (this.ballMat) {
            const c = B.Color3.FromHexString(shotHex);
            this.ballMat.diffuseColor = c;
            this.ballMat.emissiveColor = c;
        }
        if (this.trailMat) {
            const tc = B.Color3.FromHexString(shotHex);
            this.trailMat.diffuseColor = tc;
            this.trailMat.emissiveColor = tc;
        }
        this._emitSparks(this.ball.position, shotHex, shotType === 'special' ? 38 : 20);

        if (!p.isAI && p.isHumanSlot) {
            this.input.rumble(p.idx, shotType === 'special' ? 0.9 : 0.45, 0.35, 130);
        }
        return true;
    }

    awardPoint(winningTeam, reason) {
        if (this.winner || this.pointFreezeTimer > 0) return;

        if (winningTeam === 'BLUE') {
            this.scoreBlue++;
            for (const p of this.players) if (p.team === 0) p.pointsWon++;
        } else {
            this.scoreRed++;
            for (const p of this.players) if (p.team === 1) p.pointsWon++;
        }

        const losingTeamIdx = winningTeam === 'BLUE' ? 1 : 0;
        for (const p of this.players) {
            if (p.team === losingTeamIdx) p.misses++;
        }

        this.rallyCount = 0;
        this.pointFreezeTimer = 1.15;
        this.lastPointBanner = `${winningTeam === 'BLUE' ? '🔵 ทีมสีฟ้า' : '🔴 ทีมสีแดง'} ได้แต้ม! (${reason})`;
        this.lastPointTimer = 1.6;
        this.audio.powerup();

        this._emitSparks(this.ball.position, winningTeam === 'BLUE' ? '#00f0ff' : '#ff3366', 45);

        for (const p of this.players) {
            if (!p.isAI && p.isHumanSlot) {
                this.input.rumble(p.idx, 0.7, 0.5, 220);
            }
        }

        if (this.scoreBlue >= this.targetScore || this.scoreRed >= this.targetScore) {
            this.finishMatch();
        }
    }

    finishMatch() {
        if (this.winner) return;
        const blueWins = this.scoreBlue >= this.scoreRed;
        this.winner = blueWins ? 'BLUE' : 'RED';
        this.winnerText = blueWins ? '🏆 ทีมสีฟ้าคว้าแชมป์ CYBER TENNIS!' : '🏆 ทีมสีแดงคว้าแชมป์ CYBER TENNIS!';
        this.showSummary = true;
        this.audio.stopBGM();
        this.audio.victoryFanfare();
    }

    pause(state) {
        super.pause(state);
        if (state) {
            this.audio.stopBGM();
        } else if (!this.winner) {
            this.audio.startTennisBGM();
        }
    }

    fixedUpdate(dt) {
        if (!this.bScene || this.winner) return;
        this.elapsedTime += dt;

        // อัปเดตตัวจับเวลาการแข่งขัน
        if (this.matchTimer > 0) {
            this.matchTimer = Math.max(0, this.matchTimer - dt);
            if (this.matchTimer <= 0) {
                this.finishMatch();
                return;
            }
        }

        if (this.lastPointTimer > 0) this.lastPointTimer -= dt;
        if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;
        if (this.netFlashTimer > 0) this.netFlashTimer -= dt;
        if (this.cameraShake > 0) this.cameraShake = Math.max(0, this.cameraShake - dt * 1.8);

        if (this.pointFreezeTimer > 0) {
            this.pointFreezeTimer -= dt;
            if (this.pointFreezeTimer <= 0) {
                this.resetBall(this.scoreBlue >= this.scoreRed ? 1 : 0);
            }
            return;
        }

        // อัปเดตผู้เล่น (Human + AI Fallback)
        for (const p of this.players) {
            if (p.hitCooldown > 0) p.hitCooldown -= dt;
            if (p.swingTimer > 0) {
                p.swingTimer -= dt;
                p.racketGroup.rotation.z = Math.sin((1 - p.swingTimer / 0.26) * Math.PI) * 1.35 * p.swingDir;
            } else {
                p.racketGroup.rotation.z *= 0.8;
            }

            if (p.isHumanSlot) {
                const pad = this.input.pads[p.idx];
                p.isAI = !(pad && pad.connected);
            }

            let moveX = 0;
            let moveZ = 0;

            if (!p.isAI) {
                const pad = this.input.pads[p.idx];
                moveX = pad.lx;
                moveZ = -pad.ly;

                const l2Just = pad.l2Btn && !p.prevL2;
                const r2Just = pad.r2Btn && !p.prevR2;
                p.prevL2 = !!pad.l2Btn;
                p.prevR2 = !!pad.r2Btn;

                if (pad.justPressed.square || l2Just) {
                    this.performShot(p, 'special', moveZ);
                } else if (pad.justPressed.circle) {
                    this.performShot(p, 'lob', moveZ);
                } else if (pad.justPressed.triangle || pad.justPressed.r1 || r2Just) {
                    this.performShot(p, 'power', moveZ);
                } else if (pad.justPressed.cross || pad.justPressed.l1) {
                    this.performShot(p, 'normal', moveZ);
                }
            } else {
                // AI คุมตำแหน่งและตีโต้อัตโนมัติ
                const homeX = p.team === 0 ? -12.5 : 12.5;
                const ballComingToMe = (p.team === 0 && this.ballVel.x < 0) || (p.team === 1 && this.ballVel.x > 0);
                let targetX = homeX;
                let targetZ = 0;

                if (this.players.length === 4) {
                    const pairIdx = Math.floor(p.idx / 2);
                    targetZ = pairIdx === 0 ? -4.2 : 4.2;
                }

                if (ballComingToMe) {
                    const predZ = this._predictBallZAtX(p.mesh.position.x);
                    if (this.players.length === 4) {
                        const myHalf = Math.floor(p.idx / 2) === 0 ? -1 : 1;
                        if (Math.sign(predZ) === myHalf || Math.abs(predZ) < 2.2) {
                            targetZ = predZ;
                            targetX = Math.max(2.5, Math.min(this.courtHalfL - 1.2, Math.abs(this.ball.position.x))) * (p.team === 0 ? -1 : 1);
                        }
                    } else {
                        targetZ = predZ;
                        targetX = Math.max(3.0, Math.min(this.courtHalfL - 1.0, Math.abs(this.ball.position.x))) * (p.team === 0 ? -1 : 1);
                    }
                }

                const dx = targetX - p.mesh.position.x;
                const dz = targetZ - p.mesh.position.z;
                moveX = Math.max(-0.92, Math.min(0.92, dx * 0.45));
                moveZ = Math.max(-0.92, Math.min(0.92, dz * 0.45));

                if (ballComingToMe) {
                    const distToBall = window.BABYLON.Vector3.Distance(
                        new window.BABYLON.Vector3(this.ball.position.x, 0, this.ball.position.z),
                        new window.BABYLON.Vector3(p.mesh.position.x, 0, p.mesh.position.z)
                    );
                    if (distToBall < 2.6 && this.ball.position.y < 3.4) {
                        const aim = (Math.random() - 0.5) * 1.4;
                        const aiShot = p.specialCharge >= 100 && Math.random() < 0.25 ? 'special'
                            : Math.random() < 0.25 ? 'power'
                            : Math.random() < 0.2 ? 'lob' : 'normal';
                        this.performShot(p, aiShot, aim);
                    }
                }
            }

            // เคลื่อนที่ลื่นไหล + ขอบเขตฝั่งตัวเอง
            const maxSpeed = 14.5;
            p.velX += (moveX * maxSpeed - p.velX) * Math.min(1, dt * 12);
            p.velZ += (moveZ * maxSpeed - p.velZ) * Math.min(1, dt * 12);
            p.mesh.position.x += p.velX * dt;
            p.mesh.position.z += p.velZ * dt;

            const minX = p.team === 0 ? -this.courtHalfL + 0.8 : 1.4;
            const maxX = p.team === 0 ? -1.4 : this.courtHalfL - 0.8;
            p.mesh.position.x = Math.max(minX, Math.min(maxX, p.mesh.position.x));
            p.mesh.position.z = Math.max(-this.courtHalfW + 0.8, Math.min(this.courtHalfW - 0.8, p.mesh.position.z));
        }

        // หน่วงจังหวะก่อนเสิร์ฟลูก
        if (this.serveDelay > 0) {
            this.serveDelay -= dt;
            return;
        }

        // ฟิสิกส์ลูกบอล (Fixed Timestep)
        const prevBallX = this.ball.position.x;
        this.ballVel.y -= 21.5 * dt;
        this.ball.position.x += this.ballVel.x * dt;
        this.ball.position.y += this.ballVel.y * dt;
        this.ball.position.z += this.ballVel.z * dt;

        // ชนเน็ต (ตรวจทั้งความกว้าง Z และ anti-tunneling ข้าม X=0)
        const crossedNet = (prevBallX < 0 && this.ball.position.x >= 0) || (prevBallX > 0 && this.ball.position.x <= 0);
        if ((crossedNet || Math.abs(this.ball.position.x) < 0.45) &&
            Math.abs(this.ball.position.z) <= this.courtHalfW + 0.5 &&
            this.ball.position.y < this.netHeight + 0.35) {
            this.ballVel.x = -this.ballVel.x * 0.45;
            this.ball.position.x = this.ballVel.x > 0 ? 0.5 : -0.5;
            this.netFlashTimer = 0.25;
            this.audio.tennisBounce();
            this._emitSparks(this.ball.position, '#a855f7', 14);
        }

        // กระดอนพื้นสนาม
        if (this.ball.position.y <= 0.42) {
            this.ball.position.y = 0.42;
            this.ballVel.y = Math.abs(this.ballVel.y) * 0.78;
            if (this.ballVel.y < 3.5) this.ballVel.y = 4.2;
            this.audio.tennisBounce();

            const outZ = Math.abs(this.ball.position.z) > this.courtHalfW + 0.4;
            const outX = Math.abs(this.ball.position.x) > this.courtHalfL + 0.4;
            if (outZ || outX) {
                const winTeam = this.lastHitTeam === 0 ? 'RED' : 'BLUE';
                this.awardPoint(winTeam, 'OUT OF BOUNDS');
                return;
            }

            const ballSide = this.ball.position.x < 0 ? 0 : 1;
            if (ballSide !== this.lastHitTeam) {
                this.bounceCountOnSide++;
                if (this.bounceCountOnSide >= 2) {
                    this.awardPoint(this.lastHitTeam === 0 ? 'BLUE' : 'RED', 'DOUBLE BOUNCE');
                    return;
                }
            }
        }

        // ออกหลังเส้นไกลเกินขอบ
        if (Math.abs(this.ball.position.x) > this.courtHalfL + 3.2 || Math.abs(this.ball.position.z) > this.courtHalfW + 3.0) {
            const winTeam = this.lastHitTeam === 0 ? 'RED' : 'BLUE';
            this.awardPoint(winTeam, 'OUT!');
            return;
        }

        // อัปเดตเงาลูกบอล + Trail + Camera Shake
        if (this.ballShadow) {
            this.ballShadow.position.x = this.ball.position.x;
            this.ballShadow.position.z = this.ball.position.z;
            const s = Math.max(0.4, 1.1 - this.ball.position.y * 0.08);
            this.ballShadow.scaling.set(s, s, 1);
        }

        const tMesh = this.trailMeshes[this.trailIndex % this.trailMeshes.length];
        if (tMesh) {
            tMesh.isVisible = true;
            tMesh.position.copyFrom(this.ball.position);
            tMesh.scaling.setAll(1.0);
        }
        this.trailIndex++;
        for (const tm of this.trailMeshes) {
            if (tm.isVisible) {
                tm.scaling.scaleInPlace(0.88);
                if (tm.scaling.x < 0.15) tm.isVisible = false;
            }
        }

        // สีเน็ตกระพริบเมื่อชน
        if (this.netMat) {
            const B = window.BABYLON;
            this.netMat.emissiveColor = B.Color3.FromHexString(this.netFlashTimer > 0 ? '#ff00ff' : '#7c3aed');
        }

        // กล้องตามลูกบอลเบาๆ + สั่นเมื่อตีแรง
        if (this.bCamera) {
            const shakeX = (Math.random() - 0.5) * this.cameraShake;
            const shakeY = (Math.random() - 0.5) * this.cameraShake;
            this.bCamera.position.x += (this.ball.position.x * 0.18 + shakeX - this.bCamera.position.x) * Math.min(1, dt * 5);
            this.bCamera.position.y = 21.5 + shakeY;
            this.bCamera.setTarget(new window.BABYLON.Vector3(this.ball.position.x * 0.12, 0.5, 1.5));
        }
    }

    render() {
        if (this.bScene && this.engine) {
            this.bScene.render();
        }
    }

    updateHUD() {
        const mins = Math.floor(this.matchTimer / 60);
        const secs = Math.floor(this.matchTimer % 60).toString().padStart(2, '0');
        const activeCount = Config.players.activeCount;
        const modeLabel = activeCount >= 3 ? '2v2 DOUBLES' : (activeCount === 1 ? '1P vs AI' : '1v1 VERSUS');

        const playerChips = this.players.map(p => {
            const badge = p.isAI ? '🤖 AI' : '🎮 PAD';
            return `
                <div style="display:flex;align-items:center;gap:6px;font-size:0.78rem;padding:3px 8px;border-radius:8px;background:rgba(255,255,255,0.06);border-left:3px solid ${p.colorHex};">
                    <strong>${p.name}</strong>
                    <span style="opacity:0.8;">${badge}</span>
                    <span style="color:#00f0ff;">⚡${Math.floor(p.specialCharge)}%</span>
                </div>
            `;
        }).join('');

        const bannerHtml = this.lastPointTimer > 0 ? `
            <div style="position:fixed;top:24%;left:50%;transform:translateX(-50%);background:rgba(10,16,34,0.92);border:2px solid #00f0ff;padding:12px 28px;border-radius:14px;font-size:1.3rem;font-weight:900;color:#fff;box-shadow:0 0 28px rgba(0,240,255,0.45);z-index:30;">
                ${this.lastPointBanner}
            </div>
        ` : '';

        const summaryHtml = this.showSummary ? `
            <div class="modal-overlay" style="z-index:40;">
                <div class="modal-card" style="max-width:680px;border-color:#00f0ff;">
                    <h2 style="font-size:1.75rem;color:#00f0ff;margin-bottom:8px;">${this.winnerText}</h2>
                    <p style="color:var(--text-muted);margin-bottom:14px;">สกอร์สุดท้าย: 🔵 ${this.scoreBlue} — ${this.scoreRed} 🔴 | Rally สูงสุด: ${this.bestRally} ครั้ง</p>
                    ${this.buildSummaryTableHTML(
                        ['ผู้เล่น', 'ทีม', 'ตีได้', 'พลาด', 'ทำแต้ม', 'สถานะ'],
                        this.players.map(p => ({
                            cells: [
                                `${p.name} (${p.isAI ? 'AI' : 'จอย'})`,
                                p.team === 0 ? '🔵 ฟ้า' : '🔴 แดง',
                                `${p.hits}`,
                                `${p.misses}`,
                                `${p.pointsWon}`,
                                (this.winner === 'BLUE' && p.team === 0) || (this.winner === 'RED' && p.team === 1) ? '🏆 ชนะ' : '—'
                            ],
                            isWinner: (this.winner === 'BLUE' && p.team === 0) || (this.winner === 'RED' && p.team === 1)
                        }))
                    )}
                    <p style="margin-top:14px;font-size:0.85rem;color:var(--text-muted);">กด <strong>ESC</strong> หรือปุ่มกลับหน้าหลักเพื่อออก</p>
                </div>
            </div>
        ` : '';

        this.setHUD(`
            <div class="hud-top" style="align-items:flex-start;">
                <div class="hud-card" style="border-color:#00f0ff;">
                    <div style="font-size:0.75rem;color:#00f0ff;letter-spacing:1px;">CYBER TENNIS // ${modeLabel} • ⚡ BABYLON.JS</div>
                    <div style="display:flex;align-items:center;gap:14px;margin-top:4px;font-size:1.45rem;font-weight:900;">
                        <span style="color:#00f0ff;">🔵 ${this.scoreBlue}</span>
                        <span style="font-size:0.9rem;opacity:0.65;">VS (เป้า ${this.targetScore})</span>
                        <span style="color:#ff3366;">${this.scoreRed} 🔴</span>
                    </div>
                    <div style="font-size:0.8rem;color:var(--text-muted);margin-top:2px;">⏱️ ${mins}:${secs} | Rally: ${this.rallyCount}</div>
                </div>
                <div class="hud-card" style="display:flex;flex-direction:column;gap:4px;">
                    ${playerChips}
                    <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px;">✕ ปกติ | △/R2 แรง | ○ ลอยโด่ง | □/L2 ท่าพิเศษ</div>
                </div>
            </div>
            ${bannerHtml}
            ${summaryHtml}
        `);
    }

    dispose() {
        this.audio.stopBGM();
        this.audio.stopVictoryMusic();
        if (this._onResize) {
            window.removeEventListener('resize', this._onResize);
            this._onResize = null;
        }
        if (this.sparkSystem) {
            this.sparkSystem.dispose();
            this.sparkSystem = null;
        }
        if (this.glowLayer) {
            this.glowLayer.dispose();
            this.glowLayer = null;
        }
        if (this.bScene) {
            this.bScene.dispose();
            this.bScene = null;
        }
        if (this.engine) {
            this.engine.dispose();
            this.engine = null;
        }
        if (this.bjsCanvas) {
            this.bjsCanvas.remove();
            this.bjsCanvas = null;
        }
        if (this._threeCanvas) {
            this._threeCanvas.style.visibility = 'visible';
        }
        this.players = [];
        this.trailMeshes = [];
        super.dispose();
    }
}
