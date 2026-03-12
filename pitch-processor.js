// pitch-processor.js — AudioWorklet for real-time McLeod Pitch Detection
// Runs on the audio thread for consistent, low-latency pitch analysis

class PitchProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.buffer = new Float32Array(2048);
        this.bufferIndex = 0;
        this.lastRawPitches = [];
        
        // MPM parameters
        this.KEY_THRESHOLD = 0.93;
        this.RMS_THRESHOLD = 0.008;
    }
    
    /**
     * McLeod Pitch Method (NSDF-based)
     * Returns { pitch, confidence } or { pitch: -1, confidence: 0 }
     */
    detectPitchMPM(buf) {
        const SIZE = buf.length;
        
        // 1. RMS gate
        let rms = 0;
        for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
        rms = Math.sqrt(rms / SIZE);
        if (rms < this.RMS_THRESHOLD) return { pitch: -1, confidence: 0 };
        
        // 2. Compute NSDF
        const maxLag = SIZE >> 1; // SIZE / 2 (bitshift for speed)
        const nsdf = new Float32Array(maxLag);
        
        for (let tau = 0; tau < maxLag; tau++) {
            let acf = 0, m = 0;
            const limit = maxLag - tau;
            for (let j = 0; j < limit; j++) {
                acf += buf[j] * buf[j + tau];
                m += buf[j] * buf[j] + buf[j + tau] * buf[j + tau];
            }
            nsdf[tau] = m > 0 ? (2 * acf) / m : 0;
        }
        
        // 3. Skip initial positive region (before first zero crossing)
        let firstZero = 1;
        while (firstZero < maxLag - 1 && nsdf[firstZero] > 0) firstZero++;
        
        // 4. Find peaks after the first zero crossing
        const peaks = [];
        for (let i = firstZero + 1; i < maxLag - 1; i++) {
            if (nsdf[i] > nsdf[i - 1] && nsdf[i] >= nsdf[i + 1] && nsdf[i] > 0) {
                peaks.push({ index: i, value: nsdf[i] });
            }
        }
        
        if (peaks.length === 0) return { pitch: -1, confidence: 0 };
        
        // 5. Key-threshold selection: first peak above threshold × max
        let maxVal = -1;
        for (const p of peaks) if (p.value > maxVal) maxVal = p.value;
        const threshold = this.KEY_THRESHOLD * maxVal;
        
        let selected = peaks[peaks.length - 1];
        for (const p of peaks) {
            if (p.value >= threshold) { selected = p; break; }
        }
        
        // 6. Parabolic interpolation
        let T0 = selected.index;
        if (T0 > 0 && T0 < maxLag - 1) {
            const x1 = nsdf[T0 - 1], x2 = nsdf[T0], x3 = nsdf[T0 + 1];
            const a = (x1 + x3 - 2 * x2) / 2;
            const b = (x3 - x1) / 2;
            if (a !== 0) T0 = T0 - b / (2 * a);
        }
        
        const pitch = sampleRate / T0;
        const confidence = Math.min(selected.value, 1.0);
        
        // 7. Sanity check
        if (pitch < 50 || pitch > 2000) return { pitch: -1, confidence: 0 };
        
        // 8. Median filter
        this.lastRawPitches.push(pitch);
        if (this.lastRawPitches.length > 3) this.lastRawPitches.shift();
        
        if (this.lastRawPitches.length >= 3) {
            const sorted = [...this.lastRawPitches].sort((a, b) => a - b);
            return { pitch: sorted[1], confidence };
        }
        
        return { pitch, confidence };
    }
    
    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (!input || !input[0] || input[0].length === 0) return true;
        
        const channelData = input[0]; // First channel
        
        // Accumulate samples into our analysis buffer
        for (let i = 0; i < channelData.length; i++) {
            this.buffer[this.bufferIndex] = channelData[i];
            this.bufferIndex++;
            
            // When buffer is full, run detection and send result
            if (this.bufferIndex >= this.buffer.length) {
                const result = this.detectPitchMPM(this.buffer);
                
                // Send to main thread
                this.port.postMessage({
                    pitch: result.pitch,
                    confidence: result.confidence,
                    timestamp: currentTime
                });
                
                // Shift buffer: keep last half for overlap (50%)
                const half = this.buffer.length >> 1;
                this.buffer.copyWithin(0, half);
                this.bufferIndex = half;
            }
        }
        
        return true; // Keep processor alive
    }
}

registerProcessor('pitch-processor', PitchProcessor);
