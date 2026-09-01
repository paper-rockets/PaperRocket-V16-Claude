import React, { useState, useRef, useEffect } from 'react';
import { ReferenceImageItem } from '../types';
import {
  Image,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Move,
  RotateCw,
  Sliders,
  X,
  Upload,
  Clipboard,
  Pin,
  PinOff,
  Contrast,
  Sun,
  Layers,
  ZoomIn,
  ZoomOut,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface FloatingReferenceClipboardProps {
  isOpen: boolean;
  onClose: () => void;
  referenceImages: ReferenceImageItem[];
  setReferenceImages: React.Dispatch<React.SetStateAction<ReferenceImageItem[]>>;
  theme?: 'light' | 'dark';
}

export const FloatingReferenceClipboard: React.FC<FloatingReferenceClipboardProps> = ({
  isOpen,
  onClose,
  referenceImages,
  setReferenceImages,
  theme = 'dark',
}) => {
  if (!isOpen) return null;

  const [activeImageId, setActiveImageId] = useState<string | null>(
    referenceImages[0]?.id || null
  );
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [clipboardPosition, setClipboardPosition] = useState<{ x: number; y: number }>({
    x: 24,
    y: 80,
  });
  const [isDraggingHeader, setIsDraggingHeader] = useState<boolean>(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Global paste handler for images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!isOpen) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const url = event.target?.result as string;
              if (url) {
                addImageItem(url, `Blueprint ${referenceImages.length + 1}`);
              }
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, referenceImages]);

  // Window drag handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingHeader) return;
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      setClipboardPosition({
        x: Math.max(10, dragStartRef.current.startX + dx),
        y: Math.max(10, dragStartRef.current.startY + dy),
      });
    };

    const handleMouseUp = () => {
      setIsDraggingHeader(false);
    };

    if (isDraggingHeader) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingHeader]);

  const addImageItem = (url: string, name: string = 'Reference Image') => {
    const id = `ref_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newItem: ReferenceImageItem = {
      id,
      name,
      url,
      x: 10,
      y: 10,
      width: 240,
      height: 180,
      opacity: 0.75,
      rotation: 0,
      scale: 1.0,
      visible: true,
      locked: false,
      pinned: true,
      grayscale: false,
      invert: false,
    };

    setReferenceImages((prev) => [newItem, ...prev]);
    setActiveImageId(id);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        if (url) {
          addImageItem(url, file.name.replace(/\.[^/.]+$/, ''));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const activeItem = referenceImages.find((item) => item.id === activeImageId);

  const updateActiveItem = (updates: Partial<ReferenceImageItem>) => {
    if (!activeImageId) return;
    setReferenceImages((prev) =>
      prev.map((item) => (item.id === activeImageId ? { ...item, ...updates } : item))
    );
  };

  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReferenceImages((prev) => prev.filter((item) => item.id !== id));
    if (activeImageId === id) {
      const remaining = referenceImages.filter((item) => item.id !== id);
      setActiveImageId(remaining[0]?.id || null);
    }
  };

  return (
    <>
      {/* Floating Blueprint Pinboard Overlay on screen */}
      <div
        id="mody-floating-clipboard"
        style={{
          left: `${clipboardPosition.x}px`,
          top: `${clipboardPosition.y}px`,
        }}
        className="fixed z-40 select-none shadow-2xl rounded-2xl border backdrop-blur-2xl font-sans bg-[#141519]/95 border-[#2c2e36] text-neutral-200 w-80 sm:w-96 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header (Draggable Handle) */}
        <div
          onMouseDown={(e) => {
            if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.drag-handle')) {
              setIsDraggingHeader(true);
              dragStartRef.current = {
                mouseX: e.clientX,
                mouseY: e.clientY,
                startX: clipboardPosition.x,
                startY: clipboardPosition.y,
              };
            }
          }}
          className="drag-handle flex items-center justify-between p-3 border-b border-neutral-800 cursor-move bg-neutral-900/60 rounded-t-2xl"
        >
          <div className="flex items-center gap-2">
            <Clipboard className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-200">
              Floating 2D Blueprint Clipboard
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/40">
              {referenceImages.length} pins
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
            >
              {isMinimized ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <div className="p-3.5 space-y-3">
            {/* Quick Actions: Upload File, Paste Helper */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="py-1.5 px-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow transition-all active:scale-98"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Blueprint</span>
              </button>
              <button
                onClick={() => {
                  navigator.clipboard?.read().then((items) => {
                    for (const item of items) {
                      const imageType = item.types.find((t) => t.startsWith('image/'));
                      if (imageType) {
                        item.getType(imageType).then((blob) => {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const url = ev.target?.result as string;
                            if (url) addImageItem(url, `Pasted Clipboard ${referenceImages.length + 1}`);
                          };
                          reader.readAsDataURL(blob);
                        });
                      }
                    }
                  });
                }}
                className="py-1.5 px-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <Clipboard className="w-3.5 h-3.5 text-amber-400" />
                <span>Paste (Ctrl+V)</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Thumbnail Pin Strip */}
            {referenceImages.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  Pinned Moodboards & References
                </span>
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-neutral-700">
                  {referenceImages.map((img) => (
                    <div
                      key={img.id}
                      onClick={() => setActiveImageId(img.id)}
                      className={`relative shrink-0 w-16 h-14 rounded-lg overflow-hidden border cursor-pointer group transition-all ${
                        activeImageId === img.id
                          ? 'border-cyan-400 ring-2 ring-cyan-500/40 scale-105'
                          : 'border-neutral-800 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={img.url}
                        alt={img.name}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={(e) => handleDeleteItem(img.id, e)}
                        className="absolute top-0.5 right-0.5 p-0.5 rounded bg-black/70 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Selected Reference Controls & Live Preview Overlay */}
            {activeItem ? (
              <div className="space-y-2.5 pt-1 border-t border-neutral-800">
                {/* Image Live Tracing Preview Box */}
                <div className="relative w-full h-44 rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800 flex items-center justify-center p-1">
                  <img
                    src={activeItem.url}
                    alt={activeItem.name}
                    style={{
                      opacity: activeItem.opacity,
                      transform: `scale(${activeItem.scale}) rotate(${activeItem.rotation}deg)`,
                      filter: `${activeItem.grayscale ? 'grayscale(100%)' : ''} ${
                        activeItem.invert ? 'invert(100%)' : ''
                      }`,
                    }}
                    className="max-w-full max-h-full object-contain transition-transform duration-75 pointer-events-none"
                  />
                  <div className="absolute bottom-1.5 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-mono text-cyan-300 border border-cyan-500/30">
                    {Math.round(activeItem.opacity * 100)}% opacity • {activeItem.rotation}°
                  </div>
                </div>

                {/* Opacity Slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-300 font-medium flex items-center gap-1">
                      <Sun className="w-3 h-3 text-cyan-400" />
                      <span>Blueprint Overlay Opacity</span>
                    </span>
                    <span className="font-mono text-xs text-cyan-300 font-bold">
                      {Math.round(activeItem.opacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1.0"
                    step="0.05"
                    value={activeItem.opacity}
                    onChange={(e) =>
                      updateActiveItem({ opacity: parseFloat(e.target.value) })
                    }
                    className="w-full accent-cyan-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Zoom & Rotation Controls */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Zoom Scale */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-neutral-400">
                      <span>Zoom Scale</span>
                      <span className="font-mono text-cyan-300 font-bold">
                        {activeItem.scale.toFixed(1)}x
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          updateActiveItem({ scale: Math.max(0.2, activeItem.scale - 0.2) })
                        }
                        className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                      >
                        <ZoomOut className="w-3 h-3" />
                      </button>
                      <input
                        type="range"
                        min="0.2"
                        max="3.0"
                        step="0.1"
                        value={activeItem.scale}
                        onChange={(e) =>
                          updateActiveItem({ scale: parseFloat(e.target.value) })
                        }
                        className="w-full accent-cyan-500 h-1 bg-neutral-800 rounded-lg cursor-pointer"
                      />
                      <button
                        onClick={() =>
                          updateActiveItem({ scale: Math.min(3.0, activeItem.scale + 0.2) })
                        }
                        className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                      >
                        <ZoomIn className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Rotation */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-neutral-400">
                      <span>Rotation</span>
                      <span className="font-mono text-purple-300 font-bold">
                        {activeItem.rotation}°
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          updateActiveItem({ rotation: (activeItem.rotation + 90) % 360 })
                        }
                        className="w-full py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-[11px] font-semibold flex items-center justify-center gap-1 text-purple-300"
                      >
                        <RotateCw className="w-3 h-3" />
                        <span>+90°</span>
                      </button>
                      <button
                        onClick={() => updateActiveItem({ rotation: 0 })}
                        className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-[10px] text-neutral-400"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>

                {/* Filter Toggles: Grayscale, Invert, Lock, Pin */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <button
                    onClick={() =>
                      updateActiveItem({ grayscale: !activeItem.grayscale })
                    }
                    className={`py-1 px-2 rounded-lg text-[11px] font-semibold border flex items-center justify-center gap-1 ${
                      activeItem.grayscale
                        ? 'bg-cyan-600/30 border-cyan-500 text-cyan-300'
                        : 'bg-neutral-850 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <Contrast className="w-3 h-3" />
                    <span>Grayscale</span>
                  </button>

                  <button
                    onClick={() => updateActiveItem({ invert: !activeItem.invert })}
                    className={`py-1 px-2 rounded-lg text-[11px] font-semibold border flex items-center justify-center gap-1 ${
                      activeItem.invert
                        ? 'bg-amber-600/30 border-amber-500 text-amber-300'
                        : 'bg-neutral-850 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <Contrast className="w-3 h-3 rotate-180" />
                    <span>Invert</span>
                  </button>

                  <button
                    onClick={() => updateActiveItem({ pinned: !activeItem.pinned })}
                    className={`py-1 px-2 rounded-lg text-[11px] font-semibold border flex items-center justify-center gap-1 ${
                      activeItem.pinned
                        ? 'bg-purple-600/30 border-purple-500 text-purple-300'
                        : 'bg-neutral-850 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {activeItem.pinned ? (
                      <Pin className="w-3 h-3" />
                    ) : (
                      <PinOff className="w-3 h-3" />
                    )}
                    <span>{activeItem.pinned ? 'Pinned' : 'Float'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-neutral-800 rounded-xl space-y-1">
                <Image className="w-6 h-6 text-neutral-600 mx-auto" />
                <p className="text-xs text-neutral-400 font-medium">No Blueprints Pinned</p>
                <p className="text-[10px] text-neutral-500">
                  Upload an image or press Ctrl+V to paste reference moodboards
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
