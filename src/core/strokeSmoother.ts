import * as THREE from 'three';
import { SmoothingAlgorithm } from '../types';

/**
 * Real-time Stroke Smoother & Contact Point Optimizer
 * 
 * Provides stable smoothing via:
 * - Streamline (Weighted Moving Average / Pull-string smoothing)
 * - Exponential Weighted Moving Average (EWMA)
 * - Direct / None (Raw precision coordinates)
 */
export class StrokeSmoother {
  private historyWindow: Array<{ x: number; y: number; pressure: number; time: number }> = [];
  private lastSmoothed: { x: number; y: number; pressure: number } | null = null;

  public reset(): void {
    this.historyWindow = [];
    this.lastSmoothed = null;
  }

  /**
   * Process raw input coordinate into a smooth, jitter-free coordinate
   */
  public processPoint(
    rawX: number,
    rawY: number,
    pressure: number,
    algorithm: SmoothingAlgorithm = 'streamline',
    strength: number = 0.55, // 0.0 to 1.0
    timestamp: number = performance.now()
  ): { x: number; y: number; pressure: number } {
    if (algorithm === 'none') {
      this.lastSmoothed = { x: rawX, y: rawY, pressure };
      return { x: rawX, y: rawY, pressure };
    }

    let outX = rawX;
    let outY = rawY;
    let outP = pressure;

    switch (algorithm) {
      case 'streamline': {
        this.historyWindow.push({ x: rawX, y: rawY, pressure, time: timestamp });
        if (this.historyWindow.length > 8) this.historyWindow.shift();

        // Weighted moving average with exponential decay falloff
        let weightSum = 0;
        let sumX = 0;
        let sumY = 0;
        let sumP = 0;
        const count = this.historyWindow.length;
        const alpha = 0.3 + (1.0 - Math.min(1.0, Math.max(0.0, strength))) * 0.6;

        for (let i = 0; i < count; i++) {
          const w = Math.pow(alpha, count - 1 - i);
          sumX += this.historyWindow[i].x * w;
          sumY += this.historyWindow[i].y * w;
          sumP += this.historyWindow[i].pressure * w;
          weightSum += w;
        }

        outX = sumX / weightSum;
        outY = sumY / weightSum;
        outP = sumP / weightSum;
        break;
      }

      case 'exponential': {
        if (!this.lastSmoothed) {
          outX = rawX;
          outY = rawY;
          outP = pressure;
        } else {
          // Velocity-adaptive smoothing factor
          const dist = Math.hypot(rawX - this.lastSmoothed.x, rawY - this.lastSmoothed.y);
          const dynamicAlpha = Math.min(0.95, Math.max(0.1, (1.0 - strength * 0.75) + dist * 5.0));
          outX = this.lastSmoothed.x + (rawX - this.lastSmoothed.x) * dynamicAlpha;
          outY = this.lastSmoothed.y + (rawY - this.lastSmoothed.y) * dynamicAlpha;
          outP = this.lastSmoothed.pressure + (pressure - this.lastSmoothed.pressure) * dynamicAlpha;
        }
        break;
      }

      default: {
        outX = rawX;
        outY = rawY;
        outP = pressure;
        break;
      }
    }

    this.lastSmoothed = { x: outX, y: outY, pressure: outP };
    return { x: outX, y: outY, pressure: Math.max(0.05, Math.min(1.0, outP)) };
  }
}
