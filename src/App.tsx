import React, { useState } from 'react';
import StartScreen from './components/StartScreen';
import Game from './components/Game';

import { DifficultyLevel, MapLayout } from './types';
import { MAP_LAYOUTS } from './constants';
import { SoundEngine } from './utils/SoundEngine';

export default function App() {
  const [screen, setScreen] = useState<'start' | 'game'>('start');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
  const [selectedMap, setSelectedMap] = useState<MapLayout>(MAP_LAYOUTS[0]);

  const handleStart = (diff: DifficultyLevel, mapCode: MapLayout) => {
    SoundEngine.init();
    SoundEngine.startMusic();
    setDifficulty(diff);
    setSelectedMap(mapCode);
    setScreen('game');
  };

  const handleReturnMenu = () => {
    SoundEngine.stopMusic();
    setScreen('start');
  };

  return (
    <div className="w-full h-screen overflow-hidden bg-[#050505]">
      {screen === 'start' ? (
        <StartScreen onStart={handleStart} />
      ) : (
        <Game 
          difficulty={difficulty} 
          mapLayout={selectedMap} 
          onReturnToMenu={handleReturnMenu}
        />
      )}
    </div>
  );
}
