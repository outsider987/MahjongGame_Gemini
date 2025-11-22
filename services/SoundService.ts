
export class SoundService {
  private static ctx: AudioContext | null = null;
  private static isMuted: boolean = false;
  private static noiseBuffer: AudioBuffer | null = null;

  static init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.createNoiseBuffer();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(e => console.warn("Audio resume failed", e));
    }
  }

  static setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.ctx) {
       if (muted) this.ctx.suspend();
       else this.ctx.resume();
    }
  }

  private static createNoiseBuffer() {
      if (!this.ctx || this.noiseBuffer) return;
      const bufferSize = this.ctx.sampleRate * 2.0; 
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
      }
  }

  // 1. TILE CLACK (Discard / Table Hit)
  static playDiscard() {
      if (this.isMuted || !this.ctx) return;
      this.init(); 

      const t = this.ctx.currentTime;
      
      // Part A: High pitch tick
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.setValueAtTime(1200, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.05);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.1);

      // Part B: Thud noise
      if (this.noiseBuffer) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const noiseGain = this.ctx.createGain();
        const noiseFilter = this.ctx.createBiquadFilter();
        
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.value = 1000;
        
        noiseGain.gain.setValueAtTime(0.6, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noise.start(t);
        noise.stop(t + 0.1);
      }
  }

  // 2. TILE SLIDE (Draw)
  static playDraw() {
      if (this.isMuted || !this.ctx || !this.noiseBuffer) return;
      
      const t = this.ctx.currentTime;
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      
      filter.type = 'bandpass';
      filter.frequency.value = 1500;
      filter.Q.value = 1;
      
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.05);
      gain.gain.linearRampToValueAtTime(0, t + 0.15);
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      
      noise.start(t);
      noise.stop(t + 0.2);
  }

  // 3. UI CLICK
  static playClick() {
      if (this.isMuted || !this.ctx) return;
      const t = this.ctx.currentTime;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(400, t + 0.1);
      
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.1);
  }

  // 4. TURN ALERT
  static playTurnAlert() {
      if (this.isMuted || !this.ctx) return;
      const t = this.ctx.currentTime;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, t); 
      
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.1, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.8);
  }

  // 5. GAME EFFECTS
  static playEffect(type: string) {
      if (this.isMuted || !this.ctx) return;
      
      if (type.includes('PONG')) this.playChord([523.25, 659.25, 783.99]); // C Major
      else if (type.includes('KONG')) this.playChord([523.25, 659.25, 783.99, 1046.50], 'square'); // C Major 7
      else if (type.includes('CHOW')) this.playChord([440, 554.37, 659.25]); // A Major
      else if (type.includes('HU') || type === 'WIN') this.playWin();
      else if (type.includes('LIGHTNING')) this.playThunder();
      else if (type.includes('RICHII')) this.playChord([880, 1108, 1318], 'sawtooth'); 
  }

  private static playChord(freqs: number[], type: OscillatorType = 'sine') {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      
      freqs.forEach((f, i) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          
          osc.type = type;
          osc.frequency.value = f;
          
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.1, t + 0.05 + (i * 0.02)); 
          gain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
          
          osc.connect(gain);
          gain.connect(this.ctx!.destination);
          osc.start(t);
          osc.stop(t + 1.2);
      });
  }

  private static playWin() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // C Major Arpeggio
      
      notes.forEach((f, i) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          
          osc.type = 'triangle';
          osc.frequency.value = f;
          
          const start = t + (i * 0.12);
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.2, start + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 1.5);
          
          osc.connect(gain);
          gain.connect(this.ctx!.destination);
          osc.start(start);
          osc.stop(start + 2.0);
      });
  }

  private static playThunder() {
      if (!this.ctx || !this.noiseBuffer) return;
      const t = this.ctx.currentTime;
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, t);
      filter.frequency.linearRampToValueAtTime(100, t + 1.0);
      
      gain.gain.setValueAtTime(0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 1.2);
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      
      noise.start(t);
      noise.stop(t + 1.5);
  }
}
