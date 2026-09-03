use glam::Vec3;
use crate::types::StrokePoint;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RecognizedShape {
    Line,
    Circle,
    Freehand,
}

pub struct ShapeSnapper;

impl ShapeSnapper {
    /// Tests if a stroke forms a straight line or circular arc
    pub fn recognize(points: &[StrokePoint], tolerance: f32) -> RecognizedShape {
        if points.len() < 4 {
            return RecognizedShape::Freehand;
        }

        let start = points.first().unwrap().position;
        let end = points.last().unwrap().position;
        let total_chord = start.distance(end);

        // Check if endpoints meet (closed loop)
        let is_closed = total_chord < 0.15 * Self::path_length(points);

        if is_closed && points.len() >= 8 {
            // Check for circle fit
            let center = Self::centroid(points);
            let mut radii = Vec::with_capacity(points.len());
            for p in points {
                radii.push(p.position.distance(center));
            }
            let avg_radius = radii.iter().sum::<f32>() / (radii.len() as f32);
            let max_deviation = radii.iter().map(|r| (r - avg_radius).abs()).fold(0.0f32, f32::max);

            if max_deviation / avg_radius < tolerance {
                return RecognizedShape::Circle;
            }
        } else if total_chord > 1e-3 {
            // Check for straight line fit
            let line_dir = (end - start).normalize_or_zero();
            let mut max_dist: f32 = 0.0;

            for p in points.iter().skip(1).take(points.len() - 2) {
                let v = p.position - start;
                let proj = v.dot(line_dir);
                let dist = (v - line_dir * proj).length();
                max_dist = max_dist.max(dist);
            }

            if max_dist / total_chord < tolerance {
                return RecognizedShape::Line;
            }
        }

        RecognizedShape::Freehand
    }

    /// Douglas-Peucker point decimation algorithm
    pub fn decimate(points: &[StrokePoint], epsilon: f32) -> Vec<StrokePoint> {
        if points.len() <= 2 {
            return points.to_vec();
        }

        let mut dmax = 0.0;
        let mut index = 0;
        let start = points.first().unwrap().position;
        let end = points.last().unwrap().position;
        let line_dir = (end - start).normalize_or_zero();
        let line_len = start.distance(end);

        for i in 1..(points.len() - 1) {
            let p = points[i].position;
            let dist = if line_len < 1e-4 {
                p.distance(start)
            } else {
                let v = p - start;
                let proj = v.dot(line_dir).clamp(0.0, line_len);
                (v - line_dir * proj).length()
            };

            if dist > dmax {
                index = i;
                dmax = dist;
            }
        }

        if dmax > epsilon {
            let mut rec1 = Self::decimate(&points[0..=index], epsilon);
            let rec2 = Self::decimate(&points[index..], epsilon);
            rec1.pop();
            rec1.extend(rec2);
            rec1
        } else {
            vec![points.first().unwrap().clone(), points.last().unwrap().clone()]
        }
    }

    fn path_length(points: &[StrokePoint]) -> f32 {
        let mut sum = 0.0;
        for i in 1..points.len() {
            sum += points[i].position.distance(points[i - 1].position);
        }
        sum
    }

    fn centroid(points: &[StrokePoint]) -> Vec3 {
        let sum: Vec3 = points.iter().map(|p| p.position).sum();
        sum / (points.len() as f32)
    }
}
