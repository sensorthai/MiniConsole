/**
 * Game 2: ARENA BLASTER (สมรภูมิปืนเลเซอร์ไซเบอร์)
 * - ปรับความเสียหายเมื่อโดนยิง: พลังชีวิตลดลงครั้งละ 10% (10 HP จาก 100 HP)
 * - เมื่อโดนยิงตาย: แสดงแบนเนอร์แจ้งเตือนการสังหารชัดเจน (ใครยิงใครตาย, สังหารครั้งที่เท่าไหร่, เวลานับถอยหลังเกิดใหม่ 1.5 วินาที) พร้อมเอฟเฟกต์ตัวละครล้มและป้ายสถานะเหนือหัว
 * - แสดงผลสรุปสถิติของผู้เข้าแข่งขันและอันดับที่ได้
 */
import * as THREE from 'three';
import { GameBase } from '../js/gameBase.js';
import { Config } from '../js/config.js';
import { createCyberFighter, createDetailedItemBox } from '../js/models.js';

export class Game2Blaster extends GameBase {
    constructor(app, meta) {
        super(app, meta);
        this.fighters = [];
        this.bullets = [];
        this.obstacles = [];
        this.powerups = [];
        this.killFeed = [];
        this.roundTimer = 180;
        this.arenaSize = 24;
        this.winner = null;
        this.showSummary = false;
    }

    init() {
        super.init();
        this.camera.position.set(0, 32, 22);
        this.camera.lookAt(0, 0, 0);
        this.buildArena();
        this.spawnFighters();
    }

    buildArena() {
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x0f1526,
            roughness: 0.35,
            metalness: 0.7
        });
        const floor = new THREE.Mesh(new THREE.BoxGeometry(this.arenaSize * 2, 1, this.arenaSize * 2), floorMat);
        floor.position.y = -0.5;
        floor.receiveShadow = true;
        this.scene.add(floor);

        const grid = new THREE.GridHelper(this.arenaSize * 2, 24, 0xff2a6d, 0x1e2942);
        grid.position.y = 0.02;
        this.scene.add(grid);

        const pillarMat = new THREE.MeshStandardMaterial({
            color: 0x1c2541,
            roughness: 0.25,
            metalness: 0.85
        });
        const neonMat = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            emissive: 0x00f0ff,
            emissiveIntensity: 1.3
        });

        const coords = [
            [-10, -10], [10, -10], [-10, 10], [10, 10],
            [0, -13], [0, 13], [-13, 0], [13, 0]
        ];
        coords.forEach(([x, z]) => {
            const pGroup = new THREE.Group();
            const core = new THREE.Mesh(new THREE.BoxGeometry(3.0, 3.2, 3.0), pillarMat);
            core.position.y = 1.6;
            core.castShadow = true;
            core.receiveShadow = true;
            pGroup.add(core);

            const basePlinth = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.4, 3.4), pillarMat);
            basePlinth.position.y = 0.2;
            pGroup.add(basePlinth);

            const trimBand = new THREE.Mesh(new THREE.BoxGeometry(3.15, 0.22, 3.15), neonMat);
            trimBand.position.y = 2.6;
            pGroup.add(trimBand);

            pGroup.position.set(x, 0, z);
            this.scene.add(pGroup);
            this.obstacles.push({ x, z, half: 2.1 });
        });
    }

    /**
     * สร้างและอัปเดตป้ายชื่อ + หลอดเลือดลอยเหนือตัวละครแต่ละคนในสนาม 3D
     */
    createFighterOverheadSprite() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 96;
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(3.2, 1.2, 1);
        sprite.position.set(0, 2.85, 0);
        return { sprite, canvas, tex };
    }

    updateFighterOverheadSprite(f) {
        if (!f.overhead) return;
        const { canvas, tex } = f.overhead;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 256, 96);

        const label = f.isExtraCpu ? 'CPU' : `P${f.index + 1}`;
        const isDead = f.respawnTimer > 0;

        ctx.fillStyle = isDead ? 'rgba(90, 8, 28, 0.92)' : 'rgba(6, 12, 28, 0.86)';
        ctx.beginPath();
        ctx.roundRect(8, 8, 240, 80, 14);
        ctx.fill();

        ctx.strokeStyle = isDead ? '#ff2a6d' : f.colorCss;
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (isDead) {
            ctx.fillStyle = '#ff2a6d';
            ctx.font = '900 28px sans-serif';
            ctx.fillText(`💀 ${label} ถูกยิงตาย!`, 128, 34);
            ctx.fillStyle = '#ffffff';
            ctx.font = '800 22px sans-serif';
            ctx.fillText(`โดย ${f.killedBy} (${f.respawnTimer.toFixed(1)}s)`, 128, 66);
        } else {
            ctx.fillStyle = f.colorCss;
            ctx.font = '900 26px sans-serif';
            ctx.fillText(`${label} — HP ${f.hp}%`, 128, 32);

            // หลอดพลังชีวิต
            ctx.fillStyle = 'rgba(255,255,255,0.18)';
            ctx.fillRect(28, 54, 200, 18);
            ctx.fillStyle = f.hp > 30 ? f.colorCss : '#ff2a6d';
            ctx.fillRect(28, 54, Math.max(0, (f.hp / 100) * 200), 18);
        }

        tex.needsUpdate = true;
    }

    spawnFighters() {
        const spawns = [
            new THREE.Vector3(-18, 0, -18),
            new THREE.Vector3(18, 0, 18),
            new THREE.Vector3(18, 0, -18),
            new THREE.Vector3(-18, 0, 18)
        ];

        const selectedCount = Config.players.activeCount;
        const totalCombatants = selectedCount === 1 ? 2 : selectedCount;

        for (let i = 0; i < totalCombatants; i++) {
            const col = Config.players.colors[i];
            const group = createCyberFighter(col.hex);

            const shieldMesh = new THREE.Mesh(
                new THREE.IcosahedronGeometry(1.45, 2),
                new THREE.MeshBasicMaterial({
                    color: 0x00f0ff,
                    wireframe: true,
                    transparent: true,
                    opacity: 0.48
                })
            );
            shieldMesh.position.y = 1.1;
            shieldMesh.visible = false;
            group.add(shieldMesh);

            const overhead = this.createFighterOverheadSprite();
            group.add(overhead.sprite);

            group.position.copy(spawns[i]);
            this.scene.add(group);

            const fighterObj = {
                index: i,
                isExtraCpu: selectedCount === 1 && i === 1,
                mesh: group,
                shieldMesh,
                overhead,
                hp: 100,
                kills: 0,
                deaths: 0,
                damageDealt: 0,
                shotsHit: 0,
                respawnTimer: 0,
                killedBy: '',
                yaw: 0,
                fireCooldown: 0,
                dashCooldown: 0,
                dashTimer: 0,
                dashVec: new THREE.Vector3(),
                powerup: null,
                powerupTimer: 0,
                spawnPos: spawns[i].clone(),
                colorHex: col.hex,
                colorCss: col.css
            };
            this.updateFighterOverheadSprite(fighterObj);
            this.fighters.push(fighterObj);
        }
    }

    getRankedFighters() {
        return [...this.fighters].sort((a, b) => {
            if (b.kills !== a.kills) return b.kills - a.kills;
            if (b.damageDealt !== a.damageDealt) return b.damageDealt - a.damageDealt;
            if (a.deaths !== b.deaths) return a.deaths - b.deaths;
            return b.hp - a.hp;
        });
    }

    spawnPowerup() {
        if (this.powerups.length >= 3) return;
        const types = ['ยิงรัว', 'ยิงกระจาย', 'เกราะพลังงาน'];
        const type = types[Math.floor(Math.random() * types.length)];
        const mesh = createDetailedItemBox('blaster');
        mesh.position.set((Math.random() - 0.5) * 16, 1.2, (Math.random() - 0.5) * 16);
        this.scene.add(mesh);
        this.powerups.push({ mesh, type });
    }

    fixedUpdate(dt) {
        if (this.winner) return;

        // อัปเดตเวลารายการแจ้งเตือนการสังหาร (Kill Feed)
        for (let i = this.killFeed.length - 1; i >= 0; i--) {
            this.killFeed[i].timer -= dt;
            if (this.killFeed[i].timer <= 0) {
                this.killFeed.splice(i, 1);
            }
        }

        this.roundTimer = Math.max(0, this.roundTimer - dt);
        if (this.roundTimer <= 0) {
            const sorted = this.getRankedFighters();
            this.winner = sorted[0];
            this.updateHUD();
            return;
        }

        if (Math.random() < dt * 0.25) {
            this.spawnPowerup();
        }

        this.powerups.forEach((p) => {
            p.mesh.rotation.y += dt * 2.5;
            if (p.mesh.userData.innerCrystal) {
                p.mesh.userData.innerCrystal.rotation.x += dt * 3;
            }
        });

        this.fighters.forEach((f) => {
            // หากตัวละครอยู่ในสถานะถูกยิงตาย รอเกิดใหม่ 1.5 วินาที
            if (f.respawnTimer > 0) {
                f.respawnTimer -= dt;
                f.mesh.rotation.x = -Math.PI / 2.2;
                this.updateFighterOverheadSprite(f);
                if (f.respawnTimer <= 0) {
                    f.respawnTimer = 0;
                    f.hp = 100;
                    f.killedBy = '';
                    f.mesh.rotation.x = 0;
                    f.mesh.position.copy(f.spawnPos);
                    this.particles.explode(f.mesh.position, f.colorHex, 25, 6);
                    this.updateFighterOverheadSprite(f);
                }
                return;
            }

            const pad = this.input.pads[f.index];
            const isHuman = !f.isExtraCpu && pad && pad.connected;
            let moveX = 0, moveZ = 0, aimX = 0, aimZ = 0;
            let shoot = false, dash = false;

            if (isHuman) {
                moveX = pad.lx;
                moveZ = pad.ly;
                aimX = Math.hypot(pad.rx, pad.ry) > 0.15 ? pad.rx : moveX;
                aimZ = Math.hypot(pad.rx, pad.ry) > 0.15 ? pad.ry : moveZ;
                shoot = pad.square || pad.r2Btn || pad.cross;
                dash = pad.justPressed.r1 || pad.justPressed.l1 || pad.justPressed.circle;
            } else {
                let nearest = null;
                let minDist = 999;
                this.fighters.forEach((other) => {
                    if (other !== f && other.respawnTimer <= 0) {
                        const d = f.mesh.position.distanceTo(other.mesh.position);
                        if (d < minDist) { minDist = d; nearest = other; }
                    }
                });
                if (nearest) {
                    const toEnemy = new THREE.Vector3().subVectors(nearest.mesh.position, f.mesh.position);
                    aimX = toEnemy.x;
                    aimZ = toEnemy.z;
                    const strafeAngle = this.elapsed * 1.5 + f.index;
                    moveX = (minDist > 9 ? toEnemy.x * 0.08 : -toEnemy.x * 0.05) + Math.cos(strafeAngle) * 0.6;
                    moveZ = (minDist > 9 ? toEnemy.z * 0.08 : -toEnemy.z * 0.05) + Math.sin(strafeAngle) * 0.6;
                    shoot = minDist < 22;
                    dash = minDist < 6 && f.dashCooldown <= 0;
                }
            }

            if (f.fireCooldown > 0) f.fireCooldown -= dt;
            if (f.dashCooldown > 0) f.dashCooldown -= dt;
            if (f.powerupTimer > 0) {
                f.powerupTimer -= dt;
                if (f.powerupTimer <= 0) f.powerup = null;
            }
            f.shieldMesh.visible = f.powerup === 'เกราะพลังงาน' || f.dashTimer > 0;
            f.shieldMesh.rotation.y += dt * 2;

            if (dash && f.dashCooldown <= 0) {
                f.dashTimer = 0.22;
                f.dashCooldown = 1.6;
                f.dashVec.set(moveX || Math.sin(f.yaw), 0, moveZ || Math.cos(f.yaw)).normalize();
                this.audio.boost();
            }

            const speed = f.dashTimer > 0 ? 28.0 : 10.5;
            if (f.dashTimer > 0) {
                f.dashTimer -= dt;
                f.mesh.position.addScaledVector(f.dashVec, speed * dt);
                this.particles.emit(f.mesh.position, { x: 0, y: 1, z: 0 }, f.colorHex, 0.45, 0.25, 2, 1.2);
            } else {
                const moveVec = new THREE.Vector3(moveX, 0, moveZ);
                if (moveVec.lengthSq() > 1) moveVec.normalize();
                f.mesh.position.addScaledVector(moveVec, speed * dt);

                const ud = f.mesh.userData;
                if (ud && ud.legL && ud.legR) {
                    const moving = moveVec.length() > 0.1;
                    const swing = moving ? Math.sin(this.elapsed * 14 + f.index) * 0.55 : 0;
                    ud.legL.rotation.x = swing;
                    ud.legR.rotation.x = -swing;
                }
            }

            f.mesh.position.x = THREE.MathUtils.clamp(f.mesh.position.x, -this.arenaSize + 1, this.arenaSize - 1);
            f.mesh.position.z = THREE.MathUtils.clamp(f.mesh.position.z, -this.arenaSize + 1, this.arenaSize - 1);

            for (const obs of this.obstacles) {
                const dx = f.mesh.position.x - obs.x;
                const dz = f.mesh.position.z - obs.z;
                if (Math.abs(dx) < obs.half && Math.abs(dz) < obs.half) {
                    if (Math.abs(dx) > Math.abs(dz)) {
                        f.mesh.position.x = obs.x + Math.sign(dx) * obs.half;
                    } else {
                        f.mesh.position.z = obs.z + Math.sign(dz) * obs.half;
                    }
                }
            }

            if (Math.hypot(aimX, aimZ) > 0.1) {
                f.yaw = Math.atan2(aimX, aimZ);
                f.mesh.rotation.y = f.yaw;
            }

            for (let i = this.powerups.length - 1; i >= 0; i--) {
                const p = this.powerups[i];
                if (f.mesh.position.distanceTo(p.mesh.position) < 1.8) {
                    f.powerup = p.type;
                    f.powerupTimer = 7.0;
                    if (p.type === 'เกราะพลังงาน') {
                        f.hp = Math.min(100, f.hp + 20);
                        this.updateFighterOverheadSprite(f);
                    }
                    this.scene.remove(p.mesh);
                    this.powerups.splice(i, 1);
                    this.audio.powerup();
                }
            }

            const fireInterval = f.powerup === 'ยิงรัว' ? 0.09 : 0.21;
            if (shoot && f.fireCooldown <= 0) {
                f.fireCooldown = fireInterval;
                this.audio.laser(820 + f.index * 60);
                const angles = f.powerup === 'ยิงกระจาย' ? [-0.22, 0, 0.22] : [0];
                angles.forEach((offset) => {
                    const ang = f.yaw + offset;
                    const dir = new THREE.Vector3(Math.sin(ang), 0, Math.cos(ang));
                    const bGeo = new THREE.CapsuleGeometry(0.14, 0.45, 6, 8);
                    bGeo.rotateX(Math.PI / 2);
                    const bMesh = new THREE.Mesh(
                        bGeo,
                        new THREE.MeshBasicMaterial({ color: f.colorHex })
                    );
                    bMesh.position.copy(f.mesh.position).add(new THREE.Vector3(0, 1.2, 0)).addScaledVector(dir, 1.15);
                    bMesh.rotation.y = ang;
                    this.scene.add(bMesh);
                    this.bullets.push({ mesh: bMesh, dir, owner: f, life: 1.4 });
                });
            }
        });

        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.life -= dt;
            b.mesh.position.addScaledVector(b.dir, 34.0 * dt);

            let hit = b.life <= 0 ||
                Math.abs(b.mesh.position.x) > this.arenaSize ||
                Math.abs(b.mesh.position.z) > this.arenaSize;

            if (!hit) {
                for (const obs of this.obstacles) {
                    if (Math.abs(b.mesh.position.x - obs.x) < obs.half &&
                        Math.abs(b.mesh.position.z - obs.z) < obs.half) {
                        hit = true;
                        this.particles.emit(b.mesh.position, { x: 0, y: 2, z: 0 }, b.owner.colorHex, 0.3, 0.25, 6, 4);
                        break;
                    }
                }
            }

            if (!hit) {
                for (const target of this.fighters) {
                    if (target !== b.owner && target.dashTimer <= 0 && target.respawnTimer <= 0) {
                        const dist = Math.hypot(b.mesh.position.x - target.mesh.position.x, b.mesh.position.z - target.mesh.position.z);
                        if (dist < 1.05) {
                            hit = true;
                            // ลดพลังชีวิตครั้งละ 10% (10 HP จากเต็ม 100 HP)
                            const dmg = 10;
                            target.hp = Math.max(0, target.hp - dmg);
                            b.owner.damageDealt += dmg;
                            b.owner.shotsHit++;

                            this.audio.hit();
                            this.input.rumble(target.index, 160, 160, 120);
                            this.particles.emit(b.mesh.position, { x: 0, y: 2, z: 0 }, target.colorHex, 0.4, 0.35, 10, 5);

                            if (target.hp <= 0) {
                                b.owner.kills++;
                                target.deaths++;
                                const killerName = b.owner.isExtraCpu ? 'CPU' : `ผู้เล่น P${b.owner.index + 1}`;
                                const victimName = target.isExtraCpu ? 'CPU' : `ผู้เล่น P${target.index + 1}`;

                                target.respawnTimer = 1.5;
                                target.killedBy = killerName;
                                target.mesh.rotation.x = -Math.PI / 2.2;

                                // บันทึกข้อมูลการสังหารเพื่อแสดงป้ายแจ้งเตือนชัดเจนบนหน้าจอ
                                this.killFeed.unshift({
                                    killerName,
                                    killerColor: b.owner.colorCss,
                                    killerTotalKills: b.owner.kills,
                                    victimName,
                                    victimColor: target.colorCss,
                                    victimDeaths: target.deaths,
                                    timer: 3.2
                                });
                                if (this.killFeed.length > 3) this.killFeed.pop();

                                this.audio.explosion();
                                this.graphics.triggerShake(0.5);
                                this.particles.explode(target.mesh.position, target.colorHex, 65, 11);
                                this.input.rumble(target.index, 255, 255, 450);
                            }

                            this.updateFighterOverheadSprite(target);
                            break;
                        }
                    }
                }
            }

            if (hit) {
                this.scene.remove(b.mesh);
                b.mesh.geometry.dispose();
                b.mesh.material.dispose();
                this.bullets.splice(i, 1);
            }
        }

        const center = new THREE.Vector3();
        this.fighters.forEach((f) => center.add(f.mesh.position));
        center.divideScalar(this.fighters.length || 1);
        this.camera.position.lerp(new THREE.Vector3(center.x * 0.4, 32, center.z * 0.4 + 22), dt * 4);
        this.camera.lookAt(center.x * 0.3, 0, center.z * 0.3);

        this.updateHUD();
    }

    updateHUD() {
        const mins = Math.floor(this.roundTimer / 60);
        const secs = String(Math.floor(this.roundTimer % 60)).padStart(2, '0');
        const ranked = this.getRankedFighters();
        const rankMap = new Map();
        ranked.forEach((f, idx) => rankMap.set(f.index, idx + 1));

        const pills = this.fighters.map((f) => {
            const pad = this.input.pads[f.index];
            const label = f.isExtraCpu ? 'CPU' : `P${f.index + 1}`;
            const roleTag = (!f.isExtraCpu && pad && pad.connected) ? 'จอย' : 'บอท';
            const rank = rankMap.get(f.index) || 1;
            const isDead = f.respawnTimer > 0;
            const statusHtml = isDead
                ? `<span style="color:#ff2a6d;font-weight:900;">💀 ถูก ${f.killedBy} ยิงตาย! (เกิดใหม่ ${f.respawnTimer.toFixed(1)}s)</span>`
                : `<span>HP ${f.hp}%</span>`;

            return `
                <div class="hud-pill" style="border-color:${isDead ? '#ff2a6d' : f.colorCss};background:${isDead ? 'rgba(90,10,30,0.88)' : 'rgba(6,11,24,0.85)'}">
                    <span class="hud-rank-badge">#${rank}</span>
                    <strong style="color:${f.colorCss}">${label} (${roleTag})</strong>
                    ${statusHtml}
                    <span>สังหาร: ${f.kills} | ตาย: ${f.deaths}</span>
                    ${f.powerup ? `<span class="hud-item">${f.powerup}</span>` : ''}
                </div>
            `;
        }).join('');

        // แบนเนอร์แจ้งเตือนชัดเจนเมื่อมีผู้เล่นถูกยิงตาย
        let killAlertHtml = '';
        if (this.killFeed.length > 0 && !this.winner && !this.showSummary) {
            const feedItems = this.killFeed.map((k) => `
                <div style="background:rgba(8,12,28,0.92);border:2px solid #ff2a6d;border-radius:14px;padding:10px 22px;margin-top:8px;box-shadow:0 0 28px rgba(255,42,109,0.45);display:flex;align-items:center;gap:12px;font-size:1.05rem;font-weight:900;">
                    <span style="font-size:1.3rem;">💥</span>
                    <span>
                        <strong style="color:${k.victimColor}">${k.victimName}</strong>
                        <span style="color:#ff2a6d;"> ถูกยิงสังหารโดย </span>
                        <strong style="color:${k.killerColor}">${k.killerName}</strong>!
                    </span>
                    <span class="hud-item" style="font-size:0.84rem;">ยอดสังหาร ${k.killerName}: ${k.killerTotalKills} ครั้ง | ${k.victimName} ตายครั้งที่ ${k.victimDeaths}</span>
                </div>
            `).join('');
            killAlertHtml = `<div style="display:flex;flex-direction:column;align-items:center;margin-top:10px;">${feedItems}</div>`;
        }

        let summaryHtml = '';
        if (this.winner || this.showSummary) {
            const rows = ranked.map((f, idx) => {
                const pad = this.input.pads[f.index];
                const label = f.isExtraCpu ? 'บอท CPU' : `ผู้เล่น P${f.index + 1}`;
                const roleTag = (!f.isExtraCpu && pad && pad.connected) ? 'จอยสติ๊ก' : 'บอท AI';
                return {
                    rank: idx + 1,
                    playerLabel: label,
                    roleTag,
                    colorCss: f.colorCss,
                    stats: [
                        `${f.kills} ครั้ง`,
                        `${f.deaths} ครั้ง`,
                        `${f.damageDealt}% (${f.shotsHit} นัด)`,
                        `${f.hp}%`
                    ]
                };
            });

            const topFighter = ranked[0];
            const topName = topFighter.isExtraCpu ? 'บอท CPU' : `ผู้เล่น P${topFighter.index + 1}`;
            const winTitle = this.winner
                ? `${topName} ชนะเลิศด้วยยอดสังหาร ${topFighter.kills} ครั้ง!`
                : `ตารางอันดับและสถิติสมรภูมิปัจจุบัน`;

            summaryHtml = this.buildSummaryTableHTML({
                title: winTitle,
                subtitle: `กติกา: กระสุนลดพลังชีวิตนัดละ 10% — แข่งขันครบเวลาหรือกดดูสถิติ`,
                columns: ['สังหาร (Kills)', 'ถูกสังหาร (Deaths)', 'ดาเมจรวม (ยิงเข้าเป้า)', 'พลังชีวิตคงเหลือ'],
                rows
            });
        }

        this.setHUD(`
            <div class="hud-top-row">
                <div class="hud-timer">⏱ เวลา ${mins}:${secs}</div>
                ${pills}
            </div>
            ${killAlertHtml}
            ${summaryHtml}
        `);
    }
}
