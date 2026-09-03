use glam::Vec3;

#[inline]
pub fn srgb_to_linear_channel(c: f32) -> f32 {
    if c <= 0.04045 {
        c / 12.92
    } else {
        ((c + 0.055) / 1.055).powf(2.4)
    }
}

#[inline]
pub fn linear_to_srgb_channel(c: f32) -> f32 {
    let c = c.max(0.0);
    if c <= 0.0031308 {
        c * 12.92
    } else {
        1.055 * c.powf(1.0 / 2.4) - 0.055
    }
}

#[inline]
pub fn srgb_to_linear(rgb: Vec3) -> Vec3 {
    Vec3::new(
        srgb_to_linear_channel(rgb.x),
        srgb_to_linear_channel(rgb.y),
        srgb_to_linear_channel(rgb.z),
    )
}

#[inline]
pub fn linear_to_srgb(linear: Vec3) -> Vec3 {
    Vec3::new(
        linear_to_srgb_channel(linear.x),
        linear_to_srgb_channel(linear.y),
        linear_to_srgb_channel(linear.z),
    )
}

#[inline]
pub fn linear_srgb_to_oklab(c: Vec3) -> Vec3 {
    let l = 0.4122214708 * c.x + 0.5363325363 * c.y + 0.0514459929 * c.z;
    let m = 0.2119034982 * c.x + 0.6806995451 * c.y + 0.1073969566 * c.z;
    let s = 0.0883024619 * c.x + 0.2817188376 * c.y + 0.6299787005 * c.z;

    let l_ = l.max(0.0).cbrt();
    let m_ = m.max(0.0).cbrt();
    let s_ = s.max(0.0).cbrt();

    Vec3::new(
        0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
        1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
        0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
    )
}

#[inline]
pub fn oklab_to_linear_srgb(lab: Vec3) -> Vec3 {
    let l_ = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
    let m_ = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
    let s_ = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;

    let l = l_ * l_ * l_;
    let m = m_ * m_ * m_;
    let s = s_ * s_ * s_;

    Vec3::new(
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
    )
}

#[inline]
pub fn oklab_to_oklch(lab: Vec3) -> Vec3 {
    let l = lab.x;
    let c = (lab.y * lab.y + lab.z * lab.z).sqrt();
    let mut h = lab.z.atan2(lab.y).to_degrees();
    if h < 0.0 {
        h += 360.0;
    }
    Vec3::new(l, c, h)
}

#[inline]
pub fn oklch_to_oklab(lch: Vec3) -> Vec3 {
    let l = lch.x;
    let c = lch.y;
    let h_rad = lch.z.to_radians();
    let a = c * h_rad.cos();
    let b = c * h_rad.sin();
    Vec3::new(l, a, b)
}

pub fn oklab_mix(color_a: Vec3, color_b: Vec3, t: f32) -> Vec3 {
    let t = t.clamp(0.0, 1.0);
    let lab_a = linear_srgb_to_oklab(srgb_to_linear(color_a));
    let lab_b = linear_srgb_to_oklab(srgb_to_linear(color_b));
    let mixed_lab = lab_a.lerp(lab_b, t);
    let mixed_linear = oklab_to_linear_srgb(mixed_lab).clamp(Vec3::ZERO, Vec3::ONE);
    linear_to_srgb(mixed_linear)
}

pub fn hex_to_rgb(hex: &str) -> Option<Vec3> {
    let hex = hex.trim_start_matches('#');
    if hex.len() != 6 {
        return None;
    }
    let r = u8::from_str_radix(&hex[0..2], 16).ok()? as f32 / 255.0;
    let g = u8::from_str_radix(&hex[2..4], 16).ok()? as f32 / 255.0;
    let b = u8::from_str_radix(&hex[4..6], 16).ok()? as f32 / 255.0;
    Some(Vec3::new(r, g, b))
}

pub fn rgb_to_hex(rgb: Vec3) -> String {
    let r = (rgb.x.clamp(0.0, 1.0) * 255.0).round() as u8;
    let g = (rgb.y.clamp(0.0, 1.0) * 255.0).round() as u8;
    let b = (rgb.z.clamp(0.0, 1.0) * 255.0).round() as u8;
    format!("#{:02X}{:02X}{:02X}", r, g, b)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_srgb_linear_roundtrip() {
        let original = Vec3::new(0.2, 0.5, 0.8);
        let linear = srgb_to_linear(original);
        let roundtrip = linear_to_srgb(linear);
        assert!((original.x - roundtrip.x).abs() < 1e-4);
        assert!((original.y - roundtrip.y).abs() < 1e-4);
        assert!((original.z - roundtrip.z).abs() < 1e-4);
    }

    #[test]
    fn test_oklab_roundtrip() {
        let linear = Vec3::new(0.4, 0.6, 0.9);
        let oklab = linear_srgb_to_oklab(linear);
        let roundtrip = oklab_to_linear_srgb(oklab);
        assert!((linear.x - roundtrip.x).abs() < 1e-4);
        assert!((linear.y - roundtrip.y).abs() < 1e-4);
        assert!((linear.z - roundtrip.z).abs() < 1e-4);
    }

    #[test]
    fn test_hex_conversion() {
        let hex = "#3388EE";
        let rgb = hex_to_rgb(hex).unwrap();
        let formatted = rgb_to_hex(rgb);
        assert_eq!(formatted, "#3388EE");
    }
}
