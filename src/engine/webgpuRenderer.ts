/// <reference types="@webgpu/types" />
import { SKYBOX_WGSL } from './wgslShaders';
import { RenderUniforms } from '../types/skybox';

export class WebGPUSkyboxRenderer {
  private canvas: HTMLCanvasElement;
  private adapter: GPUAdapter | null = null;
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private format: GPUTextureFormat = 'bgra8unorm';
  private pipeline: GPURenderPipeline | null = null;
  private uniformBuffer: GPUBuffer | null = null;
  private bindGroup: GPUBindGroup | null = null;
  private isInitialized = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  public async init(): Promise<boolean> {
    if (!navigator.gpu) {
      console.warn('WebGPU not supported in this browser.');
      return false;
    }

    try {
      this.adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance',
      });
      if (!this.adapter) {
        console.warn('No suitable WebGPU adapter found.');
        return false;
      }

      this.device = await this.adapter.requestDevice();
      this.context = this.canvas.getContext('webgpu') as GPUCanvasContext;
      if (!this.context) {
        return false;
      }

      this.format = navigator.gpu.getPreferredCanvasFormat();
      this.context.configure({
        device: this.device,
        format: this.format,
        alphaMode: 'opaque',
      });

      const shaderModule = this.device.createShaderModule({
        label: 'Skybox Shader Module',
        code: SKYBOX_WGSL,
      });

      // 72 floats = 288 bytes buffer
      this.uniformBuffer = this.device.createBuffer({
        size: 288,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      const bindGroupLayout = this.device.createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: { type: 'uniform' },
          },
        ],
      });

      this.bindGroup = this.device.createBindGroup({
        layout: bindGroupLayout,
        entries: [
          {
            binding: 0,
            resource: { buffer: this.uniformBuffer },
          },
        ],
      });

      const pipelineLayout = this.device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      });

      this.pipeline = this.device.createRenderPipeline({
        layout: pipelineLayout,
        vertex: {
          module: shaderModule,
          entryPoint: 'vs_main',
        },
        fragment: {
          module: shaderModule,
          entryPoint: 'fs_main',
          targets: [{ format: this.format }],
        },
        primitive: {
          topology: 'triangle-list',
        },
      });

      this.isInitialized = true;
      return true;
    } catch (err) {
      console.error('WebGPU initialization error:', err);
      return false;
    }
  }

  public render(u: RenderUniforms): void {
    if (!this.isInitialized || !this.device || !this.context || !this.pipeline || !this.bindGroup || !this.uniformBuffer) {
      return;
    }

    // Build float32 uniform buffer matching the WGSL struct (72 floats)
    const f32 = new Float32Array(72);
    f32[0] = u.time;
    f32[1] = u.qualityTier;
    f32[2] = u.resolution[0];
    f32[3] = u.resolution[1];

    f32[4] = u.cameraPos[0];
    f32[5] = u.cameraPos[1];
    f32[6] = u.cameraPos[2];
    f32[7] = u.cameraRot[0]; // pitch

    f32[8] = u.cameraRot[1]; // yaw
    f32[9] = u.cameraRot[2]; // roll
    f32[10] = u.fov;
    f32[11] = u.globalBrightness;

    f32[12] = u.sunDir[0];
    f32[13] = u.sunDir[1];
    f32[14] = u.sunDir[2];
    f32[15] = u.sunDiscSize;

    f32[16] = u.sunColor[0];
    f32[17] = u.sunColor[1];
    f32[18] = u.sunColor[2];
    f32[19] = u.sunFlareGlow;

    f32[20] = u.zenithColor[0];
    f32[21] = u.zenithColor[1];
    f32[22] = u.zenithColor[2];
    f32[23] = u.gradientPower;

    f32[24] = u.midSkyColor[0];
    f32[25] = u.midSkyColor[1];
    f32[26] = u.midSkyColor[2];
    f32[27] = u.midOffset;

    f32[28] = u.horizonColor[0];
    f32[29] = u.horizonColor[1];
    f32[30] = u.horizonColor[2];
    f32[31] = u.horizonBandGlow;

    f32[32] = u.cloudCoverage;
    f32[33] = u.cloudEdge;
    f32[34] = u.cloudSpeed;
    f32[35] = u.cloudOpacity;

    f32[36] = u.cloudColor[0];
    f32[37] = u.cloudColor[1];
    f32[38] = u.cloudColor[2];
    f32[39] = u.cloudAltitude;

    f32[40] = u.cloudShadow[0];
    f32[41] = u.cloudShadow[1];
    f32[42] = u.cloudShadow[2];
    f32[43] = u.stormTurbulence;

    f32[44] = u.stormDarken;
    f32[45] = u.godRayEnable;
    f32[46] = u.rayIntensity;
    f32[47] = u.rayDensity;

    f32[48] = u.rayDecay;
    f32[49] = u.lumGate[0];
    f32[50] = u.lumGate[1];
    f32[51] = 0.75; // highlight rolloff

    f32[52] = u.rayColorInner[0];
    f32[53] = u.rayColorInner[1];
    f32[54] = u.rayColorInner[2];
    f32[55] = u.summerFilter;

    f32[56] = u.rayColorOuter[0];
    f32[57] = u.rayColorOuter[1];
    f32[58] = u.rayColorOuter[2];
    f32[59] = u.isNight;

    f32[60] = u.fogEnable;
    f32[61] = u.fogStart;
    f32[62] = u.fogEnd;
    f32[63] = u.fogDensity;

    f32[64] = u.fogColor[0];
    f32[65] = u.fogColor[1];
    f32[66] = u.fogColor[2];
    f32[67] = 1.2; // altitudeScale

    f32[68] = u.rainEnable;
    f32[69] = u.rainIntensity;
    f32[70] = u.rainWind[0];
    f32[71] = u.rainWind[1];

    this.device.queue.writeBuffer(this.uniformBuffer, 0, f32);

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });

    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, this.bindGroup);
    passEncoder.draw(6, 1, 0, 0);
    passEncoder.end();

    this.device.queue.submit([commandEncoder.finish()]);
  }

  public destroy(): void {
    if (this.uniformBuffer) {
      this.uniformBuffer.destroy();
    }
    this.isInitialized = false;
  }
}
