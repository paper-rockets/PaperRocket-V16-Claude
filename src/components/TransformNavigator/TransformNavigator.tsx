import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MoreHorizontal,
  Sliders,
  RotateCcw,
  Minus,
  Cpu,
  Compass,
} from 'lucide-react';
import { TransformNavigatorProps, TransformMode, AccessibilityMode } from '../../types';
import { NavigatorHeader } from './NavigatorHeader';
import { TwoDimensionalDial } from './TwoDimensionalDial';
import { ThreeDimensionalDial } from './ThreeDimensionalDial';
import { TactileNavigatorDial } from './TactileNavigatorDial';
import { playHapticSound } from '../../utils/audio';

export const TransformNavigatorComponent: React.FC<TransformNavigatorProps> = ({
  initialMode = '2d',
  isLocked: controlledLocked,
  onLockChange,
  onModeChange,
  onTranslate,
  onRotate,
  onScale,
  onInteractionStart,
  onInteractionEnd,
  onReset,
  onClose,
  onCopy,
  onPaste,
  clipboardCount = 0,
  activeTargetName = 'Main Curves',
  layers = [],
  activeLayerId,
  onSelectLayer,
  models = [],
  activeModelId,
  onSelectModel,
  targetScope = 'active_layer',
  onSelectTargetScope,
  accessibilityMode: controlledAccessibilityMode,
  onAccessibilityModeChange,
  soundEnabled: controlledSoundEnabled,
  onToggleSound: controlledToggleSound,
  uiScale = 1.0,
  className = '',
  engine,
  sensitivity = 0.5,
  onSensitivityChange,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  // Internal Mode State (with fallback if not controlled)
  const [mode, setMode] = useState<TransformMode>(initialMode);
  const [isOpen, setIsOpen] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showHiddenPhysicsPanel, setShowHiddenPhysicsPanel] = useState(false);
  const [isBiggerUI, setIsBiggerUI] = useState(false);
  const [hasWebGPU, setHasWebGPU] = useState(false);

  // Sound State
  const [internalSoundEnabled, setInternalSoundEnabled] = useState(true);
  const soundEnabled = controlledSoundEnabled !== undefined ? controlledSoundEnabled : internalSoundEnabled;
  const onToggleSound = useCallback(() => {
    if (controlledToggleSound) {
      controlledToggleSound();
    } else {
      setInternalSoundEnabled((prev) => !prev);
    }
  }, [controlledToggleSound]);

  // Configurable Physics Settings
  const [physicsSettings, setPhysicsSettings] = useState({
    rubberBandStiffness: 420,
    rubberBandDamping: 24,
    friction: 0.91,
    vibrationStrength: 0.65,
    clampBounds: true,
  });

  // Detect WebGPU capability
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
      const navGpu = (navigator as unknown as { gpu?: { requestAdapter?: () => Promise<unknown> } }).gpu;
      navGpu?.requestAdapter?.().then((adapter) => {
        if (adapter) setHasWebGPU(true);
      }).catch(() => {});
    }
  }, []);

  // Free-floating position with auto-clamping and localStorage persistence
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    const defaultWidth = 370;
    const defaultHeight = 256;
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;
    const defaultX = Math.max(12, screenW - defaultWidth - 20);
    const defaultY = Math.max(12, screenH - defaultHeight - 24);
    
    try {
      const saved = localStorage.getItem('mody_transform_navigator_coords');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          const maxX = Math.max(10, screenW - defaultWidth);
          const maxY = Math.max(10, screenH - defaultHeight);
          return {
            x: Math.max(10, Math.min(maxX, parsed.x)),
            y: Math.max(10, Math.min(maxY, parsed.y)),
          };
        }
      }
    } catch (_) {}
    return { x: defaultX, y: defaultY };
  });

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
  });

  // Independent Navigator Scale State & Drag-to-Resize Handler
  const [navigatorScale, setNavigatorScale] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('mody_transform_navigator_scale');
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 0.55 && parsed <= 1.6) return parsed;
      }
    } catch (_) {}
    return 1.0;
  });

  const [isResizing, setIsResizing] = useState(false);
  const isResizingRef = useRef(false);
  const resizeStartRef = useRef<{ startX: number; startY: number; startScale: number }>({
    startX: 0,
    startY: 0,
    startScale: 1.0,
  });

  const handleResizeStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    isResizingRef.current = true;
    setIsResizing(true);
    resizeStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startScale: navigatorScale,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!isResizingRef.current) return;
      const dx = moveEvent.clientX - resizeStartRef.current.startX;
      const dy = moveEvent.clientY - resizeStartRef.current.startY;
      const deltaScale = (dx + dy) / 360;
      const newScale = Math.min(1.55, Math.max(0.55, resizeStartRef.current.startScale + deltaScale));
      const roundedScale = Math.round(newScale * 100) / 100;
      setNavigatorScale(roundedScale);
    };

    const handlePointerUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        setIsResizing(false);
        setNavigatorScale((curr) => {
          try {
            localStorage.setItem('mody_transform_navigator_scale', curr.toString());
          } catch (_) {}
          return curr;
        });
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handleResetScale = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setNavigatorScale(1.0);
    try {
      localStorage.setItem('mody_transform_navigator_scale', '1.0');
    } catch (_) {}
  };

  const handleScaleCycle = () => {
    const scales = [0.6, 0.75, 0.85, 1.0, 1.15];
    const currentIdx = scales.findIndex((s) => Math.abs(s - navigatorScale) < 0.05);
    const nextIdx = currentIdx === -1 ? 3 : (currentIdx + 1) % scales.length;
    const next = scales[nextIdx];
    setNavigatorScale(next);
    try {
      localStorage.setItem('mody_transform_navigator_scale', next.toString());
    } catch (_) {}
  };

  // Lock State
  const [internalLocked, setInternalLocked] = useState(false);
  const isLocked = controlledLocked !== undefined ? controlledLocked : internalLocked;

  // Accessibility State (Standard vs Finger-Pen)
  const [internalAccessibilityMode, setInternalAccessibilityMode] =
    useState<AccessibilityMode>('standard');
  const accessibilityMode =
    controlledAccessibilityMode !== undefined
      ? controlledAccessibilityMode
      : internalAccessibilityMode;

  // Active interaction tracking for footer indicator
  const [activeHandle, setActiveHandle] = useState<string | null>(null);

  const handleModeChange = useCallback(
    (newMode: TransformMode) => {
      setMode(newMode);
      onModeChange?.(newMode);
    },
    [onModeChange]
  );

  const handleLockToggle = useCallback(() => {
    const nextLocked = !isLocked;
    setInternalLocked(nextLocked);
    onLockChange?.(nextLocked);
  }, [isLocked, onLockChange]);

  const handleAccessibilityToggle = useCallback(() => {
    const nextMode: AccessibilityMode =
      accessibilityMode === 'standard' ? 'finger-pen' : 'standard';
    setInternalAccessibilityMode(nextMode);
    onAccessibilityModeChange?.(nextMode);
  }, [accessibilityMode, onAccessibilityModeChange]);

  const handleReset = useCallback(() => {
    if (onReset) {
      onReset();
    } else if (engine) {
      engine.resetTransform(targetScope);
      engine.snapToView('isometric');
    }
  }, [onReset, engine, targetScope]);

  const handleInteractionStartInternal = useCallback(
    (handleName: string) => {
      setActiveHandle(handleName);
      onInteractionStart?.(handleName);
    },
    [onInteractionStart]
  );

  const handleInteractionEndInternal = useCallback(
    (handleName: string) => {
      setActiveHandle(null);
      onInteractionEnd?.(handleName);
    },
    [onInteractionEnd]
  );

  // Card drag handler: Moves the modal when dragging anywhere along the header sidebar
  const handleCardDragStart = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    const isDragGrip =
      target.id === 'navigator-drag-grip-handle' ||
      target.closest('#navigator-drag-grip-handle') ||
      target.closest('[aria-label="Drag to move navigator"]') ||
      target.closest('[title="Drag to move navigator"]') ||
      target.closest('#transform-navigator-header');

    if (
      target.tagName === 'BUTTON' ||
      target.closest('button') ||
      target.getAttribute('role') === 'button' ||
      target.closest('[role="button"]') ||
      target.tagName === 'INPUT' ||
      target.closest('input') ||
      target.id?.startsWith('handle-') ||
      target.closest('[id^="handle-"]') ||
      target.closest('#three-trackball-canvas') ||
      target.closest('#paper-rocket-trackball-sphere') ||
      target.closest('#paper-rocket-joystick-core') ||
      target.closest('#paper-rocket-radial-dial') ||
      target.closest('#paper-rocket-rotation-ring') ||
      target.closest('#navigator-target-dropdown-panel') ||
      target.closest('[role="listbox"]')
    ) {
      return;
    }

    if (!isDragGrip) {
      return;
    }

    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const initPosX = position.x;
    const initPosY = position.y;

    isDraggingRef.current = true;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      const maxX = Math.max(0, window.innerWidth - 80);
      const maxY = Math.max(0, window.innerHeight - 60);
      const newX = Math.min(maxX, Math.max(0, initPosX + dx));
      const newY = Math.min(maxY, Math.max(0, initPosY + dy));
      setPosition({ x: newX, y: newY });
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setPosition((curr) => {
          try {
            localStorage.setItem('mody_transform_navigator_coords', JSON.stringify(curr));
          } catch (_) {}
          return curr;
        });
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  // Auto-clamp on window resize to ensure widget is always within screen bounds
  useEffect(() => {
    const handleWindowResize = () => {
      setPosition((curr) => {
        const maxX = Math.max(10, window.innerWidth - 280);
        const maxY = Math.max(10, window.innerHeight - 340);
        const clampedX = Math.min(maxX, Math.max(10, curr.x));
        const clampedY = Math.min(maxY, Math.max(10, curr.y));
        if (clampedX !== curr.x || clampedY !== curr.y) {
          return { x: clampedX, y: clampedY };
        }
        return curr;
      });
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  // Hotkey listener: Ctrl+C / Cmd+C for Copy, Ctrl+V / Cmd+V for Paste
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        if (onCopy) {
          e.preventDefault();
          onCopy();
        }
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        if (onPaste && (clipboardCount || 0) > 0) {
          e.preventDefault();
          onPaste();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCopy, onPaste, clipboardCount]);

  // If collapsed to mini button
  if (!isOpen) {
    return (
      <motion.button
        id="transform-navigator-mini-trigger"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
        onClick={() => {
          playHapticSound('pop', soundEnabled);
          setIsOpen(true);
        }}
        className={`fixed z-40 px-3.5 py-2 rounded-2xl ${
          isLight
            ? 'bg-white/95 border-neutral-200 text-neutral-900 shadow-[0_12px_32px_rgba(0,0,0,0.12)]'
            : 'bg-[#14151a]/95 border-white/[0.12] text-white shadow-[0_12px_32px_rgba(0,0,0,0.6)]'
        } backdrop-blur-2xl border flex items-center gap-2 cursor-pointer group select-none`}
        title="Restore Navigator"
      >
        <Compass className="w-4 h-4 text-emerald-500" />
        <span className={`text-xs font-semibold ${isLight ? 'text-neutral-800' : 'text-neutral-200'}`}>Navigator</span>
        <div className="flex items-center gap-0.5 ml-1">
          <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 group-hover:bg-emerald-500 transition-colors" />
          <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 group-hover:bg-emerald-500 transition-colors" />
          <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 group-hover:bg-emerald-500 transition-colors" />
        </div>
      </motion.button>
    );
  }

  return (
    <aside
      id="transform-navigator-widget"
      role="region"
      aria-label="Transform Joystick Widget"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: `scale(${(uiScale || 1.0) * navigatorScale})`,
        transformOrigin: 'top left',
      }}
      className={`fixed z-40 rounded-[26px] ${
        isLight
          ? 'bg-white/95 border-neutral-200/90 text-neutral-800 shadow-[0_20px_45px_rgba(0,0,0,0.12),0_1px_3px_rgba(0,0,0,0.06)]'
          : 'bg-[#14151a]/95 border-white/[0.08] text-neutral-200 shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.05)]'
      } backdrop-blur-2xl border overflow-visible flex flex-row items-stretch touch-none select-none ${className}`}
      onWheel={(e) => {
        if (e.ctrlKey || e.metaKey || e.altKey) {
          e.preventDefault();
          e.stopPropagation();
          const delta = -Math.sign(e.deltaY) * 0.05;
          const next = Math.min(1.4, Math.max(0.55, Math.round((navigatorScale + delta) * 100) / 100));
          setNavigatorScale(next);
          try {
            localStorage.setItem('mody_transform_navigator_scale', next.toString());
          } catch (_) {}
        }
      }}
    >
      {/* Left: Dial Interactive Surface & Drag Area */}
      <div
        id="transform-navigator-body"
        className="overflow-hidden flex items-center justify-center p-2 relative flex-1 min-w-0"
      >
        {/* Mode Content Switcher with smooth crossfade & spring layout */}
        <div className={`relative flex items-center justify-center transition-transform duration-200 ${isBiggerUI ? 'scale-105' : 'scale-100'}`}>
          <AnimatePresence mode="wait">
            {mode === '2d' && (
              <motion.div
                key="view-2d"
                initial={{ opacity: 0, scale: 0.94, rotate: -4 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.94, rotate: 4 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                className="w-full flex items-center justify-center"
              >
                <TwoDimensionalDial
                  isLocked={isLocked}
                  accessibilityMode={accessibilityMode}
                  theme={theme}
                  onTranslate={onTranslate}
                  onRotate={onRotate}
                  onScale={onScale}
                  onInteractionStart={handleInteractionStartInternal}
                  onInteractionEnd={handleInteractionEndInternal}
                />
              </motion.div>
            )}

            {mode === '3d' && (
              <motion.div
                key="view-3d"
                initial={{ opacity: 0, scale: 0.94, rotate: 4 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.94, rotate: -4 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                className="w-full flex items-center justify-center"
              >
                <ThreeDimensionalDial
                  isLocked={isLocked}
                  accessibilityMode={accessibilityMode}
                  theme={theme}
                  onTranslate={onTranslate}
                  onRotate={onRotate}
                  onScale={onScale}
                  onInteractionStart={handleInteractionStartInternal}
                  onInteractionEnd={handleInteractionEndInternal}
                />
              </motion.div>
            )}

            {mode === 'tactile' && (
              <motion.div
                key="view-tactile"
                initial={{ opacity: 0, scale: 0.94, rotate: 2 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.94, rotate: -2 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                className="w-full flex items-center justify-center"
              >
                <TactileNavigatorDial
                  isLocked={isLocked}
                  accessibilityMode={accessibilityMode}
                  theme={theme}
                  onTranslate={onTranslate}
                  onRotate={onRotate}
                  onInteractionStart={handleInteractionStartInternal}
                  onInteractionEnd={handleInteractionEndInternal}
                  engine={engine}
                />
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

      {/* Right Vertical Bar: NavigatorHeader (Tabs, Target Selector, Action Icons) */}
      <NavigatorHeader
        mode={mode}
        onModeChange={handleModeChange}
        isLocked={isLocked}
        onLockToggle={handleLockToggle}
        onReset={handleReset}
        isCollapsed={false}
        onCollapseToggle={() => {}}
        onClose={onClose}
        onMinimize={() => {
          playHapticSound('pop', soundEnabled);
          setIsOpen(false);
          setShowMenu(false);
          setShowHiddenPhysicsPanel(false);
        }}
        theme={theme}
        targetName={activeTargetName}
        layers={layers}
        activeLayerId={activeLayerId}
        onSelectLayer={onSelectLayer}
        models={models}
        activeModelId={activeModelId}
        onSelectModel={onSelectModel}
        targetScope={targetScope}
        onSelectTargetScope={onSelectTargetScope}
        accessibilityMode={accessibilityMode}
        onAccessibilityModeToggle={handleAccessibilityToggle}
        onHeaderDragStart={handleCardDragStart}
        onCopy={onCopy}
        onPaste={onPaste}
        clipboardCount={clipboardCount}
        scaleFactor={navigatorScale}
        onScaleCycle={handleScaleCycle}
        sensitivity={sensitivity}
        onSensitivityChange={onSensitivityChange}
      />

      {/* Navigator Quick Settings Popover anchored at Bottom */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            id="navigator-settings-popover"
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            className={`absolute bottom-11 inset-x-2 z-50 p-3.5 rounded-2xl ${
              isLight
                ? 'bg-white/98 border border-neutral-200 text-neutral-800 shadow-[0_20px_45px_rgba(0,0,0,0.18)]'
                : 'bg-[#1c1c1f]/98 border border-white/10 text-neutral-200 shadow-[0_20px_50px_rgba(0,0,0,0.9)]'
            } flex flex-col gap-2.5 backdrop-blur-2xl max-h-[calc(100%-60px)] overflow-y-auto`}
          >
            <div className={`flex items-center justify-between border-b ${isLight ? 'border-neutral-200' : 'border-neutral-800'} pb-2`}>
              <span className={`text-xs font-bold ${isLight ? 'text-neutral-900' : 'text-white'}`}>Navigator Options</span>
              <button
                onClick={() => setShowMenu(false)}
                className={`text-xs ${isLight ? 'text-neutral-500 hover:text-neutral-900' : 'text-neutral-400 hover:text-white'}`}
              >
                Done
              </button>
            </div>

            {/* GPU Acceleration status */}
            <div className="flex items-center justify-between py-0.5">
              <span className={`text-[11px] font-medium ${isLight ? 'text-neutral-700' : 'text-neutral-300'} flex items-center gap-1.5`}>
                <Cpu className="w-3.5 h-3.5 text-emerald-500" />
                Graphics Engine
              </span>
              <span className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-full ${
                hasWebGPU ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
              }`}>
                {hasWebGPU ? 'WebGPU' : 'WebGL2'}
              </span>
            </div>

            {/* Independent Navigator Scale Controls */}
            <div className={`flex flex-col gap-1.5 py-1 border-t ${isLight ? 'border-neutral-200' : 'border-white/10'}`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-medium ${isLight ? 'text-neutral-700' : 'text-neutral-300'}`}>Widget Scale</span>
                <span className="text-[10px] font-mono font-bold text-emerald-500">
                  {Math.round(navigatorScale * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    playHapticSound('click', soundEnabled);
                    const next = Math.max(0.55, Math.round((navigatorScale - 0.1) * 100) / 100);
                    setNavigatorScale(next);
                    try { localStorage.setItem('mody_transform_navigator_scale', next.toString()); } catch (_) {}
                  }}
                  className={`flex-1 py-1 rounded-lg ${isLight ? 'bg-neutral-100 hover:bg-neutral-200 border-neutral-300 text-neutral-800' : 'bg-white/5 hover:bg-white/15 border-white/10 text-white'} border text-xs font-bold text-center transition-colors`}
                  title="Decrease Widget Scale (-10%)"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    playHapticSound('click', soundEnabled);
                    handleResetScale(e);
                  }}
                  className={`px-3 py-1 rounded-lg ${isLight ? 'bg-neutral-100 hover:bg-neutral-200 border-neutral-300 text-neutral-800' : 'bg-white/5 hover:bg-white/15 border-white/10 text-neutral-200'} border text-[10px] font-mono text-center transition-colors`}
                  title="Reset Widget Scale (100%)"
                >
                  Reset (100%)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playHapticSound('click', soundEnabled);
                    const next = Math.min(1.55, Math.round((navigatorScale + 0.1) * 100) / 100);
                    setNavigatorScale(next);
                    try { localStorage.setItem('mody_transform_navigator_scale', next.toString()); } catch (_) {}
                  }}
                  className={`flex-1 py-1 rounded-lg ${isLight ? 'bg-neutral-100 hover:bg-neutral-200 border-neutral-300 text-neutral-800' : 'bg-white/5 hover:bg-white/15 border-white/10 text-white'} border text-xs font-bold text-center transition-colors`}
                  title="Increase Widget Scale (+10%)"
                >
                  +
                </button>
              </div>
            </div>

            {/* Sound Feedback Toggle */}
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-medium ${isLight ? 'text-neutral-700' : 'text-neutral-300'}`}>Haptic Audio Feedback</span>
              <button
                id="toggle-sound-btn"
                onClick={() => {
                  onToggleSound();
                  playHapticSound('pop', !soundEnabled);
                }}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                  soundEnabled ? 'bg-emerald-500' : isLight ? 'bg-neutral-300' : 'bg-neutral-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    soundEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Hidden Physics Engine shortcut */}
            <div className={`pt-2 border-t ${isLight ? 'border-neutral-200' : 'border-neutral-800'} flex items-center justify-between`}>
              <span className={`text-[11px] ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>Physics Config</span>
              <button
                id="open-navigator-physics-btn"
                onClick={() => {
                  playHapticSound('snap', soundEnabled);
                  setShowHiddenPhysicsPanel(true);
                  setShowMenu(false);
                }}
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 flex items-center gap-1"
              >
                <span>Tune Physics</span>
                <Sliders className="w-3 h-3" />
              </button>
            </div>

            {/* Reset All Position & Rotation */}
            <button
              id="navigator-reset-all-btn"
              onClick={() => {
                playHapticSound('snap', soundEnabled);
                onReset?.();
                setShowMenu(false);
              }}
              className={`w-full py-1.5 rounded-xl ${isLight ? 'bg-neutral-900 hover:bg-neutral-800 text-white' : 'bg-neutral-800 hover:bg-neutral-700 text-white'} active:scale-95 text-xs font-bold flex items-center justify-center gap-1.5 transition-all mt-0.5`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Everything</span>
            </button>

            {/* Minimize Widget */}
            <button
              id="navigator-minimize-dot-btn"
              onClick={() => {
                playHapticSound('click', soundEnabled);
                setIsOpen(false);
                setShowMenu(false);
              }}
              className={`w-full py-1 text-center text-[10.5px] ${isLight ? 'text-neutral-500 hover:text-neutral-900' : 'text-neutral-400 hover:text-neutral-200'}`}
            >
              Minimize to Dot
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Physics Configuration Panel for Standard Navigator */}
      <AnimatePresence>
        {showHiddenPhysicsPanel && (
          <motion.div
            id="navigator-hidden-physics-panel"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            className={`absolute inset-0 z-50 rounded-[24px] ${
              isLight
                ? 'bg-white/98 border border-neutral-200 text-neutral-800 shadow-[0_25px_60px_rgba(0,0,0,0.2)]'
                : 'bg-[#14151a]/98 border border-white/10 text-neutral-200 shadow-[0_25px_60px_rgba(0,0,0,0.95)]'
            } backdrop-blur-2xl flex flex-col p-4 overflow-y-auto select-none gap-3`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between border-b ${isLight ? 'border-neutral-200' : 'border-neutral-800'} pb-2.5 shrink-0`}>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                  <Sliders className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className={`text-xs font-bold ${isLight ? 'text-neutral-900' : 'text-white'}`}>Navigator Physics & Dynamics</h4>
                  <p className={`text-[9.5px] ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>Response tuning & spring config</p>
                </div>
              </div>
              <button
                id="close-navigator-physics-btn"
                onClick={() => {
                  playHapticSound('click', soundEnabled);
                  setShowHiddenPhysicsPanel(false);
                }}
                className={`w-6 h-6 rounded-full ${isLight ? 'bg-neutral-200 hover:bg-neutral-300 text-neutral-700' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'} flex items-center justify-center text-xs transition-colors`}
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Scrollable sliders body */}
            <div className="flex flex-col gap-3 flex-1">
              {/* Slider 1: Rubber-band Spring Tension (Stiffness) */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-300">Rubber-Band Spring Tension</span>
                  <span className="font-mono text-emerald-400 text-[11px] font-bold">
                    {physicsSettings.rubberBandStiffness}
                  </span>
                </div>
                <input
                  id="navigator-rubber-band-stiffness-slider"
                  type="range"
                  min="180"
                  max="650"
                  step="10"
                  value={physicsSettings.rubberBandStiffness}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setPhysicsSettings((prev) => ({ ...prev, rubberBandStiffness: val }));
                  }}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
                <div className="flex justify-between text-[9px] text-neutral-500">
                  <span>Loose (180)</span>
                  <span>Default (420)</span>
                  <span>Ultra-Taut (650)</span>
                </div>
              </div>

              {/* Slider 2: Rubber-band Damping */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-300">Spring Damping (Oscillation)</span>
                  <span className="font-mono text-emerald-400 text-[11px] font-bold">
                    {physicsSettings.rubberBandDamping}
                  </span>
                </div>
                <input
                  id="navigator-rubber-band-damping-slider"
                  type="range"
                  min="12"
                  max="40"
                  step="1"
                  value={physicsSettings.rubberBandDamping}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setPhysicsSettings((prev) => ({ ...prev, rubberBandDamping: val }));
                  }}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
                <div className="flex justify-between text-[9px] text-neutral-500">
                  <span>Bouncy (12)</span>
                  <span>Balanced (24)</span>
                  <span>Overdamped (40)</span>
                </div>
              </div>

              {/* Slider 3: Friction Settle Physics */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-300">Momentum Friction Drift</span>
                  <span className="font-mono text-emerald-400 text-[11px] font-bold">
                    {physicsSettings.friction.toFixed(2)}
                  </span>
                </div>
                <input
                  id="navigator-friction-physics-slider"
                  type="range"
                  min="0.75"
                  max="0.98"
                  step="0.01"
                  value={physicsSettings.friction}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setPhysicsSettings((prev) => ({ ...prev, friction: val }));
                  }}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
                <div className="flex justify-between text-[9px] text-neutral-500">
                  <span>Quick Stop (0.75)</span>
                  <span>Natural (0.91)</span>
                  <span>Long Glide (0.98)</span>
                </div>
              </div>

              {/* Slider 4: Haptic Vibration Resistance */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-300">Tactile Resistance Vibration</span>
                  <span className="font-mono text-emerald-400 text-[11px] font-bold">
                    {Math.round(physicsSettings.vibrationStrength * 100)}%
                  </span>
                </div>
                <input
                  id="navigator-vibration-strength-slider"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={physicsSettings.vibrationStrength}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setPhysicsSettings((prev) => ({ ...prev, vibrationStrength: val }));
                  }}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
              </div>

              {/* Toggles */}
              <div className="pt-2 border-t border-neutral-800/80 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-300">Canvas Bounds Guard</span>
                  <button
                    id="navigator-toggle-bounds-guard-btn"
                    onClick={() => {
                      playHapticSound('click', soundEnabled);
                      setPhysicsSettings((prev) => ({
                        ...prev,
                        clampBounds: !prev.clampBounds,
                      }));
                    }}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                      physicsSettings.clampBounds ? 'bg-emerald-500' : 'bg-neutral-800'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        physicsSettings.clampBounds ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer action buttons */}
            <div className="pt-2 flex items-center gap-2 shrink-0 border-t border-neutral-800/60">
              <button
                id="navigator-reset-physics-defaults-btn"
                onClick={() => {
                  playHapticSound('snap', soundEnabled);
                  setPhysicsSettings({
                    rubberBandStiffness: 420,
                    rubberBandDamping: 24,
                    friction: 0.91,
                    vibrationStrength: 0.65,
                    clampBounds: true,
                  });
                }}
                className="flex-1 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-300 hover:text-white transition-all"
              >
                Defaults
              </button>
              <button
                id="navigator-apply-physics-btn"
                onClick={() => {
                  playHapticSound('pop', soundEnabled);
                  setShowHiddenPhysicsPanel(false);
                }}
                className="flex-1 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-neutral-950 shadow-md transition-all"
              >
                Apply & Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Scale Percentage Badge while Resizing */}
      {isResizing && (
        <div className="absolute top-2 right-12 z-50 px-2 py-0.5 rounded-full bg-emerald-500 text-black font-mono font-bold text-[10px] shadow-lg pointer-events-none animate-in fade-in duration-100">
          {Math.round(navigatorScale * 100)}%
        </div>
      )}

      {/* Invisible Corner Drag Resize Hit Zone - ZERO VISIBLE DOTS */}
      <div
        id="transform-navigator-corner-resize-hit-zone"
        onPointerDown={handleResizeStart}
        className="absolute -bottom-1 -right-1 w-6 h-6 cursor-nwse-resize z-40 select-none touch-none"
        title="Drag corner to scale tool"
        aria-label="Drag corner to scale tool"
      />
    </aside>
  );
};

export const TransformNavigator = React.memo(TransformNavigatorComponent);
