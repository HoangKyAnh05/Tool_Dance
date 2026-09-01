import confetti from 'canvas-confetti';
import { CHARACTER_PRESETS, STAGE_THEMES, CharacterPreset } from './presets';
import { PoseTracker } from './engine/poseTracker';
import { AudioManager } from './engine/audioManager';
import { VideoExporter } from './engine/videoExporter';
import { ProjectManager, DanceProject } from './engine/projectManager';
import { DanceInstructor, StepInstruction } from './engine/danceInstructor';

// Declare global Electron API
declare global {
  interface Window {
    electronAPI?: {
      selectVideoFile: () => Promise<string | null>;
      saveExportVideo: (defaultName: string) => Promise<string | null>;
      createDesktopShortcut: () => Promise<{ success: boolean; message: string }>;
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
      restartApp: () => void;
    };
    lucide?: {
      createIcons: () => void;
    };
  }
}

class App {
  private poseTracker: PoseTracker;
  private audioManager: AudioManager;
  private videoExporter: VideoExporter;
  private projectManager: ProjectManager;
  private danceInstructor: DanceInstructor;

  private selectedCharacter: CharacterPreset = CHARACTER_PRESETS[0];
  private videoEl!: HTMLVideoElement;
  private poseCanvas!: HTMLCanvasElement;
  private seekSlider!: HTMLInputElement;
  private timeCurrentEl!: HTMLElement;
  private timeTotalEl!: HTMLElement;
  private placeholderEl!: HTMLElement;

  // Instructor UI Elements
  private instCurrentTimeEl!: HTMLElement;
  private instJointAnglesEl!: HTMLElement;
  private instMoveTitleEl!: HTMLElement;
  private instLeftArmEl!: HTMLElement;
  private instRightArmEl!: HTMLElement;
  private instTorsoEl!: HTMLElement;
  private instLeftLegEl!: HTMLElement;
  private instRightLegEl!: HTMLElement;
  private instTimelineListEl!: HTMLElement;
  private currentBeatBadgeEl!: HTMLElement;

  private isUserSeeking = false;
  private playbackSpeed = 1.0;
  private isExporting = false;
  private showSkeleton = true;

  // Dance Practice & Tutorial Modes
  private isMirrorMode = false;
  private loopA: number | null = null;
  private loopB: number | null = null;
  private currentVideoName = 'Chưa có file';
  private currentVideoSrc = '';
  private activeProjectId: string | null = null;
  private timelineSteps: StepInstruction[] = [];
  private lastActiveStepIndex = -1;

  constructor() {
    this.videoEl = document.getElementById('main-video') as HTMLVideoElement;
    this.poseCanvas = document.getElementById('pose-canvas') as HTMLCanvasElement;
    this.seekSlider = document.getElementById('seek-slider') as HTMLInputElement;
    this.timeCurrentEl = document.getElementById('time-current')!;
    this.timeTotalEl = document.getElementById('time-total')!;
    this.placeholderEl = document.getElementById('video-empty-placeholder')!;

    // Instructor Elements
    this.instCurrentTimeEl = document.getElementById('inst-current-time')!;
    this.instJointAnglesEl = document.getElementById('inst-joint-angles')!;
    this.instMoveTitleEl = document.getElementById('inst-move-title')!;
    this.instLeftArmEl = document.getElementById('inst-left-arm')!;
    this.instRightArmEl = document.getElementById('inst-right-arm')!;
    this.instTorsoEl = document.getElementById('inst-torso')!;
    this.instLeftLegEl = document.getElementById('inst-left-leg')!;
    this.instRightLegEl = document.getElementById('inst-right-leg')!;
    this.instTimelineListEl = document.getElementById('inst-timeline-list')!;
    this.currentBeatBadgeEl = document.getElementById('current-beat-badge')!;

    this.poseTracker = new PoseTracker();
    this.audioManager = new AudioManager();
    this.videoExporter = new VideoExporter();
    this.projectManager = new ProjectManager();
    this.danceInstructor = new DanceInstructor();

    this.poseTracker.setElements(this.videoEl, this.poseCanvas);

    this.initUI();
    this.initEvents();
    this.initTutorialControls();
    this.initProjectsSystem();
    this.restoreLastSession();
    this.startLoop();
  }

  private initUI() {
    // Window controls
    document.getElementById('btn-minimize')?.addEventListener('click', () => window.electronAPI?.minimizeWindow());
    document.getElementById('btn-maximize')?.addEventListener('click', () => window.electronAPI?.maximizeWindow());
    document.getElementById('btn-close')?.addEventListener('click', () => window.electronAPI?.closeWindow());

    // Restart App Buttons
    const restartAppHandler = () => {
      this.showToast('🔄 Đang khởi động lại ứng dụng...');
      setTimeout(() => {
        if (window.electronAPI) {
          window.electronAPI.restartApp();
        } else {
          window.location.reload();
        }
      }, 300);
    };
    document.getElementById('btn-restart-app')?.addEventListener('click', restartAppHandler);
    document.getElementById('btn-sidebar-restart')?.addEventListener('click', restartAppHandler);

    if (window.lucide) window.lucide.createIcons();
  }

  private initEvents() {
    // Chuyển đổi tỷ lệ hiển thị Video: Toàn Thân 100% (Contain) / Phóng To (Cover)
    const btnVideoFit = document.getElementById('btn-video-fit');
    let isCoverMode = false;
    btnVideoFit?.addEventListener('click', () => {
      isCoverMode = !isCoverMode;
      this.videoEl.classList.toggle('fit-cover', isCoverMode);
      if (isCoverMode) {
        btnVideoFit.innerHTML = `<i data-lucide="scan" style="width: 12px; height: 12px;"></i> Tỷ Lệ: Phóng To`;
        btnVideoFit.style.color = 'var(--neon-pink)';
        this.showToast('🔍 Chế độ: Phóng To Lấp Đầy Khung');
      } else {
        btnVideoFit.innerHTML = `<i data-lucide="scan" style="width: 12px; height: 12px;"></i> Toàn Thân (Có Chân)`;
        btnVideoFit.style.color = 'var(--neon-cyan)';
        this.showToast('📐 Chế độ: Toàn Thân 100% (Thấy trọn vẹn cả người & giày nhảy)');
      }
      this.syncPoseCanvasSize();
      if (window.lucide) window.lucide.createIcons();
    });

    // Toggle Skeleton Overlay Button
    const btnToggleSkel = document.getElementById('btn-toggle-skeleton')!;
    btnToggleSkel.addEventListener('click', () => {
      this.showSkeleton = !this.showSkeleton;
      btnToggleSkel.innerHTML = `<i data-lucide="${this.showSkeleton ? 'eye' : 'eye-off'}" style="width: 12px; height: 12px;"></i> Khung Xương: ${this.showSkeleton ? 'BẬT' : 'TẮT'}`;
      if (!this.showSkeleton) {
        const ctx = this.poseCanvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, this.poseCanvas.width, this.poseCanvas.height);
      }
      if (window.lucide) window.lucide.createIcons();
      this.showToast(this.showSkeleton ? 'Đã BẬT hiển thị khung xương AI' : 'Đã TẮT khung xương (xem video gốc rõ nét)');
    });

    // Play / Pause Button
    const playBtn = document.getElementById('btn-play-pause')!;
    playBtn.addEventListener('click', () => this.togglePlay());

    // Restart Button
    document.getElementById('btn-restart')?.addEventListener('click', () => {
      this.videoEl.currentTime = this.loopA !== null ? this.loopA : 0;
      this.videoEl.play();
      this.updatePlayIcon(true);
    });

    // Speed practice pills (0.25x, 0.5x, 0.75x, 1.0x)
    document.querySelectorAll('.speed-pill').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const speed = parseFloat(target.getAttribute('data-speed') || '1.0');
        this.setPlaybackSpeed(speed);
      });
    });

    // Seek Bar
    this.seekSlider.addEventListener('mousedown', () => (this.isUserSeeking = true));
    this.seekSlider.addEventListener('input', () => {
      const targetTime = (parseFloat(this.seekSlider.value) / 100) * (this.videoEl.duration || 1);
      this.timeCurrentEl.textContent = this.formatTime(targetTime);
    });
    this.seekSlider.addEventListener('change', () => {
      this.videoEl.currentTime = (parseFloat(this.seekSlider.value) / 100) * (this.videoEl.duration || 1);
      this.isUserSeeking = false;
    });

    // Confetti Drop
    document.getElementById('btn-confetti')?.addEventListener('click', () => {
      this.triggerBeatConfetti();
    });

    // Mute/Unmute
    const muteBtn = document.getElementById('btn-mute')!;
    muteBtn.addEventListener('click', () => {
      this.videoEl.muted = !this.videoEl.muted;
      const volIcon = document.getElementById('volume-icon');
      if (volIcon) {
        volIcon.setAttribute('data-lucide', this.videoEl.muted ? 'volume-x' : 'volume-2');
        if (window.lucide) window.lucide.createIcons();
      }
      this.showToast(this.videoEl.muted ? 'Đã tắt tiếng video' : 'Đã bật âm thanh video');
    });

    // Video Upload File Pickers
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    const triggerFilePicker = async () => {
      if (window.electronAPI) {
        const filePath = await window.electronAPI.selectVideoFile();
        if (filePath) {
          this.currentVideoName = filePath.split(/[\\/]/).pop() || 'Dance_Video.mp4';
          this.loadVideoSrc(`file://${filePath}`);
        }
      } else {
        fileInput.click();
      }
    };

    document.getElementById('btn-choose-file')?.addEventListener('click', triggerFilePicker);
    document.getElementById('btn-placeholder-pick')?.addEventListener('click', triggerFilePicker);

    fileInput.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.currentVideoName = file.name;
        const url = URL.createObjectURL(file);
        this.loadVideoSrc(url);
      }
    });

    // Drag & Drop
    const dropzone = document.getElementById('dropzone')!;
    const videoContainer = document.getElementById('video-container')!;

    [dropzone, videoContainer].forEach((el) => {
      el.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
      el.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
      el.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        const file = e.dataTransfer?.files[0];
        if (file && file.type.startsWith('video/')) {
          this.currentVideoName = file.name;
          const url = URL.createObjectURL(file);
          this.loadVideoSrc(url);
        }
      });
    });

    // Demo Video Button
    document.getElementById('btn-demo-video')?.addEventListener('click', () => {
      this.currentVideoName = 'Chinese_Dance_Team_Demo.mp4';
      this.initDemoVideo();
      this.showToast('Đã nạp video mẫu đội nhảy Trung Quốc khớp nhạc!');
    });

    // Desktop Shortcut Creation
    const shortcutBtn = document.getElementById('btn-make-shortcut') || document.getElementById('btn-shortcut');
    shortcutBtn?.addEventListener('click', async () => {
      if (window.electronAPI) {
        const res = await window.electronAPI.createDesktopShortcut();
        if (res.success) {
          this.showToast('🎉 Đã tạo Shortcut "AI Dance Studio" ngoài Desktop chạy ẩn terminal!');
        } else {
          this.showToast(`Lỗi tạo shortcut: ${res.message}`);
        }
      } else {
        this.showToast('Đang chạy trên trình duyệt. Hãy chạy "npm run shortcut" trong terminal.');
      }
    });
  }

  /**
   * Khởi tạo các tính năng Dạy Nhảy & Luyện Tập Động Tác Từng Nhịp
   */
  private initTutorialControls() {
    // 1. Mirror Mode
    const btnMirror = document.getElementById('btn-mirror-mode')!;
    btnMirror.addEventListener('click', () => {
      this.isMirrorMode = !this.isMirrorMode;
      this.videoEl.style.transform = this.isMirrorMode ? 'scaleX(-1)' : 'none';
      btnMirror.innerHTML = `<i data-lucide="flip-horizontal" style="width: 13px; height: 13px;"></i> Gương Soi: ${this.isMirrorMode ? 'BẬT' : 'TẮT'}`;
      btnMirror.classList.toggle('btn-primary', this.isMirrorMode);
      if (window.lucide) window.lucide.createIcons();
      this.showToast(this.isMirrorMode ? '🪞 Đã BẬT chế độ Gương Soi (Dễ tập theo tay trái/phải)' : 'Đã TẮT chế độ Gương Soi');
      this.autoSaveSession();
    });

    // 2. A-B Loop Practice
    const loopLabel = document.getElementById('loop-range-label')!;
    const btnSetA = document.getElementById('btn-set-loop-a')!;
    const btnSetB = document.getElementById('btn-set-loop-b')!;
    const btnClearLoop = document.getElementById('btn-clear-loop')!;

    btnSetA.addEventListener('click', () => {
      this.loopA = this.videoEl.currentTime;
      this.updateLoopLabel();
      this.showToast(`Đã đặt điểm bắt đầu [A]: ${this.formatTime(this.loopA)}`);
      this.autoSaveSession();
    });

    btnSetB.addEventListener('click', () => {
      this.loopB = this.videoEl.currentTime;
      this.updateLoopLabel();
      this.showToast(`Đã đặt điểm kết thúc [B]: ${this.formatTime(this.loopB)}`);
      this.autoSaveSession();
    });

    btnClearLoop.addEventListener('click', () => {
      this.loopA = null;
      this.loopB = null;
      loopLabel.textContent = 'Toàn bài';
      this.showToast('Đã xóa lặp A-B');
      this.autoSaveSession();
    });

    // 3. Step-by-Step Navigation
    document.getElementById('btn-step-prev')?.addEventListener('click', () => {
      this.videoEl.pause();
      this.videoEl.currentTime = Math.max(0, this.videoEl.currentTime - 1.0);
      this.updatePlayIcon(false);
    });

    document.getElementById('btn-step-next')?.addEventListener('click', () => {
      this.videoEl.pause();
      this.videoEl.currentTime = Math.min(this.videoEl.duration || 100, this.videoEl.currentTime + 1.0);
      this.updatePlayIcon(false);
    });
  }

  private updateLoopLabel() {
    const loopLabel = document.getElementById('loop-range-label')!;
    if (this.loopA !== null && this.loopB !== null) {
      loopLabel.textContent = `${this.formatTime(this.loopA)} ➔ ${this.formatTime(this.loopB)}`;
    } else if (this.loopA !== null) {
      loopLabel.textContent = `Từ ${this.formatTime(this.loopA)} ➔ Hết`;
    } else if (this.loopB !== null) {
      loopLabel.textContent = `Từ đầu ➔ ${this.formatTime(this.loopB)}`;
    } else {
      loopLabel.textContent = 'Toàn bài';
    }
  }

  private setPlaybackSpeed(speed: number) {
    this.playbackSpeed = speed;
    this.videoEl.playbackRate = speed;

    document.querySelectorAll('.speed-pill').forEach((el) => {
      const s = parseFloat(el.getAttribute('data-speed') || '1.0');
      if (s === speed) {
        el.className = 'btn btn-primary btn-sm speed-pill';
      } else {
        el.className = 'btn btn-outline btn-sm speed-pill';
      }
    });

    this.showToast(`Tốc độ tập nhảy: ${speed}x ${speed < 1 ? '(Chậm để học động tác)' : ''}`);
    this.autoSaveSession();
  }

  /**
   * Khởi tạo hệ thống Lưu trữ & Tải lại Dự án Bài Nhảy
   */
  private initProjectsSystem() {
    // 1. Projects List Modal (Dự Án Đã Lưu)
    const projectsModal = document.getElementById('projects-modal')!;
    const btnOpenProjects = document.getElementById('btn-projects')!;
    const btnCloseProjectsModal = document.getElementById('btn-close-projects-modal')!;

    btnOpenProjects.addEventListener('click', () => {
      this.renderProjectsList();
      projectsModal.style.display = 'flex';
    });

    btnCloseProjectsModal.addEventListener('click', () => {
      projectsModal.style.display = 'none';
    });

    projectsModal.addEventListener('click', (e) => {
      if (e.target === projectsModal) projectsModal.style.display = 'none';
    });

    // 2. Save Project Modal (Lưu Dự Án)
    const saveModal = document.getElementById('save-project-modal')!;
    const btnSaveProject = document.getElementById('btn-save-project')!;
    const btnCloseSaveModal = document.getElementById('btn-close-save-modal')!;
    const btnCancelSave = document.getElementById('btn-cancel-save')!;
    const btnConfirmSave = document.getElementById('btn-confirm-save-project')!;
    const titleInput = document.getElementById('save-project-title-input') as HTMLInputElement;
    const notesInput = document.getElementById('save-project-notes-input') as HTMLInputElement;

    btnSaveProject.addEventListener('click', () => {
      const defaultTitle = this.currentVideoName.replace(/\.[^/.]+$/, '') || 'Bài Nhảy Mới';
      titleInput.value = defaultTitle;
      notesInput.value = '';

      // Update info cards
      document.getElementById('save-modal-video-name')!.textContent = this.currentVideoName;
      document.getElementById('save-modal-speed')!.textContent = `${this.playbackSpeed}x`;
      const loopLabel = document.getElementById('loop-range-label')!.textContent || 'Toàn bài';
      document.getElementById('save-modal-loop')!.textContent = loopLabel;

      saveModal.style.display = 'flex';
      setTimeout(() => titleInput.focus(), 100);
    });

    const closeSaveModal = () => {
      saveModal.style.display = 'none';
    };

    btnCloseSaveModal.addEventListener('click', closeSaveModal);
    btnCancelSave.addEventListener('click', closeSaveModal);
    saveModal.addEventListener('click', (e) => {
      if (e.target === saveModal) closeSaveModal();
    });

    const executeSave = () => {
      const title = titleInput.value.trim() || 'Bài Nhảy Mới';
      const notes = notesInput.value.trim() || `Lưu lúc ${new Date().toLocaleTimeString()}`;

      const saved = this.projectManager.saveCurrentProject(
        {
          title,
          videoSrc: this.currentVideoSrc,
          videoName: this.currentVideoName,
          characterId: 'neon_stickman_pro',
          stageId: 'dance_studio_mirror',
          speed: this.playbackSpeed,
          isMirror: this.isMirrorMode,
          loopA: this.loopA,
          loopB: this.loopB,
          notes,
        },
        this.activeProjectId || undefined
      );

      this.activeProjectId = saved.id;
      closeSaveModal();
      this.triggerBeatConfetti();
      this.showToast(`💾 Đã lưu dự án "${title}" thành công! Lần sau vào lại sẽ có sẵn.`);
    };

    btnConfirmSave.addEventListener('click', executeSave);
    titleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') executeSave();
    });
  }

  private renderProjectsList() {
    const container = document.getElementById('projects-list-container')!;
    const projects = this.projectManager.getProjects();

    if (projects.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 30px;">Chưa có dự án nào được lưu. Hãy bấm "Lưu Dự Án" để lưu bài nhảy của bạn!</div>`;
      return;
    }

    container.innerHTML = '';
    projects.forEach((p) => {
      const item = document.createElement('div');
      item.style.cssText = `
        background: rgba(25, 25, 45, 0.85);
        border: 1px solid var(--border-neon);
        border-radius: 10px;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      `;

      item.innerHTML = `
        <div style="flex: 1;">
          <div style="font-weight: 700; font-size: 14px; color: #fff;">${p.title}</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
            📁 File: <span style="color: var(--neon-cyan);">${p.videoName}</span> | ⏱️ Tốc độ: ${p.speed}x
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-primary btn-sm btn-load-proj" data-id="${p.id}">
            <i data-lucide="play" style="width: 12px; height: 12px;"></i> Mở Lại
          </button>
          <button class="btn btn-outline btn-sm btn-del-proj" data-id="${p.id}" style="color: #ef4444;" title="Xóa dự án">
            <i data-lucide="trash-2" style="width: 12px; height: 12px;"></i>
          </button>
        </div>
      `;

      item.querySelector('.btn-load-proj')?.addEventListener('click', () => {
        this.loadProject(p);
        document.getElementById('projects-modal')!.style.display = 'none';
      });

      item.querySelector('.btn-del-proj')?.addEventListener('click', () => {
        if (confirm(`Bạn có chắc muốn xóa dự án "${p.title}"?`)) {
          this.projectManager.deleteProject(p.id);
          this.renderProjectsList();
        }
      });

      container.appendChild(item);
    });

    if (window.lucide) window.lucide.createIcons();
  }

  private loadProject(p: DanceProject) {
    this.activeProjectId = p.id;
    this.currentVideoName = p.videoName;
    this.playbackSpeed = p.speed;
    this.isMirrorMode = p.isMirror;
    this.loopA = p.loopA;
    this.loopB = p.loopB;

    // Restore Mirror Mode
    this.videoEl.style.transform = this.isMirrorMode ? 'scaleX(-1)' : 'none';
    const btnMirror = document.getElementById('btn-mirror-mode')!;
    btnMirror.innerHTML = `<i data-lucide="flip-horizontal" style="width: 13px; height: 13px;"></i> Gương Soi: ${this.isMirrorMode ? 'BẬT' : 'TẮT'}`;
    btnMirror.classList.toggle('btn-primary', this.isMirrorMode);

    this.setPlaybackSpeed(p.speed);
    this.updateLoopLabel();

    // Restore Video
    if (p.videoSrc) {
      this.loadVideoSrc(p.videoSrc);
    } else {
      this.initDemoVideo();
    }

    this.showToast(`📂 Đã mở lại dự án bài nhảy: "${p.title}"!`);
  }

  private autoSaveSession() {
    try {
      const sessionData = {
        speed: this.playbackSpeed,
        isMirror: this.isMirrorMode,
        loopA: this.loopA,
        loopB: this.loopB,
        videoName: this.currentVideoName,
        videoSrc: this.currentVideoSrc,
      };
      localStorage.setItem('ai_dance_last_session', JSON.stringify(sessionData));
    } catch (e) {
      // ignore
    }
  }

  private restoreLastSession() {
    try {
      const last = localStorage.getItem('ai_dance_last_session');
      if (last) {
        const data = JSON.parse(last);
        if (data.speed) this.setPlaybackSpeed(data.speed);
      }
    } catch (e) {
      // ignore
    }
  }

  private togglePlay() {
    if (this.videoEl.paused || this.videoEl.ended) {
      this.audioManager.resume();
      this.videoEl.play().then(() => {
        this.updatePlayIcon(true);
        this.audioManager.init(this.videoEl);
      }).catch((e) => console.log('Play request was interrupted:', e));
    } else {
      this.videoEl.pause();
      this.updatePlayIcon(false);
    }
  }

  private updatePlayIcon(isPlaying: boolean) {
    const playIcon = document.getElementById('play-icon');
    if (playIcon) {
      playIcon.setAttribute('data-lucide', isPlaying ? 'pause' : 'play');
      if (window.lucide) window.lucide.createIcons();
    }
  }

  public loadVideoSrc(src: string) {
    this.currentVideoSrc = src;
    this.videoEl.srcObject = null;
    this.videoEl.src = src;
    this.videoEl.loop = true;
    this.videoEl.muted = false;
    this.videoEl.volume = 1.0;
    this.placeholderEl.style.display = 'none';

    // Reset loop points để video luôn phát trọn vẹn toàn bài
    this.loopA = null;
    this.loopB = null;
    this.updateLoopLabel();

    this.videoEl.onended = () => {
      this.videoEl.currentTime = 0;
      this.videoEl.play().catch(() => {});
      this.updatePlayIcon(true);
    };

    this.videoEl.load();
    this.videoEl.onloadedmetadata = () => {
      const duration = this.videoEl.duration || 30;
      this.timeTotalEl.textContent = this.formatTime(duration);
      this.syncPoseCanvasSize();
      this.audioManager.resume();
      
      // Render full timeline syllabus
      this.timelineSteps = this.danceInstructor.generateFullTimeline(duration);
      this.renderTimelineList();

      this.videoEl.play().then(() => {
        this.updatePlayIcon(true);
        this.audioManager.init(this.videoEl);
      }).catch(() => {
        this.updatePlayIcon(false);
      });
    };
    this.showToast('🎬 Đã nạp video vũ đạo! Bảng AI Coach đang phân tích từng động tác...');
    this.autoSaveSession();
  }

  private stepRowElements: HTMLElement[] = [];

  private renderTimelineList() {
    this.instTimelineListEl.innerHTML = '';
    this.stepRowElements = [];
    this.lastActiveStepIndex = -1;

    this.timelineSteps.forEach((step, idx) => {
      const row = document.createElement('div');
      row.className = 'timeline-step-row';
      row.id = `step-row-${idx}`;
      row.style.cssText = `
        background: rgba(20, 20, 40, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        padding: 8px 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        transition: background 0.2s ease, border-color 0.2s ease;
      `;

      row.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-family: 'Rajdhani'; font-weight: 700; color: ${step.isKeyPose ? 'var(--neon-pink)' : 'var(--neon-cyan)'}; font-size: 13px; min-width: 55px;">
            [${this.formatTime(step.timeSec)}]
          </span>
          <div>
            <div style="font-weight: 600; font-size: 12px; color: #fff;">${step.moveName}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
              🔵 ${step.leftArmDesc.slice(0, 28)}... | 🔴 ${step.rightArmDesc.slice(0, 28)}...
            </div>
          </div>
        </div>
        <button class="btn btn-outline btn-sm" style="font-size: 10px; padding: 2px 8px; color: var(--neon-cyan);">
          Học Nhịp Này
        </button>
      `;

      row.addEventListener('click', () => {
        this.videoEl.currentTime = step.timeSec;
        this.videoEl.pause();
        this.updatePlayIcon(false);
        this.showToast(`🎯 Đã dừng ở [${this.formatTime(step.timeSec)}] để bạn đọc hướng dẫn và tập theo!`);
      });

      this.instTimelineListEl.appendChild(row);
      this.stepRowElements.push(row);
    });
  }

  public initDemoVideo() {
    this.placeholderEl.style.display = 'none';

    const danceCanvas = document.createElement('canvas');
    danceCanvas.width = 640;
    danceCanvas.height = 480;
    const ctx = danceCanvas.getContext('2d')!;

    const actx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const dest = actx.createMediaStreamDestination();

    const bpm = 128;
    const beatInterval = 60 / bpm;
    setInterval(() => {
      if (!this.videoEl.paused) {
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.frequency.setValueAtTime(150, actx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, actx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.7, actx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(dest);
        osc.start();
        osc.stop(actx.currentTime + 0.16);
      }
    }, beatInterval * 500);

    let frame = 0;
    const drawDemoDance = () => {
      frame++;
      const t = frame * 0.05;

      const grad = ctx.createLinearGradient(0, 0, 640, 480);
      grad.addColorStop(0, '#100b26');
      grad.addColorStop(1, '#05030d');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 480);

      ctx.fillStyle = '#ec4899';
      ctx.font = 'bold 18px Outfit, sans-serif';
      ctx.fillText('🇨🇳 CHINESE DANCE TEAM (VIDEO GỐC)', 20, 40);
      ctx.fillStyle = '#06b6d4';
      ctx.font = '13px Outfit, sans-serif';
      ctx.fillText('AI đang nhận diện khung xương & hướng dẫn từng nhịp...', 20, 65);

      const dancerPositions = [320, 180, 460];
      dancerPositions.forEach((baseX, dIdx) => {
        const dPhase = t * 2.5 + dIdx * 0.4;
        const sway = Math.sin(dPhase) * 20;
        const jump = Math.abs(Math.sin(dPhase * 2)) * 25;
        const centerY = 280 - jump;

        ctx.fillStyle = dIdx === 0 ? '#ffffff' : '#94a3b8';
        ctx.beginPath();
        ctx.arc(baseX + sway * 0.5, centerY - 90, 20, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = dIdx === 0 ? '#ec4899' : '#06b6d4';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(baseX + sway * 0.3 - 15, centerY - 55);
        ctx.lineTo(baseX - 50 + Math.sin(dPhase) * 25, centerY - 20 + Math.cos(dPhase) * 35);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(baseX + sway * 0.3 + 15, centerY - 55);
        ctx.lineTo(baseX + 50 - Math.sin(dPhase) * 25, centerY - 20 - Math.cos(dPhase) * 35);
        ctx.stroke();
      });

      requestAnimationFrame(drawDemoDance);
    };
    drawDemoDance();

    const canvasStream = danceCanvas.captureStream(30);
    const combined = new MediaStream([...canvasStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
    this.videoEl.src = '';
    this.videoEl.srcObject = combined;
    this.videoEl.play().catch(() => {});
    this.updatePlayIcon(true);

    this.timelineSteps = this.danceInstructor.generateFullTimeline(30);
    this.renderTimelineList();
  }

  private syncPoseCanvasSize() {
    if (this.videoEl && this.poseCanvas) {
      this.poseCanvas.width = this.videoEl.clientWidth || 640;
      this.poseCanvas.height = this.videoEl.clientHeight || 480;
    }
  }

  private startLoop() {
    const loop = () => {
      const curTime = this.videoEl.currentTime || 0;
      const duration = this.videoEl.duration || 30;

      // A-B Loop Logic
      if (this.loopB !== null && curTime >= this.loopB) {
        this.videoEl.currentTime = this.loopA !== null ? this.loopA : 0;
      }

      // Update seek slider
      if (!this.isUserSeeking && !isNaN(duration) && duration > 0) {
        this.seekSlider.value = ((curTime / duration) * 100).toString();
        this.timeCurrentEl.textContent = this.formatTime(curTime);
      }

      // 1. Audio Beat analysis
      const { beat, freqArray } = this.audioManager.getBeatEnergy();
      this.updateEqualizerUI(freqArray);

      // 2. AI Pose Tracking on current video frame
      const poseData = this.poseTracker.processFrame(curTime, beat);

      // 3. Draw neon skeleton on top of original video if enabled
      this.syncPoseCanvasSize();
      if (this.showSkeleton) {
        this.poseTracker.drawSkeleton(poseData.landmarks);
      }

      // 4. AI DANCE INSTRUCTOR REAL-TIME ANALYSIS (CẬP NHẬT HƯỚNG DẪN TĨNH TÂM, KHÔNG GIẬT CHỮ)
      const inst = this.danceInstructor.analyzeCurrentPose(poseData.landmarks, curTime, duration);

      const timeStr = this.formatTime(curTime);
      if (this.instCurrentTimeEl.textContent !== timeStr) this.instCurrentTimeEl.textContent = timeStr;

      const beatStr = `NHỊP ${inst.beatIndex}/8`;
      if (this.currentBeatBadgeEl.textContent !== beatStr) this.currentBeatBadgeEl.textContent = beatStr;

      const titleSpan = this.instMoveTitleEl.querySelector('span');
      if (titleSpan && titleSpan.textContent !== inst.moveName) titleSpan.textContent = inst.moveName;

      if (this.instLeftArmEl.textContent !== inst.leftArmDesc) this.instLeftArmEl.textContent = inst.leftArmDesc;
      if (this.instRightArmEl.textContent !== inst.rightArmDesc) this.instRightArmEl.textContent = inst.rightArmDesc;
      if (this.instTorsoEl.textContent !== inst.torsoDesc) this.instTorsoEl.textContent = inst.torsoDesc;
      if (this.instLeftLegEl.textContent !== inst.leftLegDesc) this.instLeftLegEl.textContent = inst.leftLegDesc;
      if (this.instRightLegEl.textContent !== inst.rightLegDesc) this.instRightLegEl.textContent = inst.rightLegDesc;

      const angleStr = `Tay: L ${inst.leftElbowAngle}° | R ${inst.rightElbowAngle}°  •  Gối: L ${inst.leftKneeAngle}° | R ${inst.rightKneeAngle}°`;
      if (this.instJointAnglesEl.textContent !== angleStr) this.instJointAnglesEl.textContent = angleStr;

      // 5. Highlight active step in timeline syllabus O(1) update
      const currentStepIdx = Math.floor(curTime);
      if (currentStepIdx !== this.lastActiveStepIndex) {
        if (this.lastActiveStepIndex >= 0 && this.stepRowElements[this.lastActiveStepIndex]) {
          const prev = this.stepRowElements[this.lastActiveStepIndex];
          prev.style.background = 'rgba(20, 20, 40, 0.7)';
          prev.style.borderColor = 'rgba(255, 255, 255, 0.08)';
        }
        if (this.stepRowElements[currentStepIdx]) {
          const curr = this.stepRowElements[currentStepIdx];
          curr.style.background = 'linear-gradient(135deg, rgba(236,72,153,0.35), rgba(6,182,212,0.25))';
          curr.style.borderColor = 'var(--neon-pink)';
          curr.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        this.lastActiveStepIndex = currentStepIdx;
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  private updateEqualizerUI(freqs: number[]) {
    const eqBars = document.querySelectorAll('.eq-bar');
    eqBars.forEach((bar, idx) => {
      const val = freqs[idx] || 0.1;
      const height = Math.max(4, Math.min(24, val * 24));
      (bar as HTMLElement).style.height = `${height}px`;
    });
  }

  private triggerBeatConfetti() {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#ec4899', '#a855f7', '#06b6d4', '#eab308'],
    });
    this.showToast('💥 BEAT DROP! Pháo hoa sàn nhảy!');
  }

  private formatTime(secs: number): string {
    if (isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  private showToast(msg: string) {
    const container = document.getElementById('toast-container')!;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <i data-lucide="sparkles" style="width: 16px; height: 16px; color: var(--neon-pink);"></i>
      <span>${msg}</span>
    `;
    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
}

// Initialize Application when DOM ready
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
