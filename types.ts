
export enum AppView {
  LOBBY = 'LOBBY',
  GAME = 'GAME',
}

export enum GameState {
  INIT = 'STATE_INIT',
  CHECK_FLOWERS = 'STATE_CHECK_FLOWERS',
  PLAYER_TURN = 'STATE_PLAYER_TURN',
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
  value: number; // 1-9 for suits, 1-4 for winds, 1-3 for dragons
  isFlower: boolean;
}

export interface Player {
  id: number;
  name: string;
  avatar: string;
  score: number;
  isDealer: boolean; // 莊家
  flowerCount: number;
  wind: '東' | '南' | '西' | '北';
  seatWind: '東' | '南' | '西' | '北'; // The wind position relative to the round (e.g., 南風北)
}

export interface RoomSettings {
  baseScore: number; // 底
  taiScore: number; // 台
  rounds: number; // 圈數
  paymentType: 'AA' | 'CLUB';
}

export interface EffectEvent {
  type: 'LIGHTNING' | 'TEXT_BURST' | 'PARTICLES';
  text?: string;
  position?: { x: number; y: number };
}
