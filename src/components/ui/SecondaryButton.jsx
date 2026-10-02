import React, { useState } from 'react';
import { colors, borderRadius, transitions } from '../../theme/tokens';

const SecondaryButton = ({ 
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
        background: colors.background,
        border: `1px solid ${colors.borderNeutral}`,
        color: colors.textPrimary,
        fontWeight: 600,
        borderRadius: borderRadius.md,
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
          e.currentTarget.style.background = colors.surface;
          e.currentTarget.style.borderColor = colors.textMuted;
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = colors.background;
          e.currentTarget.style.borderColor = colors.borderNeutral;
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </button>
  );
};

export default SecondaryButton;
