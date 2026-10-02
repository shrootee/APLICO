import React from 'react';
import { 
  TwitterOutlined, 
  LinkedinOutlined, 
  GithubOutlined, 
  InstagramOutlined,
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  HeartOutlined
} from '@ant-design/icons';
import { colors, typography } from '../theme/tokens';
import BrandLogo from './ui/BrandLogo';
import PrimaryButton from './ui/PrimaryButton';

const Footer = () => {
  return (
    <footer style={{
      position: 'relative',
      zIndex: 10,
      background: colors.background,
      borderTop: `1px solid ${colors.cardBorder}`,
      paddingTop: '60px',
      paddingBottom: '36px',
      fontFamily: typography.fontFamilySystem
    }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '0 40px'
      }}>
        {/* Main Footer Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '40px',
          marginBottom: '40px'
        }}>
          {/* Brand Column */}
          <div style={{ gridColumn: 'span 1' }}>
            <div style={{ marginBottom: '16px' }}>
              <BrandLogo size={32} fontSize="20px" />
            </div>
            
            <p style={{
              fontSize: '14px',
              color: colors.textSecondary,
              lineHeight: '1.6',
              marginBottom: '20px',
              fontWeight: typography.weights.regular
            }}>
              Track applications, manage interviews, and stay organized throughout your opportunity search.
            </p>
            
            {/* Social Links */}
            <div style={{ display: 'flex', gap: '12px' }}>
              {[TwitterOutlined, LinkedinOutlined, GithubOutlined, InstagramOutlined].map((IconComponent, i) => (
                <a
                  key={i}
                  href="#"
                  style={{
                    width: '34px',
                    height: '34px',
                    background: colors.surface,
                    border: `1px solid ${colors.cardBorder}`,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: colors.textMuted,
                    fontSize: '15px',
                    transition: 'all 200ms ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = colors.primaryBorder;
                    e.currentTarget.style.color = colors.primary;
                    e.currentTarget.style.background = colors.primaryLight;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = colors.cardBorder;
                    e.currentTarget.style.color = colors.textMuted;
                    e.currentTarget.style.background = colors.surface;
                  }}
                >
                  <IconComponent />
                </a>
              ))}
            </div>
          </div>
          
          {/* Product Column */}
          <div>
            <h4 style={{
              fontSize: '15px',
              fontWeight: typography.weights.semibold,
              color: colors.textPrimary,
              marginBottom: '16px'
            }}>Product</h4>
            
            {['Features', 'How it works', 'Pricing', 'Roadmap', 'Changelog'].map((item) => (
              <a 
                key={item} 
                href="#" 
                style={{
                  display: 'block',
                  fontSize: '14px',
                  color: colors.textSecondary,
                  textDecoration: 'none',
                  marginBottom: '10px',
                  transition: 'color 200ms ease',
                  fontWeight: typography.weights.regular
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = colors.primary}
                onMouseLeave={(e) => e.currentTarget.style.color = colors.textSecondary}
              >
                {item}
              </a>
            ))}
          </div>
          
          {/* Resources Column */}
          <div>
            <h4 style={{
              fontSize: '15px',
              fontWeight: typography.weights.semibold,
              color: colors.textPrimary,
              marginBottom: '16px'
            }}>Resources</h4>
            
            {['Blog', 'Guides', 'Help Center', 'Community', 'Status'].map((item) => (
              <a 
                key={item} 
                href="#" 
                style={{
                  display: 'block',
                  fontSize: '14px',
                  color: colors.textSecondary,
                  textDecoration: 'none',
                  marginBottom: '10px',
                  transition: 'color 200ms ease',
                  fontWeight: typography.weights.regular
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = colors.primary}
                onMouseLeave={(e) => e.currentTarget.style.color = colors.textSecondary}
              >
                {item}
              </a>
            ))}
          </div>
          
          {/* Company Column */}
          <div>
            <h4 style={{
              fontSize: '15px',
              fontWeight: typography.weights.semibold,
              color: colors.textPrimary,
              marginBottom: '16px'
            }}>Company</h4>
            
            {['About', 'Careers', 'Contact', 'Privacy Policy', 'Terms of Service'].map((item) => (
              <a 
                key={item} 
                href="#" 
                style={{
                  display: 'block',
                  fontSize: '14px',
                  color: colors.textSecondary,
                  textDecoration: 'none',
                  marginBottom: '10px',
                  transition: 'color 200ms ease',
                  fontWeight: typography.weights.regular
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = colors.primary}
                onMouseLeave={(e) => e.currentTarget.style.color = colors.textSecondary}
              >
                {item}
              </a>
            ))}
          </div>
        </div>

        {/* Contact Info Bar */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 0',
          borderTop: `1px solid ${colors.divider}`,
          borderBottom: `1px solid ${colors.divider}`,
          marginBottom: '28px',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MailOutlined style={{ color: colors.primary, fontSize: '14px' }} />
              <span style={{ fontSize: '13px', color: colors.textSecondary }}>hello@aplico.com</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PhoneOutlined style={{ color: colors.primary, fontSize: '14px' }} />
              <span style={{ fontSize: '13px', color: colors.textSecondary }}>+1 (555) 123-4567</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <EnvironmentOutlined style={{ color: colors.primary, fontSize: '14px' }} />
              <span style={{ fontSize: '13px', color: colors.textSecondary }}>San Francisco, CA</span>
            </div>
          </div>
          
          {/* Newsletter Form */}
          <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="email" 
              placeholder="Your email" 
              style={{
                background: colors.surface,
                border: `1px solid ${colors.borderNeutral}`,
                borderRadius: '8px',
                padding: '8px 14px',
                color: colors.textPrimary,
                fontSize: '13px',
                outline: 'none',
                width: '200px'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = colors.primary}
              onBlur={(e) => e.currentTarget.style.borderColor = colors.borderNeutral}
            />
            <PrimaryButton
              type="submit"
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              Subscribe
            </PrimaryButton>
          </form>
        </div>
        
        {/* Bottom Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <p style={{
            fontSize: '13px',
            color: colors.textMuted,
            margin: 0
          }}>
            © {new Date().getFullYear()} Aplico. All rights reserved. Made with <HeartOutlined style={{ color: colors.error, fontSize: '12px' }} /> for students
          </p>
          
          <div style={{ display: 'flex', gap: '20px' }}>
            <a href="#" style={{ fontSize: '13px', color: colors.textMuted, textDecoration: 'none' }}>Privacy</a>
            <a href="#" style={{ fontSize: '13px', color: colors.textMuted, textDecoration: 'none' }}>Terms</a>
            <a href="#" style={{ fontSize: '13px', color: colors.textMuted, textDecoration: 'none' }}>Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;