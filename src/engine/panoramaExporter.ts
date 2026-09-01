import { EnvironmentPreset } from '../types/skybox';
import { hexToRgb, sphericalToCartesian } from './colorUtils';

export async function exportEquirectangularPanorama(
  preset: EnvironmentPreset,
  width = 2048,
  height = 1024
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot create 2d context');

  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  const sunDir = sphericalToCartesian(preset.sunGodRays.sunHeight, preset.sunGodRays.sunAzimuth);
  const sunRgb = hexToRgb(preset.atmosphere.sunLightColor);
  const zenithRgb = hexToRgb(preset.gradient.zenithColor);
  const midRgb = hexToRgb(preset.gradient.midSkyColor);
  const horizonRgb = hexToRgb(preset.gradient.horizonColor);
  const cloudRgb = hexToRgb(preset.clouds.cloudColor);
  const shadowRgb = hexToRgb(preset.clouds.cloudShadow);
  const fogRgb = hexToRgb(preset.atmosphere.fogColor);

  const gradPower = Math.max(0.1, preset.gradient.gradientCurvePower);
  const midOffset = Math.max(0.05, Math.min(0.95, preset.gradient.midHeightOffset));
  const isNight = preset.sunGodRays.sunHeight < -5;

  let idx = 0;
  for (let y = 0; y < height; y++) {
    const v = y / (height - 1); // 0 (top/zenith) to 1 (bottom/nadir)
    const phi = (v - 0.5) * Math.PI; // +PI/2 (top) to -PI/2 (bottom)
    const rayY = Math.sin(-phi); // +1 top to -1 bottom
    const cosPhi = Math.cos(phi);

    for (let x = 0; x < width; x++) {
      const u = x / (width - 1); // 0 to 1 (azimuth 0 to 360)
      const theta = u * Math.PI * 2 - Math.PI; // -PI to +PI
      const rayX = Math.sin(theta) * cosPhi;
      const rayZ = Math.cos(theta) * cosPhi;

      // 1. Sky Gradient
      let skyR = 0, skyG = 0, skyB = 0;
      if (rayY >= 0) {
        const h = Math.min(1.0, Math.max(0.0, rayY));
        const curvedH = Math.pow(h, gradPower);
        if (curvedH < midOffset) {
          const t = curvedH / midOffset;
          skyR = horizonRgb[0] + (midRgb[0] - horizonRgb[0]) * t;
          skyG = horizonRgb[1] + (midRgb[1] - horizonRgb[1]) * t;
          skyB = horizonRgb[2] + (midRgb[2] - horizonRgb[2]) * t;
        } else {
          const t = (curvedH - midOffset) / (1.0 - midOffset);
          skyR = midRgb[0] + (zenithRgb[0] - midRgb[0]) * t;
          skyG = midRgb[1] + (zenithRgb[1] - midRgb[1]) * t;
          skyB = midRgb[2] + (zenithRgb[2] - midRgb[2]) * t;
        }
        // Horizon band glow
        const glow = Math.exp(-Math.abs(rayY) * 8.0) * preset.gradient.horizonBandGlow;
        skyR += horizonRgb[0] * glow;
        skyG += horizonRgb[1] * glow;
        skyB += horizonRgb[2] * glow;
      } else {
        const belowT = Math.min(1.0, -rayY * 3.0);
        skyR = horizonRgb[0] * (1 - belowT * 0.5) + fogRgb[0] * 0.5 * belowT;
        skyG = horizonRgb[1] * (1 - belowT * 0.5) + fogRgb[1] * 0.5 * belowT;
        skyB = horizonRgb[2] * (1 - belowT * 0.5) + fogRgb[2] * 0.5 * belowT;
      }

      // 2. Sun / Moon
      const sunDot = rayX * sunDir[0] + rayY * sunDir[1] + rayZ * sunDir[2];
      if (!isNight) {
        if (sunDot > 0.999) {
          const sunSize = 0.015 * preset.sunGodRays.sunDiscSize;
          const angle = Math.acos(Math.max(-1, Math.min(1, sunDot)));
          if (angle < sunSize) {
            const disc = Math.max(0, 1 - angle / sunSize) * 3.5;
            skyR += sunRgb[0] * disc;
            skyG += sunRgb[1] * disc;
            skyB += sunRgb[2] * disc;
          }
        }
        if (sunDot > 0) {
          const flare = Math.pow(sunDot, 16.0) * preset.gradient.sunFlareGlow * 1.5;
          skyR += sunRgb[0] * flare;
          skyG += sunRgb[1] * flare;
          skyB += sunRgb[2] * flare;
        }
      } else {
        // Moon
        const moonDot = -sunDot;
        if (moonDot > 0.998) {
          skyR += 0.85 * 2.0;
          skyG += 0.92 * 2.0;
          skyB += 1.0 * 2.0;
        }
      }

      // Summer filter
      if (preset.atmosphere.summerFilter) {
        skyR *= 1.08;
        skyG *= 1.02;
        skyB *= 0.92;
      }

      // Global Brightness & ACES Tone mapping
      skyR *= preset.atmosphere.globalBrightness;
      skyG *= preset.atmosphere.globalBrightness;
      skyB *= preset.atmosphere.globalBrightness;

      skyR = (skyR / (skyR + 0.85)) * 1.85;
      skyG = (skyG / (skyG + 0.85)) * 1.85;
      skyB = (skyB / (skyB + 0.85)) * 1.85;

      data[idx++] = Math.round(Math.min(255, Math.max(0, skyR * 255)));
      data[idx++] = Math.round(Math.min(255, Math.max(0, skyG * 255)));
      data[idx++] = Math.round(Math.min(255, Math.max(0, skyB * 255)));
      data[idx++] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}
