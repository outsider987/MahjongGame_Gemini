
import React, { useState } from 'react';
import { AppView } from './types';
import { Lobby } from './components/Lobby';
import { GameCanvas } from './components/GameCanvas';
import { DebugScene } from './components/DebugScene';
import { OrientationGuard } from './components/OrientationGuard';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LOBBY);

  return (
    <OrientationGuard>
      <div className="w-full h-screen overflow-hidden bg-[#1a1a1a]">
        {currentView === AppView.LOBBY ? (
          <Lobby setView={setCurrentView} />
        ) : currentView === AppView.GAME ? (
          <GameCanvas setView={setCurrentView} />
        ) : (
          <DebugScene setView={setCurrentView} />
        )}
      </div>
    </OrientationGuard>
  );
};

export default App;
