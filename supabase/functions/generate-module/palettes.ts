export type CategoryPalette = {
  primary: string
  secondary: string
  accent: string
  cream: string
  softYellow: string
}

export const DEFAULT_PALETTE: CategoryPalette = {
  primary: '#F4A261',
  secondary: '#2A9D8F',
  accent: '#E76F51',
  cream: '#FFF8F0',
  softYellow: '#FFE8A3'
}

const SUPER_SKILL_PALETTES: Record<string, CategoryPalette> = {
  '#10B981': { primary: '#10B981', secondary: '#0D9488', accent: '#34D399', cream: '#ECFDF5', softYellow: '#A7F3D0' },
  '#EC4899': { primary: '#EC4899', secondary: '#8B5CF6', accent: '#F472B6', cream: '#FDF2F8', softYellow: '#FBCFE8' },
  '#6366F1': { primary: '#6366F1', secondary: '#8B5CF6', accent: '#818CF8', cream: '#EEF2FF', softYellow: '#C7D2FE' },
  '#06B6D4': { primary: '#06B6D4', secondary: '#0891B2', accent: '#22D3EE', cream: '#ECFEFF', softYellow: '#A5F3FC' },
  '#EF4444': { primary: '#EF4444', secondary: '#DC2626', accent: '#F87171', cream: '#FEF2F2', softYellow: '#FECACA' },
  '#F59E0B': { primary: '#F59E0B', secondary: '#D97706', accent: '#FBBF24', cream: '#FFFBEB', softYellow: '#FDE68A' },
  '#8B5CF6': { primary: '#8B5CF6', secondary: '#7C3AED', accent: '#A78BFA', cream: '#F5F3FF', softYellow: '#DDD6FE' }
}

export function generatePaletteFromColor(baseColor: string | null | undefined): CategoryPalette {
  if (!baseColor) return DEFAULT_PALETTE
  let hex = baseColor.trim().toUpperCase()
  if (!hex.startsWith('#')) hex = '#' + hex
  if (!/^#[0-9A-Fa-f]{6}$/i.test(hex)) return DEFAULT_PALETTE

  if (SUPER_SKILL_PALETTES[hex]) return SUPER_SKILL_PALETTES[hex]
  return DEFAULT_PALETTE
}
