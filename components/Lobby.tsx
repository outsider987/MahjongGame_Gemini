
import React, { useState } from 'react';
import { Users, Search, Plus, LogOut, Trophy, Settings } from 'lucide-react';
import { AppView } from '../types';
import { Button } from './ui/Button';
import { MOCK_PLAYERS, MOCK_ROOMS } from '../constants';

interface LobbyProps {
  setView: (view: AppView) => void;
}

export const Lobby: React.FC<LobbyProps> = ({ setView }) => {
  const [activeTab, setActiveTab] = useState<'ROOMS' | 'RECORDS' | 'RANK'>('ROOMS');
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="w-full h-screen bg-gradient-to-b from-red-900 to-[#3d0c0c] text-white overflow-hidden relative font-sans">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(15px); filter: blur(4px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        .animate-scaleIn { animation: scaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }
      `}</style>

      {/* Header Bar */}
      <div className="absolute top-0 w-full h-16 bg-gradient-to-r from-[#5a1a1a] via-[#7f1d1d] to-[#5a1a1a] border-b-2 border-yellow-500 flex items-center justify-between px-4 shadow-lg z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-red-900 font-black border-2 border-white shadow-md">
            MJ
          </div>
          <div>
            <h1 className="text-lg font-bold text-yellow-200 drop-shadow-md">麻將大師會所</h1>
            <p className="text-xs text-yellow-100 opacity-80">ID: 100001 | 成員: 100</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-black/40 px-3 py-1 rounded-full border border-yellow-600 flex items-center gap-2 shadow-inner">
            <div className="w-4 h-4 bg-yellow-400 rounded-full animate-pulse shadow-[0_0_8px_#fbbf24]"></div>
            <span className="text-yellow-400 font-mono font-bold">1,250 房卡</span>
          </div>
          <Button variant="gold" className="text-sm py-1 px-3" onClick={() => {}}>更多</Button>
        </div>
      </div>

      {/* Left Sidebar Tabs */}
      <div className="absolute left-0 top-16 bottom-0 w-24 bg-[#2a0a0a] border-r-2 border-yellow-600/30 flex flex-col items-center py-6 gap-3 z-20 shadow-2xl">
        {[
            { id: 'ROOMS', icon: Users, label: '大廳' },
            { id: 'RECORDS', icon: Trophy, label: '戰績' },
            { id: 'RANK', icon: Search, label: '排行' }
        ].map(tab => (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-20 h-20 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-300 ease-out relative overflow-hidden group ${
                    activeTab === tab.id 
                    ? 'bg-gradient-to-b from-yellow-600 to-red-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] border-2 border-yellow-400 transform scale-105 z-10' 
                    : 'bg-[#451a1a] hover:bg-[#5c2222] border border-[#5c2222] hover:-translate-y-1 hover:shadow-lg'
                }`}
            >
                {activeTab === tab.id && <div className="absolute inset-0 bg-white/10 animate-pulse rounded-xl" />}
                <tab.icon className={`w-8 h-8 transition-colors duration-300 ${activeTab === tab.id ? 'text-white drop-shadow-md' : 'text-gray-400 group-hover:text-yellow-200'}`} />
                <span className={`text-xs font-bold transition-colors duration-300 ${activeTab === tab.id ? 'text-yellow-100' : 'text-gray-400 group-hover:text-yellow-200'}`}>{tab.label}</span>
            </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="absolute left-24 top-16 right-0 bottom-0 p-6 overflow-auto bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')]">
        
        {/* Content: Ranking */}
        {activeTab === 'RANK' && (
           <div className="w-full max-w-5xl mx-auto bg-[#fffbf0] rounded-lg shadow-2xl overflow-hidden border-4 border-[#d4b98c] animate-fadeIn">
             <div className="bg-[#8b5e3c] p-3 flex justify-between text-white font-bold border-b-4 border-[#6d4c41]">
                <span className="w-16 text-center">排名</span>
                <span className="w-24">ID</span>
                <span className="flex-1">暱稱</span>
                <span className="w-24 text-center">積分</span>
                <span className="w-24 text-center">局數</span>
                <span className="w-24 text-center">勝場</span>
             </div>
             <div className="divide-y divide-[#e5e7eb]">
                {MOCK_PLAYERS.map((player, idx) => (
                    <div key={player.id} style={{ animationDelay: `${idx * 50}ms` }} className="flex justify-between items-center p-4 bg-white hover:bg-yellow-50 text-gray-800 animate-fadeIn fill-mode-backwards">
                        <div className="w-16 flex justify-center">
                            {idx < 3 ? (
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold shadow-md ${
                                    idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : 'bg-amber-700'
                                }`}>
                                    {idx + 1}
                                </div>
                            ) : (
                                <span className="font-bold text-gray-500">{idx + 1}</span>
                            )}
                        </div>
                        <span className="w-24 font-mono text-gray-500">{player.id}</span>
                        <span className="flex-1 font-bold text-[#8b4513]">{player.name}</span>
                        <span className="w-24 text-center font-bold text-red-600">{player.score}</span>
                        <span className="w-24 text-center">{player.games}</span>
                        <span className="w-24 text-center">{player.wins}</span>
                    </div>
                ))}
             </div>
             <div className="p-3 bg-red-50 border-t border-red-100 text-red-800 text-sm flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                <span>排行榜每日 00:00 更新。</span>
             </div>
           </div>
        )}

        {/* Content: Records */}
        {activeTab === 'RECORDS' && (
            <div className="w-full h-full flex items-center justify-center animate-fadeIn">
                <div className="text-center opacity-60 bg-black/20 p-8 rounded-3xl border border-white/10 backdrop-blur-sm">
                    <Trophy className="w-24 h-24 mx-auto text-yellow-600/80 mb-4 drop-shadow-lg" />
                    <h3 className="text-3xl font-bold text-yellow-500 mb-2">暫無戰績</h3>
                    <p className="text-yellow-100/60">快去參加比賽，創造你的傳說吧！</p>
                </div>
            </div>
        )}

        {/* Content: Rooms */}
        {activeTab === 'ROOMS' && (
            <div className="flex flex-col h-full animate-fadeIn">
                <div className="flex justify-end gap-4 mb-6">
                     <Button 
                        variant="gold" 
                        className="px-8 py-4 text-xl flex items-center gap-2 shadow-orange-900/50 transition-transform hover:scale-105"
                        onClick={() => setView(AppView.GAME)}
                     >
                        <Search className="w-6 h-6" /> 快速加入
                     </Button>
                     <Button 
                        variant="primary" 
                        className="px-8 py-4 text-xl flex items-center gap-2 shadow-red-900/50 transition-transform hover:scale-105"
                        onClick={() => setShowCreateModal(true)}
                     >
                        <Plus className="w-6 h-6" /> 開設房間
                     </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {MOCK_ROOMS.map((room, idx) => (
                        <div 
                            key={room.id} 
                            style={{ animationDelay: `${idx * 100}ms` }}
                            className="bg-[#fff8e1] rounded-xl border-2 border-[#d4b98c] p-4 shadow-lg relative group hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 ease-out animate-fadeIn"
                        >
                            <div className="absolute top-0 right-0 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-bl-lg uppercase shadow-sm">
                                {room.status}
                            </div>
                            <div className="flex gap-4 items-center mb-4">
                                <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-lg flex items-center justify-center shadow-inner group-hover:rotate-3 transition-transform duration-300">
                                    <span className="text-3xl text-white font-serif drop-shadow-md">🀄</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800 text-lg group-hover:text-red-800 transition-colors">{room.name}</h3>
                                    <p className="text-sm text-gray-500 font-mono">ID: {room.id}</p>
                                </div>
                            </div>
                            <div className="space-y-2 text-sm text-[#5d4037]">
                                <div className="flex justify-between border-b border-[#d4b98c]/30 pb-1">
                                    <span>圈數:</span> <span className="font-bold">{room.round}</span>
                                </div>
                                <div className="flex justify-between border-b border-[#d4b98c]/30 pb-1">
                                    <span>底/台:</span> <span className="font-bold">{room.stake}</span>
                                </div>
                            </div>
                            <Button 
                                className="w-full mt-4 py-2 text-sm opacity-90 group-hover:opacity-100 transition-opacity" 
                                onClick={() => setView(AppView.GAME)}
                            >
                                進入房間
                            </Button>
                        </div>
                    ))}
                    
                    {/* Placeholder for empty slots */}
                    {[1,2,3].map((i, idx) => (
                        <div 
                            key={i} 
                            style={{ animationDelay: `${(MOCK_ROOMS.length + idx) * 100}ms` }}
                            className="bg-black/20 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center min-h-[180px] animate-fadeIn hover:bg-black/30 transition-colors"
                        >
                            <p className="text-white/30 font-bold select-none">空位</p>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>

      {/* Create Room Modal Overlay */}
      {showCreateModal && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center backdrop-blur-sm transition-opacity duration-300">
              <div className="bg-gradient-to-b from-[#4a1a1a] to-[#2a0a0a] p-1 rounded-2xl shadow-[0_0_50px_rgba(255,0,0,0.3)] max-w-lg w-full mx-4 animate-scaleIn">
                  <div className="bg-[#fff8e1] rounded-xl p-6 border-4 border-[#d4b98c]">
                      <div className="flex justify-between items-center mb-6 border-b-2 border-[#d4b98c] pb-4">
                          <h2 className="text-2xl font-bold text-[#5d4037] flex items-center gap-2">
                             <Plus className="w-6 h-6 text-red-600" />
                             開設房間
                          </h2>
                          <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-red-600 transition-colors bg-gray-200 hover:bg-red-100 p-1 rounded-full">
                              <LogOut className="w-5 h-5" />
                          </button>
                      </div>
                      
                      <div className="space-y-6">
                          <div className="space-y-2">
                              <label className="block text-[#5d4037] font-bold">底 / 台</label>
                              <div className="flex gap-4">
                                  <button className="flex-1 py-2 bg-red-600 text-white rounded shadow-md font-bold ring-2 ring-red-300 ring-offset-1">100 / 20</button>
                                  <button className="flex-1 py-2 bg-white border border-gray-300 text-gray-600 rounded shadow-sm hover:bg-gray-50 transition-colors">300 / 50</button>
                                  <button className="flex-1 py-2 bg-white border border-gray-300 text-gray-600 rounded shadow-sm hover:bg-gray-50 transition-colors">500 / 100</button>
                              </div>
                          </div>

                          <div className="space-y-2">
                              <label className="block text-[#5d4037] font-bold">圈數</label>
                              <div className="flex items-center gap-6 text-[#5d4037] bg-white/50 p-3 rounded-lg border border-[#d4b98c]/30">
                                  <label className="flex items-center gap-2 cursor-pointer hover:text-red-700 transition-colors">
                                      <input type="radio" name="rounds" defaultChecked className="w-5 h-5 text-red-600 accent-red-600" />
                                      <span className="font-bold">1 圈 (北風北)</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer hover:text-red-700 transition-colors">
                                      <input type="radio" name="rounds" className="w-5 h-5 text-red-600 accent-red-600" />
                                      <span className="font-bold">2 圈 (兩雀)</span>
                                  </label>
                              </div>
                          </div>

                          <div className="p-4 bg-yellow-100 rounded-lg border border-yellow-300 text-sm text-yellow-800 flex gap-3 items-start">
                              <Settings className="w-5 h-5 shrink-0 mt-0.5 text-yellow-600" />
                              <p className="leading-relaxed">開始遊戲時將扣除房卡。若選擇 AA 制，所有玩家需確認支付後方可開始。</p>
                          </div>
                      </div>

                      <div className="flex gap-4 mt-8">
                          <Button variant="danger" className="flex-1" onClick={() => setShowCreateModal(false)}>取消</Button>
                          <Button variant="primary" className="flex-1 shadow-lg shadow-red-500/30" onClick={() => {
                              setShowCreateModal(false);
                              setView(AppView.GAME);
                          }}>確認創建</Button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
