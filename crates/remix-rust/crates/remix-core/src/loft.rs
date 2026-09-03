use std::f32::consts::PI;
use glam::{Quat, Vec3};
use crate::types::MeshData;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LoftProfile {
    Ribbon,
    Arc,
    UChannel,
    Pipe,
}

pub struct CatmullRomSpline {
    pub points: Vec<Vec3>,
    pub tension: f32, // 0.0 (uniform) to 1.0 (tight)
}

impl CatmullRomSpline {
    pub fn new(points: Vec<Vec3>, tension: f32) -> Self {
        Self { points, tension }
    }

    /// Evaluates spline position at t in [0.0, 1.0] across all segments
    pub fn evaluate(&self, t: f32) -> Vec3 {
        let n = self.points.len();
        if n == 0 {
            return Vec3::ZERO;
        }
        if n == 1 {
            return self.points[0];
        }

        let num_segments = n - 1;
        let scaled_t = (t.clamp(0.0, 1.0) * num_segments as f32).min(num_segments as f32 - 1e-5);
        let seg_idx = scaled_t.floor() as usize;
        let local_t = scaled_t - seg_idx as f32;

        let p0 = if seg_idx > 0 { self.points[seg_idx - 1] } else { self.points[0] };
        let p1 = self.points[seg_idx];
        let p2 = self.points[seg_idx + 1];
        let p3 = if seg_idx + 2 < n { self.points[seg_idx + 2] } else { self.points[n - 1] };

        let tension_factor = 1.0 - self.tension.clamp(0.0, 1.0);
        let m1 = (p2 - p0) * 0.5 * tension_factor;
        let m2 = (p3 - p1) * 0.5 * tension_factor;

        let t2 = local_t * local_t;
        let t3 = t2 * local_t;

        let h00 = 2.0 * t3 - 3.0 * t2 + 1.0;
        let h10 = t3 - 2.0 * t2 + local_t;
        let h01 = -2.0 * t3 + 3.0 * t2;
        let h11 = t3 - t2;

        p1 * h00 + m1 * h10 + p2 * h01 + m2 * h11
    }

    /// Samples uniform points along the Catmull-Rom spline
    pub fn sample_points(&self, divisions: usize) -> Vec<Vec3> {
        let div = divisions.max(2);
        let mut result = Vec::with_capacity(div + 1);
        for i in 0..=div {
            let t = i as f32 / div as f32;
            result.push(self.evaluate(t));
        }
        result
    }
}

pub struct LoftEngine;

impl LoftEngine {
    /// Generates a swept 3D manifold geometry along a spline path
    pub fn generate_loft(
        spline: &CatmullRomSpline,
        divisions: usize,
        width: f32,
        twist_degrees: f32,
        profile: LoftProfile,
        target_mesh: &mut MeshData,
    ) {
        target_mesh.clear();
        let path = spline.sample_points(divisions);
        if path.len() < 2 {
            return;
        }

        let n = path.len();
        let mut tangents = Vec::with_capacity(n);
        for i in 0..n {
            let tan = if i == 0 {
                (path[1] - path[0]).normalize_or_zero()
            } else if i == n - 1 {
                (path[n - 1] - path[n - 2]).normalize_or_zero()
            } else {
                ((path[i] - path[i - 1]).normalize_or_zero() + (path[i + 1] - path[i]).normalize_or_zero()).normalize_or_zero()
            };
            tangents.push(tan);
        }

        // Bishop frame calculation
        let mut normals = Vec::with_capacity(n);
        let mut binormals = Vec::with_capacity(n);

        let t0 = tangents[0];
        let mut b0 = if t0.y.abs() < 0.99 {
            t0.cross(Vec3::Y).normalize_or_zero()
        } else {
            t0.cross(Vec3::X).normalize_or_zero()
        };
        let mut n0 = b0.cross(t0).normalize_or_zero();
        normals.push(n0);
        binormals.push(b0);

        for i in 1..n {
            let t_prev = tangents[i - 1];
            let t_curr = tangents[i];
            let axis = t_prev.cross(t_curr);
            let axis_len = axis.length();
            if axis_len > 1e-5 {
                let q = Quat::from_axis_angle(axis / axis_len, t_prev.dot(t_curr).clamp(-1.0, 1.0).acos());
                n0 = (q * n0).normalize_or_zero();
                b0 = (q * b0).normalize_or_zero();
            }
            normals.push(n0);
            binormals.push(b0);
        }

        // Apply progressive banking twist
        let twist_rad = twist_degrees.to_radians();

        match profile {
            LoftProfile::Ribbon => {
                for i in 0..n {
                    let frac = i as f32 / (n - 1) as f32;
                    let angle = frac * twist_rad;
                    let rot = Quat::from_axis_angle(tangents[i], angle);
                    let local_binorm = rot * binormals[i];
                    let local_norm = rot * normals[i];

                    let p_left = path[i] - local_binorm * (width * 0.5);
                    let p_right = path[i] + local_binorm * (width * 0.5);

                    target_mesh.positions.push([p_left.x, p_left.y, p_left.z]);
                    target_mesh.normals.push([local_norm.x, local_norm.y, local_norm.z]);
                    target_mesh.uvs.push([0.0, frac]);

                    target_mesh.positions.push([p_right.x, p_right.y, p_right.z]);
                    target_mesh.normals.push([local_norm.x, local_norm.y, local_norm.z]);
                    target_mesh.uvs.push([1.0, frac]);
                }

                for i in 0..(n - 1) {
                    let a = (i * 2) as u32;
                    let b = ((i + 1) * 2) as u32;
                    target_mesh.indices.extend_from_slice(&[a, b, a + 1, a + 1, b, b + 1]);
                }
            }
            LoftProfile::Pipe => {
                let radial_segs = 8;
                for i in 0..n {
                    let frac = i as f32 / (n - 1) as f32;
                    let angle = frac * twist_rad;
                    let rot = Quat::from_axis_angle(tangents[i], angle);
                    let local_norm = rot * normals[i];
                    let local_binorm = rot * binormals[i];

                    for s in 0..radial_segs {
                        let theta = 2.0 * PI * (s as f32) / (radial_segs as f32);
                        let dir = local_norm * theta.cos() + local_binorm * theta.sin();
                        let pos = path[i] + dir * (width * 0.5);

                        target_mesh.positions.push([pos.x, pos.y, pos.z]);
                        target_mesh.normals.push([dir.x, dir.y, dir.z]);
                        target_mesh.uvs.push([(s as f32) / (radial_segs as f32), frac]);
                    }
                }

                for i in 0..(n - 1) {
                    let row0 = (i * radial_segs) as u32;
                    let row1 = ((i + 1) * radial_segs) as u32;

                    for s in 0..radial_segs {
                        let s_next = (s + 1) % radial_segs;
                        let a = row0 + s as u32;
                        let b = row1 + s as u32;
                        let c = row0 + s_next as u32;
                        let d = row1 + s_next as u32;

                        target_mesh.indices.extend_from_slice(&[a, b, c, c, b, d]);
                    }
                }
            }
            _ => {
                // Arc and UChannel fallback to ribbon
                Self::generate_loft(spline, divisions, width, twist_degrees, LoftProfile::Ribbon, target_mesh);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_catmull_rom_evaluation() {
        let pts = vec![
            Vec3::new(0.0, 0.0, 0.0),
            Vec3::new(1.0, 1.0, 0.0),
            Vec3::new(2.0, 0.0, 0.0),
            Vec3::new(3.0, -1.0, 0.0),
        ];
        let spline = CatmullRomSpline::new(pts, 0.5);
        let mid = spline.evaluate(0.5);
        assert!(mid.is_finite());
    }
}
