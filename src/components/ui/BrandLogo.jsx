import React from 'react';
import logo from '../../assets/aplico_logo.png';
import { colors, typography } from '../../theme/tokens';

const BrandLogo = ({ size = 36, fontSize = '22px', onClick, style }) => {
  return (
    <div 
      onClick={onClick}
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '10px', 
        cursor: onClick ? 'pointer' : 'default',
        ...style 
      }}
    >
      <img
        src={logo}
        alt="Aplico Logo"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          objectFit: 'contain'
        }}
      />
      <span
        className="brand-text"
        style={{
          fontSize: fontSize,
          color: colors.textPrimary,
          fontFamily: typography.fontFamilyBrand,
          fontWeight: typography.weights.bold,
          letterSpacing: '-0.03em'
        }}
      >
        Aplico
      </span>
    </div>
  );
};

export default BrandLogo;
