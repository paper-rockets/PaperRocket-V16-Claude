import React, { useState, useRef } from 'react';
import {
  CollisionGuideMeshConfig,
  ScaffoldProxyType,
  ScaffoldRenderMode,
  PrimitiveTopologyConfig,
  NumpadTarget,
} from '../types';
import { StudioEngine } from '../core/studioEngine';
import { PrimitiveGenerator } from '../core/primitiveGenerator';
import { modelLoader } from '../core/modelLoader';
import {
  Box,
  Circle,
  Eye,
  EyeOff,
  Layers,
  Lock,
  Plus,
  Sliders,
  Trash2,
  Upload,
  User,
  X,
  Car,
  Maximize2,
  Sparkles,
  Shield,
  Activity,
  Check,
  Cuboid as Cube,
  ShieldAlert,
} from 'lucide-react';

interface ScaffoldingModalProps {
  isOpen: boolean;
  onClose: () => void;
  engine: StudioEngine | null;
  onOpenNumpad: (target: NumpadTarget) => void;
  theme?: 'light' | 'dark';
}

const PROXIES: Array<{
  type: ScaffoldProxyType;
  label: string;
  desc: string;
  icon: React.FC<{ className?: string }>;
}> = [
  {
    type: 'mannequin_torso',
    label: 'Mannequin Torso',
    desc: 'Anatomical ribcage, pelvis, spine & shoulder joints',
    icon: User,
  },
  {
    type: 'head_sphere',
    label: 'Loomis Head Cage',
    desc: 'Cranial sphere, eye ring & jaw box guides',
    icon: Circle,
  },
  {
    type: 'car_chassis',
    label: 'Vehicle Chassis',
    desc: 'Aerodynamic cabin, hood & 4 wheel arch colliders',
    icon: Car,
  },
  {
    type: 'cylinder_limb',
    label: 'Limb Armature',
    desc: 'Shoulder/elbow ball joints & tapered bone cylinders',
    icon: Activity,
  },
  {
    type: 'dome_column',
    label: 'Dome & Column',
    desc: 'Pedestal, fluted shaft, capital & hemisphere dome',
    icon: Cube,
  },
  {
    type: 'capsule',
    label: 'Organic Capsule',
    desc: 'Smooth curved capsule scaffold for organic sculpts',
    icon: Sparkles,
  },
];

export const ScaffoldingModal: React.FC<ScaffoldingModalProps> = ({
  isOpen,
  onClose,
  engine,
  onOpenNumpad,
  theme = 'dark',
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'proxies' | 'primitives' | 'active_scaffolds'>('proxies');
  const [selectedScaffoldId, setSelectedScaffoldId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Primitive Config State
  const [primitiveConfig, setPrimitiveConfig] = useState<PrimitiveTopologyConfig>({
    type: 'sphere',
    radius: 0.8,
    height: 1.2,
    radialSegments: 24,
    heightSegments: 16,
    tubeRadius: 0.25,
    tubularSegments: 24,
    width: 1.2,
    depth: 1.2,
    wireframeOverlay: true,
  });

  const [scaffolds, setScaffolds] = useState<CollisionGuideMeshConfig[]>(
    engine?.getScaffolds() || []
  );

  // Calculate live stats for primitive
  const previewStats = React.useMemo(() => {
    const geo = PrimitiveGenerator.createPrimitiveGeometry(primitiveConfig);
    const stats = PrimitiveGenerator.calculateStats(geo);
    geo.dispose();
    return stats;
  }, [primitiveConfig]);

  const handleSpawnProxy = (type: ScaffoldProxyType) => {
    if (!engine) return;
    const config = engine.createProxyScaffold(type);
    setSelectedScaffoldId(config.id);
    setScaffolds(engine.getScaffolds());
    setActiveTab('active_scaffolds');
  };

  const handleSpawnPrimitive = (asScaffold: boolean) => {
    if (!engine) return;
    const group = PrimitiveGenerator.createPrimitiveMesh(
      primitiveConfig,
      asScaffold ? 0x38bdf8 : 0x64748b,
      asScaffold
    );

    if (asScaffold) {
      const config = engine.loadCollisionMeshFromObject(
        group,
        `Parametric ${primitiveConfig.type.toUpperCase()} Scaffold`
      );
      setSelectedScaffoldId(config.id);
      setScaffolds(engine.getScaffolds());
      setActiveTab('active_scaffolds');
    } else {
      // Add as standard scene model
      engine.getScene().add(group);
    }
  };

  const handleImportCollisionMesh = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !engine) return;

    const file = files[0];
    try {
      const result = await modelLoader.loadFromFiles([file]);
      if (result && result.scene) {
        const config = engine.loadCollisionMeshFromObject(
          result.scene,
          `Collision Guide: ${file.name}`
        );
        setSelectedScaffoldId(config.id);
        setScaffolds(engine.getScaffolds());
        setActiveTab('active_scaffolds');
      }
    } catch (err) {
      console.error('Failed to import collision guide:', err);
    }
  };

  const handleRemoveScaffold = (id: string) => {
    if (!engine) return;
    engine.removeScaffold(id);
    if (selectedScaffoldId === id) setSelectedScaffoldId(null);
    setScaffolds(engine.getScaffolds());
  };

  const handleUpdateScaffold = (id: string, updates: Partial<CollisionGuideMeshConfig>) => {
    if (!engine) return;
    engine.updateScaffold(id, updates);
    setScaffolds(engine.getScaffolds());
  };

  const selectedScaffold = scaffolds.find((s) => s.id === selectedScaffoldId);

  return (
    <div
      id="mody-scaffolding-modal"
      className="fixed top-16 left-4 sm:left-24 z-30 w-84 sm:w-96 select-none shadow-2xl rounded-2xl border backdrop-blur-2xl p-4 space-y-3 font-sans animate-in fade-in slide-in-from-left-2 duration-150 bg-[#18191d]/98 border-[#2c2e36] text-neutral-200 max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-200">
            3D Collision Guides & Scaffolding
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-[11px] text-neutral-400 leading-relaxed">
        Import or generate lightweight 3D armatures flagged as non-editable collision guides. Subsequent strokes snap and shrink-wrap directly across their topology.
      </p>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-1 p-0.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('proxies')}
          className={`py-1.5 px-2 rounded-lg transition-all ${
            activeTab === 'proxies'
              ? 'bg-cyan-600 text-white shadow'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Armatures
        </button>
        <button
          onClick={() => setActiveTab('primitives')}
          className={`py-1.5 px-2 rounded-lg transition-all ${
            activeTab === 'primitives'
              ? 'bg-cyan-600 text-white shadow'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Primitives
        </button>
        <button
          onClick={() => setActiveTab('active_scaffolds')}
          className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 ${
            activeTab === 'active_scaffolds'
              ? 'bg-cyan-600 text-white shadow'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <span>Active</span>
          <span className="px-1 py-0.2 rounded-full text-[9px] bg-neutral-800 font-mono">
            {scaffolds.length}
          </span>
        </button>
      </div>

      {/* TAB 1: PROCEDURAL PROXY ARMATURES */}
      {activeTab === 'proxies' && (
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-2 gap-2">
            {PROXIES.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.type}
                  onClick={() => handleSpawnProxy(p.type)}
                  className="p-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800 hover:border-cyan-500/60 hover:bg-neutral-850 text-left space-y-1 group transition-all"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-cyan-950/60 text-cyan-400 group-hover:scale-110 transition-transform">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-neutral-200">{p.label}</span>
                  </div>
                  <p className="text-[10px] text-neutral-400 leading-tight">{p.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Import Custom Non-Editable Collision Mesh */}
          <div className="pt-2 border-t border-neutral-800">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-dashed border-neutral-700 text-neutral-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>Import OBJ / GLTF as Collision Guide</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".obj,.gltf,.glb,.fbx"
              onChange={handleImportCollisionMesh}
              className="hidden"
            />
          </div>
        </div>
      )}

      {/* TAB 2: PROCEDURAL PRIMITIVE TOPOLOGY SLIDERS */}
      {activeTab === 'primitives' && (
        <div className="space-y-3 pt-1">
          {/* Primitive Shape Selector */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              Primitive Geometry
            </span>
            <div className="grid grid-cols-4 gap-1">
              {(
                [
                  'sphere',
                  'cylinder',
                  'torus',
                  'cone',
                  'capsule',
                  'box',
                  'plane',
                ] as const
              ).map((type) => (
                <button
                  key={type}
                  onClick={() => setPrimitiveConfig((prev) => ({ ...prev, type }))}
                  className={`py-1 px-1 rounded-xl text-[11px] font-semibold uppercase border transition-all ${
                    primitiveConfig.type === type
                      ? 'bg-cyan-600 border-cyan-500 text-white shadow-md'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Topological Sliders */}
          <div className="space-y-2 pt-1">
            {/* Radial Segments (Latitude / Circumference density) */}
            <div className="space-y-0.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-300 font-medium">Radial Segments (Circumference)</span>
                <span className="font-mono text-cyan-300 font-bold">
                  {primitiveConfig.radialSegments}
                </span>
              </div>
              <input
                type="range"
                min="3"
                max="64"
                step="1"
                value={primitiveConfig.radialSegments}
                onChange={(e) =>
                  setPrimitiveConfig((prev) => ({
                    ...prev,
                    radialSegments: parseInt(e.target.value, 10),
                  }))
                }
                className="w-full accent-cyan-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Height / Tubular Segments */}
            <div className="space-y-0.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-300 font-medium">
                  {primitiveConfig.type === 'torus' ? 'Tubular Segments' : 'Height Segments'}
                </span>
                <span className="font-mono text-amber-300 font-bold">
                  {primitiveConfig.heightSegments}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="64"
                step="1"
                value={primitiveConfig.heightSegments}
                onChange={(e) =>
                  setPrimitiveConfig((prev) => ({
                    ...prev,
                    heightSegments: parseInt(e.target.value, 10),
                    tubularSegments: parseInt(e.target.value, 10),
                  }))
                }
                className="w-full accent-amber-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Radius / Size Slider */}
            <div className="space-y-0.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-300 font-medium">Radius / Dimensions</span>
                <span className="font-mono text-neutral-300 font-bold">
                  {(primitiveConfig.radius * 100).toFixed(0)} cm
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="3.0"
                step="0.05"
                value={primitiveConfig.radius}
                onChange={(e) =>
                  setPrimitiveConfig((prev) => ({
                    ...prev,
                    radius: parseFloat(e.target.value),
                  }))
                }
                className="w-full accent-cyan-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Topology Density Telemetry Box */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-[11px] font-mono">
              <div className="text-neutral-400">
                Vertices: <span className="text-cyan-300 font-bold">{previewStats.vertices}</span>
              </div>
              <div className="text-neutral-400">
                Polygons: <span className="text-amber-300 font-bold">{previewStats.triangles} tris</span>
              </div>
            </div>
          </div>

          {/* Spawn Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => handleSpawnPrimitive(true)}
              className="py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow transition-all active:scale-98"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Spawn as Scaffold</span>
            </button>
            <button
              onClick={() => handleSpawnPrimitive(false)}
              className="py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
            >
              <Cube className="w-3.5 h-3.5 text-neutral-400" />
              <span>Spawn as Model</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: ACTIVE SCAFFOLDING MESHES */}
      {activeTab === 'active_scaffolds' && (
        <div className="space-y-3 pt-1">
          {scaffolds.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-neutral-800 rounded-xl space-y-1">
              <ShieldAlert className="w-6 h-6 text-neutral-600 mx-auto" />
              <p className="text-xs text-neutral-400 font-medium">No Collision Scaffolds Active</p>
              <p className="text-[10px] text-neutral-500">
                Spawn an anatomical armature or import a 3D guide
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="space-y-1">
                {scaffolds.map((scaffold) => {
                  const isSelected = selectedScaffoldId === scaffold.id;
                  return (
                    <div
                      key={scaffold.id}
                      onClick={() => setSelectedScaffoldId(scaffold.id)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-950/40 border-cyan-500/60 ring-1 ring-cyan-500/30'
                          : 'bg-neutral-900/90 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <Shield className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="text-xs font-semibold text-neutral-200 truncate">
                            {scaffold.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateScaffold(scaffold.id, {
                                visible: !scaffold.visible,
                              });
                            }}
                            className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
                          >
                            {scaffold.visible ? (
                              <Eye className="w-3.5 h-3.5 text-cyan-400" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5 text-neutral-500" />
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveScaffold(scaffold.id);
                            }}
                            className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Scaffold Controls */}
              {selectedScaffold && (
                <div className="p-3 rounded-xl bg-neutral-900/95 border border-neutral-800 space-y-2.5 animate-in fade-in duration-100">
                  <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                    Render Mode & Shader Pass
                  </div>

                  {/* Render Mode Grid */}
                  <div className="grid grid-cols-4 gap-1">
                    {(
                      [
                        { id: 'ghost', label: 'Ghost X-Ray' },
                        { id: 'wireframe', label: 'Wireframe' },
                        { id: 'solid', label: 'Matte Solid' },
                        { id: 'invisible', label: 'Collision Only' },
                      ] as const
                    ).map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() =>
                          handleUpdateScaffold(selectedScaffold.id, {
                            renderMode: mode.id,
                          })
                        }
                        className={`py-1 px-1 rounded-lg text-[10px] font-semibold border transition-all ${
                          selectedScaffold.renderMode === mode.id
                            ? 'bg-cyan-600 border-cyan-500 text-white shadow'
                            : 'bg-neutral-850 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>

                  {/* Opacity Slider */}
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400 font-medium">Hologram Opacity</span>
                      <span className="font-mono text-cyan-300 font-bold">
                        {Math.round(selectedScaffold.opacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="1.0"
                      step="0.05"
                      value={selectedScaffold.opacity}
                      onChange={(e) =>
                        handleUpdateScaffold(selectedScaffold.id, {
                          opacity: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-cyan-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
