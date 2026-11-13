/**
 * Graphics Pipeline, Post-Processing (UnrealBloom, Vignette/MotionBlur, ACES ToneMapping),
 * Procedural HDR Environment Map, Dynamic Resolution Scaler, and GPU Particle System
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Config } from './config.js';

const CinematicVignetteBlurShader = {
    uniforms: {
        tDiffuse: { value: null },
        uVignette: { value: 0.38 },
        uBoostBlur: { value: 0.0 },
        uChromatic: { value: 0.0018 }
    },
    vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse;
        uniform float uVignette;
        uniform float uBoostBlur;
        uniform float uChromatic;
        varying vec2 vUv;

        void main() {
            vec2 center = vec2(0.5, 0.5);
            vec2 dir = vUv - center;
            float dist = length(dir);

            // Radial motion blur on boost + subtle chromatic aberration
            vec3 col = vec3(0.0);
            const int SAMPLES = 6;
            for (int i = 0; i < SAMPLES; i++) {
                float scale = 1.0 - uBoostBlur * 0.12 * (float(i) / float(SAMPLES)) * dist;
                vec2 sampleUv = center + dir * scale;
                float r = texture2D(tDiffuse, sampleUv + dir * uChromatic).r;
                float g = texture2D(tDiffuse, sampleUv).g;
                float b = texture2D(tDiffuse, sampleUv - dir * uChromatic).b;
                col += vec3(r, g, b);
            }
            col /= float(SAMPLES);

            // Smooth vignette
            float vig = smoothstep(0.85, 0.25, dist * uVignette * 2.1);
            col *= mix(1.0 - uVignette, 1.0, vig);

            gl_FragColor = vec4(col, 1.0);
        }
    `
};

export class GraphicsManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            powerPreference: 'high-performance'
        });

        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.15;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Generate procedural PBR environment map via PMREMGenerator + RoomEnvironment
        const pmrem = new THREE.PMREMGenerator(this.renderer);
        pmrem.compileEquirectangularShader();
        this.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        pmrem.dispose();

        this.pixelRatio = 1.0;
        this.fpsHistory = [];
        this.currentFps = 60;
        this.shakeIntensity = 0;
        this.boostBlurAmount = 0;

        this.composer = null;
        this.renderPass = null;
        this.bloomPass = null;
        this.cinematicPass = null;

        this.applyQualityPreset(Config.graphics.preset);
        window.addEventListener('resize', () => this.onResize());
    }

    setupComposer(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        scene.environment = this.envMap;

        const w = window.innerWidth;
        const h = window.innerHeight;

        if (this.composer) {
            this.composer.dispose();
        }

        this.composer = new EffectComposer(this.renderer);
        this.renderPass = new RenderPass(scene, camera);
        this.composer.addPass(this.renderPass);

        this.bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.42, 0.25, 0.88);
        this.composer.addPass(this.bloomPass);

        this.cinematicPass = new ShaderPass(CinematicVignetteBlurShader);
        this.composer.addPass(this.cinematicPass);

        const outputPass = new OutputPass();
        this.composer.addPass(outputPass);

        this.applyQualityPreset(Config.graphics.preset);
        this.onResize();
    }

    applyQualityPreset(presetName) {
        Config.graphics.preset = presetName;
        const p = Config.graphics.presets[presetName] || Config.graphics.presets.High;

        this.renderer.shadowMap.enabled = p.shadows;
        this.pixelRatio = Math.min(window.devicePixelRatio || 1, p.pixelRatioCap);
        this.renderer.setPixelRatio(this.pixelRatio);

        if (this.bloomPass) {
            this.bloomPass.enabled = p.bloom;
        }
        this.onResize();
    }

    onResize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.renderer.setSize(w, h);
        if (this.composer) {
            this.composer.setSize(w, h);
        }
        if (this.camera && this.camera.isPerspectiveCamera) {
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
        }
    }

    triggerShake(amount = 0.35) {
        this.shakeIntensity = Math.min(1.2, this.shakeIntensity + amount);
    }

    setBoostBlur(amount = 0.0) {
        this.boostBlurAmount = THREE.MathUtils.lerp(this.boostBlurAmount, amount, 0.15);
        if (this.cinematicPass) {
            this.cinematicPass.uniforms.uBoostBlur.value = this.boostBlurAmount;
        }
    }

    updateDynamicResolution(dt) {
        if (dt <= 0) return;
        const instFps = 1 / dt;
        this.fpsHistory.push(instFps);
        if (this.fpsHistory.length > 30) this.fpsHistory.shift();

        const avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
        this.currentFps = Math.round(avgFps);

        if (!Config.graphics.dynamicResolution || this.fpsHistory.length < 30) return;

        const presetCap = Config.graphics.presets[Config.graphics.preset].pixelRatioCap;
        if (avgFps < 48 && this.pixelRatio > Config.graphics.minPixelRatio) {
            this.pixelRatio = Math.max(Config.graphics.minPixelRatio, this.pixelRatio - 0.1);
            this.renderer.setPixelRatio(this.pixelRatio);
            this.fpsHistory.length = 0;
        } else if (avgFps > 58 && this.pixelRatio < presetCap) {
            this.pixelRatio = Math.min(presetCap, this.pixelRatio + 0.05);
            this.renderer.setPixelRatio(this.pixelRatio);
            this.fpsHistory.length = 0;
        }
    }

    render(scene, camera, useComposer = true) {
        // Apply decaying camera shake offset
        let shakeOffset = null;
        if (this.shakeIntensity > 0.005 && camera) {
            shakeOffset = new THREE.Vector3(
                (Math.random() - 0.5) * this.shakeIntensity,
                (Math.random() - 0.5) * this.shakeIntensity,
                (Math.random() - 0.5) * this.shakeIntensity
            );
            camera.position.add(shakeOffset);
            this.shakeIntensity *= 0.88;
        } else {
            this.shakeIntensity = 0;
        }

        if (useComposer && this.composer) {
            this.renderPass.scene = scene;
            this.renderPass.camera = camera;
            this.composer.render();
        } else {
            this.renderer.render(scene, camera);
        }

        if (shakeOffset && camera) {
            camera.position.sub(shakeOffset);
        }
    }
}

/**
 * High-Performance GPU Point-Cloud Particle System
 * Supports explosions, drift sparks, boost trails, and muzzle flashes
 */
export class GPUParticleSystem {
    constructor(scene, maxParticles = 1800) {
        this.scene = scene;
        const scale = Config.graphics.presets[Config.graphics.preset].particles || 1.0;
        this.maxParticles = Math.floor(maxParticles * scale);
        this.cursor = 0;

        this.positions = new Float32Array(this.maxParticles * 3);
        this.velocities = new Float32Array(this.maxParticles * 3);
        this.colors = new Float32Array(this.maxParticles * 3);
        this.sizes = new Float32Array(this.maxParticles);
        this.lifetimes = new Float32Array(this.maxParticles);
        this.maxLifetimes = new Float32Array(this.maxParticles);

        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
        this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

        this.material = new THREE.PointsMaterial({
            size: 0.42,
            vertexColors: true,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.points = new THREE.Points(this.geometry, this.material);
        this.points.frustumCulled = false;
        this.scene.add(this.points);
    }

    emit(pos, vel, colorHex = 0x00f0ff, size = 0.4, life = 0.6, count = 1, spread = 1.5) {
        const c = new THREE.Color(colorHex);
        for (let n = 0; n < count; n++) {
            const idx = this.cursor;
            this.cursor = (this.cursor + 1) % this.maxParticles;

            const i3 = idx * 3;
            this.positions[i3]     = pos.x + (Math.random() - 0.5) * 0.25;
            this.positions[i3 + 1] = pos.y + (Math.random() - 0.5) * 0.25;
            this.positions[i3 + 2] = pos.z + (Math.random() - 0.5) * 0.25;

            this.velocities[i3]     = vel.x + (Math.random() - 0.5) * spread;
            this.velocities[i3 + 1] = vel.y + (Math.random() - 0.5) * spread;
            this.velocities[i3 + 2] = vel.z + (Math.random() - 0.5) * spread;

            this.colors[i3]     = c.r;
            this.colors[i3 + 1] = c.g;
            this.colors[i3 + 2] = c.b;

            this.sizes[idx] = size;
            this.lifetimes[idx] = life;
            this.maxLifetimes[idx] = life;
        }
    }

    explode(pos, colorHex = 0xff6600, count = 45, speed = 9.0) {
        this.emit(pos, { x: 0, y: 2.0, z: 0 }, colorHex, 0.55, 0.75, count, speed);
    }

    update(dt) {
        for (let i = 0; i < this.maxParticles; i++) {
            if (this.lifetimes[i] > 0) {
                this.lifetimes[i] -= dt;
                const i3 = i * 3;
                this.positions[i3]     += this.velocities[i3] * dt;
                this.positions[i3 + 1] += this.velocities[i3 + 1] * dt;
                this.positions[i3 + 2] += this.velocities[i3 + 2] * dt;
                this.velocities[i3 + 1] -= 3.8 * dt; // subtle gravity

                const ratio = Math.max(0, this.lifetimes[i] / this.maxLifetimes[i]);
                this.colors[i3]     *= (0.96 + 0.04 * ratio);
                this.colors[i3 + 1] *= (0.96 + 0.04 * ratio);
                this.colors[i3 + 2] *= (0.96 + 0.04 * ratio);

                if (this.lifetimes[i] <= 0) {
                    this.positions[i3 + 1] = -9999; // hide dead particle
                }
            }
        }
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;
    }

    dispose() {
        this.scene.remove(this.points);
        this.geometry.dispose();
        this.material.dispose();
    }
}
