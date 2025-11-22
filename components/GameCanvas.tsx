
import React, { useEffect, useRef, useState } from 'react';
import { AppView, GameStateDTO, Player, Tile, ActionType, VisualEffect } from '../types';
import { AssetLoader } from '../services/AssetLoader';
import { RenderService, RenderMetrics } from '../services/RenderService';
import { socketService } from '../services/SocketService';
import { Mic, MessageCircle, Battery, Signal, ChevronLeft, Menu, Volume2, Wifi, RefreshCw } from 'lucide-react';
import { Button } from './ui/Button';

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
        { info: { id: 0, name: "連線中...", avatar: "", score: 0, isDealer: false, flowerCount: 0, wind: "東", seatWind: "東" }, hand: [], handCount: 16, discards: [], melds: [] },
        { info: { id: 1, name: "等待中", avatar: "", score: 0, isDealer: false, flowerCount: 0, wind: "南", seatWind: "南" }, hand: [], handCount: 16, discards: [], melds: [] },
        { info: { id: 2, name: "等待中", avatar: "", score: 0, isDealer: false, flowerCount: 0, wind: "西", seatWind: "西" }, hand: [], handCount: 16, discards: [], melds: [] },
        { info: { id: 3, name: "等待中", avatar: "", score: 0, isDealer: false, flowerCount: 0, wind: "北", seatWind: "北" }, hand: [], handCount: 16, discards: [], melds: [] },
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
  const effectsRef = useRef<VisualEffect[]>([]); // Effects are transient, handled locally for animation
  
  // Interaction State
  const hitTestMetrics = useRef<RenderMetrics>({ p0HandStartX: 0, p0TileW: 0 });
  const hoveredTileRef = useRef<number>(-1);

  // UI State (React managed)
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [availableActions, setAvailableActions] = useState<ActionType[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // --- Socket Connection ---
  useEffect(() => {
    const socket = socketService.connect("http://localhost:8080");
    
    socket.on("connect", () => {
        setIsConnected(true);
        socketService.joinRoom("room_101");
    });

    socket.on("disconnect", () => setIsConnected(false));

    socket.on("game:state", (newState: GameStateDTO) => {
        // Update Ref for p5 loop
        gameRef.current = newState;
        // Update React State for UI Overlay
        setAvailableActions(newState.availableActions || []);
        setActivePlayerIndex(newState.turn);
    });

    socket.on("game:effect", (effectData: any) => {
        triggerEffect(effectData.type, effectData.text, effectData.position?.x, effectData.position?.y);
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
  const triggerEffect = (type: 'TEXT' | 'LIGHTNING' | 'PARTICLES', text?: string, x?: number, y?: number) => {
      effectsRef.current.push({
          id: Date.now() + Math.random(),
          type,
          text,
          x: x || window.innerWidth / 2,
          y: y || window.innerHeight / 2,
          life: type === 'LIGHTNING' ? 25 : 50,
          particles: type === 'PARTICLES' ? createParticles(x || window.innerWidth/2, y || window.innerHeight/2) : undefined
      });
  };

  const createParticles = (x: number, y: number) => {
      const pArr = [];
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

  // --- Interaction Handlers ---
  const handleDiscard = (tileIndex: number) => {
      // Optimistic UI update could go here, but for MJ exact state is critical
      // So we just send signal
      socketService.sendDiscard(tileIndex);
  };

  const handlePlayerAction = (action: ActionType) => {
      socketService.sendAction(action);
      setAvailableActions([]); // Clear immediately to prevent double click
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

        // Draw
        hitTestMetrics.current = RenderService.drawScene(
          p, 
          renderState, 
          globalScale, 
          hoveredTileRef.current
        );

        // Input Logic
        updateHitTest(p, globalScale);
      };

      const updateHitTest = (p: any, scale: number) => {
          hoveredTileRef.current = -1;
          
          // Only allow interaction if it's my turn and state is DISCARD
          // (In a real app, verify player ID matches self)
          const isMyTurn = gameRef.current.turn === 0; // Assuming P0 is always self in view
          const canDiscard = gameRef.current.state === 'DISCARD' || gameRef.current.state === 'STATE_DISCARD';

          if (!isMyTurn || !canDiscard) return;

          const mX = p.mouseX;
          const mY = p.mouseY;
          const handY = p.height - (130 * scale);
          
          const { p0HandStartX, p0TileW } = hitTestMetrics.current;

          if (mY > handY - 60 && mY < handY + 60) {
              if (p0HandStartX !== 0) {
                  const relativeX = mX - p0HandStartX;
                  if (relativeX >= 0) {
                      const hand = gameRef.current.players[0].hand;
                      const p0HandLen = hand.length;
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
               // Debounce slightly
               if (p.frameCount % 10 === 0) {
                   handleDiscard(hoveredTileRef.current);
                   hoveredTileRef.current = -1; // Reset
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
      {/* Top Bar */}
      <div className="absolute top-0 w-full h-12 bg-black/40 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 z-20">
          <div className="flex items-center gap-4">
            <Button variant="secondary" className="px-2 py-1 text-xs flex items-center gap-1" onClick={() => setView(AppView.LOBBY)}>
                 <ChevronLeft size={14}/> 離開
            </Button>
            <div className="flex items-center gap-2 text-yellow-500 text-sm font-bold">
                <span className="bg-yellow-500/20 px-2 py-0.5 rounded">房號 80440</span>
                <span className={`text-xs px-2 py-0.5 rounded ${isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {isConnected ? '連線正常' : '斷線重連中...'}
                </span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-gray-400">
               <button onClick={() => socketService.restartGame()} title="重啟遊戲">
                  <RefreshCw size={16} className="hover:text-white" />
               </button>
              <Wifi size={16} className={isConnected ? "text-green-500" : "text-red-500"}/>
              <div className="h-4 w-[1px] bg-gray-600 mx-1"></div>
              <button onClick={() => setIsMuted(!isMuted)}>
                 {isMuted ? <Volume2 size={18} className="text-red-500"/> : <Volume2 size={18} />}
              </button>
              <Menu size={20} className="cursor-pointer hover:text-white"/>
          </div>
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

// (Keeping PlayerCard component same as before, included inline here for completeness if needed, but using existing is fine)
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
         <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 shadow-lg">
            <div className="text-white text-xs md:text-sm font-bold tracking-wide flex items-center gap-2">{player.name}</div>
            <div className={`text-xs font-mono font-bold mt-0.5 ${player.score >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{player.score > 0 ? '+' : ''}{player.score}</div>
         </div>
         <div className="mt-1 flex gap-1">{[...Array(player.flowerCount)].map((_, i) => (<span key={i} className="text-[10px]">🌸</span>))}</div>
      </div>
    </div>
  );
};
