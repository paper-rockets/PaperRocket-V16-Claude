import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  Wifi,
  ShieldCheck,
  ShieldAlert,
  Maximize,
  X,
  Layers,
  HelpCircle,
} from 'lucide-react';

interface MobileConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileConnectModal: React.FC<MobileConnectModalProps> = ({ isOpen, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  const [customIp, setCustomIp] = useState('');
  const [isSecure, setIsSecure] = useState(false);
  const [touchInfo, setTouchInfo] = useState<{
    hasTouch: boolean;
    maxTouchPoints: number;
    dpr: number;
    width: number;
    height: number;
  }>({
    hasTouch: false,
    maxTouchPoints: 0,
    dpr: 1,
    width: 0,
    height: 0,
  });

  useEffect(() => {
    if (!isOpen) return;

    const href = typeof window !== 'undefined' ? window.location.href : 'http://localhost:3000';
    setCurrentUrl(href);
    setIsSecure(typeof window !== 'undefined' ? window.isSecureContext : false);

    if (typeof window !== 'undefined') {
      setTouchInfo({
        hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        maxTouchPoints: navigator.maxTouchPoints || 0,
        dpr: window.devicePixelRatio || 1,
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
  }, [isOpen]);

  // Render QR Code onto canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const urlToEncode = customIp.trim() ? customIp.trim() : currentUrl;
    if (!urlToEncode) return;

    QRCode.toCanvas(
      canvasRef.current,
      urlToEncode,
      {
        width: 220,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      },
      (error) => {
        if (error) console.error('Error generating QR code:', error);
      }
    );
  }, [isOpen, currentUrl, customIp]);

  const handleCopy = async () => {
    const urlToCopy = customIp.trim() ? customIp.trim() : currentUrl;
    try {
      await navigator.clipboard.writeText(urlToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Failed to copy to clipboard', err);
    }
  };

  const handleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="relative w-full max-w-lg bg-[#141519] border border-[#2b2c32] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[#e2e4ea] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-[#18191d]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-white">Mobile Device Testing</h2>
              <p className="text-[11px] text-zinc-400">Connect your smartphone or tablet over local Wi-Fi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          
          {/* QR Code and Quick Connect Card */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800">
            <div className="bg-white p-2.5 rounded-2xl shadow-xl shrink-0 flex items-center justify-center">
              <canvas ref={canvasRef} className="rounded-lg w-[180px] h-[180px]" />
            </div>

            <div className="flex-1 space-y-2.5 text-center sm:text-left w-full">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
                <Wifi className="w-3.5 h-3.5" />
                <span>LAN Multi-Device Ready</span>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-zinc-200">Point phone camera to scan</p>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Open your iOS Camera or Android Google Lens to launch directly in your mobile browser.
                </p>
              </div>

              {/* URL input / copy */}
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  value={customIp || currentUrl}
                  onChange={(e) => setCustomIp(e.target.value)}
                  placeholder="http://192.168.0.x:3000"
                  className="flex-1 bg-black/50 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-[11px] font-mono text-zinc-300 focus:outline-none focus:border-blue-500 transition-colors truncate"
                  title="Testing URL"
                />
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium transition-colors shrink-0 shadow-lg shadow-blue-500/20"
                  title="Copy URL"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Gestures & Features Guide */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1.5">
              <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span>Touch Drawing & Sculpting</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Use 1 finger to paint strokes or deform meshes. Apple Pencil and active styluses support live pressure sensitivity.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1.5">
              <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
                <div className="w-2 h-2 rounded-full bg-indigo-400" />
                <span>Multi-Touch Orbit & Zoom</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Use 2 fingers to rotate the 3D model, pinch to zoom in/out, and two-finger drag to pan the camera viewport.
              </p>
            </div>
          </div>

          {/* Diagnostics / Secure Context */}
          <div className="p-3 rounded-xl bg-black/40 border border-zinc-800/80 space-y-2 text-[11px]">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="font-medium text-zinc-300">Device Environment</span>
              <div className="flex items-center gap-1">
                {isSecure ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" /> Secure Context (HTTPS)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-400">
                    <ShieldAlert className="w-3.5 h-3.5" /> HTTP Mode
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-zinc-400 pt-1">
              <div>
                <span className="text-zinc-500">Touch Support: </span>
                <span className="text-zinc-300">{touchInfo.hasTouch ? `Yes (${touchInfo.maxTouchPoints} pts)` : 'No'}</span>
              </div>
              <div>
                <span className="text-zinc-500">Device Pixel Ratio: </span>
                <span className="text-zinc-300">{touchInfo.dpr}x</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-zinc-500">Viewport: </span>
                <span className="text-zinc-300">{touchInfo.width} × {touchInfo.height}</span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              onClick={handleFullscreen}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
            >
              <Maximize className="w-3.5 h-3.5 text-zinc-400" />
              <span>Toggle Fullscreen</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
            >
              Done
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
