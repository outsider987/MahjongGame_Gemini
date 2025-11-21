import React, { useState } from 'react';
import { AppView } from './types';
import { Lobby } from './components/Lobby';
import { GameCanvas } from './components/GameCanvas';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LOBBY);

  return (
    <div className="w-full h-screen overflow-hidden">
      {currentView === AppView.LOBBY ? (
        <Lobby setView={setCurrentView} />
      ) : (
        <GameCanvas setView={setCurrentView} />
      )}
    </div>
  );
};

export default App;