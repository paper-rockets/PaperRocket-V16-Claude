import React, { useState, useMemo } from 'react';
import { Layer, LayerBlendMode } from '../types';
import {
  Layers,
  Plus,
  FolderPlus,
  Folder,
  FolderOpen,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  X,
  RotateCcw,
  Copy,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Sun,
  Moon,
  Zap,
  Minus,
  Sliders,
  Layers2,
  Check,
  CornerDownRight,
  FolderTree,
  Tag,
} from 'lucide-react';

interface LayerPanelProps {
  layers: Layer[];
  setLayers: React.Dispatch<React.SetStateAction<Layer[]>>;
  activeLayerId: string;
  setActiveLayerId: (id: string) => void;
  onClose: () => void;
  onClearLayerStrokes: (layerId: string) => void;
  onMergeLayerDown?: (layerId: string) => void;
}

export const BLEND_MODES: Array<{
  id: LayerBlendMode;
  label: string;
  desc: string;
  category: 'Normal' | 'Darken' | 'Lighten' | 'Contrast' | 'Special';
  icon: React.FC<{ className?: string }>;
  colorClass: string;
}> = [
  {
    id: 'normal',
    label: 'Normal',
    desc: 'Standard Alpha Over composite',
    category: 'Normal',
    icon: Sliders,
    colorClass: 'text-neutral-300',
  },
  {
    id: 'multiply',
    label: 'Multiply',
    desc: 'Dst × Src (Darkens & enriches ink/shadows)',
    category: 'Darken',
    icon: Moon,
    colorClass: 'text-amber-400',
  },
  {
    id: 'screen',
    label: 'Screen',
    desc: '1 - (1 - Dst) × (1 - Src) (Lightens & illuminates)',
    category: 'Lighten',
    icon: Sun,
    colorClass: 'text-yellow-300',
  },
  {
    id: 'overlay',
    label: 'Overlay',
    desc: 'Dual-slope contrast blend for highlights & shadows',
    category: 'Contrast',
    icon: Sparkles,
    colorClass: 'text-purple-400',
  },
  {
    id: 'add',
    label: 'Add (Linear Dodge)',
    desc: 'min(1, Dst + Src) (High-energy glow & emission)',
    category: 'Lighten',
    icon: Zap,
    colorClass: 'text-cyan-400',
  },
  {
    id: 'subtract',
    label: 'Subtract',
    desc: 'max(0, Dst - Src) (Deep shadows & negative cut)',
    category: 'Special',
    icon: Minus,
    colorClass: 'text-rose-400',
  },
];

const COLOR_TAGS = [
  { name: 'none', color: 'transparent' },
  { name: 'red', color: '#ef4444' },
  { name: 'orange', color: '#f97316' },
  { name: 'amber', color: '#f59e0b' },
  { name: 'emerald', color: '#10b981' },
  { name: 'cyan', color: '#06b6d4' },
  { name: 'indigo', color: '#6366f1' },
  { name: 'pink', color: '#ec4899' },
];

export const LayerPanelComponent: React.FC<LayerPanelProps> = ({
  layers,
  setLayers,
  activeLayerId,
  setActiveLayerId,
  onClose,
  onClearLayerStrokes,
  onMergeLayerDown,
}) => {
  const [openBlendMenuId, setOpenBlendMenuId] = useState<string | null>(null);
  const [openTagMenuId, setOpenTagMenuId] = useState<string | null>(null);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [nameInputValue, setNameInputValue] = useState<string>('');

  // Build tree structure
  const layerMap = useMemo(() => new Map(layers.map((l) => [l.id, l])), [layers]);

  // Compute effective hierarchy state (inherited visibility, opacity, lock)
  const getInheritedState = (layer: Layer) => {
    let curr: Layer | undefined = layer;
    let effVisible = layer.visible;
    let effOpacity = layer.opacity;
    let effLocked = layer.locked;
    const visited = new Set<string>();

    while (curr && curr.parentId && !visited.has(curr.parentId)) {
      visited.add(curr.parentId);
      const parent = layerMap.get(curr.parentId);
      if (!parent) break;
      effVisible = effVisible && parent.visible;
      effOpacity = effOpacity * parent.opacity;
      effLocked = effLocked || parent.locked;
      curr = parent;
    }

    return { effVisible, effOpacity, effLocked };
  };

  // Get depth of a node in the tree
  const getNodeDepth = (layer: Layer): number => {
    let depth = 0;
    let curr = layer;
    const visited = new Set<string>();
    while (curr && curr.parentId && !visited.has(curr.parentId)) {
      visited.add(curr.parentId);
      const parent = layerMap.get(curr.parentId);
      if (!parent) break;
      depth++;
      curr = parent;
    }
    return depth;
  };

  // Check if any ancestor is collapsed
  const isAncestorCollapsed = (layer: Layer): boolean => {
    let curr = layer;
    const visited = new Set<string>();
    while (curr && curr.parentId && !visited.has(curr.parentId)) {
      visited.add(curr.parentId);
      const parent = layerMap.get(curr.parentId);
      if (!parent) break;
      if (parent.collapsed) return true;
      curr = parent;
    }
    return false;
  };

  // Visible items in hierarchy order
  const visibleHierarchyList = useMemo(() => {
    return layers.filter((l) => !isAncestorCollapsed(l));
  }, [layers]);

  const handleAddLayer = (parentId: string | null = null) => {
    const newId = 'layer_' + Date.now().toString(36);
    const newLayer: Layer = {
      id: newId,
      name: `Layer ${layers.length + 1}`,
      type: 'layer',
      visible: true,
      locked: false,
      opacity: 1.0,
      blendMode: 'normal',
      strokeIds: [],
      parentId: parentId,
    };

    setLayers((prev) => [newLayer, ...prev]);
    setActiveLayerId(newId);
  };

  const handleAddGroup = (parentId: string | null = null) => {
    const newId = 'group_' + Date.now().toString(36);
    const newGroup: Layer = {
      id: newId,
      name: `Group Folder ${layers.filter((l) => l.type === 'group').length + 1}`,
      type: 'group',
      visible: true,
      locked: false,
      opacity: 1.0,
      blendMode: 'normal',
      strokeIds: [],
      parentId: parentId,
      collapsed: false,
      children: [],
    };

    setLayers((prev) => [newGroup, ...prev]);
    setActiveLayerId(newId);
  };

  const handleToggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, collapsed: !l.collapsed } : l))
    );
  };

  const handleDuplicate = (item: Layer, e: React.MouseEvent) => {
    e.stopPropagation();
    const newId = (item.type === 'group' ? 'group_' : 'layer_') + Date.now().toString(36);
    const duplicate: Layer = {
      id: newId,
      name: `${item.name} (Copy)`,
      type: item.type || 'layer',
      visible: item.visible,
      locked: false,
      opacity: item.opacity,
      blendMode: item.blendMode || 'normal',
      strokeIds: [...item.strokeIds],
      parentId: item.parentId,
      collapsed: item.collapsed,
      colorTag: item.colorTag,
    };
    const targetIdx = layers.findIndex((l) => l.id === item.id);
    const updated = [...layers];
    updated.splice(targetIdx, 0, duplicate);
    setLayers(updated);
    setActiveLayerId(newId);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (layers.length <= 1) return;

    // Collect all descendant IDs if deleting a group
    const toDelete = new Set<string>([id]);
    let changed = true;
    while (changed) {
      changed = false;
      layers.forEach((l) => {
        if (l.parentId && toDelete.has(l.parentId) && !toDelete.has(l.id)) {
          toDelete.add(l.id);
          changed = true;
        }
      });
    }

    toDelete.forEach((delId) => onClearLayerStrokes(delId));
    setLayers((prev) => prev.filter((l) => !toDelete.has(l.id)));

    if (toDelete.has(activeLayerId)) {
      const remaining = layers.filter((l) => !toDelete.has(l.id));
      if (remaining.length > 0) {
        setActiveLayerId(remaining[0].id);
      }
    }
  };

  const handleToggleVisibility = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l))
    );
  };

  const handleToggleLock = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l))
    );
  };

  const handleSetOpacity = (id: string, opacity: number) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, opacity } : l))
    );
  };

  const handleSetBlendMode = (id: string, blendMode: LayerBlendMode) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, blendMode } : l))
    );
    setOpenBlendMenuId(null);
  };

  const handleSetColorTag = (id: string, colorTag: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, colorTag: colorTag === 'none' ? undefined : colorTag } : l))
    );
    setOpenTagMenuId(null);
  };

  const handleMoveUp = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index === 0) return;
    setLayers((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
      return updated;
    });
  };

  const handleMoveDown = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index === layers.length - 1) return;
    setLayers((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;
      return updated;
    });
  };

  // Indent: nest item into the previous group in the list
  const handleIndent = (layer: Layer, e: React.MouseEvent) => {
    e.stopPropagation();
    const idx = layers.findIndex((l) => l.id === layer.id);
    if (idx <= 0) return;
    // Find preceding group
    for (let i = idx - 1; i >= 0; i--) {
      if (layers[i].type === 'group' && layers[i].id !== layer.id) {
        setLayers((prev) =>
          prev.map((l) => (l.id === layer.id ? { ...l, parentId: layers[i].id } : l))
        );
        return;
      }
    }
  };

  // Outdent: move item out to parent's parent or root
  const handleOutdent = (layer: Layer, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!layer.parentId) return;
    const parent = layerMap.get(layer.parentId);
    const newParentId = parent ? parent.parentId || null : null;
    setLayers((prev) =>
      prev.map((l) => (l.id === layer.id ? { ...l, parentId: newParentId } : l))
    );
  };

  const handleStartRename = (layer: Layer, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNameId(layer.id);
    setNameInputValue(layer.name);
  };

  const handleSaveRename = () => {
    if (!editingNameId) return;
    const trimmed = nameInputValue.trim();
    if (trimmed) {
      setLayers((prev) =>
        prev.map((l) => (l.id === editingNameId ? { ...l, name: trimmed } : l))
      );
    }
    setEditingNameId(null);
  };

  return (
    <div
      id="mody-layer-studio-panel"
      className="fixed top-14 sm:top-16 right-2 sm:right-6 z-50 w-[calc(100vw-16px)] sm:w-96 max-w-[400px] select-none shadow-2xl rounded-2xl border backdrop-blur-2xl p-4 space-y-3 font-sans animate-in fade-in slide-in-from-right-2 duration-150 bg-[#18191d]/98 border-[#2c2e36] text-neutral-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-200">
            Drawings & Layers Studio
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-neutral-800 text-neutral-400">
            {layers.length} layers
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Action Buttons: Add Layer, Add Group */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          onClick={() => handleAddLayer(null)}
          className="py-1.5 px-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow transition-all active:scale-98"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Layer</span>
        </button>
        <button
          onClick={() => handleAddGroup(null)}
          className="py-1.5 px-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 shadow transition-all active:scale-98"
        >
          <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
          <span>New Group</span>
        </button>
      </div>

      {/* Tree List */}
      <div className="max-h-[380px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-neutral-700">
        {visibleHierarchyList.map((item, visibleIdx) => {
          const rawIdx = layers.findIndex((l) => l.id === item.id);
          const isActive = item.id === activeLayerId;
          const isGroup = item.type === 'group';
          const depth = getNodeDepth(item);
          const { effVisible, effLocked } = getInheritedState(item);

          return (
            <div
              key={item.id}
              onClick={() => setActiveLayerId(item.id)}
              style={{ marginLeft: `${depth * 14}px` }}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                isActive
                  ? isGroup
                    ? 'bg-amber-950/40 border-amber-500/60 shadow-md ring-1 ring-amber-500/30'
                    : 'bg-cyan-950/40 border-cyan-500/60 shadow-md ring-1 ring-cyan-500/30'
                  : 'bg-neutral-900/90 border-neutral-800/90 hover:bg-neutral-850 hover:border-neutral-700'
              }`}
            >
              {/* Item Header Row */}
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {/* Expand / Collapse Chevron for Groups */}
                  {isGroup ? (
                    <button
                      onClick={(e) => handleToggleCollapse(item.id, e)}
                      className="p-0.5 rounded text-neutral-400 hover:text-white"
                    >
                      {item.collapsed ? (
                        <ChevronRight className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  ) : depth > 0 ? (
                    <CornerDownRight className="w-3 h-3 text-neutral-500 shrink-0" />
                  ) : null}

                  {/* Icon */}
                  {isGroup ? (
                    item.collapsed ? (
                      <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
                    )
                  ) : (
                    <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  )}

                  {/* Color Tag Indicator */}
                  {item.colorTag && (
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.colorTag }}
                    />
                  )}

                  {/* Title / Rename */}
                  {editingNameId === item.id ? (
                    <input
                      type="text"
                      value={nameInputValue}
                      autoFocus
                      onChange={(e) => setNameInputValue(e.target.value)}
                      onBlur={handleSaveRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename();
                        if (e.key === 'Escape') setEditingNameId(null);
                      }}
                      className="text-xs bg-neutral-950 border border-cyan-500 rounded px-1.5 py-0.5 text-white font-medium w-full focus:outline-none"
                    />
                  ) : (
                    <span
                      onDoubleClick={(e) => handleStartRename(item, e)}
                      className={`text-xs font-semibold truncate ${
                        isActive ? (isGroup ? 'text-amber-200' : 'text-cyan-200') : 'text-neutral-200'
                      }`}
                      title="Double-click to rename"
                    >
                      {item.name}
                    </span>
                  )}
                </div>

                {/* Top Action Icons */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Indent / Outdent buttons */}
                  {depth > 0 && (
                    <button
                      onClick={(e) => handleOutdent(item, e)}
                      title="Outdent (Move out of group)"
                      className="p-1 rounded text-neutral-500 hover:text-neutral-300"
                    >
                      <ArrowUp className="w-3 h-3 -rotate-45" />
                    </button>
                  )}
                  {rawIdx > 0 && (
                    <button
                      onClick={(e) => handleIndent(item, e)}
                      title="Indent (Move into preceding group)"
                      className="p-1 rounded text-neutral-500 hover:text-neutral-300"
                    >
                      <ArrowDown className="w-3 h-3 -rotate-45" />
                    </button>
                  )}

                  {/* Color Tag Selector */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenTagMenuId(openTagMenuId === item.id ? null : item.id);
                      }}
                      className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
                      title="Color Tag"
                    >
                      <Tag className="w-3 h-3" />
                    </button>
                    {openTagMenuId === item.id && (
                      <div className="absolute right-0 top-full mt-1 p-1 rounded-xl bg-neutral-950 border border-neutral-700 shadow-xl z-50 flex gap-1">
                        {COLOR_TAGS.map((t) => (
                          <button
                            key={t.name}
                            onClick={() => handleSetColorTag(item.id, t.color)}
                            className="w-4 h-4 rounded-full border border-neutral-700 hover:scale-110 transition-transform"
                            style={{ backgroundColor: t.color === 'transparent' ? '#262626' : t.color }}
                            title={t.name}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Visibility Toggle */}
                  <button
                    onClick={(e) => handleToggleVisibility(item.id, e)}
                    className={`p-1 rounded hover:bg-neutral-800 ${
                      item.visible && effVisible ? 'text-cyan-400' : 'text-neutral-500 opacity-50'
                    }`}
                    title="Toggle Visibility"
                  >
                    {item.visible && effVisible ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Lock Toggle */}
                  <button
                    onClick={(e) => handleToggleLock(item.id, e)}
                    className={`p-1 rounded hover:bg-neutral-800 ${
                      item.locked || effLocked ? 'text-rose-400' : 'text-neutral-400'
                    }`}
                    title="Toggle Lock"
                  >
                    {item.locked || effLocked ? (
                      <Lock className="w-3.5 h-3.5" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Duplicate */}
                  <button
                    onClick={(e) => handleDuplicate(item, e)}
                    className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
                    title="Duplicate"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete */}
                  {layers.length > 1 && (
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-rose-400"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Controls: Opacity & Blend Mode (when selected) */}
              {isActive && (
                <div className="mt-2 pt-2 border-t border-neutral-800/80 space-y-2 animate-in fade-in duration-100">
                  {/* Opacity Slider */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                      <span>Opacity</span>
                      <span className="text-cyan-300 font-bold">
                        {Math.round(item.opacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.01"
                      value={item.opacity}
                      onChange={(e) => handleSetOpacity(item.id, parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                  </div>

                  {/* Blend Mode & Add Child Shortcut */}
                  <div className="flex items-center justify-between gap-1.5 pt-0.5">
                    {/* Blend Mode Dropdown */}
                    <div className="relative flex-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenBlendMenuId(openBlendMenuId === item.id ? null : item.id);
                        }}
                        className="w-full py-1 px-2 rounded-lg bg-neutral-800/90 border border-neutral-700 text-[11px] font-semibold flex items-center justify-between text-neutral-200 hover:bg-neutral-750"
                      >
                        <span className="capitalize">{item.blendMode || 'normal'}</span>
                        <ChevronDown className="w-3 h-3 text-neutral-400" />
                      </button>

                      {openBlendMenuId === item.id && (
                        <div className="absolute left-0 bottom-full mb-1 w-48 rounded-xl bg-[#141519] border border-neutral-700 shadow-2xl p-1 z-50 space-y-0.5">
                          {BLEND_MODES.map((b) => (
                            <button
                              key={b.id}
                              onClick={() => handleSetBlendMode(item.id, b.id)}
                              className={`w-full px-2 py-1 rounded-lg text-left text-xs flex items-center justify-between transition-colors ${
                                item.blendMode === b.id
                                  ? 'bg-cyan-600/30 text-cyan-300 font-bold'
                                  : 'hover:bg-neutral-800 text-neutral-300'
                              }`}
                            >
                              <span>{b.label}</span>
                              {item.blendMode === b.id && <Check className="w-3 h-3 text-cyan-400" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* If group, button to add layer inside this group */}
                    {isGroup && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddLayer(item.id);
                        }}
                        className="py-1 px-2 rounded-lg bg-amber-600/30 border border-amber-500/40 text-amber-300 text-[11px] font-semibold flex items-center gap-1 hover:bg-amber-600/50"
                        title="Add child layer inside this group"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Inside</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const LayerPanel = React.memo(LayerPanelComponent);
