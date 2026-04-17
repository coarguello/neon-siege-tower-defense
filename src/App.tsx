import React, { useState } from 'react';
import StartScreen from './components/StartScreen';
import Game from './components/Game';

import { DifficultyLevel, MapLayout } from './types';
import { MAP_LAYOUTS } from './constants';

export default function App() {
  const [screen, setScreen] = useState<'start' | 'game'>('start');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
  const [selectedMap, setSelectedMap] = useState<MapLayout>(MAP_LAYOUTS[0]);

  const handleStart = (diff: DifficultyLevel, mapCode: MapLayout) => {
    setDifficulty(diff);
    setSelectedMap(mapCode);
    setScreen('game');
  };

  return (
    <div className="w-full h-screen overflow-hidden bg-[#050505]">
      {screen === 'start' ? (
        <StartScreen onStart={handleStart} />
      ) : (
        <Game difficulty={difficulty} mapLayout={selectedMap} />
      )}
    </div>
  );
}
