/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { playHapticSound } from '../utils/audio';
import { getQualityProfile, resolvePixelRatio } from '../utils/deviceProfile';

interface ThreeTrackballProps {
  yaw: number;
  pitch: number;
  onRotate: (deltaYaw: number, deltaPitch: number) => void;
  onDragStateChange?: (isDragging: boolean) => void;
  onVelocityChange?: (velocity: number) => void;
  soundEnabled: boolean;
  size?: number;
}

// Singleton cached texture to avoid re-generating canvas and textures on every toggle
let cachedSphereTexture: THREE.CanvasTexture | null = null;

function getSharedSphereTexture(): THREE.CanvasTexture {
  if (cachedSphereTexture) return cachedSphereTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGrad.addColorStop(0, '#18181b');
    bgGrad.addColorStop(0.5, '#202024');
    bgGrad.addColorStop(1, '#161619');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle longitude meridians (every 45 degrees to match quadrant divisions)
    for (let i = 0; i < 8; i++) {
      const x = (i / 8) * canvas.width;
      const isPrime = i === 0 || i === 4;
      ctx.lineWidth = isPrime ? 1.5 : 1;
      ctx.strokeStyle = isPrime ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // Equator & 45-degree Latitude parallels
    const lats = [
      { deg: 0, isMajor: true },
      { deg: 45, isMajor: false },
      { deg: -45, isMajor: false },
      { deg: 70, isMajor: false },
      { deg: -70, isMajor: false },
    ];
    lats.forEach(({ deg, isMajor }) => {
      const y = ((deg + 90) / 180) * canvas.height;
      ctx.lineWidth = isMajor ? 1.5 : 1;
      ctx.strokeStyle = isMajor ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    });

    // Refined intersection tick dots at 45-degree intersections
    for (let i = 0; i < 8; i++) {
      const x = (i / 8) * canvas.width;
      [0, 45, -45].forEach((deg) => {
        const y = ((deg + 90) / 180) * canvas.height;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Fine tactile micro-stipple for physical matte grip feel
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    for (let j = 0; j < 1200; j++) {
      const rx = Math.random() * canvas.width;
      const ry = Math.random() * canvas.height;
      ctx.fillRect(rx, ry, 1.2, 1.2);
    }
  }

  cachedSphereTexture = new THREE.CanvasTexture(canvas);
  cachedSphereTexture.wrapS = THREE.RepeatWrapping;
  cachedSphereTexture.wrapT = THREE.ClampToEdgeWrapping;
  return cachedSphereTexture;
}

export const ThreeTrackball: React.FC<ThreeTrackballProps> = ({
  yaw,
  pitch,
  onRotate,
  onDragStateChange,
  onVelocityChange,
  soundEnabled,
  size = 196,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0, time: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sphereRef = useRef<THREE.Group | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frictionAnimRef = useRef<number | null>(null);

  // Keep latest props in refs for event handlers without recreating loop
  const onRotateRef = useRef(onRotate);
  onRotateRef.current = onRotate;
  const onDragStateChangeRef = useRef(onDragStateChange);
  onDragStateChangeRef.current = onDragStateChange;
  const onVelocityChangeRef = useRef(onVelocityChange);
  onVelocityChangeRef.current = onVelocityChange;
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  // On-demand render function (Zero idle CPU/GPU consumption)
  const renderScene = () => {
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Fast scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0, 4.2);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      precision: 'mediump',
    });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(resolvePixelRatio(), 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Balanced studio lighting matching dark tactile palette
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight1.position.set(2.5, 3.5, 3.5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x52525b, 0.40);
    dirLight2.position.set(-2.5, -1.5, 1.5);
    scene.add(dirLight2);

    const rimLight = new THREE.DirectionalLight(0x71717a, 0.45);
    rimLight.position.set(0, 3, -2);
    scene.add(rimLight);

    // Group for the 3D Sphere
    const sphereGroup = new THREE.Group();
    scene.add(sphereGroup);
    sphereRef.current = sphereGroup;

    // Use shared texture singleton
    const sphereTexture = getSharedSphereTexture();

    // Main Sphere Mesh (32x32 segments for lightweight 60fps performance)
    const sphereRadius = 1.35;
    const sphereGeom = new THREE.SphereGeometry(sphereRadius, 32, 32);
    const sphereMat = new THREE.MeshStandardMaterial({
      map: sphereTexture,
      roughness: 0.58,
      metalness: 0.32,
    });
    const mainSphere = new THREE.Mesh(sphereGeom, sphereMat);
    sphereGroup.add(mainSphere);

    // Dark inset socket ring with subtle metallic bevel
    const socketGeom = new THREE.TorusGeometry(1.40, 0.08, 16, 32);
    const socketMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.7,
      metalness: 0.3,
    });
    const socketMesh = new THREE.Mesh(socketGeom, socketMat);
    scene.add(socketMesh);

    // Initial rotation & immediate render
    sphereGroup.rotation.x = THREE.MathUtils.degToRad(pitch);
    sphereGroup.rotation.y = THREE.MathUtils.degToRad(yaw);
    renderer.render(scene, camera);

    return () => {
      if (frictionAnimRef.current) cancelAnimationFrame(frictionAnimRef.current);
      sphereGeom.dispose();
      sphereMat.dispose();
      socketGeom.dispose();
      socketMat.dispose();
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [size]);

  // Sync orientation when pitch/yaw change externally and render on-demand
  useEffect(() => {
    if (sphereRef.current && !isDragging.current && !frictionAnimRef.current) {
      sphereRef.current.rotation.x = THREE.MathUtils.degToRad(pitch);
      sphereRef.current.rotation.y = THREE.MathUtils.degToRad(yaw);
      renderScene();
    }
  }, [yaw, pitch]);

  // Interactive 3D Pointer handlers with on-demand rendering
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (frictionAnimRef.current) {
      cancelAnimationFrame(frictionAnimRef.current);
      frictionAnimRef.current = null;
    }

    isDragging.current = true;
    lastPointer.current = { x: e.clientX, y: e.clientY, time: performance.now() };
    velocityRef.current = { x: 0, y: 0 };
    onDragStateChangeRef.current?.(true);
    playHapticSound('click', soundEnabledRef.current);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || !sphereRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const now = performance.now();
    const dt = Math.max(1, now - lastPointer.current.time);
    const rawDx = e.clientX - lastPointer.current.x;
    const rawDy = e.clientY - lastPointer.current.y;

    const baseRadius = Math.max(1, size * 0.5);
    const normDx = (rawDx / baseRadius) * 100;
    const normDy = (rawDy / baseRadius) * 100;

    const currentVx = (normDx / dt) * 16.67;
    const currentVy = (normDy / dt) * 16.67;
    velocityRef.current = {
      x: velocityRef.current.x * 0.4 + currentVx * 0.6,
      y: velocityRef.current.y * 0.4 + currentVy * 0.6,
    };

    lastPointer.current = { x: e.clientX, y: e.clientY, time: now };

    const speed = Math.min(2.0, Math.hypot(currentVx, currentVy) * 0.15);
    onVelocityChangeRef.current?.(speed);

    // Convert pointer displacement directly into natural 1:1 angular rotation (0.45 deg per pixel)
    const degPerPx = 0.45;
    const deltaYaw = rawDx * degPerPx;
    const deltaPitch = rawDy * degPerPx;

    sphereRef.current.rotation.y += THREE.MathUtils.degToRad(deltaYaw);
    sphereRef.current.rotation.x += THREE.MathUtils.degToRad(deltaPitch);

    // On-demand render
    renderScene();

    onRotateRef.current(deltaYaw, -deltaPitch);

    if (Math.hypot(rawDx, rawDy) > 8) {
      playHapticSound('tick', soundEnabledRef.current);
    }
  };

  // Friction-based momentum deceleration animation on release
  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    e.stopPropagation();
    isDragging.current = false;
    onDragStateChangeRef.current?.(false);
    onVelocityChangeRef.current?.(0);
    playHapticSound('pop', soundEnabledRef.current);

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    // Friction physics loop: coast to a smooth stop with normalized momentum
    let vx = velocityRef.current.x * 1.1;
    let vy = velocityRef.current.y * 1.1;
    const friction = 0.93; // Energy decay factor per frame

    const stepFriction = () => {
      const currentSpeed = Math.hypot(vx, vy);
      if (currentSpeed < 0.08 || !sphereRef.current) {
        frictionAnimRef.current = null;
        onVelocityChangeRef.current?.(0);
        return;
      }

      vx *= friction;
      vy *= friction;

      onVelocityChangeRef.current?.(Math.min(2.0, currentSpeed * 0.12));

      // Rotate Three.js 3D sphere
      const rotSpeed = 0.022;
      sphereRef.current.rotation.y += vx * rotSpeed;
      sphereRef.current.rotation.x += vy * rotSpeed;

      // Render updated frame
      renderScene();

      // Impart delta to spatial orientation
      const deltaYaw = vx * 1.35;
      const deltaPitch = -vy * 1.05;
      onRotateRef.current(deltaYaw, deltaPitch);

      frictionAnimRef.current = requestAnimationFrame(stepFriction);
    };

    if (Math.hypot(vx, vy) > 0.4) {
      frictionAnimRef.current = requestAnimationFrame(stepFriction);
    }
  };

  return (
    <div
      ref={mountRef}
      id="three-trackball-3d-canvas"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative flex items-center justify-center cursor-grab active:cursor-grabbing rounded-full touch-none select-none drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)]"
      style={{ width: size, height: size }}
      title="3D Trackball - Drag to rotate model freely"
    />
  );
};
