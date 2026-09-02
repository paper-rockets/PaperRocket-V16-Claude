import React, { useState, useEffect, useRef, useMemo } from 'react';
import App from '../../App';
import {
  Tablet,
  Smartphone,
  Maximize,
  Minimize,
  Maximize2,
  RotateCw,
  PenTool,
  Wifi,
  Battery,
  Sparkles,
  Sliders,
  Monitor,
} from 'lucide-react';
import { isFullscreen, toggleFullscreen, subscribeFullscreenChange, isStandalonePWA } from '../../utils/fullscreen';

export type DevicePreset = 's6lite' | 's25ultra' | 'fullscreen';
export type Orientation = 'portrait' | 'landscape';

export interface DeviceConfig {
  id: DevicePreset;
  name: string;
  fullName: string;
  category: 'tablet' | 'phone';
  screen: {
    width: number;
    height: number;
    logicalWidth: number;
    logicalHeight: number;
    dpr: number;
    aspectRatio: string;
    diagonal: string;
    panelType: string;
  };
  frame: {
    outerWidth: number;
    outerHeight: number;
    bezelWidth: number;
    borderRadius: number;
    screenBorderRadius: number;
    frameColor: string;
    edgeAccent: string;
  };
  camera: {
    type: 'bezel-dot' | 'punch-hole';
    size: number;
    topOffset: number;
  };
  features: {
    hasSPen: boolean;
    sPenType: string;
    speakers: string;
    chassis: string;
  };
}

export const DEVICE_SPECS: Record<'s6lite' | 's25ultra', DeviceConfig> = {
  s6lite: {
    id: 's6lite',
    name: 'Galaxy Tab S6 Lite',
    fullName: 'Samsung Galaxy Tab S6 Lite (2024 / 2022)',
    category: 'tablet',
    screen: {
      width: 1200,
      height: 2000,
      logicalWidth: 600,
      logicalHeight: 1000,
      dpr: 2.0,
      aspectRatio: '5:3 (3:5 Portrait)',
      diagonal: '10.4″ WUXGA+ (1200×2000)',
      panelType: 'TFT LCD (224 ppi)',
    },
    frame: {
      outerWidth: 654,
      outerHeight: 1054,
      bezelWidth: 27,
      borderRadius: 36,
      screenBorderRadius: 18,
      frameColor: '#1e2025',
      edgeAccent: '#333742',
    },
    camera: {
      type: 'bezel-dot',
      size: 7,
      topOffset: 13,
    },
    features: {
      hasSPen: true,
      sPenType: 'S-Pen (4096 pressure levels, tilt, magnetic side attach)',
      speakers: 'Dual AKG Dolby Atmos Speakers (Top & Bottom)',
      chassis: 'Aluminum Unibody (Oxford Gray / Angora Blue)',
    },
  },
  s25ultra: {
    id: 's25ultra',
    name: 'Galaxy S25 Ultra',
    fullName: 'Samsung Galaxy S25 Ultra 5G (Flagship)',
    category: 'phone',
    screen: {
      width: 1440,
      height: 3120,
      logicalWidth: 480,
      logicalHeight: 1040,
      dpr: 3.0,
      aspectRatio: '19.5:9 Portrait',
      diagonal: '6.9″ QHD+ (1440×3120)',
      panelType: 'Dynamic AMOLED 2X (500 ppi, 120Hz)',
    },
    frame: {
      outerWidth: 504,
      outerHeight: 1064,
      bezelWidth: 12,
      borderRadius: 44,
      screenBorderRadius: 36,
      frameColor: '#16171b',
      edgeAccent: '#3e424c',
    },
    camera: {
      type: 'punch-hole',
      size: 11,
      topOffset: 16,
    },
    features: {
      hasSPen: true,
      sPenType: 'Built-in S-Pen Silo (4096 levels, Bluetooth Air Actions)',
      speakers: 'Stereo Speakers + Mic Holes',
      chassis: 'Titanium Armor Frame (Contoured Rounded Corners)',
    },
  },
};

interface DeviceSimulatorWrapperProps {
  initialDevice?: DevicePreset;
}

export const DeviceSimulatorWrapper: React.FC<DeviceSimulatorWrapperProps> = ({
  initialDevice = 's6lite',
}) => {
  // Determine initial device preset from query parameter, port, or prop
  const [device, setDevice] = useState<DevicePreset>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const queryDev = params.get('device') as DevicePreset;
      if (queryDev && ['s6lite', 's25ultra', 'fullscreen'].includes(queryDev)) {
        return queryDev;
      }
      if (params.get('raw') === 'true' || params.get('fullscreen') === 'true') {
        return 'fullscreen';
      }
      // Check port-based default
      const port = window.location.port;
      if (port === '3001') return 's6lite';
      if (port === '3002') return 's25ultra';

      // If running on an actual tablet, phone, touch device, or standalone PWA, default to fullscreen direct view
      if (isStandalonePWA()) {
        return 'fullscreen';
      }
      const isTouchDevice =
        'ontouchstart' in window ||
        (typeof navigator !== 'undefined' && (navigator.maxTouchPoints > 0 || (navigator as any).msMaxTouchPoints > 0));
      const isMobileOrTabletUA =
        typeof navigator !== 'undefined' &&
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Tablet|Silk/i.test(navigator.userAgent);

      if (isTouchDevice || isMobileOrTabletUA) {
        return 'fullscreen';
      }
    }
    return initialDevice;
  });

  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [scaleMode, setScaleMode] = useState<'fit' | '100' | '75' | '50'>('fit');
  const [stylusSimulated, setStylusSimulated] = useState<boolean>(true);
  const [stylusPressure, setStylusPressure] = useState<number>(0.75);
  const [showDeviceSpecs, setShowDeviceSpecs] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('12:45');
  const [isBrowserFs, setIsBrowserFs] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [fitScale, setFitScale] = useState<number>(1.0);

  // Subscribe to browser fullscreen changes
  useEffect(() => {
    setIsBrowserFs(isFullscreen());
    const unsub = subscribeFullscreenChange((active) => {
      setIsBrowserFs(active);
    });
    return unsub;
  }, []);

  // Update clock every minute
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 30000);
    return () => clearInterval(interval);
  }, []);

  const activeSpec = device !== 'fullscreen' ? DEVICE_SPECS[device] : null;

  // Compute dimensions based on orientation
  const currentDims = useMemo(() => {
    if (!activeSpec) {
      return {
        width: typeof window !== 'undefined' ? window.innerWidth : 1200,
        height: typeof window !== 'undefined' ? window.innerHeight : 800,
        logicalWidth: typeof window !== 'undefined' ? window.innerWidth : 1200,
        logicalHeight: typeof window !== 'undefined' ? window.innerHeight : 800,
        outerWidth: typeof window !== 'undefined' ? window.innerWidth : 1200,
        outerHeight: typeof window !== 'undefined' ? window.innerHeight : 800,
      };
    }

    const isPortrait = orientation === 'portrait';
    const width = isPortrait ? activeSpec.screen.width : activeSpec.screen.height;
    const height = isPortrait ? activeSpec.screen.height : activeSpec.screen.width;
    const logicalWidth = isPortrait ? activeSpec.screen.logicalWidth : activeSpec.screen.logicalHeight;
    const logicalHeight = isPortrait ? activeSpec.screen.logicalHeight : activeSpec.screen.logicalWidth;
    const outerWidth = isPortrait ? activeSpec.frame.outerWidth : activeSpec.frame.outerHeight;
    const outerHeight = isPortrait ? activeSpec.frame.outerHeight : activeSpec.frame.outerWidth;

    return { width, height, logicalWidth, logicalHeight, outerWidth, outerHeight };
  }, [activeSpec, orientation]);

  // Measure container and compute fit scale
  useEffect(() => {
    if (device === 'fullscreen') return;

    const calculateScale = () => {
      if (!containerRef.current) return;
      const availWidth = containerRef.current.clientWidth - 48;
      const availHeight = containerRef.current.clientHeight - 48;

      if (availWidth <= 0 || availHeight <= 0) return;

      const scaleX = availWidth / currentDims.outerWidth;
      const scaleY = availHeight / currentDims.outerHeight;
      const computedFit = Math.min(scaleX, scaleY, 1.0);
      setFitScale(Math.max(0.2, computedFit));
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, [device, currentDims]);

  // Actual scale factor applied to outer device frame
  const effectiveScale = useMemo(() => {
    if (device === 'fullscreen') return 1.0;
    if (scaleMode === 'fit') return fitScale;
    if (scaleMode === '100') return 1.0;
    if (scaleMode === '75') return 0.75;
    if (scaleMode === '50') return 0.5;
    return 1.0;
  }, [device, scaleMode, fitScale]);

  if (device === 'fullscreen') {
    return (
      <div className="w-screen h-screen overflow-hidden select-none bg-black relative group">
        <App />
        {/* Floating Quick Action Badge in Direct View */}
        <div className="fixed top-2.5 right-2.5 z-50 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity bg-[#14151a]/80 hover:bg-[#14151a]/95 backdrop-blur-md border border-neutral-800 p-1 rounded-xl shadow-xl">
          <button
            type="button"
            onClick={() => toggleFullscreen()}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            title={isBrowserFs ? 'Exit Browser Fullscreen (Esc)' : 'Enter Browser Fullscreen (F11)'}
          >
            {isBrowserFs ? <Minimize className="w-4 h-4 text-amber-400" /> : <Maximize className="w-4 h-4 text-sky-400" />}
          </button>
          <button
            type="button"
            onClick={() => setDevice('s6lite')}
            className="px-2 py-1 rounded-lg text-[11px] font-medium text-neutral-300 hover:text-white hover:bg-white/10 flex items-center gap-1 transition-colors"
            title="Return to Device Emulator"
          >
            <Monitor className="w-3.5 h-3.5 text-purple-400" />
            <span>Emulator</span>
          </button>
        </div>
      </div>
    );
  }

  const spec = DEVICE_SPECS[device];

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden font-sans select-none bg-[#0b0c10] text-neutral-200">
      {/* ── Top Workbench Control Bar ── */}
      <header className="h-14 shrink-0 px-4 bg-[#12141a]/95 border-b border-neutral-800 backdrop-blur-xl flex items-center justify-between z-40 shadow-lg">
        {/* Left: Device Mode Switchers */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-bold text-xs tracking-wider uppercase text-sky-400 bg-sky-950/40 border border-sky-500/30 px-2.5 py-1 rounded-lg">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Device Emulator</span>
          </div>

          <div className="h-4 w-px bg-neutral-800 mx-1" />

          {/* S6 Lite Button */}
          <button
            onClick={() => setDevice('s6lite')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              device === 's6lite'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25 ring-1 ring-sky-400'
                : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800'
            }`}
          >
            <Tablet className="w-3.5 h-3.5" />
            <span>Galaxy Tab S6 Lite</span>
            <span className="text-[10px] opacity-80 font-mono">(1200×2000)</span>
          </button>

          {/* S25 Ultra Button */}
          <button
            onClick={() => setDevice('s25ultra')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              device === 's25ultra'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25 ring-1 ring-purple-400'
                : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Galaxy S25 Ultra</span>
            <span className="text-[10px] opacity-80 font-mono">(1440×3120)</span>
          </button>

          {/* Direct Fullscreen */}
          <button
            onClick={() => setDevice('fullscreen')}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800 flex items-center gap-1.5 transition-colors"
            title="Open Direct Fullscreen (No Device Frame)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Direct View</span>
          </button>
        </div>

        {/* Center: Live Display Specs Badge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900/80 border border-neutral-800 text-xs text-neutral-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-white">{spec.name}</span>
          <span className="text-neutral-500">•</span>
          <span className="font-mono text-sky-400 font-medium">{spec.screen.diagonal}</span>
          <span className="text-neutral-500">•</span>
          <span className="text-neutral-400">{spec.screen.aspectRatio}</span>
          <span className="text-neutral-500">•</span>
          <span className="font-mono text-purple-300 capitalize">{orientation}</span>
        </div>

        {/* Right: Quick Controls & Scale */}
        <div className="flex items-center gap-1.5 text-xs">
          {/* Orientation Toggle */}
          <button
            onClick={() => setOrientation((prev) => (prev === 'portrait' ? 'landscape' : 'portrait'))}
            className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white flex items-center gap-1.5 transition-colors"
            title={`Toggle Orientation (Currently ${orientation})`}
          >
            <RotateCw className="w-3.5 h-3.5 text-sky-400" />
            <span className="capitalize">{orientation}</span>
          </button>

          {/* Scale Presets */}
          <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5">
            {(['fit', '100', '75', '50'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setScaleMode(m)}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                  scaleMode === m
                    ? 'bg-neutral-700 text-white font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {m === 'fit' ? 'Auto Fit' : `${m}%`}
              </button>
            ))}
          </div>

          {/* S-Pen Stylus Simulation Indicator */}
          <button
            onClick={() => setStylusSimulated((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-colors ${
              stylusSimulated
                ? 'bg-sky-950/60 border-sky-500/50 text-sky-300'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400'
            }`}
            title="S-Pen Hardware Stylus Simulation"
          >
            <PenTool className="w-3.5 h-3.5 text-sky-400" />
            <span>S-Pen</span>
          </button>

          {/* Browser Fullscreen Toggle */}
          <button
            onClick={() => toggleFullscreen()}
            className={`p-1.5 rounded-lg border transition-colors ${
              isBrowserFs
                ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
            title={isBrowserFs ? 'Exit Browser Fullscreen (Esc)' : 'Enter Browser Fullscreen (F11)'}
          >
            {isBrowserFs ? <Minimize className="w-3.5 h-3.5 text-amber-400" /> : <Maximize className="w-3.5 h-3.5" />}
          </button>

          {/* Device Specs Popover Toggle */}
          <button
            onClick={() => setShowDeviceSpecs((prev) => !prev)}
            className={`p-1.5 rounded-lg border transition-colors ${
              showDeviceSpecs
                ? 'bg-neutral-800 border-neutral-600 text-white'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
            title="Device Hardware Specs"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ── Main Viewport Area ── */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto relative flex items-center justify-center p-6"
      >
        {/* Device Specs Overlay Drawer */}
        {showDeviceSpecs && (
          <div className="absolute top-4 right-4 z-50 w-80 p-4 rounded-2xl bg-[#15171f]/95 border border-neutral-700 shadow-2xl backdrop-blur-2xl text-xs space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="font-bold text-white text-sm">{spec.fullName}</span>
              <button
                onClick={() => setShowDeviceSpecs(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-neutral-300">
              <div className="flex justify-between py-1 border-b border-neutral-800/60">
                <span className="text-neutral-500">Native Resolution</span>
                <span className="font-mono font-bold text-sky-400">
                  {spec.screen.width} × {spec.screen.height} px
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-800/60">
                <span className="text-neutral-500">Logical Viewport</span>
                <span className="font-mono text-purple-300">
                  {spec.screen.logicalWidth} × {spec.screen.logicalHeight} pt (DPR {spec.screen.dpr}x)
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-800/60">
                <span className="text-neutral-500">Aspect Ratio</span>
                <span className="font-medium text-white">{spec.screen.aspectRatio}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-800/60">
                <span className="text-neutral-500">Display Panel</span>
                <span className="font-medium text-white">{spec.screen.panelType}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-800/60">
                <span className="text-neutral-500">Stylus Hardware</span>
                <span className="font-medium text-emerald-400">{spec.features.sPenType}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-800/60">
                <span className="text-neutral-500">Chassis & Material</span>
                <span className="text-neutral-300">{spec.features.chassis}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-neutral-500">Audio Setup</span>
                <span className="text-neutral-300">{spec.features.speakers}</span>
              </div>
            </div>

            {/* Stylus Pressure Slider */}
            {stylusSimulated && (
              <div className="pt-2 border-t border-neutral-800 space-y-1">
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>Simulated S-Pen Pressure</span>
                  <span className="font-mono text-sky-400 font-bold">{Math.round(stylusPressure * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={stylusPressure}
                  onChange={(e) => setStylusPressure(parseFloat(e.target.value))}
                  className="w-full accent-sky-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                />
              </div>
            )}
          </div>
        )}

        {/* ── Scaled Hardware Device Frame ── */}
        <div
          style={{
            transform: `scale(${effectiveScale})`,
            transformOrigin: 'center center',
            transition: 'transform 0.15s cubic-bezier(0.2, 0, 0, 1)',
          }}
          className="relative shrink-0 flex items-center justify-center select-none"
        >
          {/* Side Hardware Buttons (Power & Volume Rocker) */}
          {orientation === 'portrait' && (
            <>
              {/* Power Button */}
              <div
                style={{
                  top: device === 's6lite' ? 140 : 160,
                  right: -4,
                  height: device === 's6lite' ? 42 : 48,
                }}
                className="absolute w-1 rounded-r-sm bg-neutral-700 border-r border-neutral-500 shadow-md pointer-events-none"
              />
              {/* Volume Rocker */}
              <div
                style={{
                  top: device === 's6lite' ? 200 : 230,
                  right: -4,
                  height: device === 's6lite' ? 84 : 96,
                }}
                className="absolute w-1 rounded-r-sm bg-neutral-700 border-r border-neutral-500 shadow-md pointer-events-none"
              />
            </>
          )}

          {/* S-Pen Silo / Magnetic Strip Badge */}
          {device === 's6lite' && (
            <div className="absolute -left-7 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
              <div className="w-2.5 h-48 rounded-full bg-neutral-800 border border-neutral-700 shadow-inner flex items-center justify-center">
                <span className="text-[8px] font-mono -rotate-90 text-neutral-400 tracking-wider">S-PEN</span>
              </div>
            </div>
          )}

          {device === 's25ultra' && (
            <div className="absolute -bottom-3 left-12 w-8 h-2 rounded-b-md bg-neutral-800 border-b border-neutral-600 shadow-sm flex items-center justify-center">
              <span className="w-4 h-0.5 rounded-full bg-neutral-500" />
            </div>
          )}

          {/* Outer Metallic Bezel & Chassis */}
          <div
            style={{
              width: currentDims.outerWidth,
              height: currentDims.outerHeight,
              borderRadius: spec.frame.borderRadius,
              backgroundColor: spec.frame.frameColor,
              boxShadow:
                device === 's25ultra'
                  ? '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.08), inset 0 0 0 2px #2a2d36'
                  : '0 30px 70px -15px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.06), inset 0 0 0 2px #323640',
              padding: spec.frame.bezelWidth,
            }}
            className="relative flex items-center justify-center transition-all duration-300"
          >
            {/* Front Camera Cutout / Bezel Dot */}
            {orientation === 'portrait' && (
              <div
                style={{
                  top: spec.camera.topOffset,
                  width: spec.camera.size,
                  height: spec.camera.size,
                  zIndex: 35,
                }}
                className={`absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none ${
                  spec.camera.type === 'punch-hole'
                    ? 'bg-black ring-1 ring-neutral-700/80 shadow-inner'
                    : 'bg-neutral-900 border border-neutral-700'
                }`}
              >
                <div className="w-1 h-1 rounded-full bg-sky-950/80 m-auto mt-0.5" />
              </div>
            )}

            {/* Inner Active Screen Display */}
            <div
              style={{
                width: currentDims.logicalWidth,
                height: currentDims.logicalHeight,
                borderRadius: spec.frame.screenBorderRadius,
              }}
              className="relative overflow-hidden bg-black flex flex-col shadow-inner"
            >
              {/* Samsung One UI Mobile Status Bar */}
              <div
                className={`h-7 shrink-0 px-4 flex items-center justify-between text-[11px] font-mono z-30 pointer-events-none select-none ${
                  device === 's25ultra' ? 'pt-1 px-5' : 'px-4'
                } bg-gradient-to-b from-black/40 to-transparent text-white`}
              >
                <span className="font-semibold tracking-tight">{currentTime}</span>

                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="font-sans font-bold text-[9px] bg-neutral-800/80 px-1 rounded text-neutral-300">5G</span>
                  <Wifi className="w-3 h-3 text-white" />
                  <div className="flex items-center gap-0.5">
                    <Battery className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[9px]">98%</span>
                  </div>
                </div>
              </div>

              {/* The Actual Remix 3D Studio Web Application */}
              <div className="flex-1 w-full h-full overflow-hidden relative">
                <App />
              </div>

              {/* Samsung One UI Bottom Gesture Pill Indicator */}
              <div className="h-4 shrink-0 flex items-center justify-center z-30 pointer-events-none bg-gradient-to-t from-black/30 to-transparent">
                <div className="w-28 h-1 rounded-full bg-white/40 shadow-sm" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Info Status Bar ── */}
      <footer className="h-8 shrink-0 px-4 bg-[#0e1015] border-t border-neutral-800 text-[11px] flex items-center justify-between text-neutral-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-neutral-300 font-medium">Resolution:</span>
            <span className="font-mono text-sky-400">{spec.screen.width} × {spec.screen.height} px ({spec.screen.aspectRatio})</span>
          </span>
          <span className="text-neutral-600">|</span>
          <span>Effective Display Scaling: <span className="font-mono text-purple-300">{Math.round(effectiveScale * 100)}%</span></span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[10px]">
          <span>Portrait Resolution Mode</span>
          <span className="text-neutral-600">•</span>
          <span>Stylus: <span className="text-emerald-400">S-Pen Active</span></span>
        </div>
      </footer>
    </div>
  );
};
