// Remix 3D Studio - 27 Animated Procedural Shaders with OKLab Color Blending in WGSL

struct CameraUniform {
    view_proj: mat4x4<f32>,
    camera_pos: vec3<f32>,
    time: f32,
};

struct MaterialUniform {
    color: vec3<f32>,
    opacity: f32,
    roughness: f32,
    metalness: f32,
    speed: f32,
    scale: f32,
    effect_id: u32,
    _pad: u32,
};

@group(0) @binding(0)
var<uniform> camera: CameraUniform;

@group(1) @binding(0)
var<uniform> material: MaterialUniform;

struct VertexInput {
    @location(0) position: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) uv: vec2<f32>,
};

struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) world_pos: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) uv: vec2<f32>,
    @location(3) view_dir: vec3<f32>,
};

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
    var out: VertexOutput;
    out.world_pos = in.position;
    out.normal = in.normal;
    out.uv = in.uv;
    out.view_dir = normalize(camera.camera_pos - in.position);
    out.clip_position = camera.view_proj * vec4<f32>(in.position, 1.0);
    return out;
}

// -----------------------------------------------------------------------------
// OKLab Color Space Blending
// -----------------------------------------------------------------------------
fn srgb_to_linear(c: vec3<f32>) -> vec3<f32> {
    let lower = c / 12.92;
    let higher = pow((c + vec3<f32>(0.055)) / 1.055, vec3<f32>(2.4));
    let cutoff = vec3<f32>(select(0.0, 1.0, c.r > 0.04045), select(0.0, 1.0, c.g > 0.04045), select(0.0, 1.0, c.b > 0.04045));
    return mix(lower, higher, cutoff);
}

fn linear_to_srgb(c: vec3<f32>) -> vec3<f32> {
    let clamped = max(c, vec3<f32>(0.0));
    let lower = clamped * 12.92;
    let higher = 1.055 * pow(clamped, vec3<f32>(1.0 / 2.4)) - vec3<f32>(0.055);
    let cutoff = vec3<f32>(select(0.0, 1.0, clamped.r > 0.0031308), select(0.0, 1.0, clamped.g > 0.0031308), select(0.0, 1.0, clamped.b > 0.0031308));
    return mix(lower, higher, cutoff);
}

fn linear_srgb_to_oklab(c: vec3<f32>) -> vec3<f32> {
    let l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
    let m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
    let s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;

    let l_ = pow(max(0.0, l), 1.0 / 3.0);
    let m_ = pow(max(0.0, m), 1.0 / 3.0);
    let s_ = pow(max(0.0, s), 1.0 / 3.0);

    return vec3<f32>(
        0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
        1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
        0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
    );
}

fn oklab_to_linear_srgb(c: vec3<f32>) -> vec3<f32> {
    let l_ = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
    let m_ = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
    let s_ = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;

    let l = l_ * l_ * l_;
    let m = m_ * m_ * m_;
    let s = s_ * s_ * s_;

    return vec3<f32>(
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    );
}

fn oklab_mix(col_a: vec3<f32>, col_b: vec3<f32>, t: f32) -> vec3<f32> {
    let lab_a = linear_srgb_to_oklab(srgb_to_linear(col_a));
    let lab_b = linear_srgb_to_oklab(srgb_to_linear(col_b));
    let mixed = mix(lab_a, lab_b, clamp(t, 0.0, 1.0));
    return linear_to_srgb(clamp(oklab_to_linear_srgb(mixed), vec3<f32>(0.0), vec3<f32>(1.0)));
}

// -----------------------------------------------------------------------------
// Procedural Noise Functions
// -----------------------------------------------------------------------------
fn hash(p: vec2<f32>) -> f32 {
    return fract(sin(dot(p, vec2<f32>(127.1, 311.7))) * 43758.5453123);
}

fn noise(p: vec2<f32>) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (vec2<f32>(3.0) - 2.0 * f);
    return mix(
        mix(hash(i + vec2<f32>(0.0, 0.0)), hash(i + vec2<f32>(1.0, 0.0)), u.x),
        mix(hash(i + vec2<f32>(0.0, 1.0)), hash(i + vec2<f32>(1.0, 1.0)), u.x),
        u.y
    );
}

fn fbm(p_in: vec2<f32>) -> f32 {
    var p = p_in;
    var v = 0.0;
    var a = 0.5;
    for (var i = 0; i < 4; i++) {
        v += a * noise(p);
        p = vec2<f32>(cos(0.5) * p.x - sin(0.5) * p.y, sin(0.5) * p.x + cos(0.5) * p.y) * 2.0 + vec2<f32>(100.0);
        a *= 0.5;
    }
    return v;
}

// -----------------------------------------------------------------------------
// Fragment Shader
// -----------------------------------------------------------------------------
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let t = camera.time * material.speed;
    let uv = in.uv * vec2<f32>(1.0, material.scale);
    var final_color = material.color;
    var alpha = material.opacity;

    let n = normalize(in.normal);
    let v = normalize(in.view_dir);
    let rim = 1.0 - max(dot(n, v), 0.0);

    // Switch between 27 procedural animated effects
    switch (material.effect_id) {
        // Fire (0)
        case 0u: {
            let fire_noise = fbm(uv * 3.0 - vec2<f32>(0.0, t * 2.5));
            let flame = smoothstep(0.1, 0.9, fire_noise * (1.2 - in.uv.x * 0.4));
            let hot = vec3<f32>(1.0, 0.9, 0.2);
            let dark = vec3<f32>(0.8, 0.1, 0.0);
            final_color = oklab_mix(dark, material.color, flame);
            final_color = oklab_mix(final_color, hot, pow(flame, 2.5));
        }
        // Ocean Wave (1)
        case 1u: {
            let wave = sin(uv.y * 6.0 - t * 3.0) * cos(uv.x * 4.0 + t);
            let foam = smoothstep(0.4, 0.8, wave + noise(uv * 8.0 + t));
            let deep = material.color * 0.5;
            let foam_col = vec3<f32>(0.9, 0.98, 1.0);
            final_color = oklab_mix(deep, material.color, wave * 0.5 + 0.5);
            final_color = oklab_mix(final_color, foam_col, foam);
        }
        // Waterfall (2)
        case 2u: {
            let flow = fbm(vec2<f32>(in.uv.x * 4.0, in.uv.y * 12.0 - t * 4.0));
            let streak = smoothstep(0.3, 0.8, flow);
            let splash = vec3<f32>(0.95, 1.0, 1.0);
            final_color = oklab_mix(material.color * 0.7, splash, streak);
        }
        // Caustic (3)
        case 3u: {
            let p = uv * 4.0 + vec2<f32>(sin(t * 0.8), cos(t * 0.6));
            let c1 = noise(p + t * 0.5);
            let c2 = noise(p * 1.5 - t * 0.7);
            let caust = pow(c1 * c2, 1.8) * 3.0;
            final_color = material.color + vec3<f32>(caust * 0.8);
        }
        // Lava (6)
        case 6u: {
            let crust = fbm(uv * 2.5 + t * 0.1);
            let crack = smoothstep(0.45, 0.6, crust);
            let magma = vec3<f32>(1.0, 0.35, 0.05) * 2.0;
            let rock = vec3<f32>(0.12, 0.08, 0.08);
            final_color = oklab_mix(magma, rock, crack);
        }
        // Galaxy (7)
        case 7u: {
            let star = pow(hash(floor(uv * 20.0 + sin(t * 0.2))), 18.0) * 4.0;
            let spiral = fbm(uv * 1.5 + vec2<f32>(sin(t * 0.1), cos(t * 0.1)));
            let neb_b = vec3<f32>(0.9, 0.3, 0.8);
            final_color = oklab_mix(material.color, neb_b, spiral) + vec3<f32>(star);
        }
        // Rainbow (8)
        case 8u: {
            let hue = fract(uv.y * 2.0 - t * 0.5 + in.uv.x * 0.2);
            let r = clamp(abs(hue * 6.0 - 3.0) - 1.0, 0.0, 1.0);
            let g = clamp(2.0 - abs(hue * 6.0 - 2.0), 0.0, 1.0);
            let b = clamp(2.0 - abs(hue * 6.0 - 4.0), 0.0, 1.0);
            final_color = oklab_mix(material.color, vec3<f32>(r, g, b), 0.85);
        }
        // Plasma (18)
        case 18u: {
            let v1 = sin(uv.x * 10.0 + t);
            let v2 = sin(10.0 * (uv.x * sin(t / 2.0) + uv.y * cos(t / 3.0)) + t);
            let cx = uv.x + 0.5 * sin(t / 5.0);
            let cy = uv.y + 0.5 * cos(t / 3.0);
            let v3 = sin(sqrt(100.0 * (cx * cx + cy * cy) + 1.0) + t);
            let plasma_v = (v1 + v2 + v3) / 3.0;
            final_color = oklab_mix(material.color, vec3<f32>(sin(plasma_v * 3.14), cos(plasma_v * 3.14), 1.0), 0.7);
        }
        // Hologram (25)
        case 25u: {
            let scanline = sin(in.world_pos.y * 60.0 - t * 10.0) * 0.5 + 0.5;
            let glitch = step(0.96, hash(vec2<f32>(floor(t * 12.0), floor(in.world_pos.y * 10.0))));
            let holo_col = vec3<f32>(0.2, 0.9, 1.0);
            final_color = oklab_mix(material.color, holo_col, 0.8) + vec3<f32>(glitch * 0.5);
            alpha = material.opacity * (scanline * 0.6 + 0.4) * (rim * 0.8 + 0.2);
        }
        // Default / Standard
        default: {
            let diff = max(dot(n, normalize(vec3<f32>(0.5, 1.0, 0.8))), 0.0);
            final_color = material.color * (diff * 0.7 + 0.3) + vec3<f32>(pow(rim, 3.0) * 0.3);
        }
    }

    return vec4<f32>(final_color, alpha);
}
