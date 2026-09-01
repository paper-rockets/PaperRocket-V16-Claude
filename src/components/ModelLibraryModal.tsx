import React, { useState, useMemo } from 'react';
import { SampleModelFactory, PresetModelDefinition } from '../core/sampleModels';
import { StudioEngine } from '../core/studioEngine';
import { ModelDisplayMode } from '../types';
import {
  Box,
  Upload,
  X,
  Check,
  Search,
  Sparkles,
  Home,
  Bot,
  Cat,
  Flame,
  Shapes,
  Layers,
  Loader2,
  Zap,
  Palette,
} from 'lucide-react';

interface ModelLibraryModalProps {
  engine: StudioEngine | null;
  onClose: () => void;
  activeModelName: string;
  onOpenConverter?: () => void;
}

export const ModelLibraryModal: React.FC<ModelLibraryModalProps> = ({
  engine,
  onClose,
  activeModelName,
  onOpenConverter,
}) => {
  const presets = useMemo(() => SampleModelFactory.getPresets(), []);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loadDisplayMode, setLoadDisplayMode] = useState<ModelDisplayMode>('texture');
  const [urlInput, setUrlInput] = useState('');

  const categories = [
    { id: 'All', label: 'All Models', icon: Layers },
    { id: 'Anime & Manga', label: 'Anime & Manga', icon: Sparkles },
    { id: 'Characters & Figures', label: 'Characters', icon: Flame },
    { id: 'Houses & Architecture', label: 'Houses & Places', icon: Home },
    { id: 'Vehicles & Tech', label: 'Vehicles & Tech', icon: Bot },
    { id: 'Animals & Creatures', label: 'Cute Animals', icon: Cat },
    { id: 'Shapes & Benchmarks', label: 'Shapes & Benchmarks', icon: Shapes },
  ];

  const filteredPresets = useMemo(() => {
    return presets.filter((p) => {
      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [presets, selectedCategory, searchQuery]);

  const handleSelectPreset = async (preset: PresetModelDefinition) => {
    if (!engine) return;
    setLoading(true);
    setError(null);
    try {
      await engine.loadPresetModel(preset.id, loadDisplayMode);
      onClose();
    } catch (err: any) {
      setError(err?.message || `Failed to load ${preset.name}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleUrlLoad = async () => {
    if (!engine || !urlInput.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const url = urlInput.trim();
      const modelName = url.split('/').pop()?.split('?')[0] || 'Remote Model';
      await engine.loadGLTF(url, modelName);
      engine.setModelDisplayMode(loadDisplayMode);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to download or parse remote 3D model.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!engine) return;
    setLoading(true);
    setError(null);

    try {
      await engine.loadUniversalFiles([file], file.name);
      engine.setModelDisplayMode(loadDisplayMode);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to parse 3D model file.');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div
        id="model-library-modal"
        className="w-full max-w-4xl max-h-[90vh] flex flex-col p-4 sm:p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-zinc-100 font-semibold text-base leading-tight">
                3D Model Library & Draco Ingestion
              </h2>
              <p className="text-xs text-zinc-400">
                Choose from {presets.length} curated 3D assets or drag & drop custom GLB / OBJ meshes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenConverter && (
              <button
                onClick={() => {
                  onClose();
                  onOpenConverter();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-700 text-xs font-semibold transition-all"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>3D Converter & Storage</span>
              </button>
            )}
            <button
              id="close-model-library-btn"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Surface Loading Mode Selector & Search Filter Bar */}
        <div className="py-3 flex flex-col gap-2.5 border-b border-zinc-800">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
              Load Surface Mode
            </span>
            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setLoadDisplayMode('texture')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  loadDisplayMode === 'texture'
                    ? 'bg-white text-zinc-950 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Textured (Original)</span>
              </button>
              <button
                type="button"
                onClick={() => setLoadDisplayMode('clay')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  loadDisplayMode === 'clay'
                    ? 'bg-white text-zinc-950 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Plain White Canvas</span>
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 3D models (Pusheen, Pokemon, Akira, Houses, Capybara, Castle...)"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    active
                      ? 'bg-white text-zinc-950 font-bold shadow-sm'
                      : 'bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Models Grid & Ingestion */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {error && (
            <div className="p-3 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs">
              {error}
            </div>
          )}

          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-zinc-400">
              <Loader2 className="w-8 h-8 animate-spin text-zinc-200" />
              <p className="text-xs">Decompressing Draco 3D mesh & calculating BVH...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredPresets.map((preset) => {
                const isCurrent =
                  activeModelName.toLowerCase() === preset.name.toLowerCase() ||
                  activeModelName.toLowerCase().includes(preset.id.replace(/_/g, ' '));
                return (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`group relative p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isCurrent
                        ? 'bg-white/10 border-white shadow-md'
                        : 'bg-zinc-950/60 border-zinc-800 hover:bg-zinc-800/50 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[11px] font-semibold text-zinc-400 group-hover:text-white transition-colors uppercase tracking-wider">
                          {preset.category}
                        </span>
                        {isCurrent && (
                          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-white text-zinc-950 font-bold">
                            <Check className="w-2.5 h-2.5" /> Active
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-white leading-tight mb-1">
                        {preset.name}
                      </h3>
                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400">
                      <span className="text-[10px] text-zinc-400">
                        {preset.file ? 'Draco GLB' : 'Procedural Mesh'}
                      </span>
                      <span className="text-zinc-300 font-medium group-hover:text-white group-hover:translate-x-0.5 transition-all">
                        Load Model →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {filteredPresets.length === 0 && !loading && (
            <div className="py-12 text-center text-zinc-500 text-xs">
              No 3D models match &ldquo;{searchQuery}&rdquo;. Try another search term or upload a file.
            </div>
          )}

          {/* Upload Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`mt-4 p-5 rounded-2xl border-2 border-dashed transition-all text-center flex flex-col items-center justify-center gap-2 ${
              isDragging
                ? 'border-white bg-white/10 text-white'
                : 'border-zinc-800 bg-zinc-950/30 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <Upload className="w-6 h-6 text-zinc-400" />
            <div>
              <p className="text-xs font-medium text-zinc-200">
                Drag & drop any custom 3D model (.glb, .gltf, .obj)
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Full Draco compression and vertex colors supported
              </p>
            </div>
            <label className="mt-1 px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 cursor-pointer transition-colors">
              Browse Local File
              <input
                type="file"
                accept=".glb,.gltf,.obj"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
            </label>
          </div>

          {/* Remote URL Ingestion */}
          <div className="flex gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Or paste direct 3D model GLB URL (e.g. GitHub raw or CDN)..."
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
            />
            <button
              onClick={handleUrlLoad}
              disabled={!urlInput.trim() || loading}
              className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-50 text-zinc-950 text-xs font-semibold transition-colors"
            >
              Fetch & Load
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
