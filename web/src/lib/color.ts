/** Inline CSS declarations used to paint a tag pill with a custom color. */
export interface TagColorStyle {
  borderColor: string;
  color: string;
  backgroundColor: string;
}

/**
 * Builds the inline CSS declarations used by a colored tag pill: a lightly
 * tinted background with a darkened variant of the same color for border and
 * text, mirroring how tags render inside memo content. Returns undefined for
 * the theme-default pill.
 */
export const tagColorDeclarations = (hex?: string): TagColorStyle | undefined => {
  if (!hex) return undefined;
  return {
    borderColor: hex,
    color: `color-mix(in srgb, ${hex} 60%, black)`,
    backgroundColor: `color-mix(in srgb, ${hex} 15%, transparent)`,
  };
};

/** Same declarations as an inline CSS string, for HTML attributes. */
export const tagColorStyleText = (hex?: string): string | undefined => {
  const style = tagColorDeclarations(hex);
  return style ? `border-color: ${style.borderColor}; color: ${style.color}; background-color: ${style.backgroundColor}` : undefined;
};

/**
 * Converts a google.type.Color (r/g/b as 0–1 floats) to a CSS hex string (#rrggbb).
 * Returns undefined when no color is provided.
 */
export const colorToHex = (color?: { red?: number; green?: number; blue?: number }): string | undefined => {
  if (!color) return undefined;
  const clamp = (val: number | undefined): number => {
    const n = val ?? 0;
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
  };
  const r = Math.round(clamp(color.red) * 255)
    .toString(16)
    .padStart(2, "0");
  const g = Math.round(clamp(color.green) * 255)
    .toString(16)
    .padStart(2, "0");
  const b = Math.round(clamp(color.blue) * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${r}${g}${b}`;
};
