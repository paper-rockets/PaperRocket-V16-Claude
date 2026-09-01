import * as THREE from 'three';
import { StrokePoint, BrushSettings, StrokeProfile } from '../types';

/**
 * Volumetric Stroke Geometry Generator
 * Supports 4 distinct geometric profiles:
 * - Tube: 360-degree cylindrical 3D mesh with spherical end-caps (equal volume from all angles)
 * - Ribbon: Flat tape-like cross-section aligned with drawing surface / plane
 * - Marker / Chisel: Asymmetric rectangular profile with calligraphic angle variation
 * - Conformal: Arched dome cross-section snapped to surface curvature
 *
 * Includes real-time Stylus Pressure Dynamics & Catmull-Rom resampling.
 */
export class ConformalBeadGenerator {
  private raycaster: THREE.Raycaster;

  constructor() {
    this.raycaster = new THREE.Raycaster();
  }

  /**
   * Builds volumetric stroke geometry from sampled points and brush profile settings
   */
  public generateGeometry(
    rawPoints: StrokePoint[],
    settings: BrushSettings,
    targetMeshes: THREE.Mesh[] = []
  ): THREE.BufferGeometry {
    if (!rawPoints || rawPoints.length === 0) {
      return new THREE.BufferGeometry();
    }

    // Filter micro-jitter
    const filteredPoints: StrokePoint[] = [rawPoints[0]];
    for (let i = 1; i < rawPoints.length; i++) {
      const prev = filteredPoints[filteredPoints.length - 1];
      const curr = rawPoints[i];
      if (prev.position.distanceTo(curr.position) > 0.0008) {
        filteredPoints.push(curr);
      }
    }

    const profile: StrokeProfile = settings.profile || 'ribbon';

    // Handle single dab
    if (filteredPoints.length === 1) {
      return this.generateDabGeometry(filteredPoints[0], settings, profile, targetMeshes);
    }

    // Interpolate points along centripetal Catmull-Rom curve with surface snapping
    const { positions, normals, pressures } = this.resampleCurve(
      filteredPoints,
      settings.size,
      targetMeshes
    );
    const numPoints = positions.length;

    if (numPoints < 2) {
      return this.generateDabGeometry(filteredPoints[0], settings, profile, targetMeshes);
    }

    // Compute cumulative distances
    const cumulativeDistances: number[] = [0];
    let totalLength = 0;
    for (let i = 1; i < numPoints; i++) {
      totalLength += positions[i].distanceTo(positions[i - 1]);
      cumulativeDistances.push(totalLength);
    }

    const baseOffset = settings.surfaceOffset ?? 0.003;
    const taperLength = Math.max(0.01, settings.taperLength ?? 0.05);

    // Compute continuous Bishop Rotation Minimizing Frames (RMF) using Double Reflection Method
    const { tangents, normals: bishopNormals, binormals: bishopBinormals } =
      ConformalBeadGenerator.computeBishopRMF(positions, normals);

    switch (profile) {
      case 'tube':
        return this.buildTubeGeometry(
          positions,
          bishopNormals,
          bishopBinormals,
          tangents,
          pressures,
          cumulativeDistances,
          totalLength,
          settings,
          baseOffset,
          taperLength
        );
      case 'ribbon':
        return this.buildRibbonGeometry(
          positions,
          bishopNormals,
          bishopBinormals,
          tangents,
          pressures,
          cumulativeDistances,
          totalLength,
          settings,
          baseOffset,
          taperLength
        );
      case 'marker':
        return this.buildMarkerGeometry(
          positions,
          bishopNormals,
          bishopBinormals,
          tangents,
          pressures,
          cumulativeDistances,
          totalLength,
          settings,
          baseOffset,
          taperLength
        );
      case 'conformal':
      default:
        return this.buildConformalGeometry(
          positions,
          bishopNormals,
          bishopBinormals,
          tangents,
          pressures,
          cumulativeDistances,
          totalLength,
          settings,
          targetMeshes,
          baseOffset,
          taperLength
        );
    }
  }

  /**
   * Computes Bishop Rotation Minimizing Frames (RMF) along curve using the Double Reflection Method (Wang et al. 2008).
   * Eliminates unwanted twist and inflection flipping along arbitrary 3D spatial splines.
   */
  public static computeBishopRMF(
    positions: THREE.Vector3[],
    initialNormals: THREE.Vector3[]
  ): { tangents: THREE.Vector3[]; normals: THREE.Vector3[]; binormals: THREE.Vector3[] } {
    const n = positions.length;
    if (n < 2) {
      const defaultT = new THREE.Vector3(0, 0, 1);
      const defaultN = (initialNormals[0] || new THREE.Vector3(0, 1, 0)).clone().normalize();
      const defaultB = new THREE.Vector3().crossVectors(defaultT, defaultN).normalize();
      return { tangents: [defaultT], normals: [defaultN], binormals: [defaultB] };
    }

    const tangents: THREE.Vector3[] = [];
    for (let i = 0; i < n; i++) {
      let t = new THREE.Vector3();
      if (i === 0) {
        t.subVectors(positions[1], positions[0]);
      } else if (i === n - 1) {
        t.subVectors(positions[n - 1], positions[n - 2]);
      } else {
        t.subVectors(positions[i + 1], positions[i - 1]);
      }
      if (t.lengthSq() < 1e-8) t.set(0, 0, 1);
      else t.normalize();
      tangents.push(t);
    }

    // Initialize first reference normal r0 orthogonal to t0
    let r0 = initialNormals[0] ? initialNormals[0].clone() : new THREE.Vector3(0, 1, 0);
    // Project r0 orthogonal to t0
    r0.sub(tangents[0].clone().multiplyScalar(tangents[0].dot(r0)));
    if (r0.lengthSq() < 1e-4) {
      r0.crossVectors(tangents[0], new THREE.Vector3(0, 1, 0));
      if (r0.lengthSq() < 1e-4) {
        r0.crossVectors(tangents[0], new THREE.Vector3(1, 0, 0));
      }
    }
    r0.normalize();

    const normals: THREE.Vector3[] = [r0];
    const binormals: THREE.Vector3[] = [new THREE.Vector3().crossVectors(tangents[0], r0).normalize()];

    // Double Reflection Method (Wang et al. 2008)
    for (let i = 0; i < n - 1; i++) {
      const x_i = positions[i];
      const x_next = positions[i + 1];
      const t_i = tangents[i];
      const t_next = tangents[i + 1];
      const r_i = normals[i];

      const v1 = new THREE.Vector3().subVectors(x_next, x_i);
      const c1 = v1.dot(v1);

      let r_next: THREE.Vector3;

      if (c1 > 1e-8) {
        // First reflection across bisecting plane of xi and x_{i+1}
        const r_i_L = r_i.clone().sub(v1.clone().multiplyScalar((2.0 / c1) * v1.dot(r_i)));
        const t_i_L = t_i.clone().sub(v1.clone().multiplyScalar((2.0 / c1) * v1.dot(t_i)));

        // Second reflection across bisecting plane of t_i^L and t_{i+1}
        const v2 = new THREE.Vector3().subVectors(t_next, t_i_L);
        const c2 = v2.dot(v2);

        if (c2 > 1e-8) {
          r_next = r_i_L.clone().sub(v2.clone().multiplyScalar((2.0 / c2) * v2.dot(r_i_L)));
        } else {
          r_next = r_i_L;
        }
      } else {
        r_next = r_i.clone();
      }

      // Gram-Schmidt orthogonalization against tangent[i+1]
      r_next.sub(t_next.clone().multiplyScalar(t_next.dot(r_next))).normalize();
      normals.push(r_next);

      const s_next = new THREE.Vector3().crossVectors(t_next, r_next).normalize();
      binormals.push(s_next);
    }

    return { tangents, normals, binormals };
  }

  /**
   * 1. Tube Profile: Full 3D Cylindrical Geometry with equal volume from all angles & spherical end caps
   */
  private buildTubeGeometry(
    positions: THREE.Vector3[],
    normals: THREE.Vector3[],
    binormals: THREE.Vector3[],
    tangents: THREE.Vector3[],
    pressures: number[],
    cumulativeDistances: number[],
    totalLength: number,
    settings: BrushSettings,
    baseOffset: number,
    taperLength: number
  ): THREE.BufferGeometry {
    const numPoints = positions.length;
    const radialSegments = 12;
    const vertices: number[] = [];
    const geomNormals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const jitterStrength = settings.jitterStrength ?? (settings.spatialJitterEnabled ? 0.25 : 0.0);
    const jitterFreq = settings.jitterFrequency ?? 8.0;
    const jitterAxis = settings.jitterAxis || 'binormal';

    for (let i = 0; i < numPoints; i++) {
      const pos = positions[i];
      const normal = normals[i];
      const binormal = binormals[i];
      const t = totalLength > 0 ? cumulativeDistances[i] / totalLength : i / (numPoints - 1);

      let taper = 1.0;
      if (t < 0.04) {
        taper = Math.sin((t / 0.04) * (Math.PI * 0.5));
      } else if (t > 0.96) {
        taper = Math.sin(((1.0 - t) / 0.04) * (Math.PI * 0.5));
      }
      taper = Math.max(0.01, Math.min(1.0, taper));

      const pressureScale = settings.pressureSensitivity ? Math.max(0.2, pressures[i]) : 1.0;
      const radius = settings.size * pressureScale * taper;

      // Spatial Jitter offset along Bishop frame axes
      const jitterOffset = new THREE.Vector3();
      if (jitterStrength > 0.001) {
        const phase = (cumulativeDistances[i] || i * 0.01) * jitterFreq;
        const noiseNorm = Math.sin(phase * 13.7 + Math.cos(phase * 7.9)) * jitterStrength * radius * 0.5;
        const noiseBinorm = Math.cos(phase * 19.1 + Math.sin(phase * 11.3)) * jitterStrength * radius * 0.5;
        if (jitterAxis === 'normal' || jitterAxis === 'omnidirectional') jitterOffset.addScaledVector(normal, noiseNorm);
        if (jitterAxis === 'binormal' || jitterAxis === 'omnidirectional') jitterOffset.addScaledVector(binormal, noiseBinorm);
      }

      const center = pos.clone().addScaledVector(normal, baseOffset + radius).add(jitterOffset);

      for (let j = 0; j < radialSegments; j++) {
        const theta = (j / radialSegments) * Math.PI * 2;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);

        const radialDir = binormal.clone().multiplyScalar(cosT).addScaledVector(normal, sinT).normalize();
        const vPos = center.clone().addScaledVector(radialDir, radius);

        vertices.push(vPos.x, vPos.y, vPos.z);
        geomNormals.push(radialDir.x, radialDir.y, radialDir.z);
        uvs.push(j / radialSegments, t);
      }
    }

    // Cylindrical ring faces
    for (let i = 0; i < numPoints - 1; i++) {
      for (let j = 0; j < radialSegments; j++) {
        const nextJ = (j + 1) % radialSegments;
        const a = i * radialSegments + j;
        const b = (i + 1) * radialSegments + j;
        const c = (i + 1) * radialSegments + nextJ;
        const d = i * radialSegments + nextJ;

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    // Spherical Start and End Caps
    this.addSphericalEndCap(vertices, geomNormals, uvs, indices, positions[0], normals[0], binormals[0], tangents[0], 0, radialSegments, settings.size * pressures[0], baseOffset, true);
    this.addSphericalEndCap(vertices, geomNormals, uvs, indices, positions[numPoints - 1], normals[numPoints - 1], binormals[numPoints - 1], tangents[numPoints - 1], (numPoints - 1) * radialSegments, radialSegments, settings.size * pressures[numPoints - 1], baseOffset, false);

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(geomNormals, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }

  /**
   * 2. Ribbon Profile: Flat Tape-Like Cross Section with Bishop Frame & Spatial Jitter
   */
  private buildRibbonGeometry(
    positions: THREE.Vector3[],
    normals: THREE.Vector3[],
    binormals: THREE.Vector3[],
    tangents: THREE.Vector3[],
    pressures: number[],
    cumulativeDistances: number[],
    totalLength: number,
    settings: BrushSettings,
    baseOffset: number,
    taperLength: number
  ): THREE.BufferGeometry {
    const numPoints = positions.length;
    const vertices: number[] = [];
    const geomNormals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const jitterStrength = settings.jitterStrength ?? (settings.spatialJitterEnabled ? 0.25 : 0.0);
    const jitterFreq = settings.jitterFrequency ?? 8.0;
    const jitterAxis = settings.jitterAxis || 'binormal';

    for (let i = 0; i < numPoints; i++) {
      const pos = positions[i];
      const normal = normals[i];
      const binormal = binormals[i];
      const t = totalLength > 0 ? cumulativeDistances[i] / totalLength : i / (numPoints - 1);

      let taper = 1.0;
      if (t < 0.04) {
        taper = Math.sin((t / 0.04) * (Math.PI * 0.5));
      } else if (t > 0.96) {
        taper = Math.sin(((1.0 - t) / 0.04) * (Math.PI * 0.5));
      }
      taper = Math.max(0.01, Math.min(1.0, taper));

      const pressureScale = settings.pressureSensitivity ? Math.max(0.2, pressures[i]) : 1.0;
      const widthMultiplier = Math.max(0.5, Math.min(10.0, settings.brushWidthMultiplier ?? (settings.brushShape === 'wide_flat' ? 3.0 : 1.0)));
      const width = settings.size * pressureScale * taper * 1.5 * widthMultiplier;

      // Spatial Jitter offset along Bishop frame axes
      const jitterOffset = new THREE.Vector3();
      if (jitterStrength > 0.001) {
        const phase = (cumulativeDistances[i] || i * 0.01) * jitterFreq;
        const noiseNorm = Math.sin(phase * 13.7 + Math.cos(phase * 7.9)) * jitterStrength * width * 0.5;
        const noiseBinorm = Math.cos(phase * 19.1 + Math.sin(phase * 11.3)) * jitterStrength * width * 0.5;
        if (jitterAxis === 'normal' || jitterAxis === 'omnidirectional') jitterOffset.addScaledVector(normal, noiseNorm);
        if (jitterAxis === 'binormal' || jitterAxis === 'omnidirectional') jitterOffset.addScaledVector(binormal, noiseBinorm);
      }

      const elevatedPos = pos.clone().addScaledVector(normal, baseOffset).add(jitterOffset);
      const left = elevatedPos.clone().addScaledVector(binormal, -width);
      const right = elevatedPos.clone().addScaledVector(binormal, width);

      vertices.push(left.x, left.y, left.z);
      geomNormals.push(normal.x, normal.y, normal.z);
      uvs.push(0.0, t);

      vertices.push(right.x, right.y, right.z);
      geomNormals.push(normal.x, normal.y, normal.z);
      uvs.push(1.0, t);
    }

    for (let i = 0; i < numPoints - 1; i++) {
      const a = i * 2;
      const b = (i + 1) * 2;
      const c = (i + 1) * 2 + 1;
      const d = i * 2 + 1;

      indices.push(a, b, d);
      indices.push(b, c, d);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(geomNormals, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }

  /**
   * 3. Marker / Chisel Profile: Asymmetric Calligraphic Rectangular Profile with Bishop Frame & Spatial Jitter
   */
  private buildMarkerGeometry(
    positions: THREE.Vector3[],
    normals: THREE.Vector3[],
    binormals: THREE.Vector3[],
    tangents: THREE.Vector3[],
    pressures: number[],
    cumulativeDistances: number[],
    totalLength: number,
    settings: BrushSettings,
    baseOffset: number,
    taperLength: number
  ): THREE.BufferGeometry {
    const numPoints = positions.length;
    const vertices: number[] = [];
    const geomNormals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const chiselAngleRad = ((settings.chiselAngle ?? 45) * Math.PI) / 180;
    const aspectRatio = settings.aspectRatio ?? 3.5; // width to thickness
    const jitterStrength = settings.jitterStrength ?? (settings.spatialJitterEnabled ? 0.25 : 0.0);
    const jitterFreq = settings.jitterFrequency ?? 8.0;
    const jitterAxis = settings.jitterAxis || 'binormal';

    for (let i = 0; i < numPoints; i++) {
      const pos = positions[i];
      const normal = normals[i];
      const binormal = binormals[i];
      const tangent = tangents[i];
      const t = totalLength > 0 ? cumulativeDistances[i] / totalLength : i / (numPoints - 1);

      let taper = 1.0;
      if (t < 0.04) {
        taper = Math.sin((t / 0.04) * (Math.PI * 0.5));
      } else if (t > 0.96) {
        taper = Math.sin(((1.0 - t) / 0.04) * (Math.PI * 0.5));
      }
      taper = Math.max(0.01, Math.min(1.0, taper));

      const pressureScale = settings.pressureSensitivity ? Math.max(0.2, pressures[i]) : 1.0;
      const widthMultiplier = Math.max(0.5, Math.min(10.0, settings.brushWidthMultiplier ?? (settings.brushShape === 'wide_flat' ? 3.0 : 1.0)));
      const baseRadius = settings.size * pressureScale * taper;
      const width = baseRadius * aspectRatio * 0.7 * widthMultiplier;
      const height = baseRadius * 0.35;

      // Rotate chisel plane around surface normal by fixed chisel angle
      const chiselDir = binormal.clone().multiplyScalar(Math.cos(chiselAngleRad)).addScaledVector(tangent, Math.sin(chiselAngleRad)).normalize();

      // Spatial Jitter offset
      const jitterOffset = new THREE.Vector3();
      if (jitterStrength > 0.001) {
        const phase = (cumulativeDistances[i] || i * 0.01) * jitterFreq;
        const noiseNorm = Math.sin(phase * 13.7 + Math.cos(phase * 7.9)) * jitterStrength * width * 0.5;
        const noiseBinorm = Math.cos(phase * 19.1 + Math.sin(phase * 11.3)) * jitterStrength * width * 0.5;
        if (jitterAxis === 'normal' || jitterAxis === 'omnidirectional') jitterOffset.addScaledVector(normal, noiseNorm);
        if (jitterAxis === 'binormal' || jitterAxis === 'omnidirectional') jitterOffset.addScaledVector(binormal, noiseBinorm);
      }

      const center = pos.clone().addScaledVector(normal, baseOffset + height).add(jitterOffset);

      // 4 corners of rectangular chisel profile: Top-Left, Top-Right, Bottom-Right, Bottom-Left
      const pTL = center.clone().addScaledVector(chiselDir, -width).addScaledVector(normal, height);
      const pTR = center.clone().addScaledVector(chiselDir, width).addScaledVector(normal, height);
      const pBR = center.clone().addScaledVector(chiselDir, width).addScaledVector(normal, -height);
      const pBL = center.clone().addScaledVector(chiselDir, -width).addScaledVector(normal, -height);

      const corners = [pTL, pTR, pBR, pBL];
      for (let k = 0; k < 4; k++) {
        vertices.push(corners[k].x, corners[k].y, corners[k].z);
        geomNormals.push(normal.x, normal.y, normal.z);
        uvs.push(k / 3, t);
      }
    }

    for (let i = 0; i < numPoints - 1; i++) {
      for (let k = 0; k < 4; k++) {
        const nextK = (k + 1) % 4;
        const a = i * 4 + k;
        const b = (i + 1) * 4 + k;
        const c = (i + 1) * 4 + nextK;
        const d = i * 4 + nextK;

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(geomNormals, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }

  /**
   * 4. Conformal Profile: Arched Dome Conformal Cross Section with Bishop Frame & Spatial Jitter
   */
  private buildConformalGeometry(
    positions: THREE.Vector3[],
    normals: THREE.Vector3[],
    binormals: THREE.Vector3[],
    tangents: THREE.Vector3[],
    pressures: number[],
    cumulativeDistances: number[],
    totalLength: number,
    settings: BrushSettings,
    targetMeshes: THREE.Mesh[],
    baseOffset: number,
    taperLength: number
  ): THREE.BufferGeometry {
    const numPoints = positions.length;
    const segmentsAcross = Math.max(3, settings.archSegments || 5);
    const uValues: number[] = [];
    for (let j = 0; j < segmentsAcross; j++) {
      uValues.push(-1.0 + (2.0 * j) / (segmentsAcross - 1));
    }

    const vertices: number[] = [];
    const geomNormals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const domeFactor = settings.domeFactor || 0.22;
    const jitterStrength = settings.jitterStrength ?? (settings.spatialJitterEnabled ? 0.25 : 0.0);
    const jitterFreq = settings.jitterFrequency ?? 8.0;
    const jitterAxis = settings.jitterAxis || 'binormal';

    for (let i = 0; i < numPoints; i++) {
      const pos = positions[i];
      const normal = normals[i];
      const binormal = binormals[i];
      const t = totalLength > 0 ? cumulativeDistances[i] / totalLength : i / (numPoints - 1);

      let taper = 1.0;
      if (t < 0.04) {
        taper = Math.sin((t / 0.04) * (Math.PI * 0.5));
      } else if (t > 0.96) {
        taper = Math.sin(((1.0 - t) / 0.04) * (Math.PI * 0.5));
      }
      taper = Math.max(0.01, Math.min(1.0, taper));

      const pressureScale = settings.pressureSensitivity ? Math.max(0.2, pressures[i]) : 1.0;
      const ringRadius = settings.size * pressureScale * taper;

      // Spatial Jitter deformation along Bishop frame
      const jitterOffset = new THREE.Vector3();
      if (jitterStrength > 0.001) {
        const phase = (cumulativeDistances[i] || i * 0.01) * jitterFreq;
        const noiseNorm = Math.sin(phase * 13.7 + Math.cos(phase * 7.9)) * jitterStrength * ringRadius * 0.5;
        const noiseBinorm = Math.cos(phase * 19.1 + Math.sin(phase * 11.3)) * jitterStrength * ringRadius * 0.5;
        if (jitterAxis === 'normal' || jitterAxis === 'omnidirectional') jitterOffset.addScaledVector(normal, noiseNorm);
        if (jitterAxis === 'binormal' || jitterAxis === 'omnidirectional') jitterOffset.addScaledVector(binormal, noiseBinorm);
      }

      for (let j = 0; j < segmentsAcross; j++) {
        const u = uValues[j];
        const domeHeight = baseOffset + ringRadius * domeFactor * Math.sqrt(Math.max(0, 1.0 - u * u));
        const lateralOffset = u * ringRadius;

        const finalPos = pos.clone()
          .addScaledVector(binormal, lateralOffset)
          .addScaledVector(normal, domeHeight)
          .add(jitterOffset);

        const archNormal = normal.clone().addScaledVector(binormal, u * 0.4).normalize();

        vertices.push(finalPos.x, finalPos.y, finalPos.z);
        geomNormals.push(archNormal.x, archNormal.y, archNormal.z);
        uvs.push((u + 1.0) * 0.5, t);
      }
    }

    for (let i = 0; i < numPoints - 1; i++) {
      for (let j = 0; j < segmentsAcross - 1; j++) {
        const a = i * segmentsAcross + j;
        const b = (i + 1) * segmentsAcross + j;
        const c = (i + 1) * segmentsAcross + (j + 1);
        const d = i * segmentsAcross + (j + 1);

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    // Add Start and End Caps
    this.addEndCap(vertices, geomNormals, uvs, indices, positions[0], normals[0], binormals[0], tangents[0], 0, segmentsAcross, settings.size * pressures[0], baseOffset, true);
    this.addEndCap(vertices, geomNormals, uvs, indices, positions[numPoints - 1], normals[numPoints - 1], binormals[numPoints - 1], tangents[numPoints - 1], (numPoints - 1) * segmentsAcross, segmentsAcross, settings.size * pressures[numPoints - 1], baseOffset, false);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(geomNormals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }

  /**
   * Adds rounded dome cap for conformal profile
   */
  private addEndCap(
    vertices: number[],
    geomNormals: number[],
    uvs: number[],
    indices: number[],
    centerPos: THREE.Vector3,
    normal: THREE.Vector3,
    binormal: THREE.Vector3,
    tangent: THREE.Vector3,
    ringStartIndex: number,
    segmentsAcross: number,
    radius: number,
    baseOffset: number,
    isStart: boolean
  ): void {
    const tipDir = isStart ? tangent.clone().negate() : tangent.clone();
    const tipPos = centerPos.clone()
      .addScaledVector(tipDir, radius * 0.35)
      .addScaledVector(normal, baseOffset + radius * 0.15);

    const tipVertexIdx = vertices.length / 3;
    vertices.push(tipPos.x, tipPos.y, tipPos.z);
    geomNormals.push(normal.x, normal.y, normal.z);
    uvs.push(0.5, isStart ? 0.0 : 1.0);

    for (let j = 0; j < segmentsAcross - 1; j++) {
      const ringA = ringStartIndex + j;
      const ringB = ringStartIndex + j + 1;
      if (isStart) {
        indices.push(tipVertexIdx, ringB, ringA);
      } else {
        indices.push(tipVertexIdx, ringA, ringB);
      }
    }
  }

  /**
   * Adds spherical cap for tube profile
   */
  private addSphericalEndCap(
    vertices: number[],
    geomNormals: number[],
    uvs: number[],
    indices: number[],
    centerPos: THREE.Vector3,
    normal: THREE.Vector3,
    binormal: THREE.Vector3,
    tangent: THREE.Vector3,
    ringStartIndex: number,
    radialSegments: number,
    radius: number,
    baseOffset: number,
    isStart: boolean
  ): void {
    const tipDir = isStart ? tangent.clone().negate() : tangent.clone();
    const tipPos = centerPos.clone()
      .addScaledVector(normal, baseOffset + radius)
      .addScaledVector(tipDir, radius);

    const tipIdx = vertices.length / 3;
    vertices.push(tipPos.x, tipPos.y, tipPos.z);
    geomNormals.push(tipDir.x, tipDir.y, tipDir.z);
    uvs.push(0.5, isStart ? 0.0 : 1.0);

    for (let j = 0; j < radialSegments; j++) {
      const nextJ = (j + 1) % radialSegments;
      const a = ringStartIndex + j;
      const b = ringStartIndex + nextJ;
      if (isStart) {
        indices.push(tipIdx, b, a);
      } else {
        indices.push(tipIdx, a, b);
      }
    }
  }

  /**
   * Generates a flat circular paint dab geometry for single-point clicks
   */
  private generateDabGeometry(
    point: StrokePoint,
    settings: BrushSettings,
    profile: StrokeProfile,
    targetMeshes: THREE.Mesh[] = []
  ): THREE.BufferGeometry {
    const normal = point.normal.clone().normalize();
    const pressureScale = settings.pressureSensitivity ? Math.max(0.3, point.pressure) : 1.0;
    const radius = settings.size * pressureScale;
    const baseOffset = settings.surfaceOffset ?? 0.0015;

    let tangent = new THREE.Vector3(0, 1, 0);
    if (Math.abs(normal.y) > 0.9) {
      tangent.set(1, 0, 0);
    }
    const binormal = new THREE.Vector3().crossVectors(normal, tangent).normalize();
    tangent.crossVectors(binormal, normal).normalize();

    const radialSegments = profile === 'marker' ? 4 : 16;
    const vertices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    // Center vertex of flat dab disc
    const centerPos = point.position.clone().addScaledVector(normal, baseOffset);
    vertices.push(centerPos.x, centerPos.y, centerPos.z);
    normals.push(normal.x, normal.y, normal.z);
    uvs.push(0.5, 0.5);

    // Perimeter vertices of flat disc
    for (let s = 0; s < radialSegments; s++) {
      const theta = (s / radialSegments) * Math.PI * 2;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      const vPos = centerPos.clone()
        .addScaledVector(tangent, cosT * radius)
        .addScaledVector(binormal, sinT * radius);

      vertices.push(vPos.x, vPos.y, vPos.z);
      normals.push(normal.x, normal.y, normal.z);
      uvs.push(0.5 + cosT * 0.5, 0.5 + sinT * 0.5);
    }

    // Triangular fan indices
    for (let s = 0; s < radialSegments; s++) {
      const nextS = (s + 1) % radialSegments;
      indices.push(0, 1 + s, 1 + nextS);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }

  /**
   * Resamples raw points using centripetal Catmull-Rom spline interpolation,
   * 7-point Gaussian velocity smoothing, and start/end whip clamping.
   */
  private resampleCurve(
    points: StrokePoint[],
    brushSize: number,
    targetMeshes: THREE.Mesh[] = []
  ): { positions: THREE.Vector3[]; normals: THREE.Vector3[]; pressures: number[]; velocities: number[] } {
    if (points.length < 2) {
      return {
        positions: points.map((p) => p.position.clone()),
        normals: points.map((p) => p.normal.clone()),
        pressures: points.map((p) => p.pressure),
        velocities: [0],
      };
    }

    // 1. Calculate raw instantaneous velocities
    const rawVelocities: number[] = [0];
    for (let i = 1; i < points.length; i++) {
      const dt = Math.max(1, points[i].time - points[i - 1].time) * 0.001;
      const dist = points[i].position.distanceTo(points[i - 1].position);
      rawVelocities.push(dist / dt);
    }

    // 2. 7-point Gaussian-weighted velocity kernel [1, 4, 8, 12, 8, 4, 1] / 38 (half-width 3)
    const kernel = [1, 4, 8, 12, 8, 4, 1];
    const kernelWeight = 38;
    const smoothedVelocities: number[] = [];

    for (let i = 0; i < points.length; i++) {
      let vSum = 0;
      let wSum = 0;
      for (let k = -3; k <= 3; k++) {
        const idx = i + k;
        if (idx >= 0 && idx < points.length) {
          const w = kernel[k + 3];
          vSum += rawVelocities[idx] * w;
          wSum += w;
        }
      }
      smoothedVelocities.push(wSum > 0 ? vSum / wSum : rawVelocities[i]);
    }

    // 3. Start/End Whip Clamping: clamp velocity on first 3 and last 3 points to refV * 1.5
    if (smoothedVelocities.length >= 6) {
      const refVStart = smoothedVelocities[3] || 1.0;
      for (let i = 0; i < 3; i++) {
        smoothedVelocities[i] = Math.min(smoothedVelocities[i], refVStart * 1.5);
      }
      const endIdx = smoothedVelocities.length - 1;
      const refVEnd = smoothedVelocities[endIdx - 3] || 1.0;
      for (let i = endIdx - 2; i <= endIdx; i++) {
        smoothedVelocities[i] = Math.min(smoothedVelocities[i], refVEnd * 1.5);
      }
    }

    const vectorPoints = points.map((p) => p.position);
    const curve = new THREE.CatmullRomCurve3(vectorPoints, false, 'centripetal', 0.5);

    const stepSize = Math.max(0.005, brushSize * 0.35);
    const length = curve.getLength();
    const divisions = Math.max(4, Math.min(180, Math.ceil(length / stepSize)));

    const rawPoints = curve.getPoints(divisions);
    const sampledPositions: THREE.Vector3[] = [];
    const sampledNormals: THREE.Vector3[] = [];
    const sampledPressures: number[] = [];
    const sampledVelocities: number[] = [];

    for (let i = 0; i <= divisions; i++) {
      const t = i / divisions;
      const rawIndex = t * (points.length - 1);
      const idxA = Math.floor(rawIndex);
      const idxB = Math.min(points.length - 1, idxA + 1);
      const frac = rawIndex - idxA;

      const normA = points[idxA].normal;
      const normB = points[idxB].normal;
      const interpNorm = new THREE.Vector3().copy(normA).lerp(normB, frac).normalize();
      const pos = rawPoints[i].clone();

      sampledPositions.push(pos);
      sampledNormals.push(interpNorm);

      const pressA = points[idxA].pressure || 1.0;
      const pressB = points[idxB].pressure || 1.0;
      sampledPressures.push(pressA + (pressB - pressA) * frac);

      const velA = smoothedVelocities[idxA] || 0;
      const velB = smoothedVelocities[idxB] || 0;
      sampledVelocities.push(velA + (velB - velA) * frac);
    }

    return {
      positions: sampledPositions,
      normals: sampledNormals,
      pressures: sampledPressures,
      velocities: sampledVelocities,
    };
  }
}

