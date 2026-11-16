/**
 * Game 2: ARENA BLASTER (สมรภูมิปืนเลเซอร์ไซเบอร์)
 * - ปรับความเสียหายเมื่อโดนยิง: พลังชีวิตลดลงครั้งละ 5% (5 HP จาก 100 HP)
 * - เมื่อโดนยิงตาย: แสดงแบนเนอร์แจ้งเตือนการสังหารชัดเจน (ใครยิงใครตาย, สังหารครั้งที่เท่าไหร่, เวลานับถอยหลังเกิดใหม่ 1.5 วินาที) พร้อมเอฟเฟกต์ตัวละครล้มและป้ายสถานะเหนือหัว
 * - แสดงผลสรุปสถิติของผู้เข้าแข่งขันและอันดับที่ได้
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
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
        ctx.font = 'bold 44px sans-serif';
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

    buildArena() {
        const grid = new THREE.GridHelper(this.arenaSize * 2, 24, 0xff2a6d, 0x1e2942);
        grid.position.y = 0.03;
        this.scene.add(grid);

        // Register collision boxes matching Blender arena_blaster.glb obstacles
        this.obstacles.push({ x: 0, z: 0, halfX: 2.75, halfZ: 2.75 });
        this.obstacles.push({ x: 0, z: -13, halfX: 4.1, halfZ: 1.45 });
        this.obstacles.push({ x: 0, z: 13, halfX: 4.1, halfZ: 1.45 });
        this.obstacles.push({ x: 13, z: 0, halfX: 1.45, halfZ: 4.1 });
        this.obstacles.push({ x: -13, z: 0, halfX: 1.45, halfZ: 4.1 });

        [[-9.5, -9.5], [9.5, -9.5], [-9.5, 9.5], [9.5, 9.5]].forEach(([x, z]) => {
            this.obstacles.push({ x, z, halfX: 2.2, halfZ: 2.2 });
        });
        [[-17.5, -6.5], [17.5, -6.5], [-17.5, 6.5], [17.5, 6.5]].forEach(([x, z]) => {
            this.obstacles.push({ x, z, halfX: 1.35, halfZ: 1.35 });
        });

        // Fallback floor in case GLB is still loading or blocked on file://
        const fallbackFloor = new THREE.Mesh(
            new THREE.BoxGeometry(this.arenaSize * 2, 1, this.arenaSize * 2),
            new THREE.MeshStandardMaterial({ color: 0x0f1526, roughness: 0.35, metalness: 0.7 })
        );
        fallbackFloor.position.y = -0.52;
        fallbackFloor.receiveShadow = true;
        this.scene.add(fallbackFloor);

        const ads = [
            ['MINI CONSOLE 3D', 'NEXT-GEN PARTY GAMING', '#112a4a', '#00f0ff'],
            ['PS3 WIRELESS', '60Hz ESP32 BRIDGE', '#2a1038', '#ff2a6d'],
            ['CYBER BLASTER', 'ARENA CHAMPIONSHIP', '#0c2b2f', '#00ffa3'],
            ['NEON ENERGY', 'MAX SHIELD +20 HP', '#331c08', '#ffaa00'],
            ['HYPER LASER', 'RAPID FIRE OVERDRIVE', '#1b1440', '#a855f7'],
            ['TURBO DASH', 'PRESS L1 / R1 TO DODGE', '#0f293d', '#38bdf8'],
            ['TRIPLE SHOT', 'SPREAD CANNON MK-II', '#380d22', '#fb7185'],
            ['CYBER CORE', 'CONTROL THE CENTER', '#0c2e2c', '#2dd4bf'],
            ['PIXEL LABS', 'BLENDER 3D ARENA', '#291a08', '#facc15'],
            ['ESP32-S3 HUB', '4-PLAYER MULTIPLAY', '#10213e', '#60a5fa'],
            ['ARENA PRO', '5 HP TACTICAL MODE', '#2e0f2d', '#f472b6'],
            ['NEXUS TECH', 'SPONSORED BY ANTIGRAVITY', '#0d2636', '#00f0ff']
        ];

        const gltfLoader = new GLTFLoader();
        const modelUrl = window.location.protocol === 'file:'
            ? 'public/models/arena_blaster.glb'
            : '/models/arena_blaster.glb';

        gltfLoader.load(
            modelUrl,
            (gltf) => {
                if (!this.scene || this._disposed) return;
                const arena = gltf.scene;
                arena.traverse((child) => {
                    if (!child.isMesh) return;
                    const name = child.name || '';
                    if (name.startsWith('Billboard_Screen_')) {
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
                    } else {
                        child.receiveShadow = true;
                        child.castShadow = name !== 'Arena_Floor';
                    }
                });
                this.scene.add(arena);
            },
            undefined,
            (err) => {
                console.warn('Could not load arena_blaster.glb, using fallback geometry:', err);
            }
        );
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
                const hx = obs.halfX ?? obs.half;
                const hz = obs.halfZ ?? obs.half;
                const dx = f.mesh.position.x - obs.x;
                const dz = f.mesh.position.z - obs.z;
                if (Math.abs(dx) < hx && Math.abs(dz) < hz) {
                    if (Math.abs(dx) / hx > Math.abs(dz) / hz) {
                        f.mesh.position.x = obs.x + Math.sign(dx) * hx;
                    } else {
                        f.mesh.position.z = obs.z + Math.sign(dz) * hz;
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
                    const hx = obs.halfX ?? obs.half;
                    const hz = obs.halfZ ?? obs.half;
                    if (Math.abs(b.mesh.position.x - obs.x) < hx &&
                        Math.abs(b.mesh.position.z - obs.z) < hz) {
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
                            // ลดพลังชีวิตครั้งละ 5% (5 HP จากเต็ม 100 HP)
                            const dmg = 5;
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
