// src/components/SingleHandDualNav.tsx
import React, { useState, useRef, useCallback } from 'react';
import { 
  Compass, 
  RotateCcw, 
  Layers, 
  Move, 
  Maximize2, 
  Minimize2, 
  X,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { Guide3D } from '../types';

interface SingleHandDualNavProps {
  isOpen: boolean;
  onClose?: () => void;
  cameraSpherical: { radius: number; theta: number; phi: number };
  onOrbitCamera: (deltaTheta: number, deltaPhi: number) => void;
  onSetCameraView: (theta: number, phi: number) => void;
  onZoomCamera?: (deltaRadius: number) => void;
  activeGuide: Guide3D | null;
  onUpdateGuide: (guide: Guide3D | null) => void;
  onSpawnDefaultSurface?: () => void;
  onResetSurface?: () => void;
}

type NavMode = 'camera' | 'surface';
type DockSide = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';

export const SingleHandDualNav: React.FC<SingleHandDualNavProps> = ({
  isOpen,
  onClose,
  cameraSpherical,
  onOrbitCamera,
  onSetCameraView,
  onZoomCamera,
  activeGuide,
  onUpdateGuide,
  onSpawnDefaultSurface,
  onResetSurface,
}) => {
  const [navMode, setNavMode] = useState<NavMode>('camera');
  const [dockSide, setDockSide] = useState<DockSide>('bottom-left');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [snap45, setSnap45] = useState<boolean>(false);

  // Position for custom dragging
  const [customPosition, setCustomPosition] = useState<{ x: number; y: number } | null>(null);
  const isDraggingHeaderRef = useRef(false);
  const dragHeaderStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
  });

  // Gizmo interaction state
  const isInteractingRef = useRef(false);
  const lastPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const activeGizmoHandleRef = useRef<'ball' | 'arc-x' | 'arc-y' | 'arc-z' | 'arrow-x' | 'arrow-y' | 'arrow-z' | null>(null);

  // Calculate 3D projected coordinates for Camera Orientation Ball
  const { theta, phi } = cameraSpherical || { theta: Math.PI / 4, phi: Math.PI / 3 };

  // 3D Rotation Matrix projection for Camera Gizmo
  const getCameraProjectedPoints = useCallback(() => {
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const cosP = Math.cos(phi);
    const sinP = Math.sin(phi);

    // Screen-projected axes
    const xProj = {
      x: -sinT,
      y: -cosT * cosP,
      z: -cosT * sinP,
    };

    const yProj = {
      x: 0,
      y: -sinP,
      z: cosP,
    };

    const zProj = {
      x: cosT,
      y: -sinT * cosP,
      z: -sinT * sinP,
    };

    const radius = 44;

    return {
      axes: [
        {
          id: '+y',
          label: 'Y',
          color: '#22c55e', // Green (TOP)
          x: 72 + yProj.x * radius,
          y: 72 + yProj.y * radius,
          z: yProj.z,
          theta: 0,
          phi: 0.001,
        },
        {
          id: '-y',
          label: '-Y',
          color: '#94a3b8',
          x: 72 - yProj.x * radius,
          y: 72 - yProj.y * radius,
          z: -yProj.z,
          theta: 0,
          phi: Math.PI - 0.001,
        },
        {
          id: '+x',
          label: 'X',
          color: '#ef4444', // Red (RIGHT)
          x: 72 + xProj.x * radius,
          y: 72 + xProj.y * radius,
          z: xProj.z,
          theta: -Math.PI / 2,
          phi: Math.PI / 2,
        },
        {
          id: '-x',
          label: '-X',
          color: '#94a3b8',
          x: 72 - xProj.x * radius,
          y: 72 - xProj.y * radius,
          z: -xProj.z,
          theta: Math.PI / 2,
          phi: Math.PI / 2,
        },
        {
          id: '+z',
          label: 'Z',
          color: '#3b82f6', // Blue (FRONT)
          x: 72 + zProj.x * radius,
          y: 72 + zProj.y * radius,
          z: zProj.z,
          theta: 0,
          phi: Math.PI / 2,
        },
        {
          id: '-z',
          label: '-Z',
          color: '#94a3b8',
          x: 72 - zProj.x * radius,
          y: 72 - zProj.y * radius,
          z: -zProj.z,
          theta: Math.PI,
          phi: Math.PI / 2,
        },
      ],
    };
  }, [theta, phi]);

  const cameraProjection = getCameraProjectedPoints();
  const sortedAxes = [...cameraProjection.axes].sort((a, b) => a.z - b.z);

  // Handle Dragging on Camera Gizmo
  const handlePointerDownCameraGizmo = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    isInteractingRef.current = true;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMoveCameraGizmo = (e: React.PointerEvent) => {
    if (!isInteractingRef.current) return;
    e.stopPropagation();

    const dx = e.clientX - lastPointerRef.current.x;
    const dy = e.clientY - lastPointerRef.current.y;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };

    const sens = 0.015;
    onOrbitCamera(-dx * sens, dy * sens);
  };

  const handlePointerUpCameraGizmo = (e: React.PointerEvent) => {
    isInteractingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  // Handle Surface Gizmo Drag
  const handlePointerDownSurfaceHandle = (
    handle: 'arc-x' | 'arc-y' | 'arc-z' | 'arrow-x' | 'arrow-y' | 'arrow-z' | 'ball',
    e: React.PointerEvent
  ) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    isInteractingRef.current = true;
    activeGizmoHandleRef.current = handle;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMoveSurfaceGizmo = (e: React.PointerEvent) => {
    if (!isInteractingRef.current) return;
    e.stopPropagation();

    const dx = e.clientX - lastPointerRef.current.x;
    const dy = e.clientY - lastPointerRef.current.y;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };

    const handle = activeGizmoHandleRef.current;
    if (!handle) return;

    if (!activeGuide) {
      if (onSpawnDefaultSurface) onSpawnDefaultSurface();
      return;
    }

    const currentRot = activeGuide.rotation || { x: 0, y: 0, z: 0 };
    const currentOrigin = activeGuide.originPoint || { x: 0, y: 0, z: 0, pressure: 1 };

    let newRot = {
      x: currentRot?.x ?? 0,
      y: currentRot?.y ?? 0,
      z: currentRot?.z ?? 0,
    };
    let newOrigin = {
      x: currentOrigin?.x ?? 0,
      y: currentOrigin?.y ?? 0,
      z: currentOrigin?.z ?? 0,
      pressure: currentOrigin?.pressure ?? 1,
    };

    const step = snap45 ? Math.PI / 4 : 0.03;

    if (handle === 'arc-x') {
      const delta = (dy * 0.03);
      newRot.x += delta;
      if (snap45) newRot.x = Math.round(newRot.x / step) * step;
    } else if (handle === 'arc-y' || handle === 'ball') {
      const delta = (dx * 0.03);
      newRot.y += delta;
      if (snap45) newRot.y = Math.round(newRot.y / step) * step;
    } else if (handle === 'arc-z') {
      const delta = (dx * 0.03);
      newRot.z += delta;
      if (snap45) newRot.z = Math.round(newRot.z / step) * step;
    } else if (handle === 'arrow-x') {
      newOrigin.x += dx * 0.02;
    } else if (handle === 'arrow-y') {
      newOrigin.y -= dy * 0.02;
    } else if (handle === 'arrow-z') {
      newOrigin.z += (dx - dy) * 0.015;
    }

    onUpdateGuide({
      ...activeGuide,
      rotation: newRot,
      originPoint: newOrigin,
    });
  };

  const handlePointerUpSurfaceGizmo = (e: React.PointerEvent) => {
    isInteractingRef.current = false;
    activeGizmoHandleRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  const handleToggleSurface = () => {
    if (!activeGuide) {
      if (onSpawnDefaultSurface) onSpawnDefaultSurface();
    } else {
      if (activeGuide.opacity > 0) {
        onUpdateGuide({ ...activeGuide, opacity: 0 });
      } else {
        onUpdateGuide({ ...activeGuide, opacity: 0.85 });
      }
    }
  };

  const handleResetSurface = () => {
    if (onResetSurface) {
      onResetSurface();
    } else if (activeGuide) {
      onUpdateGuide({
        ...activeGuide,
        rotation: { x: 0, y: 0, z: 0 },
        originPoint: { x: 0, y: 0, z: 0, pressure: 1 },
        opacity: 0.85,
      });
    }
  };

  const handleCycleDock = () => {
    setCustomPosition(null);
    setDockSide((prev) => {
      if (prev === 'bottom-left') return 'bottom-right';
      if (prev === 'bottom-right') return 'top-right';
      if (prev === 'top-right') return 'top-left';
      return 'bottom-left';
    });
  };

  // Dragging Header to Relocate
  const handleHeaderPointerDown = (e: React.PointerEvent) => {
    isDraggingHeaderRef.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const rect = (e.currentTarget.parentElement as HTMLElement)?.getBoundingClientRect();
    dragHeaderStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: customPosition ? customPosition.x : rect?.left || 20,
      posY: customPosition ? customPosition.y : rect?.top || 200,
    };
  };

  const handleHeaderPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingHeaderRef.current) return;
    const dx = e.clientX - dragHeaderStartRef.current.startX;
    const dy = e.clientY - dragHeaderStartRef.current.startY;
    setCustomPosition({
      x: Math.max(10, Math.min(window.innerWidth - 200, dragHeaderStartRef.current.posX + dx)),
      y: Math.max(10, Math.min(window.innerHeight - 240, dragHeaderStartRef.current.posY + dy)),
    });
  };

  const handleHeaderPointerUp = (e: React.PointerEvent) => {
    isDraggingHeaderRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  if (!isOpen) return null;

  const getDockClasses = () => {
    if (customPosition) return '';
    switch (dockSide) {
      case 'bottom-left':
        return 'bottom-20 md:bottom-6 left-3 sm:left-5';
      case 'bottom-right':
        return 'bottom-20 md:bottom-6 right-3 sm:right-5';
      case 'top-left':
        return 'top-20 left-3 sm:left-5';
      case 'top-right':
        return 'top-20 right-3 sm:right-5';
      default:
        return 'bottom-20 md:bottom-6 left-3 sm:left-5';
    }
  };

  const isSurfaceVisible = activeGuide && activeGuide.opacity > 0;

  return (
    <div
      id="single-hand-dual-nav"
      style={
        customPosition
          ? {
              left: `${customPosition.x}px`,
              top: `${customPosition.y}px`,
              position: 'fixed',
              zIndex: 42,
            }
          : undefined
      }
      className={`${!customPosition ? 'fixed z-42 ' + getDockClasses() : ''} select-none transition-all`}
    >
      {/* MINIMIZED PUCK */}
      {isMinimized ? (
        <button
          onClick={() => setIsMinimized(false)}
          className="group flex items-center gap-2 p-2 rounded-2xl bg-white/95 dark:bg-zinc-950/90 backdrop-blur-xl border border-zinc-200/90 dark:border-zinc-800/90 shadow-xl hover:scale-105 active:scale-95 transition-all"
          title="Expand Navigator"
        >
          <div className="w-7 h-7 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            {navMode === 'camera' ? <Compass className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
          </div>
          <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-200 pr-1">
            {navMode === 'camera' ? 'Camera' : 'Surface'}
          </span>
        </button>
      ) : (
        /* EXPANDED DUAL MODE NAVIGATOR PANEL */
        <div className="w-48 sm:w-52 bg-white/95 dark:bg-zinc-950/90 backdrop-blur-2xl rounded-3xl border border-zinc-200/90 dark:border-zinc-800/90 shadow-2xl p-2.5 flex flex-col gap-2 animate-in zoom-in-95 duration-150">
          
          {/* HEADER */}
          <div 
            onPointerDown={handleHeaderPointerDown}
            onPointerMove={handleHeaderPointerMove}
            onPointerUp={handleHeaderPointerUp}
            className="flex items-center justify-between gap-1 cursor-grab active:cursor-grabbing pb-0.5 border-b border-zinc-100 dark:border-zinc-800/70"
          >
            {/* Mode Switcher */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-900/90 p-0.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 flex-1">
              <button
                type="button"
                onClick={() => setNavMode('camera')}
                className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold transition-all ${
                  navMode === 'camera'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                Camera
              </button>
              <button
                type="button"
                onClick={() => setNavMode('surface')}
                className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold transition-all ${
                  navMode === 'surface'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                Surface
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-0.5 pl-1">
              <button
                type="button"
                onClick={handleCycleDock}
                className="px-1.5 py-1 rounded-lg text-[10px] font-bold text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title={`Dock: ${dockSide.replace('-', ' ')}`}
              >
                Dock
              </button>
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Minimize Navigator"
              >
                <Minimize2 className="w-3 h-3" />
              </button>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  title="Close Navigator"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* MODE 1: CAMERA 3D ORIENTATION BALL */}
          {navMode === 'camera' && (
            <div className="flex flex-col gap-1.5">
              <div 
                onPointerDown={handlePointerDownCameraGizmo}
                onPointerMove={handlePointerMoveCameraGizmo}
                onPointerUp={handlePointerUpCameraGizmo}
                className="w-full h-36 sm:h-40 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 relative flex items-center justify-center overflow-hidden touch-none cursor-grab active:cursor-grabbing select-none"
              >
                {/* SVG 3D Orientation Gizmo Viewport */}
                <svg className="w-full h-full pointer-events-none" viewBox="0 0 144 144">
                  {/* Outer Orbit Circle */}
                  <circle
                    cx="72"
                    cy="72"
                    r="48"
                    fill="none"
                    stroke="currentColor"
                    className="text-zinc-300 dark:text-zinc-700"
                    strokeWidth="1.2"
                  />

                  {/* Draw 3D Lines */}
                  {sortedAxes.map((axis) => {
                    const isPositive = !axis.id.startsWith('-');
                    return (
                      <line
                        key={`line-${axis.id}`}
                        x1="72"
                        y1="72"
                        x2={axis.x}
                        y2={axis.y}
                        stroke={isPositive ? axis.color : '#94a3b8'}
                        strokeWidth={isPositive ? (axis.z >= 0 ? 2 : 1.2) : 1}
                        strokeOpacity={axis.z >= 0 ? 0.9 : 0.35}
                        strokeDasharray={isPositive ? undefined : '2 2'}
                      />
                    );
                  })}

                  {/* Origin Dot */}
                  <circle cx="72" cy="72" r="3" fill="#64748b" />

                  {/* Axis Nodes */}
                  {sortedAxes.map((axis) => {
                    const isPositive = !axis.id.startsWith('-');
                    const radius = isPositive ? (axis.z >= 0 ? 11 : 9) : 7;
                    const opacity = axis.z >= 0 ? 0.95 : 0.4;

                    return (
                      <g
                        key={`node-${axis.id}`}
                        className="cursor-pointer pointer-events-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSetCameraView(axis.theta, axis.phi);
                        }}
                      >
                        <circle
                          cx={axis.x}
                          cy={axis.y}
                          r={radius}
                          fill={isPositive ? axis.color : '#cbd5e1'}
                          className={!isPositive ? 'dark:fill-zinc-700' : ''}
                          opacity={opacity}
                        />
                        {isPositive && (
                          <text
                            x={axis.x}
                            y={axis.y + 3}
                            textAnchor="middle"
                            fill="#ffffff"
                            fontSize="8"
                            fontWeight="bold"
                            className="select-none pointer-events-none font-mono"
                          >
                            {axis.label}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Quick ISO Snap Pill */}
                <div className="absolute top-1.5 right-1.5 flex flex-col gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetCameraView(Math.PI / 4, Math.PI / 3);
                    }}
                    className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-white/90 dark:bg-zinc-800/90 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 shadow-2xs hover:scale-105 transition-all"
                  >
                    ISO
                  </button>
                </div>

                {/* Zoom Controls */}
                {onZoomCamera && (
                  <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 bg-white/90 dark:bg-zinc-800/90 rounded-lg p-0.5 border border-zinc-200 dark:border-zinc-700 shadow-xs">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onZoomCamera(-0.5);
                      }}
                      className="p-1 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-2.5 h-2.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onZoomCamera(0.5);
                      }}
                      className="p-1 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* View Presets Row */}
              <div className="grid grid-cols-4 gap-1">
                <button
                  type="button"
                  onClick={() => onSetCameraView(0, 0.001)}
                  className="py-0.5 text-[9px] font-bold rounded-md bg-zinc-100 dark:bg-zinc-850 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-750 transition-colors"
                >
                  Top
                </button>
                <button
                  type="button"
                  onClick={() => onSetCameraView(0, Math.PI / 2)}
                  className="py-0.5 text-[9px] font-bold rounded-md bg-zinc-100 dark:bg-zinc-850 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-750 transition-colors"
                >
                  Front
                </button>
                <button
                  type="button"
                  onClick={() => onSetCameraView(-Math.PI / 2, Math.PI / 2)}
                  className="py-0.5 text-[9px] font-bold rounded-md bg-zinc-100 dark:bg-zinc-850 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-750 transition-colors"
                >
                  Right
                </button>
                <button
                  type="button"
                  onClick={() => onSetCameraView(Math.PI / 4, Math.PI / 3)}
                  className="py-0.5 text-[9px] font-bold rounded-md bg-zinc-100 dark:bg-zinc-850 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-750 transition-colors"
                >
                  3D
                </button>
              </div>
            </div>
          )}

          {/* MODE 2: SURFACE / DRAWING PLANE GIZMO */}
          {navMode === 'surface' && (
            <div className="flex flex-col gap-1.5">
              <div 
                onPointerMove={handlePointerMoveSurfaceGizmo}
                onPointerUp={handlePointerUpSurfaceGizmo}
                className="w-full h-36 sm:h-40 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 relative flex items-center justify-center overflow-hidden touch-none select-none"
              >
                <div className="absolute top-1.5 left-2 text-[9px] font-bold text-amber-500 tracking-wider">
                  LCL
                </div>

                {/* SVG Surface Gizmo */}
                <svg className="w-full h-full" viewBox="0 0 144 144">
                  {/* Yaw Arc */}
                  <path
                    d="M 38 72 A 34 34 0 1 1 106 72"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="4"
                    strokeLinecap="round"
                    className="cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
                    onPointerDown={(e) => handlePointerDownSurfaceHandle('arc-y', e)}
                  />

                  {/* Pitch Arc */}
                  <path
                    d="M 48 94 A 34 34 0 0 1 72 106"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="4"
                    strokeLinecap="round"
                    className="cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
                    onPointerDown={(e) => handlePointerDownSurfaceHandle('arc-x', e)}
                  />

                  {/* Roll Arc */}
                  <path
                    d="M 86 103 A 34 34 0 0 1 103 94"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="4"
                    strokeLinecap="round"
                    className="cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
                    onPointerDown={(e) => handlePointerDownSurfaceHandle('arc-z', e)}
                  />

                  {/* Center Origin Dot */}
                  <circle
                    cx="72"
                    cy="72"
                    r="4"
                    fill="#64748b"
                    className="cursor-move"
                    onPointerDown={(e) => handlePointerDownSurfaceHandle('ball', e)}
                  />

                  {/* Red X Axis Arrow */}
                  <g
                    className="cursor-pointer opacity-90 hover:opacity-100"
                    onPointerDown={(e) => handlePointerDownSurfaceHandle('arrow-x', e)}
                  >
                    <line x1="82" y1="81" x2="102" y2="92" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
                    <text x="108" y="102" fill="#ef4444" fontSize="8" fontWeight="bold">
                      x
                    </text>
                  </g>

                  {/* Green Y Axis Arrow */}
                  <g
                    className="cursor-pointer opacity-90 hover:opacity-100"
                    onPointerDown={(e) => handlePointerDownSurfaceHandle('arrow-y', e)}
                  >
                    <line x1="72" y1="82" x2="72" y2="102" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" />
                    <text x="70" y="114" fill="#22c55e" fontSize="8" fontWeight="bold" textAnchor="middle">
                      y
                    </text>
                  </g>

                  {/* Blue Z Axis Arrow */}
                  <g
                    className="cursor-pointer opacity-90 hover:opacity-100"
                    onPointerDown={(e) => handlePointerDownSurfaceHandle('arrow-z', e)}
                  >
                    <line x1="58" y1="75" x2="38" y2="78" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
                    <text x="28" y="80" fill="#3b82f6" fontSize="8" fontWeight="bold">
                      z
                    </text>
                  </g>
                </svg>

                {/* Surface Angle Readout */}
                {activeGuide?.rotation && typeof activeGuide.rotation.y === 'number' && (
                  <div className="absolute top-1.5 right-1.5 text-[8px] font-mono text-zinc-500 dark:text-zinc-400 bg-white/90 dark:bg-zinc-800/90 px-1.5 py-0.5 rounded border border-zinc-200/60">
                    {Math.round(((activeGuide.rotation.y ?? 0) * 180) / Math.PI)}°
                  </div>
                )}
              </div>

              {/* Surface Controls: Reset & Snap 45° */}
              <div className="flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={handleResetSurface}
                  className="text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 px-1.5 py-0.5 rounded-lg transition-colors"
                >
                  Reset
                </button>

                <button
                  type="button"
                  onClick={() => setSnap45((prev) => !prev)}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                    snap45
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                      : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  Snap 45°
                </button>
              </div>

              {/* Hide / Show Surface Full-Width Pill */}
              <button
                type="button"
                onClick={handleToggleSurface}
                className="w-full py-1.5 px-3 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 shadow-xs hover:bg-zinc-200 dark:hover:bg-zinc-750 text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
              >
                {isSurfaceVisible ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Hide Surface</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-blue-500" />
                    <span>Show Surface</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
