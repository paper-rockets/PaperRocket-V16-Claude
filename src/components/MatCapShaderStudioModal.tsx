import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Sparkles, X, RotateCcw, Palette, Layers, Box, Check } from 'lucide-react';
import { parseOBJ } from '../utils/objLoader';
import { resolveAssetUrl } from '../utils/assetUrl';
import { ALL_MATERIAL_PRESETS } from '../presets/materialPresets';
import { SHADER_PRESETS } from '../presets/shaderPresets';
import { StudioEngine } from '../core/studioEngine';

import { BrushSettings } from '../types';

interface MatCapShaderStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  engine?: StudioEngine | null;
  brushSettings?: BrushSettings;
  onUpdateBrushSettings?: (settings: Partial<BrushSettings>) => void;
  theme?: 'light' | 'dark';
}

export const MOBILE_CATEGORIES = [
  'Toon & Anime',
  'Fun & Magic',
  'Wonderlust',
  'Bright & Glass'
];

export const MatCapShaderStudioModal: React.FC<MatCapShaderStudioModalProps> = ({
  isOpen,
  onClose,
  engine,
  brushSettings,
  onUpdateBrushSettings,
  theme = 'dark'
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const materialRef = useRef<THREE.Material | null>(null);
  const clockRef = useRef(new THREE.Clock());
  const mousePosRef = useRef(new THREE.Vector2(0, 0));
  const objCacheRef = useRef<Record<string, THREE.BufferGeometry>>({});

  const [activeCategory, setActiveCategory] = useState<string>('Toon & Anime');
  const [materialMode, setMaterialMode] = useState<'matcap' | 'shader'>('matcap');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('toon_anime');
  const [activeShader, setActiveShader] = useState<any>(SHADER_PRESETS[0]);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [bgColor, setBgColor] = useState<string>('#181822');
  const [appliedStatus, setAppliedStatus] = useState<string | null>(null);

  // Initialize Three.js viewport with Suzanne Monkey
  useEffect(() => {
    if (!isOpen) return;

    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 300;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bgColor);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 3.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const defaultGeo = new THREE.SphereGeometry(1, 64, 64);
    const defaultMat = new THREE.MeshMatcapMaterial({ color: 0xffffff });
    const mesh = new THREE.Mesh(defaultGeo, defaultMat);
    scene.add(mesh);
    meshRef.current = mesh;
    materialRef.current = defaultMat;

    // Orbit Drag Controls
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    const spherical = { radius: 3.5, theta: 0, phi: Math.PI / 2 };

    const updateCameraPos = () => {
      camera.position.x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.position.y = spherical.radius * Math.cos(spherical.phi);
      camera.position.z = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      camera.lookAt(0, 0, 0);
    };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mousePosRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mousePosRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;

      spherical.theta -= dx * 0.01;
      spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi - dy * 0.01));
      prevMouse = { x: e.clientX, y: e.clientY };
      updateCameraPos();
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      spherical.radius = Math.max(1.2, Math.min(10, spherical.radius + e.deltaY * 0.003));
      updateCameraPos();
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    // Render loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clockRef.current.getElapsedTime();

      if (autoRotate && meshRef.current && !isDragging) {
        meshRef.current.rotation.y += 0.008;
      }

      if (materialRef.current && (materialRef.current as any).uniforms) {
        const u = (materialRef.current as any).uniforms;
        if (u.u_time) u.u_time.value = elapsedTime;
        if (u.time) u.time.value = elapsedTime;
        if (u.iTime) u.iTime.value = elapsedTime;
        if (u.uTime) u.uTime.value = elapsedTime;
        if (u.u_mouse) u.u_mouse.value.set(mousePosRef.current.x, mousePosRef.current.y);
      }

      renderer.render(scene, camera);
    };

    animate();

    // Load Suzanne OBJ Geometry
    const loadSuzanne = async () => {
      if (objCacheRef.current['suzanne']) {
        if (meshRef.current) {
          meshRef.current.geometry.dispose();
          meshRef.current.geometry = objCacheRef.current['suzanne'];
        }
        return;
      }
      try {
        const res = await fetch(resolveAssetUrl('assets/models/suzanne.obj'));
        const text = await res.text();
        const geo = parseOBJ(text);
        geo.scale(1.2, 1.2, 1.2);
        objCacheRef.current['suzanne'] = geo;
        if (meshRef.current) {
          meshRef.current.geometry.dispose();
          meshRef.current.geometry = geo;
        }
      } catch (err) {
        console.error('Error loading suzanne.obj', err);
      }
    };
    loadSuzanne();

    const resizeObserver = new ResizeObserver(() => {
      if (!container || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      renderer.dispose();
      if (container.contains(dom)) {
        container.removeChild(dom);
      }
    };
  }, [isOpen]);

  // Background Color
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(bgColor);
    }
  }, [bgColor]);

  // Material / Shader Update on Preview Mesh
  useEffect(() => {
    if (!meshRef.current) return;

    if (materialMode === 'matcap' && texture) {
      const mat = new THREE.MeshMatcapMaterial({
        matcap: texture,
        wireframe: wireframe
      });
      meshRef.current.material.dispose();
      meshRef.current.material = mat;
      materialRef.current = mat;
    } else if (materialMode === 'shader' && activeShader) {
      const container = mountRef.current;
      const w = container ? container.clientWidth || 512 : 512;
      const h = container ? container.clientHeight || 512 : 512;

      const uniforms: Record<string, any> = {
        u_time: { value: 0 },
        time: { value: 0 },
        iTime: { value: 0 },
        uTime: { value: 0 },
        u_resolution: { value: new THREE.Vector2(w, h) },
        resolution: { value: new THREE.Vector2(w, h) },
        iResolution: { value: new THREE.Vector3(w, h, 1.0) },
        u_mouse: { value: new THREE.Vector2(0, 0) },
        iMouse: { value: new THREE.Vector4(0, 0, 0, 0) },
        u_matcap: { value: texture },
        tBackground: { value: texture },
        u_texture: { value: texture },
        iChannel0: { value: texture },
        tDiffuse: { value: texture },
        uSunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() }
      };

      try {
        const mat = new THREE.ShaderMaterial({
          vertexShader: activeShader.vertexShader || `precision mediump float;
varying vec3 v_normal;
varying vec2 v_uv;
void main() {
  v_normal = normalize(normalMatrix * normal);
  v_uv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
          fragmentShader: activeShader.fragmentShader,
          uniforms: uniforms,
          wireframe: wireframe,
          transparent: true,
          side: THREE.DoubleSide
        });
        meshRef.current.material.dispose();
        meshRef.current.material = mat;
        materialRef.current = mat;
      } catch (err) {
        console.error('Failed to compile ShaderMaterial', err);
      }
    }
  }, [materialMode, texture, activeShader, wireframe]);

  // Handle Selecting a Preset Card
  const handleSelectPreset = (preset: any) => {
    setSelectedPresetId(preset.id);

    if (preset.type === 'shader') {
      setMaterialMode('shader');
      setActiveShader({
        id: preset.id,
        name: preset.name,
        category: preset.category,
        vertexShader: preset.vertexShader,
        fragmentShader: preset.fragmentShader,
        uniforms: {}
      });
      onUpdateBrushSettings?.({
        materialType: 'animated_fx',
        shaderEffect: 'anime_cel',
        customShader: {
          id: preset.id,
          name: preset.name,
          vertexShader: preset.vertexShader,
          fragmentShader: preset.fragmentShader,
        },
      });
    } else {
      setMaterialMode('matcap');
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, 512, 512);
          const tex = new THREE.CanvasTexture(canvas);
          tex.needsUpdate = true;
          setTexture(tex);
          onUpdateBrushSettings?.({
            materialType: 'matcap',
            matcapUrl: preset.url,
            matcapTexture: tex,
          });
        }
      };
      img.src = preset.url;
    }
  };

  const handleApplyToBrush = () => {
    const preset = ALL_MATERIAL_PRESETS.find((p) => p.id === selectedPresetId);
    if (preset) {
      if (preset.type === 'shader') {
        onUpdateBrushSettings?.({
          materialType: 'animated_fx',
          shaderEffect: 'anime_cel',
          customShader: {
            id: preset.id,
            name: preset.name,
            vertexShader: preset.vertexShader,
            fragmentShader: preset.fragmentShader,
          },
        });
      } else {
        onUpdateBrushSettings?.({
          materialType: 'matcap',
          matcapUrl: preset.url,
          matcapTexture: texture || undefined,
        });
      }
    }
    setAppliedStatus('Applied to Brush!');
    setTimeout(() => setAppliedStatus(null), 2000);
    onClose();
  };

  const handleApplyToModel = () => {
    if (materialRef.current && engine) {
      engine.setModelCustomMaterial(materialRef.current.clone());
      setAppliedStatus('Applied to 3D Model!');
      setTimeout(() => setAppliedStatus(null), 2500);
    }
  };

  // Filter presets into the 4 curated categories
  const filteredPresets = ALL_MATERIAL_PRESETS.filter((preset) => {
    if (activeCategory === 'Toon & Anime') {
      return (
        preset.category === 'Toon Shaders' ||
        preset.category === 'Flat Colors' ||
        preset.id === 'wonderlust_beach_shoreline'
      );
    }
    if (activeCategory === 'Fun & Magic') {
      return preset.category === '✨ Fun & Magic';
    }
    if (activeCategory === 'Wonderlust') {
      return preset.category === '🌍 Wonderlust';
    }
    if (activeCategory === 'Bright & Glass') {
      return (
        preset.category === 'Glass & Crystal' ||
        preset.category === 'Bright Colors' ||
        preset.category === 'Metals' ||
        preset.category === 'Clay & Matte' ||
        preset.category === 'Gems & Organics'
      );
    }
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-4xl max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-wide">MatCap & Live Shader Studio</h2>
              <p className="text-[10px] text-zinc-400">Mobile & Bare-Bones 3D Shader Preview</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content Split: Viewport (Left/Top) + Presets (Right/Bottom) */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
          {/* Viewport Column */}
          <div className="flex flex-col flex-1 min-h-[260px] md:min-h-[380px] bg-zinc-950/80 border-b md:border-b-0 md:border-r border-zinc-800 relative">
            <div ref={mountRef} className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden" />

            {/* Viewport Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-zinc-900/90 border-t border-zinc-800 text-[11px]">
              {/* Mode Toggle */}
              <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
                <button
                  onClick={() => setMaterialMode('matcap')}
                  className={"px-2.5 py-1 rounded-md font-medium transition-all " + (materialMode === 'matcap' ? 'bg-cyan-500 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-white')}
                >
                  MatCap Paint
                </button>
                <button
                  onClick={() => setMaterialMode('shader')}
                  className={"px-2.5 py-1 rounded-md font-medium transition-all " + (materialMode === 'shader' ? 'bg-cyan-500 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-white')}
                >
                  Live Shader
                </button>
              </div>

              {/* Viewport Checkboxes */}
              <div className="flex items-center gap-3 text-zinc-400">
                <label className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-200 select-none">
                  <input
                    type="checkbox"
                    checked={autoRotate}
                    onChange={(e) => setAutoRotate(e.target.checked)}
                    className="rounded bg-zinc-800 border-zinc-700 text-cyan-500 focus:ring-0"
                  />
                  <span>Rotate</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-200 select-none">
                  <input
                    type="checkbox"
                    checked={wireframe}
                    onChange={(e) => setWireframe(e.target.checked)}
                    className="rounded bg-zinc-800 border-zinc-700 text-cyan-500 focus:ring-0"
                  />
                  <span>Wireframe</span>
                </label>

                <div className="flex items-center gap-1">
                  <span>BG:</span>
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Presets Gallery Column */}
          <div className="flex flex-col w-full md:w-80 lg:w-96 flex-shrink-0 bg-zinc-900 min-h-0">
            {/* 4 Curated Categories */}
            <div className="flex items-center gap-1.5 p-2 border-b border-zinc-800 overflow-x-auto scrollbar-none bg-zinc-950/40">
              {MOBILE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={"px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all " + (activeCategory === cat ? 'bg-cyan-500 text-zinc-950 shadow-sm' : 'bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-800')}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Preset Cards Grid */}
            <div className="flex-1 overflow-y-auto p-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 gap-2.5 content-start">
              {filteredPresets.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={"group flex flex-col items-center gap-1.5 p-2 rounded-xl border cursor-pointer transition-all select-none " + (isSelected ? 'bg-cyan-950/40 border-cyan-500 shadow-md ring-1 ring-cyan-500/50' : 'bg-zinc-800/40 border-zinc-800/80 hover:bg-zinc-800 hover:border-zinc-700')}
                    title={preset.name}
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden relative border border-white/10 shadow-sm bg-black/40 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                      {preset.type === 'shader' && (
                        <span className="absolute bottom-0 right-0 text-[10px] bg-cyan-500 text-black px-1 rounded-tl font-bold" title="Live Shader">⚡</span>
                      )}
                    </div>
                    <span className="text-[10px] font-medium text-center text-zinc-300 group-hover:text-white line-clamp-2 leading-tight">
                      {preset.name}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="p-3 border-t border-zinc-800 bg-zinc-950/60 flex items-center gap-2">
              <button
                type="button"
                onClick={handleApplyToBrush}
                className="flex-1 py-2 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-98 cursor-pointer"
                title="Apply this material to your active paint brush"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Apply to Brush</span>
              </button>

              <button
                type="button"
                onClick={handleApplyToModel}
                className="flex-1 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-98 cursor-pointer"
                title="Apply this material to the loaded 3D model"
              >
                <Box className="w-3.5 h-3.5" />
                <span>Apply to Model</span>
              </button>
            </div>

            {appliedStatus && (
              <div className="px-3 pb-2 text-center text-xs font-semibold text-cyan-400 animate-in fade-in">
                {appliedStatus}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
