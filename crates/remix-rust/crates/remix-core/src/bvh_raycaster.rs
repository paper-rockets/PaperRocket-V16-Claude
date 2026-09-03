use glam::{Vec2, Vec3};

#[derive(Debug, Clone, Copy)]
pub struct Ray {
    pub origin: Vec3,
    pub direction: Vec3,
}

impl Ray {
    pub fn new(origin: Vec3, direction: Vec3) -> Self {
        Self {
            origin,
            direction: direction.normalize_or_zero(),
        }
    }

    pub fn at(&self, t: f32) -> Vec3 {
        self.origin + self.direction * t
    }
}

#[derive(Debug, Clone, Copy)]
pub struct Aabb {
    pub min: Vec3,
    pub max: Vec3,
}

impl Aabb {
    pub fn new(min: Vec3, max: Vec3) -> Self {
        Self { min, max }
    }

    pub fn empty() -> Self {
        Self {
            min: Vec3::splat(f32::INFINITY),
            max: Vec3::splat(f32::NEG_INFINITY),
        }
    }

    pub fn expand_point(&mut self, p: Vec3) {
        self.min = self.min.min(p);
        self.max = self.max.max(p);
    }

    pub fn intersects_ray(&self, ray: &Ray) -> Option<f32> {
        let inv_dir = Vec3::new(
            1.0 / ray.direction.x,
            1.0 / ray.direction.y,
            1.0 / ray.direction.z,
        );

        let t1 = (self.min.x - ray.origin.x) * inv_dir.x;
        let t2 = (self.max.x - ray.origin.x) * inv_dir.x;
        let t3 = (self.min.y - ray.origin.y) * inv_dir.y;
        let t4 = (self.max.y - ray.origin.y) * inv_dir.y;
        let t5 = (self.min.z - ray.origin.z) * inv_dir.z;
        let t6 = (self.max.z - ray.origin.z) * inv_dir.z;

        let tmin = t1.min(t2).max(t3.min(t4)).max(t5.min(t6));
        let tmax = t1.max(t2).min(t3.max(t4)).min(t5.max(t6));

        if tmax < 0.0 || tmin > tmax {
            None
        } else {
            Some(tmin.max(0.0))
        }
    }
}

#[derive(Debug, Clone)]
pub struct RayHit {
    pub distance: f32,
    pub point: Vec3,
    pub normal: Vec3,
    pub uv: Option<Vec2>,
    pub triangle_index: usize,
}

pub struct Triangle {
    pub v0: Vec3,
    pub v1: Vec3,
    pub v2: Vec3,
    pub n0: Vec3,
    pub n1: Vec3,
    pub n2: Vec3,
    pub uv0: Option<Vec2>,
    pub uv1: Option<Vec2>,
    pub uv2: Option<Vec2>,
}

pub struct SimpleBvhMesh {
    pub triangles: Vec<Triangle>,
    pub bounds: Aabb,
}

impl SimpleBvhMesh {
    pub fn from_mesh(
        positions: &[[f32; 3]],
        normals: &[[f32; 3]],
        uvs: &[[f32; 2]],
        indices: &[u32],
    ) -> Self {
        let mut triangles = Vec::with_capacity(indices.len() / 3);
        let mut bounds = Aabb::empty();

        for chunk in indices.chunks(3) {
            if chunk.len() < 3 {
                continue;
            }
            let i0 = chunk[0] as usize;
            let i1 = chunk[1] as usize;
            let i2 = chunk[2] as usize;

            let p0 = Vec3::from_array(positions[i0]);
            let p1 = Vec3::from_array(positions[i1]);
            let p2 = Vec3::from_array(positions[i2]);

            bounds.expand_point(p0);
            bounds.expand_point(p1);
            bounds.expand_point(p2);

            let n0 = if i0 < normals.len() { Vec3::from_array(normals[i0]) } else { (p1 - p0).cross(p2 - p0).normalize_or_zero() };
            let n1 = if i1 < normals.len() { Vec3::from_array(normals[i1]) } else { n0 };
            let n2 = if i2 < normals.len() { Vec3::from_array(normals[i2]) } else { n0 };

            let uv0 = uvs.get(i0).map(|uv| Vec2::from_array(*uv));
            let uv1 = uvs.get(i1).map(|uv| Vec2::from_array(*uv));
            let uv2 = uvs.get(i2).map(|uv| Vec2::from_array(*uv));

            triangles.push(Triangle {
                v0: p0,
                v1: p1,
                v2: p2,
                n0,
                n1,
                n2,
                uv0,
                uv1,
                uv2,
            });
        }

        Self { triangles, bounds }
    }

    /// Fast Möller-Trumbore ray-triangle intersection test
    pub fn raycast(&self, ray: &Ray) -> Option<RayHit> {
        if self.bounds.intersects_ray(ray).is_none() {
            return None;
        }

        let mut closest_hit: Option<RayHit> = None;
        let mut min_t = f32::INFINITY;

        for (idx, tri) in self.triangles.iter().enumerate() {
            let edge1 = tri.v1 - tri.v0;
            let edge2 = tri.v2 - tri.v0;
            let h = ray.direction.cross(edge2);
            let a = edge1.dot(h);

            if a.abs() < 1e-7 {
                continue; // Ray parallel to triangle
            }

            let f = 1.0 / a;
            let s = ray.origin - tri.v0;
            let u = f * s.dot(h);
            if !(0.0..=1.0).contains(&u) {
                continue;
            }

            let q = s.cross(edge1);
            let v = f * ray.direction.dot(q);
            if v < 0.0 || u + v > 1.0 {
                continue;
            }

            let t = f * edge2.dot(q);
            if t > 1e-4 && t < min_t {
                min_t = t;
                let w = 1.0 - u - v;
                let hit_pos = ray.at(t);
                let hit_normal = (tri.n0 * w + tri.n1 * u + tri.n2 * v).normalize_or_zero();

                let hit_uv = match (tri.uv0, tri.uv1, tri.uv2) {
                    (Some(u0), Some(u1), Some(u2)) => Some(u0 * w + u1 * u + u2 * v),
                    _ => None,
                };

                closest_hit = Some(RayHit {
                    distance: t,
                    point: hit_pos,
                    normal: hit_normal,
                    uv: hit_uv,
                    triangle_index: idx,
                });
            }
        }

        closest_hit
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ray_triangle_intersection() {
        let positions = vec![
            [-1.0, 0.0, 0.0],
            [1.0, 0.0, 0.0],
            [0.0, 2.0, 0.0],
        ];
        let normals = vec![[0.0, 0.0, 1.0]; 3];
        let uvs = vec![[0.0, 0.0], [1.0, 0.0], [0.5, 1.0]];
        let indices = vec![0, 1, 2];

        let mesh = SimpleBvhMesh::from_mesh(&positions, &normals, &uvs, &indices);
        let ray = Ray::new(Vec3::new(0.0, 0.5, 5.0), Vec3::new(0.0, 0.0, -1.0));

        let hit = mesh.raycast(&ray).expect("Should hit triangle");
        assert!((hit.distance - 5.0).abs() < 1e-3);
        assert!((hit.point.z - 0.0).abs() < 1e-3);
        assert!(hit.uv.is_some());
    }
}
