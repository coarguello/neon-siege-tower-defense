import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bug, X, Send } from 'lucide-react';
import { GameState, DifficultyLevel } from '../types';

interface BugReportModalProps {
  gameState: GameState;
  difficulty: DifficultyLevel;
  onClose: () => void;
}

const WEBHOOK_URL = "https://discord.com/api/webhooks/1495215040750420092/Wm0DkDZemB8jFK6u7HXGq_jZfP57QmByhpeThF9_DTZtjDeRX8kTM9HkoEtxTQvzv0GC";

export default function BugReportModal({ gameState, difficulty, onClose }: BugReportModalProps) {
  const [reportText, setReportText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportText.trim()) return;

    setIsSubmitting(true);

    const payload = {
      content: "🔴 **NUEVO REPORTE DE BUG DETECTADO**",
      embeds: [{
        title: "Detalles del Error (Gridlock Defense)",
        description: reportText,
        color: 16711680, // Red
        fields: [
          { name: "Oleada", value: gameState.wave.toString(), inline: true },
          { name: "Dificultad", value: difficulty.toUpperCase(), inline: true },
          { name: "Oro Actual", value: gameState.gold.toString(), inline: true },
          { name: "Vidas", value: `${gameState.lives}/${gameState.maxLives}`, inline: true },
          { name: "Enemigos Eliminados", value: gameState.enemiesKilled.toString(), inline: true },
          { name: "Nivel Ejército", value: gameState.armyLevel.toString(), inline: true }
        ],
        timestamp: new Date().toISOString()
      }]
    };

    try {
      await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Error enviando bug:", error);
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ y: 50, scale: 0.9 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 50, scale: 0.9 }}
        className="bg-[#0a0a0a] border border-red-500/30 w-full max-w-lg rounded-2xl p-6 shadow-[0_0_50px_rgba(255,0,0,0.15)]"
      >
        {success ? (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/50">
              <Send className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-black italic tracking-wider text-green-500">¡REPORTE ENVIADO!</h2>
            <p className="text-gray-400 text-center text-sm">Gracias por ayudar a asegurar la integridad del sistema.</p>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                  <Bug className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h2 className="text-xl font-black italic tracking-wider text-white">REPORTE DE SISTEMA</h2>
                  <p className="text-xs text-red-400 uppercase tracking-widest font-mono">Enlace Discord Activo</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Describa la anomalía</label>
                <textarea
                  value={reportText}
                  onChange={e => setReportText(e.target.value)}
                  placeholder="Ej: La torreta láser dejó de disparar cuando los enemigos se amontonaron en la última curva..."
                  className="w-full bg-black border border-white/10 rounded-xl p-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50 min-h-[150px] resize-none"
                  required
                />
              </div>

              <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider text-center">
                  * Se enviarán automáticamente los datos de tu oleada, oro y vidas actuales para debuggear el error.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !reportText.trim()}
                className={`w-full py-4 mt-2 rounded-xl border font-black italic tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2 ${
                  isSubmitting || !reportText.trim()
                    ? 'bg-white/5 border-white/5 text-white/20 cursor-not-allowed'
                    : 'bg-red-500/10 border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white hover:shadow-[0_0_20px_rgba(255,0,0,0.5)]'
                }`}
              >
                {isSubmitting ? (
                  <span className="animate-pulse">Transmitiendo...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Enviar Reporte
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
