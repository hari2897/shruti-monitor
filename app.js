// Shruti Monitor - Core Logic

// DOM Elements
const canvas = document.getElementById('pitchCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
const startButton = document.getElementById('startButton');
const saFreqInput = document.getElementById('saFreq');
const smoothingInput = document.getElementById('smoothing');
const zoomInput = document.getElementById('zoom');
const pitchDisplay = document.getElementById('pitchDisplay');
const swaraDisplay = document.getElementById('swaraDisplay');
const deviationDisplay = document.getElementById('deviationDisplay');
const yAxisLabels = document.getElementById('yAxisLabels');

const systemSelect = document.getElementById('systemSelect');
const ragaSearch = document.getElementById('ragaSearch');
const ragaSelect = document.getElementById('ragaSelect');
const tanpuraToggle = document.getElementById('tanpuraToggle');
const tanpuraString = document.getElementById('tanpuraString');
const recordButton = document.getElementById('recordButton');
const playButton = document.getElementById('playButton');
const playbackAudio = document.getElementById('playbackAudio');
const shrutiPettiButtons = document.getElementById('shrutiPettiButtons');

// Audio Context & Nodes
let audioContext;
let analyser;
let micStream;
let dataArray;
let isRecording = false;
let useWorklet = false; // true if AudioWorklet is active
let pitchWorkletNode = null;
let workletDetection = { pitch: -1, confidence: 0 }; // Latest result from worklet

// Visualization & State
let animationId;
const pitchHistory = []; // stores { pitch, time }
let smoothedPitch = null;
let silenceTimer = 0; // ms since last voiced detection
let canvasWidth, canvasHeight;

// Maximum time window visible on screen (ms)
const TIME_WINDOW_MS = 5000;

// Tanpura State
let isTanpuraPlaying = false;

// Shruti Petti State
let shrutiPettiOsc = null;
let shrutiPettiGain = null;
let activeSwaraBtn = null;

// Just Intonation Ratios for ICM Swaras
const SWARAS = [
    { name: "S",  fullName: "Sa",           ratio: 1/1 },
    { name: "r",  fullName: "Komal Re",     ratio: 16/15 },
    { name: "R",  fullName: "Shuddh Re",    ratio: 9/8 },
    { name: "g",  fullName: "Komal Ga",     ratio: 6/5 },
    { name: "G",  fullName: "Shuddh Ga",    ratio: 5/4 },
    { name: "m",  fullName: "Shuddh Ma",    ratio: 4/3 },
    { name: "M",  fullName: "Tivra Ma",     ratio: 45/32 },
    { name: "P",  fullName: "Pa",           ratio: 3/2 },
    { name: "d",  fullName: "Komal Dha",    ratio: 8/5 },
    { name: "D",  fullName: "Shuddh Dha",   ratio: 5/3 },
    { name: "n",  fullName: "Komal Ni",     ratio: 9/5 },
    { name: "N",  fullName: "Shuddh Ni",    ratio: 15/8 },
    { name: "S'", fullName: "Taar Sa",      ratio: 2/1 }
];

// Raga Definitions
const RAGAS = {
    hindustani: {
        "Yaman": ["S", "R", "G", "M", "P", "D", "N"],
        "Bhairavi": ["S", "r", "g", "m", "P", "d", "n"],
        "Bhairav": ["S", "r", "G", "m", "P", "d", "N"],
        "Malkauns": ["S", "g", "m", "d", "n"],
        "Bhoopali": ["S", "R", "G", "P", "D"],
        "Durga": ["S", "R", "m", "P", "D"],
        "Desh": ["S", "R", "m", "P", "N", "n"],
        "Bageshree": ["S", "R", "g", "m", "D", "n"]
    },
    carnatic: window.CARNATIC_RAGAS || {}
};

let currentRagaLayout = null; // Arrays of valid swara names

// Graph Y-axis logic
// We use a logarithmic scale based on Just Intonation ratios.
// Y range covers from slightly below Lower Sa to slightly above Higher Sa.
// Math.log2(0.5) = -1 (Lower Sa), Math.log2(2) = 1 (Higher Sa).
// A range of -1.2 to 1.2 provides ~2.4 octaves of pure visual tracking with Sa at 0 (exact center).
let MIN_RATIO_LOG2 = -1.2; 
let MAX_RATIO_LOG2 = 1.2; 

// Adjust canvas resolution handling DPI
function resizeCanvas() {
    canvasWidth = window.innerWidth;
    const topBar = document.querySelector('.top-bar');
    const toolbar = document.querySelector('.toolbar');
    const shrutiBar = document.getElementById('shrutiPettiBar');
    const keyboardSec = document.getElementById('keyboardSection');
    const usedHeight = (topBar ? topBar.offsetHeight : 0) 
                     + (toolbar ? toolbar.offsetHeight : 0) 
                     + (shrutiBar ? shrutiBar.offsetHeight : 0)
                     + (keyboardSec ? keyboardSec.offsetHeight : 0);
    canvasHeight = window.innerHeight - usedHeight;
    
    // Handle High DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    ctx.scale(dpr, dpr);
    
    drawGrid(); // Redraw static grid labels
}

window.addEventListener('resize', resizeCanvas);

// Pitch mapping function (Ratio to Y coordinate)
function ratioToY(ratio) {
    const val = Math.log2(ratio);
    // Map between MIN_RATIO_LOG2 (bottom) and MAX_RATIO_LOG2 (top)
    const normalized = (val - MIN_RATIO_LOG2) / (MAX_RATIO_LOG2 - MIN_RATIO_LOG2);
    // Invert because Canvas Y is 0 at top
    return canvasHeight - (normalized * canvasHeight);
}

// Generate Y-axis Labels
function generateLabels() {
    yAxisLabels.innerHTML = '';
    
    // Plot Lower Octave Swaras
    SWARAS.forEach(swara => {
        const ratio = swara.ratio / 2; // Lower Octave
        if (Math.log2(ratio) >= MIN_RATIO_LOG2) {
            createLabel(swara.name + '.', ratioToY(ratio), swara.name);
        }
    });

    // Plot Middle Octave Swaras
    SWARAS.forEach(swara => {
        createLabel(swara.name, ratioToY(swara.ratio), swara.name, swara.name === "S");
    });

    // Plot Upper Octave Swaras
    SWARAS.forEach(swara => {
        const ratio = swara.ratio * 2; // Upper octave
        if (Math.log2(ratio) <= MAX_RATIO_LOG2 && swara.name !== "S'") { 
            createLabel(swara.name + "'", ratioToY(ratio), swara.name);
        }
    });
}

function createLabel(displayName, yPos, baseName, isSa = false) {
    // Check if Swara is valid in current Raga
    const isValid = currentRagaLayout === null || currentRagaLayout.includes(baseName);
    
    if (yPos >= 0 && yPos <= canvasHeight) {
        const span = document.createElement('span');
        let className = 'swara-label';
        if (isSa) className += ' is-sa';
        if (!isValid) className += ' varjit';
        
        span.className = className;
        span.textContent = displayName;
        span.style.top = `${yPos}px`;
        yAxisLabels.appendChild(span);
    }
}

// ═══ McLeod Pitch Method (NSDF-based) ═══
// Normalized Squared Difference Function eliminates octave errors
// by normalizing the autocorrelation at each lag.
// Returns { pitch, confidence } or { pitch: -1, confidence: 0 }

const MPM_KEY_THRESHOLD = 0.93; // First peak above 93% of max NSDF
const MPM_RMS_THRESHOLD = 0.008; // Minimum signal level
let lastRawPitches = []; // Median filter buffer (last 3 detections)

function detectPitchMPM(buf, sampleRate) {
    const SIZE = buf.length;
    
    // 1. RMS gate — skip silence
    let rms = 0;
    for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / SIZE);
    if (rms < MPM_RMS_THRESHOLD) return { pitch: -1, confidence: 0 };
    
    // 2. Compute NSDF: nsdf(τ) = 2*r(τ) / m(τ)
    // where r(τ) = autocorrelation, m(τ) = energy normalization
    const maxLag = Math.floor(SIZE / 2);
    const nsdf = new Float32Array(maxLag);
    
    for (let tau = 0; tau < maxLag; tau++) {
        let acf = 0; // autocorrelation
        let m = 0;   // normalization (sum of squared energies)
        for (let j = 0; j < maxLag - tau; j++) {
            acf += buf[j] * buf[j + tau];
            m += buf[j] * buf[j] + buf[j + tau] * buf[j + tau];
        }
        nsdf[tau] = m > 0 ? (2 * acf) / m : 0;
    }
    
    // 3. Find positive-going zero crossings and peaks
    // Skip the initial monotonic decrease from lag=0
    let firstZeroCrossing = 1;
    while (firstZeroCrossing < maxLag - 1 && nsdf[firstZeroCrossing] > 0) {
        firstZeroCrossing++;
    }
    
    // 4. Collect all peaks after the first zero crossing
    const peaks = []; // { index, value }
    for (let i = firstZeroCrossing + 1; i < maxLag - 1; i++) {
        if (nsdf[i] > nsdf[i - 1] && nsdf[i] >= nsdf[i + 1] && nsdf[i] > 0) {
            peaks.push({ index: i, value: nsdf[i] });
        }
    }
    
    if (peaks.length === 0) return { pitch: -1, confidence: 0 };
    
    // 5. Key threshold selection: find max NSDF peak value,
    //    then select the FIRST peak above threshold × max
    const maxPeakValue = Math.max(...peaks.map(p => p.value));
    const threshold = MPM_KEY_THRESHOLD * maxPeakValue;
    
    let selectedPeak = peaks[peaks.length - 1]; // fallback to last
    for (const peak of peaks) {
        if (peak.value >= threshold) {
            selectedPeak = peak;
            break; // First peak above threshold — avoids octave errors
        }
    }
    
    // 6. Parabolic interpolation around the selected peak
    let T0 = selectedPeak.index;
    if (T0 > 0 && T0 < maxLag - 1) {
        const x1 = nsdf[T0 - 1], x2 = nsdf[T0], x3 = nsdf[T0 + 1];
        const a = (x1 + x3 - 2 * x2) / 2;
        const b = (x3 - x1) / 2;
        if (a !== 0) T0 = T0 - b / (2 * a);
    }
    
    const pitch = sampleRate / T0;
    const confidence = Math.min(selectedPeak.value, 1.0);
    
    // 7. Sanity check — reject unreasonable fundamentals
    if (pitch < 50 || pitch > 2000) return { pitch: -1, confidence: 0 };
    
    // 8. Median filter (last 3 raw detections) to remove spikes
    lastRawPitches.push(pitch);
    if (lastRawPitches.length > 3) lastRawPitches.shift();
    
    if (lastRawPitches.length >= 3) {
        const sorted = [...lastRawPitches].sort((a, b) => a - b);
        return { pitch: sorted[1], confidence }; // Median
    }
    
    return { pitch, confidence };
}

// Draw static background grid based on Just Intonation ratios
function drawGrid() {
    ctx.fillStyle = '#110b08';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.lineWidth = 1;

    const drawLine = (ratio, baseName, isSa) => {
        const y = ratioToY(ratio);
        if (y < 0 || y > canvasHeight) return;
        
        const isValid = currentRagaLayout === null || currentRagaLayout.includes(baseName);
        
        ctx.beginPath();
        if (isSa) {
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.25)';
        } else if (isValid) {
            ctx.strokeStyle = 'rgba(217, 163, 76, 0.04)';
        } else {
            ctx.strokeStyle = 'rgba(217, 163, 76, 0.015)'; // Varjit (very faint)
        }
        
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
        ctx.stroke();
    };

    // Draw lines for all octaves based on visible range
    [-1, 0, 1].forEach(octave => {
        SWARAS.forEach(swara => {
            let ratio = swara.ratio * Math.pow(2, octave);
            drawLine(ratio, swara.name, swara.name === "S");
        });
    });
}

// ═══ Kalman Filter for Pitch Smoothing ═══
// State: [pitch, pitch_velocity]
// Observation: detected pitch from MPM
class PitchKalmanFilter {
    constructor() {
        this.x = [220, 0];       // State: [pitch_Hz, velocity_Hz/frame]
        this.P = [[100, 0], [0, 10]]; // Covariance matrix
        this.Q_base = 2.0;       // Base process noise (tuned by slider)
        this.R_base = 8.0;       // Base measurement noise
        this.initialized = false;
    }
    
    predict(Q_scale) {
        // State transition: x_new = F * x (constant velocity model)
        const dt = 1; // normalized time step
        this.x[0] += this.x[1] * dt; // pitch += velocity * dt
        // this.x[1] stays same (velocity persists)
        
        // Covariance prediction: P = F*P*F' + Q
        const q = this.Q_base * Q_scale;
        this.P[0][0] += 2 * this.P[0][1] * dt + this.P[1][1] * dt * dt + q;
        this.P[0][1] += this.P[1][1] * dt;
        this.P[1][0] = this.P[0][1];
        this.P[1][1] += q * 0.5; // Velocity noise is lower
    }
    
    update(measurement, confidence) {
        // Measurement noise inversely proportional to confidence
        const R = this.R_base / Math.max(confidence, 0.1);
        
        // Kalman gain: K = P*H' / (H*P*H' + R)
        const S = this.P[0][0] + R;
        const K0 = this.P[0][0] / S;
        const K1 = this.P[1][0] / S;
        
        // Innovation (measurement residual)
        const y = measurement - this.x[0];
        
        // State update
        this.x[0] += K0 * y;
        this.x[1] += K1 * y;
        
        // Covariance update: P = (I - K*H) * P
        const P00 = this.P[0][0];
        const P01 = this.P[0][1];
        this.P[0][0] -= K0 * P00;
        this.P[0][1] -= K0 * P01;
        this.P[1][0] -= K1 * P00;
        this.P[1][1] -= K1 * P01;
        
        return this.x[0];
    }
    
    reset(pitch) {
        this.x = [pitch, 0];
        this.P = [[100, 0], [0, 10]];
        this.initialized = true;
    }
    
    get pitch() { return this.x[0]; }
    get velocity() { return this.x[1]; }
}

const kalmanFilter = new PitchKalmanFilter();

// ═══ Swara Hysteresis State ═══
let currentSwaraName = '--';
let currentSwaraRatioLog = 0;
let pendingSwaraName = null;
let pendingSwaraTime = 0;
const HYSTERESIS_CENTS = 40;   // Must deviate >40 cents to switch
const HYSTERESIS_HOLD_MS = 80; // New note must be stable for 80ms

function updateClosestSwara(pitch, saFreq) {
    if (pitch === -1) {
        swaraDisplay.textContent = '--';
        deviationDisplay.textContent = '';
        currentSwaraName = '--';
        pendingSwaraName = null;
        return;
    }
    
    // Find closest ratio across typical octaves
    const detectionSwaras = SWARAS.filter(s => s.name !== "S'");
    const currentRatioLog = Math.log2(pitch / saFreq);
    let closestSwara = '';
    let closestRatioLog = 0;
    let minDiff = Infinity;

    [-1, 0, 1].forEach(octave => {
        detectionSwaras.forEach(swara => {
            const ratioLog = Math.log2(swara.ratio * Math.pow(2, octave));
            const diff = Math.abs(currentRatioLog - ratioLog);
            if (diff < minDiff) {
                minDiff = diff;
                closestRatioLog = ratioLog;
                if (octave === -1) {
                    closestSwara = 'Mandra ' + swara.fullName;
                } else if (octave === 1) {
                    closestSwara = 'Taar ' + swara.fullName;
                } else {
                    closestSwara = swara.fullName;
                }
            }
        });
    });

    // Hysteresis: only switch displayed swara if the new one is
    // sufficiently far from the current target AND has been stable
    const deviationCents = (currentRatioLog - closestRatioLog) * 1200;
    const deviationFromCurrent = Math.abs((currentRatioLog - currentSwaraRatioLog) * 1200);
    const now = performance.now();
    
    if (closestSwara !== currentSwaraName) {
        if (deviationFromCurrent > HYSTERESIS_CENTS) {
            // Start timing the new candidate
            if (pendingSwaraName !== closestSwara) {
                pendingSwaraName = closestSwara;
                pendingSwaraTime = now;
            }
            // Switch only after hold time
            if (now - pendingSwaraTime >= HYSTERESIS_HOLD_MS) {
                currentSwaraName = closestSwara;
                currentSwaraRatioLog = closestRatioLog;
                pendingSwaraName = null;
            }
        } else {
            pendingSwaraName = null; // Not far enough, cancel pending
        }
    } else {
        pendingSwaraName = null;
        currentSwaraRatioLog = closestRatioLog; // Track the exact position
    }
    
    swaraDisplay.textContent = currentSwaraName;
    
    // Calculate deviation from the currently displayed swara
    const displayDeviation = (currentRatioLog - currentSwaraRatioLog) * 1200;
    const sign = displayDeviation >= 0 ? '+' : '';
    deviationDisplay.textContent = `${sign}${Math.round(displayDeviation)}¢`;
    
    if (Math.abs(displayDeviation) <= 10) {
        deviationDisplay.style.color = '#4ade80'; // Green
    } else if (Math.abs(displayDeviation) <= 25) {
        deviationDisplay.style.color = '#facc15'; // Yellow
    } else {
        deviationDisplay.style.color = '#f87171'; // Red
    }
}

// Render Loop
function draw() {
    if (!isRecording) return;
    animationId = requestAnimationFrame(draw);

    const saFreq = parseFloat(saFreqInput.value);
    
    // Perform pitch detection
    // Prefer AudioWorklet result (updated asynchronously) over main-thread MPM
    let detection;
    if (useWorklet) {
        detection = workletDetection;
        // Consume it (set to no-pitch until next worklet message)
        // But only reset if we actually got a real reading
    } else {
        // Fallback: run MPM on main thread via analyser
        analyser.getFloatTimeDomainData(dataArray);
        detection = detectPitchMPM(dataArray, audioContext.sampleRate);
    }
    
    const now = performance.now();
    
    if (detection.pitch !== -1) {
        const rawPitch = detection.pitch;
        const confidence = detection.confidence;
        
        // Slider controls Kalman process noise (low = more smoothing, high = more responsive)
        const sliderVal = parseFloat(smoothingInput.value); // 0..1, higher = smoother
        kalmanFilter.Q_base = 0.5 + (1 - sliderVal) * 8; // 0.5 to 8.5
        
        if (!kalmanFilter.initialized) {
            kalmanFilter.reset(rawPitch);
            smoothedPitch = rawPitch;
        } else {
            // Octave jump detection — reset Kalman on large jumps
            if (Math.abs(Math.log2(rawPitch / kalmanFilter.pitch)) > 0.5) {
                kalmanFilter.reset(rawPitch);
                smoothedPitch = rawPitch;
            } else {
                // Gamaka-adaptive: increase Q during fast pitch changes
                const pitchDelta = Math.abs(rawPitch - kalmanFilter.pitch);
                const Q_scale = pitchDelta > 8 ? 3.0 : 1.0; // 3x process noise during gamakas
                
                kalmanFilter.predict(Q_scale);
                smoothedPitch = kalmanFilter.update(rawPitch, confidence);
            }
        }
        silenceTimer = 0;
    } else {
        // Voice stopped or unvoiced
        silenceTimer += 16;
        if (silenceTimer > 300) {
            smoothedPitch = null;
            lastRawPitches = [];
            kalmanFilter.initialized = false;
        }
    }

    pitchHistory.push({ pitch: smoothedPitch, time: now });

    // Clean up old history
    while (pitchHistory.length > 0 && now - pitchHistory[0].time > TIME_WINDOW_MS) {
        pitchHistory.shift();
    }

    // UI Updates
    if (smoothedPitch) {
        pitchDisplay.textContent = Math.round(smoothedPitch) + ' Hz';
        updateClosestSwara(smoothedPitch, saFreq);
        updateKeyboard(smoothedPitch, saFreq);
    } else {
        pitchDisplay.textContent = '-- Hz';
        swaraDisplay.textContent = '--';
        updateKeyboard(null, saFreq);
    }

    // Draw frame grid
    drawGrid();

    // Draw Pitch Line
    if (pitchHistory.length > 1) {
        ctx.beginPath();
        let isDrawing = false;
        
        // Warm gold pitch line
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        
        // Add warm glow
        ctx.shadowBlur = 12;
        ctx.shadowColor = 'rgba(251, 191, 36, 0.6)';

        for (let i = 0; i < pitchHistory.length; i++) {
            const pt = pitchHistory[i];
            // Map time to X (right to left)
            const ageMs = now - pt.time;
            const x = canvasWidth - (ageMs / TIME_WINDOW_MS) * canvasWidth;

            if (pt.pitch !== null) {
                const ratio = pt.pitch / saFreq;
                const y = ratioToY(ratio);

                if (!isDrawing) {
                    ctx.moveTo(x, y);
                    isDrawing = true;
                } else {
                    ctx.lineTo(x, y);
                }
            } else {
                isDrawing = false; // break the line if unvoiced
            }
        }
        ctx.stroke();
        
        // Reset glow
        ctx.shadowBlur = 0;
    }
}

async function startAudio() {
    try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: { 
            echoCancellation: false, 
            autoGainControl: false, 
            noiseSuppression: false 
        } });
        
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048; 
        
        const source = audioContext.createMediaStreamSource(micStream);
        source.connect(analyser);
        
        // Muted gain node to prevent Chrome from suspending the context
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0;
        analyser.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        dataArray = new Float32Array(analyser.fftSize);
        
        // Try to set up AudioWorklet for off-thread pitch detection
        try {
            if (audioContext.audioWorklet) {
                await audioContext.audioWorklet.addModule('pitch-processor.js');
                pitchWorkletNode = new AudioWorkletNode(audioContext, 'pitch-processor');
                
                // Listen for pitch results from the audio thread
                pitchWorkletNode.port.onmessage = (event) => {
                    workletDetection = {
                        pitch: event.data.pitch,
                        confidence: event.data.confidence
                    };
                };
                
                // Connect: source → worklet (parallel to analyser path)
                source.connect(pitchWorkletNode);
                // Worklet output goes to the muted gain (keeps node alive)
                pitchWorkletNode.connect(gainNode);
                
                useWorklet = true;
                console.log('🎵 AudioWorklet pitch detection active (off-thread)');
            }
        } catch (workletErr) {
            console.warn('AudioWorklet not available, using main-thread fallback:', workletErr);
            useWorklet = false;
        }
        
        isRecording = true;
        startButton.textContent = 'Stop Microphone';
        startButton.classList.add('recording');
        
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        
        draw();
    } catch (err) {
        console.error('Error accessing microphone:', err);
        alert('Could not access microphone. Please ensure permissions are granted.');
    }
}

function stopAudio() {
    isRecording = false;
    cancelAnimationFrame(animationId);
    
    if (pitchWorkletNode) {
        pitchWorkletNode.disconnect();
        pitchWorkletNode = null;
    }
    useWorklet = false;
    workletDetection = { pitch: -1, confidence: 0 };
    
    if (micStream) {
        micStream.getTracks().forEach(track => track.stop());
    }
    if (audioContext) {
        audioContext.close();
    }
    
    startButton.textContent = 'Start Microphone';
    startButton.classList.remove('recording');
    smoothedPitch = null;
    kalmanFilter.initialized = false;
    pitchDisplay.textContent = '-- Hz';
    swaraDisplay.textContent = '--';
    deviationDisplay.textContent = '';
    deviationDisplay.style.color = 'var(--text-muted)';
    
    // Clear line, keep grid
    drawGrid();
}

startButton.addEventListener('click', () => {
    if (isRecording) {
        stopAudio();
    } else {
        startAudio();
    }
});

// --- Tanpura Synthesizer (Additive Synthesis + Jawari Envelope) ---
// Each string is a bank of N harmonics with time-varying amplitude
// that simulates the overtone cascade (jawari effect).

const TANPURA_CONFIG = {
    harmonicsPerString: 12,       // Number of harmonics per string
    cycleDuration: 7.2,           // Full 6-beat cycle in seconds
    pluckAttack: 0.08,            // Attack time (seconds)
    decayTime: 5.0,               // Overall decay time constant
    jawariIntensity: 0.7,         // 0 = clean, 1 = full jawari
    inharmonicity: 0.00012,       // Inharmonicity coefficient B
    bodyResonances: [180, 350, 520, 750, 1100] // Body resonance frequencies
};

// Pluck schedule: [stringIndex, beatOffset]
// Beat 0: Pa/Ma, Beat 2: SaHigh, Beat 3: SaHigh, Beat 4: SaLow
const PLUCK_SCHEDULE = [
    { string: 0, beatTime: 0.0 },   // Pa/Ma/Ni
    { string: 1, beatTime: 2.4 },   // Sa upper
    { string: 2, beatTime: 3.6 },   // Sa upper
    { string: 3, beatTime: 4.8 }    // Sa lower (karaj)
];

let tanpuraStrings = [];   // Array of {freq, pan, harmonics: [{osc, gain}], noiseGain}
let tanpuraBodyFilters = [];
let tanpuraMasterGain = null;
let tanpuraEnvelopeTimer = null;

function computeJawariEnvelope(harmonicIndex, elapsed, jawari) {
    // Models the overtone cascade: energy sweeps up through harmonics then decays
    const n = harmonicIndex; // 1-based harmonic number
    
    // Base amplitude: higher harmonics are quieter (spectral tilt)
    const alpha = 0.4 + (1 - jawari) * 0.5; // More jawari = flatter spectrum
    const baseAmp = 1.0 / Math.pow(n, alpha);
    
    // Overall decay envelope
    const decay = Math.exp(-elapsed / TANPURA_CONFIG.decayTime);
    
    // Jawari cascade: a spectral peak sweeps through harmonics over time
    if (jawari < 0.05) return baseAmp * decay; // No jawari = simple decay
    
    const sweepDuration = 3.0; // How long the sweep takes
    const t_norm = Math.min(elapsed / sweepDuration, 1.0);
    
    // Peak harmonic moves from 1 → ~12 then falls back
    const peakHarmonic = 1 + (10 * jawari) * t_norm * Math.exp(-t_norm * 1.5);
    
    // Gaussian bell centered on the sweeping peak
    const sigma = 3 + (1 - jawari) * 5; // Narrower = more focused jawari
    const cascadeBoost = Math.exp(-Math.pow(n - peakHarmonic, 2) / (2 * sigma * sigma));
    
    // Combine: base shape + cascade boost + decay
    const amp = baseAmp * (0.3 + 0.7 * cascadeBoost) * decay;
    
    return Math.max(amp, 0.001); // Minimum to avoid setTarget issues
}

function createTanpuraStringV2(freq, pan, stringIndex) {
    if (!audioContext) return null;
    
    const harmonics = [];
    const N = TANPURA_CONFIG.harmonicsPerString;
    const B = TANPURA_CONFIG.inharmonicity;
    
    // Merge node for all harmonics of this string
    const stringMerge = audioContext.createGain();
    stringMerge.gain.value = 0.15 / Math.sqrt(N); // Normalize volume
    
    // Stereo panner
    const panner = audioContext.createStereoPanner();
    panner.pan.value = pan;
    
    // Create harmonic oscillators
    for (let n = 1; n <= N; n++) {
        // Inharmonic frequency: f_n = n * f0 * sqrt(1 + B*n^2)
        const harmonicFreq = n * freq * Math.sqrt(1 + B * n * n);
        
        // Skip harmonics above Nyquist / 2
        if (harmonicFreq > audioContext.sampleRate / 2.5) break;
        
        const osc = audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = harmonicFreq;
        
        // Add subtle pitch wander (makes it organic)
        const wander = (Math.random() - 0.5) * 0.3; // ±0.3 Hz
        osc.detune.value = wander;
        
        const gain = audioContext.createGain();
        gain.gain.value = 0.001; // Start silent
        
        osc.connect(gain);
        gain.connect(stringMerge);
        osc.start();
        
        harmonics.push({ osc, gain, harmonicNumber: n });
    }
    
    // Pluck noise burst generator
    const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.05, audioContext.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
        noiseData[i] = (Math.random() * 2 - 1) * 0.3;
    }
    
    // Connect string → body filters → panner → master
    stringMerge.connect(panner);
    
    if (tanpuraBodyFilters.length > 0) {
        panner.connect(tanpuraBodyFilters[0]); // Route through body resonance
    } else {
        panner.connect(tanpuraMasterGain);
    }
    
    return {
        freq: freq,
        pan: pan,
        stringIndex: stringIndex,
        harmonics: harmonics,
        stringMerge: stringMerge,
        panner: panner,
        noiseBuffer: noiseBuffer,
        pluckTime: null  // Set when plucked
    };
}

function pluckString(str) {
    if (!str || !audioContext) return;
    
    const now = audioContext.currentTime;
    str.pluckTime = now;
    const jawari = TANPURA_CONFIG.jawariIntensity;
    
    // Schedule harmonic envelopes
    str.harmonics.forEach(h => {
        const gain = h.gain.gain;
        gain.cancelScheduledValues(now);
        
        // Schedule the jawari envelope as a series of gain points
        const steps = 20;
        const totalTime = TANPURA_CONFIG.decayTime * 1.2;
        const curve = new Float32Array(steps);
        
        for (let i = 0; i < steps; i++) {
            const t = (i / (steps - 1)) * totalTime;
            curve[i] = computeJawariEnvelope(h.harmonicNumber, t, jawari);
        }
        
        gain.setValueAtTime(0.001, now);
        // Quick attack
        gain.linearRampToValueAtTime(curve[0], now + TANPURA_CONFIG.pluckAttack);
        // Jawari cascade envelope
        gain.setValueCurveAtTime(curve, now + TANPURA_CONFIG.pluckAttack, totalTime);
    });
    
    // Play pluck noise burst
    try {
        const noiseSrc = audioContext.createBufferSource();
        noiseSrc.buffer = str.noiseBuffer;
        
        const noiseFilter = audioContext.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = str.freq * 2;
        noiseFilter.Q.value = 2;
        
        const noiseGain = audioContext.createGain();
        noiseGain.gain.setValueAtTime(0.08, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        
        noiseSrc.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(str.panner);
        noiseSrc.start(now);
    } catch(e) { /* noise burst is optional */ }
}

function createBodyResonanceFilters() {
    tanpuraBodyFilters = [];
    if (!audioContext) return;
    
    // Create a chain of parallel peaking filters for body resonance
    const inputGain = audioContext.createGain();
    inputGain.gain.value = 1.0;
    
    TANPURA_CONFIG.bodyResonances.forEach(freq => {
        const filter = audioContext.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = freq;
        filter.Q.value = 8;
        filter.gain.value = 3; // +3dB resonance boost
        inputGain.connect(filter);
        filter.connect(tanpuraMasterGain);
    });
    
    // Also pass dry signal
    inputGain.connect(tanpuraMasterGain);
    
    tanpuraBodyFilters = [inputGain]; // Store the input node
}

function schedulePluckCycle() {
    if (!isTanpuraPlaying || !audioContext) return;
    
    const cycle = TANPURA_CONFIG.cycleDuration;
    
    // Pluck each string according to the schedule
    PLUCK_SCHEDULE.forEach(schedule => {
        const str = tanpuraStrings[schedule.string];
        if (str) {
            setTimeout(() => {
                if (isTanpuraPlaying) pluckString(str);
            }, schedule.beatTime * 1000);
        }
    });
    
    // Schedule next cycle
    tanpuraEnvelopeTimer = setTimeout(() => {
        if (isTanpuraPlaying) schedulePluckCycle();
    }, cycle * 1000);
}

function startTanpura() {
    if (isTanpuraPlaying || !audioContext) return;
    isTanpuraPlaying = true;
    tanpuraString.disabled = false;
    
    stopTanpuraNodes(); // Clear existing
    
    // Create master gain
    tanpuraMasterGain = audioContext.createGain();
    tanpuraMasterGain.gain.value = 0.6;
    tanpuraMasterGain.connect(audioContext.destination);
    
    // Create body resonance filters
    createBodyResonanceFilters();
    
    const saFreq = parseFloat(saFreqInput.value);
    
    // Determine string 1 frequency
    let firstStringRatio = 3/2; // Default Pa
    if (tanpuraString.value === 'M') firstStringRatio = 4/3; // Ma
    if (tanpuraString.value === 'N') firstStringRatio = 15/8; // Ni
    
    // Create 4 strings
    tanpuraStrings = [
        createTanpuraStringV2(saFreq * firstStringRatio, -0.5, 0),  // Pa/Ma/Ni
        createTanpuraStringV2(saFreq * 2, -0.15, 1),                // Sa upper
        createTanpuraStringV2(saFreq * 2, 0.15, 2),                 // Sa upper
        createTanpuraStringV2(saFreq, 0.5, 3)                       // Sa lower (karaj)
    ];
    
    // Start pluck cycle
    schedulePluckCycle();
}

function stopTanpuraNodes() {
    // Stop all oscillators
    tanpuraStrings.forEach(str => {
        if (!str) return;
        str.harmonics.forEach(h => {
            try { h.osc.stop(); h.osc.disconnect(); } catch(e) {}
            try { h.gain.disconnect(); } catch(e) {}
        });
        try { str.stringMerge.disconnect(); } catch(e) {}
        try { str.panner.disconnect(); } catch(e) {}
    });
    tanpuraStrings = [];
    
    // Disconnect body filters
    tanpuraBodyFilters.forEach(f => { try { f.disconnect(); } catch(e) {} });
    tanpuraBodyFilters = [];
    
    // Disconnect master gain
    if (tanpuraMasterGain) {
        try { tanpuraMasterGain.disconnect(); } catch(e) {}
        tanpuraMasterGain = null;
    }
    
    if (tanpuraEnvelopeTimer) {
        clearTimeout(tanpuraEnvelopeTimer);
        tanpuraEnvelopeTimer = null;
    }
}

function stopTanpura() {
    isTanpuraPlaying = false;
    tanpuraString.disabled = true;
    stopTanpuraNodes();
}

// --- Event Listeners ---
tanpuraToggle.addEventListener('change', async () => {
    if (tanpuraToggle.checked) {
        // Ensure context exists (if they click tanpura before mic)
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        startTanpura();
    } else {
        stopTanpura();
    }
});

tanpuraString.addEventListener('change', () => {
    if (isTanpuraPlaying) {
        stopTanpuraNodes();
        isTanpuraPlaying = false;
        startTanpura(); // Restart with new string
    }
});

// Update grid when Sa changes
saFreqInput.addEventListener('change', () => {
    drawGrid();
    if (isTanpuraPlaying) {
        stopTanpuraNodes();
        isTanpuraPlaying = false;
        startTanpura(); // Restart to match new Sa
    }
});

// Update zoom and regenerate labels/grid
zoomInput.addEventListener('input', () => {
    MAX_RATIO_LOG2 = parseFloat(zoomInput.value);
    MIN_RATIO_LOG2 = -MAX_RATIO_LOG2;
    generateLabels();
    drawGrid();
});

// --- Raga Selection Logic ---
function populateRagaSelect(system, filterText = '') {
    ragaSelect.innerHTML = '<option value="none">--</option>';
    
    if (system === 'none') {
        ragaSelect.disabled = true;
        ragaSearch.disabled = true;
        ragaSearch.value = '';
        currentRagaLayout = null;
    } else {
        ragaSelect.disabled = false;
        ragaSearch.disabled = false;
        
        const ragas = RAGAS[system];
        const lowerFilter = filterText.toLowerCase();
        
        for (const [ragaName, swaras] of Object.entries(ragas)) {
            if (lowerFilter === '' || ragaName.toLowerCase().includes(lowerFilter)) {
                const opt = document.createElement('option');
                opt.value = ragaName;
                opt.textContent = ragaName;
                ragaSelect.appendChild(opt);
            }
        }
    }
}

systemSelect.addEventListener('change', () => {
    const system = systemSelect.value;
    ragaSearch.value = '';
    populateRagaSelect(system);
    currentRagaLayout = null;
    generateLabels();
    if (!isRecording) drawGrid();
    renderShrutiPetti();
});

ragaSearch.addEventListener('input', () => {
    populateRagaSelect(systemSelect.value, ragaSearch.value);
});

ragaSelect.addEventListener('change', () => {
    const system = systemSelect.value;
    const raga = ragaSelect.value;
    
    if (raga === 'none') {
        currentRagaLayout = null;
    } else {
        currentRagaLayout = RAGAS[system][raga];
    }
    
    generateLabels();
    if (!isRecording) {
        ctx.fillStyle = '#110b08';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        drawGrid();
    }
    renderShrutiPetti();
});

// --- Shruti Petti ---
function renderShrutiPetti() {
    shrutiPettiButtons.innerHTML = '';
    stopShrutiPetti();
    
    // Use only the 12 base swaras (exclude S' which is octave Sa)
    const baseSwaras = SWARAS.filter(s => s.name !== "S'");
    
    baseSwaras.forEach(swara => {
        const btn = document.createElement('button');
        btn.className = 'shruti-petti-btn';
        btn.textContent = swara.fullName;
        btn.dataset.swaraName = swara.name;
        btn.dataset.ratio = swara.ratio;
        
        if (swara.name === 'S') {
            btn.classList.add('is-sa');
        }
        
        // Disable if raga is selected and this swara is not in it
        if (currentRagaLayout !== null && !currentRagaLayout.includes(swara.name)) {
            btn.disabled = true;
        }
        
        btn.addEventListener('click', () => toggleShrutiPettiNote(btn, swara));
        shrutiPettiButtons.appendChild(btn);
    });
}

async function toggleShrutiPettiNote(btn, swara) {
    // If this button is already active, stop it
    if (activeSwaraBtn === btn) {
        stopShrutiPetti();
        return;
    }
    
    // Stop any currently playing note
    stopShrutiPetti();
    
    // Ensure AudioContext exists
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }
    
    const saFreq = parseFloat(saFreqInput.value);
    const freq = saFreq * swara.ratio;
    
    // Create a rich harmonic tone (similar to harmonium/shruti box)
    const real = new Float32Array([0, 1, 0.6, 0.3, 0.15, 0.08, 0.04, 0.02]);
    const imag = new Float32Array(real.length);
    const wave = audioContext.createPeriodicWave(real, imag);
    
    shrutiPettiOsc = audioContext.createOscillator();
    shrutiPettiOsc.setPeriodicWave(wave);
    shrutiPettiOsc.frequency.value = freq;
    
    shrutiPettiGain = audioContext.createGain();
    shrutiPettiGain.gain.setValueAtTime(0.01, audioContext.currentTime);
    shrutiPettiGain.gain.exponentialRampToValueAtTime(0.35, audioContext.currentTime + 0.15);
    
    shrutiPettiOsc.connect(shrutiPettiGain);
    shrutiPettiGain.connect(audioContext.destination);
    shrutiPettiOsc.start();
    
    btn.classList.add('active');
    activeSwaraBtn = btn;
}

function stopShrutiPetti() {
    if (shrutiPettiOsc) {
        try {
            shrutiPettiGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
            setTimeout(() => {
                try { shrutiPettiOsc.stop(); shrutiPettiOsc.disconnect(); } catch(e){}
                shrutiPettiOsc = null;
                shrutiPettiGain = null;
            }, 120);
        } catch(e) {
            shrutiPettiOsc = null;
            shrutiPettiGain = null;
        }
    }
    if (activeSwaraBtn) {
        activeSwaraBtn.classList.remove('active');
        activeSwaraBtn = null;
    }
}

// ═══ Custom Pitch Picker (Modal) ═══
(function initPitchPicker() {
    const backdrop = document.getElementById('pitchModalBackdrop');
    const modal = document.getElementById('pitchModal');
    const closeBtn = document.getElementById('pitchModalClose');
    const trigger = document.getElementById('pitchPickerTrigger');
    const octaveTabs = document.getElementById('octaveTabs');
    const noteGrid = document.getElementById('noteGrid');
    const label = document.getElementById('pitchPickerLabel');
    const hiddenInput = document.getElementById('saFreq');

    const NOTES = [
        { name: 'C',  base: 16.3516 },
        { name: 'C♯', base: 17.3239 },
        { name: 'D',  base: 18.3540 },
        { name: 'D♯', base: 19.4454 },
        { name: 'E',  base: 20.6017 },
        { name: 'F',  base: 21.8268 },
        { name: 'F♯', base: 23.1247 },
        { name: 'G',  base: 24.4997 },
        { name: 'G♯', base: 25.9565 },
        { name: 'A',  base: 27.5000 },
        { name: 'A♯', base: 29.1352 },
        { name: 'B',  base: 30.8677 }
    ];

    let currentOctave = 4;
    let selectedNote = 'C';
    let selectedOctave = 4;

    function getFreq(note, octave) {
        return +(note.base * Math.pow(2, octave)).toFixed(2);
    }

    function openModal() {
        backdrop.classList.add('open');
    }

    function closeModal() {
        backdrop.classList.remove('open');
    }

    function renderOctaveTabs() {
        octaveTabs.innerHTML = '';
        for (let oct = 1; oct <= 7; oct++) {
            const tab = document.createElement('button');
            tab.type = 'button';
            tab.className = 'octave-tab' + (oct === currentOctave ? ' active' : '');
            tab.textContent = 'Octave ' + oct;
            tab.addEventListener('click', () => {
                currentOctave = oct;
                renderOctaveTabs();
                renderNoteGrid();
            });
            octaveTabs.appendChild(tab);
        }
    }

    function renderNoteGrid() {
        noteGrid.innerHTML = '';
        NOTES.forEach(note => {
            const freq = getFreq(note, currentOctave);
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'note-btn';
            if (note.name === selectedNote && currentOctave === selectedOctave) {
                btn.classList.add('selected');
            }
            btn.innerHTML = `<strong>${note.name}${currentOctave}</strong><br><span style="font-size:0.65rem;opacity:0.7">${freq} Hz</span>`;
            btn.addEventListener('click', () => {
                selectedNote = note.name;
                selectedOctave = currentOctave;
                hiddenInput.value = freq;
                label.textContent = `${note.name}${currentOctave} – ${freq} Hz`;
                closeModal();
                renderNoteGrid();
                hiddenInput.dispatchEvent(new Event('change'));
            });
            noteGrid.appendChild(btn);
        });
    }

    // Open modal on trigger click
    trigger.addEventListener('click', openModal);

    // Close on X button
    closeBtn.addEventListener('click', closeModal);

    // Close on backdrop click (but not modal card)
    backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeModal();
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    renderOctaveTabs();
    renderNoteGrid();
})();

// ═══ Piano Keyboard Visualization ═══
const pianoKeyboard = document.getElementById('pianoKeyboard');
const keyboardScroll = document.querySelector('.keyboard-scroll');
const keyboardNote = document.getElementById('keyboardNote');
const keyboardSwara = document.getElementById('keyboardSwara');

// MIDI note names
const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const WHITE_NOTES = [0, 2, 4, 5, 7, 9, 11]; // C, D, E, F, G, A, B semitone offsets
const BLACK_NOTES = [1, 3, 6, 8, 10];       // C♯, D♯, F♯, G♯, A♯

let keyElements = {}; // MIDI -> DOM element
let lastHighlightedMidi = null;

function midiToNoteName(midi) {
    const note = midi % 12;
    const octave = Math.floor(midi / 12) - 1;
    return NOTE_NAMES[note] + octave;
}

function freqToMidi(freq) {
    if (!freq || freq <= 0) return -1;
    return 69 + 12 * Math.log2(freq / 440);
}

function midiToSwara(midi, saFreq) {
    const saMidi = freqToMidi(saFreq);
    if (saMidi < 0) return '';
    
    const dist = ((midi - Math.round(saMidi)) % 12 + 12) % 12;
    
    const SWARA_MAP = {
        0:  'Sa',
        1:  'Komal Re',
        2:  'Shuddh Re',
        3:  'Komal Ga',
        4:  'Shuddh Ga',
        5:  'Shuddh Ma',
        6:  'Tivra Ma',
        7:  'Pa',
        8:  'Komal Dha',
        9:  'Shuddh Dha',
        10: 'Komal Ni',
        11: 'Shuddh Ni'
    };
    
    return SWARA_MAP[dist] || '';
}

function buildKeyboard() {
    pianoKeyboard.innerHTML = '';
    keyElements = {};
    
    const startMidi = 24; // C1
    const endMidi = 84;   // C6
    
    const whiteKeyPositions = [];
    let whiteIndex = 0;
    
    for (let midi = startMidi; midi <= endMidi; midi++) {
        const noteInOctave = midi % 12;
        if (WHITE_NOTES.includes(noteInOctave)) {
            const key = document.createElement('div');
            key.className = 'key-white';
            key.dataset.midi = midi;
            
            // Swara label at top of key
            const swaraLabel = document.createElement('span');
            swaraLabel.className = 'swara-label-top';
            key.appendChild(swaraLabel);
            
            // Note name label at bottom
            const label = document.createElement('span');
            label.className = 'key-label';
            if (noteInOctave === 0) {
                label.textContent = midiToNoteName(midi);
            }
            key.appendChild(label);
            
            pianoKeyboard.appendChild(key);
            keyElements[midi] = key;
            whiteKeyPositions.push({ midi, element: key, index: whiteIndex });
            whiteIndex++;
        }
    }
    
    const whiteKeyWidth = 22;
    const blackKeyWidth = 14;
    
    for (let midi = startMidi; midi <= endMidi; midi++) {
        const noteInOctave = midi % 12;
        if (BLACK_NOTES.includes(noteInOctave)) {
            const prevWhiteMidi = midi - 1;
            const prevWhiteInfo = whiteKeyPositions.find(w => w.midi === prevWhiteMidi);
            if (!prevWhiteInfo) continue;
            
            const leftPx = (prevWhiteInfo.index + 1) * whiteKeyWidth - (blackKeyWidth / 2);
            
            const key = document.createElement('div');
            key.className = 'key-black';
            key.dataset.midi = midi;
            key.style.left = leftPx + 'px';
            
            // Swara label at top of black key
            const swaraLabel = document.createElement('span');
            swaraLabel.className = 'swara-label-top';
            key.appendChild(swaraLabel);
            
            const label = document.createElement('span');
            label.className = 'key-label';
            key.appendChild(label);
            
            pianoKeyboard.appendChild(key);
            keyElements[midi] = key;
        }
    }
    
    updateSwaraMarkers();
}

// Short swara names for keyboard labels
const SWARA_SHORT = {
    0:  'S',   // Sa
    1:  'r',   // Komal Re
    2:  'R',   // Shuddh Re
    3:  'g',   // Komal Ga
    4:  'G',   // Shuddh Ga
    5:  'm',   // Shuddh Ma
    6:  'M',   // Tivra Ma
    7:  'P',   // Pa
    8:  'd',   // Komal Dha
    9:  'D',   // Shuddh Dha
    10: 'n',   // Komal Ni
    11: 'N'    // Shuddh Ni
};

function updateSwaraMarkers() {
    const saFreq = parseFloat(saFreqInput.value);
    const saMidi = Math.round(freqToMidi(saFreq));
    
    // Clear all markers
    Object.values(keyElements).forEach(el => {
        el.classList.remove('is-sa');
        const sLabel = el.querySelector('.swara-label-top');
        if (sLabel) sLabel.textContent = '';
    });
    
    // Label each key with its swara relative to Sa
    Object.keys(keyElements).forEach(midiStr => {
        const midi = parseInt(midiStr);
        const dist = ((midi - saMidi) % 12 + 12) % 12;
        const el = keyElements[midi];
        
        // Set swara label
        const sLabel = el.querySelector('.swara-label-top');
        if (sLabel && SWARA_SHORT[dist] !== undefined) {
            sLabel.textContent = SWARA_SHORT[dist];
        }
        
        // Mark Sa keys with gold accent
        if (dist === 0) {
            el.classList.add('is-sa');
        }
    });
}

function updateKeyboard(pitch, saFreq) {
    if (!pitch || pitch <= 0) {
        if (lastHighlightedMidi !== null && keyElements[lastHighlightedMidi]) {
            keyElements[lastHighlightedMidi].classList.remove('active');
            lastHighlightedMidi = null;
        }
        keyboardNote.textContent = '--';
        keyboardSwara.textContent = '--';
        return;
    }
    
    const midiFloat = freqToMidi(pitch);
    const midi = Math.round(midiFloat);
    
    // Hysteresis: only switch if we've moved > 0.4 semitones from current
    if (lastHighlightedMidi !== null && Math.abs(midiFloat - lastHighlightedMidi) < 0.4) {
        return;
    }
    
    if (midi < 24 || midi > 84) {
        keyboardNote.textContent = midiToNoteName(midi);
        keyboardSwara.textContent = midiToSwara(midi, saFreq);
        return;
    }
    
    if (lastHighlightedMidi !== null && keyElements[lastHighlightedMidi]) {
        keyElements[lastHighlightedMidi].classList.remove('active');
    }
    
    if (keyElements[midi]) {
        keyElements[midi].classList.add('active');
        
        const keyEl = keyElements[midi];
        const scrollEl = keyboardScroll;
        const keyRect = keyEl.getBoundingClientRect();
        const scrollRect = scrollEl.getBoundingClientRect();
        
        if (keyRect.left < scrollRect.left || keyRect.right > scrollRect.right) {
            scrollEl.scrollTo({
                left: keyEl.offsetLeft - scrollRect.width / 2,
                behavior: 'smooth'
            });
        }
    }
    
    lastHighlightedMidi = midi;
    keyboardNote.textContent = midiToNoteName(midi);
    keyboardSwara.textContent = midiToSwara(midi, saFreq);
}

// Update swara markers when Sa changes
saFreqInput.addEventListener('change', updateSwaraMarkers);

// ═══ Initial Setup ═══
resizeCanvas();
setTimeout(generateLabels, 100);
renderShrutiPetti();
buildKeyboard();
