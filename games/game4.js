/**
 * Game 4: ROCKET SOCCER (ฟุตบอลรถซิ่งติดจรวด)
 * - สร้างจำนวนรถตามจำนวนผู้เล่นที่เลือกจริง
 * - เมื่อยิงลูกบอลเข้าประตู (GOAL!) ระบบจะหยุดแสดงภาพลูกบอลในประตูและป้ายฉลองประตูชัดเจนเป็นเวลา 1 วินาทีเต็ม ก่อนรีเซ็ตเขี่ยบอลใหม่
 * - แสดงผลสรุปสถิติของผู้เข้าแข่งขัน (ประตูที่ยิง, สัมผัสบอล, บูสต์ที่ใช้) และอันดับที่ได้เมื่อจบเกม
 */
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GameBase } from '../js/gameBase.js';
import { Config } from '../js/config.js';
import { createRocketCar, createDetailedSoccerBall, createDetailedItemBox } from '../js/models.js';

export class Game4Soccer extends GameBase {
    constructor(app, meta) {
        super(app, meta);
        this.world = null;
        this.cars = [];
        this.ball = null;
        this.powerups = [];
        this.powerupTimer = 5.0;
        this.scoreBlue = 0;
        this.scoreRed = 0;
        this.matchTimer = 180;
        this.pitchW = 22;
        this.pitchL = 34;
        this.goalWidth = 9.0;
        this.winnerText = null;
        this.lastTouchBlue = null;
        this.lastTouchRed = null;
        this.goalFreezeTimer = 0;
        this.goalBannerInfo = null;
        this.showSummary = false;
    }

    init() {
        super.init();
        this.camera.position.set(0, 32, 36);
        this.camera.lookAt(0, 0, 0);

        this.world = new CANNON.World({
            gravity: new CANNON.Vec3(0, -20, 0)
        });

        this.buildStadium();
        this.spawnBall();
        this.spawnCars();
        this.updateAllVisibleCamera(1.0);
        this.audio.startSoccerBGM();
    }

    dispose() {
        this.audio.stopBGM();
        this.audio.stopVictoryMusic();
        super.dispose();
    }

    updateAllVisibleCamera(dt = 0.016) {
        if (!this.ball) return;
        let minX = this.ball.mesh.position.x;
        let maxX = this.ball.mesh.position.x;
        let minZ = this.ball.mesh.position.z;
        let maxZ = this.ball.mesh.position.z;

        for (const c of this.cars) {
            const p = c.mesh.position;
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.z < minZ) minZ = p.z;
            if (p.z > maxZ) maxZ = p.z;
        }

        // เผื่อระยะขอบให้มองเห็นรถทุกคันและลูกบอลครบตลอดเวลา
        const spanX = (maxX - minX) + 18;
        const spanZ = (maxZ - minZ) + 14;
        const centerX = (minX + maxX) * 0.5;
        const centerZ = (minZ + maxZ) * 0.5;

        const aspect = Math.max(1.0, window.innerWidth / Math.max(1, window.innerHeight));
        const vFov = THREE.MathUtils.degToRad(this.camera.fov || 60);
        const hFov = 2 * Math.atan(Math.tan(vFov * 0.5) * aspect);

        const distForX = (spanX * 0.5) / Math.tan(hFov * 0.5);
        const distForZ = (spanZ * 0.5) / Math.tan(vFov * 0.5);
        const targetDist = THREE.MathUtils.clamp(Math.max(24, distForX, distForZ * 1.15), 24, 62);

        const targetCamX = centerX;
        const targetCamY = targetDist * 0.72;
        const targetCamZ = centerZ + targetDist * 0.68;

        const lerpFactor = Math.min(1, dt * 5.0);
        this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetCamX, lerpFactor);
        this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetCamY, lerpFactor);
        this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetCamZ, lerpFactor);
        this.camera.lookAt(centerX, 1.0, centerZ);
    }

    buildStadium() {
        const pitchMat = new THREE.MeshStandardMaterial({
            color: 0x0c2438,
            roughness: 0.42,
            metalness: 0.45
        });
        const pitch = new THREE.Mesh(new THREE.BoxGeometry(this.pitchL * 2, 1, this.pitchW * 2), pitchMat);
        pitch.position.y = -0.5;
        pitch.receiveShadow = true;
        this.scene.add(pitch);

        const ring = new THREE.Mesh(
            new THREE.RingGeometry(4.8, 5.15, 48),
            new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.03;
        this.scene.add(ring);

        const midLine = new THREE.Mesh(
            new THREE.PlaneGeometry(0.35, this.pitchW * 2),
            new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
        );
        midLine.rotation.x = -Math.PI / 2;
        midLine.position.y = 0.03;
        this.scene.add(midLine);

        const buildDetailedGoal = (xPos, colorHex) => {
            const goalGroup = new THREE.Group();
            const postMat = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                emissive: colorHex,
                emissiveIntensity: 1.5,
                roughness: 0.2,
                metalness: 0.8
            });
            const h = 5.8;
            const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, h, 16), postMat);
            postL.position.set(0, h / 2, -this.goalWidth);
            const postR = postL.clone();
            postR.position.z = this.goalWidth;

            const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, this.goalWidth * 2 + 0.5, 16), postMat);
            crossbar.rotation.x = Math.PI / 2;
            crossbar.position.set(0, h, 0);

            const netBox = new THREE.Mesh(
                new THREE.BoxGeometry(4.2, h, this.goalWidth * 2),
                new THREE.MeshBasicMaterial({
                    color: colorHex,
                    wireframe: true,
                    transparent: true,
                    opacity: 0.48
                })
            );
            netBox.position.set(Math.sign(xPos) * 2.1, h / 2, 0);

            // เส้นโกลเรืองแสงบนพื้นสนามเพื่อให้เห็นจังหวะบอลข้ามเส้นชัดเจน
            const goalLine = new THREE.Mesh(
                new THREE.PlaneGeometry(0.45, this.goalWidth * 2),
                new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide })
            );
            goalLine.rotation.x = -Math.PI / 2;
            goalLine.position.set(0, 0.05, 0);

            goalGroup.add(postL, postR, crossbar, netBox, goalLine);
            goalGroup.position.x = xPos;
            this.scene.add(goalGroup);
        };

        buildDetailedGoal(-this.pitchL, 0x00f0ff);
        buildDetailedGoal(this.pitchL, 0xff2a6d);

        const groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        this.world.addBody(groundBody);
    }

    spawnBall() {
        const radius = 1.85;
        const mesh = createDetailedSoccerBall(radius);
        this.scene.add(mesh);

        const body = new CANNON.Body({
            mass: 1.6,
            shape: new CANNON.Sphere(radius),
            linearDamping: 0.18,
            angularDamping: 0.2
        });
        body.position.set(0, 4, 0);
        this.world.addBody(body);

        this.ball = { mesh, body, radius };
    }

    spawnCars() {
        const selectedCount = Config.players.activeCount;
        const totalCars = selectedCount === 1 ? 2 : selectedCount;

        const spawns = totalCars <= 2
            ? [
                { x: -16, z: 0, yaw: Math.PI / 2, team: 'BLUE' },
                { x: 16,  z: 0, yaw: -Math.PI / 2, team: 'RED' }
            ]
            : [
                { x: -16, z: -6, yaw: Math.PI / 2, team: 'BLUE' },
                { x: 16,  z: -6, yaw: -Math.PI / 2, team: 'RED' },
                { x: -16, z: 6,  yaw: Math.PI / 2, team: 'BLUE' },
                { x: 16,  z: 6,  yaw: -Math.PI / 2, team: 'RED' }
            ];

        for (let i = 0; i < totalCars; i++) {
            const s = spawns[i];
            const col = Config.players.colors[i];
            const group = createRocketCar(col.hex);

            group.position.set(s.x, 0.5, s.z);
            group.rotation.y = s.yaw;
            this.scene.add(group);

            this.cars.push({
                index: i,
                isExtraCpu: selectedCount === 1 && i === 1,
                team: s.team,
                mesh: group,
                vel: new THREE.Vector3(),
                yaw: s.yaw,
                yVel: 0,
                grounded: true,
                boost: 100,
                goals: 0,
                touches: 0,
                touchCooldown: 0,
                boostTimeUsed: 0,
                spawn: s,
                colorHex: col.hex,
                colorCss: col.css
            });
        }
    }

    getRankedCars() {
        return [...this.cars].sort((a, b) => {
            const scoreA = a.team === 'BLUE' ? this.scoreBlue : this.scoreRed;
            const scoreB = b.team === 'BLUE' ? this.scoreBlue : this.scoreRed;
            if (scoreB !== scoreA) return scoreB - scoreA;
            if (b.goals !== a.goals) return b.goals - a.goals;
            if (b.touches !== a.touches) return b.touches - a.touches;
            return b.boostTimeUsed - a.boostTimeUsed;
        });
    }

    resetKickoff() {
        this.ball.body.position.set(0, 4.5, 0);
        this.ball.body.velocity.set(0, 0, 0);
        this.ball.body.angularVelocity.set(0, 0, 0);
        this.ball.mesh.position.copy(this.ball.body.position);
        this.cars.forEach((c) => {
            c.mesh.position.set(c.spawn.x, 0.5, c.spawn.z);
            c.vel.set(0, 0, 0);
            c.yaw = c.spawn.yaw;
            c.mesh.rotation.y = c.yaw;
        });
    }

    fixedUpdate(dt) {
        if (this.winnerText) return;

        // หยุดแสดงภาพเมื่อลูกบอลเข้าโกลเป็นเวลา 1 วินาทีเต็ม เพื่อให้เห็นบอลอยู่ในโกลและป้ายฉลองชัดเจน
        if (this.goalFreezeTimer > 0) {
            this.goalFreezeTimer -= dt;
            this.ball.mesh.rotation.y += dt * 8;
            this.particles.emit(this.ball.mesh.position, { x: 0, y: 4, z: 0 }, 0x05ffa1, 0.55, 0.35, 3, 5);

            // ยังคงจัดเฟรมกล้องให้เห็นรถทุกคันและลูกบอลในโกลครบตลอดเวลา
            this.updateAllVisibleCamera(dt);

            if (this.goalFreezeTimer <= 0) {
                this.goalFreezeTimer = 0;
                this.goalBannerInfo = null;
                this.resetKickoff();
            }
            this.updateHUD();
            return;
        }

        this.matchTimer = Math.max(0, this.matchTimer - dt);
        if (this.matchTimer <= 0) {
            this.audio.stopBGM();
            this.audio.victoryFanfare();
            if (this.scoreBlue > this.scoreRed) {
                this.winnerText = 'ทีมสีฟ้าเป็นฝ่ายชนะเลิศ!';
            } else if (this.scoreRed > this.scoreBlue) {
                this.winnerText = 'ทีมสีแดงเป็นฝ่ายชนะเลิศ!';
            } else {
                this.winnerText = 'จบเกมด้วยผลเสมอสุดมันส์!';
            }
            this.updateHUD();
            return;
        }

        const ballPos = this.ball.body.position;

        // สปอว์นถังเทอร์โบบูสต์พิเศษ (Twin-Turbo Canister) จาก Blender (.glb) ในสนามฟุตบอล
        this.powerupTimer -= dt;
        if (this.powerupTimer <= 0 && this.powerups.length < 3) {
            this.powerupTimer = 6.5;
            const px = (Math.random() - 0.5) * (this.pitchL * 1.4);
            const pz = (Math.random() - 0.5) * (this.pitchW * 1.4);
            const itemMesh = createDetailedItemBox('soccer');
            itemMesh.position.set(px, 1.35, pz);
            this.scene.add(itemMesh);
            this.powerups.push({ mesh: itemMesh });
        }

        this.powerups.forEach((p) => {
            p.mesh.rotation.y += dt * 2.4;
            p.mesh.position.y = 1.35 + Math.sin(this.elapsed * 4.5) * 0.18;
        });

        this.cars.forEach((c) => {
            if (c.touchCooldown > 0) c.touchCooldown -= dt;

            for (let i = this.powerups.length - 1; i >= 0; i--) {
                const p = this.powerups[i];
                if (Math.hypot(c.mesh.position.x - p.mesh.position.x, c.mesh.position.z - p.mesh.position.z) < 2.4) {
                    this.scene.remove(p.mesh);
                    this.powerups.splice(i, 1);
                    c.boost = 100;
                    c.speed = Math.min(28, c.speed + 9);
                    this.audio.powerup();
                    this.particles.explode(c.mesh.position, 0x05ffa1, 24, 7);
                }
            }

            const pad = this.input.pads[c.index];
            const isHuman = !c.isExtraCpu && pad && pad.connected;
            let throttle = 0, steer = 0, boost = false, jump = false;

            if (isHuman) {
                const stickThrottle = Math.abs(pad.ly) > 0.05 ? -pad.ly : 0;
                const btnThrottle = (pad.cross || pad.r2Btn) ? 1 : (pad.circle || pad.l2Btn ? -0.7 : 0);
                throttle = stickThrottle !== 0 ? stickThrottle : btnThrottle;
                steer = -pad.lx;
                boost = pad.r1 || pad.square;
                jump = pad.justPressed.triangle || pad.justPressed.l1;
            } else {
                const goalX = c.team === 'BLUE' ? this.pitchL : -this.pitchL;
                const aimX = ballPos.x - Math.sign(goalX - ballPos.x) * 1.5;
                const dx = aimX - c.mesh.position.x;
                const dz = ballPos.z - c.mesh.position.z;
                const targetYaw = Math.atan2(dx, dz);
                let diff = targetYaw - c.yaw;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                steer = THREE.MathUtils.clamp(diff * 2.5, -1, 1);
                throttle = 0.95;
                boost = Math.abs(diff) < 0.35 && Math.hypot(dx, dz) > 8;
                jump = Math.hypot(dx, dz) < 3.5 && ballPos.y > 2.0 && c.grounded;
            }

            if (jump && c.grounded) {
                c.yVel = 10.5;
                c.grounded = false;
                this.audio.jump();
            }

            if (!c.grounded) {
                c.yVel -= 24.0 * dt;
                c.mesh.position.y += c.yVel * dt;
                if (c.mesh.position.y <= 0.5) {
                    c.mesh.position.y = 0.5;
                    c.yVel = 0;
                    c.grounded = true;
                }
            }

            const topSpeed = (boost && c.boost > 0) ? 28.0 : 18.5;
            if (boost && c.boost > 0) {
                c.boost = Math.max(0, c.boost - dt * 30);
                c.boostTimeUsed += dt;
                this.particles.emit(c.mesh.position, { x: 0, y: 1, z: 0 }, 0xffb800, 0.45, 0.25, 2, 2);
            } else {
                c.boost = Math.min(100, c.boost + dt * 15);
            }

            const ud = c.mesh.userData;
            if (ud && ud.wheels) {
                ud.wheels.forEach((w) => {
                    w.spinMesh.rotation.x += throttle * topSpeed * dt * 2.3;
                    if (w.isFront) {
                        w.pivot.rotation.y = steer * 0.42;
                    }
                });
                if (ud.nozzleCore) {
                    ud.nozzleCore.scale.setScalar(boost && c.boost > 0 ? 1.35 : 0.9);
                }
            }

            c.yaw += steer * 2.3 * dt;
            const forward = new THREE.Vector3(Math.sin(c.yaw), 0, Math.cos(c.yaw));
            c.mesh.position.addScaledVector(forward, throttle * topSpeed * dt);
            c.mesh.position.x = THREE.MathUtils.clamp(c.mesh.position.x, -this.pitchL + 1.2, this.pitchL - 1.2);
            c.mesh.position.z = THREE.MathUtils.clamp(c.mesh.position.z, -this.pitchW + 1.2, this.pitchW - 1.2);
            c.mesh.rotation.y = c.yaw;

            const toBall = new THREE.Vector3(
                ballPos.x - c.mesh.position.x,
                ballPos.y - c.mesh.position.y,
                ballPos.z - c.mesh.position.z
            );
            const dist = toBall.length();
            if (dist < this.ball.radius + 1.65) {
                if (c.touchCooldown <= 0) {
                    c.touches++;
                    c.touchCooldown = 0.25;
                }
                if (c.team === 'BLUE') this.lastTouchBlue = c;
                else this.lastTouchRed = c;

                toBall.normalize();
                const hitPower = boost ? 26 : 18;
                this.ball.body.velocity.set(toBall.x * hitPower, Math.max(5.5, toBall.y * 12), toBall.z * hitPower);
                this.ball.body.angularVelocity.set(toBall.z * 6, 2.0, -toBall.x * 6);
                this.audio.hit();
                this.particles.emit(this.ball.mesh.position, { x: 0, y: 3, z: 0 }, c.colorHex, 0.5, 0.35, 14, 6);
                this.input.rumble(c.index, 180, 180, 150);
            }
        });

        this.world.step(dt);

        if (Math.abs(ballPos.z) > this.pitchW - this.ball.radius) {
            ballPos.z = Math.sign(ballPos.z) * (this.pitchW - this.ball.radius);
            this.ball.body.velocity.z *= -0.85;
        }

        if (Math.abs(ballPos.x) > this.pitchL - this.ball.radius) {
            if (Math.abs(ballPos.z) < this.goalWidth) {
                let scorer = null;
                let teamLabel = '';
                let teamColor = '#00f0ff';

                if (ballPos.x > 0) {
                    this.scoreBlue++;
                    scorer = this.lastTouchBlue || this.cars.find((c) => c.team === 'BLUE');
                    teamLabel = 'ทีมสีฟ้า (BLUE TEAM)';
                    teamColor = '#00f0ff';
                } else {
                    this.scoreRed++;
                    scorer = this.lastTouchRed || this.cars.find((c) => c.team === 'RED');
                    teamLabel = 'ทีมสีแดง (RED TEAM)';
                    teamColor = '#ff2a6d';
                }

                if (scorer) scorer.goals++;
                const scorerName = scorer ? (scorer.isExtraCpu ? 'บอท CPU' : `ผู้เล่น P${scorer.index + 1}`) : teamLabel;

                // วางลูกบอลให้อยู่กลางตาข่ายประตูเพื่อให้มองเห็นชัดเจน และหยุดแสดงผล 1.0 วินาที
                ballPos.x = Math.sign(ballPos.x) * (this.pitchL + 1.4);
                ballPos.y = Math.max(this.ball.radius, Math.min(4.0, ballPos.y));
                this.ball.body.velocity.set(0, 0, 0);
                this.ball.body.angularVelocity.set(0, 0, 0);
                this.ball.mesh.position.copy(ballPos);

                this.goalFreezeTimer = 1.0;
                this.goalBannerInfo = {
                    teamLabel,
                    scorerName,
                    teamColor
                };

                this.audio.explosion();
                this.graphics.triggerShake(0.85);
                this.particles.explode(this.ball.mesh.position, 0x05ffa1, 95, 16);
                for (let i = 0; i < this.cars.length; i++) this.input.rumble(i, 255, 255, 500);
            } else {
                ballPos.x = Math.sign(ballPos.x) * (this.pitchL - this.ball.radius);
                this.ball.body.velocity.x *= -0.85;
            }
        }

        this.ball.mesh.position.copy(this.ball.body.position);
        this.ball.mesh.quaternion.copy(this.ball.body.quaternion);

        this.updateAllVisibleCamera(dt);

        this.updateHUD();
    }

    updateHUD() {
        const mins = Math.floor(this.matchTimer / 60);
        const secs = String(Math.floor(this.matchTimer % 60)).padStart(2, '0');
        const blueLabel = this.cars.length <= 2 ? 'ทีมสีฟ้า (P1)' : 'ทีมสีฟ้า (P1+P3)';
        const redLabel = this.cars.length <= 2 ? (this.cars[1]?.isExtraCpu ? 'ทีมสีแดง (CPU)' : 'ทีมสีแดง (P2)') : 'ทีมสีแดง (P2+P4)';

        const ranked = this.getRankedCars();
        const rankMap = new Map();
        ranked.forEach((c, idx) => rankMap.set(c.index, idx + 1));

        const carPills = this.cars.map((c) => {
            const pad = this.input.pads[c.index];
            const label = c.isExtraCpu ? 'CPU' : `P${c.index + 1}`;
            const roleTag = (!c.isExtraCpu && pad && pad.connected) ? 'จอย' : 'บอท';
            const rank = rankMap.get(c.index) || 1;
            return `
                <div class="hud-pill" style="border-color:${c.colorCss}">
                    <span class="hud-rank-badge">#${rank}</span>
                    <strong style="color:${c.colorCss}">${label} (${roleTag})</strong>
                    <span>ประตู: ${c.goals}</span>
                    <span>แตะบอล: ${c.touches}</span>
                </div>
            `;
        }).join('');

        // ป้ายแสดงผลขนาดใหญ่เมื่อยิงลูกบอลเข้าโกล (หยุดแสดง 1 วินาที)
        let goalCelebrationHtml = '';
        if (this.goalFreezeTimer > 0 && this.goalBannerInfo) {
            const info = this.goalBannerInfo;
            goalCelebrationHtml = `
                <div style="margin:16vh auto 0;width:fit-content;max-width:92vw;background:rgba(5,10,26,0.94);border:3px solid ${info.teamColor};border-radius:22px;padding:22px 42px;text-align:center;box-shadow:0 0 55px ${info.teamColor}88;">
                    <div style="font-size:2.6rem;font-weight:900;color:#05ffa1;letter-spacing:2px;text-shadow:0 0 20px #05ffa1;">⚽ GOAL!! ลูกเข้าประตู!! ⚽</div>
                    <div style="font-size:1.35rem;font-weight:800;color:${info.teamColor};margin-top:6px;">
                        🏆 ${info.scorerName} ยิงประตูให้ ${info.teamLabel}!
                    </div>
                    <div style="font-size:1.5rem;font-weight:900;color:#ffffff;margin-top:8px;">
                        สกอร์ปัจจุบัน: <span style="color:#00f0ff">ทีมสีฟ้า ${this.scoreBlue}</span> — <span style="color:#ff2a6d">${this.scoreRed} ทีมสีแดง</span>
                    </div>
                </div>
            `;
        }

        let summaryHtml = '';
        if (this.winnerText || this.showSummary) {
            const rows = ranked.map((c, idx) => {
                const pad = this.input.pads[c.index];
                const label = c.isExtraCpu ? 'บอท CPU' : `ผู้เล่น P${c.index + 1}`;
                const roleTag = (!c.isExtraCpu && pad && pad.connected) ? 'จอยสติ๊ก' : 'บอท AI';
                const teamName = c.team === 'BLUE' ? `ทีมสีฟ้า (${this.scoreBlue})` : `ทีมสีแดง (${this.scoreRed})`;
                return {
                    rank: idx + 1,
                    playerLabel: label,
                    roleTag,
                    colorCss: c.colorCss,
                    stats: [
                        teamName,
                        `${c.goals} ประตู`,
                        `${c.touches} ครั้ง`,
                        `${c.boostTimeUsed.toFixed(1)} วินาที`
                    ]
                };
            });

            summaryHtml = this.buildSummaryTableHTML({
                title: this.winnerText || `ตารางอันดับและสถิติร็อกเก็ตซอคเกอร์`,
                subtitle: `ผลสกอร์รวม: ทีมสีฟ้า ${this.scoreBlue} - ${this.scoreRed} ทีมสีแดง`,
                columns: ['สังกัดทีม (สกอร์)', 'ประตูที่ยิงได้', 'สัมผัสบอล', 'เวลาใช้เทอร์โบบูสต์'],
                rows
            });
        }

        this.setHUD(`
            <div class="hud-top-row">
                <div class="hud-pill" style="border-color:#00f0ff"><strong style="color:#00f0ff">${blueLabel}</strong> <span>${this.scoreBlue} ประตู</span></div>
                <div class="hud-timer">⏱ เวลา ${mins}:${secs}</div>
                <div class="hud-pill" style="border-color:#ff2a6d"><strong style="color:#ff2a6d">${redLabel}</strong> <span>${this.scoreRed} ประตู</span></div>
                ${carPills}
            </div>
            ${goalCelebrationHtml}
            ${summaryHtml}
        `);
    }
}
