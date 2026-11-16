/**
 * Game 3: SUMO BOTS (ศึกหุ่นซูโม่ชนกระเด็น)
 * - กำหนดเวลาการแข่งขัน 2 นาที (120 วินาที) พร้อมตัวนับเวลาถอยหลังบนหน้าจอ
 * - สร้างจำนวนหุ่นซูโม่ตามจำนวนผู้เล่นที่เลือกจริง
 * - แสดงผลสรุปสถิติของผู้เข้าแข่งขันและอันดับที่ได้เมื่อจบเกม
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';
import { GameBase } from '../js/gameBase.js';
import { Config } from '../js/config.js';
import { createRocketCar, createDetailedItemBox } from '../js/models.js';

export class Game3Sumo extends GameBase {
    constructor(app, meta) {
        super(app, meta);
        this.world = null;
        this.bots = [];
        this.rings = [];
        this.powerups = [];
        this.powerupTimer = 4.0;
        this.arenaRadius = 18.0;
        this.shrinkStage = 0;
        this.stageTimer = 30.0; // ย่อเวทีทุกๆ 30 วินาทีภายในเวลา 2 นาที
        this.roundTimer = 120.0; // เวลากำกับ 2 นาที (120 วินาที)
        this.winner = null;
        this.showSummary = false;
    }

    init() {
        super.init();
        this.camera.position.set(0, 24, 24);
        this.camera.lookAt(0, 0, 0);

        this.world = new CANNON.World({
            gravity: new CANNON.Vec3(0, -24, 0)
        });
        this.world.broadphase = new CANNON.SAPBroadphase(this.world);

        const bouncyMat = new CANNON.Material('sumoBot');
        const contact = new CANNON.ContactMaterial(bouncyMat, bouncyMat, {
            friction: 0.2,
            restitution: 0.85
        });
        this.world.addContactMaterial(contact);
        this.botMaterial = bouncyMat;

        this.buildRings();
        this.spawnBots();
    }

    createBillboardAdTexture(title, subtitle, bgCss, accentCss) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 192;
        const ctx = canvas.getContext('2d');

        const grad = ctx.createLinearGradient(0, 0, 512, 192);
        grad.addColorStop(0, '#070b18');
        grad.addColorStop(0.5, bgCss);
        grad.addColorStop(1, '#070b18');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 192);

        ctx.strokeStyle = accentCss;
        ctx.lineWidth = 8;
        ctx.strokeRect(8, 8, 496, 176);

        ctx.fillStyle = accentCss;
        ctx.font = 'bold 42px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(title, 256, 76);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText(subtitle, 256, 134);

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }

    buildRings() {
        const radii = [
            { inner: 0, outer: 8, color: 0x1a2639 },
            { inner: 8.08, outer: 13, color: 0x22334d },
            { inner: 13.08, outer: 18, color: 0x2c4263 }
        ];

        radii.forEach((r, idx) => {
            const ringGroup = new THREE.Group();

            const geo = new THREE.RingGeometry(r.inner, r.outer, 6);
            geo.rotateX(-Math.PI / 2);
            const mat = new THREE.MeshStandardMaterial({
                color: r.color,
                roughness: 0.28,
                metalness: 0.75,
                emissive: 0xffb800,
                emissiveIntensity: 0.15,
                side: THREE.DoubleSide
            });
            const topSurface = new THREE.Mesh(geo, mat);
            topSurface.receiveShadow = true;
            ringGroup.add(topSurface);

            const rim = new THREE.Mesh(
                new THREE.TorusGeometry(r.outer, 0.22, 8, 6),
                new THREE.MeshStandardMaterial({
                    color: 0xffb800,
                    emissive: 0xff8800,
                    emissiveIntensity: 0.9
                })
            );
            rim.rotation.x = Math.PI / 2;
            ringGroup.add(rim);

            this.scene.add(ringGroup);
            this.rings.push({ mesh: ringGroup, fallbackMeshes: [topSurface, rim], surfaceMat: mat, outer: r.outer, active: true, falling: false, idx });
        });

        const groundShape = new CANNON.Cylinder(this.arenaRadius, this.arenaRadius, 2.0, 18);
        this.groundBody = new CANNON.Body({ mass: 0, shape: groundShape });
        this.groundBody.position.set(0, -1.0, 0);
        this.world.addBody(this.groundBody);

        const voidGrid = new THREE.GridHelper(120, 40, 0xff2a6d, 0x220015);
        voidGrid.position.y = -10;
        this.scene.add(voidGrid);

        const ads = [
            ['SUMO BOTS 3D', 'BLENDER CYBER STADIUM', '#112a4a', '#00f0ff'],
            ['PS3 WIRELESS', '60Hz ESP32 BRIDGE', '#2a1038', '#ff2a6d'],
            ['MINI CONSOLE 3D', '4-PLAYER PARTY ARENA', '#0c2b2f', '#00ffa3'],
            ['GRAVITY SHOCK', 'COLLECT ITEM TO BLAST', '#331c08', '#ffaa00'],
            ['TURBO DASH', 'PRESS X / SQUARE / R1', '#1b1440', '#a855f7'],
            ['3 LIVES MODE', 'CONTROL & KNOCKOUT', '#380d22', '#fb7185']
        ];

        const gltfLoader = new GLTFLoader();
        const modelUrl = window.location.protocol === 'file:'
            ? 'public/models/sumo_arena.glb'
            : '/models/sumo_arena.glb';

        gltfLoader.load(
            modelUrl,
            (gltf) => {
                if (!this.scene || this._disposed) return;
                const arena = gltf.scene;
                const children = [...arena.children];
                children.forEach((child) => {
                    const name = child.name || '';
                    if (name.startsWith('SumoRing_0_')) {
                        this.rings[0]?.mesh.add(child);
                    } else if (name.startsWith('SumoRing_1_')) {
                        this.rings[1]?.mesh.add(child);
                    } else if (name.startsWith('SumoRing_2_')) {
                        this.rings[2]?.mesh.add(child);
                    } else if (name.startsWith('Billboard_Screen_')) {
                        const idx = parseInt(name.replace('Billboard_Screen_', ''), 10) || 0;
                        const ad = ads[idx % ads.length];
                        const tex = this.createBillboardAdTexture(ad[0], ad[1], ad[2], ad[3]);
                        child.material = new THREE.MeshStandardMaterial({
                            map: tex,
                            emissive: 0xffffff,
                            emissiveMap: tex,
                            emissiveIntensity: 0.9,
                            roughness: 0.25,
                            metalness: 0.1
                        });
                        this.scene.add(child);
                    } else {
                        this.scene.add(child);
                    }
                });
                this.rings.forEach((r) => {
                    r.fallbackMeshes.forEach((m) => { m.visible = false; });
                });
            },
            undefined,
            (err) => {
                console.warn('Could not load sumo_arena.glb, using fallback rings:', err);
            }
        );
    }

    spawnBots() {
        const selectedCount = Config.players.activeCount;
        const totalBots = selectedCount === 1 ? 2 : selectedCount;

        for (let i = 0; i < totalBots; i++) {
            const angle = (i / totalBots) * Math.PI * 2;
            const col = Config.players.colors[i];
            const group = createRocketCar(col.hex);
            group.scale.setScalar(1.05);

            const sx = Math.cos(angle) * 5.5;
            const sz = Math.sin(angle) * 5.5;
            group.position.set(sx, 0.85, sz);
            this.scene.add(group);

            const body = new CANNON.Body({
                mass: 5.0,
                shape: new CANNON.Box(new CANNON.Vec3(1.05, 0.75, 1.75)),
                material: this.botMaterial,
                linearDamping: 0.65,
                angularDamping: 0.9,
                fixedRotation: true
            });
            body.position.set(sx, 0.85, sz);

            const botRecord = {
                index: i,
                isExtraCpu: selectedCount === 1 && i === 1,
                mesh: group,
                body,
                alive: true,
                lives: 3,
                yaw: 0,
                respawnInvuln: 0,
                survivalTime: 0,
                hits: 0,
                dashesUsed: 0,
                hitCooldown: 0,
                dashCooldown: 0,
                colorHex: col.hex,
                colorCss: col.css
            };

            body.addEventListener('collide', (ev) => {
                if (ev.body && ev.body.mass > 0) {
                    if (botRecord.hitCooldown <= 0) {
                        botRecord.hits++;
                        botRecord.hitCooldown = 0.25;
                    }
                    this.audio.hit();
                    this.graphics.triggerShake(0.28);
                    this.particles.emit(group.position, { x: 0, y: 3, z: 0 }, 0xffb800, 0.45, 0.4, 14, 7);
                    this.input.rumble(i, 190, 190, 150);
                }
            });

            this.world.addBody(body);
            this.bots.push(botRecord);
        }
    }

    getRankedBots() {
        return [...this.bots].sort((a, b) => {
            if (a.alive !== b.alive) return a.alive ? -1 : 1;
            if (b.lives !== a.lives) return b.lives - a.lives;
            if (!a.alive && !b.alive) {
                return b.survivalTime - a.survivalTime;
            }
            if (b.hits !== a.hits) return b.hits - a.hits;
            const distA = Math.hypot(a.body.position.x, a.body.position.z);
            const distB = Math.hypot(b.body.position.x, b.body.position.z);
            return distA - distB;
        });
    }

    shrinkArenaRing() {
        const ringIdx = 2 - this.shrinkStage;
        if (ringIdx <= 0) return;
        const ring = this.rings[ringIdx];
        ring.falling = true;
        this.shrinkStage++;
        this.arenaRadius = ringIdx === 2 ? 13.0 : 8.0;
        this.audio.explosion();
        this.graphics.triggerShake(0.5);
    }

    fixedUpdate(dt) {
        if (this.winner) return;

        // นับเวลาถอยหลัง 2 นาที (120 วินาที)
        this.roundTimer = Math.max(0, this.roundTimer - dt);
        if (this.roundTimer <= 0) {
            const ranked = this.getRankedBots();
            this.winner = ranked[0];
            this.updateHUD();
            return;
        }

        if (this.shrinkStage < 2) {
            this.stageTimer -= dt;
            const targetRing = this.rings[2 - this.shrinkStage];
            if (this.stageTimer < 3.5 && targetRing) {
                targetRing.surfaceMat.emissive.setHex(Math.sin(this.elapsed * 18) > 0 ? 0xff0033 : 0x220000);
                targetRing.surfaceMat.emissiveIntensity = 1.2;
            }
            if (this.stageTimer <= 0) {
                this.shrinkArenaRing();
                this.stageTimer = 30.0;
            }
        }

        this.rings.forEach((r) => {
            if (r.falling) {
                r.mesh.position.y -= 14 * dt;
                r.mesh.rotation.x += dt * 0.6;
            }
        });

        // สปอว์นไอเทมพิเศษ (Super Gravity Shockwave) จาก Blender (.glb) บนเวทีซูโม่
        this.powerupTimer -= dt;
        if (this.powerupTimer <= 0 && this.powerups.length < 2) {
            this.powerupTimer = 7.0;
            const ang = Math.random() * Math.PI * 2;
            const rad = Math.random() * (this.arenaRadius * 0.55);
            const itemMesh = createDetailedItemBox('sumo');
            itemMesh.position.set(Math.cos(ang) * rad, 1.35, Math.sin(ang) * rad);
            this.scene.add(itemMesh);
            this.powerups.push({ mesh: itemMesh });
        }

        this.powerups.forEach((p) => {
            p.mesh.rotation.y += dt * 2.2;
            p.mesh.position.y = 1.35 + Math.sin(this.elapsed * 4.5) * 0.18;
        });

        this.bots.forEach((b) => {
            if (b.hitCooldown > 0) b.hitCooldown -= dt;
            if (b.respawnInvuln > 0) b.respawnInvuln -= dt;
            if (!b.alive) return;
            b.survivalTime = this.elapsed;
            if (b.dashCooldown > 0) b.dashCooldown -= dt;

            // เก็บไอเทมพิเศษบนเวทีซูโม่ (ปล่อยคลื่นกระแทกใส่คู่แข่งรอบตัว + รีเซ็ต Dash)
            for (let i = this.powerups.length - 1; i >= 0; i--) {
                const p = this.powerups[i];
                if (Math.hypot(b.body.position.x - p.mesh.position.x, b.body.position.z - p.mesh.position.z) < 2.1) {
                    this.scene.remove(p.mesh);
                    this.powerups.splice(i, 1);
                    b.dashCooldown = 0;
                    this.audio.powerup();
                    this.particles.explode(b.mesh.position, 0xffb800, 32, 9);
                    this.bots.forEach((other) => {
                        if (other !== b && other.alive) {
                            const dx = other.body.position.x - b.body.position.x;
                            const dz = other.body.position.z - b.body.position.z;
                            const dist = Math.hypot(dx, dz) || 1;
                            if (dist < 10.0) {
                                other.body.applyImpulse(new CANNON.Vec3((dx / dist) * 52, 5, (dz / dist) * 52), other.body.position);
                                b.hits++;
                            }
                        }
                    });
                }
            }

            const pad = this.input.pads[b.index];
            const isHuman = !b.isExtraCpu && pad && pad.connected;
            let fx = 0, fz = 0, dash = false;

            if (isHuman) {
                const rawX = Math.abs(pad.lx) > 0.12 ? pad.lx : 0;
                const rawZ = Math.abs(pad.ly) > 0.12 ? pad.ly : 0;
                const dpadX = (pad.right ? 1 : 0) - (pad.left ? 1 : 0);
                const dpadZ = (pad.down ? 1 : 0) - (pad.up ? 1 : 0);
                fx = dpadX !== 0 ? dpadX : rawX;
                fz = dpadZ !== 0 ? dpadZ : rawZ;
                const mag = Math.hypot(fx, fz);
                if (mag > 1) {
                    fx /= mag;
                    fz /= mag;
                }
                dash = pad.justPressed.cross || pad.justPressed.square || pad.justPressed.r1;
            } else {
                const distFromCenter = Math.hypot(b.body.position.x, b.body.position.z);
                if (distFromCenter > this.arenaRadius * 0.72) {
                    fx = -b.body.position.x / distFromCenter;
                    fz = -b.body.position.z / distFromCenter;
                } else {
                    const target = this.bots.find((o) => o !== b && o.alive);
                    if (target) {
                        const dx = target.body.position.x - b.body.position.x;
                        const dz = target.body.position.z - b.body.position.z;
                        const d = Math.hypot(dx, dz) || 1;
                        fx = dx / d;
                        fz = dz / d;
                        dash = d < 4.5 && b.dashCooldown <= 0;
                    }
                }
            }

            b.body.wakeUp();
            b.body.applyForce(new CANNON.Vec3(fx * 130, 0, fz * 130), b.body.position);

            if (Math.hypot(fx, fz) > 0.12) {
                b.yaw = Math.atan2(fx, fz);
                b.body.quaternion.setFromEuler(0, b.yaw, 0);
            }
            const ud = b.mesh.userData;
            if (ud && ud.wheels) {
                const spd = Math.hypot(b.body.velocity.x, b.body.velocity.z);
                ud.wheels.forEach((w) => {
                    w.spinMesh.rotation.x += spd * dt * 1.8;
                });
            }

            if (dash && b.dashCooldown <= 0) {
                b.dashCooldown = 1.4;
                b.dashesUsed++;
                const dirLen = Math.hypot(fx, fz) || 1;
                const ix = (fx / dirLen) * 42;
                const iz = (fz / dirLen) * 42;
                b.body.applyImpulse(new CANNON.Vec3(ix, 2, iz), b.body.position);
                this.audio.boost();
                this.particles.emit(b.mesh.position, { x: 0, y: 2, z: 0 }, b.colorHex, 0.5, 0.35, 16, 6);
            }

            const radialDist = Math.hypot(b.body.position.x, b.body.position.z);
            if (radialDist > this.arenaRadius + 0.5 && b.body.position.y <= 1.2) {
                b.body.position.y -= 9.8 * dt;
                b.body.velocity.y -= 18 * dt;
            }
        });

        this.world.step(dt);

        this.bots.forEach((b) => {
            b.mesh.position.copy(b.body.position);
            b.mesh.rotation.set(0, b.yaw, 0);

            if (b.alive && b.body.position.y < -5.5) {
                b.lives--;
                this.audio.explosion();
                this.graphics.triggerShake(0.5);
                this.particles.explode(b.mesh.position, b.colorHex, 50, 10);
                this.input.rumble(b.index, 255, 255, 400);

                if (b.lives > 0) {
                    const ang = (b.index / Math.max(1, this.bots.length)) * Math.PI * 2;
                    b.body.position.set(Math.cos(ang) * 2.5, 2.8, Math.sin(ang) * 2.5);
                    b.body.velocity.set(0, 0, 0);
                    b.body.angularVelocity.set(0, 0, 0);
                    b.respawnInvuln = 1.5;
                } else {
                    b.alive = false;
                    b.survivalTime = this.elapsed;
                    b.mesh.visible = false;
                }
            }
        });

        const survivors = this.bots.filter((b) => b.alive);
        if (survivors.length <= 1 && !this.winner) {
            const ranked = this.getRankedBots();
            this.winner = survivors[0] || ranked[0];
        }

        this.updateHUD();
    }

    updateHUD() {
        const mins = Math.floor(this.roundTimer / 60);
        const secs = String(Math.floor(this.roundTimer % 60)).padStart(2, '0');
        const ranked = this.getRankedBots();
        const rankMap = new Map();
        ranked.forEach((b, idx) => rankMap.set(b.index, idx + 1));

        const pills = this.bots.map((b) => {
            const pad = this.input.pads[b.index];
            const label = b.isExtraCpu ? 'CPU' : `P${b.index + 1}`;
            const roleTag = (!b.isExtraCpu && pad && pad.connected) ? 'จอย' : 'บอท';
            const rank = rankMap.get(b.index) || 1;
            return `
                <div class="hud-pill" style="border-color:${b.colorCss};opacity:${b.alive ? 1 : 0.45}">
                    <span class="hud-rank-badge">#${rank}</span>
                    <strong style="color:${b.colorCss}">${label} (${roleTag})</strong>
                    <span>${b.alive ? `❤️ ${b.lives} ชีวิต` : '❌ ตกเวทีครบ 3 ครั้ง'}</span>
                    <span>ชน: ${b.hits}</span>
                </div>
            `;
        }).join('');

        let summaryHtml = '';
        if (this.winner || this.showSummary) {
            const rows = ranked.map((b, idx) => {
                const pad = this.input.pads[b.index];
                const label = b.isExtraCpu ? 'บอท CPU' : `ผู้เล่น P${b.index + 1}`;
                const roleTag = (!b.isExtraCpu && pad && pad.connected) ? 'จอยสติ๊ก' : 'บอท AI';
                return {
                    rank: idx + 1,
                    playerLabel: label,
                    roleTag,
                    colorCss: b.colorCss,
                    stats: [
                        b.alive ? '✅ ยืนหยัดบนเวที' : '❌ ตกเวที',
                        `${b.survivalTime.toFixed(1)} วินาที`,
                        `${b.hits} ครั้ง`,
                        `${b.dashesUsed} ครั้ง`
                    ]
                };
            });

            const winBot = ranked[0];
            const winName = winBot.isExtraCpu ? 'บอท CPU' : `ผู้เล่น P${winBot.index + 1}`;
            const winTitle = this.winner
                ? `${winName} คว้าแชมป์ศึกซูโม่บอท!`
                : `ตารางอันดับและสถิติซูโม่บอทปัจจุบัน`;

            summaryHtml = this.buildSummaryTableHTML({
                title: winTitle,
                subtitle: `กำหนดเวลาแข่งขัน 2 นาที (120 วินาที) — เวลาที่เหลือ ${mins}:${secs}`,
                columns: ['สถานะสุดท้าย', 'เวลาที่ยืนหยัด', 'ชนกระแทก (Hits)', 'พุ่งชน (Dashes)'],
                rows
            });
        }

        this.setHUD(`
            <div class="hud-top-row">
                <div class="hud-timer">⏱ เวลา ${mins}:${secs} | เวที ${this.arenaRadius} ม.</div>
                ${pills}
            </div>
            ${summaryHtml}
        `);
    }
}
