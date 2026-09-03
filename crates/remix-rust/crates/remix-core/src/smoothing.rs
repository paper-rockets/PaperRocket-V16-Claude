use glam::Vec3;
use crate::types::StrokePoint;

pub struct StreamlineSmoother {
    pub strength: f32, // 0.0 to 1.0
    history: Vec<Vec3>,
    max_history: usize,
}

impl StreamlineSmoother {
    pub fn new(strength: f32) -> Self {
        Self {
            strength: strength.clamp(0.0, 0.95),
            history: Vec::with_capacity(16),
            max_history: 8,
        }
    }

    pub fn reset(&mut self) {
        self.history.clear();
    }

    pub fn smooth_point(&mut self, pt: &mut StrokePoint) {
        if self.strength < 1e-3 {
            return;
        }

        self.history.push(pt.position);
        if self.history.len() > self.max_history {
            self.history.remove(0);
        }

        let n = self.history.len();
        if n <= 1 {
            return;
        }

        // Weighted moving average favoring recent samples
        let mut sum = Vec3::ZERO;
        let mut total_weight = 0.0;

        for (i, &pos) in self.history.iter().enumerate() {
            let weight = (i + 1) as f32;
            sum += pos * weight;
            total_weight += weight;
        }

        let smoothed = sum / total_weight;
        pt.position = pt.position.lerp(smoothed, self.strength);
    }
}
