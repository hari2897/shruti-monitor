/**
 * Harmonium Synthesizer Module
 * Simulates a free-reed harmonium using Web Audio API additive synthesis.
 */

const Harmonium = (function() {
    let audioCtx = null;
    let masterGain = null;
    let customWave = null;
    
    // Map to keep track of currently playing notes: midi -> { osc1, osc2, gain }
    const activeNotes = new Map();
    
    // Initialization flag
    let isInitialized = false;
    let initPromise = null;
    let noiseBuffer = null;

    function createNoiseBuffer() {
        if (!audioCtx) return null;
        const bufferSize = audioCtx.sampleRate * 2; // 2 seconds of noise 
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1; // White noise
        }
        return buffer;
    }

    async function init() {
        if (isInitialized) return;
        if (initPromise) return initPromise;
        
        initPromise = (async () => {
            try {
                // Ensure AudioContext exists - we use a shared one if available to avoid browser limits
                if (!window.sharedAudioContext) {
                    const AC = window.AudioContext || window.webkitAudioContext;
                    window.sharedAudioContext = new AC();
                }
                audioCtx = window.sharedAudioContext;
                
                if (audioCtx.state === 'suspended') {
                    // Start the audio context
                    await audioCtx.resume();
                }

                // Master output for harmonium
                masterGain = audioCtx.createGain();
                masterGain.gain.value = 0.8; // Global harmonium volume
                
                // Add a lowpass filter to warm up the sound and remove synthetic harshness
                const masterFilter = audioCtx.createBiquadFilter();
                masterFilter.type = 'lowpass';
                masterFilter.frequency.value = 2500; // Cut off high harsh frequencies
                masterFilter.Q.value = 0.5;
                
                masterGain.connect(masterFilter);
                masterFilter.connect(audioCtx.destination);
                
                // Construct a custom wave simulating a rich harmonium reed
                const numHarmonics = 64; // More harmonics for richer lower end
                const real = new Float32Array(numHarmonics);
                const imag = new Float32Array(numHarmonics);
                
                real[0] = 0; 
                imag[0] = 0;
                
                // Harmonium reed physics:
                // Odd harmonics are very strong. Even harmonics are present but weaker.
                // High harmonics drop off sharply.
                for (let i = 1; i < numHarmonics; i++) {
                    // Base amplitude follows 1/n but falls off faster at high frequencies
                    let amp = 1.0 / Math.pow(i, 1.2); 
                    
                    if (i % 2 === 0) {
                        amp *= 0.3; // Much weaker even harmonics (gives it that 'hollow' reed sound)
                    }
                    
                    // Boost the 3rd and 5th harmonics slightly for nasal quality
                    if (i === 3) amp *= 1.2;
                    if (i === 5) amp *= 1.1;
                    
                    real[i] = amp;
                    imag[i] = 0;
                }
                
                customWave = audioCtx.createPeriodicWave(real, imag, { disableNormalization: false });
                noiseBuffer = createNoiseBuffer();
                isInitialized = true;
                console.log("Harmonium synthesizer initialized successfully.");
            } catch (err) {
                console.error("Failed to initialize Harmonium:", err);
            }
        })();
        return initPromise;
    }

    async function playNote(midiKey, frequency) {
        if (!isInitialized) await init();
        if (audioCtx && audioCtx.state === 'suspended') {
             await audioCtx.resume();
        }
        
        console.log(`Playing Harmonium Note: MIDI ${midiKey}, Freq: ${frequency.toFixed(2)} Hz`);
        
        // If already playing this key, ignore
        if (activeNotes.has(midiKey)) {
            return;
        }

        // VIBRATO (Air pumping simulation)
        // A slow ~4 Hz modulation applied to amplitude
        const now = audioCtx.currentTime;
        const tremoloLFO = audioCtx.createOscillator();
        tremoloLFO.type = 'sine';
        tremoloLFO.frequency.value = 4.0;
        
        const tremoloDepth = audioCtx.createGain();
        tremoloDepth.gain.value = 0.08; // 8% volume modulation
        tremoloLFO.connect(tremoloDepth);
        tremoloLFO.start(now);

        // Note specific gain envelope (ADSR)
        const noteGain = audioCtx.createGain();
        // Immediately silence it so we can ramp up cleanly
        noteGain.gain.setValueAtTime(0, now);
        
        // Tremolo applies onto the note gain
        tremoloDepth.connect(noteGain.gain);
        
        // Slightly slower attack mimicking bellows filling up with air
        noteGain.gain.linearRampToValueAtTime(0.6, now + 0.08); 
        
        noteGain.connect(masterGain);

        // ─── TONE GENERATORS (The Reeds) ───
        
        // Oscillator 1 (Main body - lower reed)
        const osc1 = audioCtx.createOscillator();
        osc1.setPeriodicWave(customWave);
        osc1.frequency.value = frequency;
        
        // Oscillator 2 (Slightly detuned for chorus/thickness typical in 2-reed harmoniums)
        const osc2 = audioCtx.createOscillator();
        osc2.setPeriodicWave(customWave);
        osc2.frequency.value = frequency * 1.003; // +5 cents detune
        
        // Oscillator 3 (Octave up thinner reed for brilliance)
        const osc3 = audioCtx.createOscillator();
        osc3.setPeriodicWave(customWave);
        osc3.frequency.value = frequency * 2.0; 
        
        const osc3Gain = audioCtx.createGain();
        osc3Gain.gain.value = 0.3; // Half volume for the higher octave reed
        osc3.connect(osc3Gain);
        
        osc1.connect(noteGain);
        osc2.connect(noteGain);
        osc3Gain.connect(noteGain);
        
        osc1.start(now);
        osc2.start(now);
        osc3.start(now);
        
        // ─── WIND NOISE (Bellows Air) ───
        let noiseSrc = null;
        let noiseFilter = null;
        let noiseGain = null;
        
        if (noiseBuffer) {
            noiseSrc = audioCtx.createBufferSource();
            noiseSrc.buffer = noiseBuffer;
            noiseSrc.loop = true;
            
            // Filter noise to sound like rushing air through wood
            noiseFilter = audioCtx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.value = 500;
            noiseFilter.Q.value = 0.5;
            
            noiseGain = audioCtx.createGain();
            noiseGain.gain.setValueAtTime(0, now);
            // Noise kicks in quickly, fades to a steady low hiss
            noiseGain.gain.linearRampToValueAtTime(0.08, now + 0.05);
            noiseGain.gain.linearRampToValueAtTime(0.04, now + 0.2);
            
            noiseSrc.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(noteGain); // Bind to main envelope
            
            noiseSrc.start(now);
        }

        activeNotes.set(midiKey, {
            osc1, osc2, osc3, osc3Gain,
            noiseSrc, noiseFilter, noiseGain,
            tremoloLFO,
            noteGain
        });
    }

    function stopNote(midiKey) {
        if (!activeNotes.has(midiKey)) return;

        const note = activeNotes.get(midiKey);
        activeNotes.delete(midiKey); // Remova early to prevent duplicate stops
        
        const releaseTime = 0.250; // Slower release for bellows naturally losing pressure
        const now = audioCtx.currentTime;
        
        // Smooth release - Web Audio demands we anchor the current value before ramping!
        note.noteGain.gain.cancelScheduledValues(now);
        note.noteGain.gain.setValueAtTime(note.noteGain.gain.value, now);
        note.noteGain.gain.linearRampToValueAtTime(0, now + releaseTime);
        
        // Schedule cleanup
        setTimeout(() => {
            try {
                note.osc1.stop();
                note.osc2.stop();
                note.osc3.stop();
                note.tremoloLFO.stop();
                if (note.noiseSrc) note.noiseSrc.stop();
                
                note.osc1.disconnect();
                note.osc2.disconnect();
                note.osc3.disconnect();
                note.osc3Gain.disconnect();
                note.tremoloLFO.disconnect();
                
                if (note.noiseSrc) {
                    note.noiseSrc.disconnect();
                    note.noiseFilter.disconnect();
                    note.noiseGain.disconnect();
                }
                note.noteGain.disconnect();
            } catch (e) {
                // Ignore errors if context already cleanly removed them
            }
        }, releaseTime * 1000 + 50);
    }
    
    function stopAll() {
        for (let midiKey of activeNotes.keys()) {
            stopNote(midiKey);
        }
    }

    return {
        playNote,
        stopNote,
        stopAll
    };
})();

window.Harmonium = Harmonium;
