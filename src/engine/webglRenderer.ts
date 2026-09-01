import { SKYBOX_VS_GLSL, SKYBOX_FS_GLSL } from './glslShaders';
import { RenderUniforms } from '../types/skybox';

export class WebGL2SkyboxRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private isInitialized = false;
  private uniformLocations: Record<string, WebGLUniformLocation | null> = {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  public init(): boolean {
    this.gl = this.canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      powerPreference: 'high-performance',
    });

    if (!this.gl) {
      console.warn('WebGL2 not supported.');
      return false;
    }

    const gl = this.gl;
    const vs = this.createShader(gl.VERTEX_SHADER, SKYBOX_VS_GLSL);
    const fs = this.createShader(gl.FRAGMENT_SHADER, SKYBOX_FS_GLSL);

    if (!vs || !fs) {
      return false;
    }

    this.program = gl.createProgram();
    if (!this.program) return false;

    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error('GLSL Program Link Error:', gl.getProgramInfoLog(this.program));
      return false;
    }

    // Fullscreen quad buffer
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Cache all uniform locations
    const uniformNames = [
      'u_time', 'u_resolution', 'u_camPos', 'u_camRot', 'u_fov', 'u_globalBrightness',
      'u_sunDir', 'u_sunDiscSize', 'u_sunColor', 'u_sunFlareGlow',
      'u_zenithColor', 'u_gradientPower', 'u_midSkyColor', 'u_midOffset', 'u_horizonColor', 'u_horizonBandGlow',
      'u_cloudCoverage', 'u_cloudEdge', 'u_cloudSpeed', 'u_cloudOpacity', 'u_cloudColor', 'u_cloudShadow', 'u_cloudAltitude', 'u_stormTurbulence', 'u_stormDarken',
      'u_godRayEnable', 'u_rayIntensity', 'u_rayDensity', 'u_rayDecay', 'u_lumGate', 'u_highlightRolloff', 'u_rayInner', 'u_rayOuter',
      'u_fogEnable', 'u_fogDensity', 'u_altitudeScale', 'u_fogColor',
      'u_rainEnable', 'u_rainIntensity', 'u_rainWind',
      'u_summerFilter', 'u_isNight', 'u_qualityTier'
    ];

    for (const name of uniformNames) {
      this.uniformLocations[name] = gl.getUniformLocation(this.program, name);
    }

    this.isInitialized = true;
    return true;
  }

  private createShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;
    const shader = this.gl.createShader(type);
    if (!shader) return null;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader Compile Error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  public render(u: RenderUniforms): void {
    if (!this.isInitialized || !this.gl || !this.program || !this.vao) return;
    const gl = this.gl;

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    const loc = this.uniformLocations;
    gl.uniform1f(loc['u_time'], u.time);
    gl.uniform2f(loc['u_resolution'], u.resolution[0], u.resolution[1]);
    gl.uniform3f(loc['u_camPos'], u.cameraPos[0], u.cameraPos[1], u.cameraPos[2]);
    gl.uniform3f(loc['u_camRot'], u.cameraRot[0], u.cameraRot[1], u.cameraRot[2]);
    gl.uniform1f(loc['u_fov'], u.fov);
    gl.uniform1f(loc['u_globalBrightness'], u.globalBrightness);

    gl.uniform3f(loc['u_sunDir'], u.sunDir[0], u.sunDir[1], u.sunDir[2]);
    gl.uniform1f(loc['u_sunDiscSize'], u.sunDiscSize);
    gl.uniform3f(loc['u_sunColor'], u.sunColor[0], u.sunColor[1], u.sunColor[2]);
    gl.uniform1f(loc['u_sunFlareGlow'], u.sunFlareGlow);

    gl.uniform3f(loc['u_zenithColor'], u.zenithColor[0], u.zenithColor[1], u.zenithColor[2]);
    gl.uniform1f(loc['u_gradientPower'], u.gradientPower);
    gl.uniform3f(loc['u_midSkyColor'], u.midSkyColor[0], u.midSkyColor[1], u.midSkyColor[2]);
    gl.uniform1f(loc['u_midOffset'], u.midOffset);
    gl.uniform3f(loc['u_horizonColor'], u.horizonColor[0], u.horizonColor[1], u.horizonColor[2]);
    gl.uniform1f(loc['u_horizonBandGlow'], u.horizonBandGlow);

    gl.uniform1f(loc['u_cloudCoverage'], u.cloudCoverage);
    gl.uniform1f(loc['u_cloudEdge'], u.cloudEdge);
    gl.uniform1f(loc['u_cloudSpeed'], u.cloudSpeed);
    gl.uniform1f(loc['u_cloudOpacity'], u.cloudOpacity);
    gl.uniform3f(loc['u_cloudColor'], u.cloudColor[0], u.cloudColor[1], u.cloudColor[2]);
    gl.uniform3f(loc['u_cloudShadow'], u.cloudShadow[0], u.cloudShadow[1], u.cloudShadow[2]);
    gl.uniform1f(loc['u_cloudAltitude'], u.cloudAltitude);
    gl.uniform1f(loc['u_stormTurbulence'], u.stormTurbulence);
    gl.uniform1f(loc['u_stormDarken'], u.stormDarken);

    gl.uniform1f(loc['u_godRayEnable'], u.godRayEnable);
    gl.uniform1f(loc['u_rayIntensity'], u.rayIntensity);
    gl.uniform1f(loc['u_rayDensity'], u.rayDensity);
    gl.uniform1f(loc['u_rayDecay'], u.rayDecay);
    gl.uniform2f(loc['u_lumGate'], u.lumGate[0], u.lumGate[1]);
    gl.uniform1f(loc['u_highlightRolloff'], 0.75);
    gl.uniform3f(loc['u_rayInner'], u.rayColorInner[0], u.rayColorInner[1], u.rayColorInner[2]);
    gl.uniform3f(loc['u_rayOuter'], u.rayColorOuter[0], u.rayColorOuter[1], u.rayColorOuter[2]);

    gl.uniform1f(loc['u_fogEnable'], u.fogEnable);
    gl.uniform1f(loc['u_fogDensity'], u.fogDensity);
    gl.uniform1f(loc['u_altitudeScale'], 1.2);
    gl.uniform3f(loc['u_fogColor'], u.fogColor[0], u.fogColor[1], u.fogColor[2]);

    gl.uniform1f(loc['u_rainEnable'], u.rainEnable);
    gl.uniform1f(loc['u_rainIntensity'], u.rainIntensity);
    gl.uniform2f(loc['u_rainWind'], u.rainWind[0], u.rainWind[1]);

    gl.uniform1f(loc['u_summerFilter'], u.summerFilter);
    gl.uniform1f(loc['u_isNight'], u.isNight);
    gl.uniform1f(loc['u_qualityTier'], u.qualityTier);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  public destroy(): void {
    this.isInitialized = false;
  }
}
