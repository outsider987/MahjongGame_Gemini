
import React, { useEffect, useRef, useState } from 'react';
import { AppView, GameStateDTO, Player, Tile, ActionType, VisualEffect } from '../types';
import { AssetLoader } from '../services/AssetLoader';
import { RenderService, RenderMetrics } from '../services/RenderService';
import { socketService } from '../services/SocketService';
import { SoundService } from '../services/SoundService';
import { Settings, X, LogOut, Volume2, VolumeX, RefreshCw, Wifi, Share2, Camera, PlayCircle } from 'lucide-react';
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
        { info: { id: 0, name: "連線中...", avatar: "", score: 0, isDealer: false, flowerCount: 0, flowers: [], wind: "東", seatWind: "東", isRichii: false, richiiDiscardIndex: -1 }, hand: [], handCount: 16, discards: [], melds: [] },
        { info: { id: 1, name: "等待中", avatar: "", score: 0, isDealer: false, flowerCount: 0, flowers: [], wind: "南", seatWind: "南", isRichii: false, richiiDiscardIndex: -1 }, hand: [], handCount: 16, discards: [], melds: [] },
        { info: { id: 2, name: "等待中", avatar: "", score: 0, isDealer: false, flowerCount: 0, flowers: [], wind: "西", seatWind: "西", isRichii: false, richiiDiscardIndex: -1 }, hand: [], handCount: 16, discards: [], melds: [] },
        { info: { id: 3, name: "等待中", avatar: "", score: 0, isDealer: false, flowerCount: 0, flowers: [], wind: "北", seatWind: "北", isRichii: false, richiiDiscardIndex: -1 }, hand: [], handCount: 16, discards: [], melds: [] },
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
      discardingPlayer: -1,
      lastStateChangeTime: 0
  });
  
  // Interaction State
  const hitTestMetrics = useRef<RenderMetrics>({ p0HandStartX: 0, p0TileW: 0 });
  const hoveredTileRef = useRef<number>(-1);
  const selectedTileRef = useRef<number>(-1);

  // Camera Shake
  const cameraRef = useRef({ shake: 0 });

  // UI State (React managed)
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [availableActions, setAvailableActions] = useState<ActionType[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

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

            // Sound: Turn Alert
            if (newState.turn === 0) {
                SoundService.playTurnAlert();
            }
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

            // Sound: Discard Clack
            SoundService.playDiscard();
        }

        // 3. Detect Draw (via Deck count decrease)
        if (prev.deckCount > newState.deckCount) {
            SoundService.playDraw();
        }

        // 4. Detect State/Step Change
        const stateChanged = prev.state !== newState.state;
        const stepChanged = prev.initData?.step !== newState.initData?.step;
        
        if (stateChanged || stepChanged) {
            animState.current.lastStateChangeTime = Date.now();
        }

        // Update Refs
        prevGameRef.current = newState;
        gameRef.current = newState;
        
        // Update React State
        setAvailableActions(newState.availableActions || []);
        setActivePlayerIndex(newState.turn);
        setIsGameOver(newState.state === 'STATE_GAME_OVER');
    });

    socket.on("game:effect", (effectData: any) => {
        triggerEffect(effectData.type, effectData.text, effectData.position?.x, effectData.position?.y, effectData.variant, effectData.tile);
        
        // Sound: Game Effect
        SoundService.playEffect(effectData.type);
    });

    return () => {
        socket.off("connect");
        socket.off("disconnect");
        socket.off("game:state");
        socket.off("game:effect");
        socketService.disconnect();
    };
  }, []);

  // Handle Mute Toggle
  useEffect(() => {
      SoundService.setMuted(isMuted);
  }, [isMuted]);


  // --- Effect System ---
  const triggerEffect = (type: string, text?: string, offX: number = 0, offY: number = 0, variant?: string, tile?: Tile) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      
      // Scale offsets based on screen width for responsive positioning
      const scale = Math.min(1.2, Math.max(0.6, window.innerWidth / 1280));

      // Calculate absolute position from center offset
      // If offsets (offX, offY) are 0, it places effect at screen center
      const x = centerX + (offX * scale);
      const y = centerY + (offY * scale);
      
      let particles: any[] | undefined = undefined;
      let life = 60;

      // Config based on type
      if (type === 'LIGHTNING') life = 20;
      else if (type === 'SHOCKWAVE') life = 45;
      else if (type === 'ACTION_KONG') life = 60;
      
      // Create Specific Particles
      if (type === 'PARTICLES' || type === 'ACTION_CHOW' || type === 'ACTION_PONG' || type === 'ACTION_KONG') {
          particles = createParticles(x, y, type as any, variant);
      }

      effectsRef.current.push({
          id: Date.now() + Math.random(),
          type: type as any,
          variant,
          text,
          tile,
          x, 
          y,
          life,
          particles
      });
  };

  const createParticles = (x: number, y: number, type: string, variant?: string) => {
      const pArr = [];
      let count = 30;
      let colors = ['#fbbf24', '#f59e0b', '#ffffff']; 
      let speedBase = 8;
      let shape: 'CIRCLE' | 'RECT' | 'TRIANGLE' = 'CIRCLE';

      if (variant === 'HU') {
          count = 150;
          colors = ['#ef4444', '#f87171', '#fbbf24', '#ffffff']; 
          speedBase = 20;
      } else if (type === 'ACTION_CHOW' || variant === 'GREEN') { 
          // Crumb particles
          count = 40;
          colors = ['#10b981', '#34d399', '#fbbf24']; // Green + Gold crumbs
          speedBase = 10;
          shape = 'RECT'; 
      } else if (type === 'ACTION_PONG' || variant === 'BLUE') { 
          // Debris
          count = 50;
          colors = ['#3b82f6', '#60a5fa', '#93c5fd']; 
          speedBase = 12;
          shape = 'TRIANGLE';
      } else if (type === 'ACTION_KONG' || variant === 'PURPLE') { 
          // Dust/Rocks
          count = 60;
          colors = ['#a855f7', '#c084fc', '#581c87'];
          speedBase = 15;
          shape = 'CIRCLE';
      }

      for(let i=0; i<count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const power = Math.random() * speedBase + (Math.random() * speedBase * 0.5); 
          
          pArr.push({
              x, y,
              vx: Math.cos(angle) * power,
              vy: Math.sin(angle) * power,
              life: 50 + Math.random() * 30,
              maxLife: 80,
              color: colors[Math.floor(Math.random() * colors.length)],
              size: 5 + Math.random() * 10,
              gravity: 0.2 + Math.random() * 0.2,
              drag: 0.94, 
              rotation: Math.random() * Math.PI,
              vRot: (Math.random() - 0.5) * 0.2,
              shape // Pass shape to renderer
          });
      }
      return pArr;
  };

  // --- Interaction Handlers ---
  const handleDiscard = (tileIndex: number) => {
      selectedTileRef.current = -1;
      socketService.sendDiscard(tileIndex);
      SoundService.playDiscard(); // Immediate feedback
  };

  const handlePlayerAction = (action: ActionType) => {
      SoundService.playClick();
      socketService.sendAction(action);
      // Don't clear availableActions immediately - wait for backend confirmation
      // This allows the user to see the buttons until the backend processes the action
  };

  const handleRestart = () => {
      SoundService.playClick();
      socketService.restartGame();
  };

  // --- P5 Loop ---
  useEffect(() => {
    if (!window.p5) return;

    const sketch = (p: any) => {
      let globalScale = 1;

      p.setup = () => {
        // MOBILE OPTIMIZATION:
        // Set Pixel Density to 1 to avoid Retina/High-DPI scaling issues (lag)
        p.pixelDensity(1); 
        
        const canvas = p.createCanvas(window.innerWidth, window.innerHeight);
        canvas.parent(renderRef.current!);
        p.frameRate(60); 
        p.textFont("'Noto Serif TC', 'Roboto', serif");
        AssetLoader.generateAll(p);
        
        // Init Sound on User Interaction (First Click)
        canvas.mousePressed(() => {
            SoundService.init();
        });
        // Handle touch start for mobile sound init
        canvas.touchStarted(() => {
             SoundService.init();
             // Prevent default browser scrolling behavior on canvas
             return false; 
        });
      };

      p.windowResized = () => {
        // IMPORTANT: Resize canvas when device rotates or browser resizes
        p.resizeCanvas(window.innerWidth, window.innerHeight);
      };

      p.draw = () => {
        // Recalculate scale every frame to handle smooth resizing/rotation animations
        globalScale = Math.min(1.2, Math.max(0.6, p.width / 1280));
        
        // Apply Screen Shake Decay
        if (cameraRef.current.shake > 0) {
            cameraRef.current.shake *= 0.9; // Decay
            if (cameraRef.current.shake < 0.5) cameraRef.current.shake = 0;
        }

        p.push();
        
        // Apply Shake Translation
        if (cameraRef.current.shake > 0) {
            const amt = cameraRef.current.shake;
            const sx = p.random(-amt, amt);
            const sy = p.random(-amt, amt);
            p.translate(sx, sy);
        }

        const renderState = {
            ...gameRef.current,
            effects: effectsRef.current
        };

        updateHitTest(p, globalScale);

        hitTestMetrics.current = RenderService.drawScene(
          p, 
          renderState, 
          globalScale, 
          hoveredTileRef.current,
          selectedTileRef.current,
          animState.current,
          cameraRef.current // Pass camera object for effects to modify
        );

        p.pop(); // Restore from shake
      };

      p.mousePressed = () => {
          // Ensure audio context is active on interaction
          SoundService.init();
          
          if (isGameOver) return; // No tile interactions on game over

          const isMyTurn = gameRef.current.turn === 0; 
          const canDiscard = gameRef.current.state === 'DISCARD' || gameRef.current.state === 'STATE_DISCARD';
          const isRichii = gameRef.current.players[0]?.info.isRichii;

          if (!isMyTurn || !canDiscard || isRichii) {
             selectedTileRef.current = -1;
             return;
          }

          if (hoveredTileRef.current !== -1) {
               if (selectedTileRef.current === hoveredTileRef.current) {
                   handleDiscard(hoveredTileRef.current);
                   hoveredTileRef.current = -1; 
               } else {
                   SoundService.playClick(); // Click sound for selection
                   selectedTileRef.current = hoveredTileRef.current;
               }
          } else {
              selectedTileRef.current = -1;
          }
      };

      const updateHitTest = (p: any, scale: number) => {
          hoveredTileRef.current = -1;
          
          if (gameRef.current.state === 'STATE_GAME_OVER') return;

          const isMyTurn = gameRef.current.turn === 0; 
          const canDiscard = gameRef.current.state === 'DISCARD' || gameRef.current.state === 'STATE_DISCARD';
          const isRichii = gameRef.current.players[0]?.info.isRichii;
          
          if (!isMyTurn || !canDiscard || isRichii) return;

          const mX = p.mouseX;
          const mY = p.mouseY;
          const handY = p.height - (130 * scale);
          
          const { p0HandStartX, p0TileW } = hitTestMetrics.current;
          
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
    // Added touch-action: none to prevent browser gestures
    <div className="relative w-full h-full bg-[#0a0a0a] overflow-hidden select-none" ref={renderRef} style={{ touchAction: 'none' }}>
      
      <div className="absolute top-4 left-4 z-50 flex items-center gap-3 animate-fade-in pointer-events-none">
           <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg transition-all hover:bg-black/60 cursor-default group select-none pointer-events-auto">
               <span className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${isConnected ? 'bg-green-500 text-green-500' : 'bg-red-500 text-red-500'} animate-pulse`}></span>
               <span className="text-yellow-500 text-xs font-bold font-mono tracking-wider">ROOM 80440</span>
               <div className="w-[1px] h-3 bg-white/20 mx-1"></div>
               <Wifi size={12} className={isConnected ? "text-green-400" : "text-red-400"} />
           </div>
      </div>

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
                       <p className="text-[10px] text-gray-600 font-mono">Mahjong Master v1.0.5</p>
                   </div>
               </div>
           )}
      </div>

      {/* Interactive Game Over Buttons - Positioned on bottom of the canvas, overlaying the P5 drawing */}
      {isGameOver && (
          <div className="absolute bottom-10 left-0 right-0 z-50 flex items-center justify-center gap-4 animate-scaleIn">
              <Button variant="secondary" className="flex items-center gap-2 text-lg px-8 py-3 shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                 <Share2 size={20} /> 分享
              </Button>
              <Button variant="gold" className="flex items-center gap-2 text-lg px-8 py-3 shadow-[0_0_20px_rgba(251,191,36,0.4)]">
                 <Camera size={20} /> 保存截圖
              </Button>
              <Button onClick={handleRestart} variant="primary" className="flex items-center gap-2 text-lg px-10 py-3 shadow-[0_0_20px_rgba(220,38,38,0.4)]">
                 <PlayCircle size={20} /> 繼續
              </Button>
          </div>
      )}

      {/* Players */}
      {!isGameOver && gameRef.current.players.map((pData, i) => {
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

      {availableActions.length > 0 && !isGameOver && (
        <div className="absolute bottom-48 left-1/2 -translate-x-1/2 z-50 flex gap-4 animate-bounce-in">
            <div className="flex gap-4 p-2 bg-black/60 backdrop-blur-xl rounded-2xl border border-yellow-500/30 shadow-[0_0_50px_rgba(251,191,36,0.2)]">
                <button 
                    onClick={() => handlePlayerAction('PASS')}
                    className="w-16 h-16 rounded-full bg-gray-700/80 hover:bg-gray-600 border-2 border-gray-500 text-white font-bold text-lg shadow-lg transition-transform hover:scale-110"
                >
                    過
                </button>
                {availableActions.includes('CHOW') && (
                   <button onClick={() => handlePlayerAction('CHOW')} className="w-20 h-20 bg-green-600 text-white font-black text-3xl rounded-full border-4 border-green-400 hover:scale-110 transition-transform shadow-[0_0_20px_#10b981]">吃</button>
                )}
                {availableActions.includes('PONG') && (
                   <button onClick={() => handlePlayerAction('PONG')} className="w-20 h-20 bg-blue-600 text-white font-black text-3xl rounded-full border-4 border-blue-400 hover:scale-110 transition-transform shadow-[0_0_20px_#3b82f6]">碰</button>
                )}
                {availableActions.includes('KONG') && (
                   <button onClick={() => handlePlayerAction('KONG')} className="w-20 h-20 bg-purple-600 text-white font-black text-3xl rounded-full border-4 border-purple-400 hover:scale-110 transition-transform shadow-[0_0_20px_#a855f7]">槓</button>
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
      
      {!isConnected && (
          <div className="absolute inset-0 z-40 bg-black/50 flex items-center justify-center">
              <div className="bg-gray-900 p-6 rounded-xl border border-red-500 text-center">
                  <h2 className="text-red-500 text-xl font-bold mb-2">無法連線至後端伺服器</h2>
                  <p className="text-gray-300 text-sm mb-4">請確認您的 Go 後端服務已在 Port 8080 啟動。</p>
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
      case 'bottom': return "bottom-4 left-4 flex-row items-end";
      case 'right': return "right-4 top-1/2 -translate-y-1/2 flex-col items-end";
      case 'top': return "top-4 left-1/2 -translate-x-1/2 flex-col items-center"; 
      case 'left': return "left-4 top-1/2 -translate-y-1/2 flex-col items-start";
      default: return "";
    }
  };
  return (
    <div className={`absolute ${getPositionClasses()} flex gap-3 pointer-events-auto transition-all duration-300 ${isActive ? 'opacity-60 hover:opacity-100 scale-105' : 'opacity-90 scale-100'}`}>
      <div className={`relative group ${isSelf ? 'order-1' : ''}`}>
        {isActive && <div className="absolute -inset-2 bg-yellow-500/30 rounded-full blur-md animate-pulse"></div>}
        <div className={`relative w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden border-2 shadow-lg z-10 bg-[#1a1a1a] ${isActive ? 'border-yellow-400' : 'border-gray-600'}`}>
          <img src={player.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + player.id} alt={player.name} className="w-full h-full object-cover" />
        </div>
        {player.isDealer && <div className="absolute -top-1 -right-1 z-20 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center border border-white shadow-sm"><span className="text-white text-[10px] font-serif font-bold">莊</span></div>}
      </div>
      <div className={`flex flex-col ${isSelf ? 'items-start order-2 mb-2' : (position === 'right' ? 'items-end mr-1' : (position === 'left' ? 'items-start ml-1' : 'items-center'))} z-0`}>
         <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 shadow-lg relative">
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
