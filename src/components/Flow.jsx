import React, { useState, useEffect } from 'react';
import { 
  GlobalOutlined, 
  DashboardOutlined, 
  BellOutlined, 
  LineChartOutlined,
  RocketOutlined
} from '@ant-design/icons';
import { colors, typography } from '../theme/tokens';
import BrandLogo from './ui/BrandLogo';
import Badge from './ui/Badge';
import Card from './ui/Card';

const Flow = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const steps = [
    {
      number: '01',
      title: 'Apply Anywhere',
      description: 'Found an opportunity on LinkedIn, Indeed, company careers page, or any job board? Simply add the application to Aplico and keep everything organized from day one.',
      icon: <GlobalOutlined />,
      position: 'left'
    },
    {
      number: '02',
      title: 'We Track Everything',
      description: 'Aplico becomes your personal application workspace. Track application status, interview stages, deadlines, notes, and company details in one dashboard.',
      icon: <DashboardOutlined />,
      position: 'right'
    },
    {
      number: '03',
      title: 'Stay Updated',
      description: 'Never wonder what happened after applying. Receive updates, reminders, and inbox notifications so you always know what\'s happening with your applications.',
      icon: <BellOutlined />,
      position: 'left'
    },
    {
      number: '04',
      title: 'Analyze Your Journey',
      description: 'See interview rates, response rates, application trends, and progress over time. Understand what\'s working and improve your internship search strategy.',
      icon: <LineChartOutlined />,
      position: 'right'
    }
  ];

  return (
    <section id="how-it-works" style={{
      position: 'relative',
      zIndex: 2,
      padding: isMobile ? '50px 20px' : '90px 40px',
      background: colors.surface,
      borderTop: `1px solid ${colors.cardBorder}`,
      borderBottom: `1px solid ${colors.cardBorder}`
    }}>
      
      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: isMobile ? '48px' : '72px'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <Badge icon={<RocketOutlined style={{ color: colors.primary, fontSize: '13px' }} />}>
            <span style={{ fontSize: '12px', color: colors.primaryDark, fontWeight: 600, letterSpacing: '0.5px' }}>HOW IT WORKS</span>
          </Badge>
        </div>
        
        <h2 style={{
          fontSize: isMobile ? '30px' : '42px',
          fontWeight: typography.weights.bold,
          color: colors.textPrimary,
          marginBottom: '14px',
          letterSpacing: '-1px'
        }}>
          Your Journey to an Offer
        </h2>
        
        <p style={{
          fontSize: isMobile ? '15px' : '17px',
          color: colors.textSecondary,
          maxWidth: '500px',
          margin: '0 auto',
          lineHeight: '1.6',
          fontWeight: typography.weights.regular
        }}>
          Four simple steps to land your dream opportunity
        </p>
      </div>

      {/* Steps List */}
      <div style={{
        maxWidth: '1100px',
        margin: '0 auto'
      }}>
        {steps.map((step, index) => (
          <div
            key={index}
            style={{
              marginBottom: index === steps.length - 1 ? 0 : isMobile ? '40px' : '90px'
            }}
          >
            {/* Desktop View */}
            {!isMobile && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: step.position === 'left' ? '0.8fr 1.2fr' : '1.2fr 0.8fr',
                  alignItems: 'center',
                  gap: '80px',
                  minHeight: '240px'
                }}
              >
                {step.position === 'left' ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <div style={{
                        fontSize: '140px',
                        fontWeight: typography.weights.extrabold,
                        color: colors.primary,
                        opacity: 0.12,
                        lineHeight: 1,
                        letterSpacing: '-6px',
                        fontFamily: 'monospace'
                      }}>
                        {step.number}
                      </div>
                    </div>

                    <div style={{ maxWidth: '500px' }}>
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
                        {step.icon}
                      </div>
                      <h3 style={{ fontSize: '26px', fontWeight: typography.weights.semibold, color: colors.textPrimary, marginBottom: '14px' }}>
                        {step.title}
                      </h3>
                      <p style={{ color: colors.textSecondary, lineHeight: 1.7, fontSize: '15px', fontWeight: typography.weights.regular, margin: 0 }}>
                        {step.description}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ maxWidth: '500px' }}>
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
                        {step.icon}
                      </div>
                      <h3 style={{ fontSize: '26px', fontWeight: typography.weights.semibold, color: colors.textPrimary, marginBottom: '14px' }}>
                        {step.title}
                      </h3>
                      <p style={{ color: colors.textSecondary, lineHeight: 1.7, fontSize: '15px', fontWeight: typography.weights.regular, margin: 0 }}>
                        {step.description}
                      </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <div style={{
                        fontSize: '140px',
                        fontWeight: typography.weights.extrabold,
                        color: colors.primary,
                        opacity: 0.12,
                        lineHeight: 1,
                        letterSpacing: '-6px',
                        fontFamily: 'monospace'
                      }}>
                        {step.number}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Mobile View */}
            {isMobile && (
              <Card style={{ textAlign: 'left', padding: '28px 24px', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    background: colors.primaryLight,
                    border: `1px solid ${colors.primaryBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    color: colors.primary
                  }}>
                    {step.icon}
                  </div>
                  <span style={{
                    fontSize: '32px',
                    fontWeight: typography.weights.extrabold,
                    color: colors.primary,
                    opacity: 0.2,
                    fontFamily: 'monospace'
                  }}>
                    {step.number}
                  </span>
                </div>

                <h3 style={{ fontSize: '20px', fontWeight: typography.weights.semibold, color: colors.textPrimary, marginBottom: '10px' }}>
                  {step.title}
                </h3>
                <p style={{ color: colors.textSecondary, lineHeight: 1.6, fontSize: '14px', margin: 0 }}>
                  {step.description}
                </p>
              </Card>
            )}
          </div>
        ))}

        {/* Final Success Banner */}
        <Card style={{
          marginTop: isMobile ? '50px' : '80px',
          textAlign: 'center',
          padding: isMobile ? '36px 20px' : '48px 36px',
          borderRadius: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <BrandLogo size={36} fontSize="22px" />
          </div>

          <h3 style={{ 
            fontSize: isMobile ? '20px' : '26px', 
            fontWeight: typography.weights.semibold, 
            color: colors.textPrimary, 
            marginBottom: '10px' 
          }}>
            Land Opportunities With Confidence
          </h3>
          
          <p style={{ 
            fontSize: isMobile ? '14px' : '15px', 
            color: colors.textSecondary, 
            maxWidth: '480px', 
            margin: '0 auto',
            lineHeight: '1.6' 
          }}>
            Stop juggling spreadsheets. Stay organized, stay consistent.
          </p>
        </Card>
      </div>
    </section>
  );
};

export default Flow;