import { colors } from '../colors';

export { colors };

export const typography = {
  fontFamilySystem: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontFamilyBrand: "'Geist', sans-serif",
  weights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
};

export const borderRadius = {
  sm: '8px',
  md: '10px',
  lg: '12px',
  xl: '16px',
  pill: '9999px',
};

export const shadows = {
  sm: '0 1px 3px rgba(0, 0, 0, 0.03)',
  md: '0 4px 12px rgba(0, 0, 0, 0.04)',
  primaryGlow: '0 2px 8px rgba(16, 185, 129, 0.2)',
  primaryHoverGlow: '0 4px 12px rgba(16, 185, 129, 0.25)',
};

export const transitions = {
  normal: 'all 200ms ease',
};

export default colors;
