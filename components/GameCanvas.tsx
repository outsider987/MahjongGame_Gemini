import React, { useEffect, useRef, useState } from 'react';
import { AppView, Suit, Tile, Player } from '../types';
import { generateDeck } from '../services/mahjongLogic';
import { COLORS } from '../constants';
import { Mic, MessageCircle, Battery, Signal, ChevronLeft, Menu, Volume2, Wifi, Zap, Layers } from 'lucide-react';
import { Button } from './ui/Button';

declare global {
  interface Window {
    p5: any;
  }
}

interface GameCanvasProps {
  setView: (view: AppView) => void;
}

type ActionType = 'PONG' | 'KONG' | 'CHOW' | 'HU';

interface Meld {
  type: ActionType;
  tiles: Tile[];
  fromPlayer: number; // Who discarded the tile
}

// --- FX System Types ---
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface VisualEffect {
  id: number;
  type: 'TEXT' | 'LIGHTNING' | 'PARTICLES';
  text?: string; // For TEXT type
  x?: number;
  y?: number;
  life: number; // frames remaining
  particles?: Particle[]; // For PARTICLE type
}

// --- Game Logic Interfaces ---
interface GameState {
  deck: Tile[];
  players: {
    info: Player;
    hand: Tile[];
    discards: Tile[];
    melds: Meld[];
  }[];
  turn: number; // 0, 1, 2, 3
  state: 'DRAW' | 'THINKING' | 'DISCARD' | 'INTERRUPT' | 'RESOLVE';
  lastDiscard: { tile: Tile, playerIndex: number } | null;
  actionTimer: number; // Frames for countdown
  effects: VisualEffect[];
}

const INITIAL_PLAYERS: Player[] = [
  { id: 0, name: 'Ming', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ming', score: 2400, isDealer: true, flowerCount: 1, wind: '南', seatWind: '南' },
  { id: 1, name: '佑賢', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix', score: -300, isDealer: false, flowerCount: 1, wind: '西', seatWind: '西' },
  { id: 2, name: '上家', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Granny', score: -2400, isDealer: false, flowerCount: 3, wind: '北', seatWind: '北' },
  { id: 3, name: '初鹿牧...', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Milo', score: 300, isDealer: false, flowerCount: 1, wind: '東', seatWind: '東' },
];

// --- Helper Component: Player HUD ---
interface PlayerCardProps {
  player: Player;
  position: 'bottom' | 'right' | 'top' | 'left';
  isActive: boolean;
  isSelf?: boolean;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, position, isActive, isSelf = false }) => {
  
  const getPositionClasses = () => {
    switch(position) {
      case 'bottom': return "bottom-6 left-6 flex-row items-end";
      case 'right': return "right-4 top-1/2 -translate-y-1/2 flex-col items-end";
      case 'top': return "top-4 left-1/2 -translate-x-1/2 flex-col items-center"; 
      case 'left': return "left-4 top-1/2 -translate-y-1/2 flex-col items-start";
      default: return "";
    }
  };

  return (
    <div className={`absolute ${getPositionClasses()} flex gap-3 pointer-events-auto transition-all duration-300 ${isActive ? 'opacity-100 scale-105' : 'opacity-80 scale-100'}`}>
      
      {/* Avatar Container */}
      <div className={`relative group ${isSelf ? 'order-1' : ''}`}>
        {/* Turn Indicator Glow */}
        {isActive && (
          <div className="absolute -inset-2 bg-yellow-500/30 rounded-full blur-md animate-pulse"></div>
        )}
        
        {/* Avatar Image */}
        <div className={`relative w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden border-2 shadow-lg z-10 bg-[#1a1a1a] ${isActive ? 'border-yellow-400' : 'border-gray-600'}`}>
          <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
        </div>

        {/* Dealer Badge */}
        {player.isDealer && (
          <div className="absolute -top-1 -right-1 z-20 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center border border-white shadow-sm">
             <span className="text-white text-[10px] font-serif font-bold">莊</span>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className={`flex flex-col ${isSelf ? 'items-start order-2 mb-2' : (position === 'right' ? 'items-end mr-1' : (position === 'left' ? 'items-start ml-1' : 'items-center'))} z-0`}>
         <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 shadow-lg">
            <div className="text-white text-xs md:text-sm font-bold tracking-wide flex items-center gap-2">
               {player.name}
            </div>
            <div className={`text-xs font-mono font-bold mt-0.5 ${player.score >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
               {player.score > 0 ? '+' : ''}{player.score}
            </div>
         </div>
         <div className="mt-1 flex gap-1">
            {[...Array(player.flowerCount)].map((_, i) => (
                <span key={i} className="text-[10px]">🌸</span>
            ))}
         </div>
      </div>
    </div>
  );
};

export const GameCanvas: React.FC<GameCanvasProps> = ({ setView }) => {
  const renderRef = useRef<HTMLDivElement>(null);
  const p5Ref = useRef<any>(null);
  
  // Game State Ref (Mutable for P5 performance)
  const gameRef = useRef<GameState>({
    deck: [],
    players: [],
    turn: 0,
    state: 'DRAW',
    lastDiscard: null,
    actionTimer: 0,
    effects: []
  });

  const [remainingTiles, setRemainingTiles] = useState(144);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [uiPlayers, setUiPlayers] = useState<Player[]>(INITIAL_PLAYERS);
  const [isMuted, setIsMuted] = useState(false);
  const [availableActions, setAvailableActions] = useState<ActionType[]>([]);

  // --- Game Logic Helpers ---
  
  const countTiles = (hand: Tile[], suit: Suit, value: number) => {
      return hand.filter(t => t.suit === suit && t.value === value).length;
  };

  const checkHumanActions = (discardedTile: Tile) => {
      const hand = gameRef.current.players[0].hand;
      const actions: ActionType[] = [];
      
      const count = countTiles(hand, discardedTile.suit, discardedTile.value);
      if (count >= 2) actions.push('PONG');
      if (count === 3) actions.push('KONG');
      // Mock HU chance
      if (count >= 1 && Math.random() > 0.95) actions.push('HU');

      // Demo Force: Ensure user sees options occasionally
      if (gameRef.current.deck.length < 130 && actions.length === 0 && Math.random() > 0.8) {
          actions.push('PONG');
      }
      return actions;
  };

  const checkForAiAction = (game: GameState, discardedTile: Tile, fromPlayer: number) => {
      // Iterate 1..3 to check other players
      for (let offset = 1; offset < 4; offset++) {
          const pIdx = (fromPlayer + offset) % 4;
          if (pIdx === 0) continue; // Skip Human
          
          const player = game.players[pIdx];
          const c = countTiles(player.hand, discardedTile.suit, discardedTile.value);
          
          // AI Action Probabilities
          if (c >= 2 && Math.random() < 0.5) { // 50% chance to Pong if pair exists
               return { type: 'PONG' as ActionType, playerIdx: pIdx };
          }
          if (c === 3 && Math.random() < 0.7) {
               return { type: 'KONG' as ActionType, playerIdx: pIdx };
          }
      }
      
      // Demo Cheat: Force an AI Pong occasionally if nothing happens for a while
      if (Math.random() < 0.05 && fromPlayer !== 0) {
         const nextAI = (fromPlayer + 1) % 4;
         if (nextAI !== 0) return { type: 'PONG' as ActionType, playerIdx: nextAI };
      }
      
      return null;
  };

  const executeAction = (game: GameState, playerIdx: number, action: ActionType, tile: Tile, fromIdx: number) => {
      const player = game.players[playerIdx];
      
      // Remove tiles from hand
      const toRemove = action === 'PONG' ? 2 : 3;
      let removedCount = 0;
      player.hand = player.hand.filter(t => {
          if (removedCount < toRemove && t.suit === tile.suit && t.value === tile.value) {
              removedCount++;
              return false;
          }
          return true;
      });

      // Logic to ensure we actually removed tiles for the 'Demo Cheat' case where AI might not have them
      // If cheat triggered and tiles missing, we just steal random tiles to keep hand size correct for demo visuals
      if (removedCount < toRemove) {
         for(let i=0; i<(toRemove - removedCount); i++) player.hand.pop();
      }

      // Add Meld
      const meldTiles = Array(action === 'KONG' ? 4 : 3).fill(tile);
      player.melds.push({ type: action, tiles: meldTiles, fromPlayer: fromIdx });

      // Remove from Discard Pile (The last discarded tile)
      game.players[fromIdx].discards.pop();

      // Update Turn
      game.turn = playerIdx;
      game.state = 'DISCARD';
      game.actionTimer = 60; // AI delay before discarding
      
      // FX
      const fxX = playerIdx === 1 ? window.innerWidth - 150 : (playerIdx === 2 ? window.innerWidth/2 : 150);
      const fxY = playerIdx === 1 ? window.innerHeight/2 : (playerIdx === 2 ? 150 : window.innerHeight/2);
      
      triggerEffect(game, 'TEXT', action === 'PONG' ? '碰' : '槓', fxX, fxY);
      if (action === 'HU') triggerEffect(game, 'LIGHTNING', '胡', fxX, fxY);
      triggerEffect(game, 'PARTICLES', undefined, fxX, fxY);
  };

  const handlePlayerAction = (action: ActionType | 'PASS') => {
      setAvailableActions([]);
      const game = gameRef.current;
      const tile = game.lastDiscard?.tile;
      if (action === 'PASS' || !tile) {
          // If pass, check if AI wants it? Or just next turn. 
          // For simplicity, Pass -> Next Turn.
          const nextPlayer = (game.lastDiscard!.playerIndex + 1) % 4;
          game.turn = nextPlayer;
          game.state = 'DRAW';
          return;
      }
      
      // Human Action
      executeAction(game, 0, action, tile, game.lastDiscard!.playerIndex);
  };
  
  // FX Helpers
  const triggerEffect = (game: GameState, type: 'TEXT' | 'LIGHTNING' | 'PARTICLES', text?: string, x?: number, y?: number) => {
      game.effects.push({
          id: Date.now() + Math.random(),
          type,
          text,
          x: x || 0,
          y: y || 0,
          life: type === 'LIGHTNING' ? 25 : 50,
          particles: type === 'PARTICLES' ? createParticles(x || 0, y || 0) : undefined
      });
  };

  const createParticles = (x: number, y: number): Particle[] => {
      const pArr: Particle[] = [];
      for(let i=0; i<25; i++) {
          pArr.push({
              x, y,
              vx: (Math.random() - 0.5) * 20,
              vy: (Math.random() - 0.5) * 20,
              life: 30 + Math.random() * 20,
              color: Math.random() > 0.5 ? '#fbbf24' : '#fcd34d',
              size: 6 + Math.random() * 8
          });
      }
      return pArr;
  };

  useEffect(() => {
    if (!window.p5) return;

    const sketch = (p: any) => {
      // Base Constants (Design Reference: 1280x720)
      const BASE_TILE_W = 44;
      const BASE_TILE_H = 60;
      const BASE_BOTTOM_OFFSET = 130;
      
      // Globals for hit test & layout
      let p0HandStartX = 0; 
      let p0TileW = 0;
      let hoveredTileIndex = -1;
      let globalScale = 1;

      p.setup = () => {
        const canvas = p.createCanvas(window.innerWidth, window.innerHeight);
        canvas.parent(renderRef.current!);
        p.frameRate(30);
        p.textFont("'Noto Serif TC', 'Roboto', serif");
        startNewGame();
      };

      p.windowResized = () => {
        p.resizeCanvas(window.innerWidth, window.innerHeight);
      };

      const startNewGame = () => {
        const deck = generateDeck();
        const players = INITIAL_PLAYERS.map((info, idx) => {
            const count = 16; 
            const hand = deck.splice(0, count).sort((a,b) => a.value - b.value);
            return { info, hand, discards: [], melds: [] };
        });

        gameRef.current = {
          deck, players, turn: 0, state: 'DRAW', lastDiscard: null, actionTimer: 0, effects: []
        };
        setRemainingTiles(deck.length);
        setAvailableActions([]);
      };

      p.draw = () => {
        // Calculate Responsive Scale
        // Base reference width 1280. Scale down if smaller, scale up slightly if larger but cap it.
        globalScale = Math.min(1.2, Math.max(0.6, p.width / 1280));
        
        p.background(COLORS.TABLE_BG_DARK);
        drawTable(p);
        drawTableInfo(p);
        
        const activeIdx = gameRef.current.turn;
        
        // Z-Index Control: Draw in Painter's Order (Back to Front)
        // 2 (Top) -> 1 (Right) -> 3 (Left) -> 0 (Bottom/Self)
        const renderOrder = [2, 1, 3, 0];
        
        renderOrder.forEach(i => {
           const player = gameRef.current.players[i];
           drawPlayer(p, player, i, i === activeIdx);
           drawDiscards(p, player, i);
        });

        drawCenterCompass(p);
        drawEffects(p); 
        updateGameLogic();
        updateHitTest(p);

        if (p.frameCount % 15 === 0) {
           setActivePlayerIndex(gameRef.current.turn);
           setRemainingTiles(gameRef.current.deck.length);
        }
      };

      const updateGameLogic = () => {
          const game = gameRef.current;
          
          if (game.state === 'DRAW') {
             if (game.deck.length === 0) return; // End game check
             const currentPlayer = game.players[game.turn];
             if (currentPlayer.hand.length % 3 === 1) { 
                 const newTile = game.deck.pop();
                 if (newTile) currentPlayer.hand.push(newTile);
             }
             game.state = 'THINKING';
             game.actionTimer = 15; 
          }
          else if (game.state === 'THINKING') {
              if (game.actionTimer > 0) { game.actionTimer--; return; }
              game.state = 'DISCARD';
              game.actionTimer = 300; 
          }
          else if (game.state === 'DISCARD') {
              if (game.actionTimer > 0) game.actionTimer--;
              if (game.actionTimer <= 0) {
                  const currentHand = game.players[game.turn].hand;
                  handleDiscard(game.turn, currentHand.length - 1);
                  return;
              }
              if (game.turn !== 0 && game.actionTimer === 280) {
                  const hand = game.players[game.turn].hand;
                  handleDiscard(game.turn, Math.floor(Math.random() * hand.length));
              }
          }
          else if (game.state === 'INTERRUPT') {
              if (game.actionTimer > 0) game.actionTimer--;
              if (game.actionTimer <= 0 && availableActions.length === 0) {
                   // Timeout, proceed
                  const nextPlayer = (game.lastDiscard!.playerIndex + 1) % 4;
                  game.turn = nextPlayer;
                  game.state = 'DRAW';
              }
          }
      };

      const handleDiscard = (playerIdx: number, tileIdx: number) => {
          const game = gameRef.current;
          const player = game.players[playerIdx];
          if (!player.hand[tileIdx]) return;

          const discardedTile = player.hand.splice(tileIdx, 1)[0];
          player.discards.push(discardedTile);
          player.hand.sort((a,b) => a.value - b.value); 

          game.lastDiscard = { tile: discardedTile, playerIndex: playerIdx };
          
          // 1. Check Human Interaction
          if (playerIdx !== 0) {
              const actions = checkHumanActions(discardedTile);
              if (actions.length > 0) {
                  setAvailableActions(actions);
                  game.state = 'INTERRUPT';
                  game.actionTimer = 300;
                  return;
              }
          }

          // 2. Check AI Interaction 
          const aiAction = checkForAiAction(game, discardedTile, playerIdx);
          if (aiAction) {
             executeAction(game, aiAction.playerIdx, aiAction.type, discardedTile, playerIdx);
             return;
          }
          
          // 3. No interruptions -> Next Turn
          game.state = 'INTERRUPT'; 
          game.actionTimer = 10; 
      };

      const drawEffects = (p: any) => {
          const game = gameRef.current;
          for (let i = game.effects.length - 1; i >= 0; i--) {
              const fx = game.effects[i];
              fx.life--;

              if (fx.type === 'LIGHTNING') {
                   p.push();
                   p.stroke(0, 255, 255, fx.life * 10);
                   p.strokeWeight(4);
                   p.noFill();
                   p.beginShape();
                   for(let k=0; k<p.width; k+=30) {
                       p.vertex(k, p.height/2 + p.random(-80, 80));
                   }
                   p.endShape();
                   p.noStroke();
                   p.fill(255, 255, 255, fx.life * 3);
                   p.rect(0, 0, p.width, p.height);
                   p.pop();
              } 
              else if (fx.type === 'TEXT') {
                   p.push();
                   p.translate(fx.x || p.width/2, fx.y || p.height/2);
                   const scale = p.map(fx.life, 50, 0, 0.8, 1.5);
                   p.scale(scale);
                   p.textAlign(p.CENTER, p.CENTER);
                   p.textSize(100 * globalScale);
                   p.textStyle(p.BOLD);
                   p.fill(0, 0, 0, fx.life * 5);
                   p.text(fx.text, 6, 6); 
                   p.fill('#fbbf24');
                   p.stroke('#b91c1c');
                   p.strokeWeight(4);
                   p.text(fx.text, 0, 0);
                   p.pop();
              }
              else if (fx.type === 'PARTICLES' && fx.particles) {
                  fx.particles.forEach(pt => {
                      pt.x += pt.vx;
                      pt.y += pt.vy;
                      pt.life--;
                      p.noStroke();
                      p.fill(pt.color);
                      p.circle(pt.x, pt.y, pt.size * globalScale);
                  });
              }

              if (fx.life <= 0) game.effects.splice(i, 1);
          }
      };

      // --- Rendering ---
      const drawTable = (p: any) => {
        const ctx = p.drawingContext;
        const gradient = ctx.createRadialGradient(p.width/2, p.height/2, 200, p.width/2, p.height/2, p.height);
        gradient.addColorStop(0, '#0f4c3a'); 
        gradient.addColorStop(1, '#022c22'); 
        ctx.fillStyle = gradient;
        p.noStroke();
        p.rect(0, 0, p.width, p.height);
      };

      const drawTableInfo = (p: any) => {
         p.push();
         p.scale(globalScale);
         p.translate(24, 90);
         p.fill(0, 0, 0, 80);
         p.stroke(COLORS.UI_BORDER_GOLD);
         p.rect(0, 0, 180, 80, 12);
         p.noStroke();
         p.fill('#fbbf24');
         p.textSize(14);
         p.text("CURRENT ROUND", 16, 12, 150);
         p.fill(255);
         p.textSize(22);
         p.textStyle(p.BOLD);
         p.text("南風北局 (2/4)", 16, 45);
         p.textSize(28);
         p.fill('#34d399'); 
         p.text(gameRef.current.deck.length, 130, 45);
         p.pop();
      };

      const drawCenterCompass = (p: any) => {
          p.push();
          p.translate(p.width/2, p.height/2 - 20 * globalScale);
          p.scale(globalScale);
          const boxSize = 120;
          p.fill(0, 0, 0, 200);
          p.stroke(COLORS.UI_BORDER_GOLD);
          p.strokeWeight(2);
          p.rectMode(p.CENTER);
          p.rect(0, 0, boxSize, boxSize, 24);
          
          const timeLeft = Math.ceil(gameRef.current.actionTimer / 30);
          const isInterrupt = gameRef.current.state === 'INTERRUPT';
          
          p.noStroke();
          p.textAlign(p.CENTER, p.CENTER);
          p.textSize(40);
          p.fill(isInterrupt ? '#fbbf24' : COLORS.CYAN_LED);
          p.text(isInterrupt ? "!" : timeLeft, 0, 0);

          const turn = gameRef.current.turn;
          const offset = boxSize/2 - 20;
          const positions = [
             { label: '南', x: 0, y: offset, idx: 0 }, 
             { label: '西', x: offset, y: 0, idx: 1 }, 
             { label: '北', x: 0, y: -offset, idx: 2 }, 
             { label: '東', x: -offset, y: 0, idx: 3 }  
          ];

          const ctx = p.drawingContext;
          positions.forEach(pos => {
              p.push();
              p.translate(pos.x, pos.y);
              if (turn === pos.idx) {
                 ctx.shadowBlur = 15;
                 ctx.shadowColor = '#fbbf24';
                 p.fill('#fbbf24');
                 p.textSize(24);
              } else {
                 ctx.shadowBlur = 0;
                 p.fill(255, 255, 255, 50);
                 p.textSize(18);
              }
              p.textStyle(p.BOLD);
              p.text(pos.label, 0, 0);
              p.pop();
          });
          p.pop();
      };
      
      const drawPlayer = (p: any, player: any, index: number, isActive: boolean) => {
         p.push();
         
         const s = globalScale;
         const isSide = index === 1 || index === 3;
         
         // Scaled Metrics
         const TILE_W = BASE_TILE_W * s;
         const TILE_H = BASE_TILE_H * s;
         const MELD_SCALE = 0.85;
         const MELD_W = TILE_W * MELD_SCALE;
         const MELD_H = TILE_H * MELD_SCALE;
         const GAP_BETWEEN_HAND_MELD = 30 * s;
         const GAP_NEW_TILE = 16 * s;
         const MELD_GAP = 8 * s;
         const SIDE_TILE_W = 20 * s; // Compressed width for side players
         
         // Safety Margins (Scaled)
         const P0_RIGHT_MARGIN_SAFE = 160 * s; // Minimum space P0 must leave for P1
         const SIDE_PLAYER_BOTTOM_SAFE = 180 * s; // Minimum space P1/P3 must leave for P0
         const BASE_BOTTOM_Y = BASE_BOTTOM_OFFSET * s;

         // --- DIMENSION CALCULATIONS ---
         
         const handLen = player.hand.length;
         const hasNew = handLen % 3 === 2;
         
         // Calculate Visual Length of Hand
         // For Side players, "Width" is effectively height
         const tileWidthInHand = isSide ? SIDE_TILE_W : TILE_W;
         let handVisualSize = (handLen * tileWidthInHand) + (hasNew ? GAP_NEW_TILE : 0);
         
         // Calculate Visual Length of Melds
         const meldsVisualSize = player.melds.reduce((acc: number, m: Meld) => {
            return acc + (m.tiles.length * MELD_W) + MELD_GAP;
         }, 0);
         
         const totalContentSize = handVisualSize + (meldsVisualSize > 0 ? GAP_BETWEEN_HAND_MELD + meldsVisualSize : 0);

         // --- POSITIONING & RENDERING ---

         if (index === 0) { 
             // --- P0 (SELF) ---
             // Layout: [Hand] ... [Melds]
             // Goal: Center content, but clamp to avoid P1 on right.
             
             p.translate(0, p.height - BASE_BOTTOM_Y); // Y Anchor
             
             // 1. Ideal Center Start
             let startX = (p.width - totalContentSize) / 2;
             
             // 2. Right Collision Constraint
             const endX = startX + totalContentSize;
             const limitX = p.width - P0_RIGHT_MARGIN_SAFE;
             if (endX > limitX) {
                 startX = limitX - totalContentSize;
             }
             
             // 3. Left Boundary Constraint (Safety)
             if (startX < 20 * s) startX = 20 * s;

             // Render
             // Draw Hand (Left to Right)
             drawHandSequence(p, player.hand, startX, 0, TILE_W, TILE_H, 1, 'STANDING', hasNew, 0, GAP_NEW_TILE);
             
             // Draw Melds (Left to Right, after Hand)
             if (player.melds.length > 0) {
                const meldStartX = startX + handVisualSize + GAP_BETWEEN_HAND_MELD;
                drawMeldsFixed(p, player.melds, meldStartX, 0, MELD_W, MELD_H, 1, 'FLAT', MELD_GAP);
             }

             // Update Hit Test
             p0HandStartX = startX; 
             p0TileW = TILE_W;
             
         } else if (index === 1) {
             // --- P1 (RIGHT) ---
             // Layout: Top -> Down
             // [Hand]
             // ...
             // [Melds]
             // Rotated 90deg. Coordinate X is Down.
             
             p.translate(p.width - (140 * s), 0);
             p.rotate(p.HALF_PI);
             
             // 1. Ideal Center (Vertical on screen)
             let startY = (p.height - totalContentSize) / 2;
             
             // 2. Bottom Collision Constraint (Avoid P0)
             // The "End" of P1 is the bottom-most Meld.
             const endY = startY + totalContentSize;
             const limitY = p.height - SIDE_PLAYER_BOTTOM_SAFE;
             
             if (endY > limitY) {
                 startY = limitY - totalContentSize;
             }

             // Render
             drawHandSequence(p, player.hand, startY, 0, TILE_W, TILE_H, 1, 'SIDE_STANDING', hasNew, 1, GAP_NEW_TILE);
             
             if (player.melds.length > 0) {
                 const meldStartY = startY + handVisualSize + GAP_BETWEEN_HAND_MELD;
                 drawMeldsFixed(p, player.melds, meldStartY, 0, MELD_W, MELD_H, 1, 'FLAT', MELD_GAP);
             }
             
         } else if (index === 2) {
             // --- P2 (TOP) ---
             // Layout: [Hand] ... [Melds]
             // Rotated 180. 
             
             p.translate(p.width, 100 * s);
             p.rotate(p.PI);
             
             // P2 is safe, just center it.
             const startX = (p.width - totalContentSize) / 2;
             
             drawHandSequence(p, player.hand, startX, 0, TILE_W, TILE_H, 1, 'BACK_STANDING', hasNew, 2, GAP_NEW_TILE);
             
             if (player.melds.length > 0) {
                 const meldStartX = startX + handVisualSize + GAP_BETWEEN_HAND_MELD;
                 drawMeldsFixed(p, player.melds, meldStartX, 0, MELD_W, MELD_H, 1, 'FLAT', MELD_GAP);
             }

         } else if (index === 3) {
             // --- P3 (LEFT) ---
             // Layout: Top -> Down
             
             p.translate(140 * s, p.height);
             p.rotate(-p.HALF_PI); 
             
             // 1. Ideal Center (Vertical)
             let startY = (p.height - totalContentSize) / 2;
             
             // 2. Bottom Collision Constraint (Avoid P0)
             const endY = startY + totalContentSize;
             const limitY = p.height - SIDE_PLAYER_BOTTOM_SAFE;
             if (endY > limitY) {
                 startY = limitY - totalContentSize;
             }

             drawHandSequence(p, player.hand, startY, 0, TILE_W, TILE_H, 1, 'SIDE_STANDING', hasNew, 3, GAP_NEW_TILE);
             
             if (player.melds.length > 0) {
                 const meldStartY = startY + handVisualSize + GAP_BETWEEN_HAND_MELD;
                 drawMeldsFixed(p, player.melds, meldStartY, 0, MELD_W, MELD_H, 1, 'FLAT', MELD_GAP);
             }
         }
         p.pop();
      };
      
      const drawDiscards = (p: any, player: any, index: number) => {
          const tiles = player.discards;
          if (tiles.length === 0) return;
          p.push();
          const s = globalScale;
          const w = 34 * s; 
          const h = 46 * s; 
          const cols = 6; 
          p.translate(p.width/2, p.height/2);
          const RIVER_OFFSET = 120 * s;
          
          if (index === 0) p.translate(0, RIVER_OFFSET);
          if (index === 1) { p.translate(RIVER_OFFSET + (40*s), 0); p.rotate(-p.HALF_PI); }
          if (index === 2) { p.translate(0, -RIVER_OFFSET); p.rotate(p.PI); }
          if (index === 3) { p.translate(-RIVER_OFFSET - (40*s), 0); p.rotate(p.HALF_PI); }
          
          const startX = -(cols * w) / 2;
          tiles.forEach((tile: Tile, i: number) => {
              const r = Math.floor(i / cols);
              const c = i % cols;
              drawTile(p, startX + c*w, r*(h-(6*s)), tile, w, h, 'FLAT');
          });
          p.pop();
      }

      const drawMeldsFixed = (p: any, melds: Meld[], startX: number, y: number, w: number, h: number, dir: 1 | -1, type: 'FLAT', gap: number) => {
          if (!melds || melds.length === 0) return;
          let cx = startX;
          
          melds.forEach(meld => {
             const count = meld.tiles.length;
             // Draw tiles for this meld
             for(let i=0; i<count; i++) {
                 // If dir=1 (L->R), we draw at cx. 
                 const drawX = dir === 1 ? cx : cx - w;
                 // Align bottom of tile to y
                 drawTile(p, drawX, y + ((60*globalScale) * 0.85 - h), meld.tiles[i], w, h, type); 
                 cx += (w * dir);
             }
             cx += (gap * dir);
          });
      };

      const drawHandSequence = (p: any, hand: Tile[], startX: number, y: number, w: number, h: number, dir: 1 | -1, type: 'STANDING' | 'BACK_STANDING' | 'SIDE_STANDING', hasNewTile: boolean, playerIdx: number, newTileGap: number) => {
          const count = hand.length;
          const gapIndex = hasNewTile ? count - 1 : -1;
          
          let cx = startX;
          for (let i = 0; i < count; i++) {
              if (i === gapIndex) cx += (newTileGap * dir);
              const drawX = dir === 1 ? cx : cx - w;
              let renderY = y;
              if (playerIdx === 0 && i === hoveredTileIndex) renderY -= (20 * globalScale);
              drawTile(p, drawX, renderY, hand[i], w, h, type);
              cx += (w * dir);
          }
          return cx;
      };

      const drawTile = (p: any, x: number, y: number, tile: Tile | null, w: number, h: number, type: 'STANDING' | 'FLAT' | 'BACK_STANDING' | 'SIDE_STANDING') => {
         p.push();
         p.translate(x, y);
         const ctx = p.drawingContext;
         const BACK_COLOR = '#064e3b'; 
         const FACE_COLOR = '#fdfbf7'; 
         const depth = type === 'STANDING' ? 6 : (type === 'FLAT' ? 4 : 5);
         const sDepth = depth * globalScale;

         if (type === 'STANDING') {
             p.noStroke();
             p.fill(0,0,0, 60); p.rect(sDepth, sDepth, w, h, sDepth); 
             p.fill(BACK_COLOR); p.rect(0, 0, w, h, sDepth);
             p.fill('#e2e8f0'); p.rect(0, -2*globalScale, w, h, sDepth);
             p.fill(FACE_COLOR); p.rect(0, -4*globalScale, w, h, sDepth);
             if (tile) drawTileFace(p, tile, w, h, -4*globalScale);
         } else if (type === 'FLAT') {
             p.noStroke();
             p.fill(0,0,0, 50); p.rect(sDepth*0.8, sDepth*0.8, w, h, 4);
             p.fill(BACK_COLOR); p.rect(0, 0, w, h, 4);
             p.fill(FACE_COLOR); p.rect(0, -5*globalScale, w, h, 4); 
             if (tile) drawTileFace(p, tile, w, h, -5*globalScale);
         } else if (type === 'BACK_STANDING') {
             p.noStroke();
             p.fill(0,0,0, 50); p.rect(sDepth*0.8, sDepth*0.8, w, h, 5);
             p.fill(BACK_COLOR); p.rect(0, 0, w, h, 5);
             // Highlight
             p.fill(255,255,255,40); p.rect(0,0,w,h/3,5,5,0,0);
         } else if (type === 'SIDE_STANDING') {
             p.noStroke();
             p.fill(0,0,0, 50); p.rect(sDepth*0.6, sDepth*0.6, w, h, 2);
             p.fill(BACK_COLOR); p.rect(0, 0, w, h, 2);
             p.fill('#047857'); p.rect(0, 0, w, 4*globalScale, 2); 
         }
         p.pop();
      };
      
      const drawTileFace = (p: any, tile: Tile, w: number, h: number, yOffset: number) => {
          p.textAlign(p.CENTER, p.CENTER);
          p.translate(w/2, h/2 + yOffset);
          const INK_RED = '#b91c1c'; 
          const INK_GREEN = '#15803d'; 
          const INK_BLUE = '#1e3a8a'; 
          const INK_BLACK = '#0f172a'; 
          let displayStr = `${tile.value}`;
          let subStr = "";
          let color = INK_BLUE;
          
          if (tile.suit === Suit.DOTS) { subStr = "●"; color = INK_BLUE; }
          if (tile.suit === Suit.BAMBOO) { subStr = "║"; color = INK_GREEN; }
          if (tile.suit === Suit.CHARACTERS) { 
              const chars = ["一","二","三","四","五","六","七","八","九"];
              displayStr = chars[tile.value-1]; subStr = "萬"; color = INK_RED;
          }
          if (tile.suit === Suit.WINDS) {
              const winds = ["東","南","西","北"];
              displayStr = winds[tile.value-1]; subStr = ""; color = INK_BLACK;
          }
          if (tile.suit === Suit.DRAGONS) {
              const dragons = ["中","發","◻"];
              displayStr = dragons[tile.value-1];
              color = tile.value === 1 ? INK_RED : (tile.value === 2 ? INK_GREEN : INK_BLACK);
          }
          if (tile.suit === Suit.FLOWERS) {
              displayStr = "✿"; subStr = `${tile.value}`; color = '#d97706'; 
          }
          const fontSizeMain = (tile.suit === Suit.CHARACTERS || tile.suit === Suit.WINDS) ? w * 0.65 : w * 0.75;
          if (tile.suit === Suit.DRAGONS && tile.value === 3) {
               p.noFill(); p.stroke('#1e293b'); p.strokeWeight(2); p.rect(-w/3, -h/3, w*0.66, h*0.66); return;
          }
          p.textSize(fontSizeMain); p.textStyle(p.BOLD);
          p.fill(color); p.text(displayStr, 0, 0);
          if (subStr) {
              p.textSize(w * 0.28);
              p.fill(color); p.text(subStr, 0, h*0.3);
          }
      };

      const updateHitTest = (p: any) => {
          hoveredTileIndex = -1;
          const mX = p.mouseX;
          const mY = p.mouseY;
          const handY = p.height - (130 * globalScale);
          // Hit zone height tolerance
          if (mY > handY - 60 && mY < handY + 60) {
              if (p0HandStartX !== 0) {
                  const relativeX = mX - p0HandStartX;
                  if (relativeX >= 0) {
                      const p0HandLen = gameRef.current.players[0].hand.length;
                      const isNewTileState = p0HandLen % 3 === 2;
                      const effectiveW = p0TileW || 44;
                      const normalWidth = (isNewTileState ? p0HandLen - 1 : p0HandLen) * effectiveW;
                      
                      if (isNewTileState && relativeX > normalWidth) {
                          if (relativeX > normalWidth + (20 * globalScale)) hoveredTileIndex = p0HandLen - 1;
                      } else if (relativeX <= normalWidth) {
                           const idx = Math.floor(relativeX / effectiveW);
                           if (idx < p0HandLen) hoveredTileIndex = idx;
                      }
                  }
              }
          }
          if (p.mouseIsPressed && hoveredTileIndex !== -1) {
              if (gameRef.current.state === 'DISCARD' && gameRef.current.turn === 0) {
                  if (p.frameCount % 10 === 0) {
                      handleDiscard(0, hoveredTileIndex);
                  }
              }
          }
      };
    };

    const p5Instance = new window.p5(sketch);
    p5Ref.current = p5Instance;

    return () => {
      p5Instance.remove();
    };
  }, []);

  const activePlayer = uiPlayers[activePlayerIndex];

  return (
    <div className="relative w-full h-full bg-[#0a0a0a] overflow-hidden select-none" ref={renderRef}>
      
      {/* Top Bar */}
      <div className="absolute top-0 w-full h-12 bg-black/40 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 z-20">
          <div className="flex items-center gap-4">
            <Button variant="secondary" className="px-2 py-1 text-xs flex items-center gap-1" onClick={() => setView(AppView.LOBBY)}>
                 <ChevronLeft size={14}/> 離開
            </Button>
            <div className="flex items-center gap-2 text-yellow-500 text-sm font-bold">
                <span className="bg-yellow-500/20 px-2 py-0.5 rounded">房號 80440</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-gray-400">
              <Wifi size={16} className="text-green-500"/>
              <Battery size={16} className="text-white"/>
              <div className="h-4 w-[1px] bg-gray-600 mx-1"></div>
              <button onClick={() => setIsMuted(!isMuted)}>
                 {isMuted ? <Volume2 size={18} className="text-red-500"/> : <Volume2 size={18} />}
              </button>
              <Menu size={20} className="cursor-pointer hover:text-white"/>
          </div>
      </div>

      {/* Players HUD */}
      {uiPlayers.map((p, i) => {
          let pos: 'bottom'|'right'|'top'|'left' = 'bottom';
          if (i === 0) pos = 'bottom';
          if (i === 1) pos = 'right';
          if (i === 2) pos = 'top';
          if (i === 3) pos = 'left';
          return (
            <PlayerCard 
                key={p.id} 
                player={p} 
                position={pos} 
                isActive={activePlayerIndex === i} 
                isSelf={i === 0}
            />
          );
      })}

      {/* --- ACTION MENU OVERLAY --- */}
      {availableActions.length > 0 && (
        <div className="absolute bottom-48 left-1/2 -translate-x-1/2 z-50 flex gap-4 animate-bounce-in">
            <div className="flex gap-4 p-2 bg-black/60 backdrop-blur-xl rounded-2xl border border-yellow-500/30 shadow-[0_0_50px_rgba(251,191,36,0.2)]">
                {/* Always show Pass */}
                <button 
                    onClick={() => handlePlayerAction('PASS')}
                    className="w-16 h-16 rounded-full bg-gray-700/80 hover:bg-gray-600 border-2 border-gray-500 text-white font-bold text-lg shadow-lg transition-transform hover:scale-110"
                >
                    過
                </button>

                {availableActions.includes('CHOW') && (
                   <button 
                     onClick={() => handlePlayerAction('CHOW')}
                     className="w-20 h-20 rounded-full bg-gradient-to-br from-green-600 to-emerald-800 border-4 border-green-400 text-white font-black text-3xl shadow-xl transition-transform hover:scale-110"
                   >
                     吃
                   </button>
                )}
                {availableActions.includes('PONG') && (
                   <button 
                     onClick={() => handlePlayerAction('PONG')}
                     className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-indigo-800 border-4 border-blue-400 text-white font-black text-3xl shadow-xl transition-transform hover:scale-110"
                   >
                     碰
                   </button>
                )}
                {availableActions.includes('KONG') && (
                   <button 
                     onClick={() => handlePlayerAction('KONG')}
                     className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-800 border-4 border-purple-400 text-white font-black text-3xl shadow-xl transition-transform hover:scale-110"
                   >
                     槓
                   </button>
                )}
                {availableActions.includes('HU') && (
                   <button 
                     onClick={() => handlePlayerAction('HU')}
                     className="w-24 h-24 -mt-4 rounded-full bg-gradient-to-br from-red-500 to-red-900 border-4 border-yellow-400 text-yellow-100 font-black text-5xl shadow-[0_0_30px_rgba(220,38,38,0.8)] animate-pulse transition-transform hover:scale-110"
                   >
                     胡
                   </button>
                )}
            </div>
        </div>
      )}

    </div>
  );
};