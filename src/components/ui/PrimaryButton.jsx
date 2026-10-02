import React from 'react';
import { colors, borderRadius, shadows, transitions } from '../../theme/tokens';

const PrimaryButton = ({ 
  children, 
  onClick, 
  type = 'button', 
  disabled = false, 
  style = {}, 
  className = '',
  icon = null 
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{
        background: colors.primary,
        color: colors.textInverse,
        fontWeight: 600,
        borderRadius: borderRadius.md,
        border: 'none',
        boxShadow: shadows.primaryGlow,
        transition: transitions.normal,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        ...style
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = colors.primaryHover;
          e.currentTarget.style.boxShadow = shadows.primaryHoverGlow;
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = colors.primary;
          e.currentTarget.style.boxShadow = shadows.primaryGlow;
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      {children}
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
    </button>
  );
};

export default PrimaryButton;
