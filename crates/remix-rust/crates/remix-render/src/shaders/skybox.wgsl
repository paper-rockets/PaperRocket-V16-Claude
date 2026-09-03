// Procedural Preetham Atmosphere & Volumetric Cloud Dome in WGSL

struct SkyUniform {
    sun_position: vec3<f32>,
    turbidity: f32,
    rayleigh: f32,
    mie_coefficient: f32,
    cloud_coverage: f32,
    time: f32,
};

@group(0) @binding(0)
var<uniform> sky: SkyUniform;

struct VertexInput {
    @location(0) position: vec3<f32>,
};

struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) view_dir: vec3<f32>,
};

@vertex
fn vs_sky(in: VertexInput) -> VertexOutput {
    var out: VertexOutput;
    out.view_dir = normalize(in.position);
    out.clip_position = vec4<f32>(in.position.xy, 1.0, 1.0); // Full screen quad
    return out;
}

fn hash21(p: vec2<f32>) -> f32 {
    return fract(sin(dot(p, vec2<f32>(127.1, 311.7))) * 43758.5453);
}

fn noise(p: vec2<f32>) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (vec2<f32>(3.0) - 2.0 * f);
    return mix(
        mix(hash21(i + vec2<f32>(0.0, 0.0)), hash21(i + vec2<f32>(1.0, 0.0)), u.x),
        mix(hash21(i + vec2<f32>(0.0, 1.0)), hash21(i + vec2<f32>(1.0, 1.0)), u.x),
        u.y
    );
}

fn fbm(p: vec2<f32>) -> f32 {
    var v = 0.0;
    var a = 0.5;
    var pos = p;
    for (var i = 0; i < 4; i++) {
        v += a * noise(pos);
        pos = pos * 2.0;
        a *= 0.5;
    }
    return v;
}

@fragment
fn fs_sky(in: VertexOutput) -> @location(0) vec4<f32> {
    let dir = normalize(in.view_dir);
    let sun_dir = normalize(sky.sun_position);

    // Zenith to horizon gradient
    let cos_theta = max(dir.y, 0.0);
    let cos_gamma = dot(dir, sun_dir);

    // Rayleigh scattering (sky blue)
    let rayleigh_col = vec3<f32>(0.25, 0.5, 0.95);
    let horizon_col = vec3<f32>(0.7, 0.8, 0.9);
    var sky_color = mix(horizon_col, rayleigh_col, pow(cos_theta, 0.5));

    // Sun disc and Mie glare
    let sun_disc = smoothstep(0.9995, 0.9999, cos_gamma);
    let mie_glare = pow(max(cos_gamma, 0.0), 32.0) * sky.mie_coefficient * 5.0;
    sky_color += vec3<f32>(1.0, 0.95, 0.8) * (sun_disc * 10.0 + mie_glare);

    // Dynamic volumetric clouds on upper dome
    if (dir.y > 0.02) {
        let cloud_plane_dist = 1.0 / dir.y;
        let cloud_uv = (dir.xz * cloud_plane_dist) * 0.15 + vec2<f32>(sky.time * 0.01);
        let cloud_dens = fbm(cloud_uv);
        let coverage = smoothstep(1.0 - sky.cloud_coverage, 1.0, cloud_dens);

        let cloud_light = mix(vec3<f32>(0.6, 0.65, 0.75), vec3<f32>(1.0, 1.0, 1.0), cos_gamma * 0.5 + 0.5);
        sky_color = mix(sky_color, cloud_light, coverage * 0.85);
    }

    return vec4<f32>(sky_color, 1.0);
}
