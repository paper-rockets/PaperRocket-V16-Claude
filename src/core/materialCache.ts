import * as THREE from 'three';
import { BrushSettings, MaterialType, PatternType, LayerBlendMode } from '../types';
import {
  AnimatedShaderEffect,
  EFFECT_SPEEDS,
  STANDARD_VERTEX_SHADER,
  getEffectFragmentShader,
  globalShaderRegistry,
} from './animatedShaders';

/**
 * Normalizes any hex or color string to valid lowercase 6-digit #rrggbb
 */
export function normalizeHexColor(hex: string | undefined | null, fallback: string = '#38bdf8'): string {
  if (!hex || typeof hex !== 'string') return fallback;
  let clean = hex.trim().toLowerCase();
  if (!clean.startsWith('#')) {
    clean = '#' + clean;
  }
  // Expand 3-character shorthand #rgb to #rrggbb
  if (/^#[0-9a-f]{3}$/.test(clean)) {
    clean = '#' + clean[1] + clean[1] + clean[2] + clean[2] + clean[3] + clean[3];
  }
  if (/^#[0-9a-f]{6}$/.test(clean)) {
    return clean;
  }
  return fallback;
}

/**
 * Material Cache & Shader Pipeline Engine
 *
 * Implements strict key isolation and contracts for:
 * - Shadeless / Flat Paint: Unlit MeshBasicMaterial immune to scene lighting with negative polygon offset
 * - Shaded / Lit PBR: MeshStandardMaterial responding dynamically to lights, roughness & metalness
 * - Glow / Bloom: Emissive MeshBasicMaterial with HDR boost (2.5x) for bloom passes
 * - Cutout Mask: Spatial negative-space depth mask punching holes through overlapping 3D curves
 * - Animated FX Shaders: 27 animated GLSL shaders with Oklab perceptual color space blending
 * - Model Canvas Materials: Sculptor clay (0xcdd3dc) and textured mesh with positive depth bias (+2.0)
 */
export class MaterialCache {
  private static fallbackWhiteTexture: THREE.CanvasTexture | null = null;
  private cache: Map<string, THREE.Material> = new Map();

  /**
   * Get or create a compliant stroke material with aggressive depth bias and stencil testing
   */
  public getStrokeMaterial(
    settings: BrushSettings,
    isOnModel: boolean = true,
    layerOpacity: number = 1.0,
    layerBlendMode: LayerBlendMode = 'normal'
  ): THREE.Material {
    const effectiveOpacity = Math.max(0.01, Math.min(1.0, (settings.opacity ?? 1.0) * layerOpacity));
    const modeKey = isOnModel ? 'm1' : 'm0';
    const stencilKey = settings.stencilMasking && isOnModel ? 's1' : 's0';
    const matType: MaterialType = settings.materialType || 'shaded';
    const patType: PatternType = settings.patternType || 'none';
    const patScale = settings.patternScale ?? 4.0;
    const patInt = settings.patternIntensity ?? 0.8;
    const patAng = settings.patternAngle ?? 45;
    const patContr = settings.patternContrast ?? 1.0;
    const effect: AnimatedShaderEffect = settings.shaderEffect || 'fire';

    const validColor = normalizeHexColor(settings.color, '#38bdf8');
    const shaderKey = settings.customShader?.id || settings.customShader?.name || effect;
    const matcapKey = settings.matcapUrl ? settings.matcapUrl.slice(0, 32) : (settings.matcapTexture ? 'has_tex' : 'no_matcap');

    // Strict isolation key
    const key = `${matType}|${shaderKey}|${matcapKey}|${validColor}|o${effectiveOpacity.toFixed(3)}|r${(settings.roughness ?? 0.35).toFixed(2)}|m${(settings.metalness ?? 0.15).toFixed(2)}|e${(settings.emissiveIntensity ?? 0).toFixed(2)}|${modeKey}|${stencilKey}|p_${patType}_${patScale}_${patInt}_${patAng}_${patContr}|b_${layerBlendMode}`;

    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const color = new THREE.Color(validColor);
    const isOpaque = effectiveOpacity >= 0.99 && layerBlendMode === 'normal';

    let material: THREE.Material;

    if (matType === 'cutout') {
      // 1. Cutout: Spatial negative-space material punching through overlapping 3D curves & depth
      material = new THREE.MeshBasicMaterial({
        colorWrite: false,
        depthWrite: true,
        depthTest: true,
        transparent: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -4.0,
        polygonOffsetUnits: -4.0,
      });
    } else if (matType === 'glow') {
      // 2. Emissive (Glow): Self-illuminated HDR emission for bloom post-processing passes
      const glowIntensity = Math.max(1.5, (settings.emissiveIntensity || 1.0) * 2.5);
      const glowColor = color.clone().multiplyScalar(glowIntensity);
      material = new THREE.MeshBasicMaterial({
        color: glowColor,
        transparent: !isOpaque,
        opacity: effectiveOpacity,
        side: THREE.DoubleSide,
        depthTest: true,
        depthWrite: isOpaque,
        polygonOffset: true,
        polygonOffsetFactor: -3.0,
        polygonOffsetUnits: -3.0,
        toneMapped: false,
      });
    } else if (matType === 'matcap') {
      // 3. MatCap Material: Dynamic sphere-mapped texture lighting
      let matcapTex = settings.matcapTexture;
      if (!matcapTex && settings.matcapUrl) {
        try {
          const loader = new THREE.TextureLoader();
          matcapTex = loader.load(settings.matcapUrl);
        } catch (_) {}
      }
      material = new THREE.MeshMatcapMaterial({
        color: color,
        matcap: matcapTex || null,
        transparent: !isOpaque,
        opacity: effectiveOpacity,
        side: THREE.DoubleSide,
        depthTest: true,
        depthWrite: isOpaque,
        polygonOffset: true,
        polygonOffsetFactor: -3.0,
        polygonOffsetUnits: -3.0,
      });
    } else if (matType === 'animated_fx') {
      // 4. Animated FX Shader Material (Custom GLSL or standard 27 presets)
      if (settings.customShader && settings.customShader.fragmentShader) {
        let boundTex = settings.matcapTexture || null;
        if (!boundTex && settings.matcapUrl) {
          try {
            const loader = new THREE.TextureLoader();
            boundTex = loader.load(settings.matcapUrl);
          } catch (_) {}
        }
        
        // Use a static 2x2 white canvas texture fallback if no texture is provided to safely satisfy sampler2D uniforms
        if (!boundTex) {
          if (!MaterialCache.fallbackWhiteTexture) {
            const canvas = document.createElement('canvas');
            canvas.width = 2;
            canvas.height = 2;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, 2, 2);
            }
            MaterialCache.fallbackWhiteTexture = new THREE.CanvasTexture(canvas);
          }
          boundTex = MaterialCache.fallbackWhiteTexture;
        }

        const customUniforms: Record<string, any> = {
          uColor: { value: new THREE.Vector3(color.r, color.g, color.b) },
          u_color: { value: new THREE.Vector3(color.r, color.g, color.b) },
          u_tint: { value: new THREE.Vector3(color.r, color.g, color.b) },
          uOpacity: { value: effectiveOpacity },
          u_opacity: { value: effectiveOpacity },
          uTime: { value: performance.now() * 0.001 },
          u_time: { value: performance.now() * 0.001 },
          time: { value: performance.now() * 0.001 },
          iTime: { value: performance.now() * 0.001 },
          uSpeed: { value: 1.0 },
          uScale: { value: 3.5 },
          u_steps: { value: 4.0 },
          u_rim_power: { value: 3.0 },
          u_roughness: { value: settings.roughness ?? 0.5 },
          u_light_dir: { value: new THREE.Vector3(1, 2, 1).normalize() },
          uLightDirection: { value: new THREE.Vector3(1, 2, 1).normalize() },
          uSunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
          uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
          u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
          resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
          iResolution: { value: new THREE.Vector3(window.innerWidth, window.innerHeight, 1.0) },
          u_mouse: { value: new THREE.Vector2(0, 0) },
          iMouse: { value: new THREE.Vector4(0, 0, 0, 0) },
          u_matcap: { value: boundTex },
          tBackground: { value: boundTex },
          u_texture: { value: boundTex },
          iChannel0: { value: boundTex },
          tDiffuse: { value: boundTex },
        };
        const shaderMat = new THREE.ShaderMaterial({
          uniforms: customUniforms,
          vertexShader: settings.customShader.vertexShader || STANDARD_VERTEX_SHADER,
          fragmentShader: settings.customShader.fragmentShader,
          transparent: !isOpaque || effectiveOpacity < 1.0,
          depthWrite: isOpaque,
          depthTest: true,
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: -3.0,
          polygonOffsetUnits: -3.0,
        });
        globalShaderRegistry.register(shaderMat);
        material = shaderMat;
      } else {
        const speed = EFFECT_SPEEDS[effect] || 1.0;
        const uniforms = {
          uColor: { value: new THREE.Vector3(color.r, color.g, color.b) },
          uOpacity: { value: effectiveOpacity },
          uTime: { value: performance.now() * 0.001 },
          uSpeed: { value: speed },
          uScale: { value: 3.5 },
          uLightDirection: { value: new THREE.Vector3(1, 2, 1).normalize() },
          uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        };

        const shaderMat = new THREE.ShaderMaterial({
          uniforms,
          vertexShader: STANDARD_VERTEX_SHADER,
          fragmentShader: getEffectFragmentShader(effect),
          defines: {
            [`EFFECT_${effect}`]: '',
          },
          transparent: !isOpaque || effectiveOpacity < 1.0,
          depthWrite: isOpaque,
          depthTest: true,
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: -3.0,
          polygonOffsetUnits: -3.0,
          toneMapped: true,
        });

        globalShaderRegistry.register(shaderMat);
        material = shaderMat;
      }
    } else if (matType === 'shaded') {
      // 4. PBR (Lit / Shaded): Dynamic Physically-Based Material responding to scene lighting, shadows & reflections
      material = new THREE.MeshStandardMaterial({
        color: color,
        roughness: Math.max(0.05, Math.min(1.0, settings.roughness ?? 0.35)),
        metalness: Math.max(0.0, Math.min(1.0, settings.metalness ?? 0.15)),
        transparent: !isOpaque,
        opacity: effectiveOpacity,
        side: THREE.DoubleSide,
        depthTest: true,
        depthWrite: isOpaque,
        polygonOffset: true,
        polygonOffsetFactor: -3.0,
        polygonOffsetUnits: -3.0,
        envMapIntensity: 1.0,
      });
    } else {
      // 5. Flat (Shadeless / Unlit): Pure solid color unaffected by scene lighting for clean graphic illustration
      material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: !isOpaque,
        opacity: effectiveOpacity,
        side: THREE.DoubleSide,
        depthTest: true,
        depthWrite: isOpaque,
        polygonOffset: true,
        polygonOffsetFactor: -3.0,
        polygonOffsetUnits: -3.0,
        toneMapped: true,
      });
    }

    // Apply WebGL Blending Modes based on layer setting
    if (matType !== 'cutout') {
      if (layerBlendMode === 'multiply') {
        material.blending = THREE.CustomBlending;
        material.blendSrc = THREE.DstColorFactor;
        material.blendDst = THREE.ZeroFactor;
        material.blendEquation = THREE.AddEquation;
        material.transparent = true;
      } else if (layerBlendMode === 'screen') {
        material.blending = THREE.CustomBlending;
        material.blendSrc = THREE.OneFactor;
        material.blendDst = THREE.OneMinusSrcColorFactor;
        material.blendEquation = THREE.AddEquation;
        material.transparent = true;
      } else if (layerBlendMode === 'overlay') {
        material.blending = THREE.CustomBlending;
        material.blendSrc = THREE.DstColorFactor;
        material.blendDst = THREE.SrcColorFactor;
        material.blendEquation = THREE.AddEquation;
        material.transparent = true;
      } else if (layerBlendMode === 'add') {
        material.blending = THREE.AdditiveBlending;
        material.transparent = true;
      } else if (layerBlendMode === 'subtract') {
        material.blending = THREE.SubtractiveBlending;
        material.transparent = true;
      } else {
        material.blending = THREE.NormalBlending;
      }
    }

    if (isOnModel && settings.stencilMasking) {
      material.stencilWrite = false;
      material.stencilRef = 1;
      material.stencilFunc = THREE.EqualStencilFunc; // Only render fragments where model exists
    } else {
      material.stencilFunc = THREE.AlwaysStencilFunc;
    }

    this.cache.set(key, material);
    return material;
  }

  /**
   * Generates Sculptor Clay / Flat White canvas material with positive depth bias
   */
  public static createSculptorClayMaterial(): THREE.MeshStandardMaterial {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xcdd3dc,
      roughness: 0.55,
      metalness: 0.08,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: 2.0,
      polygonOffsetUnits: 2.0,
    });
    MaterialCache.configureModelMaterial(mat);
    return mat;
  }

  /**
   * Configures textured model material with positive depth bias
   */
  public static createModelDisplayMaterial(
    originalTexture?: THREE.Texture | null,
    hasVertexColors: boolean = false
  ): THREE.MeshStandardMaterial {
    const mat = new THREE.MeshStandardMaterial({
      map: originalTexture || null,
      vertexColors: hasVertexColors,
      roughness: 0.7,
      metalness: 0.1,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: 2.0,
      polygonOffsetUnits: 2.0,
    });
    MaterialCache.configureModelMaterial(mat);
    return mat;
  }

  /**
   * Configure model material for stencil writing and depth bias
   */
  public static configureModelMaterial(material: THREE.Material): void {
    material.stencilWrite = true;
    material.stencilRef = 1;
    material.stencilZPass = THREE.ReplaceStencilOp;
    material.stencilWriteMask = 0xff;
    material.polygonOffset = true;
    material.polygonOffsetFactor = 2.0;
    material.polygonOffsetUnits = 2.0;
    material.needsUpdate = true;
  }

  /**
   * Clear cached materials
   */
  public clear(): void {
    this.cache.forEach((mat) => {
      if (mat instanceof THREE.ShaderMaterial) {
        globalShaderRegistry.unregister(mat);
      }
      mat.dispose();
    });
    this.cache.clear();
  }
}


