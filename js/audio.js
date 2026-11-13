/**
 * Procedural WebAudio Synthesizer for UI, Weapons, Engines, Explosions & Ambient Music
 */
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.muted = false;
        this.ambientOsc = null;
        this.engineRunning = false;
        this.engineOsc = null;
        this.engineSubOsc = null;
        this.engineFilter = null;
        this.engineGain = null;
    }

    init() {
        if (this.ctx) {
            if (this.ctx.state === 'suspended') this.ctx.resume();
            return;
        }
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.35;
        this.masterGain.connect(this.ctx.destination);
    }

    playTone(freq = 440, duration = 0.1, type = 'sine', vol = 0.4, slideTo = null) {
        this.init();
        if (!this.ctx || this.muted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        if (slideTo !== null) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
        }
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + duration);
    }

    uiMove() {
        this.playTone(520, 0.06, 'triangle', 0.25, 680);
    }

    uiConfirm() {
        this.playTone(587.33, 0.08, 'sine', 0.35, 880);
        setTimeout(() => this.playTone(880, 0.14, 'triangle', 0.35, 1174.66), 55);
    }

    uiBack() {
        this.playTone(480, 0.1, 'sine', 0.3, 260);
    }

    laser(pitch = 900) {
        this.playTone(pitch, 0.11, 'sawtooth', 0.22, 180);
    }

    boost() {
        this.playTone(140, 0.28, 'sawtooth', 0.28, 520);
    }

    jump() {
        this.playTone(240, 0.16, 'sine', 0.32, 620);
    }

    hit() {
        this.playTone(160, 0.12, 'square', 0.35, 55);
    }

    powerup() {
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
            setTimeout(() => this.playTone(f, 0.1, 'triangle', 0.28), i * 45);
        });
    }

    explosion() {
        this.init();
        if (!this.ctx || this.muted) return;
        const duration = 0.45;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.28));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(620, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + duration);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.65, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        noise.start();
    }

    startEngine() {
        this.init();
        if (!this.ctx || this.engineRunning) return;
        const now = this.ctx.currentTime;

        this.engineOsc = this.ctx.createOscillator();
        this.engineOsc.type = 'sawtooth';
        this.engineOsc.frequency.setValueAtTime(65, now);

        this.engineSubOsc = this.ctx.createOscillator();
        this.engineSubOsc.type = 'triangle';
        this.engineSubOsc.frequency.setValueAtTime(32.5, now);

        this.engineFilter = this.ctx.createBiquadFilter();
        this.engineFilter.type = 'lowpass';
        this.engineFilter.frequency.setValueAtTime(260, now);
        this.engineFilter.Q.setValueAtTime(3.2, now);

        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.setValueAtTime(0.001, now);

        this.engineOsc.connect(this.engineFilter);
        this.engineSubOsc.connect(this.engineFilter);
        this.engineFilter.connect(this.engineGain);
        this.engineGain.connect(this.masterGain);

        this.engineOsc.start(now);
        this.engineSubOsc.start(now);
        this.engineRunning = true;
    }

    updateEngine(speedRatio = 0, isBoosting = false, isDrifting = false) {
        if (this.muted) {
            if (this.engineGain && this.ctx) {
                this.engineGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05);
            }
            return;
        }
        if (!this.engineRunning) {
            this.startEngine();
        }
        if (!this.ctx || !this.engineRunning) return;

        const now = this.ctx.currentTime;
        const clamped = Math.max(0, Math.min(1.5, speedRatio));
        const baseFreq = 64 + clamped * 140 + (isBoosting ? 58 : 0);
        const cutoff = 240 + clamped * 1200 + (isBoosting ? 800 : 0) + (isDrifting ? 380 : 0);
        const vol = clamped < 0.03 ? 0.045 : (0.11 + Math.min(0.14, clamped * 0.1) + (isBoosting ? 0.065 : 0));

        this.engineOsc.frequency.setTargetAtTime(baseFreq, now, 0.045);
        this.engineSubOsc.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.045);
        this.engineFilter.frequency.setTargetAtTime(cutoff, now, 0.05);
        this.engineGain.gain.setTargetAtTime(vol, now, 0.05);
    }

    stopEngine() {
        if (!this.engineRunning) return;
        try {
            if (this.ctx && this.engineGain) {
                const now = this.ctx.currentTime;
                this.engineGain.gain.setTargetAtTime(0.0001, now, 0.03);
            }
            const osc1 = this.engineOsc;
            const osc2 = this.engineSubOsc;
            setTimeout(() => {
                try { osc1 && osc1.stop(); osc1 && osc1.disconnect(); } catch (_) {}
                try { osc2 && osc2.stop(); osc2 && osc2.disconnect(); } catch (_) {}
            }, 80);
        } catch (_) {}
        this.engineRunning = false;
        this.engineOsc = null;
        this.engineSubOsc = null;
        this.engineFilter = null;
        this.engineGain = null;
    }

    overtake() {
        this.init();
        if (!this.ctx || this.muted) return;
        // Fast turbo whoosh + exciting overtake chime
        this.playTone(180, 0.22, 'sawtooth', 0.22, 680);
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
            setTimeout(() => this.playTone(f, 0.09, 'triangle', 0.28, f * 1.08), i * 38);
        });
    }

    countdownBeep(isGo = false) {
        this.init();
        if (!this.ctx || this.muted) return;
        if (isGo) {
            this.playTone(880, 0.36, 'triangle', 0.4, 1174.66);
            setTimeout(() => this.playTone(1174.66, 0.38, 'sine', 0.36), 45);
        } else {
            this.playTone(440, 0.18, 'triangle', 0.32);
        }
    }

    lapComplete(isFinal = false) {
        this.init();
        if (!this.ctx || this.muted) return;
        const notes = isFinal
            ? [659.25, 880, 1174.66, 1318.51]
            : [523.25, 659.25, 880];
        notes.forEach((f, i) => {
            setTimeout(() => this.playTone(f, 0.14, 'triangle', 0.32), i * 65);
        });
    }

    stopVictoryMusic() {
        if (this.victoryTimers && this.victoryTimers.length) {
            this.victoryTimers.forEach((id) => clearTimeout(id));
        }
        this.victoryTimers = [];
    }

    stopBGM() {
        if (this.bgmInterval) {
            clearInterval(this.bgmInterval);
            this.bgmInterval = null;
        }
        this.bgmStep = 0;
    }

    startSoccerBGM() {
        this.init();
        this.stopBGM();
        this.bgmStep = 0;

        // ดนตรีประกอบสนามกีฬาอิเล็กทรอนิกส์ 138 BPM (16-step loop x 4 คอร์ด: Am - F - C - G)
        const chordRoots = [110.0, 87.31, 130.81, 98.0]; // A2, F2, C3, G2
        const arpOffsets = [2, 3, 4, 6, 4, 3, 4, 5]; // ตัวคูณความถี่อาร์เพจจิโอ

        this.bgmInterval = setInterval(() => {
            if (!this.ctx || this.muted || this.ctx.state !== 'running') return;
            const step = this.bgmStep % 64;
            const bar = Math.floor(step / 16);
            const beatStep = step % 16;
            const root = chordRoots[bar];

            // กลอง Kick จังหวะหนักแน่น (ทุก 4 steps)
            if (beatStep % 4 === 0) {
                this.playTone(95, 0.11, 'sine', 0.24, 36);
            }
            // Hi-hat / Percussion จังหวะยกให้เร้าใจ
            if (beatStep % 2 === 1) {
                this.playTone(5400, 0.025, 'triangle', 0.045, 2800);
            }
            // Snare / Clap บนจังหวะ 4 และ 12
            if (beatStep === 4 || beatStep === 12) {
                this.playTone(210, 0.08, 'sawtooth', 0.11, 110);
            }
            // เบสไลน์ซินธ์ขับเคลื่อนจังหวะ
            if (beatStep % 2 === 0) {
                const bassFreq = (beatStep % 4 === 2) ? root * 1.5 : root;
                this.playTone(bassFreq, 0.095, 'sawtooth', 0.10, bassFreq * 0.96);
            }
            // เมโลดี้อาร์เพจจิโอเพิ่มความตื่นเต้น
            if (beatStep % 2 === 0 || beatStep === 7 || beatStep === 15) {
                const mult = arpOffsets[Math.floor(beatStep / 2) % arpOffsets.length];
                this.playTone(root * mult, 0.085, 'triangle', 0.085);
            }

            this.bgmStep++;
        }, 108);
    }

    victoryFanfare() {
        this.init();
        if (!this.ctx || this.muted) return;
        this.stopVictoryMusic();
        this.victoryTimers = [];

        // เพลงแห่งชัยชนะ (Victory Anthem): ทำนองหลัก + เบส + คอร์ดฉลองแชมป์ ~7 วินาที
        const melody = [
            // Fanfare Intro (0 - 1.2s)
            [523.25, 0, 0.16, 'triangle', 0.36],
            [659.25, 130, 0.16, 'triangle', 0.36],
            [783.99, 260, 0.16, 'triangle', 0.38],
            [1046.50, 400, 0.42, 'sawtooth', 0.28],
            [783.99, 860, 0.16, 'triangle', 0.34],
            [1046.50, 1020, 0.52, 'triangle', 0.42],

            // Celebratory Chorus A (1.65s - 4.0s)
            [880.00, 1650, 0.20, 'triangle', 0.36],
            [987.77, 1870, 0.20, 'triangle', 0.36],
            [1046.50, 2090, 0.34, 'triangle', 0.40],
            [783.99, 2460, 0.20, 'triangle', 0.34],
            [880.00, 2680, 0.20, 'triangle', 0.36],
            [1046.50, 2900, 0.22, 'triangle', 0.38],
            [1174.66, 3140, 0.22, 'triangle', 0.40],
            [1318.51, 3380, 0.55, 'sawtooth', 0.28],

            // Triumphant Finale B (4.1s - 6.8s)
            [1046.50, 4100, 0.18, 'triangle', 0.36],
            [1174.66, 4300, 0.18, 'triangle', 0.36],
            [1318.51, 4500, 0.24, 'triangle', 0.40],
            [1567.98, 4780, 0.42, 'triangle', 0.42],
            [1318.51, 5240, 0.18, 'triangle', 0.36],
            [1567.98, 5460, 0.85, 'triangle', 0.45],
            [2093.00, 5460, 0.85, 'sine', 0.24]
        ];

        const bass = [
            [130.81, 0, 0.36], [196.00, 400, 0.36], [130.81, 1020, 0.45],
            [174.61, 1650, 0.38], [130.81, 2090, 0.38], [196.00, 2680, 0.38], [130.81, 3380, 0.50],
            [174.61, 4100, 0.36], [196.00, 4500, 0.36], [130.81, 5460, 0.85]
        ];

        melody.forEach(([freq, delay, dur, type, vol]) => {
            const id = setTimeout(() => {
                if (!this.muted) this.playTone(freq, dur, type, vol);
            }, delay);
            this.victoryTimers.push(id);
        });

        bass.forEach(([freq, delay, dur]) => {
            const id = setTimeout(() => {
                if (!this.muted) this.playTone(freq, dur, 'sine', 0.26);
            }, delay);
            this.victoryTimers.push(id);
        });
    }
}

export const AudioFX = new SoundEngine();
