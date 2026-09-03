use std::collections::HashMap;
use glam::Vec3;

use crate::types::{LiquifyMode, LiquifySettings, StrokeDescriptor};

pub struct VolumetricLiquifyEngine {
    base_descriptors: HashMap<String, StrokeDescriptor>,
    live_descriptors: HashMap<String, StrokeDescriptor>,
}

impl Default for VolumetricLiquifyEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl VolumetricLiquifyEngine {
    pub fn new() -> Self {
        Self {
            base_descriptors: HashMap::new(),
            live_descriptors: HashMap::new(),
        }
    }

    pub fn start_session(&mut self, descriptors: &[StrokeDescriptor]) {
        self.base_descriptors.clear();
        self.live_descriptors.clear();

        for desc in descriptors {
            self.base_descriptors.insert(desc.id.clone(), desc.clone());
            self.live_descriptors.insert(desc.id.clone(), desc.clone());
        }
    }

    pub fn live_descriptors(&self) -> &HashMap<String, StrokeDescriptor> {
        &self.live_descriptors
    }

    pub fn live_descriptors_mut(&mut self) -> &mut HashMap<String, StrokeDescriptor> {
        &mut self.live_descriptors
    }

    pub fn reset_session(&mut self) {
        self.live_descriptors = self.base_descriptors.clone();
    }

    /// Deforms stroke vertices within influence radius
    pub fn apply_liquify(
        &mut self,
        brush_center: Vec3,
        brush_delta: Vec3,
        settings: &LiquifySettings,
    ) {
        let radius = settings.brush_radius.max(0.01);
        let strength = settings.influence_strength.clamp(0.01, 2.0);

        for desc in self.live_descriptors.values_mut() {
            for pt in desc.points.iter_mut() {
                let dist = pt.position.distance(brush_center);
                if dist > radius {
                    continue;
                }

                let t = 1.0 - (dist / radius);
                // Cubic Hermite smoothstep falloff
                let falloff = (3.0 * t * t - 2.0 * t * t * t) * strength;

                match settings.mode {
                    LiquifyMode::Push => {
                        pt.position += brush_delta * falloff;
                    }
                    LiquifyMode::Pinch => {
                        let dir = (brush_center - pt.position).normalize_or_zero();
                        pt.position += dir * (falloff * radius * 0.5);
                    }
                    LiquifyMode::Inflate => {
                        let dir = pt.normal;
                        pt.position += dir * (falloff * radius * 0.5);
                    }
                    LiquifyMode::Comb => {
                        let vel_dir = brush_delta.normalize_or_zero();
                        pt.position += vel_dir * (falloff * brush_delta.length());
                    }
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{BrushSettings, StrokePoint, ToolType};

    #[test]
    fn test_liquify_push() {
        let mut engine = VolumetricLiquifyEngine::new();
        let settings = BrushSettings::default();
        let points = vec![
            StrokePoint::new(Vec3::new(0.0, 0.0, 0.0), Vec3::Y, 0.5, 0.0),
            StrokePoint::new(Vec3::new(1.0, 0.0, 0.0), Vec3::Y, 0.5, 10.0),
        ];

        let desc = StrokeDescriptor {
            id: "stroke_1".into(),
            layer_id: "layer_1".into(),
            tool: ToolType::Brush,
            points,
            settings,
            created_at: 0.0,
        };

        engine.start_session(&[desc]);

        let liquify_settings = LiquifySettings {
            mode: LiquifyMode::Push,
            brush_radius: 0.5,
            falloff_radius: 0.5,
            influence_strength: 1.0,
            iterations: 1,
        };

        engine.apply_liquify(Vec3::ZERO, Vec3::new(0.0, 1.0, 0.0), &liquify_settings);

        let live = engine.live_descriptors();
        let pt0_pos = live.get("stroke_1").unwrap().points[0].position;
        assert!(pt0_pos.y > 0.0, "Point at origin should be pushed along +Y");
    }
}
