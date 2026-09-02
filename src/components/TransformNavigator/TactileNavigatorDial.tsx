import React, { useState, useCallback } from 'react';
import { ThreeTrackball } from '../ThreeTrackball';
import {
  TranslationEventPayload,
  RotationEventPayload,
  AccessibilityMode,
} from '../../types';

interface TactileNavigatorDialProps {
  isLocked?: boolean;
  accessibilityMode?: AccessibilityMode;
  onTranslate?: (data: TranslationEventPayload) => void;
  onRotate?: (data: RotationEventPayload) => void;
  onInteractionStart?: (handleName: string) => void;
  onInteractionEnd?: (handleName: string) => void;
  engine?: any;
}

export const TactileNavigatorDial: React.FC<TactileNavigatorDialProps> = ({
  isLocked = false,
  onRotate,
  onInteractionStart,
  onInteractionEnd,
  engine,
}) => {
  const [pitch, setPitch] = useState<number>(18);
  const [yaw, setYaw] = useState<number>(-24);
  const [soundEnabled] = useState<boolean>(true);

  // 3D Trackball Rotation handler
  const handleTrackballRotate = useCallback(
    (deltaYaw: number, deltaPitch: number) => {
      if (isLocked) return;
      setYaw((prev) => (prev + deltaYaw) % 360);
      setPitch((prev) => Math.max(-89, Math.min(89, prev + deltaPitch)));

      onInteractionStart?.('trackball-rotate');

      if (onRotate) {
        onRotate({
          rx: deltaPitch,
          ry: deltaYaw,
          rz: 0,
          deltaAngle: Math.hypot(deltaYaw, deltaPitch),
          axis: 'trackball',
          source: 'tactile-trackball',
          timestamp: performance.now(),
        });
      }

      if (engine) {
        engine.orbitCamera(-deltaYaw * 0.015, -deltaPitch * 0.015);
      }

      onInteractionEnd?.('trackball-rotate');
    },
    [isLocked, onRotate, onInteractionStart, onInteractionEnd, engine]
  );

  return (
    <div className="w-full flex items-center justify-center select-none text-xs">
      {/* Main Interactive Dial Container - Deep Tactile Trackball Socket with Chamfered Dish Depth Illusion */}
      <div
        className="relative w-[230px] h-[230px] flex items-center justify-center rounded-full overflow-hidden select-none touch-none"
        style={{
          background: 'radial-gradient(circle at 50% 40%, #1c1d24 0%, #121317 55%, #08080a 100%)',
          boxShadow:
            'inset 0 10px 24px rgba(0,0,0,0.95), inset 0 -4px 10px rgba(255,255,255,0.06), inset 0 0 32px rgba(0,0,0,0.9), 0 4px 16px rgba(0,0,0,0.7)',
          border: '1px solid rgba(255,255,255,0.09)',
        }}
      >
        {/* Subtle Specular Top Arc Reflection for 3D Beveled Lip */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 75% 25% at 50% 4%, rgba(255,255,255,0.12), transparent 70%)',
          }}
        />

        {/* Outer Concave Socket Shadow Ring */}
        <div className="absolute w-[92%] h-[92%] rounded-full border border-white/[0.04] pointer-events-none shadow-[inset_0_4px_12px_rgba(0,0,0,0.8)]" />

        {/* 3D Slate Grey Trackball Canvas */}
        <ThreeTrackball
          yaw={yaw}
          pitch={pitch}
          onRotate={handleTrackballRotate}
          soundEnabled={soundEnabled}
          size={208}
        />
      </div>
    </div>
  );
};
