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
      {/* Header Bar */}
      <div className="absolute top-0 w-full h-16 bg-gradient-to-r from-[#5a1a1a] via-[#7f1d1d] to-[#5a1a1a] border-b-2 border-yellow-500 flex items-center justify-between px-4 shadow-lg z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-red-900 font-black border-2 border-white">
            MJ
          </div>
          <div>
            <h1 className="text-lg font-bold text-yellow-200 drop-shadow-md">麻將大師會所</h1>
            <p className="text-xs text-yellow-100 opacity-80">ID: 100001 | 成員: 100</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-black/40 px-3 py-1 rounded-full border border-yellow-600 flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-400 rounded-full animate-pulse"></div>
            <span className="text-yellow-400 font-mono font-bold">1,250 房卡</span>
          </div>
          <Button variant="gold" className="text-sm py-1 px-3" onClick={() => {}}>更多</Button>
        </div>
      </div>

      {/* Left Sidebar Tabs */}
      <div className="absolute left-0 top-16 bottom-0 w-24 bg-[#2a0a0a] border-r-2 border-yellow-600/30 flex flex-col items-center py-4 gap-2">
        {[
            { id: 'ROOMS', icon: Users, label: '大廳' },
            { id: 'RECORDS', icon: Trophy, label: '戰績' },
            { id: 'RANK', icon: Search, label: '排行' }
        ].map(tab => (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-20 h-20 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
                    activeTab === tab.id 
                    ? 'bg-gradient-to-b from-yellow-600 to-red-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] border-2 border-yellow-400 transform scale-105' 
                    : 'bg-[#451a1a] hover:bg-[#5c2222] border border-[#5c2222]'
                }`}
            >
                <tab.icon className={`w-8 h-8 ${activeTab === tab.id ? 'text-white' : 'text-gray-400'}`} />
                <span className={`text-xs font-bold ${activeTab === tab.id ? 'text-yellow-100' : 'text-gray-400'}`}>{tab.label}</span>
            </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="absolute left-24 top-16 right-0 bottom-0 p-6 overflow-auto bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')]">
        
        {/* Content: Ranking */}
        {activeTab === 'RANK' && (
           <div className="w-full max-w-5xl mx-auto bg-[#fffbf0] rounded-lg shadow-2xl overflow-hidden border-4 border-[#d4b98c]">
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
                    <div key={player.id} className="flex justify-between items-center p-4 bg-white hover:bg-yellow-50 text-gray-800">
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

        {/* Content: Rooms */}
        {activeTab === 'ROOMS' && (
            <div className="flex flex-col h-full">
                <div className="flex justify-end gap-4 mb-6">
                     <Button 
                        variant="gold" 
                        className="px-8 py-4 text-xl flex items-center gap-2 shadow-orange-900/50"
                        onClick={() => setView(AppView.GAME)} // Direct Join for demo
                     >
                        <Search className="w-6 h-6" /> 快速加入
                     </Button>
                     <Button 
                        variant="primary" 
                        className="px-8 py-4 text-xl flex items-center gap-2 shadow-red-900/50"
                        onClick={() => setShowCreateModal(true)}
                     >
                        <Plus className="w-6 h-6" /> 開設房間
                     </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {MOCK_ROOMS.map(room => (
                        <div key={room.id} className="bg-[#fff8e1] rounded-xl border-2 border-[#d4b98c] p-4 shadow-lg relative group hover:-translate-y-1 transition-transform duration-200">
                            <div className="absolute top-0 right-0 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-bl-lg uppercase">
                                {room.status}
                            </div>
                            <div className="flex gap-4 items-center mb-4">
                                <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-lg flex items-center justify-center shadow-inner">
                                    <span className="text-2xl text-white font-serif">🀄</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800 text-lg">{room.name}</h3>
                                    <p className="text-sm text-gray-500">ID: {room.id}</p>
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
                                className="w-full mt-4 py-2 text-sm" 
                                onClick={() => setView(AppView.GAME)}
                            >
                                進入房間
                            </Button>
                        </div>
                    ))}
                    {/* Placeholder for empty slots */}
                    {[1,2,3].map(i => (
                        <div key={i} className="bg-black/20 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center min-h-[180px]">
                            <p className="text-white/30 font-bold">空位</p>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>

      {/* Create Room Modal Overlay */}
      {showCreateModal && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm">
              <div className="bg-gradient-to-b from-[#4a1a1a] to-[#2a0a0a] p-1 rounded-2xl shadow-[0_0_50px_rgba(255,0,0,0.3)] max-w-lg w-full mx-4 animate-[scaleIn_0.2s_ease-out]">
                  <div className="bg-[#fff8e1] rounded-xl p-6 border-4 border-[#d4b98c]">
                      <div className="flex justify-between items-center mb-6 border-b-2 border-[#d4b98c] pb-4">
                          <h2 className="text-2xl font-bold text-[#5d4037]">開設房間</h2>
                          <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                              <LogOut className="w-6 h-6" />
                          </button>
                      </div>
                      
                      <div className="space-y-6">
                          <div className="space-y-2">
                              <label className="block text-[#5d4037] font-bold">底 / 台</label>
                              <div className="flex gap-4">
                                  <button className="flex-1 py-2 bg-red-600 text-white rounded shadow-md font-bold">100 / 20</button>
                                  <button className="flex-1 py-2 bg-white border border-gray-300 text-gray-600 rounded shadow-sm">300 / 50</button>
                                  <button className="flex-1 py-2 bg-white border border-gray-300 text-gray-600 rounded shadow-sm">500 / 100</button>
                              </div>
                          </div>

                          <div className="space-y-2">
                              <label className="block text-[#5d4037] font-bold">圈數</label>
                              <div className="flex items-center gap-6 text-[#5d4037]">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                      <input type="radio" name="rounds" defaultChecked className="w-5 h-5 text-red-600" />
                                      <span className="font-bold">1 圈 (北風北)</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                      <input type="radio" name="rounds" className="w-5 h-5 text-red-600" />
                                      <span className="font-bold">2 圈 (兩雀)</span>
                                  </label>
                              </div>
                          </div>

                          <div className="p-4 bg-yellow-100 rounded-lg border border-yellow-300 text-sm text-yellow-800 flex gap-3">
                              <Settings className="w-5 h-5 shrink-0" />
                              <p>開始遊戲時消耗房卡。AA制表示每人支付自己的份額。</p>
                          </div>
                      </div>

                      <div className="flex gap-4 mt-8">
                          <Button variant="danger" className="flex-1" onClick={() => setShowCreateModal(false)}>取消</Button>
                          <Button variant="primary" className="flex-1" onClick={() => {
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