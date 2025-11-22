
export const COLORS = {
  // Screenshot Palette
  TABLE_BG_DARK: '#052e23', // Deep Emerald
  TABLE_BG_LIGHT: '#0f4c3a', // Rich Green
  
  // UI Colors
  UI_GLASS_DARK: 'rgba(0, 0, 0, 0.85)',
  UI_GLASS_LIGHT: 'rgba(255, 255, 255, 0.1)',
  UI_BORDER_GOLD: '#d4af37',
  
  // Realistic Material Colors
  TILE_BACK_MAIN: '#047857', // Jade Green (Emerald 600)
  TILE_BACK_LIGHT: '#10b981', // Lighter Jade (Emerald 500)
  TILE_BACK_DARK: '#064e3b', // Dark edge (Emerald 800)
  
  TILE_FACE_MAIN: '#fdfbf7', // Ivory / Bone
  TILE_FACE_SHADOW: '#cbd5e1', // Side of the bone
  
  // Split View Section Colors
  TILE_SECTION_BONE: '#f8fafc', // Slate 50
  TILE_SECTION_BAMBOO: '#065f46', // Emerald 800
  
  TILE_SIDE_HIGHLIGHT: 'rgba(255,255,255,0.4)',
  TILE_SHADOW: 'rgba(0,0,0,0.4)',
  
  GOLD_TEXT: '#fbbf24', // Amber 400
  SCORE_PLUS: '#4ade80', // Green 400
  SCORE_MINUS: '#f87171', // Red 400
  
  CYAN_LED: '#22d3ee', // Cyan 400
};

export const TILES_COUNT = 144;
export const HAND_SIZE_DEALER = 17;
export const HAND_SIZE_PLAYER = 16;

// Mock Data for Lobby
export const MOCK_PLAYERS = [
  { id: 1001, name: "雀聖", score: 1200, games: 32, wins: 3 },
  { id: 1002, name: "十三么", score: 700, games: 14, wins: 1 },
  { id: 1003, name: "天胡哥", score: 510, games: 13, wins: 2 },
  { id: 1004, name: "東風戰神", score: 470, games: 8, wins: 1 },
  { id: 1005, name: "紅中", score: 360, games: 6, wins: 1 },
];

export const MOCK_ROOMS = [
  { id: 67473, name: "休閒衛生麻將", round: "1/4", stake: "100/20", status: "等待中" },
  { id: 67474, name: "高額對決", round: "2/4", stake: "300/50", status: "遊戲中" },
  { id: 67475, name: "公會交流賽", round: "0/4", stake: "50/10", status: "等待中" },
];
