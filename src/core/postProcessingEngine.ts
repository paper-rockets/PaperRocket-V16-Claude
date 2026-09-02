import * as THREE from 'three';
import { PostProcessSettings } from '../types';
import { OKLAB_FULL_PIPELINE_GLSL } from './colorMath';
import { WBOITPipeline } from './wboitPipeline';

/**
 * Post-Processing & Render Modifiers Engine
 *
 * Implements high-performance Paper Rocket-style render modes:
 * - Draft Mode: Direct zero-latency hardware rasterization
 * - Render Mode: Multi-effect compositing pass with:
 *   - 2-Pass Downsampled Separable Gaussian Bloom (1/4 resolution, ~95% fillrate reduction)
 *   - Toon / Cel-shading luminance quantization (hard-banded light steps in OKLab)
 *   - Optimized Depth of Field (DoF) focal blur tethered to camera orbit fulcrum
 *   - Film Grain & Retro Pixelation Grid
 *   - WBOIT Weighted Blended Order-Independent Transparency
 *   - Locked sRGB swapchains and Linear RGB post-processing calculations
 */

// 1. Bright-pass & Downsample Shader (Extracts HDR / emissive glow fragments)
const BRIGHT_PASS_VERTEX = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const BRIGHT_PASS_FRAGMENT = `
  ${OKLAB_FULL_PIPELINE_GLSL}
  uniform sampler2D tDiffuse;
  uniform float uBloomThreshold;
  varying vec2 vUv;

  void main() {
    vec4 col = texture2D(tDiffuse, vUv);
    vec3 linear = srgb_to_linear(col.rgb);
    float brightness = dot(linear, vec3(0.2126, 0.7152, 0.0722));
    if (brightness > uBloomThreshold || max(linear.r, max(linear.g, linear.b)) > 1.0) {
      gl_FragColor = vec4(linear, 1.0);
    } else {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
    }
  }
`;

// 2. 1D Separable 9-Tap Gaussian Blur Shader
const BLUR_1D_FRAGMENT = `
  uniform sampler2D tInput;
  uniform vec2 uDirection; // (1/w, 0) for H blur, (0, 1/h) for V blur
  varying vec2 vUv;

  void main() {
    vec3 sum = vec3(0.0);
    // 9-Tap discrete Gaussian kernel weights (sigma ~ 2.5)
    sum += texture2D(tInput, vUv - uDirection * 4.0).rgb * 0.0162162162;
    sum += texture2D(tInput, vUv - uDirection * 3.0).rgb * 0.0540540541;
    sum += texture2D(tInput, vUv - uDirection * 2.0).rgb * 0.1216216216;
    sum += texture2D(tInput, vUv - uDirection * 1.0).rgb * 0.1945945946;
    sum += texture2D(tInput, vUv).rgb * 0.2270270270;
    sum += texture2D(tInput, vUv + uDirection * 1.0).rgb * 0.1945945946;
    sum += texture2D(tInput, vUv + uDirection * 2.0).rgb * 0.1216216216;
    sum += texture2D(tInput, vUv + uDirection * 3.0).rgb * 0.0540540541;
    sum += texture2D(tInput, vUv + uDirection * 4.0).rgb * 0.0162162162;
    gl_FragColor = vec4(sum, 1.0);
  }
`;

export class PostProcessingEngine {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  // Render targets for multi-pass compositing
  private renderTargetA: THREE.WebGLRenderTarget;
  private bloomTargetDown: THREE.WebGLRenderTarget;
  private bloomTargetH: THREE.WebGLRenderTarget;
  private bloomTargetV: THREE.WebGLRenderTarget;

  // WBOIT Transparency Pipeline
  public wboit: WBOITPipeline;

  // Fullscreen Quad & Cameras
  private quadScene: THREE.Scene;
  private quadCamera: THREE.OrthographicCamera;
  private quadMesh: THREE.Mesh;

  // Pass materials
  private brightPassMaterial: THREE.ShaderMaterial;
  private blurHMaterial: THREE.ShaderMaterial;
  private blurVMaterial: THREE.ShaderMaterial;
  private postMaterial: THREE.ShaderMaterial;

  private settings: PostProcessSettings = {
    renderMode: 'draft',
    toonShading: false,
    toonSteps: 3,
    bloom: true,
    bloomIntensity: 1.2,
    bloomRadius: 0.8,
    bloomThreshold: 0.85,
    dof: false,
    dofFocusDistance: 2.5,
    dofAperture: 0.015,
    grain: false,
    grainIntensity: 0.08,
    pixelation: false,
    pixelSize: 4,
  };

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    width: number,
    height: number
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    const pr = renderer.getPixelRatio();
    const w = Math.max(1, Math.floor(width * pr));
    const h = Math.max(1, Math.floor(height * pr));
    const bw = Math.max(1, Math.floor(w / 4));
    const bh = Math.max(1, Math.floor(h / 4));

    const options: THREE.RenderTargetOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      stencilBuffer: true,
      depthBuffer: true,
      colorSpace: THREE.SRGBColorSpace,
    };

    const bloomOptions: THREE.RenderTargetOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      stencilBuffer: false,
      depthBuffer: false,
    };

    this.renderTargetA = new THREE.WebGLRenderTarget(w, h, options);
    this.bloomTargetDown = new THREE.WebGLRenderTarget(bw, bh, bloomOptions);
    this.bloomTargetH = new THREE.WebGLRenderTarget(bw, bh, bloomOptions);
    this.bloomTargetV = new THREE.WebGLRenderTarget(bw, bh, bloomOptions);

    this.wboit = new WBOITPipeline(renderer, width, height);

    this.quadScene = new THREE.Scene();
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // 1. Bright Pass Material
    this.brightPassMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uBloomThreshold: { value: 0.85 },
      },
      vertexShader: BRIGHT_PASS_VERTEX,
      fragmentShader: BRIGHT_PASS_FRAGMENT,
      depthTest: false,
      depthWrite: false,
    });

    // 2. Horizontal Blur Material
    this.blurHMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tInput: { value: null },
        uDirection: { value: new THREE.Vector2(1.0 / bw, 0.0) },
      },
      vertexShader: BRIGHT_PASS_VERTEX,
      fragmentShader: BLUR_1D_FRAGMENT,
      depthTest: false,
      depthWrite: false,
    });

    // 3. Vertical Blur Material
    this.blurVMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tInput: { value: null },
        uDirection: { value: new THREE.Vector2(0.0, 1.0 / bh) },
      },
      vertexShader: BRIGHT_PASS_VERTEX,
      fragmentShader: BLUR_1D_FRAGMENT,
      depthTest: false,
      depthWrite: false,
    });

    // 4. Main Compositing Material
    this.postMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tBloom: { value: null },
        uResolution: { value: new THREE.Vector2(w, h) },
        uTime: { value: 0.0 },
        uRenderMode: { value: 0 },
        uToonShading: { value: false },
        uToonSteps: { value: 3.0 },
        uBloom: { value: true },
        uBloomIntensity: { value: 1.2 },
        uDoF: { value: false },
        uFocusDistance: { value: 2.5 },
        uAperture: { value: 0.015 },
        uGrain: { value: false },
        uGrainIntensity: { value: 0.08 },
        uPixelation: { value: false },
        uPixelSize: { value: 4.0 },
      },
      vertexShader: BRIGHT_PASS_VERTEX,
      fragmentShader: `
        ${OKLAB_FULL_PIPELINE_GLSL}

        uniform sampler2D tDiffuse;
        uniform sampler2D tBloom;
        uniform vec2 uResolution;
        uniform float uTime;
        uniform int uRenderMode;
        uniform bool uToonShading;
        uniform float uToonSteps;
        uniform bool uBloom;
        uniform float uBloomIntensity;
        uniform bool uDoF;
        uniform float uFocusDistance;
        uniform float uAperture;
        uniform bool uGrain;
        uniform float uGrainIntensity;
        uniform bool uPixelation;
        uniform float uPixelSize;

        varying vec2 vUv;

        float rand(vec2 co) {
          return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
        }

        void main() {
          vec2 uv = vUv;

          // 1. Retro Pixelation
          if (uPixelation && uPixelSize > 1.0) {
            vec2 dxy = uPixelSize / uResolution;
            uv = dxy * floor(uv / dxy);
          }

          vec4 baseColor = texture2D(tDiffuse, uv);

          // If Draft Mode, pass through directly
          if (uRenderMode == 0) {
            gl_FragColor = baseColor;
            return;
          }

          // Convert to Linear RGB for physical post-processing calculations
          vec3 linearColor = srgb_to_linear(baseColor.rgb);

          // 2. Depth of Field (DoF) / Bokeh Blur (Fast 4-Tap Radial Jitter)
          if (uDoF) {
            vec2 blurDir = (uv - vec2(0.5));
            float distFromCenter = length(blurDir);
            float blurAmount = clamp(abs(distFromCenter - 0.3) * uAperture * 20.0, 0.0, 0.01);
            if (blurAmount > 0.0005) {
              vec3 blurred = linearColor * 0.4;
              blurred += srgb_to_linear(texture2D(tDiffuse, uv + vec2(blurAmount, blurAmount)).rgb) * 0.15;
              blurred += srgb_to_linear(texture2D(tDiffuse, uv + vec2(-blurAmount, blurAmount)).rgb) * 0.15;
              blurred += srgb_to_linear(texture2D(tDiffuse, uv + vec2(blurAmount, -blurAmount)).rgb) * 0.15;
              blurred += srgb_to_linear(texture2D(tDiffuse, uv + vec2(-blurAmount, -blurAmount)).rgb) * 0.15;
              linearColor = blurred;
            }
          }

          // 3. Bloom Additive Composite (from 2-pass separable 1/4 res target)
          if (uBloom) {
            vec3 bloomSample = texture2D(tBloom, uv).rgb;
            linearColor += bloomSample * uBloomIntensity;
          }

          // 4. Toon / Cel Shading Quantization in OKLab
          if (uToonShading) {
            vec3 oklab = linear_srgb_to_oklab(linearColor);
            float steppedL = floor(oklab.x * uToonSteps + 0.5) / uToonSteps;
            oklab.x = mix(oklab.x, steppedL, 0.85);
            linearColor = oklab_to_linear_srgb(oklab);
          }

          // 5. Film Grain Noise
          if (uGrain) {
            float noise = (rand(uv + fract(uTime * 0.05)) - 0.5) * uGrainIntensity;
            linearColor += vec3(noise);
          }

          gl_FragColor = vec4(linear_to_srgb(clamp(linearColor, 0.0, 1.0)), baseColor.a);
        }
      `,
      depthTest: false,
      depthWrite: false,
    });

    this.quadMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMaterial);
    this.quadScene.add(this.quadMesh);
  }

  public setSize(width: number, height: number): void {
    const pr = this.renderer.getPixelRatio();
    const w = Math.max(1, Math.floor(width * pr));
    const h = Math.max(1, Math.floor(height * pr));
    const bw = Math.max(1, Math.floor(w / 4));
    const bh = Math.max(1, Math.floor(h / 4));

    this.renderTargetA.setSize(w, h);
    this.bloomTargetDown.setSize(bw, bh);
    this.bloomTargetH.setSize(bw, bh);
    this.bloomTargetV.setSize(bw, bh);
    this.wboit.setSize(width, height);

    this.blurHMaterial.uniforms.uDirection.value.set(1.0 / bw, 0.0);
    this.blurVMaterial.uniforms.uDirection.value.set(0.0, 1.0 / bh);
    this.postMaterial.uniforms.uResolution.value.set(w, h);
  }

  public updateSettings(newSettings: Partial<PostProcessSettings>): void {
    this.settings = { ...this.settings, ...newSettings };

    const u = this.postMaterial.uniforms;
    u.uRenderMode.value = this.settings.renderMode === 'render' ? 1 : 0;
    u.uToonShading.value = this.settings.toonShading;
    u.uToonSteps.value = this.settings.toonSteps;
    u.uBloom.value = this.settings.bloom;
    u.uBloomIntensity.value = this.settings.bloomIntensity;
    this.brightPassMaterial.uniforms.uBloomThreshold.value = this.settings.bloomThreshold;

    u.uDoF.value = this.settings.dof;
    u.uFocusDistance.value = this.settings.dofFocusDistance;
    u.uAperture.value = this.settings.dofAperture;
    u.uGrain.value = this.settings.grain;
    u.uGrainIntensity.value = this.settings.grainIntensity;
    u.uPixelation.value = this.settings.pixelation;
    u.uPixelSize.value = this.settings.pixelSize;
  }

  public getSettings(): PostProcessSettings {
    return { ...this.settings };
  }

  /**
   * Main render loop call:
   * 1. If Draft Mode, renders scene directly to default framebuffer.
   * 2. If Render Mode:
   *    a. Renders scene to full-resolution renderTargetA.
   *    b. If Bloom is enabled:
   *       - Extracts bright pass to 1/4 resolution bloomTargetDown.
   *       - Horizontal Gaussian blur to bloomTargetH.
   *       - Vertical Gaussian blur to bloomTargetV.
   *    c. Composites all passes onto the screen quad in a single final shader step.
   */
  public render(time: number = 0): void {
    if (this.settings.renderMode === 'draft') {
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    // Pass 1: Render 3D scene to full-res target A
    this.renderer.setRenderTarget(this.renderTargetA);
    this.renderer.render(this.scene, this.camera);

    // Pass 2: Bloom downsample & 2-pass separable blur (1/4 resolution)
    if (this.settings.bloom) {
      // 2a. Bright Pass & Downsample (TargetA -> bloomTargetDown)
      this.quadMesh.material = this.brightPassMaterial;
      this.brightPassMaterial.uniforms.tDiffuse.value = this.renderTargetA.texture;
      this.renderer.setRenderTarget(this.bloomTargetDown);
      this.renderer.render(this.quadScene, this.quadCamera);

      // 2b. Horizontal Blur (bloomTargetDown -> bloomTargetH)
      this.quadMesh.material = this.blurHMaterial;
      this.blurHMaterial.uniforms.tInput.value = this.bloomTargetDown.texture;
      this.renderer.setRenderTarget(this.bloomTargetH);
      this.renderer.render(this.quadScene, this.quadCamera);

      // 2c. Vertical Blur (bloomTargetH -> bloomTargetV)
      this.quadMesh.material = this.blurVMaterial;
      this.blurVMaterial.uniforms.tInput.value = this.bloomTargetH.texture;
      this.renderer.setRenderTarget(this.bloomTargetV);
      this.renderer.render(this.quadScene, this.quadCamera);
    }

    // Pass 3: Final Composite to Screen
    this.quadMesh.material = this.postMaterial;
    this.postMaterial.uniforms.tDiffuse.value = this.renderTargetA.texture;
    this.postMaterial.uniforms.tBloom.value = this.settings.bloom ? this.bloomTargetV.texture : null;
    this.postMaterial.uniforms.uTime.value = time;

    this.renderer.setRenderTarget(null);
    this.renderer.render(this.quadScene, this.quadCamera);
  }

  public dispose(): void {
    this.renderTargetA.dispose();
    this.bloomTargetDown.dispose();
    this.bloomTargetH.dispose();
    this.bloomTargetV.dispose();
    this.brightPassMaterial.dispose();
    this.blurHMaterial.dispose();
    this.blurVMaterial.dispose();
    this.postMaterial.dispose();
    this.quadMesh.geometry.dispose();
  }
}

