// src/utils/SoundEngine.ts

class SoundEngineClass {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  public isMuted: boolean = false;
  private isMusicPlaying: boolean = false;
  private musicInterval: number | null = null;
  private beatStep: number = 0;

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = this.isMuted ? 0 : 0.4; // 40% master volume
    } catch (e) {
      console.warn("Web Audio API no soportada por su navegador.", e);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.isMuted ? 0 : 0.4;
    }
    return this.isMuted;
  }

  private playTone(freq: number, type: OscillatorType, dur: number, vol = 1) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + dur);
  }

  // SFX Profiles
  playLaser() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playMissile() {
    // Generador de ruido blanco para sonido explosivo
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    
    try {
      const bufferSize = this.ctx.sampleRate * 0.3; // 0.3 segundos
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
      }
      
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      
      // Filtro Lowpass para hacerlo sonar grave/opaco como una explosión lejana
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.3);
      
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      
      noise.start();
    } catch(e) {}
  }

  playExplosion() {
    if (this.isMuted) return;
    this.playTone(80, 'square', 0.2, 0.4);
    this.playMissile();
  }

  playCoin() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    osc.frequency.setValueAtTime(1600, this.ctx.currentTime + 0.05); // Salto musical como recolección
    
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playError() {
    this.playTone(150, 'sawtooth', 0.3, 0.4);
  }

  // Ambient Background Heartbeat (Replaces the traumatic repetive bass)
  startMusic() {
    if (this.isMusicPlaying) return;
    this.init(); 
    if (!this.ctx) return;
    
    // Fuerza el desbloqueo del AudioContext en el navegador sincronamente con el click
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.playTone(1, 'sine', 0.01, 0); // Dummy invisible sound to unlock audio engine safely

    this.isMusicPlaying = true;
    this.beatStep = 0;
    
    // Arpegio de misterio "Stranger Things / Ambient"
    // C3, Eb3, G3, B3 variando. Esto da progresión y color sin ser ruido molesto.
    const sequence = [
      130.81, 155.56, 196.00, 246.94, 
      130.81, 155.56, 196.00, 246.94,
      130.81, 155.56, 196.00, 293.66, 
      130.81, 155.56, 196.00, 246.94
    ];
    
    this.musicInterval = window.setInterval(() => {
      if (!this.isMusicPlaying || this.isMuted) return;
      const freq = sequence[this.beatStep % 16];
      
      // 'triangle' genera un aura ochentosa suave, alargamos la nota a 2.0 segundos para dar un eco hermoso y onírico
      this.playTone(freq, 'triangle', 2.0, 0.12); 
      
      this.beatStep++;
    }, 600); // 1 paso cada 600ms = 1 nota cada casi un segundo = Relajante y épico en lugar de traumático
  }

  stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicInterval !== null) {
      window.clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

export const SoundEngine = new SoundEngineClass();
