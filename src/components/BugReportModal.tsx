import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bug, X, Send } from 'lucide-react';
import { GameState, DifficultyLevel } from '../types';

interface BugReportModalProps {
  gameState: GameState;
  difficulty: DifficultyLevel;
  onClose: () => void;
}

// Obfuscated Vault to prevent basic crawler bots from scraping the Discord hook
const VAULT = "aHR0cHM6Ly9kaXNjb3JkLmNvbS9hcGkvd2ViaG9va3MvMTQ5NTIxNTA0MDc1MDQyMDA5Mi9XbTBEa0RaZW1COGpGSzZ1N0hYR3FfalpmUDU3UW1CeWhwZVRoRjlfRFRadGpEZVJYOGtUTTlIa29FdHhUUXZ6djBHQw==";
const getVaultUrl = () => atob(VAULT);

const LAST_REPORT_KEY = "gridlock_last_report_time";
const PROFANITY_WORDS = ["puta", "mierda", "pendejo", "idiota", "estupido", "estúpido", "cabron", "cabrón", "coño", "perra", "puto", "maricon", "verga", "pinga", "polla", "zorra", "imbécil", "imbecil", "conchetumare", "chupala", "culo"];

export default function BugReportModal({ gameState, difficulty, onClose }: BugReportModalProps) {
  const [reportText, setReportText] = useState("");
  const [mainCategory, setMainCategory] = useState<string>("");
  const [subCategory, setSubCategory] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [securityWarning, setSecurityWarning] = useState<string | null>(null);

  // Auto clean subcategory when main changes
  React.useEffect(() => {
    setSubCategory("");
  }, [mainCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportText.trim()) return;
    setIsSubmitting(true);
    setSecurityWarning(null);

    // Barrier 1: Anti-Spam Rate Limit (3 minutes)
    const lastReport = localStorage.getItem(LAST_REPORT_KEY);
    if (lastReport) {
      const diff = Date.now() - parseInt(lastReport);
      if (diff < 180000) {
        setSecurityWarning(`BARRERA DE SPAM: Por favor, espere ${Math.ceil((180000 - diff) / 1000)}s antes de reportar.`);
        setIsSubmitting(false);
        return;
      }
    }

    // Barrier 2: Profanity Toxicity Filter
    const normalizedText = reportText.toLowerCase();
    if (PROFANITY_WORDS.some(word => normalizedText.includes(word))) {
      setSecurityWarning("SISTEMA BLOQUEADO: Lenguaje ofensivo detectado. Modere su vocabulario.");
      setIsSubmitting(false);
      return;
    }

    // Barrier 3: Low-Effort Spam & Keyboard Smashing
    if (normalizedText.length < 15) {
      setSecurityWarning("DATOS INSUFICIENTES: El reporte es demasiado corto para describir un problema.");
      setIsSubmitting(false);
      return;
    }
    if (/(jaja|jeje|jiji|haha|hehe|xdxd|kkkk)/.test(normalizedText) || /(.)\1{4,}/.test(normalizedText)) {
      setSecurityWarning("RUIDO DETECTADO: Secuencias repetitivas o bromas inválidas bloqueadas.");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      content: "🔴 **NUEVO REPORTE DE BUG DETECTADO**",
      embeds: [{
        title: "Detalles del Error (Gridlock Defense)",
        description: reportText,
        color: 16711680, // Red
        fields: [
          { name: "Categoría de Falla", value: `**${mainCategory}** ${subCategory ? `➔ ${subCategory}` : ''}`, inline: false },
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
      await fetch(getVaultUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      localStorage.setItem(LAST_REPORT_KEY, Date.now().toString());
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Error enviando bug:", error);
      setSecurityWarning("Error interno al contactar la bóveda.");
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Familia del Problema</label>
                  <select
                    value={mainCategory}
                    onChange={e => setMainCategory(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-red-500/50 appearance-none cursor-pointer"
                    required
                  >
                    <option value="" disabled>Seleccione Categoría...</option>
                    <option value="Torretas">Torretas</option>
                    <option value="Ejército">Ejército (Soldados)</option>
                    <option value="Camino/Enemigos">Camino y Enemigos</option>
                    <option value="Interfaz/HUD">Interfaz Gráfica</option>
                    <option value="Otro">Otro Comportamiento</option>
                  </select>
                </div>
                
                {mainCategory === "Torretas" && (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                    <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Nivel de la Torre</label>
                    <select
                      value={subCategory}
                      onChange={e => setSubCategory(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-red-500/50 appearance-none cursor-pointer"
                      required
                    >
                      <option value="" disabled>Especifique Nivel...</option>
                      <option value="Nivel 1">Nivel 1</option>
                      <option value="Nivel 2">Nivel 2</option>
                      <option value="Nivel 3">Nivel 3</option>
                      <option value="Nivel 4">Nivel 4</option>
                      <option value="Nivel 5 (MAX)">Nivel 5 (MAX)</option>
                      <option value="Todas las Torres">Falla en múltiples niveles</option>
                    </select>
                  </motion.div>
                )}

                {mainCategory === "Ejército" && (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                    <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Nivel del Ejército</label>
                    <select
                      value={subCategory}
                      onChange={e => setSubCategory(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-red-500/50 appearance-none cursor-pointer"
                      required
                    >
                      <option value="" disabled>Especifique Nivel...</option>
                      <option value="Nivel 1 (Basic)">Nivel 1 (Basic)</option>
                      <option value="Nivel 2 (Combat)">Nivel 2 (Combat)</option>
                      <option value="Nivel 3 (Shield)">Nivel 3 (Shield)</option>
                      <option value="Nivel 4+ (Elite)">Nivel 4+ (Elite)</option>
                    </select>
                  </motion.div>
                )}

                {mainCategory === "Camino/Enemigos" && (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                    <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Tipo de Falla</label>
                    <select
                      value={subCategory}
                      onChange={e => setSubCategory(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-red-500/50 appearance-none cursor-pointer"
                      required
                    >
                      <option value="" disabled>Especifique Zona...</option>
                      <option value="Se traban en las curvas">Se traban en las curvas</option>
                      <option value="Atraviesan las paredes">Atraviesan las paredes</option>
                      <option value="No llegan a la base">Problema en la meta</option>
                      <option value="Error de Spawn">Problema al nacer</option>
                      <option value="Otro patrón errático">Otro patrón errático</option>
                    </select>
                  </motion.div>
                )}
              </div>

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

              {securityWarning ? (
                 <motion.div 
                   initial={{ opacity: 0, y: 10 }} 
                   animate={{ opacity: 1, y: 0 }} 
                   className="bg-red-900/50 border border-red-500 rounded-lg p-4 font-bold text-center text-red-500 uppercase tracking-widest text-xs animate-pulse"
                 >
                   ⚠️ {securityWarning}
                 </motion.div>
              ) : (
                <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider text-center">
                    * Se enviarán automáticamente los datos de tu oleada, oro y vidas actuales para debuggear el error.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !reportText.trim() || !mainCategory || (['Torretas', 'Ejército', 'Camino/Enemigos'].includes(mainCategory) && !subCategory)}
                className={`w-full py-4 mt-2 rounded-xl border font-black italic tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2 ${
                  isSubmitting || !reportText.trim() || !mainCategory || (['Torretas', 'Ejército', 'Camino/Enemigos'].includes(mainCategory) && !subCategory)
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
