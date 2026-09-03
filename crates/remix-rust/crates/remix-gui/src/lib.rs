use egui::{Color32, Context, RichText, Slider, Window};
use glam::Vec3;
use remix_core::color_math::{hex_to_rgb, rgb_to_hex};
use remix_core::types::{AnimatedShaderEffect, BrushSettings, Layer, LiquifySettings, StrokeProfile, ToolType};

pub struct GuiState {
    pub active_tool: ToolType,
    pub brush_settings: BrushSettings,
    pub liquify_settings: LiquifySettings,
    pub show_color_studio: bool,
    pub show_brush_panel: bool,
    pub show_layers_panel: bool,
    pub show_transform_nav: bool,
    pub color_hex_input: String,
    pub active_layer_index: usize,
    pub status_message: String,
}

impl Default for GuiState {
    fn default() -> Self {
        Self {
            active_tool: ToolType::Brush,
            brush_settings: BrushSettings::default(),
            liquify_settings: LiquifySettings::default(),
            show_color_studio: false,
            show_brush_panel: true,
            show_layers_panel: true,
            show_transform_nav: false,
            color_hex_input: "#268CFA".into(),
            active_layer_index: 0,
            status_message: "Ready. Left Click: Paint | Right Click: Orbit | Wheel: Zoom".into(),
        }
    }
}

pub struct StudioGui;

impl StudioGui {
    pub fn render(
        ctx: &Context,
        state: &mut GuiState,
        layers: &mut Vec<Layer>,
        on_undo: &mut impl FnMut(),
        on_redo: &mut impl FnMut(),
        on_reset_camera: &mut impl FnMut(),
        on_clear_canvas: &mut impl FnMut(),
        on_export_glb: &mut impl FnMut(),
    ) {
        // Top Header Bar
        egui::TopBottomPanel::top("header_bar").show(ctx, |ui| {
            ui.horizontal(|ui| {
                ui.heading(RichText::new("Remix 3D Studio").color(Color32::from_rgb(0, 230, 255)).strong());
                ui.separator();

                if ui.button("Undo").clicked() {
                    on_undo();
                }
                if ui.button("Redo").clicked() {
                    on_redo();
                }
                if ui.button("Clear").clicked() {
                    on_clear_canvas();
                }
                if ui.button("Export GLB").clicked() {
                    on_export_glb();
                }
                if ui.button("Reset View").clicked() {
                    on_reset_camera();
                }

                ui.separator();
                ui.label(RichText::new(&state.status_message).weak().size(11.0));

                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                    ui.toggle_value(&mut state.show_transform_nav, "Transform Nav");
                    ui.toggle_value(&mut state.show_layers_panel, "Layers");
                    ui.toggle_value(&mut state.show_brush_panel, "Brush");
                    ui.toggle_value(&mut state.show_color_studio, "Color Studio");
                });
            });
        });

        // Left Floating Toolbar
        egui::Window::new("Tools")
            .resizable(false)
            .collapsible(false)
            .default_pos([16.0, 50.0])
            .show(ctx, |ui| {
                ui.vertical(|ui| {
                    ui.selectable_value(&mut state.active_tool, ToolType::Brush, "Surface Brush");
                    ui.selectable_value(&mut state.active_tool, ToolType::SpatialBrush, "3D Spatial Brush");
                    ui.selectable_value(&mut state.active_tool, ToolType::UvBrush, "UV Brush");
                    ui.selectable_value(&mut state.active_tool, ToolType::Liquify, "3D Liquify");
                    ui.selectable_value(&mut state.active_tool, ToolType::Eraser, "Eraser");
                    ui.selectable_value(&mut state.active_tool, ToolType::Eyedropper, "Eyedropper");
                });
            });

        // Brush Settings Window
        if state.show_brush_panel {
            Window::new("Brush Settings")
                .default_pos([16.0, 260.0])
                .show(ctx, |ui| {
                    ui.add(Slider::new(&mut state.brush_settings.size, 0.005..=0.5).text("Size"));
                    ui.add(Slider::new(&mut state.brush_settings.opacity, 0.05..=1.0).text("Opacity"));
                    ui.add(Slider::new(&mut state.brush_settings.roughness, 0.0..=1.0).text("Roughness"));
                    ui.add(Slider::new(&mut state.brush_settings.metalness, 0.0..=1.0).text("Metalness"));

                    ui.separator();
                    ui.label("Profile:");
                    ui.horizontal(|ui| {
                        ui.selectable_value(&mut state.brush_settings.profile, StrokeProfile::Conformal, "Conformal");
                        ui.selectable_value(&mut state.brush_settings.profile, StrokeProfile::Tube, "Tube");
                        ui.selectable_value(&mut state.brush_settings.profile, StrokeProfile::Ribbon, "Ribbon");
                        ui.selectable_value(&mut state.brush_settings.profile, StrokeProfile::Marker, "Marker");
                    });

                    if state.brush_settings.profile == StrokeProfile::Conformal {
                        ui.add(Slider::new(&mut state.brush_settings.dome_factor, 0.05..=1.0).text("Dome Height"));
                        ui.add(Slider::new(&mut state.brush_settings.arch_segments, 3..=12).text("Arch Segments"));
                    }

                    ui.separator();
                    ui.label("Shader Effect:");
                    egui::ComboBox::from_label("")
                        .selected_text(match state.brush_settings.shader_effect {
                            None => "Standard Shaded",
                            Some(AnimatedShaderEffect::Fire) => "Fire",
                            Some(AnimatedShaderEffect::OceanWave) => "Ocean Wave",
                            Some(AnimatedShaderEffect::Waterfall) => "Waterfall",
                            Some(AnimatedShaderEffect::Caustic) => "Caustic",
                            Some(AnimatedShaderEffect::Lava) => "Lava",
                            Some(AnimatedShaderEffect::Galaxy) => "Galaxy",
                            Some(AnimatedShaderEffect::Rainbow) => "Rainbow",
                            Some(AnimatedShaderEffect::Plasma) => "Plasma",
                            Some(AnimatedShaderEffect::Hologram) => "Hologram",
                            _ => "Custom Shader",
                        })
                        .show_ui(ui, |ui| {
                            ui.selectable_value(&mut state.brush_settings.shader_effect, None, "Standard Shaded");
                            ui.selectable_value(&mut state.brush_settings.shader_effect, Some(AnimatedShaderEffect::Fire), "Fire");
                            ui.selectable_value(&mut state.brush_settings.shader_effect, Some(AnimatedShaderEffect::OceanWave), "Ocean Wave");
                            ui.selectable_value(&mut state.brush_settings.shader_effect, Some(AnimatedShaderEffect::Waterfall), "Waterfall");
                            ui.selectable_value(&mut state.brush_settings.shader_effect, Some(AnimatedShaderEffect::Caustic), "Caustic");
                            ui.selectable_value(&mut state.brush_settings.shader_effect, Some(AnimatedShaderEffect::Lava), "Lava");
                            ui.selectable_value(&mut state.brush_settings.shader_effect, Some(AnimatedShaderEffect::Galaxy), "Galaxy");
                            ui.selectable_value(&mut state.brush_settings.shader_effect, Some(AnimatedShaderEffect::Rainbow), "Rainbow");
                            ui.selectable_value(&mut state.brush_settings.shader_effect, Some(AnimatedShaderEffect::Plasma), "Plasma");
                            ui.selectable_value(&mut state.brush_settings.shader_effect, Some(AnimatedShaderEffect::Hologram), "Hologram");
                        });

                    ui.separator();
                    ui.checkbox(&mut state.brush_settings.pressure_sensitivity, "Pressure Sensitivity");
                    ui.checkbox(&mut state.brush_settings.spatial_jitter_enabled, "Spatial Jitter");
                });
        }

        // Color Studio Window
        if state.show_color_studio {
            Window::new("Color Studio")
                .default_pos([260.0, 50.0])
                .show(ctx, |ui| {
                    let mut col_rgb = [
                        state.brush_settings.color_linear[0],
                        state.brush_settings.color_linear[1],
                        state.brush_settings.color_linear[2],
                    ];
                    if ui.color_edit_button_rgb(&mut col_rgb).changed() {
                        state.brush_settings.color_linear = col_rgb;
                        state.color_hex_input = rgb_to_hex(Vec3::from_array(col_rgb));
                    }

                    ui.horizontal(|ui| {
                        ui.label("Hex:");
                        if ui.text_edit_singleline(&mut state.color_hex_input).changed() {
                            if let Some(rgb) = hex_to_rgb(&state.color_hex_input) {
                                state.brush_settings.color_linear = [rgb.x, rgb.y, rgb.z];
                            }
                        }
                    });

                    ui.separator();
                    ui.label("Presets:");
                    ui.horizontal_wrapped(|ui| {
                        let presets = [
                            ("#00F0FF", [0.0, 0.94, 1.0]),
                            ("#FF007F", [1.0, 0.0, 0.5]),
                            ("#FFD700", [1.0, 0.84, 0.0]),
                            ("#39FF14", [0.22, 1.0, 0.08]),
                            ("#FFFFFF", [1.0, 1.0, 1.0]),
                            ("#1A1A24", [0.1, 0.1, 0.14]),
                        ];
                        for (hex, rgb) in presets {
                            if ui.button(hex).clicked() {
                                state.brush_settings.color_linear = rgb;
                                state.color_hex_input = hex.to_string();
                            }
                        }
                    });
                });
        }

        // Layers Panel
        if state.show_layers_panel {
            Window::new("Layers")
                .default_pos([ctx.screen_rect().max.x - 240.0, 50.0])
                .show(ctx, |ui| {
                    ui.horizontal(|ui| {
                        if ui.button("+ Add Layer").clicked() {
                            let idx = layers.len() + 1;
                            layers.push(Layer::new(format!("layer_{}", idx), format!("Layer {}", idx)));
                        }
                    });
                    ui.separator();

                    for (idx, layer) in layers.iter_mut().enumerate() {
                        ui.horizontal(|ui| {
                            ui.checkbox(&mut layer.visible, "");
                            ui.selectable_value(&mut state.active_layer_index, idx, &layer.name);
                            ui.add(Slider::new(&mut layer.opacity, 0.0..=1.0).show_value(false));
                        });
                    }
                });
        }
    }
}
