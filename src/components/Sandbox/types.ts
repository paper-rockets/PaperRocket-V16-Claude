/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SandboxTheme = 'sage' | 'dark' | 'monochrome';

export interface SandboxNavState {
  x: number;          // mm / px translation X
  y: number;          // mm / px translation Y
  z: number;          // mm / px translation Z (depth)
  pitch: number;      // degrees (-180 to 180)
  yaw: number;        // degrees (-180 to 180)
  roll: number;       // degrees (-180 to 180)
  scale: number;      // 0.1 to 5.0
  brushSize: number;  // px (0.5 to 50)
  activeMode: '2d' | '3d' | 'tactile' | 'brush';
}

export interface NavVariationProps {
  state: SandboxNavState;
  onChange: (updater: (prev: SandboxNavState) => SandboxNavState) => void;
  onReset: () => void;
  theme: SandboxTheme;
  sensitivity?: number;
  soundEnabled?: boolean;
}

export interface TelemetryEvent {
  id: string;
  source: string;
  action: string;
  value: string;
  timestamp: string;
}
