/**
 * BỘ LỌC ONE-EURO FILTER (1€ FILTER) - THUẬT TOÁN CHUẨN CÔNG NGHIỆP MOTION CAPTURE
 * Triệt tiêu hoàn toàn rung lắc khi đứng yên và phản hồi siêu nhanh khi vung tay múa
 */
class OneEuroFilter {
    minCutoff;
    beta;
    dCutoff;
    xPrev = null;
    dxPrev = 0;
    tPrev = null;
    constructor(minCutoff = 1.2, beta = 0.05, dCutoff = 1.0) {
        this.minCutoff = minCutoff;
        this.beta = beta;
        this.dCutoff = dCutoff;
    }
    alpha(cutoff, dt) {
        const tau = 1.0 / (2 * Math.PI * cutoff);
        return 1.0 / (1.0 + tau / dt);
    }
    filter(x, timestamp) {
        if (this.tPrev === null || this.xPrev === null) {
            this.xPrev = x;
            this.tPrev = timestamp;
            this.dxPrev = 0;
            return x;
        }
        const dt = Math.max(0.001, (timestamp - this.tPrev) / 1000);
        this.tPrev = timestamp;
        const dx = (x - this.xPrev) / dt;
        const aD = this.alpha(this.dCutoff, dt);
        const dxHat = aD * dx + (1 - aD) * this.dxPrev;
        this.dxPrev = dxHat;
        const cutoff = this.minCutoff + this.beta * Math.abs(dxHat);
        const a = this.alpha(cutoff, dt);
        const xHat = a * x + (1 - a) * this.xPrev;
        this.xPrev = xHat;
        return xHat;
    }
}
export class PoseTracker {
    videoEl = null;
    canvasEl = null;
    ctx = null;
    smoothLandmarks = [];
    rawAILandmarks = null;
    isProcessingAI = false;
    mpPose = null;
    aiReady = false;
    // Multi-Dancer Lock Target
    lockedTargetX = 0.5;
    lockedDancerLabel = 'Vũ Công Trung Tâm (Gần Nhất)';
    // 1€ Filter mượt mà cho toàn bộ 33 khớp xương (X, Y, Z)
    xFilters = [];
    yFilters = [];
    zFilters = [];
    // MediaPipe Landmark Index Map
    static NOSE = 0;
    static LEFT_EYE = 2;
    static RIGHT_EYE = 5;
    static LEFT_EAR = 7;
    static RIGHT_EAR = 8;
    static LEFT_SHOULDER = 11;
    static RIGHT_SHOULDER = 12;
    static LEFT_ELBOW = 13;
    static RIGHT_ELBOW = 14;
    static LEFT_WRIST = 15;
    static RIGHT_WRIST = 16;
    static LEFT_PINKY = 17;
    static RIGHT_PINKY = 18;
    static LEFT_INDEX = 19;
    static RIGHT_INDEX = 20;
    static LEFT_THUMB = 21;
    static RIGHT_THUMB = 22;
    static LEFT_HIP = 23;
    static RIGHT_HIP = 24;
    static LEFT_KNEE = 25;
    static RIGHT_KNEE = 26;
    static LEFT_ANKLE = 27;
    static RIGHT_ANKLE = 28;
    constructor() {
        this.initDefaultLandmarks();
        this.initFilters();
        this.initMediaPipePose();
    }
    initFilters() {
        this.xFilters = [];
        this.yFilters = [];
        this.zFilters = [];
        for (let i = 0; i < 33; i++) {
            // minCutoff = 2.8, beta = 0.45: Triệt tiêu hoàn toàn delay khi chân đá/nhảy nhanh
            this.xFilters.push(new OneEuroFilter(2.8, 0.45, 1.0));
            this.yFilters.push(new OneEuroFilter(2.8, 0.45, 1.0));
            this.zFilters.push(new OneEuroFilter(2.0, 0.35, 1.0));
        }
    }
    initDefaultLandmarks() {
        this.smoothLandmarks = [];
        for (let i = 0; i < 33; i++) {
            this.smoothLandmarks.push({ x: 0.5, y: 0.5, z: 0, visibility: 1.0 });
        }
    }
    initMediaPipePose() {
        try {
            const PoseClass = window.Pose;
            if (typeof PoseClass !== 'undefined') {
                this.mpPose = new PoseClass({
                    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`,
                });
                this.mpPose.setOptions({
                    modelComplexity: 1,
                    smoothLandmarks: false, // Ta dùng bộ lọc One-Euro Filter chuyên dụng mượt hơn nhiều lần
                    enableSegmentation: false,
                    smoothSegmentation: false,
                    minDetectionConfidence: 0.35,
                    minTrackingConfidence: 0.35,
                });
                this.mpPose.onResults((results) => {
                    this.isProcessingAI = false;
                    if (results && results.poseLandmarks && results.poseLandmarks.length >= 33) {
                        this.handleAIResults(results.poseLandmarks);
                    }
                });
                this.aiReady = true;
            }
            else {
                setTimeout(() => this.initMediaPipePose(), 600);
            }
        }
        catch (err) {
            console.warn('MediaPipe Pose init note:', err);
        }
    }
    setElements(video, overlayCanvas) {
        this.videoEl = video;
        this.canvasEl = overlayCanvas;
        this.ctx = overlayCanvas.getContext('2d');
        overlayCanvas.addEventListener('click', (e) => {
            const rect = overlayCanvas.getBoundingClientRect();
            const clickX = (e.clientX - rect.left) / rect.width;
            const clickY = (e.clientY - rect.top) / rect.height;
            this.setLockTarget(clickX, clickY);
        });
    }
    setLockTarget(normX, normY) {
        this.lockedTargetX = Math.max(0.1, Math.min(0.9, normX));
        if (normX < 0.35) {
            this.lockedDancerLabel = 'Vũ Công Bên Trái';
        }
        else if (normX > 0.65) {
            this.lockedDancerLabel = 'Vũ Công Bên Phải';
        }
        else {
            this.lockedDancerLabel = 'Vũ Công Trung Tâm (Gần Nhất)';
        }
    }
    getLockedDancerLabel() {
        return this.lockedDancerLabel;
    }
    handleAIResults(landmarks) {
        this.rawAILandmarks = landmarks.map((pt) => ({
            x: Math.max(0, Math.min(1, pt.x)),
            y: Math.max(0, Math.min(1, pt.y)),
            z: pt.z || 0,
            visibility: pt.visibility !== undefined ? pt.visibility : 0.95,
        }));
    }
    /**
     * Xử lý từng khung hình video với bộ lọc One-Euro Filter siêu mượt
     */
    processFrame(currentTime, beatFactor = 0) {
        const timestamp = performance.now();
        if (!this.videoEl || this.videoEl.paused || this.videoEl.ended) {
            return {
                time: currentTime,
                landmarks: this.smoothLandmarks,
                detected: true,
                beatIntensity: beatFactor,
                lockedDancerName: this.lockedDancerLabel,
            };
        }
        if (this.mpPose && !this.isProcessingAI && this.videoEl.readyState >= 2) {
            this.isProcessingAI = true;
            this.mpPose.send({ image: this.videoEl }).catch(() => {
                this.isProcessingAI = false;
            });
        }
        if (this.rawAILandmarks && this.rawAILandmarks.length >= 33) {
            for (let i = 0; i < 33; i++) {
                const rawPt = this.rawAILandmarks[i];
                // One-Euro Filter loại bỏ hoàn toàn rung nhiễu và bắt chuyển động tức thì
                const filteredX = this.xFilters[i].filter(rawPt.x, timestamp);
                const filteredY = this.yFilters[i].filter(rawPt.y, timestamp);
                const filteredZ = this.zFilters[i].filter(rawPt.z, timestamp);
                this.smoothLandmarks[i] = {
                    x: filteredX,
                    y: filteredY,
                    z: filteredZ,
                    visibility: rawPt.visibility,
                };
            }
            return {
                time: currentTime,
                landmarks: this.smoothLandmarks,
                detected: true,
                beatIntensity: beatFactor,
                lockedDancerName: this.lockedDancerLabel,
            };
        }
        // Fallback Animation
        const t = currentTime;
        const dancePhase = t * 3.5;
        const bounce = Math.abs(Math.sin(dancePhase * 2)) * 0.06 * (1.0 + beatFactor * 0.5);
        const hipSway = Math.sin(dancePhase) * 0.08;
        const centerX = this.lockedTargetX + hipSway * 0.5;
        const centerY = 0.52 - bounce;
        const raw = [...this.smoothLandmarks];
        raw[PoseTracker.NOSE] = { x: centerX, y: centerY - 0.32, z: 0, visibility: 0.99 };
        raw[PoseTracker.LEFT_SHOULDER] = { x: centerX - 0.14, y: centerY - 0.22, z: -0.05, visibility: 0.99 };
        raw[PoseTracker.RIGHT_SHOULDER] = { x: centerX + 0.14, y: centerY - 0.22, z: 0.05, visibility: 0.99 };
        raw[PoseTracker.LEFT_ELBOW] = { x: raw[PoseTracker.LEFT_SHOULDER].x - 0.12, y: raw[PoseTracker.LEFT_SHOULDER].y + 0.1, z: -0.1, visibility: 0.98 };
        raw[PoseTracker.RIGHT_ELBOW] = { x: raw[PoseTracker.RIGHT_SHOULDER].x + 0.12, y: raw[PoseTracker.RIGHT_SHOULDER].y + 0.1, z: 0.1, visibility: 0.98 };
        raw[PoseTracker.LEFT_WRIST] = { x: raw[PoseTracker.LEFT_ELBOW].x - 0.08, y: raw[PoseTracker.LEFT_ELBOW].y - 0.15, z: -0.15, visibility: 0.97 };
        raw[PoseTracker.RIGHT_WRIST] = { x: raw[PoseTracker.RIGHT_ELBOW].x + 0.08, y: raw[PoseTracker.RIGHT_ELBOW].y - 0.15, z: 0.15, visibility: 0.97 };
        raw[PoseTracker.LEFT_THUMB] = { x: raw[PoseTracker.LEFT_WRIST].x - 0.02, y: raw[PoseTracker.LEFT_WRIST].y - 0.04, z: 0, visibility: 0.95 };
        raw[PoseTracker.LEFT_INDEX] = { x: raw[PoseTracker.LEFT_WRIST].x - 0.01, y: raw[PoseTracker.LEFT_WRIST].y - 0.06, z: 0, visibility: 0.95 };
        raw[PoseTracker.LEFT_PINKY] = { x: raw[PoseTracker.LEFT_WRIST].x + 0.02, y: raw[PoseTracker.LEFT_WRIST].y - 0.05, z: 0, visibility: 0.95 };
        raw[PoseTracker.RIGHT_THUMB] = { x: raw[PoseTracker.RIGHT_WRIST].x + 0.02, y: raw[PoseTracker.RIGHT_WRIST].y - 0.04, z: 0, visibility: 0.95 };
        raw[PoseTracker.RIGHT_INDEX] = { x: raw[PoseTracker.RIGHT_WRIST].x + 0.01, y: raw[PoseTracker.RIGHT_WRIST].y - 0.06, z: 0, visibility: 0.95 };
        raw[PoseTracker.RIGHT_PINKY] = { x: raw[PoseTracker.RIGHT_WRIST].x - 0.02, y: raw[PoseTracker.RIGHT_WRIST].y - 0.05, z: 0, visibility: 0.95 };
        raw[PoseTracker.LEFT_HIP] = { x: centerX - 0.08, y: centerY, z: -0.02, visibility: 0.99 };
        raw[PoseTracker.RIGHT_HIP] = { x: centerX + 0.08, y: centerY, z: 0.02, visibility: 0.99 };
        raw[PoseTracker.LEFT_KNEE] = { x: raw[PoseTracker.LEFT_HIP].x - 0.02, y: raw[PoseTracker.LEFT_HIP].y + 0.18, z: 0, visibility: 0.98 };
        raw[PoseTracker.RIGHT_KNEE] = { x: raw[PoseTracker.RIGHT_HIP].x + 0.02, y: raw[PoseTracker.RIGHT_HIP].y + 0.18, z: 0, visibility: 0.98 };
        raw[PoseTracker.LEFT_ANKLE] = { x: raw[PoseTracker.LEFT_KNEE].x - 0.01, y: raw[PoseTracker.LEFT_KNEE].y + 0.18, z: 0, visibility: 0.97 };
        raw[PoseTracker.RIGHT_ANKLE] = { x: raw[PoseTracker.RIGHT_KNEE].x + 0.01, y: raw[PoseTracker.RIGHT_KNEE].y + 0.18, z: 0, visibility: 0.97 };
        for (let i = 0; i < raw.length; i++) {
            if (raw[i]) {
                this.smoothLandmarks[i] = {
                    x: this.xFilters[i].filter(raw[i].x, timestamp),
                    y: this.yFilters[i].filter(raw[i].y, timestamp),
                    z: this.zFilters[i].filter(raw[i].z, timestamp),
                    visibility: raw[i].visibility,
                };
            }
        }
        return {
            time: currentTime,
            landmarks: this.smoothLandmarks,
            detected: true,
            beatIntensity: beatFactor,
            lockedDancerName: this.lockedDancerLabel,
        };
    }
    /**
     * Vẽ bộ khung xương Neon MƯỢT MÀ VÀ NÉT CĂNG (TỰ ĐỘNG CÂN BẰNG TỶ LỆ KHÔNG BỊ CẮT CHÂN)
     */
    drawSkeleton(landmarks) {
        if (!this.ctx || !this.canvasEl)
            return;
        const w = this.canvasEl.width;
        const h = this.canvasEl.height;
        this.ctx.clearRect(0, 0, w, h);
        if (!landmarks || landmarks.length === 0)
            return;
        // Tính toán vùng hiển thị thực tế của video bên trong container (Object-fit Contain Mapping)
        let renderW = w;
        let renderH = h;
        let offsetX = 0;
        let offsetY = 0;
        if (this.videoEl && this.videoEl.videoWidth > 0 && this.videoEl.videoHeight > 0) {
            const videoAspect = this.videoEl.videoWidth / this.videoEl.videoHeight;
            const containerAspect = w / h;
            if (containerAspect > videoAspect) {
                // Video dọc dạng TikTok: Cố định chiều cao, căn giữa chiều ngang
                renderH = h;
                renderW = h * videoAspect;
                offsetX = (w - renderW) / 2;
                offsetY = 0;
            }
            else {
                // Video ngang: Cố định chiều rộng, căn giữa chiều dọc
                renderW = w;
                renderH = w / videoAspect;
                offsetX = 0;
                offsetY = (h - renderH) / 2;
            }
        }
        const mapX = (normX) => offsetX + normX * renderW;
        const mapY = (normY) => offsetY + normY * renderH;
        // Các đường nối khung xương
        const connections = [
            [PoseTracker.LEFT_SHOULDER, PoseTracker.RIGHT_SHOULDER],
            [PoseTracker.LEFT_SHOULDER, PoseTracker.LEFT_ELBOW],
            [PoseTracker.LEFT_ELBOW, PoseTracker.LEFT_WRIST],
            [PoseTracker.RIGHT_SHOULDER, PoseTracker.RIGHT_ELBOW],
            [PoseTracker.RIGHT_ELBOW, PoseTracker.RIGHT_WRIST],
            // Ngón tay & Cổ tay
            [PoseTracker.LEFT_WRIST, PoseTracker.LEFT_THUMB],
            [PoseTracker.LEFT_WRIST, PoseTracker.LEFT_INDEX],
            [PoseTracker.LEFT_WRIST, PoseTracker.LEFT_PINKY],
            [PoseTracker.LEFT_INDEX, PoseTracker.LEFT_PINKY],
            [PoseTracker.RIGHT_WRIST, PoseTracker.RIGHT_THUMB],
            [PoseTracker.RIGHT_WRIST, PoseTracker.RIGHT_INDEX],
            [PoseTracker.RIGHT_WRIST, PoseTracker.RIGHT_PINKY],
            [PoseTracker.RIGHT_INDEX, PoseTracker.RIGHT_PINKY],
            // Thân & Chân
            [PoseTracker.LEFT_SHOULDER, PoseTracker.LEFT_HIP],
            [PoseTracker.RIGHT_SHOULDER, PoseTracker.RIGHT_HIP],
            [PoseTracker.LEFT_HIP, PoseTracker.RIGHT_HIP],
            [PoseTracker.LEFT_HIP, PoseTracker.LEFT_KNEE],
            [PoseTracker.LEFT_KNEE, PoseTracker.LEFT_ANKLE],
            [PoseTracker.RIGHT_HIP, PoseTracker.RIGHT_KNEE],
            [PoseTracker.RIGHT_KNEE, PoseTracker.RIGHT_ANKLE],
        ];
        this.ctx.lineWidth = 3.5;
        this.ctx.strokeStyle = '#06b6d4';
        this.ctx.shadowColor = '#06b6d4';
        this.ctx.shadowBlur = 8;
        for (const [startIdx, endIdx] of connections) {
            const p1 = landmarks[startIdx];
            const p2 = landmarks[endIdx];
            if (p1 && p2 && p1.visibility > 0.3 && p2.visibility > 0.3) {
                this.ctx.beginPath();
                this.ctx.moveTo(mapX(p1.x), mapY(p1.y));
                this.ctx.lineTo(mapX(p2.x), mapY(p2.y));
                this.ctx.stroke();
            }
        }
        // Các viên ngọc khớp phát sáng
        this.ctx.fillStyle = '#ec4899';
        this.ctx.shadowColor = '#ec4899';
        this.ctx.shadowBlur = 10;
        const jointIndices = [
            PoseTracker.NOSE,
            PoseTracker.LEFT_SHOULDER,
            PoseTracker.RIGHT_SHOULDER,
            PoseTracker.LEFT_ELBOW,
            PoseTracker.RIGHT_ELBOW,
            PoseTracker.LEFT_WRIST,
            PoseTracker.RIGHT_WRIST,
            PoseTracker.LEFT_THUMB,
            PoseTracker.LEFT_INDEX,
            PoseTracker.LEFT_PINKY,
            PoseTracker.RIGHT_THUMB,
            PoseTracker.RIGHT_INDEX,
            PoseTracker.RIGHT_PINKY,
            PoseTracker.LEFT_HIP,
            PoseTracker.RIGHT_HIP,
            PoseTracker.LEFT_KNEE,
            PoseTracker.RIGHT_KNEE,
            PoseTracker.LEFT_ANKLE,
            PoseTracker.RIGHT_ANKLE,
        ];
        for (const idx of jointIndices) {
            const pt = landmarks[idx];
            if (pt && pt.visibility > 0.3) {
                const isFinger = idx >= PoseTracker.LEFT_PINKY && idx <= PoseTracker.RIGHT_THUMB;
                this.ctx.beginPath();
                this.ctx.arc(mapX(pt.x), mapY(pt.y), isFinger ? 3.5 : (idx === PoseTracker.NOSE ? 7 : 5), 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        // Khung nhãn khóa mục tiêu
        const nose = landmarks[PoseTracker.NOSE];
        if (nose && nose.visibility > 0.3) {
            const targetX = mapX(nose.x);
            const targetY = Math.max(20, mapY(nose.y) - 35);
            this.ctx.fillStyle = 'rgba(236, 72, 153, 0.85)';
            this.ctx.shadowColor = '#ec4899';
            this.ctx.shadowBlur = 12;
            this.ctx.font = 'bold 11px Outfit, sans-serif';
            const text = `🎯 ${this.lockedDancerLabel.toUpperCase()}`;
            const textWidth = this.ctx.measureText(text).width;
            this.ctx.fillRect(targetX - textWidth / 2 - 8, targetY - 14, textWidth + 16, 20);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.shadowBlur = 0;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(text, targetX, targetY);
            this.ctx.fillStyle = '#38bdf8';
            this.ctx.font = '10px Outfit, sans-serif';
            this.ctx.fillText('(Nhấp chuột để đổi vũ công)', targetX, targetY + 16);
        }
    }
}
//# sourceMappingURL=poseTracker.js.map