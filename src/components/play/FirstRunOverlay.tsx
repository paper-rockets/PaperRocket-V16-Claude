import React, { useState, useCallback } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { getHasOnboarded, setHasOnboarded, useHasOnboarded } from '../../core/uiModeStore';

export interface FirstRunOverlayProps {
  onOpenToybox: () => void;
  theme?: 'light' | 'dark';
}

/**
 * Three-card first-run overlay. Shown once on app load.
 *
 * Card 1: "Your screen" - a labelled map of the four zones
 * Card 2: "Fingers move. Pen draws." - the most important, shows gestures
 * Card 3: "Pick something to colour" - calls onOpenToybox and sets hasOnboarded
 *
 * Skippable at any point. Calling setHasOnboarded(true) happens on finish or skip.
 */
export const FirstRunOverlay: React.FC<FirstRunOverlayProps> = ({ onOpenToybox, theme = 'dark' }) => {
  const hasOnboarded = useHasOnboarded();
  const [currentCard, setCurrentCard] = useState(0);

  const isLight = theme === 'light';
  const bgColor = isLight ? 'bg-white' : 'bg-[#0f1117]';
  const textColor = isLight ? 'text-neutral-900' : 'text-white';
  const accentColor = isLight ? 'bg-sky-100 text-sky-900' : 'bg-sky-900/30 text-sky-100';
  const subtleColor = isLight ? 'text-neutral-600' : 'text-neutral-400';

  const handleSkip = useCallback(() => {
    setHasOnboarded(true);
  }, []);

  const handleNext = useCallback(() => {
    if (currentCard < 2) {
      setCurrentCard(currentCard + 1);
    } else {
      setHasOnboarded(true);
      onOpenToybox();
    }
  }, [currentCard, onOpenToybox]);

  // Render nothing if already onboarded
  if (hasOnboarded) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4">
      <div
        className={`relative w-full max-w-md mx-4 rounded-3xl shadow-2xl flex flex-col overflow-hidden ${bgColor} motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300 motion-safe:zoom-in-95`}
        style={{
          maxHeight: 'min(90vh, 560px)',
          paddingTop: 'max(env(safe-area-inset-top), 16px)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
        }}
      >
        {/* Close button (top right) */}
        <button
          type="button"
          onClick={handleSkip}
          className={`absolute top-4 right-4 w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95 z-10 ${
            isLight ? 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200' : 'bg-neutral-800 text-neutral-100 hover:bg-neutral-700'
          }`}
          aria-label="Skip tutorial"
          title="Skip"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable body — cards only */}
        <div className="flex flex-col gap-5 p-6 overflow-y-auto">
          {currentCard === 0 && <Card1YourScreen isLight={isLight} textColor={textColor} subtleColor={subtleColor} />}
          {currentCard === 1 && <Card2FingersPen isLight={isLight} textColor={textColor} subtleColor={subtleColor} />}
          {currentCard === 2 && <Card3PickSomething isLight={isLight} textColor={textColor} accentColor={accentColor} />}
        </div>

        {/* Fixed footer — always visible, never scrolls */}
        <div
          className={`flex items-center justify-between gap-3 px-6 py-4 border-t ${
            isLight ? 'border-neutral-200 bg-white/50' : 'border-neutral-800 bg-[#0f1117]/50'
          }`}
        >
          <button
            type="button"
            onClick={handleSkip}
            className={`min-h-11 px-4 rounded-full font-medium text-sm transition-all active:scale-95 ${
              isLight ? 'text-neutral-600 hover:bg-neutral-100' : 'text-neutral-400 hover:bg-neutral-800'
            }`}
          >
            Skip
          </button>

          <div className="flex items-center gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === currentCard
                    ? isLight
                      ? 'w-8 bg-sky-500'
                      : 'w-8 bg-sky-400'
                    : isLight
                      ? 'w-2 bg-neutral-300'
                      : 'w-2 bg-neutral-700'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleNext}
            className={`h-11 w-11 rounded-full flex items-center justify-center font-medium transition-all active:scale-95 ${
              isLight ? 'bg-sky-500 text-white hover:bg-sky-600' : 'bg-sky-500 text-white hover:bg-sky-600'
            }`}
            aria-label={currentCard === 2 ? 'Open the Toybox' : 'Next'}
          >
            {currentCard === 2 ? <X className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Card 1: "Your screen" — a labelled map of the four zones.
 * Zone A: top strip (name, undo, redo)
 * Zone B: left rail (four tools)
 * Zone C: bottom right (dial for moving things)
 * Zone D: bottom middle (colour, size, effects)
 */
function Card1YourScreen({
  isLight,
  textColor,
  subtleColor,
}: {
  isLight: boolean;
  textColor: string;
  subtleColor: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className={`text-2xl font-bold ${textColor}`}>Your screen</h2>

      <svg viewBox="0 0 320 480" className="w-full border rounded-lg max-h-[220px]" style={{ borderColor: isLight ? '#e5e7eb' : '#404854' }}>
        {/* Screen background */}
        <rect width="320" height="480" fill={isLight ? '#f9fafb' : '#1a1d26'} />

        {/* Zone A: Top strip */}
        <rect x="0" y="0" width="320" height="50" fill={isLight ? '#eff6ff' : '#0c2a4d'} opacity="0.6" />
        <text x="160" y="32" textAnchor="middle" className={`text-xs font-bold ${isLight ? 'fill-sky-900' : 'fill-sky-100'}`}>
          Zone A: Name, Undo, Redo
        </text>

        {/* Zone B: Left rail */}
        <rect x="0" y="50" width="45" height="380" fill={isLight ? '#f0fdf4' : '#0d2818'} opacity="0.6" />
        <text x="22" y="250" textAnchor="middle" className={`text-[10px] font-bold ${isLight ? 'fill-green-900' : 'fill-green-100'}`}>
          Zone B
        </text>
        <text x="22" y="263" textAnchor="middle" className={`text-[10px] font-bold ${isLight ? 'fill-green-900' : 'fill-green-100'}`}>
          Tools
        </text>

        {/* Zone D: Bottom middle */}
        <rect x="45" y="400" width="230" height="80" fill={isLight ? '#fef3c7' : '#33270d'} opacity="0.6" />
        <text x="160" y="448" textAnchor="middle" className={`text-[10px] font-bold ${isLight ? 'fill-amber-900' : 'fill-amber-100'}`}>
          Zone D: Colour, Size, Effects
        </text>

        {/* Zone C: Bottom right */}
        <circle cx="275" cy="440" r="30" fill={isLight ? '#fce7f3' : '#4a1d3e'} opacity="0.6" />
        <text x="275" y="450" textAnchor="middle" className={`text-[9px] font-bold ${isLight ? 'fill-pink-900' : 'fill-pink-100'}`}>
          Zone C
        </text>

        {/* Canvas area label */}
        <text x="160" y="220" textAnchor="middle" className={`text-xs font-bold ${isLight ? 'fill-neutral-600' : 'fill-neutral-400'}`}>
          Canvas
        </text>
      </svg>

      <p className={`text-sm leading-relaxed ${subtleColor}`}>
        Four zones work together. Top shows what you are colouring. Left has your tools. Bottom shows colours and effects.
      </p>
    </div>
  );
}

/**
 * Card 2: "Fingers move. Pen draws." — THE MOST IMPORTANT CARD.
 * Shows the three finger gestures and pen drawing in a big, visual way.
 */
function Card2FingersPen({
  isLight,
  textColor,
  subtleColor,
}: {
  isLight: boolean;
  textColor: string;
  subtleColor: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className={`text-2xl font-bold ${textColor}`}>Fingers move. Pen draws.</h2>

      <div className="space-y-3">
        {/* 1 finger = spin */}
        <div className="p-3 rounded-xl border" style={{ borderColor: isLight ? '#e5e7eb' : '#404854', backgroundColor: isLight ? '#f9fafb' : '#1a1d26' }}>
          <div className={`font-bold text-sm mb-1 ${textColor}`}>1 finger</div>
          <div className={`text-sm ${subtleColor}`}>Spin around</div>
        </div>

        {/* 2 fingers = slide and zoom */}
        <div className="p-3 rounded-xl border" style={{ borderColor: isLight ? '#e5e7eb' : '#404854', backgroundColor: isLight ? '#f9fafb' : '#1a1d26' }}>
          <div className={`font-bold text-sm mb-1 ${textColor}`}>2 fingers</div>
          <div className={`text-sm ${subtleColor}`}>Slide and zoom</div>
        </div>

        {/* 3 fingers = flat / 3D */}
        <div className="p-3 rounded-xl border" style={{ borderColor: isLight ? '#e5e7eb' : '#404854', backgroundColor: isLight ? '#f9fafb' : '#1a1d26' }}>
          <div className={`font-bold text-sm mb-1 ${textColor}`}>3 fingers</div>
          <div className={`text-sm ${subtleColor}`}>Switch flat or 3D view</div>
        </div>

        {/* Pen = draws */}
        <div className="p-3 rounded-xl border border-sky-400 bg-sky-50 dark:bg-sky-950/30">
          <div className={`font-bold text-sm mb-1 ${textColor}`}>The pen</div>
          <div className={`text-sm ${textColor}`}>Draws</div>
        </div>
      </div>

      <p className={`text-xs leading-relaxed ${subtleColor}`}>
        No pen? Turn on Finger Draw in Settings and your finger draws instead.
      </p>
    </div>
  );
}

/**
 * Card 3: "Pick something to colour" — the call to action.
 * A big button to open the Toybox.
 */
function Card3PickSomething({
  isLight,
  textColor,
  accentColor,
}: {
  isLight: boolean;
  textColor: string;
  accentColor: string;
}) {
  return (
    <div className="flex flex-col gap-4 items-center">
      <h2 className={`text-2xl font-bold ${textColor}`}>Pick something to colour</h2>

      <svg viewBox="0 0 200 200" className="w-40 h-40 max-h-[160px]">
        {/* Frame background */}
        <rect width="200" height="200" fill={isLight ? '#f9fafb' : '#1a1d26'} rx="12" />

        {/* Simple "model" representation */}
        <g opacity="0.8">
          {/* Sphere-like shape */}
          <circle cx="100" cy="90" r="50" fill={isLight ? '#dbeafe' : '#0c2a4d'} />
          <circle cx="120" cy="70" r="15" fill={isLight ? '#7dd3fc' : '#06b6d4'} opacity="0.6" />

          {/* A simple cube below */}
          <rect x="50" y="130" width="40" height="40" fill={isLight ? '#bfdbfe' : '#1e3a8a'} />
          <polygon points="90,130 110,115 110,155 90,170" fill={isLight ? '#93c5fd' : '#3730a3'} />
        </g>
      </svg>

      <p className={`text-sm text-center leading-relaxed ${textColor}`}>
        The Toybox is full of shapes, animals, and objects to colour.
      </p>
    </div>
  );
}
