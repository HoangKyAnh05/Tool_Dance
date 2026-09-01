export interface CharacterPreset {
  id: string;
  name: string;
  category: 'Stickman' | 'Skeleton' | 'Anime' | 'Audition' | 'Chibi';
  tag: string;
  avatarIcon: string;
  primaryColor: string;
  accentColor: string;
  leftHandColor: string;  // Màu phân biệt tay trái để người tập dễ nhìn (Cyan/Blue)
  rightHandColor: string; // Màu phân biệt tay phải để người tập dễ nhìn (Pink/Red)
  scale: number;
  modelType: 'stickman' | 'skeleton' | 'anime_humanoid' | 'chibi';
  hasWings: boolean;
  hasNekoEars: boolean;
  hasHeadphones: boolean;
  hairStyle: 'twintail' | 'spiky' | 'long_flowing' | 'bob' | 'idol' | 'none';
  outfitStyle: 'neon_bones' | 'laser_skeleton' | 'idol_dress' | 'street_bomber' | 'audition_gown';
}

export const CHARACTER_PRESETS: CharacterPreset[] = [
  {
    id: 'neon_stickman_pro',
    name: 'Người Que Neon 3D (Xem Múa Chi Tiết 100%)',
    category: 'Stickman',
    tag: 'Nhìn Rõ Khớp Múa Dẻo',
    avatarIcon: '⚡',
    primaryColor: '#00f0ff',
    accentColor: '#ff007f',
    leftHandColor: '#00f0ff',  // Tay trái Xanh Dạ Quang
    rightHandColor: '#ff007f', // Tay phải Hồng Neon
    scale: 1.05,
    modelType: 'stickman',
    hasWings: false,
    hasNekoEars: false,
    hasHeadphones: false,
    hairStyle: 'none',
    outfitStyle: 'neon_bones',
  },
  {
    id: 'cyber_skeleton_pro',
    name: 'Người Khung Xương Laser 3D (Chuẩn Vũ Đạo)',
    category: 'Skeleton',
    tag: 'Bắt Từng Khớp & Ngón Tay',
    avatarIcon: '💀',
    primaryColor: '#10b981',
    accentColor: '#eab308',
    leftHandColor: '#06b6d4',
    rightHandColor: '#f43f5e',
    scale: 1.05,
    modelType: 'skeleton',
    hasWings: false,
    hasNekoEars: false,
    hasHeadphones: false,
    hairStyle: 'none',
    outfitStyle: 'laser_skeleton',
  },
  {
    id: 'anime_idol_girl',
    name: 'Anime Idol Miku (Dáng Người Mẫu)',
    category: 'Anime',
    tag: 'Vũ Công Nữ Xinh',
    avatarIcon: '💃',
    primaryColor: '#06b6d4',
    accentColor: '#ec4899',
    leftHandColor: '#00f0ff',
    rightHandColor: '#ff007f',
    scale: 1.0,
    modelType: 'anime_humanoid',
    hasWings: false,
    hasNekoEars: false,
    hasHeadphones: true,
    hairStyle: 'long_flowing',
    outfitStyle: 'idol_dress',
  },
  {
    id: 'anime_dancer_boy',
    name: 'K-Pop Anime Boy (Vũ Công Đường Phố)',
    category: 'Anime',
    tag: 'Street Dance Pro',
    avatarIcon: '🕺',
    primaryColor: '#3b82f6',
    accentColor: '#f59e0b',
    leftHandColor: '#38bdf8',
    rightHandColor: '#f43f5e',
    scale: 1.05,
    modelType: 'anime_humanoid',
    hasWings: false,
    hasNekoEars: false,
    hasHeadphones: true,
    hairStyle: 'spiky',
    outfitStyle: 'street_bomber',
  },
  {
    id: 'audition_queen',
    name: 'Audition Diva (Cánh Thiên Thần)',
    category: 'Audition',
    tag: 'Sàn Nhảy Đẳng Cấp',
    avatarIcon: '👑',
    primaryColor: '#c084fc',
    accentColor: '#fb7185',
    leftHandColor: '#60a5fa',
    rightHandColor: '#f43f5e',
    scale: 1.08,
    modelType: 'anime_humanoid',
    hasWings: true,
    hasNekoEars: false,
    hasHeadphones: false,
    hairStyle: 'idol',
    outfitStyle: 'audition_gown',
  },
];

export interface StageTheme {
  id: string;
  name: string;
  floorColor: string;
  gridColor: string;
  spotlightColors: string[];
  laserColors: string[];
  ambientColor: string;
}

export const STAGE_THEMES: StageTheme[] = [
  {
    id: 'dance_studio_mirror',
    name: '🪞 Phòng Tập Nhảy Gương Sáng (Tập Động Tác)',
    floorColor: '#10101c',
    gridColor: '#6366f1',
    spotlightColors: ['#ffffff', '#818cf8', '#38bdf8'],
    laserColors: ['#6366f1', '#a855f7'],
    ambientColor: '#0a0a14',
  },
  {
    id: 'audition_disco',
    name: '✨ Audition Club Disco (Sàn Nhảy Sôi Động)',
    floorColor: '#0f0c29',
    gridColor: '#ec4899',
    spotlightColors: ['#ec4899', '#a855f7', '#06b6d4', '#eab308'],
    laserColors: ['#f43f5e', '#06b6d4'],
    ambientColor: '#241442',
  },
  {
    id: 'cyber_neon',
    name: '⚡ Cyberpunk Rooftop (Hologram Laser)',
    floorColor: '#050b14',
    gridColor: '#06b6d4',
    spotlightColors: ['#00f0ff', '#ff007f', '#7928ca'],
    laserColors: ['#00f0ff', '#39ff14'],
    ambientColor: '#0c1b33',
  },
];
