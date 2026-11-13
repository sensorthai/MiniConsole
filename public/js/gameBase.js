/**
 * Shared Base Class for All 5 Console Games
 * Enforces a clean lifecycle: init(), update(dt), render(), pause(), dispose()
 * Uses a fixed-timestep accumulator (60 Hz) to guarantee deterministic physics
 * and recursively frees all geometries, materials, and textures on game switch.
 */
import * as THREE from 'three';
import { GPUParticleSystem } from './graphics.js';

export class GameBase {
    constructor(app, meta) {
        this.app = app;
        this.meta = meta;
        this.input = app.input;
        this.graphics = app.graphics;
        this.audio = app.audio;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x070913);
        this.scene.fog = new THREE.FogExp2(0x070913, 0.012);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 350);
        this.camera.position.set(0, 18, 24);
        this.camera.lookAt(0, 0, 0);

        this.particles = new GPUParticleSystem(this.scene, 2000);
        this.paused = false;
        this.fixedStep = 1 / 60;
        this.accumulator = 0;
        this.elapsed = 0;
    }

    init() {
        this.graphics.setupComposer(this.scene, this.camera);
        this.setupStandardLighting();
    }

    setupStandardLighting() {
        const hemi = new THREE.HemisphereLight(0x88bbff, 0x111122, 0.85);
        this.scene.add(hemi);

        const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
        dirLight.position.set(28, 45, 25);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 1;
        dirLight.shadow.camera.far = 140;
        const d = 45;
        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;
        dirLight.shadow.bias = -0.0005;
        this.scene.add(dirLight);
        this.dirLight = dirLight;
    }

    update(dt) {
        if (this.paused) return;
        const clampedDt = Math.min(dt, 0.1);
        this.accumulator += clampedDt;
        while (this.accumulator >= this.fixedStep) {
            this.fixedUpdate(this.fixedStep);
            this.elapsed += this.fixedStep;
            this.accumulator -= this.fixedStep;
        }
        this.particles.update(clampedDt);
    }

    fixedUpdate(dt) {
        // Overridden by subclasses
    }

    render() {
        this.graphics.render(this.scene, this.camera, true);
    }

    pause(state) {
        this.paused = state !== undefined ? state : !this.paused;
    }

    setHUD(html) {
        this.app.setGameHUD(html);
    }

    /**
     * สร้าง HTML ตารางสรุปผลการแข่งขัน สถิติของผู้เข้าแข่งขัน และอันดับที่ได้ (ใช้ร่วมกันทั้ง 5 เกม)
     * @param {Object} opts
     * @param {string} opts.title - หัวข้อสรุปผล (เช่น "ผู้เล่น P1 ชนะเลิศ!")
     * @param {string} opts.subtitle - รายละเอียดรอง
     * @param {string[]} opts.columns - ชื่อคอลัมน์สถิติ
     * @param {Array<{rank:number, playerLabel:string, roleTag:string, colorCss:string, stats:Array<string|number>, highlight?:boolean}>} opts.rows
     */
    buildSummaryTableHTML({ title, subtitle = '', columns = [], rows = [] }) {
        const medals = ['🥇 อันดับ 1', '🥈 อันดับ 2', '🥉 อันดับ 3', '🏅 อันดับ 4'];
        const thHtml = ['อันดับ', 'ผู้เข้าแข่งขัน', ...columns]
            .map((c) => `<th>${c}</th>`)
            .join('');

        const trHtml = rows.map((r, idx) => {
            const rankBadge = medals[idx] || `อันดับ ${r.rank || idx + 1}`;
            const rowClass = idx === 0 ? 'summary-row winner-row' : 'summary-row';
            const statCells = (r.stats || []).map((s) => `<td>${s}</td>`).join('');
            return `
                <tr class="${rowClass}">
                    <td class="rank-cell"><span class="rank-pill rank-${idx + 1}">${rankBadge}</span></td>
                    <td class="player-cell">
                        <span class="p-dot" style="background:${r.colorCss};display:inline-block;margin-right:8px;"></span>
                        <strong style="color:${r.colorCss}">${r.playerLabel}</strong>
                        <small class="role-badge">${r.roleTag}</small>
                    </td>
                    ${statCells}
                </tr>
            `;
        }).join('');

        return `
            <div class="summary-overlay-card">
                <div class="summary-header">
                    <div class="summary-game-tag">${this.meta ? `${this.meta.titleTh} (${this.meta.title})` : 'สรุปผลการแข่งขัน'}</div>
                    <h2 class="summary-title">🏆 ${title}</h2>
                    ${subtitle ? `<p class="summary-subtitle">${subtitle}</p>` : ''}
                </div>
                <div class="summary-table-wrap">
                    <table class="summary-table">
                        <thead>
                            <tr>${thHtml}</tr>
                        </thead>
                        <tbody>
                            ${trHtml}
                        </tbody>
                    </table>
                </div>
                <div class="summary-actions">
                    <button class="btn-primary" onclick="window.miniConsole && window.miniConsole.launchSelectedGame()">🔄 เล่นอีกครั้ง (Enter)</button>
                    <button onclick="window.miniConsole && window.miniConsole.returnToHomeMenu()">🏠 กลับหน้าเลือกเกม (ESC)</button>
                </div>
            </div>
        `;
    }

    dispose() {
        if (this.particles) {
            this.particles.dispose();
        }
        this.scene.traverse((obj) => {
            if (obj.geometry) {
                obj.geometry.dispose();
            }
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach((m) => this.disposeMaterial(m));
                } else {
                    this.disposeMaterial(obj.material);
                }
            }
        });
        this.scene.clear();
    }

    disposeMaterial(mat) {
        if (!mat) return;
        for (const key of Object.keys(mat)) {
            const val = mat[key];
            if (val && typeof val === 'object' && 'isTexture' in val) {
                val.dispose();
            }
        }
        mat.dispose();
    }
}
