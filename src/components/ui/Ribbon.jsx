import React from 'react';
import { colors } from '../../theme/tokens';

const Ribbon = ({ 
  items = [], 
  direction = 'right', 
  rotation = 0, 
  background = '#ffffff', 
  borderColor = colors.cardBorder, 
  opacity = 0.90,
  top = '0px',
  sidePosition = { left: '-160px' },
  style = {}
}) => {
  const marqueeClass = direction === 'right' ? 'animate-marquee-right' : 'animate-marquee-left';

  return (
    <div className="hero-ribbon" style={{
      position: 'absolute',
      top: top,
      ...sidePosition,
      width: 'calc(100% + 320px)',
      height: '56px',
      transform: `rotate(${rotation}deg)`,
      opacity: opacity,
      background: background,
      borderColor: borderColor,
      boxShadow: '0 2px 12px rgba(0, 0, 0, 0.03)',
      ...style
    }}>
      <div className={marqueeClass}>
        {items.map((text, i) => (
          <span key={i} style={{ fontSize: '15px', fontWeight: 500, color: colors.textSecondary }}>
            {text} <span style={{ color: colors.primary, margin: '0 24px' }}>•</span>
          </span>
        ))}
      </div>
    </div>
  );
};

export default Ribbon;
