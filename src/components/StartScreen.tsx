import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Shield, Zap, Target, Flame, Skull, ChevronRight } from 'lucide-react';
import { DifficultyLevel, MapLayout, Point } from '../types';
import { MAP_LAYOUTS, CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';

interface StartScreenProps {
  onStart: (difficulty: DifficultyLevel, mapCode: MapLayout) => void;
}

export default function StartScreen({ onStart }: StartScreenProps) {
  const [selectionPhase, setSelectionPhase] = useState<'init' | 'difficulty' | 'map'>('init');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>('medium');

  const handleDifficultySelect = (diff: DifficultyLevel) => {
    setSelectedDifficulty(diff);
    setSelectionPhase('map');
  };

  const renderMapPreview = (path: Point[]) => {
    const points = path.map(p => `${p.x},${p.y}`).join(' ');
    return (
      <svg viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`} className="w-full h-full opacity-60 group-hover:opacity-100 transition-opacity drop-shadow-[0_0_15px_rgba(0,242,255,0.8)]">
        <polyline 
          points={points} 
          fill="none" 
          stroke="#00f2ff" 
          strokeWidth="40" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        <circle cx={path[0].x} cy={path[0].y} r="60" fill="#ff0000" className="animate-pulse" />
        <circle cx={path[path.length - 1].x} cy={path[path.length - 1].y} r="60" fill="#00ff44" />
      </svg>
    );
  };

  return (
    <div className="relative w-full h-screen bg-[#050505] flex flex-col items-center justify-center overflow-hidden font-sans text-white">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-20 blur-[120px]"
          style={{ background: 'radial-gradient(circle, #00f2ff 0%, transparent 70%)' }}
        />
        <div 
          className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full opacity-20 blur-[120px]"
          style={{ background: 'radial-gradient(circle, #ff00ea 0%, transparent 70%)' }}
        />
      </div>

      <AnimatePresence mode="wait">
        {selectionPhase !== 'map' ? (
          <motion.div 
            key="main-menu"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50, filter: 'blur(10px)' }}
            transition={{ duration: 0.5 }}
            className="z-10 flex flex-col items-center"
          >
            <h1 className="text-7xl md:text-9xl font-black tracking-tighter uppercase italic transform -skew-x-12 mb-8 text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-gray-500 text-center">
          GRIDLOCK<br/>DEFENSE
        </h1>

        <p className="max-w-md text-center text-gray-400 mb-12 font-light leading-relaxed px-6">
          The grid is under attack. Deploy advanced defensive protocols to neutralize incoming threats. Strategy is your only weapon.
        </p>

        <div className="flex flex-col items-center gap-8 min-h-[300px]">
          <AnimatePresence mode="wait">
            {selectionPhase === 'init' && (
              <motion.button
                key="init-btn"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                whileHover={{ scale: 1.05, skewX: -12 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectionPhase('difficulty')}
                className="group relative px-12 py-4 bg-white text-black font-bold text-xl uppercase tracking-widest transform -skew-x-12 transition-colors hover:bg-[#00f2ff]"
              >
                <span className="relative z-10 flex items-center gap-3">
                  Initialize Defense <Play className="w-5 h-5 fill-current" />
                </span>
                <div className="absolute inset-0 bg-[#00f2ff] opacity-0 group-hover:opacity-100 blur-xl transition-opacity" />
              </motion.button>
            )}

            {selectionPhase === 'difficulty' && (
              <motion.div
                key="diff-panel"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-col gap-3 w-80"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#00f2ff] font-mono uppercase tracking-[0.2em] text-[10px]">Select Protocol</span>
                  <button onClick={() => setSelectionPhase('init')} className="text-gray-500 hover:text-white transition-colors">
                    <span className="text-[10px] uppercase font-mono tracking-widest">Cancel</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={() => handleDifficultySelect('easy')}
                    className="flex items-center gap-4 p-3 bg-white/5 border border-white/10 rounded hover:bg-[#00ff44]/20 hover:border-[#00ff44]/50 transition-all font-mono font-bold tracking-widest uppercase text-left group"
                  >
                    <Shield className="w-4 h-4 text-[#00ff44]" />
                    <div>
                      <span className="block text-white text-sm group-hover:text-[#00ff44] transition-colors">Easy</span>
                      <span className="block text-[8px] text-gray-500 mt-1">Extra Gold & Reduced Threats</span>
                    </div>
                  </button>

                  <button 
                    onClick={() => handleDifficultySelect('medium')}
                    className="flex items-center gap-4 p-3 bg-white/5 border border-white/10 rounded hover:bg-[#00f2ff]/20 hover:border-[#00f2ff]/50 transition-all font-mono font-bold tracking-widest uppercase text-left group"
                  >
                    <Target className="w-4 h-4 text-[#00f2ff]" />
                    <div>
                      <span className="block text-white text-sm group-hover:text-[#00f2ff] transition-colors">Medium</span>
                      <span className="block text-[8px] text-gray-500 mt-1">Standard Defense Protocols</span>
                    </div>
                  </button>

                  <button 
                    onClick={() => handleDifficultySelect('master')}
                    className="flex items-center gap-4 p-3 bg-white/5 border border-white/10 rounded hover:bg-[#ffae00]/20 hover:border-[#ffae00]/50 transition-all font-mono font-bold tracking-widest uppercase text-left group"
                  >
                    <Flame className="w-4 h-4 text-[#ffae00]" />
                    <div>
                      <span className="block text-white text-sm group-hover:text-[#ffae00] transition-colors">Master</span>
                      <span className="block text-[8px] text-gray-500 mt-1">Aggressive Tactics Required</span>
                    </div>
                  </button>

                  <button 
                    onClick={() => handleDifficultySelect('insane')}
                    className="flex items-center gap-4 p-3 bg-white/5 border border-white/10 rounded hover:bg-[#ff0000]/20 hover:border-[#ff0000]/50 transition-all font-mono font-bold tracking-widest uppercase text-left group"
                  >
                    <Skull className="w-4 h-4 text-[#ff0000]" />
                    <div>
                      <span className="block text-white text-sm group-hover:text-[#ff0000] transition-colors">Insane</span>
                      <span className="block text-[8px] text-gray-500 mt-1">Overwhelming Forces</span>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-12 text-gray-500 mt-4">
            <div className="flex flex-col items-center gap-2">
              <Zap className="w-5 h-5" />
              <span className="text-[10px] uppercase tracking-widest font-mono">Fast Pace</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Target className="w-5 h-5" />
              <span className="text-[10px] uppercase tracking-widest font-mono">Tactical</span>
            </div>
          </div>
        </div>
      </motion.div>
      ) : (
        <motion.div
          key="map-menu"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="z-10 flex flex-col gap-8 w-full max-w-6xl px-8 items-center justify-start overflow-y-auto h-screen pt-12 pb-24"
        >
          <div className="w-full flex items-center justify-between mb-4 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-3xl font-black italic uppercase text-white tracking-widest">Select Sector</h2>
              <span className="text-[#00f2ff] font-mono tracking-[0.2em] text-[10px]">AWAITING DEPLOYMENT COORDINATES</span>
            </div>
            <button onClick={() => setSelectionPhase('difficulty')} className="px-6 py-2 border border-white/20 rounded hover:bg-white/10 transition-colors uppercase font-mono tracking-widest text-xs">
              Abort
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
            {MAP_LAYOUTS.map((map) => (
              <button
                key={map.id}
                onClick={() => onStart(selectedDifficulty, map)}
                className="group flex flex-col items-center gap-6 text-left transition-all p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-[#00f2ff]/50"
              >
                <div className="w-full aspect-[4/3] bg-[#020202] border border-white/10 group-hover:border-[#00f2ff] rounded-xl overflow-hidden relative shadow-2xl">
                  {/* Fake grid background for the map preview */}
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '10% 10%' }} />
                  {renderMapPreview(map.path)}
                </div>
                <div className="w-full">
                  <h3 className="text-xl text-white font-black uppercase tracking-widest mb-2 group-hover:text-[#00f2ff] transition-colors">{map.name}</h3>
                  <p className="text-xs text-gray-400 uppercase leading-relaxed">{map.description}</p>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      )}
      </AnimatePresence>


    </div>
  );
}
