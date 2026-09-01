import * as THREE from 'three';
import { STAGE_THEMES } from '../presets';
import { CharacterRig } from './characterRig';
export class ThreeScene {
    container;
    scene;
    camera;
    renderer;
    // Characters
    dancers = [];
    mainDancer = null;
    // Stage Elements
    floorGrid = null;
    floorMirror = null;
    spotlights = [];
    laserBeams = [];
    particleField = null;
    ambientLight;
    dirLight;
    stageTheme;
    // Animation & Clock
    clock = new THREE.Clock();
    animationFrameId = null;
    constructor(container, defaultPreset) {
        this.container = container;
        this.stageTheme = STAGE_THEMES[0];
        // 1. Scene & Background
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.stageTheme.ambientColor);
        this.scene.fog = new THREE.FogExp2(this.stageTheme.ambientColor, 0.04);
        // 2. Camera
        const aspect = container.clientWidth / (container.clientHeight || 1);
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
        this.camera.position.set(0, 1.8, 4.8);
        this.camera.lookAt(0, 1.2, 0);
        // 3. Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);
        // 4. Lights
        this.ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        this.scene.add(this.ambientLight);
        this.dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        this.dirLight.position.set(0, 6, 4);
        this.dirLight.castShadow = true;
        this.scene.add(this.dirLight);
        // 5. Build Stage & Spotlights
        this.buildStage();
        this.buildSpotlights();
        this.buildParticles();
        // 6. Spawn Main Dancer
        this.setMainDancer(defaultPreset);
        // 7. Event Listeners
        window.addEventListener('resize', this.onResize);
    }
    setMainDancer(preset) {
        // Remove previous dancers
        for (const d of this.dancers) {
            this.scene.remove(d.group);
        }
        this.dancers = [];
        // Spawn Center Main Dancer
        const centerDancer = new CharacterRig(preset);
        centerDancer.group.position.set(0, 0, 0);
        this.scene.add(centerDancer.group);
        this.dancers.push(centerDancer);
        this.mainDancer = centerDancer;
        // Spawn Left & Right Backup Dancers (for Chinese dance team / group dance)
        const leftDancerPreset = {
            ...preset,
            scale: preset.scale * 0.92,
            primaryColor: '#818cf8',
            accentColor: '#38bdf8',
        };
        const leftDancer = new CharacterRig(leftDancerPreset);
        leftDancer.group.position.set(-1.6, -0.05, -0.4);
        this.scene.add(leftDancer.group);
        this.dancers.push(leftDancer);
        const rightDancerPreset = {
            ...preset,
            scale: preset.scale * 0.92,
            primaryColor: '#f472b6',
            accentColor: '#fbbf24',
        };
        const rightDancer = new CharacterRig(rightDancerPreset);
        rightDancer.group.position.set(1.6, -0.05, -0.4);
        this.scene.add(rightDancer.group);
        this.dancers.push(rightDancer);
    }
    setStageTheme(theme) {
        this.stageTheme = theme;
        this.scene.background = new THREE.Color(theme.ambientColor);
        this.scene.fog = new THREE.FogExp2(theme.ambientColor, 0.04);
        if (this.floorGrid) {
            this.scene.remove(this.floorGrid);
            this.floorGrid = new THREE.GridHelper(16, 24, new THREE.Color(theme.gridColor), new THREE.Color(theme.gridColor));
            this.floorGrid.position.y = 0.01;
            this.scene.add(this.floorGrid);
        }
        // Update spotlights colors
        for (let i = 0; i < this.spotlights.length; i++) {
            const col = theme.spotlightColors[i % theme.spotlightColors.length];
            this.spotlights[i].color.set(col);
        }
    }
    buildStage() {
        // Reflective Floor
        const floorGeo = new THREE.CircleGeometry(8, 32);
        const floorMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(this.stageTheme.floorColor),
            roughness: 0.15,
            metalness: 0.8,
        });
        this.floorMirror = new THREE.Mesh(floorGeo, floorMat);
        this.floorMirror.rotation.x = -Math.PI / 2;
        this.floorMirror.receiveShadow = true;
        this.scene.add(this.floorMirror);
        // Neon Dance Grid
        this.floorGrid = new THREE.GridHelper(16, 24, new THREE.Color(this.stageTheme.gridColor), new THREE.Color(this.stageTheme.gridColor));
        this.floorGrid.position.y = 0.01;
        this.scene.add(this.floorGrid);
    }
    buildSpotlights() {
        const colors = this.stageTheme.spotlightColors;
        const positions = [
            [-3, 5, 2],
            [3, 5, 2],
            [-2, 5, -2],
            [2, 5, -2],
        ];
        for (let i = 0; i < positions.length; i++) {
            const col = new THREE.Color(colors[i % colors.length]);
            const spot = new THREE.SpotLight(col, 25, 20, Math.PI / 5, 0.4, 1);
            spot.position.set(positions[i][0], positions[i][1], positions[i][2]);
            spot.target.position.set(0, 1, 0);
            this.scene.add(spot);
            this.scene.add(spot.target);
            this.spotlights.push(spot);
        }
    }
    buildParticles() {
        const pCount = 200;
        const pGeo = new THREE.BufferGeometry();
        const pPos = new Float32Array(pCount * 3);
        const pColors = new Float32Array(pCount * 3);
        for (let i = 0; i < pCount; i++) {
            pPos[i * 3] = (Math.random() - 0.5) * 10;
            pPos[i * 3 + 1] = Math.random() * 5;
            pPos[i * 3 + 2] = (Math.random() - 0.5) * 8;
            const c = new THREE.Color().setHSL(Math.random(), 0.9, 0.6);
            pColors[i * 3] = c.r;
            pColors[i * 3 + 1] = c.g;
            pColors[i * 3 + 2] = c.b;
        }
        pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
        pGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));
        const pMat = new THREE.PointsMaterial({
            size: 0.08,
            vertexColors: true,
            transparent: true,
            opacity: 0.7,
        });
        this.particleField = new THREE.Points(pGeo, pMat);
        this.scene.add(this.particleField);
    }
    updateDancePose(pose, currentTime, beatIntensity = 0) {
        // Update main center dancer
        if (this.mainDancer) {
            this.mainDancer.applyPose(pose, currentTime);
        }
        // Backup dancers dance in sync with slight spatial offset
        for (let i = 1; i < this.dancers.length; i++) {
            const delayPose = {
                ...pose,
                rootPosition: new THREE.Vector3((i === 1 ? -1.6 : 1.6) + pose.rootPosition.x * 0.8, pose.rootPosition.y, -0.4),
            };
            this.dancers[i].applyPose(delayPose, currentTime);
        }
        // Dynamic Spotlight Swing
        for (let i = 0; i < this.spotlights.length; i++) {
            const angle = currentTime * 1.5 + i * (Math.PI / 2);
            this.spotlights[i].position.x = Math.sin(angle) * 3.5;
            this.spotlights[i].position.z = Math.cos(angle) * 2.5;
            this.spotlights[i].intensity = 25 + beatIntensity * 20;
        }
        // Particles Float
        if (this.particleField) {
            const pos = this.particleField.geometry.attributes.position.array;
            for (let i = 1; i < pos.length; i += 3) {
                pos[i] += 0.01 * (1 + beatIntensity);
                if (pos[i] > 5)
                    pos[i] = 0;
            }
            this.particleField.geometry.attributes.position.needsUpdate = true;
        }
    }
    render() {
        this.renderer.render(this.scene, this.camera);
    }
    getCanvas() {
        return this.renderer.domElement;
    }
    onResize = () => {
        if (!this.container)
            return;
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        this.camera.aspect = w / (h || 1);
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    };
    destroy() {
        window.removeEventListener('resize', this.onResize);
        if (this.animationFrameId)
            cancelAnimationFrame(this.animationFrameId);
        this.renderer.dispose();
    }
}
//# sourceMappingURL=threeScene.js.map