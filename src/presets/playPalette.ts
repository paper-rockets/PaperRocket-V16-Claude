/**
 * The Play palette — "Candy & Cyber Neon".
 *
 * Sixteen fixed colours instead of a colour wheel. They were picked to stay legible
 * against both the light and the dark viewport, to be nameable by a child, and to
 * sit far enough apart that any two adjacent strokes read as different colours.
 *
 * The OKLab pipeline in colorMath.ts and the shader chunk still do all the blending
 * work underneath. This is only the set of doors we open.
 */

export interface PlaySwatch {
  name: string;
  hex: string;
  family: 'candy' | 'neon';
}

export const PLAY_PALETTE: PlaySwatch[] = [
  // Candy — soft, warm, high-chroma but not aggressive.
  { name: 'Hot Pink', hex: '#FF4D9D', family: 'candy' },
  { name: 'Tangerine', hex: '#FF8A3D', family: 'candy' },
  { name: 'Bubblegum', hex: '#FFA8D5', family: 'candy' },
  { name: 'Lime', hex: '#A8E63D', family: 'candy' },
  { name: 'Butter', hex: '#FFE066', family: 'candy' },
  { name: 'Grape', hex: '#A855F7', family: 'candy' },
  { name: 'Mint', hex: '#5EEAD4', family: 'candy' },
  { name: 'Cherry', hex: '#EF2D56', family: 'candy' },

  // Cyber neon — the glow set. These are the ones that sing with Neon Glow applied.
  { name: 'Cyan', hex: '#22D3EE', family: 'neon' },
  { name: 'Magenta', hex: '#FF2BD1', family: 'neon' },
  { name: 'Acid Green', hex: '#39FF14', family: 'neon' },
  { name: 'Electric Blue', hex: '#3B82F6', family: 'neon' },
  { name: 'Laser Purple', hex: '#7C3AED', family: 'neon' },
  { name: 'Hot Orange', hex: '#FF6B00', family: 'neon' },
  { name: 'Ultraviolet', hex: '#B026FF', family: 'neon' },
  { name: 'Chrome White', hex: '#F8FAFC', family: 'neon' },
];

/** The colour a fresh Play canvas starts on. */
export const PLAY_DEFAULT_COLOR = PLAY_PALETTE[8].hex; // Cyan

export function findSwatch(hex: string): PlaySwatch | undefined {
  const target = hex.toLowerCase();
  return PLAY_PALETTE.find((s) => s.hex.toLowerCase() === target);
}
