import * as THREE from 'three';
import { CharacterPreset } from '../presets';
import { RigPoseTarget } from './boneRetarget';

export class CharacterRig {
  public group: THREE.Group;
  public preset: CharacterPreset;
  
  // Bone / Joint Nodes
  private rootBone: THREE.Group;
  private spineBone: THREE.Group;
  private chestBone: THREE.Group;
  private neckBone: THREE.Group;
  private headBone: THREE.Group;
  
  private leftShoulderBone: THREE.Group;
  private leftUpperArmBone: THREE.Group;
  private leftForeArmBone: THREE.Group;
  private leftHand: THREE.Group;
  
  private rightShoulderBone: THREE.Group;
  private rightUpperArmBone: THREE.Group;
  private rightForeArmBone: THREE.Group;
  private rightHand: THREE.Group;
  
  private leftThighBone: THREE.Group;
  private leftShinBone: THREE.Group;
  private leftFoot: THREE.Mesh;
  
  private rightThighBone: THREE.Group;
  private rightShinBone: THREE.Group;
  private rightFoot: THREE.Mesh;
  
  private leftWing: THREE.Group | null = null;
  private rightWing: THREE.Group | null = null;
  private hairStrands: THREE.Group[] = [];

  constructor(preset: CharacterPreset) {
    this.preset = preset;
    this.group = new THREE.Group();
    this.group.scale.set(preset.scale, preset.scale, preset.scale);

    // Initialize Rig Hierarchy Nodes
    this.rootBone = new THREE.Group();
    this.spineBone = new THREE.Group();
    this.chestBone = new THREE.Group();
    this.neckBone = new THREE.Group();
    this.headBone = new THREE.Group();

    this.leftShoulderBone = new THREE.Group();
    this.leftUpperArmBone = new THREE.Group();
    this.leftForeArmBone = new THREE.Group();
    this.leftHand = new THREE.Group();

    this.rightShoulderBone = new THREE.Group();
    this.rightUpperArmBone = new THREE.Group();
    this.rightForeArmBone = new THREE.Group();
    this.rightHand = new THREE.Group();

    this.leftThighBone = new THREE.Group();
    this.leftShinBone = new THREE.Group();
    this.leftFoot = new THREE.Mesh();

    this.rightThighBone = new THREE.Group();
    this.rightShinBone = new THREE.Group();
    this.rightFoot = new THREE.Mesh();

    if (preset.modelType === 'stickman' || preset.modelType === 'skeleton') {
      this.buildNeonStickmanModel();
    } else {
      this.buildAnimeHumanoidModel();
    }
  }

  /**
   * XÂY DỰNG MÔ HÌNH NGƯỜI QUE / KHUNG XƯƠNG NEON 3D SIÊU CHI TIẾT
   * Nhìn rõ 100% từng khớp xương, khuỷu tay, cổ tay, ngón tay múa dẻo không bị che khuất
   */
  private buildNeonStickmanModel() {
    const lColor = new THREE.Color(this.preset.leftHandColor);  // Xanh Cyan dạ quang
    const rColor = new THREE.Color(this.preset.rightHandColor); // Hồng Neon dạ quang
    const coreColor = new THREE.Color('#ffffff');               // Khung xương Trắng phát sáng
    const hipColor = new THREE.Color(this.preset.primaryColor);

    // Materials phát sáng Neon (Glow Materials)
    const boneMat = new THREE.MeshStandardMaterial({
      color: coreColor,
      emissive: coreColor,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8,
    });
    const jointMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });

    const lArmMat = new THREE.MeshStandardMaterial({
      color: lColor,
      emissive: lColor,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    });
    const rArmMat = new THREE.MeshStandardMaterial({
      color: rColor,
      emissive: rColor,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    });

    const lGlowMat = new THREE.MeshBasicMaterial({ color: lColor });
    const rGlowMat = new THREE.MeshBasicMaterial({ color: rColor });

    // 1. Root / Hips (Khung chậu Neon)
    this.group.add(this.rootBone);
    this.rootBone.position.y = 1.35;

    const hipJointGeo = new THREE.SphereGeometry(0.065, 16, 16);
    const hipJoint = new THREE.Mesh(hipJointGeo, new THREE.MeshBasicMaterial({ color: hipColor }));
    this.rootBone.add(hipJoint);

    const hipBarGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.28, 12);
    const hipBar = new THREE.Mesh(hipBarGeo, boneMat);
    hipBar.rotation.z = Math.PI / 2;
    this.rootBone.add(hipBar);

    // 2. Spine & Chest (Cột sống & Khung xương sườn Neon)
    this.rootBone.add(this.spineBone);
    this.spineBone.position.y = 0.12;

    const spineBarGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.16, 12);
    const spineBar = new THREE.Mesh(spineBarGeo, boneMat);
    spineBar.position.y = 0.08;
    this.spineBone.add(spineBar);

    this.spineBone.add(this.chestBone);
    this.chestBone.position.y = 0.16;

    const chestBarGeo = new THREE.CylinderGeometry(0.03, 0.025, 0.22, 12);
    const chestBar = new THREE.Mesh(chestBarGeo, boneMat);
    chestBar.position.y = 0.11;
    this.chestBone.add(chestBar);

    // Vòng xương sườn Neon
    const ribGeo = new THREE.TorusGeometry(0.14, 0.015, 8, 20);
    const ribMesh = new THREE.Mesh(ribGeo, boneMat);
    ribMesh.rotation.x = Math.PI / 2;
    ribMesh.position.y = 0.11;
    this.chestBone.add(ribMesh);

    // Thanh vai ngang
    const shoulderBarGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.44, 12);
    const shoulderBar = new THREE.Mesh(shoulderBarGeo, boneMat);
    shoulderBar.rotation.z = Math.PI / 2;
    shoulderBar.position.set(0, 0.18, 0.06);
    this.chestBone.add(shoulderBar);

    // 3. Neck & Head (Đầu Người Que Neon)
    this.chestBone.add(this.neckBone);
    this.neckBone.position.y = 0.23;

    const neckBarGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.1, 8);
    const neckBar = new THREE.Mesh(neckBarGeo, boneMat);
    neckBar.position.y = 0.05;
    this.neckBone.add(neckBar);

    this.neckBone.add(this.headBone);
    this.headBone.position.y = 0.1;

    // Đầu người que tròn phát sáng
    const headSphereGeo = new THREE.SphereGeometry(0.14, 24, 24);
    const headSphere = new THREE.Mesh(headSphereGeo, new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    this.headBone.add(headSphere);

    // Mắt Neon mặt trước
    const eyeGeo = new THREE.SphereGeometry(0.025, 12, 12);
    const lEye = new THREE.Mesh(eyeGeo, lGlowMat);
    lEye.position.set(-0.05, 0.01, 0.13);
    this.headBone.add(lEye);

    const rEye = new THREE.Mesh(eyeGeo, rGlowMat);
    rEye.position.set(0.05, 0.01, 0.13);
    this.headBone.add(rEye);

    // 4. CÁNH TAY TRÁI NGƯỜI QUE (CYAN XANH DẠ QUANG)
    this.chestBone.add(this.leftShoulderBone);
    this.leftShoulderBone.position.set(-0.22, 0.18, 0.08);

    const jointGeo = new THREE.SphereGeometry(0.038, 14, 14);
    const lShoulderJoint = new THREE.Mesh(jointGeo, lGlowMat);
    this.leftShoulderBone.add(lShoulderJoint);

    this.leftShoulderBone.add(this.leftUpperArmBone);
    const armTubeGeo = new THREE.CylinderGeometry(0.022, 0.02, 0.3, 12);
    const lUpperTube = new THREE.Mesh(armTubeGeo, lArmMat);
    lUpperTube.position.y = -0.15;
    this.leftUpperArmBone.add(lUpperTube);

    this.leftUpperArmBone.add(this.leftForeArmBone);
    this.leftForeArmBone.position.y = -0.3;

    const lElbowJoint = new THREE.Mesh(jointGeo, lGlowMat);
    this.leftForeArmBone.add(lElbowJoint);

    const foreArmTubeGeo = new THREE.CylinderGeometry(0.02, 0.018, 0.28, 12);
    const lForeTube = new THREE.Mesh(foreArmTubeGeo, lArmMat);
    lForeTube.position.y = -0.14;
    this.leftForeArmBone.add(lForeTube);

    // Cổ tay & Ngón tay người que trái múa dẻo
    const wristJointGeo = new THREE.SphereGeometry(0.028, 12, 12);
    const lWristJoint = new THREE.Mesh(wristJointGeo, lGlowMat);
    this.leftHand.add(lWristJoint);

    // Các ngón tay dạ quang người que
    for (let f = -1; f <= 1; f++) {
      const fingerGeo = new THREE.CylinderGeometry(0.008, 0.006, 0.08, 6);
      const finger = new THREE.Mesh(fingerGeo, lGlowMat);
      finger.position.set(f * 0.016, -0.05, 0);
      this.leftHand.add(finger);
    }
    this.leftHand.position.y = -0.29;
    this.leftForeArmBone.add(this.leftHand);

    // 5. CÁNH TAY PHẢI NGƯỜI QUE (PINK HỒNG NEON)
    this.chestBone.add(this.rightShoulderBone);
    this.rightShoulderBone.position.set(0.22, 0.18, 0.08);

    const rShoulderJoint = new THREE.Mesh(jointGeo, rGlowMat);
    this.rightShoulderBone.add(rShoulderJoint);

    this.rightShoulderBone.add(this.rightUpperArmBone);
    const rUpperTube = new THREE.Mesh(armTubeGeo, rArmMat);
    rUpperTube.position.y = -0.15;
    this.rightUpperArmBone.add(rUpperTube);

    this.rightUpperArmBone.add(this.rightForeArmBone);
    this.rightForeArmBone.position.y = -0.3;

    const rElbowJoint = new THREE.Mesh(jointGeo, rGlowMat);
    this.rightForeArmBone.add(rElbowJoint);

    const rForeTube = new THREE.Mesh(foreArmTubeGeo, rArmMat);
    rForeTube.position.y = -0.14;
    this.rightForeArmBone.add(rForeTube);

    // Cổ tay & Ngón tay người que phải
    const rWristJoint = new THREE.Mesh(wristJointGeo, rGlowMat);
    this.rightHand.add(rWristJoint);

    for (let f = -1; f <= 1; f++) {
      const fingerGeo = new THREE.CylinderGeometry(0.008, 0.006, 0.08, 6);
      const finger = new THREE.Mesh(fingerGeo, rGlowMat);
      finger.position.set(f * 0.016, -0.05, 0);
      this.rightHand.add(finger);
    }
    this.rightHand.position.y = -0.29;
    this.rightForeArmBone.add(this.rightHand);

    // 6. CHÂN TRÁI NGƯỜI QUE (CYAN XANH)
    this.rootBone.add(this.leftThighBone);
    this.leftThighBone.position.set(-0.12, -0.08, 0);

    const lHipJoint = new THREE.Mesh(jointGeo, lGlowMat);
    this.leftThighBone.add(lHipJoint);

    const thighTubeGeo = new THREE.CylinderGeometry(0.026, 0.022, 0.44, 12);
    const lThighTube = new THREE.Mesh(thighTubeGeo, lArmMat);
    lThighTube.position.y = -0.22;
    this.leftThighBone.add(lThighTube);

    this.leftThighBone.add(this.leftShinBone);
    this.leftShinBone.position.y = -0.44;

    const lKneeJoint = new THREE.Mesh(jointGeo, lGlowMat);
    this.leftShinBone.add(lKneeJoint);

    const shinTubeGeo = new THREE.CylinderGeometry(0.022, 0.018, 0.46, 12);
    const lShinTube = new THREE.Mesh(shinTubeGeo, lArmMat);
    lShinTube.position.y = -0.23;
    this.leftShinBone.add(lShinTube);

    // Bàn chân người que trái
    const footGeo = new THREE.BoxGeometry(0.06, 0.04, 0.16);
    this.leftFoot = new THREE.Mesh(footGeo, lGlowMat);
    this.leftFoot.position.set(0, -0.48, 0.06);
    this.leftShinBone.add(this.leftFoot);

    // 7. CHÂN PHẢI NGƯỜI QUE (PINK HỒNG)
    this.rootBone.add(this.rightThighBone);
    this.rightThighBone.position.set(0.12, -0.08, 0);

    const rHipJoint = new THREE.Mesh(jointGeo, rGlowMat);
    this.rightThighBone.add(rHipJoint);

    const rThighTube = new THREE.Mesh(thighTubeGeo, rArmMat);
    rThighTube.position.y = -0.22;
    this.rightThighBone.add(rThighTube);

    this.rightThighBone.add(this.rightShinBone);
    this.rightShinBone.position.y = -0.44;

    const rKneeJoint = new THREE.Mesh(jointGeo, rGlowMat);
    this.rightShinBone.add(rKneeJoint);

    const rShinTube = new THREE.Mesh(shinTubeGeo, rArmMat);
    rShinTube.position.y = -0.23;
    this.rightShinBone.add(rShinTube);

    this.rightFoot = new THREE.Mesh(footGeo, rGlowMat);
    this.rightFoot.position.set(0, -0.48, 0.06);
    this.rightShinBone.add(this.rightFoot);
  }

  /**
   * XÂY DỰNG MÔ HÌNH NHÂN VẬT ANIME ĐẸP XINH
   */
  private buildAnimeHumanoidModel() {
    const pColor = new THREE.Color(this.preset.primaryColor);
    const aColor = new THREE.Color(this.preset.accentColor);
    const skinColor = new THREE.Color('#ffe7d6');
    const eyeIrisColor = new THREE.Color('#2563eb');
    const lHandColor = new THREE.Color(this.preset.leftHandColor);
    const rHandColor = new THREE.Color(this.preset.rightHandColor);
    const whiteColor = new THREE.Color('#ffffff');

    const skinMat = new THREE.MeshToonMaterial({ color: skinColor });
    const outfitMat = new THREE.MeshStandardMaterial({ color: pColor, roughness: 0.35, metalness: 0.15 });
    const outfitTrimMat = new THREE.MeshStandardMaterial({ color: aColor, roughness: 0.2, metalness: 0.4, emissive: aColor, emissiveIntensity: 0.35 });
    const hairMat = new THREE.MeshToonMaterial({ color: pColor.clone().offsetHSL(0.02, 0.2, -0.05) });

    const lGlowMat = new THREE.MeshBasicMaterial({ color: lHandColor });
    const rGlowMat = new THREE.MeshBasicMaterial({ color: rHandColor });

    // 1. Root / Hips
    this.group.add(this.rootBone);
    this.rootBone.position.y = 1.35;

    const hipGeo = new THREE.CylinderGeometry(0.14, 0.12, 0.18, 16);
    const hipMesh = new THREE.Mesh(hipGeo, outfitMat);
    this.rootBone.add(hipMesh);

    if (this.preset.outfitStyle === 'idol_dress' || this.preset.outfitStyle === 'audition_gown') {
      const skirtGeo = new THREE.ConeGeometry(0.32, 0.26, 18, 1, true);
      const skirtMesh = new THREE.Mesh(skirtGeo, outfitMat);
      skirtMesh.rotation.x = Math.PI;
      skirtMesh.position.y = -0.04;
      this.rootBone.add(skirtMesh);

      const rimGeo = new THREE.TorusGeometry(0.32, 0.015, 8, 24);
      const rimMesh = new THREE.Mesh(rimGeo, outfitTrimMat);
      rimMesh.rotation.x = Math.PI / 2;
      rimMesh.position.y = -0.16;
      this.rootBone.add(rimMesh);
    }

    // 2. Spine & Chest
    this.rootBone.add(this.spineBone);
    this.spineBone.position.y = 0.12;

    const waistGeo = new THREE.CylinderGeometry(0.12, 0.13, 0.16, 16);
    const waistMesh = new THREE.Mesh(waistGeo, outfitMat);
    waistMesh.position.y = 0.08;
    this.spineBone.add(waistMesh);

    this.spineBone.add(this.chestBone);
    this.chestBone.position.y = 0.16;

    const chestGeo = new THREE.CylinderGeometry(0.16, 0.12, 0.22, 16);
    const chestMesh = new THREE.Mesh(chestGeo, outfitMat);
    chestMesh.position.y = 0.11;
    this.chestBone.add(chestMesh);

    const tieGeo = new THREE.ConeGeometry(0.04, 0.15, 4);
    const tieMesh = new THREE.Mesh(tieGeo, outfitTrimMat);
    tieMesh.position.set(0, 0.12, 0.16);
    tieMesh.rotation.x = Math.PI;
    this.chestBone.add(tieMesh);

    // 3. Neck & Head
    this.chestBone.add(this.neckBone);
    this.neckBone.position.y = 0.23;

    const neckGeo = new THREE.CylinderGeometry(0.05, 0.055, 0.12, 12);
    const neckMesh = new THREE.Mesh(neckGeo, skinMat);
    neckMesh.position.y = 0.06;
    this.neckBone.add(neckMesh);

    this.neckBone.add(this.headBone);
    this.headBone.position.y = 0.11;

    const headGeo = new THREE.SphereGeometry(0.18, 24, 24);
    headGeo.scale(0.92, 1.05, 0.95);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    this.headBone.add(headMesh);

    // Mắt Anime
    const scleraGeo = new THREE.SphereGeometry(0.048, 16, 16);
    scleraGeo.scale(1, 1.25, 0.2);
    const lSclera = new THREE.Mesh(scleraGeo, new THREE.MeshBasicMaterial({ color: whiteColor }));
    lSclera.position.set(-0.068, 0.015, 0.165);
    this.headBone.add(lSclera);

    const rSclera = new THREE.Mesh(scleraGeo, new THREE.MeshBasicMaterial({ color: whiteColor }));
    rSclera.position.set(0.068, 0.015, 0.165);
    this.headBone.add(rSclera);

    const irisGeo = new THREE.SphereGeometry(0.036, 16, 16);
    irisGeo.scale(0.9, 1.2, 0.2);
    const lIris = new THREE.Mesh(irisGeo, new THREE.MeshBasicMaterial({ color: eyeIrisColor }));
    lIris.position.set(-0.068, 0.015, 0.176);
    this.headBone.add(lIris);

    const rIris = new THREE.Mesh(irisGeo, new THREE.MeshBasicMaterial({ color: eyeIrisColor }));
    rIris.position.set(0.068, 0.015, 0.176);
    this.headBone.add(rIris);

    // Tóc sau gáy & đỉnh đầu
    const hairBackGeo = new THREE.SphereGeometry(0.185, 20, 20, Math.PI * 0.5, Math.PI, 0, Math.PI * 0.75);
    const hairBackMesh = new THREE.Mesh(hairBackGeo, hairMat);
    hairBackMesh.position.set(0, 0.02, -0.01);
    this.headBone.add(hairBackMesh);

    // 4. Cánh tay trái
    this.chestBone.add(this.leftShoulderBone);
    this.leftShoulderBone.position.set(-0.2, 0.18, 0.08);

    const shoulderJointGeo = new THREE.SphereGeometry(0.045, 12, 12);
    const lShoulderJoint = new THREE.Mesh(shoulderJointGeo, skinMat);
    this.leftShoulderBone.add(lShoulderJoint);

    this.leftShoulderBone.add(this.leftUpperArmBone);
    const upperArmGeo = new THREE.CylinderGeometry(0.04, 0.035, 0.28, 12);
    const lUpperMesh = new THREE.Mesh(upperArmGeo, skinMat);
    lUpperMesh.position.y = -0.14;
    this.leftUpperArmBone.add(lUpperMesh);

    this.leftUpperArmBone.add(this.leftForeArmBone);
    this.leftForeArmBone.position.y = -0.28;

    const elbowJointGeo = new THREE.SphereGeometry(0.035, 12, 12);
    const lElbowJoint = new THREE.Mesh(elbowJointGeo, skinMat);
    this.leftForeArmBone.add(lElbowJoint);

    const foreArmGeo = new THREE.CylinderGeometry(0.035, 0.03, 0.26, 12);
    const lForeMesh = new THREE.Mesh(foreArmGeo, skinMat);
    lForeMesh.position.y = -0.13;
    this.leftForeArmBone.add(lForeMesh);

    const palmGeo = new THREE.BoxGeometry(0.045, 0.055, 0.02);
    const lPalm = new THREE.Mesh(palmGeo, skinMat);
    lPalm.position.y = -0.028;
    this.leftHand.add(lPalm);

    this.leftHand.position.y = -0.27;
    this.leftForeArmBone.add(this.leftHand);

    // 5. Cánh tay phải
    this.chestBone.add(this.rightShoulderBone);
    this.rightShoulderBone.position.set(0.2, 0.18, 0.08);

    const rShoulderJoint = new THREE.Mesh(shoulderJointGeo, skinMat);
    this.rightShoulderBone.add(rShoulderJoint);

    this.rightShoulderBone.add(this.rightUpperArmBone);
    const rUpperMesh = new THREE.Mesh(upperArmGeo, skinMat);
    rUpperMesh.position.y = -0.14;
    this.rightUpperArmBone.add(rUpperMesh);

    this.rightUpperArmBone.add(this.rightForeArmBone);
    this.rightForeArmBone.position.y = -0.28;

    const rElbowJoint = new THREE.Mesh(elbowJointGeo, skinMat);
    this.rightForeArmBone.add(rElbowJoint);

    const rForeMesh = new THREE.Mesh(foreArmGeo, skinMat);
    rForeMesh.position.y = -0.13;
    this.rightForeArmBone.add(rForeMesh);

    const rPalm = new THREE.Mesh(palmGeo, skinMat);
    rPalm.position.y = -0.028;
    this.rightHand.add(rPalm);

    this.rightHand.position.y = -0.27;
    this.rightForeArmBone.add(this.rightHand);

    // 6. Chân trái & Chân phải
    this.rootBone.add(this.leftThighBone);
    this.leftThighBone.position.set(-0.1, -0.08, 0);

    const thighGeo = new THREE.CylinderGeometry(0.06, 0.045, 0.42, 14);
    const lThighMesh = new THREE.Mesh(thighGeo, skinMat);
    lThighMesh.position.y = -0.21;
    this.leftThighBone.add(lThighMesh);

    this.leftThighBone.add(this.leftShinBone);
    this.leftShinBone.position.y = -0.42;

    const shinGeo = new THREE.CylinderGeometry(0.045, 0.038, 0.44, 14);
    const lShinMesh = new THREE.Mesh(shinGeo, skinMat);
    lShinMesh.position.y = -0.22;
    this.leftShinBone.add(lShinMesh);

    const shoeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.18);
    this.leftFoot = new THREE.Mesh(shoeGeo, lGlowMat);
    this.leftFoot.position.set(0, -0.47, 0.05);
    this.leftShinBone.add(this.leftFoot);

    this.rootBone.add(this.rightThighBone);
    this.rightThighBone.position.set(0.1, -0.08, 0);

    const rThighMesh = new THREE.Mesh(thighGeo, skinMat);
    rThighMesh.position.y = -0.21;
    this.rightThighBone.add(rThighMesh);

    this.rightThighBone.add(this.rightShinBone);
    this.rightShinBone.position.y = -0.42;

    const rShinMesh = new THREE.Mesh(shinGeo, skinMat);
    rShinMesh.position.y = -0.22;
    this.rightShinBone.add(rShinMesh);

    this.rightFoot = new THREE.Mesh(shoeGeo, rGlowMat);
    this.rightFoot.position.set(0, -0.47, 0.05);
    this.rightShinBone.add(this.rightFoot);
  }

  /**
   * Cập nhật tư thế khớp xương của nhân vật từ bộ phân tích AI Retarget
   */
  public applyPose(target: RigPoseTarget, time: number) {
    // 1. Root & Position (Luôn đứng vững trên sàn, HƯỚNG THẲNG MẶT RA CAMERA)
    this.group.position.x = THREE.MathUtils.lerp(this.group.position.x, target.rootPosition.x, 0.35);
    this.group.position.y = THREE.MathUtils.lerp(this.group.position.y, Math.max(0, target.rootPosition.y), 0.35);
    this.group.rotation.set(0, 0, 0);
    this.rootBone.rotation.z = target.rootRotation.z;

    // 2. Spine, Chest & Head
    this.spineBone.rotation.x = target.spineRotation.x;
    this.spineBone.rotation.z = target.spineRotation.z;
    this.chestBone.rotation.z = target.spineRotation.z * 0.5;
    this.headBone.rotation.x = target.headRotation.x;
    this.headBone.rotation.z = target.headRotation.z;

    // 3. Arms & Wrists (Cánh tay, Cẳng tay & Cổ tay múa dẻo)
    this.leftUpperArmBone.rotation.set(target.leftArm.upperArm.x, target.leftArm.upperArm.y, target.leftArm.upperArm.z);
    this.leftForeArmBone.rotation.set(target.leftArm.foreArm.x, target.leftArm.foreArm.y, target.leftArm.foreArm.z);
    this.leftHand.rotation.set(target.leftArm.wrist.x, target.leftArm.wrist.y, target.leftArm.wrist.z);

    this.rightUpperArmBone.rotation.set(target.rightArm.upperArm.x, target.rightArm.upperArm.y, target.rightArm.upperArm.z);
    this.rightForeArmBone.rotation.set(target.rightArm.foreArm.x, target.rightArm.foreArm.y, target.rightArm.foreArm.z);
    this.rightHand.rotation.set(target.rightArm.wrist.x, target.rightArm.wrist.y, target.rightArm.wrist.z);

    // 4. Legs (Đùi & Bắp chân)
    this.leftThighBone.rotation.x = target.leftLeg.upperLeg.x;
    this.leftShinBone.rotation.x = target.leftLeg.lowerLeg.x;
    this.rightThighBone.rotation.x = target.rightLeg.upperLeg.x;
    this.rightShinBone.rotation.x = target.rightLeg.lowerLeg.x;

    // 5. Secondary Animation
    if (this.leftWing && this.rightWing) {
      const wingFlutter = Math.sin(time * 5) * 0.12;
      this.leftWing.rotation.y = -wingFlutter;
      this.rightWing.rotation.y = wingFlutter;
    }

    for (let i = 0; i < this.hairStrands.length; i++) {
      this.hairStrands[i].rotation.x = -0.15 + Math.sin(time * 4 + i) * 0.08;
    }
  }
}
