// Shruti Monitor - Core Logic

// DOM Elements
const canvas = document.getElementById('pitchCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
const startButton = document.getElementById('startButton');
const saFreqInput = document.getElementById('saFreq');
const smoothingInput = document.getElementById('smoothing');
const zoomInput = document.getElementById('zoom');
const swaraAbbr = document.getElementById('swaraAbbr');
const swaraName = document.getElementById('swaraName');
const swaraOctave = document.getElementById('swaraOctave');
const pitchDisplay = document.getElementById('pitchDisplay');
const deviationDisplay = document.getElementById('deviationDisplay');
const yAxisLabelsInner = document.getElementById('yAxisLabelsInner');
const pitchSliderLabels = document.getElementById('pitchSliderLabels');
const pitchSliderMarker = document.getElementById('pitchSliderMarker');
const sliderEdgeLeft = document.getElementById('sliderEdgeLeft');
const sliderEdgeRight = document.getElementById('sliderEdgeRight');
const autoScrollToggle = document.getElementById('autoScrollToggle');

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
let workletDetection = { pitch: -1, confidence: 0, timestamp: 0 }; // Latest result from worklet
let lastProcessedTimestamp = 0;

// Visualization & State
let animationId;
const pitchHistory = []; // stores { pitch, time }
let smoothedPitch = null;
let silenceTimer = 0; // ms since last voiced detection
let octaveErrorCount = 0; // frames of consecutive massive jumps
let canvasWidth, canvasHeight;

// Maximum time window visible on screen (ms)
const TIME_WINDOW_MS = 5000;

// Auto-Scroll State
let currentYOffsetLog2 = 0;
let targetYOffsetLog2 = 0;

// Pitch Slider State
let sliderScrollLog2 = 0;
let targetSliderScrollLog2 = 0;
const SLIDER_VIEW_OCTAVES = 2.0;

// Tanpura State
let isTanpuraPlaying = false;

// Shruti Petti State
let shrutiPettiOsc = null;
let shrutiPettiGain = null;
let activeSwaraBtn = null;

// Just Intonation Ratios for ICM Swaras
const SWARAS = [
    { id: "S",  ratio: 1/1 },
    { id: "r",  ratio: 16/15 },
    { id: "R",  ratio: 9/8 },
    { id: "g",  ratio: 6/5 },
    { id: "G",  ratio: 5/4 },
    { id: "m",  ratio: 4/3 },
    { id: "M",  ratio: 45/32 },
    { id: "P",  ratio: 3/2 },
    { id: "d",  ratio: 8/5 },
    { id: "D",  ratio: 5/3 },
    { id: "n",  ratio: 9/5 },
    { id: "N",  ratio: 15/8 },
    { id: "S'", ratio: 2/1 }
];

// Swara Nomenclature Mapping
const SWARA_LABELS = {
    hindustani: {
        "S": { full: "Sa", short: "S" },
        "r": { full: "Komal Re", short: "r" },
        "R": { full: "Shuddh Re", short: "R" },
        "g": { full: "Komal Ga", short: "g" },
        "G": { full: "Shuddh Ga", short: "G" },
        "m": { full: "Shuddh Ma", short: "m" },
        "M": { full: "Tivra Ma", short: "M" },
        "P": { full: "Pa", short: "P" },
        "d": { full: "Komal Dha", short: "d" },
        "D": { full: "Shuddh Dha", short: "D" },
        "n": { full: "Komal Ni", short: "n" },
        "N": { full: "Shuddh Ni", short: "N" },
        "S'": { full: "Taar Sa", short: "S'" }
    },
    carnatic: {
        "S": { full: "Shadjam (S)", short: "S" },
        "r": { full: "Shuddha Rishabham (R1)", short: "R1" },
        "R": { full: "Chatushruti Rishabham (R2)", short: "R2" },
        "g": { full: "Sadharana Gandharam (G2)", short: "G2" },
        "G": { full: "Antara Gandharam (G3)", short: "G3" },
        "m": { full: "Shuddha Madhyamam (M1)", short: "M1" },
        "M": { full: "Prati Madhyamam (M2)", short: "M2" },
        "P": { full: "Panchamam (P)", short: "P" },
        "d": { full: "Shuddha Dhaivatam (D1)", short: "D1" },
        "D": { full: "Chatushruti Dhaivatam (D2)", short: "D2" },
        "n": { full: "Kaisiki Nishadam (N2)", short: "N2" },
        "N": { full: "Kakali Nishadam (N3)", short: "N3" },
        "S'": { full: "Taar Shadjam (S')", short: "S'" }
    }
};

function getSystemMode() {
    // If 'none' (All Swaras) is selected, default to hindustani nomenclature
    const mode = systemSelect.value;
    return mode === 'carnatic' ? 'carnatic' : 'hindustani';
}

function getSwaraName(baseId, useShort = false) {
    const mode = getSystemMode();
    const entry = SWARA_LABELS[mode][baseId];
    if (!entry) return baseId;
    return useShort ? entry.short : entry.full;
}

// Raga Definitions are now loaded externally
// Unified data structure bridging the two files for pitch logic compatibility
const RAGAS = {
    hindustani: window.HINDUSTANI_RAGAS || {},
    carnatic: {}
};

// Flatten the Carnatic hierarchy so existing graph logic can look up swaras by name
if (window.CARNATIC_HIERARCHY) {
    window.CARNATIC_HIERARCHY.forEach(melakarta => {
        RAGAS.carnatic[melakarta.name] = melakarta.swaras;
        if (melakarta.janyas) {
            melakarta.janyas.forEach(janya => {
                RAGAS.carnatic[janya.name] = janya.swaras;
            });
        }
    });
}

let activeNomenclature = 'hindustani';
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
    const container = document.querySelector('.canvas-container');
    if (!container) return;

    canvasWidth = container.clientWidth;
    canvasHeight = container.clientHeight; // Direct read from Flexbox container
    
    // Handle High DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    
    // Scale the context once
    ctx.scale(dpr, dpr);
    
    // Redraw static elements with the updated canvasHeight
    drawGrid(); 
    generateLabels(); 
    generateSliderLabels(); 
}

window.addEventListener('resize', resizeCanvas);

// Bind a ResizeObserver directly to the canvas-container to strictly lock layout
const canvasObserver = new ResizeObserver(() => {
    resizeCanvas();
});
canvasObserver.observe(document.querySelector('.canvas-container'));

// ── Vertical Scroll and Zoom Logic ──

const container = document.querySelector('.canvas-container');
let lastTouchY = 0;
let initialPinchDistance = null;
let initialZoomValue = null;

function getPinchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function applyManualScroll(amount) {

    targetYOffsetLog2 += amount;
    
    // If the animation loop is not running, we must manually update the graphics
    if (!isRecording) {
        currentYOffsetLog2 = targetYOffsetLog2; 
        
        const logSpan = MAX_RATIO_LOG2 - MIN_RATIO_LOG2;
        const pixelsPerLogUnit = canvasHeight / logSpan;
        const pixelOffset = currentYOffsetLog2 * pixelsPerLogUnit;
        
        if (yAxisLabelsInner) {
            yAxisLabelsInner.style.transform = `translateY(${pixelOffset}px)`;
        }
        drawGrid(); // Redraw the lines
    }
}

container.addEventListener('wheel', (e) => {
    if (!autoScrollToggle.checked) {
        e.preventDefault();
        // Mouse wheel scroll sensitivity
        const scrollAmount = e.deltaY * 0.001 * (zoomInput ? parseFloat(zoomInput.value) : 1);
        applyManualScroll(-scrollAmount); // Reversed direction
    }
}, { passive: false });

container.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1 && !autoScrollToggle.checked) {
        lastTouchY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
        // Start pinch-to-zoom
        initialPinchDistance = getPinchDistance(e.touches);
        initialZoomValue = parseFloat(zoomInput.value);
    }
}, { passive: true });

container.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && !autoScrollToggle.checked) {
        const currentY = e.touches[0].clientY;
        const deltaY = lastTouchY - currentY;
        lastTouchY = currentY;

        // Touch scroll sensitivity
        const scrollAmount = (deltaY / canvasHeight) * (MAX_RATIO_LOG2 - MIN_RATIO_LOG2);
        applyManualScroll(-scrollAmount); // Reversed direction
        e.preventDefault(); // Prevent page pull-down
    } else if (e.touches.length === 2) {
        // Handle pinch-to-zoom
        const currentPinchDistance = getPinchDistance(e.touches);
        if (initialPinchDistance) {
            const scale = initialPinchDistance / currentPinchDistance;
            
            // Calculate new zoom value based on scale, bounded by input limits
            let newZoom = initialZoomValue * scale;
            const minZ = parseFloat(zoomInput.min);
            const maxZ = parseFloat(zoomInput.max);
            newZoom = Math.max(minZ, Math.min(newZoom, maxZ));
            
            // Update the slider value and dispatch event to reuse existing zoom logic
            if (zoomInput.value !== newZoom.toFixed(2)) {
                zoomInput.value = newZoom.toFixed(2);
                zoomInput.dispatchEvent(new Event('input'));
            }
            e.preventDefault();
        }
    }
}, { passive: false });

container.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) {
        initialPinchDistance = null;
    }
    if (e.touches.length === 1 && !autoScrollToggle.checked) {
        lastTouchY = e.touches[0].clientY;
    }
});

// Pitch mapping function (Raw physical pixels from static bounds)
function ratioToYRaw(log2Value) {
    const normalized = (log2Value - MIN_RATIO_LOG2) / (MAX_RATIO_LOG2 - MIN_RATIO_LOG2);
    return canvasHeight - (normalized * canvasHeight);
}

// Dynamic Pitch mapping function (Applies camera offset)
function ratioToY(ratio) {
    const val = Math.log2(ratio) - currentYOffsetLog2;
    return ratioToYRaw(val);
}

// Generate Y-axis Labels
function generateLabels() {
    yAxisLabelsInner.innerHTML = '';
    
    // Expand rendered range to avoid running out of labels during scrolling
    // Octaves from -3 to +3
    const renderOctaves = [-3, -2, -1, 0, 1, 2, 3];
    
    renderOctaves.forEach(octave => {
        SWARAS.forEach(swara => {
            if (swara.id === "S'" && octave !== 0) return; // Dedupe upper Sa
            
            const ratio = swara.ratio * Math.pow(2, octave);
            const logRatio = Math.log2(ratio);
            
            // Only create label if it's within a very wide bounds (to avoid thousands of nodes)
            if (logRatio >= -4 && logRatio <= 4) {
                let displayName = getSwaraName(swara.id, true);
                if (octave < 0) displayName += '.'.repeat(Math.abs(octave));
                if (octave > 0) displayName += "'".repeat(octave);
                
                // Position physically without considering camera offset, offset happens via CSS translate
                createLabel(displayName, ratioToYRaw(logRatio), swara.id, swara.id === "S" && octave === 0);
            }
        });
    });
}

function generateSliderLabels() {
    if (!pitchSliderLabels) return;
    pitchSliderLabels.innerHTML = '';
    
    // We generate labels for a wide range (-2 to +3 octaves)
    // We map 1 octave to 50% width since the view span is 2 octaves.
    const sliderMinLog = -2.0;
    const sliderMaxLog = 3.0;
    
    const renderOctaves = [-2, -1, 0, 1, 2, 3];
    
    renderOctaves.forEach(octave => {
        SWARAS.forEach(swara => {
            if (swara.id === "S'" && octave !== 0) return;
            
            const ratio = swara.ratio * Math.pow(2, octave);
            const logRatio = Math.log2(ratio);
            
            if (logRatio >= sliderMinLog && logRatio <= sliderMaxLog) {
                // Determine if valid in current raga
                const isValid = currentRagaLayout === null || currentRagaLayout.includes(swara.id);
                // Major swaras are those in the raga layout. If 'none' selected, all are major.
                const isMajor = isValid; 
                
                let displayName = getSwaraName(swara.id, true);
                if (octave < 0) displayName += '.'.repeat(Math.abs(octave));
                if (octave > 0) displayName += "'".repeat(octave);
                
                // Calculate percentage relative to 0 being 50%
                const percentage = ((logRatio - (-SLIDER_VIEW_OCTAVES/2)) / SLIDER_VIEW_OCTAVES) * 100;
                
                const labelDiv = document.createElement('div');
                let classNames = ['pitch-slider-label'];
                if (swara.id === "S" && octave === 0) classNames.push('is-sa');
                else if (isMajor) classNames.push('is-major');
                
                // Only show labels for valid swaras to keep it clean, unless it's Sa
                if (!isValid && !(swara.id === "S" && octave === 0)) return;
                
                labelDiv.id = `slider-label-${swara.id}_${octave}`;
                labelDiv.className = classNames.join(' ');
                labelDiv.style.left = `${percentage}%`;
                labelDiv.dataset.logRatio = logRatio;
                
                const tickDiv = document.createElement('div');
                tickDiv.className = 'pitch-slider-tick';
                
                const textDiv = document.createElement('div');
                textDiv.className = 'pitch-slider-text';
                textDiv.textContent = displayName;
                
                labelDiv.appendChild(tickDiv);
                labelDiv.appendChild(textDiv);
                
                pitchSliderLabels.appendChild(labelDiv);
            }
        });
    });
}

function createLabel(displayName, yPos, baseName, isSa = false) {
    // Check if Swara is valid in current Raga
    const isValid = currentRagaLayout === null || currentRagaLayout.includes(baseName);
    
    const span = document.createElement('span');
    let className = 'swara-label';
    if (isSa) className += ' is-sa';
    if (!isValid) className += ' varjit';
    
    span.className = className;
    span.textContent = displayName;
    span.style.top = `${yPos}px`;
    yAxisLabelsInner.appendChild(span);
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
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)'; // Brighter gold
            ctx.lineWidth = 2; // Thicker Sa line
            ctx.setLineDash([]);
        } else if (isValid) {
            ctx.strokeStyle = 'rgba(217, 163, 76, 0.25)'; // Clear valid swara lines
            ctx.lineWidth = 1;
            ctx.setLineDash([]);
        } else {
            ctx.strokeStyle = 'rgba(217, 163, 76, 0.08)'; // Varjit (faint)
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]); // Dashed
        }
        
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
        ctx.stroke();
    };

    // Draw lines for all octaves based on visible range
    [-2, -1, 0, 1, 2].forEach(octave => {
        SWARAS.forEach(swara => {
            let ratio = swara.ratio * Math.pow(2, octave);
            drawLine(ratio, swara.id, swara.id === "S" && octave === 0);
        });
    });
    
    // Reset line dash to solid for the main pitch trace
    ctx.setLineDash([]);
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
let currentSwaraKey = '--';
let currentSwaraRatioLog = 0;
let currentSwaraObj = null;
let currentOctave = 0;

let pendingSwaraKey = null;
const HYSTERESIS_LOG2 = 25 / 1200; // 25 cents spatial hysteresis band

function updateClosestSwara(pitch, saFreq) {
    if (pitch === -1) {
        swaraAbbr.textContent = '--';
        swaraName.innerHTML = '&nbsp;';
        swaraOctave.innerHTML = '&nbsp;';
        deviationDisplay.textContent = '';
        currentSwaraKey = '--';
        currentSwaraObj = null;
        pendingSwaraKey = null;
        return;
    }
    
    // Find closest ratio across typical octaves
    const detectionSwaras = SWARAS.filter(s => s.id !== "S'");
    const currentRatioLog = Math.log2(pitch / saFreq);
    let closestSwaraObj = null;
    let closestOctave = 0;
    let closestRatioLog = 0;
    let minDiff = Infinity;

    [-1, 0, 1].forEach(octave => {
        detectionSwaras.forEach(swara => {
            const ratioLog = Math.log2(swara.ratio * Math.pow(2, octave));
            const diff = Math.abs(currentRatioLog - ratioLog);
            if (diff < minDiff) {
                minDiff = diff;
                closestRatioLog = ratioLog;
                closestSwaraObj = swara;
                closestOctave = octave;
            }
        });
    });

    const closestKey = closestSwaraObj ? `${closestSwaraObj.id}_${closestOctave}` : '--';

    // Spatial Hysteresis: only switch displayed swara if the new mathematical 
    // closest note is at least 25 cents CLOSER than our current locked note.
    // This perfectly allows following fast gamakas without time-delay lag, 
    // while completely eliminating boundary flickering.
    if (currentSwaraKey !== '--') {
        const diffToCurrent = Math.abs(currentRatioLog - currentSwaraRatioLog);
        const diffToClosest = minDiff;
        
        if (closestKey !== currentSwaraKey) {
            if (diffToCurrent > diffToClosest + HYSTERESIS_LOG2) {
                // Switch! The new note is significantly closer
                currentSwaraKey = closestKey;
                currentSwaraObj = closestSwaraObj;
                currentOctave = closestOctave;
                currentSwaraRatioLog = closestRatioLog;
            }
        }
    } else {
        // Initial lock
        currentSwaraKey = closestKey;
        currentSwaraObj = closestSwaraObj;
        currentOctave = closestOctave;
        currentSwaraRatioLog = closestRatioLog;
    }
    
    // UI Update - Split formatting into Abbr, Name, and Octave
    if (currentSwaraObj) {
        const fullStr = getSwaraName(currentSwaraObj.id, false);
        const abbrStr = getSwaraName(currentSwaraObj.id, true);
        
        // Remove (R1) or similar abbreviation from the full name for clean display
        const cleanName = fullStr.replace(/\s*\(.*\)/, '').trim();
        
        swaraAbbr.textContent = abbrStr;
        swaraName.textContent = cleanName || abbrStr;
        
        if (currentOctave === -1) {
            swaraOctave.textContent = 'MANDRA';
        } else if (currentOctave === 1) {
            swaraOctave.textContent = 'TAAR';
        } else {
            swaraOctave.innerHTML = '&nbsp;';
        }
        
        // --- Pitch Slider Highlighting ---
        // Find all slider labels, remove .highlight, then add it to the matching one
        const sliderLabels = document.querySelectorAll('.pitch-slider-label');
        sliderLabels.forEach(label => label.classList.remove('highlight'));
        
        const targetId = `slider-label-${currentSwaraKey}`;
        const activeSliderLabel = document.getElementById(targetId);
        if (activeSliderLabel) {
            activeSliderLabel.classList.add('highlight');
        }
    }
    
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
    let detection = null;
    let isNewDetection = false;
    
    if (useWorklet) {
        if (workletDetection.timestamp !== lastProcessedTimestamp) {
            detection = workletDetection;
            lastProcessedTimestamp = workletDetection.timestamp;
            isNewDetection = true;
        }
    } else {
        // Fallback: run MPM on main thread via analyser
        analyser.getFloatTimeDomainData(dataArray);
        detection = detectPitchMPM(dataArray, audioContext.sampleRate);
        isNewDetection = true;
    }
    
    const now = performance.now();
    
    if (isNewDetection) {
        if (detection.pitch !== -1) {
            const rawPitch = detection.pitch;
            const confidence = detection.confidence;
            
            // Slider controls Kalman process noise (low = more smoothing, high = more responsive)
            const sliderVal = parseFloat(smoothingInput.value); // 0..1, higher = smoother
            kalmanFilter.Q_base = 0.5 + (1 - sliderVal) * 8; // 0.5 to 8.5
            
            if (!kalmanFilter.initialized) {
                kalmanFilter.reset(rawPitch);
                smoothedPitch = rawPitch;
                octaveErrorCount = 0;
            } else {
                // Octave jump detection — reject sudden large jumps (likely MPM tracking errors)
                if (Math.abs(Math.log2(rawPitch / kalmanFilter.pitch)) > 0.6) {
                    octaveErrorCount++;
                    if (octaveErrorCount > 4) { // Sustained for ~60ms, trust it is a real leap
                        kalmanFilter.reset(rawPitch);
                        smoothedPitch = rawPitch;
                        octaveErrorCount = 0;
                    } else {
                        // Ignore the spike, keep coasting on current prediction
                        smoothedPitch = kalmanFilter.pitch;
                    }
                } else {
                    octaveErrorCount = 0;
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
    } else {
        // We don't have a new hardware reading this frame.
        // During fast gamakas, we can optionally use the Kalman state to predict forward!
        if (smoothedPitch !== null && kalmanFilter.initialized) {
            // Optional: kalmanFilter.predict(1.0); 
            // smoothedPitch = kalmanFilter.pitch;
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
        
        // Auto-Scroll Logic: Follow the pitch if tracking is voiced
        if (autoScrollToggle.checked) {
            targetYOffsetLog2 = Math.log2(smoothedPitch / saFreq);
        }
        
        // Pitch Slider Updates
        if (pitchSliderMarker && pitchSliderLabels) {
            const logRatio = Math.log2(smoothedPitch / saFreq); 
            
            // Dynamic Scrolling logic
            // If logRatio gets close to the edges of the visible slider window, push the target scroll
            const edgeMargin = 0.2; // log2 units
            if (logRatio > targetSliderScrollLog2 + (SLIDER_VIEW_OCTAVES/2) - edgeMargin) {
                targetSliderScrollLog2 = logRatio - (SLIDER_VIEW_OCTAVES/2) + edgeMargin;
            } else if (logRatio < targetSliderScrollLog2 - (SLIDER_VIEW_OCTAVES/2) + edgeMargin) {
                targetSliderScrollLog2 = logRatio + (SLIDER_VIEW_OCTAVES/2) - edgeMargin;
            }
            // Clamp target scroll so we don't scroll indefinitely, keep it within bounds -1 to +1
            targetSliderScrollLog2 = Math.max(-1.0, Math.min(1.0, targetSliderScrollLog2));
            
            // Nearest Swara Highlight Logic
            const labels = pitchSliderLabels.children;
            let closestLabel = null;
            let minCentsDiff = Infinity;
            
            for (let i = 0; i < labels.length; i++) {
                const label = labels[i];
                label.classList.remove('highlight'); // reset all
                const labelLog = parseFloat(label.dataset.logRatio);
                const centsDiff = Math.abs(logRatio - labelLog) * 1200;
                
                if (centsDiff < minCentsDiff && centsDiff <= 15) {
                    minCentsDiff = centsDiff;
                    closestLabel = label;
                }
            }
            if (closestLabel) {
                closestLabel.classList.add('highlight');
            }
            
            // Marker Position Calculation 
            const visualLogRatio = logRatio - sliderScrollLog2;
            const percentage = ((visualLogRatio - (-SLIDER_VIEW_OCTAVES/2)) / SLIDER_VIEW_OCTAVES) * 100;
            
            pitchSliderMarker.style.left = `${Math.max(-5, Math.min(105, percentage))}%`;
            pitchSliderMarker.classList.remove('inactive');
            
            // Edge Indicators
            if (sliderEdgeLeft && sliderEdgeRight) {
                const isOffLeft = percentage < 0;
                const isOffRight = percentage > 100;
                sliderEdgeLeft.classList.toggle('active', isOffLeft);
                sliderEdgeRight.classList.toggle('active', isOffRight);
            }
        }

    } else {
        pitchDisplay.textContent = '-- Hz';
        swaraAbbr.textContent = '--';
        swaraName.innerHTML = '&nbsp;';
        swaraOctave.innerHTML = '&nbsp;';
        deviationDisplay.textContent = '';
        updateKeyboard(null, saFreq);
        
        // Coast towards center when unvoiced to prevent getting stranded
        if (autoScrollToggle.checked) {
            targetYOffsetLog2 = 0; 
        }
        
        if (pitchSliderMarker) {
            pitchSliderMarker.classList.add('inactive');
        }
        
        if (sliderEdgeLeft && sliderEdgeRight) {
            sliderEdgeLeft.classList.remove('active');
            sliderEdgeRight.classList.remove('active');
        }
        
        // Coast slider scroll back to 0
        targetSliderScrollLog2 = 0;
    }
    
    // Smoothly tween the camera offset towards the target
    // This now runs even when auto-follow is off, allowing manual scroll targets to be reached
    currentYOffsetLog2 += (targetYOffsetLog2 - currentYOffsetLog2) * 0.1; 

    
    // Apply CSS Translation to the Y-Axis Labels Container
    // We calculate how many pixels one 'log unit' represents on screen and scale the offset
    const logSpan = MAX_RATIO_LOG2 - MIN_RATIO_LOG2;
    const pixelsPerLogUnit = canvasHeight / logSpan;
    const pixelOffset = currentYOffsetLog2 * pixelsPerLogUnit;
    yAxisLabelsInner.style.transform = `translateY(${pixelOffset}px)`;
    
    // Smoothly tween the slider scroll
    sliderScrollLog2 += (targetSliderScrollLog2 - sliderScrollLog2) * 0.1;
    
    if (pitchSliderLabels) {
        // Translation for slider labels
        const translatePercent = -(sliderScrollLog2 / SLIDER_VIEW_OCTAVES) * 100;
        pitchSliderLabels.style.transform = `translateX(${translatePercent}%)`;
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
                        confidence: event.data.confidence,
                        timestamp: event.data.timestamp
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
    swaraAbbr.textContent = '--';
    swaraName.innerHTML = '&nbsp;';
    swaraOctave.innerHTML = '&nbsp;';
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
            if (!window.sharedAudioContext) {
                window.sharedAudioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
            }
            audioContext = window.sharedAudioContext;
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
    generateSliderLabels();
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
    generateSliderLabels();
    drawGrid();
});

// --- Modal UI Logic ---
const ragaModal = document.getElementById('ragaModal');
const openRagaModalBtn = document.getElementById('openRagaModalBtn');
const closeRagaModalBtn = document.getElementById('closeRagaModalBtn');
const modalRagaSearch = document.getElementById('modalRagaSearch');
const modalTabs = document.querySelectorAll('.modal-tab');
const modalRagaList = document.getElementById('modalRagaList');
const currentRagaText = document.getElementById('currentRagaText');

let activeModalSystem = 'hindustani';

function openRagaModal() {
    ragaModal.classList.remove('hidden');
    modalRagaSearch.value = '';
    renderModalList();
    modalRagaSearch.focus();
}

function closeRagaModal() {
    ragaModal.classList.add('hidden');
}

openRagaModalBtn.addEventListener('click', openRagaModal);
closeRagaModalBtn.addEventListener('click', closeRagaModal);
ragaModal.addEventListener('click', (e) => {
    if (e.target === ragaModal) closeRagaModal();
});

modalTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        modalTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeModalSystem = tab.dataset.system;
        renderModalList();
    });
});

modalRagaSearch.addEventListener('input', () => {
    renderModalList();
});

function selectRaga(system, ragaName, swaraArray) {
    activeNomenclature = system !== 'none' ? system : 'hindustani';
    
    if (system === 'none') {
        currentRagaLayout = null;
        currentRagaText.textContent = 'All Swaras (Hindustani)';
    } else {
        currentRagaLayout = swaraArray;
        currentRagaText.textContent = ragaName;
    }
    
    generateLabels();
    generateSliderLabels();
    if (!isRecording) drawGrid();
    renderShrutiPetti();
    updateSwaraMarkers(); // Update piano keys
    
    // Clear display to force refresh
    swaraAbbr.textContent = '--';
    swaraName.innerHTML = '&nbsp;';
    
    closeRagaModal();
}

function formatSwarasForCard(swaraArray) {
    return swaraArray.join(' ');
}

function renderModalList() {
    modalRagaList.innerHTML = '';
    const filterText = modalRagaSearch.value.toLowerCase();
    
    if (activeModalSystem === 'none') {
        const div = document.createElement('div');
        div.className = 'raga-card';
        div.innerHTML = `<span class="raga-card-name">All Swaras (Hindustani Nomenclature)</span>`;
        div.onclick = () => selectRaga('none', null, null);
        modalRagaList.appendChild(div);
        return;
    }

    if (activeModalSystem === 'hindustani') {
        renderHindustaniList(filterText);
    } else if (activeModalSystem === 'carnatic') {
        renderCarnaticList(filterText);
    }
}

function renderHindustaniList(filter) {
    const ragas = window.HINDUSTANI_RAGAS || {};
    // Group alphabetically
    const groups = {};
    for (const [name, swaras] of Object.entries(ragas)) {
        if (!filter || name.toLowerCase().includes(filter)) {
            const letter = name.charAt(0).toUpperCase();
            if (!groups[letter]) groups[letter] = [];
            groups[letter].push({ name, swaras });
        }
    }
    
    const sortedLetters = Object.keys(groups).sort();
    
    if (sortedLetters.length === 0) {
        modalRagaList.innerHTML = '<div class="no-results">No Hindustani ragas found.</div>';
        return;
    }

    sortedLetters.forEach(letter => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'raga-group';
        
        const header = document.createElement('div');
        header.className = 'raga-group-header';
        header.textContent = letter;
        groupDiv.appendChild(header);
        
        groups[letter].sort((a,b) => a.name.localeCompare(b.name)).forEach(raga => {
            const card = document.createElement('div');
            card.className = 'raga-card';
            card.innerHTML = `
                <span class="raga-card-name">${raga.name}</span>
                <span class="raga-card-swaras">${formatSwarasForCard(raga.swaras)}</span>
            `;
            card.onclick = () => selectRaga('hindustani', raga.name, raga.swaras);
            groupDiv.appendChild(card);
        });
        
        modalRagaList.appendChild(groupDiv);
    });
}

function renderCarnaticList(filter) {
    const hierarchy = window.CARNATIC_HIERARCHY || [];
    let matchCount = 0;

    hierarchy.forEach(melakarta => {
        const janyas = melakarta.janyas || [];
        const mMatch = !filter || melakarta.name.toLowerCase().includes(filter);
        const matchingJanyas = filter ? janyas.filter(j => j.name.toLowerCase().includes(filter)) : janyas;
        
        if (mMatch || matchingJanyas.length > 0) {
            matchCount++;
            const groupDiv = document.createElement('div');
            groupDiv.className = 'raga-group';
            
            // Render Melakarta Header Context (only if it has Janyas to group; otherwise it's just a standalone card)
            if (janyas.length > 0) {
                const header = document.createElement('div');
                header.className = 'carnatic-melakarta';
                header.textContent = melakarta.name;
                groupDiv.appendChild(header);
            }
            
            // Render Melakarta Card if it explicitly matches or there is no filter
            if (mMatch) {
                const mkCard = document.createElement('div');
                mkCard.className = 'raga-card';
                mkCard.innerHTML = `
                    <span class="raga-card-name">${melakarta.name}</span>
                    <span class="raga-card-swaras">${formatSwarasForCard(melakarta.swaras)}</span>
                `;
                mkCard.onclick = () => selectRaga('carnatic', melakarta.name, melakarta.swaras);
                groupDiv.appendChild(mkCard);
            }
            
            // Render matching Janyas
            matchingJanyas.forEach(janya => {
                const jCard = document.createElement('div');
                jCard.className = 'raga-card is-janya';
                jCard.innerHTML = `
                    <span class="raga-card-name">${janya.name}</span>
                    <span class="raga-card-swaras">${formatSwarasForCard(janya.swaras)}</span>
                `;
                jCard.onclick = () => selectRaga('carnatic', janya.name, janya.swaras);
                groupDiv.appendChild(jCard);
            });
            
            modalRagaList.appendChild(groupDiv);
        }
    });
    
    if (matchCount === 0) {
        modalRagaList.innerHTML = '<div class="no-results">No Carnatic ragas found in Melakarta or Janya structure.</div>';
    }
}

// Check if a swara is valid in the selected raga
function isSwaraValid(swaraId, system) {
    if (activeNomenclature === 'none' && currentRagaLayout === null) return true; // All swaras visible
    if (!currentRagaLayout) return true;
    
    // Compare shorthand identifiers
    const normalizedTarget = swaraId.replace("'", ""); // Remove octave markers
    
    if (system === 'carnatic') {
        return currentRagaLayout.some(ragaNotation => ragaNotation === normalizedTarget);
    } else {
        return currentRagaLayout.includes(normalizedTarget);
    }
}

// System lookup fallback logic
function getSystemMode() {
    return activeNomenclature !== 'none' ? activeNomenclature : 'hindustani';
}

// --- Shruti Petti ---
function renderShrutiPetti() {
    shrutiPettiButtons.innerHTML = '';
    stopShrutiPetti();
    
    // Use only the 12 base swaras (exclude S' which is octave Sa)
    const baseSwaras = SWARAS.filter(s => s.id !== "S'");
    
    baseSwaras.forEach(swara => {
        const btn = document.createElement('button');
        btn.className = 'shruti-petti-btn';
        btn.textContent = getSwaraName(swara.id);
        btn.dataset.swaraName = swara.id;
        btn.dataset.ratio = swara.ratio;
        
        if (swara.id === 'S') {
            btn.classList.add('is-sa');
        }
        
        // Disable if raga is selected and this swara is not in it
        if (!isSwaraValid(swara.id, activeNomenclature)) {
            btn.disabled = true;
        }
        
        btn.addEventListener('click', () => toggleShrutiPettiNote(btn, swara));
        shrutiPettiButtons.appendChild(btn);
    });
}

async function toggleShrutiPettiNote(btn, swara) {
    // If the user clicks the active button again, we toggle it OFF.
    const isAlreadyActive = (activeSwaraBtn === btn);
    
    // Stop any currently playing note so we can start fresh (or turn off).
    stopShrutiPetti();
    
    if (isAlreadyActive) {
        return; // The note is now stopped.
    }
    
    // Ensure AudioContext exists
    // Initialize Audio Context using shared context
    if (!audioContext) {
        if (!window.sharedAudioContext) {
            window.sharedAudioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
        }
        audioContext = window.sharedAudioContext;
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
    if (shrutiPettiOsc && shrutiPettiGain) {
        // Capture the current oscillator and gain node into local variables.
        // This ensures the 120ms timeout doesn't accidentally stop a NEWLY created note
        // if the user clicks another button immediately.
        const oscToStop = shrutiPettiOsc;
        const gainToStop = shrutiPettiGain;
        
        try {
            gainToStop.gain.cancelScheduledValues(audioContext.currentTime);
            // Use setTargetAtTime for a smooth, glitch-free fade out from current volume
            gainToStop.gain.setTargetAtTime(0.001, audioContext.currentTime, 0.03); 
            
            setTimeout(() => {
                try { oscToStop.stop(); oscToStop.disconnect(); } catch(e){}
                try { gainToStop.disconnect(); } catch(e){}
            }, 120);
        } catch(e) {
            try { oscToStop.stop(); oscToStop.disconnect(); } catch(e){}
        }
        
        // Clear global references immediately so new notes can use them safely
        shrutiPettiOsc = null;
        shrutiPettiGain = null;
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
        0: 'S', 1: 'r', 2: 'R', 3: 'g', 4: 'G', 5: 'm',
        6: 'M', 7: 'P', 8: 'd', 9: 'D', 10: 'n', 11: 'N'
    };
    
    const swaraBaseName = SWARA_MAP[dist];
    return swaraBaseName ? getSwaraName(swaraBaseName) : '';
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
            
            // Add interaction events
            addHarmoniumEvents(key, midi);
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
            
            // Add interaction events
            addHarmoniumEvents(key, midi);
        }
    }
    
    updateSwaraMarkers();
}

function addHarmoniumEvents(keyEl, midi) {
    // Mouse Events
    keyEl.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // Only left click
        triggerHarmoniumPlay(midi);
    });
    
    keyEl.addEventListener('mouseenter', (e) => {
        if (e.buttons === 1) {
            triggerHarmoniumPlay(midi);
        }
    });

    keyEl.addEventListener('mouseup', () => triggerHarmoniumStop(midi));
    keyEl.addEventListener('mouseleave', () => triggerHarmoniumStop(midi));

    // Touch Events
    keyEl.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevent scrolling while playing
        triggerHarmoniumPlay(midi);
    }, { passive: false });

    keyEl.addEventListener('touchend', (e) => {
        e.preventDefault();
        triggerHarmoniumStop(midi);
    }, { passive: false });
    
    keyEl.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        triggerHarmoniumStop(midi);
    }, { passive: false });
}

function triggerHarmoniumPlay(midi) {
    if (!window.Harmonium) return;
    
    const saFreq = parseFloat(saFreqInput.value);
    const saMidi = Math.round(freqToMidi(saFreq));
    
    // Calculate precise Just Intonation pitch
    const dist = ((midi - saMidi) % 12 + 12) % 12;
    const octaveOffset = Math.floor((midi - saMidi) / 12);
    
    if (SWARA_BASE_IDS[dist]) {
        const swaraName = getSwaraName(SWARA_BASE_IDS[dist]);
        // Find the swara definition in the current system to get the exact ratio
        const mode = getSystemMode();
        let exactRatio = null;
        
        // Let's iterate SWARAS to find the exact ratio matching the dist if not direct lookup
        const entry = SWARAS.find(s => s.id === SWARA_BASE_IDS[dist] || (SWARA_LABELS[mode] && SWARA_LABELS[mode][s.id] && SWARA_LABELS[mode][s.id].short === SWARA_BASE_IDS[dist]));
        
        if (entry) {
            exactRatio = entry.ratio;
        } else {
            // Fallback mathematically if not strict JI definition found
            exactRatio = Math.pow(2, dist / 12);
        }

        const frequency = saFreq * exactRatio * Math.pow(2, octaveOffset);
        window.Harmonium.playNote(midi, frequency);
        
        if (keyElements[midi]) {
            keyElements[midi].classList.add('playing');
        }
    }
}

function triggerHarmoniumStop(midi) {
    if (!window.Harmonium) return;
    window.Harmonium.stopNote(midi);
    
    if (keyElements[midi]) {
        keyElements[midi].classList.remove('playing');
    }
}

// Short swara names map dynamically in updateSwaraMarkers()
const SWARA_BASE_IDS = {
    0: 'S', 1: 'r', 2: 'R', 3: 'g', 4: 'G', 5: 'm',
    6: 'M', 7: 'P', 8: 'd', 9: 'D', 10: 'n', 11: 'N'
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
        
        // Set swara label using short name
        const sLabel = el.querySelector('.swara-label-top');
        const baseId = SWARA_BASE_IDS[dist];
        if (sLabel && baseId) {
            sLabel.textContent = getSwaraName(baseId, true);
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

// ═══ Controls Drawer Toggle (Mobile) ═══
(function initDrawer() {
    const settingsToggle = document.getElementById('settingsToggle');
    const drawer = document.getElementById('controlsDrawer');
    const backdrop = document.getElementById('drawerBackdrop');

    function openDrawer() {
        drawer.classList.add('open');
        backdrop.classList.add('open');
        settingsToggle.classList.add('active');
    }

    function closeDrawer() {
        drawer.classList.remove('open');
        backdrop.classList.remove('open');
        settingsToggle.classList.remove('active');
    }

    function toggleDrawer() {
        if (drawer.classList.contains('open')) {
            closeDrawer();
        } else {
            openDrawer();
        }
    }

    settingsToggle.addEventListener('click', toggleDrawer);
    backdrop.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && drawer.classList.contains('open')) {
            closeDrawer();
        }
    });
})();

// ═══ Initial Setup ═══
resizeCanvas();
setTimeout(generateLabels, 100);
renderShrutiPetti();
buildKeyboard();
