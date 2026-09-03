import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { StudioEngine } from '../core/studioEngine';
import { PerfectViewType } from '../types';
import { Plus, Minus, RotateCcw, Box } from 'lucide-react';

export type GizmoMode = 'Standard' | 'Compact' | 'Minimal' | 'Hidden';

interface OrientationGizmoProps {
  engine: StudioEngine | null;
  theme?: 'light' | 'dark';
  className?: string;
  showControls?: boolean;
}

interface ProjectedAxis {
  name: string;
  label: string;
  view: PerfectViewType;
  color: string;
  subColor: string;
  isPrimary: boolean;
  vec: THREE.Vector3;
  x: number;
  y: number;
  depth: number;
}

export const OrientationGizmo: React.FC<OrientationGizmoProps> = ({
  engine,
  theme = 'light',
  className = '',
  showControls = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredAxis, setHoveredAxis] = useState<string | null>(null);

  const isDraggingRef = useRef(false);
  const startPointerRef = useRef({ x: 0, y: 0 });
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);
  const projectedAxesRef = useRef<ProjectedAxis[]>([]);

  const isLight = theme === 'light';

  // Real-time dynamic 3D Gizmo rendering
  useEffect(() => {
    if (!engine) return;
    let animId: number;

    const renderGizmo = () => {
      const canvas = canvasRef.current;
      if (canvas && engine) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const width = canvas.width;
          const height = canvas.height;
          const cx = width / 2;
          const cy = height / 2;
          const radius = (width / 2) * 0.72;

          ctx.clearRect(0, 0, width, height);

          // Extract camera basis vectors
          const cam = engine.getCamera();
          const camDir = cam.getWorldDirection(new THREE.Vector3()).normalize();
          const camUp = cam.up.clone().normalize();
          const camRight = new THREE.Vector3().crossVectors(camDir, camUp).normalize();

          // 6 Cardinal Axes with primary & negative nodes
          const axes: Array<{
            name: string;
            label: string;
            view: PerfectViewType;
            color: string;
            subColor: string;
            isPrimary: boolean;
            vec: THREE.Vector3;
          }> = [
            {
              name: 'X',
              label: 'X',
              view: 'right',
              color: '#ef4444', // Red
              subColor: '#b91c1c',
              isPrimary: true,
              vec: new THREE.Vector3(1, 0, 0),
            },
            {
              name: '-X',
              label: 'L',
              view: 'left',
              color: '#f87171',
              subColor: '#991b1b',
              isPrimary: false,
              vec: new THREE.Vector3(-1, 0, 0),
            },
            {
              name: 'Y',
              label: 'Y',
              view: 'top',
              color: '#10b981', // Green
              subColor: '#047857',
              isPrimary: true,
              vec: new THREE.Vector3(0, 1, 0),
            },
            {
              name: '-Y',
              label: 'B',
              view: 'bottom',
              color: '#34d399',
              subColor: '#065f46',
              isPrimary: false,
              vec: new THREE.Vector3(0, -1, 0),
            },
            {
              name: 'Z',
              label: 'Z',
              view: 'front',
              color: '#3b82f6', // Blue
              subColor: '#1d4ed8',
              isPrimary: true,
              vec: new THREE.Vector3(0, 0, 1),
            },
            {
              name: '-Z',
              label: 'K',
              view: 'back',
              color: '#60a5fa',
              subColor: '#1e40af',
              isPrimary: false,
              vec: new THREE.Vector3(0, 0, -1),
            },
          ];

          // Project to 2D view coordinates
          const projected: ProjectedAxis[] = axes.map((axis) => {
            const dotRight = axis.vec.dot(camRight);
            const dotUp = axis.vec.dot(camUp);
            const dotDepth = axis.vec.dot(camDir);

            return {
              ...axis,
              x: cx + dotRight * radius,
              y: cy - dotUp * radius,
              depth: dotDepth,
            };
          });

          // Sort back-to-front so closer elements render on top
          projected.sort((a, b) => a.depth - b.depth);
          projectedAxesRef.current = projected;

          // 1. Central Ambient Sphere / Disc
          ctx.beginPath();
          ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
          ctx.fillStyle = isLight
            ? 'rgba(248, 250, 252, 0.94)'
            : 'rgba(23, 23, 23, 0.94)';
          ctx.fill();

          // Subtle perimeter border
          ctx.strokeStyle = isLight
            ? 'rgba(226, 232, 240, 0.85)'
            : 'rgba(64, 64, 64, 0.6)';
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // 2. Back-facing axes (depth > 0)
          projected
            .filter((p) => p.depth > 0)
            .forEach((p) => {
              ctx.beginPath();
              ctx.setLineDash([2, 3]);
              ctx.moveTo(cx, cy);
              ctx.lineTo(p.x, p.y);
              ctx.strokeStyle = isLight
                ? 'rgba(148, 163, 184, 0.45)'
                : 'rgba(115, 115, 115, 0.4)';
              ctx.lineWidth = 1;
              ctx.stroke();
              ctx.setLineDash([]);

              // Subdued dot
              const isHovered = hoveredAxis === p.name;
              const nodeR = isHovered ? 7.5 : 5.5;

              ctx.beginPath();
              ctx.arc(p.x, p.y, nodeR, 0, Math.PI * 2);
              ctx.fillStyle = isHovered
                ? p.color
                : isLight
                ? 'rgba(203, 213, 225, 0.8)'
                : 'rgba(82, 82, 82, 0.7)';
              ctx.fill();

              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1;
              ctx.stroke();
            });

          // 3. Center pivot
          ctx.beginPath();
          ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = isLight ? '#94a3b8' : '#737373';
          ctx.fill();

          // 4. Front-facing axes (depth <= 0)
          projected
            .filter((p) => p.depth <= 0)
            .forEach((p) => {
              // Line connecting from center
              ctx.beginPath();
              ctx.moveTo(cx, cy);
              ctx.lineTo(p.x, p.y);
              ctx.strokeStyle = p.color;
              ctx.lineWidth = p.isPrimary ? 2.5 : 1.5;
              ctx.stroke();

              const isHovered = hoveredAxis === p.name;
              const nodeRadius = p.isPrimary ? (isHovered ? 12.5 : 10) : isHovered ? 8.5 : 6.5;

              // Glowing halo on hover
              if (isHovered) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, nodeRadius + 3.5, 0, Math.PI * 2);
                ctx.fillStyle = `${p.color}40`;
                ctx.fill();
              }

              // Main colored sphere
              ctx.beginPath();
              ctx.arc(p.x, p.y, nodeRadius, 0, Math.PI * 2);
              ctx.fillStyle = p.color;
              ctx.fill();

              // Crisp white border
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = isHovered ? 2 : 1.5;
              ctx.stroke();

              // Text Label
              if (p.isPrimary || isHovered) {
                ctx.fillStyle = '#ffffff';
                ctx.font = `bold ${p.isPrimary ? 10 : 8}px system-ui, -apple-system, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(p.label, p.x, p.y + 0.5);
              }
            });
        }
      }
      animId = requestAnimationFrame(renderGizmo);
    };

    animId = requestAnimationFrame(renderGizmo);
    return () => cancelAnimationFrame(animId);
  }, [engine, theme, hoveredAxis, isLight]);

  // Pointer interactions for Camera Orbit & View Snapping
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    startPointerRef.current = { x: e.clientX, y: e.clientY };
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;

    // Hover detection
    const found = projectedAxesRef.current.find((p) => {
      const d = Math.hypot(p.x - localX, p.y - localY);
      return d <= 14;
    });
    setHoveredAxis(found ? found.name : null);

    if (!isDraggingRef.current || !engine) return;

    const dx = e.clientX - lastPointerRef.current.x;
    const dy = e.clientY - lastPointerRef.current.y;
    const totalDist = Math.hypot(
      e.clientX - startPointerRef.current.x,
      e.clientY - startPointerRef.current.y
    );

    if (totalDist > 3) {
      hasMovedRef.current = true;
    }

    lastPointerRef.current = { x: e.clientX, y: e.clientY };

    // Orbit Camera directly
    engine.orbit(dx * 1.5, dy * 1.5);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    // If pointer did not drag significantly, trigger view snap!
    if (!hasMovedRef.current && engine && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      let closest: ProjectedAxis | null = null;
      let minDistance = 18;

      projectedAxesRef.current.forEach((p) => {
        const d = Math.hypot(p.x - clickX, p.y - clickY);
        if (d < minDistance) {
          minDistance = d;
          closest = p;
        }
      });

      if (closest) {
        engine.snapToView((closest as ProjectedAxis).view);
      }
    }
  };

  const handleZoomIn = () => {
    if (!engine) return;
    engine.zoom(-0.25);
  };

  const handleZoomOut = () => {
    if (!engine) return;
    engine.zoom(0.25);
  };

  const handleResetCamera = () => {
    if (!engine) return;
    engine.snapToView('isometric');
  };

  return (
    <div
      id="original-orientation-gizmo"
      className={`select-none flex flex-col items-center gap-1.5 p-2 rounded-2xl border shadow-xl backdrop-blur-md transition-all ${
        isLight
          ? 'bg-white/90 border-neutral-200 text-neutral-800 shadow-neutral-300/50'
          : 'bg-slate-800/90 border-slate-700/80 text-slate-100 shadow-black/40'
      } ${className}`}
    >
      {/* 3D Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={104}
          height={104}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          title="Drag to orbit 3D camera • Click X/Y/Z to snap view"
          className="w-[104px] h-[104px] cursor-grab active:cursor-grabbing rounded-full touch-none"
        />

        {/* Hover View Tooltip */}
        {hoveredAxis && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-slate-900/90 text-white text-[9px] font-mono uppercase tracking-wider pointer-events-none shadow">
            {hoveredAxis === 'Y'
              ? 'TOP'
              : hoveredAxis === '-Y'
              ? 'BOTTOM'
              : hoveredAxis === 'Z'
              ? 'FRONT'
              : hoveredAxis === '-Z'
              ? 'BACK'
              : hoveredAxis === 'X'
              ? 'RIGHT'
              : 'LEFT'}
          </div>
        )}
      </div>

      {/* Quick Action Controls */}
      {showControls && (
        <div className="flex items-center gap-1 pt-1 border-t border-neutral-200 dark:border-slate-700 w-full justify-center">
          <button
            id="gizmo-btn-zoom-in"
            onClick={handleZoomIn}
            title="Zoom In"
            className={`p-1 rounded-lg border transition-all active:scale-95 ${
              isLight
                ? 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-700'
                : 'bg-slate-700 hover:bg-slate-600 border-slate-600 text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          <button
            id="gizmo-btn-zoom-out"
            onClick={handleZoomOut}
            title="Zoom Out"
            className={`p-1 rounded-lg border transition-all active:scale-95 ${
              isLight
                ? 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-700'
                : 'bg-slate-700 hover:bg-slate-600 border-slate-600 text-slate-200'
            }`}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <button
            id="gizmo-btn-reset-view"
            onClick={handleResetCamera}
            title="Reset to Isometric View"
            className={`p-1 rounded-lg border transition-all active:scale-95 ${
              isLight
                ? 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-700'
                : 'bg-slate-700 hover:bg-slate-600 border-slate-600 text-slate-200'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
