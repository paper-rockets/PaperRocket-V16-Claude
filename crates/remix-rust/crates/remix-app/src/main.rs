use std::sync::Arc;
use glam::{Mat4, Vec3};
use remix_core::bead_generator::ConformalBeadGenerator;
use remix_core::types::{Layer, MeshData, StrokePoint};
use remix_gui::{GuiState, StudioGui};
use remix_render::{CameraUniform, GpuVertex, MaterialUniform, RenderPipelineManager};
use winit::{
    application::ApplicationHandler,
    event::{ElementState, MouseButton, MouseScrollDelta, WindowEvent},
    event_loop::{ActiveEventLoop, ControlFlow, EventLoop},
    window::{Window, WindowId},
};

struct AppState {
    window: Arc<Window>,
    surface: wgpu::Surface<'static>,
    device: wgpu::Device,
    queue: wgpu::Queue,
    config: wgpu::SurfaceConfiguration,
    pipeline_mgr: RenderPipelineManager,
    camera_buffer: wgpu::Buffer,
    camera_bind_group: wgpu::BindGroup,
    material_buffer: wgpu::Buffer,
    material_bind_group: wgpu::BindGroup,
    vertex_buffer: Option<wgpu::Buffer>,
    index_buffer: Option<wgpu::Buffer>,
    index_count: u32,

    // egui integration
    egui_ctx: egui::Context,
    egui_state: egui_winit::State,
    egui_renderer: egui_wgpu::Renderer,

    // Geometry & Stroke Accumulation
    bead_generator: ConformalBeadGenerator,
    stroke_points: Vec<StrokePoint>,
    finished_strokes: Vec<MeshData>,
    redo_strokes: Vec<MeshData>,
    combined_mesh: MeshData,

    // UI & State
    layers: Vec<Layer>,
    gui_state: GuiState,
    is_painting: bool,
    is_orbiting: bool,
    is_panning: bool,
    last_cursor_pos: Option<(f64, f64)>,

    // Camera
    camera_target: Vec3,
    camera_yaw: f32,
    camera_pitch: f32,
    camera_dist: f32,

    start_time: std::time::Instant,
}

#[derive(Default)]
struct App {
    state: Option<AppState>,
}

impl AppState {
    fn rebuild_combined_mesh(&mut self) {
        self.combined_mesh.clear();

        // 1. Append all finished strokes
        for stroke in &self.finished_strokes {
            let base_idx = self.combined_mesh.positions.len() as u32;
            self.combined_mesh.positions.extend_from_slice(&stroke.positions);
            self.combined_mesh.normals.extend_from_slice(&stroke.normals);
            self.combined_mesh.uvs.extend_from_slice(&stroke.uvs);
            for &idx in &stroke.indices {
                self.combined_mesh.indices.push(base_idx + idx);
            }
        }

        // 2. Append live stroke if currently painting
        if self.stroke_points.len() >= 2 {
            let mut live_mesh = MeshData::default();
            self.bead_generator.generate_geometry(
                &self.stroke_points,
                &self.gui_state.brush_settings,
                &mut live_mesh,
            );
            let base_idx = self.combined_mesh.positions.len() as u32;
            self.combined_mesh.positions.extend_from_slice(&live_mesh.positions);
            self.combined_mesh.normals.extend_from_slice(&live_mesh.normals);
            self.combined_mesh.uvs.extend_from_slice(&live_mesh.uvs);
            for &idx in &live_mesh.indices {
                self.combined_mesh.indices.push(base_idx + idx);
            }
        }

        if !self.combined_mesh.positions.is_empty() {
            let mut gpu_vertices = Vec::with_capacity(self.combined_mesh.positions.len());
            for i in 0..self.combined_mesh.positions.len() {
                gpu_vertices.push(GpuVertex {
                    position: self.combined_mesh.positions[i],
                    normal: self.combined_mesh.normals[i],
                    uv: self.combined_mesh.uvs[i],
                });
            }

            let v_bytes = bytemuck::cast_slice(&gpu_vertices);
            let i_bytes = bytemuck::cast_slice(&self.combined_mesh.indices);

            let v_buf = self.device.create_buffer(&wgpu::BufferDescriptor {
                label: Some("Stroke Vertex Buffer"),
                size: v_bytes.len() as u64,
                usage: wgpu::BufferUsages::VERTEX | wgpu::BufferUsages::COPY_DST,
                mapped_at_creation: false,
            });
            self.queue.write_buffer(&v_buf, 0, v_bytes);

            let i_buf = self.device.create_buffer(&wgpu::BufferDescriptor {
                label: Some("Stroke Index Buffer"),
                size: i_bytes.len() as u64,
                usage: wgpu::BufferUsages::INDEX | wgpu::BufferUsages::COPY_DST,
                mapped_at_creation: false,
            });
            self.queue.write_buffer(&i_buf, 0, i_bytes);

            self.vertex_buffer = Some(v_buf);
            self.index_buffer = Some(i_buf);
            self.index_count = self.combined_mesh.indices.len() as u32;
        } else {
            self.vertex_buffer = None;
            self.index_buffer = None;
            self.index_count = 0;
        }
    }

    fn camera_eye(&self) -> Vec3 {
        let cy = self.camera_yaw.cos();
        let sy = self.camera_yaw.sin();
        let cp = self.camera_pitch.cos();
        let sp = self.camera_pitch.sin();

        let offset = Vec3::new(sy * cp, sp, cy * cp) * self.camera_dist;
        self.camera_target + offset
    }
}

impl ApplicationHandler for App {
    fn resumed(&mut self, event_loop: &ActiveEventLoop) {
        if self.state.is_some() {
            return;
        }

        let window_attrs = Window::default_attributes()
            .with_title("Remix 3D Model Painting Studio (Native Rust)")
            .with_inner_size(winit::dpi::LogicalSize::new(1400.0, 900.0));

        let window = Arc::new(event_loop.create_window(window_attrs).unwrap());
        let size = window.inner_size();

        let instance = wgpu::Instance::new(&wgpu::InstanceDescriptor {
            backends: wgpu::Backends::PRIMARY,
            ..Default::default()
        });

        let surface = instance.create_surface(window.clone()).unwrap();

        let adapter = pollster::block_on(instance.request_adapter(&wgpu::RequestAdapterOptions {
            power_preference: wgpu::PowerPreference::HighPerformance,
            compatible_surface: Some(&surface),
            force_fallback_adapter: false,
        }))
        .unwrap();

        let (device, queue) = pollster::block_on(adapter.request_device(
            &wgpu::DeviceDescriptor {
                label: Some("Primary GPU Device"),
                required_features: wgpu::Features::empty(),
                required_limits: wgpu::Limits::default(),
                memory_hints: Default::default(),
            },
            None,
        ))
        .unwrap();

        let surface_caps = surface.get_capabilities(&adapter);
        let surface_format = surface_caps
            .formats
            .iter()
            .copied()
            .find(|f| f.is_srgb())
            .unwrap_or(surface_caps.formats[0]);

        let config = wgpu::SurfaceConfiguration {
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
            format: surface_format,
            width: size.width.max(1),
            height: size.height.max(1),
            present_mode: wgpu::PresentMode::AutoVsync,
            alpha_mode: surface_caps.alpha_modes[0],
            view_formats: vec![],
            desired_maximum_frame_latency: 2,
        };
        surface.configure(&device, &config);

        let pipeline_mgr = RenderPipelineManager::new(&device, surface_format);

        // Uniform buffers
        let camera_uniform = CameraUniform::default();
        let camera_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Camera Uniform Buffer"),
            size: std::mem::size_of::<CameraUniform>() as u64,
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });
        queue.write_buffer(&camera_buffer, 0, bytemuck::bytes_of(&camera_uniform));

        let camera_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Camera Bind Group"),
            layout: &pipeline_mgr.camera_bind_group_layout,
            entries: &[wgpu::BindGroupEntry {
                binding: 0,
                resource: camera_buffer.as_entire_binding(),
            }],
        });

        let material_uniform = MaterialUniform::default();
        let material_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Material Uniform Buffer"),
            size: std::mem::size_of::<MaterialUniform>() as u64,
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });
        queue.write_buffer(&material_buffer, 0, bytemuck::bytes_of(&material_uniform));

        let material_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Material Bind Group"),
            layout: &pipeline_mgr.material_bind_group_layout,
            entries: &[wgpu::BindGroupEntry {
                binding: 0,
                resource: material_buffer.as_entire_binding(),
            }],
        });

        // egui setup
        let egui_ctx = egui::Context::default();
        let egui_state = egui_winit::State::new(
            egui_ctx.clone(),
            egui::ViewportId::ROOT,
            &window,
            Some(window.scale_factor() as f32),
            None,
            None,
        );
        let egui_renderer = egui_wgpu::Renderer::new(
            &device,
            surface_format,
            None,
            1,
            false,
        );

        let mut layers = Vec::new();
        layers.push(Layer::new("layer_base", "Base Layer"));

        self.state = Some(AppState {
            window,
            surface,
            device,
            queue,
            config,
            pipeline_mgr,
            camera_buffer,
            camera_bind_group,
            material_buffer,
            material_bind_group,
            vertex_buffer: None,
            index_buffer: None,
            index_count: 0,
            egui_ctx,
            egui_state,
            egui_renderer,
            bead_generator: ConformalBeadGenerator::new(),
            stroke_points: Vec::new(),
            finished_strokes: Vec::new(),
            redo_strokes: Vec::new(),
            combined_mesh: MeshData::default(),
            layers,
            gui_state: GuiState::default(),
            is_painting: false,
            is_orbiting: false,
            is_panning: false,
            last_cursor_pos: None,
            camera_target: Vec3::ZERO,
            camera_yaw: 0.0,
            camera_pitch: 0.2,
            camera_dist: 5.0,
            start_time: std::time::Instant::now(),
        });
    }

    fn window_event(&mut self, event_loop: &ActiveEventLoop, _id: WindowId, event: WindowEvent) {
        let state = match self.state.as_mut() {
            Some(s) => s,
            None => return,
        };

        // Forward event to egui
        let _egui_response = state.egui_state.on_window_event(&state.window, &event);
        let egui_wants_pointer = state.egui_ctx.wants_pointer_input() || state.egui_ctx.is_pointer_over_area();

        match event {
            WindowEvent::CloseRequested => {
                event_loop.exit();
            }
            WindowEvent::Resized(new_size) => {
                state.config.width = new_size.width.max(1);
                state.config.height = new_size.height.max(1);
                state.surface.configure(&state.device, &state.config);
                state.window.request_redraw();
            }
            WindowEvent::MouseWheel { delta, .. } => {
                let zoom_factor = match delta {
                    MouseScrollDelta::LineDelta(_, y) => y * 0.4,
                    MouseScrollDelta::PixelDelta(pos) => (pos.y as f32) * 0.01,
                };
                state.camera_dist = (state.camera_dist - zoom_factor).clamp(0.5, 30.0);
                state.window.request_redraw();
            }
            WindowEvent::MouseInput { state: btn_state, button, .. } => {
                match button {
                    MouseButton::Left => {
                        if btn_state == ElementState::Pressed {
                            if !egui_wants_pointer {
                                state.is_painting = true;
                                state.stroke_points.clear();
                            }
                        } else {
                            if state.is_painting {
                                state.is_painting = false;
                                if state.stroke_points.len() >= 2 {
                                    let mut finished_mesh = MeshData::default();
                                    state.bead_generator.generate_geometry(
                                        &state.stroke_points,
                                        &state.gui_state.brush_settings,
                                        &mut finished_mesh,
                                    );
                                    if !finished_mesh.positions.is_empty() {
                                        state.finished_strokes.push(finished_mesh);
                                        state.redo_strokes.clear();
                                    }
                                }
                                state.stroke_points.clear();
                                state.rebuild_combined_mesh();
                            }
                        }
                    }
                    MouseButton::Right => {
                        state.is_orbiting = btn_state == ElementState::Pressed;
                    }
                    MouseButton::Middle => {
                        state.is_panning = btn_state == ElementState::Pressed;
                    }
                    _ => {}
                }
                state.window.request_redraw();
            }
            WindowEvent::CursorMoved { position, .. } => {
                if let Some((last_x, last_y)) = state.last_cursor_pos {
                    let dx = (position.x - last_x) as f32;
                    let dy = (position.y - last_y) as f32;

                    if state.is_orbiting {
                        state.camera_yaw += dx * 0.005;
                        state.camera_pitch = (state.camera_pitch - dy * 0.005).clamp(-1.5, 1.5);
                        state.window.request_redraw();
                    } else if state.is_panning {
                        let pan_speed = state.camera_dist * 0.001;
                        let cy = state.camera_yaw.cos();
                        let sy = state.camera_yaw.sin();
                        let right = Vec3::new(cy, 0.0, -sy);
                        let up = Vec3::Y;

                        state.camera_target += (-right * dx + up * dy) * pan_speed;
                        state.window.request_redraw();
                    }
                }
                state.last_cursor_pos = Some((position.x, position.y));

                if state.is_painting {
                    let w = state.config.width as f32;
                    let h = state.config.height as f32;
                    let x_ndc = (position.x as f32 / w) * 2.0 - 1.0;
                    let y_ndc = -((position.y as f32 / h) * 2.0 - 1.0);

                    // Unproject into 3D world plane facing camera
                    let aspect = w / h;
                    let proj = Mat4::perspective_rh(45.0f32.to_radians(), aspect, 0.1, 100.0);
                    let eye = state.camera_eye();
                    let view_mat = Mat4::look_at_rh(eye, state.camera_target, Vec3::Y);
                    let inv_vp = (proj * view_mat).inverse();

                    let p_near = inv_vp.project_point3(Vec3::new(x_ndc, y_ndc, 0.0));
                    let p_far = inv_vp.project_point3(Vec3::new(x_ndc, y_ndc, 1.0));
                    let ray_dir = (p_far - p_near).normalize_or_zero();

                    // Intersect with camera plane passing through target
                    let plane_norm = (eye - state.camera_target).normalize_or_zero();
                    let denom = ray_dir.dot(plane_norm);
                    let world_pos = if denom.abs() > 1e-4 {
                        let t = (state.camera_target - p_near).dot(plane_norm) / denom;
                        p_near + ray_dir * t
                    } else {
                        state.camera_target
                    };

                    let pt = StrokePoint::new(
                        world_pos,
                        plane_norm,
                        0.7,
                        state.start_time.elapsed().as_secs_f64(),
                    );
                    state.stroke_points.push(pt);
                    state.rebuild_combined_mesh();
                    state.window.request_redraw();
                }
            }
            WindowEvent::RedrawRequested => {
                let frame = match state.surface.get_current_texture() {
                    Ok(frame) => frame,
                    Err(_) => {
                        state.surface.configure(&state.device, &state.config);
                        return;
                    }
                };

                let view = frame.texture.create_view(&wgpu::TextureViewDescriptor::default());

                // Prepare egui UI
                let raw_input = state.egui_state.take_egui_input(&state.window);
                let mut should_undo = false;
                let mut should_redo = false;
                let mut should_reset_camera = false;
                let mut should_clear_canvas = false;
                let mut should_export_glb = false;

                let full_output = state.egui_ctx.run(raw_input, |ctx| {
                    StudioGui::render(
                        ctx,
                        &mut state.gui_state,
                        &mut state.layers,
                        &mut || should_undo = true,
                        &mut || should_redo = true,
                        &mut || should_reset_camera = true,
                        &mut || should_clear_canvas = true,
                        &mut || should_export_glb = true,
                    );
                });

                if should_undo {
                    if let Some(stroke) = state.finished_strokes.pop() {
                        state.redo_strokes.push(stroke);
                        state.rebuild_combined_mesh();
                    }
                }
                if should_redo {
                    if let Some(stroke) = state.redo_strokes.pop() {
                        state.finished_strokes.push(stroke);
                        state.rebuild_combined_mesh();
                    }
                }
                if should_clear_canvas {
                    state.finished_strokes.clear();
                    state.redo_strokes.clear();
                    state.stroke_points.clear();
                    state.rebuild_combined_mesh();
                }
                if should_reset_camera {
                    state.camera_target = Vec3::ZERO;
                    state.camera_yaw = 0.0;
                    state.camera_pitch = 0.2;
                    state.camera_dist = 5.0;
                }
                if should_export_glb {
                    if !state.combined_mesh.positions.is_empty() {
                        let glb_bytes = remix_formats::glb::export_glb(&state.combined_mesh);
                        if let Ok(_) = std::fs::write("remix_studio_export.glb", &glb_bytes) {
                            state.gui_state.status_message = format!("Exported {} vertices to remix_studio_export.glb!", state.combined_mesh.positions.len());
                        }
                    }
                }

                state.egui_state.handle_platform_output(&state.window, full_output.platform_output);

                let tris = state.egui_ctx.tessellate(full_output.shapes, full_output.pixels_per_point);
                for (id, image_delta) in &full_output.textures_delta.set {
                    state.egui_renderer.update_texture(&state.device, &state.queue, *id, image_delta);
                }

                let screen_descriptor = egui_wgpu::ScreenDescriptor {
                    size_in_pixels: [state.config.width, state.config.height],
                    pixels_per_point: state.window.scale_factor() as f32,
                };

                let mut encoder = state.device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
                    label: Some("Main Render Encoder"),
                });

                state.egui_renderer.update_buffers(&state.device, &state.queue, &mut encoder, &tris, &screen_descriptor);

                // Update 3D Camera & Material Uniforms
                let elapsed = state.start_time.elapsed().as_secs_f32();
                let aspect = state.config.width as f32 / state.config.height as f32;
                let proj = Mat4::perspective_rh(45.0f32.to_radians(), aspect, 0.1, 100.0);
                let eye = state.camera_eye();
                let view_mat = Mat4::look_at_rh(eye, state.camera_target, Vec3::Y);
                let view_proj = proj * view_mat;

                let cam_uniform = CameraUniform {
                    view_proj: view_proj.to_cols_array_2d(),
                    camera_pos: eye.to_array(),
                    time: elapsed,
                    _padding: [0.0; 44],
                };
                state.queue.write_buffer(&state.camera_buffer, 0, bytemuck::bytes_of(&cam_uniform));

                let effect_id = match state.gui_state.brush_settings.shader_effect {
                    None => 999u32,
                    Some(effect) => match effect {
                        remix_core::types::AnimatedShaderEffect::Fire => 0,
                        remix_core::types::AnimatedShaderEffect::OceanWave => 1,
                        remix_core::types::AnimatedShaderEffect::Waterfall => 2,
                        remix_core::types::AnimatedShaderEffect::Caustic => 3,
                        remix_core::types::AnimatedShaderEffect::Lava => 6,
                        remix_core::types::AnimatedShaderEffect::Galaxy => 7,
                        remix_core::types::AnimatedShaderEffect::Rainbow => 8,
                        remix_core::types::AnimatedShaderEffect::Plasma => 18,
                        remix_core::types::AnimatedShaderEffect::Hologram => 25,
                        _ => 999,
                    },
                };

                let mat_uniform = MaterialUniform {
                    color: state.gui_state.brush_settings.color_linear,
                    opacity: state.gui_state.brush_settings.opacity,
                    roughness: state.gui_state.brush_settings.roughness,
                    metalness: state.gui_state.brush_settings.metalness,
                    speed: 1.0,
                    scale: 1.0,
                    effect_id,
                    _pad: 0,
                    _padding: [0.0; 54],
                };
                state.queue.write_buffer(&state.material_buffer, 0, bytemuck::bytes_of(&mat_uniform));

                // 1. 3D Scene Pass
                {
                    let mut render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                        label: Some("3D Scene Pass"),
                        color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                            view: &view,
                            resolve_target: None,
                            ops: wgpu::Operations {
                                load: wgpu::LoadOp::Clear(wgpu::Color {
                                    r: 0.07,
                                    g: 0.08,
                                    b: 0.10,
                                    a: 1.0,
                                }),
                                store: wgpu::StoreOp::Store,
                            },
                        })],
                        depth_stencil_attachment: None,
                        timestamp_writes: None,
                        occlusion_query_set: None,
                    });

                    if let (Some(v_buf), Some(i_buf)) = (&state.vertex_buffer, &state.index_buffer) {
                        if state.index_count > 0 {
                            render_pass.set_pipeline(&state.pipeline_mgr.pipeline);
                            render_pass.set_bind_group(0, &state.camera_bind_group, &[]);
                            render_pass.set_bind_group(1, &state.material_bind_group, &[]);
                            render_pass.set_vertex_buffer(0, v_buf.slice(..));
                            render_pass.set_index_buffer(i_buf.slice(..), wgpu::IndexFormat::Uint32);
                            render_pass.draw_indexed(0..state.index_count, 0, 0..1);
                        }
                    }
                }

                // 2. egui UI Overlay Pass (preserves 3D render underneath)
                {
                    let mut egui_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                        label: Some("egui Pass"),
                        color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                            view: &view,
                            resolve_target: None,
                            ops: wgpu::Operations {
                                load: wgpu::LoadOp::Load,
                                store: wgpu::StoreOp::Store,
                            },
                        })],
                        depth_stencil_attachment: None,
                        timestamp_writes: None,
                        occlusion_query_set: None,
                    }).forget_lifetime();

                    state.egui_renderer.render(&mut egui_pass, &tris, &screen_descriptor);
                }

                for id in &full_output.textures_delta.free {
                    state.egui_renderer.free_texture(id);
                }

                state.queue.submit(std::iter::once(encoder.finish()));
                frame.present();
            }
            _ => {}
        }
    }
}

fn main() {
    let event_loop = EventLoop::new().unwrap();
    event_loop.set_control_flow(ControlFlow::Poll);
    let mut app = App::default();
    event_loop.run_app(&mut app).unwrap();
}
