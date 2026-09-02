import { invoke } from '@tauri-apps/api/core';
import { save, open } from '@tauri-apps/plugin-dialog';
import { writeFile, readFile } from '@tauri-apps/plugin-fs';

export interface DeviceHardwareReport {
  platform: string;
  arch: string;
  os_version: string;
  is_mobile: boolean;
  hardware_concurrency: number;
  has_s_pen_support: boolean;
}

export interface FileFilterOption {
  name: string;
  extensions: string[];
}

/**
 * Universal Tauri 2.0 Native Hardware & File System Bridge
 * Automatically detects whether the application is running inside Tauri native runtime
 * or a standard web browser, and provides graceful transparent fallbacks.
 */
export class TauriBridge {
  /**
   * Check if running in native Tauri desktop/mobile runtime
   */
  public static isTauri(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  }

  /**
   * Retrieves native device hardware & platform telemetry
   */
  public static async getHardwareReport(): Promise<DeviceHardwareReport> {
    if (this.isTauri()) {
      try {
        return await invoke<DeviceHardwareReport>('get_device_hardware_info');
      } catch (err) {
        console.warn('[TauriBridge] Native hardware query failed, using web fallback:', err);
      }
    }

    // Web Fallback
    const ua = navigator.userAgent;
    const isMobile = /Android|iPhone|iPad|iPod|Tablet/i.test(ua);
    return {
      platform: navigator.platform || 'web',
      arch: 'web',
      os_version: ua,
      is_mobile: isMobile,
      hardware_concurrency: navigator.hardwareConcurrency || 4,
      has_s_pen_support: isMobile && /Samsung|SM-/i.test(ua),
    };
  }

  /**
   * Native file save dialog + direct filesystem write
   */
  public static async saveModelFile(
    filename: string,
    data: Uint8Array | ArrayBuffer | Blob | string,
    filters: FileFilterOption[] = [
      { name: '3D Models', extensions: ['glb', 'gltf', 'obj', 'stl', '3mf'] },
      { name: 'All Files', extensions: ['*'] },
    ]
  ): Promise<string | null> {
    if (this.isTauri()) {
      try {
        const selectedPath = await save({
          defaultPath: filename,
          filters,
        });

        if (!selectedPath) return null;

        let uint8Data: Uint8Array;
        if (data instanceof Uint8Array) {
          uint8Data = data;
        } else if (data instanceof ArrayBuffer) {
          uint8Data = new Uint8Array(data);
        } else if (data instanceof Blob) {
          const buffer = await data.arrayBuffer();
          uint8Data = new Uint8Array(buffer);
        } else {
          uint8Data = new TextEncoder().encode(data);
        }

        await writeFile(selectedPath, uint8Data);
        return selectedPath;
      } catch (err) {
        console.warn('[TauriBridge] Native save failed, falling back to web download:', err);
      }
    }

    // Web standard blob download fallback
    let blob: Blob;
    if (data instanceof Blob) {
      blob = data;
    } else if (typeof data === 'string') {
      blob = new Blob([data], { type: 'application/json' });
    } else {
      blob = new Blob([data as any], { type: 'application/octet-stream' });
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return filename;
  }

  /**
   * Native file open dialog + direct binary read
   */
  public static async openModelFile(
    filters: FileFilterOption[] = [
      { name: '3D Models', extensions: ['glb', 'gltf', 'obj', 'fbx', 'stl', '3mf', 'ply', 'dae'] },
      { name: 'All Files', extensions: ['*'] },
    ]
  ): Promise<{ name: string; path: string; data: ArrayBuffer } | null> {
    if (this.isTauri()) {
      try {
        const selectedPath = await open({
          multiple: false,
          directory: false,
          filters,
        });

        if (!selectedPath || typeof selectedPath !== 'string') return null;

        const bytes = await readFile(selectedPath);
        const filename = selectedPath.split(/[\\/]/).pop() || 'model.glb';

        return {
          name: filename,
          path: selectedPath,
          data: bytes.buffer as ArrayBuffer,
        };
      } catch (err) {
        console.warn('[TauriBridge] Native open failed, falling back to web file picker:', err);
      }
    }

    // Web input fallback
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = filters
        .flatMap((f) => f.extensions.map((ext) => (ext === '*' ? '*/*' : `.${ext}`)))
        .join(',');

      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        const data = await file.arrayBuffer();
        resolve({
          name: file.name,
          path: file.name,
          data,
        });
      };
      input.click();
    });
  }

  /**
   * Native Tactile Haptics (for dial rotation, stylus clicks, & mode snapping)
   */
  public static triggerHaptic(pattern: 'light' | 'medium' | 'heavy' | 'selection' | 'success'): void {
    if (this.isTauri()) {
      try {
        invoke('trigger_native_haptic', { pattern }).catch(() => {});
        return;
      } catch (_) {}
    }

    // Web Vibration API fallback
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        switch (pattern) {
          case 'light':
          case 'selection':
            navigator.vibrate(8);
            break;
          case 'medium':
            navigator.vibrate(18);
            break;
          case 'heavy':
            navigator.vibrate(35);
            break;
          case 'success':
            navigator.vibrate([15, 30, 25]);
            break;
        }
      }
    } catch (_) {}
  }
}
