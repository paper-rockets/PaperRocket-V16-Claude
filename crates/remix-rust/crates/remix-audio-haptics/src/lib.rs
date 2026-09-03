use std::f32::consts::PI;

pub struct AudioSynthesizer {
    pub sample_rate: u32,
}

impl Default for AudioSynthesizer {
    fn default() -> Self {
        Self { sample_rate: 44100 }
    }
}

impl AudioSynthesizer {
    pub fn new(sample_rate: u32) -> Self {
        Self { sample_rate }
    }

    /// Generates a subtle procedural click / rotary detent waveform
    pub fn generate_rotary_click(&self) -> Vec<f32> {
        let duration_ms = 8.0;
        let num_samples = ((self.sample_rate as f32 * duration_ms) / 1000.0) as usize;
        let mut samples = Vec::with_capacity(num_samples);

        for i in 0..num_samples {
            let t = i as f32 / self.sample_rate as f32;
            let decay = (-t * 600.0).exp();
            let freq = 1200.0 - t * 40000.0;
            let sample = (2.0 * PI * freq * t).sin() * decay * 0.4;
            samples.push(sample);
        }

        samples
    }

    /// Generates a snappy tool selection click
    pub fn generate_snap(&self) -> Vec<f32> {
        let duration_ms = 15.0;
        let num_samples = ((self.sample_rate as f32 * duration_ms) / 1000.0) as usize;
        let mut samples = Vec::with_capacity(num_samples);

        for i in 0..num_samples {
            let t = i as f32 / self.sample_rate as f32;
            let decay = (-t * 400.0).exp();
            let sample = (2.0 * PI * 850.0 * t).sin() * decay * 0.5;
            samples.push(sample);
        }

        samples
    }
}

pub struct HapticFeedback;

impl HapticFeedback {
    pub fn trigger_tick() {
        #[cfg(target_os = "android")]
        {
            // Direct NDK or JNI call to Vibrator.vibrate(VibrationEffect.createPredefined(EFFECT_TICK))
        }
    }

    pub fn trigger_click() {
        #[cfg(target_os = "android")]
        {
            // Direct NDK or JNI call to Vibrator.vibrate(VibrationEffect.createPredefined(EFFECT_CLICK))
        }
    }

    pub fn trigger_heavy() {
        #[cfg(target_os = "android")]
        {
            // Direct NDK or JNI call to Vibrator.vibrate(VibrationEffect.createPredefined(EFFECT_HEAVY_CLICK))
        }
    }
}
