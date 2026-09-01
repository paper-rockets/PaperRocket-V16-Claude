import React, { useState, useEffect } from 'react';
import { StudioEngine } from '../core/studioEngine';
import { ARSessionState } from '../types';
import {
  Glasses,
  X,
  Maximize2,
  Minimize2,
  MoveVertical,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  Compass,
} from 'lucide-react';

interface ARViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  engine: StudioEngine | null;
  theme?: 'light' | 'dark';
}

export const ARViewerModal: React.FC<ARViewerModalProps> = ({
  isOpen,
  onClose,
  engine,
  theme = 'dark',
}) => {
  if (!isOpen) return null;

  const [arState, setArState] = useState<ARSessionState>({
    isSupported: false,
    isActive: false,
    hasHitTest: false,
    elevation: 0.0,
    scale: 1.0,
  });
  const [statusMsg, setStatusMsg] = useState<string>('Checking WebXR capabilities...');
  const [elevation, setElevation] = useState<number>(0.0);
  const [isSimulatedAR, setIsSimulatedAR] = useState<boolean>(false);

  useEffect(() => {
    const checkXR = async () => {
      if (typeof navigator !== 'undefined' && 'xr' in navigator && (navigator as any).xr) {
        try {
          const supported = await (navigator as any).xr.isSessionSupported('immersive-ar');
          setArState((prev) => ({ ...prev, isSupported: supported }));
          if (supported) {
            setStatusMsg('WebXR Immersive-AR Ready: Hit-testing enabled');
          } else {
            setStatusMsg('WebXR Hardware not detected. Simulated Desktop AR available.');
          }
        } catch (e) {
          setStatusMsg('WebXR inspection complete. Desktop AR mode ready.');
        }
      } else {
        setStatusMsg('Desktop Browser: Using Studio Realistic AR Floor Grid Simulator.');
      }
    };
    checkXR();
  }, []);

  const handleStartRealAR = async () => {
    if (!engine) return;
    try {
      setStatusMsg('Requesting WebXR session with Hit-Test...');
      const success = await engine.startWebXRSession();
      if (success) {
        setArState((prev) => ({ ...prev, isActive: true, hasHitTest: true }));
        setStatusMsg('AR Active: Move device to scan floor and place 3D sketch.');
      } else {
        setIsSimulatedAR(true);
        engine.enableSimulatedARMode(true);
        setStatusMsg('Simulated AR Mode active: 1 Unit = 1.0 Meter Real-world Scale');
      }
    } catch (err: any) {
      console.warn('WebXR session error:', err);
      setIsSimulatedAR(true);
      engine.enableSimulatedARMode(true);
      setStatusMsg('Simulated AR Environment activated.');
    }
  };

  const handleStopAR = () => {
    if (!engine) return;
    engine.stopWebXRSession();
    engine.enableSimulatedARMode(false);
    setArState((prev) => ({ ...prev, isActive: false }));
    setIsSimulatedAR(false);
    onClose();
  };

  const handleElevationChange = (newElev: number) => {
    setElevation(newElev);
    engine?.setARSceneElevation(newElev);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md select-none p-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-[#141519]/98 text-neutral-100 shadow-2xl overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-900/60">
          <div className="flex items-center gap-2">
            <Glasses className="w-5 h-5 text-indigo-400" />
            <span className="text-sm font-bold tracking-wide">WebXR AR Spatial Viewer</span>
          </div>
          <button
            onClick={handleStopAR}
            className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Status Capsule */}
          <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-0.5">
              <div className="font-semibold text-neutral-200">AR Environment Status</div>
              <div className="text-neutral-400">{statusMsg}</div>
            </div>
          </div>

          {/* Scale & Feature Highlights */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl bg-neutral-900/50 border border-neutral-800">
              <span className="text-neutral-500 font-bold uppercase text-[10px]">Real-World Scale</span>
              <div className="font-mono text-sm font-bold text-emerald-400 mt-0.5">1 Unit = 1.00 m</div>
            </div>
            <div className="p-3 rounded-xl bg-neutral-900/50 border border-neutral-800">
              <span className="text-neutral-500 font-bold uppercase text-[10px]">Hit-Test Anchor</span>
              <div className="font-mono text-sm font-bold text-cyan-400 mt-0.5">Floor Centroid</div>
            </div>
          </div>

          {/* Y-Axis Levitation Gestures Slider */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex items-center gap-1.5 text-neutral-300 font-medium">
                <MoveVertical className="w-3.5 h-3.5 text-indigo-400" />
                <span>Room Y-Axis Levitation (Floor Offset)</span>
              </div>
              <span className="font-mono text-xs text-indigo-300 font-bold">
                {(elevation * 100).toFixed(0)} cm
              </span>
            </div>
            <input
              type="range"
              min="-1.5"
              max="2.0"
              step="0.05"
              value={elevation}
              onChange={(e) => handleElevationChange(parseFloat(e.target.value))}
              className="w-full accent-indigo-500 h-1.5 bg-neutral-700 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-neutral-500 font-mono mt-1">
              <span>-150 cm (Floor Sink)</span>
              <span>0 cm (Floor Level)</span>
              <span>+200 cm (Floating)</span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-neutral-800 flex items-center gap-2">
            <button
              onClick={handleStopAR}
              className="flex-1 py-2 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-semibold"
            >
              Exit Session
            </button>
            <button
              onClick={handleStartRealAR}
              className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg"
            >
              <Glasses className="w-4 h-4" />
              <span>Launch AR Viewer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
