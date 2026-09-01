import * as THREE from 'three';
import { PoseTracker } from './poseTracker';
export class BoneRetargeter {
    /**
     * Tính toán góc quay của các khớp xương từ danh sách Pose Landmarks
     * Bắt đầy đủ chi tiết: Cánh tay, Cổ tay, Ngón tay múa dẻo, Đùi và Chân
     */
    retarget(landmarks) {
        const defaultPose = {
            rootPosition: new THREE.Vector3(0, 0, 0),
            rootRotation: new THREE.Euler(0, 0, 0),
            spineRotation: new THREE.Euler(0, 0, 0),
            headRotation: new THREE.Euler(0, 0, 0),
            leftArm: {
                upperArm: new THREE.Euler(0.3, 0, 0.4),
                foreArm: new THREE.Euler(0.3, 0, 0.2),
                wrist: new THREE.Euler(0, 0, 0),
                fingerCurl: 0,
                fingerSpread: 0.5,
            },
            rightArm: {
                upperArm: new THREE.Euler(0.3, 0, -0.4),
                foreArm: new THREE.Euler(0.3, 0, -0.2),
                wrist: new THREE.Euler(0, 0, 0),
                fingerCurl: 0,
                fingerSpread: 0.5,
            },
            leftLeg: { upperLeg: new THREE.Euler(0, 0, 0), lowerLeg: new THREE.Euler(0, 0, 0) },
            rightLeg: { upperLeg: new THREE.Euler(0, 0, 0), lowerLeg: new THREE.Euler(0, 0, 0) },
        };
        if (!landmarks || landmarks.length < 29)
            return defaultPose;
        const leftShoulder = landmarks[PoseTracker.LEFT_SHOULDER];
        const rightShoulder = landmarks[PoseTracker.RIGHT_SHOULDER];
        const leftElbow = landmarks[PoseTracker.LEFT_ELBOW];
        const rightElbow = landmarks[PoseTracker.RIGHT_ELBOW];
        const leftWrist = landmarks[PoseTracker.LEFT_WRIST];
        const rightWrist = landmarks[PoseTracker.RIGHT_WRIST];
        const leftPinky = landmarks[PoseTracker.LEFT_PINKY] || leftWrist;
        const leftIndex = landmarks[PoseTracker.LEFT_INDEX] || leftWrist;
        const leftThumb = landmarks[PoseTracker.LEFT_THUMB] || leftWrist;
        const rightPinky = landmarks[PoseTracker.RIGHT_PINKY] || rightWrist;
        const rightIndex = landmarks[PoseTracker.RIGHT_INDEX] || rightWrist;
        const rightThumb = landmarks[PoseTracker.RIGHT_THUMB] || rightWrist;
        const leftHip = landmarks[PoseTracker.LEFT_HIP];
        const rightHip = landmarks[PoseTracker.RIGHT_HIP];
        const leftKnee = landmarks[PoseTracker.LEFT_KNEE];
        const rightKnee = landmarks[PoseTracker.RIGHT_KNEE];
        const leftAnkle = landmarks[PoseTracker.LEFT_ANKLE];
        const rightAnkle = landmarks[PoseTracker.RIGHT_ANKLE];
        const nose = landmarks[PoseTracker.NOSE];
        // 1. Root Position & Hip Sway
        const midHipX = (leftHip.x + rightHip.x) / 2;
        const rootX = Math.max(-1.8, Math.min(1.8, (midHipX - 0.5) * 2.2));
        const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
        const jumpOffset = Math.max(0, (0.4 - avgShoulderY) * 1.5);
        const rootY = jumpOffset;
        const rootZ = 0;
        // 2. Spine & Torso Tilt
        const shoulderAngle = Math.atan2(rightShoulder.y - leftShoulder.y, rightShoulder.x - leftShoulder.x);
        const spineZ = Math.max(-0.3, Math.min(0.3, -shoulderAngle * 0.6));
        const spineX = 0;
        // 3. Head Tilt
        const noseToShoulderX = (nose.x - (leftShoulder.x + rightShoulder.x) / 2);
        const noseToShoulderY = (nose.y - (leftShoulder.y + rightShoulder.y) / 2);
        const headTiltZ = Math.max(-0.35, Math.min(0.35, noseToShoulderX * 1.5));
        const headTiltX = Math.max(-0.25, Math.min(0.25, (noseToShoulderY + 0.15) * 1.2));
        // 4. Arms Angle Calculation (Cánh tay & Cẳng tay)
        const lForwardPitch = Math.max(0.25, Math.min(0.85, 0.4 + (leftWrist.z ? -leftWrist.z * 1.5 : 0.1)));
        const lForeForwardPitch = Math.max(0.2, Math.min(0.9, 0.35 + (leftWrist.z ? -leftWrist.z * 1.8 : 0.15)));
        const rForwardPitch = Math.max(0.25, Math.min(0.85, 0.4 + (rightWrist.z ? -rightWrist.z * 1.5 : 0.1)));
        const rForeForwardPitch = Math.max(0.2, Math.min(0.9, 0.35 + (rightWrist.z ? -rightWrist.z * 1.8 : 0.15)));
        const lUpperDx = leftElbow.x - leftShoulder.x;
        const lUpperDy = leftElbow.y - leftShoulder.y;
        const lUpperAngleZ = Math.atan2(lUpperDy, -lUpperDx) - Math.PI / 2;
        const lForeDx = leftWrist.x - leftElbow.x;
        const lForeDy = leftWrist.y - leftElbow.y;
        const lForeAngleZ = Math.atan2(lForeDy, -lForeDx) - lUpperAngleZ - Math.PI / 2;
        const rUpperDx = rightElbow.x - rightShoulder.x;
        const rUpperDy = rightElbow.y - rightShoulder.y;
        const rUpperAngleZ = -Math.atan2(rUpperDy, rUpperDx) + Math.PI / 2;
        const rForeDx = rightWrist.x - rightElbow.x;
        const rForeDy = rightWrist.y - rightElbow.y;
        const rForeAngleZ = -Math.atan2(rForeDy, rForeDx) - rUpperAngleZ + Math.PI / 2;
        // 5. CỔ TAY & NGÓN TAY MÚA DẺO (WRIST FLEX & FINGER ARTICULATION)
        // Left Hand (Cổ tay & ngón tay trái)
        const lHandDx = (leftIndex.x + leftPinky.x) / 2 - leftWrist.x;
        const lHandDy = (leftIndex.y + leftPinky.y) / 2 - leftWrist.y;
        const lWristAngleZ = Math.max(-0.8, Math.min(0.8, Math.atan2(lHandDy, -lHandDx) * 0.8));
        const lWristAngleX = Math.max(-0.5, Math.min(0.5, (leftWrist.y - leftIndex.y) * 2.0));
        const lFingerSpread = Math.hypot(leftThumb.x - leftPinky.x, leftThumb.y - leftPinky.y) * 10;
        const lFingerCurl = Math.max(0, Math.min(1, 1.0 - lFingerSpread * 0.8));
        // Right Hand (Cổ tay & ngón tay phải)
        const rHandDx = (rightIndex.x + rightPinky.x) / 2 - rightWrist.x;
        const rHandDy = (rightIndex.y + rightPinky.y) / 2 - rightWrist.y;
        const rWristAngleZ = Math.max(-0.8, Math.min(0.8, -Math.atan2(rHandDy, rHandDx) * 0.8));
        const rWristAngleX = Math.max(-0.5, Math.min(0.5, (rightWrist.y - rightIndex.y) * 2.0));
        const rFingerSpread = Math.hypot(rightThumb.x - rightPinky.x, rightThumb.y - rightPinky.y) * 10;
        const rFingerCurl = Math.max(0, Math.min(1, 1.0 - rFingerSpread * 0.8));
        // 6. Legs Angle Calculation
        const lKneeDy = leftKnee.y - leftHip.y;
        const lThighAngleX = Math.max(-0.5, Math.min(0.5, (0.22 - lKneeDy) * 3.0));
        const lShinAngleX = Math.max(0, Math.min(0.8, (0.22 - (leftAnkle.y - leftKnee.y)) * 4.0));
        const rKneeDy = rightKnee.y - rightHip.y;
        const rThighAngleX = Math.max(-0.5, Math.min(0.5, (0.22 - rKneeDy) * 3.0));
        const rShinAngleX = Math.max(0, Math.min(0.8, (0.22 - (rightAnkle.y - rightKnee.y)) * 4.0));
        return {
            rootPosition: new THREE.Vector3(rootX, rootY, rootZ),
            rootRotation: new THREE.Euler(0, 0, spineZ * 0.5),
            spineRotation: new THREE.Euler(spineX, 0, spineZ),
            headRotation: new THREE.Euler(headTiltX, 0, headTiltZ),
            leftArm: {
                upperArm: new THREE.Euler(lForwardPitch, 0, lUpperAngleZ),
                foreArm: new THREE.Euler(lForeForwardPitch, 0, lForeAngleZ),
                wrist: new THREE.Euler(lWristAngleX, 0, lWristAngleZ),
                fingerCurl: lFingerCurl,
                fingerSpread: lFingerSpread,
            },
            rightArm: {
                upperArm: new THREE.Euler(rForwardPitch, 0, rUpperAngleZ),
                foreArm: new THREE.Euler(rForeForwardPitch, 0, rForeAngleZ),
                wrist: new THREE.Euler(rWristAngleX, 0, rWristAngleZ),
                fingerCurl: rFingerCurl,
                fingerSpread: rFingerSpread,
            },
            leftLeg: {
                upperLeg: new THREE.Euler(lThighAngleX, 0, 0.05),
                lowerLeg: new THREE.Euler(-lShinAngleX, 0, 0),
            },
            rightLeg: {
                upperLeg: new THREE.Euler(rThighAngleX, 0, -0.05),
                lowerLeg: new THREE.Euler(-rShinAngleX, 0, 0),
            },
        };
    }
}
//# sourceMappingURL=boneRetarget.js.map