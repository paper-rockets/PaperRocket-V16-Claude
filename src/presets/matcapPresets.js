export const MATCAP_PRESETS = [
  { id: 'basic_1', name: 'Basic 1', file: 'basic_1.jpg' },
  { id: 'basic_2', name: 'Basic 2', file: 'basic_2.jpg' },
  { id: 'basic_dark', name: 'Basic Dark', file: 'basic_dark.jpeg' },
  { id: 'basic_side', name: 'Basic Side', file: 'basic_side.jpeg' },
  { id: 'ceramic_dark', name: 'Ceramic Dark', file: 'ceramic_dark.jpeg' },
  { id: 'ceramic_lightbulb', name: 'Ceramic Lightbulb', file: 'ceramic_lightbulb.jpeg' },
  { id: 'check_normal_y', name: 'Check Normal +Y', file: 'check_normal+y.jpeg' },
  { id: 'check_rim_dark', name: 'Check Rim Dark', file: 'check_rim_dark.jpeg' },
  { id: 'check_rim_light', name: 'Check Rim Light', file: 'check_rim_light.jpeg' },
  { id: 'clay_brown', name: 'Clay Brown', file: 'clay_brown.jpeg' },
  { id: 'clay_muddy', name: 'Clay Muddy', file: 'clay_muddy.jpeg' },
  { id: 'clay_studio', name: 'Clay Studio', file: 'clay_studio.jpeg' },
  { id: 'jade', name: 'Jade', file: 'jade.jpeg' },
  { id: 'metal_anisotropic', name: 'Metal Anisotropic', file: 'metal_anisotropic.jpeg' },
  { id: 'metal_carpaint', name: 'Metal Car Paint', file: 'metal_carpaint.jpeg' },
  { id: 'metal_lead', name: 'Metal Lead', file: 'metal_lead.jpeg' },
  { id: 'metal_shiny', name: 'Metal Shiny', file: 'metal_shiny.jpeg' },
  { id: 'pearl', name: 'Pearl', file: 'pearl.jpeg' },
  { id: 'reflection_check_h', name: 'Reflection Horizontal', file: 'reflection_check_horizontal.jpeg' },
  { id: 'reflection_check_v', name: 'Reflection Vertical', file: 'reflection_check_vertical.jpeg' },
  { id: 'resin', name: 'Resin', file: 'resin.jpeg' },
  { id: 'skin', name: 'Skin', file: 'skin.jpeg' },
  { id: 'toon', name: 'Toon', file: 'toon.jpeg' }
].map(p => ({
  ...p,
  url: `/assets/matcaps/${p.file}`
}));
