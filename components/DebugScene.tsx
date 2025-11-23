
import React, { useState } from 'react';
import { AppView, Suit, Tile } from '../types';
import { GameCanvas } from './GameCanvas';
import { socketService } from '../services/SocketService';
import { 
  ArrowLeft, Zap, Layers, Trash2, Box, Grid, 
  Play, RotateCcw, Hand, LayoutGrid, X,
  ChevronRight, ChevronLeft, Droplets, Trophy
} from 'lucide-react';

interface DebugSceneProps {
    setView: (view: AppView) => void;
}

type TabType = 'TABLE' | 'EFFECTS' | 'HANDS' | 'GAME';

export const DebugScene: React.FC<DebugSceneProps> = ({ setView }) => {
    const [isPanelOpen, setIsPanelOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('TABLE');

    const getBackend = () => {
        return socketService.getDebugBackend();
    };

    const refreshState = (backend: any) => {
        backend.store.syncDto();
        backend.socket.trigger('game:state', backend.store.dto);
    };

    // --- TABLE / RIVER ACTIONS ---
    const addDiscard = () => {
        const backend = getBackend();
        if (!backend) return;
        
        const suits = [Suit.DOTS, Suit.BAMBOO, Suit.CHARACTERS, Suit.WINDS, Suit.DRAGONS];
        const s = suits[Math.floor(Math.random() * suits.length)];
        const v = Math.floor(Math.random() * 9) + 1;
        const t: Tile = { id: `dbg_discard_${Date.now()}`, suit: s, value: v, isFlower: false };
        
        backend.store.players[0].discards.push(t);
        backend.store.dto.lastDiscard = { tile: t, playerIndex: 0 }; 
        refreshState(backend);
    };

    const fillRiver = () => {
        const backend = getBackend();
        if (!backend) return;
        
        // Fill up to 24 tiles to stress test overlap
        for(let i=0; i<24; i++) {
             const t: Tile = { id: `dbg_fill_${Date.now()}_${i}`, suit: Suit.BAMBOO, value: (i % 9) + 1, isFlower: false };
             backend.store.players[0].discards.push(t);
        }
        refreshState(backend);
    };

    const clearDiscards = () => {
        const backend = getBackend();
        if (!backend) return;
        backend.store.players.forEach((p: any) => p.discards = []);
        backend.store.dto.lastDiscard = null;
        refreshState(backend);
    };

    // --- EFFECT ACTIONS ---
    const triggerEffect = (type: string, variant: string, text: string) => {
        const backend = getBackend();
        if (!backend) return;
        backend.socket.trigger('game:effect', { 
            type, 
            variant, 
            text, 
            position: { x: 0, y: 0 } // Center
        });
    };

    const triggerFlower = () => {
        const backend = getBackend();
        if (!backend) return;
        const flowerTile: Tile = { id: 'dbg_flower', suit: Suit.FLOWERS, value: 1, isFlower: true };
        // Trigger generic flower reveal for Player 0
        const pos = backend.store.getFlowerPos(0);
        backend.socket.trigger('game:effect', { 
            type: 'FLOWER_REVEAL', 
            tile: flowerTile, 
            text: `補花: 梅`, 
            position: pos 
        });
    };

    // --- HAND ACTIONS ---
    const setHand = (preset: 'EMPTY' | 'HONORS' | 'FULL_FLUSH' | 'THIRTEEN') => {
        const backend = getBackend();
        if (!backend) return;
        
        const player = backend.store.players[0];
        let tiles: Tile[] = [];
        let counter = 0;
        const create = (s: Suit, v: number) => ({ id: `dbg_${counter++}`, suit: s, value: v, isFlower: false });

        if (preset === 'HONORS') {
            for(let i=1; i<=4; i++) for(let j=0; j<3; j++) tiles.push(create(Suit.WINDS, i));
            tiles.push(create(Suit.DRAGONS, 1));
        } else if (preset === 'FULL_FLUSH') {
            for(let i=1; i<=9; i++) tiles.push(create(Suit.BAMBOO, i));
            tiles.push(create(Suit.BAMBOO, 1));
            tiles.push(create(Suit.BAMBOO, 1));
            tiles.push(create(Suit.BAMBOO, 9));
            tiles.push(create(Suit.BAMBOO, 9));
        } else if (preset === 'THIRTEEN') {
             [1,9].forEach(v => tiles.push(create(Suit.DOTS, v)));
             [1,9].forEach(v => tiles.push(create(Suit.BAMBOO, v)));
             [1,9].forEach(v => tiles.push(create(Suit.CHARACTERS, v)));
             [1,2,3,4].forEach(v => tiles.push(create(Suit.WINDS, v)));
             [1,2,3].forEach(v => tiles.push(create(Suit.DRAGONS, v)));
        } else if (preset === 'EMPTY') {
            tiles = [];
        }

        player.hand = tiles;
        backend.store.sortHand(0);
        refreshState(backend);
    };

    const addTileToHand = () => {
        const backend = getBackend();
        if (!backend) return;
        const player = backend.store.players[0];
        player.hand.push({ id: `dbg_add_${Date.now()}`, suit: Suit.DOTS, value: 5, isFlower: false });
        backend.store.sortHand(0);
        refreshState(backend);
    }

    // --- GAME STATE ACTIONS ---
    const forceState = (state: string) => {
        const backend = getBackend();
        if (!backend) return;
        
        if (state === 'RESTART') {
            backend.socket.trigger('game:restart');
        } else if (state === 'FORCE_DISCARD') {
             backend.store.dto.state = 'DISCARD';
             backend.store.dto.turn = 0;
             backend.store.dto.initData = undefined;
             backend.store.dto.availableActions = [];
             refreshState(backend);
        } else if (state === 'FORCE_HU') {
             // Just show the button
             backend.store.dto.availableActions = ['HU', 'RICHII'];
             refreshState(backend);
        } else if (state === 'INSTANT_WIN') {
             // Force the backend to trigger HU logic immediately
             // We use the mock event handler directly
             if (backend.currentState) {
                 backend.handleClientEvent('action:operate', 'HU');
             }
        }
    };

    return (
        <div className="relative w-full h-full bg-black">
            {/* The Real Canvas */}
            <GameCanvas setView={setView} />

            {/* Debug Sidebar */}
            <div className={`absolute top-0 right-0 h-full bg-black/60 backdrop-blur-md border-l border-white/10 shadow-2xl transition-all duration-300 z-[100] flex flex-col ${isPanelOpen ? 'w-80 translate-x-0' : 'w-0 translate-x-full'}`}>
                
                {/* Toggle Button */}
                <button 
                    onClick={() => setIsPanelOpen(!isPanelOpen)}
                    className="absolute -left-12 top-20 bg-yellow-500/80 hover:bg-yellow-400/90 backdrop-blur-sm text-black p-3 rounded-l-xl font-bold shadow-[0_0_20px_rgba(234,179,8,0.2)] border-y border-l border-yellow-300/40 flex items-center justify-center w-12 h-14 transition-all"
                >
                   {isPanelOpen ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
                </button>

                {/* Header */}
                <div className="flex-none p-5 border-b border-white/5 bg-black/30">
                     <h2 className="text-xl font-black text-white/90 flex items-center gap-2">
                        <Box className="text-yellow-500" />
                        DEBUG MODE
                     </h2>
                     <p className="text-xs text-gray-500 mt-1 font-mono">DevTools v1.1</p>
                </div>

                {/* Tabs */}
                <div className="flex p-2 gap-1 bg-black/20">
                    {[
                        { id: 'TABLE', icon: Grid },
                        { id: 'EFFECTS', icon: Zap },
                        { id: 'HANDS', icon: Layers },
                        { id: 'GAME', icon: Play },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={`flex-1 py-2 rounded-lg flex justify-center items-center transition-all ${activeTab === tab.id ? 'bg-yellow-600/80 text-white shadow-lg backdrop-blur-sm' : 'text-gray-500 hover:bg-white/5 hover:text-gray-200'}`}
                        >
                            <tab.icon size={18} />
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    
                    {/* TABLE TAB (River Controls) */}
                    {activeTab === 'TABLE' && (
                        <div className="space-y-4 animate-fadeIn">
                             <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                                 <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">River (Discards)</h3>
                                 <div className="grid grid-cols-2 gap-2">
                                     <button onClick={addDiscard} className="bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/30 py-2 rounded-lg text-xs font-bold transition-all backdrop-blur-sm">
                                         + 1 Tile
                                     </button>
                                     <button onClick={fillRiver} className="bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/30 py-2 rounded-lg text-xs font-bold transition-all backdrop-blur-sm">
                                         Fill (Stress Test)
                                     </button>
                                     <button onClick={clearDiscards} className="col-span-2 bg-red-600/30 hover:bg-red-600/50 text-red-200 border border-red-500/30 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 backdrop-blur-sm">
                                         <Trash2 size={14} /> Clear River
                                     </button>
                                 </div>
                             </div>
                             
                             <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/10 text-xs text-yellow-200/60">
                                 Use "Fill" to check if discard tiles overlap with the player hand or UI elements on different screen sizes.
                             </div>
                        </div>
                    )}

                    {/* EFFECTS TAB */}
                    {activeTab === 'EFFECTS' && (
                        <div className="space-y-4 animate-fadeIn">
                            <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                                <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Actions</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => triggerEffect('ACTION_PONG', 'BLUE', '碰')} className="bg-blue-600/80 hover:bg-blue-500/90 text-white py-2 rounded-lg font-bold backdrop-blur-sm">碰 (Pong)</button>
                                    <button onClick={() => triggerEffect('ACTION_CHOW', 'GREEN', '吃')} className="bg-green-600/80 hover:bg-green-500/90 text-white py-2 rounded-lg font-bold backdrop-blur-sm">吃 (Chow)</button>
                                    <button onClick={() => triggerEffect('ACTION_KONG', 'PURPLE', '槓')} className="bg-purple-600/80 hover:bg-purple-500/90 text-white py-2 rounded-lg font-bold backdrop-blur-sm">槓 (Kong)</button>
                                    <button onClick={() => triggerEffect('SHOCKWAVE', 'HU', '胡了')} className="bg-red-600/80 hover:bg-red-500/90 text-white py-2 rounded-lg font-bold backdrop-blur-sm">胡 (Hu)</button>
                                </div>
                            </div>
                            <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                                <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Visuals</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => triggerEffect('LIGHTNING', 'GOLD', '')} className="bg-yellow-600/30 text-yellow-200 border border-yellow-500/50 py-2 rounded-lg text-xs font-bold backdrop-blur-sm">⚡ Lightning</button>
                                    <button onClick={triggerFlower} className="bg-pink-600/30 text-pink-200 border border-pink-500/50 py-2 rounded-lg text-xs font-bold backdrop-blur-sm">🌸 Flower</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* HANDS TAB */}
                    {activeTab === 'HANDS' && (
                        <div className="space-y-4 animate-fadeIn">
                             <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                                <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Presets</h3>
                                <div className="space-y-2">
                                    <button onClick={() => setHand('FULL_FLUSH')} className="w-full bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-200 border border-emerald-700/50 py-2 rounded-lg text-xs font-bold backdrop-blur-sm">
                                        清一色 (Full Flush)
                                    </button>
                                    <button onClick={() => setHand('HONORS')} className="w-full bg-indigo-900/40 hover:bg-indigo-800/60 text-indigo-200 border border-indigo-700/50 py-2 rounded-lg text-xs font-bold backdrop-blur-sm">
                                        大四喜 (Big Four Winds)
                                    </button>
                                    <button onClick={() => setHand('THIRTEEN')} className="w-full bg-slate-800/60 hover:bg-slate-700/80 text-slate-200 border border-slate-600/50 py-2 rounded-lg text-xs font-bold backdrop-blur-sm">
                                        國士無雙 (13 Orphans)
                                    </button>
                                </div>
                             </div>
                             <div className="grid grid-cols-2 gap-2">
                                 <button onClick={addTileToHand} className="bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 backdrop-blur-sm">
                                    <LayoutGrid size={14} /> +1 Tile
                                 </button>
                                 <button onClick={() => setHand('EMPTY')} className="bg-red-500/20 hover:bg-red-500/40 text-red-300 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 backdrop-blur-sm">
                                    <Trash2 size={14} /> Clear
                                 </button>
                             </div>
                        </div>
                    )}

                     {/* GAME TAB */}
                     {activeTab === 'GAME' && (
                        <div className="space-y-4 animate-fadeIn">
                             <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                                <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">State Control</h3>
                                <div className="space-y-2">
                                    <button onClick={() => forceState('RESTART')} className="w-full bg-blue-600/70 hover:bg-blue-500/80 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 backdrop-blur-sm">
                                        <RotateCcw size={16} /> Restart Game
                                    </button>
                                    <button onClick={() => forceState('FORCE_DISCARD')} className="w-full bg-gray-700/50 hover:bg-gray-600/60 text-gray-200 py-2 rounded-lg text-xs font-bold backdrop-blur-sm">
                                        Force Discard Phase
                                    </button>
                                    <button onClick={() => forceState('FORCE_HU')} className="w-full bg-yellow-600/40 hover:bg-yellow-500/60 text-yellow-200 border border-yellow-500/50 py-2 rounded-lg text-xs font-bold backdrop-blur-sm">
                                        Show HU Button
                                    </button>
                                    <button onClick={() => forceState('INSTANT_WIN')} className="w-full bg-red-600/70 hover:bg-red-500/80 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 backdrop-blur-sm">
                                        <Trophy size={16} /> Instant Win
                                    </button>
                                </div>
                             </div>
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 bg-black/30">
                    <button 
                        onClick={() => setView(AppView.LOBBY)}
                        className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
                    >
                        <ArrowLeft size={16} />
                        <span className="font-bold text-sm">Return to Lobby</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
