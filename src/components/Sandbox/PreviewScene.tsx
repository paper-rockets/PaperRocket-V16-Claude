/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { SandboxNavState, SandboxTheme } from './types';
import { getQualityProfile, resolvePixelRatio } from '../../utils/deviceProfile';

interface PreviewSceneProps {
  navState: SandboxNavState;
  theme: SandboxTheme;
  className?: string;
}

export const PreviewScene: React.FC<PreviewSceneProps> = ({
  navState,
  theme,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const targetGroupRef = useRef<THREE.Group | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const brushRingRef = useRef<THREE.Mesh | null>(null);

  // Setup Three.js scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 4, 9);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const profile = getQualityProfile();
    const renderer = new THREE.WebGLRenderer({
      antialias: profile.antialias,
      alpha: true,
      precision: profile.precision,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(resolvePixelRatio(profile));
    renderer.shadowMap.enabled = profile.shadows;
    renderer.shadowMap.type = profile.shadowMapType;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // Grid Floor
    const gridColor = theme === 'sage' ? 0x9eab9b : theme === 'dark' ? 0x2e333d : 0xd1d5db;
    const gridCenterColor = theme === 'sage' ? 0xd35f4c : theme === 'dark' ? 0x38bdf8 : 0x111827;
    const grid = new THREE.GridHelper(12, 24, gridCenterColor, gridColor);
    grid.position.y = -1.2;
    scene.add(grid);
    gridHelperRef.current = grid;

    // Ambient & Directional Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(6, 12, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x88bbff, 0.4);
    fillLight.position.set(-6, -2, -6);
    scene.add(fillLight);

    // Target Group (represents the object/canvas being navigated)
    const targetGroup = new THREE.Group();
    scene.add(targetGroup);
    targetGroupRef.current = targetGroup;

    // Stylized Geometric Rocket / Craft geometry
    const bodyGeometry = new THREE.ConeGeometry(0.7, 2.4, 6);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: theme === 'sage' ? 0x232628 : theme === 'dark' ? 0xf3f4f6 : 0x111827,
      roughness: 0.35,
      metalness: 0.15,
      flatShading: true,
    });
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    bodyMesh.rotation.x = -Math.PI / 2;
    targetGroup.add(bodyMesh);

    // Accent Nosecone
    const noseGeometry = new THREE.ConeGeometry(0.705, 0.7, 6);
    const noseMaterial = new THREE.MeshStandardMaterial({
      color: theme === 'sage' ? 0xd35f4c : theme === 'dark' ? 0x38bdf8 : 0x2563eb,
      roughness: 0.2,
      flatShading: true,
    });
    const noseMesh = new THREE.Mesh(noseGeometry, noseMaterial);
    noseMesh.rotation.x = -Math.PI / 2;
    noseMesh.position.z = 0.85;
    targetGroup.add(noseMesh);

    // Wing fins
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(0.9, -0.6);
    wingShape.lineTo(0, -0.9);
    wingShape.closePath();

    const extrudeSettings = { depth: 0.05, bevelEnabled: false };
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
    const wingMat = new THREE.MeshStandardMaterial({
      color: theme === 'sage' ? 0x5a6358 : theme === 'dark' ? 0x475569 : 0x6b7280,
      roughness: 0.4,
    });

    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(0.4, 0, -0.3);
    targetGroup.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.scale.set(-1, 1, 1);
    rightWing.position.set(-0.4, 0, -0.3);
    targetGroup.add(rightWing);

    // Drawing Plane Reference Card
    const cardGeo = new THREE.PlaneGeometry(3.6, 2.6);
    const cardMat = new THREE.MeshBasicMaterial({
      color: theme === 'dark' ? 0x1f232b : 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25,
      wireframe: true,
    });
    const cardMesh = new THREE.Mesh(cardGeo, cardMat);
    cardMesh.position.z = -0.5;
    targetGroup.add(cardMesh);

    // Brush Size Indicator Ring (planar circle in front of model)
    const ringGeo = new THREE.RingGeometry(0.3, 0.33, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: theme === 'sage' ? 0xd35f4c : theme === 'dark' ? 0x38bdf8 : 0x111827,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(1.5, 0.8, 0.5);
    scene.add(ringMesh);
    brushRingRef.current = ringMesh;

    // Animation render loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [theme]);

  // Update object transform & brush according to navState
  useEffect(() => {
    if (!targetGroupRef.current) return;
    const target = targetGroupRef.current;

    // Translation (scaled down for 3D world meters)
    target.position.x = navState.x * 0.02;
    target.position.y = navState.y * 0.02;
    target.position.z = navState.z * 0.02;

    // Rotation (convert degrees to radians)
    target.rotation.x = (navState.pitch * Math.PI) / 180;
    target.rotation.y = (navState.yaw * Math.PI) / 180;
    target.rotation.z = (navState.roll * Math.PI) / 180;

    // Scale
    const s = Math.max(0.1, navState.scale);
    target.scale.set(s, s, s);

    // Update brush size preview ring
    if (brushRingRef.current) {
      const ringScale = (navState.brushSize / 15) * 0.5;
      brushRingRef.current.scale.set(ringScale, ringScale, 1);
    }
  }, [navState]);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      <div ref={mountRef} className="w-full h-full" />
      
      {/* Viewport Overlay Coordinates */}
      <div className="absolute top-4 left-4 font-mono text-[11px] tracking-wider pointer-events-none select-none opacity-70">
        <div>XYZ [{navState.x.toFixed(1)}, {navState.y.toFixed(1)}, {navState.z.toFixed(1)}]</div>
        <div>ROT [{navState.pitch.toFixed(1)}°, {navState.yaw.toFixed(1)}°, {navState.roll.toFixed(1)}°]</div>
        <div>SCL [{navState.scale.toFixed(2)}x] BRUSH [{navState.brushSize.toFixed(1)}px]</div>
      </div>
    </div>
  );
};
