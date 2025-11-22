
import React, { useEffect, useRef, useState } from 'react';
import { AppView, GameStateDTO, Player, Tile, ActionType, VisualEffect } from '../types';
import { AssetLoader } from '../services/AssetLoader';
import { RenderService, RenderMetrics } from '../services/RenderService';
import { socketService } from '../services/SocketService';
import { Settings, X, LogOut, Volume2, VolumeX, RefreshCw, Wifi } from 'lucide-react';

declare global {
  interface Window {
    p5: any;
  }
}

interface GameCanvasProps {
  setView: (view: AppView) => void;
}

// Mock Initial State for rendering before connection or if connection fails
const INITIAL_MOCK_STATE: GameStateDTO = {
    deckCount: 144,
    players: [
        { info: { id: 0, name: "連線中...", avatar: "", score: 0, isDealer: false, flowerCount: 0, wind: "東", seatWind: "東", isRichii: false, richiiDiscardIndex: -1 }, hand: [], handCount: 16, discards: [], melds: [] },
        { info: { id: 1, name: "等待中", avatar: "", score: 0, isDealer: false, flowerCount: 0, wind: "南", seatWind: "南", isRichii: false, richiiDiscardIndex: -1 }, hand: [], handCount: 16, discards: [], melds: [] },
        { info: { id: 2, name: "等待中", avatar: "", score: 0, isDealer: false, flowerCount: 0, wind: "西", seatWind: "西", isRichii: false, richiiDiscardIndex: -1 }, hand: [], handCount: 16, discards: [], melds: [] },
        { info: { id: 3, name: "等待中", avatar: "", score: 0, isDealer: false, flowerCount: 0, wind: "北", seatWind: "北", isRichii: false, richiiDiscardIndex: -1 }, hand: [], handCount: 16, discards: [], melds: [] },
    ],
    turn: 0,
    state: 'WAIT_CONNECTION',
    lastDiscard: null,
    actionTimer: 0,
    availableActions: []
};

export const GameCanvas: React.FC<GameCanvasProps> = ({ setView }) => {
  const renderRef = useRef<HTMLDivElement>(null);
  const p5Ref = useRef<any>(null);
  
  // Game State is now fully controlled by backend events
  const gameRef = useRef<GameStateDTO>(INITIAL_MOCK_STATE);
  const prevGameRef = useRef<GameStateDTO>(INITIAL_MOCK_STATE);
  const effectsRef = useRef<VisualEffect[]>([]); 
  
  // Animation State Refs
  const animState = useRef({
      lastTurnTime: 0,
      lastDiscardTime: 0,
      discardingPlayer: -1
  });
  
  // Interaction State
  const hitTestMetrics = useRef<RenderMetrics>({ p0HandStartX: 0, p0TileW: 0 });
  const hoveredTileRef = useRef<number>(-1);
  const selectedTileRef = useRef<number>(-1);

  // UI State (React managed)
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [availableActions, setAvailableActions] = useState<ActionType[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // --- Socket Connection ---
  useEffect(() => {
    const socket = socketService.connect("http://localhost:8080");
    
    socket.on("connect", () => {
        setIsConnected(true);
        socketService.joinRoom("room_101");
    });

    socket.on("disconnect", () => setIsConnected(false));

    socket.on("game:state", (newState: GameStateDTO) => {
        const prev = prevGameRef.current;
        
        // 1. Detect Turn Change
        if (prev.turn !== newState.turn) {
            animState.current.lastTurnTime = Date.now();
            // Reset selection on turn change
            selectedTileRef.current = -1;
        }

        // 2. Detect Discard
        const prevTotal = prev.players.reduce((sum, p) => sum + p.discards.length, 0);
        const newTotal = newState.players.reduce((sum, p) => sum + p.discards.length, 0);
        
        if (newTotal > prevTotal) {
            animState.current.lastDiscardTime = Date.now();
            animState.current.discardingPlayer = newState.lastDiscard?.playerIndex ?? -1;
            
            // Also reset selection if we just discarded
            if (newState.lastDiscard?.playerIndex === 0) {
                selectedTileRef.current = -1;
            }
        }

        // Update Refs
        prevGameRef.current = newState;
        gameRef.current = newState;
        
        // Update React State
        setAvailableActions(newState.availableActions || []);
        setActivePlayerIndex(newState.turn);
    });

    socket.on("game:effect", (effectData: any) => {
        triggerEffect(effectData.type, effectData.text, effectData.position?.x, effectData.position?.y, effectData.variant, effectData.tile);
    });

    return () => {
        socket.off("connect");
        socket.off("disconnect");
        socket.off("game:state");
        socket.off("game:effect");
        socketService.disconnect();
    };
  }, []);


  // --- Effect System ---
  const triggerEffect = (type: 'TEXT' | 'LIGHTNING' | 'PARTICLES' | 'SHOCKWAVE' | 'TILE_POPUP', text?: string, x?: number, y?: number, variant?: string, tile?: Tile) => {
      effectsRef.current.push({
          id: Date.now() + Math.random(),
          type,
          variant,
          text,
          tile,
          x: x || window.innerWidth / 2,
          y: y || window.innerHeight / 2,
          life: type === 'LIGHTNING' ? 25 : (type === 'SHOCKWAVE' ? 30 : 50),
          particles: type === 'PARTICLES' ? createParticles(x || window.innerWidth/2, y || window.innerHeight/2, variant) : undefined
      });
  };

  const createParticles = (x: number, y: number, variant?: string) => {
      const pArr = [];
      let count = 25;
      let colors = ['#fbbf24', '#fcd34d']; // Default Gold
      let speed = 10;
      let gravity = 0;

      if (variant === 'HU') {
          count = 120;
          colors = ['#ef4444', '#fbbf24', '#ffffff', '#b91c1c']; // Red, Gold, White, Dark Red
          speed = 25;
          gravity = 0.5;
      } else if (variant === 'BLUE') { // PONG
          count = 40;
          colors = ['#3b82f6', '#93c5fd', '#ffffff']; // Blue, Light Blue
          speed = 15;
      } else if (variant === 'PURPLE') { // KONG
          count = 50;
          colors = ['#a855f7', '#d8b4fe', '#ffffff']; // Purple
          speed = 18;
      } else if (variant === 'GREEN') { // CHOW
          count = 30;
          colors = ['#10b981', '#6ee7b7'];
          speed = 12;
      }

      for(let i=0; i<count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const v = Math.random() * speed;
          const r = Math.random() * speed; 
          
          pArr.push({
              x, y,
              vx: Math.cos(angle) * v,
              vy: Math.sin(angle) * v,
              life: 40 + Math.random() * 20,
              maxLife: 60,
              color: colors[Math.floor(Math.random() * colors.length)],
              size: 6 + Math.random() * 8,
              gravity: gravity
          });
      }
      return pArr;
  };

  // --- Interaction Handlers ---
  const handleDiscard = (tileIndex: number) => {
      // Optimistic update to UI
      selectedTileRef.current = -1;
      socketService.sendDiscard(tileIndex);
  };

  const handlePlayerAction = (action: ActionType) => {
      socketService.sendAction(action);
      setAvailableActions([]); 
  };

  // --- P5 Loop ---
  useEffect(() => {
    if (!window.p5) return;

    const sketch = (p: any) => {
      let globalScale = 1;

      p.setup = () => {
        const canvas = p.createCanvas(window.innerWidth, window.innerHeight);
        canvas.parent(renderRef.current!);
        p.frameRate(30);
        p.textFont("'Noto Serif TC', 'Roboto', serif");
        AssetLoader.generateAll(p);
      };

      p.windowResized = () => {
        p.resizeCanvas(window.innerWidth, window.innerHeight);
      };

      p.draw = () => {
        globalScale = Math.min(1.2, Math.max(0.6, p.width / 1280));
        
        // Merge GameState (Backend) + Effects (Frontend Animation) for rendering
        const renderState = {
            ...gameRef.current,
            effects: effectsRef.current
        };

        // Update Input Hover
        updateHitTest(p, globalScale);

        // Draw
        hitTestMetrics.current = RenderService.drawScene(
          p, 
          renderState, 
          globalScale, 
          hoveredTileRef.current,
          selectedTileRef.current,
          animState.current
        );
      };

      p.mousePressed = () => {
          // 1. Basic State Checks
          const isMyTurn = gameRef.current.turn === 0; 
          const canDiscard = gameRef.current.state === 'DISCARD' || gameRef.current.state === 'STATE_DISCARD';
          const isRichii = gameRef.current.players[0]?.info.isRichii;

          // If clicked outside or invalid state, deselect
          if (!isMyTurn || !canDiscard || isRichii) {
             selectedTileRef.current = -1;
             return;
          }

          if (hoveredTileRef.current !== -1) {
               // Interaction Logic: Select -> Confirm
               if (selectedTileRef.current === hoveredTileRef.current) {
                   // Clicked on already selected tile -> Action: Discard
                   handleDiscard(hoveredTileRef.current);
                   hoveredTileRef.current = -1; // Reset hover to prevent immediate re-trigger
               } else {
                   // Clicked on a new tile -> Action: Select
                   selectedTileRef.current = hoveredTileRef.current;
               }
          } else {
              // Clicked on background (within canvas) -> Action: Deselect
              selectedTileRef.current = -1;
          }
      };

      const updateHitTest = (p: any, scale: number) => {
          hoveredTileRef.current = -1;
          
          const isMyTurn = gameRef.current.turn === 0; 
          const canDiscard = gameRef.current.state === 'DISCARD' || gameRef.current.state === 'STATE_DISCARD';
          const isRichii = gameRef.current.players[0]?.info.isRichii;
          
          // Allow hover even if not turn, for inspecting tiles (future feature), but for now restrict to turn
          // Actually, allowing hover anytime feels better, but only select if turn.
          if (!isMyTurn || !canDiscard || isRichii) return;

          const mX = p.mouseX;
          const mY = p.mouseY;
          const handY = p.height - (130 * scale);
          
          const { p0HandStartX, p0TileW } = hitTestMetrics.current;
          
          // Expanded hit area for better UX
          if (mY > handY - 80 && mY < handY + 80) {
              if (p0HandStartX !== 0) {
                  const relativeX = mX - p0HandStartX;
                  if (relativeX >= 0) {
                      const hand = gameRef.current.players[0].hand;
                      const p0HandLen = hand.length;
                      const isNewTileState = p0HandLen % 3 === 2;
                      const effectiveW = p0TileW || 44;
                      const normalWidth = (isNewTileState ? p0HandLen - 1 : p0HandLen) * effectiveW;
                      
                      if (isNewTileState && relativeX > normalWidth) {
                          // The extra tile (newly drawn)
                          if (relativeX > normalWidth + (10 * scale)) hoveredTileRef.current = p0HandLen - 1;
                      } else if (relativeX <= normalWidth) {
                           const idx = Math.floor(relativeX / effectiveW);
                           if (idx < p0HandLen) hoveredTileRef.current = idx;
                      }
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

  const activePlayer = gameRef.current.players[activePlayerIndex]?.info || INITIAL_MOCK_STATE.players[0].info;

  return (
    <div className="relative w-full h-full bg-[#0a0a0a] overflow-hidden select-none" ref={renderRef}>
      
      {/* --- Floating Info Capsule (Top Left) --- */}
      <div className="absolute top-4 left-4 z-50 flex items-center gap-3 animate-fade-in">
           <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg transition-all hover:bg-black/60 cursor-default group select-none">
               <span className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${isConnected ? 'bg-green-500 text-green-500' : 'bg-red-500 text-red-500'} animate-pulse`}></span>
               <span className="text-yellow-500 text-xs font-bold font-mono tracking-wider">ROOM 80440</span>
               <div className="w-[1px] h-3 bg-white/20 mx-1"></div>
               <Wifi size={12} className={isConnected ? "text-green-400" : "text-red-400"} />
           </div>
      </div>

      {/* --- Collapsible System Menu (Top Right) --- */}
      <div className="absolute top-4 right-4 z-50">
           <button 
               onClick={() => setIsMenuOpen(!isMenuOpen)}
               className={`p-2.5 rounded-full backdrop-blur-md border transition-all duration-300 shadow-xl hover:scale-105 active:scale-95 ${
                   isMenuOpen 
                   ? 'bg-yellow-500 text-red-900 border-yellow-400 rotate-90' 
                   : 'bg-black/40 text-white border-white/10 hover:bg-black/60 hover:border-yellow-500/50'
               }`}
               aria-label="System Menu"
           >
               {isMenuOpen ? <X size={20} /> : <Settings size={20} />} 
           </button>

           {/* Dropdown Panel */}
           {isMenuOpen && (
               <div className="absolute right-0 top-14 w-60 bg-[#1a1a1a]/95 backdrop-blur-xl rounded-2xl border border-yellow-600/30 shadow-[0_20px_50px_rgba(0,0,0,0.7)] overflow-hidden animate-[slideIn_0.2s_ease-out] origin-top-right">
                   <div className="p-4 border-b border-white/5">
                       <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-2">System Settings</p>
                       <div className="flex items-center justify-between bg-white/5 rounded-lg p-2">
                           <span className="text-sm text-gray-200 font-medium">Sound Effects</span>
                           <button 
                                onClick={() => setIsMuted(!isMuted)} 
                                className={`p-1.5 rounded-md transition-colors ${isMuted ? 'text-red-400 bg-red-500/10' : 'text-green-400 bg-green-500/10'}`}
                           >
                               {isMuted ? <VolumeX size={16}/> : <Volume2 size={16}/>}
                           </button>
                       </div>
                   </div>
                   
                   <div className="p-2 space-y-1">
                       <button 
                           onClick={() => {
                               socketService.restartGame();
                               setIsMenuOpen(false);
                           }}
                           className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-all text-left group"
                       >
                           <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                <RefreshCw size={14} />
                           </div>
                           <span>重啟牌局 (Debug)</span>
                       </button>
                       
                       <button 
                           onClick={() => setView(AppView.LOBBY)}
                           className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-red-300 hover:bg-red-900/30 hover:text-red-200 transition-all text-left group"
                       >
                           <div className="p-1.5 bg-red-500/20 text-red-400 rounded-lg group-hover:bg-red-600 group-hover:text-white transition-colors">
                                <LogOut size={14} />
                           </div>
                           <span>離開房間</span>
                       </button>
                   </div>
                   
                   <div className="bg-black/40 p-2 text-center border-t border-white/5">
                       <p className="text-[10px] text-gray-600 font-mono">Mahjong Master v1.0.4</p>
                   </div>
               </div>
           )}
      </div>

      {/* Players Overlay */}
      {gameRef.current.players.map((pData, i) => {
          let pos: 'bottom'|'right'|'top'|'left' = 'bottom';
          if (i === 0) pos = 'bottom';
          if (i === 1) pos = 'right';
          if (i === 2) pos = 'top';
          if (i === 3) pos = 'left';
          return (
            <PlayerCard 
                key={i} 
                player={pData.info} 
                position={pos} 
                isActive={activePlayerIndex === i} 
                isSelf={i === 0}
            />
          );
      })}

      {/* Action Buttons Overlay */}
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
                   <button onClick={() => handlePlayerAction('CHOW')} className="w-20 h-20 bg-green-600 text-white font-black text-3xl rounded-full border-4 border-green-400 hover:scale-110 transition-transform">吃</button>
                )}
                {availableActions.includes('PONG') && (
                   <button onClick={() => handlePlayerAction('PONG')} className="w-20 h-20 bg-blue-600 text-white font-black text-3xl rounded-full border-4 border-blue-400 hover:scale-110 transition-transform">碰</button>
                )}
                {availableActions.includes('KONG') && (
                   <button onClick={() => handlePlayerAction('KONG')} className="w-20 h-20 bg-purple-600 text-white font-black text-3xl rounded-full border-4 border-purple-400 hover:scale-110 transition-transform">槓</button>
                )}
                {availableActions.includes('RICHII') && (
                   <button onClick={() => handlePlayerAction('RICHII')} className="w-24 h-24 -mt-4 bg-orange-600 text-yellow-100 font-black text-3xl rounded-full border-4 border-orange-400 hover:scale-110 transition-transform animate-pulse shadow-[0_0_30px_rgba(249,115,22,0.8)] flex flex-col items-center justify-center">
                        <span>立</span>
                        <span className="text-sm">Riichi</span>
                   </button>
                )}
                {availableActions.includes('HU') && (
                   <button onClick={() => handlePlayerAction('HU')} className="w-24 h-24 -mt-4 bg-red-600 text-yellow-100 font-black text-5xl rounded-full border-4 border-yellow-400 hover:scale-110 transition-transform animate-pulse shadow-[0_0_30px_rgba(220,38,38,0.8)]">胡</button>
                )}
            </div>
        </div>
      )}
      
      {/* Connection Notice if not connected */}
      {!isConnected && (
          <div className="absolute inset-0 z-40 bg-black/50 flex items-center justify-center">
              <div className="bg-gray-900 p-6 rounded-xl border border-red-500 text-center">
                  <h2 className="text-red-500 text-xl font-bold mb-2">無法連線至後端伺服器</h2>
                  <p className="text-gray-300 text-sm mb-4">請確認您的 Go 後端服務已在 Port 8080 啟動。</p>
                  <p className="text-gray-500 text-xs font-mono">SocketService: connecting to localhost:8080...</p>
              </div>
          </div>
      )}
    </div>
  );
};

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
        {isActive && <div className="absolute -inset-2 bg-yellow-500/30 rounded-full blur-md animate-pulse"></div>}
        <div className={`relative w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden border-2 shadow-lg z-10 bg-[#1a1a1a] ${isActive ? 'border-yellow-400' : 'border-gray-600'}`}>
          <img src={player.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + player.id} alt={player.name} className="w-full h-full object-cover" />
        </div>
        {player.isDealer && <div className="absolute -top-1 -right-1 z-20 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center border border-white shadow-sm"><span className="text-white text-[10px] font-serif font-bold">莊</span></div>}
      </div>
      <div className={`flex flex-col ${isSelf ? 'items-start order-2 mb-2' : (position === 'right' ? 'items-end mr-1' : (position === 'left' ? 'items-start ml-1' : 'items-center'))} z-0`}>
         <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 shadow-lg relative">
            {/* Riichi Tag */}
            {player.isRichii && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow border border-red-400 whitespace-nowrap animate-bounce">
                    立直
                </div>
            )}
            <div className="text-white text-xs md:text-sm font-bold tracking-wide flex items-center gap-2">{player.name}</div>
            <div className={`text-xs font-mono font-bold mt-0.5 ${player.score >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{player.score > 0 ? '+' : ''}{player.score}</div>
         </div>
         <div className="mt-1 flex gap-1">{[...Array(player.flowerCount)].map((_, i) => (<span key={i} className="text-[10px]">🌸</span>))}</div>
      </div>
    </div>
  );
};
