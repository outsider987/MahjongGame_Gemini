
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
const PlayerCard = ({ player, position, isActive, isSelf = false }: { player: Player, position: 'bottom' | 'right' | 'top' | 'left', isActive: boolean, isSelf?: boolean }) => {
  
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

  // React State for UI Overlays
  const [remainingTiles, setRemainingTiles] = useState(144);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [uiPlayers, setUiPlayers] = useState<Player[]>(INITIAL_PLAYERS);
  const [isMuted, setIsMuted] = useState(false);
  
  // Action Menu State
  const [availableActions, setAvailableActions] = useState<ActionType[]>([]);

  // Helper to check actions for Human (Player 0)
  const checkHumanActions = (discardedTile: Tile) => {
      const hand = gameRef.current.players[0].hand;
      const actions: ActionType[] = [];
      
      // CHECK PONG (Pair matches discard)
      const count = hand.filter(t => t.suit === discardedTile.suit && t.value === discardedTile.value).length;
      if (count >= 2) actions.push('PONG');
      
      // CHECK KONG (Triplet matches discard)
      if (count === 3) actions.push('KONG');
      
      // CHECK HU (Simplistic Mock: Random chance if pair or set matches for demo fun)
      if (count >= 1 && Math.random() > 0.9) actions.push('HU');

      // Force add PONG for demo if deck is small (to ensure user sees it eventually)
      if (gameRef.current.deck.length < 130 && actions.length === 0 && Math.random() > 0.7) {
          actions.push('PONG');
      }

      return actions;
  };

  const handlePlayerAction = (action: ActionType | 'PASS') => {
      setAvailableActions([]); // Hide UI
      const game = gameRef.current;
      const tile = game.lastDiscard?.tile;
      
      if (action === 'PASS' || !tile) {
          // Resume game
          const nextPlayer = (game.lastDiscard!.playerIndex + 1) % 4;
          game.turn = nextPlayer;
          game.state = 'DRAW';
          return;
      }
      
      // Execute Action
      const playerIdx = 0; // Human
      const player = game.players[playerIdx];
      
      // Visual Effect
      triggerEffect(game, action === 'HU' ? 'LIGHTNING' : 'TEXT', action === 'HU' ? '胡' : (action === 'PONG' ? '碰' : '槓'));
      triggerEffect(game, 'PARTICLES', undefined, window.innerWidth/2, window.innerHeight - 200);

      if (action === 'PONG') {
          // Remove 2 matching tiles
          let removed = 0;
          player.hand = player.hand.filter(t => {
              if (removed < 2 && t.suit === tile.suit && t.value === tile.value) {
                  removed++;
                  return false;
              }
              return true;
          });
          // Add Meld
          player.melds.push({ type: 'PONG', tiles: [tile, tile, tile], fromPlayer: game.lastDiscard!.playerIndex });
          
          // Turn becomes player's
          game.turn = playerIdx;
          game.state = 'DISCARD';
          game.actionTimer = 300;
          
          // Remove from discards of previous player
          const prevPlayer = game.players[game.lastDiscard!.playerIndex];
          prevPlayer.discards.pop();
      }
      else if (action === 'HU') {
          triggerEffect(game, 'LIGHTNING', '天胡');
          game.state = 'THINKING'; // Freeze for effect
      }
  };
  
  // FX Helpers
  const triggerEffect = (game: GameState, type: 'TEXT' | 'LIGHTNING' | 'PARTICLES', text?: string, x?: number, y?: number) => {
      game.effects.push({
          id: Date.now() + Math.random(),
          type,
          text,
          x: x || 0,
          y: y || 0,
          life: type === 'LIGHTNING' ? 20 : 60,
          particles: type === 'PARTICLES' ? createParticles(x || 0, y || 0) : undefined
      });
  };

  const createParticles = (x: number, y: number): Particle[] => {
      const pArr: Particle[] = [];
      for(let i=0; i<30; i++) {
          pArr.push({
              x, y,
              vx: (Math.random() - 0.5) * 15,
              vy: (Math.random() - 0.5) * 15,
              life: 40 + Math.random() * 20,
              color: Math.random() > 0.5 ? '#fbbf24' : '#fcd34d',
              size: 5 + Math.random() * 8
          });
      }
      return pArr;
  };

  useEffect(() => {
    if (!window.p5) return;

    const sketch = (p: any) => {
      const TILE_W = 44; 
      const TILE_H = 60; 
      const TILE_THICKNESS = 20;
      const BOTTOM_Y_OFFSET = 140; 
      const TOP_Y_OFFSET = 140;
      const SIDE_X_OFFSET = 160;
      const RIVER_OFFSET_Y = 110;
      const RIVER_OFFSET_X = 140;

      // Hit Detection Globals
      let p0HandStartX = 0; 
      let hoveredTileIndex = -1;

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
          deck,
          players,
          turn: 0, 
          state: 'DRAW', 
          lastDiscard: null,
          actionTimer: 0,
          effects: []
        };
        setRemainingTiles(deck.length);
        setAvailableActions([]);
      };

      p.draw = () => {
        p.background(COLORS.TABLE_BG_DARK);
        drawTable(p);
        drawTableInfo(p);
        
        // --- Main Render Loop ---
        const activeIdx = gameRef.current.turn;
        gameRef.current.players.forEach((player, i) => {
           drawPlayer(p, player, i, i === activeIdx);
           drawDiscards(p, player, i);
        });

        drawCenterCompass(p);
        drawEffects(p); // Render FX layer

        // --- Logic Loop ---
        updateGameLogic();
        updateHitTest(p);

        // Sync UI
        if (p.frameCount % 10 === 0) {
           setActivePlayerIndex(gameRef.current.turn);
           setRemainingTiles(gameRef.current.deck.length);
        }
      };

      const updateGameLogic = () => {
          const game = gameRef.current;
          
          // 1. DRAW STATE
          if (game.state === 'DRAW') {
             if (game.deck.length === 0) return;
             
             const currentPlayer = game.players[game.turn];
             // Ensure player has 17 tiles (16 + 1 draw)
             if (currentPlayer.hand.length % 3 === 1) { 
                 const newTile = game.deck.pop();
                 if (newTile) {
                     currentPlayer.hand.push(newTile);
                 }
             }
             game.state = 'THINKING';
             game.actionTimer = 10; 
          }
          
          // 2. THINKING (Brief Pause)
          else if (game.state === 'THINKING') {
              if (game.actionTimer > 0) {
                  game.actionTimer--;
                  return;
              }
              game.state = 'DISCARD';
              game.actionTimer = 300; // 10 seconds
          }
          
          // 3. DISCARD STATE (Waiting for player to throw)
          else if (game.state === 'DISCARD') {
              if (game.actionTimer > 0) game.actionTimer--;

              // Auto Discard (Time limit)
              if (game.actionTimer <= 0) {
                  const currentHand = game.players[game.turn].hand;
                  handleDiscard(game.turn, currentHand.length - 1);
                  return;
              }

              // AI Behavior (Simulated delay)
              if (game.turn !== 0) {
                   if (game.actionTimer === 270) { // Throw after 1 second
                      const hand = game.players[game.turn].hand;
                      const randIdx = Math.floor(Math.random() * hand.length);
                      handleDiscard(game.turn, randIdx);
                   }
              }
          }

          // 4. INTERRUPT STATE (Check for Pong/Kong/Hu)
          else if (game.state === 'INTERRUPT') {
              if (game.actionTimer > 0) game.actionTimer--;
              
              // If timer runs out or handled by UI
              if (game.actionTimer <= 0 && availableActions.length === 0) {
                  // No action taken, proceed to next player
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
          
          // Determine Next Step
          if (playerIdx !== 0) {
              // AI Discarded -> Check if Human wants it
              const actions = checkHumanActions(discardedTile);
              if (actions.length > 0) {
                  setAvailableActions(actions); // Trigger UI
                  game.state = 'INTERRUPT';
                  game.actionTimer = 300; // Give user time to think
                  return;
              }
              
              // AI vs AI Interactions (Simulated)
              if (Math.random() > 0.9) {
                  // Randomly simulate an AI PONG
                  triggerEffect(game, 'TEXT', '碰', 0, 0);
                  // For simplicity in this demo, we don't change AI hand structure deeply, just show effect
              }
          }
          
          // If no interruption, move to next player (handled in next frame logic to allow transition)
          game.state = 'INTERRUPT'; 
          game.actionTimer = 20; // Short pause before next turn if no one calls
      };

      const drawEffects = (p: any) => {
          const game = gameRef.current;
          for (let i = game.effects.length - 1; i >= 0; i--) {
              const fx = game.effects[i];
              fx.life--;

              if (fx.type === 'LIGHTNING') {
                   p.push();
                   p.stroke(0, 255, 255, fx.life * 10);
                   p.strokeWeight(3);
                   p.noFill();
                   // Simple jagged line
                   p.beginShape();
                   for(let k=0; k<p.width; k+=20) {
                       p.vertex(k, p.height/2 + p.random(-50, 50));
                   }
                   p.endShape();
                   // Flash background
                   p.noStroke();
                   p.fill(255, 255, 255, fx.life * 2);
                   p.rect(0, 0, p.width, p.height);
                   p.pop();
              } 
              else if (fx.type === 'TEXT') {
                   p.push();
                   p.translate(p.width/2, p.height/2);
                   const scale = p.map(fx.life, 60, 0, 0.5, 2);
                   p.scale(scale);
                   p.textAlign(p.CENTER, p.CENTER);
                   p.textSize(120);
                   p.textStyle(p.BOLD);
                   // Shadow
                   p.fill(0, 0, 0, fx.life * 4);
                   p.text(fx.text, 5, 5);
                   // Main Text (Gold/Red)
                   p.fill(255, 215, 0, fx.life * 5);
                   p.stroke(255, 0, 0, fx.life * 5);
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
                      p.circle(pt.x, pt.y, pt.size);
                  });
              }

              if (fx.life <= 0) {
                  game.effects.splice(i, 1);
              }
          }
      };

      const drawTable = (p: any) => {
        const ctx = p.drawingContext;
        const gradient = ctx.createRadialGradient(p.width/2, p.height/2, 100, p.width/2, p.height/2, p.height * 0.8);
        gradient.addColorStop(0, '#104f3a'); 
        gradient.addColorStop(1, '#063325'); 
        ctx.fillStyle = gradient;
        p.noStroke();
        p.rect(0, 0, p.width, p.height);
        
        // Texture noise
        p.push();
        p.fill(255, 255, 255, 3);
        for (let i = 0; i < p.width; i += 4) {
            if (i % 8 === 0) p.rect(i, 0, 1, p.height);
        }
        p.pop();
        
        // Watermark
        p.push();
        p.translate(p.width/2, p.height/2 + 140);
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(64);
        p.fill(0, 0, 0, 20);
        p.text("麻將大師會所", 2, 2);
        p.fill(255, 255, 255, 8);
        p.text("麻將大師會所", 0, 0);
        p.pop();
      };

      const drawTableInfo = (p: any) => {
         const padding = 24;
         const boxW = 180;
         const boxH = 80;
         const x = padding;
         const y = padding + 60; 

         p.push();
         p.translate(x, y);
         p.fill(0, 0, 0, 60);
         p.stroke(COLORS.UI_BORDER_GOLD);
         p.strokeWeight(1);
         p.rect(0, 0, boxW, boxH, 12);
         
         p.noStroke();
         p.fill('#fbbf24');
         p.textSize(14);
         p.textAlign(p.LEFT, p.TOP);
         p.text("CURRENT ROUND", 16, 12);
         
         p.fill(255);
         p.textSize(24);
         p.textStyle(p.BOLD);
         p.text("南風北局 (2/4)", 16, 34);
         
         p.stroke(255, 255, 255, 30);
         p.line(140, 10, 140, 70);
         
         p.noStroke();
         p.textAlign(p.CENTER, p.TOP);
         p.textSize(10);
         p.fill('#9ca3af');
         p.text("REMAIN", 160, 16);
         
         p.textSize(28);
         p.fill('#34d399'); 
         p.text(gameRef.current.deck.length, 160, 32);
         p.pop();
      };

      const drawCenterCompass = (p: any) => {
          p.push();
          p.translate(p.width/2, p.height/2 - 20);
          const boxSize = 110;
          p.fill(0, 0, 0, 180);
          p.stroke(COLORS.UI_BORDER_GOLD);
          p.strokeWeight(2);
          p.rectMode(p.CENTER);
          p.rect(0, 0, boxSize, boxSize, 24);
          
          const timeLeft = Math.ceil(gameRef.current.actionTimer / 30);
          // If Interrupt State, show "WAIT" or special indicator
          const isInterrupt = gameRef.current.state === 'INTERRUPT';

          p.fill(timeLeft <= 3 ? '#ef4444' : COLORS.CYAN_LED);
          p.noStroke();
          p.textSize(isInterrupt ? 32 : 48); 
          p.textStyle(p.BOLD);
          p.textAlign(p.CENTER, p.CENTER);
          
          if (isInterrupt) {
              p.fill('#fbbf24');
              p.text("!", 0, -10);
              p.textSize(14);
              p.text("CHECKING", 0, 20);
          } else {
              p.text(timeLeft, 0, 0); 
          }
          
          const turn = gameRef.current.turn;
          const offset = boxSize/2 - 16;
          const positions = [
             { label: gameRef.current.players[0].info.seatWind, x: 0, y: offset, idx: 0 }, 
             { label: gameRef.current.players[1].info.seatWind, x: offset, y: 0, idx: 1 }, 
             { label: gameRef.current.players[2].info.seatWind, x: 0, y: -offset, idx: 2 }, 
             { label: gameRef.current.players[3].info.seatWind, x: -offset, y: 0, idx: 3 }  
          ];

          const ctx = p.drawingContext;
          positions.forEach(pos => {
              p.push();
              p.translate(pos.x, pos.y);
              const isActive = turn === pos.idx;
              if (isActive) {
                 ctx.shadowBlur = 10;
                 ctx.shadowColor = '#fbbf24';
                 p.fill('#fbbf24');
                 p.textSize(20);
              } else {
                 ctx.shadowBlur = 0;
                 p.fill(255, 255, 255, 60);
                 p.textSize(16);
              }
              p.textAlign(p.CENTER, p.CENTER);
              p.textStyle(p.BOLD);
              p.text(pos.label, 0, 0);
              p.pop();
          });
          p.pop();
      };
      
      const drawPlayer = (p: any, player: any, index: number, isActive: boolean) => {
         p.push();
         const hand = player.hand;
         const melds = player.melds;
         const isSide = index === 1 || index === 3;
         
         const handTileW = isSide ? TILE_THICKNESS : TILE_W;
         const handTileH = TILE_H;
         
         const meldTileW = TILE_W * 0.8;
         const meldTileH = TILE_H * 0.8;
         const MELD_GAP = 10;
         const GROUP_GAP = 20;
         const NEW_TILE_GAP = 20;
         
         let meldsWidth = 0;
         melds.forEach((m: Meld) => {
             meldsWidth += (m.tiles.length * meldTileW); 
         });
         if (melds.length > 0) meldsWidth += MELD_GAP;
         
         const handLen = hand.length;
         const isNewTileState = handLen % 3 === 2; 
         const gapW = isNewTileState ? NEW_TILE_GAP : 0;
         const handWidth = (handLen * handTileW) + gapW;
         const totalGroupWidth = meldsWidth + GROUP_GAP + handWidth;

         if (index === 0) { 
             p.translate(p.width/2, p.height - BOTTOM_Y_OFFSET);
             const startX = -totalGroupWidth / 2;
             p0HandStartX = p.width/2 + startX + meldsWidth + GROUP_GAP;
             
             let cx = startX;
             cx = drawMeldsSequence(p, melds, cx, 0, meldTileW, meldTileH, 1, 'FLAT');
             cx += GROUP_GAP;
             drawHandSequence(p, hand, cx, 0, handTileW, handTileH, 1, 'STANDING', isNewTileState, index);
         } else if (index === 1) {
             p.translate(p.width - SIDE_X_OFFSET, p.height/2);
             p.rotate(p.HALF_PI); 
             const startX = -totalGroupWidth / 2;
             let cx = startX;
             cx = drawMeldsSequence(p, melds, cx, 0, meldTileW, meldTileH, 1, 'FLAT');
             cx += GROUP_GAP;
             drawHandSequence(p, hand, cx, 0, handTileW, handTileH, 1, 'SIDE_STANDING', isNewTileState, index);
         } else if (index === 2) {
             p.translate(p.width/2, TOP_Y_OFFSET);
             p.rotate(p.PI); 
             const startX = -totalGroupWidth / 2;
             let cx = startX;
             cx = drawMeldsSequence(p, melds, cx, 0, meldTileW, meldTileH, 1, 'FLAT');
             cx += GROUP_GAP;
             drawHandSequence(p, hand, cx, 0, handTileW, handTileH, 1, 'BACK_STANDING', isNewTileState, index);
         } else if (index === 3) {
             p.translate(SIDE_X_OFFSET, p.height/2);
             p.rotate(-p.HALF_PI); 
             const startX = totalGroupWidth / 2;
             let cx = startX;
             cx = drawMeldsSequence(p, melds, cx, 0, meldTileW, meldTileH, -1, 'FLAT');
             cx -= GROUP_GAP;
             drawHandSequence(p, hand, cx, 0, handTileW, handTileH, -1, 'SIDE_STANDING', isNewTileState, index);
         }
         p.pop();
      };
      
      const drawDiscards = (p: any, player: any, index: number) => {
          const tiles = player.discards;
          if (tiles.length === 0) return;
          p.push();
          const w = 34; 
          const h = 46;
          const cols = 6; 
          p.translate(p.width/2, p.height/2);
          
          if (index === 0) p.translate(0, RIVER_OFFSET_Y);
          if (index === 1) { p.translate(RIVER_OFFSET_X, 0); p.rotate(-p.HALF_PI); }
          if (index === 2) { p.translate(0, -RIVER_OFFSET_Y); p.rotate(p.PI); }
          if (index === 3) { p.translate(-RIVER_OFFSET_X, 0); p.rotate(p.HALF_PI); }
          
          const startX = -(cols * w) / 2;
          tiles.forEach((tile: Tile, i: number) => {
              const r = Math.floor(i / cols);
              const c = i % cols;
              drawTile(p, startX + c*w, r*(h-6), tile, w, h, 'FLAT');
          });
          p.pop();
      }

      const drawMeldsSequence = (p: any, melds: Meld[], startX: number, y: number, w: number, h: number, dir: 1 | -1, type: 'FLAT') => {
          if (!melds || melds.length === 0) return startX;
          let cx = startX;
          const MELD_GAP = 10;
          melds.forEach(meld => {
             const count = meld.tiles.length;
             for(let i=0; i<count; i++) {
                 const drawX = dir === 1 ? cx : cx - w;
                 drawTile(p, drawX, y + (60 * 0.8 - h), meld.tiles[i], w, h, type); // Align bottom
                 cx += (w * dir);
             }
             cx += (MELD_GAP * dir);
          });
          cx -= (MELD_GAP * dir); 
          return cx + (MELD_GAP * dir); 
      };

      const drawHandSequence = (p: any, hand: Tile[], startX: number, y: number, w: number, h: number, dir: 1 | -1, type: 'STANDING' | 'BACK_STANDING' | 'SIDE_STANDING', hasNewTile: boolean, playerIdx: number) => {
          const count = hand.length;
          const gapIndex = hasNewTile ? count - 1 : -1;
          const NEW_TILE_GAP = 20;
          
          let cx = startX;
          for (let i = 0; i < count; i++) {
              if (i === gapIndex) cx += (NEW_TILE_GAP * dir);
              const drawX = dir === 1 ? cx : cx - w;
              let renderY = y;
              if (playerIdx === 0 && i === hoveredTileIndex) renderY -= 20;
              drawTile(p, drawX, renderY, hand[i], w, h, type);
              cx += (w * dir);
          }
          return cx;
      };

      const drawTile = (p: any, x: number, y: number, tile: Tile | null, w: number, h: number, type: 'STANDING' | 'FLAT' | 'BACK_STANDING' | 'SIDE_STANDING') => {
         p.push();
         p.translate(x, y);
         const ctx = p.drawingContext;
         const BACK_COLOR_DARK = '#064e3b'; 
         const BACK_COLOR_LIGHT = '#10b981'; 
         const FACE_COLOR = '#fdfbf7'; 
         
         if (type === 'STANDING') {
             p.noStroke();
             p.fill(0,0,0, 60); p.rect(6, 6, w, h, 6); 
             p.fill(BACK_COLOR_DARK); p.rect(0, 0, w, h, 6);
             p.fill('#cbd5e1'); p.rect(0, -2, w, h, 6);
             p.fill(FACE_COLOR); p.rect(0, -4, w, h, 6);
             const grd = ctx.createLinearGradient(0, -4, 0, h);
             grd.addColorStop(0, 'rgba(255,255,255,0.9)');
             grd.addColorStop(0.1, 'rgba(255,255,255,0.1)');
             grd.addColorStop(1, 'rgba(0,0,0,0.1)');
             ctx.fillStyle = grd;
             p.rect(0, -4, w, h, 6);
             if (tile) drawTileFace(p, tile, w, h, -4);
             
         } else if (type === 'FLAT') {
             p.noStroke();
             p.fill(0,0,0, 50); p.rect(3, 3, w, h, 4);
             p.fill(BACK_COLOR_DARK); p.rect(0, 0, w, h, 4);
             p.fill(FACE_COLOR); p.rect(0, -5, w, h, 4); 
             const grd = ctx.createLinearGradient(0, -5, w, h);
             grd.addColorStop(0, 'rgba(255,255,255,0.5)');
             grd.addColorStop(1, 'rgba(0,0,0,0.05)');
             ctx.fillStyle = grd;
             p.rect(0, -5, w, h, 4);
             if (tile) drawTileFace(p, tile, w, h, -5);

         } else if (type === 'BACK_STANDING') {
             p.noStroke();
             p.fill(0,0,0, 50); p.rect(4, 4, w, h, 5);
             p.fill(BACK_COLOR_DARK); p.rect(0, 0, w, h, 5);
             const grd = ctx.createLinearGradient(0, 0, 0, h/2);
             grd.addColorStop(0, 'rgba(255,255,255,0.3)');
             grd.addColorStop(1, 'rgba(255,255,255,0)');
             ctx.fillStyle = grd;
             p.rect(0, 0, w, h, 5);
             
         } else if (type === 'SIDE_STANDING') {
             p.noStroke();
             p.fill(0,0,0, 50); p.rect(3, 3, w, h, 2);
             p.fill('#022c22'); p.rect(0, 0, w, h, 2);
             p.fill(BACK_COLOR_LIGHT); p.rect(0, 0, w, 4, 2);
             p.stroke('#000'); p.strokeWeight(1); p.noFill(); p.rect(0, 0, w, h);
             p.noStroke();
             const grd = ctx.createLinearGradient(0, 0, w, 0);
             grd.addColorStop(0, 'rgba(0,0,0,0.3)');
             grd.addColorStop(0.2, 'rgba(255,255,255,0.1)');
             grd.addColorStop(0.5, 'rgba(0,0,0,0.1)');
             grd.addColorStop(1, 'rgba(0,0,0,0.4)');
             ctx.fillStyle = grd;
             p.rect(0, 0, w, h, 2);
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
          const fontSizeSub = w * 0.28;
          if (tile.suit === Suit.DRAGONS && tile.value === 3) {
               p.noFill(); p.stroke('#1e293b'); p.strokeWeight(2); p.rect(-w/3, -h/3, w*0.66, h*0.66); return;
          }
          p.textSize(fontSizeMain); p.textStyle(p.BOLD);
          p.fill(255, 255, 255, 150); p.noStroke(); p.text(displayStr, 1, 1); 
          p.fill(color); p.text(displayStr, 0, 0);
          if (subStr) {
              p.textSize(fontSizeSub); const subY = h * 0.3;
              p.fill(255,255,255,150); p.text(subStr, 1, subY+1);
              p.fill(color); p.text(subStr, 0, subY);
          }
      };

      const updateHitTest = (p: any) => {
          hoveredTileIndex = -1;
          const mX = p.mouseX;
          const mY = p.mouseY;
          const handY = p.height - BOTTOM_Y_OFFSET;
          if (mY > handY - 50 && mY < handY + 50) {
              if (p0HandStartX !== 0) {
                  const relativeX = mX - p0HandStartX;
                  if (relativeX >= 0) {
                      const p0HandLen = gameRef.current.players[0].hand.length;
                      const isNewTileState = p0HandLen % 3 === 2;
                      const normalWidth = (isNewTileState ? p0HandLen - 1 : p0HandLen) * TILE_W;
                      if (isNewTileState && relativeX > normalWidth) {
                          if (relativeX > normalWidth + 20) hoveredTileIndex = p0HandLen - 1;
                      } else if (relativeX <= normalWidth) {
                           const idx = Math.floor(relativeX / TILE_W);
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
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-50 flex gap-4 animate-bounce-in">
            <div className="flex gap-4 p-2 bg-black/60 backdrop-blur-xl rounded-2xl border border-yellow-500/30 shadow-[0_0_50px_rgba(251,191,36,0.2)]">
                {/* Always show Pass if actions are available */}
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
