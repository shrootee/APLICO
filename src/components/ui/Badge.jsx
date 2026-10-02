import React from 'react';
import { colors, borderRadius } from '../../theme/tokens';

const Badge = ({ children, icon = null, style = {} }) => {
  return (
    <div
      className="mint-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        background: colors.primaryLight,
        border: `1px solid ${colors.primaryBorder}`,
        padding: '6px 16px',
        borderRadius: borderRadius.pill,
        fontSize: '12px',
        color: colors.primaryDark,
        fontWeight: 600,
        ...style
      }}
    >
      {icon && <span style={{ display: 'inline-flex', color: colors.primary }}>{icon}</span>}
      {children}
    </div>
  );
};

export default Badge;
