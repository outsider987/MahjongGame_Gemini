
export const COLORS = {
  // Screenshot Palette
  TABLE_BG_DARK: '#052e23', // Deep Emerald
  TABLE_BG_LIGHT: '#0f4c3a', // Rich Green
  
  // UI Colors
  UI_GLASS_DARK: 'rgba(0, 0, 0, 0.85)',
  UI_GLASS_LIGHT: 'rgba(255, 255, 255, 0.1)',
  UI_BORDER_GOLD: '#d4af37',
  
  // Realistic Material Colors - Updated for "Premium" feel
  // Jade Backing
  TILE_JADE_DEEP: '#064e3b',   // Darker, richer teal
  TILE_JADE_MAIN: '#059669',   // Vibrant Emerald
  TILE_JADE_LIGHT: '#34d399',  // Translucent glow
  
  // Bone/Ivory Face - Updated for smooth porcelain look
  TILE_BONE_WARM: '#fdfcf5',   // Very light warm cream (Porcelain)
  TILE_BONE_SHADOW: '#e2e8f0', // Cool grey shadow for contrast
  TILE_BONE_HIGHLIGHT: '#ffffff', // Pure white specular
  
  // Lighting
  SHADOW_DROP: 'rgba(0,0,0,0.5)',
  SHADOW_AMBIENT: 'rgba(0,0,0,0.25)',
  HIGHLIGHT_SPECULAR: 'rgba(255,255,255,0.9)',
  HIGHLIGHT_EDGE: 'rgba(255,255,255,0.6)',
  
  // Split View Section Colors
  TILE_SECTION_BONE: '#f8fafc', 
  TILE_SECTION_BAMBOO: '#065f46', 
  TILE_SECTION_BAMBOO_LIGHT: '#059669', 
  
  GOLD_TEXT: '#fbbf24', // Amber 400
  SCORE_PLUS: '#4ade80', // Green 400
  SCORE_MINUS: '#f87171', // Red 400
  
  CYAN_LED: '#22d3ee', // Cyan 400

  // --- NEW EFFECT PALETTES ---
  FX_GOLD_CORE: '#fff7ed',
  FX_GOLD_GLOW: '#f59e0b',
  FX_GOLD_OUTER: '#b45309',
  
  FX_BLUE_CORE: '#eff6ff',
  FX_BLUE_GLOW: '#3b82f6',
  FX_BLUE_OUTER: '#1e3a8a',
  
  FX_PURPLE_CORE: '#faf5ff',
  FX_PURPLE_GLOW: '#a855f7',
  FX_PURPLE_OUTER: '#581c87',
  
  FX_RED_CORE: '#fef2f2',
  FX_RED_GLOW: '#ef4444',
  FX_RED_OUTER: '#7f1d1d',
  
  FX_GREEN_CORE: '#f0fdf4',
  FX_GREEN_GLOW: '#10b981',
  FX_GREEN_OUTER: '#064e3b',
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
