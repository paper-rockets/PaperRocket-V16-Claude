import { EnvironmentPreset, CameraSettings } from '../types/skybox';
import { hexToRgb, sphericalToCartesian } from './colorUtils';

export function generateWebGPUBareboneCode(preset: EnvironmentPreset, camera: CameraSettings): string {
  const sunDir = sphericalToCartesian(preset.sunGodRays.sunHeight, preset.sunGodRays.sunAzimuth);
  const zenithRgb = hexToRgb(preset.gradient.zenithColor);
  const midRgb = hexToRgb(preset.gradient.midSkyColor);
  const horizonRgb = hexToRgb(preset.gradient.horizonColor);
  const cloudRgb = hexToRgb(preset.clouds.cloudColor);
  const shadowRgb = hexToRgb(preset.clouds.cloudShadow);
  const sunRgb = hexToRgb(preset.atmosphere.sunLightColor);
  const fogRgb = hexToRgb(preset.atmosphere.fogColor);

  return `<!-- Barebone WebGPU Procedural Skybox for Drawing Apps -->
<!-- No terrain, no water - purely lightweight atmospheric skybox canvas -->
<canvas id="skybox-canvas" style="position: absolute; top:0; left:0; width:100%; height:100%; z-index:-1;"></canvas>

<script type="module">
const canvas = document.getElementById('skybox-canvas');

// Camera & Position state (customizable dynamically)
const skyboxState = {
  camPos: [${camera.posX}, ${camera.altitude}, ${camera.posZ}], // [x, height, z]
  camPitch: ${((camera.pitch * Math.PI) / 180).toFixed(4)},
  camYaw: ${((camera.yaw * Math.PI) / 180).toFixed(4)},
  fov: ${camera.fov},
  cloudAltitude: ${preset.clouds.cloudAltitude},
  sunHeight: ${preset.sunGodRays.sunHeight},
  sunAzimuth: ${preset.sunGodRays.sunAzimuth},
};

// WGSL Shader
const wgslCode = \`
struct Uniforms {
  time: f32, resX: f32, resY: f32,
  camPosX: f32, camPosY: f32, camPosZ: f32, camPitch: f32, camYaw: f32, fov: f32,
  sunDirX: f32, sunDirY: f32, sunDirZ: f32,
  cloudCoverage: f32, cloudSpeed: f32, cloudAltitude: f32
};
@group(0) @binding(0) var<uniform> u: Uniforms;

fn hash21(p: vec2<f32>) -> f32 {
  var p3 = fract(vec3<f32>(p.xyx) * 0.1031);
  p3 = p3 + dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

fn noise2D(p: vec2<f32>) -> f32 {
  let i = floor(p); let f = fract(p);
  let u_s = f * f * (3.0 - 2.0 * f);
  let a = hash21(i); let b = hash21(i + vec2<f32>(1.0, 0.0));
  let c = hash21(i + vec2<f32>(0.0, 1.0)); let d = hash21(i + vec2<f32>(1.0, 1.0));
  return mix(mix(a, b, u_s.x), mix(c, d, u_s.x), u_s.y);
}

fn fbmCloud(p: vec2<f32>) -> f32 {
  var v = 0.0; var amp = 0.5; var cp = p;
  for (var i = 0; i < 4; i = i + 1) {
    v = v + amp * noise2D(cp);
    cp = cp * 2.1 + vec2<f32>(13.3, 71.1);
    amp = amp * 0.5;
  }
  return v;
}

@vertex
fn vs_main(@builtin(vertex_index) id: u32) -> @builtin(position) vec4<f32> {
  var p = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(-1.0, 1.0),
    vec2<f32>(-1.0, 1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0)
  );
  return vec4<f32>(p[id], 0.0, 1.0);
}

@fragment
fn fs_main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
  let uv = pos.xy / vec2<f32>(u.resX, u.resY);
  let ndc = (uv * 2.0 - 1.0) * vec2<f32>(1.0, -1.0);
  let aspect = u.resX / max(u.resY, 1.0);
  let tanFov = tan(u.fov * 3.14159265 / 360.0);

  let viewLocal = normalize(vec3<f32>(ndc.x * aspect * tanFov, ndc.y * tanFov, 1.0));
  let cp = cos(u.camPitch); let sp = sin(u.camPitch);
  let cy = cos(u.camYaw);   let sy = sin(u.camYaw);

  let pitched = vec3<f32>(viewLocal.x, viewLocal.y * cp - viewLocal.z * sp, viewLocal.y * sp + viewLocal.z * cp);
  let rayDir = normalize(vec3<f32>(pitched.x * cy + pitched.z * sy, pitched.y, -pitched.x * sy + pitched.z * cy));
  let sunDir = normalize(vec3<f32>(u.sunDirX, u.sunDirY, u.sunDirZ));

  // 3-Stop Sky Gradient
  let h = clamp(rayDir.y + u.camPosY * 0.0001, 0.0, 1.0);
  let curved = pow(h, ${preset.gradient.gradientCurvePower.toFixed(2)});
  let mid = ${preset.gradient.midHeightOffset.toFixed(2)};
  let zenith = vec3<f32>(${zenithRgb[0].toFixed(3)}, ${zenithRgb[1].toFixed(3)}, ${zenithRgb[2].toFixed(3)});
  let midSky = vec3<f32>(${midRgb[0].toFixed(3)}, ${midRgb[1].toFixed(3)}, ${midRgb[2].toFixed(3)});
  let horizon = vec3<f32>(${horizonRgb[0].toFixed(3)}, ${horizonRgb[1].toFixed(3)}, ${horizonRgb[2].toFixed(3)});

  var sky = mix(horizon, midSky, smoothstep(0.0, mid, curved));
  if (curved > mid) {
    sky = mix(midSky, zenith, smoothstep(mid, 1.0, curved));
  }
  sky = sky + horizon * exp(-abs(rayDir.y) * 8.0) * ${preset.gradient.horizonBandGlow.toFixed(2)};

  // Sun Disk & Flare Glow
  let sunDot = dot(rayDir, sunDir);
  let sunAngle = acos(clamp(sunDot, -1.0, 1.0));
  let sunDisc = smoothstep(0.025, 0.02, sunAngle) * 3.0;
  let sunFlare = pow(max(sunDot, 0.0), 12.0) * ${preset.gradient.sunFlareGlow.toFixed(2)};
  let sunColor = vec3<f32>(${sunRgb[0].toFixed(3)}, ${sunRgb[1].toFixed(3)}, ${sunRgb[2].toFixed(3)});
  var color = sky + sunColor * (sunDisc + sunFlare);

  // Procedural Clouds
  if (u.cloudCoverage > 0.01 && rayDir.y > 0.02) {
    let planeDist = (u.cloudAltitude - u.camPosY) / max(rayDir.y, 0.01);
    if (planeDist > 0.0) {
      let cloudUV = (u.camPosX * vec2<f32>(1.0, 0.0) + rayDir.xz * planeDist) * 0.00035;
      let animOffset = vec2<f32>(u.time * u.cloudSpeed, 0.0);
      let density = smoothstep(1.0 - u.cloudCoverage, 1.0 - u.cloudCoverage + 0.1, fbmCloud(cloudUV + animOffset));
      let cloudCol = vec3<f32>(${cloudRgb[0].toFixed(3)}, ${cloudRgb[1].toFixed(3)}, ${cloudRgb[2].toFixed(3)});
      color = mix(color, cloudCol, density * smoothstep(0.02, 0.2, rayDir.y));
    }
  }

  return vec4<f32>(clamp(color, vec3<f32>(0.0, 0.0, 0.0), vec3<f32>(1.0, 1.0, 1.0)), 1.0);
}
\`;

async function initSkybox() {
  if (!navigator.gpu) return console.error('WebGPU unsupported');
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: 'opaque' });

  const module = device.createShaderModule({ code: wgslCode });
  const uniformBuffer = device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module, entryPoint: 'vs_main' },
    fragment: { module, entryPoint: 'fs_main', targets: [{ format }] },
    primitive: { topology: 'triangle-list' }
  });

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }]
  });

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  let startTime = performance.now();
  function render() {
    const elapsed = (performance.now() - startTime) * 0.001;
    const f32 = new Float32Array([
      elapsed, canvas.width, canvas.height,
      skyboxState.camPos[0], skyboxState.camPos[1], skyboxState.camPos[2],
      skyboxState.camPitch, skyboxState.camYaw, skyboxState.fov,
      ${sunDir[0].toFixed(4)}, ${sunDir[1].toFixed(4)}, ${sunDir[2].toFixed(4)},
      ${preset.clouds.cloudCoverage.toFixed(3)}, ${preset.clouds.cloudSpeed.toFixed(4)},
      skyboxState.cloudAltitude, 0.0
    ]);
    device.queue.writeBuffer(uniformBuffer, 0, f32);

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{ view: context.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store' }]
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(6);
    pass.end();
    device.queue.submit([encoder.finish()]);

    requestAnimationFrame(render);
  }
  render();
}

initSkybox();

// Export API to dynamically change camera height/position or sun
window.setSkyboxAltitude = (height) => { skyboxState.camPos[1] = height; };
window.setSkyboxLook = (pitchDeg, yawDeg) => {
  skyboxState.camPitch = (pitchDeg * Math.PI) / 180;
  skyboxState.camYaw = (yawDeg * Math.PI) / 180;
};
</script>
`;
}

export function generateEnvironmentJSON(preset: EnvironmentPreset, camera: CameraSettings): string {
  return JSON.stringify(
    {
      version: '1.0.0',
      type: 'WebGPU_Skybox_Environment',
      presetName: preset.name,
      timeOfDayHour: preset.timeOfDayHour,
      camera: {
        altitude: camera.altitude,
        pitch: camera.pitch,
        yaw: camera.yaw,
        fov: camera.fov,
        posX: camera.posX,
        posZ: camera.posZ,
      },
      atmosphere: preset.atmosphere,
      gradient: preset.gradient,
      clouds: preset.clouds,
      sunGodRays: preset.sunGodRays,
      fog: preset.fog,
      rain: preset.rain,
    },
    null,
    2
  );
}
