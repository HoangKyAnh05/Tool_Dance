export class VideoExporter {
    mediaRecorder = null;
    recordedChunks = [];
    isRecording = false;
    startRecording(canvas, audioElement) {
        if (this.isRecording)
            return false;
        try {
            this.recordedChunks = [];
            const canvasStream = canvas.captureStream(60);
            // Combine with audio track if available
            let combinedStream = canvasStream;
            if (audioElement && audioElement.captureStream) {
                try {
                    const audioStream = audioElement.captureStream();
                    const audioTracks = audioStream.getAudioTracks();
                    if (audioTracks.length > 0) {
                        combinedStream = new MediaStream([
                            ...canvasStream.getVideoTracks(),
                            audioTracks[0],
                        ]);
                    }
                }
                catch (e) {
                    console.warn('Cannot capture audio stream directly, recording video track only:', e);
                }
            }
            // Check supported MIME types
            let mimeType = 'video/webm;codecs=vp9,opus';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/webm';
            }
            this.mediaRecorder = new MediaRecorder(combinedStream, {
                mimeType,
                videoBitsPerSecond: 8000000, // 8 Mbps high quality
            });
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };
            this.mediaRecorder.start(100);
            this.isRecording = true;
            return true;
        }
        catch (err) {
            console.error('Failed to start media recording:', err);
            return false;
        }
    }
    stopRecording() {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder || !this.isRecording) {
                reject(new Error('MediaRecorder is not recording'));
                return;
            }
            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
                this.isRecording = false;
                resolve(blob);
            };
            this.mediaRecorder.stop();
        });
    }
    downloadBlob(blob, filename = 'ai_dance_chibi_render.webm') {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 2000);
    }
}
//# sourceMappingURL=videoExporter.js.map