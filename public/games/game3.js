/**
 * Game 3: SUMO BOTS (ศึกหุ่นซูโม่ชนกระเด็น)
 * - กำหนดเวลาการแข่งขัน 2 นาที (120 วินาที) พร้อมตัวนับเวลาถอยหลังบนหน้าจอ
 * - สร้างจำนวนหุ่นซูโม่ตามจำนวนผู้เล่นที่เลือกจริง
 * - แสดงผลสรุปสถิติของผู้เข้าแข่งขันและอันดับที่ได้เมื่อจบเกม
 */
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GameBase } from '../js/gameBase.js';
import { Config } from '../js/config.js';
import { createSumoMech, createDetailedItemBox } from '../js/models.js';

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
            friction: 0.05,
            restitution: 1.25
        });
        this.world.addContactMaterial(contact);
        this.botMaterial = bouncyMat;

        this.buildRings();
        this.spawnBots();
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
            this.rings.push({ mesh: ringGroup, surfaceMat: mat, outer: r.outer, active: true, falling: false, idx });
        });

        const groundShape = new CANNON.Cylinder(this.arenaRadius, this.arenaRadius, 2.0, 18);
        this.groundBody = new CANNON.Body({ mass: 0, shape: groundShape });
        this.groundBody.position.set(0, -1.0, 0);
        this.world.addBody(this.groundBody);

        const voidGrid = new THREE.GridHelper(120, 40, 0xff2a6d, 0x220015);
        voidGrid.position.y = -10;
        this.scene.add(voidGrid);
    }

    spawnBots() {
        const selectedCount = Config.players.activeCount;
        const totalBots = selectedCount === 1 ? 2 : selectedCount;

        for (let i = 0; i < totalBots; i++) {
            const angle = (i / totalBots) * Math.PI * 2;
            const col = Config.players.colors[i];
            const group = createSumoMech(col.hex, 1.15);

            const sx = Math.cos(angle) * 5.5;
            const sz = Math.sin(angle) * 5.5;
            group.position.set(sx, 1.5, sz);
            this.scene.add(group);

            const body = new CANNON.Body({
                mass: 5.0,
                shape: new CANNON.Sphere(1.15),
                material: this.botMaterial,
                linearDamping: 0.35,
                angularDamping: 0.4
            });
            body.position.set(sx, 1.5, sz);

            const botRecord = {
                index: i,
                isExtraCpu: selectedCount === 1 && i === 1,
                mesh: group,
                body,
                alive: true,
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
                fx = pad.lx;
                fz = pad.ly;
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

            b.body.applyForce(new CANNON.Vec3(fx * 95, 0, fz * 95), b.body.position);

            if (dash && b.dashCooldown <= 0) {
                b.dashCooldown = 1.6;
                b.dashesUsed++;
                const dirLen = Math.hypot(fx, fz) || 1;
                const ix = (fx / dirLen) * 68;
                const iz = (fz / dirLen) * 68;
                b.body.applyImpulse(new CANNON.Vec3(ix, 4, iz), b.body.position);
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
            b.mesh.quaternion.copy(b.body.quaternion);

            if (b.alive && b.body.position.y < -5.5) {
                b.alive = false;
                b.survivalTime = this.elapsed;
                this.audio.explosion();
                this.graphics.triggerShake(0.6);
                this.particles.explode(b.mesh.position, b.colorHex, 60, 12);
                this.input.rumble(b.index, 255, 255, 450);
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
                    <span>${b.alive ? 'อยู่บนเวที' : 'ตกเวทีแล้ว'}</span>
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
