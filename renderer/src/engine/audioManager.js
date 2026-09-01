export class AudioManager {
    audioCtx = null;
    analyser = null;
    sourceNode = null;
    dataArray = null;
    isInitialized = false;
    init(mediaElement) {
        if (this.isInitialized)
            return;
        try {
            const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioCtxClass();
            this.analyser = this.audioCtx.createAnalyser();
            this.analyser.fftSize = 64;
            this.analyser.smoothingTimeConstant = 0.8;
            this.sourceNode = this.audioCtx.createMediaElementSource(mediaElement);
            this.sourceNode.connect(this.analyser);
            this.analyser.connect(this.audioCtx.destination);
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.isInitialized = true;
        }
        catch (err) {
            console.warn('AudioContext init warning (will resume on first user interaction):', err);
        }
    }
    resume() {
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }
    /**
     * Trả về độ mạnh của Beat/Bass (0..1) để kích hoạt hiệu ứng rung sàn và đổi đèn
     */
    getBeatEnergy() {
        if (!this.analyser || !this.dataArray) {
            return { beat: 0, bass: 0, freqArray: [0, 0, 0, 0, 0, 0, 0, 0] };
        }
        this.analyser.getByteFrequencyData(this.dataArray);
        // Bass frequencies (first few bins)
        let bassSum = 0;
        const bassBins = Math.min(6, this.dataArray.length);
        for (let i = 0; i < bassBins; i++) {
            bassSum += this.dataArray[i];
        }
        const avgBass = bassSum / bassBins / 255;
        // Normalizing frequency samples for UI equalizer bars
        const samples = [];
        const step = Math.floor(this.dataArray.length / 8);
        for (let i = 0; i < 8; i++) {
            samples.push((this.dataArray[i * step] || 0) / 255);
        }
        const isBeat = avgBass > 0.65 ? (avgBass - 0.65) * 2.8 : 0;
        return {
            beat: Math.min(1.0, isBeat),
            bass: avgBass,
            freqArray: samples,
        };
    }
}
//# sourceMappingURL=audioManager.js.map