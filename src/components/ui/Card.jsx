import React from 'react';
import { colors, borderRadius, shadows, transitions } from '../../theme/tokens';

const Card = ({ children, style = {}, className = '', hoverable = true, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`${hoverable ? 'mint-card' : ''} ${className}`}
      style={{
        background: colors.cardBg,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: borderRadius.xl,
        boxShadow: shadows.sm,
        transition: transitions.normal,
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}
    >
      {children}
    </div>
  );
};

export default Card;
