export const colorTokens = {
  background: 'var(--lovable-background)',
  foreground: 'var(--lovable-foreground)',
  primary: 'var(--lovable-primary)',
  primaryForeground: 'var(--lovable-primary-foreground)',
  muted: 'var(--lovable-muted)',
  mutedForeground: 'var(--lovable-muted-foreground)',
  accent: 'var(--lovable-accent)',
  accentForeground: 'var(--lovable-accent-foreground)',
};

export const radiusTokens = {
  sm: 'var(--lovable-radius-sm)',
  md: 'var(--lovable-radius-md)',
  lg: 'var(--lovable-radius-lg)',
  full: 'var(--lovable-radius-full)',
};

export type ThemeTokens = {
  color: typeof colorTokens;
  radius: typeof radiusTokens;
};

export const theme: ThemeTokens = {
  color: colorTokens,
  radius: radiusTokens,
};
