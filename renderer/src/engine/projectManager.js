const STORAGE_KEY = 'ai_dance_projects_db';
export class ProjectManager {
    projects = [];
    constructor() {
        this.loadProjects();
    }
    loadProjects() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (data) {
                this.projects = JSON.parse(data);
            }
            else {
                // Tạo dự án mẫu mặc định
                this.projects = [
                    {
                        id: 'sample_chinese_dance',
                        title: 'Bài Nhảy Vũ Đạo Đội Trung Quốc (Mẫu)',
                        createdAt: Date.now(),
                        lastOpened: Date.now(),
                        videoSrc: '',
                        videoName: 'Chinese_Dance_Team_Beat.mp4',
                        characterId: 'anime_idol_girl',
                        stageId: 'audition_disco',
                        speed: 1.0,
                        isMirror: false,
                        loopA: 0,
                        loopB: 8.0,
                        notes: 'Đoạn điệp khúc nhảy tay nhanh cần tập kỹ nhịp 1-2-3-4',
                    },
                ];
                this.saveProjects();
            }
        }
        catch (e) {
            console.warn('Load projects error:', e);
        }
        return this.projects;
    }
    saveProjects() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.projects));
        }
        catch (e) {
            console.warn('Save projects error:', e);
        }
    }
    getProjects() {
        return this.projects.sort((a, b) => b.lastOpened - a.lastOpened);
    }
    saveCurrentProject(project, existingId) {
        const now = Date.now();
        if (existingId) {
            const idx = this.projects.findIndex((p) => p.id === existingId);
            if (idx >= 0) {
                this.projects[idx] = {
                    ...this.projects[idx],
                    ...project,
                    lastOpened: now,
                };
                this.saveProjects();
                return this.projects[idx];
            }
        }
        const newProj = {
            ...project,
            id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            createdAt: now,
            lastOpened: now,
        };
        this.projects.unshift(newProj);
        this.saveProjects();
        return newProj;
    }
    deleteProject(id) {
        this.projects = this.projects.filter((p) => p.id !== id);
        this.saveProjects();
    }
}
//# sourceMappingURL=projectManager.js.map