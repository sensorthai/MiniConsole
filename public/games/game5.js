/**
 * Game 5: ZOMBIE DEFENSE CO-OP (หน่วยรบพิทักษ์เตาปฏิกรณ์)
 * - เพิ่มจำนวนศัตรู (ฝูงซอมบี้และบอส) มากขึ้น 3 เท่าในทุกเวฟ!
 * - กำหนดเวลาแข่งขัน 3 นาที (180 วินาที / 5 เวฟ) เพื่อตัดสินหาผู้ชนะเลิศอันดับ 1 (MVP)
 * - สร้างจำนวนฮีโร่ตามจำนวนผู้เล่นที่เลือกจริง
 * - แสดงผลสรุปสถิติของผู้เข้าแข่งขัน (สังหารซอมบี้, สังหารบอส, ดาเมจรวม, คะแนนรวม) และอันดับที่ได้
 */
import * as THREE from 'three';
import { GameBase } from '../js/gameBase.js';
import { Config } from '../js/config.js';
import { createCyberFighter, createDetailedZombie, createDetailedItemBox } from '../js/models.js';

export class Game5Zombies extends GameBase {
    constructor(app, meta) {
        super(app, meta);
        this.heroes = [];
        this.zombies = [];
        this.bullets = [];
        this.powerups = [];
        this.powerupTimer = 6.0;
        this.baseHp = 1000;
        this.maxBaseHp = 1000;
        this.wave = 1;
        this.maxWaves = 5;
        this.roundTimer = 180.0; // กำหนดเวลาตัดสินผู้ชนะภายใน 3 นาที (180 วินาที)
        // เพิ่มจำนวนศัตรูมากขึ้น 3 เท่า (จากเดิม 12 ตัว -> 36 ตัวในเวฟแรก)
        this.zombiesRemainingToSpawn = 36;
        this.spawnCooldown = 0;
        this.teamXp = 0;
        this.weaponTier = 1;
        this.winner = null;
        this.gameOver = false;
        this.missionSuccess = false;
        this.showSummary = false;
    }

    init() {
        super.init();
        this.camera.position.set(0, 30, 24);
        this.camera.lookAt(0, 0, 0);
        this.buildBase();
        this.spawnHeroes();
    }

    buildBase() {
        const floor = new THREE.Mesh(
            new THREE.CylinderGeometry(34, 34, 1, 48),
            new THREE.MeshStandardMaterial({ color: 0x0d1322, roughness: 0.45, metalness: 0.55 })
        );
        floor.position.y = -0.5;
        floor.receiveShadow = true;
        this.scene.add(floor);

        const grid = new THREE.PolarGridHelper(34, 16, 8, 64, 0xb829ff, 0x1a243b);
        grid.position.y = 0.02;
        this.scene.add(grid);

        this.reactorGroup = new THREE.Group();
        const pedestal = new THREE.Mesh(
            new THREE.CylinderGeometry(2.8, 3.4, 0.8, 8),
            new THREE.MeshStandardMaterial({ color: 0x1a243a, roughness: 0.3, metalness: 0.85 })
        );
        pedestal.position.y = 0.4;
        this.reactorGroup.add(pedestal);

        this.coreCrystal = new THREE.Mesh(
            new THREE.OctahedronGeometry(1.75, 1),
            new THREE.MeshStandardMaterial({
                color: 0x00f0ff,
                emissive: 0x00f0ff,
                emissiveIntensity: 1.5,
                roughness: 0.1,
                metalness: 0.9
            })
        );
        this.coreCrystal.position.y = 3.0;
        this.reactorGroup.add(this.coreCrystal);

        this.gyroRing1 = new THREE.Mesh(
            new THREE.TorusGeometry(2.45, 0.12, 12, 36),
            new THREE.MeshStandardMaterial({ color: 0xb829ff, emissive: 0xb829ff, emissiveIntensity: 1.3 })
        );
        this.gyroRing1.position.y = 3.0;
        this.reactorGroup.add(this.gyroRing1);

        this.gyroRing2 = new THREE.Mesh(
            new THREE.TorusGeometry(2.85, 0.1, 12, 36),
            new THREE.MeshStandardMaterial({ color: 0x05ffa1, emissive: 0x05ffa1, emissiveIntensity: 1.1 })
        );
        this.gyroRing2.position.y = 3.0;
        this.gyroRing2.rotation.x = Math.PI / 2;
        this.reactorGroup.add(this.gyroRing2);

        this.scene.add(this.reactorGroup);
    }

    spawnHeroes() {
        const selectedCount = Math.min(4, Math.max(1, Config.players.activeCount));
        const totalHeroes = selectedCount === 1 ? 2 : selectedCount;

        for (let i = 0; i < totalHeroes; i++) {
            const angle = (i / totalHeroes) * Math.PI * 2;
            const col = Config.players.colors[i];
            const group = createCyberFighter(col.hex);

            group.position.set(Math.cos(angle) * 5.8, 0, Math.sin(angle) * 5.8);
            this.scene.add(group);

            this.heroes.push({
                index: i,
                isExtraCpu: selectedCount === 1 && i === 1,
                mesh: group,
                yaw: angle,
                fireTimer: 0,
                kills: 0,
                bossKills: 0,
                damageDealt: 0,
                repairsDone: 0,
                score: 0,
                colorHex: col.hex,
                colorCss: col.css
            });
        }
    }

    getRankedHeroes() {
        return [...this.heroes].sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (b.kills !== a.kills) return b.kills - a.kills;
            if (b.damageDealt !== a.damageDealt) return b.damageDealt - a.damageDealt;
            return b.bossKills - a.bossKills;
        });
    }

    spawnZombie(isBoss = false) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 28 + Math.random() * 3.5;
        const scale = isBoss ? 2.35 : 1.0;
        const hp = isBoss ? 260 + this.wave * 50 : 20 + this.wave * 6;

        const mesh = createDetailedZombie(isBoss);
        mesh.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
        this.scene.add(mesh);

        this.zombies.push({
            mesh,
            hp,
            maxHp: hp,
            isBoss,
            speed: isBoss ? 3.4 : (5.0 + Math.min(4.2, this.wave * 0.45)),
            radius: 0.9 * scale,
            phase: Math.random() * Math.PI * 2
        });
    }

    finishMatch(success) {
        this.missionSuccess = success;
        this.gameOver = true;
        const ranked = this.getRankedHeroes();
        this.winner = ranked[0];
        this.audio.powerup();
        this.updateHUD();
    }

    fixedUpdate(dt) {
        if (this.gameOver) return;

        // นับเวลาถอยหลัง 3 นาที (180 วินาที)
        this.roundTimer = Math.max(0, this.roundTimer - dt);
        if (this.roundTimer <= 0) {
            this.finishMatch(true);
            return;
        }

        this.coreCrystal.rotation.y += dt * 1.4;
        this.coreCrystal.rotation.x += dt * 0.8;
        this.gyroRing1.rotation.x += dt * 1.9;
        this.gyroRing1.rotation.y += dt * 1.1;
        this.gyroRing2.rotation.y -= dt * 2.2;
        this.gyroRing2.rotation.z += dt * 1.3;

        if (this.zombiesRemainingToSpawn > 0) {
            this.spawnCooldown -= dt;
            if (this.spawnCooldown <= 0) {
                // ปล่อยศัตรูเป็นชุดละ 3 ตัวพร้อมกัน (จำนวนศัตรูเพิ่มขึ้น 3 เท่า)
                const batchSize = Math.min(3, this.zombiesRemainingToSpawn);
                for (let b = 0; b < batchSize; b++) {
                    const isBossWave = (this.wave === 3 || this.wave === 5);
                    const spawnBoss = isBossWave && (this.zombiesRemainingToSpawn <= 3);
                    this.spawnZombie(spawnBoss);
                    this.zombiesRemainingToSpawn--;
                }
                this.spawnCooldown = Math.max(0.28, 0.88 - this.wave * 0.07);
            }
        } else if (this.zombies.length === 0) {
            if (this.wave >= this.maxWaves) {
                this.finishMatch(true);
                return;
            }
            this.wave++;
            // เพิ่มจำนวนศัตรูในแต่ละเวฟเป็น 3 เท่า (เช่น เวฟ 2 = 54 ตัว, เวฟ 3 = 66 ตัว, เวฟ 4 = 78 ตัว, เวฟ 5 = 90 ตัว)
            this.zombiesRemainingToSpawn = (10 + this.wave * 4) * 3;
            this.audio.powerup();
        }

        if (this.teamXp >= 280) this.weaponTier = 3;
        else if (this.teamXp >= 100) this.weaponTier = 2;

        // สปอว์นกล่องเสบียงควอนตัมและระเบิดนิวเคลียร์ (Quantum Supply & Nuke Crate) จาก Blender (.glb)
        this.powerupTimer -= dt;
        if (this.powerupTimer <= 0 && this.powerups.length < 3) {
            this.powerupTimer = 7.5;
            const ang = Math.random() * Math.PI * 2;
            const rad = 6 + Math.random() * 14;
            const itemMesh = createDetailedItemBox('zombie');
            itemMesh.position.set(Math.cos(ang) * rad, 1.35, Math.sin(ang) * rad);
            this.scene.add(itemMesh);
            this.powerups.push({ mesh: itemMesh });
        }

        this.powerups.forEach((p) => {
            p.mesh.rotation.y += dt * 2.2;
            p.mesh.position.y = 1.35 + Math.sin(this.elapsed * 4.5) * 0.18;
        });

        this.heroes.forEach((h) => {
            const pad = this.input.pads[h.index];
            const isHuman = !h.isExtraCpu && pad && pad.connected;
            let mx = 0, mz = 0, ax = 0, az = 0, fire = false;

            for (let i = this.powerups.length - 1; i >= 0; i--) {
                const p = this.powerups[i];
                if (Math.hypot(h.mesh.position.x - p.mesh.position.x, h.mesh.position.z - p.mesh.position.z) < 2.2) {
                    this.scene.remove(p.mesh);
                    this.powerups.splice(i, 1);
                    this.baseHp = Math.min(this.maxBaseHp, this.baseHp + 150);
                    this.teamXp += 45;
                    h.score += 65;
                    h.repairsDone++;
                    this.audio.powerup();
                    this.particles.explode(h.mesh.position, 0x05ffa1, 30, 8);
                }
            }

            if (isHuman) {
                mx = pad.lx;
                mz = pad.ly;
                ax = Math.hypot(pad.rx, pad.ry) > 0.15 ? pad.rx : mx;
                az = Math.hypot(pad.rx, pad.ry) > 0.15 ? pad.ry : mz;
                fire = pad.square || pad.cross || pad.r2Btn || Math.hypot(pad.rx, pad.ry) > 0.25;
                if (pad.justPressed.triangle && this.teamXp >= 50 && this.baseHp < this.maxBaseHp) {
                    this.teamXp -= 50;
                    this.baseHp = Math.min(this.maxBaseHp, this.baseHp + 200);
                    h.repairsDone++;
                    h.score += 40;
                    this.audio.powerup();
                }
            } else {
                const patrolAngle = this.elapsed * 0.65 + h.index * (Math.PI / 2);
                const targetX = Math.cos(patrolAngle) * 7.5;
                const targetZ = Math.sin(patrolAngle) * 7.5;
                mx = (targetX - h.mesh.position.x) * 0.25;
                mz = (targetZ - h.mesh.position.z) * 0.25;

                let closest = null;
                let minDist = 999;
                this.zombies.forEach((z) => {
                    const d = h.mesh.position.distanceTo(z.mesh.position);
                    if (d < minDist) { minDist = d; closest = z; }
                });
                if (closest) {
                    ax = closest.mesh.position.x - h.mesh.position.x;
                    az = closest.mesh.position.z - h.mesh.position.z;
                    fire = minDist < 26;
                }
            }

            h.mesh.position.x = THREE.MathUtils.clamp(h.mesh.position.x + mx * 9.5 * dt, -26, 26);
            h.mesh.position.z = THREE.MathUtils.clamp(h.mesh.position.z + mz * 9.5 * dt, -26, 26);

            const ud = h.mesh.userData;
            if (ud && ud.legL && ud.legR) {
                const moving = Math.hypot(mx, mz) > 0.08;
                const swing = moving ? Math.sin(this.elapsed * 14 + h.index) * 0.5 : 0;
                ud.legL.rotation.x = swing;
                ud.legR.rotation.x = -swing;
            }

            if (Math.hypot(ax, az) > 0.05) {
                h.yaw = Math.atan2(ax, az);
                h.mesh.rotation.y = h.yaw;
            }

            if (h.fireTimer > 0) h.fireTimer -= dt;
            if (fire && h.fireTimer <= 0) {
                h.fireTimer = this.weaponTier === 3 ? 0.11 : (this.weaponTier === 2 ? 0.14 : 0.19);
                this.audio.laser(650 + this.weaponTier * 110);
                const spreads = this.weaponTier === 3 ? [-0.18, 0, 0.18] : (this.weaponTier === 2 ? [-0.07, 0.07] : [0]);
                spreads.forEach((s) => {
                    const ang = h.yaw + s;
                    const dir = new THREE.Vector3(Math.sin(ang), 0, Math.cos(ang));
                    const bGeo = new THREE.CapsuleGeometry(0.13, 0.4, 6, 8);
                    bGeo.rotateX(Math.PI / 2);
                    const bMesh = new THREE.Mesh(
                        bGeo,
                        new THREE.MeshBasicMaterial({ color: h.colorHex })
                    );
                    bMesh.position.copy(h.mesh.position).add(new THREE.Vector3(0, 1.15, 0)).addScaledVector(dir, 1.1);
                    bMesh.rotation.y = ang;
                    this.scene.add(bMesh);
                    this.bullets.push({
                        mesh: bMesh,
                        dir,
                        dmg: this.weaponTier === 3 ? 28 : 20,
                        owner: h,
                        life: 1.2
                    });
                });
            }
        });

        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.life -= dt;
            b.mesh.position.addScaledVector(b.dir, 36 * dt);
            let remove = b.life <= 0;

            for (let j = this.zombies.length - 1; j >= 0 && !remove; j--) {
                const z = this.zombies[j];
                const dist = Math.hypot(b.mesh.position.x - z.mesh.position.x, b.mesh.position.z - z.mesh.position.z);
                if (dist < z.radius + 0.45) {
                    remove = true;
                    z.hp -= b.dmg;
                    b.owner.damageDealt += b.dmg;
                    b.owner.score += Math.round(b.dmg * 0.2);
                    this.particles.emit(b.mesh.position, { x: 0, y: 2, z: 0 }, 0x39ff14, 0.35, 0.25, 6, 4);
                    if (z.hp <= 0) {
                        b.owner.kills++;
                        if (z.isBoss) {
                            b.owner.bossKills++;
                            b.owner.score += 120;
                        } else {
                            b.owner.score += 20;
                        }
                        this.teamXp += z.isBoss ? 80 : 8;
                        this.audio.explosion();
                        if (z.isBoss) this.graphics.triggerShake(0.75);
                        this.particles.explode(z.mesh.position, z.isBoss ? 0xff2a6d : 0x39ff14, z.isBoss ? 70 : 28, 9);
                        this.scene.remove(z.mesh);
                        this.zombies.splice(j, 1);
                    }
                }
            }

            if (remove) {
                this.scene.remove(b.mesh);
                b.mesh.geometry.dispose();
                b.mesh.material.dispose();
                this.bullets.splice(i, 1);
            }
        }

        for (let i = this.zombies.length - 1; i >= 0; i--) {
            const z = this.zombies[i];
            const toCore = new THREE.Vector3(-z.mesh.position.x, 0, -z.mesh.position.z);
            const dist = toCore.length();
            toCore.normalize();
            z.mesh.position.addScaledVector(toCore, z.speed * dt);
            z.mesh.rotation.y = Math.atan2(toCore.x, toCore.z);

            const zUd = z.mesh.userData;
            if (zUd && zUd.legL && zUd.legR) {
                const walk = Math.sin(this.elapsed * 10 + z.phase) * 0.55;
                zUd.legL.rotation.x = walk;
                zUd.legR.rotation.x = -walk;
                if (zUd.core) zUd.core.rotation.y += dt * 4;
            }

            if (dist < 2.8) {
                this.baseHp = Math.max(0, this.baseHp - (z.isBoss ? 140 : 22));
                this.audio.hit();
                this.graphics.triggerShake(0.4);
                this.particles.explode(z.mesh.position, 0x00f0ff, 30, 8);
                this.scene.remove(z.mesh);
                this.zombies.splice(i, 1);

                if (this.baseHp <= 0) {
                    this.finishMatch(false);
                    return;
                }
            }
        }

        this.updateHUD();
    }

    updateHUD() {
        const mins = Math.floor(this.roundTimer / 60);
        const secs = String(Math.floor(this.roundTimer % 60)).padStart(2, '0');
        const tierNames = ['', 'ปืนพัลส์ไรเฟิล (Lv.1)', 'ปืนพลาสม่าคู่ (Lv.2)', 'ปืนเรลกันกระจาย (Lv.3)'];
        const bossAlert = (this.wave === 3 || this.wave === 5) ? '<span class="hud-item">⚠️ เวฟบอส x3!</span>' : '';
        const ranked = this.getRankedHeroes();
        const rankMap = new Map();
        ranked.forEach((h, idx) => rankMap.set(h.index, idx + 1));

        const heroPills = this.heroes.map((h) => {
            const pad = this.input.pads[h.index];
            const label = h.isExtraCpu ? 'CPU' : `P${h.index + 1}`;
            const roleTag = (!h.isExtraCpu && pad && pad.connected) ? 'จอย' : 'บอท';
            const rank = rankMap.get(h.index) || 1;
            return `
                <div class="hud-pill" style="border-color:${h.colorCss}">
                    <span class="hud-rank-badge">#${rank}</span>
                    <strong style="color:${h.colorCss}">${label} (${roleTag})</strong>
                    <span>สังหาร: ${h.kills}</span>
                    <span>แต้ม: ${h.score}</span>
                </div>
            `;
        }).join('');

        let summaryHtml = '';
        if (this.gameOver || this.showSummary) {
            const rows = ranked.map((h, idx) => {
                const pad = this.input.pads[h.index];
                const label = h.isExtraCpu ? 'บอท CPU' : `ผู้เล่น P${h.index + 1}`;
                const roleTag = (!h.isExtraCpu && pad && pad.connected) ? 'จอยสติ๊ก' : 'บอท AI';
                return {
                    rank: idx + 1,
                    playerLabel: label,
                    roleTag,
                    colorCss: h.colorCss,
                    stats: [
                        `${h.score} คะแนน`,
                        `${h.kills} ตัว`,
                        `${h.bossKills} ตัว`,
                        `${h.damageDealt} หน่วย`
                    ]
                };
            });

            const mvp = ranked[0];
            const mvpName = mvp.isExtraCpu ? 'บอท CPU' : `ผู้เล่น P${mvp.index + 1}`;
            const titleStr = this.gameOver
                ? (this.missionSuccess
                    ? `${mvpName} ชนะเลิศคว้าแชมป์พิทักษ์เตาปฏิกรณ์! (${mvp.score} คะแนน)`
                    : `เตาปฏิกรณ์พังในเวฟที่ ${this.wave} — ผู้ชนะคะแนนสูงสุด: ${mvpName}!`)
                : `ตารางอันดับและสถิติหน่วยรบพิทักษ์เตาปฏิกรณ์`;

            summaryHtml = this.buildSummaryTableHTML({
                title: titleStr,
                subtitle: `ภารกิจ 3 นาที ฝูงซอมบี้ 3 เท่า (เวฟที่ ${this.wave}/${this.maxWaves}) | เวลาที่เหลือ ${mins}:${secs} | พลังเตาปฏิกรณ์ ${this.baseHp}/${this.maxBaseHp}`,
                columns: ['คะแนนผลงานรวม', 'ซอมบี้ที่สังหาร', 'บอสที่สังหาร', 'ความเสียหายรวม'],
                rows
            });
        }

        this.setHUD(`
            <div class="hud-top-row">
                <div class="hud-timer">⏱ เวลา ${mins}:${secs} | เวฟ ${this.wave}/${this.maxWaves} (ศัตรู ${this.zombies.length + this.zombiesRemainingToSpawn}) ${bossAlert}</div>
                <div class="hud-pill" style="border-color:#00f0ff"><strong>เตาปฏิกรณ์</strong> <span>${this.baseHp}/${this.maxBaseHp}</span></div>
                <div class="hud-pill" style="border-color:#b829ff"><strong>อาวุธ</strong> <span>${tierNames[this.weaponTier]}</span></div>
                <div class="hud-pill" style="border-color:#05ffa1"><strong>พลังงาน</strong> <span>${this.teamXp} (△ ซ่อมฐาน)</span></div>
                ${heroPills}
            </div>
            ${summaryHtml}
        `);
    }
}
