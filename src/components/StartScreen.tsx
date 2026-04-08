import React from 'react';
import { motion } from 'motion/react';
import { Play, Shield, Zap, Target } from 'lucide-react';

interface StartScreenProps {
  onStart: () => void;
}

export default function StartScreen({ onStart }: StartScreenProps) {
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

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="z-10 flex flex-col items-center"
      >
        <div className="flex items-center gap-4 mb-2">
          <Shield className="w-8 h-8 text-[#00f2ff]" />
          <span className="text-xs font-mono tracking-[0.3em] text-[#00f2ff] uppercase">System Online</span>
        </div>
        
        <h1 className="text-7xl md:text-9xl font-black tracking-tighter uppercase italic transform -skew-x-12 mb-8 text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-gray-500">
          NEON<br/>SIEGE
        </h1>

        <p className="max-w-md text-center text-gray-400 mb-12 font-light leading-relaxed px-6">
          The grid is under attack. Deploy advanced defensive protocols to neutralize incoming threats. Strategy is your only weapon.
        </p>

        <div className="flex flex-col items-center gap-8">
          <motion.button
            whileHover={{ scale: 1.05, skewX: -12 }}
            whileTap={{ scale: 0.95 }}
            onClick={onStart}
            className="group relative px-12 py-4 bg-white text-black font-bold text-xl uppercase tracking-widest transform -skew-x-12 transition-colors hover:bg-[#00f2ff]"
          >
            <span className="relative z-10 flex items-center gap-3">
              Initialize Defense <Play className="w-5 h-5 fill-current" />
            </span>
            <div className="absolute inset-0 bg-[#00f2ff] opacity-0 group-hover:opacity-100 blur-xl transition-opacity" />
          </motion.button>

          <div className="flex gap-12 text-gray-500">
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

      {/* Decorative Grid */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
    </div>
  );
}
