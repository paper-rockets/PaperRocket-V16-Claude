/**
 * Haptic feedback and tactile micro-interaction audio engine.
 * Provides physical vibration via navigator.vibrate alongside
 * synthetic micro-haptic clicks via Web Audio API for cross-platform tactile feel.
 */

export type HapticType =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'snap'
  | 'detent'
  | 'boundary'
  | 'success'
  | 'mode-switch'
  | 'lock'
  | 'unlock';

class HapticsEngine {
  private audioCtx: AudioContext | null = null;
  private isEnabled: boolean = true;
  private isAudioFeedbackEnabled: boolean = true;
  private lastTriggerTime: number = 0;

  constructor() {
    // Restore preference from localStorage if present
    if (typeof window !== 'undefined') {
      try {
        const storedHaptics = localStorage.getItem('transform_joystick_haptics_enabled');
        if (storedHaptics !== null) {
          this.isEnabled = storedHaptics === 'true';
        }
        const storedAudio = localStorage.getItem('mody_sound_enabled');
        if (storedAudio !== null) {
          this.isAudioFeedbackEnabled = storedAudio === 'true';
        }
      } catch {
        // Ignore localStorage restrictions
      }
    }
  }

  public setAudioFeedbackEnabled(enabled: boolean) {
    this.isAudioFeedbackEnabled = enabled;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('mody_sound_enabled', String(enabled));
      } catch {
        // Ignore
      }
    }
  }

  public getAudioFeedbackEnabled(): boolean {
    return this.isAudioFeedbackEnabled;
  }

  public toggleAudioFeedback(): boolean {
    const next = !this.isAudioFeedbackEnabled;
    this.setAudioFeedbackEnabled(next);
    return next;
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('transform_joystick_haptics_enabled', String(enabled));
      } catch {
        // Ignore
      }
    }
  }

  public getEnabled(): boolean {
    return this.isEnabled;
  }

  public toggleEnabled(): boolean {
    const next = !this.isEnabled;
    this.setEnabled(next);
    if (next) {
      this.trigger('success');
    }
    return next;
  }

  /**
   * Lazy initialization of Web Audio context for synthetic tactile clicks.
   */
  private getAudioContext(): AudioContext | null {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        try {
          this.audioCtx = new AudioCtxClass();
        } catch {
          this.audioCtx = null;
        }
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Plays an ultra-short, crisp tactile micro-transient simulating mechanical detents.
   */
  private playMicroClick(freq: number, durationMs: number, gainValue: number, decayType: 'crisp' | 'soft' | 'punch' = 'crisp') {
    if (!this.isAudioFeedbackEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Pitch transient: quick drop creates a tactile "thud/click"
      if (decayType === 'crisp') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq * 1.6, now);
        osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.4), now + durationMs / 1000);
      } else if (decayType === 'punch') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq * 2.2, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + durationMs / 1000);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
      }

      // Gain envelope
      gain.gain.setValueAtTime(gainValue * 0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + durationMs / 1000);
    } catch {
      // Audio autoplay policy or error safely caught
    }
  }

  /**
   * Triggers physical vibration and tactile micro-audio based on interaction type.
   */
  public trigger(type: HapticType = 'light', minIntervalMs: number = 20) {
    if (!this.isEnabled) return;

    const now = Date.now();
    if (now - this.lastTriggerTime < minIntervalMs && type !== 'snap' && type !== 'boundary') {
      return;
    }
    this.lastTriggerTime = now;

    // 1. Physical Device Vibration API
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        switch (type) {
          case 'light':
          case 'detent':
            navigator.vibrate(8);
            break;
          case 'medium':
            navigator.vibrate(16);
            break;
          case 'heavy':
          case 'snap':
            navigator.vibrate(28);
            break;
          case 'mode-switch':
            navigator.vibrate([12, 35, 18]);
            break;
          case 'lock':
            navigator.vibrate([20, 25, 20]);
            break;
          case 'unlock':
            navigator.vibrate(14);
            break;
          case 'boundary':
            navigator.vibrate([18, 30, 25]);
            break;
          case 'success':
            navigator.vibrate([10, 40, 15, 40, 20]);
            break;
        }
      } catch {
        // Ignore vibration failure
      }
    }

    // 2. Synthetic Micro-Haptic Audio Click
    switch (type) {
      case 'light':
      case 'detent':
        this.playMicroClick(240, 16, 0.45, 'crisp');
        break;
      case 'medium':
        this.playMicroClick(180, 24, 0.6, 'crisp');
        break;
      case 'heavy':
        this.playMicroClick(110, 38, 0.8, 'punch');
        break;
      case 'snap':
        this.playMicroClick(320, 32, 0.9, 'punch');
        break;
      case 'mode-switch':
        this.playMicroClick(280, 20, 0.5, 'crisp');
        setTimeout(() => this.playMicroClick(380, 25, 0.65, 'crisp'), 40);
        break;
      case 'lock':
        this.playMicroClick(140, 30, 0.7, 'punch');
        break;
      case 'unlock':
        this.playMicroClick(300, 20, 0.55, 'crisp');
        break;
      case 'boundary':
        this.playMicroClick(90, 45, 0.85, 'punch');
        break;
      case 'success':
        this.playMicroClick(350, 20, 0.5, 'crisp');
        setTimeout(() => this.playMicroClick(520, 30, 0.6, 'crisp'), 55);
        break;
    }
  }

  /**
   * Helper for rotation / continuous dragging detent ticks (e.g. every 15 degrees).
   */
  public checkAngleDetent(currentAngle: number, lastDetentRef: { current: number }, stepDeg: number = 15) {
    const currentStep = Math.floor(currentAngle / stepDeg);
    const lastStep = Math.floor(lastDetentRef.current / stepDeg);

    if (currentStep !== lastStep) {
      lastDetentRef.current = currentAngle;
      // Stronger haptic on quadrant boundary (0°, 90°, 180°, 270°)
      const isCardinal = Math.abs(currentAngle % 90) < 3 || Math.abs(currentAngle % 90) > 87;
      this.trigger(isCardinal ? 'medium' : 'detent', 25);
    }
  }
}

export const haptics = new HapticsEngine();
