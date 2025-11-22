
export enum AppView {
  LOBBY = 'LOBBY',
  GAME = 'GAME',
}

export enum GameStateEnum {
  INIT = 'STATE_INIT',
  DRAW = 'STATE_DRAW',
  WAIT_DISCARD = 'STATE_WAIT_DISCARD',
  CHECK_FLOWERS = 'STATE_CHECK_FLOWERS',
  INTERRUPT_CHECK = 'STATE_INTERRUPT_CHECK',
  RESOLVE_ACTION = 'STATE_RESOLVE_ACTION',
  GAME_OVER = 'STATE_GAME_OVER',
}

export enum Suit {
  DOTS = 'DOTS',       // 筒
  BAMBOO = 'BAMBOO',   // 索
  CHARACTERS = 'CHAR', // 萬
  WINDS = 'WINDS',     // 風
  DRAGONS = 'DRAGONS', // 字 (中發白)
  FLOWERS = 'FLOWERS', // 花
}

export interface Tile {
  id: string;
  suit: Suit;
  value: number; 
  isFlower: boolean;
}

export interface Player {
  id: number;
  name: string;
  avatar: string;
  score: number;
  isDealer: boolean; 
  flowerCount: number;
  wind: string;     // The wind assigned to this player (East/South/West/North)
  seatWind: string; // The wind of the seat relative to the dealer
}

export interface InitData {
  step: 'WAITING' | 'DICE' | 'SHUFFLE' | 'REVEAL';
  diceValues: number[];
  // Maps player index (0-3) to the Wind Suit Value (1=East, 2=South, 3=West, 4=North)
  windAssignment: Record<string, number>; 
}

// Data Transfer Object for Game State (matched with Go backend)
export interface GameStateDTO {
  deckCount: number;
  players: {
    info: Player;
    hand: Tile[];       // Only populated for self, or revealed hands
    handCount: number;  // Used for rendering opponents
    discards: Tile[];
    melds: Meld[];
  }[];
  turn: number;
  state: string; // 'DRAW' | 'THINKING' | 'DISCARD' | ...
  lastDiscard: { tile: Tile, playerIndex: number } | null;
  actionTimer: number;
  availableActions: ActionType[];
  initData?: InitData; // Optional data for STATE_INIT phase
}

export type ActionType = 'PONG' | 'KONG' | 'CHOW' | 'HU' | 'PASS';

export interface Meld {
  type: ActionType;
  tiles: Tile[];
  fromPlayer: number; 
}

export interface RoomSettings {
  baseScore: number; 
  taiScore: number; 
  rounds: number; 
  paymentType: 'AA' | 'CLUB';
}

export interface VisualEffect {
  id: number;
  type: 'TEXT' | 'LIGHTNING' | 'PARTICLES' | 'SHOCKWAVE' | 'TILE_POPUP';
  variant?: string; // e.g., 'HU', 'GOLD', 'BLUE', 'FIRE'
  text?: string;
  tile?: Tile; // For TILE_POPUP
  x?: number;
  y?: number;
  life: number;
  particles?: any[];
}