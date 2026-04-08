import React, { useState } from 'react';
import StartScreen from './components/StartScreen';
import Game from './components/Game';

export default function App() {
  const [screen, setScreen] = useState<'start' | 'game'>('start');

  return (
    <div className="w-full h-screen overflow-hidden bg-[#050505]">
      {screen === 'start' ? (
        <StartScreen onStart={() => setScreen('game')} />
      ) : (
        <Game />
      )}
    </div>
  );
}
