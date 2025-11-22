
import React, { useEffect, useRef, useState } from 'react';
import { AppView, Suit, Tile, Player } from '../types';
import { generateDeck } from '../services/mahjongLogic';
import { AssetLoader } from '../services/AssetLoader';
import { RenderService, RenderMetrics } from '../services/RenderService';
import { Mic, MessageCircle, Battery, Signal, ChevronLeft, Menu, Volume2, Wifi } from 'lucide-react';
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
  fromPlayer: number; 
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
  text?: string;
  x?: number;
  y?: number;
  life: number;
  particles?: Particle[];
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
  turn: number;
  state: 'DRAW' | 'THINKING' | 'DISCARD' | 'INTERRUPT' | 'RESOLVE';
  lastDiscard: { tile: Tile, playerIndex: number } | null;
  actionTimer: number;
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
      <div className={`relative group ${isSelf ? 'order-1' : ''}`}>
        {isActive && (
          <div className="absolute -inset-2 bg-yellow-500/30 rounded-full blur-md animate-pulse"></div>
        )}
        <div className={`relative w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden border-2 shadow-lg z-10 bg-[#1a1a1a] ${isActive ? 'border-yellow-400' : 'border-gray-600'}`}>
          <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
        </div>
        {player.isDealer && (
          <div className="absolute -top-1 -right-1 z-20 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center border border-white shadow-sm">
             <span className="text-white text-[10px] font-serif font-bold">莊</span>
          </div>
        )}
      </div>

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
  
  // Mutable Game State
  const gameRef = useRef<GameState>({
    deck: [],
    players: [],
    turn: 0,
    state: 'DRAW',
    lastDiscard: null,
    actionTimer: 0,
    effects: []
  });
  
  // Interaction State (Hit Test)
  const hitTestMetrics = useRef<RenderMetrics>({ p0HandStartX: 0, p0TileW: 0 });
  const hoveredTileRef = useRef<number>(-1);

  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [uiPlayers, setUiPlayers] = useState<Player[]>(INITIAL_PLAYERS);
  const [isMuted, setIsMuted] = useState(false);
  const [availableActions, setAvailableActions] = useState<ActionType[]>([]);

  // --- Logic Helpers (Ideally moved to GameLogic.ts in future steps) ---
  
  const countTiles = (hand: Tile[], suit: Suit, value: number) => {
      return hand.filter(t => t.suit === suit && t.value === value).length;
  };

  const checkHumanActions = (discardedTile: Tile) => {
      const hand = gameRef.current.players[0].hand;
      const actions: ActionType[] = [];
      const count = countTiles(hand, discardedTile.suit, discardedTile.value);
      if (count >= 2) actions.push('PONG');
      if (count === 3) actions.push('KONG');
      if (count >= 1 && Math.random() > 0.95) actions.push('HU');
      if (gameRef.current.deck.length < 130 && actions.length === 0 && Math.random() > 0.8) {
          actions.push('PONG');
      }
      return actions;
  };

  const checkForAiAction = (game: GameState, discardedTile: Tile, fromPlayer: number) => {
      for (let offset = 1; offset < 4; offset++) {
          const pIdx = (fromPlayer + offset) % 4;
          if (pIdx === 0) continue; 
          
          const player = game.players[pIdx];
          const c = countTiles(player.hand, discardedTile.suit, discardedTile.value);
          
          if (c >= 2 && Math.random() < 0.5) return { type: 'PONG' as ActionType, playerIdx: pIdx };
          if (c === 3 && Math.random() < 0.7) return { type: 'KONG' as ActionType, playerIdx: pIdx };
      }
      if (Math.random() < 0.05 && fromPlayer !== 0) {
         const nextAI = (fromPlayer + 1) % 4;
         if (nextAI !== 0) return { type: 'PONG' as ActionType, playerIdx: nextAI };
      }
      return null;
  };

  const executeAction = (game: GameState, playerIdx: number, action: ActionType, tile: Tile, fromIdx: number) => {
      const player = game.players[playerIdx];
      const toRemove = action === 'PONG' ? 2 : 3;
      let removedCount = 0;
      player.hand = player.hand.filter(t => {
          if (removedCount < toRemove && t.suit === tile.suit && t.value === tile.value) {
              removedCount++;
              return false;
          }
          return true;
      });

      if (removedCount < toRemove) {
         for(let i=0; i<(toRemove - removedCount); i++) player.hand.pop();
      }

      const meldTiles = Array(action === 'KONG' ? 4 : 3).fill(tile);
      player.melds.push({ type: action, tiles: meldTiles, fromPlayer: fromIdx });
      game.players[fromIdx].discards.pop();

      game.turn = playerIdx;
      game.state = 'DISCARD';
      game.actionTimer = 60; 
      
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
          const nextPlayer = (game.lastDiscard!.playerIndex + 1) % 4;
          game.turn = nextPlayer;
          game.state = 'DRAW';
          return;
      }
      executeAction(game, 0, action, tile, game.lastDiscard!.playerIndex);
  };
  
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

  const handleDiscard = (playerIdx: number, tileIdx: number) => {
      const game = gameRef.current;
      const player = game.players[playerIdx];
      if (!player.hand[tileIdx]) return;

      const discardedTile = player.hand.splice(tileIdx, 1)[0];
      player.discards.push(discardedTile);
      player.hand.sort((a,b) => a.value - b.value); 

      game.lastDiscard = { tile: discardedTile, playerIndex: playerIdx };
      
      if (playerIdx !== 0) {
          const actions = checkHumanActions(discardedTile);
          if (actions.length > 0) {
              setAvailableActions(actions);
              game.state = 'INTERRUPT';
              game.actionTimer = 300;
              return;
          }
      }

      const aiAction = checkForAiAction(game, discardedTile, playerIdx);
      if (aiAction) {
         executeAction(game, aiAction.playerIdx, aiAction.type, discardedTile, playerIdx);
         return;
      }
      
      game.state = 'INTERRUPT'; 
      game.actionTimer = 10; 
  };

  // --- P5 Controller Integration ---
  useEffect(() => {
    if (!window.p5) return;

    const sketch = (p: any) => {
      let globalScale = 1;

      p.preload = () => {
         // Now we generate assets locally instead of loading them
         // This uses p5.createGraphics so it's synchronous but heavy, 
         // usually safe in preload or setup.
      };

      p.setup = () => {
        const canvas = p.createCanvas(window.innerWidth, window.innerHeight);
        canvas.parent(renderRef.current!);
        p.frameRate(30);
        p.textFont("'Noto Serif TC', 'Roboto', serif");
        
        // GENERATE ASSETS LOCALLY
        AssetLoader.generateAll(p);
        
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
        setAvailableActions([]);
      };

      p.draw = () => {
        globalScale = Math.min(1.2, Math.max(0.6, p.width / 1280));
        
        // --- S: Call Render Service ---
        // Returns metrics needed for Input Handling
        hitTestMetrics.current = RenderService.drawScene(
          p, 
          gameRef.current, 
          globalScale, 
          hoveredTileRef.current
        );

        // Update Logic Phase
        updateGameLogic();
        
        // Update Input Phase
        updateHitTest(p, globalScale);

        // Sync UI State rarely (optimization)
        if (p.frameCount % 15 === 0) {
           setActivePlayerIndex(gameRef.current.turn);
        }
      };

      const updateGameLogic = () => {
          const game = gameRef.current;
          
          if (game.state === 'DRAW') {
             if (game.deck.length === 0) return;
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
                  const nextPlayer = (game.lastDiscard!.playerIndex + 1) % 4;
                  game.turn = nextPlayer;
                  game.state = 'DRAW';
              }
          }
      };

      const updateHitTest = (p: any, scale: number) => {
          hoveredTileRef.current = -1;
          const mX = p.mouseX;
          const mY = p.mouseY;
          const handY = p.height - (130 * scale);
          
          // Get metrics from RenderService results
          const { p0HandStartX, p0TileW } = hitTestMetrics.current;

          if (mY > handY - 60 && mY < handY + 60) {
              if (p0HandStartX !== 0) {
                  const relativeX = mX - p0HandStartX;
                  if (relativeX >= 0) {
                      const p0HandLen = gameRef.current.players[0].hand.length;
                      const isNewTileState = p0HandLen % 3 === 2;
                      const effectiveW = p0TileW || 44;
                      const normalWidth = (isNewTileState ? p0HandLen - 1 : p0HandLen) * effectiveW;
                      
                      if (isNewTileState && relativeX > normalWidth) {
                          if (relativeX > normalWidth + (20 * scale)) hoveredTileRef.current = p0HandLen - 1;
                      } else if (relativeX <= normalWidth) {
                           const idx = Math.floor(relativeX / effectiveW);
                           if (idx < p0HandLen) hoveredTileRef.current = idx;
                      }
                  }
              }
          }
          if (p.mouseIsPressed && hoveredTileRef.current !== -1) {
              if (gameRef.current.state === 'DISCARD' && gameRef.current.turn === 0) {
                  if (p.frameCount % 10 === 0) {
                      handleDiscard(0, hoveredTileRef.current);
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

      {availableActions.length > 0 && (
        <div className="absolute bottom-48 left-1/2 -translate-x-1/2 z-50 flex gap-4 animate-bounce-in">
            <div className="flex gap-4 p-2 bg-black/60 backdrop-blur-xl rounded-2xl border border-yellow-500/30 shadow-[0_0_50px_rgba(251,191,36,0.2)]">
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
