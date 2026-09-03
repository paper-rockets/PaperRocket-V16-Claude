use glam::{Vec2, Vec3};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ToolType {
    Brush,
    UvBrush,
    Eraser,
    Eyedropper,
    FreeBrush,
    SpatialBrush,
    Liquify,
    Pointer,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum StrokeProfile {
    Tube,
    Ribbon,
    Marker,
    Conformal,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum MaterialType {
    Shaded,
    Shadeless,
    Glow,
    Cutout,
    AnimatedFx,
    Matcap,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum AnimatedShaderEffect {
    Fire,
    OceanWave,
    Waterfall,
    Caustic,
    Foam,
    Ripple,
    Lava,
    Galaxy,
    Rainbow,
    Lightning,
    Glitter,
    Candy,
    Slime,
    Sparkler,
    FoliageLeaf,
    FoliageFir,
    Cloud,
    Jelly,
    Plasma,
    VolumetricPlasma,
    RimLight,
    AnimeCel,
    JellyWarp,
    PosterizeInk,
    Aurora,
    Hologram,
    ElectricArc,
}

impl AnimatedShaderEffect {
    pub fn name(&self) -> &'static str {
        match self {
            Self::Fire => "fire",
            Self::OceanWave => "ocean_wave",
            Self::Waterfall => "waterfall",
            Self::Caustic => "caustic",
            Self::Foam => "foam",
            Self::Ripple => "ripple",
            Self::Lava => "lava",
            Self::Galaxy => "galaxy",
            Self::Rainbow => "rainbow",
            Self::Lightning => "lightning",
            Self::Glitter => "glitter",
            Self::Candy => "candy",
            Self::Slime => "slime",
            Self::Sparkler => "sparkler",
            Self::FoliageLeaf => "foliage_leaf",
            Self::FoliageFir => "foliage_fir",
            Self::Cloud => "cloud",
            Self::Jelly => "jelly",
            Self::Plasma => "plasma",
            Self::VolumetricPlasma => "volumetric_plasma",
            Self::RimLight => "rim_light",
            Self::AnimeCel => "anime_cel",
            Self::JellyWarp => "jelly_warp",
            Self::PosterizeInk => "posterize_ink",
            Self::Aurora => "aurora",
            Self::Hologram => "hologram",
            Self::ElectricArc => "electric_arc",
        }
    }

    pub fn default_speed(&self) -> f32 {
        match self {
            Self::Fire => 1.5,
            Self::OceanWave => 1.0,
            Self::Waterfall => 1.8,
            Self::Caustic => 0.9,
            Self::Foam => 0.7,
            Self::Ripple => 1.2,
            Self::Lava => 0.45,
            Self::Galaxy => 0.3,
            Self::Rainbow => 0.8,
            Self::Lightning => 2.2,
            Self::Glitter => 1.6,
            Self::Candy => 0.6,
            Self::Slime => 0.5,
            Self::Sparkler => 3.0,
            Self::FoliageLeaf => 0.4,
            Self::FoliageFir => 0.35,
            Self::Cloud => 0.25,
            Self::Jelly => 0.85,
            Self::Plasma => 1.4,
            Self::VolumetricPlasma => 1.2,
            Self::RimLight => 0.6,
            Self::AnimeCel => 0.0,
            Self::JellyWarp => 1.1,
            Self::PosterizeInk => 0.2,
            Self::Aurora => 0.55,
            Self::Hologram => 1.7,
            Self::ElectricArc => 2.5,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PatternType {
    None,
    Dot,
    Line,
    Cross,
    Terrazzo,
    Stipple,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SmoothingAlgorithm {
    None,
    Streamline,
    Exponential,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum EraserMode {
    Cutout,
    Vacuum,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum LiquifyMode {
    Push,
    Pinch,
    Inflate,
    Comb,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiquifySettings {
    pub mode: LiquifyMode,
    pub brush_radius: f32,
    pub falloff_radius: f32,
    pub influence_strength: f32,
    pub iterations: usize,
}

impl Default for LiquifySettings {
    fn default() -> Self {
        Self {
            mode: LiquifyMode::Push,
            brush_radius: 0.3,
            falloff_radius: 0.5,
            influence_strength: 0.8,
            iterations: 2,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SymmetryMode {
    None,
    MirrorX,
    MirrorY,
    MirrorZ,
    CustomPlane,
    Radial4x,
    Radial8x,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum LayerBlendMode {
    Normal,
    Multiply,
    Screen,
    Overlay,
    Add,
    Subtract,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StrokePoint {
    pub position: Vec3,
    pub normal: Vec3,
    pub surface_offset: f32,
    pub pressure: f32,
    pub tangent: Option<Vec3>,
    pub binormal: Option<Vec3>,
    pub jitter: Option<Vec3>,
    pub color_linear: Option<[f32; 3]>,
    pub uv: Option<Vec2>,
    pub hit_mesh_id: Option<String>,
    pub is_surface_hit: bool,
    pub time: f64,
}

impl StrokePoint {
    pub fn new(position: Vec3, normal: Vec3, pressure: f32, time: f64) -> Self {
        Self {
            position,
            normal: normal.normalize_or_zero(),
            surface_offset: 0.002,
            pressure: pressure.clamp(0.0, 1.0),
            tangent: None,
            binormal: None,
            jitter: None,
            color_linear: None,
            uv: None,
            hit_mesh_id: None,
            is_surface_hit: true,
            time,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrushSettings {
    pub size: f32,
    pub opacity: f32,
    pub color_linear: [f32; 3],
    pub roughness: f32,
    pub metalness: f32,
    pub emissive_intensity: f32,
    pub pressure_sensitivity: bool,
    pub arch_segments: u32,
    pub dome_factor: f32,
    pub surface_offset: f32,
    pub taper_length: f32,
    pub silhouette_clamping: bool,
    pub spatial_jitter_enabled: bool,
    pub jitter_strength: f32,
    pub smoothing_algorithm: SmoothingAlgorithm,
    pub smoothing_strength: f32,
    pub material_type: MaterialType,
    pub shader_effect: Option<AnimatedShaderEffect>,
    pub profile: StrokeProfile,
    pub pattern_type: PatternType,
    pub chisel_angle: f32,
    pub aspect_ratio: f32,
    pub straight_line_mode: bool,
}

impl Default for BrushSettings {
    fn default() -> Self {
        Self {
            size: 0.05,
            opacity: 1.0,
            color_linear: [0.15, 0.55, 0.95],
            roughness: 0.35,
            metalness: 0.1,
            emissive_intensity: 0.0,
            pressure_sensitivity: true,
            arch_segments: 6,
            dome_factor: 0.25,
            surface_offset: 0.002,
            taper_length: 0.05,
            silhouette_clamping: true,
            spatial_jitter_enabled: false,
            jitter_strength: 0.0,
            smoothing_algorithm: SmoothingAlgorithm::Streamline,
            smoothing_strength: 0.5,
            material_type: MaterialType::Shaded,
            shader_effect: None,
            profile: StrokeProfile::Conformal,
            pattern_type: PatternType::None,
            chisel_angle: 45.0,
            aspect_ratio: 2.5,
            straight_line_mode: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StrokeDescriptor {
    pub id: String,
    pub layer_id: String,
    pub tool: ToolType,
    pub points: Vec<StrokePoint>,
    pub settings: BrushSettings,
    pub created_at: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Layer {
    pub id: String,
    pub name: String,
    pub visible: bool,
    pub locked: bool,
    pub opacity: f32,
    pub blend_mode: LayerBlendMode,
    pub stroke_ids: Vec<String>,
}

impl Layer {
    pub fn new(id: impl Into<String>, name: impl Into<String>) -> Self {
        Self {
            id: id.into(),
            name: name.into(),
            visible: true,
            locked: false,
            opacity: 1.0,
            blend_mode: LayerBlendMode::Normal,
            stroke_ids: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Default)]
pub struct MeshData {
    pub positions: Vec<[f32; 3]>,
    pub normals: Vec<[f32; 3]>,
    pub uvs: Vec<[f32; 2]>,
    pub colors: Option<Vec<[f32; 4]>>,
    pub indices: Vec<u32>,
}

impl MeshData {
    pub fn clear(&mut self) {
        self.positions.clear();
        self.normals.clear();
        self.uvs.clear();
        if let Some(ref mut c) = self.colors {
            c.clear();
        }
        self.indices.clear();
    }
}
