import { Landmark, PoseTracker } from './poseTracker';

export interface StepInstruction {
  timeSec: number;
  beatIndex: number;
  moveName: string;
  leftArmDesc: string;
  rightArmDesc: string;
  torsoDesc: string;
  leftLegDesc: string;
  rightLegDesc: string;
  leftElbowAngle: number;
  rightElbowAngle: number;
  leftKneeAngle: number;
  rightKneeAngle: number;
  isKeyPose: boolean;
}

export class DanceInstructor {
  // Bộ đệm ổn định trạng thái chống giật chữ (State Hysteresis & Anti-Jitter)
  private currentMoveName = 'Tư thế sẵn sàng & đón nhịp';
  private currentLeftArmDesc = 'Thả lỏng cánh tay trái buông dọc thân người.';
  private currentRightArmDesc = 'Thả lỏng cánh tay phải buông dọc thân người.';
  private currentTorsoDesc = 'Giữ thẳng lưng, mắt nhìn thẳng về phía trước.';
  private currentLeftLegDesc = 'Chân trái làm trụ đứng thẳng, tiếp đất vững vàng.';
  private currentRightLegDesc = 'Chân phải đứng thẳng, bàn chân hướng ra trước.';

  private candidateMoveName = '';
  private candidateLeftArm = '';
  private candidateRightArm = '';
  private candidateTorso = '';
  private candidateLeftLeg = '';
  private candidateRightLeg = '';
  private candidateStartTime = 0;

  private smoothLAngle = 180;
  private smoothRAngle = 180;
  private smoothLKnee = 180;
  private smoothRKnee = 180;

  /**
   * Phân tích tức thời Pose Landmarks với cơ chế ỔN ĐỊNH TUYỆT ĐỐI (KHÔNG GIẬT CHỮ)
   */
  public analyzeCurrentPose(landmarks: Landmark[], currentTime: number, duration: number): StepInstruction {
    const beatIndex = Math.floor(currentTime * 2.13) % 8 + 1;

    if (!landmarks || landmarks.length < 29) {
      return {
        timeSec: currentTime,
        beatIndex,
        moveName: this.currentMoveName,
        leftArmDesc: this.currentLeftArmDesc,
        rightArmDesc: this.currentRightArmDesc,
        torsoDesc: this.currentTorsoDesc,
        leftLegDesc: this.currentLeftLegDesc,
        rightLegDesc: this.currentRightLegDesc,
        leftElbowAngle: 180,
        rightElbowAngle: 180,
        leftKneeAngle: 180,
        rightKneeAngle: 180,
        isKeyPose: false,
      };
    }

    const leftShoulder = landmarks[PoseTracker.LEFT_SHOULDER];
    const rightShoulder = landmarks[PoseTracker.RIGHT_SHOULDER];
    const leftElbow = landmarks[PoseTracker.LEFT_ELBOW];
    const rightElbow = landmarks[PoseTracker.RIGHT_ELBOW];
    const leftWrist = landmarks[PoseTracker.LEFT_WRIST];
    const rightWrist = landmarks[PoseTracker.RIGHT_WRIST];
    const leftHip = landmarks[PoseTracker.LEFT_HIP];
    const rightHip = landmarks[PoseTracker.RIGHT_HIP];
    const leftKnee = landmarks[PoseTracker.LEFT_KNEE];
    const rightKnee = landmarks[PoseTracker.RIGHT_KNEE];
    const leftAnkle = landmarks[PoseTracker.LEFT_ANKLE];
    const rightAnkle = landmarks[PoseTracker.RIGHT_ANKLE];

    // Tính toán góc gập các khớp và làm mịn bậc cao
    const rawLArm = this.calculateJointAngle(leftShoulder, leftElbow, leftWrist);
    const rawRArm = this.calculateJointAngle(rightShoulder, rightElbow, rightWrist);
    const rawLKnee = this.calculateJointAngle(leftHip, leftKnee, leftAnkle);
    const rawRKnee = this.calculateJointAngle(rightHip, rightKnee, rightAnkle);

    this.smoothLAngle = Math.round(this.smoothLAngle * 0.85 + rawLArm * 0.15);
    this.smoothRAngle = Math.round(this.smoothRAngle * 0.85 + rawRArm * 0.15);
    this.smoothLKnee = Math.round(this.smoothLKnee * 0.85 + rawLKnee * 0.15);
    this.smoothRKnee = Math.round(this.smoothRKnee * 0.85 + rawRKnee * 0.15);

    // 1. Phân loại TAY TRÁI (Cyan) - Câu chữ ổn định tĩnh
    let targetLArm = '';
    const lWristAboveShoulder = leftWrist.y < leftShoulder.y;
    const lWristNearChest = Math.abs(leftWrist.y - leftShoulder.y) < 0.15 && Math.abs(leftWrist.x - leftShoulder.x) < 0.25;

    if (lWristAboveShoulder) {
      targetLArm = 'Giơ cao tay trái qua đầu/vai, cổ tay mở ra trước, ngón tay múa dẻo đón nhịp.';
    } else if (lWristNearChest) {
      targetLArm = 'Co khuỷu tay trái, đặt bàn tay trước ngực/cằm, uốn lượn cổ tay múa dẻo.';
    } else if (this.smoothLAngle < 115) {
      targetLArm = 'Gập khuỷu tay trái góc vuông, bàn tay hướng lên ngang eo/ngực.';
    } else {
      targetLArm = 'Duỗi tay trái sang ngang/xuống dưới, giữ chắc bắp tay tạo đường nét.';
    }

    // 2. Phân loại TAY PHẢI (Pink)
    let targetRArm = '';
    const rWristAboveShoulder = rightWrist.y < rightShoulder.y;
    const rWristNearChest = Math.abs(rightWrist.y - rightShoulder.y) < 0.15 && Math.abs(rightWrist.x - rightShoulder.x) < 0.25;

    if (rWristAboveShoulder) {
      targetRArm = 'Giơ cao tay phải quá đầu/vai, ngón tay xòe múa dẻo theo nhịp.';
    } else if (rWristNearChest) {
      targetRArm = 'Co tay phải đặt trước ngực/mặt, vẫy nhẹ ngón tay tạo dáng.';
    } else if (this.smoothRAngle < 115) {
      targetRArm = 'Gập khuỷu tay phải góc vuông, bàn tay đặt ngang sườn/hông.';
    } else {
      targetRArm = 'Duỗi tay phải sang ngang/xuống dưới, tay thả lỏng tự nhiên.';
    }

    // 3. Phân loại THÂN NGƯỜI & HÔNG
    let targetTorso = '';
    const shoulderTilt = rightShoulder.y - leftShoulder.y;
    const hipTilt = rightHip.y - leftHip.y;
    if (Math.abs(shoulderTilt) > 0.05) {
      targetTorso = shoulderTilt > 0 ? 'Nghiêng vai sang trái, siết nhẹ cơ bụng tạo dáng.' : 'Nghiêng vai sang phải, tạo độ dẻo đường cong.';
    } else if (Math.abs(hipTilt) > 0.04) {
      targetTorso = hipTilt > 0 ? 'Lắc hông sang trái, giữ lưng thẳng theo nhịp nhạc.' : 'Lắc hông sang phải, tạo nhịp nhún uyển chuyển.';
    } else {
      targetTorso = 'Giữ thẳng lưng, ngực mở nhẹ, đầu hướng tự nhiên theo tay múa.';
    }

    // 4. Phân loại CHÂN TRÁI
    let targetLLeg = '';
    const lFootLifted = leftAnkle.y < rightAnkle.y - 0.06;
    const lFootCross = leftAnkle.x > rightAnkle.x;

    if (lFootLifted) {
      targetLLeg = 'Co nhấc gối trái, nhấc bàn chân lên thực hiện động tác bước/đá nhịp.';
    } else if (lFootCross) {
      targetLLeg = 'Bắt chéo chân trái qua bên phải, nhún nhẹ mũi chân.';
    } else if (this.smoothLKnee < 145) {
      targetLLeg = 'Chùng đầu gối trái, dồn trọng tâm nhún nhẹ theo tiếng trống.';
    } else {
      targetLLeg = 'Chân trái làm trụ đứng thẳng, bàn chân tiếp đất vững vàng.';
    }

    // 5. Phân loại CHÂN PHẢI
    let targetRLeg = '';
    const rFootLifted = rightAnkle.y < leftAnkle.y - 0.06;
    const rFootCross = rightAnkle.x < leftAnkle.x;

    if (rFootLifted) {
      targetRLeg = 'Co nhấc gối phải, nhón gót chân nhảy nhịp bốc.';
    } else if (rFootCross) {
      targetRLeg = 'Bắt chéo chân phải qua bên trái, xoay nhẹ mũi giày.';
    } else if (this.smoothRKnee < 145) {
      targetRLeg = 'Chùng đầu gối phải, nhún gối tạo độ nảy cho điệu nhảy.';
    } else {
      targetRLeg = 'Chân phải làm trụ đứng vững, bàn chân hướng về phía trước.';
    }

    // 6. Phân loại TÊN ĐỘNG TÁC
    let targetMove = '';
    if (lFootLifted || rFootLifted) {
      targetMove = `Đá Chân & Nhấc Gối Nhảy Nhịp (Nhịp ${beatIndex}/8)`;
    } else if (lWristAboveShoulder && rWristAboveShoulder) {
      targetMove = `Vung 2 Tay Lên Cao & Nhún Gối (Nhịp ${beatIndex}/8)`;
    } else if (lWristNearChest && rWristNearChest) {
      targetMove = `Bắt Chéo 2 Tay Trước Ngực & Chùng Chân (Nhịp ${beatIndex}/8)`;
    } else if (lWristNearChest || rWristNearChest) {
      targetMove = `Đưa Tay Trước Ngực & Lắc Hông (Nhịp ${beatIndex}/8)`;
    } else if (Math.abs(shoulderTilt) > 0.05 || Math.abs(hipTilt) > 0.04) {
      targetMove = `Đánh Hông & Đổi Trọng Tâm Chân (Nhịp ${beatIndex}/8)`;
    } else {
      targetMove = `Tư Thế Bước Nhịp Vũ Đạo (Nhịp ${beatIndex}/8)`;
    }

    // 7. CƠ CHẾ KHÓA ỔN ĐỊNH THỜI GIAN THỰC (HYSTERESIS GATE 400ms - CHỐNG GIẬT 100%)
    const now = performance.now();
    if (targetMove !== this.candidateMoveName) {
      this.candidateMoveName = targetMove;
      this.candidateLeftArm = targetLArm;
      this.candidateRightArm = targetRArm;
      this.candidateTorso = targetTorso;
      this.candidateLeftLeg = targetLLeg;
      this.candidateRightLeg = targetRLeg;
      this.candidateStartTime = now;
    } else if (now - this.candidateStartTime > 380) {
      // Động tác mới được giữ ổn định trên 0.38 giây -> Chuyển đổi êm ái
      this.currentMoveName = this.candidateMoveName;
      this.currentLeftArmDesc = this.candidateLeftArm;
      this.currentRightArmDesc = this.candidateRightArm;
      this.currentTorsoDesc = this.candidateTorso;
      this.currentLeftLegDesc = this.candidateLeftLeg;
      this.currentRightLegDesc = this.candidateRightLeg;
    }

    // Làm tròn góc đo khớp thành bội số 5° để số hiển thị êm ái
    const quantize = (deg: number) => Math.round(deg / 5) * 5;

    return {
      timeSec: currentTime,
      beatIndex,
      moveName: this.currentMoveName,
      leftArmDesc: this.currentLeftArmDesc,
      rightArmDesc: this.currentRightArmDesc,
      torsoDesc: this.currentTorsoDesc,
      leftLegDesc: this.currentLeftLegDesc,
      rightLegDesc: this.currentRightLegDesc,
      leftElbowAngle: quantize(this.smoothLAngle),
      rightElbowAngle: quantize(this.smoothRAngle),
      leftKneeAngle: quantize(this.smoothLKnee),
      rightKneeAngle: quantize(this.smoothRKnee),
      isKeyPose: beatIndex === 1 || beatIndex === 5,
    };
  }

  private calculateJointAngle(p1: Landmark, p2: Landmark, p3: Landmark): number {
    const aX = p1.x - p2.x;
    const aY = p1.y - p2.y;
    const bX = p3.x - p2.x;
    const bY = p3.y - p2.y;

    const dot = aX * bX + aY * bY;
    const magA = Math.hypot(aX, aY);
    const magB = Math.hypot(bX, bY);
    if (magA === 0 || magB === 0) return 180;

    const cosAngle = Math.max(-1, Math.min(1, dot / (magA * magB)));
    return (Math.acos(cosAngle) * 180) / Math.PI;
  }

  public generateFullTimeline(durationSec: number): StepInstruction[] {
    const list: StepInstruction[] = [];
    const stepDuration = 1.0;
    const count = Math.max(1, Math.floor(durationSec / stepDuration));

    const sampleMoves = [
      { name: 'Tư thế sẵn sàng & nhún nhịp', lA: 'Buông lơi tay trái ngang eo', rA: 'Đưa nhẹ tay phải ra trước', lL: 'Chân trái làm trụ đứng thẳng', rL: 'Chân phải hơi nhấc gót nhún nhẹ' },
      { name: 'Co gối phải & vẫy ngón tay phải', lA: 'Giữ tay trái ngang hông', rA: 'Co khuỷu tay phải 90°, múa ngón', lL: 'Chân trái đứng vững vàng', rL: 'Co nhấc đầu gối phải 110° theo nhịp' },
      { name: 'Đổi chân: Co gối trái & giơ cao tay trái', lA: 'Giơ cao tay trái qua đầu', rA: 'Hạ tay phải về ngang ngực', lL: 'Co nhấc gối trái 115°', rL: 'Chân phải đứng làm trụ tiếp đất' },
      { name: 'Bắt chéo 2 chân & bắt chéo 2 tay', lA: 'Đặt chéo tay trái qua phải', rA: 'Đặt chéo tay phải qua trái', lL: 'Bắt chéo chân trái qua phải', rL: 'Chân phải nhún gối tạo độ dẻo' },
      { name: 'Đánh hông & mở rộng 2 chân', lA: 'Duỗi tay trái sang trái', rA: 'Duỗi tay phải sang phải', lL: 'Chân trái mở rộng sang ngang', rL: 'Chân phải mở rộng, trọng tâm dồn giữa' },
      { name: 'Xoay mũi chân & xoay cổ tay 360°', lA: 'Uốn lượn cổ tay trái', rA: 'Uốn lượn cổ tay phải', lL: 'Xoay nhẹ mũi chân trái', rL: 'Xoay nhẹ mũi chân phải' },
      { name: 'Nhún sâu 2 gối & tạo dáng kết nhịp 8', lA: 'Bàn tay trái chống hông', rA: 'Bàn tay phải giơ chữ V / chào', lL: 'Chùng sâu đầu gối trái 120°', rL: 'Chùng sâu đầu gối phải 120°' },
      { name: 'Chuyển nhịp tiếp theo uyển chuyển', lA: 'Thả lỏng cánh tay', rA: 'Đón nhịp mới', lL: 'Thu chân về thế chuẩn bị', rL: 'Chân phải đứng vững vàng' },
    ];

    for (let i = 0; i < count; i++) {
      const t = i * stepDuration;
      const beat = (i % 8) + 1;
      const sample = sampleMoves[i % sampleMoves.length];

      list.push({
        timeSec: t,
        beatIndex: beat,
        moveName: `${sample.name} (Nhịp ${beat}/8)`,
        leftArmDesc: sample.lA,
        rightArmDesc: sample.rA,
        torsoDesc: (i % 2 === 0) ? 'Lưng thẳng, hông hơi lắc nhẹ theo tiếng trống.' : 'Nghiêng vai tạo độ mềm mại cho động tác.',
        leftLegDesc: sample.lL,
        rightLegDesc: sample.rL,
        leftElbowAngle: 90 + (i % 5) * 15,
        rightElbowAngle: 85 + ((i + 2) % 5) * 18,
        leftKneeAngle: 120 + (i % 4) * 15,
        rightKneeAngle: 130 + ((i + 1) % 4) * 12,
        isKeyPose: beat === 1 || beat === 5,
      });
    }

    return list;
  }
}
