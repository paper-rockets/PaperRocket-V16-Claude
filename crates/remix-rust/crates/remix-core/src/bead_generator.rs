use std::f32::consts::PI;
use glam::{Quat, Vec3};

use crate::types::{BrushSettings, MeshData, StrokePoint, StrokeProfile};

pub struct ConformalBeadGenerator {
    scratch_tangents: Vec<Vec3>,
    scratch_normals: Vec<Vec3>,
    scratch_binormals: Vec<Vec3>,
}

impl Default for ConformalBeadGenerator {
    fn default() -> Self {
        Self::new()
    }
}

impl ConformalBeadGenerator {
    pub fn new() -> Self {
        Self {
            scratch_tangents: Vec::with_capacity(512),
            scratch_normals: Vec::with_capacity(512),
            scratch_binormals: Vec::with_capacity(512),
        }
    }

    /// Generates or updates volumetric 3D mesh geometry from points and brush settings.
    /// Reuses buffers inside target_mesh without reallocating if capacity is sufficient.
    pub fn generate_geometry(
        &mut self,
        points: &[StrokePoint],
        settings: &BrushSettings,
        target_mesh: &mut MeshData,
    ) {
        target_mesh.clear();
        if points.len() < 2 {
            return;
        }

        // Filter out redundant points with near-zero distance
        let mut filtered_points: Vec<&StrokePoint> = Vec::with_capacity(points.len());
        filtered_points.push(&points[0]);
        for pt in points.iter().skip(1) {
            let last_pos = filtered_points.last().unwrap().position;
            if pt.position.distance_squared(last_pos) > 1e-6 {
                filtered_points.push(pt);
            }
        }

        let n = filtered_points.len();
        if n < 2 {
            return;
        }

        // Prepare frame vectors
        self.scratch_tangents.clear();
        self.scratch_normals.clear();
        self.scratch_binormals.clear();
        self.scratch_tangents.resize(n, Vec3::ZERO);
        self.scratch_normals.resize(n, Vec3::ZERO);
        self.scratch_binormals.resize(n, Vec3::ZERO);

        // Compute tangents
        for i in 0..n {
            let tan = if i == 0 {
                (filtered_points[1].position - filtered_points[0].position).normalize_or_zero()
            } else if i == n - 1 {
                (filtered_points[n - 1].position - filtered_points[n - 2].position).normalize_or_zero()
            } else {
                let d1 = (filtered_points[i].position - filtered_points[i - 1].position).normalize_or_zero();
                let d2 = (filtered_points[i + 1].position - filtered_points[i].position).normalize_or_zero();
                (d1 + d2).normalize_or_zero()
            };
            self.scratch_tangents[i] = tan;
        }

        // Bishop Parallel Transport frame generation
        // Initialize first frame
        let mut initial_normal = filtered_points[0].normal;
        if initial_normal.length_squared() < 1e-4 {
            initial_normal = Vec3::Y;
        }
        let t0 = self.scratch_tangents[0];
        let mut b0 = t0.cross(initial_normal).normalize_or_zero();
        if b0.length_squared() < 1e-4 {
            let arbitrary = if t0.x.abs() < 0.9 { Vec3::X } else { Vec3::Z };
            b0 = t0.cross(arbitrary).normalize_or_zero();
        }
        let mut n0 = b0.cross(t0).normalize_or_zero();

        self.scratch_normals[0] = n0;
        self.scratch_binormals[0] = b0;

        for i in 1..n {
            let t_prev = self.scratch_tangents[i - 1];
            let t_curr = self.scratch_tangents[i];
            let axis = t_prev.cross(t_curr);
            let axis_len = axis.length();

            if axis_len > 1e-5 {
                let norm_axis = axis / axis_len;
                let angle = t_prev.dot(t_curr).clamp(-1.0, 1.0).acos();
                let q = Quat::from_axis_angle(norm_axis, angle);
                n0 = (q * n0).normalize_or_zero();
                b0 = (q * b0).normalize_or_zero();
            } else if t_prev.dot(t_curr) < -0.99 {
                // Direction reversal fallback
                b0 = -b0;
                n0 = -n0;
            }
            self.scratch_normals[i] = n0;
            self.scratch_binormals[i] = b0;
        }

        match settings.profile {
            StrokeProfile::Tube => self.build_tube_mesh(&filtered_points, settings, target_mesh),
            StrokeProfile::Ribbon => self.build_ribbon_mesh(&filtered_points, settings, target_mesh),
            StrokeProfile::Marker => self.build_marker_mesh(&filtered_points, settings, target_mesh),
            StrokeProfile::Conformal => self.build_conformal_mesh(&filtered_points, settings, target_mesh),
        }
    }

    fn build_tube_mesh(
        &self,
        points: &[&StrokePoint],
        settings: &BrushSettings,
        target_mesh: &mut MeshData,
    ) {
        let n = points.len();
        let radial_segments = 8;
        let mut arc_angles = Vec::with_capacity(radial_segments);
        for s in 0..radial_segments {
            arc_angles.push(2.0 * PI * (s as f32) / (radial_segments as f32));
        }

        let total_dist = self.calculate_total_distance(points);
        let mut curr_dist = 0.0;

        for (i, pt) in points.iter().enumerate() {
            if i > 0 {
                curr_dist += points[i].position.distance(points[i - 1].position);
            }
            let radius = self.calculate_radius(i, n, curr_dist, total_dist, pt.pressure, settings);
            let norm = self.scratch_normals[i];
            let binorm = self.scratch_binormals[i];
            let v_coord = if total_dist > 1e-4 { curr_dist / total_dist } else { 0.0 };

            for (s, &angle) in arc_angles.iter().enumerate() {
                let dir = norm * angle.cos() + binorm * angle.sin();
                let pos = pt.position + dir * radius;
                let u_coord = (s as f32) / (radial_segments as f32);

                target_mesh.positions.push([pos.x, pos.y, pos.z]);
                target_mesh.normals.push([dir.x, dir.y, dir.z]);
                target_mesh.uvs.push([u_coord, v_coord]);
            }
        }

        // Build index buffer connecting adjacent rings
        for i in 0..(n - 1) {
            let row0 = (i * radial_segments) as u32;
            let row1 = ((i + 1) * radial_segments) as u32;

            for s in 0..radial_segments {
                let s_next = (s + 1) % radial_segments;
                let a = row0 + s as u32;
                let b = row1 + s as u32;
                let c = row0 + s_next as u32;
                let d = row1 + s_next as u32;

                target_mesh.indices.extend_from_slice(&[a, b, c, c, b, d]);
            }
        }
    }

    fn build_ribbon_mesh(
        &self,
        points: &[&StrokePoint],
        settings: &BrushSettings,
        target_mesh: &mut MeshData,
    ) {
        let n = points.len();
        let total_dist = self.calculate_total_distance(points);
        let mut curr_dist = 0.0;

        for (i, pt) in points.iter().enumerate() {
            if i > 0 {
                curr_dist += points[i].position.distance(points[i - 1].position);
            }
            let half_width = self.calculate_radius(i, n, curr_dist, total_dist, pt.pressure, settings);
            let binorm = self.scratch_binormals[i];
            let norm = self.scratch_normals[i];
            let v_coord = if total_dist > 1e-4 { curr_dist / total_dist } else { 0.0 };

            let pos_left = pt.position - binorm * half_width;
            let pos_right = pt.position + binorm * half_width;

            target_mesh.positions.push([pos_left.x, pos_left.y, pos_left.z]);
            target_mesh.normals.push([norm.x, norm.y, norm.z]);
            target_mesh.uvs.push([0.0, v_coord]);

            target_mesh.positions.push([pos_right.x, pos_right.y, pos_right.z]);
            target_mesh.normals.push([norm.x, norm.y, norm.z]);
            target_mesh.uvs.push([1.0, v_coord]);
        }

        for i in 0..(n - 1) {
            let a = (i * 2) as u32;
            let b = ((i + 1) * 2) as u32;
            let c = a + 1;
            let d = b + 1;

            target_mesh.indices.extend_from_slice(&[a, b, c, c, b, d]);
        }
    }

    fn build_marker_mesh(
        &self,
        points: &[&StrokePoint],
        settings: &BrushSettings,
        target_mesh: &mut MeshData,
    ) {
        let n = points.len();
        let total_dist = self.calculate_total_distance(points);
        let mut curr_dist = 0.0;
        let chisel_angle_rad = settings.chisel_angle.to_radians();

        for (i, pt) in points.iter().enumerate() {
            if i > 0 {
                curr_dist += points[i].position.distance(points[i - 1].position);
            }
            let r = self.calculate_radius(i, n, curr_dist, total_dist, pt.pressure, settings);
            let width = r * settings.aspect_ratio;
            let height = r / settings.aspect_ratio;

            let norm = self.scratch_normals[i];
            let binorm = self.scratch_binormals[i];
            let chisel_dir = binorm * chisel_angle_rad.cos() + norm * chisel_angle_rad.sin();
            let v_coord = if total_dist > 1e-4 { curr_dist / total_dist } else { 0.0 };

            let pos_left = pt.position - chisel_dir * width + norm * height;
            let pos_right = pt.position + chisel_dir * width - norm * height;

            target_mesh.positions.push([pos_left.x, pos_left.y, pos_left.z]);
            target_mesh.normals.push([norm.x, norm.y, norm.z]);
            target_mesh.uvs.push([0.0, v_coord]);

            target_mesh.positions.push([pos_right.x, pos_right.y, pos_right.z]);
            target_mesh.normals.push([norm.x, norm.y, norm.z]);
            target_mesh.uvs.push([1.0, v_coord]);
        }

        for i in 0..(n - 1) {
            let a = (i * 2) as u32;
            let b = ((i + 1) * 2) as u32;
            let c = a + 1;
            let d = b + 1;

            target_mesh.indices.extend_from_slice(&[a, b, c, c, b, d]);
        }
    }

    fn build_conformal_mesh(
        &self,
        points: &[&StrokePoint],
        settings: &BrushSettings,
        target_mesh: &mut MeshData,
    ) {
        let n = points.len();
        let segments = settings.arch_segments.max(3) as usize;
        let total_dist = self.calculate_total_distance(points);
        let mut curr_dist = 0.0;

        for (i, pt) in points.iter().enumerate() {
            if i > 0 {
                curr_dist += points[i].position.distance(points[i - 1].position);
            }
            let radius = self.calculate_radius(i, n, curr_dist, total_dist, pt.pressure, settings);
            let norm = self.scratch_normals[i];
            let binorm = self.scratch_binormals[i];
            let v_coord = if total_dist > 1e-4 { curr_dist / total_dist } else { 0.0 };

            for s in 0..=segments {
                let frac = (s as f32) / (segments as f32); // 0.0 to 1.0
                let theta = frac * PI; // 0.0 to PI (semi-circle dome)
                let lateral = -binorm * theta.cos() * radius;
                let dome_lift = norm * theta.sin() * (radius * settings.dome_factor);
                let pos = pt.position + lateral + dome_lift + norm * settings.surface_offset;
                let arched_normal = (lateral.normalize_or_zero() * 0.4 + norm * 0.8).normalize_or_zero();

                target_mesh.positions.push([pos.x, pos.y, pos.z]);
                target_mesh.normals.push([arched_normal.x, arched_normal.y, arched_normal.z]);
                target_mesh.uvs.push([frac, v_coord]);
            }
        }

        let stride = (segments + 1) as u32;
        for i in 0..(n - 1) {
            let row0 = (i as u32) * stride;
            let row1 = ((i + 1) as u32) * stride;

            for s in 0..segments {
                let a = row0 + s as u32;
                let b = row1 + s as u32;
                let c = a + 1;
                let d = b + 1;

                target_mesh.indices.extend_from_slice(&[a, b, c, c, b, d]);
            }
        }
    }

    fn calculate_total_distance(&self, points: &[&StrokePoint]) -> f32 {
        let mut sum = 0.0;
        for i in 1..points.len() {
            sum += points[i].position.distance(points[i - 1].position);
        }
        sum
    }

    fn calculate_radius(
        &self,
        _index: usize,
        _count: usize,
        curr_dist: f32,
        total_dist: f32,
        pressure: f32,
        settings: &BrushSettings,
    ) -> f32 {
        let base_r = settings.size * 0.5;
        let pressure_scale = if settings.pressure_sensitivity {
            0.2 + 0.8 * pressure
        } else {
            1.0
        };

        // Smooth start & end taper
        let taper_len = total_dist * settings.taper_length.clamp(0.01, 0.4);
        let start_taper = if taper_len > 1e-4 && curr_dist < taper_len {
            curr_dist / taper_len
        } else {
            1.0
        };
        let end_dist = total_dist - curr_dist;
        let end_taper = if taper_len > 1e-4 && end_dist < taper_len {
            end_dist / taper_len
        } else {
            1.0
        };

        base_r * pressure_scale * start_taper.min(end_taper).clamp(0.05, 1.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bead_generator_conformal() {
        let mut gen = ConformalBeadGenerator::new();
        let settings = BrushSettings::default();
        let mut mesh = MeshData::default();

        let points = vec![
            StrokePoint::new(Vec3::new(0.0, 0.0, 0.0), Vec3::Y, 0.5, 0.0),
            StrokePoint::new(Vec3::new(1.0, 0.0, 0.0), Vec3::Y, 0.8, 10.0),
            StrokePoint::new(Vec3::new(2.0, 0.0, 0.0), Vec3::Y, 0.5, 20.0),
        ];

        gen.generate_geometry(&points, &settings, &mut mesh);

        assert!(!mesh.positions.is_empty());
        assert!(!mesh.normals.is_empty());
        assert!(!mesh.indices.is_empty());
        assert_eq!(mesh.positions.len(), mesh.normals.len());
        assert_eq!(mesh.positions.len(), mesh.uvs.len());
    }
}
