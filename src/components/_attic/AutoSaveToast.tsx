// src/components/AutoSaveToast.tsx
import React from 'react';
import { Check, RefreshCw, CloudCheck, HardDrive } from 'lucide-react';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved';

interface AutoSaveToastProps {
  status: AutoSaveStatus;
  message?: string;
  lastSaved?: Date | null;
  theme?: 'light' | 'dark';
}

export const AutoSaveToast: React.FC<AutoSaveToastProps> = ({
  status,
  message,
  lastSaved,
  theme = 'dark',
}) => {
  const isVisible = status === 'saving' || status === 'saved';

  return (
    <div
      id="mody-autosave-toast"
      aria-live="polite"
      className={`fixed bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 ease-out select-none pointer-events-none ${
        isVisible
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-3 scale-95'
      }`}
    >
      <div
        className={`px-3.5 py-1.5 rounded-full border shadow-2xl backdrop-blur-xl flex items-center gap-2 text-xs font-medium transition-colors duration-200 ${
          theme === 'light'
            ? 'bg-[#ffffff]/90 border-neutral-200 text-neutral-800 shadow-neutral-900/10'
            : 'bg-[#18191d]/90 border-[#2b2c32] text-[#e2e4ea] shadow-black/40'
        }`}
      >
        {status === 'saving' ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400 shrink-0" />
            <span className="tracking-wide">
              {message || 'Auto-saving...'}
            </span>
          </>
        ) : (
          <>
            <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Check className="w-3 h-3 stroke-[2.5]" />
            </div>
            <span className="text-neutral-300 dark:text-neutral-200">
              {message || 'All changes saved'}
            </span>
            {lastSaved && (
              <span className="text-[10px] text-neutral-500 font-mono pl-1 border-l border-neutral-700/60">
                just now
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
};
