import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RightOutlined,
  ArrowRightOutlined,
  FileTextOutlined,
  CalendarOutlined,
  BarChartOutlined,
  MenuOutlined,
  CloseOutlined
} from '@ant-design/icons';

// Design System Tokens & Reusable UI Components
import { colors, typography } from '../theme/tokens';
import BrandLogo from './ui/BrandLogo';
import PrimaryButton from './ui/PrimaryButton';
import SecondaryButton from './ui/SecondaryButton';
import Badge from './ui/Badge';
import Card from './ui/Card';
import Ribbon from './ui/Ribbon';

import Flow from './Flow';
import Footer from './Footer';

const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setMobileMenuOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const featureList = [
    'ATS Score',
    'Application Tracker',
    'Resume Store',
    'Job Match',
    'Interview Prep',
    'Skill Gap Analysis',
    'Saved Jobs',
    'Notes',
    'Analytics'
  ];

  const opportunityTypes = [
    'Internship',
    'Full-time Job',
    'Off-campus Opportunity',
    'Campus Placement',
    'Referral',
    'Graduate Program',
    'Fellowship',
    'Research Position'
  ];

  const [opportunityIndex, setOpportunityIndex] = useState(0);
  const [wordAnimClass, setWordAnimClass] = useState('word-fade-in');

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out current word
      setWordAnimClass('word-fade-out');

      setTimeout(() => {
        // Advance index and fade in next word
        setOpportunityIndex((prev) => (prev + 1) % opportunityTypes.length);
        setWordAnimClass('word-fade-in');
      }, 450);
    }, 2450);

    return () => clearInterval(interval);
  }, [opportunityTypes.length]);

  // Repeat feature items infinitely for smooth marquee track
  const ribbonTextItems = [...featureList, ...featureList, ...featureList, ...featureList];

  return (
    <div style={{
      minHeight: '100vh',
      position: 'relative',
      background: colors.background,
      color: colors.textPrimary,
      fontFamily: typography.fontFamilySystem,
      overflowX: 'hidden'
    }}>

      {/* Navigation Bar */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isMobile ? '16px 20px' : '20px 60px',
        maxWidth: '1280px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 10,
        background: colors.background,
        borderBottom: `1px solid ${colors.cardBorder}`
      }}>
        {/* Brand Logo Component */}
        <BrandLogo onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />

        {/* Navigation Links */}
        {!isMobile && (
          <div style={{ display: 'flex', gap: '36px', alignItems: 'center' }}>
            {[
              { name: 'Home', href: '#' },
              { name: 'Product', href: '#product' },
              { name: 'How it works', href: '#how-it-works' }
            ].map((item) => (
              <a
                key={item.name}
                href={item.href}
                style={{
                  textDecoration: 'none',
                  color: colors.textSecondary,
                  fontSize: '14px',
                  fontWeight: typography.weights.medium,
                  transition: 'color 200ms ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = colors.primary}
                onMouseLeave={(e) => e.currentTarget.style.color = colors.textSecondary}
              >
                {item.name}
              </a>
            ))}
          </div>
        )}

        {/* Right Side Buttons */}
        <div style={{ display: 'flex', gap: isMobile ? '10px' : '16px', alignItems: 'center' }}>
          {!isMobile && (
            <SecondaryButton
              onClick={() => navigate('/dashboard')}
              style={{ padding: '9px 18px', fontSize: '14px' }}
            >
              Take a tour
            </SecondaryButton>
          )}

          <PrimaryButton
            onClick={() => navigate('/auth?mode=signup')}
            style={{ padding: '9px 20px', fontSize: '14px' }}
            icon={<RightOutlined style={{ fontSize: '12px' }} />}
          >
            Try for free
          </PrimaryButton>

          {/* Mobile Menu Toggle */}
          {isMobile && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                background: colors.background,
                border: `1px solid ${colors.borderNeutral}`,
                borderRadius: '8px',
                padding: '8px 10px',
                cursor: 'pointer',
                color: colors.textPrimary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {mobileMenuOpen ? <CloseOutlined /> : <MenuOutlined />}
            </button>
          )}
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobile && mobileMenuOpen && (
        <div style={{
          position: 'fixed',
          top: '68px',
          left: 0,
          right: 0,
          background: colors.background,
          zIndex: 100,
          padding: '20px',
          borderBottom: `1px solid ${colors.cardBorder}`,
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)'
        }}>
          {['Home', 'Product', 'How it works'].map((item) => (
            <a
              key={item}
              href="#"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                display: 'block',
                textDecoration: 'none',
                color: colors.textSecondary,
                fontSize: '15px',
                padding: '12px 0',
                borderBottom: `1px solid ${colors.divider}`,
                fontWeight: typography.weights.medium
              }}
            >
              {item}
            </a>
          ))}
          <SecondaryButton
            onClick={() => { setMobileMenuOpen(false); navigate('/dashboard'); }}
            style={{ width: '100%', padding: '12px', marginTop: '16px', fontSize: '14px' }}
          >
            Take a tour
          </SecondaryButton>
        </div>
      )}

      {/* HERO SECTION */}
      <section style={{
        position: 'relative',
        zIndex: 2,
        maxWidth: '1240px',
        margin: '0 auto',
        padding: isMobile ? '40px 20px 40px' : '50px 40px 60px',
        textAlign: 'center',
        overflow: 'hidden'
      }}>

        {/* RIBBON 1: TOP FRAMING RIBBON (ABOVE HERO HEADLINE) */}
        {!isMobile && (
          <div style={{
            position: 'relative',
            width: '100%',
            height: '60px',
            marginBottom: '36px',
            pointerEvents: 'none'
          }}>
            <Ribbon
              items={ribbonTextItems}
              direction="right"
              rotation={-2.5}
              background="#ffffff"
              borderColor={colors.cardBorder}
              opacity={0.90}
            />
          </div>
        )}

        {/* HERO CONTENT CONTAINER */}
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '1080px', margin: '0 auto' }}>
          {/* INTRODUCING Badge Component */}
          <div style={{ marginBottom: '24px' }}>
            <Badge icon={<ArrowRightOutlined style={{ fontSize: '11px', color: colors.primary }} />}>
              <span style={{ fontSize: '12px', color: colors.primaryDark, fontWeight: 600, letterSpacing: '0.5px' }}>INTRODUCING</span>
              <span style={{ fontWeight: 600, fontSize: '12px', color: '#065F46' }}>Aplico 1.0</span>
            </Badge>
          </div>

          {/* Main Heading with Rigid Fixed Container for Zero Layout Shift */}
          <h1 style={{
            fontSize: isMobile ? '34px' : '56px',
            fontWeight: typography.weights.bold,
            marginBottom: '24px',
            lineHeight: '1.2',
            letterSpacing: '-1.5px',
            color: colors.textPrimary,
            textAlign: 'center'
          }}>
            Manage. Track.<br />
            Land your dream{' '}
            <span style={{
              display: 'inline-block',
              width: isMobile ? '270px' : '500px',
              textAlign: 'left',
              verticalAlign: 'bottom',
              overflow: 'hidden',
              height: '1.25em',
              position: 'relative'
            }}>
              <span
                className={wordAnimClass}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  whiteSpace: 'nowrap',
                  color: colors.primary
                }}
              >
                {opportunityTypes[opportunityIndex]}
              </span>
            </span>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: isMobile ? '16px' : '19px',
            color: colors.textSecondary,
            marginBottom: '40px',
            maxWidth: '620px',
            marginLeft: 'auto',
            marginRight: 'auto',
            lineHeight: '1.6',
            fontWeight: typography.weights.regular
          }}>
            Organize your opportunity search with application tracking, interview management, and deadline reminders.
          </p>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <SecondaryButton
              onClick={() => navigate('/dashboard')}
              style={{ height: '48px', padding: '0 28px', fontSize: '15px' }}
            >
              Take a tour
            </SecondaryButton>

            <PrimaryButton
              onClick={() => navigate('/auth?mode=signup')}
              style={{ height: '48px', padding: '0 32px', fontSize: '15px' }}
              icon={<RightOutlined style={{ fontSize: '13px' }} />}
            >
              Try for free
            </PrimaryButton>
          </div>
        </div>

        {/* RIBBON 2: BOTTOM FRAMING RIBBON (BELOW HERO CTAs) */}
        {!isMobile && (
          <div style={{
            position: 'relative',
            width: '100%',
            height: '60px',
            marginTop: '48px',
            pointerEvents: 'none'
          }}>
            <Ribbon
              items={ribbonTextItems}
              direction="left"
              rotation={2.5}
              background={colors.primaryLight}
              borderColor={colors.primaryBorder}
              opacity={0.90}
              sidePosition={{ right: '-160px' }}
            />
          </div>
        )}
      </section>

      {/* Feature Preview Cards */}
      <section
        id="product"
        style={{
          maxWidth: '1140px',
          margin: '0 auto',
          padding: isMobile ? '20px 20px 60px' : '40px 40px 80px'
        }}
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: '24px',
          textAlign: 'left'
        }}>
          {[
            {
              icon: <FileTextOutlined />,
              title: 'Track Applications',
              desc: 'Manage every application in one place with status updates and notes.'
            },
            {
              icon: <CalendarOutlined />,
              title: 'Never Miss Deadlines',
              desc: 'Stay ahead of upcoming interviews, coding assessments, and follow-ups.'
            },
            {
              icon: <BarChartOutlined />,
              title: 'Visualize Progress',
              desc: 'See your complete journey from initial application to offer acceptance.'
            }
          ].map((feature, index) => (
            <Card key={index} style={{ padding: '32px 28px', borderRadius: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: colors.primaryLight,
                border: `1px solid ${colors.primaryBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                color: colors.primary,
                marginBottom: '20px'
              }}>
                {feature.icon}
              </div>
              <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '8px', fontWeight: typography.weights.semibold }}>
                {feature.title}
              </h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, lineHeight: '1.6', fontWeight: typography.weights.regular }}>
                {feature.desc}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* Flow Section */}
      <Flow />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default LandingPage;